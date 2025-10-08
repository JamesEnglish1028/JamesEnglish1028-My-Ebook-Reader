import React from 'react';

interface Props {
  message: string;
  isOpen: boolean;
}

const AddedHud: React.FC<Props> = ({ message, isOpen }) => {
  return (
    <div className={`fixed right-6 top-6 z-50 pointer-events-none transition-all duration-300 ${isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}>
      <div className="bg-green-600 text-white px-4 py-2 rounded-full shadow-lg text-sm font-medium ring-1 ring-green-700">
        {message}
      </div>
    </div>
  );
};

export default AddedHud;
