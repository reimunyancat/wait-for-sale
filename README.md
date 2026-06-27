# WaitForSale

A Steam discount predictor. Give it a game and it estimates how likely that game is to go on sale — so you can decide whether to buy now or wait it out.

It learns from historical Steam pricing / discount data and serves predictions through a web UI.

## How it works

- **Data** — `model/data.py` pulls price and discount history through the IsThereAnyDeal (ITAD) API and builds per-game features.
- **Model** — `model/model.py` is an **XGBoost** classifier (`SalePredictorXGB`) that outputs a discount probability. It handles class imbalance with `scale_pos_weight` and supports early stopping and feature-importance inspection.
- **Training** — `model/train.py` uses a train/test split, evaluates with **AUC** and **F1** plus a full classification report, and saves `trained_model.json` + `model_meta.pkl`.
- **Serving** — `model/server.py` is a **FastAPI** server that exposes the predictions.

## Stack

- **Frontend:** React + TypeScript (Vite)
- **Backend:** Node.js + Express + TypeScript — data collection and API
- **ML:** Python, XGBoost, scikit-learn (metrics), FastAPI
- **Data source:** Steam / IsThereAnyDeal

## Project structure

```
wait-for-sale/
├── backend/    # Express + TypeScript API & data collection
├── frontend/   # React + Vite UI
└── model/      # XGBoost predictor + FastAPI server
    ├── data.py     # ITAD data collection & features
    ├── model.py    # SalePredictorXGB (XGBoost)
    ├── train.py    # training + evaluation
    └── server.py   # FastAPI prediction server
```

## Status

Work in progress — the model and the full-stack scaffold are in place; the UI/UX and deployment are still being built out.
