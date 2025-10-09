#!/usr/bin/env bash
# Simple smoke test for Palace OPDS2 root via proxy and direct
set -euo pipefail
PROXY="https://jamesenglish1028-my-ebook-reader.onrender.com/proxy?url=https://minotaur.dev.palaceproject.io"
DIRECT="https://minotaur.dev.palaceproject.io"

echo "== Direct GET to Palace =="
curl -sS -i -H "Accept: application/opds+json" "$DIRECT" | sed -n '1,40p'

echo "\n== Proxy GET to Palace =="
curl -sS -i -H "Accept: application/opds+json" "$PROXY" | sed -n '1,40p'

echo "\n== Proxy GET with Origin header (simulate allowed origin) =="
curl -sS -i -H "Accept: application/opds+json" -H "Origin: https://patron-acad.staging.palaceproject.io" "$PROXY" | sed -n '1,40p'

echo "\nDone."
