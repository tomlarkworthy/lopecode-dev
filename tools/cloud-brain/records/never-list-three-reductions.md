# never-list-three-reductions

Written 2026-10-13 by the writer of the issue (token `impl-76e378`). One line of the Never list of
`.claude/skills/brain-maintenance/rules.md` is reduced: a fix that needs the kernel, the core, the
database or the deployer is written, tested and reviewed with no word of the owner, and its
deploy alone waits for him. Four docs and two test files. No seed, no build, no deploy, nothing
emitted. Times are CEST, read from `date`.

The issue's title names three reductions. The orchestrating session's triage (comment 6060) gave
this task the first alone and opened a task for each of the others:
`never-core-and-db-deployed-by-the-loop` and `never-page-up-line-after-a-check`. Their two lines of
Never are as they were, and the test holds that.

## What it rests on

The issue's body, written by a session the owner was present in (`out-5f56b2`), quotes three
messages of his. The third: "ok please a file a ticket to reduce those suggested". The body says
that "those suggested" is that session's reading: the three of a list it had shown him under
"Safe to reduce". The sentence of the first is that session's, as he was shown it: "The loop
writes, tests and reviews such a change without his word, and the deploy alone waits for him."

A script over the body (`issue-as.sh impl-76e378 "get?id=never-list-three-reductions" --short`,
2026-10-13 08:41:53) and over `rules.md` with its whitespace flattened printed, for those two
strings and for "Safe to reduce":

```
ok please a file a ticket to reduce thos in body: True in rules.md: True
The loop writes, tests and reviews such  in body: True in rules.md: True
Safe to reduce in body: True in rules.md: True
```

His words are not in an event of his own. The issue is labeled `major`, so the approval after
review is where he, or the approver on his quoted words, says whether the text is what he meant.
The change is on `main` before that approval, as any `major` change is at its submit.

## What changed

`rules.md`:

- Never, the line of the four. Its first sentence, "Deploy the kernel (`brain`), `brain-core`,
  `brain-db` or the deployer.", and its last, on a session with the owner present, are as they
  were. Between them it read "A fix that needs one of them is written up on the issue, which gets
  the label `needs-owner` and is not started." It now says that such a fix is written, tested and
  reviewed with no word of his; that its seed is landed on `main` with no deploy and nothing of it
  is emitted, applied or probed on cb4; what the writer's comment and the reason of its submit
  begin with; and what is still asked of him before a start (a new policy, secret, permission or
  Worker, and the plan of a `major` change). The old sentence is quoted there with its date, then
  his third message and whose words the sentence of the rule is.
- "What an issue is": two sentences after "is commented on and left for the owner". Of an issue
  whose fix is in one of those seeds the deploy is what is left for him, the fix being written
  and reviewed first; anything else of the list it asks for is left for him as before.

`SKILL.md`, Triage, question 2: "a deploy of the kernel, core, database or deployer" is taken out
of the list of what puts `needs-owner` on an issue at triage, with the sentence that said the
proposal of `philosophy.md` "is not in force". A new item after it: such a fix goes to `ready`, its
writer lands the seed with no deploy, the deploy is still his, and a fix there that alters who may
do what is `major` and waits under `needs-owner` with its plan, as the paragraph after the three
questions has had it.

`agents/implementer.md`, step 3: the first stop no longer counts a change to one of the five seeds
(`brain-kernel.ojs`, `brain-core.ojs`, `brain-db.ojs`, `brain-deployer.ojs`, `cloudflare-iac.ojs`),
and the last line sends a writer to the page `start` before such a landing. The file is 19,961
characters after the edit and was 19,996 (`python3 -c "print(len(open(...).read()))"`, run after
the edit and on `git show HEAD:` of the file); its test holds it under 20,000.

