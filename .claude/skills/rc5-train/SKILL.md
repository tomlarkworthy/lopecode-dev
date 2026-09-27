---
name: rc5-train
description: Use when the user asks to "train robocoop-5", "/rc5-train", run the in-notebook agent on goals and improve it from the traces, or stress-test robocoop-5 on Lopecode tasks. Fans out parallel workers; each drives the real chat UI headless on a goal prompt in a private notebook copy, aborts early when a fixable problem derails the run, finds the cause, encodes it as an eval that fails on it, applies a candidate change to its copy, shows the eval pass, and returns a proposal with before/after evidence. Proposals are human-approved before anything touches the canonical notebook.
version: 0.1.0
---

# rc5-train: reflective training of the in-notebook agent

This is `/improve` for robocoop-5. The traces come from real runs of the agent in its own UI, not
from Claude Code sessions.

**Every fix ships with an eval.** A proposal without one is not accepted: the eval is what stops
the defect coming back when the prompt, the model or the tools change. Two layers:

| layer | what | lives in (after approval) | runs with |
|---|---|---|---|
| harness | a model-free probe that drives the tools directly and fails on the bug | `tools/scratch/rc5-sessions/sNN-<slug>.mjs` | `node <probe>` |
| agent | an eval case: a prompt, criteria that fail on the defect, an `oracle` reference solution | `tools/robocoop-5/eval/evals-rc5-train.mjs` (category `rc5-train`) | `node tools/robocoop-5/eval/run.mjs --category rc5-train` |

A harness bug needs both. A prompt, wiki or trigger fix needs the agent eval, and when the fix is a
wiki page the eval carries `{ name: "tool_call_matches", args: { pattern: "<page>.md" } }` so it
also asserts the page was read. A model-only finding needs neither. Workers propose; the orchestrator (you, in the main session) aggregates
and applies only what the user approves. Nothing a worker does writes the canonical
`lopebooks/notebooks/@tomlarkworthy_robocoop-5.html`.

Read `knowledge/training-robocoop-5.md` first (the benchmark method this extends) and
`knowledge/writing-cells-in-module-source.md` (a wiki page with `write-triggers`, the model for new
ones).

## Where a change belongs

Decide this before drafting anything. A worker's cause analysis ends in exactly one of these.

| cause | change | where |
|---|---|---|
| A tool, the apply path, the UI or the engine misbehaves | bug fix | the owning module: `robocoop-5-{srctools,engine,core,context,tools,sessions}`, `file-sync`, `markdown-wiki` |
| Every agent on every task needs it (file model, tool contract, the `$def` format itself) | system prompt edit, as short as possible | `robocoop-5-engine` → `systemPrompt` cell |
| Only tasks that touch construct X need it (viewof, mutable, imports, Plot, file attachments …) | wiki page | `knowledge/<name>.md`, `scope: [..., in-notebook]` |
| The agent attempts X without reading the page for X | a `write-triggers` regex on that page | the page's frontmatter |
| A tool result misleads the agent (says "computes" when the value is wrong, a silent no-op) | a hint in the tool result | the tool in `robocoop-5-srctools` |
| The model stalls or reasons for minutes with no output | nothing to fix in the harness; record the step time and report it | proposal only |

One wiki page per topic, named for the task the agent is doing when it needs it. Do not fold a
topic into a neighbouring page because they often occur together: researching a library (finding
one, reading its docs and versions, choosing) is its own page; making it load offline is the
vendoring page, read later.

The system prompt is sent on every step of every session, so it costs on every call. A wiki page
costs only when read. `write-triggers` make the read enforced rather than hoped for: a
`write_file`/`edit_file` on `/src/…` whose content matches a trigger is refused until the session
has `read_file`d that page (the gate is `wikiGate` in `robocoop-5-srctools` `_fileTools`). Prefer
page + trigger over a prompt line for anything construct-specific.

The gate covers module writes only. A problem that happens through `eval_js` (a mutation, a global
side-effect) cannot be gated today; proposing to extend the gate is a valid bug-fix proposal.

