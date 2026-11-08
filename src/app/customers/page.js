'use client';

import { useState, useEffect, useCallback } from 'react';
import Modal from '@/components/Modal';
import Toast from '@/components/Toast';
import { apiFetch } from '@/lib/apiClient';
import { downloadCSV } from '@/lib/exportCsv';
import { UserCheck, Plus, Search, DollarSign } from 'lucide-react';

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [toast, setToast] = useState('');
  const [userRole, setUserRole] = useState('admin');

  // Add Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [creditLimit, setCreditLimit] = useState('50000');

  // Payment Form State
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [paymentNotes, setPaymentNotes] = useState('');

  const fetchCustomers = useCallback(async () => {
    try {
      const data = await apiFetch('/api/customers');
      setCustomers(data);
    } catch (err) {
      console.error('Failed to load customers', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const [data, auth] = await Promise.all([
          apiFetch('/api/customers'),
          apiFetch('/api/auth/me').catch(() => null),
        ]);
        if (!ignore) {
          setCustomers(data);
          if (auth?.role) setUserRole(auth.role);
        }
      } catch (err) {
        console.error('Failed to load customers', err);
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, []);

  function openAdd() {
    setName('');
    setPhone('');
    setVehicleNumber('');
    setCreditLimit('50000');
    setShowAddModal(true);
  }

  function openPayment(cust) {
    setSelectedCustomer(cust);
    setPaymentAmount('');
    setPaymentMode('Cash');
    setPaymentNotes('');
    setShowPayModal(true);
  }

  async function handleAddCustomer(e) {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      await apiFetch('/api/customers', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          vehicleNumber: vehicleNumber.trim(),
          creditLimit: parseFloat(creditLimit) || 0,
        }),
      });

      setToast('Customer registered successfully');
      setShowAddModal(false);
      fetchCustomers();
    } catch (err) {
      setToast(err.message || 'Error saving customer');
    }
  }

  async function handleRecordPayment(e) {
    e.preventDefault();
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      setToast('Please enter a valid payment amount');
      return;
    }

    try {
      await apiFetch(`/api/customers/${selectedCustomer._id}`, {
        method: 'PUT',
        body: JSON.stringify({
          paymentAmount: parseFloat(paymentAmount),
          paymentMode,
          notes: paymentNotes,
        }),
      });

      setToast(`Payment of ₹${paymentAmount} recorded for ${selectedCustomer.name}`);
      setShowPayModal(false);
      fetchCustomers();
    } catch (err) {
      setToast(err.message || 'Error recording payment');
    }
  }

  const filteredCustomers = customers.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.phone && c.phone.includes(q)) ||
      (c.vehicleNumber && c.vehicleNumber.toLowerCase().includes(q))
    );
  });

  const totalOutstanding = customers.reduce((sum, c) => sum + (c.currentBalance || 0), 0);

  const exportToCSV = () => {
    if (!filteredCustomers || filteredCustomers.length === 0) {
      setToast('No customer accounts to export');
      return;
    }
    const rows = filteredCustomers.map((c) => ({
      CustomerName: c.name,
      Phone: c.phone || '',
      VehicleNumber: c.vehicleNumber || '',
      CreditLimit: c.creditLimit || 0,
      CurrentBalance: c.currentBalance || 0,
      Status: (c.currentBalance || 0) > 0 ? 'Balance Due' : 'Cleared',
    }));
    const ok = downloadCSV(`customer-khata-${new Date().toLocaleDateString('en-CA')}.csv`, rows);
    if (ok) {
      setToast('Customer accounts exported to CSV successfully');
    } else {
      setToast('Failed to export CSV: No records found');
    }
  };

  if (loading) {
    return (
      <div className="page">
        <div className="loading">Loading customer khata ledger...</div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="page-title">Customer Khata</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          {filteredCustomers.length > 0 && (
            <button className="btn btn-sm btn-outline" onClick={exportToCSV}>
              Export CSV
            </button>
          )}
          {userRole !== 'viewer' && (
            <button className="btn btn-primary btn-sm" onClick={openAdd}>
              <Plus size={16} /> New Account
            </button>
          )}
        </div>
      </div>

      {/* Summary Stat Card */}
      <div className="stat-card accent full-width" style={{ marginBottom: 16 }}>
        <div className="stat-value">₹{totalOutstanding.toLocaleString('en-IN')}</div>
        <div className="stat-label">Total Outstanding Customer Credit</div>
      </div>

      {/* Search Filter */}
      <div className="form-group" style={{ marginBottom: 16 }}>
        <div style={{ position: 'relative' }}>
          <input
            className="form-input"
            style={{ paddingLeft: 34 }}
            placeholder="Search by name, phone, or vehicle number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Search size={16} style={{ position: 'absolute', left: 10, top: 11, color: 'var(--text-muted)' }} />
        </div>
      </div>

      {/* Customer List */}
      {filteredCustomers.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><UserCheck size={32} /></div>
          <div className="empty-state-text">No credit customers found.</div>
        </div>
      ) : (
        filteredCustomers.map((cust) => (
          <div key={cust._id} className="card" style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{cust.name}</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
                  {cust.phone && `📞 ${cust.phone}`}
                  {cust.vehicleNumber && ` | 🚗 ${cust.vehicleNumber}`}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  Credit Limit: ₹{(cust.creditLimit || 0).toLocaleString('en-IN')}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: (cust.currentBalance || 0) > 0 ? 'var(--danger)' : 'var(--success)',
                  }}
                >
                  ₹{(cust.currentBalance || 0).toLocaleString('en-IN')}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
                  {(cust.currentBalance || 0) > 0 ? 'Balance Due' : 'Cleared'}
                </div>
                {userRole !== 'viewer' && (
                  <button
                    className="btn btn-sm btn-outline"
                    style={{ fontSize: 12, padding: '4px 10px' }}
                    onClick={() => openPayment(cust)}
                  >
                    <DollarSign size={14} /> Receive Payment
                  </button>
                )}
              </div>
            </div>
          </div>
        ))
      )}

      {/* Add Customer Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Register Credit Customer">
        <form onSubmit={handleAddCustomer}>
          <div className="form-group">
            <label className="form-label">Customer / Fleet Name *</label>
            <input
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sharma Transport"
              required
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input
                className="form-input"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91..."
              />
            </div>
            <div className="form-group">
              <label className="form-label">Vehicle No.</label>
              <input
                className="form-input"
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value)}
                placeholder="RJ14-GB-1234"
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Credit Limit (₹)</label>
            <input
              className="form-input"
              type="number"
              value={creditLimit}
              onChange={(e) => setCreditLimit(e.target.value)}
              placeholder="50000"
            />
          </div>
          <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: 16 }}>
            Save Customer
          </button>
        </form>
      </Modal>

      {/* Receive Payment Modal */}
      <Modal isOpen={showPayModal} onClose={() => setShowPayModal(false)} title={`Receive Payment - ${selectedCustomer?.name}`}>
        <form onSubmit={handleRecordPayment}>
          <div style={{ padding: 12, background: 'var(--bg-input)', borderRadius: 6, marginBottom: 14 }}>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Current Outstanding:</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--danger)' }}>
              ₹{(selectedCustomer?.currentBalance || 0).toLocaleString('en-IN')}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Amount Received (₹) *</label>
            <input
              className="form-input"
              type="number"
              step="0.01"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              placeholder="0.00"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Payment Mode</label>
            <select className="form-input" value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)}>
              <option value="Cash">Cash</option>
              <option value="UPI / Online">UPI / Online Transfer</option>
              <option value="Bank Transfer (NEFT/RTGS)">Bank Transfer (NEFT/RTGS)</option>
              <option value="Cheque">Cheque</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Notes / Reference No.</label>
            <input
              className="form-input"
              value={paymentNotes}
              onChange={(e) => setPaymentNotes(e.target.value)}
              placeholder="e.g. UTR / Slip #1234"
            />
          </div>

          <button type="submit" className="btn btn-success btn-block" style={{ marginTop: 16 }}>
            Confirm & Reduce Balance
          </button>
        </form>
      </Modal>

      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </div>
  );
}
