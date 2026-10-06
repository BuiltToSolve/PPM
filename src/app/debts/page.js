'use client';

import { useState, useEffect, useMemo } from 'react';
import { Search, X, AlertCircle, CheckCircle2, Wallet, Calendar, RotateCcw } from 'lucide-react';
import Toast from '@/components/Toast';

const MONTHS = [
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

export default function DebtsPage() {
  const [debts, setDebts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'unsettled', 'settled'
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState('');
  const [userRole, setUserRole] = useState('admin');

  // Month and Year selection (defaults to current month and year)
  const now = new Date();
  const currentYearStr = String(now.getFullYear());
  const currentMonthStr = String(now.getMonth() + 1).padStart(2, '0');

  const [selectedYear, setSelectedYear] = useState(currentYearStr);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);

  useEffect(() => {
    fetchDebts();
  }, []);

  async function fetchDebts() {
    setLoading(true);
    try {
      const [res, authRes] = await Promise.all([
        fetch('/api/debts?status=all'),
        fetch('/api/auth/me'),
      ]);
      const data = await res.json();
      const authData = await authRes.json();
      setDebts(Array.isArray(data) ? data : []);
      if (authData?.role) {
        setUserRole(authData.role);
      }
    } catch (err) {
      setToast('Error loading debts');
    } finally {
      setLoading(false);
    }
  }

  async function handleSettle(saleId) {
    try {
      await fetch(`/api/daily-sales/${saleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ debtSettled: true }),
      });
      setToast('Debt marked as settled');
      fetchDebts();
    } catch (err) {
      setToast('Error settling debt');
    }
  }

  async function handleSettleEntry(saleId, index) {
    try {
      await fetch(`/api/daily-sales/${saleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settleDebtEntryIndex: index }),
      });
      setToast('Debt entry settled');
      fetchDebts();
    } catch (err) {
      setToast('Error settling debt entry');
    }
  }

  const formatCurrency = (val) => {
    const num = Number(val) || 0;
    return num.toLocaleString('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  };

  const getRemainingDebt = (sale) => {
    if (sale.debtSettled) return 0;
    if (Array.isArray(sale.debtEntries) && sale.debtEntries.length > 0) {
      return sale.debtEntries.reduce((sum, e) => (!e.settled ? sum + (Number(e.amount) || 0) : sum), 0);
    }
    return Number(sale.debtAmount) || 0;
  };

  // Derive distinct years from data
  const availableYears = useMemo(() => {
    const years = new Set();
    const currY = new Date().getFullYear();
    years.add(currY);
    debts.forEach((s) => {
      if (s.date && typeof s.date === 'string') {
        const y = parseInt(s.date.slice(0, 4), 10);
        if (!isNaN(y)) years.add(y);
      }
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [debts]);

  const isAllTime = !selectedYear && !selectedMonth;
  const isCurrentMonth = selectedYear === currentYearStr && selectedMonth === currentMonthStr;

  const handleResetPeriod = () => {
    setSelectedYear('');
    setSelectedMonth('');
  };

  const handleSetCurrentMonth = () => {
    setSelectedYear(currentYearStr);
    setSelectedMonth(currentMonthStr);
  };

  const periodLabel = useMemo(() => {
    if (!selectedYear && !selectedMonth) return 'All Time (All Records)';
    const monthObj = MONTHS.find((m) => m.value === selectedMonth);
    if (selectedYear && selectedMonth) {
      return `${monthObj?.label || 'Month ' + selectedMonth} ${selectedYear}`;
    }
    if (selectedYear) {
      return `Year ${selectedYear}`;
    }
    return `${monthObj?.label || 'Month ' + selectedMonth} (All Years)`;
  }, [selectedYear, selectedMonth]);

  // 1. Filter debts by selected Month and Year
  const dateFilteredDebts = useMemo(() => {
    return debts.filter((sale) => {
      if (!sale.date) return false;
      const dateStr = typeof sale.date === 'string' ? sale.date : (sale.date?.toISOString?.() || '');
      const saleYear = dateStr.slice(0, 4);
      const saleMonth = dateStr.slice(5, 7);

      if (selectedYear && saleYear !== selectedYear) return false;
      if (selectedMonth && saleMonth !== selectedMonth) return false;

      return true;
    });
  }, [debts, selectedYear, selectedMonth]);

  const searchTrimmed = searchQuery.trim().toLowerCase();

  // 2. Filter by search term within the date-filtered debts
  const searchFilteredDebts = useMemo(() => {
    if (!searchTrimmed) return dateFilteredDebts;
    return dateFilteredDebts.filter((sale) => {
      const operatorMatches = sale.operatorName && sale.operatorName.toLowerCase().includes(searchTrimmed);
      const clientMatches = Array.isArray(sale.debtEntries) && sale.debtEntries.some(
        (entry) => entry.clientName && entry.clientName.toLowerCase().includes(searchTrimmed)
      );
      return Boolean(operatorMatches || clientMatches);
    });
  }, [dateFilteredDebts, searchTrimmed]);

  // Stats for All, Unsettled, Settled matching current period and search query
  const searchStats = useMemo(() => {
    const all = searchFilteredDebts;
    const unsettled = searchFilteredDebts.filter((s) => !s.debtSettled);
    const settled = searchFilteredDebts.filter((s) => Boolean(s.debtSettled));

    return {
      allSum: all.reduce((sum, s) => sum + (Number(s.debtAmount) || 0), 0),
      allCount: all.length,
      unsettledSum: unsettled.reduce((sum, s) => sum + (Number(s.debtAmount) || 0), 0),
      unsettledRemaining: unsettled.reduce((sum, s) => sum + getRemainingDebt(s), 0),
      unsettledCount: unsettled.length,
      settledSum: settled.reduce((sum, s) => sum + (Number(s.debtAmount) || 0), 0),
      settledCount: settled.length,
      unsettledList: unsettled,
      settledList: settled,
      allList: all,
    };
  }, [searchFilteredDebts]);

  // List of debt records currently showing on the page based on status filter
  const displayedDebts = useMemo(() => {
    if (filter === 'settled') return searchStats.settledList;
    if (filter === 'unsettled') return searchStats.unsettledList;
    return searchStats.allList;
  }, [filter, searchStats]);

  // Total sum of all the debt records showing on the page
  const pageTotal = useMemo(() => {
    return displayedDebts.reduce((sum, s) => sum + (Number(s.debtAmount) || 0), 0);
  }, [displayedDebts]);

  const pageRemaining = useMemo(() => {
    return displayedDebts.reduce((sum, s) => sum + getRemainingDebt(s), 0);
  }, [displayedDebts]);

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">All Debts</h1>
      </div>

      {/* Month & Year Filter Selector */}
      <div className="card" style={{ padding: '14px 16px', marginBottom: 14, overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Calendar size={18} color="var(--accent)" />
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
              Period Filter
            </span>
            <span
              className="badge"
              style={{
                background: isAllTime ? 'rgba(0,0,0,0.06)' : 'var(--accent-light)',
                color: isAllTime ? 'var(--text-secondary)' : 'var(--accent)',
                fontWeight: 600,
              }}
            >
              {periodLabel}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end', width: '100%' }}>
          <div style={{ flex: '1 1 130px', minWidth: 0 }}>
            <label className="form-label" style={{ fontSize: 11, marginBottom: 4 }}>Month</label>
            <select
              className="form-input"
              style={{ width: '100%', marginBottom: 0, height: 40, fontSize: 13 }}
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              <option value="">All Months</option>
              {MONTHS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div style={{ flex: '1 1 110px', minWidth: 0 }}>
            <label className="form-label" style={{ fontSize: 11, marginBottom: 4 }}>Year</label>
            <select
              className="form-input"
              style={{ width: '100%', marginBottom: 0, height: 40, fontSize: 13 }}
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
            >
              <option value="">All Years</option>
              {availableYears.map((yr) => (
                <option key={yr} value={String(yr)}>
                  {yr}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: 8, flex: '1 1 190px', minWidth: 0 }}>
            <button
              type="button"
              className="btn btn-sm btn-outline"
              disabled={isAllTime}
              onClick={handleResetPeriod}
              style={{
                height: 40,
                flex: 1,
                minWidth: 0,
                opacity: isAllTime ? 0.4 : 1,
                cursor: isAllTime ? 'default' : 'pointer',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
                fontSize: 13,
                padding: '0 10px',
              }}
              title="Reset period to all records"
            >
              <RotateCcw size={14} />
              Reset (All Time)
            </button>
            {!isCurrentMonth && (
              <button
                type="button"
                className="btn btn-sm"
                onClick={handleSetCurrentMonth}
                style={{
                  height: 40,
                  flex: 1,
                  minWidth: 0,
                  background: 'var(--bg-input)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border)',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 13,
                  padding: '0 10px',
                }}
                title="Switch to current month and year"
              >
                Current Month
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Search by Name Filter */}
      <div className="card" style={{ padding: '12px 16px', marginBottom: 14 }}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search
            size={18}
            style={{
              position: 'absolute',
              left: 14,
              color: 'var(--text-muted)',
              pointerEvents: 'none',
            }}
          />
          <input
            type="text"
            className="form-input"
            style={{
              paddingLeft: 42,
              paddingRight: searchQuery ? 40 : 14,
              marginBottom: 0,
              height: 44,
              fontSize: 14,
              borderRadius: 'var(--radius-sm)',
            }}
            placeholder={isAllTime ? 'Search by operator or client name (All Records)...' : `Search by name within ${periodLabel}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              title="Clear search"
              style={{
                position: 'absolute',
                right: 12,
                background: 'var(--bg-input)',
                border: 'none',
                cursor: 'pointer',
                padding: 4,
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                transition: 'all 0.15s ease',
              }}
            >
              <X size={16} />
            </button>
          )}
        </div>
        {searchTrimmed && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, fontSize: 12, color: 'var(--text-secondary)', flexWrap: 'wrap', gap: 6 }}>
            <span>
              Searching in <strong>{periodLabel}</strong>: <strong>&ldquo;{searchQuery}&rdquo;</strong> ({searchFilteredDebts.length} match{searchFilteredDebts.length === 1 ? '' : 'es'})
            </span>
            <div style={{ display: 'flex', gap: 10 }}>
              {!isAllTime && (
                <button
                  type="button"
                  onClick={handleResetPeriod}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--accent)',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: 12,
                    padding: 0,
                  }}
                  title="Search across all time records"
                >
                  Search all records
                </button>
              )}
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: 12,
                  padding: 0,
                }}
              >
                Clear text
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Summary Totals Cards for All, Unsettled, Settled */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: 12,
          marginBottom: 16,
        }}
      >
        {/* All Debts Card */}
        <div
          onClick={() => setFilter('all')}
          className="stat-card"
          style={{
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            border: filter === 'all' ? '2px solid var(--accent)' : '1px solid var(--border-light)',
            background: filter === 'all' ? 'var(--accent-light)' : 'var(--bg-card)',
            boxShadow: filter === 'all' ? 'var(--shadow-md)' : 'var(--shadow-sm)',
            position: 'relative',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Wallet size={16} color={filter === 'all' ? 'var(--accent)' : 'var(--text-secondary)'} />
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  color: filter === 'all' ? 'var(--accent)' : 'var(--text-secondary)',
                }}
              >
                All Debts
              </span>
            </div>
            <span
              className="badge"
              style={{
                background: filter === 'all' ? 'var(--accent)' : 'var(--bg-input)',
                color: filter === 'all' ? '#ffffff' : 'var(--text-secondary)',
                fontWeight: 600,
              }}
            >
              {searchStats.allCount}
            </span>
          </div>
          <div
            className="stat-value"
            style={{
              marginTop: 8,
              fontSize: 20,
              fontWeight: 700,
              color: 'var(--text-primary)',
            }}
          >
            ₹{formatCurrency(searchStats.allSum)}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            For {periodLabel} {searchTrimmed ? '(matching)' : ''}
          </div>
        </div>

        {/* Unsettled Debts Card */}
        <div
          onClick={() => setFilter('unsettled')}
          className="stat-card"
          style={{
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            border: filter === 'unsettled' ? '2px solid var(--danger)' : '1px solid var(--border-light)',
            background: filter === 'unsettled' ? 'var(--danger-light)' : 'var(--bg-card)',
            boxShadow: filter === 'unsettled' ? 'var(--shadow-md)' : 'var(--shadow-sm)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <AlertCircle size={16} color="var(--danger)" />
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  color: 'var(--danger)',
                }}
              >
                Unsettled
              </span>
            </div>
            <span className="badge badge-inactive">
              {searchStats.unsettledCount}
            </span>
          </div>
          <div
            className="stat-value"
            style={{
              marginTop: 8,
              fontSize: 20,
              fontWeight: 700,
              color: 'var(--danger)',
            }}
          >
            ₹{formatCurrency(searchStats.unsettledSum)}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            Pending settlement {searchStats.unsettledRemaining < searchStats.unsettledSum && (
              <span style={{ color: 'var(--danger)', fontWeight: 600 }}>· Rem: ₹{formatCurrency(searchStats.unsettledRemaining)}</span>
            )}
          </div>
        </div>

        {/* Settled Debts Card */}
        <div
          onClick={() => setFilter('settled')}
          className="stat-card"
          style={{
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            border: filter === 'settled' ? '2px solid var(--success)' : '1px solid var(--border-light)',
            background: filter === 'settled' ? 'var(--success-light)' : 'var(--bg-card)',
            boxShadow: filter === 'settled' ? 'var(--shadow-md)' : 'var(--shadow-sm)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <CheckCircle2 size={16} color="var(--success)" />
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  color: 'var(--success)',
                }}
              >
                Settled
              </span>
            </div>
            <span className="badge badge-active">
              {searchStats.settledCount}
            </span>
          </div>
          <div
            className="stat-value"
            style={{
              marginTop: 8,
              fontSize: 20,
              fontWeight: 700,
              color: 'var(--success)',
            }}
          >
            ₹{formatCurrency(searchStats.settledSum)}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            Fully cleared for {periodLabel}
          </div>
        </div>
      </div>

      {/* Total Sum of Records Currently Showing on Page Banner */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 10,
          padding: '12px 16px',
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius)',
          border: '1px solid var(--border-light)',
          marginBottom: 16,
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          Showing <strong>{displayedDebts.length}</strong> {filter === 'all' ? '' : filter} debt {displayedDebts.length === 1 ? 'record' : 'records'}
          {!isAllTime && (
            <span> for <strong>{periodLabel}</strong></span>
          )}
          {searchTrimmed && (
            <span> matching &ldquo;<strong>{searchQuery}</strong>&rdquo;</span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>
            Total Sum Showing:
          </span>
          <span
            style={{
              fontSize: 17,
              fontWeight: 700,
              color: filter === 'settled' ? 'var(--success)' : filter === 'unsettled' ? 'var(--danger)' : 'var(--accent)',
            }}
          >
            ₹{formatCurrency(pageTotal)}
          </span>
          {filter === 'unsettled' && pageRemaining < pageTotal && (
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              (Pending: <strong style={{ color: 'var(--danger)' }}>₹{formatCurrency(pageRemaining)}</strong>)
            </span>
          )}
        </div>
      </div>

      {/* Debts List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>Loading debts...</div>
      ) : displayedDebts.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">💳</div>
          <div className="empty-state-text">
            {searchTrimmed
              ? `No debt records found matching "${searchQuery}" in ${periodLabel}`
              : `No ${filter === 'all' ? '' : filter} debts found for ${periodLabel}`}
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 12 }}>
            {searchTrimmed && (
              <button
                className="btn btn-sm btn-outline"
                onClick={() => setSearchQuery('')}
              >
                Clear Search
              </button>
            )}
            {!isAllTime && (
              <button
                className="btn btn-sm btn-primary"
                onClick={handleResetPeriod}
              >
                Search All Time Records
              </button>
            )}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
          {displayedDebts.map((sale) => {
            const isOperatorMatched = searchTrimmed && sale.operatorName && sale.operatorName.toLowerCase().includes(searchTrimmed);

            return (
              <div
                key={sale._id}
                style={{
                  padding: 16,
                  borderRadius: 'var(--radius)',
                  border: `1px solid ${sale.debtSettled ? 'rgba(64, 192, 87, 0.3)' : 'rgba(250, 82, 82, 0.3)'}`,
                  background: sale.debtSettled ? 'rgba(64, 192, 87, 0.04)' : 'rgba(250, 82, 82, 0.04)',
                  boxShadow: 'var(--shadow-sm)',
                  transition: 'transform 0.1s ease',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: sale.debtEntries?.length > 0 ? 12 : 0,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>
                      <span style={isOperatorMatched ? { background: 'rgba(34, 139, 230, 0.15)', padding: '2px 4px', borderRadius: 4 } : {}}>
                        {sale.operatorName}
                      </span>{' '}
                      <span style={{ fontWeight: 400, color: 'var(--text-secondary)' }}>
                        ({sale.pumpNumber === 5 ? 'CNG' : `Pump ${sale.pumpNumber}`})
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
                      {new Date(sale.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      {sale.fuelType && ` · ${sale.fuelType}`}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: 700,
                        color: sale.debtSettled ? 'var(--success)' : 'var(--danger)',
                      }}
                    >
                      Debt: ₹{formatCurrency(sale.debtAmount)}
                    </div>
                    {sale.debtSettled ? (
                      <span className="badge badge-active" style={{ marginTop: 4 }}>Settled ✓</span>
                    ) : (
                      userRole !== 'manager' && (
                        <button
                          className="btn btn-sm btn-outline"
                          style={{
                            marginTop: 4,
                            fontSize: 12,
                            padding: '3px 10px',
                            borderColor: 'var(--danger)',
                            color: 'var(--danger)',
                            background: 'white',
                          }}
                          onClick={() => handleSettle(sale._id)}
                        >
                          {sale.debtEntries && sale.debtEntries.length > 0 ? 'Settle All' : 'Mark Settled'}
                        </button>
                      )
                    )}
                  </div>
                </div>

                {sale.debtEntries && sale.debtEntries.length > 0 ? (
                  <div style={{ fontSize: 13, borderTop: '1px dashed rgba(0,0,0,0.1)', paddingTop: 10 }}>
                    {sale.debtEntries.map((entry, idx) => {
                      const isClientMatched = searchTrimmed && entry.clientName && entry.clientName.toLowerCase().includes(searchTrimmed);

                      return (
                        <div
                          key={idx}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: 8,
                            padding: isClientMatched ? '4px 6px' : '0',
                            borderRadius: isClientMatched ? 4 : 0,
                            background: isClientMatched ? 'rgba(34, 139, 230, 0.12)' : 'transparent',
                          }}
                        >
                          <span
                            style={{
                              textDecoration: entry.settled ? 'line-through' : 'none',
                              color: entry.settled ? 'var(--success)' : 'var(--text-primary)',
                              fontWeight: isClientMatched ? 700 : 500,
                            }}
                          >
                            {entry.clientName}: ₹{formatCurrency(entry.amount)}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {!entry.settled && !sale.debtSettled && userRole !== 'manager' && (
                              <button
                                className="btn btn-sm btn-outline"
                                style={{ fontSize: 11, padding: '2px 8px', background: 'white' }}
                                onClick={() => handleSettleEntry(sale._id, idx)}
                              >
                                Settle
                              </button>
                            )}
                            {entry.settled && (
                              <span style={{ fontSize: 11, color: 'var(--success)', fontWeight: 600 }}>✓</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {!sale.debtSettled && (
                      <div style={{ fontSize: 13, fontWeight: 600, marginTop: 4, color: 'var(--danger)', textAlign: 'right' }}>
                        Remaining: ₹{formatCurrency(sale.debtEntries.reduce((sum, e) => sum + (e.settled ? 0 : (Number(e.amount) || 0)), 0))}
                      </div>
                    )}
                  </div>
                ) : (
                  !sale.debtSettled && (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', borderTop: '1px dashed rgba(0,0,0,0.1)', paddingTop: 6 }}>
                      No specific client recorded
                    </div>
                  )
                )}
              </div>
            );
          })}
        </div>
      )}

      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </div>
  );
}