**Take the idiom from the corpus, not from memory.** The ~220 notebooks in `lopecode/notebooks`
and `lopebooks/notebooks` are the record of what works here. Any fix that tells the agent how to
write something (a prompt line, a wiki example, a tool hint, the eval's `oracle`) must quote a
real cell that already does it, cited as `module.cell (notebook file)`, and should be copied from
that cell rather than written fresh (`writing-cells-in-module-source.md` copied its `mutable`
example from `@spond/revised-sars-cov-2-analytics-page`). Count the competing forms before
choosing one; for example, on 2026-09-27 an `on…=${…}` handler appeared inside `htl.html` in 247
notebook files and inside the stdlib `html` in 6:
```
grep -lE '<pattern A>' lopecode/notebooks/*.html lopebooks/notebooks/*.html | wc -l
grep -lE '<pattern B>' lopecode/notebooks/*.html lopebooks/notebooks/*.html | wc -l
```
Counts include embedded copies of the same module, so also name the distinct modules. Read a
cited cell with `bun tools/lope-reader.ts <file> --get-module <module>`. If the corpus has no
precedent, say so in the proposal: a novel idiom needs the user's judgement, not just a passing eval.

**No tactical fixes.** A change must hold for tasks other than the one that exposed it. "When
building a game-theory model, use sliders" is tactical. "A viewof value cell is
`(G, v) => G.input(v)`; reading `.value` does not react" is general. The test: would the change
be written the same way if the prompt had been about a different domain?

## Orchestrator procedure

1. **Goals.** From the user: one prompt, a list, or a theme ("imports", "reactive UI"). If a theme,
   write 3–6 concrete prompts a Lopecode user would type. Keep one prompt per worker.
2. **Run id.** `RUN=$(date +%Y%m%d-%H%M)`. Worker `k` uses `tools/scratch/rc5-train/$RUN/w<k>/`
   (gitignored) and run names `$RUN-w<k>-*`.
3. **Spawn workers in one message**, `Agent` with `model: "opus"` (the model gate blocks an
   unpinned spawn on Fable), no `isolation` (they share the repo read-only and write only under
   their own dir). Prompt = the worker brief below with GOAL, DIR and NAME filled in. ≤ 4 workers:
   each runs a Chromium and real model calls.
4. **Aggregate.** When all return, read each `DIR/proposal.md`. Open each cited precedent and
   check the fix matches it; a proposal whose idiom has no precedent goes to the user flagged. Merge proposals that name the same
   cause (count them: "found by 3 workers" is the strongest signal). Present a numbered list:
   verified changes first, then unverified, then model-only observations.
5. **Stop for approval.** Apply nothing unapproved.
6. **Apply approved changes to the canonical**, one at a time:
   - module: `bun tools/lope-sync.ts checkout <m>`, port the worker's diff (`diff` the worker's
     `DIR/<m>.js` against a fresh `rc5-sandbox.sh get` of the canonical, never copy the worker's
     whole file over a canonical that may have moved), `sync-module` into the canonical (and
     `markdown-wiki`'s own notebook for that module), `lope-preflight`.
   - wiki: copy `DIR/knowledge/<page>.md` into `knowledge/`, invoke the `document` skill on it,
     then `bun tools/sync-wiki.ts --write --doc <page>.md --notebook <canonical>` for the
     robocoop-5 and markdown-wiki notebooks. Do not sweep the whole corpus as part of this.
   - eval: append the worker's `DIR/eval.mjs` object to `RC5_TRAIN_EVALS` in
     `tools/robocoop-5/eval/evals-rc5-train.mjs`; copy `DIR/probe.mjs` to
     `tools/scratch/rc5-sessions/sNN-<slug>.mjs` (next free NN), pointing it at the canonical.
     `node tools/robocoop-5/eval/run.mjs --category rc5-train --oracle` must stay at 1.00.
     Only the evals with an `oracle` can be checked without a model (9 of the original 54 on
     2026-09-27: the vendoring and reflection ones); the rest score 0.00 under `--oracle` by
     construction, so a scoring-code change (criteria, driver) is checked on those 9 plus a model run.
   - Re-run the no-model probes (`node tools/robocoop-5/boot-smoke.mjs`,
     `tools/scratch/rc5-sessions/s*.mjs` relevant to the change).
   - **Regression, once for the whole batch** (workers never run it). Keep a copy of the canonical
     from before the batch (`rc5-sandbox.sh new tools/scratch/rc5-train/$RUN/pre`). Scope by what
     the batch touched:
     | batch touched | model regression |
     |---|---|
     | only wiki pages / triggers | the `rc5-train` category (each fix's own eval), no wider sweep |
     | a tool hint | + the categories that exercise that tool |
     | system prompt, engine, core, file-sync | the full suite, on `pre` and on the canonical |
     ```
     node tools/robocoop-5/eval/run.mjs --model "$MODEL" --concurrency 4 --notebook tools/scratch/rc5-train/$RUN/pre/notebook.html --json tools/scratch/rc5-train/$RUN/pre.json
     node tools/robocoop-5/eval/run.mjs --model "$MODEL" --concurrency 4 --json tools/scratch/rc5-train/$RUN/post.json
     ```
     Report per-eval before -> after. A drop on an eval is attributed to a fix by reverting that
     fix alone, not by guessing.
7. **Commit** only when the user asks (lopebooks first with `SKIP=lope-sitemap`, then the gitlink).

## Worker brief

Paste this, filled in, as the worker prompt.

```
You are an rc5-train worker. GOAL prompt: «GOAL». Your dir: DIR. Run name prefix: NAME.
Read .claude/skills/rc5-train/SKILL.md ("Where a change belongs" and "Worker procedure") and
follow the worker procedure. Write nothing outside DIR except files under
tools/scratch/rc5-evals/out/NAME-*. Your deliverable is DIR/proposal.md.
```

## Worker procedure

1. **Sandbox.** `tools/robocoop-5/rc5-sandbox.sh new DIR`. Set `MODEL` to the model the baseline
   run reports (run-one's summary line, `model: …`) and pass `--model "$MODEL"` to every `run.mjs`:
   without it `run.mjs` takes `OPENROUTER_MODEL` from `.env`, which is not the notebook's default,
   and the eval then measures a different model from the trace. Always pass `--json` into DIR;
   the default writes `tools/robocoop-5/eval/results/latest.json`, shared by every worker.
2. **Baseline run**, in the background:
   ```
   node tools/scratch/rc5-evals/run-one.mjs --notebook DIR/notebook.html --out NAME-before \
     --timeout-min 20 "<GOAL>"
   ```
   If the agent may ask for files (`request_files`), add `--answer <local paths | URL | skip>`
   (and `--answer-via chat|card` to deliver a URL the way a person would); the live log records
   `ASK <prompt> -> <answer>`. Without `--answer` a request is skipped. When the user would expect
   the result to survive saving (state, settings, anything "next time"), add `--export DIR/saved.html`:
   after the run it exports the live page, reopens the file and writes `out/NAME-before.persist.json`
   (colours, user modules and their cells, erroring cells, before and after). In an eval,
   `setup.answer` answers a request card the same way (a URL, `{files: [{name, content}]}`, or
   `"skip"`, the default).
   Watch `tools/scratch/rc5-evals/out/NAME-before.live.log` with `Monitor` (one line per message;
   `END <outcome>` when it stops). The full trace lands in `out/NAME-before.json`.
3. **Abort early** when the run is derailed by something you can already name: the same error
   three times, a write refused and then retried without the read, an import bound to an empty
   module, a value that is `NaN`/element-instead-of-number, a 400 from the API, a tool that keeps
   returning a plausible value the agent's own action should have changed (w3: `inspect_value`
   read a stale theme 4 times and the agent spent 21 of 27 steps disproving a switch that worked). Write the reason:
   `echo "<reason>" > tools/scratch/rc5-evals/out/NAME-before.abort`. Do not abort a run that is
   merely slow; a long `[rNNNNN]` reasoning step is the model, not the harness.
4. **Analyse** the trace (`out/NAME-before.json`). Check, in order:
   - `agentErrors` and `consoleErrors`. The chat renders in a shadow root; run-one already reads it.
   - `wiki`: which pages were read, and whether each was read only after a gate refusal. A page
     read only after a refusal means the index line or prompt did not steer the read; a construct
     that went wrong with no page covering it means a missing page or trigger.
   - Tool results that claim success. "computes with no runtime error" is not correctness: open
     the values in the result (`values: …`) and look for `NaN`, `[object …]`, elements where
     numbers belong, and cells that do not react to their inputs.
   - Repeated edits to the same cell: what did the agent believe that was false? That belief is
     the cause, not the last error message.
   - Step times: `t` gaps over 60s with a large `reasoning` length are model stalls.
   Name one cause, then pick its row in "Where a change belongs".
5. **Encode the defect as an eval, before changing anything.**
   - Harness bug: `DIR/probe.mjs`, driving the tools with no model (pattern:
     `tools/scratch/rc5-sessions/s14-wiki-gate.mjs`, `s10-remote-import.mjs`). Run it against the
     sandbox: it must fail now.
   - Agent eval, always (except model-only): `DIR/eval.mjs`, `export default { id: "rc5t-<slug>",
     category: "rc5-train", question, criteria, oracle }`. The question is the GOAL or a narrower
     prompt that still reaches the defect. Criteria come from `tools/robocoop-4/eval/live/criteria.mjs`
     (`variable_equals`, `live_value_contains`, `cell_fn_evaluates`, `tool_call_matches`,
     `no_tool_result_matches`, `tool_result_count_at_most`, …); at least one must fail on exactly
     what went wrong in the trace. A criterion the file lacks goes in that file (with a comment
     naming the eval that needed it), not inside `eval.mjs`.
     Write it so a *different* correct solution also passes: check values and behaviour, not
     spelling. `oracle` is a scripted correct solution (examples:
     `tools/robocoop-5/eval/evals-vendoring-patterns.mjs`). It must score 1.00:
     ```
     node tools/robocoop-5/eval/run.mjs --evals-file DIR/eval.mjs --only rc5t-<slug> --oracle --json DIR/oracle.json \
       --notebook DIR/notebook.html
     ```
     Under 1.00 means the eval is broken, not the agent.
6. **Draft the change in the sandbox.**
   - module: `rc5-sandbox.sh get DIR @tomlarkworthy/<m>`, edit `DIR/<m>.js`,
     `rc5-sandbox.sh put DIR @tomlarkworthy/<m>`.
   - wiki page: write `DIR/knowledge/<page>.md` (frontmatter `scope: [local-development, in-notebook]`
     and `write-triggers:` regexes if gating), `rc5-sandbox.sh wiki DIR <page>.md`. Keep triggers
     narrow: a trigger that matches ordinary code refuses every write until the page is read.
   - system prompt: edit the `systemPrompt` cell in `DIR/robocoop-5-engine.js`, `put` it.
7. **Verify with the eval.** The probe must pass now. Run the agent eval with the model on a
   pristine copy (`rc5-sandbox.sh new DIR/base`) and on the fixed copy:
   ```
   node tools/robocoop-5/eval/run.mjs --model "$MODEL" --evals-file DIR/eval.mjs --only rc5t-<slug> --notebook DIR/base/notebook.html --json DIR/eval-base.json
   node tools/robocoop-5/eval/run.mjs --model "$MODEL" --evals-file DIR/eval.mjs --only rc5t-<slug> --notebook DIR/notebook.html --json DIR/eval-fixed.json
   ```
   One run each side is an anecdote, not a measurement (model runs are not independent draws):
   say so. Run only your own eval: regression across the suite is the orchestrator's job (step 6
   of its procedure), done once over the whole batch of approved fixes. A new or changed
   `write-triggers` regex also gets a model-free false-positive count: how many corpus cells it
   would gate that do not use the construct (grep the regex over `lopecode/notebooks/*.html
   lopebooks/notebooks/*.html`); report it. If the base scores full marks, the eval does not reach the defect: fix the eval first.
   If the fixed copy fails differently, analyse that too; iterate up to 3 times, then report what
   you have. A `run-one.mjs --out NAME-after` run is optional, for reading the trace.
8. **Write `DIR/proposal.md`:**
   ```
   ## <one-line cause>
   class: bug | system-prompt | wiki | trigger | tool-hint | model-only
   evidence (before): <quoted trace lines, with t and run name>
   change: <diff of DIR/<m>.js or the page, against the sandbox's original>
   eval: DIR/eval.mjs (id, which criterion catches the defect); DIR/probe.mjs if any
   verified: oracle score; base score -> fixed score; probe fail -> pass
   precedent: <module.cell (file) the idiom was copied from; counts of the competing forms; or "none">
   generality: <why this is not specific to GOAL>
   not verified: <anything you could not check>
   ```
   Return the file's path and a 3-line summary.

## Measurements to report per run

From run-one's summary line and the json: outcome, wall seconds, assistant steps, tool results,
wiki pages read, gate refusals (and whether the read came before or after one), agent errors,
longest step gap. The orchestrator tables these before → after across workers.
