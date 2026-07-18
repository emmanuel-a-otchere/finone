import { useState } from 'react';
import { Zap, Clock, ChevronRight, X, CheckCircle2 } from 'lucide-react';

interface OrderForm {
  symbol: string;
  side: 'BUY' | 'SELL';
  type: 'MARKET' | 'LIMIT';
  qty: number;
  price: number | null;
  signal_id?: string;
}

interface OpenPosition {
  position_id: number;
  symbol: string;
  direction: string;
  qty: number;
  entry_price: number;
  current_price: number;
  pnl_unrealized: number;
  pnl_unrealized_pct: number;
  opened_at: string;
}

const MOCK_OPEN: OpenPosition[] = [
  { position_id: 1, symbol: 'AAPL', direction: 'LONG', qty: 100, entry_price: 178.50, current_price: 182.30, pnl_unrealized: 380.00, pnl_unrealized_pct: 2.13, opened_at: '2026-05-08T10:00:00Z' },
  { position_id: 2, symbol: 'TSLA', direction: 'SHORT', qty: 50, entry_price: 175.20, current_price: 172.80, pnl_unrealized: 120.00, pnl_unrealized_pct: 1.37, opened_at: '2026-05-09T14:30:00Z' },
  { position_id: 3, symbol: 'NVDA', direction: 'LONG', qty: 30, entry_price: 870.00, current_price: 895.40, pnl_unrealized: 762.00, pnl_unrealized_pct: 2.92, opened_at: '2026-05-07T09:15:00Z' },
];

function KpiPill({ label, value, color = 'var(--text-primary)' }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '10px 16px', background: 'var(--bg-surface)', borderRadius: 8, border: '1px solid var(--border-default)', minWidth: 100 }}>
      <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-ui)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
      <span style={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-mono)', color }}>{value}</span>
    </div>
  );
}

