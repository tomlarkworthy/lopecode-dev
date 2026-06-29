# A/B experiment: bash-only (sed) vs Claude-shaped Read/Write/Edit

The cleanest test of the thesis. Same agent, same benchmark, one hour apart in git history; the only change
is the file-editing tool surface.

## The two builds

| arm | commit | date | editing surface |
|-----|--------|------|-----------------|
| **BEFORE** (bash-only) | `9f7b205` | 2026-06-24 07:05 | bash only. Prompt: *"Use the bash tool for everything: ls, cat, grep, sed, awk, head, tail to read; sed -i, a quoted heredoc, …"* |
| **AFTER** (Claude tools) | `01b31df` | 2026-06-24 08:06 | bash **+** `read_file`/`write_file`/`edit_file` mirroring Claude Code's exact arg shapes; literal replacement; in-turn compile feedback. *"the agent no longer writes via sed."* |

Pivot commit: https://github.com/tomlarkworthy/lopecode-dev/commit/01b31df

The BEFORE build is pinned in this folder as `robocoop-4_BEFORE_bash-only_9f7b205.html` (2.7 MB, the whole
hermetic agent). Verified: it contains the sed prompt and **zero** `edit_file`/`old_string` (no Claude tools).

## What we already know (contemporaneous numbers)

The live eval harness already existed at both commits, so each build was scored at the time:

- BEFORE (`9f7b205`): capability-gate **mean 0.94 / 27 evals**.
- AFTER (`01b31df`): capability-gate **mean 0.95 / 27 evals** ("best yet").

**This +0.01 understates the effect, and the reason is the point of the post.** Those 27 evals scored task
*completion* (does the value come out right), not editing *process* or output *quality*. Neither
"incremental editing reliability" nor "decomposition" was measured then — the eval suite had **0** evals for
either (the `editor-lifecycle` and `src-editing` categories did not exist yet). So the benchmark was blind to
exactly the dimension the Claude tools improve.

Where the difference actually shows up:

1. **Editing stops being blind.** With sed, the agent wrote and then waited for an async watch-loop log it
   couldn't see. With `edit_file`/`write_file`, the apply is synchronous and the result is returned **in the
   same turn**: `applied live (N cells changed)` or `FAILED TO COMPILE: <err> — live runtime unchanged; fix
   and re-edit`. (From the `01b31df` message.)
2. **Output quality / decomposition.** Only surfaced once we both (a) completed the Claude-Edit contract with
   the `/src` byte-stability fix and (b) added evals that measure it. Result: the Audio DAW went from a
   **691-line monolith** (rewrite-the-world editing) to **42 decomposed cells via 25 `edit_file` : 1
   `write_file`, 0 errored** (commit `0c8a33a`).

## The apples-to-apples re-run (recommended, not yet run)

To quantify the gap on the dimensions that matter, run the **current 44-eval benchmark** against the **BEFORE
build** and compare to the current build.

```bash
# from repo root; OPENROUTER_API_KEY in tools/robocoop-4/.env
bun tools/robocoop-4/eval/live/run.mjs \
  --notebook scratch/blogs/llm_bash/data/robocoop-4_BEFORE_bash-only_9f7b205.html \
  --model xiaomi/mimo-v2.5-pro \
  --json tools/robocoop-4/eval/live/results/BEFORE-bash-only.json
# compare to the AFTER (current) build:
bun tools/robocoop-4/eval/live/run.mjs --model xiaomi/mimo-v2.5-pro \
  --json tools/robocoop-4/eval/live/results/AFTER-current.json
```

### Two caveats to keep the comparison honest

1. **Driver gate.** The current `driver.mjs` waits for the `read_file` tool to register before sending
   (`driver.mjs:187`). The BEFORE build has no such tool, so the driver will time out. For the historical
   run, relax that gate to "session.send exists" only (its pre-`read_file` behaviour, cf. commit `699be68`).
2. **Don't score tool-presence against a build that lacks the tool.** Criteria like `tool_used edit_file` /
   `tool_not_used write_file` (the `src-editing` and `drive-ui` evals) are *circular* for the BEFORE build —
   it scores 0 because the tool didn't exist, which proves nothing. The meaningful comparison is on
   **outcome** criteria: task correctness (`variable_equals`, `cell_evaluates`, `does_compile`,
   `no_runtime_errors`) and **decomposition** (cell count / code-metrics MI of the produced module). Report
   those subsets, and report the tool-presence evals separately as "capabilities the BEFORE build lacks by
   construction."

The expected, falsifiable prediction: **completion-correctness is similar** between the two builds (matching
the 0.94 vs 0.95 we already have), while **decomposition and editing-process quality jump** with the
Claude-shaped tools — i.e. the boost is real but lives in the dimension the original benchmark didn't measure,
which is itself the cautionary tale about benchmark design.
