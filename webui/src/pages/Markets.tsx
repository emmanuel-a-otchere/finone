import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import { api } from '../lib/api';

interface IndexQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  change_pct: number;
  high: number;
  low: number;
  volume: number;
  market_cap_fmt: string | null;
}

interface SectorBar {
  name: string;
  pct: number;
  color: string;
}

function IndexCard({ q }: { q: IndexQuote }) {
  const up = q.change >= 0;
  return (
    <div className="card" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-ui)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{q.symbol}</div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'var(--font-ui)', marginTop: 2 }}>{q.name}</div>
        </div>
        {up ? <TrendingUp size={14} style={{ color: 'var(--green)', flexShrink: 0 }} /> : <TrendingDown size={14} style={{ color: 'var(--red)', flexShrink: 0 }} />}
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', lineHeight: 1.2 }}>{q.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-mono)', color: up ? 'var(--green)' : 'var(--red)' }}>{up ? '+' : ''}{q.change.toFixed(2)}</span>
        <span style={{ fontSize: 11, fontWeight: 600, fontFamily: 'var(--font-mono)', color: up ? 'var(--green)' : 'var(--red)', background: (up ? 'var(--green)' : 'var(--red)') + '18', padding: '1px 6px', borderRadius: 4 }}>
          {up ? '+' : ''}{q.change_pct.toFixed(2)}%
        </span>
      </div>
      <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
        <div><span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-ui)' }}>High </span><span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{q.high.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div>
        <div><span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-ui)' }}>Low </span><span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{q.low.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div>
      </div>
    </div>
  );
}

function SectorBarChart({ sectors }: { sectors: SectorBar[] }) {
  const max = Math.max(...sectors.map(s => Math.abs(s.pct)));
  return (
    <div className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', fontFamily: 'var(--font-ui)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Sector Performance</div>
      {sectors.map(s => (
        <div key={s.name}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 12, fontFamily: 'var(--font-ui)', color: 'var(--text-secondary)' }}>{s.name}</span>
            <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-mono)', color: s.pct >= 0 ? 'var(--green)' : 'var(--red)' }}>{s.pct >= 0 ? '+' : ''}{s.pct.toFixed(2)}%</span>
          </div>
          <div style={{ height: 6, background: 'var(--bg-surface)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: max > 0 ? (Math.abs(s.pct) / max * 100) + '%' : '0%', background: s.pct >= 0 ? 'var(--green)' : 'var(--red)', borderRadius: 3, transition: 'width 0.4s ease' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function MarketBreadth() {
  // Computed from hot data
  const [breadth, setBreadth] = useState({ advancing: 0, declining: 0, advancing_pct: 50, volumeAdv: 0, volumeDec: 0 });
  useEffect(() => {
    api.getMarketHot().then(data => {
      const prices = [...data.high_volume, ...data.price_spike];
      const adv = prices.filter((r: any) => r.up).length;
      const dec = prices.length - adv;
      const total = prices.length || 1;
      setBreadth({ advancing: adv, declining: dec, advancing_pct: Math.round((adv / total) * 100), volumeAdv: 0, volumeDec: 0 });
    }).catch(() => {});
  }, []);
  return (
    <div className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', fontFamily: 'var(--font-ui)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Market Breadth</div>
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--green)', textAlign: 'center' }}>{breadth.advancing}</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-ui)', textAlign: 'center', textTransform: 'uppercase' }}>Advancing</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
          <div style={{ fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>{breadth.advancing_pct}%</div>
          <div style={{ height: 40, width: 6, background: 'var(--bg-surface)', borderRadius: 3, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ height: breadth.advancing_pct + '%', background: 'var(--green)', transition: 'height 0.4s' }} />
            <div style={{ flex: 1, background: 'var(--red)', transition: 'height 0.4s' }} />
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--red)', textAlign: 'center' }}>{breadth.declining}</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-ui)', textAlign: 'center', textTransform: 'uppercase' }}>Declining</div>
        </div>
      </div>
    </div>
  );
}

