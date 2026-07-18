import { useEffect, useState } from 'react';
import { RefreshCw, ChevronRight, Info } from 'lucide-react';
import { api } from '../lib/api';
import type { LayerDrilldown } from '../types';

interface Layer {
  name: string;
  display_name: string;
  description: string;
}

interface LayersProps {
  preselectLayer?: 'all' | 'momentum' | 'meanreversion' | 'optionsflow' | 'macro';
}

export function Layers({ preselectLayer }: LayersProps = {}) {
  const [layers, setLayers] = useState<Layer[]>([]);
  const [selectedLayer, setSelectedLayer] = useState<string | null>(null);
  const [drilldown, setDrilldown] = useState<LayerDrilldown | null>(null);
  const [symbol, setSymbol] = useState('AAPL');
  const [loading, setLoading] = useState(true);
  const [drilldownLoading, setDrilldownLoading] = useState(false);

  useEffect(() => {
    loadLayers();
  }, []);

  /* Auto-select layer from sub-menu navigation */
  useEffect(() => {
    if (preselectLayer && layers.length > 0) {
      const layerMap: Record<string, string> = {
        momentum: 'trend_structure',
        meanreversion: 'momentum_convergence',
        optionsflow: 'institutional_flow',
        macro: 'intermarket_filter',
      };
      const target = layerMap[preselectLayer];
      if (target) {
        const found = layers.find(l => l.name === target);
        if (found) setSelectedLayer(found.name);
      }
    }
  }, [preselectLayer, layers]);

  useEffect(() => {
    if (selectedLayer) {
      loadDrilldown(selectedLayer);
    }
  }, [selectedLayer, symbol]);

  const loadLayers = async () => {
    setLoading(true);
    try {
      const data = await api.getLayers();
      setLayers(data.layers);
      if (data.layers.length > 0 && !preselectLayer) {
        setSelectedLayer(data.layers[0].name);
      }
    } catch (err) {
      console.error('Failed to load layers:', err);
    }
    setLoading(false);
  };

  const loadDrilldown = async (layerName: string) => {
    setDrilldownLoading(true);
    try {
      const data = await api.getLayerDrilldown(layerName, symbol);
      setDrilldown(data);
    } catch (err) {
      console.error('Failed to load drilldown:', err);
    }
    setDrilldownLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Layer Analysis</h1>
        <div className="flex items-center gap-4">
          <input
            type="text"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            placeholder="Symbol"
            className="w-32 px-4 py-2 bg-dark-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-primary-500"
          />
          <button
            onClick={() => selectedLayer && loadDrilldown(selectedLayer)}
            disabled={drilldownLoading}
            className="flex items-center gap-2 px-4 py-2 bg-dark-800 hover:bg-dark-700 text-slate-300 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${drilldownLoading ? 'animate-spin' : ''}`} />
            Analyze
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 space-y-2">
          {loading ? (
            <div className="bg-dark-900 border border-slate-800 rounded-xl p-4 text-slate-500">
              Loading layers...
            </div>
          ) : (
            layers.map((layer) => (
              <button
                key={layer.name}
                onClick={() => setSelectedLayer(layer.name)}
                className={`w-full flex items-center justify-between p-4 rounded-xl border transition-colors ${
                  selectedLayer === layer.name
                    ? 'bg-primary-500/10 border-primary-500/30 text-primary-400'
                    : 'bg-dark-900 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <span className="font-medium">{layer.display_name}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ))
          )}
        </div>

        <div className="lg:col-span-3">
          {drilldownLoading ? (
            <div className="bg-dark-900 border border-slate-800 rounded-xl p-12 text-center text-slate-500">
              Loading analysis...
            </div>
          ) : drilldown ? (
            <div className="space-y-6">
              <div className="bg-dark-900 border border-slate-800 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-white mb-4">
                  {drilldown.layer_name.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())} - {symbol}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {drilldown.datapoints.map((dp) => (
                    <div
                      key={dp.indicator}
                      className="bg-dark-800 rounded-lg p-4 border border-slate-700"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-sm text-slate-400">{dp.display_name}</span>
                        <Info className="w-4 h-4 text-slate-600" />
                      </div>
                      <div className="text-lg font-medium text-white">{dp.value_current}</div>
                      <div className="text-xs text-slate-500 mt-1">
                        Raw: {dp.value_raw.value.toFixed(2)} | Norm: {dp.value_raw.normalized.toFixed(3)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {drilldown.cross_layer_impact && drilldown.cross_layer_impact.length > 0 && (
                <div className="bg-dark-900 border border-slate-800 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Cross-Layer Impact</h3>
                  <div className="space-y-3">
                    {drilldown.cross_layer_impact.map((impact) => (
                      <div
                        key={impact.target_layer}
                        className="flex items-center justify-between p-3 bg-dark-800 rounded-lg"
                      >
                        <div>
                          <span className="text-sm text-slate-300 capitalize">
                            {impact.target_layer.replace('_', ' ')}
                          </span>
                          <p className="text-xs text-slate-500 mt-0.5">{impact.insight_text}</p>
                        </div>
                        <div className="text-right">
                          <div
                            className={`text-sm font-medium ${
                              impact.correlation_coefficient > 0 ? 'text-success-400' : 'text-danger-400'
                            }`}
                          >
                            {impact.correlation_coefficient > 0 ? '+' : ''}
                            {impact.correlation_coefficient.toFixed(3)}
                          </div>
                          <div className="text-xs text-slate-500">Correlation</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-dark-900 border border-slate-800 rounded-xl p-12 text-center text-slate-500">
              Select a layer to view analysis
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

