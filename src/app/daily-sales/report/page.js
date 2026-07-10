'use client';

import { useState } from 'react';
import Link from 'next/link';
import Toast from '@/components/Toast';

export default function ReportPage() {
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

  const [date, setDate] = useState(todayStr);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');
  const [userRole, setUserRole] = useState('admin');

  async function fetchReport() {
    if (!date) {
      setToast('Please select a date');
      return;
    }
    setLoading(true);
    try {
      const [res, authRes] = await Promise.all([
        fetch(`/api/report?date=${date}`),
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

  return (
    <div className="page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="page-title">Sales Report</h1>
        <Link href="/debts" className="btn btn-secondary btn-sm">
          View All Debts
        </Link>
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
          onClick={fetchReport}
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
            {report.grandDebt > 0 && (
              <div className="stat-card full-width">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
                <div className="stat-label">Total Extra Income</div>
              </div>
            )}
          </div>

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
                    <th className="text-right">Cash</th>
                    <th className="text-right">Digital</th>
                    <th className="text-right">Debt</th>
                  </tr>
                </thead>
                <tbody>
                  {report.sales.map((sale) => (
                    <tr key={sale._id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{sale.operatorName}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          Pump {sale.pumpNumber} · {sale.fuelType}
                        </div>
                        {(sale.extraIncome || 0) > 0 && (
                          <div style={{ fontSize: 11, color: 'var(--success)', marginTop: 2, fontWeight: 500 }}>
                            + Extra Income: ₹{sale.extraIncome.toLocaleString('en-IN')}
                          </div>
                        )}
                      </td>
                      <td className="text-right" style={{ fontWeight: 600 }}>
                        ₹{(sale.totalAmount || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="text-right" style={{ color: 'var(--success)' }}>
                        ₹{(sale.cashAmount || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="text-right" style={{ color: 'var(--accent)' }}>
                        ₹{(sale.digitalAmount || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="text-right" style={{ color: !sale.debtSettled && sale.debtAmount > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
                        {sale.debtAmount > 0 ? `₹${sale.debtAmount.toLocaleString('en-IN')}` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td>Total</td>
                    <td className="text-right">₹{report.grandTotal.toLocaleString('en-IN')}</td>
                    <td className="text-right">₹{report.grandCash.toLocaleString('en-IN')}</td>
                    <td className="text-right">₹{report.grandDigital.toLocaleString('en-IN')}</td>
                    <td className="text-right" style={{ color: 'var(--danger)' }}>
                      {report.grandDebt > 0 ? `₹${report.grandDebt.toLocaleString('en-IN')}` : '—'}
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
              <div className="card" style={{ marginBottom: 10 }}>
                {report.debtSales.map((ds) => (
                  <div key={ds._id} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 0',
                    borderBottom: '1px solid var(--border-light)',
                    gap: 8,
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{ds.operatorName}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                        Pump {ds.pumpNumber} · {ds.fuelType} · Sale: ₹{ds.totalAmount?.toLocaleString('en-IN')}
                      </div>
                      {ds.debtEntries && ds.debtEntries.length > 0 && (
                        <div style={{ fontSize: 12, color: 'var(--text)', marginTop: 4 }}>
                          {ds.debtEntries.map((entry, idx) => (
                            <div key={idx}>• {entry.clientName}: ₹{entry.amount.toLocaleString('en-IN')}</div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: ds.debtSettled ? 'var(--text-muted)' : 'var(--danger)' }}>
                        ₹{ds.debtAmount.toLocaleString('en-IN')}
                      </div>
                      {ds.debtSettled ? (
                        <span className="badge badge-active" style={{ marginTop: 4 }}>Settled ✓</span>
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
                            onClick={() => handleSettle(ds._id)}
                          >
                            Mark Settled
                          </button>
                        )
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Fuel-wise details */}
          {Object.keys(report.fuelBreakdown).length > 0 && (
            <>
              <div className="section-title">Fuel-wise Details</div>
              <div className="card" style={{ marginBottom: 10 }}>
                {Object.entries(report.fuelBreakdown).map(([fuel, info]) => (
                  <div key={fuel} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '6px 0',
                    borderBottom: '1px solid var(--border-light)',
                  }}>
                    <div>
                      <div style={{ fontWeight: 500 }}>{fuel}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>
                        {info.qty.toFixed(2)} {fuel === 'CNG' ? 'kg' : 'L'} x ₹{info.rate}/{fuel === 'CNG' ? 'kg' : 'L'}
                      </div>
                    </div>
                    <span style={{ fontWeight: 600, color: 'var(--accent)' }}>
                      ₹{info.amount.toLocaleString('en-IN')}
                    </span>
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
