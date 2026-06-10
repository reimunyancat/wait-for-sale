"""
model/model.py - XGBoost 기반 SalePredictorXGB 클래스
"""
import numpy as np
import joblib
from pathlib import Path
from typing import Optional, Tuple

try:
    import xgboost as xgb
except ImportError:
    raise ImportError("xgboost 패키지가 필요합니다: pip install xgboost")


class SalePredictorXGB:
    """XGBoost 기반 할인 예측 분류기"""

    def __init__(self, **xgb_params):
        default_params = {
            'n_estimators': 300,
            'max_depth': 6,
            'learning_rate': 0.05,
            'subsample': 0.8,
            'colsample_bytree': 0.8,
            'use_label_encoder': False,
            'eval_metric': 'logloss',
            'random_state': 42,
            'n_jobs': -1,
        }
        default_params.update(xgb_params)
        self.model = xgb.XGBClassifier(**default_params)
        self.feature_names = None
        self.is_trained = False

    def fit(
        self,
        X_train: np.ndarray,
        y_train: np.ndarray,
        X_val: Optional[np.ndarray] = None,
        y_val: Optional[np.ndarray] = None,
    ) -> 'SalePredictorXGB':
        """모델을 학습합니다. 검증 세트가 있으면 early stopping을 적용합니다."""
        fit_kwargs = {}
        if X_val is not None and y_val is not None:
            fit_kwargs['eval_set'] = [(X_val, y_val)]
            fit_kwargs['verbose'] = 50

        self.model.fit(X_train, y_train, **fit_kwargs)
        self.is_trained = True
        return self

    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        """할인 확률을 반환합니다. shape: (n_samples,)"""
        if not self.is_trained:
            raise RuntimeError("모델이 학습되지 않았습니다. fit()을 먼저 호출하세요.")
        proba = self.model.predict_proba(X)
        return proba[:, 1]  # 양성(할인) 확률

    def predict(self, X: np.ndarray, threshold: float = 0.5) -> np.ndarray:
        """이진 예측을 반환합니다."""
        return (self.predict_proba(X) >= threshold).astype(int)

    def get_feature_importance(self, feature_names=None) -> dict:
        """피처 중요도를 반환합니다."""
        if not self.is_trained:
            return {}
        importances = self.model.feature_importances_
        names = feature_names or self.feature_names or [f'f{i}' for i in range(len(importances))]
        return dict(sorted(zip(names, importances), key=lambda x: x[1], reverse=True))

    def save(self, path: str) -> None:
        """
        모델을 저장합니다.
        - trained_model.json: XGBoost 네이티브 포맷
        - model_meta.pkl: 메타데이터 + 스케일러
        """
        path = Path(path)
        path.mkdir(parents=True, exist_ok=True)

        # XGBoost 네이티브 저장
        model_path = path / 'trained_model.json'
        self.model.save_model(str(model_path))
        print(f"모델 저장: {model_path}")

    def load(self, path: str) -> 'SalePredictorXGB':
        """저장된 모델을 로드합니다."""
        path = Path(path)
        model_path = path / 'trained_model.json'
        if not model_path.exists():
            raise FileNotFoundError(f"모델 파일이 없습니다: {model_path}")

        self.model.load_model(str(model_path))
        self.is_trained = True
        print(f"모델 로드: {model_path}")
        return self
