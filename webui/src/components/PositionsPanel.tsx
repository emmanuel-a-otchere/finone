import { useState, useEffect } from 'react';
import { RefreshCw, AlertCircle, X, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { api } from '../lib/api';

// ─── Types ─────────────────────────────────────────────────────────────────

interface Position {
  id: number;
  signal_id: string | null;
  symbol: string;
  direction: string;
  status: string;
  qty: number;
  entry_price: number;
  exit_price: number | null;
  avg_cost: number;
  strategy: string;
  entry_date: string;
  closed_at: string | null;
  current_price: number | null;
  pnl_unrealized: number | null;
  pnl_unrealized_pct: number | null;
  pnl_realized: number | null;
  pnl_realized_pct: number | null;
  is_stale: boolean;
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
  open_positions: Position[];
  closed_positions: Position[];
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function fmt(v: number | null, dec = 2) {
  if (v === null || v === undefined) return '—';
  return v.toFixed(dec);
}

function PnlBadge({ value, pct }: { value: number | null; pct: number | null }) {
  if (value === null) return <span className="text-gray-500">—</span>;
  const color = value > 0 ? 'text-emerald-400' : value < 0 ? 'text-red-400' : 'text-gray-400';
  return (
    <div className={`text-right ${color}`}>
      <div className="text-sm font-mono">{value >= 0 ? '+' : ''}{fmt(value)}</div>
      {pct !== null && <div className="text-xs font-mono opacity-70">{pct >= 0 ? '+' : ''}{fmt(pct)}%</div>}
    </div>
  );
}

function PositionRow({ pos, onClose }: { pos: Position; onClose: (id: number) => void }) {
  const [expanded, setExpanded] = useState(false);
  const isOpen = pos.status === 'OPEN';
  const dirColor = pos.direction === 'LONG' ? 'text-emerald-400' : 'text-red-400';
  const dirBg = pos.direction === 'LONG' ? 'bg-emerald-900/30 border-emerald-800' : 'bg-red-900/30 border-red-800';

  return (
    <div className="border border-slate-700 rounded-lg overflow-hidden bg-slate-800/40">
      <div className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-slate-700/40"
           onClick={() => setExpanded(!expanded)}>
        {/* Symbol + direction */}
        <div className={`w-16 text-center text-xs font-bold rounded border ${dirBg} ${dirColor} py-0.5`}>
          {pos.direction}
        </div>
        <div className="w-20 text-sm font-mono font-bold text-white">{pos.symbol}</div>

        {/* Qty */}
        <div className="w-16 text-xs text-gray-400 text-right">{fmt(pos.qty, 0)} sh</div>

        {/* Entry */}
        <div className="w-20 text-xs text-gray-400 text-right">@{fmt(pos.entry_price)}</div>

        {/* Current / Exit */}
        {isOpen
          ? <div className="w-20 text-xs text-gray-300 text-right">{fmt(pos.current_price)}</div>
          : <div className="w-20 text-xs text-gray-500 text-right">{fmt(pos.exit_price)}</div>}

        {/* P&L */}
        <div className="flex-1"><PnlBadge value={isOpen ? pos.pnl_unrealized : pos.pnl_realized} pct={isOpen ? pos.pnl_unrealized_pct : pos.pnl_realized_pct} /></div>

        {/* Stale indicator */}
        {pos.is_stale && <span className="text-xs text-amber-500" title="Price may be stale">⚠</span>}

        {/* Actions */}
        <div className="flex items-center gap-1">
          {isOpen && <button onClick={e => { e.stopPropagation(); onClose(pos.id); }}
            className="text-xs px-2 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-gray-300 border border-slate-600"
            title="Close position">Close</button>}
          {expanded ? <ChevronUp size={12} className="text-gray-500"/> : <ChevronDown size={12} className="text-gray-500"/>}
        </div>
      </div>

      {expanded && (
        <div className="px-3 py-2 bg-slate-900/50 border-t border-slate-800 grid grid-cols-4 gap-2 text-xs">
          <div><span className="text-gray-500">Strategy</span><div className="text-gray-300">{pos.strategy || '—'}</div></div>
          <div><span className="text-gray-500">Entry date</span><div className="text-gray-300">{pos.entry_date ? pos.entry_date.slice(0, 10) : '—'}</div></div>
          <div><span className="text-gray-500">Signal ID</span><div className="text-gray-300 font-mono text-xs">{pos.signal_id?.slice(0, 8) || '—'}…</div></div>
          <div><span className="text-gray-500">Avg cost</span><div className="text-gray-300">${fmt(pos.avg_cost)}</div></div>
          {pos.closed_at && <div><span className="text-gray-500">Closed</span><div className="text-gray-300">{pos.closed_at.slice(0, 10)}</div></div>}
        </div>
      )}
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────

export function PositionsPanel() {
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [openTab, setOpenTab] = useState<'open' | 'closed'>('open');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [closingId, setClosingId] = useState<number | null>(null);
  const [closePrice, setClosePrice] = useState('');
  const [closeConfirm, setCloseConfirm] = useState<number | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true); setError(null);
    try {
      const data = await api.getPositionsSummary();
      setSummary(data);
    } catch { setError('Failed to load positions'); }
    setLoading(false);
  }

  async function handleClose(positionId: number) {
    if (!closePrice) return;
    setClosingId(positionId);
    try {
      await api.closePosition(positionId, parseFloat(closePrice));
      setClosePrice('');
      setCloseConfirm(null);
      await load();
    } catch { setError('Failed to close position'); }
    setClosingId(null);
  }

  if (loading) return (
    <div className="flex items-center justify-center h-40 text-gray-400">
      <RefreshCw className="animate-spin mr-2" size={16} /> Loading positions…
    </div>
  );
  if (error) return (
    <div className="flex items-center gap-2 text-red-400 text-sm"><AlertCircle size={14}/>{error}</div>
  );
  if (!summary) return null;

  const openPos = summary.open_positions || [];
  const closedPos = (summary.closed_positions || []).slice(0, 20);

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="grid grid-cols-6 gap-3">
        <div className="bg-slate-800 rounded p-3 border border-slate-700">
          <div className="text-xs text-gray-400">Open Positions</div>
          <div className="text-lg font-mono text-white">{summary.open_count}</div>
        </div>
        <div className="bg-slate-800 rounded p-3 border border-slate-700">
          <div className="text-xs text-gray-400">Unrealized P&L</div>
          <div className={`text-lg font-mono ${(summary.total_pnl || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {summary.total_pnl >= 0 ? '+' : ''}{fmt(summary.total_pnl)}
          </div>
        </div>
        <div className="bg-slate-800 rounded p-3 border border-slate-700">
          <div className="text-xs text-gray-400">Win Rate</div>
          <div className="text-lg font-mono text-white">{fmt(summary.win_rate)}%</div>
        </div>
        <div className="bg-slate-800 rounded p-3 border border-slate-700">
          <div className="text-xs text-gray-400">Avg Win / Loss</div>
          <div className="text-sm font-mono">
            <span className="text-emerald-400">+{fmt(summary.avg_win_pct)}%</span>
            <span className="text-gray-600 mx-1">/</span>
            <span className="text-red-400">-{fmt(summary.avg_loss_pct)}%</span>
          </div>
        </div>
        <div className="bg-slate-800 rounded p-3 border border-slate-700">
          <div className="text-xs text-gray-400">Expectancy</div>
          <div className={`text-lg font-mono ${(summary.expectancy || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {fmt(summary.expectancy, 4)}
          </div>
        </div>
        <div className="bg-slate-800 rounded p-3 border border-slate-700">
          <div className="text-xs text-gray-400">Best / Worst</div>
          <div className="text-xs font-mono">
            <span className="text-emerald-400">+{fmt(summary.largest_win)}</span>
            <span className="text-gray-600 mx-0.5">/</span>
            <span className="text-red-400">{fmt(summary.largest_loss)}</span>
          </div>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex items-center gap-1 border-b border-slate-700">
        <button onClick={() => setOpenTab('open')}
          className={`px-4 py-2 text-sm border-b-2 -mb-px transition ${openTab === 'open' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>
          Open ({openPos.length})
        </button>
        <button onClick={() => setOpenTab('closed')}
          className={`px-4 py-2 text-sm border-b-2 -mb-px transition ${openTab === 'closed' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>
          Closed ({summary.closed_count})
        </button>
        <div className="flex-1"/>
        <button onClick={load} className="flex items-center gap-1 text-xs text-gray-500 hover:text-white px-2 py-1 rounded hover:bg-slate-700 transition">
          <RefreshCw size={11}/> Refresh
        </button>
      </div>

      {/* Close position modal */}
      {closeConfirm !== null && (
        <div className="bg-slate-800 border border-slate-600 rounded p-3 flex items-center gap-3">
          <span className="text-sm text-gray-300">Exit price for {openPos.find(p => p.id === closeConfirm)?.symbol}:</span>
          <input type="number" step="0.01" placeholder="0.00" value={closePrice}
            onChange={e => setClosePrice(e.target.value)}
            className="w-28 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm text-white font-mono"/>
          <button onClick={() => handleClose(closeConfirm)} disabled={!closePrice || closingId !== null}
            className="flex items-center gap-1 text-xs px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white transition">
            {closingId === closeConfirm ? <RefreshCw size={11} className="animate-spin"/> : <Check size={11}/>} Confirm
          </button>
          <button onClick={() => { setCloseConfirm(null); setClosePrice(''); }}
            className="flex items-center gap-1 text-xs px-2 py-1 rounded text-gray-400 hover:text-white hover:bg-slate-700 transition">
            <X size={11}/> Cancel
          </button>
        </div>
      )}

      {/* Position list */}
      <div className="space-y-1">
        {(openTab === 'open' ? openPos : closedPos).length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">
            {openTab === 'open' ? 'No open positions — add signals from the Signals page' : 'No closed positions yet'}
          </div>
        ) : (
          (openTab === 'open' ? openPos : closedPos).map(pos => (
            <PositionRow key={pos.id} pos={pos}
              onClose={id => { setCloseConfirm(id); setClosePrice(pos.current_price?.toString() || ''); }} />
          ))
        )}
      </div>
    </div>
  );
}
