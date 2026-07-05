'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navbar() {
  const pathname = usePathname();

  const navItems = [
    { href: '/', label: 'Dashboard', icon: '📊' },
    { href: '/daily-sales', label: 'Sales', icon: '⛽' },
    { href: '/operators', label: 'Operators', icon: '👷' },
    { href: '/fuel-rates', label: 'Rates', icon: '💰' },
    { href: '/daily-sales/report', label: 'Reports', icon: '📋' },
  ];

  return (
    <nav className="bottom-nav">
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`nav-item ${pathname === item.href ? 'active' : ''}`}
        >
          <span className="nav-icon">{item.icon}</span>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
