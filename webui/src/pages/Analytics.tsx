import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, TrendingDown, Activity, Target, Award, AlertTriangle } from 'lucide-react';
import { api } from '../lib/api';

interface ClosedPosition {
  position_id: number;
  symbol: string;
  direction: string;
  entry_price: number;
  exit_price: number | null;
  qty: number;
  pnl_realized: number | null;
  pnl_realized_pct: number | null;
  closed_at: string | null;
  opened_at: string;
}

interface PortfolioSummary {
  total_value: number;
  total_cost: number;
  total_pnl: number;
  total_pnl_pct: number;
  open_count: number;
  closed_count: number;
  win_count: number;
  loss_count: number;
  breakeven_count: number;
  win_rate: number;
  avg_win_pct: number;
  avg_loss_pct: number;
  expectancy: number;
  largest_win: number;
  largest_loss: number;
  open_positions: any[];
  closed_positions: ClosedPosition[];
}

function fmt(val: number, dec = 2, prefix = ''): string {
  return prefix + (val < 0 ? '-' : '') + '$' + Math.abs(val).toFixed(dec);
}

function fmtPct(val: number): string {
  return (val >= 0 ? '+' : '') + val.toFixed(2) + '%';
}

function KpiCard({ label, value, sub, icon: Icon, accent = 'var(--accent-cyan)' }: {
  label: string; value: string; sub?: string; icon: any; accent?: string;
}) {
  return (
    <div className="card" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-ui)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: accent + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={16} style={{ color: accent }} />
        </div>
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-ui)' }}>{sub}</div>}
    </div>
  );
}

