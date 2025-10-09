import React, { useState, useEffect, useCallback, useRef } from 'react';
import { db } from '../services/db';
import { BookMetadata, BookRecord, CoverAnimationData, Catalog, CatalogBook, CatalogNavigationLink, CatalogPagination, CatalogRegistry } from '../types';
import { UploadIcon, GlobeIcon, ChevronDownIcon, ChevronRightIcon, LeftArrowIcon, RightArrowIcon, FolderIcon, FolderOpenIcon, TrashIcon, AdjustmentsVerticalIcon, SettingsIcon, PlusIcon, CheckIcon, MeBooksBookIcon } from './icons';
import Spinner from './Spinner';
import ManageCatalogsModal from './ManageCatalogsModal';
import DuplicateBookModal from './DuplicateBookModal';
import DeleteConfirmationModal from './DeleteConfirmationModal';
import { Logo } from './Logo';
import { fetchCatalogContent } from '../services/opds';
import { proxiedUrl } from '../services/utils';

interface LibraryProps {
  onOpenBook: (id: number, animationData: CoverAnimationData, format?: string) => void;
  onShowBookDetail: (book: BookMetadata | CatalogBook, source: 'library' | 'catalog', catalogName?: string) => void;
  processAndSaveBook: (
    epubData: ArrayBuffer, 
    fileName?: string, 
    authorName?: string,
    source?: 'file' | 'catalog', 
    providerName?: string,
    providerId?: string,
    format?: string,
    coverImageUrl?: string | null
  ) => Promise<{ success: boolean; bookRecord?: BookRecord, existingBook?: BookRecord }>;
  importStatus: { isLoading: boolean; message: string; error: string | null; };
  setImportStatus: React.Dispatch<React.SetStateAction<{ isLoading: boolean; message: string; error: string | null; }>>;
  activeOpdsSource: Catalog | CatalogRegistry | null;
  setActiveOpdsSource: React.Dispatch<React.SetStateAction<Catalog | CatalogRegistry | null>>;
  catalogNavPath: { name: string, url: string }[];
  setCatalogNavPath: React.Dispatch<React.SetStateAction<{ name: string, url: string }[]>>;
  onOpenCloudSyncModal: () => void;
  onOpenLocalStorageModal: () => void;
  onShowAbout: () => void;
}

