import pandas as pd
import torch
import numpy as np
import json
from datetime import datetime
from .itad_api import ItadApiClient
from sklearn.preprocessing import MinMaxScaler
from typing import Tuple, Any
from pathlib import Path

def _sequences(data: np.ndarray, seq_length: int, feature_cols_len: int) -> Tuple:
    """Helper function to create sequences from time-series data."""
    all_xs, all_ys, all_gids, all_dev_ids, all_pub_ids = [], [], [], [], []
    
    id_start_idx = feature_cols_len + 1 # is_sale 다음부터 id 컬럼들
    
    unique_game_ids = np.unique(data[:, id_start_idx])

    for game_id in unique_game_ids:
        indices = np.where(data[:, id_start_idx] == game_id)[0]
        if len(indices) <= seq_length:
            continue
        
        game_data = data[indices]
        
        for i in range(len(game_data) - seq_length):
            # 특징과 레이블 분리
            sequence = game_data[i : i + seq_length + 1]
            features = sequence[:-1, :feature_cols_len]
            label = sequence[-1, feature_cols_len] # is_sale
            
            # ID 정보 (시퀀스의 마지막 스텝에서 가져와도 동일)
            ids = sequence[-1, id_start_idx:]

            all_xs.append(features)
            all_ys.append(label)
            all_gids.append(ids[0])
            all_dev_ids.append(ids[1])
            all_pub_ids.append(ids[2])

    return (np.array(all_xs), np.array(all_ys).reshape(-1, 1),
            np.array(all_gids).reshape(-1, 1), np.array(all_dev_ids).reshape(-1, 1), np.array(all_pub_ids).reshape(-1, 1))


def _preprocess_and_feature_engineer(df: pd.DataFrame, seq_length: int) -> Tuple[Any, ...]:
    """Internal function for preprocessing and feature engineering."""
    
    # 1. ID 매핑 생성
    dev_map = {name: i for i, name in enumerate(df['developer'].unique())}
    pub_map = {name: i for i, name in enumerate(df['publisher'].unique())}
    df['developer_id'] = df['developer'].map(dev_map)
    df['publisher_id'] = df['publisher'].map(pub_map)

    # 2. 특징 생성
    df['release_date'] = pd.to_datetime(df['release_date'], errors='coerce')
    df['days_since_release'] = (df.index.tz_localize(None) - df['release_date']).dt.days.fillna(0).astype(float)

    df['dayofyear'] = df.index.dayofyear.astype(float)
    df['dayofweek'] = df.index.dayofweek.astype(float)
    df['month'] = df.index.month.astype(float)
    df['weekofyear'] = df.index.isocalendar().week.astype(float)
    
    df['regular_price'] = df.groupby('game_id')['regular_price'].ffill()
    df['is_sale'] = (df['price'] < df['regular_price'] * 0.95).astype(int)

    def is_major_sale_period(date):
        month, day = date.month, date.day
        return 1 if (month == 3 and 13 <= day <= 20) or \
                     (month == 6 and day >= 26 or month == 7 and day <= 10) or \
                     (month == 9 and day >= 29 or month == 10 and day <= 6) or \
                     (month == 12 and day >= 18 or month == 1 and day <= 5) else 0
    df['is_major_sale'] = df.index.to_series().apply(is_major_sale_period).astype(float)
    
    # 3. 데이터 스케일링
    features_to_scale = ['cut', 'days_since_release', 'dayofyear', 'dayofweek', 'month', 'weekofyear']
    binary_features = ['is_major_sale']
    
    scaler = MinMaxScaler(feature_range=(-1, 1))
    df[features_to_scale] = scaler.fit_transform(df[features_to_scale])

    # 4. 시퀀스 생성을 위한 numpy 배열 준비
    feature_cols = features_to_scale + binary_features
    label_col = ['is_sale']
    id_cols = ['game_id', 'developer_id', 'publisher_id']
    
    data_for_sequencing = df[feature_cols + label_col + id_cols].values
    
    X, y, g_ids, dev_ids, pub_ids = _sequences(data_for_sequencing, seq_length, len(feature_cols))

    if len(X) == 0:
        return None

    # 5. 데이터 분할 및 텐서 변환
    # 데이터를 섞어 과적합 방지 및 일반화 성능 향상
    num_samples = len(X)
    indices = np.random.permutation(num_samples)
    
    X = X[indices]
    y = y[indices]
    g_ids = g_ids[indices]
    dev_ids = dev_ids[indices]
    pub_ids = pub_ids[indices]

    train_size = int(num_samples * 0.7)
    val_size = int(num_samples * 0.15)
    
    X_train = torch.from_numpy(X[:train_size]).float()
    y_train = torch.from_numpy(y[:train_size]).float()
    g_train = torch.from_numpy(g_ids[:train_size]).long()
    dev_train = torch.from_numpy(dev_ids[:train_size]).long()
    pub_train = torch.from_numpy(pub_ids[:train_size]).long()

    X_val = torch.from_numpy(X[train_size:train_size+val_size]).float()
    y_val = torch.from_numpy(y[train_size:train_size+val_size]).float()
    g_val = torch.from_numpy(g_ids[train_size:train_size+val_size]).long()
    dev_val = torch.from_numpy(dev_ids[train_size:train_size+val_size]).long()
    pub_val = torch.from_numpy(pub_ids[train_size:train_size+val_size]).long()

    X_test = torch.from_numpy(X[train_size+val_size:]).float()
    y_test = torch.from_numpy(y[train_size+val_size:]).float()
    g_test = torch.from_numpy(g_ids[train_size+val_size:]).long()
    dev_test = torch.from_numpy(dev_ids[train_size+val_size:]).long()
    pub_test = torch.from_numpy(pub_ids[train_size+val_size:]).long()
    
    model_meta = {
        "num_games": df['game_id'].nunique(),
        "num_devs": len(dev_map),
        "num_pubs": len(pub_map),
        "input_size": len(feature_cols),
        "sale_counts": df['is_sale'].value_counts(),
        "dev_map": dev_map,
        "pub_map": pub_map,
        "scaler": scaler
    }

    train_data = (X_train, y_train, g_train, dev_train, pub_train)
    val_data = (X_val, y_val, g_val, dev_val, pub_val)
    test_data = (X_test, y_test, g_test, dev_test, pub_test)

    return train_data, val_data, test_data, model_meta

