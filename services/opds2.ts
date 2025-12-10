// Helper: Map Schema.org @type to display label
const schemaOrgTypeToLabel: Record<string, string> = {
  'https://schema.org/Book': 'Book',
  'https://schema.org/Audiobook': 'Audiobook',
  'https://schema.org/Photograph': 'Photograph',
  'https://schema.org/Drawing': 'Drawing',
  'https://schema.org/Sculpture': 'Sculpture',
  'https://schema.org/Poster': 'Poster',
  'https://schema.org/Painting': 'Painting',
  'https://schema.org/image': 'Image',
  'https://schema.org/Article': 'Article',
  'https://schema.org/Periodical': 'Periodical',
  'https://schema.org/ShortStory': 'Short Story',
  'https://schema.org/Map': 'Map',
  'https://schema.org/Manuscript': 'Manuscript',
  'https://schema.org/SheetMusic': 'Sheet Music',
  'https://schema.org/audio': 'Audio',
  'https://schema.org/video': 'Video',
  'https://schema.org/Chapter': 'Chapter',
  'https://schema.org/MusicAlbum': 'Music Album',
  'https://schema.org/DigitalDocument': 'Digital Document',
};

function getSchemaOrgTypeAndLabel(schemaType: string | undefined): { schemaOrgType: string, publicationTypeLabel: string } {
  if (!schemaType) return { schemaOrgType: 'https://schema.org/DigitalDocument', publicationTypeLabel: 'Digital Document' };
  const label = schemaOrgTypeToLabel[schemaType] || 'Digital Document';
  return { schemaOrgType: schemaType, publicationTypeLabel: label };
}
// Helper: treat rels like 'modules:xxxx' as 'collection' for navigation
function normalizeRel(rel: string | undefined): string {
  if (!rel) return '';
  if (/^modules:[\w-]+$/i.test(rel)) return 'collection';
  return rel;
}
import type { CatalogBook, CatalogNavigationLink, CatalogPagination } from '../types';
import type { Opds2Link, Opds2NavigationGroup, Opds2Publication } from '../types/opds2';

// Helper: Parse navigation links from OPDS2 feed
function parseOpds2NavigationLinks(jsonData: any, baseUrl: string): CatalogNavigationLink[] {
  const navLinks: CatalogNavigationLink[] = [];
  // Palace registry feeds expose a top-level `catalogs` array; map each entry
  // to a navigable catalog link so the UI can render the registry results.
  if (jsonData.catalogs && Array.isArray(jsonData.catalogs)) {
    (jsonData.catalogs as any[]).forEach((catalogEntry) => {
      if (!catalogEntry) return;
      const meta = catalogEntry.metadata || {};
      const title = meta.title || meta.name || catalogEntry.title || 'Catalog';
      const links = Array.isArray(catalogEntry.links) ? catalogEntry.links as Opds2Link[] : [];
      const pickCatalogLink = () => {
        const relContainsCatalog = (rel: string) => rel.toLowerCase().includes('catalog');
        // Prefer explicit catalog rel, then any OPDS link
        const byRel = links.find((l) => typeof l.rel === 'string' && relContainsCatalog(l.rel));
        if (byRel) return byRel;
        const byRelArray = links.find((l) => Array.isArray(l.rel) && l.rel.some((r) => typeof r === 'string' && relContainsCatalog(r)));
        if (byRelArray) return byRelArray;
        return links.find((l) => typeof l.type === 'string' && l.type.includes('opds'));
      };
      const link = pickCatalogLink();
      if (link && link.href) {
        navLinks.push({
          title,
          url: new URL(link.href, baseUrl).href,
          rel: 'subsection',
          isCatalog: true,
        });
      }
    });
  }
  // Top-level 'groups' array (OPDS2 registry feeds)
  if (jsonData.groups && Array.isArray(jsonData.groups)) {
    (jsonData.groups as Opds2NavigationGroup[]).forEach((group) => {
      const groupTitle = group.metadata?.title || '';
      if (group.navigation && Array.isArray(group.navigation)) {
        (group.navigation as Opds2Link[]).forEach((link) => {
          if (link.href && link.title) {
            const url = new URL(link.href, baseUrl).href;
            const navTitle = groupTitle ? `${groupTitle}: ${link.title}` : link.title;
            let inferredRel = '';
            if (typeof link.rel === 'string') {
              inferredRel = normalizeRel(link.rel);
            } else if (Array.isArray(link.rel) && link.rel.length > 0) {
              inferredRel = normalizeRel(String(link.rel[0]));
            } else {
              inferredRel = (link.type && typeof link.type === 'string' && link.type.includes('application/opds+json')) ? 'subsection' : '';
            }
            const isCatalog = !!(link.type && typeof link.type === 'string' && link.type.includes('application/opds+json')) || !!link.isCatalog;
            navLinks.push({ title: navTitle, url, rel: Array.isArray(inferredRel) ? String(inferredRel[0]) : inferredRel, isCatalog });
          }
        });
      }
    });
  }
  // Top-level navigation array
  if (jsonData.navigation && Array.isArray(jsonData.navigation)) {
    (jsonData.navigation as Opds2Link[]).forEach((link) => {
      if (link.href && link.title) {
        const url = new URL(link.href, baseUrl).href;
        const inferredRel = link.rel || (link.type && typeof link.type === 'string' && link.type.includes('application/opds+json') ? 'subsection' : '');
        const isCatalog = !!(link.type && typeof link.type === 'string' && link.type.includes('application/opds+json')) || !!link.isCatalog;
  navLinks.push({ title: link.title, url, rel: Array.isArray(inferredRel) ? String(inferredRel[0]) : inferredRel, isCatalog });
      }
    });
  }
  // Top-level links with navigation relations
  if (jsonData.links && Array.isArray(jsonData.links)) {
    (jsonData.links as Opds2Link[]).forEach((link) => {
      if (link.href && link.rel && link.title) {
        let rels: string[] = [];
        if (Array.isArray(link.rel)) {
          rels = link.rel.map((r) => normalizeRel(String(r).toLowerCase()));
        } else if (typeof link.rel === 'string') {
          rels = [normalizeRel(link.rel.toLowerCase())];
        }
        const fullUrl = new URL(link.href, baseUrl).href;
        if (rels.some((r: string) => r.includes('collection') || r.includes('subsection') || r.includes('section') || r.includes('related'))) {
          navLinks.push({ title: link.title, url: fullUrl, rel: rels[0] || '', isCatalog: false });
        }
      }
    });
  }
  return navLinks;
}

