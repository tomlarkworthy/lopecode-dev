# robocoop-4 live eval harness — CONTRACT (authoritative spec)

Goal: a **re-runnable, headless** eval harness that drives the REAL robocoop-4 notebook with a real
OpenRouter model, then scores the resulting notebook state with **multivariate, easily-verified
criteria** (NO LLM-as-judge). Output is **GEPA-compatible** (per-criterion + aggregate scores +
textual feedback) so a future prompt optimizer can consume it.

Each eval = `{ question, target notebook (robocoop-4), list of scoring criteria }`. The harness sends
the question to the agent (via `session.send`), waits for the turn to finish, snapshots the world, and
runs each criterion against that snapshot. Every criterion is a pure, deterministic check.

All files live in `tools/robocoop-4/eval/live/`. Language: **`.mjs` ESM**, runnable with **`bun`** (the
driver needs `playwright`; bun is the repo convention — see `tools/lope-browser-runner.ts`). Pure-logic
modules (`criteria.mjs`, `score.mjs`, `evals.mjs`) must `node --check` clean AND import under plain node.

---

## The WorldSnapshot (THE central data structure — freeze this shape)

`driver.mjs` produces ONE `WorldSnapshot` per eval run. `criteria.mjs` consumes ONLY this object.

```js
/** @typedef {Object} WorldSnapshot */
const snapshot = {
  ok: true,                 // boolean — run reached completion without a driver/timeout error
  error: null,              // string|null — driver-level error (timeout, boot failure, send threw)
  question: "…",            // string — the prompt that was sent
  model: "anthropic/claude-sonnet-4",
  durationMs: 12345,        // number — wall time of session.send
  steps: 3,                 // number — count of assistant messages in the turn
  finishReason: null,       // string|null — if the session exposes one, else null
  conversation: [           // session.messages, VERBATIM (system/user/assistant/tool)
    { role: "user", content: "…" },
    { role: "assistant", content: "…", tool_calls: [/* raw */] },
    { role: "tool", tool_call_id: "…", content: "…" },
  ],
  toolCalls: [              // flattened, in order: every assistant tool_call across the turn
    { name: "bash", arguments: { command: "ls" } },   // arguments PARSED if JSON, else { raw: "…" }
  ],
  files: {                  // rc4_workspace.fs snapshot — text files only, keyed by absolute path
    "/notebook/README.md": "…",
    "/notebook/@user/foo.js": "…",
  },
  modules: {                // LIVE runtime modules, keyed by module id (e.g. "@user/foo", "@tomlarkworthy/robocoop-4")
    "@user/foo": {
      variables: [
        {
          name: "chart",         // string ("" for anonymous)
          source: "function …",  // string — v._definition.toString() (best effort, "" if unavailable)
          hasError: false,       // boolean — variable is in error state
          error: null,           // string|null — error message
          valueType: "SVGSVGElement", // typeof, or constructor.name for objects/elements
          valuePreview: "<svg …", // string — short rep: primitives stringified; Element -> outerHTML
                                   //   (truncated to 600 chars); object -> JSON (truncated); fn -> "[fn]"
          isSvg: true,           // boolean — value is an Element whose outerHTML contains "<svg"
        },
      ],
    },
  },
  errors: [                 // every variable currently in error: "<moduleId>:<varName>: <message>"
    "@user/foo:bad: Plot is not defined",
  ],
  console: [                // console errors/warnings captured DURING the turn
    { type: "error", text: "…" },
  ],
};
```

### Runtime access (inside `page.evaluate`, browser context)

The bootloader sets `globalThis.__ojs_runtime`. Walk it like this (PROVEN pattern):

```js
function allVariables() {
  const reg = globalThis.__ojs_runtime;
  const out = []; // [{ moduleObj, v }]
  const seenRt = new Set();
  for (const m of reg.mains.values()) {
    const rt = m && m._runtime; if (!rt || seenRt.has(rt)) continue; seenRt.add(rt);
    for (const v of rt._variables) out.push({ v, moduleObj: v._module });
  }
  return out;
}
// module id of a variable: scan the runtime's `currentModules` value Map for info.module === moduleObj
//   -> info.name is the id. (currentModules is itself a variable value somewhere in _variables.)
// a variable's value: v._value ; error: v._error ; name: v._name ; def: v._definition.
```
- `rc4_workspace` value has async `.snapshot()` → `{path: contents}`; use it for `files`.
- `session` value has `.messages` (array) and `.send(text, callbacks)`.
- Force a lazy var to compute with `moduleObj.value(name)` (returns a promise) if needed.

