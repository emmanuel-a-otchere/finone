import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from 'recharts';
import type { LayerScores } from '../types';

interface LayerChartProps {
  scores: LayerScores;
  loading?: boolean;
}

const layerLabels: Record<string, string> = {
  trend_structure: 'Trend',
  momentum_convergence: 'Momentum',
  multi_timeframe: 'MTF',
  institutional_flow: 'Institutional',
  sentiment_alignment: 'Sentiment',
  intermarket_filter: 'Intermarket',
};

export function LayerChart({ scores, loading = false }: LayerChartProps) {
  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-24 h-3 bg-dark-800 rounded" />
            <div className="flex-1 h-3 bg-dark-800 rounded" />
          </div>
        ))}
      </div>
    );
  }

  const data = Object.entries(layerLabels).map(([key, label]) => ({
    layer: label,
    value: scores[key as keyof LayerScores] ?? 0,
    fullMark: 100,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <RadarChart data={data}>
        <PolarGrid stroke="var(--border-default)" />
        <PolarAngleAxis
          dataKey="layer"
          tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
        />
        <PolarRadiusAxis
          angle={30}
          domain={[0, 100]}
          tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
        />
        <Radar
          name="Score"
          dataKey="value"
          stroke="var(--accent-cyan)"
          fill="var(--accent-cyan)"
          fillOpacity={0.3}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
};
