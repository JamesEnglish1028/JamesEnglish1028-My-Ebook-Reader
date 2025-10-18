# Deployment notes — Cloudflare Pages & Workers

This document records the exact steps to deploy MeBooks to Cloudflare Pages and publish the proxy Worker. It's intended to be a quick reference for CI setup and verification.

## Secrets (GitHub repository secrets)
Set these in GitHub: Settings → Secrets and variables → Actions → New repository secret

- `CF_PAGES_API_TOKEN`  — Pages deploy token (Account → Pages: Edit)
- `CF_ACCOUNT_ID`       — Cloudflare account ID (string)
- `CF_PAGES_PROJECT_NAME` — Pages project name (string)
- `CF_API_TOKEN`        — Worker publish token (Workers: Edit)
- `PROXY_KEY` (optional) — proxy key for Worker runtime (prefer Wrangler secret instead)

Recommended secret names (used in CI):

- `CF_PAGES_API_TOKEN`  — Cloudflare Pages API token used by the Pages action (Pages:Edit)
- `CF_ACCOUNT_ID`       — Cloudflare account ID (string)
- `CF_PAGES_PROJECT_NAME` — Cloudflare Pages project name (string)
- `CLOUDFLARE_API_TOKEN` — Preferred Worker publish token name (Account API token with Worker edit scope). If you already have `CF_API_TOKEN` set, the workflow will fall back to it.
- `PROXY_KEY` (optional) — runtime secret for the Worker (store as a Wrangler secret via `npx wrangler secret put PROXY_KEY`)

## Worker runtime secrets
Set runtime secrets with Wrangler (preferred):

```bash
cd proxy
npx wrangler secret put PROXY_KEY
```

Note: Wrangler stores runtime secrets in the Cloudflare account for the specific Worker. This is recommended for sensitive values (do not store runtime secrets directly in repo secrets).

## CI workflows
- `.github/workflows/deploy-pages.yml` — builds (`npm run build`) and uses the Cloudflare Pages Action. Requires the three Pages secrets above.
- `.github/workflows/publish-worker.yml` — publishes the proxy worker via Wrangler Action. Requires `CF_API_TOKEN` and `CF_ACCOUNT_ID`.

Exact minimal token scopes

- Pages token (`CF_PAGES_API_TOKEN`): use the built-in "Cloudflare Pages: Edit" template. Minimal scopes:
  - Account:Read (automatically included)
  - Pages:Edit (required to create/update a Pages project deployment)

- Worker token (preferred secret name: `CLOUDFLARE_API_TOKEN`): create a token with the following minimal permissions (use "Edit Cloudflare Workers" template or a custom token with these permissions):
  - Account:Read
  - Workers Scripts:Edit (create/update worker scripts)
  - (optional) Workers KV Storage:Edit if your worker uses KV
  - (optional) Pages:Read if you want the same token to also call Pages APIs (not required)

Important: Create the token in the same Cloudflare account that owns the Pages project and the Worker namespace. If you see API 8000007 (Project not found) or 6111/9109, it's usually an account/token mismatch or wrong token scope.

## Quick verification (curl)
List Pages projects to verify the Pages token works:

```bash
export CF_ACCOUNT_ID=your_account_id
export CF_PAGES_API_TOKEN='paste_pages_token'
curl -sS -X GET "https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/pages/projects" \
  -H "Authorization: Bearer ${CF_PAGES_API_TOKEN}" \
  -H "Content-Type: application/json" | jq
```

List Worker scripts to verify the Worker token:

```bash
export CLOUDFLARE_API_TOKEN='paste_worker_token'  # preferred secret name
curl -sS -X GET "https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/workers/scripts" \
  -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
  -H "Content-Type: application/json" | jq

If your repo already has `CF_API_TOKEN` set, the workflows will still work (we use `CLOUDFLARE_API_TOKEN` first and fall back to `CF_API_TOKEN`).
```

## Triggering a test deployment
Make a small commit to `main` (this file was added to do exactly that). The Actions workflows will run and you can monitor them at: `https://github.com/<owner>/<repo>/actions`.

## Troubleshooting
- 401/403: token scope or wrong account ID. Recreate tokens with correct template/scopes.
- 10000 / 6101 / 9109: Authentication or permission error from Cloudflare API. Ensure the token has the Worker "Scripts:Edit" permission and that the token belongs to the same account as `CF_ACCOUNT_ID`.
- Pages action failing build: inspect `npm ci` and `npm run build` logs in Actions. Build locally first to reproduce.
- Worker publish failing: check `proxy/wrangler.toml`, ensure `account_id` is set or `CF_ACCOUNT_ID` secret is correct.

If CI shows permission errors, re-check token scopes and that the token was created in the same Cloudflare account as the Pages project / Worker.

---
Committed to trigger CI test run — check GitHub Actions for the deployment logs.
