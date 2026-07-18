import { useState, useEffect } from 'react';
import { FearGreedDial } from '../components/FearGreedDial';
import { MarketSentiment } from '../components/MarketSentiment';
import { AdvancingDeclining } from '../components/AdvancingDeclining';
import { MarketTrend } from '../components/MarketTrend';
import { MarketHeatmap } from '../components/MarketHeatmap';
import { SectorPerformance } from '../components/SectorPerformance';
import { PortfolioDonut } from '../components/PortfolioDonut';
import { PortfolioDrift } from '../components/PortfolioDrift';
import { NewsFeed } from '../components/NewsFeed';
import { HotTakes } from '../components/HotTakes';
import { HotSymbols } from '../components/HotSymbols';
import { api } from '../lib/api';
import type { Signal } from '../types';

interface TickerItem { symbol: string; value: number; change: string; up: boolean; }

interface TickerItem { symbol: string; value: number; change: string; up: boolean; }
const SAMPLE_TICKERS: TickerItem[] = [
  { symbol: 'NVDA',  value: 875.42, change: '+2.3%',  up: true  },
  { symbol: 'AAPL',  value: 182.15, change: '-0.4%',  up: false },
  { symbol: 'MSFT',  value: 415.60, change: '+1.1%',  up: true  },
  { symbol: 'AMZN',  value: 185.70, change: '+0.8%',  up: true  },
  { symbol: 'GOOGL', value: 172.50, change: '-0.2%',  up: false },
  { symbol: 'META',  value: 505.30, change: '+1.5%',  up: true  },
  { symbol: 'TSLA',  value: 248.90, change: '-1.2%',  up: false },
  { symbol: 'SPY',   value: 528.40, change: '+0.5%',  up: true  },
  { symbol: 'QQQ',   value: 450.20, change: '+0.9%',  up: true  },
  { symbol: 'IWM',   value: 202.30, change: '-0.3%',  up: false },
];
export function Dashboard() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [tickers, setTickers] = useState<TickerItem[]>([]);

  useEffect(() => {
    api.getSignals('ACTIVE', undefined, 200)
      .then(setSignals)
      .catch(err => console.error('Failed to load signals:', err));
    api.getMarketIndices()
      .then(setTickers)
      .catch(() => {});
  }, []);

  return (
    <div className="dashboard-grid">
      <TickerStrip tickers={tickers} />
      <FearGreedDial />
      <MarketSentiment />
      <AdvancingDeclining />
      <MarketTrend />
      <HotSymbols signals={signals} />
      <HotTakes />
      <SectorPerformance />
      <NewsFeed />
      <MarketHeatmap />
      <PortfolioDonut summary={null} />
      <PortfolioDrift data={null} />
    </div>
  );
}

// ── Ticker Strip ───────────────────────────────────────────────────────────────
interface TickerStripProps { tickers: TickerItem[]; }

function TickerStrip({ tickers }: TickerStripProps) {
  const items = tickers.length > 0 ? tickers : SAMPLE_TICKERS;
  const doubled = [...items, ...items];

  useEffect(() => {
    const styleId = 'ticker-scroll-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = [
        '@keyframes ticker-scroll { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }',
        '.ticker-track { animation: ticker-scroll 46s linear infinite; will-change: transform; }',
        '@media (prefers-reduced-motion: reduce) { .ticker-track { animation: none; } }',
        '/* Dashboard grid — explicit grid rows, cards on same row share equal height */',
        '.dashboard-grid { display: grid; grid-template-columns: repeat(12, 1fr); grid-auto-rows: minmax(100px, auto); gap: 16px; padding: 10px; height: calc(100vh - 56px); align-content: start; overflow-y: auto; }',
        '.dashboard-grid > :nth-child(1) { grid-column: 1 / -1; }',
        '.dashboard-grid > :nth-child(2) { grid-column: 1 / 5; }',
        '.dashboard-grid > :nth-child(3) { grid-column: 5 / 9; }',
        '.dashboard-grid > :nth-child(4) { grid-column: 9 / 13; }',
        '.dashboard-grid > :nth-child(5) { grid-column: 1 / 8; }',
        '.dashboard-grid > :nth-child(6) { grid-column: 8 / 13; }',
        '.dashboard-grid > :nth-child(7) { grid-column: 1 / 5; }',
        '.dashboard-grid > :nth-child(8) { grid-column: 5 / 9; }',
        '.dashboard-grid > :nth-child(9) { grid-column: 9 / 13; }',
        '.dashboard-grid > :nth-child(10) { grid-column: 1 / 7; }',
        '.dashboard-grid > :nth-child(11) { grid-column: 7 / 10; }',
        '.dashboard-grid > :nth-child(12) { grid-column: 10 / 13; }',
        '@media (max-width: 1024px) { .dashboard-grid { grid-template-columns: repeat(6, 1fr); } .dashboard-grid > :nth-child(n) { grid-column: auto; } .dashboard-grid > :nth-child(1) { grid-column: 1 / -1; } .dashboard-grid > :nth-child(2) { grid-column: 1 / 4; } .dashboard-grid > :nth-child(3) { grid-column: 4 / 7; } .dashboard-grid > :nth-child(4) { grid-column: 1 / 7; } .dashboard-grid > :nth-child(5) { grid-column: 1 / 7; } .dashboard-grid > :nth-child(6) { grid-column: 1 / 7; } .dashboard-grid > :nth-child(n+7) { grid-column: 1 / -1; } }',
        '@media (max-width: 640px) { .dashboard-grid { grid-template-columns: 1fr; } .dashboard-grid > :nth-child(n) { grid-column: 1 / -1; } }',
      ].join('\n');
      document.head.appendChild(style);
    }
  }, []);

  return (
    <div style={{
      width: '100%', overflow: 'hidden',
      background: 'var(--bg-card)', borderBottom: '1px solid var(--border-default)',
      padding: '10px 0', position: 'relative', flexShrink: 0,
    }}>
      {/* Fade gradient overlays — index.html spec */}
      <div style={{
        position: 'absolute', top: 0, bottom: 0, left: 0, width: 48, zIndex: 2,
        background: 'linear-gradient(90deg, var(--bg-card), transparent)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', top: 0, bottom: 0, right: 0, width: 48, zIndex: 2,
        background: 'linear-gradient(-90deg, var(--bg-card), transparent)',
        pointerEvents: 'none',
      }} />
      <div className="ticker-track" style={{ display: 'flex', gap: 36, whiteSpace: 'nowrap', width: 'fit-content' }}>
        {doubled.map((t, i) => (
          <span key={i} style={{ display: 'inline-flex', alignItems: 'baseline', gap: 8, whiteSpace: 'nowrap' }}>
            <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{t.symbol}</span>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{t.value.toFixed(2)}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: t.up ? 'var(--green)' : 'var(--red)' }}>
              {t.change}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
