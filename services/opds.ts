import { CatalogBook, CatalogNavigationLink, CatalogPagination } from '../types';
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
                    // eslint-disable-next-line no-await-in-loop
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
    // For ambiguous/non-media types (atom, opds catalog entries, etc.) return undefined so UI doesn't show raw mime strings
    return undefined;
};

export const parseOpds1Xml = (xmlText: string, baseUrl: string): { books: CatalogBook[], navLinks: CatalogNavigationLink[], pagination: CatalogPagination } => {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'application/xml');

    const errorNode = xmlDoc.querySelector('parsererror');
    if (errorNode) {
      console.error("XML Parsing Error:", errorNode.textContent);
      throw new Error('Failed to parse catalog feed. The URL may not point to a valid OPDS feed, or the response was not valid XML.');
    }

    // Add check for the root <feed> element to validate it's an Atom feed.
    const rootNodeName = xmlDoc.documentElement?.nodeName;
    if (!rootNodeName || (rootNodeName.toLowerCase() !== 'feed' && !rootNodeName.endsWith(':feed'))) {
        throw new Error("Invalid Atom/OPDS feed. The XML document is missing the root <feed> element.");
    }

    const entries = Array.from(xmlDoc.querySelectorAll('entry'));
    const books: CatalogBook[] = [];
    const navLinks: CatalogNavigationLink[] = [];
    const pagination: CatalogPagination = {};
    
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
      
      const acquisitionLink = allLinks.find(link => {
          const rel = link.getAttribute('rel') || '';
          const type = link.getAttribute('type') || '';
          return rel.includes('opds-spec.org/acquisition') && (type.includes('epub+zip') || type.includes('pdf'));
      }) || allLinks.find(link => (link.getAttribute('rel') || '').includes('opds-spec.org/acquisition'));

    const subsectionLink = entry.querySelector('link[rel="subsection"], link[rel="http://opds-spec.org/subsection"]');

      if (acquisitionLink) {
          const author = entry.querySelector('author > name')?.textContent?.trim() || 'Unknown Author';
          const summary = entry.querySelector('summary')?.textContent?.trim() || entry.querySelector('content')?.textContent?.trim() || null;
          const coverLink = entry.querySelector('link[rel="http://opds-spec.org/image"]');
          
          const coverImageHref = coverLink?.getAttribute('href');
          const coverImage = coverImageHref ? new URL(coverImageHref, baseUrl).href : null;
          
                    const downloadUrlHref = acquisitionLink?.getAttribute('href');

                    // Try to determine media type: prefer the link's type attribute; if that
                    // is not a media type, inspect nested opds:indirectAcquisition elements
                    // (some OPDS feeds place the real media type there).
                    const mimeType = acquisitionLink?.getAttribute('type') || '';
                    let format = getFormatFromMimeType(mimeType);

                    if (!format) {
                        // Recursively search for child elements named 'indirectAcquisition' to find a type
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
          const publicationDate = (entry.querySelector('issued')?.textContent || entry.querySelector('dc\\:issued')?.textContent || entry.querySelector('published')?.textContent)?.trim();
          const identifiers = Array.from(entry.querySelectorAll('identifier, dc\\:identifier'));
          const providerId = identifiers[0]?.textContent?.trim() || undefined;

          const subjects = Array.from(entry.querySelectorAll('category'))
              .map(cat => cat.getAttribute('term')?.trim())
              .filter((term): term is string => !!term);

          if(downloadUrlHref) {
              const downloadUrl = new URL(downloadUrlHref, baseUrl).href;
              books.push({ 
                  title, 
                  author, 
                  coverImage, 
                  downloadUrl, 
                  summary, 
                  publisher: publisher || undefined, 
                  publicationDate: publicationDate || undefined, 
                  providerId, 
                  subjects: subjects.length > 0 ? subjects : undefined,
                  format,
                  acquisitionMediaType: mimeType || undefined
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

    // Add check to see if a valid Atom feed contains no OPDS content.
    if (entries.length > 0 && books.length === 0 && navLinks.length === 0) {
        throw new Error("This appears to be a valid Atom feed, but it contains no recognizable OPDS book entries or navigation links. Please ensure the URL points to an OPDS catalog.");
    }

    return { books, navLinks, pagination };
}

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
                    }).filter((s): s is string => !!s);
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
                    format,
                    acquisitionMediaType: mimeType || undefined
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
}

export const fetchCatalogContent = async (url: string, baseUrl: string, forcedVersion: 'auto' | '1' | '2' = 'auto'): Promise<{ books: CatalogBook[], navLinks: CatalogNavigationLink[], pagination: CatalogPagination, error?: string }> => {
    try {
        // Some providers (notably Palace / palace.io and related hosts) operate
        // primarily for native clients and don't expose CORS consistently. For
        // those hosts we should force requests through our owned proxy so the
        // browser won't be blocked. Detect palace-like hosts and skip the probe.
    const hostname = (() => { try { return new URL(url).hostname.toLowerCase(); } catch { return ''; } })();
    const isPalaceHost = hostname.endsWith('palace.io') || hostname.endsWith('palaceproject.io') || hostname === 'palace.io' || hostname.endsWith('.palace.io');

    // Diagnostic: log host classification so we can confirm palace hosts are being
    // forced through the owned proxy and that the fetchUrl matches expectations.
    // eslint-disable-next-line no-console
    console.debug('[mebooks] fetchCatalogContent - hostname:', hostname, 'isPalaceHost:', isPalaceHost, 'forcedVersion:', forcedVersion);

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
        // For Palace-hosted servers we prefer XML/Atom regardless of the forcedVersion
        // because many palace endpoints respond better to XML-first Accept headers.
        const acceptHeader = isPalaceHost || forcedVersion === '1'
            ? 'application/atom+xml;profile=opds-catalog, application/xml, text/xml, application/opds+json;q=0.8, application/json;q=0.6, */*;q=0.4'
            : 'application/opds+json, application/atom+xml;profile=opds-catalog;q=0.9, application/json;q=0.8, application/xml;q=0.7, */*;q=0.5';

        // FIX: Added specific Accept header to signal preference for OPDS formats.
        // Diagnostic: log which URL we'll fetch so the browser console shows whether
        // a proxied URL or the direct URL is used.
        // eslint-disable-next-line no-console
        console.debug('[mebooks] fetchCatalogContent - fetchUrl:', fetchUrl, 'accept:', acceptHeader);
        const response = await fetch(fetchUrl, {
            method: 'GET',
            mode: 'cors',
            headers: {
                'Accept': acceptHeader
            }
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
        const usedDirect = fetchUrl === url;
    if ((isRedirect || (usedDirect && !hasCorsHeader)) && proxiedUrl) {
            const proxyFetchUrl = proxiedUrl(url);
            const proxiedResp = await fetch(proxyFetchUrl, {
                method: 'GET',
                headers: {
                    'Accept': acceptHeader
                }
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
                        // eslint-disable-next-line no-console
                        console.warn('[mebooks] Failed to JSON.parse proxied response; first bytes (base64):', b64);
                        throw new Error(`Failed to parse proxied JSON response for ${url}. First bytes (base64): ${b64}`);
                    }
                } else if (contentType.includes('application/atom+xml') || contentType.includes('application/xml') || contentType.includes('text/xml')) {
                    return parseOpds1Xml(responseText, baseUrl);
                } else {
                    if (forcedVersion !== '1' && responseText.trim().startsWith('{')) {
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
                const b64 = await captureFirstBytes(response).catch(() => '');
                // eslint-disable-next-line no-console
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
        console.error("Error fetching or parsing catalog content:", error);
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
            message = "Failed to parse the catalog feed. The response was not valid JSON or XML.";
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
    let current = href;

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
            if (preferGetWhenCreds) {
                resp = await fetch(current, { method: 'GET', headers: makeHeaders(true) });
                if (resp.status === 405) resp = await fetch(current, { method: 'POST', headers: makeHeaders(true) });
            } else {
                resp = await fetch(current, { method: 'POST', headers: makeHeaders(false) });
                if (resp.status === 405) resp = await fetch(current, { method: 'GET', headers: makeHeaders(false) });
            }
        } catch (e) {
            throw e;
        }

        if (!resp) return null;

        // Follow redirects via Location
        if (resp.status >= 300 && resp.status < 400) {
            const loc = (resp.headers && typeof resp.headers.get === 'function') ? (resp.headers.get('Location') || resp.headers.get('location')) : null;
            if (loc) return new URL(loc, current).href;
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
                        return new URL(hrefAttr, current).href;
                    }
                }
            } catch (e) {
                // ignore parse errors
            }

            // Fallback: if content-type indicates binary, return current
            const ct = (resp.headers && typeof resp.headers.get === 'function') ? resp.headers.get('Content-Type') || '' : '';
            if (ct.includes('application/epub') || ct.includes('application/pdf') || ct.includes('application/octet-stream')) {
                return current;
            }
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
            throw err;
        }

        break;
    }

    return null;
};