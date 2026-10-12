# sd-3-pilot-ten: ten summaries of docs put with haiku, then with opus; the search by words lost three of the ten with haiku and two with opus; the ten are put back plain

Task 3 of `plan/cloud-brain-docs-summarised-for-search.md` (there `ds-3-pilot-ten`). Written 2026-10-13 by the
task's writer, round 1. The task is an act: 20 puts of a summary and 20 puts of a plain entry to the knowledge base
of cb4, with the token `loop-docs` through `knowledge-docs.ts`. What is committed is this record, two flags of
`knowledge-eval/paper-sets.ts` with their tests, a note in the spec and a sentence in the guide. No seed, no deploy.

**The task stops, as the spec has it: R5 fails with both models.** The gate is set K asked by words: "no wanted
entry lower than third". With no summary the lowest of the ten is second. With the haiku summaries one wanted entry
is not among the 20 and two more are 9th and 14th; with the opus summaries the three lowest are 20th, 9th and 3rd.
The spec: "The task ends with the figures on the issue for the owner, and the ten put back plain, when both models
fail a gate". The ten are plain on cb4, each text the bytes it was before the first put. No summary of a doc is on
cb4 (`"long":48,"summarized":0`, 01:10:09).

`D` is `<main checkout>/tools/cloud-brain/.emitted/docs` and `TEN` the ten names of the sets:
`vendoring-npm-dependencies pushing-cells-to-observablehq cloud-brain-texts-not-read-again-after-a-change cloud-brain-group-invites cloud-brain-record-checked-by-review-alone maintaining-and-updating-lopecode-and-lopebook-content-repositories diagnosing-new-observable-platform-differences cloud-brain-flow-metrics cloud-brain-dashboard-service cloud-brain-locks-held-in-the-cluster`.
Every command was run from the task's worktree, `bm-docs-summarised-for-search`, with `claude` under
`~/.claude-personal`. Times are `date` on this machine or a journal line's `at`, in CEST, all of 2026-10-13. The
questions of the two sets are not quoted here: this file is not entered in the search, but the spec that has them
is, and says what that does ("The question sets", its last paragraph).

## What the task asked, and the answer to each

