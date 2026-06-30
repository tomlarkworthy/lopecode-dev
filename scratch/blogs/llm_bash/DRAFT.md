# Harnessing the jagged frontier for 3× LLM efficiency gains

*Draft — 2026-06-30. Evidence base: `evidence.md`; data: `data/`.*

I have been building a custom coding harness for several years, before it was cool, with some success
[robocoop, HN]. Then Claude code appeared and it blew what I was doing out of the water. I have since been
trying to understand what exactly makes Claude Code so good, given the LLM in the middle is the same? I think
I have now figure out some of the main mechanisms to Claude's deft LLM usage and the great result is that you
can take these mechanism and apply them in your own Harnesses.

## The claim

Frontier coding models are not general agents that happen to use tools. They are trained, by reinforcement
learning, against a narrow and public interaction shape: a bash shell (the Terminal-Bench lineage) and a
small set of file tools with Claude's exact argument schemas (`Read`, `Write`, `Edit` —
`file_path` / `old_string` / `new_string`). They are, in a useful sense, **overfit** to that shape.

The practical consequence is the "jagged frontier": the same model on the same task runs cheaper or dearer
depending on how closely your harness matches its training distribution. This is usually framed as a model
limitation. It is better treated as a **design parameter you control**. Shape your environment and tools to
the shape the model was trained on and you get the same answer for a fraction of the work. Deviate — into a
custom tool surface, or even just a broken file contract — and the model still gets there, but it grinds:
more steps, more tokens, more verification churn.

Here is the part that makes it matter: **at small task sizes the inefficiency is invisible, because everything
still passes. At large task sizes the inefficiency becomes incorrectness** — the per-step overhead compounds
until the misaligned harness runs out of budget, context, or patience and fails on a task the aligned harness
completes. Efficiency is the early-warning signal for a correctness cliff you will hit later.

We built a coding agent (robocoop-4), drove it with a frontier model, and measured all of this. Every claim
links to a commit or a benchmark artifact.

## The setup, and why it can be cited

robocoop-4 is an in-notebook coding agent. The relevant detail is its tool surface, which we deliberately
shaped to the training distribution:

- a **`bash`** tool over an in-memory project filesystem — the Terminal-Bench shape;
- **`read_file` / `write_file` / `edit_file`** mirroring Claude Code's `Read` / `Write` / `Edit` argument
  shapes exactly, with **literal** (non-regex) string replacement so there are no escaping traps.

It runs inside Lopecode, where a notebook is a single self-contained HTML file. The agent, its host bridge,
and its eval harness are all version-controlled modules. So every experiment is a commit, every harness
change is a `git diff`, and every benchmark run is a re-scorable JSON artifact. The argument below is
reproducible, not anecdotal.

## Measuring the wrong thing first

We started where most people start: pass-rate. We have a re-runnable, headless eval that drives the *real*
notebook with a *real* model and scores the resulting runtime state with deterministic, multivariate criteria
— no LLM-as-judge. We A/B'd the bash-only build against the Claude-tools build on a curated editing subset.

The result was flat. bash+sed ≈ bash+Claude-tools, for two different models, within single-run noise
(`VERDICT.md`, `data/ab-results.csv`). Taken at face value, the thesis looked dead.

It wasn't dead; **pass-rate was the wrong instrument.** The tasks build ~1–10 cells. At that size every
reasonable surface completes them — sed, `write_file`, a raw runtime call, all land. A saturated metric can't
see a difference that is real but lives on a different axis. The right axis is **how much work the model spent
to get there**: steps and tokens. So we re-ran the comparison as a ladder and counted steps.

## The central result: a 2–3× efficiency ladder

Same task, N=3 per arm, scored on outcomes, run on two models — `xiaomi/mimo-v2.5-pro` and
`anthropic/claude-sonnet-4.6`. The task — `long-store-to-checkout` — builds a small reactive module and then
adapts it in a follow-up turn, so it exercises real editing, not just first-write. **All 24 runs PASS at
1.00.** The only thing that moves is cost (mean steps to completion):

| arm | distribution / contract | mimo | sonnet-4.6 |
|-----|-------------------------|-----:|-----------:|
| **Structured** | off-distribution semantic API (`define_variable` & friends) | **24.0** | **22.7** |
| **Bash** | on-distribution shell (sed/heredoc) | 22.7 | 16.3 |
| **Std Tools (broken contract)** | Read/Write/Edit, file reformatted between read+edit | 19.3 | 18.0 |
| **Std Tools (aligned)** | Read/Write/Edit + byte-stable `/src` | **10.3** | **8.0** |

