# Links between issues

For the issue `link-issues-with-a-common-cause` (event 399). The design is in
`plan/cloud-brain-issues.md`, "Amended 2026-10-11", item 4; the evidence that it was needed is
`records/review-the-default-workflow.md`, traps 3 and 4. This file is what was built, what was
measured and what was sent back.

## What it is

`issue.link { key, id, to, rel, remove }`, event type `linked`. `part-of` sets the parent of an
issue after it was opened; `duplicate`, `cause` and `related` are kept on both issues (`links`,
`linked`). `issue.list?link=ID` finds the parts and the linked of one issue. The reference is the
Methods cell of `tools/cloud-brain/brain-issues.ojs`.

## Round 1, deployed 11:06 and 11:20 on 2026-10-11

`brain-x-issues` `d910716356cf`, then `414a94222f6d` after the fresh review of `/review-notebook`
(a link is refused between two issues read by different rules). 21 of 21 tests in a QA tab (Chrome
151) and in the deployer's run (Chrome 128); `issue.verify?guards=true` ok over 456 events.

First used on cb4 at event 429 (this issue `related` to `review-the-default-workflow`). By 11:53
the record had 14 `linked` events, 11 of them the overseer's: three reports made parts of the
project `deploy-verdict-from-a-shared-page`, three closed as a `duplicate` or with their `cause` named.

## Round 2: what the loop's reviewer found (event 467) and what was done

| finding | done |
|---|---|
| A `duplicate` or `cause` link stayed on both issues after one was escalated to security: a reader of the other still saw it, `list?link=` found it, and its `remove` was 403 for everyone, the owner too | A swap that changes the `read` rule of an issue drops its links from both issues (`issueApply`, `swapped`). A `remove` is judged first and needs only that the link is there. Filed by the reviewer as the security issue at event 474. |
| `remove: "true"` added a link | 400 for a `remove` that is not a boolean |
| Removing a link that is not there wrote an event | 404 `no such link` |
| No test count for links in a record; a time not read from a clock | this file; the time is taken out of the other record |
| The submit's refs left out the first commit and named a hash that no longer ran | the resubmit names what runs |

Test: `test_issues_links_parts_and_the_moves_that_end_a_trap` has each of the three (an escalated
issue and its two links, the wrong type, the second remove). 21 of 21 in the headless runner
(`lope-tests.ts --filter test_issues`) at 2026-10-11 12:01 CEST; the count in a browser and the deploy's own are in
the submit's comment.

## Not tried

- A link dropped by a swap on cb4: the rig only. The 14 links on cb4 are all between issues read by one rule.
- An issue escalated before this deploy with a link on it: there is none on cb4 (the hidden issue of event 474 was opened after, as security).
- The panel draws links and has no control to make one.
