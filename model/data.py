"""
model/data.py - XGBoost용 피처 엔지니어링 모듈
ITAD API에서 가격 히스토리를 수집하고 행 기반 피처 테이블을 생성합니다.
"""
import os
import sys
import json
import numpy as np
import pandas as pd
from datetime import datetime, date, timedelta
from pathlib import Path
from typing import List, Tuple, Dict, Any, Optional

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
import joblib

# itad_api.py 재사용
sys.path.insert(0, str(Path(__file__).parent))
from itad_api import ItadApiClient, PriceHistoryRecord

# 스팀 대형 세일 일정 (월, 일) - 다음 세일까지 날짜 계산용
MAJOR_SALES = [
    (3, 13),   # 봄 세일
    (6, 24),   # 여름 세일
    (10, 28),  # 할로윈 세일
    (11, 26),  # 가을 세일
    (12, 19),  # 겨울 세일
]
SALE_DURATION_DAYS = 10  # 대형 세일 기간 (일)


def days_to_next_major_sale(ref_date: date) -> int:
    """ref_date로부터 다음 스팀 대형 세일까지 남은 일수"""
    year = ref_date.year
    candidates = []
    for month, day in MAJOR_SALES:
        for y in [year, year + 1]:
            try:
                sale_date = date(y, month, day)
                delta = (sale_date - ref_date).days
                if delta >= 0:
                    candidates.append(delta)
            except ValueError:
                pass
    return min(candidates) if candidates else 999


def is_major_sale_period(ref_date: date) -> int:
    """현재 대형 세일 기간 여부 (1/0)"""
    for month, day in MAJOR_SALES:
        try:
            sale_start = date(ref_date.year, month, day)
            sale_end = sale_start + timedelta(days=SALE_DURATION_DAYS)
            if sale_start <= ref_date <= sale_end:
                return 1
        except ValueError:
            pass
    return 0


def build_features_from_history(
    history: List[PriceHistoryRecord],
    release_date: Optional[date],
    appid: str,
) -> pd.DataFrame:
    """
    가격 히스토리로부터 XGBoost 피처 데이터프레임을 생성합니다.
    각 행 = 특정 날짜의 피처 스냅샷
    타깃 = is_sale (해당 날짜에 할인 여부)
    """
    if not history:
        return pd.DataFrame()

    # 히스토리를 날짜별로 정리
    records = []
    for rec in history:
        ts = rec.timestamp
        if ts.tzinfo is not None:
            ts = ts.replace(tzinfo=None)
        d = ts.date()
        cut = rec.deal.cut if rec.deal else 0.0
        price = rec.deal.price.amount if rec.deal else None
        regular = rec.deal.regular.amount if rec.deal else None
        records.append({
            'date': d,
            'cut': cut,
            'price': price,
            'regular': regular,
        })

    if not records:
        return pd.DataFrame()

    df = pd.DataFrame(records).sort_values('date').reset_index(drop=True)

    # 날짜 중복 제거 (같은 날 최대 할인 유지)
    df = df.groupby('date').agg({'cut': 'max', 'price': 'min', 'regular': 'first'}).reset_index()
    df = df.sort_values('date').reset_index(drop=True)

    # 연속 날짜 범위 생성
    date_range = pd.date_range(df['date'].min(), df['date'].max(), freq='D')
    df_full = pd.DataFrame({'date': date_range.date})
    df_full = df_full.merge(df, on='date', how='left')
    df_full['cut'] = df_full['cut'].fillna(0.0)
    df_full['regular'] = df_full['regular'].ffill().bfill()
    df_full['price'] = df_full['price'].fillna(df_full['regular'])

    rows = []
    sale_dates = sorted(df_full[df_full['cut'] > 0]['date'].tolist())

    # 전체 할인 주기 계산
    if len(sale_dates) >= 2:
        intervals = [(sale_dates[i+1] - sale_dates[i]).days for i in range(len(sale_dates)-1)]
        avg_interval = float(np.mean(intervals))
    else:
        avg_interval = 365.0

    max_discount = float(df_full['cut'].max())

    for idx, row in df_full.iterrows():
        ref_date = row['date']
        cut = row['cut']
        regular = row['regular']
        price = row['price']

        # days_since_last_sale
        past_sales = [d for d in sale_dates if d < ref_date and d != ref_date]
        days_since_last = (ref_date - past_sales[-1]).days if past_sales else 999

        # sale_count_last_365d
        one_year_ago = ref_date - timedelta(days=365)
        sale_count_365 = sum(1 for d in sale_dates if one_year_ago <= d < ref_date)

        # cut_rolling_mean_30d
        thirty_ago = ref_date - timedelta(days=30)
        recent_cuts = df_full[
            (df_full['date'] >= thirty_ago) & (df_full['date'] < ref_date)
        ]['cut']
        cut_rolling_mean = float(recent_cuts.mean()) if len(recent_cuts) > 0 else 0.0

        # price_ratio
        price_ratio = (price / regular) if (regular and regular > 0) else 1.0

        # days_since_release
        if release_date:
            days_since_release = max(0, (ref_date - release_date).days)
        else:
            days_since_release = -1

        # 타깃: 다음 날 할인 여부
        next_dates = [d for d in sale_dates if d > ref_date]
        is_sale = 1 if (next_dates and (next_dates[0] - ref_date).days == 1) else 0

        rows.append({
            'appid': appid,
            'date': ref_date,
            'days_since_last_sale': days_since_last,
            'days_to_next_major_sale': days_to_next_major_sale(ref_date),
            'is_major_sale_period': is_major_sale_period(ref_date),
            'avg_sale_interval_days': avg_interval,
            'max_historical_discount': max_discount,
            'days_since_release': days_since_release,
            'month': ref_date.month,
            'dayofweek': ref_date.weekday(),
            'dayofyear': ref_date.timetuple().tm_yday,
            'sale_count_last_365d': sale_count_365,
            'cut_rolling_mean_30d': cut_rolling_mean,
            'price_ratio': price_ratio,
            'is_sale': is_sale,
        })

    return pd.DataFrame(rows)


