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
  // Reuse existing opds.parseOpds2Json logic if available; keep lightweight here.
  // For now delegate to services/opds.ts parser by dynamically importing to avoid cycle.
  // This helper will simply call into that module's parser.
  // We'll implement a small inline parsing fallback for isolated testing.
  const books: CatalogBook[] = [];
  const navLinks: CatalogNavigationLink[] = [];
  const pagination: CatalogPagination = {};

  if (jsonData.links && Array.isArray(jsonData.links)) {
    jsonData.links.forEach((link: any) => {
      if (link.href && link.rel) {
        const fullUrl = new URL(link.href, baseUrl).href;
        if (link.rel === 'next') pagination.next = fullUrl;
        if (link.rel === 'previous') pagination.prev = fullUrl;
        if (link.rel === 'first') pagination.first = fullUrl;
        if (link.rel === 'last') pagination.last = fullUrl;
      }
    });
  }

  if (jsonData.publications && Array.isArray(jsonData.publications)) {
    jsonData.publications.forEach((pub: any) => {
      const metadata = pub.metadata || {};
      const title = metadata.title?.trim() || 'Untitled';
      const author = Array.isArray(metadata.author) ? (metadata.author[0]?.name || metadata.author[0]) : (metadata.author?.name || metadata.author) || 'Unknown Author';
      const acquisitionLink = pub.links?.find((l: any) => Array.isArray(l.rel) ? l.rel.includes('http://opds-spec.org/acquisition/borrow') || l.rel.includes('opds-spec.org/acquisition') : (l.rel || '').includes('opds-spec.org/acquisition') || (l.rel === 'http://opds-spec.org/acquisition/borrow'));
      const coverLink = pub.images?.[0];
      if (acquisitionLink?.href) {
        const downloadUrl = new URL(acquisitionLink.href, baseUrl).href;
        const coverImage = coverLink?.href ? new URL(coverLink.href, baseUrl).href : null;
        const mimeType = acquisitionLink?.type || '';
        const format = mimeType.includes('pdf') ? 'PDF' : 'EPUB';
        books.push({ title, author, coverImage, downloadUrl, summary: metadata.description || null, format });
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
