import { useState, useEffect, useRef, useCallback } from 'react';
import { type NavId } from '../NavId';

interface CommandItem {
  id: string;
  label: string;
  sublabel?: string;
  icon: string;
  category: 'page' | 'action' | 'signal' | 'portfolio';
  action: () => void;
}

interface GlobalCommandBarProps {
  onNavigate: (id: NavId) => void;
  onClose: () => void;
}

const PAGES: CommandItem[] = [
  { id: 'dashboard',  label: 'Dashboard',       icon: '⊞', category: 'page', action: () => {} },
  { id: 'market',   label: 'Market Overview',  icon: '📊', category: 'page', action: () => {} },
  { id: 'signals',  label: 'Signals',          icon: '⚡', category: 'page', action: () => {} },
  { id: 'screener', label: 'Screener',         icon: '🔍', category: 'page', action: () => {} },
  { id: 'layers',   label: 'Layers',           icon: '◈',  category: 'page', action: () => {} },
  { id: 'portfolio',label: 'Portfolio',         icon: '💼', category: 'page', action: () => {} },
  { id: 'watchlist',label: 'Watchlist',        icon: '⭐', category: 'page', action: () => {} },
  { id: 'news',     label: 'News',              icon: '📰', category: 'page', action: () => {} },
  { id: 'alerts',   label: 'Alerts',            icon: '🔔', category: 'page', action: () => {} },
  { id: 'reports',  label: 'Reports',           icon: '📋', category: 'page', action: () => {} },
  { id: 'settings', label: 'Settings',           icon: '⚙', category: 'page', action: () => {} },
];

const ACTIONS: CommandItem[] = [
  { id: 'generate-signal', label: 'Generate Signal',       sublabel: 'Analyze a symbol', icon: '⚡', category: 'action', action: () => {} },
  { id: 'new-portfolio',   label: 'New Portfolio',          sublabel: 'Create a portfolio', icon: '💼', category: 'action', action: () => {} },
  { id: 'add-watchlist',   label: 'Add to Watchlist',      sublabel: 'Add symbol to watchlist', icon: '⭐', category: 'action', action: () => {} },
  { id: 'set-alert',       label: 'Set Price Alert',        sublabel: 'Create a price alert', icon: '🔔', category: 'action', action: () => {} },
  { id: 'run-backtest',    label: 'Run Backtest',           sublabel: 'Test a strategy', icon: '📊', category: 'action', action: () => {} },
  { id: 'export-data',     label: 'Export Data',            sublabel: 'Download CSV/JSON', icon: '📥', category: 'action', action: () => {} },
  { id: 'theme-toggle',   label: 'Toggle Theme',           sublabel: 'Switch dark/light', icon: '🌓', category: 'action', action: () => {} },
  { id: 'keyboard-help',  label: 'Keyboard Shortcuts',     sublabel: 'View all shortcuts', icon: '⌨', category: 'action', action: () => {} },
];

const CATEGORY_LABELS: Record<CommandItem['category'], string> = {
  page: 'Pages',
  action: 'Actions',
  signal: 'Recent Signals',
  portfolio: 'Portfolios',
};

const CATEGORY_ORDER: CommandItem['category'][] = ['page', 'action', 'signal', 'portfolio'];

function fuzzyMatch(text: string, query: string): boolean {
  const t = text.toLowerCase();
  const q = query.toLowerCase().trim();
  if (!q) return true;
  if (t.includes(q)) return true;
  // Fuzzy: all query chars must appear in order
  let ti = 0;
  for (const ch of q) {
    const idx = t.indexOf(ch, ti);
    if (idx === -1) return false;
    ti = idx + 1;
  }
  return true;
}

function highlight(text: string, query: string): React.ReactNode {
  const q = query.trim();
  if (!q) return text;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <span style={{ color: 'var(--accent-cyan)', fontWeight: 700 }}>{text.slice(idx, idx + q.length)}</span>
      {text.slice(idx + q.length)}
    </>
  );
}

