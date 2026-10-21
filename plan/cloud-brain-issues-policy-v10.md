# Issues policy v10: the flow task workflow

`plan/cloud-brain-issues-policy-v10.json` is the body of an `issue.install` for cb4, written on
2026-10-21 for step 2 of §7 of `plan/cloud-brain-agentic-redesign.md` (the owner's 1A). It has not
been installed. It needs `brain-x-issues` with tracker changes 1 to 4 (cloud-brain-dev branch
`redesign-tracker`), because its guards read `issue.by["+<label>"]` and `r.holder`/`r.seq` of a
review, which the deployed tracker does not keep. Under the deployed tracker those reads are errors,
so `finish` and every review would be refused.

## What it was made from: event 15036, not the v9 file

On 2026-10-21 `issue.policy` on cb4 answered seq 15036, reason "Same policy as v13 and v14 (events
14727, 15011) … approver from 5a885116…". Its task workflow differs from the v9 file (`back` also
from `awaiting-approval`; `approve` is `caller.present || caller.actor == "delegation:eb3db9d0c6a5"`).
The answer is kept as `tests/tools/fixtures/issues-policy-15036.json`. `security`, `feedback`,
`project` and `kinds` of v10 are 15036's, byte for byte (`tests/tools/issues-policy-v10.test.ts`).
The workflow keeps the name `task`, so `feedback`'s `promote` (to `task`/`open`) lands on it.

## The task workflow

States `open`, `done`, `closed`, `rejected`, `reverted`; all but `open` are closed. Routing is the
`needs-*` labels, not states. `read`, `open`, `comment`, `label`, `link`, `narrow`, `reopen`,
`revert` and the `escalate` swap are 15036's. New or changed:

| act | guard |
|---|---|
| `wait` | `caller.kind in ["owner", "token"]` |
| `review` | that, and `caller.holder != issue.by["+worker-processing"].holder` |
| `finish` open → done | a `pass` by a holder that is not the worker's, after the last put of `needs-reviewer`, no `block` after it; on a `major` issue also the owner present or `delegation:eb3db9d0c6a5`, with a reason |
| `close`, `reject` open → closed/rejected | owner or token, with a reason |
| `owner-reject` open → rejected | owner present, with a reason |

**Deviation from §3.5: `event.reason != ""` inside the major clause.** `finish` is in
`issuesLimits.auto`: after a write the service makes it as that write's caller when the guard passes
with the reason `auto` and with `""`. Without the reason clause, any comment of the owner present on
a major issue with a pass would finish it. With it, the auto attempt with `""` fails, and the owner
or the approver finishes a major issue by a move with a reason.

## The migrate, and the labels

`migrate` maps every open state of 15036's task workflow (`open`, `triaged`, `ready`,
`in-progress`, `in-review`, `awaiting-approval`, `stopped`) to `open`. `issue.install` maps states
only and puts no label, so `tools/cloud-brain/migrate-labels.ts` puts §5's labels after the
install, dry by default:

- `open`/`triaged`/`ready` → `needs-worker`, unless the issue carries `needs-owner` or `laptop`
- `in-progress`, `stopped` → `needs-worker`; for `stopped` a comment quoting the stop's reason first
- `in-review` → `needs-worker`, **not** `needs-reviewer` as §5 says: the review guard reads
  `issue.by["+worker-processing"]`, which no migrated issue has, so a reviewer would be refused.
  The worker hands it over again.
- `awaiting-approval` → `needs-owner`, `major`
- `run-stopped`, `stranded` are taken off where carried.

`not-done` is closed in 15036 and is not migrated. On 2026-10-21 cb4 had 22 open task issues
(11 `ready`, 4 `triaged`, 3 `in-review`, 2 `stopped`, 2 `open`).

## The walk

`bun tools/cloud-brain/policy-walk.ts plan/cloud-brain-issues-policy-v10.json`, 2026-10-21, on the
worktree's patched module:

```
plan/cloud-brain-issues-policy-v10.json: 17664 states, 539744 acts allowed, 1313440 acts tried, 0 states left unvisited, 6.0 s in the cell
major-done-is-his: holds … (asked of task, security)
major-stays: holds … (asked of task, security, feedback, project)
project-done-was-approved: holds … (asked of project)
no-own-review: holds … (asked of security, project)
no-trap: holds … (asked of task, security, feedback, project)
loop-ends-it: holds … the owner's, as listed: security/awaiting-approval, security/in-review
moves-are-his-or-a-token: fails: 4 … project.respec project.review project.submit-spec project.to-approval
```

The four project acts are 15036's, unchanged. The nine task acts the v9 walk listed are gone.
`no-own-review` is not asked of task: the walk's fixture names actors, not holders, so the new
review guard is not modelled. The holder rule is tested in brain-x-issues
(`test_issues_flow_finish_wants_a_pass_by_another_holder_after_the_hand_over`).

The reason ends `approver from e7af0169…`, the format cloud-brain-dev's `approver.ts` and
`policy-check.ts` read, as 15036 does. `policy-pins.ts` now reads both forms and `remake` writes
`approver from` cloud-brain-dev's origin/main. `policy-pins.ts check`, 2026-10-21:

```
plan/cloud-brain-issues-policy-v10.json names approver from e7af0169f7904eb20af4432f8c08094bb9cd3a49, an ancestor of origin/main of cloud-brain-dev
```

`tests/tools/policy-walk.test.ts` walks the newest file as it is and makes its weakened policies
from v9.

## Installing it

The owner's step; not run. In order:

1. Deploy brain-x-issues from branch `redesign-tracker`:
   `bun apply.ts --patch <the patch> --owner` in the clone (dry run 2026-10-21: hash
   `d95f66dd5f59…`, state ready, 86 tests).
2. `issue.rebuild`, so rows written before it carry `holder`, `seq` and `+label`.
3. `issue.policy` should answer seq 15036; if not, remake this file from what it answers.
4. From the main checkout after merging:
   ```
   BRAIN_BASE=cb4 bun tools/cloud-brain/brain.ts curl /xrpc/com.lopecode.brain.issue.install --owner \
     -X POST -H 'content-type: application/json' -d @plan/cloud-brain-issues-policy-v10.json
   ```
5. `bun tools/cloud-brain/migrate-labels.ts --token <name> --install <seq of 4>`, read its lines,
   then the same with `--write`.

The drain must speak labels (§7 step 3) before the install, or it will look for states that no
longer exist.
