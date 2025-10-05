import React, { useState } from 'react';
import { Catalog } from '../types';
import { CloseIcon, GlobeIcon, PlusIcon, TrashIcon, PencilIcon, CheckIcon } from './icons';

interface ManageCatalogsModalProps {
  isOpen: boolean;
  onClose: () => void;
  catalogs: Catalog[];
  onAddCatalog: (name: string, url: string) => void;
  onDeleteCatalog: (id: string) => void;
  onUpdateCatalog: (id: string, newName: string) => void;
}

const ManageCatalogsModal: React.FC<ManageCatalogsModalProps> = ({ isOpen, onClose, catalogs, onAddCatalog, onDeleteCatalog, onUpdateCatalog }) => {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [editingCatalogId, setEditingCatalogId] = useState<string | null>(null);
  const [editedName, setEditedName] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !url.trim()) {
      setError('Name and URL cannot be empty.');
      return;
    }
    try {
        new URL(url);
    } catch (_) {
        setError('Please enter a valid URL.');
        return;
    }
    setError('');
    onAddCatalog(name, url);
    setName('');
    setUrl('');
  };

  const handleStartEdit = (catalog: Catalog) => {
    setEditingCatalogId(catalog.id);
    setEditedName(catalog.name);
  };

  const handleCancelEdit = () => {
    setEditingCatalogId(null);
    setEditedName('');
  };

  const handleSaveEdit = () => {
    if (!editingCatalogId || !editedName.trim()) return;
    onUpdateCatalog(editingCatalogId, editedName.trim());
    handleCancelEdit();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose} aria-modal="true" role="dialog">
      <div className="bg-slate-800 rounded-lg shadow-xl w-full max-w-lg p-6 text-white" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-sky-300">Manage Catalogs</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-700 transition-colors" aria-label="Close">
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Add new catalog form */}
            <div className="bg-slate-900/50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><PlusIcon className="w-5 h-5"/> Add New Catalog</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="catalog-name" className="block text-sm font-medium text-slate-400 mb-1">Name</label>
                        <input
                            id="catalog-name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g., Project Gutenberg"
                            className="w-full bg-slate-700 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                        />
                    </div>
                    <div>
                        <label htmlFor="catalog-url" className="block text-sm font-medium text-slate-400 mb-1">URL</label>
                        <input
                            id="catalog-url"
                            type="url"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="https://.../catalog.xml"
                            className="w-full bg-slate-700 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                        />
                    </div>
                    {error && <p className="text-sm text-red-400">{error}</p>}
                    <button type="submit" className="w-full py-2 px-4 rounded-md bg-sky-500 hover:bg-sky-600 transition-colors font-bold text-sm">
                        Add Catalog
                    </button>
                </form>
            </div>

            {/* Existing catalogs list */}
            <div className="bg-slate-900/50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><GlobeIcon className="w-5 h-5" /> Saved Catalogs</h3>
                {catalogs.length > 0 ? (
                    <ul className="space-y-2 max-h-60 overflow-y-auto pr-2">
                        {catalogs.map(catalog => (
                            <li key={catalog.id} className="bg-slate-700/50 p-2 rounded-md flex items-center justify-between gap-2">
                                {editingCatalogId === catalog.id ? (
                                    <>
                                        <input
                                            type="text"
                                            value={editedName}
                                            onChange={(e) => setEditedName(e.target.value)}
                                            className="w-full bg-slate-600 rounded-md p-1 text-sm focus:outline-none focus:ring-1 focus:ring-sky-500"
                                            autoFocus
                                            onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(); if (e.key === 'Escape') handleCancelEdit(); }}
                                        />
                                        <div className="flex items-center flex-shrink-0">
                                            <button onClick={handleSaveEdit} className="p-2 rounded-full hover:bg-green-500/20 text-green-400 transition-colors" aria-label={`Save changes for ${catalog.name}`}>
                                                <CheckIcon className="w-4 h-4" />
                                            </button>
                                            <button onClick={handleCancelEdit} className="p-2 rounded-full hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-colors" aria-label="Cancel editing">
                                                <CloseIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="truncate">
                                            <p className="font-semibold text-slate-200 truncate">{catalog.name}</p>
                                            <p className="text-xs text-slate-400 truncate">{catalog.url}</p>
                                        </div>
                                        <div className="flex items-center flex-shrink-0">
                                            <button onClick={() => handleStartEdit(catalog)} className="p-2 rounded-full hover:bg-sky-500/20 text-slate-500 hover:text-sky-400 transition-colors" aria-label={`Edit ${catalog.name}`}>
                                                <PencilIcon className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => onDeleteCatalog(catalog.id)} className="p-2 rounded-full hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-colors" aria-label={`Delete ${catalog.name}`}>
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </>
                                )}
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-sm text-slate-400 text-center py-8">No catalogs added yet.</p>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default ManageCatalogsModal;