<!-- A page of `agents/implementer.md`: a second defect fixed while you are there, a follow-up, and a feedback ticket.
Read it when you see a defect that is not your issue, or your work stops and cannot be submitted.
Cut from the brief 2026-10-13 (`writer-brief-and-tool-output-smaller`), as it stood. "Above" and "below" in it are of the
brief before the cut: the table "The pages" of `agents/implementer.md` has the page of each step and section. -->
## A quick win

> In force on cb4 since the owner installed the policy of 2026-10-11 (event 483).

The owner, 2026-10-11: "if an agent has spare context left and it already knows how to fix an issue
it should jsut do it as a quick win while it is there." Before 2026-10-11 the only thing you could
do with a second defect was file it, and a round for a one-line change cost 167,000 tokens or more.

While you are in the code for your issue you will see other things: a stale line of a record, a
wrong count in a doc, a test that names the wrong value, a step of this brief that misled you. When
all of these hold, fix it now:

- you know the fix, and it is in files your issue already has you in or a doc beside them;
- it needs nothing in the Never list of `rules.md`, no deploy of another Worker, and no choice the
  owner would want to make;
- you have read no more than you would have anyway.

It gets its own issue and its own commit, so the review and a revert are of that one change:

```
ia open '{"key":"impl/<short>/open","id":"<short>","kind":"bug","title":"…","body":"what was wrong, where"}'
ia link '{"key":"impl/<short>/link","id":"<short>","to":"<your issue>","rel":"related"}'
ia move '{"key":"impl/<short>/start","id":"<short>","to":"in-progress","reason":"real: <how you met it>. One change: <what>."}'
…the fix, its test, the commit, landed as step 10 says…
ia move '{"key":"impl/<short>/submit","id":"<short>","to":"in-review","refs":[{"kind":"commit","value":"<sha>"}]}'
```

`start` from `open` takes the reason triage would have given and is refused for an issue labeled
`major` or `needs-owner`. An issue that is already open and that you can fix the same way: `start`
it the same way, when no agent has it (`issue.by.start` is empty). Say each quick win in your
report. When one of the three does not hold, it is feedback (below), not a fix.

A follow-up of your issue is linked, never opened with `parent`: a part holds its parent back from
`submit` (403 at event 296 on 2026-10-10). `ia link '{"key":"…","id":"<follow-up>","to":"<your issue>","rel":"related"}'`.
When your work has stopped and cannot be submitted (it needs the owner, or it was not real):
`ia move '{…"to":"ready","reason":"…"}'` gives it back, and `"to":"closed"` ends it with no change.

## If you see something, say something

Anything that seems off against one of the seven lines of `philosophy.md` while you work, and is
not your issue: open a feedback ticket and go on. `ia open '{"key":"<role>/<short>/seen","id":"seen-<short>","kind":"feedback","title":"<what, and the line>","body":"<what was seen, when from `date`, where to read it, which line>"}'`
No fix in it and no work on it: the owner reads these for patterns before anything is built
(2026-10-11, `philosophy.md`, Clarifications). What slowed you still goes in your report.

