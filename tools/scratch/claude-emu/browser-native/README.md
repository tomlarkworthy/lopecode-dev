# Claude Code `cli.js` — browser-native spike

## Interactive mode (xterm.js TUI) — `interactive.html`

`index.html` runs `cli.js -p` (one-shot, no slash commands). `interactive.html`
runs the same unmodified `cli.js` **interactively** (Ink REPL, `/help`, `/config`,
streaming chat) inside an **xterm.js** terminal.

```bash
node build.mjs                         # rebuild dist (interactive-aware shims)
FS_TRACE=1 PORT=8794 node run-interactive.mjs   # headless Chromium boot-test
```

Proven (`run-interactive.mjs`, MiMo via the in-page OpenRouter translator):
the Ink welcome box + `❯` prompt render; typing `/help` renders the interactive
help dialog; a chat turn streams `● BANANA` from one `POST openrouter.ai …
/chat/completions` (200); `cli.js` stays running; no fatal console errors.
Screenshots: `interactive-help.png`, `interactive-chat.png`.

**Architecture.** A persistent same-origin iframe (`frame.html`) runs
`cli.js` with argv `["/usr/bin/node","/cli.js"]` (NO `-p`) and
`globalThis.__INTERACTIVE=true`. Its stdio is bridged to an xterm.js mounted in
the parent (`interactive.html`): `process.stdout/stderr.write → parent.__ptyWrite
→ term.write` (ANSI passed through); `term.onData → frame.__ptyIn → process.stdin`.
"Restart" recreates the iframe (fresh realm/module state). The in-page
Anthropic⇄OpenRouter translator is reused verbatim.

**Shims upgraded for interactivity** (`src/`): `bootstrap.mjs` — `process.stdin`
is a TTY `Readable` (`isTTY`, `isRaw`, `setRawMode`, `ref/unref`, `read()` +
`readable`/`data` per-flush by listener), `process.stdout/stderr` are TTY
`Writable`s (`isTTY`, live `columns/rows`, `getWindowSize`, `getColorDepth=24`,
`clearLine/cursorTo/moveCursor` ANSI, `'resize'`), plus `__ptyIn`/`__ptyResize`
entry points and `TERM=xterm-256color`/`FORCE_COLOR`. `tty.mjs` — `isatty(1|2)`
true, TTY `Read/WriteStream`. `util.mjs` — `inherits` tolerates an undefined
superCtor (a stubbed builtin) instead of aborting the page. `fs-core.mjs` — the
interactive key's last-20-chars form is in `customApiKeyResponses.approved` and
the project is pre-trusted, so no dialog blocks the REPL. `cli.js` bytes: still
only the 2-byte shebang swap at serve time.

## Pluggable host filesystem — `fs.mjs` + `globalThis.__HOSTFS`

`fs.mjs` delegates to an injectable synchronous host-fs backend when
`globalThis.__HOSTFS` is set (else memfs default). Interface (prime-then-serve):
`snapshot()` primes the memfs cache at boot; `readSync(p)` (null=ENOENT) is
preferred for `readFileSync`; `writeSync(p,c)` receives every `writeFileSync`
write-through; `exists(p)`/`list()` back existence. Metadata ops
(`statSync/lstatSync/readdirSync/realpathSync/mkdirSync/renameSync/chmodSync/…`)
serve from the primed memfs cache. Verified by `fs-hostfs-test.mjs` (PASS);
`~/.claude.json` onboarding seeding survives in both modes.

---


Runs the real, unmodified Claude Code `cli.js` **v2.1.112** directly in headless
Chromium — no emulator, no Node binary — for a single non-interactive
`claude -p "hi"` round-trip against a local mock Anthropic endpoint.

## Verdict: **GO**

The real `cli.js` boots in the browser, walks its full startup (config, MCP,
plugins, skills, git/ripgrep context — the last two omitted gracefully), builds
a well-formed Anthropic `/v1/messages` payload for the prompt `hi`, POSTs it via
`globalThis.fetch`, receives the mock SSE reply, prints the assistant text to
the shimmed stdout, and exits 0.

Evidence (one run):
```
>>> API POST /v1/messages   model=claude-sonnet-4-6  stream=true
    messages[0].content[].text == "hi"   (+ system-reminder blocks)
[stdout] Hello from the browser-native Claude Code round-trip.
[process.exit] code=0
cli exit code: 0
VERDICT: GO (POST issued + reply printed)
```
Console transcript is what `run.mjs` prints; `spike-result.png` is the page
screenshot.

## How to run

```bash
cd tools/scratch/claude-emu/browser-native
npm install                 # buffer, path-browserify, memfs, esbuild (one-time)
node build.mjs              # bundle src/ shims -> dist/
PORT=8815 node run.mjs      # starts mock server + headless Chromium, prints verdict
```
`run.mjs` starts `server.mjs` (static + mock API on 127.0.0.1), loads
`index.html`, waits, and reports GO / PARTIAL / NO-GO. Override the CLI args with
`globalThis.__ARGV` (e.g. add `--debug` to get cli.js's own log, which is also
written to memfs at `~/.claude/debug/*.txt`).

## Architecture

