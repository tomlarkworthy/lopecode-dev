# robocoop-4

A bash-centric, OpenRouter-gated coding agent that lives **inside a lopecode notebook** and edits
that notebook's own modules. You chat with it; it drives a single `bash` tool (plus file / value /
inspection tools) over an in-memory project filesystem that mirrors the live notebook, so its edits
apply to the running runtime in ~1s.

This README is the entry point. `DESIGN.md` is the original node-core design record (still accurate
for the wire invariants and the eval harness) but predates the notebook-canonical migration — read
this first.

## Architecture: notebook-canonical

The **notebook modules are the source of truth.** Each is one Observable module (`modules/@tomlarkworthy/robocoop-4-*.js`),
synced into the notebook HTML with `tools/channel/sync-module.ts`. They split by concern:

| Module | Concern |
|--------|---------|
| `robocoop-4-core` | The portable, DOM-free **brain**: the tool-use loop (`createAgentSession`), `defineTool`, the bash tool, the model clients (OpenRouter + a deterministic scripted client), the system prompt, and the pure result formatters the UI renders with (`summarizeTurn`, `toolLabel`). Touches no `window`; runs verbatim in node CI. |
| `robocoop-4-engine` | Browser **wiring**: builds the OpenRouter client from the key, owns the just-bash workspace + agent shell, and constructs the persistent `session` wired to the live model picker / editable prompt / tool registry via *providers*. Config inputs (key, model, prompt) live here. |
| `robocoop-4-tools` | The live **tool registry** (`toolsView`, an `Inputs.input([])`) + the watch bus that streams watched-cell changes into the loop. |
| `robocoop-4-hostbridge` | Projects the live notebook into the fs (`/notebook/<id>.js` editable modules, `/content/<id>` raw blocks) and registers the agent's file/value tools (`read_file`, `write_file`, `edit_file`, `inspect_value`, `list_values`, `eval_js`, `watch_variable`, `view_image`). |
| `robocoop-4` | The **app UI**: the agent's live terminal above a chat facade (transcript, input bar, model/key/prompt settings, Stop / New-chat controls). |
| `robocoop-4-bash` / `-bash-session` / `-bash-terminal` | The shell: a POSIX-ish bash over a virtual fs (just-bash), the workspace/session factory, and the terminal widget. |
| `robocoop-4-tests` | In-notebook `test_rc4_*` cells over the core (see Testing). |

### Core concepts

- **Portable core.** `robocoop-4-core` is DOM-free so the exact same loop runs in the browser and in
  node CI. The only environment seam is `runCommand(cmd) -> {stdout, stderr, exitCode}` (browser binds
  the agent shell; node binds an `InMemoryFs` session).
- **Provider pattern (the key idea).** `createAgentSession` re-reads its tools, model, and system
  prompt from *provider functions* at the top of **every step** — not once at construction. That is
  what lets the notebook register a new tool, edit the prompt, or switch the model mid-conversation
  with the conversation surviving (the session object is never rebuilt).
- **Completion protocol.** The loop ends on an explicit `task_complete` tool call, not on bare text.
  A bare-text turn is a *stall* (nudged up to `stallNudgeLimit`); a provider-rejected empty turn is
  *malformed* (dropped + retried up to `malformedRetryLimit`). Tool output is centrally head+tail
  truncated so a 1 MB `cat` can't blow the context.
- **Live control.** `session` exposes `send(input)`, `steer(input)` (inject a user message + abort the
  in-flight call so it's read on the next step — the basis of mid-turn steering and model switching),
  `interrupt()` (abort the in-flight call only, e.g. to apply a model switch now), `abort()` (hard-stop
  the turn), and `reset()` (New-chat — clears history, keeps the workspace).
- **fs ↔ notebook projection.** `/notebook/<id>.js` are the agent's editable live modules (writing one
  applies it to the runtime and reports compile + runtime-error status in the same turn); `/content/<id>`
  is the read-only raw microkernel (bootconf, bundled libs, file attachments).

### Layout shell & serialization (a regression trap)

