import os
import requests
import time
from datetime import datetime, date
from typing import List, Optional, Tuple, Dict, Any

from pydantic import BaseModel, Field, HttpUrl
from dotenv import load_dotenv
from pathlib import Path

project_root = Path(__file__).parent.parent
load_dotenv(dotenv_path=project_root / ".env")

class GameAsset(BaseModel):
    boxart: Optional[HttpUrl] = None

class GameLookup(BaseModel):
    id: str
    slug: str
    title: str
    type: str
    mature: bool
    assets: GameAsset

class GameLookupResponse(BaseModel):
    found: bool
    game: Optional[GameLookup] = None

class Shop(BaseModel):
    id: int
    name: str

class PriceInfo(BaseModel):
    amount: float
    amount_int: int = Field(..., alias='amountInt')
    currency: str

class Deal(BaseModel):
    price: PriceInfo
    regular: PriceInfo
    cut: float

class PriceHistoryRecord(BaseModel):
    timestamp: datetime
    shop: Shop
    deal: Optional[Deal] = None

class Company(BaseModel):
    id: int
    name: str

class GameInfo(BaseModel):
    releaseDate: Optional[date] = None
    developers: List[Company] = []
    publishers: List[Company] = []

# --- API Client ---
class ItadApiClient:
    def __init__(self, max_retries: int = 3, delay: float = 0.5):
        self.api_key = os.getenv('ITAD_API_KEY')
        if not self.api_key:
            raise ValueError("ITAD_API_KEY가 .env 파일에 설정되지 않았습니다.")
        self.base_url = "https://api.isthereanydeal.com"
        self.max_retries = max_retries
        self.delay = delay

    def _make_request(self, url: str, params: Dict[str, Any]) -> Optional[Any]:
        """Helper method to make a request with retries and delay."""
        time.sleep(self.delay)
        for attempt in range(self.max_retries):
            try:
                response = requests.get(url, params=params)
                response.raise_for_status()
                return response.json()
            except requests.exceptions.RequestException as e:
                print(f"API 요청 실패 (시도 {attempt + 1}/{self.max_retries}): {e}")
                if attempt < self.max_retries - 1:
                    time.sleep(1)
            except Exception as e:
                print(f"알 수 없는 에러 발생: {e}")
                break
        return None

    def get_game_gid_and_title(self, steam_app_id: str) -> Tuple[Optional[str], Optional[str]]:
        """Steam AppID를 사용하여 ITAD GID와 게임 제목을 조회합니다."""
        url = f"{self.base_url}/games/lookup/v1"
        params = {'key': self.api_key, 'appid': steam_app_id}
        
        data = self._make_request(url, params)
        if data:
            try:
                lookup_data = GameLookupResponse.model_validate(data)
                if lookup_data.found and lookup_data.game:
                    return lookup_data.game.id, lookup_data.game.title
            except Exception as e:
                print(f"데이터 처리 중 오류 발생 (get_game_gid_and_title): {e}")
        return None, None

    def get_price_history(self, gid: str, since: Optional[str] = '2000-01-01T00:00:00Z') -> List[PriceHistoryRecord]:
        """게임 GID를 사용하여 Steam 상점의 가격 변동 내역을 가져옵니다."""
        url = f"{self.base_url}/games/history/v2"
        params = {'key': self.api_key, 'id': gid, 'shops': 'steam'}
        if since:
            params['since'] = since

        history_data = self._make_request(url, params)
        if history_data:
            try:
                if isinstance(history_data, list):
                    return [PriceHistoryRecord.model_validate(record) for record in history_data]
                if isinstance(history_data, dict) and 'data' in history_data:
                    return [PriceHistoryRecord.model_validate(record) for record in history_data['data']]
            except Exception as e:
                print(f"데이터 처리 중 오류 발생 (get_price_history): {e}")
        return []

    def get_game_info(self, gid: str) -> Optional[GameInfo]:
        """게임 GID를 사용하여 메타데이터를 가져옵니다."""
        url = f"{self.base_url}/games/info/v2"
        params = {'key': self.api_key, 'id': gid}

        data = self._make_request(url, params)
        if data:
            try:
                if isinstance(data, list) and data:
                    return GameInfo.model_validate(data[0])
                elif isinstance(data, dict):
                     return GameInfo.model_validate(data)
            except Exception as e:
                print(f"데이터 처리 중 오류 발생 (get_game_info): {e}, GID: {gid}")
        return None