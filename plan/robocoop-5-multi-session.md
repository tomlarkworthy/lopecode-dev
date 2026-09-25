# robocoop-5: multiple sessions, session logs as modules, guardrail hooks

Started 2026-09-25, branch `rc5-multi-session` (parent worktree
`.claude/worktrees/rc5-multi-session`, lopebooks worktree mounted at its `lopebooks/`).

Three questions from Tom, same day:

1. Can several robocoop-5 agents run in one notebook?
2. Can the chat be materialised into a module, so the notebook's ordinary persistence saves it and
   the user can switch between sessions?
3. Can an instantiated agent be given guardrails through hooks?

Tom's constraints, stated in reply to a first sketch (2026-09-25):

- **Saving a session = whether its module is a main.** No separate "save" flag.
- **The agent UI is not in the session module.** The UI is a facade over many sessions and finds
  prior sessions by reflecting over the runtime.
- **Binary content (images) goes in file attachments** of the session module.
- **Turns stream**, so writes to the session log are buffered until the turn completes.

## 1. What is there now (read 2026-09-25, lopebooks `06e05dfa`)

Line numbers are from `bun tools/lope-reader.ts lopebooks/notebooks/@tomlarkworthy_robocoop-5.html
--get-module <m>`; cell names are stable, line numbers are not.

**The loop is already a factory.** `createAgentSession` (core, cell `createAgentSession`, l.312)
takes `client, tools, toolsProvider, systemPrompt(Provider), model(Provider), reasoningProvider,
completeGuard, noticesProvider, contextProvider, …` and returns
`{messages, send, abort, reset, interrupt, steer, usage, sampling}`. `messages` is a closure-local
array (`const messages = []`, l.403). One agent per notebook is a property of the **engine**, which
calls the factory once in the `session` cell.

**What is a singleton, and what that would break with two agents:**

| state | where | effect of sharing |
|---|---|---|
| `robocoop4_model`, `robocoop5_temperature`, `robocoop5_reasoning_off`, `robocoop5_speclock` | engine, `window.localStorage` | agents overwrite each other's model and settings |
| `rc5-tools`, `rc5-context`, `rc5-monitors` plugin sets | robocoop-5-tools, one `plugins` map | every agent sees every tool; no per-agent scoping |
| `rc5_specGate.scorecard` | robocoop-5-tools | one agent's failing spec vetoes another's `task_complete` |
| `rc5_store` (`/src`) | srctools | both agents edit the same notebook — intended, but concurrent writes to one module conflict |
| main thread, gateway budget ($0.50/day per IP) | page, `openrouter-gateway` | a busy agent stalls the others; they share one budget |

**Nothing persists the chat.** The UI renders straight from `session.messages`; `reset()` is
`messages.length = 0` (l.435). The only resume path is the eval harness
(`tools/robocoop-eval/driver-core.mjs` ~l.496): `findValue("session")`, push prior messages onto
`session.messages` minus the system prompt, then `send(question || null)` — `null` continues from the
injected history. Used by `attribute.mjs` and warm attempt 2 in `run-agent.mjs`, so the resume
mechanism is exercised, not hypothetical.

**The one veto hook** is `completeGuard(info) → string|null`, wired in the engine as
`specGateCheck(rc5_specGate.scorecard, info.summary) ?? zeroToolCallGate(info)`. Everything else
(`noticesProvider`, `contextProvider`, monitors, `send()` callbacks such as `onToolCall`) observes or
injects; none can refuse a tool call.

**How export picks modules** (exporter-3, as embedded in rc5.html). `exportToHTML` defaults
`mains` to `runtime.mains` (l.555–562); `moduleNames` is
`moduleMap(task_runtime, {cache: [...task.mains]})` (l.982); bootconf `"mains"` is written from
`task.mains.keys()` (l.1131). `module_specs` serialises each included module's type-1 variables and
`getFileAttachments(module)` (l.1017). So a module in `runtime.mains` is exported with its
attachments and boots on reload. **Unverified:** that a module *not* in mains and not imported is
left out — `moduleMap` also discovers modules by other routes (DOM-sniffed names, `module X`
variables), and Tom's "saved iff main" rule depends on it. Step S0 tests this first.

**Attachments on a runtime-created module** go through `setFileAttachment(file, module = main)`
(`@tomlarkworthy/fileattachments`), which since 2026-08-31 read-back verifies
(`knowledge/how-file-attachments-work.md` § implicit-variable trap).

## 2. Design

### 2.1 A session is a module; saving is mains membership

