# robocoop-4 — Design

A bash-centric, OpenRouter-gated coding agent whose core logic is DOM-free `.mjs` so the
SAME code runs in (a) the node eval harness (just-bash `InMemoryFs` + scripted client) and
(b) the browser notebook (`window.justbash` + real OpenRouter). robocoop-4 replaces
robocoop-3's two layers: the model gateway (now OpenRouter only) and the manipulation
surface (now a single `bash` tool over a virtual fs instead of Observable-variable tools).

## Spine and grafts

Spine: **Proposal 0 (Minimal-first)** — one tool, one non-streaming chat round-trip, a flat
while-loop, plain-array tools, programmatic-assertion eval. The single injected `runCommand`
atom is the only environment-specific seam.

Grafted in (from judge verdicts):
- **One centralized tool-output size cap in the loop** (P1) — head+tail truncation so a 1MB
  `cat` cannot blow the model context; node and browser truncate identically. No budget /
  recovery machinery beyond `maxSteps`.
- **A no-network self-test of the loop** (P1/P2) — scripted client drives a 2-step bash
  transcript; asserts verbatim-append, one-tool-reply-per-call, defensive-parse.
- **`render.mjs` home for `formatResult`** (P1/P2) — node and browser render bash output
  byte-identically.
- **`fsmap.mjs` codec with built-in system-path filter** (P2) — `idToPath` / `pathToId` /
  `listModuleFiles`; the single chokepoint every assert routes through, so grading can never
  run against `/bin/echo`.
- **Harness fails loudly on a task with no assert** (P0/P2) — the loop has no internal success
  signal once `autoRunTests` is dropped.
- **Scripted client byte-identical to OpenRouter** incl `tool_calls[].function.arguments` as a
  STRING, asserted in self-test (P0) — plus an optional `recordClient` dev utility to capture a
  real transcript once into a fixture (P1), WITHOUT the brittle fingerprint-matching.
- **Browser seam uses `window.justbash.run(cmd)` / `.exec(cmd)`** — verified live API in
  `@tomlarkworthy_justbash.html` (`_justbashBridge`, line 12281): `run` returns formatResult
  text, `exec` returns raw `ExecResult`, both default to `shells.agent`. There is NO other
  agent-shell entry point. The browser adapter calls `.exec(cmd)` (raw ExecResult) so the core
  renders via the shared `render.mjs`.
- **Per-module `exportModuleJS(id).source` for browser seeding** (P2) — avoids exporter-3's
  full-HTML cross-module-import drop; persistence is a separate `sync-module.ts` pass, never
  inside the loop.
- **`mkdir -p` the notebook prefix before first `ls`** (P2) — `window.justbash.ls` defaults to
  `/project`, unseeded in a fresh `InMemoryFs`; seed the work dir or the agent hits ENOENT.

## Core invariants (non-negotiable wire facts, verified)

1. just-bash `exec` is STATELESS except the fs: `cd`/`export`/shell-funcs do NOT persist; only
   fs writes do. `result.env` is returned even on non-zero exit, `result.env.PWD` = final cwd.
   The node session MUST thread `cwd`/`env` via `result.env` / `result.env.PWD`.
2. node entry is `dist/bundle/index.js` (ESM, `type:module`, just-bash@3.0.1). Import by ABSOLUTE
   path (cwd resets between harness bash calls). Browser uses the `@tomlarkworthy/just-bash`
   `/browser` build (5 shared exports: Bash, InMemoryFs, MountableFs, defineCommand,
   getCommandNames).
3. `getAllPaths()` leaks ~24+ system nodes (`/bin`, `/usr/bin`, `/dev`, `/proc`). Every assert
   routes through `listModuleFiles` which filters to the `/notebook` prefix.
4. Append the assistant message VERBATIM (incl `tool_calls`) before any tool messages, else the
   gateway rejects the next request. Emit EXACTLY one `{role:'tool', tool_call_id, content}` per
   `tool_calls[]` entry, matched by id.
5. `function.arguments` is a JSON STRING — `JSON.parse` it DEFENSIVELY (try/catch). On failure
   push a tool-error message keyed to the same `tool_call_id` rather than throwing.
6. Model ids are provider-namespaced (`anthropic/claude-sonnet-4`); a bare id 404s. Re-verify
   live against openrouter.ai/models before shipping (docs were unfetchable).
