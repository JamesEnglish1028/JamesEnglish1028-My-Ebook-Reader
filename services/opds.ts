import type { CatalogBook, CatalogNavigationLink, CatalogPagination, Category, CategorizationMode, AudienceMode, FictionMode, MediaMode, CollectionMode, CatalogWithCategories, CatalogWithCollections, CollectionGroup, Series, Collection} from '../types';
import { CategoryLane } from '../types';

import { logger } from './logger';
import { proxiedUrl, maybeProxyForCors } from './utils';
// NOTE: prefer a static import for `maybeProxyForCors` instead of a dynamic import
// because static imports keep bundling deterministic and avoid creating a
// separate dynamic chunk for a small utility module. This prevents Vite from
// warning about a module being both statically and dynamically imported and
// simplifies chunking in production builds.

// Helper: convert a Uint8Array into a binary string (latin1) without triggering decoding
function uint8ToBinaryString(u8: Uint8Array): string {
    // Use chunking to avoid call stack / argument length issues
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
const responseByteCache: WeakMap<any, Uint8Array> = new WeakMap();

async function readAllBytes(resp: Response): Promise<Uint8Array> {
    // Return cached bytes if already read for this response object
    try {
        const cached = responseByteCache.get(resp);
        if (cached) return cached;
    } catch (_) {}
    // Defensive read supporting test mocks (which may not implement clone()/arrayBuffer())
    try {
        // Try arrayBuffer() on the original response first. Some environments
        // implement arrayBuffer() reliably and this avoids cloning and reader
        // locking issues in some browsers/runtimes.
        if (resp && typeof resp.arrayBuffer === 'function') {
            try {
                const buf = await resp.arrayBuffer();
                const result = new Uint8Array(buf);
                try { responseByteCache.set(resp, result); } catch (_) {}
                return result;
            } catch (_) {
                // fallthrough to clone/read logic
            }
        }

        if (resp && typeof resp.clone === 'function') {
            const c = resp.clone();
            try {
                const buf = await c.arrayBuffer();
                const out = new Uint8Array(buf);
                try { responseByteCache.set(resp, out); } catch (_) {}
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
                try { responseByteCache.set(resp, out); } catch (_) {}
                return out;
            }
        }

        if (resp && typeof resp.text === 'function') {
            const txt = await resp.text();
            let encoded: Uint8Array;
            if (typeof TextEncoder !== 'undefined') encoded = new TextEncoder().encode(txt);
            else if (typeof Buffer !== 'undefined') encoded = new Uint8Array(Buffer.from(txt, 'utf-8'));
            else encoded = new Uint8Array();
            try { responseByteCache.set(resp, encoded); } catch (_) {}
            return encoded;
        }

        if (resp && resp.body) {
            if (resp.body instanceof Uint8Array) {
                try { responseByteCache.set(resp, resp.body); } catch (_) {}
                return resp.body;
            }
            // @ts-ignore
            if (typeof Buffer !== 'undefined' && Buffer.isBuffer(resp.body)) {
                const out = new Uint8Array(resp.body);
                try { responseByteCache.set(resp, out); } catch (_) {}
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
        try {
            return new TextDecoder('utf-8', { fatal: false }).decode(u8);
        } catch (e) {
            try { return new TextDecoder('iso-8859-1', { fatal: false }).decode(u8); } catch (e2) { return uint8ToBinaryString(u8); }
        }
    } catch (e) {
        console.warn('safeReadText: fallback decode failed', e);
        try {
            if (resp && typeof resp.text === 'function') return await resp.text();
        } catch (_) {}
        return '';
    }
}

// Helper to capture the first N bytes of a response for debugging (base64)
async function captureFirstBytes(resp: Response, maxBytes = 512): Promise<string> {
    try {
        const u8 = await readAllBytes(resp);
        const slice = u8.subarray(0, Math.min(u8.length, maxBytes));
        const binary = uint8ToBinaryString(slice);
        return btoa(binary);
    } catch (e) {
        console.warn('captureFirstBytes failed', e);
        return '';
    }
}

export const getFormatFromMimeType = (mimeType: string | undefined): string | undefined => {
    if (!mimeType) return undefined;
    // Remove any parameters following a semicolon (e.g. "application/atom+xml;type=entry;profile=opds-catalog")
    const clean = mimeType.split(';')[0].trim().toLowerCase();
    if (clean.includes('epub') || clean === 'application/epub+zip') return 'EPUB';
    if (clean.includes('pdf') || clean === 'application/pdf') return 'PDF';
    if (clean.includes('audiobook') || clean === 'http://bib.schema.org/audiobook') return 'AUDIOBOOK';
    // For ambiguous/non-media types (atom, opds catalog entries, etc.) return undefined so UI doesn't show raw mime strings
    return undefined;
};

/**
 * Parses OPDS 1 XML feeds into a standardized format.
 * Handles audiobook detection via schema:additionalType attributes.
 * Supports Palace Project collection links and indirect acquisition chains.
 */
export const parseOpds1Xml = (xmlText: string, baseUrl: string): { books: CatalogBook[], navLinks: CatalogNavigationLink[], pagination: CatalogPagination } => {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'application/xml');

    const errorNode = xmlDoc.querySelector('parsererror');
    if (errorNode) {
      console.error('XML Parsing Error:', errorNode.textContent);
      throw new Error('Failed to parse catalog feed. The URL may not point to a valid OPDS feed, or the response was not valid XML.');
    }

    // Add check for the root <feed> element to validate it's an Atom feed.
    const rootNodeName = xmlDoc.documentElement?.nodeName;
    if (!rootNodeName || (rootNodeName.toLowerCase() !== 'feed' && !rootNodeName.endsWith(':feed'))) {
        throw new Error('Invalid Atom/OPDS feed. The XML document is missing the root <feed> element.');
    }

    const entries = Array.from(xmlDoc.querySelectorAll('entry'));
    const books: CatalogBook[] = [];
    const navLinks: CatalogNavigationLink[] = [];
    const pagination: CatalogPagination = {};
    
    // Extract pagination links from feed-level link elements
    const feedLinks = Array.from(xmlDoc.querySelectorAll('feed > link'));
    feedLinks.forEach(link => {
        const rel = link.getAttribute('rel');
        const href = link.getAttribute('href');
        if (href) {
            const fullUrl = new URL(href, baseUrl).href;
            if (rel === 'next') pagination.next = fullUrl;
            if (rel === 'previous') pagination.prev = fullUrl;
            if (rel === 'first') pagination.first = fullUrl;
            if (rel === 'last') pagination.last = fullUrl;
        }
    });

    entries.forEach(entry => {
      const title = entry.querySelector('title')?.textContent?.trim() || 'Untitled';
      const allLinks = Array.from(entry.querySelectorAll('link'));
      
      // Check for schema:additionalType to detect audiobooks - this is how Palace Project
      // marks audiobooks in their OPDS 1 feeds since they use schema.org vocabulary
      const schemaType = entry.getAttribute('schema:additionalType');
      const isAudiobook = schemaType === 'http://bib.schema.org/Audiobook' || 
                         schemaType === 'http://schema.org/Audiobook';
      
      // Find acquisition links for downloadable books - prefer open-access, then specific media types
      // Open-access links don't require authentication
      const openAccessLink = allLinks.find(link => {
          const rel = link.getAttribute('rel') || '';
          return rel.includes('/open-access') || rel === 'http://opds-spec.org/acquisition/open-access';
      });
      
      const acquisitionLink = openAccessLink || allLinks.find(link => {
          const rel = link.getAttribute('rel') || '';
          const type = link.getAttribute('type') || '';
          return rel.includes('opds-spec.org/acquisition') && (type.includes('epub+zip') || type.includes('pdf'));
      }) || allLinks.find(link => (link.getAttribute('rel') || '').includes('opds-spec.org/acquisition'));
      
      const isOpenAccess = !!openAccessLink;

    const subsectionLink = entry.querySelector('link[rel="subsection"], link[rel="http://opds-spec.org/subsection"]');

      if (acquisitionLink) {
          const author = entry.querySelector('author > name')?.textContent?.trim() || 'Unknown Author';
          const summary = entry.querySelector('summary')?.textContent?.trim() || entry.querySelector('content')?.textContent?.trim() || null;
          const coverLink = entry.querySelector('link[rel="http://opds-spec.org/image"]');
          
          const coverImageHref = coverLink?.getAttribute('href');
          const coverImage = coverImageHref ? new URL(coverImageHref, baseUrl).href : null;
          
                    const downloadUrlHref = acquisitionLink?.getAttribute('href');

                    // Determine media type for book format detection
                    const mimeType = acquisitionLink?.getAttribute('type') || '';
                    let format = getFormatFromMimeType(mimeType);

                    // For audiobooks, override format based on schema:additionalType
                    // This ensures Palace Project audiobooks are properly identified
                    if (isAudiobook) {
                        format = 'AUDIOBOOK';
                    } else if (!format) {
                        // Recursively search for child elements named 'indirectAcquisition' to find a type
                        // Some OPDS feeds use this for DRM-protected content or complex acquisition flows
                        const findIndirectType = (el: Element | null): string | undefined => {
                            if (!el) return undefined;
                            for (const child of Array.from(el.children)) {
                                const local = (child.localName || child.nodeName || '').toLowerCase();
                                if (local === 'indirectacquisition') {
                                    const t = child.getAttribute('type');
                                    if (t) return t;
                                    const nested = findIndirectType(child);
                                    if (nested) return nested;
                                } else {
                                    const nested = findIndirectType(child);
                                    if (nested) return nested;
                                }
                            }
                            return undefined;
                        };

                        const indirect = findIndirectType(acquisitionLink as Element);
                        if (indirect) format = getFormatFromMimeType(indirect);
                    }
          
          const publisher = (entry.querySelector('publisher')?.textContent || entry.querySelector('dc\\:publisher')?.textContent)?.trim();
          
          // Parse distributor information from bibframe:distribution element
          // Use getElementsByTagName which is more compatible with namespaced elements
          let distributor: string | undefined = undefined;
          
          try {
            const distributionElements = entry.getElementsByTagName('bibframe:distribution');
            if (distributionElements.length > 0) {
              const distributorRaw = distributionElements[0].getAttribute('bibframe:ProviderName')?.trim();
              distributor = distributorRaw && distributorRaw.length > 0 ? distributorRaw : undefined;
            }
          } catch (error) {
            // Fallback: look for distribution elements without namespace prefix
            try {
              const distributionElements = entry.getElementsByTagName('distribution');
              if (distributionElements.length > 0) {
                const distributorRaw = distributionElements[0].getAttribute('ProviderName')?.trim();
                distributor = distributorRaw && distributorRaw.length > 0 ? distributorRaw : undefined;
              }
            } catch (fallbackError) {
              // If both fail, distributor remains undefined
              console.warn('Could not parse distributor information:', fallbackError);
            }
          }
          
          const publicationDate = (entry.querySelector('issued')?.textContent || entry.querySelector('dc\\:issued')?.textContent || entry.querySelector('published')?.textContent)?.trim();
          const identifiers = Array.from(entry.querySelectorAll('identifier, dc\\:identifier'));
          const providerId = identifiers[0]?.textContent?.trim() || undefined;

          // Parse category elements into proper Category objects with scheme, term, and label
          const categories = Array.from(entry.querySelectorAll('category')).map(cat => {
              const scheme = cat.getAttribute('scheme') || 'http://palace.io/subjects';
              const term = cat.getAttribute('term')?.trim();
              const label = cat.getAttribute('label')?.trim();
              
              if (term) {
                  return {
                      scheme,
                      term,
                      label: label || term, // Use label if available, otherwise fall back to term
                  };
              }
              return null;
          }).filter((category): category is Category => category !== null);

          // Extract subjects as simple strings for backward compatibility
          const subjects = categories.map(cat => cat.label);

          // Parse collection links - used for Palace Project navigation
          // Collections are rel="collection" links that point to curated book sets
          const collectionLinks = Array.from(entry.querySelectorAll('link[rel="collection"]'));
          const collections = collectionLinks.map(link => {
              const href = link.getAttribute('href');
              const title = link.getAttribute('title');
              if (href && title) {
                  return {
                      title: title.trim(),
                      href: new URL(href, baseUrl).href,
                  };
              }
              return null;
          }).filter((collection): collection is { title: string; href: string } => collection !== null);

          if(downloadUrlHref) {
              const downloadUrl = new URL(downloadUrlHref, baseUrl).href;
              
              // Determine the correct acquisitionMediaType for proper format detection
              // For audiobooks, use the schema type; otherwise use the link's mime type
              let finalMediaType = mimeType;
              if (isAudiobook) {
                  finalMediaType = 'http://bib.schema.org/Audiobook';
              }
              
              books.push({ 
                  title, 
                  author, 
                  coverImage, 
                  downloadUrl, 
                  summary, 
                  publisher: publisher || undefined, 
                  publicationDate: publicationDate || undefined, 
                  providerId, 
                  distributor: distributor,
                  subjects: subjects.length > 0 ? subjects : undefined,
                  categories: categories.length > 0 ? categories : undefined,
                  format,
                  acquisitionMediaType: finalMediaType || undefined,
                  collections: collections.length > 0 ? collections : undefined,
                  isOpenAccess: isOpenAccess || undefined,
              });
          }
      } else if (subsectionLink) {
          // FIX: The variable 'navUrl' was not defined. It should be extracted from the 'href' attribute of the subsectionLink element.
          const navUrl = subsectionLink.getAttribute('href');
          if (navUrl) {
            navLinks.push({ title, url: new URL(navUrl, baseUrl).href, rel: 'subsection' });
          }
      }
    });

    // Create navigation links from collections found in books (for Palace Project support)
    if (books.length > 0 && navLinks.length === 0) {
        const collectionMap = new Map<string, string>();
        
        books.forEach(book => {
            if (book.collections) {
                book.collections.forEach(collection => {
                    if (!collectionMap.has(collection.title)) {
                        collectionMap.set(collection.title, collection.href);
                    }
                });
            }
        });
        
        // Convert unique collections to navigation links
        collectionMap.forEach((href, title) => {
            navLinks.push({ 
                title, 
                url: href, 
                rel: 'collection', 
            });
        });
    }

    // Add check to see if a valid Atom feed contains no OPDS content.
    if (entries.length > 0 && books.length === 0 && navLinks.length === 0) {
        throw new Error('This appears to be a valid Atom feed, but it contains no recognizable OPDS book entries or navigation links. Please ensure the URL points to an OPDS catalog.');
    }

    return { books, navLinks, pagination };
};

export const parseOpds2Json = (jsonData: any, baseUrl: string): { books: CatalogBook[], navLinks: CatalogNavigationLink[], pagination: CatalogPagination } => {
    if (!jsonData || typeof jsonData !== 'object') {
        throw new Error('Invalid catalog format. The response was not a valid JSON object.');
    }
    if (!jsonData.metadata) {
        throw new Error('Invalid OPDS 2.0 feed. The required "metadata" object is missing.');
    }

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
            const summary = metadata.description?.trim() || null;
            
            let author = 'Unknown Author';
            if (metadata.author) {
                if (Array.isArray(metadata.author) && metadata.author.length > 0) {
                    const firstAuthor = metadata.author[0];
                    if (typeof firstAuthor === 'string') author = firstAuthor.trim();
                    else if (firstAuthor?.name) author = firstAuthor.name.trim();
                } else if (typeof metadata.author === 'string') {
                    author = metadata.author.trim();
                } else if (metadata.author?.name) {
                    author = metadata.author.name.trim();
                }
            }

            const acquisitionLink = pub.links?.find((l: any) => l.rel?.includes('opds-spec.org/acquisition'));
            const coverLink = pub.images?.[0];

            if (acquisitionLink?.href) {
                const downloadUrl = new URL(acquisitionLink.href, baseUrl).href;
                const coverImage = coverLink?.href ? new URL(coverLink.href, baseUrl).href : null;
                const mimeType = acquisitionLink?.type || '';
                const format = getFormatFromMimeType(mimeType);

                let publisher: string | undefined = undefined;
                if (metadata.publisher) {
                    if (typeof metadata.publisher === 'string') {
                        publisher = metadata.publisher.trim();
                    } else if (metadata.publisher?.name) {
                        publisher = metadata.publisher.name.trim();
                    }
                }

                const publicationDate = metadata.published?.trim();

                let providerId: string | undefined = undefined;
                if (typeof metadata.identifier === 'string') {
                    providerId = metadata.identifier.trim();
                } else if (Array.isArray(metadata.identifier) && metadata.identifier.length > 0) {
                    const firstIdentifier = metadata.identifier.find((id: any) => typeof id === 'string');
                    if (firstIdentifier) {
                        providerId = firstIdentifier.trim();
                    }
                }

                let subjects: string[] = [];
                if (Array.isArray(metadata.subject)) {
                    subjects = metadata.subject.map((s: any) => {
                        if (typeof s === 'string') return s.trim();
                        if (s?.name) return s.name.trim();
                        return null;
                    }).filter((s: unknown): s is string => !!s && typeof s === 'string');
                }

                // Parse OPDS 2 series information from belongsTo
                let series: Series | undefined = undefined;
                if (metadata.belongsTo) {
                    const belongsTo = metadata.belongsTo;
                    if (belongsTo.name) {
                        series = {
                            name: belongsTo.name.trim(),
                            position: typeof belongsTo.position === 'number' ? belongsTo.position : undefined,
                        };
                    }
                }

                books.push({ 
                    title, 
                    author, 
                    coverImage, 
                    downloadUrl, 
                    summary, 
                    publisher, 
                    publicationDate, 
                    providerId, 
                    subjects: subjects.length > 0 ? subjects : undefined,
                    series,
                    format,
                    acquisitionMediaType: mimeType || undefined,
                });
            }
        });
    }

    let hasNavigatedFromCatalogs = false;
    // Prioritize a custom 'catalogs' array if it exists, as this is a convention for some registries
    // to list their final set of catalogs.
    if (jsonData.catalogs && Array.isArray(jsonData.catalogs) && jsonData.catalogs.length > 0) {
        jsonData.catalogs.forEach((catalog: any) => {
            const title = catalog.metadata?.title;
            // FIX: Correctly find the OPDS catalog URL by its specific 'rel' attribute.
            const catalogLink = catalog.links?.find((l: any) => l.rel === 'http://opds-spec.org/catalog' && l.href);

            if (title && catalogLink) {
                const url = new URL(catalogLink.href, baseUrl).href;
                // Treat it as a standard navigation link for the UI, but flag it as a terminal catalog entry.
                navLinks.push({ title, url, rel: 'subsection', isCatalog: true });
            }
        });
        if (navLinks.length > 0) {
            hasNavigatedFromCatalogs = true;
        }
    }

    // Fallback to the standard 'navigation' array if 'catalogs' is not present or empty.
    if (!hasNavigatedFromCatalogs && jsonData.navigation && Array.isArray(jsonData.navigation)) {
        jsonData.navigation.forEach((link: any) => {
            if (link.href && link.title) {
                const url = new URL(link.href, baseUrl).href;
                navLinks.push({ title: link.title, url, rel: link.rel || '' });
            }
        });
    }

    return { books, navLinks, pagination };
};

