'use client';

import { useState, useEffect, useCallback } from 'react';
import Modal from '@/components/Modal';
import Toast from '@/components/Toast';

export default function OperatorsPage() {
  const [operators, setOperators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingOp, setEditingOp] = useState(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [toast, setToast] = useState('');

  const fetchOperators = useCallback(async () => {
    try {
      const res = await fetch('/api/operators');
      const json = await res.json();
      setOperators(json);
    } catch (err) {
      console.error('Failed to load operators', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOperators();
  }, [fetchOperators]);

  function openAdd() {
    setEditingOp(null);
    setName('');
    setPhone('');
    setShowModal(true);
  }

  function openEdit(op) {
    setEditingOp(op);
    setName(op.name);
    setPhone(op.phone || '');
    setShowModal(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      if (editingOp) {
        await fetch(`/api/operators/${editingOp._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, phone }),
        });
        setToast('Operator updated');
      } else {
        await fetch('/api/operators', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, phone }),
        });
        setToast('Operator added');
      }
      setShowModal(false);
      fetchOperators();
    } catch (err) {
      setToast('Error saving operator');
    }
  }

  async function toggleActive(op) {
    try {
      await fetch(`/api/operators/${op._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !op.active }),
      });
      setToast(op.active ? 'Operator deactivated' : 'Operator activated');
      fetchOperators();
    } catch (err) {
      setToast('Error updating operator');
    }
  }

  if (loading) {
    return (
      <div className="page">
        <div className="loading">Loading operators...</div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Operators</h1>
        <button className="btn btn-primary btn-sm" onClick={openAdd}>+ Add</button>
      </div>

      {operators.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">👷</div>
          <div className="empty-state-text">No operators added yet</div>
        </div>
      ) : (
        operators.map((op) => (
          <div key={op._id} className="list-item">
            <div className="list-item-info">
              <div className="list-item-name">{op.name}</div>
              <div className="list-item-sub">
                {op.phone || 'No phone'}
                <span style={{ margin: '0 8px' }}>·</span>
                <span className={`badge ${op.active ? 'badge-active' : 'badge-inactive'}`}>
                  {op.active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
            <div className="list-item-actions">
              <button className="btn-icon" onClick={() => openEdit(op)} title="Edit">✏️</button>
              <button
                className={`btn-icon ${op.active ? 'danger' : ''}`}
                onClick={() => toggleActive(op)}
                title={op.active ? 'Deactivate' : 'Activate'}
              >
                {op.active ? '🚫' : '✅'}
              </button>
            </div>
          </div>
        ))
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingOp ? 'Edit Operator' : 'Add Operator'}>
        <form onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label">Name *</label>
            <input
              className="form-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Operator name"
              autoFocus
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Phone</label>
            <input
              className="form-input"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone number"
            />
          </div>
          <button type="submit" className="btn btn-primary btn-block">
            {editingOp ? 'Update' : 'Add Operator'}
          </button>
        </form>
      </Modal>

      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </div>
  );
}
