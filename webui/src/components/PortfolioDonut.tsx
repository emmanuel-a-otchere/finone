// PortfolioDonut — spec v2.5.0 §17.4
// P1-5: when total === 0, render empty ring + empty-state message (not teal-filled donut)
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

interface AllocationItem {
  name: string;
  amount: number;
  pct: number;
  color: string;
}

interface PortfolioSummary {
  totalValue: number;
  todayPnl: number;
  todayPnlPct: number;
  unrealizedPnl: number;
  unrealizedPnlPct: number;
  buyingPower: number;
  allocations: AllocationItem[];
}

interface PortfolioDonutProps {
  summary: PortfolioSummary | null;
}

const DONUT_COLORS = [
  'var(--donut-1)', 'var(--donut-2)', 'var(--donut-3)',
  'var(--donut-4)', 'var(--donut-5)', 'var(--donut-6)',
];

export function PortfolioDonut({ summary }: PortfolioDonutProps) {
  const data = buildData(summary);
  const isEmpty = !summary || summary.totalValue === 0;

  return (
    <div className="card" data-card="portfolio" style={{ height: '100%', minHeight: 0, overflow: 'hidden' }}>
      <div className="card-head">
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Portfolio Overview</span>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {/* P0-4: themed select — .dropdown-select (design tokens, custom chevron);
              the old inline styles referenced an undefined var(--border) */}
          <select className="dropdown-select" defaultValue="All Portfolios" aria-label="Portfolio selector">
            <option>All Portfolios</option>
            <option>Growth</option>
            <option>Income</option>
          </select>
        </div>
      </div>

      {/* P1-5: zero-balance → ONE dashed neutral ring + empty-state message + CTA
          (previously rendered two stacked rings: a recharts Pie AND a raw SVG) */}
      {isEmpty ? (
        <div className="card-body" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <svg width="130" height="130" viewBox="0 0 130 130">
            <circle cx="65" cy="65" r="52" fill="none" stroke="var(--border-default)" strokeWidth="16"/>
            <circle cx="65" cy="65" r="52" fill="none" stroke="var(--border-subtle)" strokeWidth="16" strokeDasharray="4 7"/>
            <text x="65" y="61" textAnchor="middle" fill="var(--text-secondary)" fontSize="11">Total Value</text>
            <text x="65" y="82" textAnchor="middle" fill="var(--text-primary)" fontSize="20" fontWeight="700">$0</text>
          </svg>
          <p style={{ color: 'var(--text-muted)', fontSize: 12.5, margin: '4px 0 0' }}>No holdings yet</p>
          <a href="#" style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--accent-cyan)', textDecoration: 'none' }}>Add a portfolio →</a>
        </div>
      ) : (
        <>
          <div className="card-body" style={{ padding: '0 16px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', gap: 12, flex: 1, minHeight: 0, alignItems: 'center' }}>
              <div style={{ flex: '0 0 160px', position: 'relative', height: 160 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={72} paddingAngle={2} dataKey="value" stroke="none">
                      {data.map((_entry, i) => (
                        <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} opacity={0.85} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 6, fontSize: 11, color: 'var(--text-primary)' }}
                      formatter={(value: number, name: string) => [`${Number(value).toFixed(1)}%`, name]} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                  <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Total Value</span>
                  <span style={{ fontSize: 16, fontWeight: 700, color: 'white', fontFamily: 'var(--font-mono)' }}>
                    ${(summary.totalValue / 1000).toFixed(1)}k
                  </span>
                  {summary && (
                    <span style={{ fontSize: 10, color: summary.todayPnl >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>
                      {summary.todayPnl >= 0 ? '+' : ''}{summary.todayPnlPct.toFixed(2)}%
                    </span>
                  )}
                </div>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, overflow: 'hidden', minWidth: 0 }}>
                {(summary?.allocations ?? []).map((item) => (
                  <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.name}
                    </span>
                    <span className="numeric" style={{ fontSize: 11, color: 'var(--text-primary)', flexShrink: 0, textAlign: 'right' }}>
                      ${item.amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--text-secondary)', flexShrink: 0, width: 34, textAlign: 'right' }}>
                      {item.pct.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="card-footer" style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Today&apos;s P&amp;L</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: summary.todayPnl >= 0 ? 'var(--green)' : 'var(--red)' }}>
                {summary.todayPnl >= 0 ? '+' : ''}${summary.todayPnl.toFixed(2)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Unrealized P&amp;L</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: summary.unrealizedPnl >= 0 ? 'var(--green)' : 'var(--red)' }}>
                {summary.unrealizedPnl >= 0 ? '+' : ''}${summary.unrealizedPnl.toFixed(2)} ({summary.unrealizedPnlPct.toFixed(2)}%)
              </div>
            </div>
            <div style={{ marginLeft: 'auto' }}>
              <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Buying Power</div>
              <div className="numeric" style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
                ${summary.buyingPower.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function buildData(summary: PortfolioSummary | null) {
  if (!summary) return [{ name: 'Cash', value: 100, fill: 'var(--donut-6)' }];
  return summary.allocations.map((a, i) => ({
    name: a.name,
    value: a.pct,
    fill: a.color || DONUT_COLORS[i % DONUT_COLORS.length],
  }));
}