// Helper: Parse pagination links from OPDS2 feed
function parseOpds2Pagination(jsonData: any, baseUrl: string): CatalogPagination {
  const pagination: CatalogPagination = {};
  if (jsonData.links && Array.isArray(jsonData.links)) {
    (jsonData.links as Opds2Link[]).forEach((link) => {
      if (link.href && link.rel) {
        const rels = Array.isArray(link.rel) ? link.rel.map((r) => normalizeRel(String(r).toLowerCase())) : [normalizeRel(String(link.rel).toLowerCase())];
        const fullUrl = new URL(link.href, baseUrl).href;
        if (rels.some((r: string) => r.includes('next'))) pagination.next = fullUrl;
        if (rels.some((r: string) => r.includes('prev') || r.includes('previous'))) pagination.prev = fullUrl;
        if (rels.some((r: string) => r.includes('first'))) pagination.first = fullUrl;
        if (rels.some((r: string) => r.includes('last'))) pagination.last = fullUrl;
      }
    });
  }
  return pagination;
}

import credentialsService from './credentials';
import { logger } from './logger';
import { maybeProxyForCors, proxiedUrl } from './utils';

// Helper: convert a Uint8Array into a binary string (latin1) without triggering decoding
function uint8ToBinaryString(u8: Uint8Array): string {
  const CHUNK = 0x8000;
  let result = '';
  for (let i = 0; i < u8.length; i += CHUNK) {
    const slice = u8.subarray(i, i + CHUNK);
    result += String.fromCharCode.apply(null, Array.prototype.slice.call(slice));
  }
  return result;
}

// Helper: read all bytes from a cloned response in a way that's tolerant of
// browser implementations that may throw on response.arrayBuffer(). Try
// arrayBuffer() first, then fall back to reading the stream with getReader().
// Cache response bytes so we don't attempt to read the same stream multiple times
const responseByteCache2: WeakMap<any, Uint8Array> = new WeakMap();

