
import React, { useState, useCallback } from 'react';
import Library from './components/Library';
import ReaderView from './components/ReaderView';
import { db } from './services/db';
import { CoverAnimationData } from './types';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<'library' | 'reader'>('library');
  const [selectedBookId, setSelectedBookId] = useState<number | null>(null);
  const [coverAnimationData, setCoverAnimationData] = useState<CoverAnimationData | null>(null);

  // Initialize DB on app start
  React.useEffect(() => {
    db.init();
  }, []);

  const handleOpenBook = useCallback((id: number, animationData: CoverAnimationData) => {
    setSelectedBookId(id);
    setCoverAnimationData(animationData);
    setCurrentView('reader');
  }, []);

  const handleCloseReader = useCallback(() => {
    setSelectedBookId(null);
    setCurrentView('library');
    setCoverAnimationData(null);
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 font-sans">
      {currentView === 'library' && <Library onOpenBook={handleOpenBook} />}
      {currentView === 'reader' && selectedBookId !== null && (
        <ReaderView
          bookId={selectedBookId}
          onClose={handleCloseReader}
          animationData={coverAnimationData}
        />
      )}
    </div>
  );
};

export default App;
