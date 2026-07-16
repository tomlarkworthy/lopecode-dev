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

Grading (`grade.mjs`) is identical for both arms: the official MultiPL-E tests run in a node
subprocess against the candidate. Agent candidates are compiled Observable modules, so the grader
emulates the `define()` with a mini synchronous runtime and tests the target cell's computed value
(textual `function <name>` extraction is the fallback). `fnNameOf` reads the declaration from the
prompt TAIL — HumanEval_1's doc comment contains the words "function is", which a naive regex matches.

`retry-agent.mjs` merges shard results and re-runs INFRASTRUCTURE failures only (rate-limit
"Failed to fetch", timeouts, empty turns) sequentially; genuine test failures are never retried.
Sustained concurrency (4 browser shards + baseline) tripped OpenRouter rate limiting hard — a full-161
baseline run lost 104/161 problems to `fetch failed` before backoff was added.

## Results (2026-07-16, xiaomi/mimo-v2.5-pro, pass@1)

| arm | pass@1 |
|---|---|
| raw model (no harness) | 150/161 = **0.932** |
| robocoop-5 system | 155/161 = **0.963** |

Agent effort: mean 5.1 steps/problem (median 5, max 10).

Flips (baseline → agent): **+9 fixed** (make_palindrome, parse_music, check_dict_case, rounded_avg,
intersection, minPath, order_by_points, do_algebra, string_to_md5 — where the agent wrote and
self-verified a pure-JS RFC 1321 MD5), **−4 regressed** (sort_array, prod_signs, fix_spaces, bf),
**2 both-fail** (any_int, sorted_list_sum).

The regressions are the interesting part: the agent's example-verification loop *confirms wrong
generalizations* when the visible examples underdetermine the spec (sort_array: numeric sort passes
every doc example; the hidden tests want sort-by-popcount) and *amplifies dataset noise*
(fix_spaces: the MultiPL-E doc examples are internally contradictory). The harness converts model
failures into passes where feedback is reliable, and converts dataset ambiguity into failures where
it isn't — exactly the system-level behaviour the essay says benchmarks actually measure.

Dataset note: HumanEval_51_remove_vowels's `tests` field arrives from the HF datasets-server with a
raw newline inside a string literal (unparseable JS). `humaneval-js.json` here carries the escaped
fix; both arms pass it after repair.

## Running

```bash
node run-baseline.mjs --limit 161 --concurrency 2 --json results/baseline-full.json
node run-agent.mjs --offset 0 --limit 41 --json results/agent-shard0.json   # shard as desired
node retry-agent.mjs --in results/agent-shard*.json --out results/agent-merged.json
```

`OPENROUTER_API_KEY` from `tools/robocoop-4/.env` (the `OPENROUTER_MODEL` var there is IGNORED —
evals pin mimo explicitly). Notebook: `lopebooks/notebooks/@tomlarkworthy_robocoop-5.html`.
