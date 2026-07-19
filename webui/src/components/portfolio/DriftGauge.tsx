// DriftGauge + drift calculation — shared between Portfolio Overview and Risk tabs.
import { Target } from 'lucide-react';

// Target allocation for drift calculation (configurable per portfolio)
const DEFAULT_TARGETS: Record<string, number> = {
  Technology: 30,
  Healthcare: 20,
  'Consumer Discretionary': 15,
  Financials: 15,
  Energy: 10,
  Industrials: 10,
};

export interface SectorDrift {
  sector: string;
  actualPct: number;
  targetPct: number;
  drift: number;
  value: number;
}

export interface DriftData {
  drifts: SectorDrift[];
  maxDrift: number;
}

export function calculateDrift(
  actual: { sector: string; value: number; pct: number }[],
  totalValue: number,
): DriftData {
  const drifts = actual.map(s => {
    const targetPct = DEFAULT_TARGETS[s.sector] ?? 0;
    const actualPct = totalValue > 0 ? (s.value / totalValue) * 100 : 0;
    const drift = actualPct - targetPct;
    return { sector: s.sector, actualPct, targetPct, drift, value: s.value };
  });
  const maxDrift = Math.max(...drifts.map(d => Math.abs(d.drift)));
  return { drifts, maxDrift };
}

export function DriftGauge({ maxDrift }: { maxDrift: number }) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(maxDrift, 20);
  const offset = circumference - (clamped / 20) * circumference;
  let color = 'var(--green)';
  let label = 'Balanced';
  if (maxDrift > 15) { color = 'var(--red)'; label = 'High Drift'; }
  else if (maxDrift > 8) { color = 'var(--yellow)'; label = 'Moderate'; }
  else if (maxDrift > 3) { color = 'var(--accent-cyan)'; label = 'Slight'; }

  return (
    <div className="card p-6 flex flex-col items-center">
      <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <Target className="w-5 h-5 text-accent-cyan" /> Allocation Drift
      </h2>
      <div className="relative" style={{ width: 120, height: 120 }}>
        <svg width="120" height="120" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r={radius} fill="none" stroke="var(--border-default)" strokeWidth="8" />
          <circle cx="60" cy="60" r={radius} fill="none" stroke={color} strokeWidth="8"
            strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset}
            transform="rotate(-90 60 60)" style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-2xl font-bold" style={{ color, fontFamily: 'var(--font-display)' }}>{maxDrift.toFixed(1)}%</div>
          <div className="text-xs text-slate-400">max drift</div>
        </div>
      </div>
      <div className="mt-3 text-sm font-medium" style={{ color }}>{label}</div>
      <div className="text-xs text-slate-500 mt-1">Target vs actual allocation</div>
    </div>
  );
}
