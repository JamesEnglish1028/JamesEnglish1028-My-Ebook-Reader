import React, { useState } from 'react';
import { TocItem, Bookmark, Citation, ReaderSettings, BookRecord } from '../types';
import { CloseIcon, ChevronRightIcon, TrashIcon } from './icons';

interface NavigationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  toc: TocItem[];
  onTocNavigate: (href: string) => void;
  bookmarks: Bookmark[];
  onBookmarkNavigate: (cfi: string) => void;
  onDeleteBookmark: (id: string) => void;
  citations: Citation[];
  onCitationNavigate: (cfi: string) => void;
  onDeleteCitation: (id: string) => void;
  settings: ReaderSettings;
  bookData: BookRecord | null;
}

const formatAuthorName = (author: string, format: 'apa' | 'mla' | 'chicago') => {
    const parts = author.split(' ').filter(p => p);
    if (parts.length < 2) return author;
    const lastName = parts.pop()!;
    const firstName = parts.join(' ');

    switch (format) {
        case 'apa':
            const initials = firstName.split(' ').map(n => n[0] + '.').join(' ');
            return `${lastName}, ${initials}`;
        case 'mla':
        case 'chicago':
            return `${lastName}, ${firstName}`;
        default:
            return author;
    }
}

const generateCitationParts = (
    book: BookRecord,
    format: 'apa' | 'mla' | 'chicago'
): { preTitle: string; title: string; postTitle: string } => {
    const author = formatAuthorName(book.author || 'Unknown Author', format);
    const title = book.title || 'Untitled Book';

    switch (format) {
        case 'apa':
            return { preTitle: `${author}. (n.d.). `, title: title, postTitle: `.` };
        case 'mla':
        case 'chicago':
            return { preTitle: `${author}. `, title: title, postTitle: `.` };
        default:
            return { preTitle: `${book.author}. `, title: title, postTitle: `.` };
    }
};


