import React, { useState, useEffect, useCallback, useRef } from 'react';
import { db } from '../services/db';
import { BookMetadata, BookRecord, CoverAnimationData, Catalog, CatalogBook, CatalogNavigationLink, CatalogPagination } from '../types';
import { UploadIcon, GlobeIcon, ChevronDownIcon, ChevronRightIcon, LeftArrowIcon, RightArrowIcon, FolderIcon, FolderOpenIcon, TrashIcon, AdjustmentsVerticalIcon } from './icons';
import Spinner from './Spinner';
import ManageCatalogsModal from './ManageCatalogsModal';
import DuplicateBookModal from './DuplicateBookModal';
import DeleteConfirmationModal from './DeleteConfirmationModal';

interface LibraryProps {
  onOpenBook: (id: number, animationData: CoverAnimationData) => void;
  onShowBookDetail: (book: BookMetadata | CatalogBook, source: 'library' | 'catalog', catalogName?: string) => void;
  processAndSaveBook: (
    epubData: ArrayBuffer, 
    fileName?: string, 
    source?: 'file' | 'catalog', 
    providerName?: string,
    providerId?: string,
    format?: string
  ) => Promise<{ success: boolean; bookRecord?: BookRecord, existingBook?: BookRecord }>;
  importStatus: { isLoading: boolean; message: string; error: string | null; };
  setImportStatus: React.Dispatch<React.SetStateAction<{ isLoading: boolean; message: string; error: string | null; }>>;
  activeCatalog: Catalog | null;
  setActiveCatalog: React.Dispatch<React.SetStateAction<Catalog | null>>;
  catalogNavPath: { name: string, url: string }[];
  setCatalogNavPath: React.Dispatch<React.SetStateAction<{ name: string, url: string }[]>>;
}

const getFormatFromMimeType = (mimeType: string): string | undefined => {
    if (!mimeType) return 'EPUB'; // Default to EPUB if type is missing for an acquisition link
    if (mimeType.includes('epub+zip')) return 'EPUB';
    if (mimeType.includes('pdf')) return 'PDF';
    return mimeType.split('/')[1]?.toUpperCase() || undefined;
};

