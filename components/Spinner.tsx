
import React from 'react';

const Spinner: React.FC<{ text?: string }> = ({ text = "Loading..." }) => (
  <div className="flex flex-col items-center justify-center space-y-2">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-400"></div>
    <p className="text-sky-300">{text}</p>
  </div>
);

export default Spinner;
