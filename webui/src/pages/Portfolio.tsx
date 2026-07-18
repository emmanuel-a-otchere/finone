import { useEffect, useState } from 'react';
import {
  Briefcase, TrendingUp, TrendingDown, AlertCircle, RefreshCw, DollarSign,
  Plus, Trash2, Edit2, X, Check, Target, ArrowLeftRight, BarChart3, Shield
} from 'lucide-react';
import { api } from '../lib/api';
import { DriftGauge, calculateDrift } from '../components/portfolio/DriftGauge';
import { TransactionsPanel } from '../components/portfolio/TransactionsPanel';
import { PnlPanel } from '../components/portfolio/PnlPanel';
import { RiskPanel } from '../components/portfolio/RiskPanel';

interface Holding {
  symbol: string; qty: number; avg_cost: number; current_price: number | null;
  current_value: number | null; cost: number; pnl: number | null; pnl_pct: number | null;
  strategy: string; entry_date: string | null; sector: string | null; is_stale: boolean;
}
interface PerformanceSummary {
  total_cost: number; total_value: number; total_pnl: number | null;
  total_pnl_pct: number | null; holding_count: number;
}
interface PortfolioPerformance {
  portfolio_id: string; holdings: Holding[]; summary: PerformanceSummary;
  sector_allocation: { sector: string; value: number; pct: number }[];
  top_winners: { symbol: string; pnl_pct: number; pnl: number }[];
  top_losers: { symbol: string; pnl_pct: number; pnl: number }[];
  as_of: string;
}
interface PortfolioItem {
  id: string; name: string | null; description: string | null; holdings: unknown[];
}

/* ------------------------------------------------------------------ */
/*  Tab definitions                                                    */
/* ------------------------------------------------------------------ */
const TABS = [
  { id: 'overview' as const, label: 'Overview', icon: Briefcase },
  { id: 'holdings' as const, label: 'Holdings', icon: Target },
  { id: 'transactions' as const, label: 'Transactions', icon: ArrowLeftRight },
  { id: 'pnl' as const, label: 'P&L', icon: BarChart3 },
  { id: 'risk' as const, label: 'Risk', icon: Shield },
];

export type PortfolioTab = typeof TABS[number]['id'];

interface PortfolioProps {
  activeTab?: PortfolioTab;
}