async function readAllBytes(resp: Response | any): Promise<Uint8Array> {
  try {
    const cached = responseByteCache2.get(resp);
    if (cached) return cached;
  } catch (_) { }

  try {
    if (resp && typeof resp.clone === 'function') {
      const c = resp.clone();
      try {
        const buf = await c.arrayBuffer();
        const out = new Uint8Array(buf);
        try { responseByteCache2.set(resp, out); } catch (_) { }
        return out;
      } catch (e) {
        const reader = c.body && (c.body as any).getReader ? (c.body as any).getReader() : null;
        if (!reader) throw e;
        const chunks: Uint8Array[] = [];
        let total = 0;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            const u8 = value instanceof Uint8Array ? value : new Uint8Array(value);
            chunks.push(u8);
            total += u8.length;
          }
        }
        const out = new Uint8Array(total);
        let offset = 0;
        for (const chunk of chunks) {
          out.set(chunk, offset);
          offset += chunk.length;
        }
        try { responseByteCache2.set(resp, out); } catch (_) { }
        return out;
      }
    }

    if (resp && typeof resp.arrayBuffer === 'function') {
      const buf = await resp.arrayBuffer();
      const out = new Uint8Array(buf);
      try { responseByteCache2.set(resp, out); } catch (_) { }
      return out;
    }

    if (resp && typeof resp.text === 'function') {
      const txt = await resp.text();
      let enc: Uint8Array;
      if (typeof TextEncoder !== 'undefined') enc = new TextEncoder().encode(txt);
      // @ts-ignore
      else if (typeof Buffer !== 'undefined') enc = new Uint8Array(Buffer.from(txt, 'utf-8'));
      else enc = new Uint8Array();
      try { responseByteCache2.set(resp, enc); } catch (_) { }
      return enc;
    }

    if (resp && resp.body) {
      if (resp.body instanceof Uint8Array) {
        try { responseByteCache2.set(resp, resp.body); } catch (_) { }
        return resp.body;
      }
      // @ts-ignore
      if (typeof Buffer !== 'undefined' && Buffer.isBuffer(resp.body)) {
        const out = new Uint8Array(resp.body);
        try { responseByteCache2.set(resp, out); } catch (_) { }
        return out;
      }
    }

    return new Uint8Array();
  } catch (e) {
    throw e;
  }
}

// Helper: read response body as text but gracefully handle decoding errors
async function safeReadText(resp: Response): Promise<string> {
  try {
    const u8 = await readAllBytes(resp);
    try { return new TextDecoder('utf-8', { fatal: false }).decode(u8); }
    catch (e) {
      try { return new TextDecoder('iso-8859-1', { fatal: false }).decode(u8); }
      catch (e2) { return uint8ToBinaryString(u8); }
    }
  } catch (e) {
    logger.warn('safeReadText: fallback decode failed', e);
    // Try best-effort text() if available
    try {
      if (resp && typeof resp.text === 'function') return await resp.text();
    } catch (_) { }
    return '';
  }
}

interface StoredCred { host: string; username: string; password: string }
const ETAG_PREFIX = 'mebooks.opds.etag.';

function getHostFromUrl(url: string) {
  try { return new URL(url).host; } catch { return url; }
}

// Use IndexedDB-backed credentials service. Provide wrapper functions used
// elsewhere in the app for backward compatibility.
let _migrationTriggered = false;

export async function migrateLegacyCredentials() {
  if (_migrationTriggered) return;
  _migrationTriggered = true;
  try {
    await credentialsService.migrateFromLocalStorage();
  } catch (e) { /* ignore */ }
}

export async function getStoredOpdsCredentials(): Promise<StoredCred[]> {
  try {
    await migrateLegacyCredentials();
    return await credentialsService.getAllCredentials();
  } catch (e) { return []; }
}

export function saveOpdsCredential(host: string, username: string, password: string) {
  // fire-and-forget
  try { credentialsService.saveCredential(host, username, password); } catch (e) { logger.warn('saveOpdsCredential failed', e); }
}

export function deleteOpdsCredential(host: string) {
  try { credentialsService.deleteCredential(host); } catch (e) { logger.warn('deleteOpdsCredential failed', e); }
}

export async function findCredentialForUrl(url: string) {
  try {
    await migrateLegacyCredentials();
    const host = getHostFromUrl(url);
    return await credentialsService.findCredential(host);
  } catch (e) { return undefined; }
}

function etagKeyFor(url: string) {
  return `${ETAG_PREFIX}${encodeURIComponent(url)}`;
}

export function setCachedEtag(url: string, etag: string) {
  try { localStorage.setItem(etagKeyFor(url), etag); } catch { }
}

export function getCachedEtag(url: string) {
  try { return localStorage.getItem(etagKeyFor(url)) || undefined; } catch { return undefined; }
}