| Asked | Answer |
|---|---|
| Before the first put, no worktree behind task 2 | 10 of 20 `bm-*` worktrees are behind `993f75c3`; each has no occupant and nothing unlanded. Below |
| `summarize` on the ten, with haiku | 10 put, 0 refused twice, 0 failed, exit 0. 00:43:27 to 00:51:32. $0.137273 |
| `status --check-summaries` of the ten | `{"checked":10,"summarized":10,"excepted":[],"failing":[]}`, exit 0, at 00:51:45 (haiku) and 01:05:55 (opus) |
| `vectors: 1` for each put of a new summary | so for all 20 (the journal's `put`) |
| One put back with `put --plain`, read to be the text the tool makes today, summarized again | All ten, twice. Each text cb4 answered after `put --plain` is byte for byte the text it answered before the first put. Summarized again with opus |
| Sets K and L again, both ways | Below. K by words: 0.950 before, 0.652 with haiku, 0.649 with opus |
| R5: set K by words, no wanted entry lower than third | **Fails with both models** |
| R7, the journal: no put with a refused number | Holds: one number refused in a first answer (haiku, `617`), and the answer put was the second, accepted |
| R7, five of the ten read against the doc | The writer's own reading of the haiku five, below: 25 claims located, none not found. The reviewer makes its own. The opus five were not read |
| The cost of the ten, and of the other long docs at that rate | haiku $0.137273; the other 38 are $0.52 by doc and $0.63 by length. opus $3.607589; $13.71 and $16.64 |
| Ten over $1 with haiku: stop | Not met |
| A doc refused twice | None, with either model |

## Before the first put

**The worktrees** (the spec, "A copy of the tool from before task 2 undoes a summary"). Task 2's first commit on
`origin/main` is `993f75c3`. At 00:41:11, for each name of `worktree.sh --list`,
`git -C <root>/.claude/worktrees/bm-<name> merge-base --is-ancestor 993f75c3 HEAD`:

```
has it (10)   bookkeeping-in-the-tracker  brain-info-size  docs-summarised-for-search  landing-steps-script
              rev-rules-md-loop-docs-names-four-methods  rev-tr-1-wait-in-the-record  rules-md-loop-docs
              summarize-papers-test-30s  tracker-trigger-rules  worker-machine-on-fly
behind (10)   answers-cut-and-not-said  approver-persona  approver-persona.2  orch-MacBook-Pro-3  orchestrator-as-steps
              over-MacBook-Pro-3  record-names-token-not-agent  record-names-token-not-agent.2  topics-service
              worktree-per-topic
```

Every worktree with an occupant has it, and so has the main checkout. Each of the ten behind read
`clean … ahead=0 … occupant=-` in that list. Why none of them is expected to make a release with its older copy:
eight are topics' worktrees with no agent, and `worktree.sh --fresh`, which the orchestrator runs before it puts an
agent in one, brings a clean worktree up to `origin/main` first (the script, the last lines of `--fresh`).
`orch-MacBook-Pro-3` and `over-MacBook-Pro-3` are the orchestrating session's and the overseer's: a landing from
either is a push, which `origin` takes only as a fast-forward, so its `HEAD` then has task 2. What is left is a
`lock.sh release land` from one of the ten with no push before it (a take, a failed rebase, a release). Not seen
and not guarded. A worktree on another machine cannot be listed from here. Since the ten are plain again, a
release by an older copy has no summary to undo today.

**The entries as they were.** Each of the ten read back with
`knowledge.search?kind=doc&limit=5&q=doc%3A<name>` and `loop-knowledge` at 00:42:34 and its `text` kept as
`D/sd-3/before/<name>.txt`: ten texts of 16,000 characters, none with a summary's line. `status` at 00:41:00,
`origin/main@c58478d7`: the ten `fresh`, each `cut`, and
`{"docs":92,"fresh":92,"stale":0,"missing":0,"cut":48,"unmarked":0,"long":48,"summarized":0,…}`.

**The sets.** `paper-sets.ts` with the two new flags (below) reads sets K and L from the spec's last section.

```
BRAIN_BASE=cb4 bun tools/cloud-brain/knowledge-eval/paper-sets.ts --plan plan/cloud-brain-docs-summarised-for-search.md --kind doc --out D/sd-3/sets-before-1.json
00:42:37, and the same at 00:42:56
K by words    0.950   1  2 1 1 1 1 1 1 1  1
K by meaning  0.594   1 12 1 1 2 2 4 2 9  1
L by words    0.623   1 17 1 1 0 2 1 1 3  3
L by meaning  0.512   1  0 1 1 0 1 3 2 5 11
```

The ranks are in the order of `TEN`; 0 is "not among the 20". Set K by words is what the spec read on 2026-10-12
(1 2 1 1 1 1 1 1 1 1). Its other three figures of that day were 0.656, 0.517 and 0.594: K by meaning is the same,
and L has moved by a rank or two with no summary put, as the papers' pilot also saw of its set B.

## The two runs

```
BRAIN_BASE=cb4 bun tools/cloud-brain/knowledge-docs.ts summarize TEN --usd-max 1                    00:43:27 to 00:51:32
{…,"picked":10,"put":10,"dry_written":0,"refused":0,"failed":0,"refusedBefore":[],"skipped":[],"usd":0.137273,"source":"origin/main@c58478d7"}   exit 0
BRAIN_BASE=cb4 bun tools/cloud-brain/knowledge-docs.ts summarize TEN --model opus --usd-max 8       00:57:32 to 01:05:37
{…,"picked":10,"put":10,"dry_written":0,"refused":0,"failed":0,"refusedBefore":[],"skipped":[],"usd":3.607589,"source":"origin/main@3afef03f"}   exit 0
```

Each was a background command. The journal's lines of this task are the 22 with `at >= 1791845016887` in
`D/journal.jsonl` (the 9 before are task 2's dry runs): two canaries, each `refused`, and 20 puts. `chars` is the
file as the agent read it, `first` and `sections` the lengths of the summary's two parts.

```
at        name                                             outcome model rounds usd       ms     context chars  first sections session
00:43:36  canary                                           refused              0.001463                                          744cd4f8
00:44:47  diagnosing-new-observable-platform-differences   put     haiku 2      0.026425  65513  38096   36568  970   3099     16ec450f
00:45:41  maintaining-and-updating-lopecode-and-lopebook…  put     haiku 2      0.020951  49848  32635   33549  1016  4463     f3c76dd0
00:46:29  pushing-cells-to-observablehq                    put     haiku 2      0.017008  42925  26084   22412  833   4287     d53b11ec
00:47:06  vendoring-npm-dependencies                       put     haiku 1      0.006347  33156  16469   17743  970   4917     0ee17cd9
00:47:58  cloud-brain-dashboard-service                    put     haiku 1      0.010308  48514  27905   45076  815   4083     c808adc5
00:48:56  cloud-brain-flow-metrics                         put     haiku 2      0.023133  53095  35613   38674  997   4718     5d568403
00:49:22  cloud-brain-group-invites                        put     haiku 1      0.005892  23485  20743   29027  840   4062     b6f18860
00:50:09  cloud-brain-locks-held-in-the-cluster            put     haiku 1      0.011247  42002  35869   66729  873   4456     866d5fed
00:50:50  cloud-brain-record-checked-by-review-alone       put     haiku 1      0.008195  37897  22144   31147  798   3632     ed366a09
00:51:32  cloud-brain-texts-not-read-again-after-a-change  put     haiku 1      0.007767  38422  19699   26019  1077  4826     77295b7c
00:57:43  canary                                           refused              0.001799                                          c89b1c21
00:58:39  diagnosing-new-observable-platform-differences   put     opus  2      0.599924  51642  27913   36568  1170  4669     2d556e5f
00:59:39  maintaining-and-updating-lopecode-and-lopebook…  put     opus  2      0.571535  55334  27737   33549  1256  4484     cf6ea3bd
01:00:16  pushing-cells-to-observablehq                    put     opus  1      0.188074  33669  18134   22412  1250  4834     1b6c0345
01:01:09  vendoring-npm-dependencies                       put     opus  2      0.422070  48846  19975   17743  1223  4128     956bc6f5
01:01:53  cloud-brain-dashboard-service                    put     opus  1      0.281193  40852  27395   45076  1154  4949     1b687c27
01:02:33  cloud-brain-flow-metrics                         put     opus  1      0.247406  35821  24933   38674  1121  4324     3e574818
01:03:29  cloud-brain-group-invites                        put     opus  1      0.256181  53350  20466   29027  1028  4865     d5d30e4e
01:04:05  cloud-brain-locks-held-in-the-cluster            put     opus  1      0.328219  32724  35817   66729  1124  4404     8d523bc1
01:05:03  cloud-brain-record-checked-by-review-alone       put     opus  2      0.518256  52152  25427   31147  1132  4297     902b77fe
01:05:37  cloud-brain-texts-not-read-again-after-a-change  put     opus  1      0.194731  31530  19732   26019  1300  4722     4f54117f
```

Each of the 20 puts answered `{"entered":0,"changed":1,"vectors":1}`, and each entry as put is 16,000 characters.
No line has `putSha256`: `origin/main` moved during both runs and none of the ten files changed under its agent.

**Refused once: 4 of 10 with each model, and not the same four.** What the first answer was refused for:

```
haiku  diagnosing-…            the sections are 5753 characters together and the limit is 5000
haiku  maintaining-…           an empty line before the first heading; these numbers are not in the text as you wrote them: 617
haiku  pushing-cells-…         an empty line before the first heading
haiku  cloud-brain-flow-metrics the sections are 5095 characters together and the limit is 5000
opus   diagnosing-…            the sections are 5233
opus   maintaining-…           the sections are 5006
opus   vendoring-…             the sections are 5223
opus   cloud-brain-record-…    the sections are 5228
```

So the rule of task 2's brief on the answer's first character did not end the line before the first paragraph: 2
of 10 first answers with haiku had it, and the judge saw both. First answers that were sent back are
`D/<name>.first-answer.txt`; a name's file is the opus run's where both runs had one.

**`status --check-summaries TEN`**: exit 0 with `"summarized":10,"failing":[]` after each run. It is the first run
of that check on a summarized entry of cb4; task 2 had it on a stand-in.

## R5: what the search by words lost

Each reading is a minute or more after the last put, and was made again 62 s later with the same ranks (three
times for haiku: 00:53:02, 00:54:06, 00:55:08; twice for opus: 01:07:00, 01:08:04).

```
                 before 00:42:37        haiku 00:53:02         plain again 00:57:07   opus 01:07:00          plain again 01:09:50
K by words       0.950                  0.652                  0.950                  0.649                  0.950
                 1  2 1 1 1 1 1 1 1  1  1 9 1 1 1 3  0 14 1 1  1  2 1 1 1 1 1 1 1  1  1  2 1 1 1 3 20 9 1 2  1  2 1 1 1 1 1 1 1  1
K by meaning     0.594                  0.542                  0.594                  0.546                  0.594
                 1 12 1 1 2 2 4 2 9  1  1 0 1 1 6 2  0  4 2 1  1 12 1 1 2 2 4 2 9  1  1 15 1 1 7 2  0 4 2 1  1 12 1 1 2 2 4 2 9  1
L by words       0.623                  0.700                  0.623                  0.732                  0.623
                 1 17 1 1 0 2 1 1 3  3  1 0 1 1 0 2  1  1 2 1  1 17 1 1 0 2 1 1 3  3  1 14 1 1 4 2  1 1 2 1  1 17 1 1 0 2 1 1 3  3
L by meaning     0.512                  0.590                  0.512                  0.622                  0.512
                 1  0 1 1 0 1 3 2 5 11  1 0 1 5 0 1  1  1 2 5  1  0 1 1 0 1 3 2 5 11  1  0 1 6 20 1 1 1 2 2  1  0 1 1 0 1 3 2 5 11
```

**R5 fails with haiku**: of set K by words, `diagnosing-new-observable-platform-differences` went from first to
not among the 20, `cloud-brain-flow-metrics` from first to 14th and `pushing-cells-to-observablehq` from second to
9th. **And with opus**: the first two of those, at 20th and 9th; `pushing-cells-to-observablehq` stayed second and
`cloud-brain-locks-held-in-the-cluster` went from first to second. `maintaining-…` went from first to third with
both. Nine of the ten were first before, six with haiku and five with opus.

**The two readings with the ten put back are the reading before, rank for rank, in all four arms.** So the fall is
the summaries' and not a drift of the index over those 27 minutes.

**Why, counted and not guessed.** A summary with its two lines takes the first 4,500 to 6,600 characters of the 16,000, so the entry
keeps 9,601 to 11,453 characters of the doc's own text where it kept about 15,700 (9,393 to 10,159 with opus).
Set K's questions were written from character 12,500 on, which is the part that leaves. For each question, the
count of its words (3 letters or digits or more, lower case) that the entry's text holds, before and with the
haiku summary (`D/sd-3/before`, `D/sd-3/after-haiku`; the script was the session's and is not in the repository):

```
                                 words  before  with haiku  rank by words before -> haiku
vendoring-npm-dependencies        11     11      11          1 -> 1
pushing-cells-to-observablehq     15     15       7          2 -> 9
cloud-brain-texts-not-read-…      14     14      12          1 -> 1
cloud-brain-group-invites         13     12       7          1 -> 1
cloud-brain-record-checked-…       6      6       6          1 -> 1
maintaining-and-updating-…        21     19      11          1 -> 3
diagnosing-new-observable-…       15     12       6          1 -> not found
cloud-brain-flow-metrics          14     14       6          1 -> 14
cloud-brain-dashboard-service     18     18      17          1 -> 1
cloud-brain-locks-held-…          16     16      13          1 -> 1
```

The three that fell are three of the four that lost six words or more of their question; the fourth is
`maintaining-…`, first to third. With opus those three hold 10 of 15, 6 of 15 and 6 of 14, and the one that holds
10 is the one that stayed second. A summary of 5,000 characters holds some of a passage's words and
not the passage, and which words is not the model's to know. This is the loss the spec named ("Set K is from
character 12500, which this removes from every one of its ten entries: R5 is checked on exactly what is lost"); it
measured 0.950 falling to 0.65 where the papers' set A stayed at 1.000 under the same design. One difference
between the two that was read and not tested: a question of the papers' set is asked among 63 papers, a doc's among
92 docs of one project that share most of their words.

**What rose.** Set L, the questions from past the kept 16,000 characters: by words 0.623 to 0.700 (haiku) and
0.732 (opus), by meaning 0.512 to 0.590 and 0.622. **Set K by meaning fell** too, 0.594 to 0.542 and 0.546. By meaning the
mean of the two sets is 0.553 before, 0.566 with haiku and 0.584 with opus: most of what set L gained, set K lost. Ten questions a set,
written by the spec's writer: one rank is up to 0.05 of an MRR, so the sums by meaning say little, and the fall of
K by words (three docs out of the first three with haiku, two with opus) is the one figure here that is larger than that.

## Put back plain, and read to be the text the tool makes today

```
BRAIN_BASE=cb4 bun tools/cloud-brain/knowledge-docs.ts put --plain TEN        00:55:45, after the haiku readings
{"put":10,"public":3,"private":7,"cut":10,"unmarked":0,"summarized":0,"plain":true,"filesWrong":0,"entered":0,"changed":10,"vectors":10,"ms":9372,"source":"origin/main@5ae8cec0"}
the same command                                                               01:08:35, after the opus readings
{"put":10,…,"plain":true,…,"changed":10,"vectors":10,"ms":8790,"source":"origin/main@938b1b59"}
```

After each, the ten read back as before the first put (00:55:57 to `D/sd-3/plain-1`, 01:08:46 to `D/sd-3/plain-2`)
and compared with `cmp` against `D/sd-3/before/<name>.txt`: `same` for all ten, both times. The SHA-256 of
`vendoring-npm-dependencies`'s text is `81803eb0…` in all three readings and `74f3bba5…` and `2199942c…` with the
two summaries. So `put --plain` is the way back, to the byte, and the vector is made again by it (`vectors: 10`).
First run of `put --plain` on cb4. "Summarized again" is the opus run, on ten entries that had been summarized and
put back.

`status` at 01:10:09, `origin/main@938b1b59`:
`{"docs":92,"fresh":92,"stale":0,"missing":0,"cut":48,"unmarked":0,"long":48,"summarized":0,"behind":0,"due":[48 names],"refused":[],"files":92,"filesWrong":[],…}`.

## R7: five summaries read against their docs

The spec gives this to the reviewer: five of the ten, "the first five by SHA-256 of the name", three claims of
each. By `printf '%s' <name> | shasum -a 256` the five are `maintaining-and-updating-…` (`1ac4381c`),
`cloud-brain-locks-held-in-the-cluster` (`2073aa01`), `cloud-brain-flow-metrics` (`44c81a01`),
`cloud-brain-record-checked-by-review-alone` (`5579860c`) and `diagnosing-new-observable-platform-differences`
(`619a332b`). The summaries are no longer on cb4; they are two attachments of the issue,
`sd-3-summaries-haiku-r1.txt` and `sd-3-summaries-opus-r1.txt` (events 5420 and 5421), each summary as cb4
answered it, in that order.

The writer read the haiku five, from the sections `Measured and decided` and `Not done and not known`, each claim
looked for with `grep` in the file at `c58478d7`, the commit the agents read:

| Doc | Claims located, with the line of the file |
|---|---|
| `maintaining-…` | "392 of 428 pids, across 22 of the 50 module blocks" (156); "392 restored, 0 dropped and 36 left fresh" (189); "187 of 229 specs" (118); "212 exact, 14 differing" (133); "2741564 bytes / 55 modules", 4.7x (249, 250); 21 sibling modules, "still true" (91 to 93); "churned 51 lastmod values" (304) |
| `cloud-brain-locks-…` | "203 s", each writer's own report (129, 130); 600 s as three times that hold (269); the newest 500 rows (325); a take as five statements (298); 409 to the holder too (232); "12 pass, 0 fail", 18:02 (79, 80) |
| `cloud-brain-flow-metrics` | 276 issues, 120 done, median 0.7 h, 84 with no rework (63, 71); 710.9 against 129.8 (79); 187 over 22 targets and 29 over 12 (118 to 120); 242.9 h against 192.49 h in 61 waits (97, 421); 0.72 h, 45.89 h, 49.63 h (126) |
| `cloud-brain-record-checked-…` | median 258,844 tokens (129, 285); 8,557 added lines, 470 and 10 (152, 163); 242,591 as the mean of two (298); 475 and 7 against 470 and 10 (163) |
| `diagnosing-…` | 147 requests, 60, 57 and 22 (39); cm 1, pinnedHostCm 0 to cm 2, pinnedHostCm 1 (445); the two claims that did not reproduce on 2026-09-26 (53 to 57) |

25 claims, none that the doc does not make. One was looked at twice: the summary of `maintaining-…` has "the 36
left fresh include 35 named cells and 7 anonymous ones", which sums to 42. The doc has it so: "The 36 left fresh
are the cells that genuinely did not exist in the reference: 35 named (…) and 7 anonymous" (lines 197 to 200). The
summary copied the doc's own figures.

This is a reading of figures by `grep`, by the agent that ran the pilot. It says the numbers of five haiku
summaries are the docs', which the judge's number rule also holds. It does not say that a sentence without a
number is true to its doc, and the opus five were not read: R5 had failed for both models before either reading
would have been used.

## The cost

```
                       haiku                     opus
the ten                $0.137273                 $3.607589          the sum of `usd` of the ten lines; each run's last line says the same
a doc                  $0.005892 to $0.026425    $0.188074 to $0.599924
  the median           $0.010777                 $0.304706
the agent's time       434.9 s in all            435.9 s
  a doc                23.5 s to 65.5 s          31.5 s to 55.3 s
the wall clock         00:43:27 to 00:51:32      00:57:32 to 01:05:37
all of this task       $3.748124                 the 22 lines: the 20 and two canaries ($0.003262)
```

Opus was 26 times haiku on the same ten. The spec's estimates were $0.0116 a doc at the median for haiku and
"about $3" for the ten with opus.

**What the other long docs would cost.** `status` has 48 long docs, so 38 others. Their texts as the tool makes
them are 1,597,131 characters against the ten's 346,235 (the `M` of each `cut N of M` line), 4.61 times as much;
the longest is 186,433.

```
                       haiku      opus
by doc, 38 x a tenth   $0.52      $13.71
by length, x 4.613     $0.63      $16.64
```

Neither is a forecast, as the papers' pilot said of its two: with ten docs, how many are refused once moves the
sum as much as length does (the four dearest haiku docs are the four refused once).

## What was built

`tools/cloud-brain/knowledge-eval/paper-sets.ts` takes `--plan FILE` (the plan whose last section has the two
sets; the papers' with none) and `--kind doc` (four arms: each set by words, `kind=doc`, and by meaning; a paper's
three arms are as they were). `--held` is the papers' alone and is refused with `--kind doc`. The arms are the
export `armsOf(sets, kind)`.

```
cd <worktree> && bun test --timeout=30000 ./tests/tools/paper-sets.test.ts
 8 pass  0 fail  41 expect() calls
```

Three are new (`sd-3: …`): the spec's two sets are ten questions each of the same ten docs, and the ranks it wrote
down score 0.594 and 0.517 as it says; the arms by kind; the three refusals before any call. With the tool as it
was (`git stash` of the one file) the test file does not load: 0 pass, 1 fail, 1 error, since it imports `armsOf`.
No case calls a Brain. `knowledge-docs.ts` and `summarize-papers.ts` were not changed.

`tests/tools/sd-3-pilot-ten.test.ts` (3 tests) holds this file's headings and its verdict, the spec's note and
the guide's sentence. The whole of `tests/tools` is under "The tests" of the issue's comment: its count is of a
run after the last edit, which this file is part of.

## The four edges of `seen-sd-2-summary-edges`, as this run met them

The move to `ready` asked the writer to read that issue: four things read in `knowledge-docs.ts` by the reviewer
of task 2, none met while no summary was on cb4.

1. A doc that quotes a summary's line is read as summarized. Not met:
   `git grep -E '^Summary by summarizer \([^)]*\), \S+, of \S+ as it was with sha256 [0-9a-f]{64}\.$' origin/main -- knowledge plan tools/cloud-brain/post-mortems`
   printed 0 lines at 00:43:20. This record quotes no such line whole.
2. `dueOf` is due by any commit since the version summarized. Not met: no summary was behind its file.
3. The `.running` file is removed before the put. Not met, and not shown absent: `lock.sh show land` answered
   `land is not held` at 00:43:20, and whether a release ran between an agent's end and its put in the 16 minutes
   of the two runs was not read. All 20 entries had their summary at the reading after each run.
4. The header's sentence on an entry answered with no text. Not changed here.

None is mended by this task.

## Not tried

- **Any other shape of the entry.** The task measures the spec's shape: first paragraph, sections, two lines, the
  doc's start. A summary of the first paragraph alone, the sections after the doc's start, or the spec's own
  "summary made with no model" ("Not chosen": "Reopen if task 3 stops: this is what is built in its place") were
  not put and not measured. The word counts above say what a shape must keep; they are not a measurement of one.
- The opus summaries read against their docs (R7), and any sentence of a summary without a number.
- A doc refused twice, `--again`, `--except`, and the `feedback` issue of piece 3: none was refused twice.
- `summarize --due`, `--usd-max` reached, a `summarize` beside a release, and two at once.
- A summarized doc changed and put by a release (`put` keeping a summary), `behind`, `due` by a tenth and
  `staleSince` on cb4: the ten were summarized for 3 to 12 minutes before each put-back.
- A release from one of the ten worktrees behind task 2.
- Why the same doc is refused once by one model and not by the other, and the transcripts of the 20 agents:
  whether each read its brief and the whole of its file.
- The sets asked later than 3 minutes after a put.
- `sd-4-the-rest-and-the-release-line` is not started by this task and none of its parts was made.

## Read first

`knowledge.search?semantic=true&limit=6` with `loop-knowledge`, 00:37:17:

| Words | Found | Used |
|---|---|---|
| pilot of ten summaries put, one put back and summarized again, question sets asked again | `doc:cloud-brain-docs-summarised-for-search` 0.900, `doc:cloud-brain-paper-summarizer-persona` 0.847, `doc:pm-second-summarizer-role` 0.805 | the first, whole: it is the task. `records/ps-3-pilot-ten.md`, which the search does not hold, was read whole for the order of a pilot: the sets before any put, a reading a minute after the last put and twice, two figures for the rest |
| check that a summary states nothing the document does not, faithfulness of a haiku summary | the same three, `web:carbonell-1998-mmr` 0.550 | nothing more |
| search by words still finds what a summary replaced in a long doc's entry | the spec 1.000, `finding:2026-10-11:knowledge-search:any-word-and-name` 0.589 | nothing more |

Also read: `records/sd-2-one-summarizer.md`, `knowledge-docs.ts` whole, `seen-sd-2-summary-edges`, and the brief
`roles/summarizer.md` as the Brain serves it.
