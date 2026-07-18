import { NavId } from '../NavId';

interface PlaceholderPageProps {
  title: string;
  icon: string;
  description: string;
  pageId: NavId;
}

export function PlaceholderPage({ title, icon, description }: PlaceholderPageProps) {
  return (
    <div style={{ padding: 40, maxWidth: 600, margin: '0 auto', textAlign: 'center' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>{icon}</div>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12, fontFamily: 'var(--font-display)' }}>
        {title}
      </h1>
      <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 24 }}>
        {description}
      </p>
      <div
        style={{
          padding: '16px 24px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-lg)',
          color: 'var(--text-muted)',
          fontSize: 12,
          fontFamily: 'var(--font-mono)',
        }}
      >
        Coming in v2.6.0
      </div>
    </div>
  );
}
