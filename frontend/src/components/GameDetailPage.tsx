import { useState, useEffect } from "react";
import {
  fetchGameDetail,
  fetchPriceHistory,
  fetchAllPredictions,
  deleteGame,
  type GameDetail,
  type PriceHistoryEntry,
  type PredictionCache,
} from "../services/api";

interface GameDetailPageProps {
  gameId: string;
  onBack: () => void;
  onDeleted?: () => void;
}

// 다음 Steam 대형 세일
const STEAM_SALES = [
  { name: "봄 세일", month: 3, day: 13 },
  { name: "여름 세일", month: 6, day: 24 },
  { name: "핼러윈 세일", month: 10, day: 28 },
  { name: "추수감사절 세일", month: 11, day: 26 },
  { name: "윈터 세일", month: 12, day: 19 },
];

function getNextSale(): { name: string; days: number } {
  const now = new Date();
  const year = now.getFullYear();
  let best: { name: string; days: number } | null = null;
  for (const sale of STEAM_SALES) {
    for (const y of [year, year + 1]) {
      const d = new Date(y, sale.month - 1, sale.day);
      const diff = Math.ceil((d.getTime() - now.getTime()) / 86400000);
      if (diff > 0 && (!best || diff < best.days)) {
        best = { name: sale.name, days: diff };
      }
    }
  }
  return best ?? { name: "윈터 세일", days: 30 };
}

function ProbBar({ prob }: { prob: number }) {
  const pct = Math.round(prob * 100);
  const color = prob >= 0.6 ? "#a4d007" : prob >= 0.4 ? "#66c0f4" : "#8fa4b8";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "8px 0" }}>
      <div style={{ flex: 1, height: 12, borderRadius: 6, background: "#1a2b3c", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 6, transition: "width 0.6s" }} />
      </div>
      <span style={{ color, fontWeight: 700, minWidth: 36 }}>{pct}%</span>
    </div>
  );
}

