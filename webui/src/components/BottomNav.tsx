import { LayoutGrid, Zap, Briefcase, Star, Menu, type LucideIcon } from 'lucide-react';
import { type NavId, isUnderParent } from '../NavId';

interface BottomNavProps {
  currentPage: NavId;
  onNavigate: (id: NavId) => void;
}

// Minimalist monotone icons (lucide-react) — currentColor, 1.8 stroke
const NAV_ITEMS: { id: NavId; label: string; icon: LucideIcon }[] = [
  { id: 'dashboard', label: 'Home',      icon: LayoutGrid },
  { id: 'signals',   label: 'Signals',   icon: Zap },
  { id: 'portfolio', label: 'Portfolio', icon: Briefcase },
  { id: 'watchlist', label: 'Watchlist', icon: Star },
  { id: 'more',      label: 'More',      icon: Menu },
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
        const Icon = item.icon;
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
              minHeight: 48,   // 48px touch target — the mobile-primary nav
              color: isActive ? 'var(--accent-cyan)' : 'var(--text-muted)',
              transition: 'color 0.12s',
            }}
            aria-label={item.label}
          >
            <Icon size={20} strokeWidth={1.8} aria-hidden />
            <span style={{ fontSize: 10.5, fontWeight: isActive ? 600 : 400, fontFamily: 'var(--font-ui)' }}>
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
