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
  `<session>/subagents/agent-<id>.jsonl`) under `~/.claude*/projects`. `--last-run` counts from the last prompt,
  `--run N` the Nth prompt's run.
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

## What it shows on the eight implementers that were sent a later round

Read 2026-10-11 with `--run N` (rounds 2 and 3 of this issue), every run of each agent. `$` is not Claude Code's
figure: it is the four sums and the advisor's two at prices fitted to the six light reviews whose cost Claude
Code reported (input 3.222 a million, cache write twice that, cache read a tenth, output five times; the
advisor 10.36 and five times; the worst of the six is off by $0.04).

```
issue                              run  requests  cacheWrite  cacheRead  output  advisor  $
annotations-file-feedback          1    29        142,305     3,711,251  28,121  2        5.86
                                   2    13        167,146     1,956,246  18,576  0        2.01
playwright-headed-chromium-1200    1    26        117,110     2,450,811  24,821  0        1.94
                                   2     8        140,198       935,425   7,980  0        1.33
record-first-resumed-rework-round  1    28        119,786     2,850,853  26,352  2        5.11
                                   2     9        141,324     1,132,853   8,758  0        1.42
                                   3    14        163,274     2,104,219  12,394  0        1.93
                                   4     8        182,200     1,280,589   7,936  0        1.71
digest-pass-has-no-test-count      1    17        109,700     1,679,488  13,181  2        3.98
                                   2    12        126,486     1,389,728  11,764  0        1.45
fb-a2l7nb492m                      1    41        261,069     4,709,081  24,775  1        4.79
                                   2    19        323,960     2,782,708  14,892  0        3.22
ds-2-span-and-refresh-controls     1    42        154,704     5,464,361  33,155  2        6.53
                                   2    21        186,988     3,588,372  19,389  0        2.67
verify-run-shell-runs-deployed     1    48        187,626     7,106,727  55,560  2        8.35
                                   2    10        211,956     1,884,936  15,465  0        2.22
fb-a2vp4smwzq                      1    55        163,258     7,366,396  34,182  2        7.47
                                   2    18        193,321     3,196,570  18,885  0        2.58
                                   3    27        237,899     5,985,360  22,446  0        3.82
```

A later run's cache write is about the size of all the agent had read (140,198 where its `tokens` was
141,921): the resume writes it to the cache again. The 11 later runs are $1.33 to $3.82, median $2.01; the
8 first runs $1.94 to $8.35, median $5.48.
A first run is the whole change and a later one a rework, so this does not say what a fresh agent's rework
round is billed: those posted before 2026-10-11 carry no `agent`, and none was read. Six first runs of
implementers that were never sent a second round were $4.83 to $12.47, median $6.47, of which the advisor's
calls were about half ($3.21 without them).

## Tests

`tests/tools/agent-usage.test.ts`, 8 tests, 36 expects: a request on two lines counted once, the advisor kept
apart, `--last-run`, a row a tool wrote, a task's notification, `--run N`, a broken line, and the command's exits.

## Round 2 (review 1454)

1. `--last-run` took the row a Skill call writes for a prompt, and counted from it: on round 1 of
   `agent-a80fa84073a4c2072` alone it gave 7 requests where the round has 26. A row with `sourceToolUseID` is
   no longer a prompt. One test, which fails without it.
2. The table of round 1 gave `record-first-resumed-rework-round` "round 2" the sums of its round 4, the last
   in the file. `--run N` (new) counts the Nth prompt's run; the table above is made with it and replaces that one.
3. A directory given as the transcript ended in bun's EISDIR; it is "no transcript", exit 1.

The submit of round 1 said the count of `./tests/tools` was in the record; it was not. It was 229 pass, 0 fail.

## Round 3 (review 1499)

1. The row of a background task's notification (`origin.kind` "task-notification") was taken for a prompt:
   round 3 of `fb-a2vp4smwzq` read as 6 requests where it has 27, and that agent as five runs where the tracker
   has three rounds. Round 2 had named one kind of row that is not a prompt; this was a second. The rule is
   now what a prompt is: a plain row (no `origin`, not `isMeta`, not written by a tool) or one the coordinator
   sent (`origin.kind` "coordinator"). In the 105 subagent transcripts of session `f501a8e8` the user rows that
   are no tool result are of four kinds and no other: 105 first prompts, 30 Skill rows, 18 sent by the
   coordinator, 13 notifications. One test.
2. The table's rows for that agent and the medians under it were made from the wrong split and are replaced
   (three runs; 11 later runs, not 13).
3. `--run` with no value printed the whole file; it is "no run", exit 1.

## Not done, not tried

- No cost comment with `usage` has been posted by the loop; its orchestrator has to read step 5 again.
- (Done after the pass; see "The backfill".)
- The advisor's cached input, if it has any, is added into `advisor.input`; in the transcripts read it was 0.
- What a token of each kind costs is not in the tool, so it prints no dollars.
- A subagent of a subagent, and a transcript after a compaction, were not read.

## The backfill (after the pass; the owner: "I think they should be backfilled if we have the data.")

2026-10-11. A cost comment cannot be changed, so each got a second comment, `cost-usage {"of":<the cost
comment's seq>,"role":…,"round":…,"backfilled":true,"how":…,"agent":…,"session":…,"usage":{…}}`, under the key
`cost-usage-<id>-<role>-<round>-<seq>`. Its body does not begin `cost {`, so a count of cost comments is as it
was. The script is beside this file, `cost-comment-has-billed-usage.backfill.py`; it posts nothing without `--post`.

```
230 cost comments
 25 had usage already
172 posted:  39 the light reviewer's, by its session
             44 by the agent and session of the comment, the run by the round's place among that agent's comments
             89 with no agent in the comment: the one transcript of that role and issue that holds the tracker's
                answer to the comment's event ("seq":N,"event":), and has one run
 33 not posted: 20 no agent and no event to match by, 11 no transcript holds the event's answer,
                1 matched transcript has several runs, 1 agent whose runs and comments differ in number
```

No transcript run was given to two comments. The 89 were matched, not named: the match is on the event the
run wrote, which only that run was answered.

What the 198 comments with a usage give, at the fitted prices above (median, range, runs):

```
implementer  first run   fresh    $5.40  1.94-14.55  47
implementer  later run   fresh    $3.79  1.03-7.22   10
implementer  later run   resumed  $1.97  1.33-3.82   16
spec-writer  later run   fresh    $4.01  2.89-8.36    6
spec-writer  later run   resumed  $1.62  0.87-2.37    2
reviewer     first run   fresh    $2.47  0.53-5.86   37
reviewer     first run   light    $2.85  1.17-5.28   27
reviewer     later run   fresh    $2.79  1.01-5.92   21
reviewer     later run   light    $2.16  0.62-3.89   26
```

A fresh implementer's later run called the advisor 1.3 times a run and a resumed one never; a light
reviewer's first run 1.6 times against a fresh one's 0.9. The issues are not the same between rows.