7. The robocoop-3 loop (`_fy9v7f`) is STREAMING. The non-streaming `{message, finish_reason}`
   client is a REDESIGN, not a verbatim port — keep the message/tool_call bookkeeping, rebuild
   the transport.

---

## bash tool — JSON schema (what is sent to OpenRouter `tools[]`)

```json
{
  "type": "function",
  "function": {
    "name": "bash",
    "description": "Run a bash command in a sandboxed shell over an in-memory project filesystem (cat, grep, sed, ls, awk, head, tail, etc.). cwd and env persist across calls (they are threaded for you); only filesystem writes persist between commands. exitCode != 0 is normal tool output, not a crash — the full stdout, stderr and exit code are returned to you.",
    "parameters": {
      "type": "object",
      "properties": {
        "command": {
          "type": "string",
          "description": "The bash command line to execute, e.g. \"sed -n '1,40p' /notebook/@user/mod.js\""
        }
      },
      "required": ["command"],
      "additionalProperties": false
    }
  }
}
```

`bashTool.execute({command}, ctx)`:
1. `const r = await ctx.runCommand(command)` — `r = {stdout, stderr, exitCode}`.
2. `let out = formatResult(r)` (from `render.mjs`).
3. Return `{ title: '$ ' + command.split('\n')[0], output: out, metadata: { exitCode: r.exitCode } }`.

The loop applies the size cap to `output` centrally (not the tool) so both transports truncate
identically. `ctx.runCommand` is the ONLY environment-specific dependency.

---

## OpenRouter client interface (`openrouter.mjs`)

```
createOpenRouterClient({
  apiKey,                                  // injected; node harness reads process.env, browser passes a notebook key
  fetch = globalThis.fetch,                // injected; browser passes window.fetch
  baseUrl = 'https://openrouter.ai/api/v1',
  referer,                                 // optional HTTP-Referer (attribution); omitted when falsy
  title,                                   // optional X-Title (attribution); omitted when falsy
  defaultModel = 'anthropic/claude-sonnet-4'
}) -> { chat }

async chat({ model = defaultModel, messages, tools, tool_choice = 'auto',
             temperature, max_tokens, signal })
  -> { message, finish_reason, raw }
```

- POST `${baseUrl}/chat/completions`.
- Headers: `Content-Type: application/json`, `Authorization: Bearer ${apiKey}`; add
  `HTTP-Referer`/`X-Title` ONLY when truthy (never empty-string headers).
- Body (OpenAI schema): `{ model, messages, tools, tool_choice, stream: false,
  ...(temperature != null ? {temperature} : {}), ...(max_tokens != null ? {max_tokens} : {}) }`.
  `stream` is forced false — deterministic, no SSE parser in the hot path.
- Non-2xx: `throw new Error('OpenRouter ' + res.status + ': ' + await res.text())`.
- Success: `const choice = data.choices?.[0]; return { message: choice.message,
  finish_reason: choice.finish_reason, raw: data }` — `message` returned VERBATIM incl any
  `tool_calls`.
- No `process`, no DOM, no hardcoded network. The SCRIPTED client implements the identical
  `{chat}` shape with neither `apiKey` nor `fetch`.

Optional dev utilities in the same file:
- `recordClient(realClient, sink)` — pass-through that appends `{request, response}` to a sink
  array for one-time fixture capture.
- `createScriptedClient(steps)` — returns the next queued `{message, finish_reason}` by sequence
  index. Return shape byte-identical to OpenRouter, incl `tool_calls[].function.arguments` as a
  JSON STRING. NO fingerprint matching (index-sequenced; keeps it un-brittle).

---

## Agent loop pseudocode (`agentLoop.mjs`)

