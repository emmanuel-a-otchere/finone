import { useState } from 'react';

const TABS = [
  { id: 'active', label: 'Active Alerts' },
  { id: 'triggered', label: 'Triggered' },
  { id: 'price', label: 'Price Alerts' },
  { id: 'volume', label: 'Volume Alerts' },
];

export default function AlertsPage({ activeTab = 'active' }: { activeTab?: string }) {
  const [tab, setTab] = useState(activeTab);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Alerts</h1>

      <div className="flex items-center gap-1 border-b border-token">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 ${
              tab === t.id
                ? 'text-accent-cyan border-accent-cyan'
                : 'text-slate-400 border-transparent hover:text-slate-200 hover:border-strong'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="card p-12 text-center items-center">
        <div className="text-5xl mb-4">🔔</div>
        <h2 className="text-xl font-semibold text-white mb-2">
          {TABS.find(t => t.id === tab)?.label}
        </h2>
        <p className="text-slate-400 mb-4 max-w-md mx-auto">
          {tab === 'active' && 'View and manage all pending alerts. Enable, disable, or edit thresholds.'}
          {tab === 'triggered' && 'History of fired alerts with timestamps, outcomes, and notes.'}
          {tab === 'price' && 'Create price-based alerts: above, below, or crossing a target level.'}
          {tab === 'volume' && 'Set volume spike alerts for unusual trading activity detection.'}
        </p>
        <div className="inline-block px-4 py-2 bg-inset rounded-lg text-slate-500 text-sm font-mono">
          Coming in v2.6.0
        </div>
      </div>
    </div>
  );
}
