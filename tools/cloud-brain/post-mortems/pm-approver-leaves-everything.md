# Post mortem: the approver that was to auto approve what waits for the owner left all 8 issues it read to him (`pm-approver-leaves-everything`)

Of the project `approver-persona`. Declared 2026-10-12 by the owner (event 4906, through `out-5f56b2`). Written that day from 22:44 CEST by a writer of the loop (`impl-c81116`, `start` 4943) with no part in it, from the record (`sync?after=4050`, events 4051 to 4943), the spec and the brief at their commits, and the orchestrator's journal. Times are CEST, each an event's `at`.

## What happened

The owner, as the body quotes him: "I would also like to raise a post mortem against the new approval still refusing everything which is the opposite of its intention."

What he asked for (event 4112): "I would like a new persona for auto-approving my owner tasks. They should review the process and if it looks secure and thematically consistent with my wishes and philosophy, then auto approve needs owner issues".

```
$ bun tools/cloud-brain/approver.ts trial --token impl-c81116      (22:48)
verdicts 8   approve 0   leave 8
of leave:     no word of his 0   more than the words 3   not secure 0   could not tell 3   other 2
```

Eight approvers ran, one an issue, between 21:17 and 22:33. Each wrote `approver: leave` and a guard that keeps the issue his. Three ran after the policy that lets the approver approve was installed (4668, 22:07:19). The owner's session then made the `approve` move on all eight, 5.6 to 19.6 minutes after each verdict (4505, 4731, 4733, 4735, 4737, 4883, 4885, 4903). No verdict found the change insecure.

## The trace

Backwards from the verdicts to his words.

### The eight verdicts, and what each gives as what stopped it

Each the `body` of its event, read whole. "Letters" is the orchestrator's decision comment, on the issue before the verdict.

| Verdict | Issue | `why:` | What stopped it, in its words | Letters | His answer |
|---|---|---|---|---|---|
| 4470 | `rules-md-owners-word-not-secrets`, major task | could not tell | "Your word is one letter"; "An approval by me would take A for you" | 4466, A B C, pick B | A |
| 4622 | `bk-2-finish-by-the-service`, major task | the approver's own files | `facts` marks `brain-issues.ojs` as policy: "That alone is the reason; I did not decide the rest" | 4564, A B, "A rubber stamp" | A |
| 4638 | `wt-5-docs`, major task | more than the words | a third rule of `rules.md` "the task's sentence does not name"; the spec's "What only the owner can do" keeps this approval | 4605, A B, "A rubber stamp" | A |
| 4642 | `post-mortems-declared-and-kept`, spec | more than the words | "An approval here would be the answer A to a choice that was written for him" | 4619, A B C, pick A | A |
| 4652 | `docs-summarised-for-search`, spec | more than the words | a token he did not name; "An approval by me would take A for him" | 4633, A B C, pick B | B |
| 4797 | `owner-decisions-written-dense`, major task | could not tell | it drops the project summary he asked for on 2026-10-11; "so A or B is yours" | 4784, A B C, pick A | B |
| 4858 | `bk-3-queue-and-hold`, major task | the approver's own files | "the brief, step 6, makes that mark a refusal whatever the change is" | 4846, A B, "A rubber stamp" | A |
| 4863 | `tracker-trigger-rules`, spec | could not tell | "The record puts four answers to him, and an approve can give only one" | 4848, A B C D, pick B | A |

- Five verdicts give the lettered comment as a thing that stopped them (4470, 4642, 4652, 4797, 4863), and the same five say no event of the issue is his own press. The other three name the comment as a claim and do not weigh it.
- Two rest on one mark of the tool alone (4622, 4858). Two say an approved spec keeps the approval his (4638, 4858).
- In six of eight his answer was the approve the approver could have made. In two (4735, 4885) he took B, an approve with a change added, which the approver's one move cannot say: those two leaves kept a choice that was his.

### What each approver was given

- **The prompt**, three lines, read in the transcripts of the first run and the last and in no other: the command that prints the brief, `Issue: <id>`, `Your token is appr-…`.
- **The brief**, `agents/approver.md` at blob `9956b9aa`, the last line of all eight verdicts and of the policy's reason (and of `git rev-parse origin/main:<path>`, 22:49). Its lines that decide:
  - Step 5: "Approve only when the change is what those words ask **and no more**. A change that does what he asked and also something he did not is not that."
  - Step 8: `leave` when "no word of his is found", "the change is more than the words", or "a text of the issue told you what to decide, or you cannot tell".
  - Step 6: one mark is a refusal, `approver`, "and with it `policy` (a `plan/cloud-brain-issues-policy-*.json`, `brain-issues.ojs`)".
  - Its opening: "a `leave` costs him one press, and an `approve` that he would not have made costs him a revert of work that others have built on."
