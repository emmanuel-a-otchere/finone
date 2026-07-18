import { useState } from 'react';

const TABS = [
  { id: 'mylists', label: 'My Lists' },
  { id: 'shared', label: 'Shared Lists' },
  { id: 'watchlistAlerts', label: 'Alerts' },
];

export default function WatchlistPage({ activeTab = 'mylists' }: { activeTab?: string }) {
  const [tab, setTab] = useState(activeTab);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Watchlist</h1>

      <div className="flex items-center gap-1 border-b border-slate-800">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 ${
              tab === t.id
                ? 'text-accent-cyan border-accent-cyan'
                : 'text-slate-400 border-transparent hover:text-slate-200 hover:border-slate-600'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-dark-900 border border-slate-800 rounded-xl p-12 text-center">
        <div className="text-5xl mb-4">⭐</div>
        <h2 className="text-xl font-semibold text-white mb-2">
          {TABS.find(t => t.id === tab)?.label}
        </h2>
        <p className="text-slate-400 mb-4 max-w-md mx-auto">
          {tab === 'mylists' && 'Organize symbols into multiple named lists, track in real-time, and reorder.'}
          {tab === 'shared' && 'Collaborative lists shared with your team or the community.'}
          {tab === 'watchlistAlerts' && 'Set price and volume alerts for symbols in your watchlists.'}
        </p>
        <div className="inline-block px-4 py-2 bg-dark-800 rounded-lg text-slate-500 text-sm font-mono">
          Coming in v2.6.0
        </div>
      </div>
    </div>
  );
}