`index.html` carries an **importmap** mapping every `node:*` (and bare) specifier
to a bundled shim in `dist/`. Three module scripts load in order:
1. `bootstrap.js` — builds `globalThis.process` (env, argv, streams, hrtime,
   nextTick, exit) **before** anything imports it.
2. `preload.js` — force-imports every shim so the synchronous `require()`
   registry is fully populated.
3. `/package/cli.js` — the target, loaded as `<script type="module">`.

`createRequire(import.meta.url)` is served by the `node:module` shim; the
returned `require` resolves specifiers against a shared registry every shim
registers into at import time.

## The shims (all in `src/`, bundled to `dist/`)

| shim | backing | notes |
|------|---------|-------|
| process | hand-built (bootstrap) | env drives base-URL/key; `exitCode` **must start `undefined`** |
| buffer | feross `buffer` | also sets `globalThis.Buffer` |
| path, path/posix, path/win32 | `path-browserify` | |
| fs, fs/promises | `memfs` | seeded so onboarding is already complete |
| os | hand stub | homedir/tmpdir/platform/EOL/… |
| crypto | hand | **synchronous** SHA-1/SHA-256 (`src/sha.mjs`) + HMAC; WebCrypto for random |
| util | hand | promisify/inspect/format/debuglog/types |
| stream, stream/consumers | hand | EventEmitter-based Readable/Writable/Transform/PassThrough |
| events | hand | EventEmitter (+ module `once`, `setMaxListeners`) |
| async_hooks | hand | AsyncLocalStorage/AsyncResource polyfill (see risks) |
| child_process | hand | graceful-fail stub (see risks) |
| net, tls, http, https | hand | inert (SDK uses `fetch`) |
| url | hand | `URL`, `fileURLToPath`, `pathToFileURL` |
| module | hand | `createRequire` over the registry |
| zlib, readline, tty, timers/promises, assert | hand | small stubs / real impls |
| stub | hand | generic inert module for `http2`, `v8`, `vm`, `dns`, `worker_threads`, `bun:*`, … |

22 top-level `node:` builtins + ~10 more reached only via `require()`/dynamic
import. `src/analyze-imports.mjs` extracts the exact named-import set per module
(used to make every shim's export list complete — a missing named export is a
hard ESM load error).

## The two residual risks — how they actually behaved

**(a) AsyncLocalStorage (`node:async_hooks`).** The userland polyfill keeps a
per-instance context map, set by `run()`/`enterWith()`, and propagates it by
patching `Promise.prototype.then`, `queueMicrotask`, and the timer functions to
capture+restore context around callbacks. Native `await` continuations bypass a
monkeypatched `then`, so context set by `enterWith()` *can* be lost across an
`await`. **Result: sufficient.** The `-p "hi"` path completed with no
context-loss crash; `getStore()` returning `undefined` where context was lost
was tolerated by callers. (Not proven adequate for interactive/multi-turn or
tool-execution flows — only the single `-p` round-trip.)

**(b) child_process.** `spawn` returns a `ChildProcess` that asynchronously
emits ENOENT and exits 1 — but only emits `'error'` **if a listener is
attached** (an unhandled `'error'` would abort the page); otherwise it degrades
straight to exit(1). `spawnSync`/`execSync` return/throw ENOENT. **Result:
works.** cli.js's startup spawns of `rg`/git failed cleanly, the debug log shows
`Ripgrep first use test: FAILED` and `No git remote URL found`, and cli.js
**omitted that context and proceeded** to the API call — no uncaught throw.

## Patches to cli.js

**One, mechanical, applied at serve time — `cli.js` on disk is byte-for-byte the
npm artifact.** `server.mjs` replaces the 2-byte shebang `#!` with `//` so the
file parses as an ES module (`#!/usr/bin/env node` → `//​/usr/bin/env node`).
Nothing else is changed.

## Sizes (the point of the spike)

| artifact | raw | gzip |
|----------|-----|------|
| `cli.js` | 13.71 MB | **4.08 MB** |
| shim stack (`dist/`, current build) | 1.53 MB | **~0.27 MB** |
| **total self-contained** | | **~4.35 MB gz** |

The shim gz is dominated by `memfs` (~55 KB gz, and the current esbuild split
emits several copies — a deduped or lean in-memory fs would drop the whole stack
well under 100 KB gz). Versus the ~50 MB notebook that embeds a 52 MB riscv64
Node binary, this is a **~11x reduction**, within the ~5 MB target.

## Known-benign warnings on the round-trip

- `Refused to set unsafe header "User-Agent"` — the SDK sets `User-Agent`; the
  browser strips it. The POST still succeeds (200) and the reply prints.
- CORS block on `api.anthropic.com/api/claude_code/organizations/metrics_enabled`
  — a background telemetry XHR that is **not** routed through
  `ANTHROPIC_BASE_URL`. Fires after the response; does not affect the round-trip.
  A production port would disable/route it.

## Files

- `index.html` — importmap + load order + fetch/error instrumentation
- `src/*.mjs` — shim sources; `build.mjs` bundles them to `dist/` (esbuild, code-split)
- `server.mjs` — static server + mock `/v1/messages` (SSE or JSON) on 127.0.0.1
- `run.mjs` — Playwright headless driver; prints the verdict, writes `spike-result.png`
- `analyze-imports.mjs` — extracts required named imports per builtin from cli.js
