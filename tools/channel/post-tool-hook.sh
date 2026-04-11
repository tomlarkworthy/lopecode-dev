#!/bin/bash
# PostToolUse hook: forwards tool activity to the lopecode channel server.
# Receives JSON on stdin with tool_name, tool_input, tool_response.
# Posts a summary to http://127.0.0.1:PORT/tool-activity.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PORT_FILE="$SCRIPT_DIR/.lopecode-port"

# If no port file, channel server has no listeners — silently skip
[ -f "$PORT_FILE" ] || exit 0

PORT=$(cat "$PORT_FILE")
[ -n "$PORT" ] || exit 0

# Check the server is alive and has listeners before reading the (potentially
# large) stdin payload. The /health endpoint is a quick GET.
STATUS=$(curl -s --connect-timeout 0.1 -m 0.5 "http://127.0.0.1:${PORT}/health" 2>/dev/null) || exit 0

# No paired notebooks → nothing to broadcast, skip reading stdin
echo "$STATUS" | grep -q '"paired":0' && exit 0

# Read stdin (hook data) and POST it.
curl -s --connect-timeout 0.1 -m 2 -X POST "http://127.0.0.1:${PORT}/tool-activity" \
  -H "Content-Type: application/json" \
  -d @- > /dev/null 2>&1

exit 0
