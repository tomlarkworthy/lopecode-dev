# skill-md-needs-owner-removal-stale

## Round 1, 2026-10-11: `SKILL.md` says what `rules.md` says about `needs-owner`

`rules.md` since `4395737c`, `98749836` and `13752564` lets the loop take `needs-owner` off in two
cases and make the `approve` move on the owner's word; the owner approved the first in the panel
(event 681). `SKILL.md` still had "labeled `needs-owner` … Nothing. It is the owner's." in the
table of One pass and "The owner takes `needs-owner` off to let it be built" in Triage (the
issue, event 644). Commit `09c06bd1` added the two cases to both sentences.

## Round 2, 2026-10-11: the table says when a labeled issue is read again

Review 686: the row still opened with "Nothing", and step 3 takes the first row that matches, so
a labeled issue was never read again; the row kept half of the comment `rules.md` asks for; no
record. Changed: the one row is three. `hidden` and `security`: nothing. `awaiting-approval`:
nothing, unless the owner has said in the session that he approves that issue. `needs-owner`:
read again each pass (the events since the label, and what he said in the session); when he has
answered or `philosophy.md` now answers it, a comment with the event that put the label on and
what ended its reason, then the label off, then the issue is taken again from the table.

`bun test ./tests/tools` after each commit: 109 pass, 0 fail, 13 files. No test reads `SKILL.md`.
Not tried: a pass of the loop run on the new rows. Not changed: `agents/*.md`; the reviewer
grepped them and none says who takes the label off. The edit was made by the orchestrating
session; `oversight.md` has it that edits of `SKILL.md` are the overseer's.
