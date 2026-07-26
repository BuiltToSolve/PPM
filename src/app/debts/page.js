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

  async function handleSettleEntry(saleId, index) {
    try {
      await fetch(`/api/daily-sales/${saleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settleDebtEntryIndex: index }),
      });
      setToast('Debt entry settled');
      fetchDebts();
    } catch (err) {
      setToast('Error settling debt entry');
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">All Debts</h1>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
          {debts.map((sale) => (
            <div key={sale._id} style={{
              padding: 14,
              borderRadius: 8,
              border: `1px solid ${sale.debtSettled ? 'rgba(64, 192, 87, 0.3)' : 'rgba(250, 82, 82, 0.3)'}`,
              background: sale.debtSettled ? 'rgba(64, 192, 87, 0.05)' : 'rgba(250, 82, 82, 0.05)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: sale.debtEntries?.length > 0 ? 12 : 0 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>
                    {sale.operatorName} <span style={{ fontWeight: 400, color: 'var(--text-secondary)' }}>(Pump {sale.pumpNumber})</span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
                    {new Date(sale.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    {sale.fuelType && ` · ${sale.fuelType}`}
                  </div>
                </div>
                
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: sale.debtSettled ? 'var(--success)' : 'var(--danger)' }}>
                    Debt: ₹{sale.debtAmount.toLocaleString('en-IN')}
                  </div>
                  {sale.debtSettled ? (
                    <span className="badge badge-active" style={{ marginTop: 4 }}>Settled ✓</span>
                  ) : (
                    userRole !== 'manager' && (
                      <button
                        className="btn btn-sm btn-outline"
                        style={{
                          marginTop: 4,
                          fontSize: 12,
                          padding: '3px 10px',
                          borderColor: 'var(--danger)',
                          color: 'var(--danger)',
                          background: 'white'
                        }}
                        onClick={() => handleSettle(sale._id)}
                      >
                        {sale.debtEntries && sale.debtEntries.length > 0 ? 'Settle All' : 'Mark Settled'}
                      </button>
                    )
                  )}
                </div>
              </div>

              {sale.debtEntries && sale.debtEntries.length > 0 ? (
                <div style={{ fontSize: 13, borderTop: '1px dashed rgba(0,0,0,0.1)', paddingTop: 10 }}>
                  {sale.debtEntries.map((entry, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ textDecoration: entry.settled ? 'line-through' : 'none', color: entry.settled ? 'var(--success)' : 'var(--text-primary)', fontWeight: 500 }}>
                        {entry.clientName}: ₹{entry.amount.toLocaleString('en-IN')}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {!entry.settled && !sale.debtSettled && userRole !== 'manager' && (
                          <button
                            className="btn btn-sm btn-outline"
                            style={{ fontSize: 11, padding: '2px 8px', background: 'white' }}
                            onClick={() => handleSettleEntry(sale._id, idx)}
                          >
                            Settle
                          </button>
                        )}
                        {entry.settled && (
                          <span style={{ fontSize: 11, color: 'var(--success)', fontWeight: 600 }}>✓</span>
                        )}
                      </div>
                    </div>
                  ))}
                  {!sale.debtSettled && (
                    <div style={{ fontSize: 13, fontWeight: 600, marginTop: 4, color: 'var(--danger)', textAlign: 'right' }}>
                      Remaining: ₹{sale.debtEntries.reduce((sum, e) => sum + (e.settled ? 0 : (e.amount || 0)), 0).toLocaleString('en-IN')}
                    </div>
                  )}
                </div>
              ) : (
                !sale.debtSettled && (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', borderTop: '1px dashed rgba(0,0,0,0.1)', paddingTop: 6 }}>
                    No specific client recorded
                  </div>
                )
              )}
            </div>
          ))}
        </div>
      )}

      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </div>
  );
}
