import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { migrateFromLocalStorage, findCredential, getAllCredentials, saveCredential, deleteCredential } from '../credentials';

// jsdom provides indexedDB in the test environment; ensure a clean DB between tests
async function clearAll() {
  try {
    const all = await getAllCredentials();
    for (const c of all) {
      await deleteCredential(c.host);
    }
  } catch {
    /* ignore */
  }
}

describe('credentials migration', () => {
  beforeEach(async () => {
    // Ensure clean localStorage and IDB between tests
    localStorage.removeItem('mebooks.opds.credentials');
    await clearAll();
  });

  afterEach(async () => {
    localStorage.removeItem('mebooks.opds.credentials');
    await clearAll();
  });

  it('migrates legacy localStorage entries into IndexedDB and removes the localStorage key', async () => {
    const legacy = [
      { host: 'catalog.example.org', username: 'alice', password: 's3cr3t' },
    ];
    localStorage.setItem('mebooks.opds.credentials', JSON.stringify(legacy));

    // Ensure nothing exists yet
    const pre = await getAllCredentials();
    expect(pre).toEqual([]);

    // Call migration
    await migrateFromLocalStorage();

    // localStorage key should be removed
    expect(localStorage.getItem('mebooks.opds.credentials')).toBeNull();

    // The credential should now be in IDB
    const found = await findCredential('catalog.example.org');
    expect(found).toBeDefined();
  expect(found?.username).toBe('alice');
  expect(found?.password).toBe('s3cr3t');

    // getAllCredentials should contain the entry
    const all = await getAllCredentials();
    expect(all.some(c => c.host === 'catalog.example.org')).toBe(true);
  });

  it('does not overwrite existing IDB entries', async () => {
    // Pre-populate IDB with a host
    await saveCredential('catalog.example.org', 'bob', 'initial');

    const legacy = [
      { host: 'catalog.example.org', username: 'alice', password: 's3cr3t' },
      { host: 'another.example', username: 'carol', password: 'pw' },
    ];
    localStorage.setItem('mebooks.opds.credentials', JSON.stringify(legacy));

    await migrateFromLocalStorage();

    const a = await findCredential('catalog.example.org');
    // Should still be bob/initial
    expect(a).toBeDefined();
  expect(a?.username).toBe('bob');

    const b = await findCredential('another.example');
    expect(b).toBeDefined();
  expect(b?.username).toBe('carol');
  });
});
