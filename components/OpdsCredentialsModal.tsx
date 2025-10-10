import React, { useState, useEffect } from 'react';

interface Props {
  isOpen: boolean;
  host: string | null;
  authDocument?: any;
  onClose: () => void;
  onSubmit: (username: string, password: string, save: boolean) => void;
  // Called when the user clicks a provider auth link (the modal will still open the link via window.open)
  onOpenAuthLink?: (href: string) => void;
  // Called when the user clicks Retry after finishing provider login
  onRetry?: () => void;
}

const OpdsCredentialsModal: React.FC<Props> = ({ isOpen, host, authDocument, onClose, onSubmit, onOpenAuthLink, onRetry }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [save, setSave] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setUsername(''); setPassword(''); setSave(false);
      return;
    }

    // When opening, prefill hints from authDocument if available
    const userHint = authDocument?.username_hint || authDocument?.username || authDocument?.suggested_username || '';
    const passHint = authDocument?.password_hint || '';
    if (userHint) setUsername(String(userHint));
    // Do not prefill password for security, but set placeholder via attribute below
    if (passHint) setPassword('');
  }, [isOpen]);

  if (!isOpen) return null;

  const realmFromAuth = authDocument?.realm || authDocument?.title || null;
  const description = authDocument?.description || authDocument?.instructions || null;
  const logo = authDocument?.logo || authDocument?.image || null;
  const links: Array<any> = Array.isArray(authDocument?.links) ? authDocument.links : [];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900 bg-opacity-75 p-4">
      <div className="bg-slate-800 p-6 rounded-lg max-w-md w-full text-white">
        <div className="flex items-start gap-4 mb-2">
          {logo && <img src={logo} alt="provider logo" className="w-12 h-12 object-contain" />}
          <div>
            <h3 className="text-lg font-semibold">{realmFromAuth ? `Login to ${realmFromAuth}` : 'Authentication required'}</h3>
            <p className="text-sm text-slate-300">This catalog at <span className="font-mono">{host}</span> requires credentials to access the requested content.</p>
          </div>
        </div>
        {description && <p className="text-sm text-slate-300 mb-4">{description}</p>}

        {links.length > 0 && (
          <div className="mb-4 text-sm text-slate-300">
            <div className="font-semibold mb-1">Authentication Links</div>
            <ul className="list-disc list-inside">
              {links.map((l, i) => (
                <li key={i}><a className="text-sky-400" href={l.href} target="_blank" rel="noreferrer">{l.title || l.href}</a> {l.rel ? <span className="text-xs text-slate-400">({l.rel})</span> : null}</li>
              ))}
            </ul>
          </div>
        )}

        {/* If there's an authenticate link, show a CTA to open it and a retry button */}
        {links.length > 0 && (
          <div className="mb-4 flex gap-2">
            {links.map((l, i) => {
              const isAuth = (l.rel || '').toString().includes('authenticate');
              return isAuth ? (
                <div key={i} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      // Open in new tab/window for the user to login
                      try { window.open(l.href, '_blank', 'noopener'); } catch {}
                      if (typeof onOpenAuthLink === 'function') {
                        onOpenAuthLink(l.href);
                      }
                    }}
                    className="px-3 py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-white"
                  >
                    Open sign-in page
                  </button>
                </div>
              ) : null;
            })}
          </div>
        )}

  <label htmlFor="opds-username" className="block text-sm text-slate-300 mb-1">Username</label>
  <input id="opds-username" aria-label="username" placeholder={authDocument?.username_placeholder || 'Username'} value={username} onChange={(e) => setUsername(e.target.value)} className="w-full mb-3 p-2 rounded bg-slate-900 border border-slate-700 text-white" />

  <label htmlFor="opds-password" className="block text-sm text-slate-300 mb-1">Password</label>
  <input id="opds-password" aria-label="password" placeholder={authDocument?.password_placeholder || 'Password'} type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full mb-3 p-2 rounded bg-slate-900 border border-slate-700 text-white" />

    {authDocument?.username_hint && <div className="text-xs text-slate-400 mb-2">Hint: {authDocument.username_hint}</div>}
    {authDocument?.password_hint && <div className="text-xs text-slate-400 mb-2">Password: {authDocument.password_hint}</div>}

        <div className="flex items-center gap-2 mb-4">
          <input id="saveCred" type="checkbox" checked={save} onChange={(e) => setSave(e.target.checked)} />
          <label htmlFor="saveCred" className="text-sm text-slate-300">Save credential for this host</label>
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded bg-slate-700 hover:bg-slate-600">Cancel</button>
          {/* If a retry handler is provided, show a Retry button so users can retry after using the provider login page */}
          {typeof onRetry === 'function' && (
            <button onClick={() => onRetry()} className="px-4 py-2 rounded bg-yellow-600 hover:bg-yellow-500">Retry</button>
          )}
          <button onClick={() => onSubmit(username, password, save)} className="px-4 py-2 rounded bg-sky-500 hover:bg-sky-600">Continue</button>
        </div>
      </div>
    </div>
  );
};

export default OpdsCredentialsModal;
