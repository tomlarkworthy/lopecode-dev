# The link record's count of `linked` events

For the issue `rc-2-link-record-count` (event 2107), task 2 of
`plan/cloud-brain-record-checked-by-review-alone.md`, requirement R2. The report was
`seen-link-record-count-off-by-one`. No seed, no deploy.

## Round 1, 2026-10-11

`records/link-issues-with-a-common-cause.md`, the paragraph under "Round 1", said that by 11:53 the
tracker had 14 `linked` events, 11 of them the overseer's, with no command. It has 15 and 12. The
sentence now gives those, the cut as 11:53:00 CEST, and the command with its answer. Run from the
main checkout at 21:09 CEST (`date`), after the edit, as the record has it:

```
for a in 0 500; do tools/cloud-brain/issue-as.sh issues-implementer-2 "sync?after=$a&limit=500" 2>/dev/null; done \
  | jq -sc '[.[].events[] | select(.type == "linked" and .at <= 1791712380000)]
            | [length, (map(select(.by.holder == "secret:issues-overseer-1")) | length), (map(select(.remove == true)) | length)]'
[15,12,1]
```

`date -r 1791712380 '+%Y-%m-%d %H:%M:%S %Z'` answers `2026-10-11 11:53:00 CEST`. The first event
after the cut is 546, at `1791712383006` (the same two reads, `select(.at > 1791712380000)`, first
row), so two pages of 500 hold every event up to it. The last `linked` event before the cut is 533
at 11:46:08 and the next is 570 at 12:09:59, so any cut between those gives the same 15.

The one `remove` is event 515: `linked`, `part-of`, `remove: true`, on `tests-replace-console-log`.
The record now says so beside the count, because its "Not tried" has "The 14 links on cb4" and the
spec keeps that line: 15 events less one remove. That line was not edited.

How 14 and 11 came to be written is not known. The record had no command.

## The rest of the sentence

Kept as it was, and read again at 21:11 CEST (`date`), not held by the test. "Three reports made
parts": events 527, 528 and 529 of the 15, `part-of`, the overseer's. "Three closed as a `duplicate`
or with their `cause` named": 519 and 521 (`duplicate`) and 523 (`cause`), the overseer's, and the
three issues were closed before the cut. The same two reads, `select(.type=="moved" and (.id==…))` for the three ids:

```
[520,"seen-tests-swap-console-log","close","closed",1791711962991,"secret:issues-overseer-1"]
[522,"seen-no-record-of-test-runs","close","closed",1791711963687,"secret:issues-overseer-1"]
[542,"seen-seen-json-behind-after-sweep","close","closed",1791712222493,"secret:issues-implementer-2"]
```

The third close is not the overseer's; the sentence does not say whose it was.

## The test

`tests/tools/rc-2-link-record-count.test.ts`, three tests. It reads the link record and no other
file, and does not call the tracker (R1 of the same spec).

```
bun test ./tests/tools/rc-2-link-record-count.test.ts
  record as `main` has it (git checkout HEAD -- the record):   0 pass, 3 fail, 4 expect() calls
  record as edited:                                            3 pass, 0 fail, 9 expect() calls
grep -c "15 \`linked\` events, 12" tools/cloud-brain/records/link-issues-with-a-common-cause.md
  before 0, after 1
```

Both runs in the worktree, 2026-10-11 21:10 CEST (`date`). The `grep` is the check of row R2 of the spec.

## Searched before

`knowledge.search?semantic=true` with `loop-knowledge`, three queries: "count of linked events in a
record off by one", "test that holds a sentence of a record reads the record alone", "issue.link
linked events sync". The first hit of the first two, and the second of the third, was the spec
itself. Nothing else bore on it. The test follows `tests/tools/redistil-record-statements.test.ts`.

## Not tried

- That the 14 links "are all between issues read by one rule" (the record's "Not tried"). Not read again.
- The other counts of the link record (21 of 21 tests, 456 events). Not this issue's.
- The command with another token, or from a worktree, where `.emitted/` has no tokens.
- `jq` is `/usr/bin/jq` here; the command on a machine without it.
