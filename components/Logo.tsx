import React, { useEffect, useState } from 'react';

import { mebooksLogo } from '../assets';

interface LogoProps {
  className?: string;
  full?: boolean;
  alt?: string;
  width?: string | number;
  height?: string | number;
  ariaHidden?: boolean;
  theme?: 'auto' | 'light' | 'dark';
}
export const Logo: React.FC<LogoProps> = ({ className, full = false, alt = 'MeBooks', width, height, ariaHidden = false, theme = 'auto' }) => {
  const [prefersDark, setPrefersDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && 'matchMedia' in window) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    if (theme !== 'auto') return;
    if (typeof window === 'undefined' || !('matchMedia' in window)) return;

    const m = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setPrefersDark(e.matches);
    // Some browsers support addEventListener on MediaQueryList
    if ('addEventListener' in m) {
      // @ts-ignore - old typings sometimes lack this
      m.addEventListener('change', handler);
    } else if ('addListener' in m) {
      // Fallback for older browsers
      // @ts-ignore
      m.addListener(handler);
    }

    // initialize state
    setPrefersDark(m.matches);

    return () => {
      if ('removeEventListener' in m) {
        // @ts-ignore
        m.removeEventListener('change', handler);
      } else if ('removeListener' in m) {
        // @ts-ignore
        m.removeListener(handler);
      }
    };
  }, [theme]);
  if (full) {
    // Use the new single logo for all themes
    const asset = mebooksLogo;

    return (
      <img
        src={asset}
        className={className}
        alt={alt}
        {...(typeof width !== 'undefined' && typeof width === 'number' ? { width } : {})}
        {...(typeof height !== 'undefined' && typeof height === 'number' ? { height } : {})}
      />
    );
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 65 80"
      className={className}
      {...(ariaHidden ? { 'aria-hidden': true } : {})}
      {...(typeof width !== 'undefined' && typeof width === 'number' ? { width } : {})}
      {...(typeof height !== 'undefined' && typeof height === 'number' ? { height } : {})}
    >
      <path
        d="M60.1,20.6c-4,3.3-9.2,5-15.7,5H21.3V5.5h23.1c6.5,0,11.7,1.7,15.7,5c4,3.3,6.1,8,6.1,13.8v-1.2 C66.2,21.8,64.1,23.9,60.1,20.6z"
        fill="currentColor"
      />
      <path d="M26.9,10.1h20.1v1.9H26.9z M26.9,15.1h20.1v1.9H26.9z M26.9,20.2h20.1v1.9H26.9z" fill="#1e293b"/>

      <path
        d="M57.6,44.9c0-5.9-2.1-10.7-6.1-13.8c-4-3.3-9.2-5-15.7-5H21.3v19h13.7c5.9,0,10.8-1.7,14.6-4.8 C59.1,46.1,57.6,46.9,57.6,44.9z"
        fill="white"
      />
      <path d="M26.9,33.5h20.1v1.9H26.9z M26.9,38.5h20.1v1.9H26.9z M26.9,43.6h20.1v1.9H26.9z" fill="#1e293b"/>

      <path
        d="M57.9,69.5c-4,3.3-9.2,5-15.7,5H21.3V55.5h20.9c6.5,0,11.7,1.7,15.7,5c4,3.3,6.1,8,6.1,13.8v-1.2 C63.9,70.8,61.9,72.8,57.9,69.5z"
        fill="white"
      />
      <path d="M26.9,59.3h23v1.9h-23z M26.9,64.3h23v1.9h-23z M26.9,69.3h23v1.9h-23z" fill="#1e293b"/>
    </svg>
  );
};