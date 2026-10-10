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

## 2026-10-10 18:48 CEST, events 107 to 140
Issues looked at: n1c3997b1, install-reason-unreadable, ndd66a518, panel-shows-no-policy-reason, rebuild-not-atomic, migrate-cut-short, replay-names-no-code-version, owner-session-file-is-present, headless-harness-foreign-values
Filed:
- loop-removes-needs-owner (event 139, task, major): the token of the loop took needs-owner off at events 88 and 107; SKILL.md gives that to the owner and neither rules.md nor the label guard holds it. Proposed Never line in the body.
- lope-tests-throw-reads-timeout (event 140, bug): lope-tests.ts printed a thrown assertion as a timeout in n1c3997b1 (about five build-and-run cycles) and in install-reason-unreadable ("Which assertion threw first was not read").
Edited:
- 63a26be8 reviewer.md, `ir` is defined as a function (three reviews said a variable is not word-split in zsh: events 93, 113, 120).
- eaf8e98c implementer.md step 8, lope-tests.ts prints a thrown assertion as a timeout and how to read the message; the count 10 corrected to 11 (events 112, 118).
Seen and not acted on:
- Both issues passed in round 1 with no rework: n1c3997b1 start to done 18:10:14 to 18:28:53, install-reason-unreadable 18:31:37 to 18:42:18. The second had been at ready since 16:37 (event 86).
- The step 12 edit of the last oversight (25f99967): the implementer of install-reason-unreadable still drafted an estimated time, and corrected it before the submit in a second commit (24680d35). No review round was spent on it.
- issue.get answers reviews [] for a done issue (reviewer of n1c3997b1). By design: brain-issues.ojs issueApply empties reviews on every move, and the reference says "since the issue came into its state". Not a defect.
- eval_code cuts a long return with no error (reviewers of n1c3997b1 and install-reason-unreadable). The channel server, which the rules keep from the loop. The third filing if a third reviewer says it.
- The orchestrating session edited SKILL.md three times in the span (7e61292b the owner's issues first, e94d098f and d5d45504 triage every open issue and beside a running agent). SKILL.md gives edits of the procedure to the overseer. Each quotes its evidence; none drops a check. Not put in loop-removes-needs-owner.
- The orchestrating session wrote and committed a policy proposal for ndd66a518 (event 115, e07a8de1, 22 calls in the test rig). SKILL.md says the orchestrator fixes nothing. One instance, for a decision of the owner.
- The issue install-reason-unreadable and the record of 16:10 said 5 policy events on cb4 have no reason; sync holds 3 (1, 12, 17). The orchestrating session's count, carried into an issue body. One instance.
- The reviewer of install-reason-unreadable: two of the four added assertions pass before and after the fix. Coverage the issue asked for, passed as such.
- redistil prints 19 Worker lines and a header line `distiller …`; the knowledge doc's example says `grep -c same` gave 20 at 11:57. A dated count, one mention each from an implementer and a reviewer.
- Headless (happy-dom) an htl attribute hole cut title="the workflow's label guard refuses" at the apostrophe, and choosing a row's radio did not open the issue (implementer of n1c3997b1); the reviewer saw both work in Chromium. Not isolated.
- seen.json shows `at: 0` after `saw`, by design, and read as a fault to one implementer.
- `git status` shows lopebooks modified from untracked files inside the submodule; grep -c on a sentence that wraps (reviewer of install-reason-unreadable). The checkout, not the cluster.
- Four issues are at triaged with needs-owner and a comment that gives the choice and the cost of each side (events 127, 130, 133, 136); ndd66a518 is at ready with needs-owner (event 138) and waits for a policy install.
