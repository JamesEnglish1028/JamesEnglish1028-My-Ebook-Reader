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
        <Logo className="w-32 h-32 text-sky-400" />
      </div>
      <h1 className="text-2xl font-bold text-slate-300 mt-6 tracking-wider">
        MeBooks
      </h1>
    </div>
  );
};

export default SplashScreen;