const parseOpds1Xml = (xmlText: string, baseUrl: string): { books: CatalogBook[], navLinks: CatalogNavigationLink[], pagination: CatalogPagination } => {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'application/xml');

    const errorNode = xmlDoc.querySelector('parsererror');
    if (errorNode) {
      console.error("XML Parsing Error:", errorNode.textContent);
      throw new Error('Failed to parse catalog feed. The URL may not point to a valid OPDS feed, or the response was not valid XML.');
    }

    const entries = Array.from(xmlDoc.querySelectorAll('entry'));
    const books: CatalogBook[] = [];
    const navLinks: CatalogNavigationLink[] = [];
    const pagination: CatalogPagination = {};
    
    const feedLinks = Array.from(xmlDoc.querySelectorAll('feed > link'));
    feedLinks.forEach(link => {
        const rel = link.getAttribute('rel');
        const href = link.getAttribute('href');
        if (href) {
            const fullUrl = new URL(href, baseUrl).href;
            if (rel === 'next') pagination.next = fullUrl;
            if (rel === 'previous') pagination.prev = fullUrl;
            if (rel === 'first') pagination.first = fullUrl;
            if (rel === 'last') pagination.last = fullUrl;
        }
    });

    entries.forEach(entry => {
      const title = entry.querySelector('title')?.textContent?.trim() || 'Untitled';
      const allLinks = Array.from(entry.querySelectorAll('link'));
      
      const acquisitionLink = allLinks.find(link => {
          const rel = link.getAttribute('rel') || '';
          const type = link.getAttribute('type') || '';
          return rel.includes('opds-spec.org/acquisition') && (type.includes('epub+zip') || type.includes('pdf'));
      }) || allLinks.find(link => (link.getAttribute('rel') || '').includes('opds-spec.org/acquisition'));

      const subsectionLink = entry.querySelector('link[rel="subsection"], link[rel="http://opds-spec.org/subsection"]');

      if (acquisitionLink) {
          const author = entry.querySelector('author > name')?.textContent?.trim() || 'Unknown Author';
          const summary = entry.querySelector('summary')?.textContent?.trim() || entry.querySelector('content')?.textContent?.trim() || null;
          const coverLink = entry.querySelector('link[rel="http://opds-spec.org/image"]');
          
          const coverImageHref = coverLink?.getAttribute('href');
          const coverImage = coverImageHref ? new URL(coverImageHref, baseUrl).href : null;
          
          const downloadUrlHref = acquisitionLink?.getAttribute('href');
          const mimeType = acquisitionLink?.getAttribute('type') || '';
          const format = getFormatFromMimeType(mimeType);
          
          const publisher = (entry.querySelector('publisher')?.textContent || entry.querySelector('dc\\:publisher')?.textContent)?.trim();
          const publicationDate = (entry.querySelector('issued')?.textContent || entry.querySelector('dc\\:issued')?.textContent || entry.querySelector('published')?.textContent)?.trim();
          const identifiers = Array.from(entry.querySelectorAll('identifier, dc\\:identifier'));
          const providerId = identifiers[0]?.textContent?.trim() || undefined;

          const subjects = Array.from(entry.querySelectorAll('category'))
              .map(cat => cat.getAttribute('term')?.trim())
              .filter((term): term is string => !!term);

          if(downloadUrlHref) {
              const downloadUrl = new URL(downloadUrlHref, baseUrl).href;
              books.push({ 
                  title, 
                  author, 
                  coverImage, 
                  downloadUrl, 
                  summary, 
                  publisher: publisher || undefined, 
                  publicationDate: publicationDate || undefined, 
                  providerId, 
                  subjects: subjects.length > 0 ? subjects : undefined,
                  format
              });
          }
      } else if (subsectionLink) {
          const navUrl = subsectionLink?.getAttribute('href');
          if (navUrl) {
              navLinks.push({ title, url: new URL(navUrl, baseUrl).href, rel: 'subsection' });
          }
      }
    });

    return { books, navLinks, pagination };
}

