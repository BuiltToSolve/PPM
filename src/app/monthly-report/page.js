'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Toast from '@/components/Toast';

export default function MonthlyReportPage() {
  const router = useRouter();
  const today = new Date();
  const todayStr = today.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

  const [startDate, setStartDate] = useState(startOfMonth);
  const [endDate, setEndDate] = useState(todayStr);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');

  async function fetchReport() {
    if (!startDate || !endDate) {
      setToast('Please select a valid date range');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/monthly-report?startDate=${startDate}&endDate=${endDate}`);
      const data = await res.json();
      setReport(data);
    } catch (err) {
      setToast('Error loading report');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="page-title">Custom Report</h1>
      </div>

      {/* Date Filter */}
      <div className="card">
        <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
          <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
            <label className="form-label">Start Date</label>
            <input
              className="form-input"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              max={todayStr}
            />
          </div>
          <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
            <label className="form-label">End Date</label>
            <input
              className="form-input"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              max={todayStr}
            />
          </div>
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
              <div className="stat-label">Total Sales ({report.daysRecorded} days)</div>
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <div className="stat-value" style={{ fontSize: 18, color: 'var(--danger)' }}>
                      ₹{report.grandDebt.toLocaleString('en-IN')}
                    </div>
                    <div className="stat-label">Total Debt</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid var(--border-light)', paddingTop: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="stat-label" style={{ fontSize: 12 }}>Settled</span>
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--success)' }}>
                        ₹{(report.grandDebt - report.grandUnsettledDebt).toLocaleString('en-IN')}
                      </span>
                    </div>
                    {report.grandUnsettledDebt > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="stat-label" style={{ fontSize: 12 }}>Unsettled</span>
                        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--warning)' }}>
                          ₹{report.grandUnsettledDebt.toLocaleString('en-IN')}
                        </span>
                      </div>
                    )}
                  </div>
                  {report.grandUnsettledDebt === 0 && report.grandDebt > 0 && (
                    <div style={{ marginTop: 2 }}>
                      <span className="badge badge-active" style={{ fontSize: 12, padding: '4px 8px' }}>All Settled ✓</span>
                    </div>
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
          <div className="section-title">Daily Breakdown</div>

          {report.dailyStats.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <div className="empty-state-text">No sales for this month</div>
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'auto' }}>
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th className="text-right">Amount</th>
                    <th className="text-right">Payments & Debt</th>
                  </tr>
                </thead>
                <tbody>
                  {report.dailyStats.map((day) => (
                    <tr 
                      key={day.date} 
                      onClick={() => router.push(`/daily-sales/report?date=${day.date}`)}
                      style={{ cursor: 'pointer' }}
                      className="hover-row"
                    >
                      <td>
                        <div style={{ fontWeight: 600 }}>{new Date(day.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</div>
                        {(day.extraIncome || 0) > 0 && (
                          <div style={{ fontSize: 11, color: 'var(--success)', marginTop: 2, fontWeight: 500 }}>
                            + Extra Received: ₹{day.extraIncome.toLocaleString('en-IN')}
                          </div>
                        )}
                        {(day.expensesTotal || 0) > 0 && (
                          <div style={{ fontSize: 11, color: 'var(--danger)', marginTop: 2, fontWeight: 500 }}>
                            - Expenses: ₹{day.expensesTotal.toLocaleString('en-IN')}
                          </div>
                        )}
                      </td>
                      <td className="text-right" style={{ fontWeight: 600 }}>
                        ₹{(day.totalAmount || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="text-right">
                        <div className="payment-badges" style={{ justifyContent: 'flex-end', marginTop: 0 }}>
                          {(day.cashAmount > 0) && <span className="payment-badge cash" style={{ padding: '4px 8px', fontSize: 12 }}>💵 ₹{day.cashAmount.toLocaleString('en-IN')}</span>}
                          {(day.digitalAmount > 0) && <span className="payment-badge digital" style={{ padding: '4px 8px', fontSize: 12 }}>📱 ₹{day.digitalAmount.toLocaleString('en-IN')}</span>}
                          {(day.hpAmount > 0) && <span className="payment-badge hp" style={{ padding: '4px 8px', fontSize: 12 }}>⛽ ₹{day.hpAmount.toLocaleString('en-IN')}</span>}
                          {(day.debtAmount > 0) && (
                            <span className={`payment-badge ${day.unsettledDebtAmount === 0 ? 'cash' : 'debt'}`} style={{ padding: '4px 8px', fontSize: 12 }}>
                              📝 {day.unsettledDebtAmount < day.debtAmount ? (
                                <>
                                  <span style={{ textDecoration: 'line-through', marginRight: 4, opacity: 0.7 }}>₹{day.debtAmount.toLocaleString('en-IN')}</span>
                                  ₹{day.unsettledDebtAmount.toLocaleString('en-IN')}
                                </>
                              ) : (
                                `₹${day.debtAmount.toLocaleString('en-IN')}`
                              )}
                            </span>
                          )}
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
                        {info.qty.toFixed(2)} {fuel.startsWith('CNG') ? 'kg' : 'L'}
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
