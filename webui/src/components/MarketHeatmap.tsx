// MarketHeatmap — spec v2.2 §6.9 treemap, card-nopad
// P1-1: tile area = proportional to market-cap allocation (treemap layout)
// P1-2: sector encoded as colored left-border accent; non-functional legend REMOVED
import { useState } from 'react';

interface HeatmapCell {
  symbol: string;
  name: string;
  sector: string;
  allocation: number;   // % portfolio weight — used for treemap sizing
  change: number;
  price: number;
}

const CELLS: HeatmapCell[] = [
  { symbol: 'NVDA',  name: 'NVIDIA',        sector: 'Technology', allocation: 8.2, change:  3.14, price:  875.20 },
  { symbol: 'AAPL',  name: 'Apple',         sector: 'Technology', allocation: 6.5, change:  1.24, price:  175.43 },
  { symbol: 'MSFT',  name: 'Microsoft',     sector: 'Technology', allocation: 5.8, change:  0.82, price:  418.30 },
  { symbol: 'GOOGL', name: 'Alphabet',      sector: 'Technology', allocation: 4.2, change: -0.34, price:  178.90 },
  { symbol: 'META',  name: 'Meta',          sector: 'Technology', allocation: 3.1, change:  0.87, price:  482.15 },
  { symbol: 'AMD',   name: 'AMD',           sector: 'Technology', allocation: 1.8, change: -0.94, price:  162.80 },
  { symbol: 'AMZN',  name: 'Amazon',        sector: 'Consumer',   allocation: 4.5, change:  1.82, price:  198.20 },
  { symbol: 'TSLA',  name: 'Tesla',         sector: 'Consumer',   allocation: 3.3, change: -1.52, price:  248.50 },
  { symbol: 'JPM',   name: 'JPMorgan',      sector: 'Finance',    allocation: 3.5, change: -0.52, price:  198.40 },
  { symbol: 'GS',    name: 'Goldman Sachs', sector: 'Finance',    allocation: 2.1, change:  0.21, price:  452.10 },
  { symbol: 'XOM',   name: 'Exxon Mobil',   sector: 'Energy',     allocation: 2.4, change: -1.23, price:  108.50 },
  { symbol: 'CVX',  name: 'Chevron',       sector: 'Energy',     allocation: 1.9, change: -0.88, price:  154.20 },
  { symbol: 'JNJ',   name: 'J&J',          sector: 'Healthcare', allocation: 2.8, change:  0.15, price:  152.30 },
  { symbol: 'UNH',   name: 'UnitedHealth',  sector: 'Healthcare', allocation: 2.2, change:  0.45, price:  524.80 },
  { symbol: 'BTC',   name: 'Bitcoin',        sector: 'Crypto',    allocation: 5.5, change:  2.10, price: 42150.00 },
  { symbol: 'ETH',   name: 'Ethereum',      sector: 'Crypto',     allocation: 2.8, change: -0.80, price:  2240.00 },
];

// Sector left-border accent colors — distinct from performance fill
const SECTOR_BORDER: Record<string, string> = {
  Technology: '#3b82f6',  // blue
  Consumer:   '#eab308',  // yellow
  Finance:    '#22c55e',  // green
  Energy:     '#f97316',  // orange
  Healthcare: '#a855f7',  // purple
  Crypto:     '#ef4444',  // red
};

// Fill color from change % — green/red performance encoding (kept)
function changeColor(change: number): string {
  if (change >  2)   return 'var(--hm-strong-up)';
  if (change >  0.5) return 'var(--hm-up)';
  if (change >= 0)   return 'var(--hm-flat-up)';
  if (change > -0.5) return 'var(--hm-flat-dn)';
  if (change > -2)   return 'var(--hm-dn)';
  return 'var(--hm-strong-dn)';
}

/* ─── Treemap layout ─────────────────────────────────────────────────────────
   8 equal columns (1fr each). Allocation % drives column-span.
   Buckets: allocation ≥ 6% → col-span 3 (large); 3–5.9% → col-span 2 (medium);
            < 3% → col-span 1 (small). Grid auto-rows: minmax(56px, auto).
   Row spans are uniform (1); taller cells get more room from auto-rows.
─────────────────────────────────────────────────────────────────────────────── */
function colSpan(allocation: number): number {
  if (allocation >= 6) return 3;
  if (allocation >= 3) return 2;
  return 1;
}

