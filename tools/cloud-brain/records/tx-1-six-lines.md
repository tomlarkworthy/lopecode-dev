# Six untrue lines mended (`tx-1-six-lines`)

Task 1 of `plan/cloud-brain-texts-not-read-again-after-a-change.md`, round 1, by a writer of the
issue loop on 2026-10-11. The edits and their test are one commit, whose subject begins
"tx-1-six-lines: six sentences" (author time 21:59:32 +0200, `git log --format=%ai`), made in a
worktree at `412fc043`, brought up to `f0ce499a`, and at the landing to `bf4762e2`. That last
rebase met a change of `main` to the same line of the writer's brief (the command now begins
`LOCK_TOKEN=<token>`); `main`'s command was kept and the new sentence put after it. Its name on
`main` is the first ref of the submit: a rebase gives it another. No seed, no deploy.

## What changed

Seven lines in six files (`git show --stat` of that commit: 77 insertions, 70 of them the test, and 7 deletions).

| File | Before | After |
|---|---|---|
| `plan/cloud-brain-dashboards-share-series-and-controls.md`, lines 243 and 325 | "the note under the panels" | "the note above the panels" |
| `knowledge/changing-and-deploying-a-cloud-brain-worker.md`, step 4 | "`renew` gives the holder 600 s more" | "`renew` gives the holder 600 s from the renew" |
| `.claude/skills/brain-maintenance/agents/implementer.md`, step 10, the release | "It prints when the lock was taken and when it went." | the same, then: "Then one line `docs (cb4): …`: the docs step; `not entered (…)` is no failure of the landing (the exit is the release's; `knowledge/calling-a-cloud-brain-from-this-checkout.md`, "The knowledge docs in the Brain's search")." |
| `plan/cloud-brain-dashboard-service.md`, "A dashboard" | "The owner and his tokens reach every one." | the same, then: "(As built, `dsv-3-dashboards`, 2026-10-11: they read every one and write no member's and no built-in name; `tools/cloud-brain/records/dsv-3-dashboards.md`.)" |
| `knowledge/working-with-cloud-brain-remote-lopecode-cluster.md`, the row of the loop | "(written 2026-10-10, not yet run as a loop)" | "(written 2026-10-10, run as a loop since that day)" |
| `.claude/skills/brain-maintenance/agents/spec.md`, line 9 | "Not yet run: say in your report" | "Run since 2026-10-11: say in your report" |

The words are the spec's, under "The design". Two differ from it by a little. The line of the
writer's brief has "the docs step" and the place to read more, which are in the one-line fix of the
ticket (`seen-step-10-omits-docs-line`), and "the exit is the release's", from the header of
`lock.sh`. Nothing else was added to any of the six.

## What each new sentence rests on

Read on 2026-10-11 in the worktree at `412fc043`. None was seen on cb4.

- **Above the panels.** The cell `dashboard` of `tools/cloud-brain/cloud-brain.ojs`: the line
  `${note ? htl.html\`<div …>${note}</div>\` : ""}` comes before the `<div style="display:grid…">`
  of the panels. The page was not opened.
- **600 s from the renew.** The header of `tools/cloud-brain/lock.sh`, line 7: "600 s from now for
  a lock <who> holds". No renew was made for this sentence before the record was written.
- **The docs line.** `lock.sh`, the `release` branch: after `echo "$NAME released by …"` it prints
  `docs ($BRAIN_BASE): <the tool's last line>` or `docs ($BRAIN_BASE): not entered (<why>)`, then
  `exit 0`. `BRAIN_BASE` is `cb4` when the shell has none. The heading "The knowledge docs in the
  Brain's search" is line 110 of the calling guide. The line of a real release is in the comment
  of the issue, since the record is committed before the landing.
- **As built.** `tools/cloud-brain/records/dsv-3-dashboards.md`: "the owner and their tokens
  **list and read** every dashboard, and **write none** named `m-…`", and "`dashboard.put` of
  `health`. Decided: 403, for every caller, and the same for `dashboard.delete`". `health` is the
  one built-in dashboard that record names. The date is that of `bfc72c07` (20:30:39 +0200). No
  call was sent to `brain-x-dashboard`.
- **Run as a loop since that day.** `cloud-brain-dev/philosophy.md`: "On 2026-10-10 the loop ran
  from about 16:00 to 21:25 CEST". Not read from the tracker's events.
- **Run since 2026-10-11.** The spec this task is of was written by an agent with that brief on
  2026-10-11 (its header). The spec's count, "28 stays in `spec` (issue-stats.ts)", was not run again.

## The test

`tests/tools/tx-1-six-lines.test.ts`, five tests. It reads the files as they are.

```
before the six edits   bun test ./tests/tools/tx-1-six-lines.test.ts    0 pass  5 fail   6 expect() calls
after                  the same                                         5 pass  0 fail  24 expect() calls
```

A phrase that was untrue is held at 0. A mended sentence is held by its own words, not by the
spec's counts of a phrase ("above the panels" 3, "600 s from the renew" 1): a count of 3 does not
say which lines have the words, and a fourth true line would fail it. The spec's "After" column
was run as well, after the edits, and gave its numbers: 0, 3, 0, 1, 1, 0, 0, and 1, 1 for R2.

Three of the five also read the code or the record the sentence is about (the order of the note and
the grid in the cell `dashboard`; the two `echo "docs ($BRAIN_BASE)…` lines of `lock.sh` and the
`exit 0` after them; two sentences of the record of `dsv-3`). A change there fails the test, and
the sentence is then to be read again. The spec lists "a test that holds each sentence by its
letters" under "Not chosen" as the way to keep docs true, and asks for this file all the same, for
the count of the submit.

The whole directory, in the worktree at `f0ce499a` with the two commits of this task on it:
`bun test ./tests/tools` gave 345 pass and 1 fail in 39 files, and the file of this task 5 pass
again. The one is `issue-lock-sql.test.ts`, which reads `tools/cloud-brain/.emitted/cloud-brain.html`;
a worktree does not have it until a build, and none was made for this task.

At `412fc043`, before the rebase, the same command gave 327 pass and 3 fail. The other two were of
`light-agent.test.ts`: the JSON line of `cloud-brain-dev/agent.sh` at `3801492` had `mode` and
`toolset` and the test expected neither. With the six files stashed those two files gave 13 pass
and 3 fail, and the same with them back. `main` has mended that test since.

## Not tried

- No page was opened and no call was sent to cb4 for any of the six sentences.
- The spec's three other finds are not in this task: `token:NAME` in two references (task 3), R16
  of `plan/specs/cloud-brain.html` and line 1628 of `cloudflare-iac.ojs` (the owner's).
- The six files were not searched for other untrue sentences.
- `agents/spec.md` step 6, which names the release, was not checked against `lock.sh`
  (the ticket of 1841 says the same of itself).
