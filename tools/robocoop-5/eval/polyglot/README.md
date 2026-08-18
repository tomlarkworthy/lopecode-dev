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

## Results (pass@2 = aider's headline metric)

Current criterion: graderHash `f5993b70a0b8`, problemsJsonHash `0184c1046234`, runnerHash
`cacf207c5e4f` (agent) / `91daa729586f` (baseline). These are the quotable numbers.

| arm | pass@1 | pass@2 | pass@2 Jeffreys 95% | $/49 | blended tokens/task |
|---|---|---|---|---|---|
| raw model (no harness) | 14/49 = 0.286 | 41/49 = **0.837** | [0.715, 0.920] | $0.27 | 27,964 |
| robocoop-5 system | 18/49 = 0.367 | 46/49 = **0.939** | [0.846, 0.982] | $1.10 | 313,776 |

Paired over the same 49 slugs: both pass 41, both fail 3 (connect, promises, react), raw-only **b=0**,
system-only **c=5** (complex-numbers, resistor-color-trio, robot-name, transpose, wordy). Exact
two-sided sign test **P = 0.0625** — the floor for 5 discordant pairs, so no n=49 paired gate can do
better without more flips. b=0 is **strict dominance**: the system passes every task raw passes, plus
five. It costs ~11× the tokens (`../ladder.mjs --paired`, RQGM §4 blend = input + 5×output).
Run files: `results/corrected-baseline-full.json`, `results/corrected-agent-full.json`. Full
narrative in § "2026-08-18 corrected-protocol gate" below.

### Superseded history (2026-07-16 → 2026-08-16)

**Every row in this table was measured under a criterion superseded on 2026-08-18** (graderHash
`aff5fb6e71cd`, runnerHash `3b4bdde3c070` and earlier). They are kept as history, not as current
evidence — see §§ "2026-08-18 port fixes" / "2026-08-18 corrected-protocol gate" below. Do not pool
them with anything measured after that date, and do not quote 0.735/0.796 as the standing headline.

| arm | pass@1 | pass@2 | pass@2 Jeffreys 95% |
|---|---|---|---|
| raw model (no harness) | 22/49 = **0.449** | 36/49 = **0.735** | [0.600, 0.842] |
| robocoop-5 system (v1 prompt) | 18/49 = **0.367** | 31/49 = **0.633** | [0.493, 0.757] |
| robocoop-5 system (v2 prompt, 2026-07-17) | 17/49 = **0.347** | 38/49 = **0.776** | [0.645, 0.874] |
| robocoop-5 system (v2 + port fixes + warm repair, 2026-08-16) | — | 39/49 = **0.796** | [0.668, 0.890] |

All four intervals overlap — at n=49 the marginal score cannot separate these arms, and the claims
below rest on named mechanisms verified in-trajectory, not on the deltas. `../ladder.mjs` prints the
interval, the criterion stamp, and (with `--trajectories`) blended tokens for any of these files;
`--paired raw.json system.json` is the tighter statistic when both arms ran the same 49 slugs.

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

## 2026-08-16: counterfactual credit assignment on the 11 residual fails → 0.796

Method and full log: `plan/robocoop-5-credit-assignment.md`; per-fail labels in
`results/attribution/SWEEP.md`. `attribute.mjs` resumes a captured failed trajectory from cut k
(driver-core `resume` + file-state fold) and estimates pass-probability p(k); `run-agent.mjs
--trajectories` persists the conversations it needs. All 11 July fails reproduced (0/11), every one
labeled model-ceiling — p(0)=0 over 30 continuations, and 6/10 failed all three continuations on
the SAME test. The deterministic signatures motivated an arms comparison instead of more sampling,
which found:

- **word-search was a port bug, not a model failure** (system arm only): the committed
  problems.json predated extract.mjs's defaultExport detection, so the agent prompt carried an
  EMPTY export contract and synthesizeCJS never wired `module.exports.default` — a correct class
  graded "not a constructor". Regenerating problems.json fixed it (diff touches only word-search;
  validate-grader 49/49; the previously-failed candidate regrades PASS; fresh run passes @1).
