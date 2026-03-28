#!/bin/bash
# PostToolUse hook: forwards tool activity to the lopecode channel server.
# Receives JSON on stdin with tool_name, tool_input, tool_response.
# Posts it to http://127.0.0.1:PORT/tool-activity.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PORT_FILE="$SCRIPT_DIR/.lopecode-port"

# If no port file, channel server isn't running — silently skip
[ -f "$PORT_FILE" ] || exit 0

PORT=$(cat "$PORT_FILE")
[ -n "$PORT" ] || exit 0

# Read stdin (hook data) and POST it. Timeout 1s, fail silently.
curl -s -m 1 -X POST "http://127.0.0.1:${PORT}/tool-activity" \
  -H "Content-Type: application/json" \
  -d @- > /dev/null 2>&1

exit 0
