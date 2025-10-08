import React from 'react';

interface LogoProps {
  className?: string;
  full?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ className, full = false }) => {
  if (full) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width="350" height="200" viewBox="0 0 350 200">
        import React from 'react';

        // Minimal replacement for the broken experimental logo file.
        // Keeps a stable export so TypeScript/compiler don't error while the team
        // decides whether to reintroduce a more complex SVG.
        export interface LogoProps {
          className?: string;
          full?: boolean;
        }

        export const Logo: React.FC<LogoProps> = ({ className }) => {
          return (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              width="24"
              height="24"
              className={className}
              aria-hidden="true"
            >
              <rect width="24" height="24" rx="4" fill="currentColor" />
              <text x="12" y="16" fontSize="10" textAnchor="middle" fill="#fff">MB</text>
            </svg>
          );
        };