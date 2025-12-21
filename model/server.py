from fastapi import FastAPI, HTTPException, Query
import torch
import numpy as np
from pathlib import Path

# 프로젝트 모듈 임포트
from .model import SaleProfilerLSTM
from .data import get_live_game_data

# --- 기본 설정 ---
app = FastAPI(
    title="WaitForSale - Steam Game Sale Predictor",
    description="특정 Steam 게임의 다음 날 할인 시작 여부를 예측하는 API입니다.",
    version="0.1.0"
)
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# 현재 스크립트(server.py)의 위치를 기준으로 모델 파일의 절대 경로를 계산
# 이렇게 하면 어떤 위치에서 서버를 실행해도 모델을 정확히 찾을 수 있음
SCRIPT_DIR = Path(__file__).parent
MODEL_PATH = SCRIPT_DIR / "trained_model.pth"

# --- 전역 변수 ---
model = None
model_meta = None
best_params = None

# --- 이벤트 핸들러 ---
@app.on_event("startup")
def load_model():
    """서버 시작 시 모델을 로드합니다."""
    global model, model_meta, best_params
    try:
        checkpoint = torch.load(MODEL_PATH, map_location=device, weights_only=False)
        
        model_meta = checkpoint['model_meta']
        best_params = checkpoint['best_params']

        model = SaleProfilerLSTM(
            num_games=model_meta['num_games'],
            num_devs=model_meta['num_devs'],
            num_pubs=model_meta['num_pubs'],
            params=best_params
        ).to(device)

        model.load_state_dict(checkpoint['model_state_dict'])
        model.eval()
        
        print(f"--- 모델 로드 완료: {MODEL_PATH} ---")
        print(f"--- 실행에 사용할 디바이스: {device} ---")

    except FileNotFoundError:
        print(f"[ERROR] 모델 파일을 찾을 수 없습니다: {MODEL_PATH}")
        print("먼저 train.py를 실행하여 모델을 학습하고 저장해주세요.")
    except Exception as e:
        print(f"[ERROR] 모델 로드 중 오류 발생: {e}")

# --- API 엔드포인트 ---
@app.get("/", summary="API 기본 정보")
def read_root():
    return {"message": "Steam 게임 할인 예측 API. /docs 에서 사용법을 확인하세요."}


@app.post("/predict", summary="게임 할인 예측")
async def predict_sale(appid: str = Query("413150", description="예측할 게임의 Steam AppID")):
    """
    주어진 Steam AppID에 대해 다음 날 할인이 시작될 확률을 예측합니다.
    
    - **appid**: 예측을 원하는 게임의 고유 Steam AppID.
    - **반환값**: 할인 예측 확률과 할인 여부(확률 > 0.5).
    """
    if not model or not model_meta:
        raise HTTPException(status_code=503, detail="모델이 로드되지 않았습니다. 서버 로그를 확인해주세요.")

    # 1. appid를 기반으로 실시간 예측에 필요한 데이터 준비
    seq_length = 30 # 훈련 시와 동일한 시퀀스 길이
    input_data = get_live_game_data(appid=appid, model_meta=model_meta, seq_length=seq_length)
    
    if not input_data:
        raise HTTPException(status_code=404, detail=f"AppID {appid}에 대한 예측 데이터를 생성할 수 없습니다. 유효한 AppID인지 또는 충분한 데이터가 있는지 확인해주세요.")

    # 2. 데이터를 텐서로 변환하고 디바이스에 올리기
    x, g, dev, pub = input_data
    
    # unsqueeze(0)를 통해 배치 차원(1) 추가
    x_tensor = torch.from_numpy(x).float().unsqueeze(0).to(device) 
    g_tensor = torch.tensor([g], dtype=torch.long).unsqueeze(0).to(device)
    dev_tensor = torch.tensor([dev], dtype=torch.long).unsqueeze(0).to(device)
    pub_tensor = torch.tensor([pub], dtype=torch.long).unsqueeze(0).to(device)

    # 3. 모델 예측
    with torch.no_grad():
        logit = model(x_tensor, g_tensor, dev_tensor, pub_tensor)
        probability = torch.sigmoid(logit).item()

    # 4. 결과 반환
    is_on_sale_prediction = bool(probability > 0.5)
    return {
        "appid": appid,
        "sale_prediction_probability": round(probability, 4),
        "is_predicted_to_be_on_sale": is_on_sale_prediction,
    }