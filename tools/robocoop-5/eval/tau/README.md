# tau-bench retail on the robocoop-5 harness

Third rung of the industry-benchmark ladder (after `../humaneval/` and `../polyglot/`), and the first
that measures interaction with an EXTERNAL SYSTEM instead of pure code synthesis: the agent serves a
simulated customer over multiple conversation turns, calling retail APIs (order lookup, exchanges,
returns, cancellations, address/payment changes) against a mock database while following a policy wiki.
Source: [sierra-research/tau-bench](https://github.com/sierra-research/tau-bench), retail domain,
all 115 test tasks.

## Port & fidelity

- `export-retail.py` replays every task's ground-truth actions through the OFFICIAL Python tools and
  exports tasks, tool schemas, the policy wiki, and per-task oracle final-state deltas
  (`retail-export.json`).
- `retail-env.mjs` is the JS port of the 16 tools (including a Python-faithful banker's `round`).
  **Fidelity gate (`fidelity-check.mjs`): 115/115 final states and 582/582 tool observations
  identical to the reference implementation.**
- Grading matches `tau_bench.envs.base.Env.calculate_reward`: reward 1 iff the final DB state equals
  the oracle state AND every required output string appears in the agent's replies to the user.
  The reward FUNCTION is faithful; **when it is called was not** — official computes it the moment a
  terminate tool fires, and this port had no terminate handling until the 2026-08-17 audit (below).
  Fidelity of the tools is not fidelity of the protocol.
- User simulator replicates `tau_bench.envs.user.LLMUserSimulationEnv` verbatim (same system prompt,
  `###STOP###` protocol). Both arms use mimo as agent AND simulator, so absolute numbers are not
  leaderboard-comparable (official runs simulate users with GPT-4-class models); the two-arm
  comparison shares everything except the harness.

Arms (both `xiaomi/mimo-v2.5-pro`):
- **baseline** (`run-baseline.mjs`) — raw model native function calling, mirroring the official
  `tool_calling_agent` exactly: system = wiki, ONE tool call per step, content = reply to user.
- **agent** (`run-agent.mjs`) — the robocoop-5 system: rc5 session in the notebook, policy wiki loaded
  through the editable-prompt product surface, the 16 retail tools registered on the live plugin bus as
  proxies to the fidelity-checked Node env (`page.exposeFunction`; DB state lives in Node). Each user
  message = one `session.send` turn; the turn's closing text is the reply. Notebook file tools are
  unregistered so the tool surface matches the baseline (`--keep-tools` keeps the full surface).

## Results (pass@1, all 115 tasks)

| arm | pass@1 as published | corrected (terminate-on-transfer) | Jeffreys 95% (corrected) | date |
|---|---|---|---|---|
| raw model (official tool-calling loop) | 91/115 = 0.791 | 89/115 = **0.774** | [0.691, 0.843] | 2026-07-17 |
| robocoop-5 system, v1 core | 84/115 = 0.730 | 73/115 = **0.635** | [0.544, 0.719] | 2026-07-17 |
| robocoop-5 system, yield-fix core | 91/115 = 0.791 | 88/115 = **0.765** | [0.682, 0.835] | 2026-07-17 (zero infra errors) |
| robocoop-5 system, principles + context core | 88/115 = 0.765 | 87/115 = **0.757** | [0.672, 0.828] | 2026-08-16 |

The "as published" column is kept because it is what the stored result files say and what every
earlier note quotes; the corrected column is the number to use. Both are the same runs — the
correction is a replay of the stored trajectories under the official episode-termination rule, no
model calls. See § 2026-08-17 fidelity audit.

The yield fix (below) recovered most of the v1 gap: on corrected numbers 0.635 → 0.765 against a
0.774 baseline, i.e. parity within noise rather than the "exact tie" the uncorrected 91-vs-91 read
as. On top of it, a replay-diff failure autopsy (`analyze-fails.mjs`) motivated generic OPERATING
PRINCIPLES in the loop prompt, which converted 6 of the 11 non-model-ceiling gate failures on
targeted re-runs (see below).

Every interval in that table still overlaps every other: a single 115-task roll's marginal score
does not separate these cores. The correction narrows one of them to a hair — corrected v1
[0.544, 0.719] against the corrected baseline [0.691, 0.843] overlap only over [0.691, 0.719] — so
v1-vs-baseline is the one pair on this table where a second roll would plausibly separate the arms.

The 2026-08-16 full confirmation gate (principles + context core) scored 88/115: 11 gains / 14
losses vs the yield-fix 91 (both rolls cover all 115 tasks, 77 both-pass, 13 both-fail). The exact
two-sided sign test on those 25 discordant pairs gives **P = 0.6900** — PARITY, not a regression.
(On corrected numbers the same pairing is 13 gains / 14 losses, 74 both-pass, 14 both-fail,
**P = 1.0000** — same verdict.) Reproduce the published pairing with zero model calls:

```bash
node ../ladder.mjs --paired \
  results/agent-final-shard0.json,results/agent-final-shard1.json \
  results/gate-principles-shard0.json,results/gate-principles-shard1.json
```

Per-task churn is ~22% per identical roll (~60% of any roll's losses convert on a clean
re-roll), so a single 115-task roll cannot resolve a few-task difference; this also means the
targeted-re-run "6/11 converted" above is partly churn. A paired context-on/off A/B on the 14
losses (9/14 vs 8/14) acquitted the 2026-08-08 context system. Report τ results with Jeffreys
intervals and discordant-pair stats (`../ladder.mjs`, plan/rqgm-and-robocoop-5.md U1/U4), never
single-roll deltas.

## v1 failure taxonomy (−6.1pp as published, −13.9pp corrected): the harness's action bias fights conversational yield

**10 of the 16 agent losses called `transfer_to_human_agents` (0 of 9 wins did); 9 of 16 contain runs
of 3+ consecutive `think` calls.** (Corrected 2026-08-17: the "0 of 9 wins" was a 9-win sample and
does not generalise — across the whole v1 roll 26 tasks called the tool, and 11 of them were
*recorded wins* that official semantics would have ended at the escalation. The mechanism below is
unchanged; it was more common than the sample suggested.) The mechanism, visible in trajectories: when the agent needs
information from the user (usually authentication), the rc5 design pushes it to keep taking tool
actions within the turn — the system prompt demands "a concrete action on EVERY step; never stop
silently", and the completion guard rejects a first `task_complete` with zero tool calls. Ending the
turn to ask the user is exactly the right move, but it is the one move the harness discourages. The
model spins `think` ("waiting for authentication…"), finds `transfer_to_human_agents` as the only
action-shaped exit, and escalates — silently failing the task. The baseline cannot fail this way:
any content message immediately yields to the user.

The 9 agent wins lean the other way: multi-action turns let the agent batch lookups + mutations
without waiting for the user between every step (win trajectories average more tool calls per turn).

Secondary observations:
- Long conversations (50+ steps) are disproportionately exposed to infra blips — every "permanently
  stuck" task eventually passed or failed cleanly on a quiet network.
- The in-page rc5 client gives up on network failure faster (~35s of retries) than the Node baseline
  client (~2min); the runner now retries a failed turn 3× (the session is persistent) before
  abandoning a task.

## The yield fix (core `f8a55e2`): ending the turn to ask the user is a first-class move

Three coordinated prompt/guard changes in the rc5 loop: `task_complete` is described as the way to
END YOUR TURN (complete, finished answering, or BLOCKED on something only the user can provide —
"ending the turn IS how you ask"); the stall nudge gained a matching branch; the completion guard
accepts a tool-free turn that asks the user a question. Mechanism verified on the 16 v1 losses:
12/16 converted, and the think-loop → `transfer_to_human_agents` signature disappeared from
trajectories — the transfer-call count per roll drops 26 → 9, which is the cleanest single number
for the fix. Full gate result: 91/115, zero infra errors; on corrected numbers 88/115 = 0.765
against the baseline's 89/115 = 0.774, and the paired split is 10 yield-fix-only vs 11
baseline-only, `discordantPairTest` **P = 1.0000** — parity within noise, not the exact tie the
uncorrected numbers showed.

## Failure autopsy (replay diff) and operating principles

`analyze-fails.mjs` replays a failed trajectory's mutations against the env and structurally diffs
the final state vs the oracle (MISSING / EXTRA / per-path WRONG). Across the 24 gate failures the
recurring shapes were: wrong-target selection (acted on the first plausible match without surveying
all candidate records), over-action (extra mutations beyond the request), and dropped halves of
compound requests. 13 of the 24 were also baseline failures (model ceiling); the 11 remaining were
strategy defects: committing to the first match without resolving ambiguity, and losing parts of
multi-part requests (no external working memory).

Both defects were addressed generically (not benchmark-specific) as trigger-conditioned OPERATING
PRINCIPLES appended to the loop system message (core `eee59f1` + `d6b5903`): (1) before hard-to-undo
actions, name the exact target and treat unopened records as unexamined candidates — survey before
acting, ask only when only the user can disambiguate; (2) enumerate multi-part requests up front and
check each part off before finishing. Targeted re-runs converted 6/11 (tasks 5, 6, 45, 64, 92, 93),
with the mechanism visible in trajectories (full order survey, enumerated variants, disambiguation
question). Remainder: 18/91/95/99 reclassified model-ceiling (95 fails even when the user volunteers
the disambiguator), 41 is a precondition-ordering trap that resisted three formulations. An
over-application canary — 9 previously-passing polyglot slugs re-run under the principles core —
scored 7/9 pass@2 with both failures being ordinary semantic variance on historically flip-prone
tasks (no question-shaped completions), i.e. the ask/survey triggers stay silent where there is no
user and no ambiguity.

Meta-lesson across the whole ladder: prompts that legitimize or mandate a specific action at a
specific structural trigger move numbers (streaming yield, principles); generic care-exhortations do
not (a "double-check after mutations" sentence measurably changed nothing and was reverted).

## 2026-08-17 fidelity audit

The port was anchored on TOOLS (115/115 final states, 582/582 observations) and that gate passed and
still passes. It says nothing about the PROTOCOL around the tools, and that is where the problems
were: one divergence that changes every number on this page (T1); one budget asymmetry (T3) and one
reply-collection divergence (T9) that are real in the code but cost these rolls nothing measurable;
and one reporting gap (T15). Only T1 moves a published number. The port has since been fixed on T1,
T3 and T9 — those fixes apply to future runs, and every correction below is a replay of stored
trajectories, not a re-run.

### T1 — `transfer_to_human_agents` must END the episode (corrected, numbers above)

Official, `tau-src/tau_bench/envs/retail/env.py:41`:

```python
self.terminate_tools = ["transfer_to_human_agents"]
```

and `tau-src/tau_bench/envs/base.py:100-119`, inside `step`:

```python
            if action.name in self.terminate_tools:
                done = True
        …
        if done:
            reward_res = self.calculate_reward()
```

So in official tau-bench the reward is computed **at the instant of the transfer call** — everything
the agent does afterwards is off the record, because there is no afterwards. The port that produced
every roll on this page had no terminate handling at all: `retail-env.mjs` implemented the tool as
`transfer_to_human_agents() { return "Transfer successful"; }`, an ordinary observation, and both
runners kept looping. An agent could escalate to a human and then quietly finish the job itself, and
be scored for the finish.

Fixed 2026-08-17 for future runs — `retail-env.mjs` now exports `TERMINATE_TOOLS` /
`isTerminateTool` and both runners end the episode on it and record an `endReason` /
`terminatedByTransfer` per row. The rolls in the table above predate that and are corrected by
replay, not re-run.

Correction (`verify-t1-audit.mjs` per roll, `verify-t1-stats.mjs` for the aggregate): replay each
stored trajectory through `retail-env.mjs`, truncating at the first `transfer_to_human_agents` entry,
and grade the truncated state + replies with the same `grade()`. Nothing under `results/` is
rewritten — the files stay the run's record and the correction is recomputed on demand.
Self-consistency gate first — replaying each trajectory in FULL reproduces the stored reward on
115/115 baseline tasks and 115/115 for each agent roll, 0 disagreements, so the trajectories are
complete enough to regrade from.

| roll | tasks containing a transfer call | passes that depended on continuing past it |
|---|---|---|
| baseline (full + retry merge) | 12 | 2 — tasks 31, 32 |
| agent v1 core | 26 | 11 — tasks 17, 19, 31, 33, 53, 63, 76, 78, 94, 104, 114 |
| agent yield-fix core | 9 | 3 — tasks 31, 32, 73 |
| agent principles + context core | 12 | 1 — task 32 |

Each of those 17 demotions has 4-66 further trajectory entries after the transfer call. 16 of them
fail `r_actions` at the transfer point — the oracle-matching mutations were made after the
escalation. The seventeenth (v1 task 19) had oracle-correct DB state already but had not yet said
the required outputs `["54.04","41.64"]`; it spoke them 4 entries later. Both shapes are the same
defect: work that official tau-bench would never have seen.

Reverse direction (could terminating early RESCUE anything?): no. Across all four rolls, every
reward-0 task containing a transfer call is still reward-0 when truncated there — truncation only
removes work. Worth recording precisely, because the obvious summary of this is wrong: it is NOT
true that no reward-0 task had oracle-correct state at its transfer point. Baseline task 62 did
(`r_actions=true` there) — it failed on outputs, `missing=["302.67","20 hours"]`, at the transfer
point and at the end alike. The no-rescues conclusion holds; the reason for it is narrower than
"the state was always wrong".

The v1 row moves most (84 → 73). That is not a separate finding, it is the same one: the v1 failure
taxonomy above already established that v1 escalated to a human when it should have yielded to the
user, and under official semantics 11 of its recorded *wins* were that same escalation followed by
work that should never have counted. The published −6.1pp v1 gap was really −13.9pp.

### T3 — step budgets are not comparable across the arms (disclosure)

Official caps an episode at 30 STEPS, one action per step
(`tau-src/tau_bench/agents/tool_calling_agent.py:28`, `max_num_steps: int = 30`). `run-baseline.mjs:24`
mirrors it exactly (`const MAX_STEPS = 30; // tau-bench run.py default`), counting a tool call and a
reply as one step each. `run-agent.mjs:47` instead caps at `MAX_EXCHANGES = 20` — twenty *user
exchanges*, each of which is one rc5 turn that may take unboundedly many internal steps (the only
other stop is `TASK_DEADLINE = 15 * 60 * 1000`).

Measured from the trajectories (tool calls + replies per task):

```
baseline (merged)        n=115 median=13 max=28  tasks at >=30 actions: 0
agent yield-fix          n=115 median=14 max=36  tasks at >=30 actions: 4
agent principles gate    n=115 median=15 max=30  tasks at >=30 actions: 3
```

The budget asymmetry is real but barely binding on these rolls: the baseline never reached its own
cap (max 28 of 30), and only 3 agent tasks exceeded what the baseline budget would have allowed —
23 and 32 at 33 actions and 104 at 36, all three scored reward 1 in the yield-fix roll. The stored
rolls are NOT corrected for it, because there is no defensible truncation rule after the fact (an
rc5 internal step is not an official step, so any cut is a judgement call, and unlike T1 the
official code does not tell us where to make it). `run-agent.mjs` now takes an `officialBudget`
option that stops the episode at `OFFICIAL_MAX_STEPS` (30) so a future roll can be run symmetrically;
until such a roll exists, treat the 3 over-budget passes as a known upper bound on the effect.

### T15 — the published baseline 91 includes 5 infra-retry conversions (disclosure)

`results/baseline-full.json` scores **86/115** on its own. Eight tasks failed with infrastructure
errors, not wrong answers — `fetch failed` (46, 48, 63, 99, 112), `empty streamed completion` (36),
`no content and no tool calls` (96), `terminated` (101) — and were re-run sequentially into
`results/baseline-retry.json`, where 5 converted (36, 46, 63, 96, 112) and 3 stayed 0 (48, 99, 101).
86 + 5 = the 91 quoted everywhere. The policy matches the agent arm's (infrastructure failures are
retried, genuine failures never are) and the yield-fix agent gate recorded zero infra errors, so the
arms are treated alike — but "91/115" is a merge of two files, and any command quoting it must pass
both. A reader who runs the ladder against `baseline-full.json` alone gets 86 and will think
something is broken.

### T9 — real divergence, zero measured cost on these rolls

The audit alleged an outputs-grading defect costing our own arm. The divergence is real in the code
and the **cost does not reproduce on the stored data** — worth separating, because "we found a bug"
and "the number is wrong" are different claims.

Real: official scans EVERY respond action (`base.py:150`, `for action in self.actions`), while
`run-agent.mjs` collected one reply per rc5 turn — the turn's closing text — so a required output
stated mid-turn would have been scored missing. (`retail-env.mjs` now exports `assistantTexts` /
`assistantTextsBefore` for exactly this; the runners were rewired 2026-08-17.)

Zero measured cost: the string comparison itself is faithful — `grade()` is semantically identical
to `base.py:144-161` (output lowercased only; content lowercased **and** commas stripped — that
asymmetry is in the official code too, so a required output containing a comma can never match in
either). Three candidate mechanisms were tested against `results/trajectories/` (115 files, 37 of
them with required outputs):

- required outputs appearing only in an intermediate assistant message rather than the turn's
  closing reply, which is the one our capture would drop — **0 cases**;
- appearing anywhere in the rc5 conversation at all, tool arguments included, but not in a captured
  reply — **0 cases**;
- tasks scored `r_actions=true, r_outputs=false` (a pure outputs loss) — **one task**, 34, in the
  baseline and principles-gate rolls, and `"1093.34"` appears nowhere in either trajectory, so the
  agent never said it. The yield-fix roll passed the same task with the number in a reply.

No correction to any published number, because there is nothing to correct: on these four rolls the
defect cost zero tasks. Worth fixing anyway (and it was), since the exposure grows with turn length
and the next roll is not these four.

## Running

```bash
python3 export-retail.py                 # regenerate retail-export.json from tau-src/
node fidelity-check.mjs                  # JS-vs-Python parity gate (must be 115/115)
node run-baseline.mjs --limit 115 --concurrency 2 --json results/baseline-full.json
node run-agent.mjs --offset 0 --limit 58 --json results/agent-shard0.json
node run-agent.mjs --tasks 5,14,17 ...   # targeted re-runs
node analyze-fails.mjs results/agent-final-shard0.json   # replay-diff autopsy of failures

# 2026-08-17 audit, no model calls: per-roll transfer table, then all corrected stats
node verify-t1-audit.mjs results/baseline-full.json results/baseline-retry.json
node verify-t1-stats.mjs
```

Neither τ runner records token usage — not in the rows, not in the trajectories — so the ladder's
cost axis reports `tokens: not recorded` for every τ file. Adding it means threading `turn.usage`
out of `sendTurn` **and** counting the user-simulator's own `chat()` calls, which are evaluation
calls in the RQGM sense; until then τ has no cost axis.

Key from `tools/robocoop-4/.env`; `OPENROUTER_MODEL` there is IGNORED — evals pin mimo explicitly.
`../robocoop-5-eval.html` is the notebook copy with the streaming core + v2 prompt.
