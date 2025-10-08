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

// Resolve an acquisition chain for a given acquisition href. Many OPDS2
// servers require a POST to a borrow/loan endpoint which returns either JSON
// containing the content location, or a Location header redirecting to a URL.
// This helper will attempt a POST (with optional credentials), then follow
// redirects or JSON-provided URLs. It will also attempt a GET if POST yields
// a 405 (method not allowed) to support servers that expect GETs.
export const resolveAcquisitionChain = async (href: string, credentials?: { username: string; password: string } | null, maxRedirects = 5): Promise<string | null> => {
  let attempts = 0;
  let current = proxiedUrl(href);
  const makeHeaders = () => {
    const h: Record<string,string> = { 'Accept': 'application/json, text/json, */*' };
    if (credentials) h['Authorization'] = `Basic ${btoa(`${credentials.username}:${credentials.password}`)}`;
    return h;
  };

  while (attempts < maxRedirects && current) {
    attempts++;
    // Try POST first
    let resp: Response | null = null;
    try {
      resp = await fetch(current, { method: 'POST', headers: makeHeaders() });
    } catch (e) {
      // network errors — rethrow
      throw e;
    }

    if (!resp) return null;

    // If 405, try GET
    if (resp.status === 405) {
      resp = await fetch(current, { method: 'GET', headers: makeHeaders() });
    }

    // If redirect-like response (3xx) and Location header present, follow it
    if (resp.status >= 300 && resp.status < 400) {
      const loc = resp.headers.get('Location') || resp.headers.get('location');
      if (loc) {
        current = new URL(loc, current).href;
        continue;
      }
    }

    // Determine ok-ness: some test mocks return plain objects without `ok`.
    const ok = typeof resp.ok === 'boolean' ? resp.ok : (resp.status >= 200 && resp.status < 300);

    // If OK and JSON body contains a URL, return it
    if (ok) {
      const ct = (resp.headers && typeof resp.headers.get === 'function') ? resp.headers.get('Content-Type') || '' : '';
      if (ct.includes('application/json') || ct.includes('text/json')) {
        const j = await resp.json().catch(() => null);
        // common fields that might contain the final URL: url, location, href
        const candidate = j?.url || j?.location || j?.href || j?.contentLocation;
        if (typeof candidate === 'string' && candidate.length > 0) return new URL(candidate, current).href;
        // If JSON contains nested 'links' array, try to find a link with rel 'self' or 'content'
        if (Array.isArray(j?.links)) {
          const contentLink = j.links.find((l: any) => l?.href && (l.rel === 'content' || l.rel === 'self' || String(l.rel).includes('acquisition')));
          if (contentLink?.href) return new URL(contentLink.href, current).href;
        }
      }

      // If the response has a Location header even on 200, respect it
      const loc = resp.headers.get('Location') || resp.headers.get('location');
      if (loc) return new URL(loc, current).href;

      // If content-type is a direct media type, assume current is the content URL
      if (ct.includes('application/epub') || ct.includes('application/pdf') || ct.includes('application/octet-stream')) {
        return current;
      }
    }

    // For non-OK statuses (401/403), bubble up by throwing so caller can handle
    if (resp.status === 401 || resp.status === 403) {
      const txt = await resp.text().catch(() => '');
      const e = new Error(`Acquisition failed: ${resp.status} ${resp.statusText} ${txt}`);
      (e as any).status = resp.status;
      throw e;
    }

    // If nothing matched, break to avoid infinite loop
    break;
  }

  return null;
};
