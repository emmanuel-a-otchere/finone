// MarketSentiment — P2-5: segmented control for period selector (44px touch on mobile)
import { useRef, useState, useEffect } from 'react';

const PERIODS = ['1D', '1W', '1M', '3M', '1Y'];
const HISTORY = [72, 75, 78, 76, 71, 69, 68];
const HISTORY_PREV = [70, 71, 72, 71, 69, 67, 66];

function Sparkline7({ data, up }: { data: number[]; up: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const W = 120, H = 28;
    canvas.width = W * 2; canvas.height = H * 2; ctx.scale(2, 2);
    const min = Math.min(...data), max = Math.max(...data);
    const range = max - min || 1;
    const step = W / (data.length - 1);
    const pts = data.map((v, i) => ({ x: i * step, y: H - ((v - min) / range) * (H - 4) - 2 }));
    const color = up ? '#22c55e' : '#ef4444';
    const fillColor = up ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)';
    ctx.beginPath(); ctx.moveTo(pts[0].x, H);
    pts.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.lineTo(pts[pts.length - 1].x, H); ctx.closePath();
    ctx.fillStyle = fillColor; ctx.fill();
    ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
    pts.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.stroke();
  }, [data, up]);
  return <canvas ref={canvasRef} style={{ width: 120, height: 28, display: 'block' }} />;
}

// P2-5: SegmentedControl — pill group with 44px touch target on mobile
const styles = `
  @media (max-width: 767px) {
    .seg-control { min-height: 44px !important; }
  }
`;

export function MarketSentiment() {
  const [period, setPeriod] = useState('1D');
  const value = HISTORY[HISTORY.length - 1];
  const prev = HISTORY_PREV[HISTORY_PREV.length - 1];
  const delta = value - prev;
  const up = delta >= 0;
  const label = value >= 65 ? 'Bullish' : value >= 45 ? 'Neutral' : 'Bearish';

  return (
    <>
      <style>{styles}</style>
      <div className="card" data-card="kpi" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div className="card-head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px 8px', flexShrink: 0 }}>
          <span className="card-title">MARKET SENTIMENT</span>
          {/* P2-5: segmented control, 44px min-height on <768px */}
          <div className="seg-control" role="group" aria-label="Time period" style={{
            display: 'flex', gap: 0, background: 'var(--bg-2)',
            borderRadius: 6, border: '1px solid var(--border)', padding: 2,
            minHeight: 44, alignItems: 'center',          // 44px on mobile
          }}>
            {PERIODS.map((p, i) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                aria-pressed={period === p}
                style={{
                  flex: 1,
                  minHeight: 44,
                  padding: '4px 8px',
                  fontSize: 10,
                  fontWeight: period === p ? 600 : 400,
                  cursor: 'pointer',
                  border: 'none',
                  borderRadius: 4,
                  background: period === p ? 'var(--accent-cyan)' : 'transparent',
                  color: period === p ? '#fff' : 'var(--text-secondary)',
                  transition: 'background 120ms',
                  fontFamily: 'var(--font-ui)',
                  whiteSpace: 'nowrap',
                }}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        <div className="card-body" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, fontWeight: 800, lineHeight: 1, color: 'var(--text-primary)' }}>{value}</div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 600, color: up ? 'var(--green)' : 'var(--red)', marginTop: 4 }}>
              <span>{up ? '▲' : '▼'} {Math.abs(delta).toFixed(0)}</span>
              <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>vs prev</span>
            </div>
            <div style={{ fontSize: 12, color: up ? 'var(--green)' : 'var(--red)', fontWeight: 600, marginTop: 2 }}>{label}</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>/100</div>
          </div>
          <div style={{ width: '100%', display: 'flex', justifyContent: 'center', paddingTop: 2 }}>
            <Sparkline7 data={HISTORY} up={up} />
          </div>
        </div>
        <div className="card-footer" style={{ height: 28, flexShrink: 0 }} />
      </div>
    </>
  );
}