// Sort by allocation desc; equal-span groups maintain visual hierarchy
const sorted = [...CELLS].sort((a, b) => b.allocation - a.allocation);

// Assign col-span while maintaining visual rows that sum to 8
const withSpan = sorted.map(c => ({ ...c, _span: colSpan(c.allocation) }));

export function MarketHeatmap() {
  const [hovered, setHovered] = useState<HeatmapCell | null>(null);
  const [tooltip, setTooltip] = useState({ x: 0, y: 0 });

  return (
    <div className="card" data-card="heatmap" style={{ height: '100%', minHeight: 0, overflow: 'hidden' }}>
      <div className="card-head">
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
          Market Heatmap (by Market Cap)
        </span>
        {/* Sector legend — functional: shows what the border colors mean */}
        <div className="flex gap-2 flex-wrap justify-end">
          {Object.entries(SECTOR_BORDER).map(([sector, color]) => (
            <div key={sector} className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-sm" style={{ background: color }} />
              <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>{sector}</span>
            </div>
          ))}
        </div>
      </div>

      {/*
        P1-1: Treemap grid — 8 equal columns, allocation drives col-span.
        Rows are auto-sized so tall tiles (large col-span) get more vertical space.
        P1-2: Each tile has a 3px left-border in SECTOR_BORDER color.
      */}
      <div className="card-body" style={{ padding: '0 16px 8px', overflowY: 'auto' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(8, 1fr)',
            gridAutoRows: 'minmax(56px, auto)',
            gap: 6,
          }}
        >
          {withSpan.map(c => {
            const up = c.change >= 0;
            const borderColor = SECTOR_BORDER[c.sector] ?? '#ffffff';
            return (
              <div
                key={c.symbol}
                style={{
                  gridColumn: `span ${c._span}`,
                  background: changeColor(c.change),
                  borderRadius: 6,
                  padding: '6px 8px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  overflow: 'hidden',
                  // P1-2: sector encoded as colored left-border accent
                  borderLeft: `3px solid ${borderColor}`,
                  borderTop: `1px solid rgba(255,255,255,0.08)`,
                  borderRight: `1px solid rgba(255,255,255,0.04)`,
                  borderBottom: `1px solid rgba(0,0,0,0.2)`,
                  transition: 'border-color 0.15s',
                  minHeight: 0,
                }}
                onMouseEnter={e => {
                  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                  setTooltip({ x: rect.left + rect.width / 2, y: rect.top });
                  setHovered(c);
                }}
                onMouseLeave={() => setHovered(null)}
              >
                {/* Symbol + change% */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'white', fontFamily: 'var(--font-mono)' }}>
                    {c.symbol}
                  </span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: up ? 'var(--hm-text-up)' : 'var(--hm-text-dn)' }}>
                    {up ? '+' : ''}{c.change.toFixed(2)}%
                  </span>
                </div>

                {/* Name + price — always at bottom */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 1, marginTop: 'auto' }}>
                  <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.65)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.name}
                  </span>
                  <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.45)', fontFamily: 'var(--font-mono)' }}>
                    ${c.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tooltip */}
      {hovered && (
        <div
          style={{
            position: 'fixed',
            left: tooltip.x,
            top: tooltip.y - 10,
            transform: 'translate(-50%, -100%)',
            background: 'var(--bg-overlay)',
            border: '1px solid var(--border-default)',
            borderRadius: 6,
            padding: '8px 12px',
            pointerEvents: 'none',
            zIndex: 300,
            minWidth: 140,
            boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
          }}
        >
          <div style={{ fontWeight: 700, color: 'white', marginBottom: 4 }}>{hovered.symbol}</div>
          <div style={{ color: 'var(--text-secondary)' }}>{hovered.name}</div>
          <div style={{ fontFamily: 'var(--font-mono)', marginTop: 4 }}>
            ${hovered.price.toLocaleString()}
          </div>
          <div style={{ fontWeight: 600, marginTop: 2, color: hovered.change >= 0 ? 'var(--green)' : 'var(--red)' }}>
            {hovered.change >= 0 ? '+' : ''}{hovered.change.toFixed(2)}% today
          </div>
          <div style={{ fontSize: 10, marginTop: 4, color: 'var(--text-secondary)' }}>
            Alloc: {hovered.allocation}% · {hovered.sector}
          </div>
        </div>
      )}
    </div>
  );
}