`agents/implementer/start.md`, step 3: the same stop, and the paragraph on a seed whose deploy is
the owner's. It said such an issue is started when it "comes back with the owner's answer" or is a
task of an approved spec. It now says it is started as any issue is, names the five seeds, and
says what the writer does at the landing: `land.sh` with `--seed-lands-undeployed`, steps 7 and 8
on the build of the worktree, nothing emitted, applied or probed on cb4, the first line of the
comment and the reason, and what the comment tells the owner. The flag and the refusal without it
are in `tools/cloud-brain/land.sh` (lines 58 and 82, read 2026-10-13) and were not changed.

**What a writer does at the landing**, as the page now has it and as `core-getinfo-line-says-access`
did on 2026-10-13 by its record (`tools/cloud-brain/records/core-getinfo-line-says-access.md`,
read after the rebase that brought it): the build and the tests run in the worktree; "nothing was
emitted or applied, and `seen.json` is not changed"; the record has a section "For the owner: the
deploy" with the commands he runs and the line "When another change to `brain-core.ojs` lands
before the deploy, the deploy carries that change too". The page names that record and says
`seen.json` is not changed. That its landing was made with `--seed-lands-undeployed` was not read
in it: `grep -c seed-lands-undeployed` of that record prints 0.

`tests/tools/never-list-three-reductions.test.ts`, new, 10 tests.
`tests/tools/rules-md-acts-on-the-owners-word.test.ts`: one line held the old sentence's end with
the one after it, "and is not started. A session with the owner present deploys one on his word".
It now holds the second sentence alone.

## What in the text is mine and not his

- **How such a seed is landed.** He was shown "Nothing reaches cb4 until he presses it". That the
  seed goes on `main` undeployed, and not on a branch that waits, is how three writers landed on
  2026-10-12 with his answer or an approved spec (`token-revoke-no-name-ends-links`,
  `ds-1-rows-add-within`, `ds-2-core-spends-by-row`) and one on 2026-10-13
  (`deployer-binds-no-method-list`, whose record begins "cb4 does not run the change"). The
  proposal of `philosophy.md`, "An act that needs the owner's hand is not a question", keeps the
  change on a branch and gives the issue a label `owner-act`. That was not taken: a worktree's
  branch is local and is not pushed (`rules.md`, Always), and the tracker has no such label in its
  block. The cost of `main`: the owner's next deploy of that Worker carries every fix landed since
  his last, and `main` is ahead of cb4 for that Worker until then.
- **What is still asked before a start.** The sentence "What such a fix needs beside the deploy is
  asked as before" is mine. It is there so that the reduction is not read as wider than he was
  shown: the plan of a `major` change still waits under `needs-owner` (`SKILL.md`, Triage), and the
  third stop of the writer's step 3 stands.
