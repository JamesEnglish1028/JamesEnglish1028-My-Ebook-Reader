addEventListener('fetch', event => {
  event.respondWith(handle(event.request));
});

async function handle(request) {
  const url = new URL(request.url);
  const target = url.searchParams.get('url');
  if (!target) return new Response(JSON.stringify({ error: 'Missing url parameter' }), { status: 400, headers: { 'content-type': 'application/json' } });

  // Only allow GET/HEAD/POST for simplicity
  const upstream = target;

  // Build headers to forward, excluding hop-by-hop and host-specific headers
  const out = new Headers();
  for (const [k, v] of request.headers.entries()) {
    const lk = k.toLowerCase();
    if (['host', 'connection', 'upgrade', 'proxy-authorization', 'proxy-authenticate', 'keep-alive', 'te', 'trailers', 'transfer-encoding'].includes(lk)) continue;
    out.set(k, v);
  }

  // Force CORS response headers to allow the calling origin
  const origin = request.headers.get('origin') || '*';

  try {
    const resp = await fetch(upstream, { method: request.method, headers: out, body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body });
    const headers = new Headers(resp.headers);
    // Remove content-encoding so the browser doesn't try to double-decode
    headers.delete('content-encoding');
    // Attach CORS headers
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Access-Control-Allow-Credentials', 'true');
    headers.set('Access-Control-Expose-Headers', 'Content-Type,Content-Length,ETag');

    const body = resp.body;
    return new Response(body, { status: resp.status, headers });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Upstream fetch failed', details: String(e) }), { status: 502, headers: { 'content-type': 'application/json', 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Credentials': 'true' } });
  }
}
