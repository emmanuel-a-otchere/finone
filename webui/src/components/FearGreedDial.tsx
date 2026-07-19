// FearGreedDial — 180° semicircle gauge with 3 zones (mockup band 1)
// Zones: 0-40 Fear (red) · 40-60 Neutral (yellow) · 60-100 Greed (green)
import { useState } from 'react';

const PERIODS = ['1D', '1W', '1M', '1Y', 'ALL'];

// Zone boundaries on the 0-100 scale
const ZONES = [
  { from: 0, to: 40, color: 'var(--red)' },
  { from: 40, to: 60, color: 'var(--yellow)' },
  { from: 60, to: 100, color: 'var(--green)' },
];

const START_ANGLE = -90, END_ANGLE = 90; // semicircle, left → right
const cx = 80, cy = 78, r = 62;

function polarToCartesian(cx_: number, cy_: number, r_: number, angleDeg: number) {
  const rad = (angleDeg - 90) * Math.PI / 180;
  return { x: cx_ + r_ * Math.cos(rad), y: cy_ + r_ * Math.sin(rad) };
}

function valueToAngle(v: number) {
  return START_ANGLE + (v / 100) * (END_ANGLE - START_ANGLE);
}

function arcDeg(s: number, e: number) {
  const sP = polarToCartesian(cx, cy, r, s), eP = polarToCartesian(cx, cy, r, e);
  const large = Math.abs(e - s) > 180 ? 1 : 0;
  return `M ${sP.x.toFixed(2)} ${sP.y.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${eP.x.toFixed(2)} ${eP.y.toFixed(2)}`;
}

// Deterministic placeholder history (seeded by current value) until real
// time-series wiring lands with the QA epic (#14).
function historySeries(value: number, n = 30): number[] {
  const out: number[] = [];
  let h = (value * 2654435761) >>> 0;
  let v = value - 6;
  for (let i = 0; i < n; i++) {
    h = (h * 1103515245 + 12345) >>> 0;
    v += ((h % 1000) / 1000 - 0.48) * 4;
    v = Math.max(5, Math.min(95, v));
    out.push(v);
  }
  out[n - 1] = value;
  return out;
}

export function FearGreedDial() {
  const [period, setPeriod] = useState('1M');
  const value = 61;
  const label = 'Greed';

  const colorMap: Record<string, string> = {
    'Extreme Fear': 'var(--red)', 'Fear': 'var(--red)', 'Neutral': 'var(--yellow)',
    'Greed': 'var(--green)', 'Extreme Greed': 'var(--green)',
  };
  const color = colorMap[label] ?? 'var(--yellow)';
  const scaleLabels = [0, 25, 50, 75, 100];

  const needleAngle = valueToAngle(value);
  const needleTip = polarToCartesian(cx, cy, r - 14, needleAngle);

  const series = historySeries(value);
  const sMin = Math.min(...series), sMax = Math.max(...series);
  const sRange = sMax - sMin || 1;
  const SW = 220, SH = 36;
  const sparkPts = series.map((v, i) =>
    `${((i / (series.length - 1)) * SW).toFixed(1)},${(SH - 3 - ((v - sMin) / sRange) * (SH - 6)).toFixed(1)}`
  ).join(' ');

  return (
    <div className="card" data-card="chart-sm" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="card-head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px 8px', flexShrink: 0 }}>
        <span className="card-title">FEAR &amp; GREED INDEX</span>
      </div>
      <div className="card-body" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 16px', gap: 4 }}>
        <svg viewBox="0 0 160 96" width="88%" style={{ overflow: 'visible', display: 'block' }}>
          {/* zone arcs */}
          {ZONES.map(z => (
            <path
              key={z.from}
              d={arcDeg(valueToAngle(z.from) + 0.6, valueToAngle(z.to) - 0.6)}
              fill="none"
              stroke={z.color}
              strokeWidth="9"
              strokeLinecap="round"
              opacity={value >= z.from && value <= z.to ? 1 : 0.35}
            />
          ))}
          {/* needle */}
          <line
            x1={cx} y1={cy}
            x2={needleTip.x.toFixed(2)} y2={needleTip.y.toFixed(2)}
            stroke="var(--text-primary)"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx={cx} cy={cy} r="3.5" fill="var(--text-primary)" />
          {/* value + label — paintOrder halo keeps text readable over the needle */}
          <text
            x={cx} y={cy - 22} textAnchor="middle"
            fontSize="22" fontWeight="700" fill="var(--text-primary)"
            fontFamily="var(--font-mono)"
            paintOrder="stroke" stroke="var(--bg-card)" strokeWidth="6"
          >
            {value}
          </text>
          <text
            x={cx} y={cy - 8} textAnchor="middle"
            fontSize="10" fontWeight="600" fill={color}
            paintOrder="stroke" stroke="var(--bg-card)" strokeWidth="4"
          >
            {label}
          </text>
          {/* scale labels */}
          {scaleLabels.map(v => {
            const lp = polarToCartesian(cx, cy, r + 11, valueToAngle(v));
            return (
              <text
                key={v} x={lp.x.toFixed(2)} y={lp.y.toFixed(2)}
                textAnchor="middle" dominantBaseline="middle"
                fontSize="8" fill="var(--text-muted)" fontFamily="var(--font-mono)"
              >
                {v}
              </text>
            );
          })}
        </svg>
        {/* history sparkline */}
        <svg viewBox={`0 0 ${SW} ${SH}`} style={{ width: '100%', height: 36, display: 'block', flexShrink: 0 }}>
          <polyline
            points={sparkPts}
            fill="none"
            stroke="var(--accent-cyan)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <div className="card-footer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, flexShrink: 0 }}>
        {PERIODS.map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            style={{
              fontSize: 10, padding: '3px 10px', borderRadius: 'var(--radius-pill)', cursor: 'pointer',
              background: period === p ? 'var(--primary-15)' : 'transparent',
              color: period === p ? 'var(--accent-cyan)' : 'var(--text-muted)',
              border: period === p ? '1px solid var(--primary-30)' : '1px solid transparent',
              fontWeight: period === p ? 600 : 400,
              fontFamily: 'var(--font-ui)',
            }}
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}
