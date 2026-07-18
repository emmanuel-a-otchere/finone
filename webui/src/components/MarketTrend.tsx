// MarketTrend — P2-5: segmented period control with 44px touch target on mobile
import { useState } from 'react';
import { EmptyState } from './EmptyState';

const PERIODS = ['1W', '1M', '3M', '6M', '1Y', 'ALL'];

export function MarketTrend() {
  const [period, setPeriod] = useState('6M');
  const hasData = false;

  return (
      <div className="card" data-card="chart-lg" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div className="card-head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px 8px', flexShrink: 0 }}>
          <h2>Market Trend</h2>
          {/* P0-4: themed select — uses the .dropdown-select design-token class
              (the old className="select" matched no CSS rule and rendered a native control) */}
          <select
            className="dropdown-select"
            value={period}
            onChange={e => setPeriod(e.target.value)}
            aria-label="Trend period"
          >
            {PERIODS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div className="card-body" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: '0 16px 12px', gap: 4 }}>
          {!hasData ? (
            <div style={{ flex: 1 }}><EmptyState icon="📈" message="Market trend data unavailable" /></div>
          ) : (
            <>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: 12 }}>No data</div>
              <div style={{ height: 28, display: 'flex', alignItems: 'center', gap: 16, fontSize: 11, color: 'var(--text-secondary)' }}>
                <span><span style={{color:'var(--green)'}}>▬</span> Price (SPY)</span>
                <span><span style={{color:'var(--text-muted)'}}>▬</span> 200 MA</span>
                <span><span style={{color:'var(--accent-cyan)'}}>▬</span> Sentiment</span>
                <span><span style={{color:'var(--yellow)'}}>▬</span> Fear &amp; Greed</span>
              </div>
            </>
          )}
        </div>
        <div className="card-footer" style={{ height: 28, flexShrink: 0 }} />
      </div>
  );
}
