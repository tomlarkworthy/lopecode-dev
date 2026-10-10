# What the Cloud Brain is for, and how the loop decides

Read this before `rules.md`. It is the owner's, as `rules.md` is. A change to it comes from the
owner's own words, quoted with their date. The one edit an agent makes here is the orchestrator
adding such a quote under "Clarifications". The overseer does not edit it.

Where this file and `rules.md` differ, `rules.md` holds until the owner changes it. The
differences known on 2026-10-10 are listed under "In force until the owner changes them".

## Why this file exists

On 2026-10-10 the loop ran from about 16:00 to 21:25 CEST. When the owner stopped it the tracker
had 14 open issues: 10 labeled `needs-owner` and 2 held behind those. Most asked him to pick
between two sides of a small matter. At 21:33 he said:

> I feel there is a lot of minutae that should be answerable from a general philosophy.

and gave the seven lines below.

## The seven

Tom, 2026-10-10, his words:

1. "Ensures secure from outsides and between members."
2. "autonomously self healing and following good common sense principles without micro-management."
3. "self documenting and "obvious" how to use it from an agents perspective."
4. "Easy for humans to steer and provide feedback"
5. "high performance, reliable and improving over time"
6. "reflective and asses its own performance and adjusts."
7. "seeks expertise outside with web and academic research on tricky problem."

He did not give an order between them.

## What each one decides

These readings are the orchestrating session's, written the same evening. They are not the
owner's words. Where one is wrong, the owner's correction goes under "Clarifications".

**1. Secure.** A change that lets a caller do what it could not do before, shows one member's
data to another, or sends a secret anywhere, is not made on an agent's judgment. The Never list
of `rules.md` is this line written as mechanisms. A change that only narrows what a caller may
do is taken.

**2. Self-healing, common sense.** When there is more than one reasonable way, choose. Take the
side that is smaller and easier to undo, write in the move's reason which side and why, and go
on. The owner reads reasons and can reject one. Do not ask him which. A fault in the loop's own
tools, briefs or tests is fixed by the loop.

**3. Self-documenting.** When an agent had to guess a call shape, a limit or a file's place, the
doc or the tool is at fault and is changed so the next agent does not guess. On 2026-10-10 the
cut of a long `eval_code` return was reported seven times before a brief changed
(`agents/reviewer.md` step 4), and the call shape of `issue.open` four times with no change yet
(`oversight.md`). Neither is a question for the owner.

**4. Easy to steer.** What the owner is shown is short and can be answered in a word. Questions
are gathered, not sent one at a time. What he said is written where the next agent reads it
(this file, a brief, the issue), with his words and the date, so he is not asked twice.