const TocListItem: React.FC<{ item: TocItem; onNavigate: (href: string) => void; level: number }> = ({ item, onNavigate, level }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const hasSubitems = item.subitems && item.subitems.length > 0;

    const handleItemClick = () => {
        if (hasSubitems) {
            setIsExpanded(!isExpanded);
        } else {
            onNavigate(item.href);
        }
    };

    const isTopLevel = level === 0;

    const typographyClasses = isTopLevel 
        ? "font-semibold text-slate-200" 
        : "font-normal text-slate-300";

    const hoverClasses = "hover:bg-sky-500/10";
    
    const indentationStyle = { paddingLeft: `${0.75 + level * 1.25}rem` };

    return (
        <li>
            <button
                onClick={handleItemClick}
                className={`w-full text-left py-2 pr-3 rounded-md transition-colors duration-150 ease-in-out flex items-center justify-between group ${hoverClasses}`}
                style={indentationStyle}
            >
                <span className={`${typographyClasses} group-hover:text-sky-300 transition-colors`}>
                    {item.label.trim()}
                </span>
                {hasSubitems && (
                    <ChevronRightIcon className={`w-4 h-4 text-slate-500 transition-transform duration-200 flex-shrink-0 ${isExpanded ? 'rotate-90' : ''}`} />
                )}
            </button>
            {hasSubitems && (
                 <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isExpanded ? 'max-h-[1000px]' : 'max-h-0'}`}>
                    <ul className="pt-1">
                        {item.subitems.map((subitem) => (
                            <TocListItem key={subitem.id} item={subitem} onNavigate={onNavigate} level={level + 1} />
                        ))}
                    </ul>
                </div>
            )}
        </li>
    );
};


const TocPanel: React.FC<NavigationPanelProps> = ({ 
    isOpen, 
    onClose, 
    toc, 
    onTocNavigate, 
    bookmarks, 
    onBookmarkNavigate, 
    onDeleteBookmark,
    citations,
    onCitationNavigate,
    onDeleteCitation,
    settings,
    bookData,
}) => {
  const [activeTab, setActiveTab] = useState<'toc' | 'bookmarks' | 'citations'>('toc');
    
  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/60 z-30"
        onClick={onClose}
        aria-hidden="true"
      ></div>
      <div
        className={`fixed top-0 left-0 h-full w-80 bg-slate-800 shadow-2xl z-40 transform transition-transform duration-300 ease-in-out flex flex-col ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="nav-heading"
      >
        <div className="p-4 border-b border-slate-700 flex justify-between items-center flex-shrink-0">
          <h3 id="nav-heading" className="text-xl font-semibold text-white">Navigation</h3>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-700" aria-label="Close navigation panel">
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>
        
        <div className="border-b border-slate-700 px-2 flex-shrink-0">
            <nav className="flex -mb-px">
                <button
                    onClick={() => setActiveTab('toc')}
                    className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors duration-200 ${
                        activeTab === 'toc'
                        ? 'border-sky-400 text-sky-300'
                        : 'border-transparent text-slate-400 hover:text-white hover:border-slate-500'
                    }`}
                    aria-current={activeTab === 'toc' ? 'page' : undefined}
                >
                    Contents
                </button>
                <button
                    onClick={() => setActiveTab('bookmarks')}
                    className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors duration-200 ${
                        activeTab === 'bookmarks'
                        ? 'border-sky-400 text-sky-300'
                        : 'border-transparent text-slate-400 hover:text-white hover:border-slate-500'
                    }`}
                     aria-current={activeTab === 'bookmarks' ? 'page' : undefined}
                >
                    Bookmarks
                </button>
                 <button
                    onClick={() => setActiveTab('citations')}
                    className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors duration-200 ${
                        activeTab === 'citations'
                        ? 'border-sky-400 text-sky-300'
                        : 'border-transparent text-slate-400 hover:text-white hover:border-slate-500'
                    }`}
                     aria-current={activeTab === 'citations' ? 'page' : undefined}
                >
                    Citations
                </button>
            </nav>
        </div>

        <div className="overflow-y-auto flex-grow">
            {activeTab === 'toc' && (
                <div className="p-4">
                    {toc.length > 0 ? (
                        <ul className="space-y-1">
                            {toc.map((item) => (
                                <TocListItem key={item.id} item={item} onNavigate={onTocNavigate} level={0} />
                            ))}
                        </ul>
                    ) : (
                        <p className="p-4 text-slate-400 text-center">No table of contents available.</p>
                    )}
                </div>
            )}
            {activeTab === 'bookmarks' && (
                <div>
                    {bookmarks.length > 0 ? (
                        <ul className="divide-y divide-slate-700">
                            {bookmarks.sort((a, b) => a.createdAt - b.createdAt).map((bookmark) => (
                                <li key={bookmark.id} className="p-4 flex items-center justify-between group">
                                    <button onClick={() => onBookmarkNavigate(bookmark.cfi)} className="flex-grow text-left pr-4">
                                        {bookmark.chapter && (
                                            <span className="block text-xs font-semibold text-sky-400 uppercase tracking-wider mb-1">{bookmark.chapter}</span>
                                        )}
                                        <span className="block text-sm font-semibold text-slate-200 group-hover:text-sky-300 transition-colors">{bookmark.label}</span>
                                        {bookmark.description && (
                                            <blockquote className="mt-2 pl-3 border-l-2 border-slate-600">
                                                <p className="text-sm text-slate-300 italic">{bookmark.description}</p>
                                            </blockquote>
                                        )}
                                        <span className="block text-xs text-slate-400 mt-2">{new Date(bookmark.createdAt).toLocaleString()}</span>
                                    </button>
                                    <button onClick={() => onDeleteBookmark(bookmark.id)} className="p-2 rounded-full hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-colors flex-shrink-0" aria-label={`Delete bookmark: ${bookmark.label}`}>
                                        <TrashIcon className="w-5 h-5" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="p-8 text-slate-400 text-center">You haven't added any bookmarks yet.</p>
                    )}
                </div>
            )}
            {activeTab === 'citations' && (
                <div>
                    {citations.length > 0 && bookData ? (
                        <ul className="divide-y divide-slate-700">
                            {citations.sort((a, b) => a.createdAt - b.createdAt).map((citation) => {
                                const citationParts = generateCitationParts(bookData, settings.citationFormat);
                                return (
                                    <li key={citation.id} className="p-4 flex items-center justify-between group">
                                        <button onClick={() => onCitationNavigate(citation.cfi)} className="flex-grow text-left pr-4">
                                            <p className="text-sm font-semibold text-slate-200 group-hover:text-sky-300 transition-colors">
                                                {citationParts.preTitle}
                                                <em className="font-normal not-italic text-slate-300 group-hover:text-sky-400">{citationParts.title}</em>
                                                {citationParts.postTitle}
                                            </p>
                                            {citation.note && (
                                                <blockquote className="mt-2 pl-3 border-l-2 border-slate-600">
                                                    <p className="text-sm text-slate-300 italic">"{citation.note}"</p>
                                                </blockquote>
                                            )}
                                            <span className="block text-xs text-slate-400 mt-2">{new Date(citation.createdAt).toLocaleString()}</span>
                                        </button>
                                        <button onClick={() => onDeleteCitation(citation.id)} className="p-2 rounded-full hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-colors flex-shrink-0" aria-label={`Delete citation`}>
                                            <TrashIcon className="w-5 h-5" />
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    ) : (
                        <p className="p-8 text-slate-400 text-center">You haven't created any citations yet.</p>
                    )}
                </div>
            )}
        </div>
      </div>
    </>
  );
};

export default TocPanel;