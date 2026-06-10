"""
model/train.py - 데이터 수집 → 학습 → 평가 → 저장
"""
import sys
import numpy as np
import joblib
from pathlib import Path

from sklearn.metrics import roc_auc_score, f1_score, classification_report

sys.path.insert(0, str(Path(__file__).parent))
from data import load_data
from model import SalePredictorXGB


def main():
    model_dir = Path(__file__).parent
    print("=" * 60)
    print("WaitForSale - XGBoost 할인 예측 모델 학습")
    print("=" * 60)

    # 1. 데이터 로드
    print("\n[1/4] 데이터 수집 및 피처 생성 중...")
    X_train, X_test, y_train, y_test, feature_names, scaler, model_meta = load_data()
    print(f"  Train: {X_train.shape}, Test: {X_test.shape}")
    print(f"  Train 양성 비율: {y_train.mean():.3f}")
    print(f"  Test 양성 비율:  {y_test.mean():.3f}")

    # 2. 학습
    print("\n[2/4] 모델 학습 중...")
    predictor = SalePredictorXGB(
        n_estimators=300,
        max_depth=6,
        learning_rate=0.05,
        scale_pos_weight=float((y_train == 0).sum()) / max(1, float((y_train == 1).sum())),
    )
    predictor.fit(X_train, y_train, X_val=X_test, y_val=y_test)

    # 3. 평가
    print("\n[3/4] 평가 중...")
    y_prob = predictor.predict_proba(X_test)
    y_pred = (y_prob >= 0.5).astype(int)

    auc = roc_auc_score(y_test, y_prob)
    f1 = f1_score(y_test, y_pred, zero_division=0)
    print(f"  AUC:  {auc:.4f}")
    print(f"  F1:   {f1:.4f}")
    print("\n  Classification Report:")
    print(classification_report(y_test, y_pred, target_names=['no_sale', 'sale'], zero_division=0))

    # 피처 중요도 출력
    print("\n  피처 중요도 (Top 12):")
    importance = predictor.get_feature_importance(feature_names)
    for feat, imp in list(importance.items())[:12]:
        bar = "█" * int(imp * 50)
        print(f"    {feat:<30} {imp:.4f} {bar}")

    # 4. 저장
    print("\n[4/4] 모델 저장 중...")
    predictor.save(str(model_dir))

    # 메타데이터 + 스케일러 저장
    model_meta['auc'] = auc
    model_meta['f1'] = f1
    model_meta['scaler'] = scaler
    model_meta['feature_names'] = feature_names
    joblib.dump(model_meta, model_dir / 'model_meta.pkl')
    print(f"  메타데이터 저장: {model_dir / 'model_meta.pkl'}")

    print("\n✅ 학습 완료!")
    print(f"  AUC={auc:.4f}, F1={f1:.4f}")


if __name__ == '__main__':
    main()
