const API_BASE = "/api/core";
const INTEL_BASE = "/api/intel";

export interface WatchlistItem {
  id: string;
  user_id: string;
  symbol: string;
  timeframe: "day_trade" | "swing" | "position";
  min_confidence: number;
  enabled: boolean;
  last_generated: string | null;
  created_at: string;
}

export interface GenerateResponse {
  generated: number;
  symbols: string[];
  errors: string[];
}

export interface ExpireResponse {
  expired: number;
  symbols: string[];
}

export interface PendingSignal {
  id: string;
  symbol: string;
  protocol_type: string;
  confidence_score: number;
  entry_price: number | null;
  stop_loss: number | null;
  take_profit: number | null;
  status: string;
  timeframe: string;
  created_at: string;
  expires_at: string;
}

// ---- Probability-Weighted Engine Types ----
export interface LensScores {
  technical: number;
  regime: number;
  historical: number;
  event: number;
}

export interface CertaintyDial {
  raw_score: number;
  adjusted_score: number;
  dispersion: number;
  bottleneck: string;
  confidence_interval: [number, number];
}

export interface HorizonForecast {
  horizon: string;
  horizon_label: string;
  expected_move_pct: number;
  probability_up: number;
  certainty_cap: number;
  key_level: number;
  max_uncertainty: number;
}

export interface PriceZone {
  low: number;
  high: number;
  label: string;
}

export interface PriceLevel {
  price: number;
  label: string;
}

export interface SuggestedPlan {
  direction: string;
  entry_zones: PriceZone[];
  stop_loss: PriceLevel;
  targets: PriceLevel[];
  position_size_pct: number;
  invalidation: string;
}

export interface HistoricalStats {
  setup_type: string;
  win_rate: number;
  avg_return_pct: number;
  avg_loss_pct: number;
  max_drawdown_pct: number;
  expectancy: number;
  sample_size: number;
  last_updated: string | null;
}

export interface SignalAnalysis {
  signal_id: number;
  symbol: string;
  protocol_type: string;
  setup_type?: string;
  certainty_dial: CertaintyDial;
  lens_scores: LensScores;
  historical_stats?: HistoricalStats;
  horizons: HorizonForecast[];
  suggested_plan: SuggestedPlan;
  computed_at: string;
}

export interface StrategyConfig {
  version: string;
  weights: { technical: number; regime: number; historical: number; event: number };
  horizon_caps: { immediate: number; near_term: number; far_term: number };
  risk_limits: { max_position_pct: number; kelly_fraction: number; max_portfolio_leverage: number; max_sector_concentration_pct: number };
  conflict_penalty: { threshold_dispersion: number; penalty_multiplier: number };
  enabled_lenses: string[];
}

import type { Signal, EventRiskScore, Recalibration } from '../types';

class ApiClient {
  private token: string | null = (() => {
    try { return JSON.parse(localStorage.getItem("systemone-auth") || "{}").token ?? null; }
    catch { return null; }
  })();

  setToken(token: string | null) {
    this.token = token;
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = { "Content-Type": "application/json" };
    try {
      const auth = JSON.parse(localStorage.getItem('systemone-auth') || '{}');
      if (auth.state.token) headers["Authorization"] = `Bearer ${auth.state.token}`;
    } catch {}
    return headers;
  }

  // ---- Auth ----
  async login(username: string, password: string) {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (!response.ok) throw new Error("Invalid credentials");
    return response.json();
  }

  // ---- Signals ----
  async getSignals(status?: string, symbol?: string, limit = 50) {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (symbol) params.set("symbol", symbol);
    params.set("limit", String(limit));
    const response = await fetch(`${API_BASE}/signals?${params}`, {
      headers: this.getHeaders(),
    });
    if (!response.ok) throw new Error("Failed to fetch signals");
    return response.json();
  }

  async generateSignals(symbols: string[], minConfidence = 0, protocols?: string[]) {
    const body: Record<string, unknown> = { symbols, min_confidence: minConfidence };
    if (protocols) body.protocols = protocols;
    const response = await fetch(`${API_BASE}/signals/generate`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error("Failed to generate signals");
    return response.json();
  }

  // ---- Admin / Watchlist ----
  async getWatchlist(): Promise<WatchlistItem[]> {
    const response = await fetch(`${API_BASE}/admin/watchlist`, {
      headers: this.getHeaders(),
    });
    if (!response.ok) throw new Error("Failed to fetch watchlist");
    return response.json();
  }

  async addWatchlistItem(item: { symbol: string; timeframe?: string; min_confidence?: number; enabled?: boolean }): Promise<WatchlistItem> {
    const response = await fetch(`${API_BASE}/admin/watchlist`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(item),
    });
    if (!response.ok) throw new Error("Failed to add watchlist item");
    return response.json();
  }

