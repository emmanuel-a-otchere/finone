// AdvancingDeclining — Market Breadth (mockup band 1)
// 3 metric columns + stacked bar + A/D ratio with trend sparkline.
// NOTE: counts are the app's existing static values; real wiring is
// tracked under the QA epic (#14).
const SERIES = [1.8, 2.0, 1.9, 2.2, 2.4, 2.3, 2.6, 2.5, 2.8, 2.7, 3.0, 2.91];

export function AdvancingDeclining() {
  const adv = 2157, dec = 742, neu = 232, total = adv + dec + neu;
  const ratio = (adv / dec).toFixed(2);

  const sMin = Math.min(...SERIES), sMax = Math.max(...SERIES);
  const sRange = sMax - sMin || 1;
  const SW = 90, SH = 24;
  const sparkPts = SERIES.map((v, i) =>
    `${((i / (SERIES.length - 1)) * SW).toFixed(1)},${(SH - 2 - ((v - sMin) / sRange) * (SH - 4)).toFixed(1)}`
  ).join(' ');

  const metrics = [
    { label: 'Advancing', count: adv, color: 'var(--green)' },
    { label: 'Neutral', count: neu, color: 'var(--yellow)' },
    { label: 'Declining', count: dec, color: 'var(--red)' },
  ];

  return (
    <div className="card" data-card="chart-sm" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="card-head" style={{ display: 'flex', alignItems: 'center', padding: '12px 16px 8px', flexShrink: 0 }}>
        <span className="card-title">MARKET BREADTH</span>
      </div>
      <div className="card-body" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 12, padding: '0 16px 12px' }}>
        {/* 3 metric columns */}
        <div style={{ display: 'flex', gap: 8 }}>
          {metrics.map(m => (
            <div key={m.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <i style={{ width: 6, height: 6, borderRadius: '50%', background: m.color, display: 'inline-block', flexShrink: 0 }} />
                {m.label}
              </span>
              <span style={{
                fontSize: 20, fontWeight: 700, color: m.color,
                fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums',
              }}>
                {m.count.toLocaleString('en-US')}
              </span>
            </div>
          ))}
        </div>
        {/* stacked breadth bar */}
        <div style={{ height: 8, background: 'var(--bg-input)', borderRadius: 4, overflow: 'hidden', display: 'flex' }}>
          <div style={{ width: (adv / total * 100) + '%', background: 'var(--green)' }} />
          <div style={{ width: (neu / total * 100) + '%', background: 'var(--yellow)' }} />
          <div style={{ width: (dec / total * 100) + '%', background: 'var(--red)' }} />
        </div>
        {/* A/D ratio + sparkline */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
            A/D Ratio{' '}
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--green)', fontFamily: 'var(--font-mono)' }}>
              {ratio}
            </span>
          </span>
          <svg viewBox={`0 0 ${SW} ${SH}`} style={{ width: 90, height: 24, display: 'block', flexShrink: 0 }}>
            <polyline
              points={sparkPts}
              fill="none"
              stroke="var(--green)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
