# Owned CORS Proxy Quickstart

This project ships a minimal Express proxy in `proxy/` that MeBooks can use to avoid public CORS proxies which often strip `Authorization` and block POST requests. Below are two quick options you can deploy fast: Express (container) and a Cloudflare Worker.

1) Express (recommended for full streaming and file size handling)

- Files: `proxy/index.js`, `proxy/Dockerfile`.
- Example env vars:
  - `HOST_ALLOWLIST` — comma-separated allowed upstream hosts (e.g. `opds.example,cdn.example`).
  - `ALLOW_ORIGIN` — set to your app origin (e.g. `https://myapp.example`) for production.
  - `PROXY_KEY` — optional API key expected on `x-proxy-key` header.

To run locally:

```bash
cd proxy
npm ci
export HOST_ALLOWLIST=opds.example,cdn.example
export ALLOW_ORIGIN=http://localhost:5173
npm start
```

Set `VITE_OWN_PROXY_URL` in your client environment (for Vite) to include the proxy path, for example:

```bash
export VITE_OWN_PROXY_URL=https://your-proxy-host.example/proxy
```

2) Cloudflare Worker (single-file, limited streaming)

The Cloudflare Worker example is included in `proxy/cloudflare-worker-example.js`. It is a compact option that forwards headers (including Authorization) and returns CORS headers suitable for MeBooks. Deploy via `wrangler`.

Cloudflare Worker deploy quickstart

1. Install wrangler (Cloudflare's CLI):

```bash
npm install -g wrangler
```

2. Update `proxy/wrangler.toml` with your account and zone details (or run `wrangler init`) and add your `PROXY_KEY` into the Worker variables if you want to protect the echo endpoint.

3. Publish the worker from the repo root (it uses `proxy/cloudflare-worker-example.js`):

```bash
cd proxy
wrangler publish
```

Example `package.json` snippet (for the proxy worker folder) if you prefer an npm-driven deploy script:

```json
{
  "name": "mebooks-proxy-worker",
  "version": "0.0.0",
  "scripts": {
    "deploy": "wrangler publish"
  },
  "devDependencies": {
    "wrangler": "^3.0.0"
  }
}
```

4. After deploy, set `VITE_OWN_PROXY_URL` in your client to the worker's URL, for example:

```bash
export VITE_OWN_PROXY_URL=https://mebooks-proxy.example.workers.dev/proxy
```


Notes
- Public proxies (corsproxy.io, etc.) are unreliable for authenticated downloads — they may remove Authorization or block POST methods. Using an owned proxy ensures your Authorization headers and POST requests reach the upstream provider.
- The Express example supports streaming large responses and includes a curl fallback for problematic TLS handshakes. Cloudflare Workers may have limits on runtime and streaming depending on your plan.

If you're deploying to Render, see `proxy/README.md` for Render-specific hints.
