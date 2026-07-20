import { useState } from 'react';
import {
  LayoutGrid, Zap, Briefcase, Star, Menu,
  LineChart, Search, Layers, Newspaper, Bell, ClipboardList, Settings,
  type LucideIcon,
} from 'lucide-react';
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

// Sections only reachable via this sheet on mobile (<768px hides the sidebar)
const MORE_ITEMS: { id: NavId; label: string; icon: LucideIcon }[] = [
  { id: 'market',   label: 'Market Overview', icon: LineChart },
  { id: 'screener', label: 'Screener',        icon: Search },
  { id: 'layers',   label: 'Layers',          icon: Layers },
  { id: 'news',     label: 'News',            icon: Newspaper },
  { id: 'alerts',   label: 'Alerts',          icon: Bell },
  { id: 'reports',  label: 'Reports',         icon: ClipboardList },
  { id: 'settings', label: 'Settings',        icon: Settings },
];

export function BottomNav({ currentPage, onNavigate }: BottomNavProps) {
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <>
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
          const isActive = item.id === 'more'
            ? moreOpen || MORE_ITEMS.some(m => isUnderParent(currentPage, m.id))
            : currentPage === item.id || isUnderParent(currentPage, item.id);
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => (item.id === 'more' ? setMoreOpen((v) => !v) : onNavigate(item.id))}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 3,
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '6px 0',
                minHeight: 48,   // 48px touch target — the mobile-primary nav
                color: isActive ? 'var(--accent-cyan)' : 'var(--text-muted)',
                transition: 'color 0.12s',
              }}
              aria-label={item.label}
              aria-expanded={item.id === 'more' ? moreOpen : undefined}
            >
              <Icon size={20} strokeWidth={1.8} aria-hidden />
              <span style={{ fontSize: 10.5, fontWeight: isActive ? 600 : 400, fontFamily: 'var(--font-ui)' }}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* More sheet — the only way to reach these sections on mobile */}
      {moreOpen && (
        <div
          onClick={() => setMoreOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 70, background: 'rgba(0,0,0,0.5)' }}
        >
          <div
            role="menu"
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute', left: 0, right: 0, bottom: 0,
              background: 'var(--bg-surface)',
              borderTop: '1px solid var(--border-default)',
              borderRadius: '12px 12px 0 0',
              padding: '8px 0 calc(8px + env(safe-area-inset-bottom))',
            }}
          >
            {MORE_ITEMS.map((item) => {
              const isActive = isUnderParent(currentPage, item.id);
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  role="menuitem"
                  onClick={() => { onNavigate(item.id); setMoreOpen(false); }}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 20px', minHeight: 48,
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    color: isActive ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                    fontSize: 13, fontWeight: isActive ? 600 : 400,
                    fontFamily: 'var(--font-ui)', textAlign: 'left',
                  }}
                >
                  <Icon size={18} strokeWidth={1.8} aria-hidden />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
