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
    fuelType: '',
    openingReading: '',
    closingReading: '',
    testingQty: '',
    rate: '',
    cashAmount: '',
    digitalAmount: '',
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
      fuelType: '',
      openingReading: '',
      closingReading: '',
      testingQty: '',
      rate: '',
      cashAmount: '',
      digitalAmount: '',
    });
  }

  function openAdd() {
    setEditingSale(null);
    resetForm();
    setShowModal(true);
  }

  function openEdit(sale) {
    setEditingSale(sale);
    setFormData({
      operatorId: sale.operatorId,
      operatorName: sale.operatorName,
      pumpNumber: sale.pumpNumber.toString(),
      fuelType: sale.fuelType,
      openingReading: sale.openingReading.toString(),
      closingReading: sale.closingReading.toString(),
      testingQty: sale.testingQty?.toString() || '0',
      rate: sale.rate.toString(),
      cashAmount: sale.cashAmount.toString(),
      digitalAmount: sale.digitalAmount.toString(),
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
        if (fuels.length === 1) {
          updated.fuelType = fuels[0];
          updated.rate = fuelRates[fuels[0]]?.toString() || '';
        } else {
          updated.fuelType = '';
          updated.rate = '';
        }
      }

      // Auto-fill rate when fuel type changes
      if (field === 'fuelType') {
        updated.rate = fuelRates[value]?.toString() || '';
      }

      return updated;
    });
  }

  // Computed values
  const opening = parseFloat(formData.openingReading) || 0;
  const closing = parseFloat(formData.closingReading) || 0;
  const testing = parseFloat(formData.testingQty) || 0;
  const rate = parseFloat(formData.rate) || 0;
  const totalQty = closing - opening;
  const saleQty = totalQty - testing;
  const totalAmount = Math.round(saleQty * rate * 100) / 100;

  async function handleSave(e) {
    e.preventDefault();
    if (!formData.operatorId || !formData.pumpNumber || !formData.fuelType) {
      setToast('Please fill all required fields');
      return;
    }

    const payload = {
      ...formData,
      date: selectedDate,
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
            <div className="sale-card-grid">
              <div className="sale-card-field">
                <span>Fuel: </span><strong>{sale.fuelType}</strong>
              </div>
              <div className="sale-card-field">
                <span>Rate: </span><strong>₹{sale.rate}</strong>
              </div>
              <div className="sale-card-field">
                <span>Opening: </span><strong>{sale.openingReading}</strong>
              </div>
              <div className="sale-card-field">
                <span>Closing: </span><strong>{sale.closingReading}</strong>
              </div>
              <div className="sale-card-field">
                <span>Total Qty: </span><strong>{sale.totalQty?.toFixed(2)}</strong>
              </div>
              <div className="sale-card-field">
                <span>Testing: </span><strong>{sale.testingQty?.toFixed(2) || '0.00'}</strong>
              </div>
            </div>
            <div className="sale-card-total">
              <div>
                <div className="sale-card-amount">₹{sale.totalAmount?.toLocaleString('en-IN')}</div>
                <div className="sale-card-payment">
                  <div>Cash: ₹{sale.cashAmount?.toLocaleString('en-IN')} | Digital: ₹{sale.digitalAmount?.toLocaleString('en-IN')}</div>
                  {(sale.debtAmount || 0) > 0 && (
                    <div style={{ color: sale.debtSettled ? 'var(--success)' : 'var(--danger)', fontWeight: 600, marginTop: 4 }}>
                      Debt: ₹{sale.debtAmount?.toLocaleString('en-IN')}
                    </div>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                <span className="badge badge-fuel">{sale.saleQty?.toFixed(2)} {sale.fuelType === 'CNG' ? 'kg' : 'L'}</span>
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
            <div className="form-group">
              <label className="form-label">Fuel Type *</label>
              <select
                className="form-input"
                value={formData.fuelType}
                onChange={(e) => updateField('fuelType', e.target.value)}
                required
                disabled={!formData.pumpNumber}
              >
                <option value="">Select fuel</option>
                {formData.pumpNumber &&
                  getAvailableFuels(formData.pumpNumber).map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
              </select>
            </div>
          </div>

          {/* Meter Readings */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Opening Reading</label>
              <input
                className="form-input"
                type="number"
                step="0.01"
                value={formData.openingReading}
                onChange={(e) => updateField('openingReading', e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Closing Reading</label>
              <input
                className="form-input"
                type="number"
                step="0.01"
                value={formData.closingReading}
                onChange={(e) => updateField('closingReading', e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Testing & Rate */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Testing Qty</label>
              <input
                className="form-input"
                type="number"
                step="0.01"
                value={formData.testingQty}
                onChange={(e) => updateField('testingQty', e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Rate (₹)</label>
              <input
                className="form-input"
                type="number"
                step="0.01"
                value={formData.rate}
                onChange={(e) => updateField('rate', e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Computed Values */}
          <div className="form-row" style={{ marginBottom: 14 }}>
            <div className="form-group">
              <label className="form-label">Sale Qty</label>
              <div className="form-computed">{saleQty.toFixed(2)} {formData.fuelType === 'CNG' ? 'kg' : 'L'}</div>
            </div>
            <div className="form-group">
              <label className="form-label">Total Amount</label>
              <div className="form-computed" style={{ color: 'var(--accent)' }}>₹{totalAmount.toLocaleString('en-IN')}</div>
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

          <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: 4 }}>
            {editingSale ? 'Update Entry' : 'Save Entry'}
          </button>
        </form>
      </Modal>

      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </div>
  );
}
