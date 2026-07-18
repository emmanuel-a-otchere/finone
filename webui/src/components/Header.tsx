import { useState, useRef, useEffect } from 'react';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../hooks/useAuth';
import { NavId } from '../NavId';

interface HeaderProps {
  currentPage: NavId;
  onNavigate: (id: NavId) => void;
  pageTitle?: string;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MarketStatus {
  status:        'OPEN' | 'PRE_MARKET' | 'AFTER_HOURS' | 'CLOSED';
  status_label:  string;
  is_trading:    boolean;
  next_open_et:  string | null;
  next_close_et: string | null;
}

interface SearchResult {
  symbol:   string;
  name:     string;
  type:     string;
  exchange: string;
}

// ---------------------------------------------------------------------------
// Market Status — polls /api/market/status every 60s
// ---------------------------------------------------------------------------

function MarketStatusBadge() {
  const [mkt, setMkt] = useState<MarketStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = async () => {
    try {
      // Use relative URL so Vite proxy resolves it
      const res = await fetch('/api/market/status');
      if (res.ok) setMkt(await res.json());
    } catch { /* keep stale data on network error */ }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchStatus();
    const id = setInterval(fetchStatus, 60_000);
    return () => clearInterval(id);
  }, []);

  if (loading || !mkt) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: 'var(--text-secondary)', marginLeft: 8 }}>
        <span className="status-dot" />
        <span>—</span>
      </div>
    );
  }

  const dotColor = mkt.is_trading
    ? 'var(--green)'
    : mkt.status === 'PRE_MARKET' || mkt.status === 'AFTER_HOURS'
    ? 'var(--yellow)'
    : 'var(--text-secondary)';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: 'var(--text-secondary)', marginLeft: 8 }}>
      <span className="status-dot" style={{ background: dotColor }} />
      <span>{mkt.status_label}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Symbol Search — live autocomplete (UI-2)
// ---------------------------------------------------------------------------

