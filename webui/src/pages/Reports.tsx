import { useState } from 'react';

const TABS = [
  { id: 'performance', label: 'Performance' },
  { id: 'portfolioRep', label: 'Portfolio' },
  { id: 'marketRep', label: 'Market' },
  { id: 'custom', label: 'Custom' },
  { id: 'scheduled', label: 'Scheduled' },
];

export default function ReportsPage({ activeTab = 'performance' }: { activeTab?: string }) {
  const [tab, setTab] = useState(activeTab);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Reports</h1>

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
        <div className="text-5xl mb-4">📋</div>
        <h2 className="text-xl font-semibold text-white mb-2">
          {TABS.find(t => t.id === tab)?.label}
        </h2>
        <p className="text-slate-400 mb-4 max-w-md mx-auto">
          {tab === 'performance' && 'Win rate, expectancy, profit factor, and trade journal analytics.'}
          {tab === 'portfolioRep' && 'Holdings summary, sector drift, P&L attribution, and export to PDF/CSV.'}
          {tab === 'marketRep' && 'Daily market snapshot: indices, sectors, Fear & Greed, and breadth.'}
          {tab === 'custom' && 'Build custom reports with drag-and-drop widgets and filters.'}
          {tab === 'scheduled' && 'Schedule automated report generation and delivery via email.'}
        </p>
        <div className="inline-block px-4 py-2 bg-inset rounded-lg text-slate-500 text-sm font-mono">
          Coming in v2.6.0
        </div>
      </div>
    </div>
  );
}
