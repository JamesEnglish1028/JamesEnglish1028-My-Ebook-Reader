import { CatalogBook, CatalogNavigationLink, CatalogPagination } from '../types';
import { proxiedUrl } from './utils';

type StoredCred = { host: string; username: string; password: string };

const CRED_KEY = 'mebooks.opds.credentials';
const ETAG_PREFIX = 'mebooks.opds.etag.';

function getHostFromUrl(url: string) {
  try { return new URL(url).host; } catch { return url; }
}

export function getStoredOpdsCredentials(): StoredCred[] {
  try {
    const raw = localStorage.getItem(CRED_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as StoredCred[];
  } catch (e) { return []; }
}

export function saveOpdsCredential(host: string, username: string, password: string) {
  const list = getStoredOpdsCredentials();
  const existing = list.find(c => c.host === host);
  if (existing) {
    existing.username = username;
    existing.password = password;
  } else {
    list.push({ host, username, password });
  }
  localStorage.setItem(CRED_KEY, JSON.stringify(list));
}

export function deleteOpdsCredential(host: string) {
  const list = getStoredOpdsCredentials().filter(c => c.host !== host);
  localStorage.setItem(CRED_KEY, JSON.stringify(list));
}

export function findCredentialForUrl(url: string) {
  const host = getHostFromUrl(url);
  return getStoredOpdsCredentials().find(c => c.host === host);
}

function etagKeyFor(url: string) {
  return `${ETAG_PREFIX}${encodeURIComponent(url)}`;
}

export function setCachedEtag(url: string, etag: string) {
  try { localStorage.setItem(etagKeyFor(url), etag); } catch {}
}

export function getCachedEtag(url: string) {
  try { return localStorage.getItem(etagKeyFor(url)) || undefined; } catch { return undefined; }
}

export const parseOpds2Json = (jsonData: any, baseUrl: string) : { books: CatalogBook[], navLinks: CatalogNavigationLink[], pagination: CatalogPagination } => {
  const books: CatalogBook[] = [];
  const navLinks: CatalogNavigationLink[] = [];
  const pagination: CatalogPagination = {};

  const toArray = (v: any) => Array.isArray(v) ? v : v ? [v] : [];

  // pagination / top-level links
  if (jsonData.links && Array.isArray(jsonData.links)) {
    jsonData.links.forEach((link: any) => {
      if (link.href && link.rel) {
        const rels = toArray(link.rel).map((r: any) => String(r));
        const fullUrl = new URL(link.href, baseUrl).href;
        if (rels.includes('next')) pagination.next = fullUrl;
        if (rels.includes('previous')) pagination.prev = fullUrl;
        if (rels.includes('first')) pagination.first = fullUrl;
        if (rels.includes('last')) pagination.last = fullUrl;
      }
    });
  }

  // Helper: find innermost indirectAcquisition type (mime)
  function findIndirectType(indirect: any): string | undefined {
    if (!indirect) return undefined;
    // indirect may be array
    const arr = Array.isArray(indirect) ? indirect : [indirect];
    const first = arr[0];
    if (!first) return undefined;
    if (first.type) return first.type;
    if (first.indirectAcquisition) return findIndirectType(first.indirectAcquisition);
    return undefined;
  }

  function getFormatFromMimeType(mimeType: string | undefined): string | undefined {
    if (!mimeType) return undefined;
    const m = mimeType.toLowerCase();
    if (m.includes('epub')) return 'EPUB';
    if (m.includes('pdf')) return 'PDF';
    return mimeType.split('/')[1]?.toUpperCase() || mimeType;
  }

  if (jsonData.publications && Array.isArray(jsonData.publications)) {
    jsonData.publications.forEach((pub: any) => {
      const metadata = pub.metadata || {};
      const title = (metadata.title && String(metadata.title).trim()) || 'Untitled';
      // author may be string, object, or array
      let author = 'Unknown Author';
      if (metadata.author) {
        if (Array.isArray(metadata.author) && metadata.author.length > 0) {
          const a = metadata.author[0];
          author = typeof a === 'string' ? a : (a?.name || 'Unknown Author');
        } else if (typeof metadata.author === 'string') author = metadata.author;
        else if (metadata.author?.name) author = metadata.author.name;
      }

      const summary = metadata.description || metadata.subtitle || null;
      const publisher = metadata.publisher?.name || metadata.publisher || undefined;
      const publicationDate = metadata.published || metadata.issued || undefined;

      // providerId from identifier field (string or array)
      let providerId: string | undefined = undefined;
      if (typeof metadata.identifier === 'string') providerId = metadata.identifier;
      else if (Array.isArray(metadata.identifier) && metadata.identifier.length > 0) {
        const found = metadata.identifier.find((id: any) => typeof id === 'string');
        if (found) providerId = found;
      }

      // subjects
      let subjects: string[] | undefined = undefined;
      if (Array.isArray(metadata.subject)) {
        subjects = metadata.subject.map((s: any) => typeof s === 'string' ? s : (s?.name || '')).filter((s: string) => !!s);
      }

      // cover image
      const cover = (pub.images && pub.images[0]) || (metadata.image && metadata.image[0]);
      const coverImage = cover?.href ? new URL(cover.href, baseUrl).href : (cover?.url ? new URL(cover.url, baseUrl).href : null);

      // links can be an array; each link may have rel as string or array
      const links = Array.isArray(pub.links) ? pub.links : (pub.links ? [pub.links] : []);

      // Find acquisition links and pick the most appropriate one.
      const acquisitions: Array<{ href: string; rels: string[]; type?: string; indirectType?: string; acquisitionType?: string }> = [];
      links.forEach((l: any) => {
        if (!l || !l.href) return;
        const rels = Array.isArray(l.rel) ? l.rel.map((r: any) => String(r)) : (l.rel ? [String(l.rel)] : []);
        // If rel contains 'acquisition' or opds acquisition URIs, treat as acquisition link
        const isAcq = rels.some((r: string) => r.includes('acquisition') || r === 'http://opds-spec.org/acquisition/borrow' || r === 'http://opds-spec.org/acquisition/loan');
        if (isAcq) {
          const indirectType = findIndirectType(l.indirectAcquisition || l.properties?.indirectAcquisition);
          acquisitions.push({ href: new URL(l.href, baseUrl).href, rels, type: l.type, indirectType });
        }
      });

      // Decide on a primary acquisition link (prefer borrow, then loan, then any)
      let chosen: typeof acquisitions[0] | undefined;
      if (acquisitions.length > 0) {
        chosen = acquisitions.find(a => a.rels.some(r => r.includes('/borrow') || r.includes('acquisition/borrow')))
          || acquisitions.find(a => a.rels.some(r => r.includes('/loan') || r.includes('acquisition/loan')))
          || acquisitions[0];
      }

      let downloadUrl: string | undefined = undefined;
      let format: string | undefined = undefined;
      if (chosen) {
        downloadUrl = chosen.href;
        // Prefer explicit type, else indirect type
        format = getFormatFromMimeType(chosen.type) || getFormatFromMimeType(chosen.indirectType) || undefined;
      }

      // If no acquisition link found, sometimes publications include content (resources)
      if (!downloadUrl && pub.content && Array.isArray(pub.content) && pub.content.length > 0) {
        const c = pub.content[0];
        if (c.href) downloadUrl = new URL(c.href, baseUrl).href;
        if (!format && c.type) format = getFormatFromMimeType(c.type);
      }

      // Push if we have at least a download URL or cover/title
      if (title && (downloadUrl || coverImage)) {
        const book: CatalogBook = {
          title,
          author,
          coverImage: coverImage || null,
          downloadUrl: downloadUrl || '',
          summary: summary || null,
          publisher: publisher || undefined,
          publicationDate: publicationDate || undefined,
          providerId: providerId || undefined,
          subjects: subjects || undefined,
          format: format || undefined
        };
        books.push(book);
      }
    });
  }

  // navigation fallback
  if (jsonData.navigation && Array.isArray(jsonData.navigation)) {
    jsonData.navigation.forEach((link: any) => {
      if (link.href && link.title) {
        const url = new URL(link.href, baseUrl).href;
        navLinks.push({ title: link.title, url, rel: link.rel || '' });
      }
    });
  }

  return { books, navLinks, pagination };
};

export const fetchOpds2Feed = async (url: string, credentials?: { username: string; password: string } | null) => {
  const proxyUrl = proxiedUrl(url);
  const headers: Record<string,string> = {
    'Accept': 'application/opds+json, application/json, application/ld+json, */*'
  };

  // ETag support: send If-None-Match when we have a cached ETag
  const cached = getCachedEtag(url);
  if (cached) headers['If-None-Match'] = cached;

  if (credentials) {
    const basic = btoa(`${credentials.username}:${credentials.password}`);
    headers['Authorization'] = `Basic ${basic}`;
  }

  const resp = await fetch(proxyUrl, { headers, method: 'GET' });
  if (resp.status === 304) {
    return { status: 304, books: [], navLinks: [], pagination: {} };
  }

  const etag = resp.headers.get('ETag') || resp.headers.get('etag');
  if (etag) setCachedEtag(url, etag);

  const contentType = resp.headers.get('Content-Type') || '';
  const text = await resp.text();
  if (contentType.includes('application/opds+json') || contentType.includes('application/json')) {
    const json = JSON.parse(text);
    return { status: resp.status, ...(parseOpds2Json(json, url) as any) };
  }

  // If feed is XML/Atom, return empty (we only handle OPDS2 here for now)
  return { status: resp.status, books: [], navLinks: [], pagination: {} };
};

export const borrowOpds2Work = async (borrowHref: string, credentials?: { username: string; password: string } | null) => {
  const proxyUrl = proxiedUrl(borrowHref);
  const headers: Record<string,string> = { 'Accept': 'application/json, */*' };
  if (credentials) {
    headers['Authorization'] = `Basic ${btoa(`${credentials.username}:${credentials.password}`)}`;
  }
  const resp = await fetch(proxyUrl, { method: 'POST', headers });
  if (!resp.ok) {
    const body = await resp.text().catch(() => '');
    throw new Error(`Borrow failed: ${resp.status} ${resp.statusText} ${body}`);
  }
  // Return the response JSON when available
  const ct = resp.headers.get('Content-Type') || '';
  if (ct.includes('application/json')) return { ok: true, body: await resp.json() };
  return { ok: true, body: null };
};