function SearchBar({ onNavigate }: { onNavigate: (id: NavId) => void }) {
  const [query,   setQuery]   = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open,    setOpen]    = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef   = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleQuery = (q: string) => {
    setQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!q.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/symbols/search?q=${encodeURIComponent(q.trim())}`);
        if (res.ok) {
          const data: SearchResult[] = await res.json();
          setResults(data);
          setOpen(true);
        }
      } catch { /* network error — stay quiet */ }
      finally { setLoading(false); }
    }, 300);
  };

  const handleSelect = (result: SearchResult) => {
    setQuery(result.symbol);
    setOpen(false);
    setResults([]);
    // Navigate to signals page filtered by this symbol
    onNavigate('signals');
  };

  return (
    <div style={{ position: 'relative' }} ref={wrapperRef}>
      <form
        onSubmit={(e) => { e.preventDefault(); if (open && results.length) handleSelect(results[0]); }}
        style={{ position: 'relative' }}
      >
        <input
          className="input"
          placeholder="Search tickers…"
          aria-label="Search tickers"
          value={query}
          onChange={(e) => handleQuery(e.target.value)}
          onFocus={() => query.trim() && results.length && setOpen(true)}
          style={{ width: 180, height: 30, fontSize: 11, paddingLeft: 32 }}
        />
        <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', fontSize: 11 }}>
          {loading ? '…' : '🔍'}
        </span>
      </form>

      {/* Autocomplete dropdown */}
      {open && results.length > 0 && (
        <ul style={{
          position:   'absolute',
          top:        '100%',
          left:       0,
          width:      220,
          background: 'var(--bg-card)',
          border:     '1px solid var(--border-default)',
          borderRadius: 8,
          boxShadow:  '0 8px 24px rgba(0,0,0,0.5)',
          zIndex:     999,
          listStyle:  'none',
          margin:     0,
          padding:    '4px 0',
          maxHeight:  280,
          overflowY:  'auto',
        }}>
          {results.map((r) => (
            <li key={r.symbol}>
              <button
                type="button"
                onClick={() => handleSelect(r)}
                style={{
                  width:       '100%',
                  background:   'none',
                  border:       'none',
                  cursor:       'pointer',
                  padding:      '6px 12px',
                  display:      'flex',
                  alignItems:  'center',
                  gap:          8,
                  textAlign:    'left',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-card-hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
              >
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-primary)', fontWeight: 700, width: 52, flexShrink: 0 }}>
                  {r.symbol}
                </span>
                <span style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                  {r.name}
                </span>
                <span style={{ fontFamily: 'var(--font-ui)', fontSize: 9, color: 'var(--text-muted)', flexShrink: 0 }}>
                  {r.exchange}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* No results feedback */}
      {open && query.trim() && results.length === 0 && !loading && (
        <div style={{
          position:   'absolute',
          top:        '100%',
          left:       0,
          width:      220,
          background: 'var(--bg-card)',
          border:     '1px solid var(--border-default)',
          borderRadius: 8,
          padding:    '10px 12px',
          fontSize:   11,
          color:      'var(--text-secondary)',
          fontFamily: 'var(--font-ui)',
          zIndex:     999,
          boxShadow:  '0 8px 24px rgba(0,0,0,0.5)',
        }}>
          No symbols found for &ldquo;{query}&rdquo;
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

export function Header({ onNavigate, pageTitle }: HeaderProps) {
  const { toggleTheme, isDark } = useTheme();
  const { user, logout }       = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => {
    setUserMenuOpen(false);
    logout();
  };

  return (
    <header
      style={{
        height:        56,
        background:    'var(--bg-surface)',
        borderBottom:  '1px solid var(--border-default)',
        display:       'flex',
        alignItems:    'center',
        padding:       '0 16px',
        gap:           14,
        flexShrink:    0,
        position:      'sticky',
        top:           0,
        zIndex:        50,
      }}
    >
      {/* Sidebar toggle */}
      <button
        aria-label="Toggle sidebar"
        onClick={() => {}}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 18, padding: 4 }}
      >
        ☰
      </button>

      {/* Page title */}
      {pageTitle && (
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginLeft: 4 }}>
          {pageTitle}
        </span>
      )}

      {/* Market status — live from API (UI-1) */}
      <MarketStatusBadge />

      <div style={{ flex: 1 }} />

      {/* Search */}
      <SearchBar onNavigate={onNavigate} />

      {/* Watchlist */}
      <button
        onClick={() => onNavigate('watchlist')}
        aria-label="Watchlist"
        title="Watchlist"
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 16, padding: 4, borderRadius: 4 }}
      >
        ★
      </button>

      {/* Notifications */}
      <button
        aria-label="Notifications"
        title="Notifications"
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 16, padding: 4, borderRadius: 4, position: 'relative' }}
      >
        🔔
        <span style={{ position: 'absolute', top: 2, right: 2, width: 6, height: 6, borderRadius: '50%', background: 'var(--red)', border: '1px solid var(--bg-surface)' }} />
      </button>

      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        aria-label={`Switch to ${isDark ? 'light' : 'dark'} theme`}
        title={`Switch to ${isDark ? 'light' : 'dark'} theme`}
        style={{ background: 'none', border: '1px solid var(--border-default)', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 13, padding: '3px 7px', borderRadius: 6 }}
      >
        {isDark ? '☀' : '☽'}
      </button>

      {/* User menu */}
      <div style={{ position: 'relative' }} ref={userMenuRef}>
        <button
          onClick={() => setUserMenuOpen((v) => !v)}
          aria-label="User menu"
          style={{ background: 'none', border: '1px solid var(--border-default)', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 11, padding: '3px 8px', borderRadius: 6, fontFamily: 'var(--font-ui)' }}
        >
          {user?.username ?? 'User'} ▾
        </button>

        {userMenuOpen && (
          <div
            style={{
              position:     'absolute',
              right:        0,
              top:          '100%',
              marginTop:    4,
              background:   'var(--bg-card)',
              border:       '1px solid var(--border-default)',
              borderRadius: 8,
              minWidth:     160,
              boxShadow:    '0 8px 24px rgba(0,0,0,0.5)',
              zIndex:       999,
              overflow:     'hidden',
            }}
          >
            <div style={{ padding: '8px 12px 6px', fontSize: 11, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-default)', marginBottom: 6 }}>
              {user?.username ?? 'User'}
            </div>
            <button
              onClick={handleLogout}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)', display: 'flex', padding: '6px 12px', width: '100%', fontSize: 12, fontFamily: 'var(--font-ui)' }}
            >
              Sign Out
            </button>
          </div>
        )}
      </div>

      {/* App version */}
      <span aria-label="App version 2.5.0" style={{ fontSize: 10, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', cursor: 'default' }}>v2.5.0</span>
    </header>
  );
}