FEATURE_NAMES = [
    'days_since_last_sale',
    'days_to_next_major_sale',
    'is_major_sale_period',
    'avg_sale_interval_days',
    'max_historical_discount',
    'days_since_release',
    'month',
    'dayofweek',
    'dayofyear',
    'sale_count_last_365d',
    'cut_rolling_mean_30d',
    'price_ratio',
]


def load_data(games_list_path: Optional[str] = None) -> Tuple:
    """
    게임 목록에서 ITAD API로 데이터를 수집하고 학습/테스트 세트를 반환합니다.
    """
    client = ItadApiClient()

    model_dir = Path(__file__).parent
    if games_list_path is None:
        games_list_path = model_dir / 'games_list.json'

    with open(games_list_path, 'r', encoding='utf-8') as f:
        games = json.load(f)

    all_dfs = []
    for game in games:
        appid = str(game.get('appid') or game.get('id', ''))
        if not appid:
            continue
        print(f"  수집 중: {game.get('name', appid)} (appid={appid})")
        try:
            gid, title = client.get_game_gid_and_title(appid)
            if not gid:
                print(f"    → ITAD GID 없음, 스킵")
                continue
            history = client.get_price_history(gid)
            if not history:
                print(f"    → 히스토리 없음, 스킵")
                continue
            game_info = client.get_game_info(gid)
            release_date = game_info.releaseDate if game_info else None
            df = build_features_from_history(history, release_date, appid)
            if not df.empty:
                all_dfs.append(df)
                print(f"    → {len(df)}행 생성")
        except Exception as e:
            print(f"    → 오류: {e}")
            continue

    if not all_dfs:
        raise ValueError("수집된 데이터가 없습니다. games_list.json을 확인하세요.")

    full_df = pd.concat(all_dfs, ignore_index=True)
    print(f"\n전체 데이터: {len(full_df)}행, 양성 비율: {full_df['is_sale'].mean():.3f}")

    X = full_df[FEATURE_NAMES].values
    y = full_df['is_sale'].values

    # 스케일러 (XGBoost는 필수는 아니지만 호환성 유지)
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    X_train, X_test, y_train, y_test = train_test_split(
        X_scaled, y, test_size=0.2, random_state=42, stratify=y
    )

    model_meta = {
        'feature_names': FEATURE_NAMES,
        'n_samples': len(full_df),
        'positive_rate': float(full_df['is_sale'].mean()),
        'created_at': datetime.now().isoformat(),
    }

    return X_train, X_test, y_train, y_test, FEATURE_NAMES, scaler, model_meta


def build_realtime_features(appid: str) -> Optional[np.ndarray]:
    """
    실시간 예측용: 특정 appid에 대해 현재 날짜 기준 피처 벡터를 생성합니다.
    학습된 스케일러 경로에서 로드합니다.
    """
    client = ItadApiClient()
    model_dir = Path(__file__).parent

    gid, _ = client.get_game_gid_and_title(appid)
    if not gid:
        return None

    history = client.get_price_history(gid)
    if not history:
        return None

    game_info = client.get_game_info(gid)
    release_date = game_info.releaseDate if game_info else None

    df = build_features_from_history(history, release_date, appid)
    if df.empty:
        return None

    # 가장 최신 행 사용
    latest = df.sort_values('date').iloc[-1]
    features = np.array([[latest[f] for f in FEATURE_NAMES]])

    # 스케일러 로드
    scaler_path = model_dir / 'model_meta.pkl'
    if scaler_path.exists():
        meta = joblib.load(scaler_path)
        scaler = meta.get('scaler')
        if scaler:
            features = scaler.transform(features)

    return features
