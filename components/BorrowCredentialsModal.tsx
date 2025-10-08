import React, { useState } from 'react';
import { OpdsCredential, saveOpdsCredential } from '../services/opds2';
import { CheckIcon, CloseIcon } from './icons';

interface Props {
  isOpen: boolean;
  initialUrl: string;
  onCancel: () => void;
  onConfirm: (cred: { username: string; password: string }, save?: boolean, name?: string, urlPattern?: string) => void;
}

const BorrowCredentialsModal: React.FC<Props> = ({ isOpen, initialUrl, onCancel, onConfirm }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [save, setSave] = useState(false);
  const [name, setName] = useState('');
  const [urlPattern, setUrlPattern] = useState(initialUrl);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900 bg-opacity-70 p-4">
      <div className="bg-slate-800 w-full max-w-md rounded-lg p-6 text-white">
        <h3 className="text-lg font-semibold mb-3">Enter library credentials</h3>
        <p className="text-slate-400 text-sm mb-4">These credentials will be used to perform borrow actions on this catalog.</p>
        <label className="block text-xs text-slate-300">Username</label>
        <input aria-label="username" value={username} onChange={e => setUsername(e.target.value)} className="w-full p-2 rounded bg-slate-700 text-white mb-2" />
        <label className="block text-xs text-slate-300">Password</label>
        <input aria-label="password" type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-2 rounded bg-slate-700 text-white mb-2" />
        <div className="flex items-center gap-2 mt-2">
          <input id="saveCred" type="checkbox" checked={save} onChange={e => setSave(e.target.checked)} />
          <label htmlFor="saveCred" className="text-sm text-slate-300">Save credential for this catalog</label>
        </div>
        {save && (
          <div className="mt-3">
            <label className="block text-xs text-slate-300">Credential Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. My Library" className="w-full p-2 rounded bg-slate-700 text-white mb-2" />
            <label className="block text-xs text-slate-300">URL pattern</label>
            <input value={urlPattern} onChange={e => setUrlPattern(e.target.value)} placeholder="host or substring to match" className="w-full p-2 rounded bg-slate-700 text-white" />
          </div>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onCancel} className="px-3 py-1 rounded bg-slate-700 hover:bg-slate-600 flex items-center gap-2"><CloseIcon className="w-4 h-4"/>Cancel</button>
          <button onClick={() => onConfirm({ username, password }, save, name, urlPattern)} disabled={!username || !password} className="px-3 py-1 rounded bg-sky-600 hover:bg-sky-700 flex items-center gap-2"><CheckIcon className="w-4 h-4"/>Confirm</button>
        </div>
      </div>
    </div>
  );
};

export default BorrowCredentialsModal;
