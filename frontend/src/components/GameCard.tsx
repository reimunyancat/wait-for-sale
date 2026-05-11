export interface Game {
  id: string;
  name: string;
  developer: string;
  header_image: string;
  original_price?: number; // cents
  current_price?: number;  // cents
  is_on_sale?: boolean;
  predicted_discount?: number;
  predicted_period?: string;
  sale_probability?: number;
  is_predicted_on_sale?: boolean;
  prediction_confidence?: "high" | "medium" | "low";
  peak_probability?: number;
  peak_day?: number;
  predicted_sale_date?: string;
  days_until_sale?: number;
}

interface GameCardProps {
  game: Game;
  isPrediction?: boolean;
  onClick?: (gameId: string) => void;
}

const formatPrice = (cents: number) =>
  `₩${(cents / 100).toLocaleString("ko-KR")}`;

function getGaugeColor(prob: number): string {
  if (prob >= 0.7) return "#66ff80";
  if (prob >= 0.4) return "#66c0f4";
  return "#607d8f";
}

function getPredictionText(prob: number): string {
  const pct = Math.round(prob * 100);
  if (prob >= 0.7) return `${pct}% 확률로 곧 할인 가능성이 높습니다!`;
  if (prob >= 0.4) return `${pct}% 확률로 할인될 수 있습니다.`;
  return `${pct}% — 당분간 할인 가능성은 낮습니다.`;
}

export default function GameCard({ game, onClick }: GameCardProps) {
  const isOnSale = game.is_on_sale ?? (
    typeof game.original_price === "number" &&
    typeof game.current_price === "number" &&
    game.original_price > game.current_price
  );

  const discountPct = isOnSale && game.original_price && game.current_price
    ? Math.round((1 - game.current_price / game.original_price) * 100)
    : 0;

  const prob = game.peak_probability ?? game.sale_probability ?? 0;
  const hasProbability = typeof (game.peak_probability ?? game.sale_probability) === "number";
  const confidence = game.prediction_confidence ?? "low";

  const daysLabel = game.peak_day != null && prob >= 0.35
    ? game.peak_day === 0 ? "오늘" : `${game.peak_day}일 후`
    : null;

  return (
    <div
      className={`game-card${onClick ? " game-card--clickable" : ""}`}
      onClick={() => onClick?.(game.id)}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => e.key === "Enter" && onClick?.(game.id)}
    >
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
        {isOnSale && discountPct > 0 && (
          <div className="game-card__discount-badge">-{discountPct}%</div>
        )}
      </div>

      <div className="game-card__body">
        <div className="game-card__name" title={game.name}>
          {game.name}
        </div>
        <div className="game-card__developer">{game.developer}</div>

        {isOnSale && (
          <div className="game-card__on-sale-banner">
            <span className="game-card__on-sale-text">
              🎉 지금 할인 중! -{discountPct}%
            </span>
            <span className="game-card__on-sale-price">
              {game.current_price ? formatPrice(game.current_price) : ""}
            </span>
          </div>
        )}

        {hasProbability && !isOnSale && (
          <div className="game-card__prediction">
            <div className="game-card__prediction-label">
              <span>AI 할인 예측{daysLabel ? ` (${daysLabel})` : ""}</span>
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
            <div className={`game-card__prediction-text prediction-text--${confidence}`}>
              {getPredictionText(prob)}
            </div>
            {game.predicted_sale_date && game.days_until_sale != null && (
              <div style={{ fontSize: "0.68rem", color: "#66c0f4", marginTop: 2 }}>
                📅 예상 할인: {game.predicted_sale_date}
                {game.days_until_sale === 0 ? " (오늘!)" : ` (${game.days_until_sale}일 후)`}
              </div>
            )}
          </div>
        )}

        <div className="game-card__price-row">
          {isOnSale ? (
            <>
              <span className="price-original">
                {game.original_price ? formatPrice(game.original_price) : ""}
              </span>
              <span className="price-current price-current--discounted">
                {game.current_price ? formatPrice(game.current_price) : ""}
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
