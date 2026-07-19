export interface Signal {
  id: string;
  version: string;
  protocol_type: 'LONG_BUY' | 'LONG_SELL' | 'SHORT_SELL' | 'SHORT_BUY';
  symbol: string;
  confidence_score: number | null;
  entry_price: number | null;
  stop_loss: number | null;
  take_profit: number | null;
  status: 'ACTIVE' | 'EXECUTED' | 'EXPIRED' | 'CANCELLED';
  created_at: string | null;
  expires_at: string | null;
  layer_scores: LayerScores;
  timeframe: string | null;
  // Enriched trading metadata
  atr: number | null;
  risk_reward: number | null;
  eta_hours: number | null;
  regime: 'TRENDING_BULLISH' | 'TRENDING_BEARISH' | 'RANGE_BOUND' | 'VOLATILE' | 'UNKNOWN' | null;
  momentum_delta: number | null;
  volume_surge: number | null;
  projection_dates: string[];
  projection_p10: number[];
  projection_p50: number[];
  projection_p90: number[];
}

export interface LayerScores {
  trend_structure?: number;
  momentum_convergence?: number;
  multi_timeframe?: number;
  institutional_flow?: number;
  sentiment_alignment?: number;
  intermarket_filter?: number;
}

export interface Portfolio {
  id: string;
  user_id: string | null;
  format_version: string;
  holdings: Holding[];
  watchlist: string[];
  settings: PortfolioSettings;
  last_uploaded: string | null;
  monitoring_active: boolean;
}

export interface Holding {
  symbol: string;
  qty: number;
  avg_cost: number;
  strategy: 'core' | 'swing' | 'speculative';
  alerts_enabled: boolean;
  auto_optimize?: boolean;
}

export interface PortfolioSettings {
  rebalance_threshold: number;
  max_position_size: number;
  notification_preference: 'all' | 'significant_only' | 'none';
  auto_optimize?: boolean;
}

export interface LayerDrilldown {
  layer_name: string;
  symbol: string;
  schema_version: string;
  datapoints: LayerDatapoint[];
  cross_layer_impact: CrossLayerImpact[];
}

export interface LayerDatapoint {
  indicator: string;
  display_name: string;
  value_current: string;
  value_raw: {
    value: number;
    normalized: number;
  };
  historical_series: HistoricalPoint[];
}

export interface HistoricalPoint {
  ts: string;
  value: number;
  signal_contribution: number;
}

export interface CrossLayerImpact {
  target_layer: string;
  correlation_coefficient: number;
  influence_score: number;
  insight_text: string;
}

export interface User {
  username: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  bootstrapped: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  bootstrap: () => Promise<void>;
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

export interface Event {
  event_type: string;
  date: string;
  name: string;
  impact: 'high' | 'medium' | 'low';
  days_until: number;
  description: string;
}

export interface EventRiskScore {
  earnings_risk: number;
  fomc_risk: number;
  macro_risk: number;
  combined_risk: number;
  score_breakdown: Record<string, number>;
  active_events: Event[];
  event_lens_score: number;
}

export interface Recalibration {
  signal_id: string;
  symbol: string;
  original_certainty: number;
  adjusted_certainty: number;
  adjustment_reason: string;
  event_type: string;
  days_until_event: number;
  suggested_action: 'HOLD' | 'REDUCE_SIZE' | 'AVOID_NEW' | 'CLOSE_POSITION';
}

export interface XGBoostForecast {
  immediate_direction: string;
  immediate_confidence: number;
  immediate_probability: number;
  near_term_direction: string;
  near_term_confidence: number;
  near_term_probability: number;
  far_term_direction: string;
  far_term_confidence: number;
  far_term_probability: number;
  model: string;
}

export interface SignalAnalysis {
  signal_id: number;
  symbol: string;
  protocol_type: string;
  setup_type?: string;
  certainty_dial: CertaintyDial;
  lens_scores: LensScores;
  historical_stats?: HistoricalStats;
  event_risk?: EventRiskScore;
  horizons: HorizonForecast[];
  xgboost_forecast?: XGBoostForecast;
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


export interface HotItem {
  symbol: string;
  name: string;
  price: number;
  change: number;
  change_pct: number;
  volume: number;
  avg_volume: number;
  vol_ratio: number;
  vol_vs_avg: number;
  week52_high: number;
  week52_low: number;
  range_pct: number;
  market_cap_fmt: string | null;
  options: { volume: number; oi: number; signal: string } | null;
  up: boolean;
  hotness: number;
}

export interface HotData {
  high_volume: HotItem[];
  price_spike: HotItem[];
  options_flow: HotItem[];
  scanned_at: string;
}
