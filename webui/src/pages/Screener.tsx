import { useEffect, useState, useCallback } from 'react';
import {
  Filter, TrendingUp, TrendingDown, Activity, BarChart3,
  ArrowUpDown, ChevronDown, ChevronUp, X, Zap, BookmarkPlus
} from 'lucide-react';
import { api } from '../lib/api';

interface ScreenerStock {
  symbol: string;
  name: string;
  price: number;
  change_pct: number;
  volume: number;
  avg_volume: number;
  vol_ratio: number;
  market_cap_fmt: string;
  pe_ratio: number | null;
  sector: string;
  industry: string;
  fifty_two_week_high: number;
  fifty_two_week_low: number;
  range_pct: number;
  beta: number | null;
  dividend_yield: number | null;
  recommendation: string;
  rsi_14: number | null;
  ema_20: number | null;
  ema_50: number | null;
  trend: string;
  hotness: number;
}

interface Filters {
  min_price: string;
  max_price: string;
  min_change: string;
  max_change: string;
  min_volume: string;
  min_vol_ratio: string;
  sector: string;
  min_market_cap: string;
  max_pe: string;
  min_rsi: string;
  max_rsi: string;
  trend: string;
  min_hotness: string;
  recommendation: string;
}

const SECTORS = ['Technology', 'Financial Services', 'Healthcare', 'Energy', 'Consumer Cyclical', 'Industrials', 'Communication Services', 'Consumer Defensive', 'Utilities', 'Real Estate', 'Basic Materials'];
const TRENDS = [
  { value: '', label: 'Any' },
  { value: 'ABOVE_BOTH', label: 'Above EMA 20 & 50' },
  { value: 'ABOVE_EMA20', label: 'Above EMA 20' },
  { value: 'ABOVE_EMA50', label: 'Above EMA 50' },
  { value: 'BELOW_BOTH', label: 'Below Both EMAs' },
];
const RECS = ['Strong Buy', 'Buy', 'Hold', 'Sell', 'Strong Sell'];