function SvgPriceChart({ history }: { history: PriceHistoryEntry[] }) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (!history || history.length <= 1) {
    return (
      <div style={{ color: "#8fa4b8", fontSize: 13, padding: "16px 0", textAlign: "center" }}>
        가격 히스토리 데이터가 부족해요
      </div>
    );
  }

  const recent = [...history].sort(
    (a, b) => new Date(a.recorded_date).getTime() - new Date(b.recorded_date).getTime()
  ).slice(-90);

  const prices = recent.map((h) =>
    h.discount_price != null && h.discount_price > 0 ? h.discount_price : h.price
  );
  const maxP = Math.max(...prices);
  const minP = Math.min(...prices);
  const range = maxP - minP || 1;

  const W = 360;
  const H = 120;
  const PAD = { top: 10, right: 10, bottom: 24, left: 48 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const xScale = (i: number) => PAD.left + (i / (recent.length - 1)) * innerW;
  const yScale = (p: number) => PAD.top + innerH - ((p - minP) / range) * innerH;

  const points = recent.map((h, i) => {
    const p = h.discount_price != null && h.discount_price > 0 ? h.discount_price : h.price;
    return { x: xScale(i), y: yScale(p), onSale: h.is_on_sale, price: p, date: h.recorded_date };
  });

  // Build path
  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

  // Green fill for sale segments
  const saleFills: string[] = [];
  let inSale = false;
  let saleStart = 0;
  for (let i = 0; i < points.length; i++) {
    if (points[i].onSale && !inSale) {
      inSale = true;
      saleStart = i;
    } else if (!points[i].onSale && inSale) {
      inSale = false;
      const seg = points.slice(saleStart, i);
      const top = seg.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
      const bottom = seg.slice().reverse().map((p) => `${p.x.toFixed(1)},${(PAD.top + innerH).toFixed(1)}`).join(" ");
      saleFills.push(`M ${top} L ${bottom} Z`);
    }
  }
  if (inSale) {
    const seg = points.slice(saleStart);
    const top = seg.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
    const bottom = seg.slice().reverse().map((p) => `${p.x.toFixed(1)},${(PAD.top + innerH).toFixed(1)}`).join(" ");
    saleFills.push(`M ${top} L ${bottom} Z`);
  }

  // Y axis labels
  const yLabels = [minP, (minP + maxP) / 2, maxP];

  // X axis: first and last date
  const firstDate = recent[0].recorded_date?.slice(0, 10) ?? "";
  const lastDate = recent[recent.length - 1].recorded_date?.slice(0, 10) ?? "";

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const viewBoxX = (x / rect.width) * W;
    
    if (viewBoxX < PAD.left || viewBoxX > W - PAD.right) {
      setHoverIndex(null);
      return;
    }
    
    let closestIdx = Math.round(((viewBoxX - PAD.left) / innerW) * (recent.length - 1));
    closestIdx = Math.max(0, Math.min(recent.length - 1, closestIdx));
    setHoverIndex(closestIdx);
  };

  return (
    <svg 
      width="100%" 
      viewBox={`0 0 ${W} ${H}`} 
      style={{ overflow: "visible", cursor: "crosshair" }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHoverIndex(null)}
    >
      {/* Grid lines */}
      {yLabels.map((p, i) => {
        const y = yScale(p);
        return (
          <g key={i}>
            <line x1={PAD.left} y1={y} x2={PAD.left + innerW} y2={y} stroke="#2a3f55" strokeWidth={0.5} />
            <text x={PAD.left - 4} y={y + 4} fontSize={9} fill="#8fa4b8" textAnchor="end">
              {Math.round(p / 100).toLocaleString()}
            </text>
          </g>
        );
      })}
      {/* Sale fills */}
      {saleFills.map((d, i) => (
        <path key={i} d={d} fill="rgba(164,208,7,0.15)" />
      ))}
      {/* Line */}
      <path d={linePath} fill="none" stroke="#66c0f4" strokeWidth={2} strokeLinejoin="round" />
      {/* X axis dates */}
      <text x={PAD.left} y={H - 2} fontSize={9} fill="#8fa4b8">{firstDate}</text>
      <text x={PAD.left + innerW} y={H - 2} fontSize={9} fill="#8fa4b8" textAnchor="end">{lastDate}</text>

      {/* Hover Line & Tooltip */}
      {hoverIndex !== null && points[hoverIndex] && (
        <g>
          {/* Vertical Line */}
          <line 
            x1={points[hoverIndex].x} 
            y1={PAD.top} 
            x2={points[hoverIndex].x} 
            y2={PAD.top + innerH} 
            stroke="#8fa4b8" 
            strokeWidth={1} 
            strokeDasharray="3 3" 
          />
          {/* Point Circle */}
          <circle 
            cx={points[hoverIndex].x} 
            cy={points[hoverIndex].y} 
            r={3} 
            fill={points[hoverIndex].onSale ? "#a4d007" : "#66c0f4"} 
          />
          {/* Tooltip */}
          {(() => {
            const pt = points[hoverIndex];
            const isRightSide = pt.x > W / 2;
            const tooltipX = isRightSide ? pt.x - 75 : pt.x + 10;
            const tooltipY = Math.max(PAD.top + 5, Math.min(PAD.top + innerH - 35, pt.y - 15));
            const dateStr = pt.date?.slice(0, 10) ?? "";
            const priceStr = Math.round(pt.price).toLocaleString() + " 원";
            
            return (
              <g transform={`translate(${tooltipX}, ${tooltipY})`}>
                <rect x={0} y={0} width={65} height={28} rx={4} fill="#1a2b3c" stroke="#2a3f55" strokeWidth={1} />
                <text x={32.5} y={11} fontSize={8} fill="#8fa4b8" textAnchor="middle">{dateStr}</text>
                <text x={32.5} y={22} fontSize={9} fill="#fff" textAnchor="middle" fontWeight="bold">{priceStr}</text>
              </g>
            );
          })()}
        </g>
      )}
    </svg>
  );
}

