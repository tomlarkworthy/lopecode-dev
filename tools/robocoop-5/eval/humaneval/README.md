# HumanEval-JS on the robocoop-5 harness

Industry benchmark applied to the robocoop-5 *system*, motivated by
[poetiq.ai "Benchmarks are dead"](https://poetiq.ai/posts/benchmarks_are_dead/): a leaderboard score
measures the whole system (harness + tools + prompts), not the model. robocoop-5's bespoke 45-eval
suite saturated at 1.00 (2026-07-05), so it no longer discriminates; this harness scores the agent on
an external benchmark with official graders instead.

Benchmark: MultiPL-E **humaneval-js** (nuprl/MultiPL-E, 161 problems) — HumanEval translated to
JavaScript with runnable assertion tests. Chosen because robocoop-5's world is JS Observable cells;
SWE-bench (Python repos + docker) and Aider polyglot (multi-file jest projects) don't map onto the
cell store.

## Design

Two arms, same model (`xiaomi/mimo-v2.5-pro`), pass@1, greedy:

- **baseline** (`run-baseline.mjs`) — raw model, no harness: single-shot completion of the MultiPL-E
  prompt via OpenRouter chat, code block extracted.
- **agent** (`run-agent.mjs`) — the robocoop-5 system: each problem is seeded as a stub module
  (`/src/@user/humaneval.js`, thunk-form cell so the cell VALUE is the function); the agent is asked to
  implement it and to verify every doc-comment example with `eval_js` before completing.

Grading (`grade.mjs`) runs the same file for both arms — but not the same code path, and that turned
out to matter (§ 2026-08-17 fidelity audit). The official MultiPL-E tests run in a node subprocess
against the candidate. `gradeCandidate` picks the PRIMARY program by candidate shape: a module
(`export default` present, every agent candidate) goes to `emulatorProgram`, which runs the whole
`define()` under a mini synchronous runtime and tests the target cell's computed value; anything else
goes to `wholeProgram` — candidate text + tests in one file, exactly what official MultiPL-E runs.
Textual `function <name>` brace-extraction survives only as a fallback after the primary attempt
fails. Until 2026-08-17 extraction was the *primary* path for plain-JS candidates, which cost the
baseline arm 3 correct solutions; the audit section below is the record. `fnNameOf` reads the
declaration from the prompt TAIL — HumanEval_1's doc comment contains the words "function is", which
a naive regex matches.

`retry-agent.mjs` merges shard results and re-runs INFRASTRUCTURE failures only (rate-limit
"Failed to fetch", timeouts, empty turns) sequentially; genuine test failures are never retried.
Sustained concurrency (4 browser shards + baseline) tripped OpenRouter rate limiting hard — a full-161
baseline run lost 104/161 problems to `fetch failed` before backoff was added.

## Results (2026-07-16 run, baseline arm corrected 2026-08-17, xiaomi/mimo-v2.5-pro, pass@1)

| arm | pass@1 | Jeffreys 95% |
|---|---|---|
| raw model (no harness) | 153/161 = **0.950** | [0.908, 0.976] |
| robocoop-5 system | 155/161 = **0.963** | [0.925, 0.984] |

**Superseded:** the baseline row read `150/161 = 0.932` [0.885, 0.963] from 2026-07-16 to
2026-08-17. Three of those 11 "failures" were grader artifacts — correct model solutions that
`grade.mjs` mutilated before running them. See § 2026-08-17 fidelity audit for the defect, the
regrade, and the raw evidence. The agent row is unchanged and no model was re-called; the correction
is a pure regrade of stored candidates.

The intervals overlap and the corrected gap is +1.2pp (it read +3.1pp), so this benchmark does not
separate the arms. `node ../ladder.mjs --paired results/baseline-full.json results/agent-merged.json`
still prints the OLD pairing (146 both-pass, 2 both-fail, 4 baseline-only, 9 agent-only,
**P = 0.2668**) because it reads the stored `pass` fields, which the audit deliberately did not
rewrite — the result files are the run's record. On the corrected baseline the pairing is 149
both-pass, 2 both-fail, 4 baseline-only, 6 agent-only, and `discordantPairTest(4, 6)` from
`tools/robocoop-eval/stats.mjs` gives an exact two-sided sign test of **P = 0.754**: 10 discordant
pairs split 6-4, which is what a coin does. Same `ladder.mjs` command prints the cost axis
(unaffected by the regrade): the agent arm's rows record usage, so it prices at 6.40M in + 0.21M out
= **7.44M blended tokens** (input + 5×output), 46k/problem; `run-baseline.mjs` records none.

Agent effort: mean 5.1 steps/problem (median 5, max 10).

Flips (baseline → agent), corrected: **+6 fixed** (parse_music, check_dict_case, rounded_avg,
intersection, order_by_points, do_algebra), **−4 regressed** (sort_array, prod_signs, fix_spaces,
bf), **2 both-fail** (any_int, sorted_list_sum). The published list said +9 and named
make_palindrome, minPath and string_to_md5 as harness wins; all three were baseline solutions the
grader broke, and the string_to_md5 showcase — "the agent wrote and self-verified a pure-JS RFC 1321
MD5" where the baseline supposedly could not — was the exact inverse of what happened: the baseline
wrote the *better* solution (`crypto.createHash`, four lines) and the grader deleted its `require`.

The regressions are the interesting part: the agent's example-verification loop *confirms wrong
generalizations* when the visible examples underdetermine the spec (sort_array: numeric sort passes
every doc example; the hidden tests want sort-by-popcount) and *amplifies dataset noise*
(fix_spaces: the MultiPL-E doc examples are internally contradictory). The harness converts model
failures into passes where feedback is reliable, and converts dataset ambiguity into failures where
it isn't — exactly the system-level behaviour the essay says benchmarks actually measure.

Dataset note: HumanEval_51_remove_vowels's `tests` field arrives from the HF datasets-server with a
raw newline inside a string literal (unparseable JS). `humaneval-js.json` here carries the escaped
fix; both arms pass it after repair.

## 2026-08-17 fidelity audit: the grader deleted top-level declarations

**The defect (present from 2026-07-16 until fixed 2026-08-17).** `gradeCandidate` built its list of
candidate programs by scanning the candidate text for `function <fnName>` and brace-extracting each
occurrence with `extractBalanced`. Whatever else the candidate contained — `require` lines, helper
functions, constants — was discarded. The whole-candidate program was only appended when there was
no `function <fnName>` occurrence at all, so a well-formed solution that *declares the target
function* is precisely the case that got mutilated. The agent arm never hit it: all 161 agent
candidates carry `export default` and took the emulator path, which runs the whole module. So the
defect was baseline-only by construction, and it moved the comparison in the harness's favour.

The fix (`gradeCandidate` today) picks one primary program by candidate shape — emulator for
modules, `wholeProgram` for everything else — and demotes extraction to a fallback. Re-running the
graded arms through the fixed grader (`regrade-h1.mjs` → `results/h1-regrade.json`) reproduces the
regrade below independently: baseline 150 → 153 with the same three names, agent 155 → 155.

**Evidence.** The stored baseline solution for HumanEval_162_string_to_md5, verbatim:

```js
const crypto = require('crypto');

function string_to_md5(text){
    if (text === '') return undefined;
    return crypto.createHash('md5').update(text).digest('hex');
}
```

which the grader recorded as failing with

```
TypeError: crypto.createHash is not a function
    at string_to_md5 (…/prog.cjs:3:19)
```

That error is the signature: the `require` was cut, and node's *global* `crypto` (webcrypto) has no
`createHash`, so the failure surfaced as a wrong-API TypeError rather than a ReferenceError. The
other two are unambiguous — HumanEval_10_make_palindrome fails
`ReferenceError: isPalindrome is not defined` and HumanEval_129_minPath fails
`ReferenceError: lexCompare is not defined`, each naming a helper function the model wrote directly
below the target and the grader deleted.

**Correction method.** Every one of the 161 stored baseline candidates was regraded official
MultiPL-E style — whole candidate text + `\n` + the problem's `tests` from `humaneval-js.json`, one
`node` subprocess per problem, 5s timeout — and the result compared against the stored `pass`. Full
sweep, not a spot check, because the interesting risk runs both ways: a candidate that only passed
*because* of the extraction (say, a broken helper that the brace-extract removed) would show up as a
new failure. `node verify-h1-audit.mjs` — which builds and runs the programs itself rather than
importing `grade.mjs`, so its verdict does not depend on the grader being fixed correctly (STILL FAIL
list wrapped here to fit):

```
== RESCUED (old FAIL -> whole-program PASS) ==
  + HumanEval_10_make_palindrome
  + HumanEval_129_minPath
  + HumanEval_162_string_to_md5
== BROKEN (old PASS -> whole-program FAIL) ==
== STILL FAIL ==
  . HumanEval_17_parse_music …_92_any_int …_95_check_dict_case …_103_rounded_avg
  . HumanEval_127_intersection …_145_order_by_points …_149_sorted_list_sum …_160_do_algebra

old: 150/161  whole-program: 153/161
```

Exactly 3 rescued, 0 broken. The 8 survivors all fail on `node:assert` AssertionErrors — wrong
answers, not grader damage. The agent arm's 6 failures are likewise all AssertionErrors, so 155/161
stands without re-running anything.

**What this means for the published claim.** The 0.932 baseline was a grader artifact worth 1.9pp,
and it was the difference between a +3.1pp harness gap with a 9-vs-4 flip direction and a +1.2pp gap
with a 6-vs-4 split at P = 0.754. The generalisable point is not that the extraction heuristic was
wrong — it was written for compiled Observable modules and works there — but that it was applied
asymmetrically: one arm's candidates took a path that preserves the whole program and the other
arm's took a path that does not. A grader that treats the two arms' output formats differently is a
confound, however faithful each path is on its own.

Not audited here: whether the emulator path itself (the mini synchronous runtime, `grade.mjs:31-67`)
diverges from the real Observable runtime on any of the 161 agent candidates. All 161 evaluate to a
function and 155 pass, which bounds the damage but does not rule out a silent difference.

## Running

```bash
node run-baseline.mjs --limit 161 --concurrency 2 --json results/baseline-full.json
node run-agent.mjs --offset 0 --limit 41 --json results/agent-shard0.json   # shard as desired
node retry-agent.mjs --in results/agent-shard*.json --out results/agent-merged.json
node verify-h1-audit.mjs                 # audit regrade, no model calls (~2min): prints the
                                         # rescued/broken lists and both pairings, old vs corrected
```

`OPENROUTER_API_KEY` from `tools/robocoop-4/.env` (the `OPENROUTER_MODEL` var there is IGNORED —
evals pin mimo explicitly). Notebook: `lopebooks/notebooks/@tomlarkworthy_robocoop-5.html`.
