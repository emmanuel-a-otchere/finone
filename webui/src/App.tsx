import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { type NavId, getParentNavId } from './NavId';
import { Layout } from './components/Layout';
import { GlobalCommandBar } from './components/GlobalCommandBar';
import { Dashboard } from './pages/Dashboard';
import { Markets } from './pages/Markets';
import { News } from './pages/News';
import { Portfolio } from './pages/Portfolio';
import { Settings } from './pages/Settings';
import { Signals } from './pages/Signals';
import { Layers } from './pages/Layers';
import ScreenerPage from './pages/Screener';
import WatchlistPage from './pages/Watchlist';
import AlertsPage from './pages/Alerts';
import ReportsPage from './pages/Reports';
import { LoginPage } from './pages/LoginPage';
import { useAuth } from './hooks/useAuth';

/* ------------------------------------------------------------------ */
/*  Page titles — every NavId must have a human-readable title        */
/* ------------------------------------------------------------------ */
const PAGE_TITLES: Record<NavId, string> = {
  // Main
  dashboard: 'Dashboard',
  market: 'Market Overview',
  signals: 'Signals',
  news: 'News',
  settings: 'Settings',
  more: 'More',

  // Screener
  screener: 'Screener',
  'screener-stock': 'Stock Screener',
  'screener-etf': 'ETF Screener',
  'screener-options': 'Options Screener',
  'screener-saved': 'Saved Screens',

  // Layers
  layers: 'Layers',
  'layers-all': 'All Layers',
  'layers-momentum': 'Momentum Layer',
  'layers-meanreversion': 'Mean Reversion Layer',
  'layers-optionsflow': 'Options Flow Layer',
  'layers-macro': 'Macro Layer',

  // Portfolio
  portfolio: 'Portfolio',
  'portfolio-overview': 'Portfolio Overview',
  'portfolio-holdings': 'Holdings',
  'portfolio-transactions': 'Transactions',
  'portfolio-pnl': 'P&L',
  'portfolio-risk': 'Risk Analysis',

  // Watchlist
  watchlist: 'Watchlist',
  'watchlist-mylists': 'My Lists',
  'watchlist-shared': 'Shared Lists',
  'watchlist-alerts': 'Watchlist Alerts',

  // Alerts
  alerts: 'Alerts',
  'alerts-active': 'Active Alerts',
  'alerts-triggered': 'Triggered Alerts',
  'alerts-price': 'Price Alerts',
  'alerts-volume': 'Volume Alerts',

  // Reports
  reports: 'Reports',
  'reports-performance': 'Performance Report',
  'reports-portfolio': 'Portfolio Report',
  'reports-market': 'Market Report',
  'reports-custom': 'Custom Report',
  'reports-scheduled': 'Scheduled Reports',
};

/* ------------------------------------------------------------------ */
/*  Sub-page tab routing — maps sub NavIds to parent component + tab  */
/* ------------------------------------------------------------------ */
type TabKey =
  | 'overview' | 'holdings' | 'transactions' | 'pnl' | 'risk'
  | 'all' | 'momentum' | 'meanreversion' | 'optionsflow' | 'macro'
  | 'stock' | 'etf' | 'options' | 'saved'
  | 'mylists' | 'shared' | 'watchlistAlerts'
  | 'active' | 'triggered' | 'price' | 'volume'
  | 'performance' | 'portfolioRep' | 'marketRep' | 'custom' | 'scheduled';

