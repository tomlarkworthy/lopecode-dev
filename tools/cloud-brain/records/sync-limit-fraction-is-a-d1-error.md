# `issue.sync` with a limit that has a part

Issue `sync-limit-fraction-is-a-d1-error`, written 2026-10-13. The seed is
`tools/cloud-brain/brain-issues.ojs`, the Worker `brain-x-issues`.

## What was seen

On cb4, 2026-10-13 02:24:23 CEST (`date`), with `brain-x-issues` at `b647aa60f298`, each as
`tools/cloud-brain/issue-as.sh impl-b23bb0 "<call>"`:

```
sync?after=5600&limit=1.5   {"message":"D1_ERROR: datatype mismatch: SQLITE_MISMATCH"} [400]
list?limit=1.9              [200], one issue
queue?limit=1.5             [200]
runs?limit=1.5              {"error":"InvalidRequest","message":"limit: a whole number, 1 to 500"} [400]
```

`issue.sync` bound `Math.min(L.page, Math.max(1, Number(q.limit) || L.syncPage))` to `LIMIT ?2` of
the statement `after`. `issue.list` and `issue.queue` give the same expression to `slice`, which
cuts at the whole number under it. `issue.runs` refuses a limit that is not a whole number
(`whole("limit", 1, L.page, L.page)`). So of the four, `sync` alone gave the number to SQL.

The tests did not show it: the fake of the statement (`issuesFakeSql`, `S.after`) cut with `slice`
too, and answered a limit of 2.5 with two events.

## What changed

- `issue.sync`: `Math.floor` around the expression. The order of the reads is as it was, so 0.5
  and -2.5 are 1 (under 1), 2.5 is 2, and 0, `abc` and nothing are the default.
- `issuesFakeSql`: the statement `after` throws `D1_ERROR: datatype mismatch: SQLITE_MISMATCH` for a
  limit that is not a whole number. The other statement with a `LIMIT`, `lockHistory`, is not
  changed: its caller refuses such a number before the statement.
- `test_issues_list_and_sync_say_when_more_remain`: one more line, six reads of `sync`: the status
  at `limit=2.5`, and the events at 2.5, 5.9, 0.5, -2.5 and at `after=5&limit=1.5`.
- The reference, rows `issue.sync` and `issue.list`: "one with a part as the whole number under
  it", after "one under 1 as 1". `list` read it so before; its row did not say.
  `test_issues_reference_states_each_value_and_has_no_hole` holds both sentences.

No method, rule or limit is added. `bun tools/cloud-brain/brain-info-size.ts <the emitted record>`:
`brain-x-issues 4966 of 5100, 29 methods, 134 bytes left`.

## Tests

Without the fix, with the fake and the test line in place (`bun test.ts brain-x-issues --with
<the built module>` in `cloud-brain-dev/`): `passed 47, failed 1, needsBrowser 17`; the one is
`test_issues_list_and_sync_say_when_more_remain`, "Failed to parse JSON".

With the fix, each run after the last edit of the seed:

| Command | Result |
|---|---|
| `bun test.ts brain-x-issues --with <the built module>` | passed 48, failed 0, needsBrowser 17 |
| `bun tools/cloud-brain/tab-tests.ts tools/cloud-brain/.emitted/cloud-brain.html @tomlarkworthy/brain-issues` | tests 65, passed 65, twice (the second run emitted) |
| `BRAIN_BASE=cb4 bun tools/cloud-brain/verify-run.ts brain-x-issues --shell <the build> --times 20` | runs 20, passed 20, failed 0, none 0, `from: ["document"]`, `byChance: []` |
| `tests/tools/suite.sh`, with the record written | 1009 pass, 0 fail, 103 files |

## Not tried

- A SQLite was not run for the statement. That D1 refuses a `LIMIT` with a part is from the answer
  of cb4 above, for 1.5; the fake refuses every number that is not whole on that one case.
- `after` with a part (`after=1.5`). It is compared and not a `LIMIT`; nothing was changed for it.
- `issue.queue` and `issue.runs` were read and called once each, above, and not changed. The row
  of `issue.queue` does not say how a limit with a part is read.
- The call on cb4 after the deploy is not in this file: it is in the comment on the issue.
