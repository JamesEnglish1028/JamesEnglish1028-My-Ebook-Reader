import { CatalogBook, CatalogNavigationLink, CatalogPagination } from '../types';
import { proxiedUrl } from './utils';

export const getFormatFromMimeType = (mimeType: string): string | undefined => {
    if (!mimeType) return 'EPUB'; // Default to EPUB if type is missing for an acquisition link
    if (mimeType.includes('epub+zip')) return 'EPUB';
    if (mimeType.includes('pdf')) return 'PDF';
    return mimeType.split('/')[1]?.toUpperCase() || undefined;
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

      // Build acquisitionLinks array from entry <link> elements
      const acquisitionLinks = allLinks.map(link => ({
          rel: link.getAttribute('rel') || '',
          href: link.getAttribute('href') || '',
          type: link.getAttribute('type') || '',
          title: link.getAttribute('title') || undefined
      }));

      // prefer a link that is an acquisition and indicates a downloadable content type
      const acquisitionLink = allLinks.find(link => {
          const rel = link.getAttribute('rel') || '';
          const type = link.getAttribute('type') || '';
          return rel.includes('opds-spec.org/acquisition') && (type.includes('epub+zip') || type.includes('pdf') || type.includes('zip'));
      }) || allLinks.find(link => (link.getAttribute('rel') || '').includes('opds-spec.org/acquisition')) || allLinks[0];

      const subsectionLink = entry.querySelector('link[rel="subsection"], link[rel="http://opds-spec.org/subsection"]');

      // Determine cover
      const coverLink = entry.querySelector('link[rel="http://opds-spec.org/image"]');
      const coverImageHref = coverLink?.getAttribute('href');
      const coverImage = coverImageHref ? new URL(coverImageHref, baseUrl).href : null;

      // Common metadata
      const author = entry.querySelector('author > name')?.textContent?.trim() || 'Unknown Author';
      const summary = entry.querySelector('summary')?.textContent?.trim() || entry.querySelector('content')?.textContent?.trim() || null;
      const publisher = (entry.querySelector('publisher')?.textContent || entry.querySelector('dc\\:publisher')?.textContent)?.trim();
      const publicationDate = (entry.querySelector('issued')?.textContent || entry.querySelector('dc\\:issued')?.textContent || entry.querySelector('published')?.textContent)?.trim();
      const identifiers = Array.from(entry.querySelectorAll('identifier, dc\\:identifier'));
      const providerId = identifiers[0]?.textContent?.trim() || undefined;
      const subjects = Array.from(entry.querySelectorAll('category'))
          .map(cat => cat.getAttribute('term')?.trim())
          .filter((term): term is string => !!term);

      if (acquisitionLink) {
          const downloadUrlHref = acquisitionLink.getAttribute('href');
          const mimeType = acquisitionLink.getAttribute('type') || '';
          const format = getFormatFromMimeType(mimeType);

          // detect borrow links: rel may include 'acquisition/borrow' or explicitly be the borrow rel
          const borrowLinkEl = allLinks.find(link => {
              const rel = link.getAttribute('rel') || '';
              const type = link.getAttribute('type') || '';
              // OPDS1 feeds often mark borrow entries with rel including 'acquisition/borrow'
              if (rel.includes('acquisition/borrow') || rel.endsWith('/borrow') || rel === 'http://opds-spec.org/acquisition/borrow') return !!link.getAttribute('href');
              // Some servers expose borrow via an entry link (Atom entry) with type application/atom+xml;type=entry;profile=opds-catalog
              if (type.includes('application/atom+xml') && type.includes('profile=opds-catalog')) return !!link.getAttribute('href');
              return false;
          });

          const isBorrowable = !!borrowLinkEl;
          const borrowUrl = borrowLinkEl?.getAttribute('href') ? new URL(borrowLinkEl!.getAttribute('href')!, baseUrl).href : undefined;

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
                  acquisitionLinks,
                  isBorrowable,
                  borrowUrl
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

            const links = Array.isArray(pub.links) ? pub.links : [];
            const acquisitionLink = links.find((l: any) => typeof l.rel === 'string' && l.rel.includes('opds-spec.org/acquisition')) || links.find((l: any) => typeof l.rel === 'string' && l.rel.includes('opds-spec.org'));
            const coverLink = pub.images?.[0];

            if (links.length > 0) {
                // normalize acquisition links and try to find a primary downloadable link
                const acquisitionLinks = links.map((l: any) => ({ rel: l.rel, href: l.href, type: l.type, properties: l.properties }));

                // prefer a content link that indicates an EPUB/PDF; fall back to the first acquisition-style link or the first link
                const contentLink = links.find((l: any) => {
                    const rel = l.rel || '';
                    const type = l.type || '';
                    return typeof rel === 'string' && rel.includes('opds-spec.org/acquisition') && (type.includes('epub') || type.includes('pdf') || type.includes('zip'));
                }) || links.find((l: any) => typeof l.rel === 'string' && l.rel.includes('opds-spec.org/acquisition')) || links[0];

                const downloadUrl = contentLink?.href ? new URL(contentLink.href, baseUrl).href : undefined;
                const coverImage = coverLink?.href ? new URL(coverLink.href, baseUrl).href : null;
                const mimeType = contentLink?.type || '';
                const format = getFormatFromMimeType(mimeType);

                // find a borrow link (OPDS2 rel may be a string or an array)
                const borrowLink = links.find((l: any) => {
                    const rel = l.rel;
                    if (Array.isArray(rel)) return rel.some((r: string) => typeof r === 'string' && (r.includes('acquisition/borrow') || r.endsWith('/borrow')));
                    if (typeof rel === 'string') return rel.includes('acquisition/borrow') || rel.endsWith('/borrow') || rel === 'http://opds-spec.org/acquisition/borrow';
                    return false;
                });
                const isBorrowable = !!borrowLink;
                const borrowUrl = borrowLink?.href ? new URL(borrowLink.href, baseUrl).href : undefined;

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
                    downloadUrl: downloadUrl || '', 
                    summary, 
                    publisher, 
                    publicationDate, 
                    providerId, 
                    subjects: subjects.length > 0 ? subjects : undefined,
                    format,
                    acquisitionLinks,
                    isBorrowable,
                    borrowUrl
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

export const fetchCatalogContent = async (url: string, baseUrl: string): Promise<{ books: CatalogBook[], navLinks: CatalogNavigationLink[], pagination: CatalogPagination, error?: string }> => {
    try {
        const proxyUrl = proxiedUrl(url);
        // FIX: Added specific Accept header to signal preference for OPDS formats.
        const response = await fetch(proxyUrl, {
            headers: {
                'Accept': 'application/opds+json, application/atom+xml;profile=opds-catalog;q=0.9, application/json;q=0.8, application/xml;q=0.7, */*;q=0.5'
            }
        });
        
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
        const responseText = await response.text();

        // FIX: Add specific check for HTML response from a faulty proxy
        if (contentType.includes('text/html') && responseText.trim().toLowerCase().startsWith('<!doctype html>')) {
             throw new Error('The CORS proxy returned an HTML page instead of the catalog feed. This might indicate the proxy service is down or blocking the request. Please try another catalog or check back later.');
        }

        if (contentType.includes('application/opds+json') || contentType.includes('application/json')) {
            const jsonData = JSON.parse(responseText);
            return parseOpds2Json(jsonData, baseUrl);
        } else if (contentType.includes('application/atom+xml') || contentType.includes('application/xml') || contentType.includes('text/xml')) {
            return parseOpds1Xml(responseText, baseUrl);
        } else {
            // Attempt to auto-detect format if Content-Type is vague (e.g., text/plain)
            if (responseText.trim().startsWith('{')) {
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