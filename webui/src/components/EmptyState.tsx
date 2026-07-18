// EmptyState — shared empty-state UI for all dashboard cards
// Icon + one-line message + optional CTA link
// Used by: MarketTrend, HotTakes, SectorPerformance, NewsFeed, Active Signals
interface EmptyStateProps {
  icon?: string;      // emoji or single-char string, default '◌'
  message?: string;    // primary text, default 'No data available'
  action?: string;     // optional CTA link text, e.g. 'Generate signals →'
  actionHref?: string; // optional href; if absent, action renders as plain text
  height?: number | string; // vertical space to fill, default '100%'
  iconSize?: number;   // font-size of icon, default 20
}

export function EmptyState({
  icon = '◌',
  message = 'No data available',
  action,
  actionHref,
  height = '100%',
  iconSize = 20,
}: EmptyStateProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height,
        gap: 6,
        padding: '12px 16px',
      }}
    >
      <span style={{ fontSize: iconSize, color: 'var(--text-muted)', lineHeight: 1 }}>
        {icon}
      </span>
      <p
        style={{
          margin: 0,
          fontSize: 11,
          color: 'var(--text-muted)',
          textAlign: 'center',
          lineHeight: 1.4,
        }}
      >
        {message}
      </p>
      {action && (
        actionHref ? (
          <a
            href={actionHref}
            style={{
              fontSize: 10,
              color: 'var(--accent-cyan)',
              textDecoration: 'none',
              fontWeight: 500,
            }}
          >
            {action}
          </a>
        ) : (
          <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>
            {action}
          </span>
        )
      )}
    </div>
  );
}