---

## driver.mjs

```js
export async function createDriver({
  notebookPath,           // abs path to @tomlarkworthy_robocoop-4.html
  apiKey,                 // string — NEVER log it
  model = "anthropic/claude-sonnet-4",
  layout = "R100(S75(@tomlarkworthy/robocoop-4),S25(@tomlarkworthy/robocoop-4-hostbridge))",
  timeoutMs = 120000,
  headed = false,
}) { … return { runQuestion, close }; }

// runQuestion(evalDef) -> WorldSnapshot
//   1. fresh page; goto `file://${notebookPath}#view=${layout}` (NO cc token).
//   2. waitForFunction(() => globalThis.__ojs_runtime && __ojs_runtime.mains.size).
//   3. inject key+model: set `viewof OPENROUTER_API_KEY` element .value=apiKey + dispatch 'input';
//      set `viewof model` .value=model + dispatch 'input'. Then POLL until the `client` variable
//      value is non-null AND a fresh `session` (whose .send won't immediately throw the no-key stub).
//   4. if evalDef.setup?.files: write each into rc4_workspace.fs (await fs.writeFile).
//   5. capture console errors/warnings via page.on('console') from step 1 onward.
//   6. inside page.evaluate, call `await session.send(question)` racing a timeout; then build + return
//      the WorldSnapshot. Wrap everything so a thrown/timeout yields { ok:false, error, …partial }.
//   7. close the page (fresh page per eval = isolation).
// close(): close the browser.
```
Reference Playwright launch + `__ojs_runtime` wait in `tools/lope-browser-runner.ts` and
`tools/headless-pairing-host.ts`. Headless by default (user requirement). The key comes from
`process.env.OPENROUTER_API_KEY` (loaded by run.mjs); do not print it.

---

## criteria.mjs

```js
export const CRITERIA = {
  // name: (snapshot, args) => ({ score: 0..1, pass: boolean, feedback: string })
};
export function runCriterion(name, snapshot, args) { … } // throws on unknown name
```
Each criterion is pure over the snapshot. `score` is usually 0 or 1; use fractional only where natural
(e.g. `min_words` → min(words/count, 1)). `feedback` is one terse line explaining the score (what was
expected vs found) — this is the text GEPA reflects on, so make it actionable.

**Catalog to implement** (args in braces; a "target" resolves a string to search: prefer `file` (look up
`snapshot.files[path]`), else `module`+`var` (find that variable's `source` in `snapshot.modules`), else
search `conversation` assistant text):

- `contains_string` {file?|module?,var?, needle, ignoreCase?} — target contains needle.
- `not_contains_string` {…, needle} — target does NOT contain needle.
- `uses_identifier` {…, ident} — word-boundary `\bident\b` present.
- `does_compile` {file?|module?,var?} — file/var source parses (strip top-level import/export, then
  `new Function(src)`); if a whole `module` is given with no var, pass iff NO variable in that module hasError.
- `balanced_braces` {file?|var} — counts of `{}`,`()`,`[]` balance (ignore that strings may contain them; good enough as a smoke check).
- `no_var_keyword` {file?|var} — no `\bvar\b` declaration (code-quality).
- `has_doc_comment` {module} — module has ≥1 variable whose source mentions `md\`` OR a `//`/`/*` comment (docs present).
- `min_words` {file?|var, count} — word count ≥ count (fractional score = words/count capped at 1).
- `answer_contains` {file?|var, needle, ignoreCase?} — doc-comprehension: the agent's written answer contains needle.
- `file_exists` {path} / `file_absent` {path} — in snapshot.files.
- `module_exists` {id} / `module_absent` {id} — in snapshot.modules.
- `variable_defined` {module, name} — variable present (and not anonymous).
- `variable_no_error` {module, name?} — that var (or all vars in module if no name) has no error.
- `variable_equals` {module, name, equals} — `String(valuePreview) === String(equals)` (primitives).
- `renders_svg` {module, name} — that variable isSvg OR valuePreview includes "<svg".
- `uses_plot` {module?,var?,file?} — source references `Plot.` (chart task).
- `no_runtime_errors` {} — snapshot.errors is empty.
- `tool_used` {name, minTimes?} — ≥ minTimes(default 1) toolCalls with that name.
- `tool_not_used` {name} — zero toolCalls with that name.
- `max_steps` {n} — snapshot.steps ≤ n (efficiency).

