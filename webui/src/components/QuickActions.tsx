// Quick Actions — spec: New Signal, Portfolio, Hot Symbols buttons
import { Zap, Briefcase, TrendingUp } from 'lucide-react';

interface QuickActionsProps {
  onNewSignal?: () => void;
  onPortfolio?: () => void;
  onHotSymbols?: () => void;
}

export function QuickActions({ onNewSignal, onPortfolio, onHotSymbols }: QuickActionsProps) {
  return (
    <div className="card p-4 flex flex-col gap-3">
      <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
        Quick Actions
      </span>
      <div className="flex flex-col gap-2">
        <button
          onClick={onNewSignal}
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-left transition-all"
          style={{
            background: 'rgba(30,144,255,0.12)',
            border: '1px solid rgba(30,144,255,0.25)',
            color: 'var(--accent-info)',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(30,144,255,0.22)';
            (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 12px rgba(30,144,255,0.3)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(30,144,255,0.12)';
            (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
          }}
        >
          <Zap className="w-4 h-4" />
          New Signal
        </button>

        <button
          onClick={onPortfolio}
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-left transition-all"
          style={{
            background: 'rgba(0,255,127,0.08)',
            border: '1px solid rgba(0,255,127,0.2)',
            color: 'var(--accent-buy)',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,255,127,0.15)';
            (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 12px rgba(0,255,127,0.2)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,255,127,0.08)';
            (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
          }}
        >
          <Briefcase className="w-4 h-4" />
          Portfolio
        </button>

        <button
          onClick={onHotSymbols}
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-left transition-all"
          style={{
            background: 'rgba(255,215,0,0.08)',
            border: '1px solid rgba(255,215,0,0.2)',
            color: 'var(--accent-neutral)',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,215,0,0.15)';
            (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 12px rgba(255,215,0,0.2)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,215,0,0.08)';
            (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
          }}
        >
          <TrendingUp className="w-4 h-4" />
          Hot Symbols
        </button>
      </div>
    </div>
  );
}
