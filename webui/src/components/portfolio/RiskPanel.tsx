// RiskPanel — Portfolio "Risk" tab.
// Extracted from a closure inside Portfolio.tsx that called hooks conditionally
// (rules-of-hooks violation; also crashed on tab switches).
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { DriftGauge, type DriftData } from './DriftGauge';

interface RiskPanelProps {
  selectedId: string | null;
  driftData: DriftData | null;
}

export function RiskPanel({ selectedId, driftData }: RiskPanelProps) {
  const [riskSummary, setRiskSummary] = useState<any>(null);
  const [riskLoading, setRiskLoading] = useState(false);

  useEffect(() => {
    loadRisk();
  }, [selectedId]);

  async function loadRisk() {
    setRiskLoading(true);
    try {
      const data = await api.getPositionsSummary();
      setRiskSummary(data);
    } catch { /* ignore */ }
    setRiskLoading(false);
  }

  if (riskLoading) return (
    <div className="bg-dark-900 border border-slate-800 rounded-xl p-12 text-center text-slate-500">Loading risk metrics...</div>
  );

  const openPositions = riskSummary?.open_positions ?? [];
  const totalValue = riskSummary?.total_value ?? 0;

  // Concentration: top 3 holdings by value
  const concentration = [...openPositions]
    .sort((a: any, b: any) => (b.current_price * b.qty) - (a.current_price * a.qty))
    .slice(0, 3)
    .map((p: any) => ({
      symbol: p.symbol,
      value: (p.current_price || 0) * p.qty,
      pct: totalValue > 0 ? ((p.current_price || 0) * p.qty / totalValue) * 100 : 0,
    }));

  const top3Pct = concentration.reduce((sum: number, c: any) => sum + c.pct, 0);

  return (
    <div className="space-y-6">
      {/* Top row: Drift + Concentration + Key Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {driftData && <DriftGauge maxDrift={driftData.maxDrift} />}
        {!driftData && <div className="bg-dark-900 border border-slate-800 rounded-xl p-6"><h2 className="text-lg font-semibold text-white mb-4">Allocation Drift</h2><p className="text-slate-500">Add holdings to see drift analysis.</p></div>}

        <div className="bg-dark-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Concentration Risk</h2>
          {concentration.length === 0 ? (
            <p className="text-slate-500">No open positions.</p>
          ) : (
            <>
              <div className="text-3xl font-bold text-white mb-2">{top3Pct.toFixed(1)}%</div>
              <div className="text-xs text-slate-500 mb-4">Top 3 holdings by value</div>
              <div className="space-y-3">
                {concentration.map((c: any) => (
                  <div key={c.symbol}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-300">{c.symbol}</span>
                      <span className="text-slate-400">{c.pct.toFixed(1)}%</span>
                    </div>
                    <div className="h-2 bg-dark-800 rounded-full overflow-hidden">
                      <div className="h-full bg-primary-500 rounded-full" style={{ width: `${Math.min(c.pct, 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="bg-dark-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Key Risk Metrics</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-sm">Portfolio Beta (vs SPY)</span>
              <span className="text-slate-500 font-mono text-sm">Calculating...</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-sm">Value at Risk (95%, 1D)</span>
              <span className="text-slate-500 font-mono text-sm">Calculating...</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-sm">Max Drawdown</span>
              <span className="text-slate-500 font-mono text-sm">Calculating...</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-sm">Sharpe Ratio</span>
              <span className="text-slate-500 font-mono text-sm">Calculating...</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-sm">Total Positions</span>
              <span className="text-white font-mono text-sm">{riskSummary?.open_count ?? 0} open · {riskSummary?.closed_count ?? 0} closed</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sector drift detail */}
      {driftData && (
        <div className="bg-dark-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Sector Drift Detail</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {driftData.drifts.map(d => (
              <div key={d.sector} className="bg-dark-800 rounded-lg p-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-300 font-medium">{d.sector}</span>
                  <span className={Math.abs(d.drift) > 8 ? 'text-danger-400' : Math.abs(d.drift) > 3 ? 'text-warning-400' : 'text-success-400'}>
                    {d.drift >= 0 ? '+' : ''}{d.drift.toFixed(1)}%
                  </span>
                </div>
                <div className="h-2 bg-dark-900 rounded-full overflow-hidden mb-2">
                  <div className="h-full rounded-full" style={{
                    width: `${Math.min(Math.abs(d.drift) / 20 * 100, 100)}%`,
                    background: Math.abs(d.drift) > 8 ? 'var(--red)' : Math.abs(d.drift) > 3 ? 'var(--yellow)' : 'var(--green)',
                  }} />
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Target: {d.targetPct}%</span>
                  <span>Actual: {d.actualPct.toFixed(1)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
