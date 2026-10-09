'use client';
import { useState, useEffect } from 'react';

const MOBILE_UA = /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;

function detectDesktop() {
  const ua = navigator.userAgent || '';
  // iPadOS reports a Mac UA, so also treat touch-first Macs as tablets
  const isIpadOS = /Macintosh/i.test(ua) && navigator.maxTouchPoints > 1;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  return !MOBILE_UA.test(ua) && !isIpadOS && finePointer && window.innerWidth >= 1024;
}

// Returns null until the client has measured, then true/false.
// Website previews are desktop-only, so callers lock them when this is false.
export function useDesktop() {
  const [isDesktop, setIsDesktop] = useState(null);
  useEffect(() => {
    const update = () => setIsDesktop(detectDesktop());
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  return isDesktop;
}
