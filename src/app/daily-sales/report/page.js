'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Toast from '@/components/Toast';

function ReportContent() {
  const searchParams = useSearchParams();
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  
  const queryDate = searchParams.get('date');
  const [date, setDate] = useState(queryDate || todayStr);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');
  const [userRole, setUserRole] = useState('admin');

  async function fetchReport(targetDate = date) {
    if (!targetDate) {
      setToast('Please select a date');
      return;
    }
    setLoading(true);
    try {
      const [res, authRes] = await Promise.all([
        fetch(`/api/report?date=${targetDate}`),
        fetch('/api/auth/me')
      ]);
      const data = await res.json();
      const authData = await authRes.json();
      setReport(data);
      setUserRole(authData.role);
    } catch (err) {
      setToast('Error loading report');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (queryDate) {
      fetchReport(queryDate);
    }
  }, [queryDate]);

  async function handleSettle(saleId) {
    try {
      await fetch(`/api/daily-sales/${saleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ debtSettled: true }),
      });
      setToast('Debt marked as settled');
      // Refresh report
      fetchReport();
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
      fetchReport();
    } catch (err) {
      setToast('Error settling debt entry');
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Sales Report</h1>
      </div>

      {/* Date Filter */}
      <div className="card">
        <div className="form-group">
          <label className="form-label">Date</label>
          <input
            className="form-input"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            max={todayStr}
          />
        </div>
        <button
          className="btn btn-primary btn-block"
          onClick={() => fetchReport(date)}
          disabled={loading}
          style={{ marginTop: 4 }}
        >
          {loading ? 'Loading...' : 'Generate Report'}
        </button>
      </div>

      {/* Report Results */}
      {report && (
        <>
          {/* Grand Totals */}
          <div className="stats-grid">
            <div className="stat-card accent full-width">
              <div className="stat-value">₹{report.grandTotal.toLocaleString('en-IN')}</div>
              <div className="stat-label">Total Sales ({report.totalEntries} entries)</div>
            </div>
            <div className="stat-card">
              <div className="stat-value" style={{ fontSize: 18, color: 'var(--success)' }}>
                ₹{report.grandCash.toLocaleString('en-IN')}
              </div>
              <div className="stat-label">Cash</div>
            </div>
            <div className="stat-card">
              <div className="stat-value" style={{ fontSize: 18, color: 'var(--accent)' }}>
                ₹{report.grandDigital.toLocaleString('en-IN')}
              </div>
              <div className="stat-label">Digital</div>
            </div>
            <div className="stat-card">
              <div className="stat-value" style={{ fontSize: 18, color: 'var(--accent-alt, #007aff)' }}>
                ₹{report.grandHp?.toLocaleString('en-IN') || 0}
              </div>
              <div className="stat-label">HP</div>
            </div>
            {report.grandDebt > 0 && (
              <div className="stat-card">
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div>
                    <div className="stat-value" style={{ fontSize: 18, color: 'var(--danger)' }}>
                      ₹{report.grandDebt.toLocaleString('en-IN')}
                    </div>
                    <div className="stat-label">Total Debt</div>
                  </div>
                  {report.grandUnsettledDebt > 0 && (
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--warning)' }}>
                        ₹{report.grandUnsettledDebt.toLocaleString('en-IN')}
                      </div>
                      <div className="stat-label">Unsettled</div>
                    </div>
                  )}
                  {report.grandUnsettledDebt === 0 && report.grandDebt > 0 && (
                    <span className="badge badge-active" style={{ fontSize: 13, padding: '5px 12px' }}>All Settled ✓</span>
                  )}
                </div>
              </div>
            )}
            {report.grandExtraIncome > 0 && (
              <div className="stat-card full-width">
                <div className="stat-value" style={{ fontSize: 18, color: 'var(--success)' }}>
                  ₹{report.grandExtraIncome.toLocaleString('en-IN')}
                </div>
                <div className="stat-label">Total Extra Received</div>
              </div>
            )}
            {report.grandExpenses > 0 && (
              <div className="stat-card full-width">
                <div className="stat-value" style={{ fontSize: 18, color: 'var(--danger)' }}>
                  ₹{report.grandExpenses.toLocaleString('en-IN')}
                </div>
                <div className="stat-label">Total Shift Expenses</div>
              </div>
            )}
          </div>

          {/* CNG Payments Summary */}
          {report.cngSummary && report.cngSummary.totalAmount > 0 && (
            <>
              <div className="section-title">CNG Payments Summary</div>
              <div className="stats-grid" style={{ marginBottom: 24 }}>
                <div className="stat-card accent full-width">
                  <div className="stat-value">₹{report.cngSummary.totalAmount.toLocaleString('en-IN')}</div>
                  <div className="stat-label">Total CNG Sales</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value" style={{ fontSize: 18, color: 'var(--success)' }}>
                    ₹{report.cngSummary.cash.toLocaleString('en-IN')}
                  </div>
                  <div className="stat-label">Cash</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value" style={{ fontSize: 18, color: 'var(--accent)' }}>
                    ₹{report.cngSummary.digital.toLocaleString('en-IN')}
                  </div>
                  <div className="stat-label">Digital</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value" style={{ fontSize: 18, color: 'var(--accent-alt, #007aff)' }}>
                    ₹{report.cngSummary.hp.toLocaleString('en-IN')}
                  </div>
                  <div className="stat-label">HP</div>
                </div>
                {report.cngSummary.debt > 0 && (
                  <div className="stat-card">
                    <div className="stat-value" style={{ fontSize: 18, color: 'var(--danger)' }}>
                      ₹{report.cngSummary.debt.toLocaleString('en-IN')}
                    </div>
                    <div className="stat-label">Total Debt</div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Daily Breakdown -> Sale Entries */}
          <div className="section-title">Sales Entries</div>

          {report.sales.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <div className="empty-state-text">No sales on this date</div>
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'auto' }}>
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Details</th>
                    <th className="text-right">Amount</th>
                    <th className="text-right">Payments & Debt</th>
                  </tr>
                </thead>
                <tbody>
                  {report.sales.map((sale) => (
                    <tr key={sale._id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{sale.operatorName}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {sale.pumpNumber === 5 ? 'CNG' : `Pump ${sale.pumpNumber}`} · {sale.fuelType}
                        </div>
                        {(sale.extraIncome || 0) > 0 && (
                          <div style={{ fontSize: 11, color: 'var(--success)', marginTop: 2, fontWeight: 500 }}>
                            + Extra Received: ₹{sale.extraIncome.toLocaleString('en-IN')}
                          </div>
                        )}
                        {(sale.expensesTotal || 0) > 0 && (
                          <div style={{ fontSize: 11, color: 'var(--danger)', marginTop: 2, fontWeight: 500 }}>
                            - Expenses: ₹{sale.expensesTotal.toLocaleString('en-IN')}
                            {sale.expenses && sale.expenses.length > 0 && (
                              <div style={{ paddingLeft: 8, marginTop: 2, color: 'var(--text-muted)' }}>
                                {sale.expenses.map((e, idx) => (
                                  <div key={idx}>{e.description}: ₹{e.amount}</div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="text-right" style={{ fontWeight: 600 }}>
                        ₹{(sale.totalAmount || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="text-right">
                        <div className="payment-badges" style={{ justifyContent: 'flex-end', marginTop: 0 }}>
                          {(sale.cashAmount > 0) && <span className="payment-badge cash" style={{ padding: '4px 8px', fontSize: 12 }}>💵 ₹{sale.cashAmount.toLocaleString('en-IN')}</span>}
                          {(sale.digitalAmount > 0) && <span className="payment-badge digital" style={{ padding: '4px 8px', fontSize: 12 }}>📱 ₹{sale.digitalAmount.toLocaleString('en-IN')}</span>}
                          {(sale.hpAmount > 0) && <span className="payment-badge hp" style={{ padding: '4px 8px', fontSize: 12 }}>⛽ ₹{sale.hpAmount.toLocaleString('en-IN')}</span>}
                          {(sale.debtAmount > 0) && <span className={`payment-badge ${sale.debtSettled ? 'cash' : 'debt'}`} style={{ padding: '4px 8px', fontSize: 12 }}>📝 ₹{sale.debtAmount.toLocaleString('en-IN')}</span>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td>Total</td>
                    <td className="text-right" style={{ fontWeight: 700 }}>₹{report.grandTotal.toLocaleString('en-IN')}</td>
                    <td className="text-right">
                      <div className="payment-badges" style={{ justifyContent: 'flex-end', marginTop: 0 }}>
                        <span className="payment-badge cash" style={{ padding: '4px 8px', fontSize: 12 }}>💵 ₹{report.grandCash.toLocaleString('en-IN')}</span>
                        <span className="payment-badge digital" style={{ padding: '4px 8px', fontSize: 12 }}>📱 ₹{report.grandDigital.toLocaleString('en-IN')}</span>
                        <span className="payment-badge hp" style={{ padding: '4px 8px', fontSize: 12 }}>⛽ ₹{(report.grandHp || 0).toLocaleString('en-IN')}</span>
                        {report.grandDebt > 0 && <span className="payment-badge debt" style={{ padding: '4px 8px', fontSize: 12 }}>📝 ₹{report.grandDebt.toLocaleString('en-IN')}</span>}
                      </div>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* Debt Details with Settle Buttons */}
          {report.debtSales.length > 0 && (
            <>
              <div className="section-title">Debt Details</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
                {report.debtSales.map((ds) => (
                  <div key={ds._id} style={{
                    padding: 12,
                    borderRadius: 8,
                    border: `1px solid ${ds.debtSettled ? 'rgba(64, 192, 87, 0.3)' : 'rgba(250, 82, 82, 0.3)'}`,
                    background: ds.debtSettled ? 'rgba(64, 192, 87, 0.05)' : 'rgba(250, 82, 82, 0.05)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: ds.debtEntries?.length > 0 ? 12 : 0 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{ds.operatorName}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                          {ds.pumpNumber === 5 ? 'CNG' : `Pump ${ds.pumpNumber}`} · {ds.fuelType} · Sale: ₹{ds.totalAmount?.toLocaleString('en-IN')}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: ds.debtSettled ? 'var(--success)' : 'var(--danger)' }}>
                          Debt: ₹{ds.debtAmount.toLocaleString('en-IN')}
                        </div>
                        {ds.debtSettled ? (
                          <span className="badge badge-active" style={{ marginTop: 4 }}>Settled ✓</span>
                        ) : (
                          userRole !== 'manager' && (
                            <button
                              className="btn btn-sm btn-outline"
                              style={{
                                marginTop: 4,
                                fontSize: 11,
                                padding: '3px 8px',
                                borderColor: 'var(--danger)',
                                color: 'var(--danger)',
                                background: 'white'
                              }}
                              onClick={() => handleSettle(ds._id)}
                            >
                              {ds.debtEntries && ds.debtEntries.length > 0 ? 'Settle All' : 'Mark Settled'}
                            </button>
                          )
                        )}
                      </div>
                    </div>

                    {ds.debtEntries && ds.debtEntries.length > 0 && (
                      <div style={{ fontSize: 13, borderTop: '1px dashed rgba(0,0,0,0.1)', paddingTop: 8 }}>
                        {ds.debtEntries.map((entry, idx) => (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, paddingBottom: 6 }}>
                            <span style={{ textDecoration: entry.settled ? 'line-through' : 'none', color: entry.settled ? 'var(--success)' : 'var(--text-primary)', fontWeight: 500 }}>
                              {entry.clientName}: ₹{entry.amount.toLocaleString('en-IN')}
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              {!entry.settled && !ds.debtSettled && userRole !== 'manager' && (
                                <button
                                  className="btn btn-sm btn-outline"
                                  style={{ fontSize: 11, padding: '2px 8px', background: 'white' }}
                                  onClick={() => handleSettleEntry(ds._id, idx)}
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
                        {!ds.debtSettled && ds.debtEntries && ds.debtEntries.length > 0 && (
                          <div style={{ fontSize: 12, fontWeight: 600, marginTop: 4, color: 'var(--danger)' }}>
                            Pending: ₹{ds.debtEntries.reduce((sum, e) => sum + (e.settled ? 0 : (e.amount || 0)), 0).toLocaleString('en-IN')}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Fuel-wise details */}
          {Object.keys(report.fuelBreakdown).length > 0 && (
            <>
              <div className="section-title">Fuel-wise Details</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
                {Object.entries(report.fuelBreakdown).map(([fuel, info]) => (
                  <div key={fuel} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 16px',
                    borderRadius: 8,
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-light)',
                  }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-primary)' }}>{fuel}</div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 2 }}>
                        {info.qty.toFixed(2)} {fuel.startsWith('CNG') ? 'kg' : 'L'} <span style={{ color: 'var(--text-muted)' }}>@</span> ₹{info.rate}/{fuel.startsWith('CNG') ? 'kg' : 'L'}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 2 }}>Total Amount</div>
                      <span style={{ fontWeight: 700, color: 'var(--accent)', fontSize: 15 }}>
                        ₹{info.amount.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </div>
  );
}

export default function ReportPage() {
  return (
    <Suspense fallback={<div className="page"><div className="loading">Loading...</div></div>}>
      <ReportContent />
    </Suspense>
  );
}
