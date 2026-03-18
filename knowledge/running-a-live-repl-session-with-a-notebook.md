# Running a Live REPL Session with a Notebook

Both `lope-node-repl.js` (default) and `lope-browser-repl.js` support persistent bidirectional sessions. The node REPL is preferred unless you need DOM interaction, screenshots, or browser-only APIs.

## Quick one-shot usage

Pipe commands and let stdin close:

```bash
echo '{"cmd": "load", "notebook": "lopecode/notebooks/@tomlarkworthy_exporter-2.html"}
{"cmd": "list-variables"}
{"cmd": "quit"}' | node tools/lope-node-repl.js
```

For the browser REPL, replace `lope-node-repl.js` with `lope-browser-repl.js`.

## Persistent bidirectional session

To keep the REPL alive across multiple commands, use a named pipe for input and a file for output.

### Setup

```bash
# Create named pipe and start REPL
rm -f /tmp/node-repl-pipe /tmp/node-repl-out
mkfifo /tmp/node-repl-pipe
exec 3<>/tmp/node-repl-pipe  # keeps pipe open so REPL doesn't see EOF
node tools/lope-node-repl.js < /tmp/node-repl-pipe > /tmp/node-repl-out 2>/tmp/node-repl-err &
echo $! > /tmp/node-repl-pid
```

Run the setup in a background task, then wait for the ready line in `/tmp/node-repl-out`.

### Send/receive helper

Create `/tmp/repl-send.sh`:

```bash
#!/bin/bash
# Usage: bash /tmp/repl-send.sh '{"cmd": "..."}'
BEFORE=$(wc -l < /tmp/node-repl-out | tr -d ' ')
EXPECT=$((BEFORE + 1))
echo "$1" > /tmp/node-repl-pipe
for i in $(seq 1 60); do
  LINES=$(wc -l < /tmp/node-repl-out | tr -d ' ')
  if [ "$LINES" -ge "$EXPECT" ]; then
    sed -n "${EXPECT}p" /tmp/node-repl-out
    exit 0
  fi
  sleep 0.5
done
echo '{"ok":false,"error":"timeout waiting for response"}'
exit 1
```

### Usage

```bash
# Load a notebook (only needed once per session)
bash /tmp/repl-send.sh '{"cmd": "load", "notebook": "lopecode/notebooks/@tomlarkworthy_exporter-2.html"}'

# Subsequent commands reuse the loaded runtime
bash /tmp/repl-send.sh '{"cmd": "list-variables"}'
bash /tmp/repl-send.sh '{"cmd": "get-variable", "name": "compile", "module": "@tomlarkworthy/robocoop-2"}'
bash /tmp/repl-send.sh '{"cmd": "eval", "code": "1 + 1"}'

# Quit when done
bash /tmp/repl-send.sh '{"cmd": "quit"}'
```

### For large outputs

Redirect to a file and post-process with node:

```bash
bash /tmp/repl-send.sh '{"cmd": "list-variables"}' > /tmp/repl-vars.json
node -e "const d = JSON.parse(require('fs').readFileSync('/tmp/repl-vars.json','utf8')); console.log(d.result.count + ' variables');"
```

## Browser REPL persistent session

Same pattern, just swap the REPL binary and pipe names:

```bash
rm -f /tmp/browser-repl-pipe /tmp/browser-repl-out
mkfifo /tmp/browser-repl-pipe
exec 3<>/tmp/browser-repl-pipe
node tools/lope-browser-repl.js < /tmp/browser-repl-pipe > /tmp/browser-repl-out 2>/tmp/browser-repl-err &
```

The browser REPL additionally supports: `query`, `click`, `fill`, `download`, `screenshot`, `read-tests`, and `load` with `hash` parameter for layout control.

## When to use which

| Need | Use |
|------|-----|
| List/get/define variables, eval JS, run tests | `lope-node-repl.js` |
| Click buttons, fill forms, take screenshots | `lope-browser-repl.js` |
| Test with hash URL layout (natural observation) | `lope-browser-repl.js` |
| Modules using `URL.createObjectURL` | `lope-browser-repl.js` |
