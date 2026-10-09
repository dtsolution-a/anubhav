'use client';
import { useEffect } from 'react';

// Registers the service worker (required for the app to be installable).
export default function PwaSetup() {
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);
  return null;
}
