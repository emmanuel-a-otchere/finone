import { useEffect, useState } from 'react';
import {
  Plus, RefreshCw, Search, X, BarChart2, TrendingUp, TrendingDown,
  Building2, DollarSign, CheckSquare, Square, Briefcase, AlertCircle,
  GitCompare, Activity, Zap, SlidersHorizontal, ChevronDown, ChevronUp, RotateCcw,
} from 'lucide-react';
import { SignalCard } from '../components/SignalCard';
import { LayerChart } from '../components/LayerChart';
import { ForecastChart } from '../components/ForecastChart';
import { api } from '../lib/api';
import type { Signal } from '../types';

interface SymbolInfo {
  symbol: string; name: string; description: string | null;
  sector: string | null; industry: string | null; market_cap: number | null;
  current_price: number | null; pe_ratio: number | null;
  dividend_yield: string | null; fifty_two_week_high: number | null;
  fifty_two_week_low: number | null; fifty_two_week_range_pct: number | null;
  next_earnings_date: string | null; revenue_growth: string | null;
  earnings_growth: string | null; recommendation: string | null;
  target_price: number | null; exchange: string | null;
}

interface Portfolio {
  id: string; name: string; description: string; holdings: unknown[];
  user_id: string; format_version: string; watchlist: unknown[];
  settings: unknown; last_uploaded: string | null; monitoring_active: boolean;
}

function formatMarketCap(val: number | null): string {
  if (val === null) return '--';
  if (val >= 1e12) return `$${(val / 1e12).toFixed(2)}T`;
  if (val >= 1e9)  return `$${(val / 1e9).toFixed(1)}B`;
  if (val >= 1e6)  return `$${(val / 1e6).toFixed(1)}M`;
  return `$${val.toFixed(0)}`;
}