function PositionRow({ p, index }: { p: ClosedPosition; index: number }) {
  const isWin = (p.pnl_realized ?? 0) >= 0;
  const duration = p.closed_at
    ? Math.round((new Date(p.closed_at).getTime() - new Date(p.opened_at).getTime()) / 86400000) + 'd'
    : '--';
  return (
    <tr style={{ borderBottom: '1px solid var(--border-default)', background: index % 2 === 0 ? 'var(--bg-card)' : 'var(--bg-surface)' }}>
      <td style={{ padding: '10px 16px' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>{p.symbol}</span>
      </td>
      <td style={{ padding: '10px 16px' }}>
        <span style={{ fontSize: 12, color: p.direction === 'LONG' ? 'var(--green)' : 'var(--red)', fontWeight: 600, fontFamily: 'var(--font-ui)' }}>{p.direction}</span>
      </td>
      <td style={{ padding: '10px 16px' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>{p.qty}</span>
      </td>
      <td style={{ padding: '10px 16px' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>${p.entry_price.toFixed(2)}</span>
      </td>
      <td style={{ padding: '10px 16px' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>{p.exit_price != null ? '$' + p.exit_price.toFixed(2) : '--'}</span>
      </td>
      <td style={{ padding: '10px 16px' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: isWin ? 'var(--green)' : 'var(--red)' }}>{p.pnl_realized != null ? fmt(p.pnl_realized) : '--'}</span>
      </td>
      <td style={{ padding: '10px 16px' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, color: isWin ? 'var(--green)' : 'var(--red)' }}>{p.pnl_realized_pct != null ? fmtPct(p.pnl_realized_pct) : '--'}</span>
      </td>
      <td style={{ padding: '10px 16px' }}>
        <span style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: 'var(--text-muted)' }}>{duration}</span>
      </td>
    </tr>
  );
}

export function Analytics() {
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'closed' | 'open'>('closed');

  useEffect(() => {
    api.getPositionsSummary()
      .then((data: PortfolioSummary) => { setSummary(data); setLoading(false); })
      .catch(() => { setError('Failed to load analytics data.'); setLoading(false); });
  }, []);

  if (loading) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Activity size={32} style={{ color: 'var(--accent-cyan)', animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (error || !summary) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
      <AlertTriangle size={32} style={{ color: 'var(--red)' }} />
      <p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-ui)' }}>{error || 'No data'}</p>
    </div>
  );

  const wrColor = summary.win_rate >= 55 ? 'var(--green)' : summary.win_rate >= 45 ? 'var(--yellow)' : 'var(--red)';

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        <KpiCard label="Total Value"      value={fmt(summary.total_value)}     sub={`Cost: ${fmt(summary.total_cost)}`}      icon={BarChart3}    accent="var(--accent-cyan)" />
        <KpiCard label="Total P&L"         value={fmt(summary.total_pnl)}       sub={fmtPct(summary.total_pnl_pct)}            icon={summary.total_pnl >= 0 ? TrendingUp : TrendingDown} accent={summary.total_pnl >= 0 ? 'var(--green)' : 'var(--red)'} />
        <KpiCard label="Win Rate"         value={summary.win_rate.toFixed(1) + '%'} sub={`${summary.win_count}W / ${summary.loss_count}L / ${summary.breakeven_count}BE`} icon={Award} accent={wrColor} />
        <KpiCard label="Expectancy"        value={(summary.expectancy >= 0 ? '+' : '') + summary.expectancy.toFixed(4)} sub={`Avg win ${summary.avg_win_pct.toFixed(2)}% / Avg loss ${Math.abs(summary.avg_loss_pct).toFixed(2)}%`} icon={Target} accent={summary.expectancy >= 0 ? 'var(--green)' : 'var(--red)'} />
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
        <KpiCard label="Largest Win" value={summary.largest_win > 0 ? fmt(summary.largest_win) : '--'} icon={TrendingUp} accent="var(--green)" />
        <KpiCard label="Largest Loss" value={summary.largest_loss < 0 ? fmt(summary.largest_loss) : '--'} icon={TrendingDown} accent="var(--red)" />
        <KpiCard label="Open Positions" value={String(summary.open_count)} icon={Activity} accent="var(--chart-sentiment)" />
        <KpiCard label="Closed Trades" value={String(summary.closed_count)} icon={BarChart3} accent="var(--accent-cyan)" />
        <KpiCard label="Avg Win / Loss" value={summary.avg_win_pct > 0 ? (summary.avg_win_pct / Math.abs(summary.avg_loss_pct || 1)).toFixed(2) + 'x' : '--'} icon={Target} accent="var(--yellow)" />
      </div>

      {/* Positions Table */}
      <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Tab bar */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-default)', padding: '0 4px' }}>
          {(['closed', 'open'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{
                padding: '10px 20px', background: 'none', border: 'none', borderBottom: tab === t ? '2px solid var(--accent-cyan)' : '2px solid transparent',
                color: tab === t ? 'var(--accent-cyan)' : 'var(--text-muted)', cursor: 'pointer', fontFamily: 'var(--font-ui)', fontWeight: 600, fontSize: 12, textTransform: 'capitalize', transition: 'color 150ms'
              }}>
              {t} ({t === 'closed' ? summary.closed_count : summary.open_count})
            </button>
          ))}
        </div>

        {/* Table */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-default)', background: 'var(--bg-surface)' }}>
                {['Symbol', 'Dir', 'Qty', 'Entry', 'Exit', 'P&L ($)', 'P&L (%)', 'Duration'].map(h => (
                  <th key={h} style={{ padding: '8px 16px', textAlign: 'left', fontSize: 10, fontFamily: 'var(--font-ui)', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tab === 'closed'
                ? (summary.closed_positions.length === 0
                    ? <tr><td colSpan={8} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-ui)' }}>No closed trades yet.</td></tr>
                    : summary.closed_positions.map((p, i) => <PositionRow key={p.position_id} p={p} index={i} />))
                : (summary.open_positions.length === 0
                    ? <tr><td colSpan={8} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-ui)' }}>No open positions.</td></tr>
                    : summary.open_positions.map((p: any, i: number) => <PositionRow key={p.position_id} p={{ ...p, pnl_realized: p.pnl_unrealized, pnl_realized_pct: p.pnl_unrealized_pct, exit_price: null, closed_at: null }} index={i} />))
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