- **`cloudflare-iac.ojs` and the test cells.** The body names four Workers. The brief already
  counted `cloudflare-iac.ojs` (the deployer's hash covers it) and a `test_*` cell of the five
  seeds as a deploy of one of the four, so those are now started too.

## Tests

- `bun test --timeout=30000 ./tests/tools/never-list-three-reductions.test.ts`: 10 pass, 0 fail.
  Before the edit of the four docs, with the test file written: 2 pass, 8 fail (the two that passed
  read the test's own helpers and `land.sh`).
- `bun test --timeout=30000 ./tests/tools/never-list-three-reductions.test.ts ./tests/tools/rules-md-acts-on-the-owners-word.test.ts ./tests/tools/implementer-brief-core.test.ts`:
  25 pass, 0 fail.
- The whole suite, `tests/tools/suite.sh`, after the rebase and after the last edit of a file a
  test reads (ended 08:51:56; this record was edited after it): `1106 pass`, `0 fail`,
  `Ran 1106 tests across 113 files`. `grep -c '^skipped:'` of its output: 0.

## For the overseer

Lines the change made untrue in files that are not a writer's. They were found with
`git grep -n -F '<words>' -- knowledge 'plan/cloud-brain-*.md' .claude/skills/brain-maintenance 'tools/cloud-brain/*.md' ':!tools/cloud-brain/records/never-list-three-reductions.md'`,
run after the rebase with this record left out, for "is not started", "may not deploy", "not in
force", "answer to land", "deploy of the kernel", "seed-lands-undeployed", "needs something in the
Never" and "Never list": 10, 4, 3, 2, 8, 3, 2 and 21 lines.
`philosophy.md` is not among what that search prints (it is a link to `cloud-brain-dev/philosophy.md`, by `ls -l`); its lines were found with `grep -n` of the file.

- `philosophy.md`, "An act that needs the owner's hand is not a question (proposed, not in
  force)", its last paragraph: "None of this is in force. `rules.md` says such a fix \"is written
  up on the issue, which gets the label `needs-owner` and is not started\" … Until the owner changes
  `rules.md`, an act of this kind is commented with the plan and the word needed, labeled
  `needs-owner`, and not built." For a deploy of one of the four the change is now built and
  landed; the branch and the label `owner-act` of the proposal are still not in force, and neither
  is the rest of its list (a policy install, a secret, a `major` approval). The file is his; it is
  `cloud-brain-dev/philosophy.md`, read through the link.
- `philosophy.md`, "In force until the owner changes them", the first item: "A fix that needs
  something in the Never list of `rules.md`, or a new policy, secret, permission or Worker
  (`agents/implementer.md` step 3)". Still so as a sentence; a fix in one of the five seeds is no
  longer such a fix.
- `philosophy.md`, "Not settled", the case of `bm/tests-replace-console-log`: "Line 2 says land it;
  line 1, as `rules.md` has it, says the loop does not deploy those three." Landing it with no
  deploy is now what `rules.md` has.
- The reviewer's brief on the Brain (read in its copy, `tests/tools/fixtures/reviewer-brief.md`,
  lines 280 to 281): "when the seed is on `main` and the deploy is the owner's, by his answer on the
  issue or by an approved spec". A third way is now the line of Never itself.

Read and left, as still so: `agents/spec.md` line 115 and `agents/approver.md` line 125 (the deploy
is his; a mark refuses nothing), `rules.md`, "Two standing leaves of the orchestrating session"
("still not deployed by the loop"), `agents/implementer/landing.md` line 50,
`agents/implementer/quick-win.md` line 18, and the plans and records, which are of their dates.

## Not tried

- **Step 4 was made out of its order.** The `start` of this round is event 6101, made after the
  two commits of the change were written in the worktree and before the landing. Nothing was
  pushed or written to the issue before it.

- **No writer has started such an issue on the rule alone.** `core-getinfo-line-says-access` is
  not that case: its `start` (event 6027) is on the owner's "yes", quoted in its comment 6007. The
  triage comment asked for its record to be read. It came in with this change's rebase, and its
  issue was `in-review` at 08:45:25 with a `submit` at event 6074. What was taken from it is the
  paragraph of "What changed" that begins "What a writer does at the landing".
- **How the owner is shown a deploy that waits once the issue is `done`.** A `pass` of a change
  that is not `major` moves the issue to `done` with cb4 not running it (the reviewer's brief says
  so and has the review's first line say it). Nothing was added that lists such deploys for him:
  no label, no line of the tracker's block, no step of the orchestrating session. The text says
  only what the writer's comment and reason carry.
- **Whether an approver passes a `major` fix in one of these seeds.** `agents/approver.md` has
  `facts` mark such a file `never` and the verdict say which of his words asked for it; that brief
  is not a writer's to change and was not. Comment 5516 of `deployer-binds-no-method-list` left one
  for want of a word of his (`oversight.md`, the entry of 5652).
- **`land.sh --seed-lands-undeployed`** was not run by this change, which has no seed. Its test is
  `tests/tools/land.test.ts`, in the suite's count.
- The other two reductions, and the three things the body says were not looked into (whether
  `brain-db` is put back as the core is, what the rule-checking code of the core is as cells, a
  guard for the second reduction's condition).
