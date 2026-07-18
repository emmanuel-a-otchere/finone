"use client";
import { Area, AreaChart, Line, ResponsiveContainer, Tooltip, XAxis } from "recharts";

interface MiniProjectionChartProps {
  dates: string[];
  p10: number[];
  p50: number[];
  p90: number[];
  entryPrice: number | null;
  targetPrice: number | null;
  stopPrice: number | null;
  currentPrice: number | null;
}

function formatDate(d: string): string {
  const parts = d.split("-");
  return parts.length === 3 ? `${parseInt(parts[1])}/${parseInt(parts[2])}` : d;
}

interface DataPoint {
  date: string;
  p10: number;
  p50: number;
  p90: number;
  entry?: number;
  target?: number;
  stop?: number;
  current?: number;
}

export function MiniProjectionChart({
  dates,
  p10,
  p50,
  p90,
  entryPrice,
  targetPrice,
  stopPrice,
}: MiniProjectionChartProps) {
  if (!dates?.length || !p50?.length) {
    return (
      <div className="h-full flex items-center justify-center text-slate-600 text-xs">
        No projection
      </div>
    );
  }

  const chartData: DataPoint[] = dates.map((d, i) => ({
    date: d,
    p10: p10[i],
    p50: p50[i],
    p90: p90[i],
    ...(entryPrice !== null && i === 0 ? { entry: entryPrice } : {}),
    ...(targetPrice !== null && i === dates.length - 1 ? { target: targetPrice } : {}),
    ...(stopPrice !== null && i === dates.length - 1 ? { stop: stopPrice } : {}),
  }));

  // Last 8 points for compactness
  const sliced =
    chartData.length > 8 ? chartData.slice(chartData.length - 8) : chartData;
  const step = Math.max(1, Math.floor(sliced.length / 4));

  const firstP50 = sliced[0]?.p50 ?? 0;
  const lastP50 = sliced[sliced.length - 1]?.p50 ?? 0;
  const trendUp = lastP50 >= firstP50;
  const trendColor = trendUp ? "var(--green)" : "var(--red)";

  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={sliced} margin={{ top: 4, right: 2, left: -20, bottom: 0 }}>
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            tick={{ fill: "var(--text-secondary)", fontSize: 9 }}
            interval={step - 1}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--bg-surface)",
              border: "1px solid var(--border-default)",
              borderRadius: 6,
              fontSize: 11,
            }}
            labelFormatter={formatDate}
            formatter={(v: number, name: string) => [
              `$${v.toFixed(2)}`,
              name === "p90" ? "Bull" : name === "p50" ? "Base" : "Bear",
            ]}
          />
          <Area
            type="monotone"
            dataKey="p90"
            stroke="none"
            fill={trendColor}
            fillOpacity={0.12}
          />
          <Area
            type="monotone"
            dataKey="p10"
            stroke="none"
            fill="var(--bg-surface)"
            fillOpacity={0.7}
          />
          <Line
            type="monotone"
            dataKey="p50"
            stroke={trendColor}
            strokeWidth={1.5}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
