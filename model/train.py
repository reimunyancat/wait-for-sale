import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import TensorDataset, DataLoader
from sklearn.metrics import f1_score, roc_auc_score
import optuna
from typing import Tuple, Dict
import copy

# 프로젝트 모듈 임포트
from data import get_processed_data
from model import SaleProfilerLSTM

# --- GPU 설정 ---
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"--- 실행에 사용할 디바이스: {device} ---")

# Optuna 로깅 설정
optuna.logging.set_verbosity(optuna.logging.INFO)


def create_model(model_meta: Dict, params: Dict) -> Tuple[nn.Module, nn.Module, optim.Optimizer]:
    """하이퍼파라미터를 사용하여 모델, 손실 함수, 옵티마이저를 생성합니다."""
    model = SaleProfilerLSTM(
        num_games=model_meta['num_games'],
        num_devs=model_meta['num_devs'],
        num_pubs=model_meta['num_pubs'],
        params=params
    ).to(device)
    
    pos_weight = torch.tensor([model_meta['sale_counts'].get(0, 1) / model_meta['sale_counts'].get(1, 1)]).to(device)
    loss_function = nn.BCEWithLogitsLoss(pos_weight=pos_weight)
    optimizer = optim.Adam(model.parameters(), lr=params['learning_rate'])
    
    return model, loss_function, optimizer


def train_for_trial(model: nn.Module, loss_fn: nn.Module, optimizer: optim.Optimizer, train_loader: DataLoader, epochs: int):
    """Optuna 평가용으로, Early Stopping 없이 모델을 간단히 학습시킵니다."""
    model.train()
    for _ in range(epochs):
        for x_batch, y_batch, g_batch, dev_batch, pub_batch in train_loader:
            x_batch, y_batch, g_batch, dev_batch, pub_batch = \
                x_batch.to(device), y_batch.to(device), g_batch.to(device), dev_batch.to(device), pub_batch.to(device)
            
            optimizer.zero_grad()
            y_pred_logits = model(x_batch, g_batch, dev_batch, pub_batch)
            loss = loss_fn(y_pred_logits, y_batch)
            loss.backward()
            optimizer.step()


def train_with_early_stopping(model: nn.Module, loss_fn: nn.Module, optimizer: optim.Optimizer, train_loader: DataLoader, val_data: Tuple, epochs: int, patience: int) -> nn.Module:
    """
    DataLoader를 사용하여 최종 모델을 학습시키고, Early Stopping을 적용합니다.
    가장 좋은 성능을 보인 모델 상태를 반환합니다.
    """
    best_val_f1 = -1
    best_model_state = None
    patience_counter = 0

    print("\n--- 최종 모델 학습 (Early Stopping 적용) ---")
    for epoch in range(epochs):
        model.train()
        for x_batch, y_batch, g_batch, dev_batch, pub_batch in train_loader:
            x_batch, y_batch, g_batch, dev_batch, pub_batch = \
                x_batch.to(device), y_batch.to(device), g_batch.to(device), dev_batch.to(device), pub_batch.to(device)
            
            optimizer.zero_grad()
            y_pred_logits = model(x_batch, g_batch, dev_batch, pub_batch)
            loss = loss_fn(y_pred_logits, y_batch)
            loss.backward()
            optimizer.step()

        # 매 에폭마다 검증 데이터로 평가
        val_scores = evaluate(model, val_data, print_results=False)
        current_val_f1 = val_scores['f1']
        
        print(f"Epoch {epoch+1}/{epochs} - Val F1: {current_val_f1:.4f} (Best: {max(best_val_f1, current_val_f1):.4f})")

        if current_val_f1 > best_val_f1:
            best_val_f1 = current_val_f1
            best_model_state = copy.deepcopy(model.state_dict())
            patience_counter = 0
            print(f"  -> 새로운 최고 점수! 모델 저장. (Patience: {patience_counter}/{patience})")
        else:
            patience_counter += 1
            print(f"  -> 점수 향상 없음. (Patience: {patience_counter}/{patience})")

        if patience_counter >= patience:
            print(f"\n조기 종료: {patience} 에폭 동안 검증 F1 점수 향상 없음.")
            break
    
    if best_model_state is None:
        print("\n[경고] 학습 초기부터 검증 점수가 전혀 향상되지 않았습니다. 모델을 저장하지 않고 반환합니다.")
        return model

    print(f"\n최고 검증 F1 점수: {best_val_f1:.4f}")
    model.load_state_dict(best_model_state)
    return model


