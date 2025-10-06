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
          const mimeType = acquisitionLink?.getAttribute('type') || '';
          const format = getFormatFromMimeType(mimeType);
          
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
                  format
              });
          }
      } else if (subsectionLink) {
          const navUrl = subsectionLink?.getAttribute('href');
          if (navUrl) {
              navLinks.push({ title, url: new URL(navUrl, baseUrl).href, rel: 'subsection' });
          }
      }
    });

    return { books, navLinks, pagination };
}

export const parseOpds2Json = (jsonData: any, baseUrl: string): { books: CatalogBook[], navLinks: CatalogNavigationLink[], pagination: CatalogPagination } => {
    if (!jsonData || typeof jsonData !== 'object') {
        throw new Error('Invalid catalog format. The response was not a valid JSON object.');
    }
    if (!jsonData.metadata || (!jsonData.publications && !jsonData.navigation)) {
        throw new Error('Invalid catalog format. The JSON file is missing required OPDS 2.0 fields like "metadata", "publications", or "navigation".');
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
                    format
                });
            }
        });
    }

    if (jsonData.navigation && Array.isArray(jsonData.navigation)) {
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
        const response = await fetch(proxyUrl);
        
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