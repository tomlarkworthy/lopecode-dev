# loop-removes-needs-owner

## Round 1, 2026-10-11: `rules.md` says when the loop may take `needs-owner` off

The loop's token took `needs-owner` off an issue five times (events 88, 107, 402, 460, 554) with
no rule for or against it; the policy's label guard holds only `major` to the owner present. The
overseer filed this issue and proposed a Never line with no exception. The owner, 2026-10-11, to
the orchestrating session, of this issue (comment 632, written by that session): "yes if the
answer becomes clear from philosophy, or the owner has commented on the issue and clarified."

Commit `4395737c` adds a Never line to `rules.md`: the label is not removed but in those two
cases, quoted, and the removal follows a comment that names the event that put the label on and
what ended its reason (the overseer's side of comment 612). `bun test ./tests/tools` after it:
109 pass, 0 fail, 13 files. No test reads `rules.md`.

## Round 2, 2026-10-11: a sentence that was not the owner's is taken out

Review 645: the line ended "The owner's word to a session is written on the issue as a comment
first, quoted." That let a comment by the loop's token stand for the owner's comment, which
settles the question the issue body left open (whether a session the owner is directing counts
as the owner), and he was not asked. The sentence is removed. As the line now reads, the second
case needs a comment by the owner himself.

Not decided, the owner's: whether his word to a session, quoted on the issue by that session,
counts as his comment. Not covered by the line as written, from the same review: a removal
grounded on a commit that ended the label's reason (event 554), and the correction of a label
put on by mistake. The removal on this issue itself (event 636) rests on his word to the
session and names no event that put the label on (142). `SKILL.md` lines 68 and 188 still say
the label is the owner's alone to take off: bug `skill-md-needs-owner-removal-stale`.

The second way of the issue body, a guard in the policy, is not taken: it needs an install.

## Round 2, later the same day: the owner answers the open question

Asked by the orchestrating session "does your word to me in chat, which I then quote on the
issue, count as 'the owner has commented on the issue'?", the owner chose "Yes, it counts"
(2026-10-11, about 14:55 CEST; the session's question form, not a tracker event). The sentence
is back in the line, now with his answer quoted. "Not decided, the owner's" above is answered by
this; the two cases the line does not cover are as they were.