def get_processed_data(seq_length: int = 30) -> Tuple[Tuple, Tuple, Tuple, dict]:
    """
    Main function to fetch, process, and prepare data for model training.
    """
    # --- 데이터 수집 ---
    try:
        script_dir = Path(__file__).parent
        games_list_path = script_dir / 'games_list.json'
        with open(games_list_path, 'r') as f:
            games_to_process = json.load(f)['games']
    except FileNotFoundError:
        print(f"`{games_list_path}` 파일을 찾을 수 없습니다.")
        raise

    client = ItadApiClient()
    all_games_data = []
    
    print("--- 데이터 수집 시작 ---")
    for game_id, game_info in enumerate(games_to_process):
        gid, _ = client.get_game_gid_and_title(str(game_info['appid']))
        if not gid: continue
            
        game_meta = client.get_game_info(gid)
        release_date = game_meta.releaseDate if game_meta else None
        developer = game_meta.developers[0].name if game_meta and game_meta.developers else "Unknown"
        publisher = game_meta.publishers[0].name if game_meta and game_meta.publishers else "Unknown"

        history = client.get_price_history(gid)
        if not history: continue

        for record in history:
            if record.deal:
                all_games_data.append({
                    'game_id': game_id, 'date': record.timestamp, 'price': record.deal.price.amount,
                    'cut': record.deal.cut, 'regular_price': record.deal.regular.amount,
                    'release_date': release_date, 'developer': developer, 'publisher': publisher
                })

    if not all_games_data:
        print("처리할 할인 기록이 없습니다."); return None

    # --- 데이터프레임 생성 및 통합 ---
    history_df = pd.DataFrame(all_games_data)
    history_df['date'] = pd.to_datetime(history_df['date'], utc=True)
    history_df.sort_values(by=['game_id', 'date'], inplace=True)
    history_df = history_df.drop_duplicates(subset=['game_id', 'date'], keep='last').set_index('date')

    # --- 리샘플링 ---
    # 각 게임별로 리샘플링 후 재결합
    resampled_dfs = [
        group.resample('D').ffill()
        for _, group in history_df.groupby('game_id')
    ]
    final_df = pd.concat(resampled_dfs).sort_index()
    final_df.dropna(subset=['regular_price'], inplace=True)
    print("\n--- 데이터 통합 및 Resampling 완료 ---")

    # --- 데이터 전처리 및 특징 공학 ---
    return _preprocess_and_feature_engineer(final_df, seq_length)