export function Portfolio({ activeTab: initialTab = 'overview' }: PortfolioProps) {
  const [activeTab, setActiveTab] = useState<PortfolioTab>(initialTab);
  const [portfolios, setPortfolios] = useState<PortfolioItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [performance, setPerformance] = useState<PortfolioPerformance | null>(null);
  const [loading, setLoading] = useState(true);
  const [perfLoading, setPerfLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  /* Sync tab when prop changes (sub-menu navigation) */
  useEffect(() => { setActiveTab(initialTab); }, [initialTab]);

  useEffect(() => { loadPortfolios(); }, []);
  useEffect(() => { if (selectedId) loadPerformance(selectedId); }, [selectedId]);

  async function loadPortfolios() {
    setLoading(true); setError(null);
    try {
      const data = await api.getPortfolios();
      setPortfolios(data);
      if (data.length > 0 && !selectedId) setSelectedId(data[0].id);
    } catch { setError('Failed to load portfolios'); }
    setLoading(false);
  }

  async function loadPerformance(id: string) {
    setPerfLoading(true); setPerformance(null);
    try { setPerformance(await api.getPortfolioPerformance(id)); } catch { setError('Failed to load performance'); }
    setPerfLoading(false);
  }

  async function handleCreate() {
    if (!newName.trim()) return;
    setCreateLoading(true);
    try {
      const p = await api.createPortfolio(newName.trim(), newDesc.trim());
      setPortfolios(prev => [...prev, p]);
      setSelectedId(p.id);
      setNewName(''); setNewDesc(''); setShowNew(false);
    } catch { setError('Failed to create portfolio'); }
    setCreateLoading(false);
  }

  async function handleDelete(id: string) {
    try { await api.deletePortfolio(id); }
    catch { setError('Failed to delete portfolio'); return; }
    setPortfolios(prev => prev.filter(p => p.id !== id));
    if (selectedId === id) setSelectedId(portfolios.find(p => p.id !== id)?.id ?? null);
    setDeleteConfirm(null);
  }

  async function handleSaveEdit(id: string) {
    try { await api.updatePortfolio(id, { name: editName, description: editDesc }); }
    catch { setError('Failed to update portfolio'); return; }
    setPortfolios(prev => prev.map(p => p.id === id ? { ...p, name: editName, description: editDesc } : p));
    setEditingId(null);
  }

  function startEdit(p: PortfolioItem) {
    setEditingId(p.id); setEditName(p.name || ''); setEditDesc(p.description || '');
  }

  function getStrategyColor(s: string) {
    switch (s) {
      case 'core': return 'bg-primary-500/10 text-primary-400';
      case 'swing': return 'bg-warning-500/10 text-warning-400';
      case 'speculative': return 'bg-danger-500/10 text-danger-400';
      default: return 'bg-slate-500/10 text-slate-400';
    }
  }

  if (loading) return (
    <div className="space-y-6"><h1 className="text-2xl font-bold text-white">Portfolio</h1>
      <div className="h-64 flex items-center justify-center text-slate-500">Loading portfolios...</div>
    </div>
  );

  const totalValue = performance?.summary.total_value ?? 0;
  const totalCost = performance?.summary.total_cost ?? 0;
  const totalPnl = performance?.summary.total_pnl ?? 0;
  const totalPnlPct = performance?.summary.total_pnl_pct ?? 0;

  // Drift calculation
  const driftData = performance && performance.holdings.length > 0
    ? calculateDrift(performance.sector_allocation, totalValue)
    : null;

  /* ---------------------------------------------------------------- */
  /*  Tab content renderers                                            */
  /* ---------------------------------------------------------------- */
  const renderOverview = () => (
    <>
      {/* Summary cards */}
      <div className="bg-dark-900 border border-slate-800 rounded-xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div className="flex items-center gap-2 mb-1"><Briefcase className="w-4 h-4 text-primary-400" /><span className="text-slate-400 text-sm">Total Value</span></div>
            <div className="text-3xl font-bold text-white">${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              {totalPnl > 0 ? <TrendingUp className="w-4 h-4 text-success-400" /> : totalPnl < 0 ? <TrendingDown className="w-4 h-4 text-danger-400" /> : <DollarSign className="w-4 h-4 text-slate-400" />}
              <span className="text-slate-400 text-sm">Total P&L</span>
            </div>
            <div className={`text-3xl font-bold ${totalPnl > 0 ? 'text-success-400' : totalPnl < 0 ? 'text-danger-400' : 'text-slate-400'}`}>
              {totalPnl >= 0 ? '+' : ''}{totalPnl.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              {totalPnlPct !== 0 && <span className="text-base ml-2">({totalPnlPct >= 0 ? '+' : ''}{totalPnlPct.toFixed(2)}%)</span>}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1"><Briefcase className="w-4 h-4 text-slate-500" /><span className="text-slate-400 text-sm">Total Cost</span></div>
            <div className="text-3xl font-bold text-slate-300">${totalCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
          </div>
        </div>
      </div>

      {/* Holdings table */}
      {performance && (
        <div className="bg-dark-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-800">
            <h2 className="text-lg font-semibold text-white">Holdings <span className="text-slate-500 text-sm font-normal">— {performance.summary.holding_count} positions · live Yahoo Finance prices</span></h2>
          </div>
          {performance.holdings.length === 0 ? (
            <div className="p-12 text-center text-slate-500">No holdings yet — add signals from the Signals page.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-dark-800 text-slate-400"><tr>
                  <th className="text-left px-6 py-3 font-medium">Symbol</th><th className="text-left px-6 py-3 font-medium">Sector</th>
                  <th className="text-right px-6 py-3 font-medium">Qty</th><th className="text-right px-6 py-3 font-medium">Avg Cost</th>
                  <th className="text-right px-6 py-3 font-medium">Price</th><th className="text-right px-6 py-3 font-medium">Value</th>
                  <th className="text-right px-6 py-3 font-medium">P&L</th><th className="text-right px-6 py-3 font-medium">P&L %</th>
                  <th className="text-left px-6 py-3 font-medium">Strategy</th><th className="text-left px-6 py-3 font-medium">Entry</th>
                </tr></thead>
                <tbody className="divide-y divide-slate-800">
                  {performance.holdings.map(h => (
                    <tr key={h.symbol} className="hover:bg-dark-800/50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-white">{h.symbol}</td>
                      <td className="px-6 py-4 text-slate-400">{h.sector || '—'}</td>
                      <td className="px-6 py-4 text-right text-slate-300">{h.qty}</td>
                      <td className="px-6 py-4 text-right text-slate-300">${h.avg_cost.toFixed(2)}</td>
                      <td className="px-6 py-4 text-right">{h.current_price != null ? <span className={h.is_stale ? 'text-amber-400' : 'text-white'}>{h.is_stale ? '⚠ ' : ''}${h.current_price.toFixed(2)}</span> : <span className="text-slate-600">—</span>}</td>
                      <td className="px-6 py-4 text-right text-white font-medium">{h.current_value != null ? `$${h.current_value.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—'}</td>
                      <td className="px-6 py-4 text-right">{h.pnl != null ? <span className={h.pnl >= 0 ? 'text-success-400' : 'text-danger-400'}>{h.pnl >= 0 ? '+' : ''}${h.pnl.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span> : <span className="text-slate-600">—</span>}</td>
                      <td className="px-6 py-4 text-right">{h.pnl_pct != null ? <span className={h.pnl_pct >= 0 ? 'text-success-400' : 'text-danger-400'}>{h.pnl_pct >= 0 ? '+' : ''}{h.pnl_pct.toFixed(2)}%</span> : <span className="text-slate-600">—</span>}</td>
                      <td className="px-6 py-4"><span className={`px-2 py-0.5 rounded text-xs font-medium ${getStrategyColor(h.strategy || '')}`}>{h.strategy || '—'}</span></td>
                      <td className="px-6 py-4 text-slate-400">{h.entry_date || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Sector + Winners/Losers + Drift Gauge */}
      {performance && performance.holdings.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="bg-dark-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Sector Allocation</h2>
            <div className="space-y-3">
              {performance.sector_allocation.map(s => (
                <div key={s.sector}>
                  <div className="flex justify-between text-sm mb-1"><span className="text-slate-300">{s.sector}</span><span className="text-slate-400">${s.value.toLocaleString('en-US', { minimumFractionDigits: 0 })} ({s.pct}%)</span></div>
                  <div className="h-2 bg-dark-800 rounded-full overflow-hidden"><div className="h-full bg-primary-500 rounded-full" style={{ width: `${s.pct}%` }} /></div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-dark-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Top Winners</h2>
            {performance.top_winners.length === 0 ? <p className="text-slate-500 text-sm">No winners yet</p> : (
              <div className="space-y-3">
                {performance.top_winners.map(w => (
                  <div key={w.symbol} className="flex justify-between">
                    <span className="text-white font-medium">{w.symbol}</span>
                    <div className="text-right"><div className="text-success-400 text-sm font-medium">+{w.pnl_pct.toFixed(2)}%</div><div className="text-slate-500 text-xs">+${w.pnl.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div></div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="bg-dark-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Top Losers</h2>
            {performance.top_losers.length === 0 ? <p className="text-slate-500 text-sm">No losers</p> : (
              <div className="space-y-3">
                {performance.top_losers.map(l => (
                  <div key={l.symbol} className="flex justify-between">
                    <span className="text-white font-medium">{l.symbol}</span>
                    <div className="text-right"><div className="text-danger-400 text-sm font-medium">{l.pnl_pct.toFixed(2)}%</div><div className="text-slate-500 text-xs">{l.pnl >= 0 ? '+' : ''}${l.pnl.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div></div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {driftData && (
            <DriftGauge maxDrift={driftData.maxDrift} />
          )}
        </div>
      )}

      <div className="text-right text-xs text-slate-600">Prices cached · refreshes every 15 min</div>
    </>
  );

  const renderHoldings = () => (
    <div className="bg-dark-900 border border-slate-800 rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Holdings Detail</h2>
        <span className="text-slate-500 text-sm">{performance?.summary.holding_count ?? 0} positions</span>
      </div>
      {performance?.holdings.length === 0 ? (
        <div className="p-12 text-center text-slate-500">No holdings yet — add signals from the Signals page.</div>
      ) : performance ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-dark-800 text-slate-400"><tr>
              <th className="text-left px-6 py-3 font-medium">Symbol</th><th className="text-left px-6 py-3 font-medium">Sector</th>
              <th className="text-right px-6 py-3 font-medium">Qty</th><th className="text-right px-6 py-3 font-medium">Avg Cost</th>
              <th className="text-right px-6 py-3 font-medium">Price</th><th className="text-right px-6 py-3 font-medium">Value</th>
              <th className="text-right px-6 py-3 font-medium">P&L</th><th className="text-right px-6 py-3 font-medium">P&L %</th>
              <th className="text-left px-6 py-3 font-medium">Strategy</th><th className="text-left px-6 py-3 font-medium">Entry</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-800">
              {performance.holdings.map(h => (
                <tr key={h.symbol} className="hover:bg-dark-800/50 transition-colors">
                  <td className="px-6 py-4 font-semibold text-white">{h.symbol}</td>
                  <td className="px-6 py-4 text-slate-400">{h.sector || '—'}</td>
                  <td className="px-6 py-4 text-right text-slate-300">{h.qty}</td>
                  <td className="px-6 py-4 text-right text-slate-300">${h.avg_cost.toFixed(2)}</td>
                  <td className="px-6 py-4 text-right">{h.current_price != null ? <span className={h.is_stale ? 'text-amber-400' : 'text-white'}>{h.is_stale ? '⚠ ' : ''}${h.current_price.toFixed(2)}</span> : <span className="text-slate-600">—</span>}</td>
                  <td className="px-6 py-4 text-right text-white font-medium">{h.current_value != null ? `$${h.current_value.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—'}</td>
                  <td className="px-6 py-4 text-right">{h.pnl != null ? <span className={h.pnl >= 0 ? 'text-success-400' : 'text-danger-400'}>{h.pnl >= 0 ? '+' : ''}${h.pnl.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span> : <span className="text-slate-600">—</span>}</td>
                  <td className="px-6 py-4 text-right">{h.pnl_pct != null ? <span className={h.pnl_pct >= 0 ? 'text-success-400' : 'text-danger-400'}>{h.pnl_pct >= 0 ? '+' : ''}{h.pnl_pct.toFixed(2)}%</span> : <span className="text-slate-600">—</span>}</td>
                  <td className="px-6 py-4"><span className={`px-2 py-0.5 rounded text-xs font-medium ${getStrategyColor(h.strategy || '')}`}>{h.strategy || '—'}</span></td>
                  <td className="px-6 py-4 text-slate-400">{h.entry_date || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-12 text-center text-slate-500">Select a portfolio to view holdings.</div>
      )}
    </div>
  );

  /* ---------------------------------------------------------------- */
  /*  Main render                                                      */
  /* ---------------------------------------------------------------- */
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-white">Portfolio</h1>
          <select value={selectedId || ''} onChange={e => setSelectedId(e.target.value)}
            className="px-3 py-1.5 bg-dark-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-primary-500">
            {portfolios.map(p => <option key={p.id} value={p.id}>{p.name || 'Unnamed Portfolio'}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          {selectedId && (
            <>
              <button onClick={() => setDeleteConfirm(selectedId)}
                className="p-2 text-slate-400 hover:text-danger-400 hover:bg-danger-400/10 rounded-lg transition-colors" title="Delete portfolio">
                <Trash2 className="w-4 h-4" />
              </button>
              <button onClick={() => startEdit(portfolios.find(p => p.id === selectedId)!)}
                className="p-2 text-slate-400 hover:text-white hover:bg-dark-800 rounded-lg transition-colors" title="Rename portfolio">
                <Edit2 className="w-4 h-4" />
              </button>
            </>
          )}
          <button onClick={() => setShowNew(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg transition-colors text-sm font-medium">
            <Plus className="w-4 h-4" /> New Portfolio
          </button>
          <button onClick={() => selectedId && loadPerformance(selectedId)} disabled={perfLoading}
            className="flex items-center gap-2 px-4 py-2 bg-dark-800 hover:bg-dark-700 text-slate-300 rounded-lg transition-colors text-sm">
            <RefreshCw className={`w-4 h-4 ${perfLoading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {/* Tab bar */}
      {portfolios.length > 0 && (
        <div className="flex items-center gap-1 border-b border-slate-800">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 ${
                  isActive
                    ? 'text-accent-cyan border-accent-cyan'
                    : 'text-slate-400 border-transparent hover:text-slate-200 hover:border-slate-600'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      )}

      {/* New portfolio form */}
      {showNew && (
        <div className="bg-dark-900 border border-slate-800 rounded-xl p-6 space-y-4">
          <h3 className="text-white font-semibold">Create New Portfolio</h3>
          <div className="flex flex-col sm:flex-row gap-3">
            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Portfolio name"
              className="flex-1 px-4 py-2 bg-dark-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-primary-500" />
            <input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Description (optional)"
              className="flex-1 px-4 py-2 bg-dark-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-primary-500" />
            <button onClick={handleCreate} disabled={createLoading}
              className="px-6 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg transition-colors font-medium disabled:opacity-50">
              {createLoading ? 'Creating...' : 'Create'}
            </button>
            <button onClick={() => { setShowNew(false); setNewName(''); setNewDesc(''); }}
              className="p-2 text-slate-400 hover:text-white hover:bg-dark-800 rounded-lg"><X className="w-5 h-5" /></button>
          </div>
        </div>
      )}

      {/* Edit portfolio form */}
      {editingId && (
        <div className="bg-dark-900 border border-slate-800 rounded-xl p-6 space-y-4">
          <h3 className="text-white font-semibold">Rename Portfolio</h3>
          <div className="flex flex-col sm:flex-row gap-3">
            <input value={editName} onChange={e => setEditName(e.target.value)}
              className="flex-1 px-4 py-2 bg-dark-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-primary-500" />
            <input value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder="Description (optional)"
              className="flex-1 px-4 py-2 bg-dark-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-primary-500" />
            <button onClick={() => handleSaveEdit(editingId)}
              className="px-6 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg transition-colors font-medium flex items-center gap-2">
              <Check className="w-4 h-4" /> Save
            </button>
            <button onClick={() => setEditingId(null)}
              className="p-2 text-slate-400 hover:text-white hover:bg-dark-800 rounded-lg"><X className="w-5 h-5" /></button>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteConfirm && (
        <div className="flex items-center gap-3 bg-danger-500/10 border border-danger-500/20 rounded-xl px-4 py-3">
          <AlertCircle className="w-5 h-5 text-danger-400 shrink-0" />
          <span className="text-white text-sm flex-1">Delete this portfolio? This cannot be undone.</span>
          <button onClick={() => handleDelete(deleteConfirm)}
            className="px-4 py-1.5 bg-danger-600 hover:bg-danger-500 text-white rounded-lg text-sm font-medium transition-colors">
            Delete
          </button>
          <button onClick={() => setDeleteConfirm(null)}
            className="px-4 py-1.5 bg-dark-800 hover:bg-dark-700 text-slate-300 rounded-lg text-sm transition-colors">
            Cancel
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-xl px-4 py-3 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />{error}
        </div>
      )}

      {portfolios.length === 0 ? (
        <div className="bg-dark-900 border border-slate-800 rounded-xl p-12 text-center">
          <Briefcase className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">No portfolios yet</h2>
          <p className="text-slate-400 mb-4 max-w-md mx-auto">Generate signals on the Signals page, then use "Add to Portfolio" to create your first portfolio.</p>
          <button onClick={() => setShowNew(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-500 text-white rounded-xl font-medium transition-colors">
            <Plus className="w-5 h-5" /> Create Portfolio
          </button>
        </div>
      ) : (
        <>
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'holdings' && renderHoldings()}
          {activeTab === 'transactions' && <TransactionsPanel selectedId={selectedId} />}
          {activeTab === 'pnl' && <PnlPanel selectedId={selectedId} />}
          {activeTab === 'risk' && <RiskPanel selectedId={selectedId} driftData={driftData} />}
        </>
      )}
    </div>
  );
}
