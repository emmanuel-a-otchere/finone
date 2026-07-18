// TransactionsPanel — Portfolio "Transactions" tab.
// Extracted from a closure inside Portfolio.tsx that called hooks conditionally
// (rules-of-hooks violation; also crashed on tab switches).
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';

interface TransactionsPanelProps {
  selectedId: string | null;
}

export function TransactionsPanel({ selectedId }: TransactionsPanelProps) {
  const [positions, setPositions] = useState<any[]>([]);
  const [txLoading, setTxLoading] = useState(false);

  useEffect(() => {
    loadTransactions();
  }, [selectedId]);

  async function loadTransactions() {
    setTxLoading(true);
    try {
      const all = await api.getPositions();
      const txs: any[] = [];
      if (all.open) {
        all.open.forEach((p: any) => {
          txs.push({ ...p, type: 'BUY', date: p.entry_date, price: p.entry_price, pnl: p.pnl_unrealized, pnl_pct: p.pnl_unrealized_pct });
        });
      }
      if (all.closed) {
        all.closed.forEach((p: any) => {
          txs.push({ ...p, type: 'SELL', date: p.closed_at, price: p.exit_price, pnl: p.pnl_realized, pnl_pct: p.pnl_realized_pct });
        });
      }
      txs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setPositions(txs);
    } catch { /* ignore */ }
    setTxLoading(false);
  }

  if (txLoading) return (
    <div className="bg-dark-900 border border-slate-800 rounded-xl p-12 text-center text-slate-500">Loading transactions...</div>
  );

  return (
    <div className="bg-dark-900 border border-slate-800 rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Transaction History</h2>
        <span className="text-slate-500 text-sm">{positions.length} records</span>
      </div>
      {positions.length === 0 ? (
        <div className="p-12 text-center text-slate-500">No transactions yet — open positions from the Signals page.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-dark-800 text-slate-400"><tr>
              <th className="text-left px-6 py-3 font-medium">Date</th>
              <th className="text-left px-6 py-3 font-medium">Type</th>
              <th className="text-left px-6 py-3 font-medium">Symbol</th>
              <th className="text-right px-6 py-3 font-medium">Qty</th>
              <th className="text-right px-6 py-3 font-medium">Price</th>
              <th className="text-right px-6 py-3 font-medium">P&L</th>
              <th className="text-right px-6 py-3 font-medium">P&L %</th>
              <th className="text-left px-6 py-3 font-medium">Status</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-800">
              {positions.map((tx, i) => (
                <tr key={i} className="hover:bg-dark-800/50 transition-colors">
                  <td className="px-6 py-4 text-slate-400">{new Date(tx.date).toLocaleDateString()}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${tx.type === 'BUY' ? 'bg-success-500/10 text-success-400' : 'bg-danger-500/10 text-danger-400'}`}>
                      {tx.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-semibold text-white">{tx.symbol}</td>
                  <td className="px-6 py-4 text-right text-slate-300">{tx.qty}</td>
                  <td className="px-6 py-4 text-right text-slate-300">${tx.price?.toFixed(2)}</td>
                  <td className="px-6 py-4 text-right">
                    {tx.pnl != null ? <span className={tx.pnl >= 0 ? 'text-success-400' : 'text-danger-400'}>
                      {tx.pnl >= 0 ? '+' : ''}${tx.pnl.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span> : <span className="text-slate-600">—</span>}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {tx.pnl_pct != null ? <span className={tx.pnl_pct >= 0 ? 'text-success-400' : 'text-danger-400'}>
                      {tx.pnl_pct >= 0 ? '+' : ''}{tx.pnl_pct.toFixed(2)}%
                    </span> : <span className="text-slate-600">—</span>}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${tx.status === 'OPEN' ? 'bg-primary-500/10 text-primary-400' : 'bg-slate-500/10 text-slate-400'}`}>
                      {tx.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