const Library: React.FC<LibraryProps> = ({ 
  onOpenBook, 
  onShowBookDetail, 
  processAndSaveBook, 
  importStatus, 
  setImportStatus, 
  activeOpdsSource, 
  setActiveOpdsSource, 
  catalogNavPath, 
  setCatalogNavPath, 
  onOpenCloudSyncModal, 
  onOpenLocalStorageModal, 
  onShowAbout 
}) => {
  const [books, setBooks] = useState<BookMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [catalogs, setCatalogs] = useState<Catalog[]>([]);
  const [registries, setRegistries] = useState<CatalogRegistry[]>([]);

  const [catalogBooks, setCatalogBooks] = useState<CatalogBook[]>([]);
  const [catalogNavLinks, setCatalogNavLinks] = useState<CatalogNavigationLink[]>([]);
  const [catalogPagination, setCatalogPagination] = useState<CatalogPagination | null>(null);

  const [isCatalogLoading, setIsCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const [isManageCatalogsOpen, setIsManageCatalogsOpen] = useState(false);
  const [isCatalogDropdownOpen, setIsCatalogDropdownOpen] = useState(false);
  
  const [duplicateBook, setDuplicateBook] = useState<BookRecord | null>(null);
  const [existingBook, setExistingBook] = useState<BookRecord | null>(null);
  const [bookToDelete, setBookToDelete] = useState<BookMetadata | null>(null);
  const [sortOrder, setSortOrder] = useState(() => localStorage.getItem('ebook-sort-order') || 'added-desc');
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false);


  const dropdownRef = useRef<HTMLDivElement>(null);
  const sortDropdownRef = useRef<HTMLDivElement>(null);
  const settingsMenuRef = useRef<HTMLDivElement>(null);


  const fetchBooks = useCallback(async () => {
    setIsCatalogLoading(false); 
    setIsLoading(true);
    try {
      const booksData = await db.getBooksMetadata();
      setBooks(booksData);
    } catch (error) {
      console.error("Failed to fetch books:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const sortedBooks = React.useMemo(() => {
    const sorted = [...books];
    const [key, direction] = sortOrder.split('-');

    sorted.sort((a, b) => {
        let valA: any, valB: any;
        switch(key) {
            case 'title':
                valA = a.title.toLowerCase();
                valB = b.title.toLowerCase();
                break;
            case 'author':
                valA = a.author.toLowerCase();
                valB = b.author.toLowerCase();
                break;
            case 'pubdate':
                valA = a.publicationDate ? new Date(a.publicationDate).getTime() : 0;
                valB = b.publicationDate ? new Date(b.publicationDate).getTime() : 0;
                if (isNaN(valA)) valA = 0;
                if (isNaN(valB)) valB = 0;
                break;
            case 'added':
            default:
                valA = a.id!;
                valB = b.id!;
                break;
        }

        if (valA < valB) return direction === 'asc' ? -1 : 1;
        if (valA > valB) return direction === 'asc' ? 1 : -1;
        return 0;
    });
    return sorted;
  }, [books, sortOrder]);

  const getFromStorage = useCallback((key: string) => {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : [];
  }, []);

  const saveToStorage = useCallback((key: string, data: any[]) => {
    localStorage.setItem(key, JSON.stringify(data));
  }, []);
  
  const handleAddCatalog = useCallback((name: string, url: string) => {
    const newCatalog: Catalog = { id: new Date().toISOString(), name, url };
    const currentCatalogs = getFromStorage('ebook-catalogs');
    const updatedCatalogs = [...currentCatalogs, newCatalog];
    saveToStorage('ebook-catalogs', updatedCatalogs);
    setCatalogs(updatedCatalogs);
  }, [getFromStorage, saveToStorage]);

  const handleDeleteCatalog = useCallback((id: string) => {
    const currentCatalogs = getFromStorage('ebook-catalogs');
    const updatedCatalogs = currentCatalogs.filter((c: Catalog) => c.id !== id);
    saveToStorage('ebook-catalogs', updatedCatalogs);
    setCatalogs(updatedCatalogs);
    if (activeOpdsSource?.id === id) {
      handleSelectSource('library');
    }
  }, [activeOpdsSource, getFromStorage, saveToStorage]);

  const handleUpdateCatalog = useCallback((id: string, newName: string) => {
    const currentCatalogs = getFromStorage('ebook-catalogs');
    const updatedCatalogs = currentCatalogs.map((c: Catalog) => c.id === id ? { ...c, name: newName } : c);
    saveToStorage('ebook-catalogs', updatedCatalogs);
    setCatalogs(updatedCatalogs);
    if (activeOpdsSource?.id === id) {
        setActiveOpdsSource(prev => prev ? { ...prev, name: newName } : null);
        setCatalogNavPath(prev => {
            if (prev.length > 0) {
                const newPath = [...prev];
                newPath[0] = { ...newPath[0], name: newName };
                return newPath;
            }
            return prev;
        });
    }
  }, [activeOpdsSource, getFromStorage, saveToStorage, setActiveOpdsSource, setCatalogNavPath]);

  const handleAddRegistry = useCallback((name: string, url: string) => {
    const newRegistry: CatalogRegistry = { id: new Date().toISOString(), name, url };
    const currentRegistries = getFromStorage('ebook-reader-registries');
    const updatedRegistries = [...currentRegistries, newRegistry];
    saveToStorage('ebook-reader-registries', updatedRegistries);
    setRegistries(updatedRegistries);
  }, [getFromStorage, saveToStorage]);

  const handleDeleteRegistry = useCallback((id: string) => {
    const currentRegistries = getFromStorage('ebook-reader-registries');
    const updatedRegistries = currentRegistries.filter((r: CatalogRegistry) => r.id !== id);
    saveToStorage('ebook-reader-registries', updatedRegistries);
    setRegistries(updatedRegistries);
    if (activeOpdsSource?.id === id) {
      handleSelectSource('library');
    }
  }, [activeOpdsSource, getFromStorage, saveToStorage]);

  const handleUpdateRegistry = useCallback((id: string, newName: string) => {
    const currentRegistries = getFromStorage('ebook-reader-registries');
    const updatedRegistries = currentRegistries.map((r: CatalogRegistry) => r.id === id ? { ...r, name: newName } : r);
    saveToStorage('ebook-reader-registries', updatedRegistries);
    setRegistries(updatedRegistries);
    if (activeOpdsSource?.id === id) {
      setActiveOpdsSource(prev => prev ? { ...prev, name: newName } : null);
    }
  }, [activeOpdsSource, getFromStorage, saveToStorage, setActiveOpdsSource]);

  const fetchAndParseSource = useCallback(async (url: string, baseUrl?: string) => {
    setIsLoading(false);
    setIsCatalogLoading(true);
    setCatalogError(null);
    setCatalogBooks([]);
    setCatalogNavLinks([]);
    setCatalogPagination(null);

    const { books, navLinks, pagination, error } = await fetchCatalogContent(url, baseUrl || url);
    if (error) {
        setCatalogError(error);
    } else {
        // A registry is a feed that has navigation but no publications.
        // For these feeds, filter out any nav links that are also for pagination
        // to prevent UI loops and redundant controls.
        const isFeedARegistry = navLinks.length > 0 && books.length === 0;
        
        let finalNavLinks = navLinks;
        if (isFeedARegistry) {
            const paginationUrls = Object.values(pagination).filter((val): val is string => !!val);
            finalNavLinks = navLinks.filter(nav => !paginationUrls.includes(nav.url));
        }
        
        setCatalogBooks(books);
        setCatalogNavLinks(finalNavLinks);
        setCatalogPagination(pagination);
    }
    setIsCatalogLoading(false);
  }, []);
  
  const handleSelectSource = useCallback((source: 'library' | Catalog | CatalogRegistry) => {
    setIsCatalogDropdownOpen(false);
    if (source === 'library') {
      setActiveOpdsSource(null);
      setCatalogNavPath([]);
    } else if (activeOpdsSource?.id !== source.id) {
        setActiveOpdsSource(source);
        // When a new source is selected, reset the navigation path to its root.
        setCatalogNavPath([{ name: source.name, url: source.url }]);
    }
  }, [activeOpdsSource?.id, setActiveOpdsSource, setCatalogNavPath]);

  useEffect(() => {
    setCatalogs(getFromStorage('ebook-catalogs'));
    setRegistries(getFromStorage('ebook-reader-registries'));
  }, [getFromStorage]);
  
  useEffect(() => {
    if (activeOpdsSource) {
        // If a source is active but the path is empty (e.g., on first selection or page load), initialize it.
        if (catalogNavPath.length === 0) {
            setCatalogNavPath([{ name: activeOpdsSource.name, url: activeOpdsSource.url }]);
        } else {
            // Otherwise, fetch content for the current navigation path.
            const currentPath = catalogNavPath[catalogNavPath.length - 1];
            fetchAndParseSource(currentPath.url, activeOpdsSource.url);
        }
    } else {
        // No active source, so show the local library.
        fetchBooks();
    }
  }, [activeOpdsSource, catalogNavPath, fetchAndParseSource, fetchBooks, setCatalogNavPath]);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsCatalogDropdownOpen(false);
      }
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target as Node)) {
        setIsSortDropdownOpen(false);
      }
      if (settingsMenuRef.current && !settingsMenuRef.current.contains(event.target as Node)) {
        setIsSettingsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePaginationClick = (url: string) => {
    setCatalogNavPath(prev => {
        if (prev.length === 0) return prev;
        const newPath = [...prev];
        const lastItem = { ...newPath[newPath.length - 1], url };
        newPath[newPath.length - 1] = lastItem;
        return newPath;
    });
  };

  const handleNavLinkClick = (link: {title: string, url: string}) => {
    setCatalogNavPath(prev => [...prev, { name: link.title, url: link.url }]);
  };

  const handleBreadcrumbClick = (index: number) => {
    setCatalogNavPath(prev => prev.slice(0, index + 1));
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportStatus({ isLoading: true, message: 'Reading file...', error: null });
    const reader = new FileReader();
    reader.onload = async (e) => {
        const epubData = e.target?.result as ArrayBuffer;
        if (epubData) {
            let format = 'EPUB';
            if (file.name.toLowerCase().endsWith('.pdf')) {
                format = 'PDF';
            }
            const result = await processAndSaveBook(epubData, file.name, undefined, 'file', undefined, undefined, format, null);
            if (!result.success && result.bookRecord && result.existingBook) {
                setDuplicateBook(result.bookRecord);
                setExistingBook(result.existingBook);
            } else if (result.success && !activeOpdsSource) {
                fetchBooks();
            }
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

  const handleReplaceBook = useCallback(async () => {
    if (!duplicateBook || !existingBook) return;

    setImportStatus({ isLoading: true, message: 'Replacing book...', error: null });
    const bookToSave = { ...duplicateBook, id: existingBook.id };

    setDuplicateBook(null);
    setExistingBook(null);

    try {
      await db.saveBook(bookToSave);
      setImportStatus({ isLoading: false, message: 'Import successful!', error: null });
      setTimeout(() => setImportStatus({ isLoading: false, message: '', error: null }), 2000);
      if (!activeOpdsSource) {
        fetchBooks();
      }
    } catch (error) {
      console.error("Error replacing book:", error);
      setImportStatus({ isLoading: false, message: '', error: 'Failed to replace the book in the library.' });
    }
  }, [duplicateBook, existingBook, activeOpdsSource, fetchBooks, setImportStatus]);

  const handleAddAnyway = useCallback(async () => {
    if (!duplicateBook) return;

    setImportStatus({ isLoading: true, message: 'Saving new copy...', error: null });
    const bookToSave = { ...duplicateBook };
    
    setDuplicateBook(null);
    setExistingBook(null);

    try {
      await db.saveBook(bookToSave);
      setImportStatus({ isLoading: false, message: 'Import successful!', error: null });
      setTimeout(() => setImportStatus({ isLoading: false, message: '', error: null }), 2000);
      if (!activeOpdsSource) {
        fetchBooks();
      }
    } catch (error) {
      console.error("Error adding duplicate book:", error);
      setImportStatus({ isLoading: false, message: '', error: 'Failed to add the new copy to the library.' });
    }
  }, [duplicateBook, activeOpdsSource, fetchBooks, setImportStatus]);

  const handleCancelDuplicate = () => {
    setDuplicateBook(null);
    setExistingBook(null);
    setImportStatus({ isLoading: false, message: '', error: null });
  };
  
  const handleLocalBookClick = async (book: BookMetadata) => {
    if (book.id) {
        const fullBookMetadata = await db.getBookMetadata(book.id);
        if (!fullBookMetadata) {
            console.error("Could not find book details for ID:", book.id);
            return;
        }
        onShowBookDetail(fullBookMetadata, 'library');
    }
  };

  const handleCatalogBookClick = (book: CatalogBook) => {
      onShowBookDetail(book, 'catalog', activeOpdsSource?.name);
  };

  const handleToggleNode = useCallback(async (nodeUrl: string) => {
    const findAndUpdateNode = async (nodes: CatalogNavigationLink[]): Promise<CatalogNavigationLink[]> => {
      const newNodes = [...nodes];
      for (let i = 0; i < newNodes.length; i++) {
        const node = newNodes[i];
        if (node.url === nodeUrl) {
          if (node.isExpanded) {
            newNodes[i] = { ...node, isExpanded: false };
            return newNodes;
          }

          if (node.children) {
            newNodes[i] = { ...node, isExpanded: true };
            return newNodes;
          }

          newNodes[i] = { ...node, isLoading: true };
          setCatalogNavLinks(prevLinks => {
            const linksCopy = JSON.parse(JSON.stringify(prevLinks));
            const findAndUpdate = (links: CatalogNavigationLink[]): boolean => {
              for (const link of links) {
                if (link.url === nodeUrl) {
                  link.isLoading = true;
                  return true;
                }
                if (link.children && findAndUpdate(link.children)) return true;
              }
              return false;
            };
            findAndUpdate(linksCopy);
            return linksCopy;
          });

          const baseUrl = activeOpdsSource?.url;
          const { navLinks: newChildren, error } = await fetchCatalogContent(node.url, baseUrl || node.url);
          
          if (error) {
            console.error(`Error fetching children for ${node.title}:`, error);
            newNodes[i] = { ...node, isLoading: false, _hasFetchedChildren: true, _canExpand: false };
          } else {
            const canExpand = newChildren.length > 0;
            newNodes[i] = { 
              ...node, 
              isLoading: false, 
              isExpanded: canExpand, 
              children: canExpand ? newChildren : undefined,
              _hasFetchedChildren: true,
              _canExpand: canExpand
            };
          }
          return newNodes;
        }

        if (node.children) {
          const updatedChildren = await findAndUpdateNode(node.children);
          if (updatedChildren !== node.children) {
            newNodes[i] = { ...node, children: updatedChildren };
            return newNodes;
          }
        }
      }
      return newNodes;
    };

    const updatedLinks = await findAndUpdateNode(catalogNavLinks);
    setCatalogNavLinks(updatedLinks);
}, [activeOpdsSource, catalogNavLinks]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!bookToDelete || typeof bookToDelete.id === 'undefined') return;

    try {
      await db.deleteBook(bookToDelete.id);
      setBooks(prevBooks => prevBooks.filter(b => b.id !== bookToDelete.id));
    } catch (error) {
      console.error("Failed to delete book:", error);
    } finally {
      setBookToDelete(null);
    }
  }, [bookToDelete]);

  const handleSortChange = (newSortOrder: string) => {
    setSortOrder(newSortOrder);
    localStorage.setItem('ebook-sort-order', newSortOrder);
    setIsSortDropdownOpen(false);
  };

  const OpdsNavigationItem: React.FC<{ 
    link: CatalogNavigationLink;
    level: number;
    onToggle: (url: string) => void;
    onNavigate: (link: { title: string, url: string }) => void;
  }> = ({ link, level, onToggle, onNavigate }) => {
    const indentation = 1.5 + (level * 1.5);
    const isAlreadyAdded = catalogs.some(c => c.url === link.url);
    const isCatalogLink = !!link.isCatalog;
    
    // A catalog link is a terminal node in the discovery tree; it doesn't expand further.
    // A regular navigation link can be expanded if we haven't checked for children yet, or if it has children.
    const canToggle = !isCatalogLink && (!link._hasFetchedChildren || !!link._canExpand);

    const handleAdd = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!isAlreadyAdded) {
            handleAddCatalog(link.title, link.url);
        }
    };

    const renderIcon = () => {
      if (isCatalogLink) {
        return <GlobeIcon className="w-5 h-5 text-sky-400" />;
      }
      if (link.isLoading) {
        return <Spinner size="small" />;
      }
      return (
        <button 
          onClick={(e) => { e.stopPropagation(); if (canToggle) onToggle(link.url); }}
          className={`p-1 ${canToggle ? '' : 'opacity-30 cursor-default'}`}
          aria-label={link.isExpanded ? `Collapse ${link.title}` : `Expand ${link.title}`}
          disabled={!canToggle}
        >
          { link.isExpanded ? <FolderOpenIcon className="w-5 h-5 text-sky-400" /> : <FolderIcon className="w-5 h-5 text-slate-400"/>}
        </button>
      );
    };

    return (
        <li className="my-1 group/item">
      <div 
        className={`flex items-center gap-2 w-full text-left p-2 rounded-md hover:bg-slate-700/50 transition-colors pl-[${indentation}rem]`}
      >
                <div className="flex items-center justify-center w-6 h-6 flex-shrink-0">
                    {renderIcon()}
                </div>
                 <button onClick={() => onNavigate(link)} className="flex-grow text-left flex items-center justify-between">
                    <span className="font-semibold text-slate-200 group-hover/item:text-sky-300 transition-colors">{link.title}</span>
                    <ChevronRightIcon className="w-4 h-4 text-slate-400 opacity-0 group-hover/item:opacity-100 transition-opacity mr-2" />
                </button>
                <button
                    onClick={handleAdd}
                    disabled={isAlreadyAdded}
                    className="flex-shrink-0 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md text-xs font-bold transition-all disabled:cursor-not-allowed
                    text-white opacity-0 group-hover/item:opacity-100 focus-within:opacity-100
                    enabled:bg-sky-500 enabled:hover:bg-sky-600
                    disabled:bg-green-600/50 disabled:text-green-300"
                >
                    {isAlreadyAdded ? <CheckIcon className="w-4 h-4"/> : <PlusIcon className="w-4 h-4"/>}
                    <span>{isAlreadyAdded ? 'Added' : 'Add'}</span>
                </button>
            </div>
            {!isCatalogLink && link.isExpanded && link.children && link.children.length > 0 && (
                <ul className="pl-4 border-l border-slate-700 ml-3">
                    {link.children.map(child => (
                        <OpdsNavigationItem key={child.url} link={child} level={level + 1} onToggle={onToggle} onNavigate={onNavigate} />
                    ))}
                </ul>
            )}
        </li>
    );
  };

  const renderCurrentView = () => {
    if (isCatalogLoading) {
      return <div className="flex justify-center mt-20"><Spinner text="Loading..." /></div>;
    }
    if (catalogError) {
      return (
        <div className="text-center py-20 bg-slate-800 rounded-lg">
          <h2 className="text-2xl font-semibold text-red-400">Error Loading Source</h2>
          <p className="text-slate-300 mt-2 max-w-xl mx-auto">{catalogError}</p>
        </div>
      );
    }

    // OPDS VIEW (CATALOG OR REGISTRY)
    if (activeOpdsSource) {
        return (
            <div>
                {catalogNavLinks.length > 0 && (
                    <div className="bg-slate-800/50 rounded-lg p-4 mb-6">
                        <h2 className="text-lg font-semibold text-slate-300 mb-2 px-2">Categories</h2>
                        <ul>
                            {catalogNavLinks.map(link => (
                                <OpdsNavigationItem key={link.url} link={link} level={0} onToggle={handleToggleNode} onNavigate={handleNavLinkClick} />
                            ))}
                        </ul>
                    </div>
                )}
                
                {catalogBooks.length > 0 && (
                    <>
                        {catalogNavLinks.length > 0 && <h2 className="text-lg font-semibold text-slate-300 mb-4">Books</h2>}
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                            {catalogBooks.map((book, index) => (
                                <div key={`${book.downloadUrl}-${index}`} onClick={() => handleCatalogBookClick(book)} className="cursor-pointer group relative">
                                    <div className="aspect-[2/3] bg-slate-800 rounded-lg overflow-hidden shadow-lg transform group-hover:scale-105 transition-transform duration-300">
                                        {book.coverImage ? (
                                        <img
                                            src={book.coverImage}
                                            alt={book.title}
                                            className="w-full h-full object-cover"
                                            loading="lazy"
                                            onError={(e) => {
                                              const img = e.currentTarget as HTMLImageElement;
                                              // Prevent infinite retry loop by clearing handler first
                                              img.onerror = null as any;
                                              img.src = proxiedUrl(book.coverImage as string);
                                            }}
                                        />
                                        ) : (
                                        <div className="w-full h-full flex items-center justify-center p-4 text-center text-slate-400">
                                            <span className="font-semibold">{book.title}</span>
                                        </div>
                                        )}
                                    </div>
                                    <div className="mt-2 space-y-1">
                                        <h3 className="text-sm font-semibold text-white truncate group-hover:text-sky-400">{book.title}</h3>
                                        <p className="text-xs text-slate-400 truncate">{book.author}</p>
                                        {book.format && (
                                            <span className={`inline-block text-white text-[10px] font-bold px-2 py-0.5 rounded ${book.format.toUpperCase() === 'PDF' ? 'bg-red-600' : 'bg-sky-500'}`}>
                                                {book.format}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
                
                {catalogNavLinks.length === 0 && catalogBooks.length === 0 && (
                    <div className="text-center py-20 bg-slate-800 rounded-lg">
                        <h2 className="text-2xl font-semibold text-white">Empty Section</h2>
                        <p className="text-slate-400 mt-2">No categories or books were found here.</p>
                    </div>
                )}
                
                {catalogPagination && (catalogPagination.prev || catalogPagination.next) && !isCatalogLoading && (
                    <div className="flex justify-between items-center mt-8">
                        <button
                            onClick={() => catalogPagination.prev && handlePaginationClick(catalogPagination.prev)}
                            disabled={!catalogPagination.prev}
                            className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-4 rounded-lg inline-flex items-center transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <LeftArrowIcon className="w-5 h-5 mr-2" />
                            <span>Previous</span>
                        </button>
                        <button
                            onClick={() => catalogPagination.next && handlePaginationClick(catalogPagination.next)}
                            disabled={!catalogPagination.next}
                            className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-4 rounded-lg inline-flex items-center transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <span>Next</span>
                            <RightArrowIcon className="w-5 h-5 ml-2" />
                        </button>
                    </div>
                )}
            </div>
        )
    }

    // LIBRARY VIEW
    return (
        <>
          {isLoading ? (
            <div className="flex justify-center mt-20"><Spinner /></div>
          ) : books.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
              {sortedBooks.map((book) => (
                <div key={book.id} onClick={() => book.id && handleLocalBookClick(book)} className="cursor-pointer group relative">
                  <div className="aspect-[2/3] bg-slate-800 rounded-lg overflow-hidden shadow-lg transform group-hover:scale-105 transition-transform duration-300 book-cover-container">
                    {book.coverImage ? (
                      <img src={book.coverImage} alt={book.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center p-4 text-center text-slate-400">
                        <span className="font-semibold">{book.title}</span>
                      </div>
                    )}
                  </div>
                   <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setBookToDelete(book);
                        }}
                        className="absolute top-2 right-2 p-1.5 bg-slate-900/70 rounded-full text-slate-300 hover:text-white hover:bg-red-600 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 z-10"
                        aria-label={`Delete ${book.title}`}
                    >
                        <TrashIcon className="w-4 h-4" />
                    </button>
                  <div className="mt-2 space-y-1">
                    <h3 className="text-sm font-semibold text-white truncate group-hover:text-sky-400">{book.title}</h3>
                    <p className="text-xs text-slate-400 truncate">{book.author}</p>
                    <span className={`inline-block text-white text-[10px] font-bold px-2 py-0.5 rounded ${(book.format || 'EPUB').toUpperCase() === 'PDF' ? 'bg-red-600' : 'bg-sky-500'}`}>
                        {book.format || 'EPUB'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-slate-800 rounded-lg">
              <h2 className="text-2xl font-semibold text-white">Your library is empty.</h2>
              <p className="text-slate-400 mt-2">Import your first book or add a catalog to get started!</p>
            </div>
          )}
        </>
    );
  };

  const sortOptions = [
    { key: 'added-desc', label: 'Recently Added' },
    { key: 'title-asc', label: 'Title (A-Z)' },
    { key: 'title-desc', label: 'Title (Z-A)' },
    { key: 'author-asc', label: 'Author (A-Z)' },
    { key: 'author-desc', label: 'Author (Z-A)' },
    { key: 'pubdate-desc', label: 'Publication Date (Newest)' },
    { key: 'pubdate-asc', label: 'Publication Date (Oldest)' },
  ];

  const currentTitle = activeOpdsSource ? activeOpdsSource.name : 'My Library';
  const isBrowsingOpds = !!activeOpdsSource;

  return (
    <div className="container mx-auto p-4 md:p-8">
      <header className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 gap-4">
        <div className="flex items-center gap-4">
          <MeBooksBookIcon className="w-10 h-10 text-sky-400 flex-shrink-0" />
          <div ref={dropdownRef} className="relative">
            <button
              onClick={() => setIsCatalogDropdownOpen(prev => !prev)}
              className="flex items-center gap-2 text-white text-left"
            >
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
                {currentTitle}
              </h1>
              <ChevronDownIcon className={`w-6 h-6 transition-transform flex-shrink-0 mt-1 md:mt-2 ${isCatalogDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            {isCatalogDropdownOpen && (
              <div className="absolute top-full mt-2 w-72 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-20">
                <ul className="p-1 text-white max-h-96 overflow-y-auto">
                  <li>
                    <button onClick={() => handleSelectSource('library')} className={`w-full text-left px-3 py-2 text-sm rounded-md ${!isBrowsingOpds ? 'bg-sky-600' : 'hover:bg-slate-700'}`}>
                      My Library
                    </button>
                  </li>
                  {(catalogs.length > 0 || registries.length > 0) && <li className="my-1 border-t border-slate-700"></li>}
                  
                  {catalogs.length > 0 && <>
                    <li className="px-3 pt-2 pb-1 text-xs font-semibold text-slate-400 uppercase">Catalogs</li>
                    {catalogs.map(catalog => (
                      <li key={catalog.id}>
                        <button onClick={() => handleSelectSource(catalog)} className={`w-full text-left px-3 py-2 text-sm rounded-md truncate ${isBrowsingOpds && activeOpdsSource?.id === catalog.id ? 'bg-sky-600' : 'hover:bg-slate-700'}`}>
                          {catalog.name}
                        </button>
                      </li>
                    ))}
                  </>}
                  {registries.length > 0 && <>
                    <li className="px-3 pt-2 pb-1 text-xs font-semibold text-slate-400 uppercase">Registries</li>
                    {registries.map(registry => (
                        <li key={registry.id}>
                            <button onClick={() => handleSelectSource(registry)} className={`w-full text-left px-3 py-2 text-sm rounded-md truncate ${isBrowsingOpds && activeOpdsSource?.id === registry.id ? 'bg-sky-600' : 'hover:bg-slate-700'}`}>
                                {registry.name}
                            </button>
                        </li>
                    ))}
                  </>}
                </ul>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 self-end md:self-auto">
            {!isBrowsingOpds && (
                <div ref={sortDropdownRef} className="relative">
                    <button onClick={() => setIsSortDropdownOpen(prev => !prev)} className="cursor-pointer bg-slate-700 hover:bg-slate-600 text-white font-bold p-2 sm:py-2 sm:px-4 rounded-lg inline-flex items-center transition-colors duration-200">
                        <AdjustmentsVerticalIcon className="w-5 h-5 sm:mr-2" />
                        <span className="hidden sm:inline">Sort</span>
                    </button>
                    {isSortDropdownOpen && (
                         <div className="absolute top-full right-0 mt-2 w-56 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-20">
                             <ul className="p-1 text-white">
                                {sortOptions.map(option => (
                                    <li key={option.key}>
                                        <button onClick={() => handleSortChange(option.key)} className={`w-full text-left px-3 py-2 text-sm rounded-md ${sortOrder === option.key ? 'bg-sky-600' : 'hover:bg-slate-700'}`}>
                                            {option.label}
                                        </button>
                                    </li>
                                ))}
                             </ul>
                         </div>
                    )}
                </div>
            )}
            <label htmlFor="epub-upload" className={`cursor-pointer bg-sky-500 hover:bg-sky-600 text-white font-bold p-2 sm:py-2 sm:px-4 rounded-lg inline-flex items-center transition-colors duration-200 ${importStatus.isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}>
              <UploadIcon className="w-5 h-5 sm:mr-2" />
              <span className="hidden sm:inline">Import Book</span>
            </label>
            <input id="epub-upload" type="file" accept=".epub,.pdf" className="hidden" onChange={handleFileChange} disabled={importStatus.isLoading} />

            <div ref={settingsMenuRef} className="relative">
                <button
                onClick={() => setIsSettingsMenuOpen(prev => !prev)}
                className="cursor-pointer bg-slate-700 hover:bg-slate-600 text-white font-bold p-2 rounded-lg inline-flex items-center transition-colors duration-200 h-[40px] w-[40px] justify-center"
                aria-label="Open settings menu"
                aria-haspopup="true"
                {...(isSettingsMenuOpen ? { 'aria-expanded': 'true' } : {})}
                >
                <SettingsIcon className="w-5 h-5" />
                </button>
                {isSettingsMenuOpen && (
                <div 
                    className="absolute top-full right-0 mt-2 w-56 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-20"
                    role="menu"
                    aria-orientation="vertical"
                >
                    <ul className="p-1 text-white" role="none">
                      <li role="none">
                          <button
                          onClick={() => {
                              setIsManageCatalogsOpen(true);
                              setIsSettingsMenuOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-slate-700 block"
                          role="menuitem"
                          >
                          Manage Sources
                          </button>
                      </li>
                      <li className="my-1 border-t border-slate-700/50" role="separator"></li>
                      <li role="none">
                          <button
                          onClick={() => {
                              onOpenLocalStorageModal();
                              setIsSettingsMenuOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-slate-700 block"
                          role="menuitem"
                          >
                          Local Storage
                          </button>
                      </li>
                      <li role="none">
                          <button
                          onClick={() => {
                              onOpenCloudSyncModal();
                              setIsSettingsMenuOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-slate-700 block"
                          role="menuitem"
                          >
                          Cloud Storage (Google Drive)
                          </button>
                      </li>
                      <li className="my-1 border-t border-slate-700/50" role="separator"></li>
                      <li role="none">
                        <button
                          onClick={() => {
                              onShowAbout();
                              setIsSettingsMenuOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-slate-700 block"
                          role="menuitem"
                          >
                          About
                          </button>
                      </li>
                    </ul>
                </div>
                )}
            </div>
        </div>
      </header>

      {isBrowsingOpds && catalogNavPath.length > 0 && (
          <nav aria-label="breadcrumb" className="flex items-center text-sm text-slate-400 mb-6 flex-wrap">
              {catalogNavPath.map((item, index) => (
                  <React.Fragment key={index}>
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

      {(importStatus.isLoading || importStatus.error || importStatus.message === 'Import successful!') && (
        <div className="fixed inset-0 bg-slate-900 bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 p-8 rounded-lg shadow-xl text-center max-w-sm w-full">
                {importStatus.isLoading && !importStatus.error && <Spinner text={importStatus.message} />}
                {importStatus.message === 'Import successful!' && !importStatus.isLoading && (
                    <div className="flex flex-col items-center">
                        <h3 className="text-xl font-bold text-green-400 mb-4">Success</h3>
                        <p className="text-slate-300 mb-6">Book imported successfully!</p>
                    </div>
                )}
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
      
      {renderCurrentView()}

      <ManageCatalogsModal
        isOpen={isManageCatalogsOpen}
        onClose={() => setIsManageCatalogsOpen(false)}
        catalogs={catalogs}
        onAddCatalog={handleAddCatalog}
        onDeleteCatalog={handleDeleteCatalog}
        onUpdateCatalog={handleUpdateCatalog}
        registries={registries}
        onAddRegistry={handleAddRegistry}
        onDeleteRegistry={handleDeleteRegistry}
        onUpdateRegistry={handleUpdateRegistry}
      />

      <DuplicateBookModal
        isOpen={!!duplicateBook}
        onClose={handleCancelDuplicate}
        onReplace={handleReplaceBook}
        onAddAnyway={handleAddAnyway}
        bookTitle={duplicateBook?.title || ''}
      />

      <DeleteConfirmationModal
        isOpen={!!bookToDelete}
        onClose={() => setBookToDelete(null)}
        onConfirm={handleDeleteConfirm}
        bookTitle={bookToDelete?.title || ''}
      />
    </div>
  );
};

export default Library;