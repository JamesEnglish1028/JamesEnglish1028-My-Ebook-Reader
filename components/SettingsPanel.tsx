import React from 'react';
import { ReaderSettings } from '../types';
import { CloseIcon } from './icons';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ReaderSettings;
  onSettingsChange: (newSettings: Partial<ReaderSettings>) => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ isOpen, onClose, settings, onSettingsChange }) => {
  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/60 z-30"
        onClick={onClose}
      ></div>
      <div
        className={`fixed top-0 right-0 h-full w-80 bg-slate-800 shadow-2xl z-40 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="p-4 border-b border-slate-700 flex justify-between items-center">
          <h3 className="text-xl font-semibold text-white">Settings</h3>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-700">
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-8 text-white">
          {/* Font Size */}
          <div>
            <label htmlFor="font-size" className="block text-sm font-medium text-slate-300 mb-2">
              Font Size
            </label>
            <div className="flex items-center space-x-4">
                <span className="text-lg">A</span>
                <input
                    id="font-size"
                    type="range"
                    min="80"
                    max="200"
                    step="1"
                    value={settings.fontSize}
                    onChange={(e) => onSettingsChange({ fontSize: parseInt(e.target.value, 10) })}
                    className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-3xl">A</span>
            </div>
            <div className="text-center text-slate-400 text-sm mt-1">{settings.fontSize}%</div>
          </div>

          {/* Theme */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Theme
            </label>
            <div className="grid grid-cols-2 gap-4">
                <button
                    onClick={() => onSettingsChange({ theme: 'light' })}
                    className={`p-4 rounded-lg border-2 transition-colors ${settings.theme === 'light' ? 'border-sky-500 bg-sky-500/20' : 'border-slate-600 hover:border-slate-500'}`}
                >
                    <div className="w-full h-12 bg-white rounded"></div>
                    <p className="mt-2 text-center text-sm font-medium">Light</p>
                </button>
                <button
                    onClick={() => onSettingsChange({ theme: 'dark' })}
                    className={`p-4 rounded-lg border-2 transition-colors ${settings.theme === 'dark' ? 'border-sky-500 bg-sky-500/20' : 'border-slate-600 hover:border-slate-500'}`}
                >
                    <div className="w-full h-12 bg-gray-900 rounded"></div>
                    <p className="mt-2 text-center text-sm font-medium">Dark</p>
                </button>
            </div>
          </div>

          {/* Font Family */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Font Family
            </label>
            <div className="grid grid-cols-3 gap-2">
                {['Original', 'Serif', 'Sans-Serif'].map((fontName) => (
                    <button
                        key={fontName}
                        onClick={() => onSettingsChange({ fontFamily: fontName })}
                        className={`py-2 px-1 rounded-lg border-2 transition-colors text-center text-sm truncate ${settings.fontFamily === fontName ? 'border-sky-500 bg-sky-500/20' : 'border-slate-600 hover:border-slate-500'}`}
                    >
                        <span style={{ fontFamily: fontName === 'Serif' ? 'Georgia, serif' : fontName === 'Sans-Serif' ? 'Arial, sans-serif' : 'inherit' }}>
                          {fontName}
                        </span>
                    </button>
                ))}
            </div>
          </div>
          
          {/* Reading Mode */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Reading Mode
            </label>
            <div className="grid grid-cols-2 gap-4">
                <button
                    onClick={() => onSettingsChange({ flow: 'paginated' })}
                    className={`p-4 rounded-lg border-2 transition-colors text-center ${settings.flow === 'paginated' ? 'border-sky-500 bg-sky-500/20' : 'border-slate-600 hover:border-slate-500'}`}
                >
                  <span className="block text-sm font-medium">Paginated</span>
                  <span className="block text-xs text-slate-400 mt-1">Turn pages like a real book.</span>
                </button>
                <button
                    onClick={() => onSettingsChange({ flow: 'scrolled' })}
                    className={`p-4 rounded-lg border-2 transition-colors text-center ${settings.flow === 'scrolled' ? 'border-sky-500 bg-sky-500/20' : 'border-slate-600 hover:border-slate-500'}`}
                >
                  <span className="block text-sm font-medium">Scrolled</span>
                  <span className="block text-xs text-slate-400 mt-1">Scroll like a webpage.</span>
                </button>
            </div>
          </div>

          {/* Citation Format */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Citation Format
            </label>
            <div className="grid grid-cols-3 gap-2">
                {['APA', 'MLA', 'Chicago'].map((formatName) => (
                    <button
                        key={formatName}
                        onClick={() => onSettingsChange({ citationFormat: formatName.toLowerCase() as any })}
                        className={`py-2 px-1 rounded-lg border-2 transition-colors text-center text-sm truncate ${settings.citationFormat === formatName.toLowerCase() ? 'border-sky-500 bg-sky-500/20' : 'border-slate-600 hover:border-slate-500'}`}
                    >
                        {formatName}
                    </button>
                ))}
            </div>
          </div>

        </div>
      </div>
    </>
  );
};

export default SettingsPanel;