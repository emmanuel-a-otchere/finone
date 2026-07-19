// MarketTrend — P2-5: segmented period control with 44px touch target on mobile
// Mockup band 2: button period selector (1D 5D 1M 3M 6M 1Y ALL) + always-visible legend
import { useState } from 'react';
import { EmptyState } from './EmptyState';

const PERIODS = ['1D', '5D', '1M', '3M', '6M', '1Y', 'ALL'];

const LEGEND = [
  { label: 'Price (SPY)', color: 'var(--chart-price)', dashed: false },
  { label: '200 MA', color: 'var(--chart-ma200)', dashed: false },
  { label: 'Sentiment', color: 'var(--chart-sentiment)', dashed: false },
  { label: 'Fear & Greed', color: 'var(--chart-fg)', dashed: false },
  { label: 'Prediction', color: 'var(--accent-cyan)', dashed: true },
];

export function MarketTrend() {
  const [period, setPeriod] = useState('6M');
  const hasData = false;

  return (
      <div className="card" data-card="chart-lg" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div className="card-head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px 8px', flexShrink: 0, gap: 8, flexWrap: 'wrap' }}>
          <h2>Market Trend</h2>
          <div className="seg-control" style={{ display: 'flex', gap: 2, background: 'var(--bg-input)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', padding: 2 }}>
            {PERIODS.map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                style={{
                  fontSize: 10, padding: '3px 8px', borderRadius: 4, cursor: 'pointer',
                  background: period === p ? 'var(--accent-cyan)' : 'transparent',
                  color: period === p ? '#ffffff' : 'var(--text-muted)',
                  border: 'none',
                  fontWeight: period === p ? 600 : 400,
                  fontFamily: 'var(--font-ui)',
                }}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        <div className="card-body" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: '0 16px 12px', gap: 4 }}>
          {!hasData ? (
            <div style={{ flex: 1 }}><EmptyState icon="📈" message="Market trend data unavailable" /></div>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: 12 }}>No data</div>
          )}
          {/* legend — always visible (mockup band 2) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 11, color: 'var(--text-secondary)', flexWrap: 'wrap', flexShrink: 0 }}>
            {LEGEND.map(l => (
              <span key={l.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <span style={{
                  display: 'inline-block', width: 14, height: 0, flexShrink: 0,
                  borderTop: l.dashed ? `2px dashed ${l.color}` : `2px solid ${l.color}`,
                }} />
                {l.label}
              </span>
            ))}
          </div>
        </div>
      </div>
  );
}
