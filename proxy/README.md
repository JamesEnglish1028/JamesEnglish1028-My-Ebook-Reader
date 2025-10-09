# MeBooks Proxy

This folder contains a minimal Express-based proxy you can deploy to avoid browser CORS issues when fetching OPDS/catalog content or book files.

Usage

1. Install dependencies and run locally:

```bash
cd proxy
npm ci
npm start
```

2. Environment variables

- HOST_ALLOWLIST: comma-separated hostnames the proxy will allow (default: `opds.example,cdn.example`)
- ALLOW_ORIGIN: the origin(s) allowed for CORS responses (default: `*`) — set to your app origin in production
- PROXY_KEY: optional API key required via `x-proxy-key` header to use the proxy
- PORT: port to listen on (default 8080)

3. Example Docker

Build and run:

```bash
docker build -t mebooks-proxy ./proxy
docker run -e HOST_ALLOWLIST=opds.example,cdn.example -e ALLOW_ORIGIN=https://myapp.example -p 8080:8080 mebooks-proxy
```

4. Integration with client

If you run your proxy at `https://proxy.myapp.example/proxy`, update the client environment in your Vite setup:

```bash
VITE_OWN_PROXY_URL=https://proxy.myapp.example/proxy
VITE_FORCE_PROXY=false
```

Then the app will prefer direct requests but use the proxy when `maybeProxyForCors` determines CORS blocks access.

Security notes

- Use a tight `HOST_ALLOWLIST`.
- Use `PROXY_KEY` or other auth in production.
- Rate-limit and monitor usage.
- Prefer deploying to Cloud Run / container platform for reliable streaming of large files.
