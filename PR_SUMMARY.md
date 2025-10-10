Title: feat(opds): probe-first CORS handling, credential UI, owned-proxy guidance, and debug tools

Summary:
- Add probe-first CORS detection (`maybeProxyForCors`) to prefer direct fetches and fall back to a proxy only when required.
- Prevent sending Authorization through public proxies; annotate errors with `proxyUsed` and surface toasts recommending `VITE_OWN_PROXY_URL`.
- Add `OpdsCredentialsModal` (credential modal) with polling to detect post-login access.
- Migrate OPDS credentials storage to IndexedDB and add credential helper services.
- Add app-wide accessible toasts and `ToastStack`.
- Add `NetworkDebugModal` to probe endpoints and inspect ACAO/ACAC and request headers (debug-only).
- Add `proxy` examples: Express proxy (`proxy/index.js`), Cloudflare Worker example, `proxy/tools/check_proxy_echo.sh`, and deployment helper `wrangler.example.toml`.

Files changed/added (high level):
- services/opds.ts, services/opds2.ts, services/utils.ts
- components/OpdsCredentialsModal.tsx, BookDetailView.tsx, App.tsx, NetworkDebugModal.tsx
- proxy/index.js (echo route added), proxy/cloudflare-worker-example.js, proxy/tools/check_proxy_echo.sh, proxy/wrangler.example.toml
- OWNED_PROXY_README.md, PR_SUMMARY.md

How to test locally
1. Run unit tests: `npx vitest run` (all tests should pass).
2. Start dev server with debug flags if desired:
   ```bash
   export VITE_OWN_PROXY_URL=https://<your-proxy>/proxy
   export VITE_DEBUG=true
   npm run dev
   ```
3. In the running app, enable debug (console): `window.__MEBOOKS_DEBUG__ = true` and open the Network Debug modal to probe endpoints.

Recommended PR squash commit message:
"feat(opds): probe-first CORS handling, credential UI + owned-proxy debug tools"

Notes:
- The new `/_proxy_headers_echo` endpoint is protected by `PROXY_KEY` when set. Use the provided `proxy/tools/check_proxy_echo.sh` script to verify Authorization forwarding on deployed proxies.
- Public CORS proxies are unreliable for authenticated OPDS workflows and may strip Authorization or block POSTs; prefer an owned proxy.
