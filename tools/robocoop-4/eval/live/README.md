# robocoop-4 live eval harness

A re-runnable, **headless** eval harness that drives the real `@tomlarkworthy/robocoop-4` notebook with
a real OpenRouter model, then scores the resulting notebook state with **deterministic, multivariate
criteria** (no LLM-as-judge). Output is **GEPA-compatible** so a prompt optimizer can consume it.

Each eval is `{ question, criteria }` (optionally `setup`). The harness boots the notebook in Playwright,
injects the API key + model, sends the question to the agent, waits for the turn to finish, snapshots the
world (files, live modules, tool calls, console, errors), and runs each criterion against that snapshot.
Every criterion is a pure, deterministic function of the snapshot.

See `CONTRACT.md` for the authoritative `WorldSnapshot` shape and all interfaces.

## Running

```bash
bun tools/robocoop-4/eval/live/run.mjs [options]
```

Options:

| Flag | Default | Meaning |
|------|---------|---------|
| `--only <id>` | — | run only the eval with this id |
| `--category <cat>` | — | run only evals in this category |
| `--model <m>` | `$OPENROUTER_MODEL` or `anthropic/claude-sonnet-4` | OpenRouter model |
| `--timeout <ms>` | 120000 | per-turn timeout |
| `--headed` | off | show the browser window |
| `--json <path>` | `results/latest.json` | output artifact path |
| `--fail-under <0..1>` | 0 | exit 1 if any eval aggregate is below this (0 = report-only) |
| `--notebook <path>` | `lopebooks/notebooks/@tomlarkworthy_robocoop-4.html` | target notebook |

`OPENROUTER_API_KEY` is required. It is loaded from `tools/robocoop-4/.env` then repo-root `.env`
(existing `process.env` wins), or passed inline. The key is never printed.

Per-eval output row:

```
PASS/PART/FAIL  <id>  <aggregate>  steps=<n>  (<passed>/<total>)
```

`PASS` = aggregate 1.0, `FAIL` = aggregate 0.0, `PART` = in between. A final `mean aggregate` line
summarizes the run. Exit code is 0 in report mode (`--fail-under 0`), otherwise 0 iff every eval
aggregate is ≥ `--fail-under`.

## Adding an eval

Append an object to `EVALS` in `evals.mjs`:

```js
{
  id: "my-eval",
  category: "coding", // module-lifecycle | documentation | doc-comprehension | plot | coding | code-quality
  question: "…",      // sent verbatim to the agent; say exactly WHERE to put the result
  setup: { files: { "/notebook/@user/seed.js": "…" } }, // optional: seeded into the workspace fs first
  criteria: [
    { name: "file_exists", args: { path: "/notebook/@user/foo.js" }, weight: 1 },
    { name: "does_compile", args: { file: "/notebook/@user/foo.js" } },
  ],
}
```

Make questions concrete and tell the agent the exact file path / module / variable name to write to, so
the criteria can mechanically locate the result. `weight` defaults to 1.

## Criterion catalog

A "target" resolves a string to check: prefer `file` (looks up `snapshot.files[path]`), else
`module`+`var` (that variable's source), else the assistant's conversation text.

| Criterion | Args | Checks |
|-----------|------|--------|
| `contains_string` | `file?\|module?,var?, needle, ignoreCase?` | target contains needle |
| `not_contains_string` | `…, needle` | target does NOT contain needle |
| `uses_identifier` | `…, ident` | word-boundary `\bident\b` present |
| `does_compile` | `file?\|module?,var?` | source parses (or no var hasError for a whole module) |
| `balanced_braces` | `file?\|var` | `{}` `()` `[]` counts balance |
| `no_var_keyword` | `file?\|var` | no `\bvar\b` declaration |
| `has_doc_comment` | `module` | ≥1 variable mentions `` md` `` or a `//` / `/*` comment |
| `min_words` | `file?\|var, count` | word count ≥ count (fractional score = words/count) |
| `answer_contains` | `file?\|var, needle, ignoreCase?` | agent's written answer contains needle |
| `file_exists` | `path` | file present in snapshot |
| `file_absent` | `path` | file absent |
| `module_exists` | `id` | live module present |
| `module_absent` | `id` | live module absent |
| `variable_defined` | `module, name` | named variable present |
| `variable_no_error` | `module, name?` | variable (or all in module) has no error |
| `variable_equals` | `module, name, equals` | `String(valuePreview) === String(equals)` |
| `renders_svg` | `module, name` | variable isSvg or preview includes `<svg` |
| `uses_plot` | `module?,var?,file?` | source references `Plot.` |
| `no_runtime_errors` | — | `snapshot.errors` empty |
| `tool_used` | `name, minTimes?` | ≥ minTimes (default 1) tool calls of `name` |
| `tool_not_used` | `name` | zero tool calls of `name` |
| `max_steps` | `n` | `snapshot.steps` ≤ n |

If `snapshot.ok === false` (driver/timeout failure), every criterion scores 0 with feedback
`run failed: <error>`.

## GEPA integration

The JSON artifact's `gepa[]` array is a list of rollout records for a prompt optimizer:

```js
{
  inputs: { question },        // the prompt that was sent
  score,                       // the eval aggregate (0..1)
  feedback,                    // newline-joined feedback of criteria that did NOT fully pass
  perCriterion: { [name]: score },
  meta: { id, category, steps, durationMs },
}
```

`feedback` is the actionable text GEPA reflects on, so each criterion writes a terse "expected vs found"
line. Run the harness across a suite, feed `gepa[]` to the optimizer, and it has per-criterion signal
plus human-readable feedback to mutate the agent's prompt against.
