// PortfolioDrift — P2-6: needle angle math fixed; scale labels enlarged to 12px
interface DriftData {
  driftPct: number;
  maxDeviation: number;
  overweights: { name: string; pct: number }[];
  underweights: { name: string; pct: number }[];
}

interface PortfolioDriftProps {
  data: DriftData | null;
}

const GAUGE_CX = 100;   // SVG center x
const GAUGE_CY = 90;    // SVG center y
const GAUGE_R  = 72;    // arc track radius
const NEEDLE_R = GAUGE_R - 14;  // needle length from center to tip

// P2-6: FIXED needle math
// -10% → angle 180° (left), 0% → angle 90° (top), +10% → angle 0° (right)
// Using standard unit circle: 0° = right, 90° = up, 180° = left
function driftAngle(drift: number): number {
  // Linear map: drift [-10, 10] → angle [180, 0]
  return 180 - ((drift + 10) / 20) * 180;
}

// Needle tip position on SVG canvas
function needleTip(drift: number): { x: number; y: number } {
  const deg = driftAngle(drift);
  const rad = (deg * Math.PI) / 180;
  return {
    x: GAUGE_CX + NEEDLE_R * Math.cos(rad),
    y: GAUGE_CY - NEEDLE_R * Math.sin(rad),   // SVG y is flipped
  };
}

// Arc path helper
function arcPath(fromDeg: number, toDeg: number): string {
  const toRad = (deg: number) => (Math.PI * (180 - deg)) / 180;
  const x1 = GAUGE_CX + GAUGE_R * Math.cos(toRad(fromDeg));
  const y1 = GAUGE_CY - GAUGE_R * Math.sin(toRad(fromDeg));
  const x2 = GAUGE_CX + GAUGE_R * Math.cos(toRad(toDeg));
  const y2 = GAUGE_CY - GAUGE_R * Math.sin(toRad(toDeg));
  const large = (toDeg - fromDeg) > 90 ? 1 : 0;
  return `M ${x1} ${y1} A ${GAUGE_R} ${GAUGE_R} 0 ${large} 1 ${x2} ${y2}`;
}

const ZONES = [
  { from: -10, to: -5,  color: 'var(--red)',    label: 'Underweight' },
  { from: -5,  to: -2,  color: 'var(--yellow)', label: '' },
  { from: -2,  to:  2,  color: 'var(--green)',  label: 'On Target' },
  { from:  2,  to:  5,  color: 'var(--yellow)', label: '' },
  { from:  5,  to:  10, color: 'var(--red)',    label: 'Overweight' },
];

function driftToArc(drift: number): number {
  return 180 - ((drift + 10) / 20) * 180;
}

function buildMockData(): DriftData {
  return {
    driftPct: 2.3,
    maxDeviation: 4.1,
    overweights: [
      { name: 'Technology', pct: 3.2 },
      { name: 'Crypto',    pct: 1.9 },
    ],
    underweights: [
      { name: 'Healthcare',  pct: -2.1 },
      { name: 'Financials', pct: -1.3 },
    ],
  };
}