  async updateWatchlistItem(itemId: string, updates: { symbol?: string; timeframe?: string; min_confidence?: number; enabled?: boolean }): Promise<WatchlistItem> {
    const response = await fetch(`${API_BASE}/admin/watchlist/${itemId}`, {
      method: "PATCH",
      headers: this.getHeaders(),
      body: JSON.stringify(updates),
    });
    if (!response.ok) throw new Error("Failed to update watchlist item");
    return response.json();
  }

  async removeWatchlistItem(itemId: string): Promise<{ ok: boolean }> {
    const response = await fetch(`${API_BASE}/admin/watchlist/${itemId}`, {
      method: "DELETE",
      headers: this.getHeaders(),
    });
    if (!response.ok) throw new Error("Failed to remove watchlist item");
    return response.json();
  }

  async generateWatchlistSignals(): Promise<GenerateResponse> {
    const response = await fetch(`${API_BASE}/admin/watchlist/generate`, {
      method: "POST",
      headers: this.getHeaders(),
    });
    if (!response.ok) throw new Error("Failed to generate watchlist signals");
    return response.json();
  }

  async getPendingSignals(): Promise<PendingSignal[]> {
    const response = await fetch(`${API_BASE}/admin/signals/pending`, {
      headers: this.getHeaders(),
    });
    if (!response.ok) throw new Error("Failed to fetch pending signals");
    return response.json();
  }

  async expireSignalsNow(): Promise<ExpireResponse> {
    const response = await fetch(`${API_BASE}/admin/signals/expire`, {
      method: "POST",
      headers: this.getHeaders(),
    });
    if (!response.ok) throw new Error("Failed to expire signals");
    return response.json();
  }

  // ---- Portfolio ----
  async getPortfolios() {
    const response = await fetch(`${API_BASE}/portfolio/`, {
      headers: this.getHeaders(),
    });
    if (!response.ok) throw new Error("Failed to fetch portfolios");
    return response.json();
  }

  async getPortfolioPerformance(portfolioId: string) {
    const response = await fetch(`${API_BASE}/portfolios/${portfolioId}/performance`, {
      headers: this.getHeaders(),
    });
    if (!response.ok) throw new Error("Failed to fetch portfolio performance");
    return response.json();
  }

