import { CatalogBook, CatalogNavigationLink, CatalogPagination } from '../types';
import { proxiedUrl } from './utils';

type Credentials = { username: string; password: string } | null;

const acceptHeader = 'application/opds+json, application/json, application/atom+xml;profile=opds-catalog;q=0.9, application/xml;q=0.8, */*;q=0.5';

const basicAuthHeader = (creds: Credentials) => {
  if (!creds) return undefined;
  try {
    return `Basic ${btoa(`${creds.username}:${creds.password}`)}`;
  } catch {
    return undefined;
  }
};

export const fetchOpds2Feed = async (url: string, baseUrl: string, creds: Credentials = null): Promise<{ books: CatalogBook[]; navLinks: CatalogNavigationLink[]; pagination: CatalogPagination; error?: string }> => {
  try {
    const proxyUrl = proxiedUrl(url);
    const headers: Record<string, string> = { 'Accept': acceptHeader };
    const auth = basicAuthHeader(creds);
    if (auth) headers['Authorization'] = auth;

    const res = await fetch(proxyUrl, { headers });
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        return { books: [], navLinks: [], pagination: {}, error: 'Authentication required to access this catalog.' };
      }
      return { books: [], navLinks: [], pagination: {}, error: `Catalog fetch failed: ${res.status} ${res.statusText}` };
    }

    const contentType = (res.headers.get('Content-Type') || '').toLowerCase();
    const text = await res.text();
    // Prefer JSON parsing for opds+json
    if (contentType.includes('application/opds+json') || contentType.includes('application/json') || text.trim().startsWith('{')) {
      const json = JSON.parse(text);
      // Lightweight normalization following existing parseOpds2Json logic
      const books: CatalogBook[] = [];
      const navLinks: CatalogNavigationLink[] = [];
      const pagination: CatalogPagination = {};

      if (Array.isArray(json.links)) {
        json.links.forEach((l: any) => {
          if (l.rel === 'next') pagination.next = new URL(l.href, baseUrl).href;
          if (l.rel === 'previous') pagination.prev = new URL(l.href, baseUrl).href;
          if (l.rel === 'first') pagination.first = new URL(l.href, baseUrl).href;
          if (l.rel === 'last') pagination.last = new URL(l.href, baseUrl).href;
        });
      }

      if (Array.isArray(json.publications)) {
        json.publications.forEach((pub: any) => {
          const md = pub.metadata || {};
          const title = md.title || 'Untitled';
          let author = 'Unknown Author';
          if (md.author) {
            if (Array.isArray(md.author) && md.author.length > 0) {
              const a = md.author[0];
              author = typeof a === 'string' ? a : (a.name || author);
            } else if (typeof md.author === 'string') author = md.author;
            else if (md.author?.name) author = md.author.name;
          }

          const links = pub.links || [];
          const acq = links.find((l: any) => typeof l.rel === 'string' && l.rel.includes('opds-spec.org/acquisition')) || links[0];
          const img = (pub.images && pub.images[0]) || null;
          if (acq && acq.href) {
            const downloadUrl = new URL(acq.href, baseUrl).href;
            const coverImage = img?.href ? new URL(img.href, baseUrl).href : null;
            const type = acq.type || '';
            const format = type.includes('epub') ? 'EPUB' : type.includes('pdf') ? 'PDF' : undefined;
            const acquisitionLinks = links.map((l: any) => ({ rel: l.rel, href: l.href, type: l.type, properties: l.properties }));
            // Determine borrowability (OPDS2 rels may be strings or arrays)
            const borrowLink = links.find((l: any) => {
              const rel = l.rel;
              if (Array.isArray(rel)) return rel.some((r: any) => typeof r === 'string' && (r.includes('acquisition/borrow') || r.endsWith('/borrow') || r === 'http://opds-spec.org/acquisition/borrow')) && l.href;
              if (typeof rel === 'string') return (rel.includes('acquisition/borrow') || rel.endsWith('/borrow') || rel === 'http://opds-spec.org/acquisition/borrow') && l.href;
              return false;
            });
            const isBorrowable = !!borrowLink;
            const borrowUrl = borrowLink ? new URL(borrowLink.href, baseUrl).href : undefined;

            books.push({ title, author, coverImage, downloadUrl, summary: md.description || null, publisher: md.publisher?.name || md.publisher || undefined, publicationDate: md.published, providerId: md.identifier, subjects: Array.isArray(md.subject) ? md.subject.map((s: any) => typeof s === 'string' ? s : s?.name).filter(Boolean) : undefined, format, acquisitionLinks, isBorrowable, borrowUrl });
          }
        });
      }

      if (Array.isArray(json.navigation)) {
        json.navigation.forEach((n: any) => {
          if (n.href && n.title) navLinks.push({ title: n.title, url: new URL(n.href, baseUrl).href, rel: n.rel || '' });
        });
      }

      // Some registries expose 'catalogs' - treat them as navLinks (terminal)
      if (Array.isArray(json.catalogs)) {
        json.catalogs.forEach((c: any) => {
          const title = c.metadata?.title || c.metadata?.name || 'Catalog';
          const link = Array.isArray(c.links) ? c.links.find((l: any) => l.rel === 'http://opds-spec.org/catalog' && l.href) : null;
          if (link) navLinks.push({ title, url: new URL(link.href, baseUrl).href, rel: 'subsection', isCatalog: true });
        });
      }

      return { books, navLinks, pagination };
    }

    // Fallback: try parse as Atom/OPDS 1 XML by delegating to existing service if present
    // Keep this file lightweight; caller can fall back to `services/opds.ts` if needed.
    return { books: [], navLinks: [], pagination: {}, error: 'Unsupported catalog format (not JSON).'};
  } catch (e) {
    console.error('fetchOpds2Feed error', e);
    return { books: [], navLinks: [], pagination: {}, error: e instanceof Error ? e.message : 'Unknown error' };
  }
};