const parseOpds2Json = (jsonData: any, baseUrl: string): { books: CatalogBook[], navLinks: CatalogNavigationLink[], pagination: CatalogPagination } => {
    if (!jsonData || typeof jsonData !== 'object') {
        throw new Error('Invalid catalog format. The response was not a valid JSON object.');
    }
    if (!jsonData.metadata || (!jsonData.publications && !jsonData.navigation)) {
        throw new Error('Invalid catalog format. The JSON file is missing required OPDS 2.0 fields like "metadata", "publications", or "navigation".');
    }

    const books: CatalogBook[] = [];
    const navLinks: CatalogNavigationLink[] = [];
    const pagination: CatalogPagination = {};

    if (jsonData.links && Array.isArray(jsonData.links)) {
        jsonData.links.forEach((link: any) => {
            if (link.href && link.rel) {
                const fullUrl = new URL(link.href, baseUrl).href;
                if (link.rel === 'next') pagination.next = fullUrl;
                if (link.rel === 'previous') pagination.prev = fullUrl;
                if (link.rel === 'first') pagination.first = fullUrl;
                if (link.rel === 'last') pagination.last = fullUrl;
            }
        });
    }

    if (jsonData.publications && Array.isArray(jsonData.publications)) {
        jsonData.publications.forEach((pub: any) => {
            const metadata = pub.metadata || {};
            const title = metadata.title?.trim() || 'Untitled';
            const summary = metadata.description?.trim() || null;
            
            let author = 'Unknown Author';
            if (metadata.author) {
                if (Array.isArray(metadata.author) && metadata.author.length > 0) {
                    const firstAuthor = metadata.author[0];
                    if (typeof firstAuthor === 'string') author = firstAuthor.trim();
                    else if (firstAuthor?.name) author = firstAuthor.name.trim();
                } else if (typeof metadata.author === 'string') {
                    author = metadata.author.trim();
                } else if (metadata.author?.name) {
                    author = metadata.author.name.trim();
                }
            }

            const acquisitionLink = pub.links?.find((l: any) => l.rel?.includes('opds-spec.org/acquisition'));
            const coverLink = pub.images?.[0];

            if (acquisitionLink?.href) {
                const downloadUrl = new URL(acquisitionLink.href, baseUrl).href;
                const coverImage = coverLink?.href ? new URL(coverLink.href, baseUrl).href : null;
                const mimeType = acquisitionLink?.type || '';
                const format = getFormatFromMimeType(mimeType);

                let publisher: string | undefined = undefined;
                if (metadata.publisher) {
                    if (typeof metadata.publisher === 'string') {
                        publisher = metadata.publisher.trim();
                    } else if (metadata.publisher?.name) {
                        publisher = metadata.publisher.name.trim();
                    }
                }

                const publicationDate = metadata.published?.trim();

                let providerId: string | undefined = undefined;
                if (typeof metadata.identifier === 'string') {
                    providerId = metadata.identifier.trim();
                } else if (Array.isArray(metadata.identifier) && metadata.identifier.length > 0) {
                    const firstIdentifier = metadata.identifier.find((id: any) => typeof id === 'string');
                    if (firstIdentifier) {
                        providerId = firstIdentifier.trim();
                    }
                }

                let subjects: string[] = [];
                if (Array.isArray(metadata.subject)) {
                    subjects = metadata.subject.map((s: any) => {
                        if (typeof s === 'string') return s.trim();
                        if (s?.name) return s.name.trim();
                        return null;
                    }).filter((s): s is string => !!s);
                }

                books.push({ 
                    title, 
                    author, 
                    coverImage, 
                    downloadUrl, 
                    summary, 
                    publisher, 
                    publicationDate, 
                    providerId, 
                    subjects: subjects.length > 0 ? subjects : undefined,
                    format
                });
            }
        });
    }

    if (jsonData.navigation && Array.isArray(jsonData.navigation)) {
        jsonData.navigation.forEach((link: any) => {
            if (link.href && link.title) {
                const url = new URL(link.href, baseUrl).href;
                navLinks.push({ title: link.title, url, rel: link.rel || '' });
            }
        });
    }

    return { books, navLinks, pagination };
}

const fetchCatalogContent = async (url: string, baseUrl: string): Promise<{ books: CatalogBook[], navLinks: CatalogNavigationLink[], pagination: CatalogPagination, error?: string }> => {
    try {
        const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
        const response = await fetch(proxyUrl);
        
        if (!response.ok) {
            const statusInfo = `${response.status}${response.statusText ? ` ${response.statusText}` : ''}`;
            let errorMessage = `The catalog server responded with an error (${statusInfo}). Please check the catalog URL.`;
            if (response.status === 401 || response.status === 403) {
                errorMessage = `Could not access catalog (${statusInfo}). This catalog requires authentication (a login or password), which is not supported by this application.`;
            }
            throw new Error(errorMessage);
        }
        
        const contentType = response.headers.get('Content-Type') || '';
        const responseText = await response.text();

        if (contentType.includes('application/opds+json') || contentType.includes('application/json')) {
            const jsonData = JSON.parse(responseText);
            return parseOpds2Json(jsonData, baseUrl);
        } else if (contentType.includes('application/atom+xml') || contentType.includes('application/xml') || contentType.includes('text/xml')) {
            return parseOpds1Xml(responseText, baseUrl);
        } else {
            // Attempt to auto-detect format if Content-Type is vague (e.g., text/plain)
            if (responseText.trim().startsWith('{')) {
                try {
                    const jsonData = JSON.parse(responseText);
                    return parseOpds2Json(jsonData, baseUrl);
                } catch (e) { /* Fall through to XML parsing */ }
            }
            if (responseText.trim().startsWith('<')) {
                 return parseOpds1Xml(responseText, baseUrl);
            }
            throw new Error(`Unsupported or ambiguous catalog format. Content-Type: "${contentType}".`);
        }
    } catch (error) {
        console.error("Error fetching or parsing catalog content:", error);
        let message = "Could not load content from the catalog.";
        if (error instanceof SyntaxError) { // JSON.parse error
            message = "Failed to parse catalog feed. The response was not valid JSON."
        } else if (error instanceof TypeError && error.message === 'Failed to fetch') {
            message = 'Network Error: Failed to fetch the content. This could be due to your internet connection, the remote catalog being offline, or the public CORS proxy being temporarily unavailable.';
        } else if (error instanceof Error) {
            message = error.message;
        }
        return { books: [], navLinks: [], pagination: {}, error: message };
    }
};


