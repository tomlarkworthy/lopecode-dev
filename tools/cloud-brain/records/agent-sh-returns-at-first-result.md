# agent-sh-returns-at-first-result: the launcher reported a light run at its first result line

2026-10-11. Seen on the review of `fewer-review-rounds` (session `60646b96`), the first review that waited for
the landing lock in the background to mend a note. `agent.sh` printed

```
"result": "Still held by another landing (`metric-query-sampled-unsaid`, until 21:40 at the latest); the wait re-invokes me when the lock is mine."
"usage": {"input": 26, "cacheWrite": 33875, "cacheRead": 380907, "output": 6891}, "turns": 17, "usd": 0.485
```

and exited 0, while the run went on: it took the lock at 21:31:40 CEST, pushed `lopecode-dev@b8aefa1a`, and
recorded a `pass` (event 2270). `agent-usage.ts --session 60646b96…` on its transcript gives cacheWrite 38,057,
cacheRead 547,197, output 11,017, 17 requests. An orchestrator reading the launcher's line would have taken
the review for one that stopped, and posted the first leg's cost.

## Cause

A `claude -p` run that ends a turn on a background command and is woken by it writes one `result` line a leg
to its stream. `agent.sh` printed at the first and exited. Reproduced with `sleep 20` in the background and
`--output-format stream-json`: two result lines, "WAITING" then "DONE"; `total_cost_usd` 0.0551 then 0.0596 (of
the whole run), `usage`, `num_turns` and `duration_ms` of the leg each.

## What changed

`cloud-brain-dev/agent.sh` reads the stream to its end. `result` and `usd` are the last leg's, `usage`, `turns`
and `ms` are summed over the legs, and a new field `legs` is their number. Exit 1 is the last leg's error; exit
2 is no result line at all. `SKILL.md` step 4 names the field.

## Tests

`tests/tools/light-agent.test.ts`, "a run of two legs is reported at its end": a stand-in `claude` that writes
two result lines. The file: 15 tests, 49 expects. A real run with the changed launcher (session `b60953b0`, the
same `sleep` in the background): `result` "DONE", `legs` 2, `turns` 3.

## Not done, not tried

- The whole dollar cost of the review of `fewer-review-rounds` was not printed by anything; its cost comment has
  the usage from the transcript and no `usd`.
- A run whose last leg ends in an error after a leg that did not was not run for real; the test file's other
  cases have one leg.
- Earlier light reviews were not searched for a first leg taken as the whole. A review that wrote its verdict
  did so whatever the launcher printed.
