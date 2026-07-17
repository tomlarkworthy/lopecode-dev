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

## Results (2026-07-17, pass@1, all 115 tasks, zero unresolved infra errors)

| arm | pass@1 |
|---|---|
| raw model (official tool-calling loop) | 91/115 = **0.791** |
| robocoop-5 system | 84/115 = **0.730** |

Cross-tab: both pass 75, baseline-only 16, agent-only 9, both-fail 15.

## Why the system loses (−6.1pp): the harness's action bias fights conversational yield

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

Actionable harness work, in expected-value order: make the completion guard conversation-aware (a
turn that ASKS THE USER a question is a legitimate tool-free turn), soften the never-stop language
when the blocker is missing user input, and treat `transfer_to_human_agents`-class escalation tools
as requiring an explicit user-facing question first.

## Running

```bash
python3 export-retail.py                 # regenerate retail-export.json from tau-src/
node fidelity-check.mjs                  # JS-vs-Python parity gate (must be 115/115)
node run-baseline.mjs --limit 115 --concurrency 2 --json results/baseline-full.json
node run-agent.mjs --offset 0 --limit 58 --json results/agent-shard0.json
node run-agent.mjs --tasks 5,14,17 ...   # targeted re-runs
```

Key from `tools/robocoop-4/.env`; `OPENROUTER_MODEL` there is IGNORED — evals pin mimo explicitly.
`../robocoop-5-eval.html` is the notebook copy with the streaming core + v2 prompt.
