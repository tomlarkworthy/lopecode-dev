# cu-1-deployer-gains-billing-read: the deployer's list of Cloudflare groups has `Billing Read`, and cb4 runs it

Issue `cu-1-deployer-gains-billing-read`, task 1 of `plan/cloud-brain-cloudflare-usage-read.md` (approved by the
owner, event 3378). Its body: "The owner's: built by no writer of the loop." Written 2026-10-13 by the orchestrating
session (token `orch-d97e0e`) for review 5848, which held the change for having no record. The edit and the deploy
were made by another session, with the owner in it, and reported in comment 5824; what is said of them here is that
comment's unless a line says "my run" or names the reviewer.

## What was asked

`Billing Read` in the deployer's `GROUPS`, so that a Worker's recipe may ask for a Cloudflare token of that group
(the spec, "The deployer gains one group"), and the owner's deploy of the deployer. Done when
`getSource?worker=brain-deployer` holds "Billing Read".

## The owner's word

Comment 5824 quotes him, in his session on 2026-10-13, of the issues that waited for his answer: "Yes do them all
as recommended". For this issue that is his A of events 3784 and 3790. I did not hear it; no word of it was said in
the orchestrating session.

## What changed

Commit lopecode-dev@f763fd8a, two files:

- `tools/cloud-brain/brain-deployer.ojs`: `GROUPS` is
  `["Workers Observability Read", "Workers AI Read", "Artifacts Write", "Billing Read"]`; the expected text of
  `test_a_cloudflare_permission_is_refused_off_the_list_and_outside_a_recipe`; the comment above `GROUPS`; the
  sentence of the first cell.
- `tools/cloud-brain/running-a-cloud-brain.md`: the line that lists the groups, which now also names
  `Artifacts Write`.

The reviewer read the diff against the spec's list: "the five places are changed and no other" (review 5848).

Since 2026-10-13, in the seed and not on a Brain: the list has a fifth group, for stage 2 of
`plan/cloud-brain-dashboard-service.md`, and is
`["Workers Observability Read", "Workers AI Read", "Artifacts Write", "Billing Read", "Account Analytics Read"]`.
`tests/tools/cu-1-record.test.ts` reads the seed's list in this file, so the line is here.

## The deploy

By comment 5824, times CEST from its `date`: the edit was landed by a push under the landing lock at 06:12:30;
under the deploy lock, 06:12:49 to 06:13:47, `brain.ts install-deployer` answered `updated cb4-deployer
e4b02e4f4481`. The deployer of before, `fc8063a52d65`, was copied first to
`tools/cloud-brain/.emitted/deployer.before-cu-1.json`. That file is there (my `ls`, 2026-10-13); I did not read it.

The way back, not run: copy that file over `.emitted/deployer.json` and run `brain.ts install-deployer`, under the
deploy lock. It is the owner's act (`rules.md`, Never: the deployer).

## Counts

| Run | By | Result |
|---|---|---|
| `tab-tests.ts … @tomlarkworthy/brain-deployer --emit`, before the deploy | the session that deployed (5824) | 57 tests, 57 passed |
| `bun sync.ts https://cb4… && bun test.ts brain-deployer`, after it | my run, 2026-10-13 | `brain-deployer e4b02e4f4481: 57 passed, 0 failed, 0 need a browser`; `cloudflare-iac`: 25 passed, 0 failed, 2 need a browser |
| the same | the reviewer (5848) | the same counts |
| `tab-tests.ts … @tomlarkworthy/brain-deployer` on its own build at f763fd8a | the reviewer | 57 of 57 |
| without `"Billing Read"` in `GROUPS`, `test.ts --with <copy>` | the reviewer | 56 passed, 1 failed, the changed test |
| `brain.ts redistil` | my run, and the reviewer's | 23 of 23 `same`, `distiller e4b02e4f4481` |
| `getSource?worker=brain-deployer` at `cb4-deployer.endpointservices.workers.dev` | the reviewer | 200, "Billing Read" 4 times |
| `bun test --timeout=30000 ./tests/tools/cu-1-record.test.ts` | my run | 3 pass, 0 fail |

My own read of `getSource` failed: at the Brain's address the path answers 501 with the deployer's name in it and
404 without. It is read at the deployer's own address.

## Not tried, not known

- No mint of a token with `Billing Read`. Whether the deployer's own Cloudflare token holds the group is not known.
  It shows at the first apply of `cu-2-usage-service` as `token.mint-failed`; the token the owner makes next then
  names the group (the spec, "What only the owner can do", item 3).
- No test declares `Billing Read` in a recipe and sees it held; the spec lists none.
- The token `loop-usage` (`usage.account`) is not made. The spec gives it to the orchestrating session: "Made when
  task 2 is next, after task 1 is done", and after task 2's apply if `token.create` refuses a method that no Worker
  declares yet ("What the orchestrator makes").
- The way back was not run.
- Comment 5824 and the label event 5825 were written with the role token `issues-implementer-2` by a session outside
  the loop; the reviewer added the case to `seen-outside-session-wrote-as-impl-2`.