export function PortfolioDrift({ data }: PortfolioDriftProps) {
  const d = data ?? buildMockData();
  const drift = d.driftPct;
  const tip = needleTip(drift);

  const absDrift = Math.abs(drift);
  const driftColor = absDrift < 2 ? 'var(--green)' : absDrift < 5 ? 'var(--yellow)' : 'var(--red)';

  return (
    <div className="card" data-card="portfolio" style={{ height: '100%', minHeight: 0, overflow: 'hidden' }}>
      <div className="card-head">
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
          Portfolio Drift
        </span>
        <span className="numeric" style={{ fontSize: 12, fontWeight: 700, color: driftColor }}>
          {drift >= 0 ? '+' : ''}{drift.toFixed(1)}%
        </span>
      </div>

      <div className="card-body" style={{ padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', justifyContent: 'center', flex: '0 0 auto' }}>
          <svg viewBox="0 0 200 120" width="200" height="108" style={{ overflow: 'visible' }}>
            {/* Background track */}
            <path d={arcPath(0, 180)} fill="none" stroke="var(--border-default)" strokeWidth="14" strokeLinecap="round" />

            {/* Colored zone arcs */}
            {ZONES.map((z, i) => {
              const fromDeg = driftToArc(-z.from);
              const toDeg   = driftToArc(-z.to);
              return (
                <path
                  key={i}
                  d={arcPath(Math.min(fromDeg, toDeg), Math.max(fromDeg, toDeg))}
                  fill="none" stroke={z.color} strokeWidth="14" strokeLinecap="butt" opacity={0.7}
                />
              );
            })}

            {/* Tick marks + P2-6: scale labels enlarged to 12px (was 9px) */}
            {[-10, -5, 0, 5, 10].map(v => {
              const deg = driftToArc(v);
              const outerR = GAUGE_R + 6;
              const innerR = GAUGE_R - 2;
              const ox = GAUGE_CX + outerR * Math.cos((Math.PI * (180 - deg)) / 180);
              const oy = GAUGE_CY - outerR * Math.sin((Math.PI * (180 - deg)) / 180);
              const ix = GAUGE_CX + innerR * Math.cos((Math.PI * (180 - deg)) / 180);
              const iy = GAUGE_CY - innerR * Math.sin((Math.PI * (180 - deg)) / 180);
              // P2-6: label positioned further out, fontSize 12 (was 9)
              const labelR = GAUGE_R + 18;
              const lx = GAUGE_CX + labelR * Math.cos((Math.PI * (180 - deg)) / 180);
              const ly = GAUGE_CY - labelR * Math.sin((Math.PI * (180 - deg)) / 180) + 5;
              return (
                <g key={v}>
                  <line x1={ix} y1={iy} x2={ox} y2={oy} stroke="var(--text-secondary)" strokeWidth={v === 0 ? 2 : 1} />
                  {/* P2-6: fontSize 12 for scale labels */}
                  <text x={lx} y={ly} textAnchor="middle" fontSize="12"
                    fill="var(--text-secondary)" fontFamily="var(--font-mono)">
                    {v > 0 ? `+${v}` : v}%
                  </text>
                </g>
              );
            })}

            {/* Needle — P2-6: uses correct needleTip() coords */}
            <line
              x1={GAUGE_CX} y1={GAUGE_CY}
              x2={tip.x}    y2={tip.y}
              stroke={driftColor} strokeWidth="2.5" strokeLinecap="round"
              style={{ filter: `drop-shadow(0 0 4px ${driftColor})` }}
            />
            {/* Center hub */}
            <circle cx={GAUGE_CX} cy={GAUGE_CY} r="5" fill={driftColor} />
            <circle cx={GAUGE_CX} cy={GAUGE_CY} r="2.5" fill="var(--bg-card)" />
            {/* MAX DRIFT — P2-6: fontSize 11 (was 9) */}
            <text x={GAUGE_CX} y={GAUGE_CY + 24} textAnchor="middle" fontSize="11"
              fill="var(--text-secondary)" fontFamily="var(--font-ui)">
              MAX {d.maxDeviation.toFixed(1)}%
            </text>
          </svg>
        </div>

        {/* Deviation breakdown */}
        <div style={{ display: 'flex', flex: 1, gap: 12, minHeight: 0, overflow: 'hidden' }}>
          {d.overweights.length > 0 && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="text-2xs uppercase" style={{ color: 'var(--text-secondary)', marginBottom: 4, fontSize: 11 }}>Overweight</div>
              {d.overweights.map(o => (
                <div key={o.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                  <span className="text-xs" style={{ color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 11 }}>{o.name}</span>
                  <span className="numeric text-xs" style={{ color: 'var(--red)', flexShrink: 0, marginLeft: 4, fontSize: 11 }}>+{o.pct.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          )}
          {d.underweights.length > 0 && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="text-2xs uppercase" style={{ color: 'var(--text-secondary)', marginBottom: 4, fontSize: 11 }}>Underweight</div>
              {d.underweights.map(u => (
                <div key={u.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                  <span className="text-xs" style={{ color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 11 }}>{u.name}</span>
                  <span className="numeric text-xs" style={{ color: 'var(--green)', flexShrink: 0, marginLeft: 4, fontSize: 11 }}>{u.pct.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
