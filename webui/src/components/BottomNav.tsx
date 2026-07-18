import { type NavId, isUnderParent } from '../NavId';

interface BottomNavProps {
  currentPage: NavId;
  onNavigate: (id: NavId) => void;
}

// SVG icons matching index.html spec exactly
const NAV_ITEMS: { id: NavId; label: string; icon: string }[] = [
  {
    id: 'dashboard',
    label: 'Home',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/></svg>',
  },
  {
    id: 'signals',
    label: 'Signals',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M13 2L4 14h6l-1 8 9-12h-6z"/></svg>',
  },
  {
    id: 'portfolio',
    label: 'Portfolio',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>',
  },
  {
    id: 'watchlist',
    label: 'Watchlist',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 3l2.7 5.6 6.3.9-4.5 4.3 1 6.2-5.5-3-5.5 3 1-6.2L3 9.5l6.3-.9z"/></svg>',
  },
  {
    id: 'more',
    label: 'More',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>',
  },
];

export function BottomNav({ currentPage, onNavigate }: BottomNavProps) {
  return (
    <nav
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 60,
        background: 'var(--bg-surface)',
        borderTop: '1px solid var(--border-default)',
        padding: '6px 4px calc(6px + env(safe-area-inset-bottom))',
      }}
    >
      {NAV_ITEMS.map((item) => {
        const isActive = currentPage === item.id || isUnderParent(currentPage, item.id);
        return (
          <button
            key={item.id}
            onClick={() => item.id !== 'more' && onNavigate(item.id)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
              background: 'transparent',
              border: 'none',
              cursor: item.id === 'more' ? 'default' : 'pointer',
              padding: '6px 0',
              minHeight: 48,
              color: isActive ? 'var(--accent-cyan)' : 'var(--text-muted)',
              transition: 'color 0.12s',
            }}
            aria-label={item.label}
          >
            <span
              style={{ width: 20, height: 20, display: 'grid', placeItems: 'center' }}
              dangerouslySetInnerHTML={{ __html: item.icon }}
            />
            <span style={{ fontSize: 10.5, fontWeight: isActive ? 600 : 400, fontFamily: 'var(--font-ui)' }}>
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
