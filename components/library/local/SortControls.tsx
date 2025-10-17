import React, { useEffect, useRef } from 'react';

import { SORT_OPTIONS } from '../../../hooks';
import { AdjustmentsVerticalIcon } from '../../icons';

interface SortControlsProps {
  sortOrder: string;
  onSortChange: (sortOrder: string) => void;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
}

/**
 * SortControls - Dropdown for sorting books in the library
 *
 * Provides a dropdown menu with various sort options (title, author, date added, etc.)
 * Handles click-outside behavior to close the dropdown.
 */
const SortControls: React.FC<SortControlsProps> = ({
  sortOrder,
  onSortChange,
  isOpen,
  onToggle,
  onClose,
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen, onClose]);

  const handleSortChange = (newSortOrder: string) => {
    onSortChange(newSortOrder);
    onClose();
  };

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={onToggle}
        className="cursor-pointer bg-slate-700 hover:bg-slate-600 text-white font-bold p-2 sm:py-2 sm:px-4 rounded-lg inline-flex items-center transition-colors duration-200"
        aria-label="Sort options"
      >
        <AdjustmentsVerticalIcon className="w-5 h-5 sm:mr-2" />
        <span className="hidden sm:inline">Sort</span>
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-56 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-20">
          <ul className="p-1 text-white">
            {SORT_OPTIONS.map((option) => (
              <li key={option.key}>
                <button
                  onClick={() => handleSortChange(option.key)}
                  className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${sortOrder === option.key
                      ? 'bg-sky-600 font-medium'
                      : 'hover:bg-slate-700'
                    }`}
                >
                  {option.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default SortControls;
