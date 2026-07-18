// PnlPanel — Portfolio "P&L" tab.
// Extracted from a closure inside Portfolio.tsx that called hooks conditionally
// (rules-of-hooks violation; also crashed on tab switches).
import { useEffect, useState } from 'react';
import { TrendingUp, DollarSign, BarChart3, Target } from 'lucide-react';
import { api } from '../../lib/api';

interface PnlPanelProps {
  selectedId: string | null;
}

export function PnlPanel({ selectedId }: PnlPanelProps) {
  const [summary, setSummary] = useState<any>(null);
  const [pnlLoading, setPnlLoading] = useState(false);

  useEffect(() => {
    loadPnL();
  }, [selectedId]);

  async function loadPnL() {
    setPnlLoading(true);
    try {
      const data = await api.getPositionsSummary();
      setSummary(data);
    } catch { /* ignore */ }
    setPnlLoading(false);
  }

  if (pnlLoading) return (
    <div className="bg-dark-900 border border-slate-800 rounded-xl p-12 text-center text-slate-500">Loading P&L...</div>
  );

  const unrealized = summary?.total_pnl ?? 0;
  const realized = summary?.closed_positions?.reduce((sum: number, p: any) => sum + (p.pnl_realized || 0), 0) ?? 0;
  const winRate = summary?.win_rate ?? 0;
  const expectancy = summary?.expectancy ?? 0;
  const avgWin = summary?.avg_win_pct ?? 0;
  const avgLoss = summary?.avg_loss_pct ?? 0;
  const wins = summary?.win_count ?? 0;
  const losses = summary?.loss_count ?? 0;
  const totalTrades = wins + losses;

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-dark-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-1"><TrendingUp className="w-4 h-4 text-success-400" /><span className="text-slate-400 text-sm">Unrealized P&L</span></div>
          <div className={`text-2xl font-bold ${unrealized >= 0 ? 'text-success-400' : 'text-danger-400'}`}>
            {unrealized >= 0 ? '+' : ''}${unrealized.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-slate-500 mt-1">Open positions</div>
        </div>
        <div className="bg-dark-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-1"><DollarSign className="w-4 h-4 text-primary-400" /><span className="text-slate-400 text-sm">Realized P&L</span></div>
          <div className={`text-2xl font-bold ${realized >= 0 ? 'text-success-400' : 'text-danger-400'}`}>
            {realized >= 0 ? '+' : ''}${realized.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-slate-500 mt-1">Closed positions</div>
        </div>
        <div className="bg-dark-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-1"><BarChart3 className="w-4 h-4 text-accent-cyan" /><span className="text-slate-400 text-sm">Win Rate</span></div>
          <div className="text-2xl font-bold text-white">{winRate.toFixed(1)}%</div>
          <div className="text-xs text-slate-500 mt-1">{wins}W / {losses}L {totalTrades > 0 && `· ${totalTrades} trades`}</div>
        </div>
        <div className="bg-dark-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-1"><Target className="w-4 h-4 text-warning-400" /><span className="text-slate-400 text-sm">Expectancy</span></div>
          <div className={`text-2xl font-bold ${expectancy >= 0 ? 'text-success-400' : 'text-danger-400'}`}>
            {expectancy >= 0 ? '+' : ''}{expectancy.toFixed(2)}%
          </div>
          <div className="text-xs text-slate-500 mt-1">Avg win/loss weighted</div>
        </div>
      </div>

      {/* Avg Win / Avg Loss */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-dark-900 border border-slate-800 rounded-xl p-6">
          <h3 className="text-white font-semibold mb-4">Average Win</h3>
          <div className="text-3xl font-bold text-success-400">+{avgWin.toFixed(2)}%</div>
          <div className="h-2 bg-dark-800 rounded-full mt-3 overflow-hidden">
            <div className="h-full bg-success-500 rounded-full" style={{ width: `${Math.min(avgWin, 100)}%` }} />
          </div>
        </div>
        <div className="bg-dark-900 border border-slate-800 rounded-xl p-6">
          <h3 className="text-white font-semibold mb-4">Average Loss</h3>
          <div className="text-3xl font-bold text-danger-400">{avgLoss.toFixed(2)}%</div>
          <div className="h-2 bg-dark-800 rounded-full mt-3 overflow-hidden">
            <div className="h-full bg-danger-500 rounded-full" style={{ width: `${Math.min(Math.abs(avgLoss), 100)}%` }} />
          </div>
        </div>
      </div>

      {/* Tax lot placeholder */}
      <div className="bg-dark-900 border border-slate-800 rounded-xl p-12 text-center">
        <BarChart3 className="w-12 h-12 text-slate-600 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">Tax Lot Reporting</h2>
        <p className="text-slate-400 mb-4 max-w-md mx-auto">FIFO/LIFO tax lot matching, wash sale detection, and Schedule D export. Coming in v2.6.0.</p>
        <div className="inline-block px-4 py-2 bg-dark-800 rounded-lg text-slate-500 text-sm font-mono">v2.6.0</div>
      </div>
    </div>
  );
}
