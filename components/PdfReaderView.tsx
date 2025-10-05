import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../services/db';
import { BookRecord } from '../types';
import { LeftArrowIcon, RightArrowIcon, CloseIcon } from './icons';
import Spinner from './Spinner';

// Since react-pdf is loaded via a UMD script, it attaches to the window object.
// We will access it inside the component to ensure it has loaded.

interface PdfReaderViewProps {
  bookId: number;
  onClose: () => void;
}

const PdfReaderView: React.FC<PdfReaderViewProps> = ({ bookId, onClose }) => {
  const [bookData, setBookData] = useState<BookRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [controlsVisible, setControlsVisible] = useState(true);
  const controlsTimeoutRef = React.useRef<number | null>(null);

  // Access react-pdf from the window object
  const ReactPDF = (window as any).ReactPDF;
  const Document = ReactPDF?.Document;
  const Page = ReactPDF?.Page;

  useEffect(() => {
    const fetchBook = async () => {
      setIsLoading(true);
      setPdfError(null); // Reset error on new book load
      const data = await db.getBook(bookId);
      if (!data) {
        setPdfError("Could not find this book in your library.");
        setIsLoading(false);
      } else if (data.format !== 'PDF') {
        setPdfError("The selected book is not in PDF format. This viewer only supports PDF files.");
        setIsLoading(false);
      } else {
        setBookData(data);
        // Loading continues until the PDF document itself is loaded or fails
      }
    };
    fetchBook();
  }, [bookId]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPageNumber(1);
    setIsLoading(false);
  };
  
  const onDocumentLoadError = (error: Error) => {
    console.error("Error loading PDF:", error);
    let friendlyMessage = `Failed to load the PDF file. It may be corrupted or in an unsupported format. (Error: ${error.message})`;
    if (error.name === 'PasswordException') {
        friendlyMessage = 'This PDF is password-protected and cannot be opened.';
    }
    setPdfError(friendlyMessage);
    setIsLoading(false);
  };

  const clearControlsTimeout = useCallback(() => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
  }, []);

  const resetControlsTimeout = useCallback(() => {
    clearControlsTimeout();
    controlsTimeoutRef.current = window.setTimeout(() => {
        setControlsVisible(false);
    }, 3000);
  }, [clearControlsTimeout]);

  useEffect(() => {
    if (controlsVisible) {
      resetControlsTimeout();
    } else {
      clearControlsTimeout();
    }
    return clearControlsTimeout;
  }, [controlsVisible, resetControlsTimeout, clearControlsTimeout]);

  const goToPrevPage = () => setPageNumber(prev => Math.max(prev - 1, 1));
  const goToNextPage = () => setPageNumber(prev => Math.min(prev + 1, numPages || 1));

  const pageContent = () => {
    if (isLoading) {
      return <Spinner text="Loading PDF..." />;
    }
    if (pdfError) {
      return (
        <div className="text-center bg-slate-800 p-8 rounded-lg shadow-lg max-w-lg mx-auto">
            <svg className="w-16 h-16 mx-auto text-red-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-xl font-bold text-red-300 mb-2">Could Not Open PDF</h3>
            <p className="text-slate-300">{pdfError}</p>
        </div>
      );
    }
    if (!ReactPDF || !Document || !Page) {
        return (
            <div className="text-center text-red-400 bg-slate-800 p-8 rounded-lg">
                <h3 className="text-xl font-bold mb-4">Viewer Error</h3>
                <p>The PDF viewer library could not be loaded. Please check your internet connection and try reloading the page.</p>
            </div>
        );
    }
    if (bookData) {
      // FIX: Convert ArrayBuffer from DB to Uint8Array to prevent a cloning error
      // when react-pdf passes the data to its web worker.
      const pdfData = new Uint8Array(bookData.epubData);
      return (
        <div onClick={() => setControlsVisible(v => !v)} className="w-full h-full flex justify-center items-center">
            <Document
              file={{ data: pdfData }}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading={<Spinner text="Rendering Document..." />}
            >
              <Page 
                pageNumber={pageNumber} 
                renderTextLayer={false}
                renderAnnotationLayer={false}
                className="flex justify-center items-center"
              />
            </Document>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="fixed inset-0 bg-slate-900 flex flex-col select-none">
      <header
        className={`flex items-center justify-between p-2 bg-slate-800 shadow-md z-20 text-white flex-shrink-0 transition-transform duration-300 ease-in-out ${controlsVisible ? 'translate-y-0' : '-translate-y-full'}`}
        onMouseEnter={clearControlsTimeout}
        onMouseLeave={resetControlsTimeout}
      >
        <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-700 transition-colors" aria-label="Close Reader">
          <CloseIcon className="w-6 h-6" />
        </button>
        <div className="text-center truncate px-2">
          <h2 className="text-lg font-bold">{bookData?.title || 'PDF Reader'}</h2>
          <p className="text-sm text-slate-400">{bookData?.author}</p>
        </div>
        <div className="w-10 h-10"></div>
      </header>

      <div className="flex-grow relative min-h-0 flex items-center justify-center overflow-auto p-4 bg-slate-800/50">
        {pageContent()}
      </div>

      <footer
        className={`flex items-center gap-4 p-4 bg-slate-800 z-20 text-white flex-shrink-0 transition-transform duration-300 ease-in-out ${controlsVisible ? 'translate-y-0' : 'translate-y-full'}`}
        onMouseEnter={clearControlsTimeout}
        onMouseLeave={resetControlsTimeout}
      >
        <button onClick={goToPrevPage} disabled={pageNumber <= 1} className="p-2 rounded-full hover:bg-slate-700 transition-colors flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed" aria-label="Previous Page">
            <LeftArrowIcon className="w-6 h-6" />
        </button>
        
        <div className="flex-grow text-center text-sm text-slate-300" aria-live="polite">
          {numPages ? `Page ${pageNumber} of ${numPages}` : '...'}
        </div>

        <button onClick={goToNextPage} disabled={!numPages || pageNumber >= numPages} className="p-2 rounded-full hover:bg-slate-700 transition-colors flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed" aria-label="Next Page">
            <RightArrowIcon className="w-6 h-6" />
        </button>
      </footer>
    </div>
  );
};

export default PdfReaderView;