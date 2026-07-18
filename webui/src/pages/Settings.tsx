import { useState, useEffect } from 'react';
import { Save, Bell, Shield, Database, Cpu, Plus, Trash2, RefreshCw, AlertCircle, Clock, Sun, Moon, Sliders } from 'lucide-react';
import { api, WatchlistItem, GenerateResponse, ExpireResponse, PendingSignal } from '../lib/api';
import { StrategySettings } from '../components/StrategySettings';

type Tab = 'notifications' | 'optimization' | 'watchlist' | 'security' | 'system' | 'strategy' | 'theme';

export function Settings() {
  const [activeTab, setActiveTab] = useState<Tab>('watchlist');
  const [notifications, setNotifications] = useState(() => {
    try { const s = JSON.parse(localStorage.getItem('systemone-notif') || '{}'); return { enabled: s.enabled ?? true, ntfyTopic: s.ntfyTopic || 'systemone-alerts', priority: s.priority || 'default', onNewSignal: s.onNewSignal ?? true, onSignalExpire: s.onSignalExpire ?? true, onPriceAlert: s.onPriceAlert ?? false }; } catch { return { enabled: true, ntfyTopic: 'systemone-alerts', priority: 'default', onNewSignal: true, onSignalExpire: true, onPriceAlert: false }; }
  });
  const [optimization, setOptimization] = useState({ autoOptimize: false, targetMetric: 'sharpe_ratio', retrainFrequency: 'daily' });

  // Watchlist state
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [pendingSignals, setPendingSignals] = useState<PendingSignal[]>([]);
  const [newSymbol, setNewSymbol] = useState('');
  const [newTimeframe, setNewTimeframe] = useState('swing');
  const [newMinConf, setNewMinConf] = useState(0);
  const [genResult, setGenResult] = useState<GenerateResponse | null>(null);
  const [expResult, setExpResult] = useState<ExpireResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [genLoading, setGenLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { loadWatchlist(); loadPending(); }, []);

  async function loadWatchlist() {
    try { setWatchlist(await api.getWatchlist()); } catch (e) { setError(String(e)); }
  }
  async function loadPending() {
    try { setPendingSignals(await api.getPendingSignals()); } catch (e) { setError(String(e)); }
  }

  async function handleAddSymbol() {
    if (!newSymbol.trim()) return;
    setLoading(true); setError(null);
    try {
      await api.addWatchlistItem({ symbol: newSymbol.trim(), timeframe: newTimeframe, min_confidence: newMinConf });
      setNewSymbol('');
      await loadWatchlist();
    } catch (e) { setError(String(e)); }
    setLoading(false);
  }

  async function handleRemove(id: string) {
    try { await api.removeWatchlistItem(id); await loadWatchlist(); } catch (e) { setError(String(e)); }
  }

  async function handleGenerate() {
    setGenLoading(true); setGenResult(null); setError(null);
    try {
      const result = await api.generateWatchlistSignals();
      setGenResult(result);
      await loadWatchlist();
      await loadPending();
    } catch (e) { setError(String(e)); }
    setGenLoading(false);
  }

  async function handleExpire() {
    setLoading(true); setExpResult(null); setError(null);
    try {
      const result = await api.expireSignalsNow();
      setExpResult(result);
      await loadPending();
    } catch (e) { setError(String(e)); }
    setLoading(false);
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'watchlist', label: 'Watchlist & Signals', icon: <RefreshCw className="w-4 h-4" /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" /> },
    { id: 'optimization', label: 'Optimization', icon: <Cpu className="w-4 h-4" /> },
    { id: 'theme', label: 'Theme', icon: <Sun className="w-4 h-4" /> },
    { id: 'security', label: 'Security', icon: <Shield className="w-4 h-4" /> },
    { id: 'strategy', label: 'Strategy', icon: <Sliders className="w-4 h-4" /> },
    { id: 'system', label: 'System', icon: <Database className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Settings</h1>

      {/* Tab Bar */}
      <div className="flex gap-2 border-b border-token pb-2 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === tab.id ? 'bg-primary-600 text-white' : 'text-slate-400 hover:text-white hover-bg-token'
            }`}
          >
            {tab.icon}{tab.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />{error}
        </div>
      )}

      {/* === WATCHLIST TAB === */}
      {activeTab === 'watchlist' && (
        <div className="space-y-6">
          {/* Add Symbol */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Add Symbol to Watchlist</h2>
            <div className="flex flex-wrap gap-3">
              <input
                value={newSymbol}
                onChange={e => setNewSymbol(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && handleAddSymbol()}
                placeholder="SYMBOL (e.g. AAPL)"
                className="w-40 px-4 py-2.5 bg-inset border border-token rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-primary-500 uppercase"
              />
              <select
                value={newTimeframe}
                onChange={e => setNewTimeframe(e.target.value)}
                className="px-4 py-2.5 bg-inset border border-token rounded-lg text-white focus:outline-none focus:border-primary-500"
              >
                <option value="day_trade">Day Trade (1h expiry)</option>
                <option value="swing">Swing (24h expiry)</option>
                <option value="position">Position (5d expiry)</option>
              </select>
              <input
                type="number"
                value={newMinConf}
                onChange={e => setNewMinConf(Number(e.target.value))}
                min={0} max={100}
                placeholder="Min conf %"
                className="w-32 px-4 py-2.5 bg-inset border border-token rounded-lg text-white focus:outline-none focus:border-primary-500"
              />
              <button
                onClick={handleAddSymbol}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />{loading ? 'Adding…' : 'Add'}
              </button>
            </div>
          </div>

          {/* Watchlist Table */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="card-title">Watchlist ({watchlist.length})</h2>
              <span className="text-xs text-slate-500">Signals auto-generate every 15 min via PM2 cron</span>
            </div>
            {watchlist.length === 0 ? (
              <div className="text-center py-8 text-slate-500">No symbols in watchlist. Add one above.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-slate-400 border-b border-token">
                      <th className="text-left py-2 px-3">Symbol</th>
                      <th className="text-left py-2 px-3">Timeframe</th>
                      <th className="text-left py-2 px-3">Min Conf</th>
                      <th className="text-left py-2 px-3">Enabled</th>
                      <th className="text-left py-2 px-3">Last Generated</th>
                      <th className="text-right py-2 px-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {watchlist.map(item => (
                      <tr key={item.id} className="border-b border-token-subtle hover-bg-token">
                        <td className="py-3 px-3 font-mono font-medium text-white">{item.symbol}</td>
                        <td className="py-3 px-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            item.timeframe === 'day_trade' ? 'bg-orange-900/40 text-orange-400' :
                            item.timeframe === 'swing' ? 'bg-blue-900/40 text-blue-400' :
                            'bg-green-900/40 text-green-400'
                          }`}>{item.timeframe.replace('_', ' ')}</span>
                        </td>
                        <td className="py-3 px-3 text-slate-300">{item.min_confidence}%</td>
                        <td className="py-3 px-3">
                          <span className={item.enabled ? 'text-success-400' : 'text-slate-600'}>{item.enabled ? 'Yes' : 'No'}</span>
                        </td>
                        <td className="py-3 px-3 text-slate-400 text-xs">
                          {item.last_generated ? new Date(item.last_generated).toLocaleString() : 'Never'}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button onClick={() => handleRemove(item.id)} className="text-red-400 hover:text-red-300 p-1">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Generate & Expire Actions */}
            <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-token">
              <button
                onClick={handleGenerate}
                disabled={genLoading}
                className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${genLoading ? 'animate-spin' : ''}`} />
                {genLoading ? 'Generating…' : 'Generate Signals Now'}
              </button>
              <button
                onClick={handleExpire}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
              >
                <Clock className="w-4 h-4" />
                {loading ? 'Expiring…' : 'Expire Past-Due Signals'}
              </button>
            </div>

            {genResult && (
              <div className={`mt-3 p-3 rounded-lg text-sm ${genResult.errors.length > 0 ? 'bg-yellow-900/30 border border-yellow-700' : 'bg-green-900/30 border border-green-700'}`}>
                <div className="text-white font-medium">Generated {genResult.generated}/{genResult.symbols.length} signals</div>
                {genResult.symbols.length > 0 && <div className="text-slate-400 mt-1">New: {genResult.symbols.join(', ')}</div>}
                {genResult.errors.length > 0 && <div className="text-yellow-400 mt-1">{genResult.errors.slice(0, 3).join('; ')}</div>}
              </div>
            )}
            {expResult && (
              <div className="mt-3 p-3 bg-green-900/30 border border-green-700 rounded-lg text-sm">
                <div className="text-white font-medium">Expired {expResult.expired} signals: {expResult.symbols.join(', ') || 'none'}</div>
              </div>
            )}
          </div>

          {/* Pending Signals */}
          {pendingSignals.length > 0 && (
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-white mb-4">
                Active Signals Awaiting Expiry ({pendingSignals.length})
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-slate-400 border-b border-token">
                      <th className="text-left py-2 px-3">Symbol</th>
                      <th className="text-left py-2 px-3">Type</th>
                      <th className="text-left py-2 px-3">Conf</th>
                      <th className="text-left py-2 px-3">Entry</th>
                      <th className="text-left py-2 px-3">Expires</th>
                      <th className="text-left py-2 px-3">Timeframe</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingSignals.map(sig => {
                      const expiresAt = sig.expires_at ? new Date(sig.expires_at) : null;
                      const isStale = expiresAt && expiresAt < new Date();
                      return (
                        <tr key={sig.id} className="border-b border-token-subtle">
                          <td className="py-3 px-3 font-mono font-medium text-white">{sig.symbol}</td>
                          <td className="py-3 px-3 text-blue-400">{sig.protocol_type}</td>
                          <td className="py-3 px-3 text-slate-300">{sig.confidence_score}%</td>
                          <td className="py-3 px-3 text-slate-300">${sig.entry_price?.toFixed(2) ?? '—'}</td>
                          <td className={`py-3 px-3 ${isStale ? 'text-red-400' : 'text-slate-400'}`}>
                            {expiresAt ? expiresAt.toLocaleString() : '—'}
                            {isStale && ' (OVERDUE)'}
                          </td>
                          <td className="py-3 px-3 text-xs">
                            <span className={`px-2 py-0.5 rounded-full ${
                              sig.timeframe === 'day_trade' ? 'bg-orange-900/40 text-orange-400' :
                              sig.timeframe === 'swing' ? 'bg-blue-900/40 text-blue-400' :
                              'bg-green-900/40 text-green-400'
                            }`}>{sig.timeframe.replace('_', ' ')}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* === NOTIFICATIONS TAB === */}
      {activeTab === 'notifications' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* NTFY Settings */}
          <div className="card p-6 space-y-6">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-primary-400" />
              <h2 className="card-title">NTFY Alerts</h2>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div><div className="text-sm font-medium text-white">Enable Notifications</div><div className="text-xs text-slate-500">Push alerts via ntfy.sh</div></div>
                <button onClick={() => setNotifications(n => ({ ...n, enabled: !n.enabled }))}
                  className={`w-12 h-6 rounded-full transition-colors ${notifications.enabled ? 'bg-primary-500' : 'bg-slate-700'}`}>
                  <div className={`w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform ${notifications.enabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">NTFY Topic</label>
                <input type="text" value={notifications.ntfyTopic}
                  onChange={e => setNotifications(n => ({ ...n, ntfyTopic: e.target.value }))}
                  placeholder="e.g. systemone-alerts"
                  className="w-full px-4 py-2.5 bg-inset border border-token rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-primary-500" />
                <div className="text-xs text-slate-600 mt-1">Subscribe at <a href="https://ntfy.sh" target="_blank" className="text-primary-400 underline">ntfy.sh</a> /{' '}<span className="text-slate-400">{notifications.ntfyTopic}</span></div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Priority</label>
                <select value={notifications.priority}
                  onChange={e => setNotifications(n => ({ ...n, priority: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-inset border border-token rounded-lg text-white focus:outline-none focus:border-primary-500">
                  <option value="default">Default</option>
                  <option value="min">Min (quiet)</option>
                  <option value="low">Low</option>
                  <option value="urgent">Urgent</option>
                  <option value="max">Max</option>
                </select>
              </div>
              <div className="flex flex-wrap gap-3 pt-2">
                <button onClick={async () => {
                  try {
                    const token = localStorage.getItem('systemone-auth') || '';
                    const r = await fetch('/api/core/alerts/test', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ ntfy_topic: notifications.ntfyTopic, priority: notifications.priority }) });
                    const d = await r.json();
                    alert(d.ok ? '✅ Test alert sent! Check ntfy.sh /' + notifications.ntfyTopic : '❌ ' + (d.error || 'Failed'));
                  } catch(e) { alert('Error: ' + e); }
                }}
                  className="px-4 py-2 bg-inset hover-bg-token text-white rounded-lg text-sm transition-colors">
                  Send Test Alert
                </button>
                <button onClick={async () => {
                  try {
                    const token = localStorage.getItem('systemone-auth') || '';
                    const r = await fetch('/api/core/alerts/history?limit=5', { headers: { Authorization: `Bearer ${token}` } });
                    const d = await r.json();
                    if (d.alerts?.length) { alert('Recent:\n' + d.alerts.map((a: any) => a.title + '\n' + a.message + '\nDelivered: ' + a.delivered).join('\n\n')); }
                    else { alert('No alerts sent yet.'); }
                  } catch(e) { alert('Error: ' + e); }
                }}
                  className="px-4 py-2 bg-inset hover-bg-token text-slate-300 rounded-lg text-sm transition-colors">
                  View History
                </button>
              </div>
            </div>
          </div>

          {/* Alert Types */}
          <div className="card p-6 space-y-6">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-primary-400" />
              <h2 className="card-title">Alert Types</h2>
            </div>
            <div className="space-y-4">
              {[{ key: 'onNewSignal', label: 'New Signal', desc: 'Alert when a new signal is generated' }, { key: 'onSignalExpire', label: 'Signal Expiry', desc: 'Alert when a signal reaches its expiration' }, { key: 'onPriceAlert', label: 'Price Alert', desc: 'Alert on significant price moves' }].map(item => (
                <div key={item.key} className="flex items-center justify-between">
                  <div><div className="text-sm font-medium text-white">{item.label}</div><div className="text-xs text-slate-500">{item.desc}</div></div>
                  <button onClick={() => setNotifications(n => ({ ...n, [item.key]: !(n as any)[item.key] }))}
                    className={`w-12 h-6 rounded-full transition-colors ${(notifications as any)[item.key] ? 'bg-primary-500' : 'bg-slate-700'}`}>
                    <div className={`w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform ${(notifications as any)[item.key] ? 'translate-x-6' : 'translate-x-0.5'}`} />
                  </button>
                </div>
              ))}
            </div>
            <button onClick={() => {
              localStorage.setItem('systemone-notif', JSON.stringify(notifications));
              alert('Settings saved to localStorage. Backend wiring required for persistent server-side alerts.');
            }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-lg font-medium transition-colors">
              <Save className="w-4 h-4" /> Save Notification Settings
            </button>
          </div>
        </div>
      )}

      {/* === OPTIMIZATION TAB === */}
      {activeTab === 'optimization' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-6">
              <Cpu className="w-5 h-5 text-primary-400" />
              <h2 className="card-title">Optimization</h2>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-white">Auto Optimize</div>
                  <div className="text-xs text-slate-500">Automatically optimize parameters</div>
                </div>
                <button onClick={() => setOptimization(o => ({ ...o, autoOptimize: !o.autoOptimize }))}
                  className={`w-12 h-6 rounded-full transition-colors ${optimization.autoOptimize ? 'bg-primary-500' : 'bg-slate-700'}`}>
                  <div className={`w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform ${optimization.autoOptimize ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Target Metric</label>
                <select value={optimization.targetMetric}
                  onChange={e => setOptimization(o => ({ ...o, targetMetric: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-inset border border-token rounded-lg text-white focus:outline-none focus:border-primary-500">
                  <option value="sharpe_ratio">Sharpe Ratio</option>
                  <option value="max_drawdown">Max Drawdown</option>
                  <option value="win_rate">Win Rate</option>
                  <option value="profit_factor">Profit Factor</option>
                  <option value="calmar_ratio">Calmar Ratio</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Retrain Frequency</label>
                <select value={optimization.retrainFrequency}
                  onChange={e => setOptimization(o => ({ ...o, retrainFrequency: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-inset border border-token rounded-lg text-white focus:outline-none focus:border-primary-500">
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* === SECURITY TAB === */}
      {activeTab === 'security' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-6">
              <Shield className="w-5 h-5 text-primary-400" />
              <h2 className="card-title">Security</h2>
            </div>
            <div className="space-y-4">
              <div className="p-4 bg-inset rounded-lg">
                <div className="text-sm font-medium text-white">Authentication</div>
                <div className="text-xs text-slate-500 mt-1">htpasswd-style file with bcrypt + JWT</div>
              </div>
              <div className="p-4 bg-inset rounded-lg">
                <div className="text-sm font-medium text-white">Session Duration</div>
                <div className="text-xs text-slate-500 mt-1">24 hours</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* === STRATEGY TAB === */}
      {activeTab === 'strategy' && <StrategySettings />}

      {/* === SYSTEM TAB === */}
      {activeTab === 'system' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-6">
              <Database className="w-5 h-5 text-primary-400" />
              <h2 className="card-title">System Info</h2>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-inset rounded-lg">
                <span className="text-sm text-slate-400">Version</span>
                <span className="text-sm font-medium text-white">1.1.0</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-inset rounded-lg">
                <span className="text-sm text-slate-400">Database</span>
                <span className="text-sm font-medium text-success-400">Connected</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-inset rounded-lg">
                <span className="text-sm text-slate-400">Signal Scheduler</span>
                <span className="text-sm font-medium text-success-400">Running (PM2)</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-inset rounded-lg">
                <span className="text-sm text-slate-400">ML Models</span>
                <span className="text-sm font-medium text-success-400">Loaded</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-inset rounded-lg">
                <span className="text-sm text-slate-400">Watchlist Symbols</span>
                <span className="text-sm font-medium text-white">{watchlist.length}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-inset rounded-lg">
                <span className="text-sm text-slate-400">Active Signals</span>
                <span className="text-sm font-medium text-white">{pendingSignals.length}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* === THEME TAB === */}
      {activeTab === 'theme' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card p-6 space-y-6">
            <div className="flex items-center gap-3">
              <Sun className="w-5 h-5 text-primary-400" />
              <h2 className="card-title">Appearance</h2>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-inset rounded-xl">
                <div className="flex items-center gap-3">
                  <Moon className="w-5 h-5 text-slate-400" />
                  <div>
                    <div className="text-sm font-medium text-white">Dark Mode</div>
                    <div className="text-xs text-slate-500">Always on (locked dark)</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500 bg-inset px-3 py-1 rounded-full border border-token">
                  Active
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-inset rounded-xl opacity-60">
                <div className="flex items-center gap-3">
                  <Sun className="w-5 h-5 text-slate-400" />
                  <div>
                    <div className="text-sm font-medium text-white">Light Mode</div>
                    <div className="text-xs text-slate-500">Coming soon</div>
                  </div>
                </div>
                <div className="text-xs text-slate-600 bg-inset px-3 py-1 rounded-full border border-token">
                  Soon
                </div>
              </div>
            </div>
            <div className="p-4 bg-primary-500/10 border border-primary-500/20 rounded-xl">
              <p className="text-xs text-primary-300">SystemOne uses a dark-first design optimized for all-day trading sessions. Light mode is planned for a future release.</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <button onClick={() => alert('General settings saved (per-tab saves handle specific sections).')}
          className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 hover:bg-primary-500 text-white font-medium rounded-lg transition-colors">
          <Save className="w-4 h-4" />Save Settings
        </button>
      </div>
    </div>
  );
}
