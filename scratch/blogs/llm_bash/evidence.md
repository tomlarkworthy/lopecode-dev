# Evidence base — "LLMs are overfitted" blog post

Compiled 2026-06-28 from the robocoop-4 development session in `lopecode-dev`. Every claim below is
backed by a git commit, a benchmark artifact, or a source line. Repos:

- parent: https://github.com/tomlarkworthy/lopecode-dev — commit link: `…/commit/<hash>`
- lopecode (published notebooks): https://github.com/tomlarkworthy/lopecode
- lopebooks (staging notebooks): https://github.com/tomlarkworthy/lopebooks

## The system under study: robocoop-4

An in-notebook coding agent. It edits a live Lopecode (Observable-runtime) notebook through a small tool
set, driven by an arbitrary OpenRouter model. The agent **and its eval harness are git-tracked modules**,
so each experiment is a commit and each harness change is a diff.

Tool surface (deliberately shaped to the frontier-model training distribution):

- **`bash`** — "Run a bash command in a sandboxed shell over an in-memory project filesystem."
  (`modules/@tomlarkworthy/robocoop-4-core.js`, `createBashTool`). This is the Terminal-Bench shape.
- **`read_file` / `write_file` / `edit_file`** — "mirror Claude Code's Read/Write/Edit argument shapes
  (`file_path,offset,limit` / `file_path,content` / `file_path,old_string,new_string,replace_all`).
  Replacement is LITERAL (not regex), so no sed-escaping traps."
  (`modules/@tomlarkworthy/robocoop-4-hostbridge.js:359`).

The thesis in one sentence: frontier models are RL-tuned against bash execution (Terminal Bench) and
Claude-style file tools; making your harness honor those exact contracts moves you up the jagged frontier,
and *violating* them silently strands capability the model already has.

---

## Experiment 0 (the A/B): bash-only sed editing → Claude-shaped Read/Write/Edit

The natural before/after, one hour apart in git history. Full design + reproduction in
`data/experiment-bash-vs-tools.md`; BEFORE build pinned at `data/robocoop-4_BEFORE_bash-only_9f7b205.html`.

- **BEFORE** `9f7b205` (2026-06-24 07:05) — bash only. System prompt: *"Use the bash tool for everything: ls,
  cat, grep, sed, awk, head, tail to read; sed -i, a quoted heredoc, …"*. Capability-gate **mean 0.94 / 27**.
  Verified: pinned HTML contains the sed prompt, zero `edit_file`/`old_string`.
- **AFTER** `01b31df` (2026-06-24 08:06) — added read/write/edit "mirroring Claude Code's exact argument
  shapes … LITERAL replacement (no regex/sed-escaping) with CC's uniqueness / not-found / identical errors";
  *"the agent no longer writes via sed"*; in-turn compile feedback. Capability-gate **mean 0.95 / 27**
  ("best yet"). https://github.com/tomlarkworthy/lopecode-dev/commit/01b31df

**Honest reading:** the contemporaneous gate moved only 0.94→0.95 because those 27 evals scored task
*completion*, not editing *quality* — there were **0** evals for incremental-editing or decomposition at that
time. The real gain (blind sed → synchronous compile feedback; monolith → decomposed output) is on dimensions
that benchmark didn't measure. The apples-to-apples test (design in `data/experiment-bash-vs-tools.md`):
run a **curated editing-only subset** against BOTH **adjacent** pinned builds — `9f7b205` (sed) and
`01b31df` (Claude tools), which differ essentially only in the editing-tool section, so the variable is
isolated (old-build-vs-current would confound the tools with a year of prompt evolution). The subset is the
**21 of 44 evals that generically measure editing** (`data/editing-eval-subset.json`): drop any eval scored
by tool-presence criteria (circular) or testing a prompt-taught fact (self-knowledge, network,
value-inspection, doc prose). Sharpest sub-tier = the **6 in-place edits** (bug-fixes + live-cell edits).
Caveats: relax the driver's `read_file` ready-gate for both runs; score outcome + decomposition only.
Recorded gate trail for context: `5a5edd8` 0.98, `9f7b205` 0.94/27, `01b31df` 0.95/27, `bbcaf70` 0.97/27.
Both adjacent builds pinned: `data/robocoop-4_BEFORE_bash-only_9f7b205.html` (0 `old_string`),
`data/robocoop-4_AFTER_claude-tools_01b31df.html` (10 `old_string`).

