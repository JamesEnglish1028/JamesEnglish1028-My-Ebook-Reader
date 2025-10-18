# Deployment notes — Cloudflare Pages & Workers

This document records the exact steps to deploy MeBooks to Cloudflare Pages and publish the proxy Worker. It's intended to be a quick reference for CI setup and verification.

## Secrets (GitHub repository secrets)
Set these in GitHub: Settings → Secrets and variables → Actions → New repository secret

- `CF_PAGES_API_TOKEN`  — Pages deploy token (Account → Pages: Edit)
- `CF_ACCOUNT_ID`       — Cloudflare account ID (string)
- `CF_PAGES_PROJECT_NAME` — Pages project name (string)
- `CF_API_TOKEN`        — Worker publish token (Workers: Edit)
- `PROXY_KEY` (optional) — proxy key for Worker runtime (prefer Wrangler secret instead)

## Worker runtime secrets
Set runtime secrets with Wrangler (preferred):

```bash
cd proxy
npx wrangler secret put PROXY_KEY
```

## CI workflows
- `.github/workflows/deploy-pages.yml` — builds (`npm run build`) and uses the Cloudflare Pages Action. Requires the three Pages secrets above.
- `.github/workflows/publish-worker.yml` — publishes the proxy worker via Wrangler Action. Requires `CF_API_TOKEN` and `CF_ACCOUNT_ID`.

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
export CF_API_TOKEN='paste_worker_token'
curl -sS -X GET "https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/workers/scripts" \
  -H "Authorization: Bearer ${CF_API_TOKEN}" \
  -H "Content-Type: application/json" | jq
```

## Triggering a test deployment
Make a small commit to `main` (this file was added to do exactly that). The Actions workflows will run and you can monitor them at: `https://github.com/<owner>/<repo>/actions`.

## Troubleshooting
- 401/403: token scope or wrong account ID. Recreate tokens with correct template/scopes.
- Pages action failing build: inspect `npm ci` and `npm run build` logs in Actions. Build locally first to reproduce.
- Worker publish failing: check `proxy/wrangler.toml`, ensure `account_id` is set or `CF_ACCOUNT_ID` secret is correct.

If CI shows permission errors, re-check token scopes and that the token was created in the same Cloudflare account as the Pages project / Worker.

---
Committed to trigger CI test run — check GitHub Actions for the deployment logs.
