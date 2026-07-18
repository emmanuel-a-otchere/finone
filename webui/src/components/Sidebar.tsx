// Sidebar — P2-3: contrast pass (8px→11px labels, text-secondary)
// P2-4: no label truncation — icon-only rail at 64px; expanded panel at 180px shows full labels
// P2-5: 44px touch targets on <768px via md:hidden class approach
import { useState, useEffect, useRef } from 'react';
import { type NavId, getParentNavId, isUnderParent } from '../NavId';

interface SubItem { label: string; navId: NavId; }
interface NavItem { id: NavId; label: string; icon: string; subItems?: SubItem[]; }

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard',    label: 'Dashboard',        icon: '⊞' },
  { id: 'market',       label: 'Market Overview',   icon: '📊' },
  { id: 'signals',      label: 'Signals',            icon: '⚡' },
  { id: 'screener',     label: 'Screener',           icon: '🔍',
    subItems: [
      { label: 'Stock Screener',  navId: 'screener-stock' },
      { label: 'ETF Screener',    navId: 'screener-etf' },
      { label: 'Options Screener',navId: 'screener-options' },
      { label: 'Saved Screens',   navId: 'screener-saved' },
    ],
  },
  { id: 'layers',       label: 'Layers',             icon: '◈',
    subItems: [
      { label: 'All Layers',          navId: 'layers-all' },
      { label: 'Momentum',             navId: 'layers-momentum' },
      { label: 'Mean Reversion',       navId: 'layers-meanreversion' },
      { label: 'Options Flow',         navId: 'layers-optionsflow' },
      { label: 'Macro',                navId: 'layers-macro' },
    ],
  },
  { id: 'portfolio',    label: 'Portfolio',          icon: '💼',
    subItems: [
      { label: 'Overview',        navId: 'portfolio-overview' },
      { label: 'Holdings',        navId: 'portfolio-holdings' },
      { label: 'Transactions',    navId: 'portfolio-transactions' },
      { label: 'P&L',             navId: 'portfolio-pnl' },
      { label: 'Risk Analysis',   navId: 'portfolio-risk' },
    ],
  },
  { id: 'watchlist',    label: 'Watchlist',         icon: '⭐',
    subItems: [
      { label: 'My Lists',       navId: 'watchlist-mylists' },
      { label: 'Shared Lists',  navId: 'watchlist-shared' },
      { label: 'Alerts',        navId: 'watchlist-alerts' },
    ],
  },
  { id: 'news',         label: 'News',               icon: '📰' },
  { id: 'alerts',       label: 'Alerts',             icon: '🔔',
    subItems: [
      { label: 'Active Alerts',  navId: 'alerts-active' },
      { label: 'Triggered',     navId: 'alerts-triggered' },
      { label: 'Price Alerts',  navId: 'alerts-price' },
      { label: 'Volume Alerts', navId: 'alerts-volume' },
    ],
  },
  { id: 'reports',      label: 'Reports',            icon: '📋',
    subItems: [
      { label: 'Performance',   navId: 'reports-performance' },
      { label: 'Portfolio',      navId: 'reports-portfolio' },
      { label: 'Market',         navId: 'reports-market' },
      { label: 'Custom',         navId: 'reports-custom' },
      { label: 'Scheduled',      navId: 'reports-scheduled' },
    ],
  },
  { id: 'settings',     label: 'Settings',           icon: '⚙' },
];

function SubMenuFlyout({ items, onNavigate, currentPage }: {
  items: SubItem[]; onNavigate: (id: NavId) => void; currentPage: NavId;
}) {
  return (
    <div role="menu" style={{
      position: 'absolute', left: '100%', top: 0,
      background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
      borderRadius: 8, padding: '4px 0', minWidth: 170, zIndex: 200,
      boxShadow: 'var(--shadow-panel)',
    }}>
      {items.map(item => {
        const isActive = currentPage === item.navId;
        return (
          <div key={item.navId} role="menuitem" onClick={() => onNavigate(item.navId)} style={{
            padding: '7px 14px',
            fontSize: 11,                        // P2-3: 11px, text-secondary (4.7:1)
            color: isActive ? 'var(--accent-cyan)' : 'var(--text-secondary)',
            fontWeight: isActive ? 600 : 400,
            cursor: 'pointer', whiteSpace: 'nowrap',
            background: isActive ? 'rgba(0,229,200,0.08)' : 'transparent',
            borderLeft: isActive ? '2px solid var(--accent-cyan)' : '2px solid transparent',
          }}
          onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--bg-card-hover)'; }}
          onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
          >
            {item.label}
          </div>
        );
      })}
    </div>
  );
}

