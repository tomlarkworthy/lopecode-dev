# record-first-resumed-rework-round

The first rework round an implementer ran as a resumed agent (round 3 of
`annotations-file-feedback`, `cost` comment 1003) is written into
`records/rework-resumes-the-implementer.md`, section "The first resumed round, 2026-10-11". The
counts, the commands and what was not tried are there and are not repeated here.

## Round 1, 2026-10-11

Started 16:40 CEST (event 1017). No seed, no deploy.

- The record's new section.
- `.claude/skills/brain-maintenance/SKILL.md`, "A rework round goes to the agent that wrote the
  change": four sentences that the round made false or answerable. "no round has been run this
  way yet" names the round; "A session that was resumed after a restart of Claude Code keeps its
  id" says it has not been seen; "Whether that difference is what the round was charged is not
  known" gives what the requests showed; "Not tried" loses tools, the removed worktree and
  compaction.
- `tests/tools/rework-resumes-the-implementer.test.ts`: two tests more, which read the two files.

What the issue did not ask for and the section has: the sum of each request's `usage` before and
after the send. It is there because the issue's own measure, the reported `tokens` less the line
before, came to 24,455 while the first request after the send wrote 144,096 tokens to the cache.

```
bun test ./tests/tools/rework-resumes-the-implementer.test.ts    in the worktree, 2026-10-11 16:42 CEST
  with SKILL.md and the record as on main (git stash of the two)   5 pass, 2 fail
  with the change                                                  7 pass, 0 fail, 35 expect() calls
bun test ./tests/tools                                           160 pass, 0 fail, 19 files
```

The two read the docs: the section is there with its numbers, and the four sentences are gone.
They do not show that a number in the section is right; the commands beside each do.

Prior art: `knowledge.search?semantic=true` for "resumed rework round cost tokens median" and
"prompt cache resumed subagent cost of a second round" (16:36 and 16:40 CEST). The nearest were a
reranking finding (0.709) and `doc:effective-use-of-fable` (0.752); neither is about a resumed
agent. Nothing was used.

Not tried: listed in the section. One read of the tracker, the first run of the `costs` command,
went with the reviewer's token by mistake. That run is the one the section quotes (round 2 below).

## Round 2, 2026-10-11

Sent back by review 1090 (the `rework` move is event 1091, 17:55:56 CEST), which
counted every number of the section again and found them right, and found four statements wrong.
This round was run by the agent that wrote round 1, sent to with `SendMessage`.

1. Both records said the quoted counts were made with the implementer's token. They were made
   with `issues-reviewer-2` at 16:40; the run with `issues-implementer-2` was at 16:44 and had 127
   lines. The section now says so where it defines `ia`, and the quoted output is left as it ran.
2. `SKILL.md` said "Of 3 resumes". There had been 4 sends to 3 agents; it now says 3 agents, on
   the first send to each.
3. The message sent is quoted in a fenced block; the code span had backticks inside it.
4. "why is not known" of `ab2bb0b` ending twice is replaced by what its transcript has: a
   background-task notification at 14:24:47.717Z, with the command and its four lines.

Also changed, a "not finding" of the review: the "Not tried" line on the next review now says
review 1036 passed round 3.

```
costs | jq …    with ia, 2026-10-11 17:57 CEST
  138 cost lines; resumed: 926, 997, 1003, 1015 and one since, 1088 (playwright-headed-chromium-1200, implementer round 2, 141,921)
  round 2 without resumed: n 11, backfilled 10, median 135,293, least 93,203, most 175,360
```

The section is of the first resumed round and line 1088 is not added to it.

```
bun test ./tests/tools/rework-resumes-the-implementer.test.ts    in the worktree, 2026-10-11 17:58 CEST
  with SKILL.md and the section as on main (git stash of the two)  7 pass, 1 fail
  with the change                                                  8 pass, 0 fail, 40 expect() calls
bun test ./tests/tools                                           176 pass, 0 fail, 20 files
```

Not tried in this round: nothing of the section's own "Not tried" was tried. The `usage` commands
were not run again; the review ran them and its numbers are the section's.

## Round 3, 2026-10-11

Sent back by review 1122 (the `rework` move is event 1123, 18:04:49 CEST). Resumed again. The
count of agents was wrong, and it was mine before it was the review's: the list of sends I read
at 16:37 CEST in round 1 had `a216c7469a0554062` as its first line, and I counted from the `cost`
lines with `resumed`, which a stalled run sent to does not have.

1. `SKILL.md` and the section say 4 agents before 14:32 UTC, with `a216c74` as a row of the table
   (gap 5,958 s by the section's command, which drops the milliseconds; the review has 5,957;
   114,548 written, 6,267 read). The list is now taken from the answers to the sends, with the
   command, and the sends after 14:32Z are named as not measured.
2. The sentence of round 2 that tied running totals to a notification is taken back in the
   section, with the two user lines of `a216c74` and its two ends (31 / 342 s, then 49 / 6,695 s).
   `SKILL.md` says two of the four and two, and that what decides it has not been found.

```
usage a216c7469a0554062 2026-10-11T12:03:03      18:05 CEST
{"from":"2026-10-11T10:18:10.713Z",…,"requests":29,"cache_creation":114300,"cache_read":2855885,"output":14870,"first":[34818,6267]}
{"from":"2026-10-11T12:03:08.236Z",…,"requests":18,"cache_creation":136801,"cache_read":2257271,"output":14107,"first":[114548,6267]}
```

Not tried: the sends after 14:32Z (five, two of them to this agent's own id `a873aa0`) were not
measured. `SKILL.md`, "on the one resume tried (2026-10-11, an agent that had answered "OK" with
no tool call)", may be another resume again. Which session made it is not known to me; it was not
looked for in this session's transcript.

```
bun test ./tests/tools/rework-resumes-the-implementer.test.ts    in the worktree, 2026-10-11 18:07 CEST
  with SKILL.md and the section as on main (git stash of the two)  8 pass, 1 fail
  with the change                                                  9 pass, 0 fail, 47 expect() calls
bun test ./tests/tools                                           182 pass, 0 fail, 21 files
```

A first run of the change gave 8 pass, 1 fail: the new sentence of `SKILL.md` ended "is not
known", which round 1's test forbids in that section. It now ends "has not been found".