export const fetchCatalogContent = async (url: string, baseUrl: string, forcedVersion: 'auto' | '1' | '2' = 'auto'): Promise<{ books: CatalogBook[], navLinks: CatalogNavigationLink[], pagination: CatalogPagination, error?: string }> => {
    try {
        // Some providers (notably Palace Project / palace.io, palaceproject.io, and thepalaceproject.org hosts) operate
        // primarily for native clients and don't expose CORS consistently. For
        // those hosts we should force requests through our owned proxy so the
        // browser won't be blocked. Detect palace-like hosts and skip the probe.
    const hostname = (() => { try { return new URL(url).hostname.toLowerCase(); } catch { return ''; } })();
    const isPalaceHost = hostname.endsWith('palace.io') || hostname.endsWith('palaceproject.io') || hostname.endsWith('thepalaceproject.org') || hostname === 'palace.io' || hostname.endsWith('.palace.io') || hostname.endsWith('.thepalaceproject.org');

    // Log host classification to confirm palace hosts are being forced through owned proxy
    logger.debug('fetchCatalogContent host classification', { hostname, isPalaceHost, forcedVersion });

        let fetchUrl: string;
        if (isPalaceHost) {
            // Force owned proxy for palace hosts to ensure acquisition links and
            // embedded XML are reachable from the browser (via our server-side proxy).
            fetchUrl = proxiedUrl(url);
        } else {
            // Try direct fetch first (CORS-capable). maybeProxyForCors will probe the URL
            // and return either the original URL (if direct fetch should work) or a proxied URL.
            fetchUrl = await maybeProxyForCors(url);
        }
        // Choose Accept header based on forcedVersion so servers return the expected format
        // For Palace-hosted servers we strongly prefer XML/Atom and avoid JSON to get collection navigation links
        const acceptHeader = isPalaceHost || forcedVersion === '1'
            ? 'application/atom+xml;profile=opds-catalog, application/xml, text/xml, */*'
            : 'application/opds+json, application/atom+xml;profile=opds-catalog;q=0.9, application/json;q=0.8, application/xml;q=0.7, */*;q=0.5';

    // FIX: Added specific Accept header to signal preference for OPDS formats.
        // Log fetch URL to show whether proxied or direct URL is used
        logger.debug('fetchCatalogContent fetch details', { fetchUrl, acceptHeader });
    // Determine whether this is a direct fetch (so we can include credentials)
    const isDirectFetch = fetchUrl === url;
        const response = await fetch(fetchUrl, {
            method: 'GET',
            mode: 'cors',
            credentials: isDirectFetch ? 'include' : 'omit',
            headers: {
                'Accept': acceptHeader,
            },
        });

        // Diagnostic: log the initial response status and Content-Type as observed
        // by the browser. This helps identify whether the response the app sees
        // is JSON, XML, or missing headers.
        try {
            // eslint-disable-next-line no-console
            console.debug('[mebooks] initial response - status:', response.status, 'content-type:', response.headers.get('Content-Type'));
        } catch (e) { /* ignore logging failures */ }

        // If the direct fetch returned a redirect (3xx) or the response lacks CORS
        // headers when we attempted a direct fetch, the browser will block reading
        // the body. In that case, retry the request via the configured proxy.
    const isRedirect = response.status >= 300 && response.status < 400;
    const hasCorsHeader = !!response.headers.get('Access-Control-Allow-Origin');
    if ((isRedirect || (isDirectFetch && !hasCorsHeader)) && proxiedUrl) {
            const proxyFetchUrl = proxiedUrl(url);
            const proxiedResp = await fetch(proxyFetchUrl, {
                method: 'GET',
                headers: {
                    'Accept': acceptHeader,
                },
            });
            // Replace response with proxied response for parsing below
            if (proxiedResp) {
                // Note: we can't reassign the const `response`, so read proxiedResp into locals used below
                const contentType = proxiedResp.headers.get('Content-Type') || '';
                const responseText = await safeReadText(proxiedResp);

                // Detect proxy-level rejections (common when HOST_ALLOWLIST blocks the target)
                if (proxiedResp.status === 403) {
                    try {
                        const parsed = contentType.includes('application/json') ? JSON.parse(responseText) : null;
                        if (parsed && parsed.error && typeof parsed.error === 'string' && parsed.error.toLowerCase().includes('host')) {
                            throw new Error(`Proxy denied access to host for ${url}. The proxy's HOST_ALLOWLIST may need to include the upstream host.`);
                        }
                    } catch (e) {
                        // If parsing fails, still surface a helpful message
                        throw new Error(`Proxy returned 403 for ${url}. The proxy may be blocking this host.`);
                    }
                }

                if (contentType.includes('text/html') && responseText.trim().toLowerCase().startsWith('<!doctype html>')) {
                    throw new Error('The CORS proxy returned an HTML page instead of the catalog feed. This might indicate the proxy service is down or blocking the request. Please try another catalog or check back later.');
                }

                        // If caller requested a forced version, prefer that parsing path even if Content-Type
                        // suggests otherwise. Log the decision for diagnostics.
                        // eslint-disable-next-line no-console
                        console.debug('[mebooks] proxied response - forcedVersion:', forcedVersion, 'contentType:', contentType, 'url:', url);
                        if (forcedVersion === '1' && responseText.trim().startsWith('<')) {
                                    // eslint-disable-next-line no-console
                                    console.debug('[mebooks] Forcing OPDS1 (XML) parse for proxied response');
                                    return parseOpds1Xml(responseText, baseUrl);
                                }

                        if (forcedVersion !== '1' && (contentType.includes('application/opds+json') || contentType.includes('application/json'))) {
                    try {
                        const jsonData = JSON.parse(responseText);
                        return parseOpds2Json(jsonData, baseUrl);
                    } catch (e) {
                        // Some Palace endpoints return Atom XML but incorrectly set Content-Type
                        // to application/json; if the body looks like XML, try parsing as XML.
                        if (responseText && responseText.trim().startsWith('<')) {
                            try {
                                // eslint-disable-next-line no-console
                                console.debug('[mebooks] proxied response body appears to be XML despite JSON Content-Type; attempting XML parse');
                                return parseOpds1Xml(responseText, baseUrl);
                            } catch (xmlErr) {
                                // fall through to diagnostics below
                            }
                        }
                        const b64 = await captureFirstBytes(proxiedResp).catch(() => '');
                         
                        console.warn('[mebooks] Failed to JSON.parse proxied response; first bytes (base64):', b64);
                        throw new Error(`Failed to parse proxied JSON response for ${url}. First bytes (base64): ${b64}`);
                    }
                } else if (contentType.includes('application/atom+xml') || contentType.includes('application/xml') || contentType.includes('text/xml')) {
                    return parseOpds1Xml(responseText, baseUrl);
                } else {
                    // Allow JSON parsing for Palace hosts even when forcedVersion=1, in case the server ignores our XML preference
                    if ((forcedVersion !== '1' || isPalaceHost) && responseText.trim().startsWith('{')) {
                        try {
                            const jsonData = JSON.parse(responseText);
                            return parseOpds2Json(jsonData, baseUrl);
                        } catch (e) {
                            const b64 = await captureFirstBytes(proxiedResp).catch(() => '');
                            console.warn('Failed to auto-parse proxied JSON; first bytes (base64):', b64);
                            throw new Error(`Failed to parse proxied JSON response for ${url}. First bytes (base64): ${b64}`);
                        }
                    }
                    if (responseText.trim().startsWith('<')) {
                         return parseOpds1Xml(responseText, baseUrl);
                    }
                    throw new Error(`Unsupported or ambiguous catalog format. Content-Type: "${contentType}".`);
                }
            }
        }
        
        if (!response.ok) {
            const statusInfo = `${response.status}${response.statusText ? ` ${response.statusText}` : ''}`;
            let errorMessage = `The catalog server responded with an error (${statusInfo}). Please check the catalog URL.`;
            if (response.status === 401 || response.status === 403) {
                errorMessage = `Could not access catalog (${statusInfo}). This catalog requires authentication (a login or password), which is not supported by this application.`;
            }
            if (response.status === 429) {
                errorMessage = `Could not access catalog (${statusInfo}). The request was rate-limited by the server or the proxy. Please wait a moment and try again.`;
            }
            throw new Error(errorMessage);
        }
        
    const contentType = response.headers.get('Content-Type') || '';
    const responseText = await safeReadText(response);

        // If the proxy returned a JSON 403 error body, surface a clearer message
        if (response.status === 403 && contentType.includes('application/json')) {
            try {
                const parsed = JSON.parse(responseText);
                if (parsed && parsed.error && typeof parsed.error === 'string') {
                    throw new Error(`Proxy error: ${parsed.error}`);
                }
            } catch (e) {
                throw new Error(`Proxy returned 403 for ${url}`);
            }
        }

        // FIX: Add specific check for HTML response from a faulty proxy
        if (contentType.includes('text/html') && responseText.trim().toLowerCase().startsWith('<!doctype html>')) {
             throw new Error('The CORS proxy returned an HTML page instead of the catalog feed. This might indicate the proxy service is down or blocking the request. Please try another catalog or check back later.');
        }

        // Respect forcedVersion preference for responses read from the direct fetch path.
        // Diagnostic: log forcedVersion and content type for the direct response path
        // eslint-disable-next-line no-console
        console.debug('[mebooks] direct response - forcedVersion:', forcedVersion, 'contentType:', contentType, 'url:', url);
        if (forcedVersion === '1' && responseText.trim().startsWith('<')) {
            // eslint-disable-next-line no-console
            console.debug('[mebooks] Forcing OPDS1 (XML) parse for direct response');
            return parseOpds1Xml(responseText, baseUrl);
        }

    if (forcedVersion !== '1' && (contentType.includes('application/opds+json') || contentType.includes('application/json'))) {
            try {
                const jsonData = JSON.parse(responseText);
                return parseOpds2Json(jsonData, baseUrl);
            } catch (e) {
                // Some Palace endpoints return Atom XML but incorrectly set Content-Type
                // to application/json; if the body looks like XML, try parsing as XML.
                if (responseText && responseText.trim().startsWith('<')) {
                    try {
                        // eslint-disable-next-line no-console
                        console.debug('[mebooks] direct response body appears to be XML despite JSON Content-Type; attempting XML parse');
                        return parseOpds1Xml(responseText, baseUrl);
                    } catch (xmlErr) {
                        // fall through to original error
                    }
                }
                const b64 = await captureFirstBytes(response).catch(() => '');
                 
                console.warn('[mebooks] Failed to JSON.parse response; first bytes (base64):', b64);
                throw new Error(`Failed to parse JSON response for ${url}. First bytes (base64): ${b64}`);
            }
        } else if (contentType.includes('application/atom+xml') || contentType.includes('application/xml') || contentType.includes('text/xml')) {
            return parseOpds1Xml(responseText, baseUrl);
        } else {
            // Attempt to auto-detect format if Content-Type is vague (e.g., text/plain)
            if (forcedVersion !== '1' && responseText.trim().startsWith('{')) {
                try {
                    const jsonData = JSON.parse(responseText);
                    return parseOpds2Json(jsonData, baseUrl);
                } catch (e) { /* Fall through to XML parsing */ }
            }
            if (responseText.trim().startsWith('<')) {
                 return parseOpds1Xml(responseText, baseUrl);
            }
            throw new Error(`Unsupported or ambiguous catalog format. Content-Type: "${contentType}".`);
        }
    } catch (error) {
        console.error('Error fetching or parsing catalog content:', error);
        let message: string;

        if (error instanceof TypeError) {
            if (error.message.includes('exceeds response Body')) {
                message = 'A network error occurred while downloading the catalog. The response was incomplete, which can be caused by an unstable connection or a proxy issue. Please try again.';
            } else if (error.message === 'Failed to fetch') {
                message = 'Network Error: Failed to fetch the content. This could be due to your internet connection, the remote catalog being offline, or the public CORS proxy being temporarily unavailable.';
            } else {
                 message = `A network error occurred: ${error.message}`;
            }
        } else if (error instanceof SyntaxError) {
            message = 'Failed to parse the catalog feed. The response was not valid JSON or XML.';
        } else if (error instanceof Error) {
            message = error.message; // Fallback for other generic errors
        } else {
            message = 'An unknown error occurred while loading the catalog.';
        }

        return { books: [], navLinks: [], pagination: {}, error: message };
    }
};

