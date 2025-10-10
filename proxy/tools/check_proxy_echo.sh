#!/usr/bin/env bash
set -euo pipefail

# check_proxy_echo.sh
# Usage: ./check_proxy_echo.sh <PROXY_BASE_URL> <PROXY_KEY> <UPSTREAM_TEST_URL> [AUTH_HEADER]
# Example:
# ./check_proxy_echo.sh https://my-proxy.example mysecret 'https://opds.example/borrow/1' 'Basic Ym9iOnBhc3M='

PROXY_BASE_URL=${1:-}
PROXY_KEY=${2:-}
UPSTREAM_URL=${3:-}
AUTH_HEADER=${4:-}

if [ -z "$PROXY_BASE_URL" ] || [ -z "$PROXY_KEY" ] || [ -z "$UPSTREAM_URL" ]; then
  echo "Usage: $0 <PROXY_BASE_URL> <PROXY_KEY> <UPSTREAM_TEST_URL> [AUTH_HEADER]"
  exit 2
fi

ECHO_URL="$PROXY_BASE_URL/_proxy_headers_echo?url=$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1], safe=''))" "$UPSTREAM_URL")"

echo "Probing proxy echo endpoint: $ECHO_URL"

HDRS=( -H "x-proxy-key: $PROXY_KEY" )
if [ -n "$AUTH_HEADER" ]; then
  HDRS+=( -H "Authorization: $AUTH_HEADER" )
fi

curl -sS -D - "${HDRS[@]}" "$ECHO_URL" | sed -n '1,200p'

echo
echo "Now check the JSON 'receivedHeaders' to confirm 'authorization' appears." 
