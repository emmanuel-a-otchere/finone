"use client";
import { useEffect, useState } from "react";
import {
  ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { api } from "../lib/api";

interface OHLCVData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface IndicatorData {
  date: string;
  value: number;
}

interface ProjectionData {
  date: string;
  p10: number;
  p50: number;
  p90: number;
}

interface ForecastChartProps {
  symbol: string;
  token: string;
}

function formatDate(d: string) {
  const parts = d.split("-");
  return parts.length === 3 ? `${parts[1]}/${parts[2]}` : d;
}

function formatPrice(v: number) {
  return v.toFixed(2);
}

export function ForecastChart({ symbol, token }: ForecastChartProps) {
  const [ohlcv, setOhlcv] = useState<OHLCVData[]>([]);
  const [rsi, setRsi] = useState<IndicatorData[]>([]);
  const [ema8, setEma8] = useState<IndicatorData[]>([]);
  const [ema21, setEma21] = useState<IndicatorData[]>([]);
  const [projection, setProjection] = useState<ProjectionData[]>([]);
  const [outlook, setOutlook] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [tab, setTab] = useState<"price" | "rsi" | "scenario">("price");

  useEffect(() => {
    if (!token || !symbol) return;
    setLoading(true);
    setError("");

    Promise.all([
      api.getOHLCV(symbol, 90),
      api.getIndicatorHistory(symbol, "rsi", 90),
      api.getIndicatorHistory(symbol, "ema8", 90),
      api.getIndicatorHistory(symbol, "ema21", 90),
      api.getPriceProjection(symbol, 30),
    ])
      .then(([ohlcvData, rsiData, ema8Data, ema21Data, projData]) => {
        setOhlcv(ohlcvData.data || []);
        setRsi(rsiData.series || []);
        setEma8(ema8Data.series || []);
        setEma21(ema21Data.series || []);
        const paths = projData.paths || {};
        const dates = paths.dates || [];
        setProjection(dates.map((d: string, i: number) => ({
          date: d,
          p10: paths.p10?.[i] ?? 0,
          p50: paths.p50?.[i] ?? 0,
          p90: paths.p90?.[i] ?? 0,
        })));
        setOutlook(projData.outlook || "");
      })
      .catch((err: Error) => {
        console.error("ForecastChart load error:", err);
        setError("Failed to load forecast data");
      })
      .finally(() => setLoading(false));
  }, [symbol, token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500">
        <div className="text-sm">Loading forecast...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-red-400">
        <div className="text-sm">{error}</div>
      </div>
    );
  }

  const currentPrice = ohlcv.length > 0 ? ohlcv[ohlcv.length - 1].close : 0;
  const scenarioLast = projection.length > 0 ? projection[projection.length - 1] : null;

  return (
    <div className="space-y-3">
      {/* Outlook banner */}
      {scenarioLast && (
        <div className="flex items-center gap-3 px-4 py-2 rounded-lg bg-inset border border-token">
          <span className="text-sm text-slate-400">30-Day Outlook:</span>
          <span className={`text-sm font-semibold ${
            outlook.includes("BULLISH") ? "text-emerald-400" :
            outlook.includes("BEARISH") ? "text-red-400" : "text-amber-400"
          }`}>
            {outlook.replace("_", " ")}
          </span>
          <span className="text-xs text-slate-500 ml-auto">
            Bear {scenarioLast.p10?.toFixed(2)} → Base {scenarioLast.p50?.toFixed(2)} → Bull {scenarioLast.p90?.toFixed(2)}
          </span>
        </div>
      )}

      {/* Tab selector */}
      <div className="flex gap-1 bg-inset rounded-lg p-1">
        {(["price", "rsi", "scenario"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
              tab === t
                ? "bg-primary-500/20 text-primary-400"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {t === "price" ? "Price + EMAs" : t === "rsi" ? "RSI" : "Scenario Fan"}
          </button>
        ))}
      </div>

      {/* Price + EMA chart */}
      {tab === "price" && ohlcv.length > 0 && (
        <div>
          <div className="text-xs text-slate-500 mb-1">
            Current: <span className="text-white font-medium">${currentPrice.toFixed(2)}</span>
            {" "}· EMAs: 8 (cyan), 21 (purple)
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <ComposedChart data={ohlcv} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                tick={{ fill: "var(--text-muted)", fontSize: 10 }}
                interval={Math.floor(ohlcv.length / 6)}
              />
              <YAxis
                domain={["auto", "auto"]}
                tick={{ fill: "var(--text-muted)", fontSize: 10 }}
                tickFormatter={formatPrice}
              />
              <Tooltip
                contentStyle={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: 8 }}
                labelFormatter={formatDate}
                formatter={(v: number) => [v.toFixed(2), ""]}
              />
              <Area type="monotone" dataKey="close" fill="var(--accent-cyan)" fillOpacity={0.08} stroke="none" />
              <Line type="monotone" dataKey="close" stroke="var(--accent-cyan)" strokeWidth={1.5} dot={false} name="Price" />
              <Line type="monotone" dataKey={(d: OHLCVData) => {
                const ema8Pt = ema8.find((e) => e.date === d.date);
                return ema8Pt ? ema8Pt.value : null;
              }} stroke="var(--accent-cyan)" strokeWidth={1.2} dot={false} name="EMA 8" />
              <Line type="monotone" dataKey={(d: OHLCVData) => {
                const ema21Pt = ema21.find((e) => e.date === d.date);
                return ema21Pt ? ema21Pt.value : null;
              }} stroke="var(--accent-purple)" strokeWidth={1.2} dot={false} name="EMA 21" />
              <Legend wrapperStyle={{ fontSize: 10, color: "#94a3b8" }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* RSI chart */}
      {tab === "rsi" && rsi.length > 0 && (
        <div>
          <div className="text-xs text-slate-500 mb-1">
            RSI(14) · Above 70 = overbought, Below 30 = oversold
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <ComposedChart data={rsi} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                tick={{ fill: "var(--text-muted)", fontSize: 10 }}
                interval={Math.floor(rsi.length / 5)}
              />
              <YAxis domain={[0, 100]} tick={{ fill: "var(--text-muted)", fontSize: 10 }} />
              <Tooltip
                contentStyle={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: 8 }}
                labelFormatter={formatDate}
                formatter={(v: number) => [v.toFixed(1), "RSI"]}
              />
              {/* Overbought/oversold zones */}
              <Area
                type="monotone"
                dataKey={() => 70}
                stroke="none"
                fill="var(--red)"
                fillOpacity={0.05}
              />
              <Area
                type="monotone"
                dataKey={() => 30}
                stroke="none"
                fill="var(--green)"
                fillOpacity={0.05}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="var(--yellow)"
                strokeWidth={1.5}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
          <div className="flex justify-between text-xs text-slate-600 mt-1 px-1">
            <span>30 OvrSold</span>
            <span>50</span>
            <span>70 OvrBgt</span>
          </div>
        </div>
      )}

      {/* Scenario fan chart */}
      {tab === "scenario" && projection.length > 0 && scenarioLast && (
        <div>
          <div className="text-xs text-slate-500 mb-1">
            Monte Carlo · 100 scenarios · p10 (bear) / p50 (base) / p90 (bull)
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <ComposedChart data={projection} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                tick={{ fill: "var(--text-muted)", fontSize: 10 }}
                interval={Math.floor(projection.length / 5)}
              />
              <YAxis
                domain={["auto", "auto"]}
                tick={{ fill: "var(--text-muted)", fontSize: 10 }}
                tickFormatter={(v: number) => v.toFixed(0)}
              />
              <Tooltip
                contentStyle={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: 8 }}
                labelFormatter={formatDate}
                formatter={(v: number, name: string) => [v.toFixed(2), name]}
              />
              <Area type="monotone" dataKey="p90" fill="var(--green)" fillOpacity={0.15} stroke="none" name="p90 Bull" />
              <Area type="monotone" dataKey="p10" fill="var(--red)" fillOpacity={0.15} stroke="none" name="p10 Bear" />
              <Line type="monotone" dataKey="p50" stroke="var(--accent-cyan)" strokeWidth={2} dot={false} name="p50 Base" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
