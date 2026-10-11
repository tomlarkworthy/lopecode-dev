# ta-2-stats-by-prefix

## Round 1, 2026-10-11: `issue-stats.ts` counts openers by role, and the session's approvals by key

Task 2 of `plan/cloud-brain-record-names-token-not-agent.md`, requirements R3 and R5. A local tool
and its test file: no seed, no Worker, no deploy. The code is commit `f2e3172d`, 2026-10-11 19:02:33
+0200 (`git log -1 --format='%h %ci'` in the worktree, before the rebase of the landing).

### What changed

`tools/cloud-brain/issue-stats.ts`:

- **`openers`** is grouped by the role in the name of the token that opened the issue. A name of
  the shape `<role>-<6 hex>`, with the role one of `orch`, `impl`, `rev`, `spec`, `over`, `dig`,
  `out` (the spec, "The design"), is counted under the role. Any other name is its own group:
  `issues-implementer-2`, `claude-mv2fpk63-c9a3`, `owner`. With `--json` the value was
  `{ name: count }` and is `{ group: { count, names: { name: count } } }`.
- **`approveBySession`**: the `approve` moves whose `by.via` is `session`, counted by the shape of
  their key. A UUID is `pressed` (the panel writes one). `orch/<id>/approve-for-owner-<n>` is
  `madeForOwner` (`rules.md`, Never). A key of neither shape is not put in either count: its event
  is listed under `other`, and the printed line names it only when there is one.
- **`--until SEQ`** reads the record as it was at that event, so a count written down with its
  event can be made again.
- `report(events, options)` and `text(report)` are exported and call nothing. The fetch and the
  print run only when the file is the one run (`import.meta.main`). Before, the file fetched at
  its top level and a test could not load it.

The lines printed without `--json`: `openers {…}` on one line is now a heading and a line a group,
the names after the count when the group is a role; the approve line follows.

### What is counted, and what is not

- The approve count is of the whole record up to `--until`. `--after` does not narrow it: that
  option is about issues opened after an event, and an approve is a move.
- Events that are `hidden` to the token, and events of an issue whose id starts `test-`, are left
  out of both, as they are from the rest of the report.
- An `approve` made with a token (no such event is in the record at 1304) is not in the count: the
  line is about the session.
- The key is written by the session that made the move (the spec, "What exists today"), so the
  count says what the keys say and no more.

### The record, at two events

Read with `issues-implementer-2` at event 1304 (`issue.sync`, three pages), then `report` of the
worktree's file over the saved pages with `until` 1158 and with none:

```
1158 events  {"pressed":5,"madeForOwner":5,"other":[]}
openers, by the role of the token and then by its name
  owner                        8
  issues-implementer-2        51
  issues-overseer-1           32
  issues-reviewer-2           35
  worker:brain-x-snapshot      1
  deployer                     1
approve by the session: 5 pressed, 5 made for the owner

1304 events  {"pressed":7,"madeForOwner":5,"other":[]}
approve by the session: 7 pressed, 5 made for the owner
```

5 and 5 at 1158 is what the spec's R5 check names, and `issues-overseer-1` 32 is the count the
spec quotes from the tool at event 1156. The two more pressed by 1304 are events 1227 and 1285,
both with a UUID key and `by` `{"caller":"owner","via":"session","holder":"","tab":true}`. The 12
approve moves and their keys were listed apart from the tool, from the same pages, before the
change was written: UUID keys at 26, 681, 946, 1026, 1071, 1227, 1285 and `orch/` keys at 577,
649, 650, 651, 675.

No name of the new shape is in the record: task 1 has not made a token. The grouping by role was
run on the test's list only. `role` takes the spec's shape to the letter: one of the seven roles,
a `-`, six of `0-9a-f` in lower case, and nothing after. If `brain.ts agent-token` (task 1) makes
a name of another length or case, each such token is a group of its own and R3's check fails;
the test's second case (`impl-3FA2C1`, `impl-3fa2c`) is where that is written down.

### Tests

`tests/tools/issue-stats.test.ts`, a fixed list of 24 events: openers of each shape, approve moves
with both keys, one with a key of neither shape, one made with a token, one hidden, one of a
`test-` issue. Run in the worktree after the last change:

| Command | Result |
|---|---|
| `bun test ./tests/tools/issue-stats.test.ts` | 6 pass, 0 fail, 22 expect() calls |
| `ISSUE_STATS_TS=<a copy of the file at f2e3172d~1> bun test ./tests/tools/issue-stats.test.ts` | 0 pass, 1 fail: the file fetches when loaded (`ENOENT … issue-as.sh`) |
| `bun test ./tests/tools` | 201 pass, 0 fail, 24 files |

### Not tried

- A token of the new shape on cb4. None exists until task 1 and the owner's `loop-agents`.
- `--until` together with `--window` or `--idle`. `waiting` under `--until` still measures idle
  time from the clock of the run, not from the event named.
- The R4 check of the spec (`grep` for the old token names): the usage line of this file still
  names `issues-overseer-1` as the default token. No task of the spec names this file for R4; it goes with the owner's revoke of
  the three names.
- No reader of `--json` was found to change: `grep -rnE 'issue-stats' tools tests scripts
  cloud-brain-dev .claude/skills` over `.ts .sh .js .py .mjs` names the tool and its test only.
  The briefs that run the tool (`agents/overseer.md`, `agents/spec.md`) read its printed lines.
- The body of `report` is not indented under its `function` line, to keep the diff to the lines
  that changed.