def get_live_game_data(appid: str, model_meta: dict, seq_length: int = 30) -> Tuple[Any, ...]:
    """
    Fetches live data for a single game, preprocesses it using the trained
    scaler and maps from model_meta, and prepares it for prediction.
    """
    client = ItadApiClient()

    # 1. Get game GID and metadata
    gid, _ = client.get_game_gid_and_title(appid)
    if not gid:
        print(f"Could not find GID for appid: {appid}")
        return None

    game_meta_api = client.get_game_info(gid)
    if not game_meta_api:
        print(f"Could not find metadata for GID: {gid}")
        return None
    
    release_date = game_meta_api.releaseDate
    developer = game_meta_api.developers[0].name if game_meta_api.developers else "Unknown"
    publisher = game_meta_api.publishers[0].name if game_meta_api.publishers else "Unknown"
    
    # 2. Map developer and publisher to IDs from the trained model
    dev_map = model_meta['dev_map']
    pub_map = model_meta['pub_map']
    
    try:
        script_dir = Path(__file__).parent
        games_list_path = script_dir / 'games_list.json'
        with open(games_list_path, 'r') as f:
            games_list = json.load(f)['games']
        game_id = next((i for i, game in enumerate(games_list) if str(game.get('appid')) == appid), -1)
        if game_id == -1:
            print(f"Appid {appid} not found in games_list.json")
            return None
    except FileNotFoundError:
        print(f"{games_list_path} not found")
        return None

    developer_id = dev_map.get(developer)
    publisher_id = pub_map.get(publisher)

    if developer_id is None or publisher_id is None:
        print(f"Developer '{developer}' or Publisher '{publisher}' not in trained vocabulary.")
        return None
        
    # 3. Fetch price history
    history = client.get_price_history(gid)
    if not history or len(history) < seq_length:
        print(f"Not enough price history found for GID: {gid}")
        return None
        
    all_games_data = [{'date': r.timestamp, 'price': r.deal.price.amount, 'cut': r.deal.cut, 'regular_price': r.deal.regular.amount} for r in history if r.deal]
    
    if not all_games_data:
        print("No deal information in history.")
        return None

    df = pd.DataFrame(all_games_data)
    df['date'] = pd.to_datetime(df['date'], utc=True)
    df = df.drop_duplicates(subset=['date'], keep='last').set_index('date').sort_index()
    
    df_resampled = df.resample('D').ffill().dropna()
    
    if len(df_resampled) < seq_length:
        print(f"Not enough resampled data. Found {len(df_resampled)} days, need {seq_length}.")
        return None
        
    df_recent = df_resampled.tail(seq_length).copy()

    # 5. Feature Engineering
    df_recent['release_date'] = pd.to_datetime(release_date, errors='coerce')
    df_recent['days_since_release'] = (df_recent.index.tz_localize(None) - df_recent['release_date']).dt.days.fillna(0).astype(float)
    df_recent['dayofyear'] = df_recent.index.dayofyear.astype(float)
    df_recent['dayofweek'] = df_recent.index.dayofweek.astype(float)
    df_recent['month'] = df_recent.index.month.astype(float)
    df_recent['weekofyear'] = df_recent.index.isocalendar().week.astype(float)
    
    def is_major_sale_period(date):
        month, day = date.month, date.day
        return 1 if (month == 3 and 13 <= day <= 20) or \
                     (month == 6 and day >= 26 or month == 7 and day <= 10) or \
                     (month == 9 and day >= 29 or month == 10 and day <= 6) or \
                     (month == 12 and day >= 18 or month == 1 and day <= 5) else 0
    df_recent['is_major_sale'] = df_recent.index.to_series().apply(is_major_sale_period).astype(float)

    # 6. Scale features
    features_to_scale = ['cut', 'days_since_release', 'dayofyear', 'dayofweek', 'month', 'weekofyear']
    df_recent[features_to_scale] = model_meta['scaler'].transform(df_recent[features_to_scale])

    # 7. Prepare final numpy array
    feature_cols = features_to_scale + ['is_major_sale']
    x_features = df_recent[feature_cols].values

    return (x_features, game_id, developer_id, publisher_id)


if __name__ == '__main__':
    print("데이터 매니저 직접 실행: 처리된 데이터를 가져와서 형태를 확인합니다.")
    result = get_processed_data()
    if result:
        train_data, val_data, test_data, model_meta = result
        X_train, y_train, g_train, dev_train, pub_train = train_data
        X_val, y_val, g_val, dev_val, pub_val = val_data
        print(f"\n--- 데이터 처리 결과 ---")
        print(f"훈련 데이터 X 형태: {X_train.shape}")
        print(f"훈련 데이터 y 형태: {y_train.shape}")
        print(f"검증 데이터 X 형태: {X_val.shape}")
        print(f"검증 데이터 y 형태: {y_val.shape}")
        print(f"모델 메타 정보: {model_meta}")
    else:
        print("데이터 처리 실패")