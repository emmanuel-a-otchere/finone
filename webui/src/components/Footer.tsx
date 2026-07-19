// Footer — 34px capability badge bar (mockup bottom strip)
import { Activity, Sparkles, Layers, LineChart, ShieldCheck, type LucideIcon } from 'lucide-react';

interface Badge {
  icon: LucideIcon;
  label: string;
}

const BADGES: Badge[] = [
  { icon: Activity, label: 'Real-time Data' },
  { icon: Sparkles, label: 'AI-Powered Signals' },
  { icon: Layers, label: 'Multi-Asset Coverage' },
  { icon: LineChart, label: 'Backtested Strategies' },
  { icon: ShieldCheck, label: 'Secure & Private' },
];

export function Footer() {
  return (
    <footer
      className="footer-badges"
      style={{
        height: 34,
        background: 'var(--bg-surface)',
        borderTop: '1px solid var(--border-default)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        flexShrink: 0,
        zIndex: 'var(--z-base)',
        overflow: 'hidden',
      }}
    >
      {BADGES.map(b => (
        <span
          key={b.label}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            fontSize: 10,
            fontWeight: 500,
            color: 'var(--text-secondary)',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-pill)',
            padding: '3px 10px',
            whiteSpace: 'nowrap',
          }}
        >
          <b.icon size={11} color="var(--accent-cyan)" strokeWidth={2} />
          {b.label}
        </span>
      ))}
    </footer>
  );
}
