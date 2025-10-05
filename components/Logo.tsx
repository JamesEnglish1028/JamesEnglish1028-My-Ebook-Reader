import React from 'react';

export const Logo: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 100 100"
    className={className}
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M50 10 L50 90 C 25 90, 5 75, 5 50 C 5 25, 25 10, 50 10 Z" />
    <path d="M50 10 L50 90 C 75 90, 95 75, 95 50 C 95 25, 75 10, 50 10 Z" />
    <rect x="15" y="22" width="30" height="4" fill="rgba(255,255,255,0.2)" rx="2" />
    <rect x="15" y="32" width="30" height="4" fill="rgba(255,255,255,0.2)" rx="2" />
    <rect x="15" y="42" width="30" height="4" fill="rgba(255,255,255,0.2)" rx="2" />
    <rect x="55" y="22" width="30" height="4" fill="rgba(255,255,255,0.2)" rx="2" />
    <rect x="55" y="32" width="30" height="4" fill="rgba(255,255,255,0.2)" rx="2" />
    <rect x="55" y="42" width="30" height="4" fill="rgba(255,255,255,0.2)" rx="2" />
  </svg>
);