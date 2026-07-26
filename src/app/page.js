'use client';

import { useState, useEffect } from 'react';
import { LogOut } from 'lucide-react';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('Dashboard');

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

  useEffect(() => {
    fetchDashboard();
  }, []);

  async function fetchDashboard() {
    try {
      const [res, authRes] = await Promise.all([
        fetch(`/api/dashboard?date=${today}`),
        fetch('/api/auth/me')
      ]);
      const json = await res.json();
      const authData = await authRes.json();
      setData(json);
      if (authData.username) {
        setUsername(authData.username.charAt(0).toUpperCase() + authData.username.slice(1));
      }
    } catch (err) {
      console.error('Failed to load dashboard', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="page">
        <div className="loading">Loading dashboard...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="page">
        <div className="empty-state">
          <div className="empty-state-icon">⚠️</div>
          <div className="empty-state-text">Failed to load dashboard</div>
        </div>
      </div>
    );
  }

  const fuelEntries = Object.entries(data.fuelWise || {});
  const operatorEntries = Object.entries(data.operatorWise || {});

  return (
    <div className="page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="page-title">{username}</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            {new Date(today).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
          </span>
          <button 
            className="btn btn-sm btn-outline" 
            title="Logout"
            style={{ padding: '6px', color: 'var(--danger)', borderColor: 'var(--danger)', display: 'flex', alignItems: 'center' }}
            onClick={async () => {
              await fetch('/api/auth/logout', { method: 'POST' });
              window.location.href = '/login';
            }}
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="stats-grid">
        <div className="stat-card accent full-width">
          <div className="stat-value">₹{data.totalAmount.toLocaleString('en-IN')}</div>
          <div className="stat-label">Today&apos;s Total Sale</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--success)' }}>₹{data.totalCash.toLocaleString('en-IN')}</div>
          <div className="stat-label">Cash</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--accent)' }}>₹{data.totalDigital.toLocaleString('en-IN')}</div>
          <div className="stat-label">Digital</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--accent-alt, #007aff)' }}>₹{data.totalHp?.toLocaleString('en-IN') || 0}</div>
          <div className="stat-label">HP</div>
        </div>
        {(data.unsettledDebt || 0) > 0 && (
          <div className="stat-card full-width">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div className="stat-value" style={{ color: 'var(--danger)' }}>₹{data.unsettledDebt.toLocaleString('en-IN')}</div>
                <div className="stat-label">Unsettled Debt</div>
              </div>
              <span className="badge badge-inactive" style={{ fontSize: 12, padding: '4px 10px' }}>Pending</span>
            </div>
          </div>
        )}
      </div>

      {/* Fuel-wise Breakdown */}
      {fuelEntries.length > 0 && (
        <>
          <div className="section-title">Fuel-wise Sales</div>
          {fuelEntries.map(([fuel, info]) => (
            <div key={fuel} className="list-item">
              <div className="list-item-info">
                <div className="list-item-name">{fuel}</div>
                <div className="list-item-sub">{info.qty.toFixed(2)} L / kg</div>
              </div>
              <div style={{ fontWeight: 700, color: 'var(--accent)' }}>
                ₹{info.amount.toLocaleString('en-IN')}
              </div>
            </div>
          ))}
        </>
      )}

      {/* Operator-wise Breakdown */}
      {operatorEntries.length > 0 && (
        <>
          <div className="section-title">Operator-wise Sales</div>
          {operatorEntries.map(([operator, info]) => (
            <div key={operator} className="list-item">
              <div className="list-item-info">
                <div className="list-item-name">{operator}</div>
                <div className="list-item-sub">
                  Cash: ₹{info.cash.toLocaleString('en-IN')} | Digital: ₹{info.digital.toLocaleString('en-IN')} | HP: ₹{info.hp?.toLocaleString('en-IN') || 0}
                </div>
              </div>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                ₹{info.amount.toLocaleString('en-IN')}
              </div>
            </div>
          ))}
        </>
      )}

      {data.totalEntries === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">📊</div>
          <div className="empty-state-text">No sales recorded today</div>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: 8 }}>
            Go to Sales to add entries
          </p>
        </div>
      )}
    </div>
  );
}
