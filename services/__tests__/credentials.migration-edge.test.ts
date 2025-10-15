import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { deleteCredential, findCredential, getAllCredentials, migrateFromLocalStorage, saveCredential } from '../credentials';

async function clearAll() {
  try {
    const all = await getAllCredentials();
    for (const c of all) {
      await deleteCredential(c.host);
    }
  } catch { }
}

describe('credentials.ts - CRUD and edge/error cases', () => {
  beforeEach(async () => {
    localStorage.removeItem('mebooks.opds.credentials');
    await clearAll();
  });
  afterEach(async () => {
    localStorage.removeItem('mebooks.opds.credentials');
    await clearAll();
  });

  it('saves, finds, and deletes credentials', async () => {
    await saveCredential('host1', 'user1', 'pw1');
    let found = await findCredential('host1');
    expect(found).toBeDefined();
    expect(found!.username).toBe('user1');
    await deleteCredential('host1');
    found = await findCredential('host1');
    expect(found).toBeUndefined();
  });

  it('getAllCredentials returns all saved credentials', async () => {
    await saveCredential('h1', 'u1', 'p1');
    await saveCredential('h2', 'u2', 'p2');
    const all = await getAllCredentials();
    expect(all.length).toBeGreaterThanOrEqual(2);
    expect(all.some(c => c.host === 'h1')).toBe(true);
    expect(all.some(c => c.host === 'h2')).toBe(true);
  });

  it('handles missing IndexedDB gracefully', async () => {
    const orig = globalThis.indexedDB;
    // @ts-ignore
    delete globalThis.indexedDB;
    const result = await getAllCredentials();
    expect(result).toEqual([]);
    // @ts-ignore
    globalThis.indexedDB = orig;
  });

  it('handles malformed legacy localStorage gracefully', async () => {
    localStorage.setItem('mebooks.opds.credentials', 'not-json');
    await expect(migrateFromLocalStorage()).resolves.toBeUndefined();
  });

  it('does not throw if deleting non-existent credential', async () => {
    await expect(deleteCredential('nope')).resolves.toBeUndefined();
  });
});