// OPDS1 acquisition resolver: POST/GET to borrow endpoints and parse XML
export const resolveAcquisitionChainOpds1 = async (href: string, credentials?: { username: string; password: string } | null, maxRedirects = 5): Promise<string | null> => {
    let attempts = 0;
    // Known Palace-related media types that some feeds use for indirect acquisition
    const palaceTypes = ['application/adobe+epub', 'application/pdf+lcp', 'application/vnd.readium.license.status.v1.0+json'];
            // Keep the original href as the canonical base for resolving relative
            // links returned by the server. We may fetch via a proxied URL (current)
            // but any relative hrefs in responses should be resolved against the
            // original upstream href, not the proxy URL.
            const originalHref = href;
            // For Palace Project servers (palace.io, palaceproject.io, thepalaceproject.org), force the proxied URL (prefer owned proxy when configured)
            let current: string;
            try {
                const hostname = (() => { try { return new URL(href).hostname.toLowerCase(); } catch { return ''; } })();
                const isPalaceHost = hostname.endsWith('palace.io') || hostname.endsWith('palaceproject.io') || hostname.endsWith('thepalaceproject.org') || hostname === 'palace.io' || hostname.endsWith('.palace.io') || hostname.endsWith('.thepalaceproject.org');
                if (isPalaceHost) {
                    current = proxiedUrl(href);
                } else {
                    current = await maybeProxyForCors(href);
                }
            } catch (e) {
                current = await maybeProxyForCors(href);
            }
        // If the probe selected the public proxy and credentials are provided,
        // fail early with a helpful message so UI can prompt for setting an owned proxy.
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

    const makeHeaders = (withCreds = false) => {
        const h: Record<string,string> = { 'Accept': 'application/atom+xml, application/xml, text/xml, */*' };
        if (withCreds && credentials) h['Authorization'] = `Basic ${btoa(`${credentials.username}:${credentials.password}`)}`;
        return h;
    };

    const preferGetWhenCreds = !!credentials;

    while (attempts < maxRedirects && current) {
        attempts++;
        let resp: Response | null = null;
        try {
            // Include cookies for direct (non-proxied) fetches so provider-set
            // session cookies are sent. Omit credentials for proxied requests.
            const directFetch = typeof current === 'string' && current === originalHref;
            if (preferGetWhenCreds) {
                resp = await fetch(current, { method: 'GET', headers: makeHeaders(true), credentials: directFetch ? 'include' : 'omit' });
                if (resp.status === 405) resp = await fetch(current, { method: 'POST', headers: makeHeaders(true), credentials: directFetch ? 'include' : 'omit' });
            } else {
                resp = await fetch(current, { method: 'POST', headers: makeHeaders(false), credentials: directFetch ? 'include' : 'omit' });
                if (resp.status === 405) resp = await fetch(current, { method: 'GET', headers: makeHeaders(false), credentials: directFetch ? 'include' : 'omit' });
            }
        } catch (e) {
            throw e;
        }

        if (!resp) return null;

        // Follow redirects via Location
        if (resp.status >= 300 && resp.status < 400) {
            const loc = (resp.headers && typeof resp.headers.get === 'function') ? (resp.headers.get('Location') || resp.headers.get('location')) : null;
            if (loc) return new URL(loc, originalHref).href;
        }

        const ok = typeof resp.ok === 'boolean' ? resp.ok : (resp.status >= 200 && resp.status < 300);

        if (ok) {
            const text = await safeReadText(resp).catch(() => '');
            // Parse XML for <link> elements that indicate acquisition/content
            try {
                if (text.trim().startsWith('<')) {
                    const parser = new DOMParser();
                    const xml = parser.parseFromString(text, 'application/xml');
                    const links = Array.from(xml.querySelectorAll('link')) as Element[];
                    // prefer explicit acquisition links with known media types
                    const palaceTypes = ['application/adobe+epub', 'application/pdf+lcp', 'application/vnd.readium.license.status.v1.0+json'];
                    const candidate = links.find(l => {
                        const rel = (l.getAttribute('rel') || '').toLowerCase();
                        const type = (l.getAttribute('type') || '').toLowerCase();
                        const hrefAttr = l.getAttribute('href');
                        if (!hrefAttr) return false;
                        if (rel.includes('acquisition') || rel.includes('borrow') || rel.includes('loan') || rel.includes('http://opds-spec.org/acquisition')) {
                            if (type && (type.includes('epub') || type.includes('pdf') || palaceTypes.some(t => type.includes(t)))) return true;
                            return true;
                        }
                        return false;
                    });
                    if (candidate) {
                        const hrefAttr = candidate.getAttribute('href')!;
                        return new URL(hrefAttr, originalHref).href;
                    }
                }
            } catch (e) {
                // ignore parse errors
            }

                        // Fallback: if content-type indicates binary, return current
                        const ct = (resp.headers && typeof resp.headers.get === 'function') ? resp.headers.get('Content-Type') || '' : '';
            if (ct.includes('application/epub') || ct.includes('application/pdf') || ct.includes('application/octet-stream')) {
                // Return the canonical upstream URL rather than the proxy URL so
                // callers can decide whether to proxy the download.
                return originalHref;
            }

                        // If we received an HTML response (often from a public proxy) and
                        // the current URL indicates it was proxied through a known public
                        // CORS proxy, surface a clearer error so the UI can show an actionable
                        // toast suggesting to use an owned proxy.
                        try {
                            const responseText = text || await safeReadText(resp).catch(() => '');
                            const usedProxy = typeof current === 'string' && (current.includes('corsproxy.io') || current.includes('/proxy?url='));
                            if (usedProxy && (ct.includes('text/html') || (responseText && responseText.trim().startsWith('<')))) {
                                const err: any = new Error('Acquisition failed via public CORS proxy. The proxy may block POST requests or strip Authorization headers. Configure an owned proxy (VITE_OWN_PROXY_URL) to preserve credentials and HTTP methods.');
                                err.status = resp.status;
                                err.proxyUsed = true;
                                throw err;
                            }
                        } catch (e) {
                            // ignore and continue
                        }
        }

        // If we attempted a direct fetch and received a 401/403 without
        // Access-Control-Allow-Origin, browsers will block reading the body.
        // If an owned proxy is configured, retry the same request via the
        // owned proxy preserving Authorization so the proxy can add CORS
        // headers and forward auth to the upstream. If no owned proxy is
        // configured, surface an actionable error so the UI can instruct
        // the user to configure one.
        try {
            const usedDirect = typeof current === 'string' && current === originalHref;
            const statusIsAuth = resp.status === 401 || resp.status === 403;
            const hasAcaOrigin = resp.headers && typeof resp.headers.get === 'function' && !!resp.headers.get('Access-Control-Allow-Origin');
            if (usedDirect && statusIsAuth && !hasAcaOrigin) {
                // Build a proxied URL candidate and determine if it's an owned proxy
                const proxyCandidate = proxiedUrl(originalHref);
                const usingPublicProxy = proxyCandidate && proxyCandidate.includes('corsproxy.io');
                if (!proxyCandidate) {
                    const err: any = new Error('Acquisition failed and no proxy is available. Configure an owned proxy via VITE_OWN_PROXY_URL to allow authenticated downloads from the browser.');
                    err.proxyUsed = true;
                    throw err;
                }

                if (usingPublicProxy) {
                    // Public proxy would be used but it likely strips Authorization.
                    const err: any = new Error('Acquisition would require using a public CORS proxy which may strip Authorization or block POSTs. Configure an owned proxy (VITE_OWN_PROXY_URL).');
                    err.proxyUsed = true;
                    throw err;
                }

                // Owned proxy exists — retry the request via the owned proxy with same auth headers
                const makeHeadersForRetry = (withCreds = false) => {
                    const h: Record<string,string> = { 'Accept': 'application/atom+xml, application/xml, text/xml, */*' };
                    if (withCreds && credentials) h['Authorization'] = `Basic ${btoa(`${credentials.username}:${credentials.password}`)}`;
                    return h;
                };

                // Choose method sequence as before
                let proxyResp: Response | null = null;
                try {
                    if (preferGetWhenCreds) {
                        proxyResp = await fetch(proxyCandidate, { method: 'GET', headers: makeHeadersForRetry(true) });
                        if (proxyResp && proxyResp.status === 405) proxyResp = await fetch(proxyCandidate, { method: 'POST', headers: makeHeadersForRetry(true) });
                    } else {
                        proxyResp = await fetch(proxyCandidate, { method: 'POST', headers: makeHeadersForRetry(false) });
                        if (proxyResp && proxyResp.status === 405) proxyResp = await fetch(proxyCandidate, { method: 'GET', headers: makeHeadersForRetry(false) });
                    }
                } catch (e) {
                    // Network/proxy error — surface as proxyUsed so UI can guide user
                    const err: any = new Error('Failed to contact owned proxy for authenticated acquisition. Check your proxy configuration.');
                    err.proxyUsed = true;
                    throw err;
                }

                if (!proxyResp) {
                    const err: any = new Error('Proxy retry failed.');
                    err.proxyUsed = true;
                    throw err;
                }

                if (proxyResp.status >= 300 && proxyResp.status < 400) {
                    const loc = (proxyResp.headers && typeof proxyResp.headers.get === 'function') ? (proxyResp.headers.get('Location') || proxyResp.headers.get('location')) : null;
                    if (loc) return new URL(loc, originalHref).href;
                }

                const ok2 = typeof proxyResp.ok === 'boolean' ? proxyResp.ok : (proxyResp.status >= 200 && proxyResp.status < 300);
                if (ok2) {
                    const text2 = await safeReadText(proxyResp).catch(() => '');
                    try {
                        if (text2.trim().startsWith('<')) {
                            const parser = new DOMParser();
                            const xml = parser.parseFromString(text2, 'application/xml');
                            const links = Array.from(xml.querySelectorAll('link')) as Element[];
                            const candidate = links.find(l => {
                                const rel = (l.getAttribute('rel') || '').toLowerCase();
                                const type = (l.getAttribute('type') || '').toLowerCase();
                                const hrefAttr = l.getAttribute('href');
                                if (!hrefAttr) return false;
                                if (rel.includes('acquisition') || rel.includes('borrow') || rel.includes('loan') || rel.includes('http://opds-spec.org/acquisition')) {
                                    if (type && (type.includes('epub') || type.includes('pdf') || palaceTypes.some(t => type.includes(t)))) return true;
                                    return true;
                                }
                                return false;
                            });
                            if (candidate) {
                                const hrefAttr = candidate.getAttribute('href')!;
                                return new URL(hrefAttr, originalHref).href;
                            }
                        }
                    } catch (e) {
                        // ignore
                    }

                    const ct2 = (proxyResp.headers && typeof proxyResp.headers.get === 'function') ? proxyResp.headers.get('Content-Type') || '' : '';
                    if (ct2.includes('application/epub') || ct2.includes('application/pdf') || ct2.includes('application/octet-stream')) {
                        return originalHref;
                    }
                }
                // If proxy retry did not yield a usable acquisition, surface an error
                const err: any = new Error('Authenticated acquisition failed even after retrying via owned proxy.');
                err.proxyUsed = true;
                throw err;
            }
        } catch (e) {
            throw e;
        }

        if (resp.status === 401 || resp.status === 403) {
            const text = await safeReadText(resp).catch(() => '');
            let authDoc: any = null;
            try {
                const ct = resp.headers.get('Content-Type') || '';
                if (ct.includes('application/vnd.opds.authentication.v1.0+json') || text.trim().startsWith('{')) authDoc = JSON.parse(text);
            } catch (e) { authDoc = null; }

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

// Media Type Filtering Functions
export const filterBooksByAudience = (books: CatalogBook[], audienceMode: AudienceMode): CatalogBook[] => {
    if (audienceMode === 'all') {
        return books;
    }
    
    return books.filter(book => {
        // Check categories for audience information
        if (book.categories && book.categories.length > 0) {
            const audienceCategories = book.categories.filter(cat => 
                cat.scheme.includes('audience') || cat.scheme.includes('target-age'),
            );
            
            if (audienceCategories.length > 0) {
                const hasTargetAudience = audienceCategories.some(cat => {
                    const label = cat.label.toLowerCase();
                    const term = cat.term.toLowerCase();
                    
                    switch (audienceMode) {
                        case 'adult':
                            return label.includes('adult') && !label.includes('young') || 
                                   term.includes('adult') && !term.includes('young') ||
                                   label.includes('18+') || term.includes('18+');
                        case 'young-adult':
                            return label.includes('young adult') || label.includes('teen') || 
                                   term.includes('young-adult') || term.includes('teen') ||
                                   label.includes('ya') || term.includes('ya');
                        case 'children':
                            return label.includes('children') || label.includes('child') || 
                                   label.includes('juvenile') || label.includes('kids') ||
                                   term.includes('children') || term.includes('child') ||
                                   term.includes('juvenile') || term.includes('kids');
                        default:
                            return false;
                    }
                });
                
                return hasTargetAudience;
            }
        }
        
        // Check subjects for audience information
        if (book.subjects && book.subjects.length > 0) {
            const hasTargetAudience = book.subjects.some(subject => {
                const subjectLower = subject.toLowerCase();
                
                switch (audienceMode) {
                    case 'adult':
                        return subjectLower.includes('adult') && !subjectLower.includes('young');
                    case 'young-adult':
                        return subjectLower.includes('young adult') || subjectLower.includes('teen') ||
                               subjectLower.includes('ya');
                    case 'children':
                        return subjectLower.includes('children') || subjectLower.includes('child') ||
                               subjectLower.includes('juvenile') || subjectLower.includes('kids');
                    default:
                        return false;
                }
            });
            
            if (hasTargetAudience) {
                return true;
            }
        }
        
        // If no audience information found, include in 'adult' by default
        return audienceMode === 'adult';
    });
};

export const getAvailableAudiences = (books: CatalogBook[]): AudienceMode[] => {
    const audiences: Set<AudienceMode> = new Set(['all']); // Always include 'all'
    
    books.forEach(book => {
        // Check categories for audience information
        if (book.categories && book.categories.length > 0) {
            book.categories.forEach(cat => {
                if (cat.scheme.includes('audience') || cat.scheme.includes('target-age')) {
                    const label = cat.label.toLowerCase();
                    const term = cat.term.toLowerCase();
                    
                    if ((label.includes('adult') && !label.includes('young')) || 
                        (term.includes('adult') && !term.includes('young')) ||
                        label.includes('18+') || term.includes('18+')) {
                        audiences.add('adult');
                    }
                    if (label.includes('young adult') || label.includes('teen') || 
                        term.includes('young-adult') || term.includes('teen') ||
                        label.includes('ya') || term.includes('ya')) {
                        audiences.add('young-adult');
                    }
                    if (label.includes('children') || label.includes('child') || 
                        label.includes('juvenile') || label.includes('kids') ||
                        term.includes('children') || term.includes('child') ||
                        term.includes('juvenile') || term.includes('kids')) {
                        audiences.add('children');
                    }
                }
            });
        }
        
        // Check subjects for audience information
        if (book.subjects && book.subjects.length > 0) {
            book.subjects.forEach(subject => {
                const subjectLower = subject.toLowerCase();
                
                if (subjectLower.includes('adult') && !subjectLower.includes('young')) {
                    audiences.add('adult');
                }
                if (subjectLower.includes('young adult') || subjectLower.includes('teen') ||
                    subjectLower.includes('ya')) {
                    audiences.add('young-adult');
                }
                if (subjectLower.includes('children') || subjectLower.includes('child') ||
                    subjectLower.includes('juvenile') || subjectLower.includes('kids')) {
                    audiences.add('children');
                }
            });
        }
    });
    
    return Array.from(audiences);
};

export const filterBooksByFiction = (books: CatalogBook[], fictionMode: FictionMode): CatalogBook[] => {
    if (fictionMode === 'all') {
        return books;
    }
    
    return books.filter(book => {
        // Check categories for fiction classification
        if (book.categories && book.categories.length > 0) {
            const fictionCategories = book.categories.filter(cat => 
                cat.scheme.includes('fiction') || cat.scheme.includes('genre') || cat.scheme.includes('bisac'),
            );
            
            if (fictionCategories.length > 0) {
                const isFiction = fictionCategories.some(cat => {
                    const label = cat.label.toLowerCase();
                    const term = cat.term.toLowerCase();
                    
                    // Check for explicit fiction markers
                    if (label.includes('fiction') || term.includes('fiction')) {
                        return !label.includes('non-fiction') && !term.includes('non-fiction');
                    }
                    
                    // Check for non-fiction markers
                    if (label.includes('non-fiction') || term.includes('non-fiction') ||
                        label.includes('nonfiction') || term.includes('nonfiction')) {
                        return false;
                    }
                    
                    // Check for genre indicators that suggest fiction
                    const fictionGenres = ['romance', 'mystery', 'thriller', 'fantasy', 'science fiction', 
                                          'horror', 'adventure', 'literary', 'drama', 'suspense'];
                    const nonFictionGenres = ['biography', 'history', 'science', 'philosophy', 'religion',
                                             'self-help', 'health', 'business', 'politics', 'economics'];
                    
                    const hasFictionGenre = fictionGenres.some(genre => 
                        label.includes(genre) || term.includes(genre),
                    );
                    const hasNonFictionGenre = nonFictionGenres.some(genre => 
                        label.includes(genre) || term.includes(genre),
                    );
                    
                    if (hasNonFictionGenre) return false;
                    if (hasFictionGenre) return true;
                    
                    return null; // Unclear from this category
                });
                
                if (isFiction !== null) {
                    return fictionMode === 'fiction' ? isFiction : !isFiction;
                }
            }
        }
        
        // Check subjects for fiction classification
        if (book.subjects && book.subjects.length > 0) {
            const fictionKeywords = book.subjects.some(subject => {
                const subjectLower = subject.toLowerCase();
                
                // Explicit fiction/non-fiction markers
                if (subjectLower.includes('fiction') && !subjectLower.includes('non-fiction')) {
                    return true;
                }
                if (subjectLower.includes('non-fiction') || subjectLower.includes('nonfiction')) {
                    return false;
                }
                
                // Genre-based classification
                const fictionGenres = ['romance', 'mystery', 'thriller', 'fantasy', 'science fiction', 
                                      'horror', 'adventure', 'literary', 'drama', 'suspense'];
                const nonFictionGenres = ['biography', 'history', 'science', 'philosophy', 'religion',
                                         'self-help', 'health', 'business', 'politics', 'economics'];
                
                const hasNonFictionGenre = nonFictionGenres.some(genre => subjectLower.includes(genre));
                if (hasNonFictionGenre) return false;
                
                const hasFictionGenre = fictionGenres.some(genre => subjectLower.includes(genre));
                if (hasFictionGenre) return true;
                
                return null;
            });
            
            if (fictionKeywords !== null) {
                return fictionMode === 'fiction' ? fictionKeywords : !fictionKeywords;
            }
        }
        
        // If no clear fiction classification, include in both categories by default
        return true;
    });
};

export const getAvailableFictionModes = (books: CatalogBook[]): FictionMode[] => {
    const modes: Set<FictionMode> = new Set(['all']); // Always include 'all'
    
    let hasFiction = false;
    let hasNonFiction = false;
    
    books.forEach(book => {
        // Check categories for fiction classification
        if (book.categories && book.categories.length > 0) {
            book.categories.forEach(cat => {
                if (cat.scheme.includes('fiction') || cat.scheme.includes('genre') || cat.scheme.includes('bisac')) {
                    const label = cat.label.toLowerCase();
                    const term = cat.term.toLowerCase();
                    
                    if ((label.includes('fiction') && !label.includes('non-fiction')) || 
                        (term.includes('fiction') && !term.includes('non-fiction'))) {
                        hasFiction = true;
                    }
                    if (label.includes('non-fiction') || term.includes('non-fiction') ||
                        label.includes('nonfiction') || term.includes('nonfiction')) {
                        hasNonFiction = true;
                    }
                    
                    // Genre-based inference
                    const fictionGenres = ['romance', 'mystery', 'thriller', 'fantasy', 'science fiction', 
                                          'horror', 'adventure', 'literary', 'drama', 'suspense'];
                    const nonFictionGenres = ['biography', 'history', 'science', 'philosophy', 'religion',
                                             'self-help', 'health', 'business', 'politics', 'economics'];
                    
                    const hasFictionGenre = fictionGenres.some(genre => 
                        label.includes(genre) || term.includes(genre),
                    );
                    const hasNonFictionGenre = nonFictionGenres.some(genre => 
                        label.includes(genre) || term.includes(genre),
                    );
                    
                    if (hasFictionGenre) hasFiction = true;
                    if (hasNonFictionGenre) hasNonFiction = true;
                }
            });
        }
        
        // Check subjects for fiction classification
        if (book.subjects && book.subjects.length > 0) {
            book.subjects.forEach(subject => {
                const subjectLower = subject.toLowerCase();
                
                if (subjectLower.includes('fiction') && !subjectLower.includes('non-fiction')) {
                    hasFiction = true;
                }
                if (subjectLower.includes('non-fiction') || subjectLower.includes('nonfiction')) {
                    hasNonFiction = true;
                }
                
                // Genre-based inference
                const fictionGenres = ['romance', 'mystery', 'thriller', 'fantasy', 'science fiction', 
                                      'horror', 'adventure', 'literary', 'drama', 'suspense'];
                const nonFictionGenres = ['biography', 'history', 'science', 'philosophy', 'religion',
                                         'self-help', 'health', 'business', 'politics', 'economics'];
                
                const hasFictionGenre = fictionGenres.some(genre => subjectLower.includes(genre));
                const hasNonFictionGenre = nonFictionGenres.some(genre => subjectLower.includes(genre));
                
                if (hasFictionGenre) hasFiction = true;
                if (hasNonFictionGenre) hasNonFiction = true;
            });
        }
    });
    
    if (hasFiction) modes.add('fiction');
    if (hasNonFiction) modes.add('non-fiction');
    
    return Array.from(modes);
};

export const filterBooksByMedia = (books: CatalogBook[], mediaMode: MediaMode): CatalogBook[] => {
    if (mediaMode === 'all') {
        return books;
    }
    
    return books.filter(book => {
        // Check both mediaType and acquisitionMediaType for compatibility
        const mediaType = (book.mediaType || book.acquisitionMediaType)?.toLowerCase();
        const format = book.format?.toUpperCase();
        
        if (mediaMode === 'ebook') {
            // Match ebooks by media type, format, or default
            return mediaType?.includes('bib.schema.org/book') ||
                   mediaType?.includes('schema.org/ebook') || 
                   mediaType?.includes('ebook') ||
                   format === 'EPUB' ||
                   format === 'PDF' ||
                   (!mediaType && format !== 'AUDIOBOOK'); // Default to ebook if no media type and not audiobook
        } else if (mediaMode === 'audiobook') {
            // Match audiobooks by media type or format
            return mediaType?.includes('bib.schema.org/audiobook') ||
                   mediaType?.includes('audiobook') ||
                   format === 'AUDIOBOOK';
        }
        
        return false;
    });
};

export const getAvailableMediaModes = (books: CatalogBook[]): MediaMode[] => {
    const modes: Set<MediaMode> = new Set(['all']); // Always include 'all'
    
    books.forEach((book) => {
        // Check both mediaType and acquisitionMediaType for compatibility
        const mediaType = book.mediaType || book.acquisitionMediaType;
        const mediaTypeLower = mediaType?.toLowerCase();
        const format = book.format?.toUpperCase();
        
        // Check for audiobooks - either by media type or format
        if (mediaTypeLower?.includes('bib.schema.org/audiobook') || 
            mediaTypeLower?.includes('audiobook') ||
            mediaType === 'http://bib.schema.org/Audiobook' ||
            format === 'AUDIOBOOK') {
            modes.add('audiobook');
        }
        
        // Check for ebooks - by media type, format, or default
        if (mediaTypeLower?.includes('bib.schema.org/book') || 
            mediaTypeLower?.includes('schema.org/ebook') || 
            mediaTypeLower?.includes('ebook') || 
            mediaType === 'http://bib.schema.org/Book' ||
            mediaType === 'http://schema.org/EBook' ||
            format === 'EPUB' ||
            format === 'PDF' ||
            (!mediaType && format !== 'AUDIOBOOK')) {
            modes.add('ebook');
        }
    });
    
    const result = Array.from(modes);
    return result;
};

export const filterBooksByCollection = (books: CatalogBook[], collectionMode: CollectionMode, navLinks: CatalogNavigationLink[] = []): CatalogBook[] => {
    if (collectionMode === 'all') return books;
    
    // Check if this collection exists as a navigation link
    const collectionNavLink = navLinks.find(link => 
        (link.rel === 'collection' || link.rel === 'subsection') && link.title === collectionMode,
    );
    
    // If it's a navigation-based collection, we should navigate rather than filter
    // For now, just return the books as-is, since navigation will be handled at the component level
    if (collectionNavLink) {
        return books;
    }
    
    // Filter books that have this collection in their metadata
    return books.filter(book => {
        return book.collections?.some(collection => collection.title === collectionMode);
    });
};

export const getAvailableCategories = (books: CatalogBook[], navLinks: CatalogNavigationLink[] = []): string[] => {
    const categories = new Set<string>();
    
    // Extract categories from individual books  
    books.forEach(book => {
        if (book.collections && book.collections.length > 0) {
            book.collections.forEach(collection => {
                // Only include categories (groups) - exclude true collections (feeds)
                const isCategory = collection.href.includes('/groups/') || 
                                  collection.title.toLowerCase() === 'fiction' ||
                                  collection.title.toLowerCase() === 'nonfiction' ||
                                  collection.title.toLowerCase().includes('young adult') ||
                                  collection.title.toLowerCase().includes('children');
                
                if (isCategory) {
                    categories.add(collection.title);
                }
            });
        }
    });
    
    // Extract categories from navigation links
    navLinks.forEach(link => {
        if (link.rel === 'collection' || link.rel === 'subsection') {
            // Only include categories (groups)
            const isCategory = link.url.includes('/groups/') || 
                              link.title.toLowerCase() === 'fiction' ||
                              link.title.toLowerCase() === 'nonfiction' ||
                              link.title.toLowerCase().includes('young adult') ||
                              link.title.toLowerCase().includes('children');
            
            if (isCategory) {
                categories.add(link.title);
            }
        }
    });
    
    return Array.from(categories).sort();
};

export const getAvailableCollections = (books: CatalogBook[], navLinks: CatalogNavigationLink[] = []): string[] => {
    const collections = new Set<string>();
    
    // Extract collections from individual books, filtering out categories
    books.forEach(book => {
        if (book.collections && book.collections.length > 0) {
            book.collections.forEach(collection => {
                // Filter out categories (groups) - only include true collections (feeds)
                const isCategory = collection.href.includes('/groups/') || 
                                  collection.title.toLowerCase() === 'fiction' ||
                                  collection.title.toLowerCase() === 'nonfiction' ||
                                  collection.title.toLowerCase().includes('young adult') ||
                                  collection.title.toLowerCase().includes('children');
                
                if (!isCategory) {
                    collections.add(collection.title);
                }
            });
        }
    });
    
    // Extract collections from navigation links BUT exclude category groupings  
    // In Palace OPDS: /feed/ URLs are collections, /groups/ URLs are categories
    navLinks.forEach(link => {
        if (link.rel === 'collection' || link.rel === 'subsection') {
            // Distinguish between collections and categories based on URL pattern
            const isCategory = link.url.includes('/groups/') || 
                              link.title.toLowerCase() === 'fiction' ||
                              link.title.toLowerCase() === 'nonfiction' ||
                              link.title.toLowerCase().includes('young adult') ||
                              link.title.toLowerCase().includes('children');
            
            if (!isCategory) {
                collections.add(link.title);
            }
        }
    });
    
    return Array.from(collections).sort();
};export const groupBooksByMode = (books: CatalogBook[], navLinks: CatalogNavigationLink[], pagination: CatalogPagination, mode: CategorizationMode, audienceMode: AudienceMode = 'all', fictionMode: FictionMode = 'all', mediaMode: MediaMode = 'all', collectionMode: CollectionMode = 'all'): CatalogWithCategories => {
    // Apply all filters first
    let filteredBooks = books;
    if (mediaMode !== 'all') {
        filteredBooks = filterBooksByMedia(filteredBooks, mediaMode);
    }
    
    if (fictionMode !== 'all') {
        filteredBooks = filterBooksByFiction(filteredBooks, fictionMode);
    }
    
    if (audienceMode !== 'all') {
        filteredBooks = filterBooksByAudience(filteredBooks, audienceMode);
    }
    
    if (collectionMode !== 'all') {
        filteredBooks = filterBooksByCollection(filteredBooks, collectionMode, navLinks);
    }

    const categoryMap = new Map<string, { category: Category, books: CatalogBook[] }>();
    const collectionLinksSet = new Set<string>();
    const uncategorizedBooks: CatalogBook[] = [];

    filteredBooks.forEach(book => {
        let hasCategory = false;
        
        // Handle actual categories from OPDS parsing (preferred)
        if (book.categories && book.categories.length > 0) {
            book.categories.forEach(category => {
                const key = `${category.scheme}|${category.label}`;
                if (!categoryMap.has(key)) {
                    categoryMap.set(key, {
                        category,
                        books: [],
                    });
                }
                categoryMap.get(key)!.books.push(book);
                hasCategory = true;
            });
        } else if (mode === 'subject' && book.subjects && book.subjects.length > 0) {
            // Use subjects as categories (fallback for when categories aren't available)
            book.subjects.forEach(subject => {
                // Create a synthetic category from the subject
                const syntheticCategory: Category = {
                    scheme: 'http://palace.io/subjects',
                    term: subject.toLowerCase().replace(/\s+/g, '-'),
                    label: subject,
                };
                
                const key = `${syntheticCategory.scheme}|${syntheticCategory.label}`;
                if (!categoryMap.has(key)) {
                    categoryMap.set(key, {
                        category: syntheticCategory,
                        books: [],
                    });
                }
                categoryMap.get(key)!.books.push(book);
                hasCategory = true;
            });
        }
        
        // Extract collection links for navigation (from original books, not filtered)
        if (book.collections && book.collections.length > 0) {
            book.collections.forEach(collection => {
                collectionLinksSet.add(JSON.stringify(collection));
            });
        }
        
        if (!hasCategory) {
            uncategorizedBooks.push(book);
        }
    });

    // Use original books for collection link extraction (not filtered)
    books.forEach(book => {
        if (book.collections && book.collections.length > 0) {
            book.collections.forEach(collection => {
                collectionLinksSet.add(JSON.stringify(collection));
            });
        }
    });

    const categoryLanes = Array.from(categoryMap.values()).map(categoryGroup => {
        // Sort books within each category lane
        let sortedBooks = categoryGroup.books;
        
        // For series, sort by position if available
        if (categoryGroup.category.scheme === 'http://opds-spec.org/series') {
            sortedBooks = [...categoryGroup.books].sort((a, b) => {
                const aPos = a.series?.position || 0;
                const bPos = b.series?.position || 0;
                return aPos - bPos;
            });
        }
        
        return {
            ...categoryGroup,
            books: sortedBooks,
        };
    });
    const collectionLinks = Array.from(collectionLinksSet).map(json => JSON.parse(json));
    
    return {
        books: filteredBooks,
        navLinks,
        pagination,
        categoryLanes,
        collectionLinks,
        uncategorizedBooks,
    };
};

export const extractCollectionNavigation = (books: CatalogBook[]): Collection[] => {
    // Extract unique collection navigation links from OPDS 1 books
    const collectionMap = new Map<string, Collection>();
    
    books.forEach(book => {
        if (book.collections && book.collections.length > 0) {
            book.collections.forEach(collection => {
                // Use href as the unique key since titles might not be unique
                if (!collectionMap.has(collection.href)) {
                    collectionMap.set(collection.href, collection);
                }
            });
        }
    });
    
    return Array.from(collectionMap.values());
};

// Keep the old function for backward compatibility, but make it work with OPDS 1 collections
export const groupBooksByCollections = (books: CatalogBook[], navLinks: CatalogNavigationLink[], pagination: CatalogPagination): CatalogWithCollections => {
    // Simple implementation that groups books by their collection property
    const collectionMap = new Map<string, CatalogBook[]>();
    const uncategorizedBooks: CatalogBook[] = [];
    
    books.forEach(book => {
        if (book.collections && book.collections.length > 0) {
            book.collections.forEach(collection => {
                const key = collection.title;
                if (!collectionMap.has(key)) {
                    collectionMap.set(key, []);
                }
                collectionMap.get(key)!.push(book);
            });
        } else {
            uncategorizedBooks.push(book);
        }
    });
    
    const collections: CollectionGroup[] = Array.from(collectionMap.entries()).map(([title, books]) => ({
        collection: {
            title: title,
            href: books[0]?.collections?.find(c => c.title === title)?.href || '',
        },
        books,
    }));
    
    return {
        books,
        navLinks,
        pagination,
        collections,
        uncategorizedBooks,
    };
};

export const groupBooksByCategories = (books: CatalogBook[], navLinks: CatalogNavigationLink[], pagination: CatalogPagination): CatalogWithCategories => {
    // Group books by their formal categories
    const categoryMap = new Map<string, { category: Category, books: CatalogBook[] }>();
    const uncategorizedBooks: CatalogBook[] = [];
    
    books.forEach(book => {
        let hasCategory = false;
        
        if (book.categories && book.categories.length > 0) {
            book.categories.forEach(category => {
                const key = `${category.scheme}|${category.label}`;
                if (!categoryMap.has(key)) {
                    categoryMap.set(key, {
                        category,
                        books: [],
                    });
                }
                categoryMap.get(key)!.books.push(book);
                hasCategory = true;
            });
        }
        
        if (!hasCategory) {
            uncategorizedBooks.push(book);
        }
    });
    
    const categoryLanes = Array.from(categoryMap.values());
    
    return {
        books,
        navLinks,
        pagination,
        categoryLanes,
        collectionLinks: [],
        uncategorizedBooks,
    };
};

export const filterRedundantCategories = (categoryLanes: { category: Category, books: CatalogBook[] }[]): { category: Category, books: CatalogBook[] }[] => {
    // Simple implementation that removes categories with very few books
    return categoryLanes.filter(lane => lane.books.length >= 2);
};

export const groupBooksByCollectionsAsLanes = (books: CatalogBook[], navLinks: CatalogNavigationLink[], pagination: CatalogPagination): CatalogWithCategories => {
    // Alternative implementation that treats collections as category lanes
    const collectionMap = new Map<string, CatalogBook[]>();
    const uncategorizedBooks: CatalogBook[] = [];
    
    books.forEach(book => {
        if (book.collections && book.collections.length > 0) {
            book.collections.forEach(collection => {
                const key = collection.title;
                if (!collectionMap.has(key)) {
                    collectionMap.set(key, []);
                }
                collectionMap.get(key)!.push(book);
            });
        } else {
            uncategorizedBooks.push(book);
        }
    });
    
    const categoryLanes = Array.from(collectionMap.entries()).map(([title, books]) => {
        // Find the first book with collections to get the href for the term
        const firstBookWithCollections = books.find(book => book.collections && book.collections.length > 0);
        const collection = firstBookWithCollections?.collections?.find(c => c.title === title);
        const term = collection?.href || title.toLowerCase().replace(/\s+/g, '-');
        
        return {
            category: {
                scheme: 'http://opds-spec.org/collection',
                term,
                label: title,
            },
            books,
        };
    });
    
    // Extract collection links from books
    const collectionLinksMap = new Map<string, { title: string; href: string }>();
    books.forEach(book => {
        if (book.collections) {
            book.collections.forEach(collection => {
                collectionLinksMap.set(collection.title, collection);
            });
        }
    });
    
    const collectionLinks = Array.from(collectionLinksMap.values());
    
    return {
        books,
        navLinks,
        pagination,
        categoryLanes,
        collectionLinks,
        uncategorizedBooks,
    };
};