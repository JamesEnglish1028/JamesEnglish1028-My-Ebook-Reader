import React from 'react';

interface LogoProps {
  className?: string;
  full?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ className, full = false }) => {
  if (full) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width="350" height="200" viewBox="0 0 350 200">
        <defs>
          <style>
            .text { font-family: Inter, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-weight: 700; }
          </style>
          <!-- Colors: tweak here for light/dark themes -->
          <linearGradient id="blue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#4FA3FF"/>
            <stop offset="100%" stop-color="#2C7CF0"/>
          </linearGradient>
        </defs>

        <!-- Transparent background (no rect fill) -->

        <!-- Left word: "Me" -->
        <text class="text" x="60" y="275" font-size="220" fill="#FFFFFF" letter-spacing="1">Me</text>

        <!-- Book-shaped "B" -->
        <g transform="translate(480,60)">
          <!-- Spine -->
          <rect x="0" y="0" width="36" height="280" rx="18" fill="url(#blue)"/>
          <!-- Top book cover -->
          <path d="M36,0 h200 a50,50 0 0 1 50,50 v40 a50,50 0 0 1 -50,50 H36 z" fill="url(#blue)"/>
          <!-- Bottom book cover -->
          <path d="M36,140 h200 a50,50 0 0 1 50,50 v40 a50,50 0 0 1 -50,50 H36 z" fill="url(#blue)"/>

          <!-- Inner rounded cut to better form 'B' bowls (knockout using white-filled shapes) -->
          <path d="M70,36 h150 a28,28 0 0 1 28,28 v12 a28,28 0 0 1 -28,28 H70 z" fill="#1E56B7" opacity="0.18"/>
          <path d="M70,176 h150 a28,28 0 0 1 28,28 v12 a28,28 0 0 1 -28,28 H70 z" fill="#1E56B7" opacity="0.18"/>

          <!-- Page lines (white) -->
          <rect x="120" y="48" width="120" height="14" rx="7" fill="#FFFFFF" opacity="0.95"/>
          <rect x="120" y="78" width="120" height="14" rx="7" fill="#FFFFFF" opacity="0.95"/>
          <rect x="120" y="108" width="120" height="14" rx="7" fill="#FFFFFF" opacity="0.95"/>

          <rect x="120" y="188" width="120" height="14" rx="7" fill="#FFFFFF" opacity="0.95"/>
          <rect x="120" y="218" width="120" height="14" rx="7" fill="#FFFFFF" opacity="0.95"/>
          <rect x="120" y="248" width="120" height="14" rx="7" fill="#FFFFFF" opacity="0.95"/>
        </g>

        <!-- Right word: "ooks" (two o's) -->
        <text class="text" x="800" y="275" font-size="220" fill="#FFFFFF" letter-spacing="1">ooks</text>
      </svg>

    );
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 65 80"
      className={className}
      aria-hidden="true"
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