  async createPortfolio(name: string, description = "") {
    const response = await fetch(`${API_BASE}/portfolio/`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({ name, description }),
    });
    if (!response.ok) throw new Error("Failed to create portfolio");
    return response.json();
  }

  async updatePortfolio(id: string, data: { name?: string; description?: string }) {
    const response = await fetch(`${API_BASE}/portfolio/${id}`, {
      method: "PUT",
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Failed to update portfolio");
    return response.json();
  }

  async deletePortfolio(id: string) {
    const response = await fetch(`${API_BASE}/portfolio/${id}`, {
      method: "DELETE",
      headers: this.getHeaders(),
    });
    if (!response.ok) throw new Error("Failed to delete portfolio");
    return response.json();
  }

  async addSignalsToPortfolio(
    portfolioId: string,
    signalEntries: Array<{ symbol: string; qty: number; avg_cost: number; strategy?: string; entry_date?: string }>
  ) {
    const response = await fetch(`${API_BASE}/portfolio/${portfolioId}/signals/`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({ signals: signalEntries }),
    });
    if (!response.ok) throw new Error("Failed to add signals to portfolio");
    return response.json();
  }

  // ---- Layers ----
  async getLayerDrilldown(layerName: string, symbol: string) {
    const response = await fetch(
      `${API_BASE}/layers/${layerName}/drilldown?symbol=${encodeURIComponent(symbol)}`,
      { headers: this.getHeaders() }
    );
    if (!response.ok) throw new Error("Failed to fetch layer drilldown");
    return response.json();
  }

  async getLayers() {
    const response = await fetch(`${API_BASE}/layers`, { headers: this.getHeaders() });
    if (!response.ok) throw new Error("Failed to fetch layers");
    return response.json();
  }

  async getCorrelationMatrix() {
    const response = await fetch(`${API_BASE}/layers/correlation-matrix`, {
      headers: this.getHeaders(),
    });
    if (!response.ok) throw new Error("Failed to fetch correlation matrix");
    return response.json();
  }

  // ---- Market Hot ----
  async getMarketHot(): Promise<import('../types').HotData> {
    const resp = await fetch('/api/market/hot');
    if (!resp.ok) throw new Error('Failed to fetch market hot');
    return resp.json();
  }


  // ---- Market Breadth (A/D) ----
  async getMarketBreadth(): Promise<{ advancing: number; neutral: number; declining: number; a_ratio: number; history: Array<{ date: string; advancing: number; neutral: number; declining: number }> }> {
    const resp = await fetch("/api/market/breadth");
    if (!resp.ok) throw new Error("Failed to fetch market breadth");
    return resp.json();
  }

  // ---- SPY Trend (price + MA + sentiment + fear&greed) ----
  async getSPYTrend(rangeKey = "6M"): Promise<{ symbol: string; range: string; price: number[]; ma200: number[]; sentiment: number[]; fear_greed: number[]; months: string[] }> {
    const resp = await fetch(`/api/market/spy-trend?range=${rangeKey}`);
    if (!resp.ok) throw new Error("Failed to fetch SPY trend");
    return resp.json();
  }

  // ---- Fear & Greed ----
  async getFearGreed(): Promise<{ current: { value: number; label: string; timestamp: string }; history: Array<{ value: number; label: string; timestamp: string }> }> {
    const resp = await fetch("/api/market/fear-greed");
    if (!resp.ok) throw new Error("Failed to fetch fear & greed");
    return resp.json();
  }

  async getMarketSentiment(): Promise<{ current: { value: number; label: string; timestamp: string }; history: Array<{ value: number; label: string; timestamp: string }> }> {
    const resp = await fetch("/api/market/sentiment");
    if (!resp.ok) throw new Error("Failed to fetch market sentiment");
    return resp.json();
  }

  async getMarketIndices(): Promise<Array<{symbol: string; value: number; change: string; change_pct: number; up: boolean}>> {
    const resp = await fetch("/api/market/indices");
    if (!resp.ok) throw new Error("Failed to fetch market indices");
    return resp.json();
  }

  async getSectorPerformance(): Promise<Record<string, number>> {
    return this.get<Record<string, number>>('/api/market/sectors');
  }

  // ---- Symbol Info ----
  async getSymbolInfo(symbol: string) {
    const response = await fetch(`${API_BASE}/symbols/${encodeURIComponent(symbol)}/info`, {
      headers: this.getHeaders(),
    });
    if (!response.ok) throw new Error("Failed to fetch symbol info");
    return response.json();
  }

  // ---- Forecast ----
  async getOHLCV(symbol: string, days = 90) {
    const response = await fetch(
      `${INTEL_BASE}/forecast/${encodeURIComponent(symbol)}/ohlcv?days=${days}`,
      { headers: this.getHeaders() }
    );
    if (!response.ok) throw new Error("Failed to fetch OHLCV");
    return response.json();
  }

  async getIndicator(symbol: string, indicator: string, days = 30) {
    const response = await fetch(
      `${INTEL_BASE}/forecast/${encodeURIComponent(symbol)}/indicators?indicator=${indicator}&days=${days}`,
      { headers: this.getHeaders() }
    );
    if (!response.ok) throw new Error("Failed to fetch indicators");
    return response.json();
  }

// Stub for ForecastChart compatibility — data returned in { series: [] } shape
  async getIndicatorHistory(symbol: string, indicator: string, days = 30) {
    const response = await fetch(
      `${INTEL_BASE}/forecast/${encodeURIComponent(symbol)}/indicators?indicator=${indicator}&days=${days}`,
      { headers: this.getHeaders() }
    );
    if (!response.ok) return { series: [] };
    return response.json();
  }

  async getPriceProjection(symbol: string, days = 30) {
    const response = await fetch(
      `${INTEL_BASE}/forecast/${encodeURIComponent(symbol)}/projection?days=${days}`,
      { headers: this.getHeaders() }
    );
    if (!response.ok) throw new Error("Failed to fetch price projection");
    return response.json();
  }

  // ---- Probability-Weighted Engine ----
  async getSignalAnalysis(signalId: number): Promise<SignalAnalysis> {
    const response = await fetch(`${API_BASE}/analysis/${signalId}`, {
      headers: this.getHeaders(),
    });
    if (!response.ok) throw new Error("Analysis failed");
    return response.json();
  }

  // ── Strategy Config ───────────────────────────────────────────────────────
  async getStrategyConfigNew(): Promise<StrategyConfig> {
    const response = await fetch(`${API_BASE}/strategy/config`, {
      headers: this.getHeaders(),
    });
    if (!response.ok) throw new Error("Strategy config fetch failed");
    return response.json();
  }

  async putStrategyConfig(config: Partial<StrategyConfig>): Promise<void> {
    const response = await fetch(`${API_BASE}/strategy/config`, {
      method: "PUT",
      headers: { ...this.getHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });
    if (!response.ok) throw new Error("Strategy config save failed");
  }

  async sizePositions(signals: Array<{
    symbol: string; direction: string; entry: number; stop: number;
    target: number; confidence: number; horizon: string;
  }>, portfolioValue: number): Promise<any> {
    const response = await fetch(`${API_BASE}/strategy/size`, {
      method: "POST",
      headers: { ...this.getHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ signals, portfolio_value: portfolioValue }),
    });
    if (!response.ok) throw new Error("Position sizing failed");
    return response.json();
  }

  // ── Positions ─────────────────────────────────────────────────────────────
  async getPositionsSummary(): Promise<any> {
    const response = await fetch(`${API_BASE}/positions/summary`, {
      headers: this.getHeaders(),
    });
    if (!response.ok) throw new Error("Positions fetch failed");
    return response.json();
  }

  async getPositions(status?: "OPEN" | "CLOSED"): Promise<any[]> {
    const url = `${API_BASE}/positions/${status ? `?status=${status}` : ""}`;
    const response = await fetch(url, { headers: this.getHeaders() });
    if (!response.ok) throw new Error("Positions fetch failed");
    return response.json();
  }

  async openPosition(data: {
    signal_id?: string; symbol: string; direction: string;
    qty: number; entry_price: number; strategy?: string; notes?: string;
  }): Promise<{ position_id: number }> {
    const response = await fetch(`${API_BASE}/positions/`, {
      method: "POST",
      headers: { ...this.getHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Open position failed");
    return response.json();
  }

  async closePosition(positionId: number, exitPrice: number, notes = ""): Promise<any> {
    const response = await fetch(`${API_BASE}/positions/${positionId}/close`, {
      method: "POST",
      headers: { ...this.getHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ exit_price: exitPrice, notes }),
    });
    if (!response.ok) throw new Error("Close position failed");
    return response.json();
  }

  async getStrategyConfig(): Promise<StrategyConfig> {
    const response = await fetch(`${API_BASE}/analysis/config/strategy`, {
      headers: this.getHeaders(),
    });
    if (!response.ok) throw new Error("Config fetch failed");
    return response.json();
  }

  async recordOutcome(data: {
    signal_id: string;
    setup_type: string;
    direction: string;
    entry_price: number;
    exit_price?: number;
    pnl_pct?: number;
    notes?: string;
  }): Promise<{ id: number; status: string }> {
    const response = await fetch(`${API_BASE}/analysis/outcomes`, {
      method: "POST",
      headers: { ...this.getHeaders() },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Failed to record outcome");
    return response.json();
  }

  async getOutcomeStats(setupType: string): Promise<HistoricalStats> {
    const response = await fetch(`${API_BASE}/analysis/outcomes/stats/${encodeURIComponent(setupType)}`, {
      headers: this.getHeaders(),
    });
    if (!response.ok) throw new Error("Failed to fetch outcome stats");
    return response.json();
  }

  async listSetupTypes(): Promise<string[]> {
    const response = await fetch(`${API_BASE}/analysis/outcomes/types`, {
      headers: this.getHeaders(),
    });
    if (!response.ok) throw new Error("Failed to list setup types");
    return (await response.json()).setup_types;
  }

  // ---- Event Risk ----
  async getEventRisk(symbol: string, daysAhead = 30): Promise<EventRiskScore> {
    const response = await fetch(`${API_BASE}/analysis/events/${encodeURIComponent(symbol)}?days_ahead=${daysAhead}`, {
      headers: this.getHeaders(),
    });
    if (!response.ok) throw new Error("Failed to fetch event risk");
    return response.json();
  }

  async recalibrateSignals(signals: Partial<Signal>[], daysAhead = 14): Promise<{ recalibrations: Recalibration[]; total_checked: number; recalibrated_count: number }> {
    const response = await fetch(`${API_BASE}/analysis/recalibrate`, {
      method: "POST",
      headers: { ...this.getHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ signals, days_ahead: daysAhead }),
    });
    if (!response.ok) throw new Error("Failed to recalibrate signals");
    return response.json();
  }

  // ---- XGBoost Horizon Forecast ----
  async getXGBoostForecast(signalId: string): Promise<any> {
    const response = await fetch(`${API_BASE}/analysis/${signalId}/xgboost`, {
      headers: this.getHeaders(),
    });
    if (!response.ok) throw new Error("Failed to fetch XGBoost forecast");
    return response.json();
  }

  async batchXGBoostForecast(symbols: string[]): Promise<any> {
    const response = await fetch(`${API_BASE}/analysis/xgboost/batch`, {
      method: "POST",
      headers: { ...this.getHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ symbols }),
    });
    if (!response.ok) throw new Error("Failed to fetch batch XGBoost forecasts");
    return response.json();
  }

  // ---- Screener ----
  async getScreenerStocks(queryString: string): Promise<any> {
    const response = await fetch(`${API_BASE}/screener/stocks?` + queryString, {
      headers: this.getHeaders(),
    });
    if (!response.ok) throw new Error("Failed to fetch screener results");
    return response.json();
  }
}

export const api = new ApiClient();