```
createAgentLoop({ client, tools, systemPrompt, model,
                  maxSteps = 12, toolChoice = 'auto', toolOutputLimit = 8000 })
  -> { run(userPrompt, callbacks = {}) -> { messages, finishReason, steps } }

// tools: array of normalized {id, description, parameters, execute(args, ctx)}.
// client: { chat({model, messages, tools, tool_choice, signal}) -> {message, finish_reason} }.

run(userPrompt, callbacks):
  abort   = new AbortController()
  ctx     = { callId: null, abort: abort.signal, runCommand, metadata, getMetadata }
  wire    = tools.map(t => ({ type:'function',
                              function:{ name:t.id, description:t.description,
                                         parameters:t.parameters } }))
  byId    = Map(tools.map(t => [t.id, t]))
  messages = [ {role:'system', content:systemPrompt},
               {role:'user',   content:userPrompt} ]
  finishReason = null

  for step in 0 .. maxSteps-1:               // STEP BUDGET
    if abort.signal.aborted: finishReason='aborted'; break
    callbacks.onStep?.(step, messages)

    res = await client.chat({ model, messages, tools:wire,
                              tool_choice:toolChoice, signal:abort.signal })
    msg = res.message
    messages.push(msg)                       // VERBATIM append (incl tool_calls) — INVARIANT 4
    if msg.content: callbacks.onText?.(msg.content)

    calls = msg.tool_calls ?? []
    if calls.length === 0:                    // finish_reason 'stop' (or no tool calls)
      finishReason = res.finish_reason ?? 'stop'
      callbacks.onFinish?.({messages, finishReason})
      break

    for call in calls:                        // ONE tool reply per id — INVARIANT 4
      tool = byId.get(call.function.name)
      let args, output
      try { args = JSON.parse(call.function.arguments) }   // DEFENSIVE — INVARIANT 5
      catch (e) {
        messages.push({ role:'tool', tool_call_id:call.id,
                        content:'ERROR: could not parse tool arguments as JSON: '
                                + call.function.arguments })
        continue
      }
      if (!tool) {
        messages.push({ role:'tool', tool_call_id:call.id,
                        content:'ERROR: unknown tool ' + call.function.name })
        continue
      }
      callbacks.onToolCall?.(call.id, call.function.name, args)
      try {
        const r = await tool.execute(args, { ...ctx, callId: call.id })
        output = String(r.output ?? '')
      } catch (e) { output = 'ERROR: ' + (e?.message ?? String(e)) }

      output = truncate(output, toolOutputLimit)   // CENTRAL cap (head+tail) — graft P1
      callbacks.onToolResult?.(call.id, output)
      messages.push({ role:'tool', tool_call_id:call.id, content:output })

    if step === maxSteps - 1: finishReason = 'max_steps'

  callbacks.onError is fired by callers wrapping run() in try/catch on client throw.
  return { messages, finishReason: finishReason ?? 'max_steps', steps: step + 1 }
```

Notes:
- State lives in `run()` (a fresh loop per eval task; no cross-task `lastMessages`).
- `autoRunTests` is DROPPED — eval grades post-state externally via fs asserts.
- `truncate(text, limit)` keeps head + tail, replaces the middle with
  `\n...[N bytes truncated — use grep/sed to narrow]...\n`. Lives in `render.mjs`.

---

## fs ↔ notebook file layout

One `InMemoryFs` is the agent's whole world. Each live module is materialized as exactly ONE
`.js` text file whose PATH encodes the module id:

```
/notebook/<moduleId>.js
e.g. /notebook/@tomlarkworthy/robocoop-4.js   ('@user/name' segments become real subdirs)
```

- Cells are NOT separate files — a module's cells live inside its single `define()` body. The
  agent edits cell bodies textually with bash (`sed -i` / `cat >` / `grep`); the whole file is
  the unit that gets re-applied.
- `fsmap.mjs` owns the pure path↔id codec and the system-path filter:
  - `idToPath(id)` → `/notebook/` + id + `.js`
  - `pathToId(path)` → strips prefix + `.js`
  - `listModuleFiles(fs)` → `getAllPaths()` filtered to the `/notebook/` prefix (excludes
    `/bin`, `/usr`, `/dev`, `/proc`). The SINGLE chokepoint every assert routes through.

NODE eval path (no runtime, no exporter, no DOM):
- Harness seeds fixtures: `new InMemoryFs()`, `fs.mkdir('/notebook/@user', {recursive:true})`,
  `fs.writeFile(idToPath('@user/m'), srcString)`.
- One stateful `createNodeSession(fs)` provides `runCommand` (threads cwd/env via
  `result.env` / `result.env.PWD`).
- Agent loop mutates files; grading reads back via `fs.readFile` / `fs.exists` /
  `listModuleFiles(fs)` and runs programmatic assertions (file-contains, identifier
  present/absent, parses-without-syntax-error via `new Function(src)` or acorn). No LLM judge.

