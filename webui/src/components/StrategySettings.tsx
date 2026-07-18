import { useState, useEffect } from 'react';
import type { StrategyConfig } from '../types';
import { Save, RefreshCw, AlertCircle, Info, TrendingUp, Shield, Sliders, Target } from 'lucide-react';
import { api } from '../lib/api';

// ─── Types ─────────────────────────────────────────────────────────────────





interface HorizonCaps { immediate: number; near_term: number; far_term: number; }
interface RiskLimits { max_position_pct: number; kelly_fraction: number; max_portfolio_leverage: number; max_sector_concentration_pct: number; }
interface ConflictPenalty { threshold_dispersion: number; penalty_multiplier: number; }

// ─── Sub-components ─────────────────────────────────────────────────────────

function WeightSlider({ label, value, onChange }: {
  label: string; value: number; onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-28 text-sm text-gray-300">{label}</span>
      <input
        type="range" min="0" max="100" step="5"
        value={value * 100} onChange={e => onChange(Number(e.target.value) / 100)}
        className="flex-1 h-2 rounded-lg appearance-none bg-gray-700 accent-emerald-500"
      />
      <span className="w-10 text-right text-sm font-mono text-gray-400">{(value * 100).toFixed(0)}%</span>
    </div>
  );
}

function CapsEditor({ caps, onChange }: { caps: HorizonCaps; onChange: (c: HorizonCaps) => void; }) {
  const set = (k: keyof HorizonCaps, v: number) => onChange({ ...caps, [k]: v });
  return (
    <div className="grid grid-cols-3 gap-4">
      {(['immediate', 'near_term', 'far_term'] as const).map(h => (
        <div key={h} className="bg-slate-800 rounded p-3">
          <div className="text-xs text-gray-400 capitalize mb-1">{h.replace('_', ' ')}</div>
          <input type="number" min="0" max="100" value={caps[h]}
            onChange={e => set(h, Math.max(0, Math.min(100, Number(e.target.value))))}
            className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm text-white" />
          <div className="text-xs text-gray-500 mt-1">max %</div>
        </div>
      ))}
    </div>
  );
}

function RiskEditor({ limits, onChange }: { limits: RiskLimits; onChange: (r: RiskLimits) => void; }) {
  const set = (k: keyof RiskLimits, v: number) => onChange({ ...limits, [k]: v });
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="w-40 text-sm text-gray-300">Max position %</span>
        <input type="number" min="0.5" max="20" step="0.5" value={limits.max_position_pct}
          onChange={e => set('max_position_pct', parseFloat(e.target.value) || 1)}
          className="w-24 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm text-white" />
        <span className="text-xs text-gray-500">% of portfolio per position</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="w-40 text-sm text-gray-300">Kelly fraction</span>
        <input type="range" min="1" max="50" step="1" value={limits.kelly_fraction * 100}
          onChange={e => set('kelly_fraction', Number(e.target.value) / 100)}
          className="flex-1 h-2 rounded-lg bg-gray-700 accent-emerald-500" />
        <span className="w-10 text-right text-sm font-mono text-gray-400">{(limits.kelly_fraction * 100).toFixed(0)}%</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="w-40 text-sm text-gray-300">Sector concentration</span>
        <input type="number" min="5" max="80" step="5" value={limits.max_sector_concentration_pct}
          onChange={e => set('max_sector_concentration_pct', parseFloat(e.target.value) || 30)}
          className="w-24 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm text-white" />
        <span className="text-xs text-gray-500">% max per sector</span>
      </div>
    </div>
  );
}