One module per session, named `@rc5-sessions/<id>`. Kept out of `@user/` on purpose: `@user/` is
where the agent's own file tools write, and an agent that can edit its own log can rewrite its
history (§2.5).

```js
session_meta = ({kind: "robocoop-5/session", version: 2, created: "2026-09-25T14:03:11Z",
                 title: "…", model: "xiaomi/mimo-v2.5-pro", profile: "default"})
turn_mfz3k2a1_x7q2 = ({id: "turn_mfz3k2a1_x7q2", parent: null, created: "…", completed: "…",
                       status: "complete", error: null, messages: [ /* wire-format messages */ ]})
turn_mfz3m9c0_b41k = ({…, parent: "turn_mfz3k2a1_x7q2"})
```

Changed 2026-09-25 at Tom's request, from `turn_0001, turn_0002, …` (version 1): the turns are a
**tree**, not a sequence. A turn names its `parent` (the turn it was sent after; `null` at the root),
and the cell name is a unique id (`turn_<ms base36>_<4 random>`), not a counter, so no writer has to
agree on a next number. On load the turn with the latest `created` is the head and its ancestor
chain is the transcript (`latestTurn`, `turnChain`); a missing parent ends the chain and a repeated
id stops a cycle. The node is a turn rather than a single message because branching only happens at
a user message: the assistant and tool messages inside a turn always follow it in order. Version 1
logs are not read; none were ever saved outside test runs.

- **Created unsaved:** `runtime.module()` only. **Save:** `runtime.mains.set(name, module)`.
  **Unsave:** `runtime.mains.delete(name)`. The next export (save-in-place, `export_notebook`) is
  what writes it; there is no other store.
- **One cell per turn**, not one growing blob. Each commit defines one new
  variable and never rewrites an old one, so the log is append-only in both the runtime and the git
  diff. Rejected: one cell holding an array (every turn rewrites the whole history, O(n) per turn and
  a whole-block git diff); one JSON attachment (same rewrite cost, and the transcript stops being
  readable cells). Ceiling: the sheet lens measured a few thousand variables per module as the
  practical limit (`plan/sheet-lens.md`); a session of hundreds of turns is well under it.
- **What a turn stores:** `messages.slice(turnStart)` minus `messages[0]` (the system prompt —
  `send()` re-adds it) and minus `<environment …>` context blocks (regenerated every turn, and they
  carry the page URL). "Watch updates" notices are kept; they are part of what the model saw.
- **Images** (`image_url` parts with `data:` URLs) are moved into attachments named
  `<turn id>_0.png` on the session module, and the stored part becomes
  `{type: "image_attachment", name: "<turn id>_0.png"}`. Resume converts back to a data URL.

Lens reading, for the laws in S1: source = the session module's cells, view = the message list.
`get(log, head)` concatenates the chain ending at `head`. `put` of a turn under `head` is "define one
new cell whose parent is `head`"; PutGet is `get(put(log, head, t), t) = get(log, head) ++ t`, and
PutPut holds because no put touches an earlier cell. A **fork** is a put under an earlier head: it
adds a sibling and deletes nothing, so the old branch stays readable at its own head.

UI (robocoop-5): a committed user bubble has **✎ edit**, which checks out the turn's parent and puts
the message (text and images) back in the input, so the next send is a sibling. A turn with siblings
shows **‹ k/n ›**, which moves to the latest turn under that sibling (`showBranch`). Verified
2026-09-25, `tools/scratch/rc5-sessions/s5-branch.mjs` against the demo gateway:
```
B   u: Reply with the codeword in UPPERCASE …   a: FIG
B'  u: Reply with the codeword in lowercase …   a: fig        turns 3, position 2/2
‹   back on B (FIG); the older branch was left on screen for the export
reload opens B' (fig), position 2/2 — the latest turn, not the one that was shown
```

### 2.2 Turns stream; the log commits once per turn

The chat UI keeps rendering from the live `session.messages` as it does now. The session log is
written only when `send()` settles:

- **Resolved** → commit `status: "complete"`.
- **Rejected or `abort()`ed** → commit what exists with `status: "aborted"` and the error text, so a
  failed turn is still visible after reload.
- **Page closed mid-turn** → the turn is lost. Accepted for now: writing on every stream chunk would
  redefine a variable per token.

`steer()` messages pushed during the turn fall inside `turnStart…end` and are committed with it.

### 2.3 The facade finds sessions by reflection

The UI is a facade over many sessions and stores no list of them. On boot it scans
`runtime.mains` (the saved sessions) plus its own in-memory map (unsaved sessions created this page
load) for modules with a `session_meta` cell whose `kind` is `"robocoop-5/session"`. Detection is by
that cell, not by name prefix, so a renamed module is still found; the name is only the id. Reading
`session_meta` needs the variable computed: observe it, then `_computeSoon()`
(memory: `observe()` does not schedule a compute).

