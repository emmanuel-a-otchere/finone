// HotSymbols — P1-4: tabs disabled when no signals exist
// P1-3: empty state uses the shared EmptyState pattern (icon + message), like all other cards
import { useState } from 'react';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { EmptyState } from './EmptyState';
import type { Signal } from '../types';

interface HotSymbolsProps {
  signals: Signal[];
}

type Tab = 'gainers' | 'losers' | 'active';

export function HotSymbols({ signals }: HotSymbolsProps) {
  const [tab, setTab] = useState<Tab>('gainers');

  const totalFiltered = signals.filter(s => s.symbol && s.confidence_score != null);
  const hasSignals = totalFiltered.length > 0;

  const sorted = totalFiltered
    .sort((a, b) => {
      const aConf = a.confidence_score ?? 0;
      const bConf = b.confidence_score ?? 0;
      if (tab === 'gainers') return bConf - aConf;
      if (tab === 'losers') return aConf - bConf;
      return 0;
    });

  const tabList: Tab[] = ['gainers', 'losers', 'active'];

  return (
    <div className="card" data-card="table" style={{ height: '100%', minHeight: 0, overflow: 'hidden' }}>
      <div className="card-head">
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
          Market Movers
          {hasSignals && <span style={{ color: 'var(--accent-cyan)', marginLeft: 6, fontSize: 10 }}>({totalFiltered.length})</span>}
        </span>
        {/* P1-4: buttons disabled when no signals */}
        <div className="flex gap-1">
          {tabList.map(t => (
            <button
              key={t}
              onClick={() => hasSignals && setTab(t)}
              disabled={!hasSignals}
              style={{
                background: tab === t ? 'var(--bg-card)' : 'transparent',
                color: hasSignals
                  ? (tab === t ? 'var(--text-primary)' : 'var(--text-secondary)')
                  : 'var(--text-muted)',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                padding: '2px 6px',
                fontSize: 10,
                cursor: hasSignals ? 'pointer' : 'not-allowed',
                opacity: hasSignals ? 1 : 0.5,
              }}
            >
              {t === 'gainers' ? 'Top Gainers' : t === 'losers' ? 'Top Losers' : 'Most Active'}
            </button>
          ))}
        </div>
      </div>
      <div className="card-body" style={{ overflow: 'hidden' }}>
        {!hasSignals ? (
          <EmptyState icon="⚡" message="No active signals — generate signals on the Signals page" />
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 2fr 1.8fr 1.8fr', gap: 8, padding: '0 16px 6px', borderBottom: '1px solid var(--border-subtle)' }}>
              <span className="text-2xs uppercase" style={{ color: 'var(--text-secondary)' }}>Symbol</span>
              <span className="text-2xs uppercase text-right" style={{ color: 'var(--text-secondary)' }}>Price</span>
              <span className="text-2xs uppercase text-right" style={{ color: 'var(--text-secondary)' }}>% Chg</span>
              <span className="text-2xs uppercase text-right" style={{ color: 'var(--text-secondary)' }}>Conf</span>
            </div>
            {sorted.map(s => {
              const conf = s.confidence_score ?? 0;
              const isGain = s.protocol_type === 'LONG_BUY' || s.protocol_type === 'SHORT_BUY';
              const Icon = tab === 'gainers' ? TrendingUp : tab === 'losers' ? TrendingDown : Activity;
              const entryStr = s.entry_price != null ? `$${s.entry_price.toFixed(2)}` : '--';
              return (
                <div
                  key={s.id}
                  style={{ display: 'grid', gridTemplateColumns: '1.8fr 2fr 1.8fr 1.8fr', gap: 8, padding: '5px 16px', borderBottom: '1px solid var(--border-subtle)', alignItems: 'center' }}
                >
                  <div className="flex items-center gap-2">
                    <Icon className={`w-3 h-3 ${isGain ? 'text-[var(--green)]' : 'text-[var(--red)]'}`} />
                    <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{s.symbol}</span>
                  </div>
                  <span className="text-sm text-right numeric" style={{ color: 'var(--text-secondary)' }}>{entryStr}</span>
                  <span className={`text-sm text-right ${isGain ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
                    {isGain ? '+' : ''}{conf}
                  </span>
                  <span className="text-sm text-right" style={{ color: conf >= 65 ? 'var(--green)' : conf >= 50 ? 'var(--yellow)' : 'var(--text-secondary)' }}>
                    {conf}%
                  </span>
                </div>
              );
            })}
          </>
        )}
      </div>
      <div className="card-footer">
        <a href="#" className="text-2xs" style={{ color: 'var(--accent-cyan)' }}>View All Movers →</a>
      </div>
    </div>
  );
}
