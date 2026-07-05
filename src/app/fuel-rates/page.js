'use client';

import { useState, useEffect, useCallback } from 'react';
import Modal from '@/components/Modal';
import Toast from '@/components/Toast';

export default function FuelRatesPage() {
  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRate, setEditingRate] = useState(null);
  const [rateValue, setRateValue] = useState('');
  const [toast, setToast] = useState('');
  const [userRole, setUserRole] = useState('admin');

  const fetchRates = useCallback(async () => {
    try {
      const [res, authRes] = await Promise.all([
        fetch('/api/fuel-rates'),
        fetch('/api/auth/me')
      ]);
      const json = await res.json();
      const authData = await authRes.json();
      setRates(json);
      setUserRole(authData.role);
    } catch (err) {
      console.error('Failed to load rates', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRates();
  }, [fetchRates]);

  function openEdit(rate) {
    if (userRole === 'manager') return;
    setEditingRate(rate);
    setRateValue(rate.rate.toString());
    setShowModal(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!rateValue || isNaN(rateValue)) return;

    try {
      await fetch(`/api/fuel-rates/${editingRate._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rate: parseFloat(rateValue) }),
      });
      setToast(`${editingRate.fuelType} rate updated`);
      setShowModal(false);
      fetchRates();
    } catch (err) {
      setToast('Error updating rate');
    }
  }

  const fuelIcons = {
    'Petrol': '🟡',
    'Diesel': '🟤',
    'Premium Petrol': '🟠',
    'CNG': '🟢',
  };

  if (loading) {
    return (
      <div className="page">
        <div className="loading">Loading fuel rates...</div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Fuel Rates</h1>
      </div>

      {rates.map((rate) => (
        <div 
          key={rate._id} 
          className="rate-card" 
          onClick={() => openEdit(rate)} 
          style={{ cursor: userRole === 'manager' ? 'default' : 'pointer' }}
        >
          <div className="rate-info">
            <div className="rate-fuel-name">
              {fuelIcons[rate.fuelType] || '⛽'} {rate.fuelType}
            </div>
            <div className="rate-updated">
              Updated: {rate.updatedAt ? new Date(rate.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Never'}
            </div>
          </div>
          <div>
            <span className="rate-value">₹{rate.rate.toFixed(2)}</span>
            <span className="rate-unit">/ {rate.fuelType === 'CNG' ? 'kg' : 'L'}</span>
          </div>
        </div>
      ))}

      {userRole !== 'manager' && (
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', marginTop: 16 }}>
          Tap a fuel type to update its rate
        </p>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={`Update ${editingRate?.fuelType} Rate`}>
        <form onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label">
              Rate per {editingRate?.fuelType === 'CNG' ? 'kg' : 'litre'} (₹)
            </label>
            <input
              className="form-input"
              type="number"
              step="0.01"
              value={rateValue}
              onChange={(e) => setRateValue(e.target.value)}
              placeholder="0.00"
              autoFocus
              required
            />
          </div>
          <button type="submit" className="btn btn-primary btn-block">
            Update Rate
          </button>
        </form>
      </Modal>

      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </div>
  );
}