Per-run steps (mimo / sonnet): Structured `31,10,31` / `27,21,20`; Bash `16,21,31` / `13,14,22`;
broken-contract `21,18,19` / `18,17,19`; aligned `13,8,10` / `8,8,8`. Raw JSON in
`tools/robocoop-4/eval/live/results/strategy/`; summary in `data/strategy-ladder.csv`.

Top to bottom that is the same story on both models: the off-distribution structured surface is the most
expensive, the fully-aligned standard-tools harness is the cheapest, and the span between them is **2.3× for
mimo (24.0 → 10.3) and 2.8× for sonnet (22.7 → 8.0)** — with the hardest off-distribution runs hitting **3.4–3.9×**
the aligned mean (`31/8`, `27/8`). The stronger model does not close the gap; it *widens* it relatively, and
its aligned arm is dead-consistent at `8/8/8`. Same task, same correctness — the harness shape alone is worth
roughly 3×.

Three boundaries are visible:

- **The distribution boundary.** A structured semantic API (next section) is the most expensive surface on
  both models — the genuinely *off*-distribution end.
- **The contract boundary inside the zone.** Even with the right tool *signatures*, breaking the file contract
  (reformatting the file between read and edit) roughly doubles the cost vs honouring it (mimo 19.3 vs 10.3;
  sonnet 18.0 vs 8.0). Honouring it — a one-line `/src` fix — is where most of the win is.
- **Bash and broken-contract Std Tools are a near-tie** and reorder between models (mimo `Bash 22.7 >
  broken 19.3`; sonnet `Bash 16.3 < broken 18.0`) — within noise. The robust signal is the two *endpoints*:
  aligned lowest, structured highest, on both models.

## The off-distribution arm: coding through a structured tool

To anchor the "off-distribution" end we built the opposite of a shell: a structured semantic runtime API.
Same agent loop, same model. The shell and file tools are removed; the agent instead gets `create_module`,
`define_variable`, `delete_variable`, `list_variables`, `eval_code`. `define_variable` is the real low-level
Observable API — `{name, definition:"(x,y)=>x+y", inputs:["x","y"], module}` — building reactive variables
directly, no files, no shell. (It's just a custom tool. This has nothing to do with MCP; the only axis is
*structured semantic surface vs files/shell*.)

Given an accurate prompt, it completes the task at 1.00 — so this is **not a correctness cliff at this scale**.
It is the most expensive surface (24.0 steps, up to 31), and the cost signature is diagnostic. The structured
API emits *exactly 13* `define_variable` calls every run; the variance is entirely **`eval_code` verification
churn** — 4 on the fast run, 19 and 25 on the slow ones. With no glanceable file artifact, the model re-probes
the reactive graph value-by-value to convince itself it is right. The file/shell arms read and write whole
files and verify by inspection: fewer, more confident steps.

(The number is only trustworthy because the harness is fair. Three fixes were required first — beating the
reactive re-registration that kept restoring the shell tools, resolving modules synchronously, and observing
cells so generators pump in headless — plus a prompt-bug fix that had manufactured a fake 0.50 "correctness
cliff." Plausible failures are not failures until the harness is proven fair. Details in
`data/structured-arm-findings.md`.)

## Where efficiency becomes correctness: the DAW

The ladder tasks are small, so the gap stays purely a cost gap. Scale the task and the same per-step overhead
turns into outright failure. We have the canonical case on file.

We asked the agent (`xiaomi/mimo-v2.5-pro`) to build a featured Audio DAW. It worked — but it produced a
**691-line monolith**, rewriting the whole file on every change with `write_file` instead of small `edit_file`
edits. That looks like a model that can't decompose.

It wasn't. `edit_file` matches an exact `old_string` the model remembers from its last read. Our harness
re-serialised the module on every apply (a compile → decompile round trip that reformats whitespace), so the
file changed out from under the agent. The next `edit_file` `old_string` no longer matched, the edit failed,
and the model fell back to the one operation that *always* works: a full rewrite. The monolith was a **symptom
of a violated tool contract**, not a reasoning failure — and at small scale it would have just looked like "a
few extra steps." At DAW scale it became a qualitatively worse artifact.