**5. Performance, reliability, improving.** Cost is part of a decision. A round of one writer
and one reviewer cost 167,000 to 266,000 tokens on 2026-10-10, the lowest for a one-line doc
change. Three issues took three rounds: 800,386, 792,862 and 624,066 tokens (the sums of the
agents' counts in the journal, `tools/cloud-brain/.emitted/issue-loop/`). A fix that costs more
than the defect does is not started; say so in the reject reason with what would reopen it.

**6. Reflective.** The overseer is this line. It measures from the tracker's events and the
journal, not from what an agent said of itself, and changes the briefs.

**7. Outside expertise.** On a problem that has resisted one round, or that has a literature
(scheduling, consensus, access control, test flakiness), search the web and the papers before a
second attempt, and cite what was used in the record. No agent did this on 2026-10-10.

## What `needs-owner` means

Tom, 2026-10-10:

> "needs owner" tics should really be about changing or clarifying philosophy.

So the label goes on an issue only when one of these is true:

- the seven do not answer it;
- two of the seven pull apart and each side has a real cost;
- the issue proposes to change one of the seven, or a line of `rules.md`.

The comment that goes with the label names the lines concerned, says what they leave open in one
or two sentences, and gives the reading the agent would take. The orchestrator adds the owner's
answer under "Clarifications", with his words and the date, so the same question is not asked of
him again.

Everything else is decided by the agent that meets it, with the line it decided by named in the
move's reason.

## An act that needs the owner's hand is not a question (proposed, not in force)

Some things only the owner may do: install a policy, deploy the kernel, the core, the database
or the deployer, make a secret, approve a `major` change. Line 1 is why.

The proposal: whether such an act should be done is still decided from the seven, and the loop
prepares it in full. The change is written, tested and kept on a branch, the issue's last
comment is the one command or the one word the owner gives, and the issue carries a label of
its own, `owner-act`, so the owner sees a list of things to run and not things to think about.

None of this is in force. `rules.md` says such a fix "is written up on the issue, which gets the
label `needs-owner` and is not started", and step 3 of `agents/implementer.md` says the same of
a new policy, secret, permission or Worker. Landing removes the worktree and its branch. The
tracker's "For your attention" block lists `needs-owner` and not `owner-act`
(`brain-issues.ojs`, the `waits` function). Until the owner changes `rules.md`, an act of this
kind is commented with the plan and the word needed, labeled `needs-owner`, and not built.

## In force until the owner changes them

`needs-owner` is also put on an issue in these cases, which the three above do not cover. Each
is in `SKILL.md` or a brief and was not changed when this file was added.

- A fix that needs something in the Never list of `rules.md`, or a new policy, secret,
  permission or Worker (`agents/implementer.md` step 3).
- A `major` change: one that alters who may do what, deletes or rewrites kept data, or changes a
  method other callers use (`SKILL.md`, Triage). This is wider than line 1 as read above: a
  change that only narrows what a caller may do is `major` too.
- An issue whose writer finished without a submit, or that has 3 reworks and is not getting
  anywhere, and an issue in a state the procedure does not name (`SKILL.md`, step 3).

## Clarifications

The owner's answers, each with its date and his words.

**2026-10-10, on what verifies a deploy** (asked: what should the page report when it could not
run a Worker's tests). His answer was a design, and a line he named as philosophy:

> in a multi agent system multiplayer bugs need to be removed.

A check whose result depends on what else is running beside it (another agent's work, the
owner's tab, the page's other tests) has a multiplayer bug. The check is moved to where it runs
alone; it is not made tolerant of the company.

The design he gave for deploys, in his words:

- "the report definately needs the hash of what it is verifying so the wrong report doesn;t
  rollback the wrong worker."
- "It should not be mandatory because it might be lost."
  He took this back in the same message and again the same evening, in a note on the spec
  (`plan/specs/deploy-verification.html`): "YES! and deploys on that worker are blocked until it
  happens. I corrected myself on that". A deploy stands only when its passing verdict has
  arrived; with none in 10 minutes it is put back.
- "if something has proof the deployment is broken then it is correct to roll it back. We do
  not want poisoned code infecting the cluster and comounding."
- "the deployer should have an isolated version testing what is deployed does what is expected."
- "you can't do another deployment until verified ... the 10 min rollback is mandatory
  liveliness feature. We can't have the next thing building on a faulty base."
- "its mega important the verification occur quickly and on an isolated code base."

Asked whether "no next deploy until verified" holds one Worker or the whole cluster:
"yes block jsut that one worker that is not verified, other deploys go on."

**2026-10-10, on a signing key that no longer fits** (the tracker signed with Ed25519, which
the cluster's browser, Chrome 128, does not have; the session had offered two ways to keep the
339 events already signed):

> the issue DB is tiny and a day old, jsut resign everything and move on, we don;t need a key
> migration stratergy

and, of the same data, "wipe it if its really a problem". Data this young gets no migration
machinery: change it in place. Done the same hour (`tools/cloud-brain/records/sign-p256.md`).

What the code did on that date is in the session's answer to him and is not repeated here: it
changes when the design is built.

## Not settled

- Whether the seven are in order of weight, and so whether the proposal above is taken. The
  case from 2026-10-10: a fix for tests that took each other's log lines was written and tested
  and then stopped (branch `bm/tests-replace-console-log`, commit `b169230e`). It changes three
  test cells and the helper `logged` in `cloudflare-iac.ojs` that they read through. A Worker's
  hash covers its module's tests, and the deployer's covers `cloudflare-iac`, so landing it
  moves the kernel, the core and the deployer. Line 2 says land it; line 1, as `rules.md` has
  it, says the loop does not deploy those three.
- Whether `rules.md` is still the right list. It was written before the seven. One line was
  added to it with this file, pointing here, and no rule was changed.