The app runs inside the `@tomlarkworthy/lopepage-2` layout shell — it must be `bootconf.mains[0]`, with its
source (and deps `modules` + a `themes` that exports `apply_theme`) embedded. **Re-export/rebuild is a
mirror of `runtime.mains`, not a remote fetch.** `export_notebook` (and `exportToHTML`) serialize whatever
modules are *booted* plus their dependency closure, from the live runtime + embedded `<script>` blocks —
nothing comes from ObservableHQ (robocoop-4 isn't published there). So:

- An export/build **preserves lopepage-2 iff it's loaded at export time.** A normal pairing export from a
  correctly-booted notebook round-trips it fine.
- It gets **silently dropped** only when you serialize a boot that never loaded it: opening a stale pre-fix
  HTML and exporting, or a `lope-build`/exporter run against a bootconf that still lists `@tomlarkworthy/lopepage`.
  That is how it regressed once (commit `e0ef730`): a full rebuild ran against a pre-migration `mains`, so
  the output reverted to plain `lopepage` and omitted the lopepage-2 + `modules` blocks.
- Failure mode is quiet: lopepage-2 imports `apply_theme` from `themes`; a stale `themes` lacking it makes
  `lp2_page` throw `apply_theme is not defined` and the layout never mounts — with **no errored cell** showing.
- Recovery: re-embed via `sync-module --insert-ok` for `lopepage-2` + `modules`, refresh `themes`, set
  `bootconf.mains[0]` back to `@tomlarkworthy/lopepage-2`.

### Two execution worlds (and a known duplication)

1. **Browser notebook** — canonical. Uses the `-core` module directly via Observable imports.
2. **Node eval harness** (`tools/robocoop-4/eval/`) — a *parallel ESM copy* of the portable core lives
   as `agentSession.mjs` / `agentLoop.mjs` / `openrouter.mjs` / `systemPrompt.mjs` / `render.mjs` /
   `defineTool.mjs` / `bashTool.mjs`. **These duplicate the `-core` cells and can drift** (e.g. the node
   copy currently lacks `steer`/`interrupt`). They persist only because the harness runs under node and
   `@observablehq/runtime` isn't a node dependency. **Recommended consolidation:** run the harness under
   `bun` and import the canonical core via `tools/notebook-import.ts` (proven in node CI), then delete the
   `.mjs` copies. Until then, changes to the loop must be mirrored in both, or made in `-core` only if the
   harness doesn't need them.

The node **unit tests**, by contrast, already run the canonical `-core` (see below) — only the *eval
harness* uses the `.mjs` copy.

## How to extend

**Add an agent tool** — define it with `defineTool({id, description, parameters, execute})` and register
it on the live registry. In the notebook, push it onto `toolsView` (the `Inputs.input([])` in
`robocoop-4-tools`); the running session offers it on the very next step (provider pattern). Built-in
tools live in `robocoop-4-core` (bash) and `robocoop-4-hostbridge` (file/value tools) — copy one as a
template. Keep `parameters` an explicit JSON Schema with per-field descriptions (the model relies on them).

**Add a config input** (e.g. a temperature knob) — in `robocoop-4-engine`: add a `viewof X` cell, expose
its value, add a plain-named alias (`const _xView = ($0) => $0` — works around editor-5 mangling `viewof`
imports), import the alias in `robocoop-4` (the app), and read it in `_session` via a provider
(`xProvider: () => $x.value`). Mirror the existing `model` / `rc4_systemPrompt` wiring.

**Add a test** — add a `test_rc4_*` cell to `robocoop-4-tests` (throw to fail) using the helpers there:
`rc4_assert`, `createScriptedClient` (canned turns), `rc4_abortableClient` (interruptible — for
steer/interrupt/model-switch), `rc4_simpleTool`. Register it in the module's `define()` block. Node CI
picks it up automatically.

## Testing

In-notebook `test_rc4_*` cells are canonical; node CI boots the shipped HTML and runs them:

```bash
node --experimental-vm-modules --test tests/notebooks/robocoop-4.test.js
```

The test instantiates the (non-booted) `robocoop-4-tests` module so `runTests('test_rc4_')` discovers
the cells. The browser-only just-bash fs test is excluded in node.

## Eval harness (separate from unit tests)

The eval harness grades whether the agent can accomplish notebook-edit *tasks* (programmatic post-state
assertions, no LLM judge) — distinct from the unit tests, which check loop invariants. It currently uses
the `.mjs` core copy (see duplication note above).

```bash
# no-network self-test + scripted task eval
node tools/robocoop-4/eval/run-eval.mjs
# single task, verbose
node tools/robocoop-4/eval/run-eval.mjs --only rename-identifier -v
# live model
OPENROUTER_API_KEY=... node tools/robocoop-4/eval/run-eval.mjs --real --model anthropic/claude-sonnet-4
```

## Syncing module edits to the notebook

After editing a `modules/@tomlarkworthy/robocoop-4-*.js` file:

```bash
bun tools/channel/sync-module.ts --module @tomlarkworthy/robocoop-4-core \
  --source modules/@tomlarkworthy/robocoop-4-core.js \
  --target lopebooks/notebooks/@tomlarkworthy_robocoop-4.html \
  --target lopecode/notebooks/@tomlarkworthy_robocoop-4.html
```

Then hard-reload the notebook (Cmd+Shift+R). Local files only — do not push robocoop-4 to ObservableHQ.