export const parseOpds2Json = (jsonData: any, baseUrl: string): { books: CatalogBook[], navLinks: CatalogNavigationLink[], pagination: CatalogPagination } => {
  console.error('[OPDS2] parseOpds2Json REACHED', { baseUrl, typeofJson: typeof jsonData });
  try {
    if (typeof jsonData !== 'object' || jsonData === null) {
      throw new Error('Invalid OPDS2 catalog format: input is not an object');
    }
    try {
      const keys = Object.keys(jsonData);
      console.error('[OPDS2] parseOpds2Json START', { baseUrl, keys });
    } catch (err) {
      console.error('[OPDS2] parseOpds2Json Object.keys ERROR', {
        baseUrl,
        type: typeof jsonData,
        constructor: jsonData && jsonData.constructor ? jsonData.constructor.name : undefined,
        err,
      });
    }
  const books: CatalogBook[] = [];
  const navLinks: CatalogNavigationLink[] = parseOpds2NavigationLinks(jsonData, baseUrl);
  const pagination: CatalogPagination = parseOpds2Pagination(jsonData, baseUrl);

  const toArray = (v: any) => Array.isArray(v) ? v : v ? [v] : [];

    // Support OPDS2 registry feeds with top-level 'groups' array
    if (jsonData.groups && Array.isArray(jsonData.groups)) {
      jsonData.groups.forEach((group: any) => {
        const groupTitle = group.metadata?.title || '';
        if (group.navigation && Array.isArray(group.navigation)) {
          group.navigation.forEach((link: any) => {
            if (link.href && link.title) {
              const url = new URL(link.href, baseUrl).href;
              // Use group title as prefix if present
              const navTitle = groupTitle ? `${groupTitle}: ${link.title}` : link.title;
              // Normalize rel: treat 'modules:xxxx' as 'collection'
              const inferredRel = normalizeRel(link.rel) || (link.type && typeof link.type === 'string' && link.type.includes('application/opds+json') ? 'subsection' : '');
              const isCatalog = !!(link.type && typeof link.type === 'string' && link.type.includes('application/opds+json')) || !!link.isCatalog;
              navLinks.push({ title: navTitle, url, rel: inferredRel, isCatalog });
            }
          });
        }
      });
    }

  // pagination / top-level links
  if (jsonData.links && Array.isArray(jsonData.links)) {
    jsonData.links.forEach((link: any) => {
      if (link.href && link.rel) {
  const rels = toArray(link.rel).map((r: any) => normalizeRel(String(r).toLowerCase()));
        const fullUrl = new URL(link.href, baseUrl).href;
        // Accept both 'prev' and 'previous' and tolerate full-rel URIs
        if (rels.some((r: string) => r.includes('next'))) pagination.next = fullUrl;
        if (rels.some((r: string) => r.includes('prev') || r.includes('previous'))) pagination.prev = fullUrl;
        if (rels.some((r: string) => r.includes('first'))) pagination.first = fullUrl;
        if (rels.some((r: string) => r.includes('last'))) pagination.last = fullUrl;

        // Extract navigation links with collection, subsection, or other navigation relations
        if (link.title && (rels.some((r: string) => r.includes('collection')) || rels.some((r: string) => r.includes('subsection')) ||
          rels.some((r: string) => r.includes('section')) || rels.some((r: string) => r.includes('related')))) {
          navLinks.push({ title: link.title, url: fullUrl, rel: rels[0] || '' });
        }
      }
    });
  }

  // Helper: find innermost indirectAcquisition type (mime)
// Helper: Normalize format (EPUB, PDF, Web, fallback to mediaType)
function normalizeFormat(type?: string, indirectType?: string): string | undefined {
  const t = type ? String(type).toLowerCase().trim() : '';
  const indirect = indirectType ? String(indirectType).toLowerCase().trim() : '';
  if (t === 'text/html' || t.includes('html') || indirect === 'text/html' || indirect.includes('html')) return 'Web';
  if (t.includes('epub') || t === 'application/epub+zip' || indirect.includes('epub') || indirect === 'application/epub+zip') return 'EPUB';
  if (t.includes('pdf') || t === 'application/pdf' || indirect.includes('pdf') || indirect === 'application/pdf') return 'PDF';
  if (t) return t;
  if (indirect) return indirect;
  return undefined;
}

// Helper: Normalize mediumFormatCode (Web for text/html, else mediaType)
// Helper: Process a single OPDS2 publication and return a CatalogBook or undefined
function processOpds2Publication(pub: Opds2Publication, baseUrl: string): CatalogBook | undefined {
  // ...existing code for author, summary, publisher, publicationDate, providerId, subjects, coverImage...
  const metadata = pub.metadata || {};
  let author = 'Unknown Author';
  if (metadata.author) {
    if (Array.isArray(metadata.author) && metadata.author.length > 0) {
      const a = metadata.author[0];
      author = typeof a === 'string' ? a : (typeof a === 'object' && 'name' in a ? a.name || 'Unknown Author' : 'Unknown Author');
    } else if (typeof metadata.author === 'string') author = metadata.author;
    else if (typeof metadata.author === 'object' && 'name' in metadata.author) author = metadata.author.name || 'Unknown Author';
  }
  const title = (metadata.title && String(metadata.title).trim()) || 'Untitled';
  const summary = metadata.description || metadata.subtitle || null;
  let publisher: string | undefined = undefined;
  if (metadata.publisher) {
    if (typeof metadata.publisher === 'string') publisher = metadata.publisher;
    else if (typeof metadata.publisher === 'object' && 'name' in metadata.publisher) publisher = metadata.publisher.name;
  }
  const publicationDate = metadata.published || metadata.issued || undefined;
  let providerId: string | undefined = undefined;
  if (typeof metadata.identifier === 'string') providerId = metadata.identifier;
  else if (Array.isArray(metadata.identifier) && metadata.identifier.length > 0) {
    const found = metadata.identifier.find((id: string) => typeof id === 'string');
    if (found) providerId = found;
  }
  let subjects: string[] | undefined = undefined;
  if (Array.isArray(metadata.subject)) {
    subjects = metadata.subject.map((s: any) => typeof s === 'string' ? s : (s?.name || '')).filter((s: string) => !!s);
  }
  const cover = (pub.images && pub.images[0]) || (metadata.image && metadata.image[0]);
  const coverImage = cover?.href ? new URL(cover.href, baseUrl).href : (cover?.url ? new URL(cover.url, baseUrl).href : null);
  let links: Opds2Link[] = [];
  if (Array.isArray(pub.links)) {
    links = pub.links as Opds2Link[];
  } else if (typeof pub.links === 'object' && pub.links) {
    links = [pub.links as Opds2Link];
  }
  const acquisitions: { href: string; rels: string[]; type?: string; indirectType?: string; acquisitionType?: string }[] = [];
  const collections: { title: string; href: string }[] = [];
  links.forEach((l: Record<string, any>) => {
    if (!l || !l.href) return;
    const rels = Array.isArray(l.rel) ? l.rel.map((r: any) => String(r)) : (l.rel ? [String(l.rel)] : []);
    const isAcq = rels.some((r: string) =>
      r.includes('acquisition') ||
      r === 'http://opds-spec.org/acquisition/borrow' ||
      r === 'http://opds-spec.org/acquisition/loan' ||
      r === 'http://opds-spec.org/acquisition/open-access' ||
      r.includes('/open-access'),
    );
    if (isAcq) {
      const indirectType = findIndirectType(l.indirectAcquisition || l.properties?.indirectAcquisition);
      acquisitions.push({ href: new URL(l.href, baseUrl).href, rels, type: l.type, indirectType });
    }
    if (l.title && rels.includes('collection')) {
      collections.push({ title: l.title, href: new URL(l.href, baseUrl).href });
    }
  });
  const alternativeFormats = acquisitions.map(a => {
    const format = normalizeFormat(a.type, a.indirectType) || 'UNKNOWN';
    const isOpenAccess = a.rels.some(r => r.includes('/open-access') || r === 'http://opds-spec.org/acquisition/open-access');
    return {
      format,
      downloadUrl: a.href,
      mediaType: a.type,
      isOpenAccess,
    };
  });
  let chosen: typeof acquisitions[0] | undefined;
  let isOpenAccess = false;
  if (acquisitions.length > 0) {
    const isType = (a: { type?: string }, want: string) => {
      if (!a.type) return false;
      const t = String(a.type).toLowerCase().trim();
      if (want === 'epub') return t === 'application/epub+zip' || t.includes('epub');
      if (want === 'pdf') return t === 'application/pdf' || t.includes('pdf');
      if (want === 'html') return t === 'text/html' || t.includes('html');
      return false;
    };
    const isOpen = (a: { rels: string[] }) => a.rels.some((r: string) => r.includes('/open-access') || r === 'http://opds-spec.org/acquisition/open-access');
    chosen = acquisitions.find(a => isOpen(a) && isType(a, 'epub'));
    if (!chosen) chosen = acquisitions.find(a => isOpen(a) && isType(a, 'pdf'));
    if (!chosen) chosen = acquisitions.find(a => isType(a, 'epub'));
    if (!chosen) chosen = acquisitions.find(a => isType(a, 'pdf'));
    if (!chosen) chosen = acquisitions.find(a => !isType(a, 'html'));
    if (!chosen) chosen = acquisitions[0];
    if (chosen && isOpen(chosen)) isOpenAccess = true;
  }
  let downloadUrl: string | undefined = undefined;
  let format: string | undefined = undefined;
  if (chosen) {
    downloadUrl = chosen.href;
    format = normalizeFormat(chosen.type, chosen.indirectType);
  }
  if (!downloadUrl && pub.content && Array.isArray(pub.content) && pub.content.length > 0) {
    const c = pub.content[0];
    if (c.href) downloadUrl = new URL(c.href, baseUrl).href;
    if (!format && c.type) {
      format = normalizeFormat(c.type);
    }
  }
  const schemaType = metadata['@type'] || metadata.type;
  const { schemaOrgType, publicationTypeLabel } = getSchemaOrgTypeAndLabel(schemaType);
  let mediumFormatCode: string | undefined = undefined;
  if (chosen && chosen.type) {
    mediumFormatCode = normalizeMediumFormatCode(schemaType, chosen.type);
  }
  if (title && (downloadUrl || coverImage)) {
    return {
      title,
      author,
      coverImage: coverImage || null,
      downloadUrl: downloadUrl || '',
      summary: summary || null,
      publisher: publisher || undefined,
      publicationDate: publicationDate || undefined,
      providerId: providerId || undefined,
      subjects: subjects || undefined,
      collections: collections.length > 0 ? collections : undefined,
      format: format || undefined,
      mediaType: chosen && chosen.type ? String(chosen.type).toLowerCase().trim() : undefined,
      isOpenAccess: isOpenAccess ? true : undefined,
      alternativeFormats: alternativeFormats.length > 0 ? alternativeFormats : undefined,
      schemaOrgType,
      publicationTypeLabel,
      mediumFormatCode,
    };
  }
  return undefined;
}
function normalizeMediumFormatCode(schemaType: string | undefined, type?: string): string | undefined {
  if (!type) return undefined;
  const t = String(type).toLowerCase().trim();
  if (schemaType && schemaType !== 'https://schema.org/Book') {
    return t === 'text/html' ? 'Web' : t;
  }
  return t === 'text/html' ? 'Web' : t;
}

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
    const clean = String(mimeType).split(';')[0].trim().toLowerCase();
    if (clean.includes('epub') || clean === 'application/epub+zip') return 'EPUB';
    if (clean.includes('pdf') || clean === 'application/pdf') return 'PDF';
    // For non-media types (e.g., application/atom+xml;type=entry) return undefined
    return undefined;
  }

  if (jsonData.publications && Array.isArray(jsonData.publications)) {
    console.log('[OPDS2] Parsing', jsonData.publications.length, 'publications from feed');
    if (jsonData.publications && Array.isArray(jsonData.publications)) {
      for (const pub of jsonData.publications) {
        // Normalize links: some providers (e.g., Palace) embed XML serialized <link> elements inside JSON string fields.
        if (typeof pub.links === 'string' && pub.links.trim().startsWith('<')) {
          try {
            const parser = new DOMParser();
            const xml = parser.parseFromString(pub.links, 'application/xml');
            const parsedLinks: Record<string, any>[] = [];
            Array.from(xml.querySelectorAll('link')).forEach((ln: Element) => {
              const href = ln.getAttribute('href');
              const rel = ln.getAttribute('rel');
              const type = ln.getAttribute('type');
              const obj: Record<string, any> = {};
              if (href) obj.href = href;
              if (rel) obj.rel = rel;
              if (type) obj.type = type;
              parsedLinks.push(obj);
            });
            if (parsedLinks.length > 0) pub.links = parsedLinks;
          } catch (_) { }
        }
        if (!pub.links && pub.properties && typeof pub.properties === 'object') {
          const maybeLinks = pub.properties.links || pub.properties.link || pub.properties.acquisitions;
          if (typeof maybeLinks === 'string' && maybeLinks.trim().startsWith('<')) {
            try {
              const parser = new DOMParser();
              const xml = parser.parseFromString(maybeLinks, 'application/xml');
              const parsedLinks: Record<string, any>[] = [];
              Array.from(xml.querySelectorAll('link')).forEach((ln: Element) => {
                const href = ln.getAttribute('href');
                const rel = ln.getAttribute('rel');
                const type = ln.getAttribute('type');
                const obj: Record<string, any> = {};
                if (href) obj.href = href;
                if (rel) obj.rel = rel;
                if (type) obj.type = type;
                parsedLinks.push(obj);
              });
              if (parsedLinks.length > 0) pub.links = parsedLinks;
            } catch (_) { }
          }
        }
        const book = processOpds2Publication(pub, baseUrl);
        if (book) books.push(book);
      }
    }
  }

  // After attempting to parse publications/navigation, validate that the
  // feed isn't completely empty. Some providers omit top-level metadata but
  // still include publications; accept those. Always throw when there is no
  // metadata and no publications, regardless of navLinks/books.
  const hasMetadata = jsonData.metadata && typeof jsonData.metadata === 'object';
  const hasPublications = Array.isArray(jsonData.publications) && jsonData.publications.length > 0;
  if (!hasMetadata && !hasPublications) {
    console.warn('[OPDS2] Warning: feed is missing required metadata and publications.');
  }

  // navigation fallback
  if (jsonData.navigation && Array.isArray(jsonData.navigation)) {
    jsonData.navigation.forEach((link: any) => {
      if (link.href && link.title) {
        const url = new URL(link.href, baseUrl).href;
        // Some registries omit a rel on navigation items but provide a type
        // indicating the target is itself an OPDS catalog. Treat those as
        // subsections/catalogs so the UI can present them as terminal catalog
        // links (able to be added) rather than opaque unrelated links.
        const inferredRel = link.rel || (link.type && typeof link.type === 'string' && link.type.includes('application/opds+json') ? 'subsection' : '');
        const isCatalog = !!(link.type && typeof link.type === 'string' && link.type.includes('application/opds+json')) || !!link.isCatalog;
        navLinks.push({ title: link.title, url, rel: inferredRel, isCatalog });
      }
    });
  }

    console.error('[OPDS2] parseOpds2Json END', { navLinks, books, pagination });
    return { books, navLinks, pagination };
  } catch (err) {
    console.error('[OPDS2] parseOpds2Json ERROR', err);
    return { books: [], navLinks: [], pagination: {} };
  }
};