export default function ScreenerPage({ activeTab = 'stock' }: { activeTab?: string }) {
  const [stocks, setStocks] = useState<ScreenerStock[]>([]);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState('hotness');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    min_price: '', max_price: '', min_change: '', max_change: '',
    min_volume: '', min_vol_ratio: '', sector: '', min_market_cap: '',
    max_pe: '', min_rsi: '', max_rsi: '', trend: '', min_hotness: '', recommendation: ''
  });

  const buildQuery = useCallback(() => {
    const params = new URLSearchParams();
    params.set('sort_by', sortBy);
    params.set('sort_dir', sortDir);
    params.set('limit', '50');
    Object.entries(filters).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });
    return params.toString();
  }, [filters, sortBy, sortDir]);

  const fetchScreener = useCallback(async () => {
    setLoading(true);
    try {
      const qs = buildQuery();
      const data = await api.getScreenerStocks(qs);
      setStocks(data.results || []);
    } catch (e) {
      console.error('Screener fetch failed:', e);
      setStocks([]);
    } finally {
      setLoading(false);
    }
  }, [buildQuery]);

  useEffect(() => {
    fetchScreener();
  }, [fetchScreener]);

  const handleSort = (col: string) => {
    if (sortBy === col) {
      setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(col);
      setSortDir('desc');
    }
  };

  const clearFilters = () => setFilters({
    min_price: '', max_price: '', min_change: '', max_change: '',
    min_volume: '', min_vol_ratio: '', sector: '', min_market_cap: '',
    max_pe: '', min_rsi: '', max_rsi: '', trend: '', min_hotness: '', recommendation: ''
  });

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  const SortIcon = ({ col }: { col: string }) => {
    if (sortBy !== col) return <ArrowUpDown className="w-3 h-3 opacity-30" />;
    return sortDir === 'desc' ? <ChevronDown className="w-3 h-3 text-cyan-400" /> : <ChevronUp className="w-3 h-3 text-cyan-400" />;
  };

  return (
    <div className="p-3 space-y-3" style={{ height: '100%', overflow: 'auto' }}>
      {/* Non-stock tabs (etf/options/saved) are routed here but not yet implemented */}
      {activeTab !== 'stock' && (
        <div className="text-xs px-3 py-2 rounded" style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}>
          The {activeTab} screener is coming soon — showing the stock screener for now.
        </div>
      )}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-5 h-5 text-cyan-400" />
          <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Stock Screener</h1>
          {loading && <Activity className="w-4 h-4 animate-spin text-cyan-400" />}
        </div>
        <div className="flex items-center gap-2">
          {activeFilterCount > 0 && (
            <button onClick={clearFilters} className="text-xs flex items-center gap-1 px-2 py-1 rounded" style={{ background: 'var(--bg-card)', color: 'var(--red)' }}>
              <X className="w-3 h-3" /> {activeFilterCount} filters
            </button>
          )}
          <button
            onClick={() => setShowFilters(s => !s)}
            className="text-xs flex items-center gap-1 px-3 py-1.5 rounded font-medium"
            style={{ background: showFilters ? 'var(--accent-cyan)' : 'var(--bg-card)', color: showFilters ? '#000' : 'var(--text-primary)' }}
          >
            <Filter className="w-3 h-3" /> Filters
          </button>
          <button
            onClick={fetchScreener}
            className="text-xs flex items-center gap-1 px-3 py-1.5 rounded font-medium"
            style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}
          >
            <Zap className="w-3 h-3" /> Refresh
          </button>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="card p-3 space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
            <FilterInput label="Min Price" value={filters.min_price} onChange={v => setFilters(f => ({ ...f, min_price: v }))} placeholder="0" />
            <FilterInput label="Max Price" value={filters.max_price} onChange={v => setFilters(f => ({ ...f, max_price: v }))} placeholder="∞" />
            <FilterInput label="Min Change %" value={filters.min_change} onChange={v => setFilters(f => ({ ...f, min_change: v }))} placeholder="-100" />
            <FilterInput label="Max Change %" value={filters.max_change} onChange={v => setFilters(f => ({ ...f, max_change: v }))} placeholder="+100" />
            <FilterInput label="Min Volume" value={filters.min_volume} onChange={v => setFilters(f => ({ ...f, min_volume: v }))} placeholder="0" />
            <FilterInput label="Min Vol Ratio" value={filters.min_vol_ratio} onChange={v => setFilters(f => ({ ...f, min_vol_ratio: v }))} placeholder="1.0" />
            <FilterSelect label="Sector" value={filters.sector} onChange={v => setFilters(f => ({ ...f, sector: v }))} options={['', ...SECTORS]} />
            <FilterInput label="Min Market Cap ($B)" value={filters.min_market_cap} onChange={v => setFilters(f => ({ ...f, min_market_cap: v }))} placeholder="0" />
            <FilterInput label="Max P/E" value={filters.max_pe} onChange={v => setFilters(f => ({ ...f, max_pe: v }))} placeholder="∞" />
            <FilterInput label="Min RSI" value={filters.min_rsi} onChange={v => setFilters(f => ({ ...f, min_rsi: v }))} placeholder="0" />
            <FilterInput label="Max RSI" value={filters.max_rsi} onChange={v => setFilters(f => ({ ...f, max_rsi: v }))} placeholder="100" />
            <FilterSelect label="Trend" value={filters.trend} onChange={v => setFilters(f => ({ ...f, trend: v }))} options={TRENDS.map(t => t.value)} labels={TRENDS.map(t => t.label)} />
            <FilterInput label="Min Hotness" value={filters.min_hotness} onChange={v => setFilters(f => ({ ...f, min_hotness: v }))} placeholder="0" />
            <FilterSelect label="Recommendation" value={filters.recommendation} onChange={v => setFilters(f => ({ ...f, recommendation: v }))} options={['', ...RECS]} />
          </div>
        </div>
      )}

      {/* Results Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                {[
                  { key: 'symbol', label: 'Symbol', w: '120px' },
                  { key: 'price', label: 'Price', w: '80px' },
                  { key: 'change_pct', label: 'Change %', w: '80px' },
                  { key: 'volume', label: 'Volume', w: '90px' },
                  { key: 'vol_ratio', label: 'Vol Ratio', w: '70px' },
                  { key: 'market_cap_fmt', label: 'Mkt Cap', w: '80px' },
                  { key: 'pe_ratio', label: 'P/E', w: '60px' },
                  { key: 'sector', label: 'Sector', w: '100px' },
                  { key: 'rsi_14', label: 'RSI', w: '60px' },
                  { key: 'trend', label: 'Trend', w: '100px' },
                  { key: 'hotness', label: 'Hotness', w: '70px' },
                  { key: 'recommendation', label: 'Rec', w: '80px' },
                ].map(col => (
                  <th
                    key={col.key}
                    className="text-left py-2 px-2 cursor-pointer select-none whitespace-nowrap"
                    style={{ width: col.w, color: 'var(--text-muted)', fontWeight: 600 }}
                    onClick={() => handleSort(col.key)}
                  >
                    <div className="flex items-center gap-1">
                      {col.label}
                      <SortIcon col={col.key} />
                    </div>
                  </th>
                ))}
                <th style={{ width: '60px' }} />
              </tr>
            </thead>
            <tbody>
              {stocks.map(stock => {
                const isGain = stock.change_pct >= 0;
                const hotColor = stock.hotness >= 70 ? 'var(--red)' : stock.hotness >= 40 ? 'var(--yellow)' : 'var(--green)';
                return (
                  <tr
                    key={stock.symbol}
                    className="hover:bg-white/5 transition-colors"
                    style={{ borderBottom: '1px solid var(--border-subtle)' }}
                  >
                    <td className="py-2 px-2">
                      <div className="flex items-center gap-2">
                        {isGain ? <TrendingUp className="w-3.5 h-3.5 text-green-400" /> : <TrendingDown className="w-3.5 h-3.5 text-red-400" />}
                        <div>
                          <div className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{stock.symbol}</div>
                          <div className="text-2xs truncate max-w-[100px]" style={{ color: 'var(--text-muted)' }}>{stock.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-2 px-2 font-mono" style={{ color: 'var(--text-primary)' }}>${stock.price.toFixed(2)}</td>
                    <td className="py-2 px-2 font-mono" style={{ color: isGain ? 'var(--green)' : 'var(--red)' }}>
                      {isGain ? '+' : ''}{stock.change_pct.toFixed(2)}%
                    </td>
                    <td className="py-2 px-2 font-mono" style={{ color: 'var(--text-secondary)' }}>{(stock.volume / 1e6).toFixed(1)}M</td>
                    <td className="py-2 px-2 font-mono" style={{ color: stock.vol_ratio >= 1.5 ? 'var(--red)' : stock.vol_ratio >= 1 ? 'var(--yellow)' : 'var(--text-secondary)' }}>
                      {stock.vol_ratio.toFixed(2)}x
                    </td>
                    <td className="py-2 px-2" style={{ color: 'var(--text-secondary)' }}>{stock.market_cap_fmt}</td>
                    <td className="py-2 px-2 font-mono" style={{ color: 'var(--text-secondary)' }}>{stock.pe_ratio ?? '—'}</td>
                    <td className="py-2 px-2" style={{ color: 'var(--text-secondary)' }}>{stock.sector}</td>
                    <td className="py-2 px-2 font-mono" style={{ color: stock.rsi_14 && stock.rsi_14 >= 70 ? 'var(--red)' : stock.rsi_14 && stock.rsi_14 <= 30 ? 'var(--green)' : 'var(--text-secondary)' }}>
                      {stock.rsi_14?.toFixed(1) ?? '—'}
                    </td>
                    <td className="py-2 px-2">
                      <span className="px-1.5 py-0.5 rounded text-2xs font-medium" style={{
                        background: stock.trend === 'ABOVE_BOTH' ? 'rgba(34,197,94,0.15)' : stock.trend === 'BELOW_BOTH' ? 'rgba(239,68,68,0.15)' : 'rgba(234,179,8,0.15)',
                        color: stock.trend === 'ABOVE_BOTH' ? 'var(--green)' : stock.trend === 'BELOW_BOTH' ? 'var(--red)' : 'var(--yellow)'
                      }}>
                        {stock.trend.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-2 px-2">
                      <div className="flex items-center gap-1.5">
                        <div className="w-8 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-body)' }}>
                          <div className="h-full rounded-full" style={{ width: `${stock.hotness}%`, background: hotColor }} />
                        </div>
                        <span className="font-mono" style={{ color: hotColor }}>{stock.hotness.toFixed(0)}</span>
                      </div>
                    </td>
                    <td className="py-2 px-2">
                      <span className="text-2xs" style={{
                        color: stock.recommendation.includes('Buy') ? 'var(--green)' : stock.recommendation.includes('Sell') ? 'var(--red)' : 'var(--text-muted)'
                      }}>
                        {stock.recommendation}
                      </span>
                    </td>
                    <td className="py-2 px-2">
                      <button className="p-1 rounded hover:bg-white/10" title="Add to watchlist">
                        <BookmarkPlus className="w-3.5 h-3.5" style={{ color: 'var(--accent-cyan)' }} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {stocks.length === 0 && !loading && (
                <tr>
                  <td colSpan={13} className="py-8 text-center" style={{ color: 'var(--text-muted)' }}>
                    No stocks match your filters. Try adjusting criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function FilterInput({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="space-y-1">
      <label className="text-2xs font-medium block" style={{ color: 'var(--text-muted)' }}>{label}</label>
      <input
        type="number"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-2 py-1 rounded text-xs border-none outline-none"
        style={{ background: 'var(--bg-body)', color: 'var(--text-primary)' }}
      />
    </div>
  );
}

function FilterSelect({ label, value, onChange, options, labels }: { label: string; value: string; onChange: (v: string) => void; options: string[]; labels?: string[] }) {
  return (
    <div className="space-y-1">
      <label className="text-2xs font-medium block" style={{ color: 'var(--text-muted)' }}>{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-2 py-1 rounded text-xs border-none outline-none"
        style={{ background: 'var(--bg-body)', color: 'var(--text-primary)' }}
      >
        {options.map((opt, i) => (
          <option key={opt || 'any'} value={opt}>{labels?.[i] ?? (opt || 'Any')}</option>
        ))}
      </select>
    </div>
  );
}