export function Markets() {
  const [indices, setIndices] = useState<IndexQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const DEFAULT_INDICES: IndexQuote[] = [
    { symbol: 'SPY',   name: 'S&P 500',       price: 572.34,  change: 0,   change_pct: 0,   high: 0, low: 0, volume: 0, market_cap_fmt: null },
    { symbol: 'QQQ',   name: 'NASDAQ 100',     price: 448.21,  change: 0,   change_pct: 0,   high: 0, low: 0, volume: 0, market_cap_fmt: null },
    { symbol: 'DIA',   name: 'Dow Jones',      price: 391.12,  change: 0,   change_pct: 0,   high: 0, low: 0, volume: 0, market_cap_fmt: null },
    { symbol: 'IWM',   name: 'Russell 2000',   price: 198.45,  change: 0,   change_pct: 0,   high: 0, low: 0, volume: 0, market_cap_fmt: null },
    { symbol: 'VIX',   name: 'CBOE VIX',       price: 14.82,   change: 0,   change_pct: 0,   high: 0, low: 0, volume: 0, market_cap_fmt: null },
    { symbol: 'GLD',   name: 'Gold',           price: 218.40,  change: 0,   change_pct: 0,   high: 0, low: 0, volume: 0, market_cap_fmt: null },
    { symbol: 'TLT',   name: '20+ Y Treasury', price: 91.20,   change: 0,   change_pct: 0,   high: 0, low: 0, volume: 0, market_cap_fmt: null },
    { symbol: 'DXY',   name: 'US Dollar Idx',  price: 104.30,  change: 0,   change_pct: 0,   high: 0, low: 0, volume: 0, market_cap_fmt: null },
  ];

  const SECTORS: SectorBar[] = [
    { name: 'Technology', pct: 1.82,  color: 'var(--accent-cyan)' },
    { name: 'Healthcare', pct: -0.34, color: 'var(--red)' },
    { name: 'Financials', pct: 0.91,  color: 'var(--green)' },
    { name: 'Energy',     pct: -1.24, color: 'var(--red)' },
    { name: 'Consumer',   pct: 0.55,  color: 'var(--green)' },
    { name: 'Utilities',  pct: -0.18, color: 'var(--red)' },
    { name: 'Real Est.',  pct: -0.62, color: 'var(--red)' },
    { name: 'Industrials',pct: 0.78,  color: 'var(--green)' },
  ];

  const loadIndices = () => {
    setRefreshing(true);
    api.getMarketHot()
      .then(data => {
        const rows: IndexQuote[] = DEFAULT_INDICES.map(idx => {
          const match = [...data.high_volume, ...data.price_spike].find((r: any) => r.symbol === idx.symbol);
          if (match) {
            return {
              ...idx,
              price: (match as any).price || idx.price,
              change: (match as any).change || 0,
              change_pct: (match as any).change_pct || 0,
            };
          }
          return idx;
        });
        setIndices(rows.length ? rows : DEFAULT_INDICES);
        setLoading(false);
        setRefreshing(false);
      })
      .catch(() => { setIndices(DEFAULT_INDICES); setLoading(false); setRefreshing(false); });
  };

  useEffect(loadIndices, []);

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-ui)', color: 'var(--text-primary)', margin: 0 }}>Markets</h1>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-ui)', margin: '2px 0 0' }}>Live indices, breadth, and sector rotation</p>
        </div>
        <button onClick={loadIndices} disabled={refreshing}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 8, color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 600 }}>
          <RefreshCw size={13} style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }} />
          {refreshing ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {/* Indices grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        {(loading ? DEFAULT_INDICES : indices).map(q => <IndexCard key={q.symbol} q={q} />)}
      </div>

      {/* Breadth + Sectors */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 10, alignItems: 'start' }}>
        <MarketBreadth />
        <SectorBarChart sectors={SECTORS} />
      </div>

      {/* Hot Market Table */}
      <div className="card" style={{ padding: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', fontFamily: 'var(--font-ui)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Top Movers Today</div>
        <HotTable />
      </div>
    </div>
  );
}

function HotTable() {
  const [data, setData] = useState<any[]>([]);
  const [tab, setTab] = useState<'high_volume' | 'price_spike'>('high_volume');
  useEffect(() => {
    api.getMarketHot().then(d => setData(d.high_volume)).catch(() => setData([]));
  }, []);
  const rows = data.slice(0, 8);
  return (
    <div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
        {([['high_volume','High Volume'],['price_spike','Price Spike']] as const).map(([k,label]) => (
          <button key={k} onClick={() => setTab(k as any)}
            style={{ padding: '4px 12px', background: tab === k ? 'var(--accent-cyan)' : 'var(--bg-surface)', border: 'none', borderRadius: 6, color: tab === k ? 'var(--bg-base)' : 'var(--text-muted)', cursor: 'pointer', fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 600, transition: 'all 150ms' }}>
            {label}
          </button>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
        {rows.map((r: any) => (
          <div key={r.symbol} style={{ background: 'var(--bg-surface)', borderRadius: 8, padding: '10px 12px', border: '1px solid var(--border-default)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>{r.symbol}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: r.up ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>{r.up ? '+' : ''}{r.change_pct?.toFixed(2)}%</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-ui)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-ui)' }}>Vol ratio</span>
              <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: r.vol_ratio > 1.5 ? 'var(--green)' : 'var(--text-secondary)', fontWeight: 600 }}>{r.vol_ratio}x</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
