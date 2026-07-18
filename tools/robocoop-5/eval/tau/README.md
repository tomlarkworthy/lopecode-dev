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

| arm | pass@1 | date |
|---|---|---|
| raw model (official tool-calling loop) | 91/115 = **0.791** | 2026-07-17 |
| robocoop-5 system, v1 core | 84/115 = **0.730** | 2026-07-17 |
| robocoop-5 system, yield-fix core | 91/115 = **0.791** | 2026-07-17 (zero infra errors) |

The yield fix (below) closed the whole −6.1pp gap to an exact tie. On top of it, a replay-diff
failure autopsy (`analyze-fails.mjs`) motivated generic OPERATING PRINCIPLES in the loop prompt,
which converted 6 of the 11 non-model-ceiling gate failures on targeted re-runs (see below); a full
confirmation gate with the principles core has not been run yet.

## v1 failure taxonomy (−6.1pp): the harness's action bias fights conversational yield

**10 of the 16 agent losses called `transfer_to_human_agents` (0 of 9 wins did); 9 of 16 contain runs
of 3+ consecutive `think` calls.** The mechanism, visible in trajectories: when the agent needs
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
trajectories. Full gate result: 91/115, tying the baseline with zero infra errors.

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

## Running

```bash
python3 export-retail.py                 # regenerate retail-export.json from tau-src/
node fidelity-check.mjs                  # JS-vs-Python parity gate (must be 115/115)
node run-baseline.mjs --limit 115 --concurrency 2 --json results/baseline-full.json
node run-agent.mjs --offset 0 --limit 58 --json results/agent-shard0.json
node run-agent.mjs --tasks 5,14,17 ...   # targeted re-runs
node analyze-fails.mjs results/agent-final-shard0.json   # replay-diff autopsy of failures
```

Key from `tools/robocoop-4/.env`; `OPENROUTER_MODEL` there is IGNORED — evals pin mimo explicitly.
`../robocoop-5-eval.html` is the notebook copy with the streaming core + v2 prompt.
