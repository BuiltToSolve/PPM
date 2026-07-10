'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Toast from '@/components/Toast';

export default function DebtsPage() {
  const [debts, setDebts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'unsettled', 'settled'
  const [toast, setToast] = useState('');
  const [userRole, setUserRole] = useState('admin');

  useEffect(() => {
    fetchDebts();
  }, [filter]);

  async function fetchDebts() {
    setLoading(true);
    try {
      const [res, authRes] = await Promise.all([
        fetch(`/api/debts?status=${filter}`),
        fetch('/api/auth/me')
      ]);
      const data = await res.json();
      const authData = await authRes.json();
      setDebts(data);
      setUserRole(authData.role);
    } catch (err) {
      setToast('Error loading debts');
    } finally {
      setLoading(false);
    }
  }

  async function handleSettle(saleId) {
    try {
      await fetch(`/api/daily-sales/${saleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ debtSettled: true }),
      });
      setToast('Debt marked as settled');
      // Refresh debts list
      fetchDebts();
    } catch (err) {
      setToast('Error settling debt');
    }
  }

  return (
    <div className="page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="page-title">All Debts</h1>
        <Link href="/daily-sales/report" className="btn btn-secondary btn-sm">
          Back to Reports
        </Link>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <button 
            className={`btn btn-sm ${filter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button 
            className={`btn btn-sm ${filter === 'unsettled' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilter('unsettled')}
          >
            Unsettled
          </button>
          <button 
            className={`btn btn-sm ${filter === 'settled' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilter('settled')}
          >
            Settled
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 20 }}>Loading...</div>
      ) : debts.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">💳</div>
          <div className="empty-state-text">No debts found</div>
        </div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          {debts.map((sale) => (
            <div key={sale._id} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 16px',
              borderBottom: '1px solid var(--border-light)',
              gap: 8,
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{sale.date}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    • {sale.operatorName} (Pump {sale.pumpNumber})
                  </div>
                </div>
                
                {sale.debtEntries && sale.debtEntries.length > 0 ? (
                  <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {sale.debtEntries.map((entry, idx) => (
                      <div key={idx} style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        background: 'var(--bg-secondary)',
                        padding: '4px 8px',
                        borderRadius: 4,
                        fontSize: 13
                      }}>
                        <span style={{ fontWeight: 500 }}>{entry.clientName}</span>
                        <span>₹{entry.amount.toLocaleString('en-IN')}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                    No specific client recorded
                  </div>
                )}
              </div>
              
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: sale.debtSettled ? 'var(--text-muted)' : 'var(--danger)' }}>
                  ₹{sale.debtAmount.toLocaleString('en-IN')}
                </div>
                {sale.debtSettled ? (
                  <span className="badge badge-active" style={{ marginTop: 4, display: 'inline-block' }}>Settled ✓</span>
                ) : (
                  userRole !== 'manager' && (
                    <button
                      className="btn btn-sm"
                      style={{
                        marginTop: 4,
                        fontSize: 12,
                        padding: '4px 12px',
                        background: 'var(--danger)',
                        color: 'white',
                        borderRadius: 6,
                      }}
                      onClick={() => handleSettle(sale._id)}
                    >
                      Mark Settled
                    </button>
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </div>
  );
}