const Library: React.FC<LibraryProps> = ({ onOpenBook, onShowBookDetail, processAndSaveBook, importStatus, setImportStatus, activeCatalog, setActiveCatalog, catalogNavPath, setCatalogNavPath }) => {
  const [books, setBooks] = useState<BookMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [catalogs, setCatalogs] = useState<Catalog[]>([]);
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


  const dropdownRef = useRef<HTMLDivElement>(null);
  const sortDropdownRef = useRef<HTMLDivElement>(null);


  const fetchBooks = useCallback(async () => {
    setIsCatalogLoading(false); // Turn off catalog spinner if active
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
                // Handle missing or invalid dates
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

  const fetchAndParseCatalog = useCallback(async (url: string, baseUrl?: string) => {
    setIsLoading(false); // Turn off library spinner if active
    setIsCatalogLoading(true);
    setCatalogError(null);
    setCatalogBooks([]);
    setCatalogNavLinks([]);
    setCatalogPagination(null);
    const { books, navLinks, pagination, error } = await fetchCatalogContent(url, baseUrl || url);
    if (error) {
        setCatalogError(error);
    } else {
        setCatalogBooks(books);
        setCatalogNavLinks(navLinks);
        setCatalogPagination(pagination);
    }
    setIsCatalogLoading(false);
  }, []);

  const handleSelectCatalog = useCallback((catalog: Catalog | null) => {
    setIsCatalogDropdownOpen(false);
    if (catalog) {
      // Only reset the path if switching to a new catalog
      if (activeCatalog?.id !== catalog.id) {
        setActiveCatalog(catalog);
        setCatalogNavPath([{ name: catalog.name, url: catalog.url }]);
      }
    } else {
      // Switching to My Library
      setActiveCatalog(null);
      setCatalogNavPath([]);
    }
  }, [activeCatalog, setActiveCatalog, setCatalogNavPath]);

  const handleDeleteCatalog = useCallback((id: string) => {
    const updatedCatalogs = catalogs.filter(c => c.id !== id);
    saveCatalogs(updatedCatalogs);
    if (activeCatalog?.id === id) {
      handleSelectCatalog(null);
    }
  }, [catalogs, saveCatalogs, activeCatalog, handleSelectCatalog]);

  const handleUpdateCatalog = useCallback((id: string, newName: string) => {
    const updatedCatalogs = catalogs.map(c => 
        c.id === id ? { ...c, name: newName } : c
    );
    saveCatalogs(updatedCatalogs);
    if (activeCatalog?.id === id) {
        setActiveCatalog(prev => prev ? { ...prev, name: newName } : null);
        setCatalogNavPath(prev => {
            if (prev.length > 0) {
                const newPath = [...prev];
                newPath[0] = { ...newPath[0], name: newName };
                return newPath;
            }
            return prev;
        });
    }
  }, [catalogs, saveCatalogs, activeCatalog, setActiveCatalog, setCatalogNavPath]);

  useEffect(() => {
    setCatalogs(getCatalogs());
  }, [getCatalogs]);
  
  // This effect is the single source of truth for what data to fetch and display.
  useEffect(() => {
    if (activeCatalog && catalogNavPath.length > 0) {
        const currentUrl = catalogNavPath[catalogNavPath.length - 1].url;
        fetchAndParseCatalog(currentUrl, activeCatalog.url);
    } else {
        fetchBooks();
    }
  }, [activeCatalog, catalogNavPath, fetchAndParseCatalog, fetchBooks]);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsCatalogDropdownOpen(false);
      }
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target as Node)) {
        setIsSortDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNavLinkClick = (link: {title: string, url: string}) => {
    setCatalogNavPath(prev => [...prev, { name: link.title, url: link.url }]);
  };

  const handleBreadcrumbClick = (index: number) => {
    setCatalogNavPath(prev => prev.slice(0, index + 1));
  };

  const handlePaginationClick = (url: string) => {
    // Update the URL of the current navigation level to reflect the new page
    setCatalogNavPath(prev => {
        if (prev.length === 0) return prev;
        const newPath = [...prev];
        const lastItem = { ...newPath[newPath.length - 1], url };
        newPath[newPath.length - 1] = lastItem;
        return newPath;
    });
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportStatus({ isLoading: true, message: 'Reading file...', error: null });
    const reader = new FileReader();
    reader.onload = async (e) => {
        const epubData = e.target?.result as ArrayBuffer;
        if (epubData) {
            const result = await processAndSaveBook(epubData, file.name, 'file');
            if (!result.success && result.bookRecord && result.existingBook) {
                setDuplicateBook(result.bookRecord);
                setExistingBook(result.existingBook);
            } else if (result.success && !activeCatalog) {
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
      if (!activeCatalog) {
        fetchBooks();
      }
    } catch (error) {
      console.error("Error replacing book:", error);
      setImportStatus({ isLoading: false, message: '', error: 'Failed to replace the book in the library.' });
    }
  }, [duplicateBook, existingBook, activeCatalog, fetchBooks, setImportStatus]);

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
      if (!activeCatalog) {
        fetchBooks();
      }
    } catch (error) {
      console.error("Error adding duplicate book:", error);
      setImportStatus({ isLoading: false, message: '', error: 'Failed to add the new copy to the library.' });
    }
  }, [duplicateBook, activeCatalog, fetchBooks, setImportStatus]);

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
      onShowBookDetail(book, 'catalog', activeCatalog?.name);
  };

  const handleToggleNode = useCallback(async (nodeUrl: string) => {
    const findAndUpdateNode = async (nodes: CatalogNavigationLink[]): Promise<CatalogNavigationLink[] | 'navigated'> => {
        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            if (node.url === nodeUrl) {
                if (node.isExpanded) {
                    nodes[i] = { ...node, isExpanded: false };
                } else {
                    if (node.children) {
                        nodes[i] = { ...node, isExpanded: true };
                    } else {
                        nodes[i] = { ...node, isLoading: true };
                        setCatalogNavLinks(prev => [...prev]); // Force re-render for spinner

                        const { books, navLinks: newChildren, error } = await fetchCatalogContent(node.url, activeCatalog?.url || node.url);

                        if (error) {
                            console.error(`Error fetching children for ${node.title}:`, error);
                            nodes[i] = { ...node, isLoading: false };
                        } else if (books.length > 0 || (newChildren.length === 0 && books.length === 0)) {
                             handleNavLinkClick(node);
                             return 'navigated';
                        } else {
                            nodes[i] = { ...node, isLoading: false, isExpanded: true, children: newChildren };
                        }
                    }
                }
                return nodes;
            }
            if (node.children) {
                const updatedChildren = await findAndUpdateNode(node.children);
                if (updatedChildren !== 'navigated' && updatedChildren !== null) {
                    nodes[i] = { ...node, children: updatedChildren };
                    return nodes;
                }
                if (updatedChildren === 'navigated') return 'navigated';
            }
        }
        return nodes;
    };
    const updatedLinks = await findAndUpdateNode(catalogNavLinks);
    if (updatedLinks !== 'navigated') {
        setCatalogNavLinks(updatedLinks);
    }
  }, [activeCatalog, catalogNavLinks, handleNavLinkClick]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!bookToDelete || typeof bookToDelete.id === 'undefined') return;

    try {
      await db.deleteBook(bookToDelete.id);
      setBooks(prevBooks => prevBooks.filter(b => b.id !== bookToDelete.id));
    } catch (error) {
      console.error("Failed to delete book:", error);
      // Optional: Set an error state to show a notification to the user
    } finally {
      setBookToDelete(null);
    }
  }, [bookToDelete]);

  const handleSortChange = (newSortOrder: string) => {
    setSortOrder(newSortOrder);
    localStorage.setItem('ebook-sort-order', newSortOrder);
    setIsSortDropdownOpen(false);
  };

  const CatalogTreeItem: React.FC<{ link: CatalogNavigationLink, level: number, onToggle: (url: string) => void }> = ({ link, level, onToggle }) => {
    const hasChildren = link.children && link.children.length > 0;
    const indentation = 1.5 + (level * 1.5);

    return (
        <li className="my-1">
            <div 
                className="flex items-center gap-2 w-full text-left p-2 rounded-md hover:bg-slate-700/50 transition-colors"
                style={{ paddingLeft: `${indentation}rem`}}
            >
                <div className="flex items-center justify-center w-6 h-6 flex-shrink-0">
                    { link.isLoading ? (
                        <Spinner size="small" />
                    ) : (
                        <button onClick={() => onToggle(link.url)} className="p-1">
                            { link.isExpanded ? <FolderOpenIcon className="w-5 h-5 text-sky-400" /> : <FolderIcon className="w-5 h-5 text-slate-400"/>}
                        </button>
                    )}
                </div>
                <button onClick={() => onToggle(link.url)} className="flex-grow text-left">
                    <span className="font-semibold text-slate-200">{link.title}</span>
                </button>
            </div>
            {link.isExpanded && hasChildren && (
                <ul className="pl-4 border-l border-slate-700 ml-3">
                    {link.children.map(child => (
                        <CatalogTreeItem key={child.url} link={child} level={level + 1} onToggle={onToggle} />
                    ))}
                </ul>
            )}
        </li>
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

  return (
    <div className="container mx-auto p-4 md:p-8">
      <header className="flex justify-between items-start mb-4 gap-4">
        <div ref={dropdownRef} className="relative">
          <button
            onClick={() => setIsCatalogDropdownOpen(prev => !prev)}
            className="flex items-center gap-2 text-white text-left"
          >
            <h1 className="text-4xl font-bold tracking-tight">
              {activeCatalog ? activeCatalog.name : 'My Library'}
            </h1>
            <ChevronDownIcon className={`w-6 h-6 transition-transform flex-shrink-0 mt-2 ${isCatalogDropdownOpen ? 'rotate-180' : ''}`} />
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

        <div className="flex items-center gap-2 flex-shrink-0">
            {!activeCatalog && (
                <div ref={sortDropdownRef} className="relative">
                    <button onClick={() => setIsSortDropdownOpen(prev => !prev)} className="cursor-pointer bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-4 rounded-lg inline-flex items-center transition-colors duration-200">
                        <AdjustmentsVerticalIcon className="w-5 h-5 mr-2" />
                        <span>Sort</span>
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
                <ul>
                    {catalogNavLinks.map(link => (
                        <CatalogTreeItem key={link.url} link={link} level={0} onToggle={handleToggleNode} />
                    ))}
                </ul>
            </div>
          ) : catalogBooks.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
              {catalogBooks.map((book, index) => (
                <div key={`${book.downloadUrl}-${index}`} onClick={() => handleCatalogBookClick(book)} className="cursor-pointer group relative">
                  <div className="aspect-[2/3] bg-slate-800 rounded-lg overflow-hidden shadow-lg transform group-hover:scale-105 transition-transform duration-300">
                    {book.coverImage ? (
                      <img src={`https://corsproxy.io/?${encodeURIComponent(book.coverImage)}`} alt={book.title} className="w-full h-full object-cover" loading="lazy" />
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
          ) : (
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
      ) : (
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
        onUpdateCatalog={handleUpdateCatalog}
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