export function Trade() {
  const [showForm, setShowForm] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState<OrderForm>({ symbol: '', side: 'BUY', type: 'MARKET', qty: 0, price: null });

  const handleSubmit = () => {
    if (!form.symbol || form.qty <= 0) return;
    setSubmitted(true);
    setTimeout(() => { setSubmitted(false); setShowForm(false); setForm({ symbol: '', side: 'BUY', type: 'MARKET', qty: 0, price: null }); }, 2000);
  };

  const totalUnrealized = MOCK_OPEN.reduce((s, p) => s + p.pnl_unrealized, 0);
  const totalUnrealizedPct = (MOCK_OPEN.reduce((s, p) => s + (p.entry_price * p.qty), 0) > 0
    ? (totalUnrealized / MOCK_OPEN.reduce((s, p) => s + (p.entry_price * p.qty), 0)) * 100 : 0);

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-ui)', color: 'var(--text-primary)', margin: 0 }}>Trade</h1>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-ui)', margin: '2px 0 0' }}>Execute orders and manage positions</p>
        </div>
        <button onClick={() => setShowForm(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'var(--accent-cyan)', border: 'none', borderRadius: 8, color: 'var(--bg-base)', cursor: 'pointer', fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 700 }}>
          <Zap size={14} /> New Order
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <KpiPill label="Open Positions" value={String(MOCK_OPEN.length)} />
        <KpiPill label="Unrealized P&L" value={(totalUnrealized >= 0 ? '+' : '') + '$' + Math.abs(totalUnrealized).toFixed(2)} color={totalUnrealized >= 0 ? 'var(--green)' : 'var(--red)'} />
        <KpiPill label="P&L %" value={(totalUnrealizedPct >= 0 ? '+' : '') + totalUnrealizedPct.toFixed(2) + '%'} color={totalUnrealizedPct >= 0 ? 'var(--green)' : 'var(--red)'} />
        <KpiPill label="Buying Power" value="$23,560.00" />
      </div>

      {/* Open Positions */}
      <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Clock size={14} style={{ color: 'var(--accent-cyan)' }} />
          <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-ui)', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Open Positions</span>
        </div>
        <div style={{ flex: 1, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
                {['Symbol', 'Dir', 'Qty', 'Entry', 'Current', 'P&L ($)', 'P&L (%)', 'Age', ''].map(h => (
                  <th key={h} style={{ padding: '8px 14px', textAlign: 'left', fontSize: 10, fontFamily: 'var(--font-ui)', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MOCK_OPEN.map((p, i) => {
                const up = p.direction === 'LONG' ? p.pnl_unrealized >= 0 : p.pnl_unrealized <= 0;
                const days = Math.round((Date.now() - new Date(p.opened_at).getTime()) / 86400000);
                return (
                  <tr key={p.position_id} style={{ borderBottom: '1px solid var(--border-default)', background: i % 2 === 0 ? 'var(--bg-card)' : 'var(--bg-surface)' }}>
                    <td style={{ padding: '10px 14px' }}><span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>{p.symbol}</span></td>
                    <td style={{ padding: '10px 14px' }}><span style={{ fontSize: 11, fontWeight: 600, color: p.direction === 'LONG' ? 'var(--green)' : 'var(--red)', fontFamily: 'var(--font-ui)' }}>{p.direction}</span></td>
                    <td style={{ padding: '10px 14px' }}><span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>{p.qty}</span></td>
                    <td style={{ padding: '10px 14px' }}><span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>${p.entry_price.toFixed(2)}</span></td>
                    <td style={{ padding: '10px 14px' }}><span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>${p.current_price.toFixed(2)}</span></td>
                    <td style={{ padding: '10px 14px' }}><span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: up ? 'var(--green)' : 'var(--red)' }}>{(p.pnl_unrealized >= 0 ? '+' : '') + '$' + Math.abs(p.pnl_unrealized).toFixed(2)}</span></td>
                    <td style={{ padding: '10px 14px' }}><span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, color: up ? 'var(--green)' : 'var(--red)' }}>{(p.pnl_unrealized >= 0 ? '+' : '') + p.pnl_unrealized_pct.toFixed(2)}%</span></td>
                    <td style={{ padding: '10px 14px' }}><span style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: 'var(--text-muted)' }}>{days}d</span></td>
                    <td style={{ padding: '10px 14px' }}>
                      <button style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 6, color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 600 }}>
                        Close <ChevronRight size={11} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(13,15,20,0.85)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={e => { if (e.target === e.currentTarget) setShowForm(false); }}>
          <div className="card" style={{ width: '100%', maxWidth: 440, padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Modal header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Zap size={16} style={{ color: 'var(--accent-cyan)' }} />
                <h2 style={{ fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-ui)', color: 'var(--text-primary)', margin: 0 }}>New Order</h2>
              </div>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 4 }}>
                <X size={16} />
              </button>
            </div>

            {submitted ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '24px 0' }}>
                <CheckCircle2 size={48} style={{ color: 'var(--green)' }} />
                <p style={{ fontFamily: 'var(--font-ui)', fontWeight: 700, color: 'var(--green)', fontSize: 15 }}>Order Submitted</p>
                <p style={{ fontFamily: 'var(--font-ui)', color: 'var(--text-muted)', fontSize: 12 }}>Your order has been placed successfully.</p>
              </div>
            ) : (
              <>
                {/* Side toggle */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {(['BUY', 'SELL'] as const).map(side => (
                    <button key={side} onClick={() => setForm(f => ({ ...f, side }))}
                      style={{ padding: '10px', borderRadius: 8, border: '1px solid', borderColor: form.side === side ? (side === 'BUY' ? 'var(--green)' : 'var(--red)') : 'var(--border-default)',
                        background: form.side === side ? (side === 'BUY' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)') : 'var(--bg-surface)',
                        color: form.side === side ? (side === 'BUY' ? 'var(--green)' : 'var(--red)') : 'var(--text-muted)',
                        cursor: 'pointer', fontFamily: 'var(--font-ui)', fontWeight: 700, fontSize: 13, transition: 'all 150ms' }}>
                      {side}
                    </button>
                  ))}
                </div>

                {/* Symbol */}
                <div>
                  <label style={{ fontSize: 11, fontFamily: 'var(--font-ui)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>Symbol</label>
                  <input value={form.symbol} onChange={e => setForm(f => ({ ...f, symbol: e.target.value.toUpperCase() }))}
                    placeholder="e.g. AAPL"
                    style={{ width: '100%', padding: '9px 12px', background: 'var(--bg-input)', border: '1px solid var(--border-default)', borderRadius: 8, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, outline: 'none', boxSizing: 'border-box' }} />
                </div>

                {/* Type */}
                <div>
                  <label style={{ fontSize: 11, fontFamily: 'var(--font-ui)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>Order Type</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {(['MARKET', 'LIMIT'] as const).map(t => (
                      <button key={t} onClick={() => setForm(f => ({ ...f, type: t }))}
                        style={{ flex: 1, padding: '8px', borderRadius: 8, border: '1px solid', borderColor: form.type === t ? 'var(--accent-cyan)' : 'var(--border-default)',
                          background: form.type === t ? 'rgba(0,229,200,0.1)' : 'var(--bg-surface)',
                          color: form.type === t ? 'var(--accent-cyan)' : 'var(--text-muted)', cursor: 'pointer', fontFamily: 'var(--font-ui)', fontWeight: 600, fontSize: 12, transition: 'all 150ms' }}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Qty */}
                <div>
                  <label style={{ fontSize: 11, fontFamily: 'var(--font-ui)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>Quantity</label>
                  <input type="number" value={form.qty || ''} onChange={e => setForm(f => ({ ...f, qty: Number(e.target.value) }))}
                    placeholder="0"
                    style={{ width: '100%', padding: '9px 12px', background: 'var(--bg-input)', border: '1px solid var(--border-default)', borderRadius: 8, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                </div>

                {/* Submit */}
                <button onClick={handleSubmit}
                  disabled={!form.symbol || form.qty <= 0}
                  style={{ padding: '11px', borderRadius: 8, border: 'none', background: (!form.symbol || form.qty <= 0) ? 'var(--bg-surface)' : 'var(--accent-cyan)',
                    color: (!form.symbol || form.qty <= 0) ? 'var(--text-muted)' : 'var(--bg-base)',
                    cursor: (!form.symbol || form.qty <= 0) ? 'not-allowed' : 'pointer',
                    fontFamily: 'var(--font-ui)', fontWeight: 700, fontSize: 13, transition: 'all 150ms' }}>
                  Place {form.side} Order
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