BROWSER path (out of core scope, in `notebookAdapter.mjs`):
- `runCommand = cmd => window.justbash.exec(cmd)` (raw ExecResult over the shared
  `workspace.fs`, agent shell — renders live in the right-hand terminal). The adapter
  `mkdir -p`s the `/notebook` prefix before the agent's first `ls`.
- Seed fs from runtime via `exportModuleJS(id).source` (per-module — avoids exporter-3 drop).
- Edits flow back to the live runtime via the EXISTING file-sync machinery
  (`importShim(blob)` → `probeDefine` → per-pid `variable.define()/delete()`), OUTSIDE the core.
  Net-new agent-authored modules with no pids are skipped by `jbApply` — seed via
  `create_module`/`runtime.mains` first if creating modules.
- Persistence to HTML is a separate later `sync-module.ts` / jumpgate pass — never in the loop.

The core never imports any browser/runtime symbol; it only ever calls the injected
`runCommand`. That single atom is the entire node↔browser boundary.

---

## Planned file list (under `tools/robocoop-4/`)

| File | Purpose |
|------|---------|
| `openrouter.mjs` | `createOpenRouterClient({apiKey,fetch,...})->{chat}` + optional `recordClient` dev wrapper; DOM-free, pluggable fetch/key, non-streaming. |
| `scriptedClient.mjs` | `createScriptedClient(steps)->{chat}`: index-sequenced canned turns, OpenRouter-byte-identical (arguments as STRING); no key/network. |
| `render.mjs` | `formatResult(ExecResult)->string` (stdout, stderr, `[exit N]`, `(no output)`) + `truncate(text,limit)` head+tail cap. Shared by node + browser. |
| `bashTool.mjs` | `createBashTool()` → normalized `{id:'bash', description, parameters, execute}` calling `ctx.runCommand`; environment-agnostic. |
| `defineTool.mjs` | Vendored `defineTool` (port of r3 `_dmhyth`) + `validateParameters` (port of `_1d08ll1`); minimal normalize wrapper, no full registry. |
| `agentLoop.mjs` | `createAgentLoop({client,tools,systemPrompt,model,maxSteps,toolOutputLimit})->{run}`; trimmed redesign of `_fy9v7f`, non-streaming, central truncation, no autoRunTests. |
| `systemPrompt.mjs` | Bash-centric base prompt (cat/grep/sed over `/notebook/<moduleId>.js`) + `composeFooter({workdir,model})`; drops all Observable-variable instructions. |
| `fsmap.mjs` | `idToPath` / `pathToId` / `listModuleFiles(fs)` codec + system-path (`/bin`,`/dev`,`/proc`) filter. The single grading chokepoint. |
| `nodeSession.mjs` | `createNodeSession(fs)->{runCommand}` threading cwd/env via `result.env`/`.PWD` over one Bash+InMemoryFs; imports just-bash by ABSOLUTE bundle path (node-only). |
| `notebookAdapter.mjs` | Browser glue (ONLY file touching `window`): `runCommand=cmd=>window.justbash.exec(cmd)`, wires `createOpenRouterClient({apiKey,fetch:window.fetch})`, `mkdir -p` prefix, exposes `run()`. |
| `eval/harness.mjs` | Node CLI: per task seed `InMemoryFs`, build nodeSession runCommand + client (scripted default, OpenRouter when `OPENROUTER_API_KEY` set), run prompt, run `task.assert(fs)`, report pass/fail. FAILS LOUDLY if a task has no assert. |
| `eval/tasks.mjs` | Array of `{id, files:{path:src}, prompt, assert(fs)->{ok,detail}}` programmatic-assertion fixtures. |
| `eval/assertions.mjs` | Reusable primitives: `fileContains`, `fileLacksIdentifier`, `parsesWithoutSyntaxError`, `fileExists`, `fileAbsent` — all routed through `listModuleFiles`/`readFile`. |
| `eval/selfTest.mjs` | No-network: drives the loop with `scriptedClient` over a 2-step bash transcript; asserts verbatim-append, one-tool-reply-per-call, defensive-parse, truncation. |
| `index.mjs` | Re-exports the public surface (`createOpenRouterClient`, `createScriptedClient`, `createAgentLoop`, `createBashTool`, `createNodeSession`, `idToPath`, `formatResult`). |
| `README.md` | Wiring notes + how to run the eval and self-test. |

(Existing `robocoop-3.extracted.js`, `robocoop-2.extracted.js`, `observablejs-toolchain.extracted.js`
are reference material, not part of the shipped core.)
