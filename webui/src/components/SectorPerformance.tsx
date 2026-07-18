// SectorPerformance — P2-5: segmented period control with 44px touch target on mobile
import { useState } from 'react';
import { useCachedApi } from '../hooks/useCachedApi';
import { api } from '../lib/api';
import { EmptyState } from './EmptyState';

type SectorResponse = Record<string, number>;
const PERIODS = ['1D', '1W', '1M'] as const;
type Period = typeof PERIODS[number];

// P2-5: .seg-control media query lives in index.css (shared) — no <style> tag here.
export function SectorPerformance() {
  const [period, setPeriod] = useState<Period>('1D');
  const { data, loading } = useCachedApi<SectorResponse>(
    `sectors:${period}`, () => api.getSectorPerformance(), 300_000
  );
  const sectors = data ? Object.entries(data) : [];

  return (
      <div className="card" data-card="chart-lg" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div className="card-head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px 8px', flexShrink: 0 }}>
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>SECTOR PERFORMANCE</span>
          {/* P2-5: segmented control, 44px on mobile */}
          <div className="seg-control" role="group" aria-label="Time period" style={{
            display: 'flex', background: 'var(--bg-2)',
            borderRadius: 6, border: '1px solid var(--border)', padding: 2,
            minHeight: 44, alignItems: 'center',
          }}>
            {PERIODS.map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                aria-pressed={period === p}
                style={{
                  flex: 1, minHeight: 44, padding: '4px 8px',
                  fontSize: 10, fontWeight: period === p ? 600 : 400,
                  cursor: 'pointer', border: 'none', borderRadius: 4,
                  background: period === p ? 'var(--accent-cyan)' : 'transparent',
                  color: period === p ? '#fff' : 'var(--text-secondary)',
                  transition: 'background 120ms', fontFamily: 'var(--font-ui)',
                  whiteSpace: 'nowrap',
                }}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        <div style={{ flex: 1, minHeight: 0, padding: '0 16px 12px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 5 }}>
          {!loading && sectors.length === 0 ? (
            <EmptyState icon="📊" message="Sector data unavailable" />
          ) : (
            (() => {
              const maxAbs = Math.max(...sectors.map(([, v]) => Math.abs(v)), 1);
              return sectors.map(([name, pct], i) => {
                const isPos = pct >= 0;
                const barWidth = (Math.abs(pct) / maxAbs) * 55;
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                    <span style={{ width: 54, textAlign: 'right', color: 'var(--text-secondary)', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 11 }}>{name}</span>
                    <div style={{ flex: 1, background: 'var(--bg-2)', borderRadius: 2, height: 8, position: 'relative' }}>
                      <div style={{ position: 'absolute', top: 0, [isPos ? 'left' : 'right']: '50%', width: `${barWidth}%`, height: '100%', borderRadius: 2, background: isPos ? 'var(--green)' : 'var(--red)', transition: 'width 0.4s' }} />
                    </div>
                    <span style={{ width: 48, textAlign: 'right', color: isPos ? '#22c55e' : '#ef4444', fontWeight: 600, flexShrink: 0, fontSize: 11 }}>
                      {isPos ? '+' : ''}{pct.toFixed(2)}%
                    </span>
                  </div>
                );
              });
            })()
          )}
          {loading && <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: 11 }}>Loading…</div>}
        </div>
        <div style={{ height: 28, flexShrink: 0 }} />
      </div>
  );
}
