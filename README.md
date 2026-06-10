# WaitForSale - Steam 게임 할인 예측 서비스

## 📋 프로젝트 개요

### 프로젝트 설명

Steam에 있는 게임들의 할인 패턴을 분석하여, 머신러닝/딥러닝을 통해 할인이 예상되는 게임들을 예측하고 보여주는 웹 서비스

### 프로젝트 목적

원하는 게임이 있을떄 고민하다가 구매하였으나 얼마 안가서 그 게임이 할인을 하면 느끼는 허탈감등을 해결하기 위함이다
반대로 원하는 게임이 있을때 할인할때까지 무기한 기다리기에는 과연 이 게임이 언제 할인할까라는 고민만 계속 안고 가기 때문에 그 고민을 어느 정도 해소하기 위함이다

### 타겟 사용자

Steam에서 게임을 찾고있는 사람들

---

## 🎯 핵심 기능

### 필수 기능

1. **게임 할인 정보 수집**
   - Steam 게임들의 과거 할인 이력 데이터 수집
   - 실시간 가격 정보 모니터링
2. **할인 예측 모델**
   - 수집된 데이터를 기반으로 할인 패턴 학습
   - 특정 게임의 할인 확률 및 예상 시기 예측
3. **웹 인터페이스**
   - 게임 검색 기능
   - 할인 예측 결과 시각화
   - 게임 정보 및 할인 히스토리 표시

### 부가 기능

1. 사용자 계정 시스템 (회원가입/로그인)
2. 관심 게임 찜하기 기능
3. 할인 예상 시 알림 기능 (이메일/푸시)
4. 게임 가격 비교 차트
5. 커뮤니티 기능 (할인 정보 공유)

---

## 🛠 기술 스택

### 프론트엔드

- React
- TypeScript (타입 안정성)
- React Router (페이지 라우팅)
- Axios (API 통신)
- Chart.js 또는 Recharts (데이터 시각화)
- Tailwind CSS 또는 Material-UI (스타일링)

### 백엔드

- Node.js + Express
- TypeScript
- JWT (사용자 인증)
- Node-cron (정기적 데이터 수집)

### 머신러닝/딥러닝

- Python
- Pandas (데이터 처리)
- Scikit-learn (머신러닝 기본)
- TensorFlow 또는 PyTorch (딥러닝, 선택사항)
- Flask 또는 FastAPI (ML 모델 API 서버)

### 데이터베이스

- PostgreSQL (주 데이터베이스)

### 기타

- Git & GitHub (버전 관리)
- Steam API (데이터 소스)
- BeautifulSoup (웹 크롤링)

## 📊 데이터 수집 계획

### 수집할 데이터

- 게임 기본 정보 (이름, 장르, 출시일, 개발사 등)
- 현재 가격 및 정가
- 할인 이력 (할인 시작/종료 날짜, 할인율)
- 시즌 세일 정보 (봄, 여름, 가을, 겨울 세일 등)
- 게임 메타데이터 (태그, 카테고리, 플랫폼)
- 사용자 리뷰 수 및 평점

### 데이터 소스

- Steam Store API (공식 API)
- SteamDB 또는 IsThereAnyDeal (할인 이력)
- Steam Web Scraping (API로 제공되지 않는 정보)
- Steamworks API (개발자 키 필요시)

### 수집 방법

- 정기적인 크롤링 스케줄러 (매일 또는 매주)
- Steam API를 통한 실시간 가격 조회
- 데이터베이스에 이력 누적 저장
- 중복 데이터 방지 및 업데이트 로직 구현

## 📈 개발 단계

### Phase 1: 환경 설정 및 데이터 수집 시스템 구축

- [ ] 프로젝트 초기 설정 (Git 저장소, 폴더 구조)
- [ ] Steam API 키 발급 및 테스트
- [ ] 데이터베이스 스키마 설계
- [ ] 기본 크롤러 개발 (게임 정보 수집)
- [ ] 데이터 저장 로직 구현
- [ ] 정기적 데이터 수집 스케줄러 구현

### Phase 2: 머신러닝 모델 개발

- [ ] 수집된 데이터 분석 및 전처리
- [ ] Feature Engineering (특성 추출)
- [ ] 기본 ML 모델 학습 (Linear Regression, Random Forest 등)
- [ ] 모델 성능 평가 및 개선
- [ ] 예측 API 서버 구축 (Flask/FastAPI)
- [ ] 모델 배포 준비

