import React, { useState, useEffect } from 'react';
import { OpdsCredential, getStoredOpdsCredentials, saveOpdsCredential, deleteOpdsCredential } from '../services/opds2';
import { CloseIcon, PlusIcon, TrashIcon, CheckIcon } from './icons';

interface Props { isOpen: boolean; onClose: () => void; }

const OpdsCredentialsModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [creds, setCreds] = useState<OpdsCredential[]>([]);
  const [editing, setEditing] = useState<OpdsCredential | null>(null);

  useEffect(() => {
    if (isOpen) setCreds(getStoredOpdsCredentials());
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAdd = () => setEditing({ id: `cred-${Date.now()}`, name: 'New Credential', username: '', password: '', urlPattern: '' });

  const handleSave = () => {
    if (!editing) return;
    saveOpdsCredential(editing);
    setCreds(getStoredOpdsCredentials());
    setEditing(null);
  };

  const handleDelete = (id: string) => {
    deleteOpdsCredential(id);
    setCreds(getStoredOpdsCredentials());
    if (editing?.id === id) setEditing(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900 bg-opacity-70 p-4">
      <div className="bg-slate-800 w-full max-w-2xl rounded-lg p-6 text-white">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">OPDS Credentials</h2>
          <div className="flex items-center gap-2">
            <button onClick={handleAdd} className="bg-sky-600 hover:bg-sky-700 px-3 py-1 rounded flex items-center gap-2" aria-label="Add credential">
              <PlusIcon className="w-4 h-4" /> <span className="sr-only">Add</span>
            </button>
            <button onClick={onClose} className="p-2 rounded hover:bg-slate-700" aria-label="Close credentials dialog">
              <CloseIcon className="w-5 h-5" /> <span className="sr-only">Close</span>
            </button>
          </div>
        </div>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {creds.length === 0 && <div className="text-slate-400">No credentials saved. Click Add to create one.</div>}
          {creds.map(c => (
            <div key={c.id} className="bg-slate-900/40 p-3 rounded flex items-start justify-between">
              <div className="flex-grow">
                <div className="font-semibold">{c.name}</div>
                <div className="text-xs text-slate-400">Pattern: {c.urlPattern || <em>none</em>}</div>
                <div className="text-xs text-slate-400">User: {c.username}</div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setEditing(c)} className="px-2 py-1 rounded bg-slate-700 hover:bg-slate-600">Edit</button>
                <button onClick={() => handleDelete(c.id)} className="px-2 py-1 rounded bg-red-700 hover:bg-red-600 flex items-center gap-2"><TrashIcon className="w-4 h-4"/>Delete</button>
              </div>
            </div>
          ))}

          {editing && (
            <div className="bg-slate-900/30 p-3 rounded">
              <label className="block text-xs text-slate-300">Name</label>
              <input aria-label="Credential name" placeholder="Library name" className="w-full p-2 rounded bg-slate-800 text-white" value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} />
              <label className="block text-xs text-slate-300 mt-2">URL Pattern (optional)</label>
              <input aria-label="URL pattern" placeholder="e.g. minotaur.dev.palaceproject.io" className="w-full p-2 rounded bg-slate-800 text-white" value={editing.urlPattern || ''} onChange={e => setEditing({ ...editing, urlPattern: e.target.value })} />
              <label className="block text-xs text-slate-300 mt-2">Username</label>
              <input aria-label="Username" placeholder="username" className="w-full p-2 rounded bg-slate-800 text-white" value={editing.username} onChange={e => setEditing({ ...editing, username: e.target.value })} />
              <label className="block text-xs text-slate-300 mt-2">Password</label>
              <input type="password" aria-label="Password" placeholder="password" className="w-full p-2 rounded bg-slate-800 text-white" value={editing.password} onChange={e => setEditing({ ...editing, password: e.target.value })} />
              <div className="mt-3 flex justify-end gap-2">
                <button onClick={() => setEditing(null)} className="px-3 py-1 rounded bg-slate-700 hover:bg-slate-600">Cancel</button>
                <button onClick={handleSave} className="px-3 py-1 rounded bg-sky-600 hover:bg-sky-700 flex items-center gap-2"><CheckIcon className="w-4 h-4"/>Save</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OpdsCredentialsModal;
