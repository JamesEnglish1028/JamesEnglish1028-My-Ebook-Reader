import React, { useState, useRef } from 'react';

interface Props {
  children: React.ReactNode;
  label: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
}

const Tooltip: React.FC<Props> = ({ children, label, placement = 'top' }) => {
  const [visible, setVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  return (
    <div
      ref={containerRef}
      className="relative inline-flex"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      <div
        role="tooltip"
        aria-hidden={visible ? 'false' : 'true'}
        className={`pointer-events-none z-50 absolute whitespace-nowrap bg-slate-800 text-white text-xs rounded px-2 py-1 transition-all duration-200 transform ${visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}` +
          (placement === 'top' ? ' -bottom-9 left-1/2 -translate-x-1/2' : '')
        }
      >
        {label}
      </div>
    </div>
  );
};

export default Tooltip;
