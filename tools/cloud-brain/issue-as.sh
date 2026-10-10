#!/bin/bash
# issue-as.sh <token name> <method[?query]> [json body]   calls issue.<method> on cb4 as a token.
# Tokens are in .emitted/cb4-issues-tokens.json (git-ignored). The token is never printed.
D="$(cd "$(dirname "$0")" && pwd)"
tok=$(python3 -c "import json,sys; print(json.load(open('$D/.emitted/cb4-issues-tokens.json'))[sys.argv[1]])" "$1") || exit 2
U="https://cb4.endpointservices.workers.dev/xrpc/com.lopecode.brain.issue.$2"
if [ -n "$3" ]; then curl -s -m 30 -w ' [%{http_code}]\n' -H "authorization: Bearer $tok" -H 'content-type: application/json' -X POST -d "$3" "$U"
else curl -s -m 30 -w ' [%{http_code}]\n' -H "authorization: Bearer $tok" "$U"; fi
