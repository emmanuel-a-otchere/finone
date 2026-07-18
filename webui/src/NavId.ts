// Shared navigation ID type
// Main pages + sub-page identifiers for menu routing

export type NavId =
  // Main pages (no sub-menu)
  | 'dashboard'
  | 'market'
  | 'signals'
  | 'news'
  | 'settings'
  // Screener sub-pages
  | 'screener'
  | 'screener-stock'
  | 'screener-etf'
  | 'screener-options'
  | 'screener-saved'
  // Layers sub-pages
  | 'layers'
  | 'layers-all'
  | 'layers-momentum'
  | 'layers-meanreversion'
  | 'layers-optionsflow'
  | 'layers-macro'
  // Portfolio sub-pages
  | 'portfolio'
  | 'portfolio-overview'
  | 'portfolio-holdings'
  | 'portfolio-transactions'
  | 'portfolio-pnl'
  | 'portfolio-risk'
  // Watchlist sub-pages
  | 'watchlist'
  | 'watchlist-mylists'
  | 'watchlist-shared'
  | 'watchlist-alerts'
  // Alerts sub-pages
  | 'alerts'
  | 'alerts-active'
  | 'alerts-triggered'
  | 'alerts-price'
  | 'alerts-volume'
  // Reports sub-pages
  | 'reports'
  | 'reports-performance'
  | 'reports-portfolio'
  | 'reports-market'
  | 'reports-custom'
  | 'reports-scheduled'
  // Mobile overflow
  | 'more';

// Map any sub-page NavId back to its parent main NavId
export function getParentNavId(navId: NavId): NavId {
  if (navId.startsWith('screener-')) return 'screener';
  if (navId.startsWith('layers-')) return 'layers';
  if (navId.startsWith('portfolio-')) return 'portfolio';
  if (navId.startsWith('watchlist-')) return 'watchlist';
  if (navId.startsWith('alerts-')) return 'alerts';
  if (navId.startsWith('reports-')) return 'reports';
  return navId;
}

// Check if a NavId belongs to a given parent menu
export function isUnderParent(navId: NavId, parent: NavId): boolean {
  return getParentNavId(navId) === parent;
}
