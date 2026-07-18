// TickerStrip — real market indices via props OR api.getMarketIndices()
// P2-1: VIX uses inverted coloring (rising VIX = red, falling VIX = green)
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

// P2-1: VIX is inversely correlated to market — invert its color signal
// Rising VIX = fear rising = negative → show RED
// Falling VIX = fear declining = positive → show GREEN

function vixColor(up: boolean): string {
  // Inverted: standard green/red is OPPOSITE for VIX
  return up ? 'var(--red)' : 'var(--green)';
}

function Sparkline({ data, up }: { data: number[]; up: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const W = 80, H = 24;
    canvas.width = W * 2; canvas.height = H * 2;
    ctx.scale(2, 2);
    const min = Math.min(...data), max = Math.max(...data);
    const range = max - min || 1;
    const step = W / (data.length - 1);
    const pts = data.map((v, i) => ({ x: i * step, y: H - ((v - min) / range) * (H - 4) - 2 }));
    const color = up ? '#22c55e' : '#ef4444';
    const fillColor = up ? 'rgba(34,197,94,0.10)' : 'rgba(239,68,68,0.10)';
    ctx.beginPath(); ctx.moveTo(pts[0].x, H);
    pts.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.lineTo(pts[pts.length - 1].x, H); ctx.closePath();
    ctx.fillStyle = fillColor; ctx.fill();
    ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
    pts.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.stroke();
  }, [data, up]);
  return <canvas ref={canvasRef} style={{ width: 80, height: 24, display: 'block' }} />;
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
  // With no data, render a stable-height placeholder instead.
  const doubled = [...tickers, ...tickers];

  // NOTE: ticker animation CSS lives in index.css (.ticker-track / .ticker-fade)
  // so this component renders exactly ONE grid child in .dashboard-grid —
  // <style> siblings would shift :nth-child card placement.
  return (
      <div style={{
        height: 40,
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-default)',
        overflow: 'hidden',
        flexShrink: 0,
        position: 'relative',
        zIndex: 10,
      }}>
        <div className="ticker-fade" />
        {tickers.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: 11, color: 'var(--text-muted)' }}>
            Market data unavailable
          </div>
        ) : (
        <div className="ticker-track" style={{ display: 'flex', alignItems: 'center', height: '100%', whiteSpace: 'nowrap' }}>
          {doubled.map((t, i) => {
            const isVix = t.symbol === 'VIX';
            // P2-1: VIX uses inverted coloring; all others use standard green/red
            const deltaColor = isVix
              ? vixColor(t.up)          // inverted for VIX
              : (t.up ? 'var(--green)' : 'var(--red)');  // standard
            return (
              <div key={i} style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '0 24px',
                borderRight: '1px solid var(--border-subtle)',
                flexShrink: 0,
              }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.02em', flexShrink: 0 }}>
                  {t.symbol}
                </span>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)', flexShrink: 0 }}>
                  {t.price}
                </span>
                <span style={{ fontSize: 11, fontWeight: 600, color: deltaColor, flexShrink: 0 }}>
                  {t.change}
                </span>
                {t.sparkData && <Sparkline data={t.sparkData} up={t.up} />}
              </div>
            );
          })}
        </div>
        )}
      </div>
  );
}