---

## Experiment 1 (CENTRAL): the `/src` byte-stability fix

**Commit:** `0c8a33a` — "robocoop-4: /src stable editing cache (fixes forced whole-file rewrites)"
https://github.com/tomlarkworthy/lopecode-dev/commit/0c8a33a

**Symptom.** The agent did whole-file `write_file` rewrites instead of incremental `edit_file` edits, and
produced one giant monolith cell.

**Root cause (a violated tool contract, not a model weakness).** Claude-style `edit_file` works by matching
an exact `old_string` the model remembers from a prior read. Our harness re-serialised the module via
`exportModuleJS` on every apply (compile → decompile), reformatting the file out from under the agent — so
the next `edit_file`'s `old_string` no longer matched, the edit failed, and the model fell back to the one
operation that always works, a full `write_file` rewrite. The model *knew* how to edit incrementally (it is
trained to); the harness broke the precondition.

**Fix (one regex + don't reformat the editing surface).** Add a `/src` tree as the agent's stable editing
copy: applied live on write, but **never reformatted** — only the canonical `/notebook` mirror is refreshed.
The load-bearing change is one line:

```diff
-    const m = /^\/notebook\/(.+)\.js$/.exec(path);
+    const m = /^\/(?:notebook|src)\/(.+)\.js$/.exec(path);
```
…plus writing the reformatted canonical back to `/notebook` only, leaving `/src` byte-for-byte as the agent
left it. (Full diff in `data/harness-diffs.md`.)

**Result (measured, live).** A fresh "fully featured Audio DAW" build went from a **691-line monolith** to
**42 decomposed cells built via 25 `edit_file` : 1 `write_file`**, **0 errored cells**, ended on
`task_complete`, working Web Audio @48kHz. Same model, same prompt — the only change was honoring the
edit-tool contract.

---

## Experiment 2: reasoning-model token budget

**Commit:** `0c19a51` — "raise agent maxTokens 8192->32000 for reasoning models (MIMO truncated
mid-reasoning before tool call)" https://github.com/tomlarkworthy/lopecode-dev/commit/0c19a51

Reasoning models (e.g. `xiaomi/mimo-v2.5`) spend completion budget on hidden reasoning. At 8192 the response
was cut off (`finish_reason: 'length'`) **before** the tool call was emitted; the loop stopped on `length`,
so the build silently died after only exploring. Raising the cap to 32000 (room for reasoning + a full tool
call) fixed it. Another "match the model's actual operating envelope" change, not a prompt trick.

---

## Experiment 3: the same harness, very different models (the jaggedness itself)

**Commit:** `4cb20f6` — model-sweep validation.
https://github.com/tomlarkworthy/lopecode-dev/commit/4cb20f6

On the identical harness: `gpt-5.4-mini` built `@tomlarkworthy/audio-daw` (17 cells, 0 errored, idiomatic
reactive state + transport + step grid) and used the force-compute feedback to fix a runtime error before
completing; `gemini-3.5-flash` "no longer crashes but remains a weak agentic builder." Same task, same
tools — capability is jagged across models, which is exactly what "overfit to a training shape" predicts.

Related: `9806c85` (allow tool-only models in the picker; tag non-vision) — tool-calling support is itself a
gating capability, so the picker filters to it. https://github.com/tomlarkworthy/lopecode-dev/commit/9806c85

Also from the session log (not a public commit): on budget OpenRouter keys, Opus 402s because the engine
omits `max_tokens` — so we test-drive agent notebooks on Sonnet/MIMO, not Opus. A reminder that the harness
contract extends to billing/parameter shape, not just tools.

---

## Quantitative benchmark: the live eval suite

**Harness:** `tools/robocoop-4/eval/live/` — a re-runnable, headless eval that drives the real notebook with
a real OpenRouter model, then scores the resulting runtime state with **deterministic, multivariate criteria
(no LLM-as-judge)**. Output is GEPA-compatible. **44 evals across 19 categories.**

