# Aider polyglot (JS subset) on the robocoop-5 harness

Second rung of the industry-benchmark ladder (after `../humaneval/`, which saturated: raw mimo 0.932).
49 JavaScript exercises from [Aider-AI/polyglot-benchmark](https://github.com/Aider-AI/polyglot-benchmark)
— Exercism's hardest, curated because frontier models fail them. Official grading: the exercise's jest
spec with aider's exact unskip (`xtest(` → `test(`; `xit` stays skipped), official two-attempt protocol
(attempt 1 from instructions + skeleton; attempt 2 sees the failing test output).

Jest itself cannot run under the safehouse sandbox (watchman daemon can't start; worker pool wedges;
SIGTERM ignored) — `grade.mjs` runs specs under plain node instead: jest's own `expect` package, a
small describe/test/hooks lib, ESM imports rewritten to requires, strict mode to match babel ESM
semantics. Validated 49/49 against the exercises' reference solutions.

Arms (both `xiaomi/mimo-v2.5-pro`):
- **baseline** (`run-baseline.mjs`) — raw model chat, code block extracted, in-context repair turn.
- **agent** (`run-agent.mjs`) — the robocoop-5 system: instructions + skeleton seeded as scratch files,
  agent builds `/src/@user/solution.js` (one cell per required export), can self-verify with eval_js.
  Attempt 2 is a FRESH context re-seeded with the attempt-1 file + test output (the file is the
  agent's only memory). `grep` (a CLI exercise) is special-cased: a `script` cell whose string value
  is the program.

## Results (2026-07-16, pass@2 = aider's headline metric)

| arm | pass@1 | pass@2 |
|---|---|---|
| raw model (no harness) | 22/49 = **0.449** | 36/49 = **0.735** |
| robocoop-5 system (v1 prompt) | 18/49 = **0.367** | 31/49 = **0.633** |
| robocoop-5 system (v2 prompt, 2026-07-17) | 17/49 = **0.347** | 38/49 = **0.776** |

**v1: the harness that wins on HumanEval-JS (+3.1pp) LOSES here (−10.2pp).** Flips: agent fixed 3
(complex-numbers, meetup, wordy), lost 8, both-fail 10 (alphametics, forth, react, promises, …).

**v2 prompt (+14.3pp over v1, +4.1pp over raw): three prompt-surface edits from the v1 taxonomy** —
(1) task contracts override the decomposed-style guidance (exact export names/signatures are binding,
helpers go BEHIND the contract); (2) verify against the spec's LITERAL examples, never self-invented
inputs; (3) the srctools low-MI split nag preserves contractual cell names. Fixed 9 of v1's failures
(6 of the 8 taxonomy targets, plus alphametics/transpose/resistor-color-trio from the both-fail
bucket); one variance loss (wordy — passes in subset reruns); remaining fails are the interpreter/
simulation core (forth, react, two-bucket, word-search, food-chain, …). Runs: `agent-prompt-v2-full.json`
+ infra-retry merged in `agent-prompt-v2-merged.json`.

## Why the system underperforms (failure taxonomy, from candidate autopsies)

1. **House style beats task contract** (bottle-song, list-ops — 2 of the 8 losses). The agent SOLVED
   both but shipped per-concern cells (`verse`, `lyrics`, `append`, `filter`, …) instead of the
   contractual export (`recite`, a `List` class). robocoop-5's own apply-engine feedback nags
   "named per-concern cells; do NOT consolidate" on every write — the harness actively steered
   against the benchmark's export contract.
2. **Self-verification confirms the agent's own assumptions** (space-age: capitalized planet keys vs
   the tests' lowercase; sum-of-multiples: wrong `sum` signature → "bases is not iterable"). eval_js
   verification used the agent's guessed inputs, not the instructions' exact examples — same trap as
   HumanEval's sort_array regression, now costing more because specs are bigger.
3. **Cold-restart repair is expensive.** Baseline repairs in-context (its own reasoning is still in
   the conversation); the agent's attempt 2 starts from file + test output only, and thrashes —
   mean 14.3 steps, with 28–41-step failing repairs (word-search 8+41, grade-school 7+31).
4. **Turn ceilings truncate hard problems** (connect: attempt 1 timed out at 300s mid-implementation).
   And one reproducible attempt-2 wedge (sum-of-multiples) tripped the hard-deadline watchdog twice.

Actionable harness work, in expected-value order: make export/name contracts binding (task-priority
over style guidance), verify against the instructions' literal examples before completing, carry
attempt-1 reasoning into the repair turn (transcript summary in the question), and raise the per-turn
budget for interpreter-class exercises.

## Durable robocoop-5 upgrades this benchmark forced

- `robocoop-5-core` chat() now **streams SSE** (content + tool_call delta reassembly): proxied
  networks kill idle-looking connections (~200s here), which every long non-streaming generation is.
  Also cut observed per-step latency substantially.
- Retry/backoff on transient network/429/5xx in the client (aborts never retry).
- Eval infra: per-attempt heartbeat logging, hard per-turn deadline with browser recycling,
  `AbortSignal.timeout` on every fetch — a sleep/glitch now degrades into retries, not a silent wedge.

## Running

```bash
node extract.mjs                       # rebuild problems.json from polyglot-src/
node run-baseline.mjs --limit 49 --concurrency 2 --json results/baseline-full.json
node run-agent.mjs --offset 0 --limit 25 --notebook ../robocoop-5-eval.html --json results/agent-shard0.json
node run-agent.mjs --slugs two-bucket,react ...   # targeted re-runs
```

`../robocoop-5-eval.html` is a worktree copy of the canonical notebook with the streaming/retry core
synced in (`bun tools/channel/sync-module.ts --module @tomlarkworthy/robocoop-5-core ...`).
Key from `tools/robocoop-4/.env`; `OPENROUTER_MODEL` there is IGNORED — evals pin mimo explicitly.
