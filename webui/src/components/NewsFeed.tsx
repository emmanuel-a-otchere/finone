// NewsFeed — P1-3: uses EmptyState when no items
import { EmptyState } from './EmptyState';

interface NewsItem {
  id: string;
  headline: string;
  source: string;
  time: string;
  tag: 'BULLISH' | 'BEARISH' | 'MACRO';
  timestamp: string;
}

interface NewsFeedProps {
  items?: NewsItem[];
}

const TAG_COLORS = {
  BULLISH: { bg: 'rgba(34,197,94,0.12)', color: 'var(--green)' },
  BEARISH: { bg: 'rgba(239,68,68,0.12)', color: 'var(--red)' },
  MACRO: { bg: 'rgba(59,130,246,0.12)', color: 'var(--accent-blue)' },
};

export function NewsFeed({ items = [] }: NewsFeedProps) {
  return (
    <div className="card" data-card="news" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="card-head">
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>News &amp; Insights</span>
        <button className="icon-btn" aria-label="Open" style={{ width: 28, height: 28 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 4h6v6"/><path d="M20 4L10 14"/><path d="M20 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5a1 1 0 011-1h5"/>
          </svg>
        </button>
      </div>
      {/* P1-3: if no items, render EmptyState — never a blank card */}
      {items.length === 0 ? (
        <div style={{ flex: 1, minHeight: 0 }}>
          <EmptyState icon="📰" message="No news available" />
        </div>
      ) : (
        <div className="card-body" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 0, padding: 0 }}>
          {items.map((item, i) => {
            const tc = TAG_COLORS[item.tag];
            return (
              <div
                key={item.id}
                style={{
                  padding: '10px 16px',
                  borderBottom: i < items.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                    {item.headline}
                  </span>
                  <span style={{ fontSize: 10, color: 'var(--text-secondary)', flexShrink: 0 }}>{item.time}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, background: tc.bg, color: tc.color, fontWeight: 600 }}>
                    {item.tag}
                  </span>
                  <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{item.source}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <div className="card-footer">
        <a href="#" className="text-2xs" style={{ color: 'var(--accent-cyan)' }}>View All News →</a>
      </div>
    </div>
  );
}
