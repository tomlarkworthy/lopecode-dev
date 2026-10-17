# Issues policy v9: a simpler task workflow

`plan/cloud-brain-issues-policy-v9.json` is the body of an `issue.install` for cb4. It was written on
2026-10-17 by session `out-policy-v9` after the owner said "write v9". It has not been installed. An
install needs the owner present (see "Installing it" below).

The owner's brief for v9 was: fewer choices, simpler, no calendar timers, work stays on the cluster,
and security without pedantry. Only the `task` workflow changes. `security`, `feedback`, `project`
and the kinds map are v8's, byte for byte (`tests/tools/issues-policy-v9.test.ts`).

## What it was made from: event 7928, not the v8 file

The v8 file was never installed. On 2026-10-17,
`bun tools/cloud-brain/policy-walk.ts --in-force --token out-d6d8e2` answered:

```
in force: not v8. Of the policy of event 7928, task differs; 3 of the 4 workflow hashes of plan/cloud-brain-issues-policy-v8.json are in force
```

`issue-as.sh out-d6d8e2 policy` showed that 7928's task workflow is v8's with one more closed state,
`not-done`, and one more move, `not-done` (done → not-done). Its guard is
`event.reason != "" && size(event.refs) > 0 && (caller.present || (issue.major && caller.kind in ["owner", "token"]))`.
The owner installed it on 2026-10-15 for issue `approved-not-landed-state` (approve 7916, deploy
`brain-x-issues` fd19e0b53e4f). No plan file was written for it. v9 is built on 7928 because an
install replaces the whole policy, and a body made from v8 would drop `not-done`.

**7928's reason has no `approver brief <blob> tool <blob>` at its end.** That reason reads:
"Tom, 2026-10-15, in chat, to session out-e35309: "1 yes from my session" … Policy 7381 with one state
not-done, closed, and one move done to not-done." `approver.ts` makes no `approve` under a reason
without the blobs (R7, `tools/cloud-brain/approver.ts` line 262). So no approver approve has been
possible since 7928. On 2026-10-17, five tasks were at `awaiting-approval` (from `issue.list`).
v9's reason ends with the blobs of `main` (`7ab2a429…` and `1f27f2e7…`, the same as v8's), and
`bun tools/cloud-brain/policy-pins.ts check` passes on it. So installing v9 also lets the approver
work again.

## The five changes

