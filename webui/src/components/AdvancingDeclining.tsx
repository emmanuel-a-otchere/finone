// AdvancingDeclining — P2-2: floating "0.9" → "A/D Ratio 0.9"
export function AdvancingDeclining() {
  const adv = 38, dec = 42, neu = 20, total = adv + dec + neu;
  const ratio = (adv / dec).toFixed(1);

  return (
    <div className="card" data-card="chart-sm" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="card-head" style={{ display: 'flex', alignItems: 'center', padding: '12px 16px 8px', flexShrink: 0 }}>
        <span className="card-title">MARKET BREADTH</span>
      </div>
      <div className="card-body" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6, padding: '0 16px 12px' }}>
        {/* P2-2: labeled readout replacing floating "0.9" */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: 'var(--text-secondary)', width: 64, flexShrink: 0 }}>A/D Ratio</span>
          <div style={{ flex: 1, height: 8, background: 'var(--bg-card)', borderRadius: 4, overflow: 'hidden', display: 'flex' }}>
            <div style={{ width: (adv/total*100)+'%', background: 'var(--green)', borderRadius: '4px 0 0 4px' }} />
            <div style={{ width: (dec/total*100)+'%', background: 'var(--red)' }} />
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', width: 36, textAlign: 'right', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
            {ratio}
          </span>
        </div>
        {/* P2-3 contrast: fontSize 10→11 for legend, use text-secondary (4.7:1) */}
        <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--text-secondary)' }}>
          <span style={{ color: 'var(--green)' }}>▲ Advancing {adv}%</span>
          <span style={{ color: '#eab308' }}>— Neutral {neu}%</span>
          <span style={{ color: 'var(--red)' }}>▼ Declining {dec}%</span>
        </div>
      </div>
      <div className="card-footer" style={{ height: 28, flexShrink: 0, display: 'flex', alignItems: 'center', padding: '0 16px 12px' }}>
        <div style={{ flex: 1, height: 8, background: 'var(--bg-card)', borderRadius: 4, overflow: 'hidden', display: 'flex' }}>
          <div style={{ width: (adv/total*100)+'%', background: 'var(--green)' }} />
          <div style={{ width: (neu/total*100)+'%', background: 'var(--yellow)' }} />
          <div style={{ width: (dec/total*100)+'%', background: 'var(--red)' }} />
        </div>
      </div>
    </div>
  );
}