export const borrowOpds2Work = async (borrowHref: string, baseUrl: string, creds: Credentials = null): Promise<{ success: boolean; entry?: any; error?: string }> => {
  try {
    const proxyUrl = proxiedUrl(borrowHref);
    const headers: Record<string, string> = { 'Accept': 'application/opds+json, application/atom+xml;type=entry;profile=opds-catalog, application/json' };
    const auth = basicAuthHeader(creds);
    if (auth) headers['Authorization'] = auth;

    const res = await fetch(proxyUrl, { method: 'POST', headers });
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) return { success: false, error: 'Borrow action requires authentication.' };
      return { success: false, error: `Borrow action failed: ${res.status} ${res.statusText}` };
    }

    const contentType = (res.headers.get('Content-Type') || '').toLowerCase();
    const text = await res.text();
    // If server returns an entry XML or JSON, return it for further processing. Otherwise just signal success.
    if (contentType.includes('application/json') || text.trim().startsWith('{')) {
      return { success: true, entry: JSON.parse(text) };
    }
    if (contentType.includes('application/atom+xml') || text.trim().startsWith('<')) {
      return { success: true, entry: text };
    }

    return { success: true };
  } catch (e) {
    console.error('borrowOpds2Work error', e);
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
};

// Simple credential storage helpers (localStorage-backed)
export type OpdsCredential = { id: string; name: string; urlPattern?: string; username: string; password: string };

const CRED_KEY = 'ebook-opds-credentials';

export const getStoredOpdsCredentials = (): OpdsCredential[] => {
  try {
    const raw = localStorage.getItem(CRED_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as OpdsCredential[];
  } catch {
    return [];
  }
};

export const saveOpdsCredential = (cred: OpdsCredential) => {
  const list = getStoredOpdsCredentials();
  const idx = list.findIndex(c => c.id === cred.id);
  if (idx >= 0) list[idx] = cred; else list.push(cred);
  localStorage.setItem(CRED_KEY, JSON.stringify(list));
};

export const deleteOpdsCredential = (id: string) => {
  const list = getStoredOpdsCredentials().filter(c => c.id !== id);
  localStorage.setItem(CRED_KEY, JSON.stringify(list));
};

export const findCredentialForUrl = (url: string): OpdsCredential | null => {
  const list = getStoredOpdsCredentials();
  // prefer direct match by pattern or exact host
  try {
    const u = new URL(url);
    for (const c of list) {
      if (c.urlPattern && url.includes(c.urlPattern)) return c;
      try {
        const p = new URL(c.urlPattern || c.urlPattern || '');
        if (p.host === u.host) return c;
      } catch {}
    }
  } catch {}
  return list.length > 0 ? list[0] : null;
};
