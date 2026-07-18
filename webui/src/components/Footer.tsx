// Footer — P1-7: features strip removed to reclaim vertical space
export function Footer() {
  return (
    <footer
      style={{
        height: 28,
        background: 'var(--bg-surface)',
        borderTop: '1px solid var(--border-default)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        zIndex: 'var(--z-base)',
      }}
    >
      <span style={{ fontSize: 10, color: 'var(--text-secondary)', letterSpacing: '0.03em' }}>
        SystemOne Trading Intelligence · {' '}
        <span style={{ color: 'var(--accent-cyan)', cursor: 'pointer' }}>Documentation</span>
        {' '}· Market data may be delayed
      </span>
    </footer>
  );
}
