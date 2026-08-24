'use client';

import { useState, useEffect, useCallback } from 'react';
import Modal from '@/components/Modal';
import Toast from '@/components/Toast';

const PUMP_CONFIG = [
  { pumpNumber: 1, name: 'Pump 1', fuelTypes: ['Petrol', 'Diesel'] },
  { pumpNumber: 2, name: 'Pump 2', fuelTypes: ['Petrol', 'Diesel'] },
  { pumpNumber: 3, name: 'Pump 3', fuelTypes: ['Petrol', 'Premium Petrol'] },
  { pumpNumber: 4, name: 'Pump 4', fuelTypes: ['Petrol', 'Premium Petrol'] },
  { pumpNumber: 5, name: 'CNG', fuelTypes: ['CNG - Side A', 'CNG - Side B'] },
];

function parseDigitalAmount(val) {
  if (typeof val === 'string' && val.includes('-')) {
    if (val.startsWith('-') && (val.match(/-/g) || []).length === 1) {
      return parseFloat(val) || 0;
    }
    const parts = val.split('-');
    if (parts.length === 2 && parts[0] !== '' && parts[1] !== '') {
      const v1 = parseFloat(parts[0]);
      const v2 = parseFloat(parts[1]);
      if (!isNaN(v1) && !isNaN(v2)) {
        return Math.abs(v1 - v2);
      }
    }
  }
  return parseFloat(val) || 0;
}

