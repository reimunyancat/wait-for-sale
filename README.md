# WaitForSale

```
WaitForSale/
├── frontend/          # React + Vite SPA
│   └── src/
│       ├── components/   # GameCard, GameList, GameDetailPage, Header, SearchBar
│       └── services/     # api.ts — axios wrappers
├── backend/           # Express API server
│   └── src/
│       ├── routes/       # games.ts — all API routes
│       ├── services/     # steamService.ts, predictionService.ts
│       └── db/           # schema.sql, index.ts
└── model/             # ML server
    ├── server.py         # FastAPI app
    ├── train.py          # XGBoost training script
    ├── data.py           # ITAD data collection
    └── trained_model.json
```
