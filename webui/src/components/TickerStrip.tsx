// TickerStrip — static market index cards (mockup band 1, top row)
// P2-1: VIX uses inverted coloring (rising VIX = red, falling VIX = green)
// NOTE: renders exactly ONE element — it is grid child #1 of .dashboard-grid;
// returning null or adding siblings would shift every :nth-child placement.
import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';

interface TickerCell {
  symbol: string;
  price: string;
  change: string;
  up: boolean;
  sparkData?: number[];
}

interface Props {
  tickers?: TickerCell[];
}

// Symbols that are indices — no $ prefix
const INDEX_SYMBOLS = new Set(['S&P 500', 'NASDAQ', 'DOW', 'VIX']);

// Symbols needing 4dp (forex)
const FOREX_SYMBOLS = new Set(['EUR/USD']);

// Canvas can't resolve var() — read the token value at draw time
function cssVar(name: string, fallback: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

// Deterministic placeholder series when no sparkData is provided
function defaultSeries(seed: string, n = 24): number[] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const out: number[] = [];
  let v = 50;
  for (let i = 0; i < n; i++) {
    h = (h * 1103515245 + 12345) >>> 0;
    v += ((h % 1000) / 1000 - 0.5) * 8;
    v = Math.max(10, Math.min(90, v));
    out.push(v);
  }
  return out;
}

function Sparkline({ data, up, invert }: { data: number[]; up: boolean; invert?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const W = 96, H = 28;
    canvas.width = W * 2; canvas.height = H * 2;
    ctx.scale(2, 2);
    const min = Math.min(...data), max = Math.max(...data);
    const range = max - min || 1;
    const step = W / (data.length - 1);
    const pts = data.map((v, i) => ({ x: i * step, y: H - ((v - min) / range) * (H - 4) - 2 }));
    const positive = invert ? !up : up;
    const color = positive ? cssVar('--green', '#32FF7E') : cssVar('--red', '#FF5A5A');
    const fillColor = positive ? 'rgba(50,255,126,0.10)' : 'rgba(255,90,90,0.10)';
    ctx.beginPath(); ctx.moveTo(pts[0].x, H);
    pts.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.lineTo(pts[pts.length - 1].x, H); ctx.closePath();
    ctx.fillStyle = fillColor; ctx.fill();
    ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
    pts.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.stroke();
  }, [data, up, invert]);
  return <canvas ref={canvasRef} style={{ width: 96, height: 28, display: 'block', flexShrink: 0 }} />;
}

export function TickerStrip({ tickers: propTickers }: Props) {
  const [tickers, setTickers] = useState<TickerCell[]>([]);

  useEffect(() => {
    if (propTickers && propTickers.length > 0) {
      setTickers(propTickers);
    } else {
      api.getMarketIndices().then(items => {
        setTickers(items.map(t => {
          const isForex = FOREX_SYMBOLS.has(t.symbol);
          let price: string;
          if (INDEX_SYMBOLS.has(t.symbol)) {
            price = typeof t.value === 'number'
              ? t.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
              : String(t.value);
          } else if (isForex) {
            price = typeof t.value === 'number' ? t.value.toFixed(4) : String(t.value);
          } else {
            price = typeof t.value === 'number'
              ? t.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
              : String(t.value);
          }
          return { symbol: t.symbol, price, change: t.change, up: t.up };
        }));
      }).catch(() => {});
    }
  }, [propTickers]);

  // P0-1: ALWAYS render the strip — returning null here removes grid child #1
  // from .dashboard-grid and shifts every card's :nth-child placement.
  if (tickers.length === 0) {
    return (
      <div style={{
        height: 66,
        background: 'var(--bg-card)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-lg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 11,
        color: 'var(--text-muted)',
        flexShrink: 0,
      }}>
        Market data unavailable
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      gap: 16,
      overflowX: 'auto',
      scrollbarWidth: 'none',
      flexShrink: 0,
    }}>
      {tickers.map((t, i) => {
        const isVix = t.symbol === 'VIX';
        // P2-1: VIX uses inverted coloring; all others use standard green/red
        const positive = isVix ? !t.up : t.up;
        const deltaColor = positive ? 'var(--green)' : 'var(--red)';
        return (
          <div key={i} style={{
            flex: '1 0 150px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            background: 'var(--bg-card)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-lg)',
            padding: '10px 14px',
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
              <span style={{
                fontSize: 10, fontWeight: 600, color: 'var(--text-muted)',
                textTransform: 'uppercase', letterSpacing: '0.06em',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {t.symbol}
              </span>
              <span style={{
                fontSize: 15, fontWeight: 700, color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums',
              }}>
                {t.price}
              </span>
              <span style={{ fontSize: 11, fontWeight: 600, color: deltaColor, fontFamily: 'var(--font-mono)' }}>
                {t.change}
              </span>
            </div>
            <Sparkline data={t.sparkData ?? defaultSeries(t.symbol)} up={t.up} invert={isVix} />
          </div>
        );
      })}
    </div>
  );
}
