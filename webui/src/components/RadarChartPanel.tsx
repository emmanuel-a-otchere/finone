// RadarChart — spec: hexagon, vertices: Trend/Momentum/MTF/Institutional/Sentiment/Intermarket, hover shows values
import { useState } from 'react';
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ResponsiveContainer, Tooltip,
} from 'recharts';

interface LayerData {
  trend: number;        // 0–100
  momentum: number;
  multi_timeframe: number;
  institutional: number;
  sentiment: number;
  intermarket: number;
}

interface RadarChartPanelProps {
  symbol?: string;
  data?: LayerData;
  onDrillDown?: (layer: string) => void;
}

const DEFAULT_DATA: LayerData = {
  trend: 72,
  momentum: 65,
  multi_timeframe: 58,
  institutional: 48,
  sentiment: 76,
  intermarket: 61,
};

const VERTICES = [
  { key: 'trend',          label: 'Trend',          color: 'var(--accent-blue)' },
  { key: 'momentum',       label: 'Momentum',        color: '#FF9800' },
  { key: 'multi_timeframe',label: 'MTF',             color: '#00FF7F' },
  { key: 'institutional',  label: 'Institutional',    color: '#FFD700' },
  { key: 'sentiment',      label: 'Sentiment',        color: '#FF4500' },
  { key: 'intermarket',    label: 'Intermarket',     color: '#BB86FC' },
];

function toChartData(d: LayerData) {
  return VERTICES.map(v => ({
    vertex: v.label,
    value: d[v.key as keyof LayerData] ?? 0,
    color: v.color,
  }));
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  const vertex = VERTICES.find(v => v.label === p.payload.vertex);
  return (
    <div className="card p-3 text-xs flex flex-col gap-1.5"
      style={{ background: 'rgba(20,20,35,0.98)', border: '1px solid rgba(255,255,255,0.1)' }}>
      <span className="font-semibold text-white">{p.payload.vertex}</span>
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full" style={{ background: vertex?.color }} />
        <span style={{ color: 'var(--text-muted)' }}>Score:</span>
        <span className="font-mono font-bold text-white">{p.value}/100</span>
      </div>
      {vertex && (
        <button
          onClick={() => window.location.hash = `#layer-${vertex.key}`}
          className="mt-1 text-[10px] px-2 py-1 rounded text-white"
          style={{ background: `${vertex.color}30`, border: `1px solid ${vertex.color}60` }}
        >
          Drill down →
        </button>
      )}
    </div>
  );
}

export function RadarChartPanel({ symbol = 'AAPL', data = DEFAULT_DATA, onDrillDown }: RadarChartPanelProps) {
  const [active, setActive] = useState<string | null>(null);
  const chartData = toChartData(data);

  return (
    <div className="card p-4 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Layer Analysis
          </span>
          <span className="badge bg-info/20 text-info text-[10px]">{symbol}</span>
        </div>
        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Hover for details</span>
      </div>

      {/* Radar */}
      <div style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={chartData} margin={{ top: 8, right: 24, bottom: 8, left: 24 }}>
            <PolarGrid stroke="rgba(255,255,255,0.06)" />
            <PolarAngleAxis
              dataKey="vertex"
              tick={{ fill: 'var(--text-muted)', fontSize: 10, fontWeight: 500 }}
              tickLine={false}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 100]}
              tick={{ fill: 'var(--text-muted)', fontSize: 8 }}
              tickCount={4}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            {/* Single filled polygon with gradient color per vertex */}
            <Radar
              name="Layers"
              dataKey="value"
              stroke="var(--accent-blue)"
              fill="var(--accent-blue)"
              fillOpacity={0.15}
              strokeWidth={1.5}
              dot={{ r: 3, fill: 'var(--accent-blue)', strokeWidth: 0 }}
              activeDot={{ r: 5, fill: 'var(--accent-blue)', stroke: '#fff', strokeWidth: 1.5 }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Vertex legend — clickable drill-down */}
      <div className="grid grid-cols-3 gap-1.5">
        {VERTICES.map(v => {
          const val = data[v.key as keyof LayerData] ?? 0;
          const isActive = active === v.key;
          return (
            <button
              key={v.key}
              onMouseEnter={() => setActive(v.key)}
              onMouseLeave={() => setActive(null)}
              onClick={() => onDrillDown?.(v.key)}
              className="flex items-center gap-1.5 px-2 py-1 rounded text-[10px] transition-all"
              style={{
                background: isActive ? `${v.color}18` : 'rgba(255,255,255,0.03)',
                border: `1px solid ${isActive ? v.color + '50' : 'rgba(255,255,255,0.05)'}`,
                cursor: 'pointer',
              }}
            >
              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: v.color }} />
              <span style={{ color: isActive ? v.color : 'var(--text-muted)' }}>{v.label}</span>
              <span className="font-mono font-bold ml-auto" style={{ color: v.color }}>{val}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