If `snapshot.ok === false`, EVERY criterion scores 0 with feedback "run failed: <error>".

---

## evals.mjs

```js
export const EVALS = [
  {
    id: "module-create-basic",
    category: "module-lifecycle", // one of: module-lifecycle | documentation | doc-comprehension | plot | coding | code-quality
    question: "…",                // sent verbatim to session.send
    setup: { files: { "/notebook/@user/seed.js": "…" } }, // optional; seeded into the workspace fs first
    criteria: [
      { name: "file_exists", args: { path: "/notebook/@user/foo.js" }, weight: 1 },
      { name: "does_compile", args: { file: "/notebook/@user/foo.js" } },
      …
    ],
  },
  …
];
```
Author **at least the six categories** the user named, ≥1 eval each (aim ~8–12 total):
1. **module-lifecycle** — create a new module/file AND remove an existing one (seed one to remove).
   Check both the workspace-fs level (`file_exists`/`file_absent`) and, where applicable, the live
   `module_exists`/`module_absent`. (NOTE: the host bridge may only update EXISTING live modules — so a
   "create live module" criterion legitimately surfaces that gap; that's a wanted finding, keep it.)
2. **documentation** — ask the agent to write documentation for a seeded module; check `min_words`,
   `contains_string` of the key fact, `has_doc_comment`.
3. **doc-comprehension** — seed a module whose doc states a specific fact (e.g. "the rate limit is 7"),
   ask a question whose answer requires reading it, instruct the agent to write the answer to
   `/notebook/answer.txt`; check `answer_contains` the fact. (Tests reading+understanding, verifiable.)
4. **plot** — ask for a chart built with Observable `Plot`; check `uses_plot` + `renders_svg` (+ `does_compile`).
5. **coding** — a small coding task with a checkable runtime value (e.g. define `sum = a+b` with seeded a,b)
   → `variable_equals` / `variable_no_error`.
6. **code-quality** — a coding task plus quality criteria: `no_var_keyword`, `balanced_braces`, `has_doc_comment`, `does_compile`.

Keep questions concrete and unambiguous so the target is mechanically checkable. Tell the agent exactly
WHERE to put results (specific file path / module / variable name) so criteria can find them.

---

## score.mjs

```js
import { CRITERIA, runCriterion } from "./criteria.mjs";
export function scoreEval(evalDef, snapshot) {
  // returns:
  // { id, category, question, ok: snapshot.ok,
  //   results: [ { name, args, weight, score, pass, feedback } ],
  //   aggregate,        // weighted mean of scores, 0..1
  //   passed, total }   // counts of pass===true
}
export function toGepaRecord(scored, snapshot) {
  // GEPA-compatible rollout record:
  // { inputs: { question }, score: scored.aggregate,
  //   feedback: <newline-joined feedback of the criteria that did NOT fully pass>,
  //   perCriterion: { [name]: score }, meta: { id, category, steps: snapshot.steps, durationMs } }
}
```

## run.mjs (CLI)

```
bun tools/robocoop-4/eval/live/run.mjs [--only <id>] [--category <cat>] [--model <m>]
    [--timeout <ms>] [--headed] [--json <path>] [--fail-under <0..1>] [--notebook <path>]
```
- Load `.env` the SAME way `tools/robocoop-4/eval/run-eval.mjs` does (search `tools/robocoop-4/.env`
  then repo-root `.env`; existing `process.env` wins). Require `OPENROUTER_API_KEY`.
- Default notebook: `lopebooks/notebooks/@tomlarkworthy_robocoop-4.html` (abs-resolve).
- Default model: `process.env.OPENROUTER_MODEL || "anthropic/claude-sonnet-4"`.
- `createDriver` ONCE; loop evals (filtered); per eval: `runQuestion` → `scoreEval` → print a row
  `PASS/PART/FAIL  <id>  <aggregate>  steps=<n>  (<passed>/<total>)`; collect `toGepaRecord`s.
- Write a JSON artifact `{ model, when, evals:[…full scored…], gepa:[…records…] }` to `--json`
  (default `tools/robocoop-4/eval/live/results/latest.json`). Print a final summary line.
- Exit 0 if every eval aggregate ≥ `--fail-under` (default 0 → always 0 = report mode); else 1.
- NEVER print the api key.

---

## Conventions
- Terse comments, only where the *why* is non-obvious (repo CLAUDE.md rule).
- No new npm deps beyond `playwright` (already used in repo).
- Keep working files under `tools/` (CLAUDE.md). `results/` holds run artifacts (gitignore-able).