The fix is essentially one line ([`0c8a33a`](https://github.com/tomlarkworthy/lopecode-dev/commit/0c8a33a)):

```diff
-    const m = /^\/notebook\/(.+)\.js$/.exec(path);
+    const m = /^\/(?:notebook|src)\/(.+)\.js$/.exec(path);
```

We gave the agent a `/src` tree as a **byte-stable editing surface**: writes apply live, but the file is never
reformatted — only a separate canonical mirror is. After that change, the *same model* on the *same prompt*
built the DAW as **42 decomposed cells via 25 `edit_file` calls and a single `write_file`, with zero errored
cells**. Nothing about the model changed. We moved the harness onto the contract the model was trained
against, and the inefficiency — and with it the bad output — disappeared.

That is the thesis in one example: the broken contract was the 19.3-vs-10.3 row of the ladder, and at scale
that 2× tax stopped being "slower" and started being "wrong."

## The pattern repeats

Once you see it as "match the training shape," the other fixes are the same move:

- **Token budget.** Reasoning models spend completion budget on hidden reasoning. At an 8192-token cap, MIMO
  was truncated *before* it emitted the tool call (`finish_reason: 'length'`), so the loop stopped after only
  exploring. Raising the cap to 32000 — room for reasoning *plus* a full tool call — fixed it
  ([`0c19a51`](https://github.com/tomlarkworthy/lopecode-dev/commit/0c19a51)). The operating envelope is part
  of the contract.
- **Model variance is the jaggedness, made visible.** On the identical harness, `gpt-5.4-mini` produced a
  clean reactive DAW and self-corrected a bug from runtime feedback; `gemini-3.5-flash` stopped crashing but
  stayed a weak builder ([`4cb20f6`](https://github.com/tomlarkworthy/lopecode-dev/commit/4cb20f6)). Same
  task, same tools, very different outcomes — exactly what "overfit to a shape, each model somewhat
  differently" predicts.

## The benchmark can overfit too

Two of our eval "failures" were the **benchmark** over-specifying a mechanism, not the model failing: one
criterion read only the agent's final summary and missed a clarifying question it asked a step earlier;
another demanded a specific *bash* command when the agent had grounded the same fact with the dedicated
`read_file` tool. Both penalised correct behaviour. Fixing them lifts the means across three sweeps to
0.92 / 0.97 / 1.00. The overfitting trap isn't unique to models — any scorer that rewards a fixed mechanism
instead of the outcome will mismeasure a smarter agent that found a different path. (It is also why the
structured arm must be graded on runtime state, not on files it never writes.)

## What to do about it

Treat the model's training shape as a hard interface and design *toward* it:

1. **Adopt the shapes the models were trained on.** A bash tool and Claude-schema `Read`/`Write`/`Edit` are
   the distribution, not arbitrary choices. A clever custom tool surface is off-distribution by definition and
   you will pay for it in steps and tokens — up to ~3× here — before you ever pay for it in failures.
2. **Honour the contracts those tools imply.** `Edit` assumes the file is byte-stable between read and edit.
   Reformat or regenerate behind the agent and it degrades to rewrites — ~2× cost at small scale, a monolith
   at large scale.
3. **Respect the operating envelope.** Token budgets, streaming, tool-call formatting, billing parameters are
   part of the shape. A reasoning model truncated before its tool call is a configuration bug, not a ceiling.
4. **Measure cost, not just pass/fail — and watch it as a leading indicator.** On small tasks pass-rate
   saturates and hides everything. Count steps and tokens; an efficiency regression on small tasks is the
   correctness cliff you will hit on large ones. Keep the benchmark hermetic so an experiment is a commit, a
   harness change a diff, and a run a re-scorable artifact.

The frontier is jagged because the models are overfit. You don't fix that by waiting for a better model. You
harness it: design your environment to land on the sharp parts of the frontier the model already has — and
collect the 3×.

---

### Appendix: reproduce / inspect

- Efficiency ladder (mimo + sonnet-4.6): `data/strategy-ladder.csv`; raw JSON in
  `tools/robocoop-4/eval/live/results/strategy/{A_sed,B_tools_nobytestab,C_tools_src,D_structured}-{1,2,3}.json`.
- Off-distribution arm: `data/structured-arm-findings.md`; run with
  `bun tools/robocoop-4/eval/live/run.mjs --ids long-store-to-checkout --tool-surface structured --model xiaomi/mimo-v2.5-pro`.
- Scale→correctness (the `/src` fix): [`0c8a33a`](https://github.com/tomlarkworthy/lopecode-dev/commit/0c8a33a);
  diff in `data/harness-diffs.md`.
- Benchmark harness: `tools/robocoop-4/eval/live/` in
  [lopecode-dev](https://github.com/tomlarkworthy/lopecode-dev).
- Full commit index and source-line citations: `evidence.md`.
