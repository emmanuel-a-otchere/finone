// HotTakes — stale-while-revalidate, consistent card layout
import { useState } from 'react';
import { useCachedApi } from '../hooks/useCachedApi';
import { EmptyState } from './EmptyState';

interface HotTake { symbol: string; price: number; change_pct: number; volume: number; vs_avg_volume_pct: number; type: string }

const STATIC_HOT_TAKES: HotTake[] = [];

export function HotTakes() {
  const [tab, setTab] = useState<'volume'|'spike'|'options'>('volume');
  const [refreshKey, setRefreshKey] = useState(0);
  const { data: _, loading } = useCachedApi<HotTake[]>(
    `hottakes:${tab}:${refreshKey}`,
    async () => STATIC_HOT_TAKES,
    60_000
  );
  const handleRefresh = () => setRefreshKey(k => k + 1);

  const tabs = [
    { key: 'volume' as const, label: 'High Volume' },
    { key: 'spike' as const, label: 'Price Spike' },
    { key: 'options' as const, label: 'Options Flow' },
  ];

  return (
    <div className="card" data-card="news" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="card-head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px 8px', flexShrink: 0 }}>
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
          HOT TAKES / HIGH VOLUME
        </span>
        <button onClick={handleRefresh} title="Refresh" style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13, padding: '2px 4px' }}>↻</button>
      </div>
      <div className='tabs' style={{ marginBottom: 8 }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            fontSize: 10, padding: '2px 6px', borderRadius: 3, cursor: 'pointer',
            background: tab === t.key ? 'var(--accent-cyan)' : 'transparent',
            color: tab === t.key ? '#fff' : 'var(--text-secondary)', border: 'none', fontWeight: 500
          }}>{t.label}</button>
        ))}
      </div>
      {/* P1-3: use EmptyState — shows icon + message, never blank */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '0 16px 12px' }}>
        <EmptyState
          icon="⚡"
          message={loading ? 'Scanning market…' : `No ${tab} signals available`}
        />
      </div>
      <div style={{ height: 28, flexShrink: 0 }} />
    </div>
  );
}
