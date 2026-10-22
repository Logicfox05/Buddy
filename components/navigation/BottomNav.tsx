'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/', label: 'Today', icon: '📅' },
  { href: '/explore', label: 'Web Tutor', icon: '🌐' },
  { href: '/interview', label: 'Interview', icon: '🎯' },
  { href: '/practice', label: 'Practice', icon: '✍️' },
  { href: '/map', label: 'Map', icon: '🗺️' },
  { href: '/progress', label: 'Progress', icon: '📊' },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 safe-area-inset-bottom z-50">
      <div className="flex justify-around items-center h-16 max-w-screen-lg mx-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                isActive
                  ? 'text-blue-500'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              <span className="text-2xl mb-1">{item.icon}</span>
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
