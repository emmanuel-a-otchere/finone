import { useState, useEffect } from 'react';
import { TickerStrip } from '../components/TickerStrip';
import { FearGreedDial } from '../components/FearGreedDial';
import { MarketSentiment } from '../components/MarketSentiment';
import { AdvancingDeclining } from '../components/AdvancingDeclining';
import { MarketTrend } from '../components/MarketTrend';
import { MarketHeatmap } from '../components/MarketHeatmap';
import { SectorPerformance } from '../components/SectorPerformance';
import { PortfolioDonut } from '../components/PortfolioDonut';
import { PortfolioDrift } from '../components/PortfolioDrift';
import { NewsFeed } from '../components/NewsFeed';
import { HotTakes } from '../components/HotTakes';
import { HotSymbols } from '../components/HotSymbols';
import { api } from '../lib/api';
import type { Signal } from '../types';

// NOTE: .dashboard-grid placement CSS lives in index.css (was previously
// injected at runtime by a local TickerStrip duplicate — now the shared
// TickerStrip component is used, which also handles index/forex formatting
// and VIX-inverted coloring).
export function Dashboard() {
  const [signals, setSignals] = useState<Signal[]>([]);

  useEffect(() => {
    api.getSignals('ACTIVE', undefined, 200)
      .then(setSignals)
      .catch(err => console.error('Failed to load signals:', err));
  }, []);

  return (
    <div className="dashboard-grid">
      <TickerStrip />
      <FearGreedDial />
      <MarketSentiment />
      <AdvancingDeclining />
      <MarketTrend />
      <HotSymbols signals={signals} />
      <HotTakes />
      <SectorPerformance />
      <NewsFeed />
      <MarketHeatmap />
      <PortfolioDonut summary={null} />
      <PortfolioDrift data={null} />
    </div>
  );
}