Capability-gate categories (each pins a real, observed regression and must score 1.0):
- `editor-lifecycle` (4) — the agent edits the notebook's own cells live (modify/recompute, delete/prune,
  import-into-existing, viewof-render). Commit `c0f29f2`.
- `drive-ui` (2) — the agent operates rendered UI (set a slider, type into custom HTML) without editing
  source. Commit `98e2cc9`.
- `build-tool` (1) — the agent self-extends: `registerTool(...)` a new tool, then calls it the same turn.
- `src-editing` (2) — NEW: encodes the `/src` contract (byte-stability + incremental-grow). Commit `bd8b215`.

**3× full sweep, `xiaomi/mimo-v2.5-pro`** (raw per-eval data in `data/mimo-3x-sweep-per-eval.csv`,
raw run artifacts `data/mimo-sweep-{1,2,3}.json`):

| sweep | mean aggregate | perfect (1.0) evals |
|-------|----------------|---------------------|
| 1     | 0.902          | 37 / 44             |
| 2     | 0.951          | 40 / 44             |
| 3     | 0.980          | 42 / 44             |

All three capability gates scored 1.0 in every sweep (no regression from the `/src` rework).

**Two of the sub-1.0 evals were eval bugs, not model failures** (the harness penalised correct behaviour):
- `clarify-missing-symbol`: the agent correctly asked "how would you like to proceed?" but the criterion
  only inspected the final `task_complete` summary. Fixed to scan the whole turn.
- `self-boot-mains`: the agent grounded via the `read_file` tool, but the criterion demanded a *bash*
  command. Fixed to accept either tool.
Fixing both lifts the effective means to **0.92 / 0.97 / 1.00**. (Commit `bd8b215`.) Worth keeping in the
post: even a deterministic benchmark can mis-measure when it over-specifies the *mechanism* instead of the
*outcome* — the same overfitting trap, one level up.

Residual genuine sub-1.0 after the bug fixes: 2 infra flakes (network/transient empty-model in sweep 1
only), `algo-balanced-brackets` (model wrote code that fails to parse 2/3), `inspect-anonymous-cell`
(tool-choice variance), `src-incremental-build` (anti-hardcode extractor missed two cells in 1/3; live
result still correct).

---

## Why Lopecode makes this shareable (the hermeticity angle)

A Lopecode notebook is a single self-contained HTML file (no external runtime). The agent, the host bridge,
the OpenRouter client, and the eval harness are all modules **inside** that file / the repo. Consequences for
evidence-based claims:

- **Every experiment is a commit.** The whole agent state travels with the diff.
- **Every harness change is a `git diff`.** e.g. the one-line `/src` regex above is the entire mechanism of
  the central result — reviewers can see exactly what changed.
- **Every benchmark run is a JSON artifact** with per-criterion scores and full transcripts — re-scorable
  offline, so a criterion fix can be validated against past runs without re-spending model budget (we did
  exactly this for the two eval-bug fixes).

---

## Key commit index (chronological, parent repo)

| hash | what |
|------|------|
| `c0f29f2` | evals: editor-lifecycle suite (agent edits Lopecode live) |
| `872bbc4` | evals: cover cross-module + external-ESM imports |
| `0775dd9` | evals: persist transcripts + GEPA action trace |
| `699be68` | eval: wait for session.send before sending (kill boot race) |
| `9806c85` | allow tool-only models in picker, tag non-vision |
| `e43594c` | prompt idioms + doc-editing evals + tool-registration race fix |
| `4cb20f6` | model-sweep: gpt-5.4-mini clean DAW; gemini-3.5-flash weak |
| `0c19a51` | raise maxTokens 8192→32000 for reasoning models |
| `fb18ea6` | MIMO out-of-the-box VALIDATED (2 fresh builds, viewofs populated) |
| `c0f29f2` / `98e2cc9` | editor-lifecycle / drive-ui + build-tool capability gates |
| `0c8a33a` | **/src stable editing cache — the central result** |
| `bd8b215` | first-turn empty-model race fix + /src eval coverage |
| `586603c` | embed full OpenRouter catalog snapshot as 5s fallback |

Notebook artifacts: lopecode `6c73327`, lopebooks `f9cfaab`.
