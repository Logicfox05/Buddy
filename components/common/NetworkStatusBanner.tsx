'use client';

import React, { useEffect, useState } from 'react';

export function NetworkStatusBanner() {
  const [isOnline, setIsOnline] = useState(true);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnected(true);
      const timer = setTimeout(() => setShowReconnected(false), 3000);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowReconnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOnline) {
    return (
      <div className="bg-amber-950/90 border-b border-amber-500/40 text-amber-300 px-3 py-1.5 text-center text-xs font-semibold flex items-center justify-center gap-1.5 sticky top-0 z-40 backdrop-blur-md">
        <span>⚡</span>
        <span>Offline Mode Active — 100% of lessons, quizzes & code runners work offline via IndexedDB</span>
      </div>
    );
  }

  if (showReconnected) {
    return (
      <div className="bg-emerald-950/90 border-b border-emerald-500/40 text-emerald-300 px-3 py-1.5 text-center text-xs font-semibold flex items-center justify-center gap-1.5 sticky top-0 z-40 backdrop-blur-md animate-fade-in">
        <span>🟢</span>
        <span>Back Online — Local cache intact</span>
      </div>
    );
  }

  return null;
}
