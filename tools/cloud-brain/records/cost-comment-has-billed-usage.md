# cost-comment-has-billed-usage: a cost comment says what the run was billed

2026-10-11. The owner asked whether resuming agents and the light reviewer had made the loop cheaper. The 190
cost comments on the tracker could not say: `tokens` is the size of an agent's last request, and a resumed
agent carries its first round, so its figure is higher (implementer rework, median 175,878 resumed against
135,293 fresh) while its run is shorter (283 s against 616 s). The owner: "yes lets post  billed tokens (input,
cache reads, output) per run for subagents too".

## What changed

- `tools/cloud-brain/agent-usage.ts` (new): reads a transcript and prints one line,
  `{ input, cacheWrite, cacheRead, output, requests, advisor: { calls, input, output } }`. A transcript is found
  from `--session S` (a process of its own, the light reviewer) or `--session S --agent ID` (a subagent,
  `<session>/subagents/agent-<id>.jsonl`) under `~/.claude*/projects`. `--last-run` counts from the last prompt.
- `.claude/skills/brain-maintenance/SKILL.md` step 5: every cost comment has `usage`, that line; every Agent
  run's comment has `agent` and `session`; `--last-run` for a round sent to an agent.

## Checked against what Claude Code itself reported

The light reviewer's own result line has the four sums. For two reviews the tool's sums are the same:

```
session 0ee748c8  agent.sh  input 30  cacheWrite 75,636  cacheRead 905,578  output 11,860
                  tool      input 30  cacheWrite 75,636  cacheRead 905,578  output 11,860  requests 14  advisor 1 call, 68,742 in, 9,167 out
session 1d2528fb  agent.sh  input 24  cacheWrite 52,200  cacheRead 443,918  output  8,835
                  tool      input 24  cacheWrite 52,200  cacheRead 443,918  output  8,835  requests 11  advisor 1 call, 51,375 in, 5,044 out
```

No such figure exists for a subagent to check against; the tool reads its transcript the same way.

## What it shows on three resumed implementers (whole transcript, then `--last-run`)

```
issue                              round  tokens   s    requests  cacheWrite  cacheRead   output
annotations-file-feedback          all                  42        309,451     5,667,497   46,697
                                   3      175,404  283  13        167,146     1,956,246   18,576
playwright-headed-chromium-1200    all                  34        257,308     3,386,236   32,801
                                   2      141,921  116   8        140,198       935,425    7,980
record-first-resumed-rework-round  all                  59        606,584     7,368,514   55,440
                                   2      149,239  124   8        182,200     1,280,589    7,936
```

A resumed round's cache write is about the size of the agent's context (140,198 against 141,921): the resume
writes all it had read to the cache again. Whether a fresh agent's rework round is billed more or less than
that was not compared here; no fresh rework round was read with the tool.

## Tests

`tests/tools/agent-usage.test.ts`, 5 tests, 15 expects: a request on two lines counted once, the advisor kept
apart, `--last-run`, a broken line, and the command's exits.

## Not done, not tried

- No cost comment with `usage` has been posted by the loop; its orchestrator has to read step 5 again.
- The 190 comments already on the tracker were not given a `usage`. The transcripts of this machine are there to do it from.
- The advisor's cached input, if it has any, is added into `advisor.input`; in the transcripts read it was 0.
- What a token of each kind costs is not in the tool, so it prints no dollars.
- A subagent of a subagent, and a transcript after a compaction, were not read.