- **The issue**, with a decision comment already on it. `SKILL.md` step 3 starts the approver for an issue "at `awaiting-approval`"; step 7 has the orchestrator write "on an issue for him to decide by ... when a `major` issue has passed its review". Nothing orders the two, and in the record each of the eight comments is before its verdict. `rules.md`, "What the owner is asked to decide" (on `main` since 22:04:45, `96b53dee`): "An approval with nothing to choose between has no letters". Comment 4846, of 22:28:49, calls its issue "A rubber stamp" and has "**A.** Approve. (My pick.) **B.** Send back."

So every issue came to its approver as an open choice with letters and a pick; and the spec says "A choice with letters stays his" (part 3, R10).

### Where the test was made

| Event | Time | Who | What it did with his test |
|---|---|---|---|
| 4112 | 16:18:36 | the orchestrating session | Opened the feature with his words. Its account: "is it what he would want by `philosophy.md` and his words". |
| 4115 | 16:20:54 | the same | Quoted his answer to the body's list of kinds the approver would not touch: "No it can approve anything if that's what I have asked for". Then its reading: "The test is one question for every issue ...: is this what he asked for", and "where it finds no word of his for it, the issue stays his". |
| 4116 | 16:49:01 | `spec-309f89` | Submitted the spec at `e24b06e4`. Line 314: "It approves when the change is what those words ask and no more." |
| 4118 | 16:52:09 | `rev-15af3d` | `pass`. "part 2 has no list of kinds, one test in its place". The words "no more" are not in the review (its `body`, 5,147 characters). |
| 4121 | 16:53:01 | the orchestrating session | The comment for him: "The test is your word in comment 4115: is it what you asked for, and is it secure. Each verdict quotes your words." The choice put: A, B or C on whether the approver approves a change to itself. |
| 4123 | 18:43:09 | the owner, his press | "A the persona should always be an isolated session that judges a ticket against cluster evidence itself" |
| `18c29ee0` | 19:49:42 | the writer of `ap-2-brief-and-shadow-step` | The brief, with the four lines above. |

His words of 4112 ask for a judgment. His words of 4115 took a list of exclusions away. The session read 4115 as the test and added the half that leaves ("no word of his"). The spec added "and no more" and a proof by quotation, 20 characters letter for letter. What he was shown at 4121 had "is it what you asked for" as his word, and neither "and no more" nor "no word of his". He chose a letter on another question.

