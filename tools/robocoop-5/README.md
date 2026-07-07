# robocoop-5 — bash-less robocoop

robocoop-5 is robocoop-4 with the shell and virtual filesystem removed. The nobash experiment
(2026-07-05, results in `tools/robocoop-4/eval/live/results/strategy/`) showed the agent performs at
parity without bash: the whole performance effect of the robocoop-4 architecture is the byte-stable
`/src` Read/Write/Edit contract, and 93% of observed bash usage was `ls`/`grep`/`find` — replaced here
by structured `glob`/`grep` tools.

Notebook: `lopebooks/notebooks/@tomlarkworthy_robocoop-5.html` (2.4 MB vs robocoop-4's 3.0 MB — the
just-bash bundle was its largest block).

## Architecture

| robocoop-4 | robocoop-5 |
|---|---|
| just-bash interpreter + InMemoryFs workspace | none |
| `bash` tool | `glob` + `grep` structured tools |
| `/src` files in the fs, seeded by hostSetup | `fn.src` field on each module's compiled define function (`rc5_store.srcFns`) |
| `/notebook` mirror kept fresh by jbFileSync's poll loop | synthesized per read from `exportModuleJS` |
| `/content` mirrored eagerly (mirrorBlocks + attachmentMirror) | read directly from DOM blocks / attachment URLs |
| jbFileSync applies bash-written files asynchronously (~600ms) | write_file/edit_file compile + apply synchronously |

Modules (all fresh, no robocoop-4 dependencies):
- `robocoop-5` — chat app (no terminal; tool calls render as activity lines).
- `robocoop-5-engine` — session/model/key/prompt. The session uses a `completeGuard` (vetoes a
  task_complete with zero tool calls once per turn — mimo fabricates completions otherwise) and a
  last-non-empty toolsProvider fallback (the registry reads empty transiently during re-registration).
- `robocoop-5-srctools` — file+search+value tools, the apply engine, `rc5_host` eval seam.
- `robocoop-5-tools` — pluggable tool registry (seeded empty; `registerTool` from any cell).
- `robocoop-5-core` — the DOM-free brain: `createAgentSession` (with `completeGuard`),
  `createOpenRouterClient`, `defineTool`, `composeFooter`, transcript formatters. Descended from
  robocoop-4-core minus bash tooling and the rc4 prompt; robocoop-4 keeps its own core untouched.

The file→live apply engine (`jbApply`, with the F7 plumbing-upsert fix) lives in
`@tomlarkworthy/file-sync` next to `probeDefine`. robocoop-4's justbash-filesync still carries its own
pre-F7 copy (create-only import plumbing: a once-broken import can't be fixed by editing the file).

## Eval harness

Both robocoop harnesses share one driver + CLI (`tools/robocoop-eval/driver-core.mjs`,
`run-cli.mjs`); each side contributes a thin config (`eval/driver.mjs`: layout, seed/collect seams,
settle time) and a thin `run.mjs`. criteria/score live in `tools/robocoop-4/eval/live/` and are
imported, not copied; rc5's evals are the rc4 suite with a small overlay (`eval/evals.mjs`) for the
shell-specific self-knowledge questions.

```bash
node tools/robocoop-5/eval/run.mjs [--ids <id,..>] [--category <cat>] [--model <m>] [--json <path>]
```

`OPENROUTER_API_KEY` from `tools/robocoop-5/.env`, `tools/robocoop-4/.env`, or repo-root `.env`.

No-model checks (Playwright boot shared via `lib/notebook-boot.mjs`):
- `node tools/robocoop-5/boot-smoke.mjs` — boot, tool registry, seed/snapshot round-trip, and every
  robocoop-5-core export instantiates (lazy cells hide a missing definition until first use).
- `node tools/robocoop-5/import-heal-test.mjs` — regression for the F7 plumbing-upsert: a module
  written with a broken import binding must be healable by re-writing the corrected file.
- `bun tools/robocoop-5/guard-unit-test.mjs` — completeGuard veto path with a scripted mock client
  (fabricated completion rejected once, work proceeds, second completion accepted — no livelock).

## Results (mimo-v2.5-pro, 2026-07-05)

Full-sweep trend 0.95 → 0.96 → 0.97 → **1.00** over 45 evals (~$0.2/run; the 1.00 ran on the
refactored modules + unified harness), each systemic cause fixed at the root:
- jbApply plumbing upsert (import-cross-module 0.63 @ 41 steps → 1.00 @ 3).
- completeGuard + prompt guards for mimo's step-1 fabricated completions (fired live in
  net-fetch-json; that eval passed).
- toolsProvider last-non-empty fallback for the registry re-registration window.
- grader fix in rc4's criteria.mjs (fnParamsBody brace scan is now string/comment-aware).

Residual variance is model-stochastic (different single flake each sweep, passes on re-run).
long-store-to-checkout: 8 steps (robocoop-4 C-arm mean 10.3). Gate categories (editor-lifecycle,
drive-ui, build-tool): 1.0.

## Iterating on the system prompt

The prompt lives in the `systemPrompt` cell of `modules/@tomlarkworthy/robocoop-5-engine.js`. Edit it,
then:

```bash
bun tools/channel/sync-module.ts --module @tomlarkworthy/robocoop-5-engine \
  --source modules/@tomlarkworthy/robocoop-5-engine.js \
  --target lopebooks/notebooks/@tomlarkworthy_robocoop-5.html
node tools/robocoop-5/eval/run.mjs --ids long-store-to-checkout   # or a category / full sweep
```
