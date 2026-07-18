import { useState, useEffect } from 'react';
import { Newspaper, ExternalLink, RefreshCw, Search } from 'lucide-react';

interface NewsItem {
  id: string;
  headline: string;
  source: string;
  time: string;
  tag: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  url?: string;
}

const TAG_COLORS: Record<string, string> = {
  BULLISH: 'var(--green)', BEARISH: 'var(--red)', MACRO: 'var(--accent-cyan)',
  EARNINGS: 'var(--yellow)', CRYPTO: 'var(--orange)', MARKETS: 'var(--chart-sentiment)',
  COMMODITIES: 'var(--yellow)', DEFAULT: 'var(--text-muted)'
};

function TagBadge({ tag }: { tag: string }) {
  const color = TAG_COLORS[tag] || TAG_COLORS.DEFAULT;
  return (
    <span style={{ fontSize: 9, fontWeight: 700, fontFamily: 'var(--font-ui)', textTransform: 'uppercase', letterSpacing: '0.05em', color, background: color + '20', padding: '2px 7px', borderRadius: 4, flexShrink: 0 }}>
      {tag}
    </span>
  );
}

function SentimentBar({ sentiment }: { sentiment: string }) {
  const bullish = sentiment === 'bullish';
  const pct = sentiment === 'neutral' ? 50 : bullish ? 75 : 25;
  const color = bullish ? 'var(--green)' : sentiment === 'bearish' ? 'var(--red)' : 'var(--text-muted)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: 80 }}>
      <div style={{ flex: 1, height: 4, background: 'var(--bg-surface)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: pct + '%', background: color, transition: 'width 0.4s' }} />
      </div>
    </div>
  );
}

// Simulated news generator (replace with real API in production)
function generateMockNews(): NewsItem[] {
  return [
    { id: '1', headline: 'Fed signals potential rate cut in Q3 2026 as inflation cools to 2.3%', source: 'Reuters', time: '12m ago', tag: 'MACRO', sentiment: 'bullish' },
    { id: '2', headline: 'NVDA surges 5.2% — AI chip demand exceeds analyst estimates by 40%', source: 'Bloomberg', time: '34m ago', tag: 'EARNINGS', sentiment: 'bullish' },
    { id: '3', headline: 'S&P 500 breaks above 5,800 — technology stocks lead broad market rally', source: 'CNBC', time: '1h ago', tag: 'MARKETS', sentiment: 'bullish' },
    { id: '4', headline: 'TSLA deliveries miss estimates by 8% in Q1 — shares fall 3.1% premarket', source: 'WSJ', time: '2h ago', tag: 'EARNINGS', sentiment: 'bearish' },
    { id: '5', headline: 'Bitcoin ETF inflows hit $1.8B in a single day — largest since January', source: 'CoinDesk', time: '3h ago', tag: 'CRYPTO', sentiment: 'bullish' },
    { id: '6', headline: 'Oil drops 1.8% on surprise inventory build — OPEC+ output unchanged', source: 'Reuters', time: '4h ago', tag: 'COMMODITIES', sentiment: 'bearish' },
    { id: '7', headline: 'AMD launches MI325X accelerator — data center revenue surges 86% YoY', source: 'Bloomberg', time: '5h ago', tag: 'EARNINGS', sentiment: 'bullish' },
    { id: '8', headline: 'Treasury yields steady at 4.28% — investors await next CPI reading', source: 'WSJ', time: '6h ago', tag: 'MACRO', sentiment: 'neutral' },
    { id: '9', headline: 'Gold breaks $2,200 resistance — safe-haven demand accelerates', source: 'Reuters', time: '8h ago', tag: 'COMMODITIES', sentiment: 'bullish' },
    { id: '10', headline: 'META AI Studio gains 10M users in first month — ad revenue outlook raised', source: 'CNBC', time: '10h ago', tag: 'EARNINGS', sentiment: 'bullish' },
    { id: '11', headline: 'Euro weakens vs dollar as ECB cuts rates by 25bps — EUR/USD near 1.07', source: 'Bloomberg', time: '12h ago', tag: 'MACRO', sentiment: 'bearish' },
    { id: '12', headline: 'Small-cap stocks outperform — Russell 2000 up 1.4% vs S&P 500 0.6%', source: 'WSJ', time: '14h ago', tag: 'MARKETS', sentiment: 'bullish' },
  ];
}

export function News() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [filter, setFilter] = useState<'All' | 'bullish' | 'bearish'>('All');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    setTimeout(() => {
      setItems(generateMockNews());
      setLoading(false);
    }, 400);
  };

  useEffect(load, []);

  const filtered = items.filter(n => {
    const matchSent = filter === 'All' || n.sentiment === filter;
    const matchSearch = !search || n.headline.toLowerCase().includes(search.toLowerCase()) || n.source.toLowerCase().includes(search.toLowerCase());
    return matchSent && matchSearch;
  });

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-ui)', color: 'var(--text-primary)', margin: 0 }}>Market News</h1>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-ui)', margin: '2px 0 0' }}>Real-time headlines with sentiment analysis</p>
        </div>
        <button onClick={load} disabled={loading}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 8, color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 600 }}>
          <RefreshCw size={13} style={{ animation: loading ? 'spin 0.8s linear infinite' : 'none' }} />
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Sentiment filter */}
        <div style={{ display: 'flex', gap: 4 }}>
          {(['All', 'bullish', 'bearish'] as const).map(s => (
            <button key={s} onClick={() => setFilter(s)}
              style={{ padding: '5px 14px', background: filter === s ? (s === 'bullish' ? 'var(--green)' : s === 'bearish' ? 'var(--red)' : 'var(--accent-cyan)') : 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 8, color: filter === s ? 'var(--bg-base)' : 'var(--text-muted)', cursor: 'pointer', fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 600, textTransform: 'capitalize', transition: 'all 150ms' }}>
              {s}
            </button>
          ))}
        </div>
        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search headlines..."
            style={{ width: '100%', padding: '6px 10px 6px 30px', background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 8, color: 'var(--text-primary)', fontFamily: 'var(--font-ui)', fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
        </div>
        {/* Count */}
        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-ui)', whiteSpace: 'nowrap' }}>{filtered.length} articles</span>
      </div>

      {/* News list */}
      {loading ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
          <Newspaper size={32} style={{ color: 'var(--accent-cyan)', animation: 'spin 1s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, minHeight: 200 }}>
          <Newspaper size={40} style={{ color: 'var(--text-muted)' }} />
          <p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-ui)', fontSize: 13 }}>No articles match your filters.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(n => (
            <div key={n.id} className="card" style={{ padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'flex-start', transition: 'background 150ms', cursor: 'pointer' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-card-hover)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-card)')}>
              <TagBadge tag={n.tag} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontFamily: 'var(--font-ui)', color: 'var(--text-primary)', lineHeight: 1.5, margin: '0 0 6px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{n.headline}</p>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, fontFamily: 'var(--font-ui)', color: 'var(--accent-cyan)' }}>{n.source}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-ui)' }}>{n.time}</span>
                  </div>
                  <SentimentBar sentiment={n.sentiment} />
                  <span style={{ fontSize: 10, fontFamily: 'var(--font-ui)', color: n.sentiment === 'bullish' ? 'var(--green)' : n.sentiment === 'bearish' ? 'var(--red)' : 'var(--text-muted)', textTransform: 'capitalize' }}>{n.sentiment}</span>
                </div>
              </div>
              <ExternalLink size={13} style={{ color: 'var(--text-muted)', flexShrink: 0, marginTop: 2 }} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