export default function DailySalesPage() {
  const [sales, setSales] = useState([]);
  const [operators, setOperators] = useState([]);
  const [fuelRates, setFuelRates] = useState({});
  const [inventoryList, setInventoryList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSale, setEditingSale] = useState(null);
  const [toast, setToast] = useState('');

  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [userRole, setUserRole] = useState('admin');

  // Form state
  const [formData, setFormData] = useState({
    saleType: 'fuel', // 'fuel' or 'inventory'
    operatorId: '',
    operatorName: '',
    pumpNumber: '',
    fuels: {},
    items: [], // { inventoryId, name, quantity, rate }
    cashAmount: '',
    digitalAmount: '',
    hpAmount: '',
    expenses: [],
    debtEntries: [],
  });

  const fetchAll = useCallback(async () => {
    try {
      const [salesRes, opsRes, ratesRes, authRes, invRes] = await Promise.all([
        fetch(`/api/daily-sales?date=${selectedDate}`),
        fetch('/api/operators'),
        fetch('/api/fuel-rates'),
        fetch('/api/auth/me'),
        fetch('/api/inventory'),
      ]);
      const salesData = await salesRes.json();
      const opsData = await opsRes.json();
      const ratesData = await ratesRes.json();
      const authData = await authRes.json();
      const invData = await invRes.json();

      setSales(salesData);
      setOperators(opsData.filter((o) => o.active));
      setUserRole(authData.role);
      setInventoryList(invData);

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
      saleType: 'fuel',
      operatorId: '',
      operatorName: '',
      pumpNumber: '',
      fuels: {},
      items: [],
      cashAmount: '',
      digitalAmount: '',
      hpAmount: '',
      expenses: [],
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
    const saleType = sale.saleType || 'fuel';
    
    let fuelsObj = {};
    if (saleType === 'fuel') {
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
    }

    const itemsArr = sale.items ? sale.items.map(item => ({
      inventoryId: item.inventoryId,
      name: item.name,
      quantity: item.quantity.toString(),
      rate: item.rate.toString(),
    })) : [];

    setFormData({
      saleType: saleType,
      operatorId: sale.operatorId,
      operatorName: sale.operatorName,
      pumpNumber: sale.pumpNumber ? sale.pumpNumber.toString() : '',
      fuels: fuelsObj,
      items: itemsArr,
      cashAmount: sale.cashAmount.toString(),
      digitalAmount: sale.digitalAmount.toString(),
      hpAmount: sale.hpAmount?.toString() || '',
      expenses: sale.expenses || [],
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

      if (field === 'pumpNumber' && prev.saleType === 'fuel') {
        const fuels = getAvailableFuels(value);
        updated.fuels = {};
        fuels.forEach(f => {
          const baseFuelType = f.startsWith('CNG') ? 'CNG' : f;
          updated.fuels[f] = {
            openingReading: '',
            closingReading: '',
            testingQty: '',
            rate: (fuelRates[f] || fuelRates[baseFuelType])?.toString() || ''
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
      debtEntries: [...(prev.debtEntries || []), { clientName: '', amount: '', settled: false }],
    }));
  }

  function removeDebtEntry(index) {
    const newEntries = [...(formData.debtEntries || [])];
    newEntries.splice(index, 1);
    setFormData((prev) => ({ ...prev, debtEntries: newEntries }));
  }

  function updateExpense(index, field, value) {
    const newExpenses = [...(formData.expenses || [])];
    newExpenses[index] = { ...newExpenses[index], [field]: value };
    setFormData((prev) => ({ ...prev, expenses: newExpenses }));
  }

  function addExpense() {
    setFormData((prev) => ({
      ...prev,
      expenses: [...(prev.expenses || []), { description: '', amount: '' }],
    }));
  }

  function removeExpense(index) {
    const newExpenses = [...(formData.expenses || [])];
    newExpenses.splice(index, 1);
    setFormData((prev) => ({ ...prev, expenses: newExpenses }));
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

  function handleDigitalChange(e) {
    const val = e.target.value;
    if (/[^\d.\-]/.test(val)) {
      setToast('Invalid format. Use only numbers or "X-Y" format.');
      return;
    }
    updateField('digitalAmount', val);
  }

  function handleDigitalBlur() {
    const val = formData.digitalAmount;
    if (typeof val === 'string' && val.includes('-')) {
      if (val.startsWith('-') && (val.match(/-/g) || []).length === 1) {
         return;
      }
      const parts = val.split('-');
      if (parts.length === 2 && parts[0] !== '' && parts[1] !== '') {
        const v1 = parseFloat(parts[0]);
        const v2 = parseFloat(parts[1]);
        if (!isNaN(v1) && !isNaN(v2)) {
          updateField('digitalAmount', Math.abs(v1 - v2).toString());
        } else {
          setToast('Invalid numbers in difference format.');
        }
      } else {
        setToast('Invalid format. Use "X-Y" format for differences.');
      }
    }
  }

  // Inventory logic
  function addInventoryItem() {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { inventoryId: '', name: '', quantity: '', rate: '' }]
    }));
  }

  function removeInventoryItem(index) {
    const newItems = [...formData.items];
    newItems.splice(index, 1);
    updateField('items', newItems);
  }

  function updateInventoryItem(index, field, value) {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // Auto-fill rate when item is selected
    if (field === 'inventoryId') {
      const selectedInv = inventoryList.find(i => i._id === value);
      if (selectedInv) {
        newItems[index].name = selectedInv.name;
        newItems[index].rate = selectedInv.price.toString();
      }
    }
    
    updateField('items', newItems);
  }

  // Computed values
  let grandTotalAmount = 0;
  if (formData.saleType === 'fuel') {
    Object.values(formData.fuels || {}).forEach(f => {
      const o = parseFloat(f.openingReading) || 0;
      const c = parseFloat(f.closingReading) || 0;
      const t = parseFloat(f.testingQty) || 0;
      const r = parseFloat(f.rate) || 0;
      grandTotalAmount += ((c - o) - t) * r;
    });
  } else if (formData.saleType === 'inventory') {
    (formData.items || []).forEach(item => {
      const q = parseFloat(item.quantity) || 0;
      const r = parseFloat(item.rate) || 0;
      grandTotalAmount += q * r;
    });
  }
  grandTotalAmount = Math.round(grandTotalAmount * 100) / 100;

  const currentCash = parseFloat(formData.cashAmount) || 0;
  const currentDigital = parseDigitalAmount(formData.digitalAmount);
  const currentHp = parseFloat(formData.hpAmount) || 0;
  const currentExpenses = (formData.expenses || []).reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0);
  const diffAmount = Math.round((grandTotalAmount - currentExpenses - currentCash - currentDigital - currentHp) * 100) / 100;
  const assignedDebt = (formData.debtEntries || []).reduce((sum, entry) => sum + (parseFloat(entry.amount) || 0), 0);
  const pendingDebt = Math.round((diffAmount - assignedDebt) * 100) / 100;

  async function handleSave(e) {
    e.preventDefault();
    if (!formData.operatorId) {
      setToast('Please select an operator');
      return;
    }
    if (formData.saleType === 'fuel' && !formData.pumpNumber) {
      setToast('Please select a pump');
      return;
    }
    if (formData.saleType === 'inventory' && (!formData.items || formData.items.length === 0)) {
      setToast('Please add at least one inventory item');
      return;
    }

    const payload = {
      ...formData,
      digitalAmount: currentDigital,
      date: selectedDate,
    };
    
    if (formData.saleType === 'fuel') {
      payload.fuels = Object.entries(formData.fuels).map(([fuelType, data]) => ({
        fuelType,
        ...data
      }));
    }

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



  // Today's totals
  const dayTotal = sales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
  const dayCash = sales.reduce((sum, s) => sum + (s.cashAmount || 0), 0);
  const dayDigital = sales.reduce((sum, s) => sum + (s.digitalAmount || 0), 0);
  const dayHp = sales.reduce((sum, s) => sum + (s.hpAmount || 0), 0);
  const dayTotalDebt = sales.reduce((sum, s) => sum + (s.debtAmount || 0), 0);
  const dayUnsettledDebt = sales.reduce((sum, s) => {
    if (!s.debtAmount || s.debtSettled) return sum;
    if (s.debtEntries && s.debtEntries.length > 0) {
      return sum + s.debtEntries.reduce((acc, e) => !e.settled ? acc + (e.amount || 0) : acc, 0);
    }
    return sum + (s.debtAmount || 0);
  }, 0);

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

  async function handleSettleEntry(id, index) {
    try {
      await fetch(`/api/daily-sales/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settleDebtEntryIndex: index }),
      });
      setToast('Debt entry settled');
      fetchAll();
    } catch (err) {
      setToast('Error settling debt entry');
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
        <input
          type="date"
          className="date-nav-label"
          value={selectedDate}
          max={todayStr}
          onChange={(e) => setSelectedDate(e.target.value)}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'inherit',
            fontFamily: 'inherit',
            outline: 'none',
            cursor: 'pointer',
          }}
        />
        <button
          className="date-nav-btn"
          onClick={() => changeDate(1)}
          disabled={selectedDate >= todayStr}
          style={{ opacity: selectedDate >= todayStr ? 0.3 : 1 }}
        >▶</button>
      </div>

      {/* Day Summary */}
      {sales.length > 0 && (
        <div className="stats-grid" style={{ marginBottom: 20 }}>
          <div className="stat-card accent full-width" style={{ textAlign: 'center' }}>
            <div className="stat-value">₹{dayTotal.toLocaleString('en-IN')}</div>
            <div className="stat-label" style={{ color: 'rgba(255,255,255,0.8)' }}>Total Sale</div>
          </div>
          <div className="stat-card" style={{ textAlign: 'center' }}>
            <div className="stat-value" style={{ color: 'var(--success)' }}>₹{dayCash.toLocaleString('en-IN')}</div>
            <div className="stat-label">Cash</div>
          </div>
          <div className="stat-card" style={{ textAlign: 'center' }}>
            <div className="stat-value" style={{ color: 'var(--accent)' }}>₹{dayDigital.toLocaleString('en-IN')}</div>
            <div className="stat-label">Digital</div>
          </div>
          <div className="stat-card" style={{ textAlign: 'center' }}>
            <div className="stat-value" style={{ color: 'var(--accent-alt, #007aff)' }}>₹{dayHp.toLocaleString('en-IN')}</div>
            <div className="stat-label">HP</div>
          </div>
          {dayTotalDebt > 0 && (
            <div className="stat-card">
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div>
                  <div className="stat-value" style={{ fontSize: 18, color: 'var(--danger)' }}>
                    ₹{dayTotalDebt.toLocaleString('en-IN')}
                  </div>
                  <div className="stat-label">Total Debt</div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--success)' }}>
                      ₹{(dayTotalDebt - dayUnsettledDebt).toLocaleString('en-IN')}
                    </div>
                    <div className="stat-label">Settled</div>
                  </div>
                  {dayUnsettledDebt > 0 && (
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--warning)' }}>
                        ₹{dayUnsettledDebt.toLocaleString('en-IN')}
                      </div>
                      <div className="stat-label">Unsettled</div>
                    </div>
                  )}
                </div>
                {dayUnsettledDebt === 0 && dayTotalDebt > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <span className="badge badge-active" style={{ fontSize: 13, padding: '5px 12px' }}>All Settled ✓</span>
                  </div>
                )}
              </div>
            </div>
          )}
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
                {sale.operatorName} — {sale.saleType === 'inventory' ? '📦 Inventory' : (sale.pumpNumber === 5 ? 'CNG' : `Pump ${sale.pumpNumber}`)}
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
            
            {/* Fuel Rows */}
            {sale.saleType !== 'inventory' && (sale.fuels || [sale]).map((f, idx) => (
              <div key={idx} style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid var(--border-light)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 15 }}>{f.fuelType || sale.fuelType}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Rate: <strong style={{ color: 'var(--text-primary)' }}>₹{f.rate}</strong></div>
                </div>

                <div style={{ background: 'var(--bg-input)', padding: '10px 12px', borderRadius: '8px', fontSize: 13 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Readings (Op → Cl)</span>
                    <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{f.openingReading} <span style={{ color: 'var(--text-muted)' }}>→</span> {f.closingReading}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Meter Sale</span>
                    <span style={{ fontWeight: 600 }}>{f.totalQty?.toFixed(2)} L</span>
                  </div>
                  {(f.testingQty > 0) && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, color: 'var(--warning)' }}>
                      <span>Less: Testing</span>
                      <span style={{ fontWeight: 600 }}>- {f.testingQty?.toFixed(2)} L</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTop: '1px dashed var(--border)', fontSize: 14 }}>
                    <span style={{ fontWeight: 600 }}>Net Sale</span>
                    <strong style={{ color: 'var(--accent)' }}>{f.saleQty?.toFixed(2)} L</strong>
                  </div>
                </div>
              </div>
            ))}
            
            {/* Inventory Item Rows */}
            {sale.saleType === 'inventory' && (sale.items || []).map((item, idx) => (
               <div key={idx} style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid var(--border-light)' }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                   <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 15 }}>{item.name}</div>
                   <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Rate: <strong style={{ color: 'var(--text-primary)' }}>₹{item.rate}</strong></div>
                 </div>
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 14 }}>
                   <span style={{ color: 'var(--text-secondary)' }}>Quantity</span>
                   <span style={{ fontWeight: 600 }}>{item.quantity} units</span>
                 </div>
                 <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTop: '1px dashed var(--border)', fontSize: 14 }}>
                    <span style={{ fontWeight: 600 }}>Item Total</span>
                    <strong style={{ color: 'var(--accent)' }}>₹{item.totalAmount?.toLocaleString('en-IN')}</strong>
                  </div>
               </div>
            ))}

            {/* Expenses */}
            {(sale.expenses && sale.expenses.length > 0) && (
              <div style={{ padding: '8px 12px', background: 'var(--bg-input)', borderRadius: 8, marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>Expenses Deducted</div>
                {sale.expenses.map((exp, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 4 }}>
                    <span>{exp.description}</span>
                    <strong style={{ color: 'var(--danger)' }}>-₹{exp.amount}</strong>
                  </div>
                ))}
              </div>
            )}

            <div className="sale-card-total" style={{ borderTop: 'none', paddingTop: 0, marginTop: 0 }}>
              <div style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ fontSize: 14, color: 'var(--text-secondary)', fontWeight: 600 }}>Total Amount</div>
                  <div className="sale-card-amount">₹{sale.totalAmount?.toLocaleString('en-IN')}</div>
                </div>

                <div className="payment-badges">
                  {sale.cashAmount > 0 && <span className="payment-badge cash">💵 ₹{sale.cashAmount?.toLocaleString('en-IN')}</span>}
                  {sale.digitalAmount > 0 && <span className="payment-badge digital">📱 ₹{sale.digitalAmount?.toLocaleString('en-IN')}</span>}
                  {sale.hpAmount > 0 && <span className="payment-badge hp">⛽ ₹{sale.hpAmount?.toLocaleString('en-IN')}</span>}
                </div>

                {(sale.debtAmount || 0) > 0 && (
                  <div style={{ marginTop: 12, padding: 12, borderRadius: 8, border: `1px solid ${sale.debtSettled ? 'rgba(64, 192, 87, 0.3)' : 'rgba(250, 82, 82, 0.3)'}`, background: sale.debtSettled ? 'rgba(64, 192, 87, 0.05)' : 'rgba(250, 82, 82, 0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: sale.debtEntries?.length > 0 ? 8 : 0 }}>
                      <div style={{ color: sale.debtSettled ? 'var(--success)' : 'var(--danger)', fontWeight: 700 }}>
                        Debt: ₹{sale.debtAmount?.toLocaleString('en-IN')}
                      </div>
                      <div>
                        {sale.debtSettled ? (
                          <span className="badge badge-active">Settled</span>
                        ) : (
                          userRole !== 'manager' && (
                            <button
                              className="btn btn-sm btn-outline"
                              style={{ fontSize: 11, padding: '3px 8px', borderColor: 'var(--danger)', color: 'var(--danger)', background: 'white' }}
                              onClick={() => handleSettle(sale._id)}
                            >
                              {sale.debtEntries && sale.debtEntries.length > 0 ? 'Settle All' : 'Settle'}
                            </button>
                          )
                        )}
                      </div>
                    </div>

                    {sale.debtEntries && sale.debtEntries.length > 0 && (
                      <div style={{ fontSize: 13 }}>
                        {sale.debtEntries.map((e, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, paddingBottom: 6, borderBottom: '1px dashed rgba(0,0,0,0.1)' }}>
                            <span style={{ textDecoration: e.settled ? 'line-through' : 'none', color: e.settled ? 'var(--success)' : 'var(--text-primary)', fontWeight: 500 }}>
                              {e.clientName}: ₹{e.amount}
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              {!e.settled && !sale.debtSettled && userRole !== 'manager' && (
                                <button
                                  className="btn btn-sm btn-outline"
                                  style={{ fontSize: 11, padding: '2px 8px', background: 'white' }}
                                  onClick={() => handleSettleEntry(sale._id, i)}
                                >
                                  Settle
                                </button>
                              )}
                              {e.settled && (
                                <span style={{ fontSize: 11, color: 'var(--success)', fontWeight: 600 }}>✓</span>
                              )}
                            </div>
                          </div>
                        ))}
                        {!sale.debtSettled && (
                          <div style={{ fontSize: 12, fontWeight: 600, marginTop: 8, color: 'var(--danger)' }}>
                            Pending: ₹{sale.debtEntries.reduce((sum, e) => sum + (e.settled ? 0 : (e.amount || 0)), 0).toLocaleString('en-IN')}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {(sale.extraIncome || 0) > 0 && (
                  <div style={{ marginTop: 12, padding: '8px 12px', borderRadius: 8, background: 'rgba(64, 192, 87, 0.1)', border: '1px solid rgba(64, 192, 87, 0.3)', color: 'var(--success)', fontWeight: 600, fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>
                    <span>Extra Received</span>
                    <span>₹{sale.extraIncome?.toLocaleString('en-IN')}</span>
                  </div>
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
        disableOutsideClick={true}
      >
        <form onSubmit={handleSave}>
          
          {/* Sale Type Selector (Only on Add) */}
          {!editingSale && (
            <div className="form-group" style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <button 
                  type="button" 
                  className={`btn btn-sm ${formData.saleType === 'fuel' ? 'btn-primary' : 'btn-outline'}`}
                  style={{ flex: 1 }}
                  onClick={() => updateField('saleType', 'fuel')}
                >
                  ⛽ Fuel Sale
                </button>
                <button 
                  type="button" 
                  className={`btn btn-sm ${formData.saleType === 'inventory' ? 'btn-primary' : 'btn-outline'}`}
                  style={{ flex: 1 }}
                  onClick={() => updateField('saleType', 'inventory')}
                >
                  📦 Inventory Sale
                </button>
              </div>
            </div>
          )}

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

          {/* Pump & Fuel - ONLY for Fuel Sales */}
          {formData.saleType === 'fuel' && (
            <>
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
                        {p.name}
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
            </>
          )}

          {/* Inventory Items - ONLY for Inventory Sales */}
          {formData.saleType === 'inventory' && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <label className="form-label" style={{ marginBottom: 0 }}>Items *</label>
                <button type="button" className="btn btn-sm btn-outline" onClick={addInventoryItem}>+ Add Item</button>
              </div>
              
              {formData.items.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border)', borderRadius: '6px' }}>
                  No items added yet.
                </div>
              ) : (
                formData.items.map((item, idx) => (
                  <div key={idx} style={{ padding: '12px', border: '1px solid var(--border)', borderRadius: '6px', marginBottom: '12px' }}>
                     <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
                      <div style={{ flex: 1 }}>
                        <select
                          className="form-input"
                          value={item.inventoryId}
                          onChange={(e) => updateInventoryItem(idx, 'inventoryId', e.target.value)}
                          required
                        >
                          <option value="">Select Item</option>
                          {inventoryList.map(inv => (
                            <option key={inv._id} value={inv._id}>{inv.name} (Stock: {inv.stock})</option>
                          ))}
                        </select>
                      </div>
                      <button type="button" className="btn-icon danger" onClick={() => removeInventoryItem(idx)}>🗑️</button>
                     </div>
                     <div className="form-row">
                       <div className="form-group">
                         <label className="form-label">Quantity</label>
                         <input
                           className="form-input"
                           type="number"
                           step="0.01"
                           value={item.quantity}
                           onChange={(e) => updateInventoryItem(idx, 'quantity', e.target.value)}
                           required
                           placeholder="0"
                         />
                       </div>
                       <div className="form-group">
                         <label className="form-label">Rate (₹)</label>
                         <input
                           className="form-input"
                           disabled={true}
                           type="number"
                           step="0.01"
                           value={item.rate}
                           placeholder="0.00"
                         />
                       </div>
                     </div>
                  </div>
                ))
              )}
            </div>
          )}

          <div className="form-row" style={{ marginBottom: 14 }}>
            <div className="form-group">
              <label className="form-label">Total Amount</label>
              <div className="form-computed" style={{ color: 'var(--accent)' }}>₹{grandTotalAmount.toLocaleString('en-IN')}</div>
            </div>
          </div>

          {/* Expenses */}
          <div style={{ marginTop: 12, padding: 12, border: '1px solid var(--border)', borderRadius: 6, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ fontWeight: 600 }}>Shift Expenses</div>
              <button type="button" className="btn btn-sm btn-outline" onClick={addExpense}>+ Add Expense</button>
            </div>
            {(formData.expenses || []).map((exp, idx) => (
              <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                <div style={{ flex: 2 }}>
                  <input
                    className="form-input"
                    placeholder="Description (e.g. Tea)"
                    value={exp.description}
                    onChange={(e) => updateExpense(idx, 'description', e.target.value)}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <input
                    className="form-input"
                    type="number"
                    step="0.01"
                    placeholder="Amount"
                    value={exp.amount}
                    onChange={(e) => updateExpense(idx, 'amount', e.target.value)}
                  />
                </div>
                <button type="button" className="btn-icon danger" onClick={() => removeExpense(idx)}>🗑️</button>
              </div>
            ))}
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              Deducted from the total expected cash handover.
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
                type="text"
                inputMode="decimal"
                value={formData.digitalAmount}
                onChange={handleDigitalChange}
                onBlur={handleDigitalBlur}
                placeholder="0.00"
              />
            </div>
            <div className="form-group">
              <label className="form-label">HP (₹)</label>
              <input
                className="form-input"
                type="number"
                step="0.01"
                value={formData.hpAmount}
                onChange={(e) => updateField('hpAmount', e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Over/Under Collection */}
          {diffAmount < 0 && (
            <div style={{ marginTop: 12, padding: 12, backgroundColor: 'rgba(var(--success-rgb), 0.1)', borderRadius: 6, border: '1px solid var(--success)' }}>
              <div style={{ color: 'var(--success)', fontWeight: 600 }}>Extra Received: ₹{Math.abs(diffAmount).toLocaleString('en-IN')}</div>
            </div>
          )}

          {diffAmount > 0 && (
            <div style={{ marginTop: 12, padding: 12, border: '1px solid var(--border)', borderRadius: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ color: pendingDebt < 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
                  {pendingDebt < 0 ? `Extra Received: ₹${Math.abs(pendingDebt).toLocaleString('en-IN')}` : `Debt Pending: ₹${pendingDebt.toLocaleString('en-IN')}`}
                </div>
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