| # | asked for | in v9 |
|---|---|---|
| 1 | Filing by the owner or a token goes straight to `ready` | `ready` now moves from `open` as well as `triaged`, with the same guard: `caller.kind in ["owner", "token"] && issue.children.open == 0`, no reason needed. `triage` is unchanged and still works, so a v8 caller that triages and then readies is not broken. |
| 2 | A stopped run and needs-owner become a state | New state `stopped`. It is not a closed state. `stop` moves ready, in-progress or in-review → stopped. `retry` moves stopped → ready. Each needs `caller.kind in ["owner", "token"] && event.reason != ""`. `stopped` is added to the `from` of `owner-reject` and of `close`. The labels `run-stopped` and `needs-owner` are kept, and the `start` guard still reads `needs-owner`. |
| 3 | A refused push has a way back | The task workflow has no `approved` state: `approve` goes to `done`, and push.ts treats `done` with an `approve` after `to-approval` as approved but not yet pushed (`cloud-brain-dev/push.ts` lines 63-66). After a refused push the issue goes to 7928's `not-done`. New move `requeue`: not-done → ready, owner or token, with a reason. A major issue goes through `to-approval` again, so the owner approves the new patch. For in-review, `back` now moves from `in-review` as well as `in-progress`, to `ready`, owner or token, with a reason. |
| 4 | Say what `major` means now | This is said in the reason. `major` covers a change to a credential, a Cloudflare permission, the rule-checking code (policy cells, the approver's files), or a deploy of one of the owner's four Workers (`OWNERS` in `cloud-brain-dev/drain.ts` line 60: kernel, core, db, deployer). The label and every guard that reads it are unchanged. Which files make a change major is decided by the loop, not by this file (follow-up 1). |
| 5 | No move removed without a replacement | Every move name of 7928 is still in v9 (the test checks this). Nothing was removed. |

Some details behind these choices:

- **`back` was widened instead of adding a new move from in-review.** It keeps the number of names
  low. Its target is `ready`, not `in-progress`. A move to in-progress that is not `start` would
  leave `issue.by.start` set to the old writer, and `submit` is guarded by `caller.actor == issue.by.start`.
  From `ready`, the next run's `start` names the new writer. A move clears `issue.reviews`
  (`brain-issues.js` line 600), so an old pass does not carry into the next round.
- **`stop` is allowed from `ready`.** The six issues that carry `run-stopped` today are all at
  `ready`, and each then needs only one move (see Migration). The alternative was to leave `ready`
  out and require `start` then `stop`, which is two moves and an empty run on the record.
- **`retry` does not check `needs-owner`.** The owner asked for a retry "by token or owner with a
  reason". In v8 that label is not protected by any guard either: a token may remove it, since the
  `label` guard protects only `major`. Requiring the owner present on `retry` for a labelled issue
  would have been the stricter option. It was not done, to follow the owner's "security without
  pedantry". The owner's authority is still kept by `approve` for a major change and by
  `owner-reject` from every open state.
- **`requeue` starts from `not-done`, not `done`.** A move straight from `done` would let a token
  re-open any finished task. `not-done` is the state the owner chose on 2026-10-15 for "approved, but
  the change did not land", and his words then were "we can figure out how to reenqueue later".
- **Rejected: an `approved` state between `awaiting-approval` and `done`.** It would be the same as
  in `project`. But push.ts reads `state === "done"` after an approve. A new state would make push.ts
  refuse every approved push until push.ts is changed.

The project, security and feedback workflows are not changed. In particular, security's `approve` is
still `caller.present` only.

## The walk

`bun tools/cloud-brain/policy-walk.ts plan/cloud-brain-issues-policy-v9.json`, run 2026-10-17 in the
worktree. `cloud-brain-dev/deploy/` was refreshed by `bun sync.ts` first. Exit 1:

```
plan/cloud-brain-issues-policy-v9.json: 31728 states, 1087672 acts allowed, 2626736 acts tried, 0 states left unvisited, 12.1 s in the cell
major-done-is-his: holds: 0 moves to done of an issue that carries major, by a caller that is neither the owner present nor the delegation the approve guard names (asked of task, security)
major-stays: holds: 0 edges that take major off, by a caller that is not the owner present (asked of task, security, feedback, project)
project-done-was-approved: holds: 0 states at done reached from the open with the approve moves of the owner present and of that delegation cut (asked of project)
no-own-review: holds: 0 reviews, and moves out of a review state that read the reviews, by the actor the move into that state was guarded by (asked of task, security, project)
no-trap: holds: 0 states from which no closed state is reached (asked of task, security, feedback, project)
loop-ends-it: holds: 0 states, as workflow/state, from which no closed state is reached by tokens and the approver alone, and that the list of the owner's does not have (asked of task, security, feedback, project): the owner's, as listed: security/awaiting-approval, security/in-review
moves-are-his-or-a-token: fails: 9 moves, reviews, labels and swaps a Worker of the Brain was allowed, as workflow.move (asked of task, security, feedback, project): project.respec project.review project.to-approval task.pass task.review task.rework task.start task.submit task.to-approval
```

All 31,728 states were visited. From every state some closed state can be reached (`no-trap`), and
the loop's tokens can reach one without the owner except from the two listed security states
(`loop-ends-it`). `moves-are-his-or-a-token` fails with nine acts of a Worker, as it does under 7928, and `policy-walk.test.ts` expects them until `rk-2-moves-are-his-or-a-token` lands. None of v9's
new or widened moves is among them. Under the same tool, 7928 gave 30,864 states with six properties holding and
nine acts for the seventh, and v8 gave 30,144 states.

## Migration

The install's `migrate` is `{ "ae6c97e0…224d": { "workflow": "task" } }`. That hash is 7928's task
workflow. It moves every open task issue to the v9 task workflow in the same state. Every 7928 state
is a state of v9, so no `states` map is needed. `security`, `feedback` and `project` keep their
hashes, so their issues do not move.

A `migrate` maps a state to a state (`issue.install`, `brain-issues.js` line 47). It cannot pick
issues by label. Mapping `ready → stopped` would move all of the roughly 37 ready tasks, not just the
six stopped ones. So the issues carrying `run-stopped` are moved by hand after the install. They are
the six open ones on 2026-10-17 (`issue-as.sh out-d6d8e2 "list?label=run-stopped&limit=500"`, 14 in
all, 8 of them closed):

```
ds-1-dashboards-pilot  ap-3-trial-d  bk-7-read-after-two-days-d  mde-4-approver-role-in-dev
drain-ships-service  deployer-keeps-whole-test-failure
```

Each one gets one `stop` move made by a token:
`issue-as.sh <token> move '{"key":"v9-migrate/<id>/stop","id":"<id>","to":"stopped","reason":"run-stopped under v8; v9 makes it a state"}'`.
Read the list again before doing this, because it changes.

Two closed issues carry `run-stopped` and `major` at `done`: `dev-triage-step-on-main` and
`drain-checks-free-disk`. They may be approves whose push was refused. If so, they belong at
`not-done`, and the `not-done` move needs a ref to the refusal. That is for the owner or the loop to
judge. It is not part of this install.

A swap clears `issue.reviews`. On 2026-10-17 two tasks were at `in-review`
(`service-docs-are-reference-2`, `-3`). A pass written but not yet acted on before the install has to
be written again after it (`plan/cloud-brain-issues.md`, "Installing it").

## Follow-up tasks for cloud-brain-dev (not made here)

1. **patch.ts: decide `major` by path, for the new meaning.** Today any file outside `SAFE`
   (`README.md`, `records/*.md`) needs an approve (`cloud-brain-dev/patch.ts` lines 59-60). The new
   rule names what is major: a credential, a Cloudflare permission, the rule-checking code (policy
   cells, the approver's brief and tool), and a deploy of `OWNERS`. Everything else should pass on a
   review. Both `run.ts` (which adds the label when the patch is read) and `push.ts` (which refuses an
   unapproved non-SAFE file) read `needsApprove`, so both follow from that one change.
2. **run.ts: `stop` instead of `back` and the `run-stopped` label.** A run that ends short of a pass
   makes `stop` with its reason. A `block` review keeps the `needs-owner` label beside the move. The
   labels can be added as they are now, until nothing reads them.
3. **drain.ts: nothing is required.** It already takes only `state === "ready"` (`drain.ts` line
   67), so a `stopped` issue is not drained, whatever its labels. `run-stopped` can be removed from
   `NOT` once run.ts no longer adds it and the six above have been moved.
4. **push.ts: on a refused push after an approve, make `not-done`** with the refusal as its ref,
   instead of the comment. This is already the planned next step in the body of
   `approved-not-landed-state`. A later run, or the open issue `loop-retries-a-stopped-run`, makes
   `requeue` or `retry`.

## Installing it

This is the owner's step, and it was not run. Before installing, check two things. First,
`tools/cloud-brain/issue-as.sh <token> policy` should answer `policy.seq` 7928. If another policy has
been installed since, this file has to be made again from that one. Second,
`bun tools/cloud-brain/policy-pins.ts check` should exit 0. Then, from the main checkout after
`git pull`:

```
BRAIN_BASE=cb4 bun tools/cloud-brain/brain.ts curl /xrpc/com.lopecode.brain.issue.install --owner \
  -X POST -H 'content-type: application/json' -d @plan/cloud-brain-issues-policy-v9.json
```

The answer should have a new `seq`, the open task issues in `moved`, and `left: []`. After that,
`policy-walk.ts --in-force --token <t>` should print `in force: v9`.
