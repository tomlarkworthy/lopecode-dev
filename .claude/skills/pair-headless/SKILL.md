---
name: pair-headless
description: Use when the user asks to "pair without a browser", "/pair-headless", "/pair-stop", "open this notebook headlessly for pairing", or wants a claude-code-pairing session that doesn't require keeping a foreground browser tab open. Spawns `tools/headless-pairing-host.ts` via Playwright headless Chromium so the runtime keeps ticking with no visible window. Companion stop action terminates a running host.
version: 0.1.0
---

# Pair without a foreground browser

A claude-code-pairing session normally needs a notebook tab open in a real browser, foregrounded. When the tab is hidden or backgrounded the Observable runtime stalls because its scheduler routes through `requestAnimationFrame`, which browsers throttle in hidden tabs. Headless Chromium has no concept of "background tab" — `document.visibilityState` is always `"visible"` — so loading the same notebook there keeps everything ticking with zero visible UI.

This skill orchestrates that: get a pairing token, spawn `tools/headless-pairing-host.ts` as a background process, and write a PID file so a later `/pair-stop` can find and kill it.

## When to use

- User says "pair without opening a browser", "/pair-headless", "headless pairing", "background pairing host".
- User wants Claude to drive a notebook for an extended automated session without disrupting their desktop.
- User says "/pair-stop", "kill the headless pair", "stop the headless host".

Do **not** use this for visual debugging or QA — `/qa-notebook` and the standard `open_url` flow exist for that. Headless mode is opt-in: it loses the user's ability to see the notebook update in real time.

## Start: `/pair-headless <notebook> [--fakefs-root <path>]`

The user provides either a notebook path (e.g. `lopecode/notebooks/@tomlarkworthy_blank-notebook.html`) or a notebook id (e.g. `@tomlarkworthy/blank-notebook`). If just an id, resolve it to `lopecode/notebooks/<slug>.html` (replacing `/` with `_`). Verify the file exists before continuing.

If the user wants `file-sync` active in the headless session, they pass `--fakefs-root <path>` (or you ask). Without this, `showDirectoryPicker` cannot prompt and `file-sync` will sit at "Waiting for directory…".

Steps:

1. **Get pairing token.** Call `mcp__lopecode__get_pairing_token` → `LOPE-PORT-XXXX`.
2. **(Optional) Enable fakefs.** If the user wants file-sync, call `mcp__lopecode__enable_fakefs({ path: <root> })`. Default `<root>` is `~/.cache/lopecode-fakefs` if the user gave none. The tool returns `{ ok, root, port, token }`. This authorises the channel-side of the fs-pair handshake.
3. **Choose layout.** Default to the standard pairing layout:
   `R100(S50(<notebook-id>),S25(@tomlarkworthy/module-selection),S25(@tomlarkworthy/claude-code-pairing))`
   where `<notebook-id>` is the module name (e.g. `@tomlarkworthy/blank-notebook`).
   If the user has a specific layout in mind, use that instead and append `&open=@tomlarkworthy/claude-code-pairing&cc=TOKEN`.
4. **Pick a PID file path.** Use `/tmp/lope-headless-<TOKEN>.pid` so `/pair-stop` can find it without arguments.
5. **Spawn the host in the background** via `Bash run_in_background`:
   ```bash
   LOPE_PAIRING_TOKEN=<TOKEN> bun tools/headless-pairing-host.ts <NOTEBOOK_PATH> \
     --pid-file /tmp/lope-headless-<TOKEN>.pid
   ```
   - Add `--layout '<LAYOUT>'` if a non-default layout was chosen.
   - Add `--fakefs-root <ROOT>` if step 2 was performed. Use the `root` value returned by `enable_fakefs` so the page-side init script's `rootName` matches the channel-side sandbox.
   - Add `--verbose` if the user wants chatty output.

   When `--fakefs-root` is given the host automatically (a) appends `@tomlarkworthy/file-sync` to the layout if it wasn't there, (b) injects the `showDirectoryPicker` proxy via `tools/channel/fakefs-init.js`, and (c) clicks the "Pick sync directory" button once the file-sync UI renders. The user does not need to interact with the page.
6. **Wait for the connected event.** A `<channel source="lopecode" type="connected" …>` system-reminder message confirms the page paired. If after ~15 seconds nothing arrives, check the host's stderr (the background task's output file) for the "WARNING: pairing did not complete" message and surface the diagnostic to the user.
7. **Confirm with one round-trip.** Run a tiny `mcp__lopecode__eval_code` like `({ ok: true, ts: Date.now() })` to prove the channel is alive end-to-end. Report the PID, the token, the PID file path, the fakefs root (if any), and that the host is running.
8. **(If fakefs)** verify `file-sync` armed by reading the `syncStatus` cell — it should report `Directory: <name>` rather than `Directory: — (not set)`. If it's still saying "(not set)", point the user at `--verbose` host logs (`fakefs auto-pick:` line) and the channel server's stderr (look for `fs-paired ws → <root>`). The `syncEnabled` toggle is a separate user-driven choice for live two-way sync; one-shot disassembly is also available via the file-sync `disassemble` button (clickable via `eval_code`).

Tell the user the host is held open and they can keep using the regular MCP tools (`define_cell`, `eval_code`, `list_cells`, watches) without an open browser window. Mention `/pair-stop` to terminate.

## Stop: `/pair-stop`

Steps:

1. Find the PID file. Default lookup pattern: `/tmp/lope-headless-LOPE-*.pid`. Use a single `Bash` call: `ls -t /tmp/lope-headless-LOPE-*.pid 2>/dev/null` and read the most recent (or, if there are several, ask the user which token to stop).
2. Read the PID, then `kill <PID>` (default SIGTERM — the host's signal handler closes the browser cleanly and removes the PID file).
3. Verify the process is gone (`kill -0 <PID> 2>/dev/null && echo alive || echo gone`). If it's still alive after a couple of seconds, escalate to `kill -9`.
4. Report what was stopped (PID + token).

## Edge cases

- **Stale PID file** (process died but file remained): if `kill -0 <PID>` fails before sending TERM, just remove the file and report "no host was running."
- **Multiple hosts** (user paired several notebooks headlessly): without an explicit token argument, `/pair-stop` should list all `*.pid` files and ask which to stop, rather than guessing.
- **Channel server already down**: the host will have already self-exited via the WebSocket-close watchdog. PID file may or may not be cleaned up — handle as the stale case.
- **Wrong notebook id**: if you can't resolve the id to a file under `lopecode/notebooks/` or `lopebooks/notebooks/`, ask the user for the explicit path rather than guessing.

## Why this works without a runtime patch

Playwright headless Chromium reports `document.visibilityState === "visible"` and `document.hidden === false` regardless. The runtime's `requestAnimationFrame` scheduler runs at full speed with no patch needed. (See `knowledge/live-collaboration-with-claude-code-pairing.md` for the longer story; the rAF prototype patch is documented there as a fallback for situations where headless isn't an option.)
