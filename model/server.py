"""
model/server.py - FastAPI 예측 서버
GET /predict?appid=xxx
"""
import sys
import os
import joblib
import numpy as np
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

# 모델 디렉토리 기준으로 경로 설정
MODEL_DIR = Path(__file__).parent
sys.path.insert(0, str(MODEL_DIR))

load_dotenv(dotenv_path=MODEL_DIR.parent / '.env')

from data import build_realtime_features, FEATURE_NAMES
from model import SalePredictorXGB

app = FastAPI(
    title="WaitForSale Prediction API",
    description="XGBoost 기반 Steam 게임 할인 예측",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 모델 전역 로드
_predictor: Optional[SalePredictorXGB] = None
_meta: Optional[dict] = None


def get_predictor() -> SalePredictorXGB:
    global _predictor, _meta
    if _predictor is None:
        model_path = MODEL_DIR / 'trained_model.json'
        meta_path = MODEL_DIR / 'model_meta.pkl'
        if not model_path.exists():
            raise RuntimeError("trained_model.json 없음. python train.py를 먼저 실행하세요.")
        _predictor = SalePredictorXGB()
        _predictor.load(str(MODEL_DIR))
        if meta_path.exists():
            _meta = joblib.load(meta_path)
    return _predictor


class PredictionResponse(BaseModel):
    appid: str
    sale_prediction_probability: float
    is_predicted_to_be_on_sale: bool
    confidence: str  # "high" | "medium" | "low"
    message: str


def probability_to_confidence(prob: float) -> str:
    if prob >= 0.7:
        return "high"
    elif prob >= 0.4:
        return "medium"
    else:
        return "low"


def probability_to_message(prob: float) -> str:
    pct = int(prob * 100)
    if prob >= 0.7:
        return f"{pct}% 확률로 곧 할인 가능성이 높습니다!"
    elif prob >= 0.4:
        return f"{pct}% 확률로 할인될 수 있습니다."
    else:
        return f"{pct}% 확률 — 당분간 할인 가능성은 낮습니다."


@app.get("/predict", response_model=PredictionResponse)
async def predict(appid: str = Query(..., description="Steam App ID")):
    """
    특정 Steam 게임의 할인 예측을 반환합니다.
    """
    try:
        predictor = get_predictor()
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))

    features = build_realtime_features(appid)
    if features is None:
        raise HTTPException(
            status_code=404,
            detail=f"appid={appid}에 대한 데이터를 수집할 수 없습니다. ITAD에 등록된 게임인지 확인하세요."
        )

    try:
        prob = float(predictor.predict_proba(features)[0])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"예측 오류: {e}")

    return PredictionResponse(
        appid=appid,
        sale_prediction_probability=round(prob, 4),
        is_predicted_to_be_on_sale=prob >= 0.5,
        confidence=probability_to_confidence(prob),
        message=probability_to_message(prob),
    )


@app.get("/health")
async def health():
    return {"status": "ok", "model_loaded": _predictor is not None}


@app.get("/")
async def root():
    return {
        "name": "WaitForSale Prediction API",
        "version": "2.0.0",
        "endpoints": ["/predict?appid=<steam_appid>", "/health"],
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001, reload=False)