Resuming session X = build (or reuse) X's agent with `createAgentSession`, push X's stored messages
(images rehydrated), and bind the chat view to it. Nothing is sent until the user types, exactly as
the eval harness's resume does.

**The eval harness finds the agent by `findValue("session")`.** The engine's `session` cell stays
and means *the active session*, so every existing driver keeps working unchanged.

### 2.4 Several agents

A `createRobocoop({log, profile})` factory in the engine returns `{session, settings, scorecard}`:

- per-agent **settings** (model, reasoning, temperature) live in the session's `session_meta`, not
  localStorage. `OPENROUTER_API_KEY` stays global. The localStorage keys remain as defaults for a
  new session, and as the eval-harness contract for the default session.
- per-agent **`specGate` scorecard**: one object per agent instead of `rc5_specGate`.
- **tools**: the registry stays global; each agent's `toolsProvider` filters it through its profile
  (§2.5). No namespacing of `registerTool`.
- **write conflicts**: two agents writing one module. srctools' writes must re-read the target
  definition at commit and refuse if it changed since the agent read it — the same check svg-lens
  and mermaid-lens already make (`if (self._definition !== before) abort`). Not built yet.

### 2.5 Guardrails as hooks

Claude Code's hook points, and where each already has, or can have, an equivalent here:

| Claude Code | robocoop-5 | status |
|---|---|---|
| PreToolUse (block / rewrite a call) | wrap each tool's `execute` inside `toolsProvider` | buildable today, no core change |
| PostToolUse (inspect / redact output) | same wrapper, after `execute` | buildable today |
| Stop (veto finishing) | `completeGuard` | exists; make it per-agent |
| UserPromptSubmit | `contextProvider` turn scope | exists |
| notifications | monitors via `noticesProvider` | exists, global registry |
| kill switch | `session.abort()` / `interrupt()` | exists |

A profile is `{allow, deny, hooks: {beforeTool, afterTool, beforeComplete}}` and the facade applies it
by wrapping tools. Candidate first profile: a read-only reviewer (no `write_file`, `edit_file`, value
tools that run code).