const SUB_PAGE_TABS: Record<NavId, { parent: NavId; tab: TabKey } | undefined> = {
  // Portfolio
  'portfolio-overview': { parent: 'portfolio', tab: 'overview' },
  'portfolio-holdings': { parent: 'portfolio', tab: 'holdings' },
  'portfolio-transactions': { parent: 'portfolio', tab: 'transactions' },
  'portfolio-pnl': { parent: 'portfolio', tab: 'pnl' },
  'portfolio-risk': { parent: 'portfolio', tab: 'risk' },

  // Layers
  'layers-all': { parent: 'layers', tab: 'all' },
  'layers-momentum': { parent: 'layers', tab: 'momentum' },
  'layers-meanreversion': { parent: 'layers', tab: 'meanreversion' },
  'layers-optionsflow': { parent: 'layers', tab: 'optionsflow' },
  'layers-macro': { parent: 'layers', tab: 'macro' },

  // Screener
  'screener-stock': { parent: 'screener', tab: 'stock' },
  'screener-etf': { parent: 'screener', tab: 'etf' },
  'screener-options': { parent: 'screener', tab: 'options' },
  'screener-saved': { parent: 'screener', tab: 'saved' },

  // Watchlist
  'watchlist-mylists': { parent: 'watchlist', tab: 'mylists' },
  'watchlist-shared': { parent: 'watchlist', tab: 'shared' },
  'watchlist-alerts': { parent: 'watchlist', tab: 'watchlistAlerts' },

  // Alerts
  'alerts-active': { parent: 'alerts', tab: 'active' },
  'alerts-triggered': { parent: 'alerts', tab: 'triggered' },
  'alerts-price': { parent: 'alerts', tab: 'price' },
  'alerts-volume': { parent: 'alerts', tab: 'volume' },

  // Reports
  'reports-performance': { parent: 'reports', tab: 'performance' },
  'reports-portfolio': { parent: 'reports', tab: 'portfolioRep' },
  'reports-market': { parent: 'reports', tab: 'marketRep' },
  'reports-custom': { parent: 'reports', tab: 'custom' },
  'reports-scheduled': { parent: 'reports', tab: 'scheduled' },
};

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const [commandBarOpen, setCommandBarOpen] = useState(false);

  // Map URL path -> NavId
  function pathToNavId(path: string): NavId {
    const p = path.replace(/^\//, '').split('/')[0] || 'dashboard';
    const map: Record<string, NavId> = {
      'dashboard': 'dashboard', 'market': 'market', 'signals': 'signals',
      'screener': 'screener', 'layers': 'layers', 'portfolio': 'portfolio',
      'watchlist': 'watchlist', 'news': 'news', 'alerts': 'alerts',
      'reports': 'reports', 'settings': 'settings',
    };
    return map[p] ?? 'dashboard';
  }

  // currentPage derived from URL on mount
  const [currentPage, setCurrentPage] = useState<NavId>(() => pathToNavId(location.pathname));

  // Sync URL -> state when URL changes externally (browser back/forward)
  useEffect(() => {
    setCurrentPage(pathToNavId(location.pathname));
  }, [location.pathname]);

  // Cmd+K / Ctrl+K global shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandBarOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // navigateTo: update both state AND URL
  const navigateTo = (id: NavId) => {
    setCurrentPage(id);
    navigate('/' + id);
    setCommandBarOpen(false);
  };

  /* Resolve title — fallback to parent title if sub-page not in map */
  const pageTitle = PAGE_TITLES[currentPage] ?? PAGE_TITLES[getParentNavId(currentPage)] ?? 'SystemOne';

  const pageComponent = () => {
    const subRoute = SUB_PAGE_TABS[currentPage];

    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'market':
        return <Markets />;
      case 'signals':
        return <Signals />;
      case 'news':
        return <News />;
      case 'settings':
        return <Settings />;
      case 'layers':
        return <Layers />;

      /* ---- Screener (placeholder) ---- */
      case 'screener':
      case 'screener-stock':
      case 'screener-etf':
      case 'screener-options':
      case 'screener-saved':
        return <ScreenerPage activeTab={subRoute?.tab ?? 'stock'} />;

      /* ---- Layers ---- */
      case 'layers-all':
      case 'layers-momentum':
      case 'layers-meanreversion':
      case 'layers-optionsflow':
      case 'layers-macro':
        return <Layers preselectLayer={subRoute?.tab ?? 'all'} />;

      /* ---- Portfolio ---- */
      case 'portfolio':
      case 'portfolio-overview':
      case 'portfolio-holdings':
      case 'portfolio-transactions':
      case 'portfolio-pnl':
      case 'portfolio-risk':
        return <Portfolio activeTab={subRoute?.tab ?? 'overview'} />;

      /* ---- Watchlist (placeholder) ---- */
      case 'watchlist':
      case 'watchlist-mylists':
      case 'watchlist-shared':
      case 'watchlist-alerts':
        return <WatchlistPage activeTab={subRoute?.tab ?? 'mylists'} />;

      /* ---- Alerts (placeholder) ---- */
      case 'alerts':
      case 'alerts-active':
      case 'alerts-triggered':
      case 'alerts-price':
      case 'alerts-volume':
        return <AlertsPage activeTab={subRoute?.tab ?? 'active'} />;

      /* ---- Reports (placeholder) ---- */
      case 'reports':
      case 'reports-performance':
      case 'reports-portfolio':
      case 'reports-market':
      case 'reports-custom':
      case 'reports-scheduled':
        return <ReportsPage activeTab={subRoute?.tab ?? 'performance'} />;

      default:
        return <Dashboard />;
    }
  };

  // Auth guard — redirect to login if not authenticated
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <Layout currentPage={currentPage} onNavigate={navigateTo} pageTitle={pageTitle}>
      {pageComponent()}
      {commandBarOpen && (
        <GlobalCommandBar onNavigate={navigateTo} onClose={() => setCommandBarOpen(false)} />
      )}
    </Layout>
  );
}

