'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

export default function Navbar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(true);

  if (pathname === '/login') {
    return null;
  }

  const navItems = [
    { href: '/', label: 'Dashboard', icon: '📊' },
    { href: '/daily-sales', label: 'Sales', icon: '⛽' },
    { href: '/operators', label: 'Operators', icon: '👷' },
    { href: '/fuel-rates', label: 'Rates', icon: '💰' },
    { href: '/daily-sales/report', label: 'Daily Report', icon: '📋' },
    { href: '/monthly-report', label: 'Custom Report', icon: '📅' },
    { href: '/debts', label: 'All Debts', icon: '💳' },
    { href: '/inventory', label: 'Inventory', icon: '📦' },
    { href: '/inventory/report', label: 'Inventory Report', icon: '📋' },
  ];

  return (
    <>
      <button 
        className="sidebar-toggle-floating" 
        onClick={() => setIsOpen(!isOpen)}
        title={isOpen ? "Close Sidebar" : "Open Sidebar"}
      >
        {isOpen ? '✕' : '☰'}
      </button>

      <nav className={`sidebar-nav ${isOpen ? '' : 'closed'}`}>
        <div className="sidebar-header">
          <div className="sidebar-title">Samrat Energy</div>
        </div>
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
      </nav>
    </>
  );
}
