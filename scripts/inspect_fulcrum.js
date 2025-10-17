(async () => {
  try {
    const url = 'https://www.fulcrum.org/api/opds';
    console.log('Fetching:', url);
    const resp = await fetch(url, { headers: { Accept: 'application/opds+json, application/json, */*' } });
    const ct = resp.headers.get('content-type') || '';
    console.log('Status:', resp.status, 'Content-Type:', ct);
    const text = await resp.text();
    let json = null;
    try { json = JSON.parse(text); } catch (e) { console.error('Failed to parse JSON'); process.exit(2); }

    const navLinks = [];
    const books = [];
    const pagination = {};

    // parse top-level links for pagination
    if (Array.isArray(json.links)) {
      for (const link of json.links) {
        if (link.href && link.rel) {
          const rel = Array.isArray(link.rel) ? link.rel[0] : link.rel;
          const fullUrl = new URL(link.href, url).href;
          if (rel === 'next') pagination.next = fullUrl;
          if (rel === 'previous') pagination.prev = fullUrl;
          if (rel === 'first') pagination.first = fullUrl;
          if (rel === 'last') pagination.last = fullUrl;
        }
      }
    }

    // catalogs convention
    if (Array.isArray(json.catalogs) && json.catalogs.length > 0) {
      for (const cat of json.catalogs) {
        const title = cat?.metadata?.title || cat?.title || null;
        // find link rel= http://opds-spec.org/catalog or type application/opds+json
        const link = (Array.isArray(cat.links) ? cat.links : (cat.links ? [cat.links] : [])).find(l => (l.rel === 'http://opds-spec.org/catalog' || l.type === 'application/opds+json' || l.href));
        if (title && link && link.href) {
          navLinks.push({ title: String(title).trim(), url: new URL(link.href, url).href, rel: 'subsection', isCatalog: true });
        }
      }
    }

    // fallback to navigation
    if (navLinks.length === 0 && Array.isArray(json.navigation)) {
      for (const link of json.navigation) {
        if (link.href && link.title) {
          navLinks.push({ title: String(link.title).replace(/\n/g, ' ').trim(), url: new URL(link.href, url).href, rel: link.rel || '' });
        }
      }
    }

    console.log('Parsed results:');
    console.log('Books count:', books.length);
    console.log('NavLinks count:', navLinks.length);
    console.log('Pagination:', pagination);
    console.log('First 10 navLinks:');
    console.log(navLinks.slice(0, 10));

  } catch (e) {
    console.error('Error:', e);
    process.exit(1);
  }
})();