**Limit, stated where it applies:** these guard the model's behaviour, not the page. Any agent with
a code-running tool (srctools' value tools evaluate JS in the page) can reach around a wrapper, and
any agent with write tools can redefine cells — including a guard's. So every profile denies writes
to `@rc5-sessions/*` and to the robocoop-5 modules, and a profile meant to constrain drops the
code-running tools entirely. This is a behavioural fence, not a security boundary.

## 3. Build sequence, each step with its check

- [x] **S0 — persistence semantics, before any design depends on them.** In a Playwright-driven
  rc5.html: create two runtime modules with a data cell and a JSON attachment each, put one in
  `runtime.mains`, export with exporter-3, reload the exported bytes. Pass: the main one comes back
  with cell value and attachment; the other is absent from the HTML. If the non-main one is exported
  anyway, the "saved iff main" rule needs an exporter change and this plan stops here to revisit.
  Also record whether lopepage-2 opens a pane for a main that is not in the hash.

  **Held, 2026-09-25**, `tools/scratch/rc5-sessions/s0-persistence.mjs` against lopebooks
  `06e05dfa`. Cells defined with `realize` + `variable.define`, attachment with
  `setFileAttachment(jsonFileAttachment(…), module)`, export with `exportToHTML({mains: rt.mains})`
  (the pairing fork's call):

  ```
  export: {"savedModuleBlock":1,"savedAttachmentBlock":1,"unsavedMentions":0,
           "unsavedPayloadMentions":0,"bootconfMainsHasSaved":true}
  reload: {"hasVar":true,"value":{"meta":{"kind":"robocoop-5/session","which":"saved"},
           "file":{"name":"@rc5-sessions/s0-saved","bytes":[1,2,3]}},
           "mains":["@rc5-sessions/s0-saved"]}
  errors: []
  ```

  The non-main module left no trace in 2.84 MB of output, so mains membership is the whole save
  decision, with no exporter change. `s0-render-check.mjs` on the reloaded file: the string
  `robocoop-5/session` appears 0 times in `document.body.innerText`, so a session main outside the
  `#view` hash renders nowhere. The facade has to be what shows it.

  Found while reading `realize` (runtime-sdk): it compiles by injecting each source into a
  `<script type="module-shim">`, and the exporter embeds module source in a `<script>` block. A
  transcript full of code will contain `</script>`, so turn literals are emitted with every `<`
  written as `<` (`JSON.stringify(x).replace(/</g, "\\u003c")` — in JSON output `<` can only
  occur inside a string, where the escape is equivalent).
- [x] **S1 — session-log library** in a new module `@tomlarkworthy/robocoop-5-sessions` (added to
  rc5.html, declared in `modules/canonical.json`): `createSessionLog`, `appendTurn`,
  `readTurns`, `listSessions`, `save`/`unsave`. `test_*` cells for PutGet, append-only (no earlier
  variable's `_definition` changes), image round trip. Headless via `notebook-import.ts` where the
  runtime allows.

  **Done 2026-09-25.** Working copy `modules/@tomlarkworthy/robocoop-5-sessions.js`, inserted with
  `sync-module --insert-ok`, declared `upstream: null`. Nothing imports it yet, so the tests run on
  a scratch copy with the module added to bootconf mains
  (`tools/scratch/rc5-sessions/with-mains.mjs`), because `--run-tests` skips a module that never
  boots:

  ```
  ok 1 - module @tomlarkworthy/runtime-sdk#test_session_roundtrip
  ok 1 - module @tomlarkworthy/runtime-sdk#test_storableMessages
  ```

  (The runner prints the wrong module name; both cells are in robocoop-5-sessions.)
  `test_session_roundtrip` asserts PutGet over two turns including a PNG, that `turn_0001`'s
  `_definition` is the same object after `turn_0002` is appended, that the stored image part is
  `{type:"image_attachment", name:"turn_0001_0.png"}`, and that `listSessions` reports
  `saved` false → true → false across `saveSession`/`unsaveSession`.

  The first run failed with `Parse error file://@tomlarkworthy/robocoop-5-sessions:1:0 Unexpected
  end of input`: the module's own comment and test fixture contained a literal closing script tag,
  which ended the embedding block early. The escape in `encodeLiteral` exists for exactly this, and
  the module source needed the same care.

  Reflection reads `runtime._variables` and `variable._module`, against CLAUDE.md tip 9.
  runtime-sdk's `runtime_variables` is a reactive view (`Inputs.input(runtime._variables)`, re-fired
  by `observeSet`) over the same Set, so it is the thing for the facade to depend on to re-list
  sessions in S3; the library functions take a `runtime` and read the Set directly, as exporter-3
  and module-map do.
- [x] **S2 — engine factory**: `createRobocoop`; per-agent settings and scorecard; `session` cell =
  active session. Check: `node tools/robocoop-5/boot-smoke.mjs` green; one eval run
  (`long-store-to-checkout`) still passes through `findValue("session")`.

  **Done 2026-09-25, narrower than planned.** The engine's `session` body moved verbatim into a
  `makeSession({model, toolsTransform, completeGuard})` factory cell with the same 15 dependencies;
  `session = makeSession()` is the default agent. No separate `createRobocoop` was needed: the
  controller (S3) calls `makeSession`. Checks, both on the worktree notebook:

  ```
  boot-smoke:  core exports: all instantiate · context: 8 providers · console errors: none
  PASS  long-store-to-checkout  1.00  steps=9  (10/10)   $0.0096, 66.5s, xiaomi/mimo-v2.5-pro
  ```

  (Recorded earlier in this repo at 8 steps; one roll, so 9 is not a regression claim either way.)
  **Not done:** per-agent model/reasoning/temperature from `session_meta` (the `model` override exists
  but nothing passes it; every session reads the shared picker), and the per-agent spec scorecard —
  `rc5_specGate` is still one object.
- [x] **S3 — facade**: session picker (new, switch, save toggle = mains), commit on `send()` settle.
  Check in a browser: two sessions, one saved; save-in-place; reload; saved one resumes with its
  transcript and continues the conversation; unsaved one is gone.

  **Held 2026-09-25**, `tools/scratch/rc5-sessions/s3-facade.mjs` (real model calls through the demo
  gateway; the export is the pairing fork's `exportToHTML({mains})`, not save-in-place, which needs a
  file handle headless Chromium does not have):

  ```
   7s A reply: "OK — codeword PERSIMMON noted and remembered."        (then: save ticked)
  14s B reply: "OK — I've noted the codeword QUINCE."                  (new session, not saved)
  15s after reload {"entries":[{"title":"new session","saved":false,…},
                   {"title":"Remember this codeword: PERSIMMON. …","saved":true,"messages":null}]}
  15s transcript shows PERSIMMON after switch: true
  25s resumed reply: "The codeword you gave me was: PERSIMMON."
  ```

  `messages: null` is the lazy resume: the reloaded session has a log and no agent until opened.

  **The first run failed, and why is worth keeping.** Playwright could not click the save checkbox
  because it was detached from the DOM over and over. A probe wrapping the UI cell's `_definition`
  (`rerender-probe.mjs`) counted **1661 rebuilds in 70 s** after one turn, every one caused by
  `hostSetup`. The chain: `readValues` defines and deletes a temporary variable → module-map's
  `currentModules` recomputes → srctools' `fileTools` → `hostSetup` → the chat UI cell rebuilds → its
  build calls `controller.refresh()` → `readValues` again. `peekValues` breaks it by never defining a
  variable (computed `_value`, else `JSON.parse` of the literal in `_definition`). After: **4 rebuilds**
  in 120 s (2 at boot, 2 when the turn commits). The lesson generalises: in this notebook, anything that
  adds or deletes a variable rebuilds the chat UI, so the UI must never do that as part of rendering.
- [x] **S4 — guardrail profiles**: tool wrapper + reviewer profile. Check: the reviewer's
  `write_file` call is refused with the profile's reason, and the refusal is in its transcript.

  **Held 2026-09-25**, `test_applyProfile` (deny, protected writes, `beforeTool` refusal, `afterTool`
  rewrite, wrappers stable per tool) and live, `tools/scratch/rc5-sessions/s4-guardrails.mjs`:

  ```
  reviewer: offered get_context, inspect_value, list_values, watch_variable, unwatch_variable,
            read_file, glob, grep, view_image, task_complete. It called write_file anyway (the
            prompt named it); the core answered "unknown tool write_file".
  default:  write_file /src/@rc5-sessions/probe.js →
            "Refused by guardrail: writes to /src/@rc5-sessions/probe.js are not allowed
             (session logs and robocoop-5 are protected)" — quoted back by the model.
  ```

  The check as first written ("the reviewer's `write_file` is refused") did not match the design: a
  denied tool is never offered, so what reaches the transcript is the core's unknown-tool error.
  Refusals with a reason come from `beforeTool` and the protected-module guard.

## 3a. Open issues found while building (2026-09-25)

- [x] **The prerender snapshot leaked unsaved sessions.** In the first S3 export, `QUINCE` (the unsaved
  session) occurred 3 times, all before the first `<script id=…>` block: the picker's option text, the
  user bubble and the reply. exporter-3 clones `#lopepage-2` with `cloneNode(true)` into `#lope-prerender`
  and strips only `<script>`. Fixed in robocoop-5, not exporter-3 (a shared module; an opt-out attribute
  there was the rejected alternative): the picker and the transcript render inside open shadow roots,
  which `cloneNode` does not copy. The transcript's root adopts `document.adoptedStyleSheets` (where the
  theme lives, including the `.hljs-*` rules) plus copies of the `<style>` sheets; before the adopted
  sheets were included, code blocks lost their background and highlighting (`md-shot.mjs`, compared with
  the committed file). S3 re-run 2026-09-25:
  ```
  exported 3215237 bytes; PERSIMMON x 4 QUINCE x 0
  prerender section: PERSIMMON x 0 QUINCE x 0
  resumed reply: "PERSIMMON"
  ```
  Cost: a saved session's transcript is no longer in the prerender either, so the file's first paint
  shows an empty chat.
- [x] **The default session was unguarded.** `rc5_controller` passed the engine's `session` in as its
  first entry, built without a `toolsTransform`. It now calls `create()` itself, so the first session goes
  through the default profile; the facade no longer imports `session` (the engine still defines it for
  the eval harness). `s4-guardrails.mjs`, run `first` (the entry active at boot), 2026-09-25:
  `Refused by guardrail: writes to /src/@rc5-sessions/probe.js are not allowed …`.
- **Every commit rebuilds the chat UI once** (the new turn variable, via the chain above). The
  controller carries the turn state, so nothing is lost, but the transcript re-renders at the end of
  each turn. The same happens today whenever the agent writes a module.
- **Concurrent writes by two agents to one module** are still unchecked (§2.4).
- **Key entry rebuilds everything.** `session` depends on `client`, so entering an OpenRouter key
  rebuilds `rc5_controller`, dropping unsaved sessions from the picker. Saved ones come back through
  `refresh()`. Same loss as today's single chat.

## 4. Not planned

- ~~Forking from an edited past turn.~~ Done 2026-09-25 as a turn tree (§2.1).
- Running agents in workers. All agents share the main thread; a busy one is felt by all.
- Cross-agent messaging (one agent delegating to another). Needs S2 first.
- Recovering a turn interrupted by closing the page.
