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
went with the reviewer's token by mistake; the counts in the record are from the implementer's.