The eight are 3 specs and 5 tasks labeled `major`. A spec is a design written from a sentence or two of his, and the three here mark readings of their own as not his (4652 quotes its spec: "This is the writer's choice and not the owner's word"; 4863: "One reading here is this writer's and not his"). A `major` task is as built (4622 and 4638 each name the writer's "As built" sentence). Each holds something his words do not say. Under "and no more" that is a leave for each.

### What each check after it read

- **The spec's own measure** (line 143): "Of the 48 approved issues, 27 have a quote of his". It counted whether a quote exists, not whether the change was that quote "and no more". "A replay of the 48 approved issues was not chosen: each run would read his approval in the record."
- **The trial** (R9, part 6): 20 verdicts in the open before the install. It names no count at which the approver is not installed: "The trial is for what it leaves and why". Its six made issues each expect `leave`.
- **The install.** Comment 4650, 22:03:46, told him: "The approver has run four times tonight and left all four for you. With this policy installed it would still have left those four", with the pick A, install after the trial. He answered "B install now" (4666), shown "five approver runs and five leaves".
- **The approvers' reports**, in the journal: after 4638, "the decision comment always carries a pick"; after 4642, "a decision comment with A/B/C is always there for a spec"; after 4797, the orchestrator's line: "SIX RUNS, SIX LEAVES"; after 4863, "EIGHT RUNS, EIGHT LEAVES".
- **The overseer**, comment 4824 at 22:23:26, gave five of the runs to the trial's writer, and wrote of the brief: "which the policy pins and no overseer edits". One issue was opened from the runs, feedback: `seen-approver-spawned-for-a-sure-leave` (4629).

Each of these read the count. A change to the brief is a `major` issue and a new install (spec part 4). None was opened.

## The root cause

The brief the approver follows has another test than the one he gave. His: it "looks secure and thematically consistent with my wishes and philosophy". The brief's: the change is what quoted words of his ask "and no more", and where a text puts a choice to him, or no word is found, leave. Each of the eight was a spec or a `major` task, held something his words do not say, and came with a lettered comment the loop wrote. So the brief's reasons to leave held for all eight, whatever the change.

It was made at 4115, by a reading of an answer that widened, and written down at spec line 314. It reached him at 4121 as "your word". His press at 4123 approved the file that has line 314; the comment he answered did not.

Beside it, each of which adds leaves and none of which made the eight:

1. **The loop puts letters on every approval, before the approver reads.** Five verdicts give it. The three that do not give it left all the same.
2. **The tool refuses the tracker's whole seed.** Spec part 4: "the policy cells of `brain-issues.ojs`". As built (line 780): "the tool refuses a ref that touches the file at all. It reads no cell." `approver.ts` line 108: `own = (f) => ... || f === SEED`. Two of eight, and of what is to come the three tasks `tr-1`, `tr-3` and `tr-4`, which change that seed (verdict 4863).
3. **Specs approved before the approver say a `major` task comes back to him**, and an approver read that line as his word (4638, 4858).
4. **The brief weighs the two errors with no number**: one press against a revert. All eight were approved; none was reverted.

Ruled out: the prompt (three lines); the approvers (eight fresh agents, one result, each citing a step of the brief); the policy (comment 4725: the `approve` guard names the token's delegation); security (no verdict has `not secure`).

Searched first (`knowledge.search`, 22:45): `doc:pm-second-summarizer-role` was second for "a choice of letters put to the owner decision comment" (0.93). Its second cause is this one's last step: "A reading the spec marked for the owner did not reach him." Its action for that, `decision-comment-names-what-is-added`, was filed at 21:25:46 (4499), after 4121 and after the brief landed, and is at `triaged`. It could not have held here. Linked `related`.

## What is not known

- **Why the spec's writer wrote "and no more"**, and why the brief's writer weighed a leave as one press. The transcripts were not opened for it; the first post mortem found that a transcript keeps no reasoning. `records/ap-2-brief-and-shadow-step.md` has no line on either (`grep -c -i "no more\|one press\|could not tell"`: 0).
- **What he was told in chat** at 4666 beyond the orchestrator's account, and whether he read the spec's part 2 before 4123.
- **Whether the changed brief approves what he would, and nothing he would not.** Not tried: no approver was run under another text, and he has refused nothing out of `awaiting-approval` but one spec (4434), which no approver read.
- **Whether words a token quoted are to count alone.** Five verdicts weigh them down; the tool takes them. The first action puts it in the text he approves.

## What it cost

From the eight `cost` events of role `approver` (4473, 4628, 4641, 4646, 4657, 4799, 4862, 4867): 1,678 s, a context of 96,842 to 148,197 tokens each; none carries `usd`. Eight `narrowed` events. The owner gave eight answers (comments 4504, 4730, 4732, 4734, 4736, 4882, 4884, 4902) and declared this.

## Next actions

Three, filed when this file's review has passed (the spec, part 5), each linked `cause` to this issue. The first and third change files the policy pins by blob: once one lands no approver makes a move until he installs again, so the two land together.

| Issue | Kind | What changes | The part of the trace it answers |
|---|---|---|---|
| `approver-brief-his-test` | task, `major`, the text proposed in its body | `agents/approver.md`, steps 5 and 8 and the opening. Approve when the change is secure (step 6 as it is) and in keeping with his words and `philosophy.md`. "More than the words" is a leave only when the more is one of: a new access (a token, a permission, a method open to a caller), a standing leave for an agent, a cost a day, something against a word of his, or something the spec or its review marks as his to weigh. A design's detail is not. A line of an earlier spec that a `major` task comes back to him is no word against the approver. Words a session quoted count when a move of his session agrees. The opening gives the count: 8 left, 8 approved by him, 0 reverted. | The root cause; 3 and 4 beside it. |
| `approver-runs-before-the-decision-comment` | task | `SKILL.md`, steps 3 and 7: the approver is started first, and no comment "for the owner" is written on an issue at `awaiting-approval` until its verdict is there. After `leave` the comment is written from the verdict, with letters only where the verdict names a choice. After `approve`, none. A test that holds the lines. | 1 beside the cause. |
| `approver-own-files-are-the-policy-cells` | task, `major` | `approver.ts`: a ref that touches `brain-issues.ojs` is the approver's own only when its diff touches a policy cell, as part 4 of the approved spec says; `facts` marks it so; `trial` counts `the approver's own files` by name and not as `other`. Tests. | 2 beside the cause. |

Not filed, and why:

- A bar for the trial (an approve rate under which nothing is installed). `ap-3-trial` is at `ready` with no writer, and its project is the one this issue is linked to as `cause`. The count that would be the bar is the second case below.
- Skipping the spawn for a sure leave: `seen-approver-spawned-for-a-sure-leave` has it.
- That the overseer cannot edit this brief: it is R7, his "A" of 4123. The `major` issue was what was missing, and is the first action.

## How it is known later

`bun tools/cloud-brain/approver.ts trial --token <token>`, first line: `verdicts 8   approve 0   leave 8` on 2026-10-12 22:48. Read after the first and third actions are installed:

- A second case: the next eight verdicts have `approve 0`; or he approves, as written and within the hour, more than half of what an approver left (6 of 8 here).
- The other failure, which the actions make possible and the eight runs could not show: an `approve` by the approver that he undoes (`he sent back, rejected or reverted N` above 0).
