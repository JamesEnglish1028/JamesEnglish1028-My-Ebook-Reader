
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { db } from '../services/db';
import { BookMetadata, BookRecord, CoverAnimationData, Catalog, CatalogBook, CatalogNavigationLink } from '../types';
import { UploadIcon, GlobeIcon, ChevronDownIcon, DownloadIcon, ChevronRightIcon } from './icons';
import Spinner from './Spinner';
import ManageCatalogsModal from './ManageCatalogsModal';

interface LibraryProps {
  onOpenBook: (id: number, animationData: CoverAnimationData) => void;
}

const blobUrlToBase64 = async (blobUrl: string): Promise<string> => {
    const response = await fetch(blobUrl);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

const Library: React.FC<LibraryProps> = ({ onOpenBook }) => {
  const [books, setBooks] = useState<BookMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [importStatus, setImportStatus] = useState<{
    isLoading: boolean;
    message: string;
    error: string | null;
  }>({
    isLoading: false,
    message: '',
    error: null,
  });

  const [catalogs, setCatalogs] = useState<Catalog[]>([]);
  const [activeCatalog, setActiveCatalog] = useState<Catalog | null>(null);
  const [catalogBooks, setCatalogBooks] = useState<CatalogBook[]>([]);
  const [catalogNavLinks, setCatalogNavLinks] = useState<CatalogNavigationLink[]>([]);
  const [catalogNavPath, setCatalogNavPath] = useState<{ name: string, url: string }[]>([]);

  const [isCatalogLoading, setIsCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const [isManageCatalogsOpen, setIsManageCatalogsOpen] = useState(false);
  const [isCatalogDropdownOpen, setIsCatalogDropdownOpen] = useState(false);
  
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchBooks = useCallback(async () => {
    setIsLoading(true);
    try {
      const booksData = await db.getBooksMetadata();
      setBooks(booksData.reverse());
    } catch (error) {
      console.error("Failed to fetch books:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getCatalogs = useCallback(() => {
    const saved = localStorage.getItem('ebook-catalogs');
    return saved ? JSON.parse(saved) : [];
  }, []);

  const saveCatalogs = useCallback((catalogsToSave: Catalog[]) => {
    localStorage.setItem('ebook-catalogs', JSON.stringify(catalogsToSave));
    setCatalogs(catalogsToSave);
  }, []);

  const handleAddCatalog = useCallback((name: string, url: string) => {
    const newCatalog: Catalog = { id: new Date().toISOString(), name, url };
    saveCatalogs([...catalogs, newCatalog]);
  }, [catalogs, saveCatalogs]);

  const handleDeleteCatalog = useCallback((id: string) => {
    const updatedCatalogs = catalogs.filter(c => c.id !== id);
    saveCatalogs(updatedCatalogs);
    if (activeCatalog?.id === id) {
      handleSelectCatalog(null);
    }
  }, [catalogs, saveCatalogs, activeCatalog]);

  const fetchAndParseCatalog = useCallback(async (url: string) => {
    setIsCatalogLoading(true);
    setCatalogError(null);
    setCatalogBooks([]);
    setCatalogNavLinks([]);
    try {
      // Use a CORS proxy to bypass browser security restrictions (CORS)
      // that prevent fetching data directly from another domain.
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
      const response = await fetch(proxyUrl);
      
      if (!response.ok) {
        throw new Error(`The server responded with an error: ${response.status} ${response.statusText}. Please check the URL.`);
      }
      
      const contentType = response.headers.get('content-type') || '';
      const responseText = await response.text();

      if (contentType.includes('application/json')) {
        let errorMessage = 'The proxy returned an unexpected JSON response.';
        try {
            const jsonResponse = JSON.parse(responseText);
            if (jsonResponse?.status?.error) {
                errorMessage = `Could not reach catalog server: ${jsonResponse.status.error}. Please check the URL.`;
            }
        } catch (e) {
            errorMessage = 'The proxy returned a malformed JSON error response.';
        }
        throw new Error(errorMessage);
      }

      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(responseText, 'application/xml');

      const errorNode = xmlDoc.querySelector('parsererror');
      if (errorNode) {
        console.error("XML Parsing Error:", errorNode.textContent);
        throw new Error('Failed to parse catalog XML. The URL may not point to a valid OPDS feed.');
      }

      const entries = Array.from(xmlDoc.querySelectorAll('entry'));
      const books: CatalogBook[] = [];
      const navLinks: CatalogNavigationLink[] = [];

      entries.forEach(entry => {
        const title = entry.querySelector('title')?.textContent || 'Untitled';
        const acquisitionLink = entry.querySelector('link[rel="http://opds-spec.org/acquisition"]');
        const subsectionLink = entry.querySelector('link[rel="subsection"], link[rel="http://opds-spec.org/subsection"]');

        if (acquisitionLink) {
            const author = entry.querySelector('author > name')?.textContent || 'Unknown Author';
            const summary = entry.querySelector('summary')?.textContent || null;
            const coverLink = entry.querySelector('link[rel="http://opds-spec.org/image"]');
            
            const coverImageHref = coverLink?.getAttribute('href');
            const coverImage = coverImageHref ? new URL(coverImageHref, url).href : null;
            
            const downloadUrlHref = acquisitionLink?.getAttribute('href');
            if(downloadUrlHref) {
                const downloadUrl = new URL(downloadUrlHref, url).href;
                books.push({ title, author, coverImage, downloadUrl, summary });
            }
        } else if (subsectionLink) {
            const navUrl = subsectionLink?.getAttribute('href');
            if (navUrl) {
                navLinks.push({ title, url: new URL(navUrl, url).href, rel: 'subsection' });
            }
        }
      });
      
      setCatalogBooks(books);
      setCatalogNavLinks(navLinks);

    } catch (error) {
      console.error("Error fetching or parsing catalog:", error);
      let message = "Could not load catalog. An unknown error occurred.";
      if (error instanceof Error) {
        message = error.message;
      }
      setCatalogError(message);
    } finally {
      setIsCatalogLoading(false);
    }
  }, []);

  useEffect(() => {
    setCatalogs(getCatalogs());
    fetchBooks();
  }, [fetchBooks, getCatalogs]);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsCatalogDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectCatalog = (catalog: Catalog | null) => {
    setActiveCatalog(catalog);
    setIsCatalogDropdownOpen(false);
    if (catalog) {
      const newPath = [{ name: catalog.name, url: catalog.url }];
      setCatalogNavPath(newPath);
      fetchAndParseCatalog(catalog.url);
    } else {
      setCatalogBooks([]);
      setCatalogNavLinks([]);
      setCatalogError(null);
      setCatalogNavPath([]);
      fetchBooks();
    }
  };

  const handleNavLinkClick = (link: CatalogNavigationLink) => {
    const newPath = [...catalogNavPath, { name: link.title, url: link.url }];
    setCatalogNavPath(newPath);
    fetchAndParseCatalog(link.url);
  };

  const handleBreadcrumbClick = (index: number) => {
    const newPath = catalogNavPath.slice(0, index + 1);
    setCatalogNavPath(newPath);
    fetchAndParseCatalog(newPath[index].url);
  };

  const processAndSaveBook = useCallback(async (epubData: ArrayBuffer, fileName: string = 'Untitled Book') => {
    setImportStatus({ isLoading: true, message: 'Parsing EPUB...', error: null });
    try {
        const ePub = (window as any).ePub;
        const book = ePub(epubData);
        const metadata = await book.loaded.metadata;
        
        setImportStatus(prev => ({ ...prev, message: 'Extracting cover...' }));
        let coverImage: string | null = null;
        const coverUrl = await book.coverUrl();
        if (coverUrl) {
            coverImage = await blobUrlToBase64(coverUrl);
        }

        const newBook: BookRecord = {
          title: metadata.title || fileName,
          author: metadata.creator || 'Unknown Author',
          coverImage,
          epubData,
          publisher: metadata.publisher,
          publicationDate: metadata.pubdate,
          isbn: metadata.identifier,
        };

        setImportStatus(prev => ({ ...prev, message: 'Saving to library...' }));
        await db.addBook(newBook);
        
        setImportStatus({ isLoading: false, message: 'Import successful!', error: null });
        setTimeout(() => setImportStatus({ isLoading: false, message: '', error: null }), 2000);
        
        if (!activeCatalog) {
          fetchBooks(); 
        }

    } catch (error) {
        console.error("Error processing EPUB:", error);
        let errorMessage = "Failed to import the EPUB file. It might be corrupted or in an unsupported format.";
        if (error instanceof Error && error.message.includes('File is not a zip')) {
          errorMessage = "The provided file is not a valid EPUB (it's not a zip archive). Please try a different file.";
        }
        setImportStatus({ isLoading: false, message: '', error: errorMessage });
    }
  }, [activeCatalog, fetchBooks]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportStatus({ isLoading: true, message: 'Reading file...', error: null });
    const reader = new FileReader();
    reader.onload = async (e) => {
        const epubData = e.target?.result as ArrayBuffer;
        if (epubData) {
            await processAndSaveBook(epubData, file.name);
        } else {
            setImportStatus({ isLoading: false, message: '', error: "Could not read file data." });
        }
        event.target.value = '';
    };
    reader.onerror = () => {
        setImportStatus({ isLoading: false, message: '', error: 'An error occurred while trying to read the file.' });
    };
    reader.readAsArrayBuffer(file);
  };
  
  const handleImportFromCatalog = useCallback(async (book: CatalogBook) => {
    setImportStatus({ isLoading: true, message: `Downloading ${book.title}...`, error: null });
    try {
      // Use a CORS proxy to bypass browser security restrictions (CORS)
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(book.downloadUrl)}`;
      const response = await fetch(proxyUrl);
      if (!response.ok) throw new Error(`Download failed: ${response.statusText}`);
      const epubData = await response.arrayBuffer();
      await processAndSaveBook(epubData, book.title);
    } catch (error) {
      console.error("Error importing from catalog:", error);
      let message = "Download failed. The file may no longer be available, or there was a network issue. This can also happen due to browser security restrictions (CORS).";
      if (error instanceof Error && error.message.includes('Failed to fetch')) {
          message = "Download failed. Please check your network connection.";
      }
      setImportStatus({ isLoading: false, message: '', error: message });
    }
  }, [processAndSaveBook]);
  
  const handleBookClick = (event: React.MouseEvent<HTMLDivElement>, book: BookMetadata) => {
    const coverElement = event.currentTarget.querySelector('.book-cover-container');
    if (coverElement && book.id) {
        const rect = coverElement.getBoundingClientRect();
        const plainRect = {
            x: rect.x, y: rect.y,
            width: rect.width, height: rect.height,
            top: rect.top, right: rect.right, bottom: rect.bottom, left: rect.left,
        };
        onOpenBook(book.id, { rect: plainRect as DOMRect, coverImage: book.coverImage });
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-8">
      <header className="flex justify-between items-center mb-4 gap-4">
        <div ref={dropdownRef} className="relative">
          <button
            onClick={() => setIsCatalogDropdownOpen(prev => !prev)}
            className="flex items-center gap-2 text-white"
          >
            <h1 className="text-4xl font-bold tracking-tight truncate">
              {activeCatalog ? activeCatalog.name : 'My Library'}
            </h1>
            <ChevronDownIcon className={`w-6 h-6 transition-transform ${isCatalogDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          {isCatalogDropdownOpen && (
            <div className="absolute top-full mt-2 w-64 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-20">
              <ul className="p-1 text-white">
                <li>
                  <button onClick={() => handleSelectCatalog(null)} className={`w-full text-left px-3 py-2 text-sm rounded-md ${!activeCatalog ? 'bg-sky-600' : 'hover:bg-slate-700'}`}>
                    My Library
                  </button>
                </li>
                {catalogs.length > 0 && <li className="my-1 border-t border-slate-700"></li>}
                {catalogs.map(catalog => (
                  <li key={catalog.id}>
                    <button onClick={() => handleSelectCatalog(catalog)} className={`w-full text-left px-3 py-2 text-sm rounded-md truncate ${activeCatalog?.id === catalog.id ? 'bg-sky-600' : 'hover:bg-slate-700'}`}>
                      {catalog.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
            <button onClick={() => setIsManageCatalogsOpen(true)} className="cursor-pointer bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-4 rounded-lg inline-flex items-center transition-colors duration-200">
                <GlobeIcon className="w-5 h-5 mr-2" />
                <span>Catalogs</span>
            </button>
            <label htmlFor="epub-upload" className={`cursor-pointer bg-sky-500 hover:bg-sky-600 text-white font-bold py-2 px-4 rounded-lg inline-flex items-center transition-colors duration-200 ${importStatus.isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}>
              <UploadIcon className="w-5 h-5 mr-2" />
              <span>Import Book</span>
            </label>
            <input id="epub-upload" type="file" accept=".epub" className="hidden" onChange={handleFileChange} disabled={importStatus.isLoading} />
        </div>
      </header>

      {activeCatalog && catalogNavPath.length > 0 && (
          <nav aria-label="breadcrumb" className="flex items-center text-sm text-slate-400 mb-6 flex-wrap">
              {catalogNavPath.map((item, index) => (
                  <React.Fragment key={item.url}>
                      <button 
                          onClick={() => handleBreadcrumbClick(index)} 
                          className={`hover:text-sky-400 ${index === catalogNavPath.length - 1 ? 'font-semibold text-white' : ''}`}
                      >
                          {item.name}
                      </button>
                      {index < catalogNavPath.length - 1 && <ChevronRightIcon className="w-4 h-4 mx-1 flex-shrink-0" />}
                  </React.Fragment>
              ))}
          </nav>
      )}

      {(importStatus.isLoading || importStatus.error) && (
        <div className="fixed inset-0 bg-slate-900 bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 p-8 rounded-lg shadow-xl text-center max-w-sm w-full">
                {importStatus.isLoading && !importStatus.error && <Spinner text={importStatus.message} />}
                {importStatus.error && (
                    <div className="flex flex-col items-center">
                        <h3 className="text-xl font-bold text-red-400 mb-4">Import Failed</h3>
                        <p className="text-slate-300 mb-6">{importStatus.error}</p>
                        <button
                            onClick={() => setImportStatus({ isLoading: false, message: '', error: null })}
                            className="bg-sky-500 hover:bg-sky-600 text-white font-bold py-2 px-6 rounded-lg transition-colors"
                        >
                            Close
                        </button>
                    </div>
                )}
            </div>
        </div>
      )}
      
      {activeCatalog ? (
        <div>
          {isCatalogLoading ? (
            <div className="flex justify-center mt-20"><Spinner text={`Loading...`} /></div>
          ) : catalogError ? (
            <div className="text-center py-20 bg-slate-800 rounded-lg">
                <h2 className="text-2xl font-semibold text-red-400">Error Loading Catalog</h2>
                <p className="text-slate-300 mt-2 max-w-xl mx-auto">{catalogError}</p>
            </div>
          ) : catalogNavLinks.length > 0 ? (
            <div className="bg-slate-800/50 rounded-lg p-4">
                <ul className="space-y-2">
                    {catalogNavLinks.map(link => (
                        <li key={link.url}>
                            <button onClick={() => handleNavLinkClick(link)} className="w-full text-left flex items-center justify-between p-3 rounded-md hover:bg-slate-700/50 transition-colors">
                                <span className="font-semibold text-slate-200">{link.title}</span>
                                <ChevronRightIcon className="w-5 h-5 text-slate-400"/>
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
          ) : catalogBooks.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
              {catalogBooks.map((book, index) => (
                <div key={`${book.downloadUrl}-${index}`} onClick={() => handleImportFromCatalog(book)} className="cursor-pointer group relative">
                  <div className="aspect-[2/3] bg-slate-800 rounded-lg overflow-hidden shadow-lg transform group-hover:scale-105 transition-transform duration-300">
                    {book.coverImage ? (
                      <img src={book.coverImage} alt={book.title} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center p-4 text-center text-slate-400">
                        <span className="font-semibold">{book.title}</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-slate-900/70 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <DownloadIcon className="w-10 h-10 text-white mb-2" />
                        <span className="text-white font-bold text-center px-2">Add to Library</span>
                    </div>
                  </div>
                  <div className="mt-2">
                    <h3 className="text-sm font-semibold text-white truncate group-hover:text-sky-400">{book.title}</h3>
                    <p className="text-xs text-slate-400 truncate">{book.author}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-slate-800 rounded-lg">
              <h2 className="text-2xl font-semibold text-white">Empty Section</h2>
              <p className="text-slate-400 mt-2">No categories or books were found here.</p>
            </div>
          )}
        </div>
      ) : (
        <>
          {isLoading ? (
            <div className="flex justify-center mt-20"><Spinner /></div>
          ) : books.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
              {books.map((book) => (
                <div key={book.id} onClick={(e) => book.id && handleBookClick(e, book)} className="cursor-pointer group">
                  <div className="aspect-[2/3] bg-slate-800 rounded-lg overflow-hidden shadow-lg transform group-hover:scale-105 transition-transform duration-300 book-cover-container">
                    {book.coverImage ? (
                      <img src={book.coverImage} alt={book.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center p-4 text-center text-slate-400">
                        <span className="font-semibold">{book.title}</span>
                      </div>
                    )}
                  </div>
                  <div className="mt-2">
                    <h3 className="text-sm font-semibold text-white truncate group-hover:text-sky-400">{book.title}</h3>
                    <p className="text-xs text-slate-400 truncate">{book.author}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-slate-800 rounded-lg">
              <h2 className="text-2xl font-semibold text-white">Your library is empty.</h2>
              <p className="text-slate-400 mt-2">Import your first EPUB book or add a catalog to get started!</p>
            </div>
          )}
        </>
      )}

      <ManageCatalogsModal
        isOpen={isManageCatalogsOpen}
        onClose={() => setIsManageCatalogsOpen(false)}
        catalogs={catalogs}
        onAddCatalog={handleAddCatalog}
        onDeleteCatalog={handleDeleteCatalog}
      />
    </div>
  );
};

export default Library;
