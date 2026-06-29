# LLMs are overfitted, and this should be central to how you design with them

*Draft — 2026-06-28. Evidence base: `evidence.md`; data: `data/`.*

## The claim

Frontier coding models are not general agents that happen to use tools. They are systems trained, by
reinforcement learning, against a narrow and public interaction shape: a bash shell (the Terminal-Bench
lineage) and a small set of file tools with Claude's exact argument schemas (`Read`, `Write`, `Edit` with
`file_path` / `old_string` / `new_string`). They are, in a useful sense, **overfit** to that shape.

The practical consequence is the "jagged frontier": the same model on the same task succeeds or fails
depending on how closely your harness matches its training distribution. This is usually framed as a model
limitation. It is better treated as a **design parameter you control**. If you shape your environment and
tools to the shape the model was trained on, you get a large, free capability boost. If you deviate — even
in ways that look harmless — you silently strand capability the model already has.

This isn't a thought experiment. We built a coding agent (robocoop-4) that edits a live notebook, drove it
with several frontier models, and measured the difference shape makes. Every claim below links to a commit
or a benchmark artifact.

## The setup, and why it can be cited

robocoop-4 is an in-notebook coding agent. The relevant detail for this argument is its tool surface, which
we deliberately shaped to the training distribution:

- a **`bash`** tool over an in-memory project filesystem — the Terminal-Bench shape;
- **`read_file` / `write_file` / `edit_file`** that mirror Claude Code's `Read` / `Write` / `Edit` argument
  shapes exactly, with **literal** (non-regex) string replacement so there are no escaping traps.

It runs inside Lopecode, where a notebook is a single self-contained HTML file. The agent, its host bridge,
and its eval harness are all version-controlled modules. So every experiment is a commit, every harness
change is a `git diff`, and every benchmark run is a JSON artifact. The argument that follows is reproducible
rather than anecdotal — which is the whole point of making the environment hermetic.

## The natural experiment: bash-only (sed) vs Claude-shaped tools

We didn't set out to test this; the git history handed us the experiment. For its first day, robocoop-4 had
exactly one tool — `bash` — and the system prompt told it so: *"Use the bash tool for everything: ls, cat,
grep, sed, awk, head, tail to read; sed -i, a quoted heredoc, …"*. The agent edited files the way a shell
user does: `sed -i` and heredocs.

