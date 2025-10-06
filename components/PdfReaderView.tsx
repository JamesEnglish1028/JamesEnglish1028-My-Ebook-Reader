import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { BookRecord } from '../types';
import { CloseIcon } from './icons';
import Spinner from './Spinner';

interface PdfReaderViewProps {
  bookId: number;
  onClose: () => void;
}

const PdfReaderView: React.FC<PdfReaderViewProps> = ({ bookId, onClose }) => {
  const [bookData, setBookData] = useState<BookRecord | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;

    const fetchBookData = async () => {
      setIsLoading(true);
      setError(null);
      setPdfUrl(null);

      try {
        const data = await db.getBook(bookId);
        if (!data) {
          throw new Error("Could not find this book in your library.");
        }
        if (data.format !== 'PDF') {
          throw new Error("The selected book is not in PDF format.");
        }

        setBookData(data);
        
        // Convert the ArrayBuffer from the DB into a Blob, then create a local URL for it.
        // This is the most reliable way to pass local data to an iframe.
        const blob = new Blob([data.epubData], { type: 'application/pdf' });
        objectUrl = URL.createObjectURL(blob);
        setPdfUrl(objectUrl);

      } catch (e) {
        setError(e instanceof Error ? e.message : 'An unknown error occurred.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchBookData();

    // This cleanup function is crucial to revoke the created object URL and prevent memory leaks.
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [bookId]);

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="absolute inset-0 flex items-center justify-center">
          <Spinner text="Loading PDF..." />
        </div>
      );
    }

    if (error) {
      return (
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <div className="text-center bg-slate-800 p-8 rounded-lg shadow-lg max-w-lg mx-auto">
              <h3 className="text-xl font-bold text-red-300 mb-2">Could Not Open PDF</h3>
              <p className="text-slate-300">{error}</p>
          </div>
        </div>
      );
    }

    if (pdfUrl) {
      return (
        <iframe
          src={pdfUrl}
          title={bookData?.title || 'PDF Viewer'}
          className="w-full h-full border-0"
        />
      );
    }

    return null;
  };

  return (
    <div className="fixed inset-0 bg-slate-900 flex flex-col select-none">
      <header className="flex items-center justify-between p-2 bg-slate-800 shadow-md z-20 text-white flex-shrink-0">
        <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-700 transition-colors" aria-label="Close Reader">
          <CloseIcon className="w-6 h-6" />
        </button>
        <div className="text-center truncate px-2">
          <h2 className="text-lg font-bold">{bookData?.title || 'PDF Reader'}</h2>
          <p className="text-sm text-slate-400">{bookData?.author}</p>
        </div>
        {/* Placeholder to keep title centered */}
        <div className="w-10 h-10"></div>
      </header>

      <main className="flex-grow relative min-h-0 bg-slate-800/50">
        {renderContent()}
      </main>
    </div>
  );
};

export default PdfReaderView;