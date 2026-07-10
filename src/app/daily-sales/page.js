'use client';

import { useState, useEffect, useCallback } from 'react';
import Modal from '@/components/Modal';
import Toast from '@/components/Toast';

const PUMP_CONFIG = [
  { pumpNumber: 1, name: 'Pump 1', fuelTypes: ['Petrol', 'Diesel'] },
  { pumpNumber: 2, name: 'Pump 2', fuelTypes: ['Petrol', 'Diesel'] },
  { pumpNumber: 3, name: 'Pump 3', fuelTypes: ['Petrol', 'Premium Petrol'] },
  { pumpNumber: 4, name: 'Pump 4', fuelTypes: ['Petrol', 'Premium Petrol'] },
  { pumpNumber: 5, name: 'Pump 5', fuelTypes: ['CNG'] },
];

export default function DailySalesPage() {
  const [sales, setSales] = useState([]);
  const [operators, setOperators] = useState([]);
  const [fuelRates, setFuelRates] = useState({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSale, setEditingSale] = useState(null);
  const [toast, setToast] = useState('');

  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [userRole, setUserRole] = useState('admin');

  // Form state
  const [formData, setFormData] = useState({
    operatorId: '',
    operatorName: '',
    pumpNumber: '',
    fuels: {},
    cashAmount: '',
    digitalAmount: '',
    debtEntries: [],
  });

  const fetchAll = useCallback(async () => {
    try {
      const [salesRes, opsRes, ratesRes, authRes] = await Promise.all([
        fetch(`/api/daily-sales?date=${selectedDate}`),
        fetch('/api/operators'),
        fetch('/api/fuel-rates'),
        fetch('/api/auth/me'),
      ]);
      const salesData = await salesRes.json();
      const opsData = await opsRes.json();
      const ratesData = await ratesRes.json();
      const authData = await authRes.json();

      setSales(salesData);
      setOperators(opsData.filter((o) => o.active));
      setUserRole(authData.role);

      // Build rate lookup
      const rateMap = {};
      ratesData.forEach((r) => {
        rateMap[r.fuelType] = r.rate;
      });
      setFuelRates(rateMap);
    } catch (err) {
      console.error('Failed to load data', err);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    setLoading(true);
    fetchAll();
  }, [fetchAll]);

  function changeDate(offset) {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + offset);
    setSelectedDate(d.toLocaleDateString('en-CA'));
  }

  function getAvailableFuels(pumpNumber) {
    const pump = PUMP_CONFIG.find((p) => p.pumpNumber === parseInt(pumpNumber));
    return pump ? pump.fuelTypes : [];
  }

  function resetForm() {
    setFormData({
      operatorId: '',
      operatorName: '',
      pumpNumber: '',
      fuels: {},
      cashAmount: '',
      digitalAmount: '',
      debtEntries: [],
    });
  }

  function openAdd() {
    setEditingSale(null);
    resetForm();
    setShowModal(true);
  }

  function openEdit(sale) {
    setEditingSale(sale);
    const fuelsObj = {};
    if (sale.fuels) {
      sale.fuels.forEach(f => {
        fuelsObj[f.fuelType] = {
          openingReading: f.openingReading.toString(),
          closingReading: f.closingReading.toString(),
          testingQty: f.testingQty?.toString() || '0',
          rate: f.rate.toString()
        };
      });
    } else if (sale.fuelType) {
      fuelsObj[sale.fuelType] = {
        openingReading: sale.openingReading.toString(),
        closingReading: sale.closingReading.toString(),
        testingQty: sale.testingQty?.toString() || '0',
        rate: sale.rate.toString()
      };
    }

    setFormData({
      operatorId: sale.operatorId,
      operatorName: sale.operatorName,
      pumpNumber: sale.pumpNumber.toString(),
      fuels: fuelsObj,
      cashAmount: sale.cashAmount.toString(),
      digitalAmount: sale.digitalAmount.toString(),
      debtEntries: sale.debtEntries || [],
    });
    setShowModal(true);
  }

  function updateField(field, value) {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };

      // Auto-select operator name
      if (field === 'operatorId') {
        const op = operators.find((o) => o._id === value);
        updated.operatorName = op ? op.name : '';
      }

      // Auto-select fuel type when pump changes
      if (field === 'pumpNumber') {
        const fuels = getAvailableFuels(value);
        updated.fuels = {};
        fuels.forEach(f => {
          updated.fuels[f] = {
            openingReading: '',
            closingReading: '',
            testingQty: '',
            rate: fuelRates[f]?.toString() || ''
          };
        });
      }

      return updated;
    });
  }

  function updateDebtEntry(index, field, value) {
    const newEntries = [...(formData.debtEntries || [])];
    newEntries[index] = { ...newEntries[index], [field]: value };
    setFormData((prev) => ({ ...prev, debtEntries: newEntries }));
  }

  function addDebtEntry() {
    setFormData((prev) => ({
      ...prev,
      debtEntries: [...(prev.debtEntries || []), { clientName: '', amount: '' }],
    }));
  }

  function removeDebtEntry(index) {
    const newEntries = [...(formData.debtEntries || [])];
    newEntries.splice(index, 1);
    setFormData((prev) => ({ ...prev, debtEntries: newEntries }));
  }

  function updateFuelField(fuelType, field, value) {
    setFormData(prev => ({
      ...prev,
      fuels: {
        ...prev.fuels,
        [fuelType]: {
          ...prev.fuels[fuelType],
          [field]: value
        }
      }
    }));
  }

  // Computed values
  let grandTotalAmount = 0;
  Object.values(formData.fuels || {}).forEach(f => {
    const o = parseFloat(f.openingReading) || 0;
    const c = parseFloat(f.closingReading) || 0;
    const t = parseFloat(f.testingQty) || 0;
    const r = parseFloat(f.rate) || 0;
    grandTotalAmount += ((c - o) - t) * r;
  });
  grandTotalAmount = Math.round(grandTotalAmount * 100) / 100;

  const currentCash = parseFloat(formData.cashAmount) || 0;
  const currentDigital = parseFloat(formData.digitalAmount) || 0;
  const diffAmount = Math.round((grandTotalAmount - currentCash - currentDigital) * 100) / 100;

  async function handleSave(e) {
    e.preventDefault();
    if (!formData.operatorId || !formData.pumpNumber) {
      setToast('Please fill all required fields');
      return;
    }

    const payload = {
      ...formData,
      date: selectedDate,
      fuels: Object.entries(formData.fuels).map(([fuelType, data]) => ({
        fuelType,
        ...data
      }))
    };

    try {
      if (editingSale) {
        await fetch(`/api/daily-sales/${editingSale._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        setToast('Sale entry updated');
      } else {
        await fetch('/api/daily-sales', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        setToast('Sale entry added');
      }
      setShowModal(false);
      fetchAll();
    } catch (err) {
      setToast('Error saving entry');
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this sale entry?')) return;
    try {
      await fetch(`/api/daily-sales/${id}`, { method: 'DELETE' });
      setToast('Entry deleted');
      fetchAll();
    } catch (err) {
      setToast('Error deleting entry');
    }
  }

  const dateLabel = new Date(selectedDate).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  // Today's totals
  const dayTotal = sales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
  const dayCash = sales.reduce((sum, s) => sum + (s.cashAmount || 0), 0);
  const dayDigital = sales.reduce((sum, s) => sum + (s.digitalAmount || 0), 0);
  const dayDebt = sales.reduce((sum, s) => sum + ((s.debtAmount || 0) && !s.debtSettled ? (s.debtAmount || 0) : 0), 0);

  async function handleSettle(id) {
    try {
      await fetch(`/api/daily-sales/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ debtSettled: true }),
      });
      setToast('Debt marked as settled');
      fetchAll();
    } catch (err) {
      setToast('Error settling debt');
    }
  }

  if (loading) {
    return (
      <div className="page">
        <div className="loading">Loading sales...</div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Daily Sales</h1>
        <button className="btn btn-primary btn-sm" onClick={openAdd}>+ Add</button>
      </div>

      {/* Date Navigation */}
      <div className="date-nav">
        <button className="date-nav-btn" onClick={() => changeDate(-1)}>◀</button>
        <div className="date-nav-label">{dateLabel}</div>
        <button
          className="date-nav-btn"
          onClick={() => changeDate(1)}
          disabled={selectedDate >= todayStr}
          style={{ opacity: selectedDate >= todayStr ? 0.3 : 1 }}
        >▶</button>
      </div>

      {/* Day Summary */}
      {sales.length > 0 && (
        <div className="stat-card" style={{ marginBottom: 16 }}>          
          <div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--success)' }}>₹{dayCash.toLocaleString('en-IN')}</div>
                <div className="stat-label">Cash</div>
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent)' }}>₹{dayDigital.toLocaleString('en-IN')}</div>
                <div className="stat-label">Digital</div>
              </div>
              {dayDebt > 0 && (
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--danger)' }}>₹{dayDebt.toLocaleString('en-IN')}</div>
                  <div className="stat-label">Debt</div>
                </div>
              )}
            </div>
          </div>
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <div className="stat-value" style={{ fontSize: 18 }}>₹{dayTotal.toLocaleString('en-IN')}</div>
            <div className="stat-label">Total</div>
          </div>
        </div>
      )}

      {/* Sales List */}
      {sales.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">⛽</div>
          <div className="empty-state-text">No sales recorded for this date</div>
        </div>
      ) : (
        sales.map((sale) => (
          <div key={sale._id} className="sale-card">
            <div className="sale-card-header">
              <div className="sale-card-title">
                {sale.operatorName} — Pump {sale.pumpNumber}
              </div>
              <div className="list-item-actions">
                {userRole !== 'manager' && (
                  <>
                    <button className="btn-icon" onClick={() => openEdit(sale)} title="Edit">✏️</button>
                    <button className="btn-icon danger" onClick={() => handleDelete(sale._id)} title="Delete">🗑️</button>
                  </>
                )}
              </div>
            </div>
            {(sale.fuels || [sale]).map((f, idx) => (
              <div key={idx} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: '1px dashed var(--border)' }}>
                <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 8, fontSize: 14 }}>{f.fuelType || sale.fuelType}</div>
                <div className="sale-card-grid">
                  <div className="sale-card-field">
                    <span>Rate: </span><strong>₹{f.rate}</strong>
                  </div>
                  <div className="sale-card-field">
                    <span>Opening: </span><strong>{f.openingReading}</strong>
                  </div>
                  <div className="sale-card-field">
                    <span>Closing: </span><strong>{f.closingReading}</strong>
                  </div>
                  <div className="sale-card-field">
                    <span>Total Qty: </span><strong>{f.totalQty?.toFixed(2)}</strong>
                  </div>
                  <div className="sale-card-field">
                    <span>Testing: </span><strong>{f.testingQty?.toFixed(2) || '0.00'}</strong>
                  </div>
                  <div className="sale-card-field">
                    <span>Sale Qty: </span><strong>{f.saleQty?.toFixed(2)}</strong>
                  </div>
                </div>
              </div>
            ))}
            <div className="sale-card-total">
              <div>
                <div className="sale-card-amount">₹{sale.totalAmount?.toLocaleString('en-IN')}</div>
                <div className="sale-card-payment">
                  <div>Cash: ₹{sale.cashAmount?.toLocaleString('en-IN')} | Digital: ₹{sale.digitalAmount?.toLocaleString('en-IN')}</div>
                  {(sale.debtAmount || 0) > 0 && (
                    <div style={{ color: sale.debtSettled ? 'var(--success)' : 'var(--danger)', fontWeight: 600, marginTop: 4 }}>
                      Debt: ₹{sale.debtAmount?.toLocaleString('en-IN')}
                      {sale.debtEntries && sale.debtEntries.length > 0 && (
                        <div style={{ fontSize: 12, fontWeight: 400, color: 'var(--text)', marginTop: 2 }}>
                          {sale.debtEntries.map((e, i) => (
                            <div key={i}>• {e.clientName}: ₹{e.amount}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  {(sale.extraIncome || 0) > 0 && (
                    <div style={{ color: 'var(--success)', fontWeight: 600, marginTop: 4 }}>
                      Extra Income: ₹{sale.extraIncome?.toLocaleString('en-IN')}
                    </div>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                {(sale.debtAmount || 0) > 0 && (
                  sale.debtSettled ? (
                    <span className="badge badge-active">Settled</span>
                  ) : (
                    userRole !== 'manager' && (
                      <button
                        className="btn btn-sm btn-outline"
                        style={{ fontSize: 11, padding: '3px 8px', borderColor: 'var(--danger)', color: 'var(--danger)' }}
                        onClick={() => handleSettle(sale._id)}
                      >
                        Settle
                      </button>
                    )
                  )
                )}
              </div>
            </div>
          </div>
        ))
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingSale ? 'Edit Sale Entry' : 'Add Sale Entry'}
      >
        <form onSubmit={handleSave}>
          {/* Operator */}
          <div className="form-group">
            <label className="form-label">Operator *</label>
            <select
              className="form-input"
              value={formData.operatorId}
              onChange={(e) => updateField('operatorId', e.target.value)}
              required
            >
              <option value="">Select operator</option>
              {operators.map((op) => (
                <option key={op._id} value={op._id}>{op.name}</option>
              ))}
            </select>
          </div>

          {/* Pump & Fuel */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Pump *</label>
              <select
                className="form-input"
                value={formData.pumpNumber}
                onChange={(e) => updateField('pumpNumber', e.target.value)}
                required
              >
                <option value="">Select pump</option>
                {PUMP_CONFIG.map((p) => (
                  <option key={p.pumpNumber} value={p.pumpNumber}>
                    Pump {p.pumpNumber}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Fuel Rows */}
          {Object.entries(formData.fuels || {}).map(([fuelType, fuelData]) => (
            <div key={fuelType} style={{ padding: '12px', border: '1px solid var(--border)', borderRadius: '6px', marginBottom: '16px' }}>
              <div style={{ fontWeight: 600, marginBottom: '8px' }}>{fuelType}</div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Opening</label>
                  <input
                    className="form-input"
                    type="number"
                    step="0.01"
                    value={fuelData.openingReading}
                    onChange={(e) => updateFuelField(fuelType, 'openingReading', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Closing</label>
                  <input
                    className="form-input"
                    type="number"
                    step="0.01"
                    value={fuelData.closingReading}
                    onChange={(e) => updateFuelField(fuelType, 'closingReading', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Testing Qty</label>
                  <input
                    className="form-input"
                    type="number"
                    step="0.01"
                    value={fuelData.testingQty}
                    onChange={(e) => updateFuelField(fuelType, 'testingQty', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Rate (₹)</label>
                  <input
                    className="form-input"
                    disabled={true}
                    type="number"
                    step="0.01"
                    value={fuelData.rate}
                    onChange={(e) => updateFuelField(fuelType, 'rate', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>
          ))}

          {/* Computed Values */}
          <div className="form-row" style={{ marginBottom: 14 }}>
            <div className="form-group">
              <label className="form-label">Total Amount</label>
              <div className="form-computed" style={{ color: 'var(--accent)' }}>₹{grandTotalAmount.toLocaleString('en-IN')}</div>
            </div>
          </div>

          {/* Payment */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Cash (₹)</label>
              <input
                className="form-input"
                type="number"
                step="0.01"
                value={formData.cashAmount}
                onChange={(e) => updateField('cashAmount', e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Digital (₹)</label>
              <input
                className="form-input"
                type="number"
                step="0.01"
                value={formData.digitalAmount}
                onChange={(e) => updateField('digitalAmount', e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Over/Under Collection */}
          {diffAmount < 0 && (
            <div style={{ marginTop: 12, padding: 12, backgroundColor: 'rgba(var(--success-rgb), 0.1)', borderRadius: 6, border: '1px solid var(--success)' }}>
              <div style={{ color: 'var(--success)', fontWeight: 600 }}>Extra Income: ₹{Math.abs(diffAmount).toLocaleString('en-IN')}</div>
            </div>
          )}

          {diffAmount > 0 && (
            <div style={{ marginTop: 12, padding: 12, border: '1px solid var(--border)', borderRadius: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ color: 'var(--danger)', fontWeight: 600 }}>Debt Pending: ₹{diffAmount.toLocaleString('en-IN')}</div>
                <button type="button" className="btn btn-sm btn-outline" onClick={addDebtEntry}>+ Add Debt</button>
              </div>
              {(formData.debtEntries || []).map((entry, idx) => (
                <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ flex: 2 }}>
                    <input
                      className="form-input"
                      placeholder="Client Name"
                      value={entry.clientName}
                      onChange={(e) => updateDebtEntry(idx, 'clientName', e.target.value)}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <input
                      className="form-input"
                      type="number"
                      step="0.01"
                      placeholder="Amount"
                      value={entry.amount}
                      onChange={(e) => updateDebtEntry(idx, 'amount', e.target.value)}
                    />
                  </div>
                  <button type="button" className="btn-icon danger" onClick={() => removeDebtEntry(idx)}>🗑️</button>
                </div>
              ))}
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                Unassigned debt will be assigned to the operator automatically.
              </div>
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: 16 }}>
            {editingSale ? 'Update Entry' : 'Save Entry'}
          </button>
        </form>
      </Modal>

      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </div>
  );
}
