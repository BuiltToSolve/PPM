'use client';

import { useState, useEffect, useCallback } from 'react';
import Modal from '@/components/Modal';
import Toast from '@/components/Toast';

export default function InventoryPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [toast, setToast] = useState('');
  
  // Form State
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [stock, setStock] = useState('');
  const [price, setPrice] = useState('');

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch('/api/inventory');
      const json = await res.json();
      setItems(json);
    } catch (err) {
      console.error('Failed to load inventory', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  function openAdd() {
    setEditingItem(null);
    setName('');
    setCategory('');
    setStock('');
    setPrice('');
    setShowModal(true);
  }

  function openEdit(item) {
    setEditingItem(item);
    setName(item.name);
    setCategory(item.category);
    setStock(item.stock.toString());
    setPrice(item.price.toString());
    setShowModal(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!name || !category || stock === '' || price === '') return;

    try {
      const payload = {
        name,
        category,
        stock: parseInt(stock, 10),
        price: parseFloat(price)
      };

      if (editingItem) {
        await fetch(`/api/inventory/${editingItem._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        setToast('Item updated');
      } else {
        await fetch('/api/inventory', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        setToast('Item added');
      }
      
      setShowModal(false);
      fetchItems();
    } catch (err) {
      setToast('Error saving item');
    }
  }

  async function handleDelete(id) {
    if (!confirm('Are you sure you want to delete this item?')) return;
    
    try {
      await fetch(`/api/inventory/${id}`, {
        method: 'DELETE',
      });
      setToast('Item deleted');
      fetchItems();
    } catch (err) {
      setToast('Error deleting item');
    }
  }

  const categoryIcons = {
    'Stationery': '📝',
    'Equipment': '🔧',
    'Lubricants': '🛢️',
    'Accessories': '🚘',
    'Other': '📦'
  };

  function getCategoryIcon(cat) {
    return categoryIcons[cat] || '📦';
  }

  if (loading) {
    return (
      <div className="page">
        <div className="loading">Loading inventory...</div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <button className="btn btn-outline" style={{ opacity: 0, pointerEvents: 'none' }}>
          Add
        </button>
        <h1 className="page-title">Inventory</h1>
        <button className="btn btn-primary" onClick={openAdd}>
          + Add
        </button>
      </div>

      {items.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📦</div>
          <div className="empty-state-text">No items in inventory</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '12px' }}>
          {items.map((item) => (
            <div key={item._id} className="card" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ fontSize: '24px' }}>
                  {getCategoryIcon(item.category)}
                </div>
                <div>
                  <div style={{ fontWeight: '600', fontSize: '15px' }}>{item.name}</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {item.category} • ₹{item.price.toFixed(2)}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Stock</div>
                  <div style={{ fontWeight: '700', fontSize: '16px', color: item.stock <= 5 ? 'var(--danger)' : 'var(--text-primary)' }}>
                    {item.stock}
                  </div>
                </div>
                <div className="list-item-actions">
                  <button className="btn-icon" onClick={() => openEdit(item)} title="Edit">✏️</button>
                  <button className="btn-icon danger" onClick={() => handleDelete(item._id)} title="Delete">🗑️</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingItem ? 'Edit Item' : 'Add Item'}>
        <form onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label">Item Name</label>
            <input
              className="form-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Thermal Paper Roll"
              required
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Category</label>
            <select
              className="form-input"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
            >
              <option value="" disabled>Select Category</option>
              <option value="Stationery">Stationery</option>
              <option value="Equipment">Equipment</option>
              <option value="Lubricants">Lubricants</option>
              <option value="Accessories">Accessories</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Stock Quantity</label>
              <input
                className="form-input"
                type="number"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                placeholder="0"
                min="0"
                required
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">Selling Price (₹)</label>
              <input
                className="form-input"
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                min="0"
                required
              />
            </div>
          </div>
          
          <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: '10px' }}>
            {editingItem ? 'Save Changes' : 'Add Item'}
          </button>
        </form>
      </Modal>

      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </div>
  );
}
