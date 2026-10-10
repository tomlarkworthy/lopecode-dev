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

## 2026-10-10 19:13 CEST, events 141 to 163
Issues looked at: rebuild-not-atomic, panel-shows-no-policy-reason, rebuild-partial-view-past-297, lope-tests-throw-reads-timeout, loop-removes-needs-owner, owner-session-file-is-present, migrate-cut-short, headless-harness-foreign-values, n39625a1a
Filed:
- spec-not-done-rebuild-line-stale (event 167, task): spec-as-built.md line 3808, a Not done line, still says a write between two batches of issue.rebuild is not in the view; rebuild-not-atomic fixed that. Its implementer and its reviewer both reported the line and neither changed it. The body says "still there at 19:2x CEST"; the clock read 19:13 after the filing, so that time is wrong.
- Commented on lope-tests-throw-reads-timeout (event 168): the tool prints no return value and has no --json, so the try/catch advice of eaf8e98c works only with console.log and --verbose (rebuild-not-atomic); a third implementer submitted a before-the-fix timeout with the message unread (event 156).
- Commented on loop-removes-needs-owner (event 169), for the owner: three issues are at ready with needs-owner on them (ndd66a518, and events 148 and 151, the owner's own ready moves), so the loop starts none of them. Three choices with the cost of each.
Edited:
- d9657980 implementer.md step 11: when the check on cb4 needs the owner, send no call and write "not run on cb4" (rebuild-not-atomic, event 153: the implementer sent issue.rebuild with its token, 403, nothing written, and said step 11 gave no other path).
- 1ab87cf5 reviewer.md step 3: a later hash on cb4 before its lopebooks commit lands; wait for land.lock, then compare with HEAD (rebuild-not-atomic, event 159: 59 lines of difference, 51 of them the other writer's).
Seen and not acted on:
- Events 164 to 166 arrived during this oversight and were not looked at: the review of panel-shows-no-policy-reason (changes, rework at event 165) and n9e1c1256 opened. The next oversight starts from 163.
- rebuild-not-atomic: start to done 18:54:21 to 19:09:19, pass in round 1. The rule broken at event 153 was self-reported on the issue and in the record, and the reviewer passed it with the call named. No write happened.
- The step 8 text of the last oversight (eaf8e98c) is incomplete: "put a try/catch round the test body" does not say the message must go to console.log and the run be --verbose. The edit budget went to the two above; this is the first edit of the next oversight if lope-tests.ts is not fixed by then.
- implementer.md step 12 asks for a dated section only. Step 5 of the knowledge doc's change routine asks for the backlog as well, and step 6 for /review-notebook on what changed. Neither was done in rebuild-not-atomic (event 153: "/review-notebook was not run on it") or said to be done in panel-shows-no-policy-reason. Adding them is a spawn of a subagent an issue and a second file in every landing; not added without a second round of evidence that the reviewer's step 6 misses what they would catch. The stale line filed above is one instance.
- getSource part=reference serves the md cell uninterpolated, `${issuesLimits…}` shown raw (implementer of rebuild-not-atomic). One mention, not checked by me: the check is an owner-session read behind the knowledge-doc hook. File on a second mention.
- Two back-to-back redistil calls disagreed for the implementer of panel-shows-no-policy-reason (1 line not same, then 3: the header and `none` for brain-x-static and brain-x-whatsapp). The other writer deployed in that window (dc156a413135 at 18:5x, 23d1f2d0b140 after), which explains a changed hash and not the two `none` lines. Not looked into by anyone.
- In a worktree `git diff HEAD~1 --stat` lists lopebooks and lopecode as changed (they are links there). The brief already says git status fails there; one mention.
- Grepping an emit for `s_test_` matches `_brainissues_test_` 72 times (implementer of rebuild-not-atomic). reviewer.md does not name that grep; the reviewer's own check ("No side.variable or s_test_ in the deployed text") passed.
- The worktree and land.lock procedure (f0ae78d4) worked on its first use: panel-shows-no-policy-reason waited on the lock in the background, cherry-picked with no conflict, 13 of 13 on the main checkout.
- The orchestrating session edited the briefs twice more: f0ae78d4 (two writers, worktrees; SKILL.md and both briefs, at the owner's word) and 42949045 (reviewer.md, the notebook copy named for its issue, after two reviewers wrote one file). Five edits of the overseer's files by the orchestrator today. Each quotes its evidence and none drops a check.
- The owner rejected migrate-cut-short (event 147) and headless-harness-foreign-values (event 149), both for want of a real case, and filed n39625a1a (event 155): needs-owner issues are hard to find and to answer in the panel. Two of the six needs-owner comments of the 18:43 triage were answered by a reject; the triage rule that produced them (e94d098f) files a choice for every design question read from code.

## 2026-10-10 19:46 CEST, events 164 to 210
Issues looked at: panel-shows-no-policy-reason, owner-session-file-is-present, lope-tests-throw-reads-timeout, page-not-redeployed, spec-not-done-rebuild-line-stale, panel-for-your-attention, n39625a1a, n9e1c1256, rebuild-partial-view-past-297, replay-names-no-code-version, loop-removes-needs-owner
Filed:
- eval-code-cuts-long-return (event 216, bug, about brain): eval_code cut a long return with no error for four reviewers (n1c3997b1, install-reason-unreadable, panel-shows-no-policy-reason rounds 1 and 2); the review at event 164 could not report two probes. Not reproduced by me, the limit not measured. The channel server is the owner's.
- Commented on lope-tests-throw-reads-timeout (event 213): my comment at event 168 said the tool "has no --json"; `--report <path>` already writes CTRF with messages (its implementer, journal 19:32). Taken from one report and not checked.
- Commented on rebuild-partial-view-past-297 (event 214): the owner asked at event 186 what rebuild does and why it is needed; the next event is the reject at 190, with no answer. The reference's own sentences are quoted; the question stands.
- Commented on loop-removes-needs-owner (event 215), for the owner: the loop started two issues with needs-owner still on them (events 183, 189) and filed page-not-redeployed (event 180) on a premise its implementer did not reproduce (event 207). needs-owner no longer means the loop will not start an issue, and SKILL.md still says it does.
Edited:
- c32e3bc8 implementer.md, `ia` is defined as a function and its arguments quoted (panel-shows-no-policy-reason round 2: "implementer.md still gives ia as a shell variable"; owner-session-file-is-present, event 206: a zsh glob error sent an empty GET to issue.comment, 405, and the comment landed after the submit).
- ef5fc361 implementer.md step 6, a fix in a local tool gets a test under tests/ and that count is the one submitted (owner-session-file-is-present: reviews at events 195 and 209 both sent it back for the argument handling of brain.ts, which has no test; "none added" in both rounds).
Seen and not acted on:
- Events 211 to 216 arrived during this oversight: the review of lope-tests-throw-reads-timeout (changes, rework at event 212: runTests reads a test cell defined twice as a timeout, where before bfd9ae46 it read failed), and my own four writes. The next oversight starts from 210.
- implementer.md step 8 still says lope-tests.ts prints a thrown assertion as a timeout, and gives 11 of 11 where the count is 13. The fix (bfd9ae46) is on main and was sent back at event 212. The first edit of the next oversight once it passes.
- spec-not-done-rebuild-line-stale, which I filed, cost 94106 and 72754 tokens for a mark of six lines and a dated section (journal). A stale line of a record goes as a comment on the issue that made it stale next time, not as an issue of its own.
- page-not-redeployed cost 152492 tokens and was not reproduced (event 207). The premise was a triage guess from a reviewer's remark (journal: "one read of infra.getModules would have settled it"). SKILL.md triage does not ask for the read that would show a deploy is missing before an issue says so. One instance, the orchestrator's own note; an edit to SKILL.md on a second.
- Its implementer asks for a line in implementer.md: a change to issuesPanel deploys with brain-x-issues alone, and a tab opened before the deploy keeps its old panel until it is loaded again (event 207). The issue is at in-review; the note is unreviewed. The stale tab is also a likely defect of the page (nothing says a newer panel is deployed), not filed: "Why the labels stayed is not known".
- The rework cap: owner-session-file-is-present has two rework moves (events 196, 210) and a third round was spawned (journal 19:40, "ORCHESTRATOR DECISION ... Not applied here"), citing the owner on the loop needing much approval. The second time the cap was passed today (headless-harness-cel, event 103). Each fix was one condition a reviewer named. SKILL.md's cap row is not followed and is not changed; a third is a `major` task.
- All three findings on owner-session-file-is-present were in the argument handling of `curl --as`, one found a round. Review 2's finding (inherited names such as `__proto__` read as kept tokens) was in the line round 2 rewrote.
- The worktree has no `.emitted` state and no `.cf-token`, so brain.ts cannot run there; both rounds of owner-session-file-is-present copied the file into the main checkout to run it. The brief says tools that read the cluster run from the main checkout and has no line for a change to brain.ts itself. One issue.
- In the worktree `node --test tests/notebooks` reads 8 failures against 2 on main, because untracked files are absent there (implementer of lope-tests-throw-reads-timeout). One mention.
- reviewer.md step 4 has no line for returning compact strings from eval_code (reviewer of panel-shows-no-policy-reason, round 2). Named in eval-code-cuts-long-return; the next edit of reviewer.md.
- A reviewer called `sync?since=16` and was answered from seq 1 (journal, panel-shows-no-policy-reason round 1); the parameter is `after`. reviewer.md does not name sync. One mention.
- `brain.ts page down` leaves the browser in browser.all until its paid time ends (implementer of page-not-redeployed), so the Always line "browser.all and container.all show nothing you started" could not be met. One mention; a `major` task on a second.
- panel-shows-no-policy-reason: start to done 18:57 to 19:19:58, one rework. Left as known: an owner-installed event 1 with no reason still reads "the default" (implementer round 2).
- The whole-notebook count of lope-tests.ts changed with bfd9ae46 from 791 printed to 735 (28 cells were printed more than once before); the 24 failing and 8 timing-out cells were not looked at by anyone.
- The owner stopped three agents by mistake at 19:35 (journal: "I did not mean to stop the agent. Continue."); each was respawned with no report from the stopped one. The writer of panel-for-your-attention left an uncommitted diff (+164 -20) in its worktree for the respawn.
- The orchestrating session edited the briefs five more times in the span (4b701ac1, e92a3157, e2dca47d, 0fbaa72a, 05fce5a3), each at the owner's word or after a fresh review. 4b701ac1 changed triage to reject a defect nobody has met; events 190 and 191 are its first use.
- issue.list holds an issue `test-escalated` with no title, no about and labels null.
- n9e1c1256 (the owner, attachments) is at triaged with major and needs-owner and a plan in a comment (event 176); n39625a1a's second half (an agent in the page) waits for the policy of ndd66a518.