One hour later ([`01b31df`](https://github.com/tomlarkworthy/lopecode-dev/commit/01b31df)) we added
`read_file` / `write_file` / `edit_file` mirroring Claude Code's exact argument schemas, with literal
replacement and in-turn compile feedback. The commit message records the intent plainly: *"the agent no
longer writes via sed."* The eval harness already existed at both commits, so both builds were scored:

| build | editing surface | capability-gate mean |
|-------|-----------------|---------------------:|
| `9f7b205` (bash-only, sed) | bash + sed/heredoc | 0.94 / 27 |
| `01b31df` (Claude tools)   | bash + Read/Write/Edit | 0.95 / 27 |

A 0.01 move. If we stopped here the thesis would look weak — and that's the most important lesson in the
post. **Those 27 evals measured task *completion*, not editing *quality*.** There were zero evals for
incremental-editing reliability or decomposition; the benchmark was blind to exactly the dimension the new
tools improve. Two things actually changed, neither visible to that early gate:

1. **Editing stopped being blind.** With sed, the agent wrote and then waited for an async log it couldn't
   see. With the Claude tools, the apply is synchronous and the result returns in the same turn —
   `applied live (N cells changed)` or `FAILED TO COMPILE: … — live runtime unchanged; fix and re-edit`.
2. **The output got decomposed** — but only after we finished honoring the tool contract (next section), and
   only measurable once we added evals that score it.

The honest, falsifiable version of the claim, then, is not "the tools doubled the score." It is: *completion
correctness was already similar; the Claude-tool shape unlocked reliable incremental editing and decomposed
output, a dimension the original benchmark didn't even measure.*

To test that properly you have to be careful about two things. First, compare the **adjacent commits**
(`9f7b205` ↔ `01b31df`), not the old build against today's — over a year the system prompt also changed, so
old-vs-current would confound the tools with the prompt. The adjacent pair differs essentially only in the
editing-tool section. Second, score **only evals that generically measure editing ability** — "produce or
modify code so a runtime value is correct," judged on outcomes — and drop every eval that rewards a specific
tool (circular for a build that lacks it) or tests a prompt-taught fact (self-knowledge, network,
value-inspection, doc prose, etc.). Of our 44 evals, 21 qualify; the sharpest six edit code *in place*
(bug-fixes and live-cell edits), where the editing-tool shape bites hardest. Both adjacent builds are pinned
in `data/`; the exact subset, run commands, and caveats are in `data/experiment-bash-vs-tools.md`. The
prediction was explicit and falsifiable: similar completion scores, a larger Claude-tool gap on the in-place
tier and on decomposition — and if both tiers come out flat, the strong thesis is wrong and the post should
say so.

**We ran it (n=1 per arm; full numbers in `data/ab-results.md`). The result refines the thesis rather than
confirming the strong form of it:**

| arm | overall | in-place edits | authoring |
|-----|---------|----------------|-----------|
| **sonnet-4** | 0.94 → 0.91 | 0.857 → 0.857 | 0.98 → 0.94 |
| **mimo-v2.5-pro** | 0.84 → **0.91** | 0.914 → 0.914 | 0.81 → **0.91** |

Two things fell out, both honest. **First, the tool-shape effect is model-dependent.** On the capable model
(sonnet) the editing surface makes essentially no difference to outcomes; on the weaker model (mimo) the
Claude-shaped tools lift completion by **+0.075 overall and +0.10 on authoring**. That is the mechanism
behind the dramatic MIMO result below: a weaker model leans much harder on matching the RL-overfit tool
shape, while a strong model edits fine with `sed` too. **Second, the in-place tier came out flat for both
models** — the prediction that it would gain most was wrong *at the level of outcomes*. Small in-place edits
complete with `sed` as well; the `edit_file` win is in the editing *process* (first-try `old_string`
matches, in-turn compile feedback, no whole-file rewrites), which an outcome-only suite cannot see. Which is
itself the punchline: a completion benchmark concludes "the tools barely matter" precisely because it is
blind to the dimension they improve — the same overfitting trap, one level up.

## The central result: one regex unlocked latent capability

We asked the agent (model: `xiaomi/mimo-v2.5-pro`) to build a featured Audio DAW. It worked — but it built a
**691-line monolith**, rewriting the entire file on every change with `write_file` instead of making small
`edit_file` edits. That looks like a model that can't decompose.

It wasn't. `edit_file`, in the Claude shape, works by matching an exact `old_string` the model remembers from
its last read of the file. Our harness re-serialised the module on every apply (a compile → decompile round
trip that reformats whitespace), so the file changed out from under the agent. The next `edit_file`'s
`old_string` no longer matched, the edit failed, and the model fell back to the one operation that *always*
works: a full rewrite. The monolith was a **symptom of a violated tool contract**, not a reasoning failure.

The model already knew how to edit incrementally — it's trained to. We just had to stop breaking the
precondition. The fix is essentially one line ([`0c8a33a`](https://github.com/tomlarkworthy/lopecode-dev/commit/0c8a33a)):

```diff
-    const m = /^\/notebook\/(.+)\.js$/.exec(path);
+    const m = /^\/(?:notebook|src)\/(.+)\.js$/.exec(path);
```

We gave the agent a `/src` tree as a **byte-stable editing surface**: writes apply live, but the file is
never reformatted — only a separate canonical mirror is. After that change, the *same model* on the *same
prompt* built the DAW as **42 decomposed cells via 25 `edit_file` calls and a single `write_file`, with zero
errored cells**, finishing cleanly.

Nothing about the model changed. We moved the harness onto the contract the model was trained against, and
its real capability appeared.

## The pattern repeats

Once you see it as "match the training shape," the other fixes are the same move:

- **Token budget.** Reasoning models spend completion budget on hidden reasoning. At an 8192-token cap, MIMO
  was truncated *before* it emitted the tool call (`finish_reason: 'length'`), so the loop stopped after only
  exploring. Raising the cap to 32000 — room for reasoning *plus* a full tool call — fixed it
  ([`0c19a51`](https://github.com/tomlarkworthy/lopecode-dev/commit/0c19a51)). The model's operating envelope
  is part of the contract.

- **Model variance is the jaggedness, made visible.** On the identical harness, `gpt-5.4-mini` produced a
  clean reactive DAW and used runtime feedback to fix a bug before finishing; `gemini-3.5-flash` stopped
  crashing but stayed a weak builder ([`4cb20f6`](https://github.com/tomlarkworthy/lopecode-dev/commit/4cb20f6)).
  Same task, same tools, very different outcomes — exactly what "overfit to a shape, with each model overfit
  somewhat differently" predicts. Tool-calling support is itself a gate, so the model picker filters to it
  ([`9806c85`](https://github.com/tomlarkworthy/lopecode-dev/commit/9806c85)).

## The quantitative receipts

Vibes don't settle this; a benchmark does. We built a re-runnable, headless eval that drives the real
notebook with a real model and scores the resulting *runtime state* with deterministic, multivariate criteria
— **no LLM-as-judge**. 44 evals across 19 categories, including capability gates that each pin a previously
observed regression: editing the notebook's own live cells, operating rendered UI without touching source,
and self-extending by registering a new tool mid-turn.

Three full sweeps with `xiaomi/mimo-v2.5-pro` (raw data in `data/`):

| sweep | mean aggregate | perfect (1.0) evals |
|-------|---------------:|--------------------:|
| 1     | 0.902          | 37 / 44             |
| 2     | 0.951          | 40 / 44             |
| 3     | 0.980          | 42 / 44             |

All three capability gates scored 1.0 in every sweep — the shape-alignment work added capability without
regressing any.

There's a twist worth keeping. Two of the "failures" were the **benchmark** overfitting, not the model: one
criterion only read the agent's final summary message and missed the clarifying question it had asked a step
earlier; another demanded a specific *bash* command when the agent had grounded the same fact with the
dedicated `read_file` tool. Both penalised correct behaviour by over-specifying the *mechanism* instead of
checking the *outcome*. Fixing them lifts the effective means to 0.92 / 0.97 / 1.00. The lesson generalises:
the overfitting trap isn't unique to models — any system that rewards a fixed mechanism instead of the result
will mismeasure a smarter agent that found a different path.

## What to do about it

Treat the model's training shape as a hard interface, and design *toward* it:

1. **Adopt the shapes the models were trained on.** A bash tool and Claude-schema `Read`/`Write`/`Edit` are
   not arbitrary choices; they are the distribution. Custom tool schemas cost you capability you can't see on
   the leaderboard.
2. **Honor the contracts those tools imply.** `Edit` assumes the file is byte-stable between read and edit.
   If your system reformats, regenerates, or otherwise mutates files behind the agent, you break the contract
   and the model degrades to its fallback behaviour — and you'll misread that as the model being dumb.
3. **Respect the operating envelope.** Token budgets, streaming, tool-call formatting, and billing parameters
   are part of the shape too. A reasoning model truncated before its tool call is a configuration bug, not a
   capability ceiling.
4. **Measure runtime outcomes, not mechanisms.** Build a deterministic benchmark that checks the *result* in
   the real environment. And keep it hermetic, so an experiment is a commit, a harness change is a diff, and a
   run is a re-scorable artifact — that's what turns "we think the agent got better" into evidence.

The frontier is jagged because the models are overfit. You don't fix that by waiting for a better model. You
fix it by designing your environment so it lands on the parts of the frontier that are already sharp.

---

### Appendix: reproduce / inspect

- Central result: [`0c8a33a`](https://github.com/tomlarkworthy/lopecode-dev/commit/0c8a33a) (the `/src`
  byte-stability fix) — full diff in `data/harness-diffs.md`.
- Benchmark harness: `tools/robocoop-4/eval/live/` in
  [lopecode-dev](https://github.com/tomlarkworthy/lopecode-dev); run with
  `bun tools/robocoop-4/eval/live/run.mjs --model xiaomi/mimo-v2.5-pro`.
- Raw 3× sweep data: `data/mimo-3x-sweep-per-eval.csv`, `data/mimo-sweep-{1,2,3}.json`.
- Full commit index and source-line citations: `evidence.md`.