- **Cold-restart repair was the list-ops killer**: raw converts it in-context at attempt 2; the
  system's file+test-output-only restart never did (22–31-step thrashes into the same
  static-vs-instance shape). Warm repair (question2 now carries the tail of attempt 1's assistant
  reasoning, subordinate to the test output) converted 2/3 targeted runs; in the gate it also
  showed up in simple-linked-list and go-counting converting at attempt 2.
- **synthesizeCJS hardened** against stray ESM `export` statements (live-runtime-legal, previously
  flipped Node into ESM interpretation → silent misgrade "module is not defined"); validation
  unchanged at 49/49.

Full gate (train-network conditions; infra-polluted fails got one clean re-roll each, genuine
results kept regardless of direction): **39/49 = 0.796**. Flips vs July: +word-search (port fix),
+simple-linked-list, +go-counting (warm repair @2); −grade-school, −transpose (variance tails —
transpose's roll misread the array-vs-string contract). list-ops' warm-repair coin (~2/3) came up
tails this gate. react was closed as a genuine fail after 4 consecutive clean-ish fails with
different signatures (16+38 steps on the last), both arms failing in July, and p(0)=0 — the one
protocol deviation, recorded here. Shards: `results/gate-shard{0..7}.json`.

## 2026-08-18: port fixes (protocol fidelity) — all prior numbers superseded

A full audit of the port's loop against aider's official runner (the step-1 rule in
`knowledge/training-robocoop-5.md`: diff the LOOP, not just the tool outputs). Six defects, all
arm-asymmetric or protocol-divergent:

- **grade.mjs memoization merge.** The require-shim's module cache was not shared between the spec
  and the candidate's own internal imports, so a module could be instantiated twice and a
  module-level singleton diverged from itself. Regraded all stored candidates
  (`results/gradefix-regrade.json`, zero model calls): 291 candidates, **1 legitimate flip**, the
  2026-08-16 gate unchanged at 39/49. Small blast radius, but the defect had no bound before it was
  measured.
- **Jest code frames restored.** Failures now carry `@babel/code-frame` excerpts mapped back to the
  original spec files, as jest emits them. Attempt 2 previously saw a bare assertion message where
  the official protocol shows the failing source line.
- **Truncation removed.** The old 6000/3500-char caps on test output cut roughly 23% of repair turns
  mid-frame — the agent's attempt-2 input was silently amputated. Replaced by a single 60000-char
  safety cap.
- **Warm resume is the attempt-2 default.** The 2026-08-16 warm-repair path is now the protocol, not
  an option; the cold restart survives as `--cold-repair` for reproducing old runs. `warmSeeds` keeps
  only `/src/@user/*` plus scratch, so nothing else leaks across the attempt boundary.
- **Official ADDENDUM in both arms**, and the `grep` CLI framing is now symmetric between raw and
  system — previously the special-case framing existed only on the system side.
- **Suite timeout 180s** (was a mix of per-run values).

`validate-grader.mjs --mode both`: **esm 49/49, module 48/49**. The single module-mode miss is
`parallel-letter-frequency`, documented as unconvertible: its worker file self-executes under
CommonJS `worker_threads`, so there is no faithful CJS rendering of it. Tests: 233/233
(`tests/robocoop5/`).

Two further fixes landed with the gate itself: **ANSI escapes are stripped from test output** (the
repair turn was being fed terminal color codes as text — 24 of 33 old repairs carried them), and
**`run-baseline.mjs` gained criterion stamps and per-attempt usage recording**, which it had never
had — before this the raw arm was unstamped and unpriceable.

**Stamp change: graderHash `aff5fb6e71cd` → `5922182d5357` → `f5993b70a0b8`** (the last step is the
ANSI strip), **runnerHash `3b4bdde3c070` → `cf0306e5ac4c` → `cacf207c5e4f`** (agent), and the
baseline runner is stamped for the first time at `91daa729586f`. Under the U2 rule
(`plan/rqgm-and-robocoop-5.md`) that makes every polyglot number recorded before this date — 0.735
raw, 0.796 system, and BOTH spec-lock A/Bs below — non-poolable history.

## 2026-08-18 corrected-protocol gate: 0.837 raw / 0.939 system, strict dominance

Both arms re-run end to end under the corrected protocol — same 49 slugs, same model, criterion
stamps verified identical where they must be (graderHash `f5993b70a0b8` and problemsJsonHash
`0184c1046234` in BOTH arms) and the agent's `coreModuleHashes` equal to the lopebooks canonical
(no spec-lock code in the bundle under test). This is the campaign's definitive result.

| | pass@1 | pass@2 | Jeffreys 95% | $/49 | blended tokens/task |
|---|---|---|---|---|---|
| raw | 14/49 | 41/49 = **0.837** | [0.715, 0.920] | $0.27 | 27,964 |
| system | 18/49 | 46/49 = **0.939** | [0.846, 0.982] | $1.10 | 313,776 (~11× raw) |

Paired, n = 49:

| | system pass | system fail |
|---|---|---|
| **raw pass** | 41 | **0** |
| **raw fail** | **5** | 3 |

- both fail: connect, promises, react
- system-only (c=5): complex-numbers, resistor-color-trio, robot-name, transpose, wordy
- raw-only (b=0): none

Exact two-sided sign test **P = 0.0625**. That is the minimum attainable value for 5 discordant
pairs — the design floor, not a weak result: with b=0 the ordering is as clean as n=49 permits, and
only more flips (not more care) could push P lower. The honest statement is **strict dominance with
P at the design floor**, not "significant at 0.05".

Cross-criterion, qualitative only (do not pool with the numbers above): raw 36 → 41, system 39 → 46.
Raw gained alphametics, forth, go-counting, meetup, simple-linked-list, twelve-days, two-bucket and
lost connect, robot-name. System gained food-chain, forth, grade-school, list-ops, transpose,
twelve-days, two-bucket, wordy and lost connect — a genuine timeout at the 20-step budget, not a
regression in kind. **Every historic "hidden-convention" failure except promises and react converted
in at least one arm** once the repair channel carried the official information.

### Mechanism (`mechanism.mjs`, 31 corrected repair turns vs 33 old ones)

| | old | corrected |
|---|---|---|
| repairs whose input contains a code frame | 0/33 | **31/31** |
| repairs whose input contains ANSI escapes | 24/33 | **0/31** |
| repair steps, mean / median / max | 12.9 / 7 / 41 | **7.9 / 5 / 26** |
| repair pass rate | 21/33 = 64% | **28/31 = 90%** |

The information is what changed, verbatim: simple-linked-list's repair read the frame's *context*
lines — `const element = new Element(1); list.add(element);` and
`new List([1,2,3]); expect(list.head.value).toEqual(3)` — and stated both conventions (add takes an
Element, not a value; the constructor's array is pushed in order so the LAST element is the head)
before a 4-step fix. Neither fact is recoverable from the assertion line alone, which is all the old
truncated, frame-less output carried.

### Conclusion

The port's information starvation, not a model ceiling, accounted for most of the residual failures.
Under the faithful protocol only promises, react and connect resist — and the system arm strictly
dominates the raw arm, at ~11× the tokens and $1.10 per 49 tasks. This retires the July/August
"model-ceiling" reading of the residue (see § 2026-08-16, and `plan/robocoop-5-credit-assignment.md`).

### Hygiene and new tooling

Three concurrent shards, merged with identity enforcement (`merge-shards.mjs` refuses shards whose
stamps disagree): `results/corrected-agent-shard{0,17,34}.json` → `results/corrected-agent-full.json`.
`infra-scan.mjs` found zero infra-polluted failures, so **no re-rolls were taken** — unlike the
2026-08-16 gate, every row here is a first roll. Tests 233/233 (`tests/robocoop5/`).
New analysis tools: `flips.mjs` (paired flip lists), `mechanism.mjs` (repair-input forensics),
`merge-shards.mjs`, `infra-scan.mjs`. The old gate's shards are merged to
`results/old-gate-merged.json`, which reproduces 39/49 for cross-checking.

## Spec-lock experiment (2026-08-17/18): mechanisms verified, score unproven

Design: the agent writes an **executable spec module** (`{name, js, expected}` rows) before
implementing, backed by four mechanisms — a grounding audit of each row against `/instructions.md`,
a write-feedback scorecard, a completion gate that blocks `task_complete` until the spec passes, and
a `SPEC-WAIVER` escape hatch for rows the agent can justify dropping. Implemented in
`rc5-bundle.html` only (tools/srctools/engine modules); the lopebooks canonical was not touched.

**v1 (2026-08-17), A/B on 11 slugs × 2 rolls per arm: 10/22 both arms, P = 1.00.** Autopsy found
three mechanism bugs rather than a null effect:
- the scorecard laundered misreads — a spec row asserting the wrong shape (transpose: newline-joined
  strings) scored green;
- the spec was dropped at attempt 2 (harness bug — it was not carried into the repair context);
- the UNGROUNDED warning caused example *deletion* instead of correction (book-store went 10 rows → 2).

**v2 (2026-08-18)**: spec carried into attempt 2, reconcile-against-tests instruction, never-delete
rule, and a convention clause. All three mechanism bugs are gone, measured in-trajectory:
compliance 13/22 → **17/22**, mean examples 5.7 → **8.0**, shrinkage events 1 → **0**, and all three
speclock attempt-2 passes went through explicit reconciliation (transpose rewritten to "array of
lines, not newline-joined string"; sum-of-multiples rewrote 13 example rows to the contract's
`sum(factors, limit)`). Zero waivers were ever taken; the completion gate fired 8×.

**Score: 11/22 speclock vs 14/22 control, P = 0.51 — and the control is the finding.** The control
arm ran BYTE-IDENTICAL code in both experiments and swung **10/22 (v1) → 14/22 (v2)**. Slate noise
on an 11-slug × 2-roll design is ±4/22, which exceeds any effect this A/B could have measured.

Verdict: mechanisms validated, score unproven, no deployment. Retest only under the corrected
protocol above — code frames and warm resume attack the same hidden-convention problem spec-lock
targets, so the pre-fix measurement cannot be extrapolated forward. Cost: v1 $1.24, v2 $1.17.

## Why the system underperformed (failure taxonomy, from July candidate autopsies)

Kept as the record of what the pre-fix system did wrong. Items 3 and 4 are closed by the corrected
protocol (warm resume; code frames); items 1 and 2 were addressed by the v2 prompt. Under the
2026-08-18 gate the system no longer underperforms — it strictly dominates.

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
node ../ladder.mjs results/gate-shard0.json --trajectories results/trajectories-gate   # + cost axis
```

Cost axis: `run-agent.mjs` writes per-attempt `usage1`/`usage2` into every row as of 2026-08-17, and
`ladder.mjs` blends them as input + 5×output (the RQGM §4 definition), charging attempt 2 only to the
tasks that ran it. Runs from before that date carry usage only in their `--trajectories` sidecars, so
the ladder needs `--trajectories <dir>` to price them — and it only charges a sidecar whose candidate
is byte-identical to the row's, so pointing it at another run's directory yields "no usage record",
not another run's tokens. `run-baseline.mjs` records usage (and criterion stamps) as of 2026-08-18;
runs before that date have neither.

`../robocoop-5-eval.html` is a worktree copy of the canonical notebook with the streaming/retry core
synced in (`bun tools/channel/sync-module.ts --module @tomlarkworthy/robocoop-5-core ...`).
Key from `tools/robocoop-4/.env`; `OPENROUTER_MODEL` there is IGNORED — evals pin mimo explicitly.