function ConflictEditor({ penalty, onChange }: { penalty: ConflictPenalty; onChange: (p: ConflictPenalty) => void; }) {
  const set = (k: keyof ConflictPenalty, v: number) => onChange({ ...penalty, [k]: v });
  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <div className="text-xs text-gray-400 mb-1">Dispersion threshold</div>
        <input type="number" min="0" max="100"
          value={penalty.threshold_dispersion}
          onChange={e => set('threshold_dispersion', Number(e.target.value))}
          className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm text-white" />
        <div className="text-xs text-gray-600 mt-1">Lens score gap triggering penalty</div>
      </div>
      <div>
        <div className="text-xs text-gray-400 mb-1">Penalty multiplier</div>
        <input type="number" min="0.1" max="1.0" step="0.05"
          value={penalty.penalty_multiplier}
          onChange={e => set('penalty_multiplier', Number(e.target.value))}
          className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm text-white" />
        <div className="text-xs text-gray-600 mt-1">Score multiplier when penalized</div>
      </div>
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────

export function StrategySettings() {
  const [config, setConfig] = useState<StrategyConfig | null>(null);
  const [original, setOriginal] = useState<StrategyConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { loadConfig(); }, []);

  async function loadConfig() {
    setLoading(true); setError(null);
    try {
      const data = await api.getStrategyConfigNew();
      setConfig(data); setOriginal(JSON.parse(JSON.stringify(data)));
    } catch {
      setError('Failed to load strategy config');
    }
    setLoading(false);
  }

  async function handleSave() {
    if (!config) return;
    setSaving(true); setError(null); setSaved(false);
    try {
      await api.putStrategyConfig({
        weights: config.weights,
        horizon_caps: config.horizon_caps,
        risk_limits: config.risk_limits,
        conflict_penalty: config.conflict_penalty,
        enabled_lenses: config.enabled_lenses,
      });
      setOriginal(JSON.parse(JSON.stringify(config)));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch { setError('Failed to save — check values and retry'); }
    setSaving(false);
  }

  const isDirty = original && config && JSON.stringify(config) !== JSON.stringify(original);

  if (loading) return (
    <div className="flex items-center justify-center h-40 text-gray-400">
      <RefreshCw className="animate-spin mr-2" size={18} /> Loading strategy config…
    </div>
  );
  if (!config) return (
    <div className="flex items-center gap-2 text-red-400"><AlertCircle size={16}/>{error || 'No config'}</div>
  );

  const totalWeight = config.weights.technical + config.weights.regime +
                      config.weights.historical + config.weights.event;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <Sliders size={16} className="text-emerald-400" />
            Strategy Configuration
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">Hot-reload — changes take effect immediately</p>
        </div>
        <div className="flex items-center gap-2">
          {isDirty && <span className="text-xs text-amber-400">● unsaved changes</span>}
          <button onClick={loadConfig} className="flex items-center gap-1 text-xs text-gray-400 hover:text-white px-2 py-1 rounded border border-slate-600 hover:border-slate-500 transition">
            <RefreshCw size={12} /> Reset
          </button>
          <button onClick={handleSave} disabled={!isDirty || saving}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded font-medium transition
              bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white">
            {saving ? <><RefreshCw size={12} className="animate-spin"/> Saving…</> : <><Save size={12}/> Save</>}
          </button>
          {saved && <span className="text-xs text-emerald-400">✓ saved</span>}
        </div>
      </div>

      {error && <div className="flex items-center gap-2 text-red-400 text-sm bg-red-900/20 p-2 rounded border border-red-800"><AlertCircle size={14}/>{error}</div>}

      {/* Lens Weights */}
      <div className="bg-slate-800/60 rounded-lg p-4 border border-slate-700">
        <div className="flex items-center gap-2 mb-4">
          <Target size={14} className="text-emerald-400"/>
          <h4 className="text-sm font-medium text-white">Lens Weights</h4>
          <span className={`text-xs px-1.5 py-0.5 rounded ${Math.abs(totalWeight - 1) < 0.001 ? 'bg-emerald-900/50 text-emerald-400' : 'bg-amber-900/50 text-amber-400'}`}>
            total={ (totalWeight * 100).toFixed(0) }%
          </span>
        </div>
        <div className="space-y-3">
          <WeightSlider label="Technical" value={config.weights.technical}
            onChange={v => setConfig({...config, weights: {...config.weights, technical: v}})} />
          <WeightSlider label="Regime" value={config.weights.regime}
            onChange={v => setConfig({...config, weights: {...config.weights, regime: v}})} />
          <WeightSlider label="Historical" value={config.weights.historical}
            onChange={v => setConfig({...config, weights: {...config.weights, historical: v}})} />
          <WeightSlider label="Event" value={config.weights.event}
            onChange={v => setConfig({...config, weights: {...config.weights, event: v}})} />
        </div>
        <p className="text-xs text-gray-500 mt-3">
          Lens weights determine how each analysis dimension contributes to the certainty dial score.
          Weights are normalized internally — even if they don't sum to 100%, they always sum to 1.0.
        </p>
      </div>

      {/* Horizon Caps */}
      <div className="bg-slate-800/60 rounded-lg p-4 border border-slate-700">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={14} className="text-blue-400"/>
          <h4 className="text-sm font-medium text-white">Horizon Certainty Caps</h4>
        </div>
        <CapsEditor caps={config.horizon_caps}
          onChange={c => setConfig({...config, horizon_caps: c})} />
        <p className="text-xs text-gray-500 mt-3">
          Maximum confidence % allowed per horizon. Prevents over-confidence on longer-horizon signals.
        </p>
      </div>

      {/* Risk Limits */}
      <div className="bg-slate-800/60 rounded-lg p-4 border border-slate-700">
        <div className="flex items-center gap-2 mb-4">
          <Shield size={14} className="text-amber-400"/>
          <h4 className="text-sm font-medium text-white">Risk Limits</h4>
        </div>
        <RiskEditor limits={config.risk_limits}
          onChange={r => setConfig({...config, risk_limits: r})} />
        <p className="text-xs text-gray-500 mt-3">
          Kelly fraction caps position size — lower values reduce volatility.
          Sector concentration prevents &gt;30% of portfolio risk in any single sector.
        </p>
      </div>

      {/* Conflict Penalty */}
      <div className="bg-slate-800/60 rounded-lg p-4 border border-slate-700">
        <div className="flex items-center gap-2 mb-4">
          <Info size={14} className="text-purple-400"/>
          <h4 className="text-sm font-medium text-white">Conflict Penalty</h4>
        </div>
        <ConflictEditor penalty={config.conflict_penalty}
          onChange={p => setConfig({...config, conflict_penalty: p})} />
      </div>
    </div>
  );
}
