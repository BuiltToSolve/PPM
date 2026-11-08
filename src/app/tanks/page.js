'use client';

import { useState, useEffect, useCallback } from 'react';
import Modal from '@/components/Modal';
import Toast from '@/components/Toast';
import { apiFetch } from '@/lib/apiClient';
import { Droplet, Plus, RefreshCw } from 'lucide-react';

export default function TanksPage() {
  const [tanks, setTanks] = useState([]);
  const [dipLogs, setDipLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState('');
  const [userRole, setUserRole] = useState('admin');

  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

  // Form State
  const [selectedTankId, setSelectedTankId] = useState('');
  const [dipDate, setDipDate] = useState(todayStr);
  const [shift, setShift] = useState('Morning');
  const [dipCm, setDipCm] = useState('');
  const [physicalStockLiters, setPhysicalStockLiters] = useState('');
  const [waterDipCm, setWaterDipCm] = useState('0');

  const fetchTanksAndLogs = useCallback(async () => {
    try {
      const [tanksData, logsData] = await Promise.all([
        apiFetch('/api/tanks'),
        apiFetch('/api/tanks/dip-log'),
      ]);
      setTanks(tanksData);
      setDipLogs(logsData);
    } catch (err) {
      console.error('Failed to load tanks data', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const [tanksData, logsData, auth] = await Promise.all([
          apiFetch('/api/tanks'),
          apiFetch('/api/tanks/dip-log'),
          apiFetch('/api/auth/me').catch(() => null),
        ]);
        if (!ignore) {
          setTanks(tanksData);
          setDipLogs(logsData);
          if (auth?.role) setUserRole(auth.role);
        }
      } catch (err) {
        console.error('Failed to load tanks data', err);
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, []);

  function openAddDip(tankId = '') {
    setSelectedTankId(tankId || (tanks[0]?._id || ''));
    setDipDate(todayStr);
    setShift('Morning');
    setDipCm('');
    setPhysicalStockLiters('');
    setWaterDipCm('0');
    setShowModal(true);
  }

  async function handleSaveDip(e) {
    e.preventDefault();
    if (!selectedTankId || !dipCm || !physicalStockLiters) {
      setToast('Please fill all required dip fields');
      return;
    }

    const tank = tanks.find((t) => t._id === selectedTankId);

    try {
      await apiFetch('/api/tanks/dip-log', {
        method: 'POST',
        body: JSON.stringify({
          tankId: selectedTankId,
          tankNumber: tank?.tankNumber,
          fuelType: tank?.fuelType,
          date: dipDate,
          shift,
          dipCm: parseFloat(dipCm),
          waterDipCm: parseFloat(waterDipCm) || 0,
          physicalStockLiters: parseFloat(physicalStockLiters),
        }),
      });

      setToast('Tank dip reading logged successfully');
      setShowModal(false);
      fetchTanksAndLogs();
    } catch (err) {
      setToast(err.message || 'Error saving dip log');
    }
  }

  if (loading) {
    return (
      <div className="page">
        <div className="loading">Loading tank stocks & dip records...</div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="page-title">Underground Tanks</h1>
        {userRole !== 'viewer' && (
          <button className="btn btn-primary btn-sm" onClick={() => openAddDip()}>
            <Plus size={16} /> Record Dip
          </button>
        )}
      </div>

      {/* Tank Cards Grid */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        {tanks.map((tank) => {
          const pct = Math.min(100, Math.round(((tank.currentStockLiters || 0) / tank.capacityLiters) * 100));
          return (
            <div key={tank._id} className="stat-card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: 16 }}>
                  Tank #{tank.tankNumber}: {tank.fuelType}
                </span>
                <span className="badge badge-active" style={{ fontSize: 11, padding: '2px 8px' }}>
                  {pct}% Full
                </span>
              </div>
              <div className="stat-value" style={{ color: pct < 20 ? 'var(--danger)' : 'var(--accent)' }}>
                {(tank.currentStockLiters || 0).toLocaleString('en-IN')} L
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                Capacity: {tank.capacityLiters.toLocaleString('en-IN')} L
                {tank.lastDipCm !== undefined && ` | Last Dip: ${tank.lastDipCm} cm`}
              </div>
              {/* Simple visual fuel gauge bar */}
              <div style={{ width: '100%', height: 6, background: 'var(--border-light)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: pct < 20 ? 'var(--danger)' : 'var(--success)' }}></div>
              </div>
              {userRole !== 'viewer' && (
                <button
                  className="btn btn-outline btn-sm"
                  style={{ marginTop: 6, fontSize: 12, padding: '4px 8px' }}
                  onClick={() => openAddDip(tank._id)}
                >
                  Log Dip for Tank #{tank.tankNumber}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Dip Log History */}
      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="card-title" style={{ margin: 0 }}>Recent Dip Logs & Loss/Gain</span>
          <button className="btn btn-sm btn-outline" onClick={fetchTanksAndLogs} title="Refresh">
            <RefreshCw size={14} />
          </button>
        </div>

        {dipLogs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><Droplet size={32} /></div>
            <div className="empty-state-text">No tank dip readings recorded yet.</div>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="report-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Tank</th>
                  <th>Shift</th>
                  <th>Dip (cm)</th>
                  <th className="text-right">Physical Stock (L)</th>
                  <th className="text-right">Net Change</th>
                </tr>
              </thead>
              <tbody>
                {dipLogs.slice(0, 15).map((log) => (
                  <tr key={log._id}>
                    <td>{log.date}</td>
                    <td>Tank #{log.tankNumber} ({log.fuelType})</td>
                    <td>{log.shift}</td>
                    <td>{log.dipCm} cm</td>
                    <td className="text-right" style={{ fontWeight: 600 }}>
                      {log.physicalStockLiters?.toLocaleString('en-IN')} L
                    </td>
                    <td
                      className="text-right"
                      style={{
                        fontWeight: 600,
                        color: log.varianceLiters >= 0 ? 'var(--success)' : 'var(--danger)',
                      }}
                    >
                      {log.varianceLiters >= 0 ? `+${log.varianceLiters}` : log.varianceLiters} L
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Dip Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Record Physical Tank Dip">
        <form onSubmit={handleSaveDip}>
          <div className="form-group">
            <label className="form-label">Underground Tank *</label>
            <select
              className="form-input"
              value={selectedTankId}
              onChange={(e) => setSelectedTankId(e.target.value)}
              required
            >
              {tanks.map((t) => (
                <option key={t._id} value={t._id}>
                  Tank #{t.tankNumber} — {t.fuelType} (Capacity: {t.capacityLiters} L)
                </option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Date *</label>
              <input
                className="form-input"
                type="date"
                value={dipDate}
                max={todayStr}
                onChange={(e) => setDipDate(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Shift</label>
              <select className="form-input" value={shift} onChange={(e) => setShift(e.target.value)}>
                <option value="Morning">Morning (Opening)</option>
                <option value="Evening">Evening (Closing)</option>
                <option value="Night">Night</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Fuel Dip Reading (cm) *</label>
              <input
                className="form-input"
                type="number"
                step="0.1"
                min="0"
                value={dipCm}
                onChange={(e) => setDipCm(e.target.value)}
                placeholder="e.g. 142.5"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Physical Stock (Liters) *</label>
              <input
                className="form-input"
                type="number"
                step="1"
                min="0"
                value={physicalStockLiters}
                onChange={(e) => setPhysicalStockLiters(e.target.value)}
                placeholder="From dip chart"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Water Dip (cm) - Optional</label>
            <input
              className="form-input"
              type="number"
              step="0.1"
              min="0"
              value={waterDipCm}
              onChange={(e) => setWaterDipCm(e.target.value)}
              placeholder="0.0"
            />
          </div>

          <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: 16 }}>
            Save Dip Record
          </button>
        </form>
      </Modal>

      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </div>
  );
}