export const fetchOpds2Feed = async (url: string, credentials?: { username: string; password: string } | null) => {
  const proxyUrl = proxiedUrl(url);
  const headers: Record<string, string> = {
    'Accept': 'application/opds+json, application/json, application/ld+json, */*',
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
  const text = await safeReadText(resp);
  if (contentType.includes('application/opds+json') || contentType.includes('application/json')) {
    const json = JSON.parse(text);
    return { status: resp.status, ...(parseOpds2Json(json, url) as any) };
  }

  // If feed is XML/Atom, return empty (we only handle OPDS2 here for now)
  return { status: resp.status, books: [], navLinks: [], pagination: {} };
};

export const borrowOpds2Work = async (borrowHref: string, credentials?: { username: string; password: string } | null) => {
  const proxyUrl = proxiedUrl(borrowHref);
  const headers: Record<string, string> = { 'Accept': 'application/json, */*' };
  if (credentials) {
    headers['Authorization'] = `Basic ${btoa(`${credentials.username}:${credentials.password}`)}`;
    // Warn when using a public CORS proxy that commonly strips Authorization headers
    try {
      if (proxyUrl && proxyUrl.includes('corsproxy.io')) {
        logger.warn('[mebooks] Attempting to send Authorization through public CORS proxy (corsproxy.io). Public proxies often strip Authorization headers; consider configuring an owned proxy (VITE_OWN_PROXY_URL) to ensure credentials are forwarded.');
      }
    } catch (e) { /* ignore */ }
  }

  // Try POST, but fall back to GET if server responds with 405 (method not allowed)
  let resp = await fetch(proxyUrl, { method: 'POST', headers });
  if (resp.status === 405) {
    resp = await fetch(proxyUrl, { method: 'GET', headers });
  }
  if (!resp.ok) {
    const body = await safeReadText(resp).catch(() => '');
    // Provide a helpful message when using a public proxy which commonly
    // strips Authorization headers or blocks POST requests (e.g., corsproxy.io)
    let message = `Borrow failed: ${resp.status} ${resp.statusText}`;
    if (body) message += ` ${body}`;
    try {
      if (proxyUrl && proxyUrl.includes('corsproxy.io')) {
        message += ' — Note: this request went through the public CORS proxy (corsproxy.io). Public proxies often block POST requests or strip Authorization headers required for authenticated borrows. Configure an owned proxy by setting VITE_OWN_PROXY_URL (in your dev env) or use a proxy that preserves Authorization headers.';
      }
    } catch (e) { /* ignore */ }
    const err: any = new Error(message);
    // Attach some metadata so UI can detect proxy-specific errors if desired
    err.status = resp.status;
    err.proxyUsed = proxyUrl && proxyUrl.includes('corsproxy.io');
    throw err;
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
  // Keep original href for canonical link resolution; fetch may occur via
  // a proxied URL (current) but returned relative links should resolve
  // against the original upstream href.
  const originalHref = href;
  // Choose whether to fetch directly or via proxy. Use maybeProxyForCors so
  // the browser can perform interactive provider logins and send cookies when
  // appropriate. However, if credentials are supplied and the probe selects
  // a public proxy, fail early (public proxies often strip Authorization).
  const current = await maybeProxyForCors(href);
  try {
    const usingPublicProxy = typeof current === 'string' && current.includes('corsproxy.io');
    if (usingPublicProxy && credentials) {
      const err: any = new Error('Acquisition would use a public CORS proxy which may strip Authorization or block POST requests. Configure an owned proxy (VITE_OWN_PROXY_URL) to perform authenticated borrows.');
      err.proxyUsed = true;
      throw err;
    }
  } catch (e) {
    throw e;
  }
  // If the chosen fetch URL indicates we're using the public CORS proxy and
  // credentials are present, error early to avoid sending Authorization through
  // a proxy that may strip it.
  try {
    const usingPublicProxy = typeof current === 'string' && current.includes('corsproxy.io');
    if (usingPublicProxy && credentials) {
      const err: any = new Error('Acquisition would use a public CORS proxy which may strip Authorization or block POST requests. Configure an owned proxy (VITE_OWN_PROXY_URL) to perform authenticated borrows.');
      err.proxyUsed = true;
      throw err;
    }
  } catch (e) {
    throw e;
  }
  // If the chosen fetch URL indicates we're using the public CORS proxy and
  // credentials are present (or we prefer GET when creds are present), fail
  // early with a clear error recommending an owned proxy.
  try {
    const usingPublicProxy = typeof current === 'string' && current.includes('corsproxy.io');
    if (usingPublicProxy && credentials) {
      const err: any = new Error('Acquisition would use a public CORS proxy which may strip Authorization or block POST requests. Configure an owned proxy (VITE_OWN_PROXY_URL) to perform authenticated borrows.');
      err.proxyUsed = true;
      throw err;
    }
  } catch (e) {
    // rethrow to surface to caller
    throw e;
  }
  const makeHeaders = (withCreds = false) => {
    const h: Record<string, string> = { 'Accept': 'application/json, text/json, */*' };
    if (withCreds && credentials) h['Authorization'] = `Basic ${btoa(`${credentials.username}:${credentials.password}`)}`;
    return h;
  };

  // If credentials are provided, some servers expect an authenticated GET rather
  // than a POST. Use a heuristic: prefer GET when credentials are present.
  const preferGetWhenCreds = !!credentials;

  while (attempts < maxRedirects && current) {
    attempts++;
    let resp: Response | null = null;
    try {
      if (preferGetWhenCreds) {
        // Try GET first when credentials supplied
        resp = await fetch(current, { method: 'GET', headers: makeHeaders(true) });
        if (resp.status === 405) {
          resp = await fetch(current, { method: 'POST', headers: makeHeaders(true) });
        }
      } else {
        // Default: try POST first, then GET on 405
        resp = await fetch(current, { method: 'POST', headers: makeHeaders(false) });
        if (resp.status === 405) {
          resp = await fetch(current, { method: 'GET', headers: makeHeaders(false) });
        }
      }
    } catch (e) {
      throw e;
    }

    if (!resp) return null;

    // Treat 3xx + Location as final content URL
    if (resp.status >= 300 && resp.status < 400) {
      const loc = (resp.headers && typeof resp.headers.get === 'function') ? (resp.headers.get('Location') || resp.headers.get('location')) : null;
      if (loc) {
        return new URL(loc, originalHref).href;
      }
    }

    const ok = typeof resp.ok === 'boolean' ? resp.ok : (resp.status >= 200 && resp.status < 300);
    const ct = (resp.headers && typeof resp.headers.get === 'function') ? resp.headers.get('Content-Type') || '' : '';

    if (ok) {
      // OPDS2 servers should return JSON or a Location redirect. Do not
      // attempt to parse XML here; XML acquisition docs belong to OPDS1 and
      // are handled by the OPDS1 resolver. If an OPDS2 endpoint returns XML
      // it is treated as an unsupported response.
      if (ct.includes('application/json') || ct.includes('text/json') || ct.includes('application/opds+json')) {
        const j = await resp.json().catch(() => null);
        const candidate = j?.url || j?.location || j?.href || j?.contentLocation;
        if (typeof candidate === 'string' && candidate.length > 0) return new URL(candidate, originalHref).href;
        if (Array.isArray(j?.links)) {
          const contentLink = j.links.find((l: any) => l?.href && (l.rel === 'content' || l.rel === 'self' || String(l.rel).includes('acquisition')));
          if (contentLink?.href) return new URL(contentLink.href, current).href;
        }
      }
      const loc = resp.headers.get('Location') || resp.headers.get('location');
      if (loc) return new URL(loc, originalHref).href;

      if (ct.includes('application/epub') || ct.includes('application/pdf') || ct.includes('application/octet-stream')) {
        return originalHref;
      }
    }

    // If server demands authentication, surface the auth document when present.
    if (resp.status === 401 || resp.status === 403) {
      // Try to parse an OPDS authentication document
      const contentText = await safeReadText(resp).catch(() => '');
      let authDoc: any = null;
      try {
        if ((resp.headers.get && (resp.headers.get('Content-Type') || '').includes('application/vnd.opds.authentication.v1.0+json')) || contentText.trim().startsWith('{')) {
          authDoc = JSON.parse(contentText);
        }
      } catch (e) {
        authDoc = null;
      }

      const err: any = new Error(`Acquisition requires authentication: ${resp.status} ${resp.statusText}`);
      err.status = resp.status;
      if (authDoc) err.authDocument = authDoc;
      try { if (typeof current === 'string' && (current.includes('corsproxy.io') || current.includes('/proxy?url='))) err.proxyUsed = true; } catch (e) { /* ignore */ }
      throw err;
    }

    break;
  }

  return null;
};
