# Oversight of the issue loop

One entry per oversight, newest last, written by the overseer (`agents/overseer.md`). The first
line of the last entry is where the next one starts.

## 2026-10-10 16:21 CEST, events 1 to 77
Not an oversight: the starting point. Events 1 to 77 were written before the loop existed.

## 2026-10-10 18:07 CEST, events 78 to 106
Issues looked at: headless-harness-cel, ndd66a518, install-reason-unreadable, headless-harness-foreign-values, n1c3997b1
Filed: none. Commented on n1c3997b1 (event 106): the label it cannot remove is the needs-owner on ndd66a518, which the loop skips for it although the owner moved it to ready at event 98; issue.label does remove one (event 88), so the fault is the page or the owner-session path.
Edited: a9cc5171 reviewer.md step 4, the test run when a submit has no deploy ref and no seed (all three reviews of headless-harness-cel, events 93, 100, 104, could not do steps 3 and 4 as written). 25f99967 implementer.md step 12, times in the record come from git log, an event or date (event 100: two estimated times cost a rework round; event 104: a third was corrected after the submit).
Seen and not acted on:
- headless-harness-cel was triaged needs-owner as outside tools/cloud-brain (event 82), then fixed by the session under the implementer token at the owner's word (events 87 to 91). An owner override, not a brief defect. The token of the loop took needs-owner off (event 88); SKILL.md says the owner takes it off, and nothing in the policy holds that. One instance, owner-directed; a second would be a `major` task.
- The rework cap: the issue had 2 rework moves (events 94, 101) and was resubmitted by hand (event 103). The cap row of SKILL.md gates the spawn of an implementer only. Round 3 was two sentences of a record.
- The submit ref of round 3 named 91252ecc; the record was corrected in ee096fce 11 s after the submit (event 104). Not given its own line in implementer.md: the correction was a time, which the step 12 edit covers. If a ref is one commit short again for another reason, step 13 gets the line.
- The smoke worker gave cloud-brain 657, 655, 655 of 732 on one commit (event 100) and the session recorded 651 and 653 (event 95). One issue; not filed. A before-and-after count on that notebook needs more than one run each side.
- reviewer.md does not say how to read a workflow's moves (journal, round 1). One mention.
- The reviewer's shell: zsh does not word-split $rt, foreground sleep is blocked, ps is denied (journal, rounds 1 and 2). The harness, not the cluster.
- headless-harness-foreign-values (filed by the reviewer, event 92) is about tools/lope-runtime.js; triage will leave it needs-owner.
- install-reason-unreadable has been at ready since 16:37 (event 86) with no implementer spawned; the session was on the harness issue.
- ndd66a518: the owner's comment (event 97) asks for a feature path of spec, review, approval, decomposition, then build and review of each part. That is a new workflow, a policy install; the issue is at ready with needs-owner still on it.
