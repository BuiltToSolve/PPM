'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { LogOut, User } from 'lucide-react';
import { apiFetch } from '@/lib/apiClient';

export default function Navbar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [stationName, setStationName] = useState('Petrol Pump');
  const [userInfo, setUserInfo] = useState({ username: '', role: '' });

  useEffect(() => {
    let ignore = false;
    async function loadNavMeta() {
      try {
        const [settings, auth] = await Promise.all([
          apiFetch('/api/settings').catch(() => null),
          apiFetch('/api/auth/me').catch(() => null),
        ]);
        if (!ignore) {
          if (settings?.stationName) setStationName(settings.stationName);
          if (auth) setUserInfo({ username: auth.username || '', role: auth.role || 'admin' });
        }
      } catch (err) {
        console.error('Navbar load error', err);
      }
    }
    if (pathname !== '/login') {
      loadNavMeta();
    }
    return () => {
      ignore = true;
    };
  }, [pathname]);

  if (pathname === '/login') {
    return null;
  }

  const navItems = [
    { href: '/', label: 'Dashboard', icon: '📊' },
    { href: '/daily-sales', label: 'Daily Sales', icon: '⛽' },
    { href: '/customers', label: 'Customer Khata', icon: '👥' },
    { href: '/tanks', label: 'Tanks & Dips', icon: '🛢️' },
    { href: '/operators', label: 'Operators', icon: '👷' },
    { href: '/fuel-rates', label: 'Fuel Rates', icon: '💰' },
    { href: '/debts', label: 'All Debts', icon: '💳' },
    { href: '/daily-sales/report', label: 'Daily Report', icon: '📋' },
    { href: '/monthly-report', label: 'Custom Report', icon: '📅' },
    { href: '/inventory', label: 'Packaged Lubes', icon: '📦' },
    { href: '/inventory/report', label: 'Lubes Report', icon: '📑' },
  ];

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      window.location.href = '/login';
    }
  }

  return (
    <>
      <button 
        className="sidebar-toggle-floating" 
        onClick={() => setIsOpen(!isOpen)}
        title={isOpen ? "Close Sidebar" : "Open Sidebar"}
        aria-label="Toggle Navigation"
      >
        {isOpen ? '✕' : '☰'}
      </button>

      {/* Backdrop overlay on mobile */}
      {isOpen && (
        <div 
          className="sidebar-backdrop" 
          onClick={() => setIsOpen(false)}
        />
      )}

      <nav className={`sidebar-nav ${isOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <div className="sidebar-title">{stationName}</div>
        </div>

        <div className="nav-items-container" style={{ flex: 1, overflowY: 'auto' }}>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item ${pathname === item.href ? 'active' : ''}`}
              onClick={() => setIsOpen(false)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </Link>
          ))}
        </div>

        {/* Global User Profile & Logout in Footer */}
        <div className="sidebar-footer" style={{ borderTop: '1px solid var(--border-light)', padding: '16px 20px', marginTop: 'auto' }}>
          {userInfo.username && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontSize: 13, color: 'var(--text-secondary)' }}>
              <User size={16} />
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{userInfo.username}</span>
              <span className="badge badge-active" style={{ fontSize: 10, padding: '2px 6px' }}>
                {userInfo.role}
              </span>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="btn btn-outline btn-block btn-sm"
            style={{ color: 'var(--danger)', borderColor: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
          >
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </nav>
    </>
  );
}
