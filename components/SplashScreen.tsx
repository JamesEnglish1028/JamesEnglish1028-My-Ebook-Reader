import React from 'react';

import { Logo } from './Logo';

interface SplashScreenProps {
  isVisible: boolean;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ isVisible }) => {
  return (
    <div
      className={`fixed inset-0 bg-slate-900 flex flex-col items-center justify-center z-50 transition-opacity duration-700 ease-in-out ${
        isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      <div className="animate-pulse">
        <Logo full className="w-64" />
      </div>
    </div>
  );
};

export default SplashScreen;