// Sidebar — compact horizontal rows: 18px lucide icon + 12px label, 36px min-height.
// ≥1024px: full 260px sidebar · 768–1023px: 64px icon rail (labels hidden via CSS,
// icons auto-center) · <768px: hidden (bottom tab bar takes over)
import { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard, LineChart, Zap, Search, Layers, Briefcase,
  Star, Newspaper, Bell, ClipboardList, Settings, ChevronDown,
  Sun, Moon, LogOut, TrendingUp,
  type LucideIcon,
} from 'lucide-react';
import { type NavId, getParentNavId, isUnderParent } from '../NavId';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../hooks/useAuth';

interface SubItem { label: string; navId: NavId; }
interface NavItem { id: NavId; label: string; icon: LucideIcon; subItems?: SubItem[]; }

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard',    label: 'Dashboard',        icon: LayoutDashboard },
  { id: 'market',       label: 'Market Overview',  icon: LineChart },
  { id: 'signals',      label: 'Signals',          icon: Zap },
  { id: 'screener',     label: 'Screener',         icon: Search,
    subItems: [
      { label: 'Stock Screener',  navId: 'screener-stock' },
      { label: 'ETF Screener',    navId: 'screener-etf' },
      { label: 'Options Screener',navId: 'screener-options' },
      { label: 'Saved Screens',   navId: 'screener-saved' },
    ],
  },
  { id: 'layers',       label: 'Layers',           icon: Layers,
    subItems: [
      { label: 'All Layers',          navId: 'layers-all' },
      { label: 'Momentum',             navId: 'layers-momentum' },
      { label: 'Mean Reversion',       navId: 'layers-meanreversion' },
      { label: 'Options Flow',         navId: 'layers-optionsflow' },
      { label: 'Macro',                navId: 'layers-macro' },
    ],
  },
  { id: 'portfolio',    label: 'Portfolio',        icon: Briefcase,
    subItems: [
      { label: 'Overview',        navId: 'portfolio-overview' },
      { label: 'Holdings',        navId: 'portfolio-holdings' },
      { label: 'Transactions',    navId: 'portfolio-transactions' },
      { label: 'P&L',             navId: 'portfolio-pnl' },
      { label: 'Risk Analysis',   navId: 'portfolio-risk' },
    ],
  },
  { id: 'watchlist',    label: 'Watchlist',        icon: Star,
    subItems: [
      { label: 'My Lists',       navId: 'watchlist-mylists' },
      { label: 'Shared Lists',  navId: 'watchlist-shared' },
      { label: 'Alerts',        navId: 'watchlist-alerts' },
    ],
  },
  { id: 'news',         label: 'News',             icon: Newspaper },
  { id: 'alerts',       label: 'Alerts',           icon: Bell,
    subItems: [
      { label: 'Active Alerts',  navId: 'alerts-active' },
      { label: 'Triggered',     navId: 'alerts-triggered' },
      { label: 'Price Alerts',  navId: 'alerts-price' },
      { label: 'Volume Alerts', navId: 'alerts-volume' },
    ],
  },
  { id: 'reports',      label: 'Reports',          icon: ClipboardList,
    subItems: [
      { label: 'Performance',   navId: 'reports-performance' },
      { label: 'Portfolio',      navId: 'reports-portfolio' },
      { label: 'Market',         navId: 'reports-market' },
      { label: 'Custom',         navId: 'reports-custom' },
      { label: 'Scheduled',      navId: 'reports-scheduled' },
    ],
  },
  { id: 'settings',     label: 'Settings',         icon: Settings },
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
            fontSize: 11,
            color: isActive ? 'var(--accent-cyan)' : 'var(--text-secondary)',
            fontWeight: isActive ? 600 : 400,
            cursor: 'pointer', whiteSpace: 'nowrap',
            background: isActive ? 'var(--primary-10)' : 'transparent',
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
            padding: '8px 8px 8px 24px',   // 44px min-height on mobile
            fontSize: 11,
            color: isActive ? 'var(--accent-cyan)' : 'var(--text-secondary)',
            fontWeight: isActive ? 600 : 400,
            cursor: 'pointer', whiteSpace: 'nowrap',
            background: isActive ? 'var(--primary-10)' : 'transparent',
            border: 'none', borderRadius: 6, textAlign: 'left',
            fontFamily: 'var(--font-ui)',
            minHeight: 44,                   // 44px touch target on mobile
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
  const { toggleTheme, isDark } = useTheme();
  const { user, logout } = useAuth();

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
    // Root is <aside className="app-sidebar"> so .shell > aside rules apply:
    // ≥1024px full 260px sidebar · 768–1023px 64px icon rail (labels hidden) · <768px hidden (tab bar takes over)
    <aside ref={navRef} role="navigation" aria-label="Main navigation" className="app-sidebar">
      {/* Brand block — text hidden in 64px rail via .nav-label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '2px 8px 14px', width: '100%' }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8, flexShrink: 0,
          background: 'var(--accent-cyan)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <TrendingUp size={18} strokeWidth={2.2} color="#0B1120" aria-hidden />
        </div>
        <div className="nav-label" style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2, textAlign: 'left' }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-ui)' }}>
            SystemOne
          </span>
          <span style={{ fontSize: 9, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Trading Intelligence
          </span>
        </div>
      </div>
      {NAV_ITEMS.map(item => {
        const hasSubs = !!item.subItems;
        const isParentActive = isUnderParent(currentPage, item.id);
        const isExpanded = expandedId === item.id;
        const Icon = item.icon;

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
              aria-label={item.label}
              aria-haspopup={hasSubs ? 'menu' : undefined}
              aria-expanded={hasSubs ? isExpanded : undefined}
              title={item.label}               // tooltip shows full label in icon-rail mode
              style={{
                // Full-width horizontal row: icon + label read as one unit.
                // justifyContent 'center' only has an effect in the 64px rail,
                // where the label is display:none — so the icon self-centers.
                width: '100%',
                minHeight: 36,
                display: 'flex', flexDirection: 'row',
                alignItems: 'center', justifyContent: 'center',
                padding: '7px 12px',
                borderRadius: 8, cursor: 'pointer', border: 'none',
                background: isParentActive ? 'var(--primary-10)' : 'transparent',
                color: isParentActive ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                transition: 'all 120ms ease', position: 'relative',
              }}
            >
              <Icon size={18} strokeWidth={1.8} style={{ flexShrink: 0 }} aria-hidden />
              {/* flex:1 pushes the icon to the left edge at ≥1024px; in the rail
                  this label is display:none (.app-sidebar .nav-label) and the
                  button's justifyContent centers the icon instead. */}
              <span className="nav-label" style={{
                flex: 1,
                marginLeft: 10,
                fontSize: 12,
                fontWeight: isParentActive ? 600 : 400,
                lineHeight: 1.15,
                whiteSpace: 'nowrap',
                textAlign: 'left',
                fontFamily: 'var(--font-ui)',
              }}>
                {item.label}
              </span>
              {/* Submenu affordance; hidden in rail mode by the same .nav-label rule */}
              {hasSubs && (
                <ChevronDown size={13} strokeWidth={1.8} className="nav-label" aria-hidden
                  style={{ opacity: 0.5, transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 120ms ease', flexShrink: 0 }} />
              )}
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

      {/* Bottom section — theme toggle, user, logout (pinned to sidebar foot) */}
      <div style={{
        marginTop: 'auto',
        paddingTop: 10,
        borderTop: '1px solid var(--border-default)',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        width: '100%',
      }}>
        <button
          onClick={toggleTheme}
          aria-label={`Switch to ${isDark ? 'light' : 'dark'} theme`}
          title={`Switch to ${isDark ? 'light' : 'dark'} theme`}
          style={{
            width: '100%', minHeight: 36,
            display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
            padding: '7px 12px', borderRadius: 8, cursor: 'pointer', border: 'none',
            background: 'transparent', color: 'var(--text-secondary)',
            transition: 'all 120ms ease',
          }}
        >
          {isDark
            ? <Moon size={18} strokeWidth={1.8} style={{ flexShrink: 0 }} aria-hidden />
            : <Sun size={18} strokeWidth={1.8} style={{ flexShrink: 0 }} aria-hidden />}
          <span className="nav-label" style={{ flex: 1, marginLeft: 10, fontSize: 12, textAlign: 'left', fontFamily: 'var(--font-ui)' }}>
            {isDark ? 'Dark' : 'Light'}
          </span>
        </button>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '7px 12px', width: '100%',
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
            background: 'var(--primary-15)', border: '1px solid var(--primary-30)',
            color: 'var(--accent-cyan)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-ui)',
          }}>
            {(user?.username ?? 'U').charAt(0).toUpperCase()}
          </div>
          <div className="nav-label" style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.25, textAlign: 'left', minWidth: 0 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.username ?? 'User'}
            </span>
            <span style={{ fontSize: 10, color: 'var(--accent-cyan)' }}>
              Pro Plan
            </span>
          </div>
        </div>

        <button
          onClick={logout}
          aria-label="Sign out"
          title="Sign out"
          style={{
            width: '100%', minHeight: 36,
            display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
            padding: '7px 12px', borderRadius: 8, cursor: 'pointer', border: 'none',
            background: 'transparent', color: 'var(--text-secondary)',
            transition: 'all 120ms ease',
          }}
        >
          <LogOut size={18} strokeWidth={1.8} style={{ flexShrink: 0 }} aria-hidden />
          <span className="nav-label" style={{ flex: 1, marginLeft: 10, fontSize: 12, textAlign: 'left', fontFamily: 'var(--font-ui)' }}>
            Logout
          </span>
        </button>
      </div>
    </aside>
  );
}