### Phase 3: 웹 프론트엔드 및 백엔드 개발

- [ ] React 프로젝트 초기 설정
- [ ] 기본 UI/UX 디자인 및 컴포넌트 구조 설계
- [ ] 게임 검색 기능 구현
- [ ] 할인 예측 결과 화면 구현
- [ ] Express 백엔드 API 개발
- [ ] 프론트엔드-백엔드 연동
- [ ] (선택) 사용자 인증 시스템 구현

### Phase 4: 통합, 테스트 및 배포

- [ ] 전체 시스템 통합 테스트
- [ ] 버그 수정 및 최적화
- [ ] 사용자 테스트 (베타)
- [ ] 배포 환경 구축 (Vercel, Heroku, AWS 등)
- [ ] 문서화 작성
- [ ] 프로덕션 배포

---

## 📅 예상 일정

| 단계     | 내용                    | 예상 기간   |
| -------- | ----------------------- | ----------- |
| Phase 1  | 데이터 수집 시스템 구축 | 2-3주       |
| Phase 2  | 머신러닝 모델 개발      | 3-4주       |
| Phase 3  | 웹 프론트/백엔드 개발   | 4-5주       |
| Phase 4  | 통합, 테스트 및 배포    | 2-3주       |
| **총합** | **전체 프로젝트**       | **11-15주** |

---

## 📝 참고 사항

### 고려사항

- Steam API 사용 제한 및 Rate Limiting 확인 필요
- 데이터 수집 시 저작권 및 이용약관 준수
- 충분한 학습 데이터 확보를 위한 시간 필요 (최소 3-6개월 이상의 데이터)
- 모델 정확도 향상을 위한 지속적인 데이터 업데이트 필요
- 서버 비용 및 호스팅 계획 수립
- 예측 정확도 한계 인지 (100% 정확한 예측은 불가능)

### 학습 목표

- React + TypeScript를 활용한 실전 웹 개발 경험
- RESTful API 설계 및 구현 능력 향상
- 머신러닝 기초 이론 학습 및 실제 적용
- 데이터 수집, 전처리, 분석 과정 경험
- 풀스택 개발 프로세스 이해
- Git을 활용한 버전 관리 및 협업 능력
- 프로젝트 기획부터 배포까지 전체 라이프사이클 경험
- 포트폴리오용 완성도 높은 프로젝트 구축

## 🚀 시작하기

### 사전 요구사항

- Node.js (v18+)
- Python (3.10+)
- PostgreSQL
- npm

### 1. 환경 변수 설정

```bash
# 프로젝트 루트에 .env 파일 생성
DB_USER=your_db_user
DB_HOST=localhost
DB_NAME=waitforsale_db
DB_PASSWORD=your_password
DB_PORT=5432
STEAM_API_KEY=your_steam_api_key
ITAD_API_KEY=your_itad_api_key
ML_SERVER_URL=http://localhost:8000
```

### 2. 백엔드 실행

```bash
cd backend
npm install
npm run dev
```

### 3. 프론트엔드 실행

```bash
cd frontend
npm install
npm run dev
```

### 4. ML 서버 실행

```bash
cd model
pip install -r requirements.txt
python train.py          # 모델 학습 (최초 1회)
uvicorn server:app --reload  # 예측 서버 실행
```

---

## 📖 프로젝트 구조

```
WaitForSale/
├── backend/          # Express + TypeScript 백엔드
│   ├── src/
│   │   ├── db/       # PostgreSQL 연결 & 스키마
│   │   ├── routes/   # API 라우트
│   │   └── services/ # Steam 데이터 수집 서비스
│   └── package.json
├── frontend/         # React + Vite 프론트엔드
│   ├── src/
│   │   ├── components/  # UI 컴포넌트
│   │   └── services/    # API 통신 레이어
│   └── package.json
├── model/            # PyTorch LSTM 예측 모델
│   ├── data.py       # 데이터 수집 & 전처리
│   ├── model.py      # LSTM 모델 정의
│   ├── train.py      # 학습 파이프라인 (Optuna)
│   ├── server.py     # FastAPI 예측 서버
│   └── itad_api.py   # IsThereAnyDeal API 클라이언트
├── .env              # 환경 변수 (Git 제외)
└── README.md
```
