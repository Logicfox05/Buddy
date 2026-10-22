import type { Metadata, Viewport } from 'next';
import './globals.css';
import { BottomNav } from '@/components/navigation/BottomNav';

export const metadata: Metadata = {
  title: 'Buddy — CS Mastery',
  description: 'Master computer science in real depth. Free, phone-first, spaced repetition.',
  manifest: '/manifest.json',
  applicationName: 'Buddy',
  keywords: ['computer science', 'learning', 'DSA', 'operating systems', 'spaced repetition'],
  authors: [{ name: 'Buddy' }],
  openGraph: {
    title: 'Buddy — CS Mastery',
    description: 'Master computer science in real depth.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#6366f1',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

import { NetworkStatusBanner } from '@/components/common/NetworkStatusBanner';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Buddy" />
      </head>
      <body className="safe-bottom bg-slate-950 text-white min-h-screen" suppressHydrationWarning>
        <NetworkStatusBanner />
        <main className="min-h-dvh max-w-lg mx-auto">
          {children}
        </main>
        <BottomNav />
      </body>
    </html>
  );
}
