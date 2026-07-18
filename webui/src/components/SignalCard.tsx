import {
  TrendingUp, TrendingDown, Clock, Zap, Activity, BarChart2,
} from 'lucide-react';
import type { Signal } from '../types';
import { MiniProjectionChart } from './MiniProjectionChart';

interface SignalCardProps {
  signal: Signal;
  onClick?: () => void;
}

function formatAge(isoString: string | null): string {
  if (!isoString) return '--';
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return mins + 'm';
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + 'h';
  return Math.floor(hrs / 24) + 'd';
}

function formatEta(hours: number | null): string {
  if (hours === null) return '--';
  if (hours < 1) return '<1h';
  if (hours < 24) return hours + 'h';
  return Math.round(hours / 24) + 'd';
}

function regimeLabel(r: Signal['regime']): string {
  switch (r) {
    case 'TRENDING_BULLISH': return 'TRENDING A';
    case 'TRENDING_BEARISH': return 'TRENDING V';
    case 'RANGE_BOUND':      return 'RANGE';
    case 'VOLATILE':        return 'VOLATILE';
    default:                return '—';
  }
}

function regimeColor(r: Signal['regime']): string {
  switch (r) {
    case 'TRENDING_BULLISH': return 'text-emerald-400';
    case 'TRENDING_BEARISH': return 'text-red-400';
    case 'RANGE_BOUND':      return 'text-amber-400';
    case 'VOLATILE':         return 'text-orange-400';
    default:                 return 'text-slate-500';
  }
}

function confidenceColor(score: number | null): string {
  if (score === null) return 'text-slate-400';
  if (score >= 80) return 'text-emerald-400';
  if (score >= 65) return 'text-lime-400';
  if (score >= 50) return 'text-amber-400';
  return 'text-slate-400';
}

function confidenceBg(score: number | null): string {
  if (score === null) return 'bg-slate-600';
  if (score >= 80) return 'bg-emerald-500';
  if (score >= 65) return 'bg-lime-500';
  if (score >= 50) return 'bg-amber-500';
  return 'bg-slate-600';
}

