import React from "react";

export interface Game {
  id: string;
  name: string;
  developer: string;
  header_image: string;
  original_price?: number; // cents
  current_price?: number;  // cents
  predicted_discount?: number;
  predicted_period?: string;
  // XGBoost 예측 결과 (서버 /predict 응답)
  sale_probability?: number;       // 0.0 ~ 1.0
  is_predicted_on_sale?: boolean;
  prediction_confidence?: "high" | "medium" | "low";
}

interface GameCardProps {
  game: Game;
  isPrediction?: boolean;
}

const formatPrice = (cents: number) =>
  `₩${(cents / 100).toLocaleString("ko-KR")}`;

function getGaugeColor(prob: number): string {
  if (prob >= 0.7) return "#66ff80";
  if (prob >= 0.4) return "#66c0f4";
  return "#607d8f";
}

function getPredictionText(prob: number, confidence?: string): string {
  const pct = Math.round(prob * 100);
  if (prob >= 0.7) return `${pct}% 확률로 곧 할인 가능성이 높습니다!`;
  if (prob >= 0.4) return `${pct}% 확률로 할인될 수 있습니다.`;
  return `${pct}% — 당분간 할인 가능성은 낮습니다.`;
}

export default function GameCard({ game, isPrediction = false }: GameCardProps) {
  const hasDiscount =
    typeof game.original_price === "number" &&
    typeof game.current_price === "number" &&
    game.original_price > game.current_price;

  const discountPct = hasDiscount
    ? Math.round((1 - game.current_price! / game.original_price!) * 100)
    : 0;

  const prob = game.sale_probability ?? 0;
  const hasProbability = typeof game.sale_probability === "number";
  const confidence = game.prediction_confidence ?? "low";

  return (
    <div className="game-card">
      {/* 헤더 이미지 */}
      <div className="game-card__image-wrap">
        <img
          src={game.header_image}
          alt={game.name}
          className="game-card__image"
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              "https://store.cloudflare.steamstatic.com/public/shared/images/header/globalheader_logo.png";
          }}
        />
        {hasDiscount && (
          <div className="game-card__discount-badge">-{discountPct}%</div>
        )}
      </div>

      {/* 카드 본문 */}
      <div className="game-card__body">
        <div className="game-card__name" title={game.name}>
          {game.name}
        </div>
        <div className="game-card__developer">{game.developer}</div>

        {/* 현재 할인 중 배너 */}
        {hasDiscount && (
          <div className="game-card__on-sale-banner">
            <span className="game-card__on-sale-text">
              🎉 지금 할인 중! -{discountPct}%
            </span>
            <span className="game-card__on-sale-price">
              {formatPrice(game.current_price!)}
            </span>
          </div>
        )}

        {/* AI 예측 게이지 바 */}
        {hasProbability && (
          <div className="game-card__prediction">
            <div className="game-card__prediction-label">
              <span>AI 할인 예측</span>
              <span>{Math.round(prob * 100)}%</span>
            </div>
            <div className="gauge-bar">
              <div
                className={`gauge-bar__fill${confidence === "high" ? " gauge-bar__fill--high" : ""}`}
                style={{
                  width: `${Math.round(prob * 100)}%`,
                  background: `linear-gradient(90deg, ${getGaugeColor(prob)}, ${getGaugeColor(prob)}cc)`,
                }}
              />
            </div>
            <div
              className={`game-card__prediction-text prediction-text--${confidence}`}
            >
              {getPredictionText(prob, confidence)}
            </div>
          </div>
        )}

        {/* 레거시: predicted_discount */}
        {!hasProbability && isPrediction && game.predicted_discount && (
          <div className="game-card__prediction">
            <div className="game-card__prediction-label">
              <span>AI 할인 예측</span>
              <span>{game.predicted_discount}%</span>
            </div>
            <div className="gauge-bar">
              <div
                className="gauge-bar__fill"
                style={{
                  width: `${game.predicted_discount}%`,
                  background: getGaugeColor(game.predicted_discount / 100),
                }}
              />
            </div>
            {game.predicted_period && (
              <div className="game-card__prediction-text prediction-text--medium">
                {game.predicted_period}
              </div>
            )}
          </div>
        )}

        {/* 가격 표시 */}
        <div className="game-card__price-row">
          {hasDiscount ? (
            <>
              <span className="price-original">
                {formatPrice(game.original_price!)}
              </span>
              <span className="price-current price-current--discounted">
                {formatPrice(game.current_price!)}
              </span>
            </>
          ) : (
            <span className="price-current">
              {game.current_price ? formatPrice(game.current_price) : "가격 정보 없음"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
