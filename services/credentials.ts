import { logger } from './logger';

const DB_NAME = 'MeBooksCredentialsDB';
const STORE_NAME = 'credentials';
const DB_VERSION = 1;

type Cred = { host: string; username: string; password: string };

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'host' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveCredential(host: string, username: string, password: string) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put({ host, username, password } as Cred);
    return new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    logger.warn('saveCredential failed', e);
  }
}

export async function getAllCredentials(): Promise<Cred[]> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    return new Promise<Cred[]>((resolve, reject) => {
      req.onsuccess = () => resolve(req.result as Cred[]);
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    logger.warn('getAllCredentials failed', e);
    return [];
  }
}

export async function findCredential(host: string): Promise<Cred | undefined> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(host);
    return new Promise<Cred | undefined>((resolve, reject) => {
      req.onsuccess = () => resolve(req.result as Cred | undefined);
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    logger.warn('findCredential failed', e);
    return undefined;
  }
}

export async function deleteCredential(host: string) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(host);
    return new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    logger.warn('deleteCredential failed', e);
  }
}

// Migrate from existing localStorage key if present. This is safe to call
// multiple times; if credentials already exist in IDB we skip overwrite.
export async function migrateFromLocalStorage(localKey = 'mebooks.opds.credentials') {
  try {
    const raw = localStorage.getItem(localKey);
    if (!raw) return;
    let parsed: any = null;
    try { parsed = JSON.parse(raw); } catch (e) { parsed = null; }
    if (!Array.isArray(parsed)) return;
    const existing = await getAllCredentials();
    const hosts = new Set(existing.map(c => c.host));
    for (const entry of parsed) {
      if (!entry || !entry.host) continue;
      if (hosts.has(entry.host)) continue;
      await saveCredential(entry.host, entry.username, entry.password);
    }
    // Optionally remove legacy localStorage to avoid duplication
    try { localStorage.removeItem(localKey); } catch (e) {}
  } catch (e) {
    logger.warn('migrateFromLocalStorage failed', e);
  }
}

export default {
  saveCredential,
  getAllCredentials,
  findCredential,
  deleteCredential,
  migrateFromLocalStorage,
};