export function SignalCard({ signal, onClick }: SignalCardProps) {
  const isLong    = signal.protocol_type === 'LONG_BUY' || signal.protocol_type === 'LONG_SELL';
  const isBullish = signal.protocol_type === 'LONG_BUY' || signal.protocol_type === 'SHORT_BUY';

  const protocolLabel =
    signal.protocol_type === 'LONG_BUY'   ? 'Long Entry'  :
    signal.protocol_type === 'LONG_SELL'  ? 'Long Exit'   :
    signal.protocol_type === 'SHORT_SELL' ? 'Short Entry' :
                                             'Short Exit';

  const dirColor = isBullish ? 'text-emerald-400' : 'text-red-400';
  const dirBg    = isBullish ? 'bg-emerald-10' : 'bg-red-10';

  return (
    <button
      onClick={onClick}
      className="card card-stretch text-left hover:border-border-active transition-all duration-normal group"
    >
      {/* ── Header ── */}
      <div className="flex items-start justify-between px-4 pt-4 pb-3">
        <div className="flex items-center gap-2.5">
          <div className={'w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ' + dirBg}>
            {isLong
              ? <TrendingUp className={'w-4.5 h-4.5 ' + dirColor} />
              : <TrendingDown className={'w-4.5 h-4.5 ' + dirColor} />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-primary leading-none">
                {signal.symbol}
              </span>
              <span className={'text-xs font-medium ' + dirColor}>
                {protocolLabel}
              </span>
            </div>
            {signal.regime && signal.regime !== 'UNKNOWN' && (
              <span className={'text-xs font-mono ' + regimeColor(signal.regime) + ' opacity-80'}>
                {regimeLabel(signal.regime)}
              </span>
            )}
          </div>
        </div>

        <div className="text-right shrink-0 ml-2">
          <div className={'text-xl font-bold leading-none ' + confidenceColor(signal.confidence_score)}>
            {signal.confidence_score ?? '--'}%
          </div>
          <div className="text-xs text-slate-500 mt-0.5">Confidence</div>
          {(signal as any).xgboost_forecast && (
            <div className="flex items-center justify-end mt-1">
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-10 border border-blue-20">
                <span className="text-xs font-bold text-blue-400">ML</span>
                <span className={'text-xs font-bold ' +
                  (((signal as any).xgboost_forecast.immediate_direction === 'LONG')
                    ? 'text-emerald-400' : 'text-red-400')}>
                  {((signal as any).xgboost_forecast.immediate_direction === 'LONG' ? 'A' : 'V')}
                  {Math.round(((signal as any).xgboost_forecast.immediate_confidence ?? 0))}%
                </span>
              </span>
            </div>
          )}
          <div className="flex items-center justify-end gap-2 mt-1">
            {signal.risk_reward != null && (
              <span className="text-xs font-mono text-slate-500">
                RR <span className="text-slate-300">{signal.risk_reward}</span>
              </span>
            )}
            {signal.eta_hours != null && (
              <span className="text-xs font-mono text-slate-500">
                ETA <span className="text-slate-300">{formatEta(signal.eta_hours)}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Confidence bar ── */}
      <div className="mx-4 h-1 bg-dark-800 rounded-full overflow-hidden">
        <div
          className={'h-full rounded-full transition-all ' + confidenceBg(signal.confidence_score)}
          style={{ width: (signal.confidence_score ?? 0) + '%' }}
        />
      </div>

      {/* ── Trade levels ── */}
      <div className="grid grid-cols-3 gap-px bg-dark-900 mx-4 my-3 rounded-lg overflow-hidden">
        {[
          { label: 'ENTRY',  value: signal.entry_price,    color: 'text-primary' },
          { label: 'STOP',   value: signal.stop_loss,       color: 'text-red-400' },
          { label: 'TARGET', value: signal.take_profit,    color: 'text-emerald-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-card px-3 py-2 text-center">
            <div className="text-xs font-medium text-slate-500 mb-0.5">{label}</div>
            <div className={'text-sm font-bold font-mono ' + color}>
              {value != null ? '$' + value.toFixed(2) : '—'}
            </div>
          </div>
        ))}
      </div>

      {/* ── Projection chart ── */}
      {(signal.projection_dates?.length ?? 0) > 0 && (
        <div className="mx-4 mb-3">
          <div className="text-xs text-slate-500 mb-1 font-medium">
            14-Day Price Projection
          </div>
          <div className="h-14 bg-card rounded-lg overflow-hidden">
            <MiniProjectionChart
              dates={signal.projection_dates ?? []}
              p10={signal.projection_p10 ?? []}
              p50={signal.projection_p50 ?? []}
              p90={signal.projection_p90 ?? []}
              entryPrice={signal.entry_price}
              targetPrice={signal.take_profit}
              stopPrice={signal.stop_loss}
              currentPrice={null}
            />
          </div>
        </div>
      )}

      {/* ── Footer: metrics + 6 layer bars ── */}
      <div className="border-t border-dark-900 px-4 py-2.5">
        <div className="flex items-center justify-between gap-3 text-xs">
          {/* LEFT: metrics */}
          <div className="flex items-center gap-3 text-slate-500">
            {signal.atr != null && (
              <span title="14-day ATR (volatility)">
                <BarChart2 className="w-3 h-3 inline mr-0.5 text-slate-600" />
                <span className="font-mono">ATR </span>
                <span className="text-slate-300 font-mono">{signal.atr.toFixed(2)}</span>
              </span>
            )}
            {signal.volume_surge != null && (
              <span className={
                signal.volume_surge > 20 ? 'text-amber-400' :
                signal.volume_surge > 0  ? 'text-slate-400' : 'text-slate-600'
              }>
                <Activity className="w-3 h-3 inline mr-0.5" />
                <span className="font-mono">
                  {signal.volume_surge > 0 ? '+' : ''}{signal.volume_surge}%
                </span>
              </span>
            )}
            {signal.momentum_delta != null && (
              <span className={
                signal.momentum_delta > 10  ? 'text-emerald-400' :
                signal.momentum_delta < -10 ? 'text-red-400' : 'text-slate-400'
              }>
                <Zap className="w-3 h-3 inline mr-0.5" />
                <span className="font-mono">
                  {signal.momentum_delta > 0 ? '+' : ''}{signal.momentum_delta}
                </span>
              </span>
            )}
            {signal.created_at && (
              <span className="text-slate-600" title="Signal age">
                <Clock className="w-3 h-3 inline mr-0.5" />
                {formatAge(signal.created_at)}
              </span>
            )}
          </div>

          {/* RIGHT: 6 layer bars */}
          <div className="flex flex-col gap-1">
            {signal.layer_scores && Object.entries(signal.layer_scores).map(([key, value]) => {
              const score = typeof value === 'number' ? value : 0;
              const pct   = Math.round(score);
              const strong = pct >= 70;
              const weak   = pct < 40;
              const label  = key.replace(/_/g, ' ').replace(/\w/g, (c: string) => c.toUpperCase());
              const barColor = strong ? 'bg-emerald-500' : weak ? 'bg-red-500' : 'bg-amber-500';
              return (
                <div key={key} className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-mono w-28 truncate">{label}</span>
                  <div className="w-14 h-1 bg-dark-700 rounded-full overflow-hidden">
                    <div className={'h-full rounded-full ' + barColor} style={{ width: pct + '%' }} />
                  </div>
                  <span className="text-xs text-slate-400 font-mono w-7">{pct}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </button>
  );
}
