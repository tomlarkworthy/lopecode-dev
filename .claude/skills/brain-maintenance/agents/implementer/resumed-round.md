<!-- A page of `agents/implementer.md`: a round of changes after a review, taken by the agent that wrote the change.
Read it when a review sent your change back, by a message or at step 13.
Cut from the brief 2026-10-13 (`writer-brief-and-tool-output-smaller`), as it stood. "Above" and "below" in it are of the
brief before the cut: the table "The pages" of `agents/implementer.md` has the page of each step and section. -->
## A resumed round

A round you take yourself after step 13 is a resumed round too: what follows holds, with the tool's
second line, the review, where it says the message. Its first act is `issue-wait.sh … --work` (step 13).

Since 2026-10-11 the orchestrator may send a rework round to the agent that wrote the change, as a
message, in place of a new agent (`SKILL.md`, "A rework round goes to the agent that wrote the
change"; Tom that day: "resuming implementors is a good idea"). You then have the first round in
your context: the brief, the code and why you made each choice. That is what the resume is for,
and it is also what can mislead you. No round had been run this way when this was written; say in
your report what of it was wrong.

What a resumed round does that a first round does not:

- **Read the issue again**, `ia "get?id=<id>"`. The message names a `reviewed` event by its seq:
  its findings are the round, and nothing else is. Read them from the event, not from what you
  expected a reviewer to say. The other events since your submit may be the owner's.
- **Your worktree is the one the message names**, in a line `Working directory: <W>`: the
  orchestrator has put you in it again, and it may be another than the one you landed from, when a
  later task of the topic is being written there. With no such line (a round you took yourself
  after step 13, or a message from a session that runs the procedure of before
  `wt-3-land-by-push`), it is the one you landed from, which nobody removed: `ls` it, and when it
  is gone, `W=$(<root>/tools/cloud-brain/worktree.sh <id>)`. Then
  `$W/tools/cloud-brain/worktree.sh --rebase <tree>`: a fetch and a rebase on `origin/main`, where
  your change now is, with what cb4 runs today read into `$W/cloud-brain-dev/deploy/`.
- **Do not trust what you read of a file that has changed.** Other writers landed while the
  review ran. After that fetch, `git -C $W diff --stat <sha> origin/main`, with `<sha>` the last
  `commit` ref of your submit, names every file changed since. Read again each file of that list
  that this round rests on. `rules.md` and this brief are among them when the overseer or the
  owner changed them: read the diff
  (`git -C $W diff <sha> origin/main -- .claude/skills/brain-maintenance`), which is short.
  `philosophy.md` is in the clone, which the rebase put at the commit `origin/main` records:
  `git -C $W/cloud-brain-dev log --since=<the date of your submit> -- philosophy.md`.
  A file the list does not name is as you read it.
- **Nothing outside your context was kept**, but the worktree. No shell state, no lock, no tab you opened.
- **Your token is the one of your first round**, and the message names no other. It is kept for
  48 hours from its making. When `ia "get?id=<id>"` is exit 2, or answers 401, it has ended: write
  nothing with another token, and report it. The orchestrator then gives the round to a new writer.
- **The round's number** is the count of `rework` moves plus one, as step 4 says, in every key:
  `comment-2`, `submit-2`. The record gets a dated section in the same file (step 9).
- **Everything else is the brief as written**: the prior-art search only when the findings ask for
  a new design, the reproduction when a finding describes behaviour, the tests run again by you,
  the landing, the comment, the submit. A count from the first round is not submitted again.

In the report, say that the round was resumed, what you used from the first round without
reading it again, and anything of it that had gone stale.

