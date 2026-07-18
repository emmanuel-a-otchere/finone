import { useState } from 'react';

const PERIODS = ['1D', '1W', '1M', '3M', '1Y', 'ALL'];

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg - 90) * Math.PI / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

export function FearGreedDial() {
  const [period, setPeriod] = useState('1M');
  const value = 61;
  const label = 'Greed';
  const startAngle = -120, endAngle = 120;
  const cx = 75, cy = 75, r = 55;

  function arcDeg(s: number, e: number) {
    const sP = polarToCartesian(cx, cy, r, s), eP = polarToCartesian(cx, cy, r, e);
    const large = Math.abs(e - s) > 180 ? 1 : 0;
    return 'M ' + sP.x.toFixed(2) + ' ' + sP.y.toFixed(2) + ' A ' + r + ' ' + r + ' 0 ' + large + ' 1 ' + eP.x.toFixed(2) + ' ' + eP.y.toFixed(2);
  }

  const needleAngleDeg = startAngle + (value / 100) * (endAngle - startAngle);
  const nx = cx + 44 * Math.cos((needleAngleDeg - 90) * Math.PI / 180);
  const ny = cy + 44 * Math.sin((needleAngleDeg - 90) * Math.PI / 180);

  const colorMap: Record<string, string> = {
    'Extreme Fear': 'var(--red)', 'Fear': 'var(--orange)', 'Neutral': 'var(--yellow)',
    'Greed': 'var(--green)', 'Extreme Greed': 'var(--green)'
  };
  const color = colorMap[label] ?? '#eab308';
  const scaleLabels = [0, 25, 50, 75, 100];

  return (
    <div className="card" data-card="chart-sm" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="card-head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px 8px', flexShrink: 0 }}>
        <span className="card-title">FEAR &amp; GREED INDEX</span>
        <div style={{ display: 'flex', gap: 2 }}>
          {PERIODS.map(p => (
            <button key={p} onClick={() => setPeriod(p)} style={{
              fontSize: 10, padding: '2px 6px', borderRadius: 3, cursor: 'pointer',
              background: period === p ? 'var(--accent-cyan)' : 'transparent',
              color: period === p ? '#ffffff' : 'var(--text-muted)', border: 'none',
              fontWeight: period === p ? 600 : 400
            }}>{p}</button>
          ))}
        </div>
      </div>
      <div className="card-body" style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        <svg viewBox="0 0 150 100" width="80%" height="80%" style={{ overflow: 'visible' }}>
          <path d={arcDeg(startAngle, endAngle)} fill="none" stroke="var(--bg-card)" strokeWidth="8" />
          <path d={arcDeg(startAngle, needleAngleDeg)} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" />
          <circle cx={nx.toFixed(2)} cy={ny.toFixed(2)} r="4" fill={color} />
          <text x={cx} y={cy + 18} textAnchor="middle" fontSize="18" fontWeight="700" fill="var(--text-primary)">{value}</text>
          <text x={cx} y={cy + 32} textAnchor="middle" fontSize="9" fill={color} fontWeight={600}>{label}</text>
          {scaleLabels.map(v => {
            const a = startAngle + (v / 100) * (endAngle - startAngle);
            const lp = polarToCartesian(cx, cy, r - 14, a);
            return (
              <text key={v} x={lp.x.toFixed(2)} y={lp.y.toFixed(2)}
                textAnchor="middle" dominantBaseline="middle"
                fontSize="12" fill="var(--text-secondary)" fontFamily="var(--font-mono)">
                {v}
              </text>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
