import React, { useEffect } from 'react';

interface Props {
  value: string;
  isOpen: boolean;
}

const ZoomHud: React.FC<Props> = ({ value, isOpen }) => {
  return (
    <div className={`fixed left-1/2 transform -translate-x-1/2 top-6 z-50 pointer-events-none`}>      
      <div
        aria-hidden={isOpen ? 'false' : 'true'}
        aria-live="polite"
        className={`mx-auto transition-all ${isOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-2'} duration-300`}
      >
        <div className="bg-sky-600 text-white px-5 py-2 rounded-full shadow-2xl text-sm sm:text-base font-semibold ring-1 ring-sky-700">
          {value}
        </div>
      </div>
    </div>
  );
};

export default ZoomHud;
