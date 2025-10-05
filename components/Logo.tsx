import React from 'react';

interface LogoProps {
  className?: string;
  full?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ className, full = false }) => {
  if (full) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 350 200"
        className={className}
        aria-hidden="true"
      >
        <style>
          {`.font-style { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"; font-weight: bold; }`}
        </style>
        {/* B icon */}
        <g transform="translate(0, 15) scale(1.1)">
          <path
            d="M60.1,20.6c-4,3.3-9.2,5-15.7,5H21.3V5.5h23.1c6.5,0,11.7,1.7,15.7,5c4,3.3,6.1,8,6.1,13.8v-1.2 C66.2,21.8,64.1,23.9,60.1,20.6z"
            fill="#38bdf8"
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
        </g>

        {/* Text */}
        <text x="70" y="88" className="font-style" fontSize="60" fill="white">e</text>
        <text x="5" y="165" className="font-style" fontSize="65">
            <tspan fill="white">Me</tspan>
            <tspan fill="#38bdf8">Books</tspan>
        </text>
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