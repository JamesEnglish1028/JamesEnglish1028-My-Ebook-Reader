import React, { useState, useEffect } from 'react';
import { ReaderSettings } from '../types';
import { CloseIcon, BookIcon, SpeakerIcon, PlayIcon } from './icons';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ReaderSettings;
  onSettingsChange: (newSettings: Partial<ReaderSettings>) => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ isOpen, onClose, settings, onSettingsChange }) => {
  const [activeTab, setActiveTab] = useState<'display' | 'readAloud'>('display');
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (isOpen) {
      const loadVoices = () => {
        const availableVoices = window.speechSynthesis.getVoices();
        if (availableVoices.length > 0) {
          setVoices(availableVoices);
        }
      };

      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
      
      return () => {
        window.speechSynthesis.onvoiceschanged = null;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleReadAloudChange = (newSettings: Partial<ReaderSettings['readAloud']>) => {
    onSettingsChange({ readAloud: { ...settings.readAloud, ...newSettings } });
  };
  
  const previewVoice = (voice: SpeechSynthesisVoice) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance("Hello, this is a preview of my voice.");
    utterance.voice = voice;
    utterance.rate = settings.readAloud.rate;
    utterance.pitch = settings.readAloud.pitch;
    window.speechSynthesis.speak(utterance);
  };

  const ReadAloudSettings = () => {
    const selectedVoice = voices.find(v => v.voiceURI === settings.readAloud.voiceURI);

    return (
        <div className="space-y-8">
        {/* Voice Selection */}
        <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
            Voice
            </label>

            <div className="p-3 bg-slate-900/50 rounded-md mb-4">
                <p className="text-xs text-slate-400 text-center">Current Voice</p>
                <p className="font-semibold text-sky-300 truncate text-center" title={selectedVoice ? selectedVoice.name : 'System Default'}>
                    {selectedVoice ? selectedVoice.name : 'System Default'}
                </p>
            </div>

            <p className="text-xs text-slate-400 mb-2">Select a new voice from the list below:</p>

            <div className="max-h-48 overflow-y-auto rounded-md border border-slate-600 bg-slate-700/50">
            <ul className="divide-y divide-slate-600">
                {voices.length > 0 ? (
                voices.map((voice) => (
                    <li
                    key={voice.voiceURI}
                    className={`flex items-center justify-between p-2 text-sm transition-colors ${
                        settings.readAloud.voiceURI === voice.voiceURI
                        ? 'bg-sky-500/20 text-sky-300'
                        : 'hover:bg-slate-700'
                    }`}
                    >
                    <button
                        onClick={() => handleReadAloudChange({ voiceURI: voice.voiceURI })}
                        className="flex-grow text-left pr-2"
                    >
                        <span className="font-medium">{voice.name}</span>
                        <span className="text-xs text-slate-400 block">{voice.lang}</span>
                    </button>
                    <button
                        onClick={() => previewVoice(voice)}
                        className="p-2 rounded-full hover:bg-slate-600 flex-shrink-0"
                        aria-label={`Preview voice ${voice.name}`}
                    >
                        <PlayIcon className="w-4 h-4" />
                    </button>
                    </li>
                ))
                ) : (
                <li className="p-4 text-center text-slate-400">Loading voices...</li>
                )}
            </ul>
            </div>
        </div>

        {/* Speed */}
        <div>
            <label htmlFor="read-speed" className="block text-sm font-medium text-slate-300 mb-2">
            Speed
            </label>
            <input
            id="read-speed"
            type="range"
            min="0.5"
            max="2"
            step="0.1"
            value={settings.readAloud.rate}
            onChange={(e) => handleReadAloudChange({ rate: parseFloat(e.target.value) })}
            className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer"
            />
            <div className="text-center text-slate-400 text-sm mt-1">{settings.readAloud.rate.toFixed(1)}x</div>
        </div>
        
        {/* Pitch */}
        <div>
            <label htmlFor="read-pitch" className="block text-sm font-medium text-slate-300 mb-2">
            Pitch
            </label>
            <input
            id="read-pitch"
            type="range"
            min="0"
            max="2"
            step="0.1"
            value={settings.readAloud.pitch}
            onChange={(e) => handleReadAloudChange({ pitch: parseFloat(e.target.value) })}
            className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer"
            />
            <div className="text-center text-slate-400 text-sm mt-1">{settings.readAloud.pitch.toFixed(1)}</div>
        </div>

        </div>
    );
  }

  return (
    <>
      <div
        className="fixed inset-0 bg-black/60 z-30"
        onClick={onClose}
      ></div>
      <div
        className={`fixed top-0 right-0 h-full w-80 bg-slate-800 shadow-2xl z-40 transform transition-transform duration-300 ease-in-out flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="p-4 border-b border-slate-700 flex justify-between items-center flex-shrink-0">
          <h3 className="text-xl font-semibold text-white">Settings</h3>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-700">
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>
        
        <div className="border-b border-slate-700 px-2 flex-shrink-0">
            <nav className="flex -mb-px">
                <button
                    onClick={() => setActiveTab('display')}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium border-b-2 transition-colors duration-200 ${
                        activeTab === 'display'
                        ? 'border-sky-400 text-sky-300'
                        : 'border-transparent text-slate-400 hover:text-white hover:border-slate-500'
                    }`}
                >
                    <BookIcon className="w-5 h-5"/>
                    Display
                </button>
                <button
                    onClick={() => setActiveTab('readAloud')}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium border-b-2 transition-colors duration-200 ${
                        activeTab === 'readAloud'
                        ? 'border-sky-400 text-sky-300'
                        : 'border-transparent text-slate-400 hover:text-white hover:border-slate-500'
                    }`}
                >
                    <SpeakerIcon className="w-5 h-5"/>
                    Read Aloud
                </button>
            </nav>
        </div>

        <div className="p-6 text-white overflow-y-auto flex-grow">
          {activeTab === 'display' && (
             <div className="space-y-8">
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
          )}
          {activeTab === 'readAloud' && (
            <ReadAloudSettings />
          )}
        </div>
      </div>
    </>
  );
};

export default SettingsPanel;