export function GlobalCommandBar({ onNavigate, onClose }: GlobalCommandBarProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = CATEGORY_ORDER
    .map(cat => ({
      category: cat,
      label: CATEGORY_LABELS[cat],
      items: (cat === 'page' ? PAGES : cat === 'action' ? ACTIONS : [])
        .filter(item => fuzzyMatch(item.label, query) || (item.sublabel && fuzzyMatch(item.sublabel, query)))
        .map(item => {
          // Wire page navigations to onNavigate; actions stay as-is
          const action = cat === 'page'
            ? (() => { onNavigate(item.id as NavId); onClose(); })
            : (() => { item.action(); onClose(); });
          return { ...item, action };
        }),
    }))
    .filter(group => group.items.length > 0);

  const flatItems = filtered.flatMap(g => g.items);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => { setSelectedIndex(0); }, [query]);

  // Scroll selected item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${selectedIndex}"]`) as HTMLElement | null;
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { onClose(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex(i => Math.min(i + 1, flatItems.length - 1)); return; }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setSelectedIndex(i => Math.max(i - 1, 0)); return; }
    if (e.key === 'Enter') { e.preventDefault(); flatItems[selectedIndex]?.action(); return; }
  }, [flatItems, selectedIndex, onClose]);

  let globalIdx = 0;

  return (
    /* Backdrop */
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 500,
        background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        paddingTop: '15vh',
      }}
    >
      {/* Panel */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 560,
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          borderRadius: 12,
          boxShadow: '0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px var(--border-default)',
          overflow: 'hidden',
        }}
      >
        {/* Search input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderBottom: '1px solid var(--border-default)' }}>
          <span style={{ fontSize: 16, color: 'var(--text-muted)', flexShrink: 0 }}>🔍</span>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search pages, actions, signals..."
            aria-label="Command bar search"
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              fontSize: 14, color: 'var(--text-primary)', fontFamily: 'var(--font-ui)',
            }}
          />
          <kbd style={{
            fontSize: 10, padding: '2px 6px', borderRadius: 4,
            background: 'var(--bg-card)', border: '1px solid var(--border-default)',
            color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', flexShrink: 0,
          }}>ESC</kbd>
        </div>

        {/* Results */}
        <div ref={listRef} style={{ maxHeight: 360, overflowY: 'auto', padding: '4px 0' }}>
          {filtered.length === 0 && (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              No results for "{query}"
            </div>
          )}
          {filtered.map(group => (
            <div key={group.category}>
              <div style={{
                padding: '6px 16px 4px', fontSize: 10, fontWeight: 700,
                color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em',
              }}>
                {group.label}
              </div>
              {group.items.map(item => {
                const idx = globalIdx++;
                const isSelected = idx === selectedIndex;
                return (
                  <button
                    key={item.id}
                    data-idx={idx}
                    onClick={() => { item.action(); onClose(); }}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 16px', background: isSelected ? 'rgba(0,229,200,0.08)' : 'transparent',
                      border: 'none', cursor: 'pointer', textAlign: 'left',
                    }}
                  >
                    <span style={{ fontSize: 14, flexShrink: 0 }}>{item.icon}</span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: 13, color: 'var(--text-primary)', display: 'block', fontWeight: 500 }}>
                        {highlight(item.label, query)}
                      </span>
                      {item.sublabel && (
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block' }}>
                          {item.sublabel}
                        </span>
                      )}
                    </span>
                    {isSelected && (
                      <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>
                        ↵ select
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer hint */}
        <div style={{
          display: 'flex', gap: 16, padding: '8px 16px',
          borderTop: '1px solid var(--border-default)',
          fontSize: 10, color: 'var(--text-muted)',
        }}>
          <span><kbd style={kbdStyle}>↑↓</kbd> navigate</span>
          <span><kbd style={kbdStyle}>↵</kbd> select</span>
          <span><kbd style={kbdStyle}>esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}

const kbdStyle: React.CSSProperties = {
  fontSize: 9, padding: '1px 5px', borderRadius: 3,
  background: 'var(--bg-card)', border: '1px solid var(--border-default)',
  fontFamily: 'var(--font-mono)', marginRight: 4,
};