export function Signals() {
  const [signals, setSignals]               = useState<Signal[]>([]);
  const [loading, setLoading]               = useState(false);
  const [selectedSignal, setSelectedSignal] = useState<Signal | null>(null);
  const [searchSymbol, setSearchSymbol]     = useState('');
  const [signalStatus, setSignalStatus]     = useState<'ALL'|'ACTIVE'|'EXPIRED'>('ACTIVE');
  const [showScreener, setShowScreener]     = useState(false);
  const [filterDirection, setFilterDirection] = useState<'ALL'|'LONG'|'SHORT'>('ALL');
  const [filterProtocol, setFilterProtocol] = useState<'ALL'|'BUY'|'SELL'>('ALL');
  const [filterLayerMin, setFilterLayerMin]  = useState(0);
  const [filterDays, setFilterDays]          = useState(30);
  const [pendingSymbols, setPendingSymbols]  = useState<string[]>([]);
  const [symbolInput, setSymbolInput]        = useState('');
  const [confidenceThreshold, setConfidenceThreshold] = useState(() => {
    try { return JSON.parse(localStorage.getItem('systemone-prefs') ?? '{}').confidenceThreshold ?? 60; }
    catch { return 60; }
  });
  const [analyzing, setAnalyzing]           = useState(false);
  const [error, setError]                   = useState<string | null>(null);
  const [selectedSignalIds, setSelectedSignalIds] = useState<Set<string>>(new Set());
  const [compareSymbol, setCompareSymbol]   = useState<string | null>(null);
  const [showPortfolioModal, setShowPortfolioModal] = useState(false);
  const [portfolios, setPortfolios]          = useState<Portfolio[]>([]);
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string | null>(null);
  const [portfolioQty, setPortfolioQty]      = useState<Record<string, string>>({});
  const [portfolioEntryDate, setPortfolioEntryDate] = useState<Record<string, string>>({});
  const [portfolioStrategy, setPortfolioStrategy]     = useState<Record<string, string>>({});
  const [portfolioLoading, setPortfolioLoading]       = useState(false);
  const [portfolioError, setPortfolioError]           = useState<string | null>(null);
  const [newPortfolioName, setNewPortfolioName]       = useState('');
  const [showNewPortfolio, setShowNewPortfolio]       = useState(false);
  const [addSuccess, setAddSuccess]       = useState<string | null>(null);
  const [symbolInfo, setSymbolInfo]        = useState<SymbolInfo | null>(null);
  const [symbolInfoLoading, setSymbolInfoLoading] = useState(false);
  const [symbolInfoError, setSymbolInfoError]     = useState<string | null>(null);
  const [isXlScreen, setIsXlScreen] = useState(false);
  const token = (() => {
    try { return JSON.parse(localStorage.getItem('systemone-auth') ?? '{}').token; }
    catch { return null; }
  })();

  // Auto-load on mount
  useEffect(() => { loadSignals(); }, []);

  // Screen size listener for split-panel
  useEffect(() => {
    const check = () => setIsXlScreen(window.innerWidth >= 1280);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Debounced reload on filter changes
  useEffect(() => {
    const t = setTimeout(loadSignals, 300);
    return () => clearTimeout(t);
  }, [searchSymbol, confidenceThreshold, signalStatus]);

  // Persist confidence slider
  useEffect(() => {
    try {
      const prefs = JSON.parse(localStorage.getItem('systemone-prefs') ?? '{}');
      prefs.confidenceThreshold = confidenceThreshold;
      localStorage.setItem('systemone-prefs', JSON.stringify(prefs));
    } catch {}
  }, [confidenceThreshold]);

  const loadSignals = async () => {
    setLoading(true); setError(null);
    try {
      const data = await api.getSignals(
        signalStatus !== 'ALL' ? signalStatus : undefined,
        searchSymbol || undefined,
        100,
      );
      setSignals(data);
    } catch (err) {
      console.error('Failed to load signals:', err);
      setError('Failed to load signals');
    }
    setLoading(false);
  };

  const loadSymbolInfo = async (sym: string) => {
    setSymbolInfoLoading(true); setSymbolInfoError(null); setSymbolInfo(null);
    try {
      const info = await api.getSymbolInfo(sym);
      setSymbolInfo(info);
    } catch (err) {
      console.error('Failed to load symbol info:', err);
      setSymbolInfoError('Could not load symbol details');
    }
    setSymbolInfoLoading(false);
  };

  const addSymbols = () => {
    const raw = symbolInput
      .split(/[,\s]+/)
      .map(s => s.trim().toUpperCase())
      .filter(s => s.length > 0 && !pendingSymbols.includes(s));
    setPendingSymbols(prev => [...prev, ...raw]);
    setSymbolInput('');
  };

  const removeSymbol = (sym: string) =>
    setPendingSymbols(prev => prev.filter(s => s !== sym));

  const handleSymbolKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addSymbols(); }
  };

  const handleAnalyze = async () => {
    if (pendingSymbols.length === 0) return;
    setAnalyzing(true); setError(null);
    try {
      await api.generateSignals(pendingSymbols, confidenceThreshold);
      await loadSignals();
      setPendingSymbols([]);
    } catch (err) {
      console.error('Failed to generate signals:', err);
      setError('Failed to generate signals. Check the server.');
    }
    setAnalyzing(false);
  };

  const handleSignalClick = (s: Signal) => {
    setSelectedSignal(s);
    loadSymbolInfo(s.symbol);
  };

  const closeModal = () => {
    setSelectedSignal(null);
    setSymbolInfo(null);
    setSymbolInfoError(null);
  };

  const toggleSignalSelect = (id: string) =>
    setSelectedSignalIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const toggleSelectAll = () =>
    setSelectedSignalIds(prev =>
      prev.size === filteredSignals.length
        ? new Set<string>()
        : new Set<string>(filteredSignals.map(s => s.id))
    );

  const openPortfolioModal = async () => {
    setShowPortfolioModal(true); setPortfolioError(null); setAddSuccess(null);
    setSelectedPortfolioId(null); setShowNewPortfolio(false);
    setNewPortfolioName(''); setPortfolioQty({}); setPortfolioEntryDate({}); setPortfolioStrategy({});
    try {
      const data = await api.getPortfolios();
      setPortfolios(data);
      if (data.length > 0) setSelectedPortfolioId(data[0].id);
    } catch { setPortfolios([]); }
  };

  const closePortfolioModal = () => {
    setShowPortfolioModal(false);
    setAddSuccess(null); setPortfolioError(null);
  };

  const handleAddToPortfolio = async () => {
    if (!selectedPortfolioId && !showNewPortfolio) { setPortfolioError('Please select or create a portfolio.'); return; }
    if (showNewPortfolio && !newPortfolioName.trim()) { setPortfolioError('Portfolio name is required.'); return; }
    setPortfolioLoading(true); setPortfolioError(null);
    try {
      let pid = selectedPortfolioId;
      if (showNewPortfolio) {
        const created = await api.createPortfolio(newPortfolioName.trim(), '');
        pid = created.id;
        setPortfolios(prev => [...prev, created]);
      }
      if (!pid) return;
      const selSigs = signals.filter(s => selectedSignalIds.has(s.id));
      const entries = selSigs.map(s => ({
        symbol: s.symbol,
        qty: parseFloat(portfolioQty[s.symbol] || '100') || 100,
        avg_cost: s.entry_price || 0,
        strategy: portfolioStrategy[s.symbol] || 'swing',
        entry_date: portfolioEntryDate[s.symbol] || undefined,
      }));
      await api.addSignalsToPortfolio(pid, entries);
      setAddSuccess(`Added ${selSigs.length} signal${selSigs.length !== 1 ? 's' : ''} to portfolio.`);
      setSelectedSignalIds(new Set());
      setTimeout(closePortfolioModal, 1500);
    } catch (err) {
      setPortfolioError('Failed to add signals. Please try again.');
      console.error(err);
    } finally {
      setPortfolioLoading(false);
    }
  };

  const filteredSignals = signals.filter(s => {
    if (s.confidence_score === null || s.confidence_score < confidenceThreshold) return false;
    if (filterDirection !== 'ALL') {
      const isLong = s.protocol_type === 'LONG_BUY' || s.protocol_type === 'LONG_SELL';
      if (filterDirection === 'LONG' && !isLong) return false;
      if (filterDirection === 'SHORT' && isLong) return false;
    }
    if (filterProtocol !== 'ALL') {
      const isBuy = s.protocol_type === 'LONG_BUY' || s.protocol_type === 'SHORT_BUY';
      if (filterProtocol === 'BUY' && !isBuy) return false;
      if (filterProtocol === 'SELL' && isBuy) return false;
    }
    if (filterLayerMin > 0) {
      const layers = s.layer_scores;
      if (layers) {
        const vals = Object.values(layers).filter((v: any): v is number => typeof v === 'number');
        const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
        if (avg < filterLayerMin) return false;
      }
    }
    if (filterDays > 0) {
      const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - filterDays);
      if (new Date(s.created_at || 0) < cutoff) return false;
    }
    return true;
  });

  const selectedSignals = signals.filter(s => selectedSignalIds.has(s.id));
  const uniqueSymbols  = Array.from(new Set(signals.map(s => s.symbol))).sort();

  // ── Signal Detail Panel (reused in modal + split view) ──
  const SignalDetailPanel = ({ signal, info, infoLoading, infoError, onClose }: {
    signal: Signal; info: SymbolInfo | null; infoLoading: boolean; infoError: string | null; onClose: () => void;
  }) => (
    <div className="space-y-3 p-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {signal.protocol_type === 'LONG_BUY' || signal.protocol_type === 'LONG_SELL' ? (
            <div className="w-10 h-10 rounded-lg bg-emerald-10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-lg bg-red-10 flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-red-400" />
            </div>
          )}
          <div>
            <h2 className="text-xl font-bold text-primary">{signal.symbol}</h2>
            <span className={`text-sm font-medium ${
              signal.protocol_type === 'LONG_BUY' || signal.protocol_type === 'SHORT_BUY'
                ? 'text-emerald-400' : 'text-red-400'
            }`}>
              {signal.protocol_type === 'LONG_BUY'   ? 'Long Entry'  :
               signal.protocol_type === 'LONG_SELL'  ? 'Long Exit'   :
               signal.protocol_type === 'SHORT_SELL' ? 'Short Entry' : 'Short Exit'}
            </span>
          </div>
        </div>
        <button onClick={onClose} className="p-2 text-slate-400 hover:text-primary transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Price Levels */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Entry',   value: signal.entry_price,    color: 'text-primary' },
          { label: 'Stop',     value: signal.stop_loss,       color: 'text-red-400' },
          { label: 'Target',   value: signal.take_profit,     color: 'text-emerald-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-inset rounded-xl p-4 text-center">
            <div className="text-xs text-slate-500 mb-1">{label}</div>
            <div className={`text-lg font-bold font-mono ${color}`}>
              {value != null ? `$${value.toFixed(2)}` : '--'}
            </div>
          </div>
        ))}
      </div>

      {/* Confidence */}
      <div className="bg-inset rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-slate-400">Confidence Score</span>
          <span className={`text-lg font-bold ${
            (signal.confidence_score ?? 0) >= 80 ? 'text-emerald-400' :
            (signal.confidence_score ?? 0) >= 65 ? 'text-lime-400' :
            (signal.confidence_score ?? 0) >= 50 ? 'text-amber-400' : 'text-slate-400'
          }`}>{signal.confidence_score ?? 0}%</span>
        </div>
        <div className="h-2 bg-inset rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${signal.confidence_score ?? 0}%`,
              background: (signal.confidence_score ?? 0) >= 80 ? 'var(--green)' :
                         (signal.confidence_score ?? 0) >= 65 ? 'var(--yellow)' :
                         (signal.confidence_score ?? 0) >= 50 ? 'var(--accent-cyan)' : 'var(--text-muted)',
            }} />
        </div>
      </div>

      {/* Symbol Overview */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
          <Building2 className="w-4 h-4" /> Symbol Overview
        </h3>
        {infoLoading ? (
          <div className="text-slate-500 text-sm py-4">Loading...</div>
        ) : infoError ? (
          <div className="text-amber-400 text-sm py-4">{infoError}</div>
        ) : info ? (
          <div className="bg-inset rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-white font-semibold">{info.name}</span>
              <span className="text-xs text-slate-400">{info.exchange || '—'}</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-slate-500">Sector:</span> <span className="text-slate-300">{info.sector || '—'}</span></div>
              <div><span className="text-slate-500">Industry:</span> <span className="text-slate-300">{info.industry || '—'}</span></div>
              <div><span className="text-slate-500">Market Cap:</span> <span className="text-slate-300">{formatMarketCap(info.market_cap)}</span></div>
              <div><span className="text-slate-500">P/E Ratio:</span> <span className="text-slate-300">{info.pe_ratio?.toFixed(2) ?? '—'}</span></div>
              <div><span className="text-slate-500">Price:</span> <span className="text-slate-300">${info.current_price?.toFixed(2) ?? '—'}</span></div>
              <div><span className="text-slate-500">52W Range:</span> <span className="text-slate-300">${info.fifty_two_week_low?.toFixed(2) ?? '—'} – ${info.fifty_two_week_high?.toFixed(2) ?? '—'}</span></div>
              <div><span className="text-slate-500">Next Earnings:</span> <span className="text-slate-300">{info.next_earnings_date || '—'}</span></div>
              <div><span className="text-slate-500">Analyst Rec:</span> <span className="text-slate-300">{info.recommendation || '—'}</span></div>
            </div>
          </div>
        ) : (
          <div className="text-slate-500 text-sm py-4">No symbol info available</div>
        )}
      </div>

      {/* Signal Meta */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Risk/Reward', value: signal.risk_reward != null ? `${signal.risk_reward}x` : '--', color: 'text-emerald-400' },
          { label: 'Est. Hold',   value: signal.eta_hours != null ? (signal.eta_hours < 24 ? `${signal.eta_hours}h` : `${Math.round(signal.eta_hours/24)}d`) : '--', color: 'text-slate-300' },
          { label: 'ATR',         value: signal.atr != null ? `$${signal.atr.toFixed(2)}` : '--', color: 'text-slate-300' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-inset rounded-xl p-3 text-center">
            <div className="text-xs text-slate-500 mb-1">{label}</div>
            <div className={`text-sm font-bold font-mono ${color}`}>{value}</div>
          </div>
        ))}
      </div>

      {/* Regime */}
      {signal.regime && signal.regime !== 'UNKNOWN' && (
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium ${
            signal.regime === 'TRENDING_BULLISH' ? 'bg-emerald-10 text-emerald-400 border border-emerald-20' :
            signal.regime === 'TRENDING_BEARISH' ? 'bg-red-10 text-red-400 border border-red-20' :
            signal.regime === 'RANGE_BOUND'     ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
            'bg-slate-500/10 text-slate-400 border border-slate-500/20'
          }`}>
          {signal.regime === 'TRENDING_BULLISH' ? '▲ TRENDING BULL' :
           signal.regime === 'TRENDING_BEARISH' ? '▼ TRENDING BEAR' :
           signal.regime === 'RANGE_BOUND'     ? '◇ RANGE BOUND' : '⚡ VOLATILE'}
        </div>
      )}

      {/* Layer Scores */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
          <Zap className="w-4 h-4" /> Layer Scores
        </h3>
        {signal.layer_scores ? (() => {
          const scores = signal.layer_scores;
          const entries = [
            { key: 'trend_structure',       label: 'Trend Structure',       icon: <TrendingUp className="w-3.5 h-3.5" /> },
            { key: 'momentum_convergence',  label: 'Momentum Convergence', icon: <Activity className="w-3.5 h-3.5" /> },
            { key: 'multi_timeframe',       label: 'Multi-Timeframe',       icon: <BarChart2 className="w-3.5 h-3.5" /> },
            { key: 'institutional_flow',    label: 'Institutional Flow',    icon: <Building2 className="w-3.5 h-3.5" /> },
            { key: 'sentiment_alignment',   label: 'Sentiment Alignment',  icon: <DollarSign className="w-3.5 h-3.5" /> },
            { key: 'intermarket_filter',    label: 'Intermarket Filter',    icon: <GitCompare className="w-3.5 h-3.5" /> },
          ];
          return (
            <div className="space-y-2">
              {entries.map(({ key, label, icon }) => {
                const val = (scores as any)[key] ?? 0;
                return (
                  <div key={key} className="flex items-center gap-3">
                    <span className="text-slate-400 w-6">{icon}</span>
                    <span className="text-sm text-slate-300 w-36">{label}</span>
                    <div className="flex-1 h-2 bg-inset rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{
                        width: `${val}%`,
                        background: val >= 70 ? 'var(--green)' : val >= 50 ? 'var(--accent-cyan)' : 'var(--text-muted)',
                      }} />
                    </div>
                    <span className="text-sm font-mono text-slate-300 w-8 text-right">{val}</span>
                  </div>
                );
              })}
              <div className="pt-2 border-t border-token">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-300">Multi-Timeframe Alignment</span>
                  <span className="text-sm font-mono text-primary">{scores.multi_timeframe ?? 0}/100</span>
                </div>
              </div>
            </div>
          );
        })() : <div className="text-xs text-slate-600">No layer data available</div>}
      </div>

      {/* Price Forecast */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
          <DollarSign className="w-4 h-4" /> Price Forecast
        </h3>
        {token ? (
          <ForecastChart symbol={signal.symbol} token={token} />
        ) : (
          <div className="text-center text-slate-500 py-4">Sign in to view forecast charts</div>
        )}
      </div>

      {/* Layer Analysis */}
      {signal.layer_scores && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
            <BarChart2 className="w-4 h-4" /> Layer Analysis
          </h3>
          <LayerChart scores={signal.layer_scores} />
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-3 p-3">

      {/* ── Page Header ── */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary">Signals</h1>
        <button onClick={loadSignals} disabled={loading}
          className="btn btn-ghost">
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* ── Symbol Input Panel ── */}
      <div className="card p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-slate-500" />
          <span className="text-sm text-slate-400">Add symbols (comma or space separated)</span>
        </div>

        <div className="flex flex-col md:flex-row gap-3">
          <input
            type="text" value={symbolInput}
            onChange={e => setSymbolInput(e.target.value.toUpperCase())}
            onKeyDown={handleSymbolKeyDown}
            placeholder="AAPL, MSFT, TSLA, CVE..."
            className="input flex-1"
          />
          <button onClick={addSymbols} disabled={!symbolInput.trim()}
            className="btn btn-ghost">
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>

        {pendingSymbols.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {pendingSymbols.map(sym => (
              <span key={sym}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary-10 border border-primary-30 text-primary-400 rounded-pill text-sm">
                {sym}
                <button onClick={() => removeSymbol(sym)} className="hover:text-primary-300">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm text-slate-400 flex items-center gap-1.5">
              <BarChart2 className="w-3.5 h-3.5" />
              Min Confidence: <span className="text-primary font-semibold">{confidenceThreshold}</span>
            </label>
          </div>
          <input type="range" min="0" max="100" value={confidenceThreshold}
            onChange={e => setConfidenceThreshold(Number(e.target.value))}
            className="w-full h-2 bg-inset rounded-lg appearance-none cursor-pointer accent-primary-500"
          />
          <div className="flex justify-between text-xs text-slate-500">
            <span>0 (all)</span><span>100 (strict)</span>
          </div>
        </div>

        <button onClick={handleAnalyze}
          disabled={analyzing || pendingSymbols.length === 0}
          className="w-full btn btn-primary justify-center py-3 text-base">
          {analyzing ? (
            <><RefreshCw className="w-4 h-4 animate-spin" />
              Analyzing {pendingSymbols.length} symbol{pendingSymbols.length !== 1 ? 's' : ''}...
            </>
          ) : (
            <><BarChart2 className="w-4 h-4" />
              Analyze{pendingSymbols.length > 0 ? ` ${pendingSymbols.length} symbol${pendingSymbols.length !== 1 ? 's' : ''}` : ''}
            </>
          )}
        </button>

        {error && (
          <div className="text-sm text-amber-400 bg-amber-10 border border-amber-20 rounded-lg px-3 py-2">
            {error}
          </div>
        )}
      </div>

      {/* ── Search & Filter Bar ── */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <Search className="w-4 h-4 text-slate-500 shrink-0" />
          <span className="text-sm text-slate-400 shrink-0">Search existing</span>

          {/* Status pills */}
          <div className="flex gap-1">
            {(['ALL', 'ACTIVE', 'EXPIRED'] as const).map(s => (
              <button key={s} onClick={() => setSignalStatus(s)}
                className={`tab-pill ${signalStatus === s ? 'active' : ''}`}>
                {s.charAt(0) + s.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          <div className="flex-1" />

          {/* Screener toggle */}
          <button onClick={() => setShowScreener(v => !v)}
            className={`btn text-xs ${showScreener ? 'btn-primary' : 'btn-ghost'}`}>
            <SlidersHorizontal className="w-3.5 h-3.5" />
            {showScreener ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            Screener
          </button>

          {/* Compare */}
          <div className="flex items-center gap-2">
            <GitCompare className="w-4 h-4 text-slate-500" />
            <span className="text-sm text-slate-400">Compare</span>
            <select value={compareSymbol || ''}
              onChange={e => setCompareSymbol(e.target.value || null)}
              className="input w-auto py-1.5 text-sm">
              <option value="">Off</option>
              {uniqueSymbols.map(sym => <option key={sym} value={sym}>{sym}</option>)}
            </select>
          </div>
        </div>

        <input type="text" value={searchSymbol}
          onChange={e => setSearchSymbol(e.target.value.toUpperCase())}
          onKeyDown={e => e.key === 'Enter' && loadSignals()}
          placeholder="Filter by symbol..."
          className="input"
        />
      </div>

      {/* ── Advanced Screener ── */}
      {showScreener && (
        <div className="card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Advanced Filters</span>
            <button onClick={() => { setFilterDirection('ALL'); setFilterProtocol('ALL'); setFilterLayerMin(0); setFilterDays(30); }}
              className="btn btn-ghost text-xs">
              <RotateCcw className="w-3 h-3" /> Reset
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">

            {/* Direction */}
            <div>
              <label className="block text-xs text-slate-500 mb-1.5 font-medium">Direction</label>
              <div className="flex gap-1">
                {(['ALL', 'LONG', 'SHORT'] as const).map(d => (
                  <button key={d} onClick={() => setFilterDirection(d)}
                    className={`flex-1 py-1 px-2 rounded text-xs font-medium border transition-colors ${
                      filterDirection === d
                        ? d === 'LONG'  ? 'bg-emerald-15 text-emerald-400 border-emerald-30'
                        : d === 'SHORT' ? 'bg-red-15 text-red-400 border-red-30'
                        : 'bg-slate-500/15 text-slate-300 border-slate-500/30'
                        : 'bg-inset text-slate-500 border-token hover:text-slate-300'
                    }`}>{d}</button>
                ))}
              </div>
            </div>

            {/* Protocol */}
            <div>
              <label className="block text-xs text-slate-500 mb-1.5 font-medium">Protocol</label>
              <div className="flex gap-1">
                {(['ALL', 'BUY', 'SELL'] as const).map(p => (
                  <button key={p} onClick={() => setFilterProtocol(p)}
                    className={`flex-1 py-1 px-2 rounded text-xs font-medium border transition-colors ${
                      filterProtocol === p
                        ? p === 'BUY'  ? 'bg-emerald-15 text-emerald-400 border-emerald-30'
                        : p === 'SELL' ? 'bg-red-15 text-red-400 border-red-30'
                        : 'bg-slate-500/15 text-slate-300 border-slate-500/30'
                        : 'bg-inset text-slate-500 border-token hover:text-slate-300'
                    }`}>{p}</button>
                ))}
              </div>
            </div>

            {/* Layer min */}
            <div>
              <label className="block text-xs text-slate-500 mb-1.5 font-medium">Min Avg Layer</label>
              <div className="flex items-center gap-2">
                <input type="range" min="0" max="100" step="5"
                  value={filterLayerMin}
                  onChange={e => setFilterLayerMin(Number(e.target.value))}
                  className="flex-1 h-1.5 bg-inset rounded-lg appearance-none cursor-pointer accent-primary-500"
                />
                <span className="text-xs font-mono text-slate-300 w-8 text-right">{filterLayerMin}</span>
              </div>
            </div>

            {/* Days */}
            <div>
              <label className="block text-xs text-slate-500 mb-1.5 font-medium">Signals From</label>
              <div className="flex gap-1 flex-wrap">
                {([[7,'7D'],[14,'14D'],[30,'30D'],[90,'90D'],[365,'1Y']] as const).map(([val, label]) => (
                  <button key={val} onClick={() => setFilterDays(val as number)}
                    className={`flex-1 py-1 px-1 rounded text-xs font-medium border transition-colors ${
                      filterDays === val ? 'bg-primary-15 text-primary-400 border-primary-30'
                        : 'bg-inset text-slate-500 border-token hover:text-slate-300'
                    }`}>{label}</button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Bulk Action Bar ── */}
      {selectedSignalIds.size > 0 && (
        <div className="card p-4 flex items-center justify-between gap-4 border-primary-30 bg-primary-5">
          <div className="flex items-center gap-3">
            <button onClick={() => setSelectedSignalIds(new Set())}
              className="text-slate-400 hover:text-primary transition-colors">
              <X className="w-5 h-5" />
            </button>
            <span className="text-primary font-semibold">
              {selectedSignalIds.size} signal{selectedSignalIds.size !== 1 ? 's' : ''} selected
            </span>
          </div>
          <button onClick={openPortfolioModal} className="btn btn-primary">
            <Briefcase className="w-4 h-4" /> Add to Portfolio
          </button>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          MAIN CONTENT AREA — Split Panel on XL, Modal on smaller
      ════════════════════════════════════════════════════════ */}
      {isXlScreen && selectedSignal ? (
        <div className="flex gap-6 items-start">
          {/* LEFT: Signal Grid */}
          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="card p-12 text-center text-slate-500">Loading signals...</div>
            ) : filteredSignals.length > 0 ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm text-slate-400">
                    {signalStatus === 'ALL'
                      ? `Showing ${filteredSignals.length} signal${filteredSignals.length !== 1 ? 's' : ''} (confidence ≥ ${confidenceThreshold})`
                      : `Showing ${filteredSignals.length} ${signalStatus.toLowerCase()} signal${filteredSignals.length !== 1 ? 's' : ''}`}
                  </div>
                  {filteredSignals.length > 1 && (
                    <button onClick={toggleSelectAll}
                      className="btn btn-ghost text-xs">
                      {selectedSignalIds.size === filteredSignals.length
                        ? <><CheckSquare className="w-4 h-4" /> Deselect all</>
                        : <><Square className="w-4 h-4" /> Select all</>}
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredSignals.map(signal => (
                    <div key={signal.id} className={`relative ${selectedSignal?.id === signal.id ? 'ring-2 ring-primary-500 rounded-xl' : ''}`}>
                      <button
                        onClick={e => { e.stopPropagation(); toggleSignalSelect(signal.id); }}
                        className={`absolute top-3 left-3 z-10 transition-opacity ${
                          selectedSignalIds.has(signal.id) ? 'opacity-100 text-primary' : 'opacity-0 group-hover:opacity-60 text-slate-400 hover:text-primary'
                        }`}>
                        {selectedSignalIds.has(signal.id)
                          ? <CheckSquare className="w-5 h-5" />
                          : <Square className="w-5 h-5" />}
                      </button>
                      <SignalCard
                        signal={signal}
                        onClick={() => handleSignalClick(signal)}
                      />
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="card p-12 text-center text-slate-500">
                {signals.length === 0
                  ? 'No signals found. Add symbols and click Analyze to generate signals.'
                  : `No signals match the current filter (min confidence: ${confidenceThreshold}).`}
              </div>
            )}
          </div>

          {/* RIGHT: Detail Panel (sticky) */}
          <div className="w-[420px] shrink-0 sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto">
            <div className="card p-6">
              <SignalDetailPanel
                signal={selectedSignal}
                info={symbolInfo}
                infoLoading={symbolInfoLoading}
                infoError={symbolInfoError}
                onClose={closeModal}
              />
            </div>
          </div>
        </div>
      ) : (
        /* ── Standard layout (non-xl or no selection) ── */
        <>
          {loading ? (
            <div className="card p-12 text-center text-slate-500">Loading signals...</div>
          ) : filteredSignals.length > 0 ? (
            <>
              <div className="flex items-center justify-between">
                <div className="text-sm text-slate-400">
                  {signalStatus === 'ALL'
                    ? `Showing ${filteredSignals.length} signal${filteredSignals.length !== 1 ? 's' : ''} (confidence ≥ ${confidenceThreshold})`
                    : `Showing ${filteredSignals.length} ${signalStatus.toLowerCase()} signal${filteredSignals.length !== 1 ? 's' : ''}`}
                </div>
                {filteredSignals.length > 1 && (
                  <button onClick={toggleSelectAll}
                    className="btn btn-ghost text-xs">
                    {selectedSignalIds.size === filteredSignals.length
                      ? <><CheckSquare className="w-4 h-4" /> Deselect all</>
                      : <><Square className="w-4 h-4" /> Select all</>}
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredSignals.map(signal => (
                  <div key={signal.id} className="relative">
                    <button
                      onClick={e => { e.stopPropagation(); toggleSignalSelect(signal.id); }}
                      className={`absolute top-3 left-3 z-10 transition-opacity ${
                        selectedSignalIds.has(signal.id) ? 'opacity-100 text-primary' : 'opacity-0 group-hover:opacity-60 text-slate-400 hover:text-primary'
                      }`}>
                      {selectedSignalIds.has(signal.id)
                        ? <CheckSquare className="w-5 h-5" />
                        : <Square className="w-5 h-5" />}
                    </button>
                    <SignalCard
                      signal={signal}
                      onClick={() => handleSignalClick(signal)}
                    />
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="card p-12 text-center text-slate-500">
              {signals.length === 0
                ? 'No signals found. Add symbols and click Analyze to generate signals.'
                : `No signals match the current filter (min confidence: ${confidenceThreshold}).`}
            </div>
          )}
        </>
      )}

      {/* ── Side-by-side Compare layout (xl screens) ── */}
      {compareSymbol && filteredSignals.length > 0 && (
        <div className="hidden xl:flex gap-6 h-full" style={{ minHeight: 0 }}>
          {/* LEFT: filtered */}
          <div className="flex-1 space-y-3 overflow-y-auto pr-1" style={{ maxHeight: 'calc(100vh - 240px)' }}>
            <div className="flex items-center justify-between sticky top-0 bg-base pb-2 z-10">
              <span className="text-sm text-slate-400">Showing {filteredSignals.length} signals</span>
              <button onClick={() => setCompareSymbol(null)} className="text-sm text-slate-400 hover:text-primary flex items-center gap-1">
                <X className="w-3.5 h-3.5" /> Close compare
              </button>
            </div>
            <div className="space-y-3">
              {filteredSignals.slice(0, 20).map(s => (
                <SignalCard key={s.id} signal={s} onClick={() => handleSignalClick(s)} />
              ))}
            </div>
          </div>
          <div className="w-px bg-base shrink-0" />
          {/* RIGHT: comparison symbol */}
          <div className="flex-1 space-y-3 overflow-y-auto pr-1" style={{ maxHeight: 'calc(100vh - 240px)' }}>
            <div className="flex items-center justify-between sticky top-0 bg-base pb-2 z-10">
              <span className="text-sm text-primary font-semibold">Comparing {compareSymbol}</span>
              {compareSymbol !== searchSymbol && (
                <button onClick={() => { setSearchSymbol(compareSymbol); loadSignals(); }}
                  className="text-xs text-primary hover:text-primary-300">Set as filter</button>
              )}
            </div>
            <CompareSymbolCards symbol={compareSymbol} onSignalClick={handleSignalClick} />
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          SIGNAL DETAIL MODAL (for non-xl screens)
      ══════════════════════════════════════════════════ */}
      {selectedSignal && !isXlScreen && (
        <div className="fixed inset-0 z-modal flex items-end sm:items-center justify-center p-0 sm:p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-overlay-60 backdrop-blur-sm"
            onClick={closeModal} />

          {/* Panel */}
          <div className="relative w-full sm:max-w-2xl bg-card-token border border-token rounded-t-2xl sm:rounded-2xl shadow-panel overflow-hidden flex flex-col"
            style={{ maxHeight: '85vh' }}>

            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-token shrink-0">
              <div className="flex items-center gap-3">
                {selectedSignal.protocol_type === 'LONG_BUY' || selectedSignal.protocol_type === 'LONG_SELL' ? (
                  <div className="w-10 h-10 rounded-lg bg-emerald-10 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-emerald-400" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-red-10 flex items-center justify-center">
                    <TrendingDown className="w-5 h-5 text-red-400" />
                  </div>
                )}
                <div>
                  <h2 className="text-xl font-bold text-primary">{selectedSignal.symbol}</h2>
                  <span className={`text-sm font-medium ${
                    selectedSignal.protocol_type === 'LONG_BUY' || selectedSignal.protocol_type === 'SHORT_BUY'
                      ? 'text-emerald-400' : 'text-red-400'
                  }`}>
                    {selectedSignal.protocol_type === 'LONG_BUY'   ? 'Long Entry'  :
                     selectedSignal.protocol_type === 'LONG_SELL'  ? 'Long Exit'   :
                     selectedSignal.protocol_type === 'SHORT_SELL' ? 'Short Entry' : 'Short Exit'}
                  </span>
                </div>
              </div>
              <button onClick={closeModal} className="p-2 text-slate-400 hover:text-primary transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto flex-1 p-6 space-y-6">
              <SignalDetailPanel
                signal={selectedSignal}
                info={symbolInfo}
                infoLoading={symbolInfoLoading}
                infoError={symbolInfoError}
                onClose={closeModal}
              />
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          PORTFOLIO ADD MODAL
      ══════════════════════════════════════════════════ */}
      {showPortfolioModal && (
        <div className="fixed inset-0 z-modal flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-overlay-60 backdrop-blur-sm" onClick={closePortfolioModal} />
          <div className="relative w-full sm:max-w-lg bg-card-token border border-token rounded-t-2xl sm:rounded-2xl shadow-panel overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-token">
              <h2 className="text-lg font-bold text-primary flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-primary" /> Add to Portfolio
              </h2>
              <button onClick={closePortfolioModal} className="text-slate-400 hover:text-primary">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              {addSuccess ? (
                <div className="flex items-center gap-3 text-emerald-400 bg-emerald-10 border border-emerald-20 rounded-xl p-4">
                  <CheckSquare className="w-5 h-5 shrink-0" />
                  <span className="font-medium">{addSuccess}</span>
                </div>
              ) : (
                <>
                  {/* Selected signals summary */}
                  <div className="space-y-2">
                    <div className="text-sm text-slate-400">Selected signals</div>
                    <div className="flex flex-wrap gap-2">
                      {selectedSignals.map(s => (
                        <span key={s.id}
                          className="px-3 py-1 bg-inset border border-token rounded-pill text-sm text-primary">
                          {s.symbol} @ ${s.entry_price?.toFixed(2) ?? '--'}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Per-signal config */}
                  <div className="space-y-3">
                    <div className="text-sm text-slate-400">Configure each position</div>
                    {selectedSignals.map(s => (
                      <div key={s.id} className="bg-inset rounded-xl p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-primary">{s.symbol}</span>
                          <span className="text-sm text-slate-500">Entry ${s.entry_price?.toFixed(2) ?? '--'}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="text-xs text-slate-500">Shares</label>
                            <input type="number" value={portfolioQty[s.symbol] || '100'}
                              onChange={e => setPortfolioQty(prev => ({ ...prev, [s.symbol]: e.target.value }))}
                              className="input mt-1 text-sm" min="1" />
                          </div>
                          <div>
                            <label className="text-xs text-slate-500">Entry Date</label>
                            <input type="date" value={portfolioEntryDate[s.symbol] || ''}
                              onChange={e => setPortfolioEntryDate(prev => ({ ...prev, [s.symbol]: e.target.value }))}
                              className="input mt-1 text-sm" />
                          </div>
                          <div>
                            <label className="text-xs text-slate-500">Strategy</label>
                            <select value={portfolioStrategy[s.symbol] || 'swing'}
                              onChange={e => setPortfolioStrategy(prev => ({ ...prev, [s.symbol]: e.target.value }))}
                              className="input mt-1 text-sm">
                              <option value="core">Core</option>
                              <option value="swing">Swing</option>
                              <option value="speculative">Speculative</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Portfolio selector */}
                  {showNewPortfolio ? (
                    <div className="space-y-2">
                      <label className="text-sm text-slate-400">New Portfolio Name</label>
                      <input type="text" value={newPortfolioName}
                        onChange={e => setNewPortfolioName(e.target.value)}
                        placeholder="My Trading Portfolio"
                        className="input" />
                      <button onClick={() => setShowNewPortfolio(false)}
                        className="text-sm text-slate-400 hover:text-primary transition-colors">
                        ← Choose existing portfolio
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <label className="text-sm text-slate-400">Portfolio</label>
                      {portfolios.length > 0 ? (
                        <select value={selectedPortfolioId || ''}
                          onChange={e => setSelectedPortfolioId(e.target.value)}
                          className="input">
                          {portfolios.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.name || 'Unnamed'} ({p.holdings?.length ?? 0} holdings)
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="text-sm text-slate-500">No portfolios found. Create one below.</div>
                      )}
                      <button onClick={() => setShowNewPortfolio(true)}
                        className="text-sm text-primary hover:text-primary-300 transition-colors">
                        + Create new portfolio
                      </button>
                    </div>
                  )}

                  {portfolioError && (
                    <div className="flex items-center gap-2 text-amber-400 bg-amber-10 border border-amber-20 rounded-xl px-3 py-2 text-sm">
                      <AlertCircle className="w-4 h-4 shrink-0" /> {portfolioError}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-3">
                    <button onClick={closePortfolioModal} className="flex-1 btn btn-ghost py-2.5">
                      Cancel
                    </button>
                    <button onClick={handleAddToPortfolio} disabled={portfolioLoading}
                      className="flex-1 btn btn-primary py-2.5 justify-center">
                      {portfolioLoading
                        ? <><RefreshCw className="w-4 h-4 animate-spin" /> Adding...</>
                        : <><Briefcase className="w-4 h-4" /> Add to Portfolio</>}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── CompareSymbolCards ─────────────────────────────────────────────────────────
interface CompareSymbolCardsProps { symbol: string; onSignalClick: (s: Signal) => void; }

function CompareSymbolCards({ symbol, onSignalClick }: CompareSymbolCardsProps) {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!symbol) return;
    setLoading(true);
    api.getSignals(undefined, symbol, 50)
      .then(setSignals).catch(console.error).finally(() => setLoading(false));
  }, [symbol]);

  if (loading) return <div className="text-slate-500 text-sm py-8 text-center">Loading {symbol}...</div>;
  if (signals.length === 0) return <div className="text-slate-500 text-sm py-8 text-center">No signals for {symbol}</div>;

  return (
    <div className="space-y-3 max-h-[calc(100vh-240px)] overflow-y-auto pr-1">
      {signals.map(s => (
        <SignalCard key={s.id} signal={s} onClick={() => onSignalClick(s)} />
      ))}
    </div>
  );
}