def evaluate(model: nn.Module, test_data: Tuple, print_results: bool = True) -> Dict:
    """학습된 모델을 평가하고 점수를 반환합니다."""
    model.eval()
    X_test, y_test, g_test, dev_test, pub_test = test_data
    
    with torch.no_grad():
        X_test, y_test, g_test, dev_test, pub_test = \
            X_test.to(device), y_test.to(device), g_test.to(device), dev_test.to(device), pub_test.to(device)
        
        test_pred_logits = model(X_test, g_test, dev_test, pub_test)
        test_pred_probs = torch.sigmoid(test_pred_logits)
        
        y_test_np = y_test.int().cpu().squeeze().numpy()
        preds_np = (test_pred_probs > 0.5).int().cpu().squeeze().numpy()
        
        f1 = f1_score(y_test_np, preds_np, zero_division=0)
        
        if print_results:
            accuracy = (preds_np == y_test_np).sum() / len(y_test_np) * 100
            try:
                roc_auc = roc_auc_score(y_test_np, test_pred_probs.cpu().squeeze().numpy())
            except ValueError:
                roc_auc = 0.5
            
            print("\n--- 모델 평가 시작 ---")
            print(f"테스트 정확도: {accuracy:.2f}%")
            print(f"F1 Score: {f1:.4f}")
            print(f"ROC AUC Score: {roc_auc:.4f}")
            
        return {'f1': f1}


def objective(trial: optuna.Trial, train_data: Tuple, val_data: Tuple, model_meta: Dict) -> float:
    """Optuna를 위한 objective 함수."""
    try:
        params = {
            'learning_rate': trial.suggest_float('learning_rate', 1e-4, 1e-2, log=True),
            'hidden_layer_size': trial.suggest_int('hidden_layer_size', 32, 256, step=32),
            'game_embedding_dim': trial.suggest_int('game_embedding_dim', 10, 50, step=10),
            'dev_embedding_dim': trial.suggest_int('dev_embedding_dim', 5, 20, step=5),
            'pub_embedding_dim': trial.suggest_int('pub_embedding_dim', 5, 20, step=5),
            'num_layers': trial.suggest_int('num_layers', 2, 4),
            'dropout': trial.suggest_float('dropout', 0.2, 0.5),
            'batch_size': trial.suggest_categorical('batch_size', [64, 128, 256]),
            'input_size': model_meta['input_size']
        }

        train_loader = DataLoader(TensorDataset(*train_data), batch_size=params['batch_size'], shuffle=True)
        model, loss_fn, optimizer = create_model(model_meta, params)
        
        train_for_trial(model, loss_fn, optimizer, train_loader, epochs=30)
        scores = evaluate(model, val_data, print_results=False)

        return scores['f1']
    except torch.cuda.OutOfMemoryError:
        print(f"Trial {trial.number} failed due to OutOfMemoryError. Pruning.")
        raise optuna.exceptions.TrialPruned()
    except Exception as e:
        print(f"Trial {trial.number} failed with an unexpected error: {e}. Pruning.")
        raise optuna.exceptions.TrialPruned()


def main():
    """전체 모델링 파이프라인을 실행합니다."""
    # 1. 데이터 로드 및 전처리
    processed_data = get_processed_data(seq_length=30)
    if not processed_data: return
    train_data, val_data, test_data, model_meta = processed_data

    # 2. Optuna 최적화
    storage_name = "sqlite:///optuna.db"
    study_name = "sale_prediction_v2"
    
    study = optuna.create_study(
        study_name=study_name, 
        storage=storage_name, 
        load_if_exists=True, 
        direction="maximize"
    )
    
    print(f"\n--- Optuna 최적화 시작 (Study: {study_name}) ---")
    study.optimize(lambda trial: objective(trial, train_data, val_data, model_meta), n_trials=200)
    
    # 3. 최적화 결과 출력
    print("\n--- 최적화 완료 ---")
    print(f"최고의 F1 Score: {study.best_value:.4f}")
    print("최적의 하이퍼파라미터:")
    best_params = study.best_params
    for key, value in best_params.items():
        print(f"  - {key}: {value}")

    # 4. 최적의 파라미터로 최종 모델 학습 및 평가
    print("\n--- 최적의 파라미터로 최종 모델 학습 및 평가 ---")
    best_params['input_size'] = model_meta['input_size']
    
    # Early Stopping을 위해 훈련 데이터만 사용
    final_train_loader = DataLoader(TensorDataset(*train_data), batch_size=best_params['batch_size'], shuffle=True)
    final_model, final_loss_fn, final_optimizer = create_model(model_meta, best_params)
    
    # 조기 종료(patience=10)를 적용하여 최종 모델 학습
    best_final_model = train_with_early_stopping(final_model, final_loss_fn, final_optimizer, final_train_loader, val_data, epochs=150, patience=10)
    
    print("\n--- 최종 모델 평가 (테스트 데이터) ---")
    evaluate(best_final_model, test_data, print_results=True)

    # 5. 최종 모델 저장
    print("\n--- 최종 모델 저장 ---")
    model_save_path = "trained_model.pth"
    torch.save({
        'model_state_dict': best_final_model.state_dict(),
        'best_params': best_params,
        'model_meta': model_meta
    }, model_save_path)
    print(f"모델이 {model_save_path} 경로에 저장되었습니다.")


if __name__ == "__main__":
    main()