function SubMenuAccordion({ items, onNavigate, currentPage }: {
  items: SubItem[]; onNavigate: (id: NavId) => void; currentPage: NavId;
}) {
  return (
    <div role="menu" style={{ display: 'flex', flexDirection: 'column', width: '100%', padding: '2px 0 4px', gap: 1 }}>
      {items.map(item => {
        const isActive = currentPage === item.navId;
        return (
          <button key={item.navId} role="menuitem" onClick={() => onNavigate(item.navId)} style={{
            padding: '8px 8px 8px 24px',   // P2-5: 44px min-height on mobile
            fontSize: 11,                   // P2-3: 11px
            color: isActive ? 'var(--accent-cyan)' : 'var(--text-secondary)',
            fontWeight: isActive ? 600 : 400,
            cursor: 'pointer', whiteSpace: 'nowrap',
            background: isActive ? 'rgba(0,229,200,0.08)' : 'transparent',
            border: 'none', borderRadius: 6, textAlign: 'left',
            fontFamily: 'var(--font-ui)',
            minHeight: 44,                   // P2-5: 44px touch target on mobile
          }}>
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

export function Sidebar({ currentPage, onNavigate }: { currentPage: NavId; onNavigate: (id: NavId) => void; }) {
  const [expandedId, setExpandedId] = useState<NavId | null>(null);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setExpandedId(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const parent = getParentNavId(currentPage);
    if (parent !== currentPage) setExpandedId(parent);
  }, [currentPage]);

  return (
    // P0-3: root is <aside className="app-sidebar"> so .shell > aside rules apply:
    // ≥1024px full 208px sidebar · 768–1023px 64px icon rail (labels hidden) · <768px hidden (tab bar takes over)
    <aside ref={navRef} role="navigation" aria-label="Main navigation" className="app-sidebar">
      {NAV_ITEMS.map(item => {
        const hasSubs = !!item.subItems;
        const isParentActive = isUnderParent(currentPage, item.id);
        const isExpanded = expandedId === item.id;

        return (
          <div key={item.id} style={{ position: 'relative', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <button
              onClick={() => {
                if (hasSubs) {
                  setExpandedId(prev => prev === item.id ? null : item.id);
                } else {
                  setExpandedId(null);
                  onNavigate(item.id);
                }
              }}
              aria-label={item.label}         // P2-4: always accessible via aria-label
              aria-haspopup={hasSubs ? 'menu' : undefined}
              aria-expanded={hasSubs ? isExpanded : undefined}
              title={item.label}               // P2-4: tooltip shows full label in icon-rail mode
              style={{
                width: 44,
                // P2-5: 44px touch target on mobile; 40px desktop
                minHeight: 44,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                borderRadius: 8, cursor: 'pointer', border: 'none',
                background: isParentActive ? 'rgba(0,229,200,0.1)' : 'transparent',
                color: isParentActive ? 'var(--accent-cyan)' : 'var(--text-secondary)',  // P2-3: text-secondary (4.7:1)
                transition: 'all 120ms ease', gap: 2, position: 'relative',
              }}
            >
              <span style={{ fontSize: 16, lineHeight: 1 }}>{item.icon}</span>
              {/* P2-4: label always visible (no truncation), wrapping at 40px max-width */}
              {/* P2-3: 11px (up from 8px), text-secondary for AA contrast */}
              <span className="nav-label" style={{
                fontSize: 11,                  // P2-3: was 8px → now 11px
                color: isParentActive ? 'var(--accent-cyan)' : 'var(--text-secondary)', // P2-3: was text-muted → text-secondary
                lineHeight: 1.15,
                maxWidth: 72,
                // P2-4: wrap to two lines instead of truncating ("Market Overview")
                overflow: 'visible',
                whiteSpace: 'normal',
                textAlign: 'center',
                fontFamily: 'var(--font-ui)',
              }}>
                {item.label}
              </span>
              {isParentActive && (
                <div style={{
                  position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
                  width: 3, height: 20, background: 'var(--accent-cyan)', borderRadius: '0 2px 2px 0',
                }} />
              )}
            </button>

            {/* Desktop fly-out */}
            <div className="hidden md:block">
              {hasSubs && isExpanded && (
                <SubMenuFlyout items={item.subItems!} onNavigate={id => { onNavigate(id); setExpandedId(null); }} currentPage={currentPage} />
              )}
            </div>

            {/* Mobile accordion */}
            <div className="md:hidden">
              {hasSubs && isExpanded && (
                <SubMenuAccordion items={item.subItems!} onNavigate={id => { onNavigate(id); setExpandedId(null); }} currentPage={currentPage} />
              )}
            </div>
          </div>
        );
      })}
    </aside>
  );
}