export default function GameDetailPage({ gameId, onBack, onDeleted }: GameDetailPageProps) {
  const [detail, setDetail] = useState<GameDetail | null>(null);
  const [history, setHistory] = useState<PriceHistoryEntry[]>([]);
  const [prediction, setPrediction] = useState<PredictionCache | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);
  const [descExpanded, setDescExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nextSale = getNextSale();

  useEffect(() => {
    setLoading(true);
    setError(null);

    Promise.allSettled([
      fetchGameDetail(gameId),
      fetchPriceHistory(gameId, 90),
      fetchAllPredictions(),
    ]).then(([detailRes, historyRes, predsRes]) => {
      if (detailRes.status === "fulfilled") setDetail(detailRes.value);
      else setError("게임 정보를 불러오는데 실패했습니다.");
      if (historyRes.status === "fulfilled") setHistory(historyRes.value);
      if (predsRes.status === "fulfilled") {
        const map = predsRes.value;
        if (map[gameId]) setPrediction(map[gameId]);
      }
      setLoading(false);
    });
  }, [gameId]);

  const handleDelete = async () => {
    if (!confirm("정말 이 게임을 목록에서 제거하시겠습니까?")) return;
    try {
      const res = await deleteGame(gameId);
      if (res.success) {
        alert("게임이 성공적으로 제거되었습니다.");
        if (onDeleted) onDeleted();
        else onBack();
      }
    } catch (err) {
      alert("게임 제거 중 서버 오류가 발생했습니다.");
    }
  };

  if (loading) {
    return (
      <div className="detail-page">
        <div className="detail-nav">
          <button className="detail-back-btn" onClick={onBack}>← 목록으로</button>
        </div>
        <div className="loading-wrap">
          <div className="loading-spinner" />
          <span className="loading-text">게임 정보 불러오는 중...</span>
        </div>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="detail-page">
        <div className="detail-nav">
          <button className="detail-back-btn" onClick={onBack}>← 목록으로</button>
        </div>
        <div className="error-banner"><p>⚠️ {error || "게임 정보가 없습니다."}</p></div>
      </div>
    );
  }

  const peakProb = prediction?.peak_probability ?? null;
  const predictedDate = prediction?.predicted_sale_date ?? null;
  const daysUntil = prediction?.days_until_sale ?? null;

  let aiColor = "#8fa4b8";
  let aiLabel = "당분간 할인 예정 없음";
  if (peakProb !== null) {
    if (peakProb >= 0.6) { aiColor = "#a4d007"; aiLabel = "🔥 할인 임박!"; }
    else if (peakProb >= 0.4) { aiColor = "#66c0f4"; aiLabel = "할인 가능성 있음"; }
  }

  return (
    <div className="detail-page">
      {/* Nav bar */}
      <div className="detail-nav">
        <button className="detail-back-btn" onClick={onBack}>← 목록으로</button>
        <span className="detail-nav-title">{detail.name}</span>
        
        <button 
          onClick={handleDelete}
          style={{
            marginLeft: 'auto',
            background: 'rgba(239, 68, 68, 0.15)',
            color: '#ef4444',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            padding: '6px 12px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '0.85rem',
            transition: 'all 0.2s'
          }}
          onMouseOver={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.25)'}
          onMouseOut={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'}
        >
          게임 삭제
        </button>

        <a
          className="detail-steam-link"
          href={`https://store.steampowered.com/app/${gameId}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ marginLeft: 16 }}
        >
          스팀에서 보기 ↗
        </a>
      </div>

      {/* Hero */}
      <div
        className="detail-hero"
        style={detail.background ? { backgroundImage: `url(${detail.background})` } : {}}
      >
        <div className="detail-hero__overlay">
          <div className="detail-hero__title">{detail.name}</div>
          <div className="detail-hero__dev">
            {detail.developers?.join(", ")}
            {detail.publishers?.length > 0 && detail.publishers[0] !== detail.developers?.[0]
              ? ` / ${detail.publishers[0]}`
              : ""}
          </div>
        </div>
      </div>

      {/* Main layout */}
      <div className="detail-layout">
        {/* LEFT 60% */}
        <div className="detail-left">
          {detail.header_image && (
            <img src={detail.header_image} alt={detail.name} className="detail-header-img" />
          )}

          {detail.screenshots?.length > 0 && (
            <div className="detail-screenshots">
              {detail.screenshots.map((s) => (
                <img
                  key={s.id}
                  src={s.path_thumbnail}
                  alt=""
                  className="detail-screenshot-thumb"
                  onClick={() => setSelectedScreenshot(s.path_full)}
                />
              ))}
            </div>
          )}

          {selectedScreenshot && (
            <div className="screenshot-modal" onClick={() => setSelectedScreenshot(null)}>
              <img src={selectedScreenshot} alt="screenshot" />
            </div>
          )}

          <div className="detail-description">
            {detail.short_description && (
              <p className="detail-short-desc">{detail.short_description}</p>
            )}
            {detail.detailed_description && (
              <>
                <div
                  className={`detail-long-desc${descExpanded ? " expanded" : ""}`}
                  dangerouslySetInnerHTML={{ __html: detail.detailed_description }}
                />
                <button className="detail-expand-btn" onClick={() => setDescExpanded((v) => !v)}>
                  {descExpanded ? "▲ 접기" : "▼ 더 보기"}
                </button>
              </>
            )}
          </div>

          {detail.genres?.length > 0 && (
            <div className="genre-tags" style={{ marginTop: 16 }}>
              {detail.genres.map((g) => (
                <span key={g.id} className="genre-tag">{g.description}</span>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT 40% */}
        <div className="detail-right">
          {/* 가격 카드 */}
          {detail.price_overview && (
            <div className="detail-info-card">
              <div className="info-card-title">💰 가격</div>
              {detail.price_overview.discount_percent > 0 ? (
                <div className="price-row">
                  <span className="price-discount-badge">-{detail.price_overview.discount_percent}%</span>
                  <span className="price-original">{detail.price_overview.initial_formatted}</span>
                  <span className="price-final">{detail.price_overview.final_formatted}</span>
                </div>
              ) : (
                <div className="price-final large">{detail.price_overview.final_formatted}</div>
              )}
            </div>
          )}

          {/* AI 예측 카드 */}
          <div className="detail-ai-card" style={{ borderColor: peakProb != null && peakProb >= 0.6 ? "#a4d007" : peakProb != null && peakProb >= 0.4 ? "#66c0f4" : "#2a3f55" }}>
            <div className="ai-card-title">🤖 할인 예측</div>
            {peakProb !== null ? (
              <>
                <ProbBar prob={peakProb} />
                <div className="ai-prediction-text" style={{ color: aiColor, fontWeight: 600, marginBottom: 8 }}>
                  {aiLabel}
                </div>
                {predictedDate && (
                  <div className="ai-sale-date">
                    📅 예상 할인: <strong>{predictedDate}</strong>
                    {daysUntil != null && <span style={{ color: "#8fa4b8", marginLeft: 6 }}>(약 {daysUntil}일 후)</span>}
                  </div>
                )}
                <div className="ai-next-sale">
                  다음 대형세일: <strong>{nextSale.name}</strong>{" "}
                  <span style={{ color: "#66c0f4" }}>(D-{nextSale.days})</span>
                </div>
              </>
            ) : (
              <div style={{ color: "#8fa4b8", fontSize: 13 }}>예측 데이터가 없습니다.</div>
            )}
          </div>

          {/* 게임 정보 카드 */}
          <div className="detail-info-card">
            <div className="info-card-title">ℹ️ 게임 정보</div>
            {detail.release_date?.date && (
              <div className="info-row">
                <span className="info-label">출시일</span>
                <span>{detail.release_date.date}</span>
              </div>
            )}
            {detail.developers?.length > 0 && (
              <div className="info-row">
                <span className="info-label">개발사</span>
                <span>{detail.developers.join(", ")}</span>
              </div>
            )}
            {detail.publishers?.length > 0 && (
              <div className="info-row">
                <span className="info-label">배급사</span>
                <span>{detail.publishers.join(", ")}</span>
              </div>
            )}
            {detail.metacritic && (
              <div className="info-row">
                <span className="info-label">Metacritic</span>
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ color: detail.metacritic.score >= 75 ? "#a4d007" : detail.metacritic.score >= 50 ? "#f39c12" : "#e74c3c", fontWeight: 700 }}>
                    {detail.metacritic.score}
                  </span>
                  <div style={{ flex: 1, height: 6, borderRadius: 3, background: "#1a2b3c", overflow: "hidden", maxWidth: 80 }}>
                    <div style={{ width: `${detail.metacritic.score}%`, height: "100%", background: detail.metacritic.score >= 75 ? "#a4d007" : "#f39c12", borderRadius: 3 }} />
                  </div>
                </span>
              </div>
            )}
            {detail.total_reviews != null && (
              <div className="info-row">
                <span className="info-label">리뷰</span>
                <span>{detail.total_reviews.toLocaleString()}개</span>
              </div>
            )}
          </div>

          {/* 가격 히스토리 SVG */}
          <div className="detail-info-card">
            <div className="info-card-title">📈 가격 히스토리 (최근 90일)</div>
            <SvgPriceChart history={history} />
            <div style={{ display: "flex", gap: 12, marginTop: 8, fontSize: 11, color: "#8fa4b8" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: "#66c0f4", display: "inline-block" }} />정가
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: "rgba(164,208,7,0.4)", display: "inline-block" }} />할인
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
