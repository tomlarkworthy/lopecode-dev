# sd-3b-first-paragraph-alone: the pilot again on the same ten, the entry holding the summary's first paragraph alone; the search by words lost none of the ten; the ten are put back plain

**Passes.** The gate is R5 of `plan/cloud-brain-docs-summarised-for-search.md`, as `sd-3-pilot-ten` read it: set K
asked by words, "no wanted entry lower than third". With no summary the ranks are 1 2 1 1 1 1 1 1 1 1. With the ten
first paragraphs of haiku they are the same ten ranks, 0.950 before and after. With the whole summaries of the pilot
they were 1 9 1 1 1 3 0 14 1 1, 0.652.

**What the first paragraph did not do: raise set L.** Set L is the ten questions from past the kept 16,000
characters, the part of a doc a summary was to make findable. By meaning it fell, 0.517 to 0.426; by words 0.623 to
0.614. The whole summaries of the pilot had raised it to 0.590 and 0.700. Below, "What moved".

Written 2026-10-13 by the task's writer, round 1. The owner's answer "sd-3-pilot-ten b" (event 5779, as the issue's
body has it) asked for one more try on the same ten. The task is an act: 10 puts of a first paragraph and 10 puts of
a plain entry to the knowledge base of cb4, with the token `loop-docs` through `knowledge-docs.ts`. No summary of a
doc is on cb4 (`"summarized":0`, 06:17:37). What is committed is a flag of `knowledge-docs.ts summarize` with its
test, this record, a note in the spec and three sentences of the guide. No seed, no deploy.

`D` is `<main checkout>/tools/cloud-brain/.emitted/docs` and `TEN` the ten names of the pilot's record, in its
order. Every command was run from the task's worktree, `bm-sd-3b-first-paragraph`, with `claude` under
`~/.claude-personal`. Times are `date` on this machine or a journal line's `at`, in CEST, all of 2026-10-13. The
questions of the two sets are not quoted here, as in the pilot's record.

## What was asked, and the answer to each

| Asked | Answer |
|---|---|
| The same ten docs, twenty questions and gate, with haiku alone | `TEN`; sets K and L read from the spec by `paper-sets.ts --plan … --kind doc`; one run, haiku |
| The entry carries the summary's first paragraph and no more of the summary | `summarize --first-paragraph`, below. Read in the ten entries as cb4 answered them: no line that begins `## ` before the summary's line in any of the ten |
| One summarizer, no second role or tool | The agent, its brief `roles/summarizer.md`, its task line and the judge are not changed: the agent still writes the five sections, the judge still reads them, and the tool leaves them out of the entry |
| The ten put back as they were, to the byte | `put --plain TEN` at 06:17:22; `cmp` of each text against the one read before the run: `same` for all ten |
| No summary of a doc stays on cb4 | `status` at 06:17:37: `"summarized":0` |
| The gate's figures beside the pilot's | "The gate", below |
| The cost | $0.125608 for the ten, $0.127624 with the canary |
| One line: passes or fails | Passes |

## What was built

`summarize --first-paragraph` of `tools/cloud-brain/knowledge-docs.ts`. The entry is then, 16,000 characters in all:

```
<the first paragraph>
<empty line>
Summary by summarizer (<model>), <day>, of <source>/<path> as it was with sha256 <the file the agent read>.
The whole doc is the file <file> in this Brain's brain-static, <characters>: static.get?path=<file>… Its start follows.
<empty line>
<the text the tool makes of the doc, from its start>
```

The summary's line is the one `put` already keeps a summary by, so a put of such a doc keeps the paragraph and makes
the second line and the start anew, with no change to `put`. `status --check-summaries` took the five headings in
order; it now takes those or no heading. Some of the five and not all still fails. The journal's line of a doc put
this way has `firstParagraph: true`. Without the flag the tool puts what it put before.

**Taken, and what it costs**: the flag and not a shorter prompt. A prompt that asks for one paragraph is a second
brief or a second form of answer for the one role, and the judge's rules on sections would need a second branch.
The cost is that the agent writes about 4,000 characters of sections that are thrown away. They are in no file
either: only a first answer that was sent back is kept (`D/<name>.first-answer.txt`).

```
cd <worktree> && bun test --timeout=30000 ./tests/tools/knowledge-docs-summaries.test.ts
 11 pass  0 fail  116 expect() calls
```

One test is new (`summarize --first-paragraph: …`): the entry's text to the doc's second line, no `## ` in it, a
first answer refused for a number as without the flag, the journal's line, `status`, `--check-summaries`, a put by
name that keeps the text, `put --plain` back to the text of before, and an entry with one heading of the five
failing the check. With the tool as it was (`git stash` of the one file) it fails at the entry's text and the rest
pass: 10 pass, 1 fail.

`tests/tools/sd-3b-first-paragraph-alone.test.ts` (3 tests) holds this file's headings and verdict, the spec's note
and the guide's sentences.

## Before the first put

**The worktrees.** A copy of the tool from before `sd-2-one-summarizer` (`993f75c3`) undoes a summary at a release.
At 06:04:35, of the names of `worktree.sh --list` on this machine, 7 have that commit and 6 are behind it:
`approver-persona.2`, `orch-MacBook-Pro-3`, `record-names-token-not-agent`, `record-names-token-not-agent.2`,
`topics-service`, `worktree-per-topic`, each `clean … ahead=0 … occupant=-`. A copy that has `993f75c3` and not this
task's flag keeps a first paragraph as it keeps a summary: it reads the summary's line and nothing of the sections.
Not seen: a release from one of the six in the 11 minutes the ten were summarized. All ten entries had their
paragraph at 06:13:23.

**The entries as they were.** Each of the ten read back with `knowledge.search?kind=doc&limit=5&q=doc%3A<name>` and
`loop-knowledge` at 06:04:21 and its `text` kept as `D/sd-3b/before/<name>.txt`: ten texts of 16,000 characters,
none with a summary's line. Nine are byte for byte the pilot's `D/sd-3/before`; `cloud-brain-dashboard-service` is
not, its doc having grown from 44,997 to 45,346 characters since (the cut's line says so). `status` at 06:04:35,
`origin/main@e4c87f04`: the ten `fresh`, each `cut`, `"long":49,"summarized":0`.

**The sets**, read twice before any put, 06:04:41 and 06:05:06, the same ranks both times. They are in the table
under "The gate".

## The run

```
BRAIN_BASE=cb4 bun tools/cloud-brain/knowledge-docs.ts summarize TEN --first-paragraph --usd-max 1     06:05:30 to 06:13:02
{…,"picked":10,"put":10,"dry_written":0,"refused":0,"failed":0,"refusedBefore":[],"skipped":[],"usd":0.125608,"source":"origin/main@e4c87f04"}   exit 0
```

A background command. The journal's lines of this task are the 11 after the first 31 of `D/journal.jsonl`: the
canary and ten puts, each with `firstParagraph: true`. `chars` is the file as the agent read it; `first` and
`sections` are what the agent wrote, and only `first` is in the entry.

```
at        name                                             outcome model rounds usd       ms     context chars  first sections session
06:05:40  canary                                           refused              0.002016                                          d67f2999
06:06:09  diagnosing-new-observable-platform-differences   put     haiku 1      0.007125  25917  24811   36568  1065  4299     5723821b
06:07:12  maintaining-and-updating-lopecode-and-lopebook…  put     haiku 2      0.023600  58926  35200   33549   875  4247     d2166d6e
06:08:12  pushing-cells-to-observablehq                    put     haiku 2      0.020852  55045  29346   22412  1049  4274     064dc51d
06:08:43  vendoring-npm-dependencies                       put     haiku 1      0.005829  27506  16762   17743   979  4185     bad3489a
06:09:44  cloud-brain-dashboard-service                    put     haiku 2      0.025900  57572  39850   45425   967  3424     64371d68
06:10:35  cloud-brain-flow-metrics                         put     haiku 1      0.010198  47306  25537   38674   952  4914     db6de182
06:11:09  cloud-brain-group-invites                        put     haiku 1      0.007152  31279  21113   29027  1101  3855     59e73f92
06:11:47  cloud-brain-locks-held-in-the-cluster            put     haiku 1      0.010377  35515  35917   66729   935  3208     de248c17
06:12:26  cloud-brain-record-checked-by-review-alone       put     haiku 1      0.007811  35992  21727   31147   887  4649     7ccfac76
06:13:02  cloud-brain-texts-not-read-again-after-a-change  put     haiku 1      0.006764  32611  20138   26019   867  3685     c08eb00a
```

Each of the ten puts answered `{"entered":0,"changed":1,"vectors":1}`, and each entry as put is 16,000 characters.
No line has `putSha256`. Three first answers were sent back, each for sections over 5,000 characters together
(5199, 5185, 5216): a rule on a part the entry does not hold cost a second round for three of the ten, and those
three are the three dearest.

`status --check-summaries TEN` at 06:13:19: `{"checked":10,"summarized":10,"excepted":[],"failing":[]}`. First run
of that check on an entry of cb4 with a first paragraph and no section.

**What the entry keeps of the doc.** The ten entries as cb4 answered them at 06:13:23 are `D/sd-3b/after`. The
paragraph, the summary's line and the second line take the first 1,331 to 1,571 characters, so the entry keeps
14,429 to 14,669 characters of the doc's own text where it kept 15,538 to 15,769 with no summary, and 9,601 to
11,453 with a whole haiku summary (the pilot's record). In each of the ten, what follows the second line is the
start of the text of before, character for character. The ten paragraphs with their two lines are an attachment of
the issue, `sd-3b-first-paragraphs-haiku.txt` (event 5841).

## The gate

Each reading with the paragraphs is over a minute after the last put (06:13:02) and was made three times, 06:14:14,
06:15:29 and 06:16:42, with the same ranks each time. The ranks are in the order of `TEN`; 0 is "not among the 20".
The pilot's columns are from its record.

```
                 before 06:04:41        first paragraph 06:14:14   plain again 06:18:37   | pilot: before        whole summary, haiku
K by words       0.950                  0.950                      0.950                  | 0.950                0.652
                 1  2 1 1 1 1 1 1 1  1  1  2 1 1 1 1 1 1 1  1      1  2 1 1 1 1 1 1 1  1  | 1  2 1 1 1 1 1 1 1 1 1 9 1 1 1 3  0 14 1 1
K by meaning     0.594                  0.609                      0.594                  | 0.594                0.542
                 1 12 1 1 2 2 4 2 9  1  1 11 1 1 4 2 4 2 2  1      1 12 1 1 2 2 4 2 9  1  | 1 12 1 1 2 2 4 2 9 1 1 0 1 1 6 2  0  4 2 1
L by words       0.623                  0.614                      0.623                  | 0.623                0.700
                 1 17 1 1 0 2 1 1 3  3  1 17 1 1 0 2 1 1 4  3      1 17 1 1 0 2 1 1 3  3  | 1 17 1 1 0 2 1 1 3 3 1 0 1 1 0 2  1  1 2 1
L by meaning     0.517                  0.426                      0.512                  | 0.512                0.590
                 1  0 1 1 0 1 3 2 4 11  1  0 1 4 0 1 2 4 6 11      1  0 1 1 0 1 3 2 5 11  | 1  0 1 1 0 1 3 2 5 11 1 0 1 5 0 1 1  1 2 5
```

**R5 passes**: set K by words is the same ten ranks, nine first and one second.

**Why, counted.** The count of each set-K question's words (3 letters or digits or more, lower case) that the
entry's text holds, by the pilot's rule, over `D/sd-3b/before`, the pilot's `D/sd-3/after-haiku` and
`D/sd-3b/after`. The script is the session's and is not in the repository; its first two columns of counts are the
pilot's table, number for number.

```
                                 words  before  whole summary  first paragraph
vendoring-npm-dependencies        11     11      11             11
pushing-cells-to-observablehq     15     15       7             15
cloud-brain-texts-not-read-…      14     14      12             14
cloud-brain-group-invites         13     12       7             12
cloud-brain-record-checked-…       6      6       6              6
maintaining-and-updating-…        21     19      11             19
diagnosing-new-observable-…       15     12       6             12
cloud-brain-flow-metrics          14     14       6             14
cloud-brain-dashboard-service     18     18      17             18
cloud-brain-locks-held-in-…       16     16      13             16
```

Every entry holds as many of its question's words as it held with no summary. Set K was written "from character
12500 of the kept text", and an entry with a first paragraph still holds the doc's text to about character 14,500.

## What moved

- **Set K by meaning**, 0.594 to 0.609: `cloud-brain-dashboard-service` from 9th to 2nd and
  `pushing-cells-to-observablehq` from 12th to 11th; `cloud-brain-record-checked-by-review-alone` from 2nd to 4th.
- **Set L by meaning**, 0.517 to 0.426: `cloud-brain-group-invites` from 1st to 4th, `cloud-brain-flow-metrics` from
  2nd to 4th, `cloud-brain-dashboard-service` from 4th to 6th; `diagnosing-…` from 3rd to 2nd. The two not among the
  20 before are not among them after.
- **Set L by words**, 0.623 to 0.614: one rank, `cloud-brain-dashboard-service` from 3rd to 4th.

By meaning the mean of the two sets is 0.56 before and 0.52 with the paragraphs (0.57 with the whole summaries
of the pilot, from its 0.542 and 0.590). So this shape passes the gate the whole summary failed and gains nothing the sets can show: what a
question of set L asks for is past the kept text, a paragraph of 867 to 1,101 characters holds little of it, and the
vector is made from the entry's first characters (the tool's header: "the service embeds the title and the first
1500 characters"), which are now that paragraph and its two lines and not the doc's own start. That is a reading, not a measurement. One rank is up to 0.05 of an
MRR with ten questions a set, as the pilot's record says; the fall of set L by meaning is three docs down by two or
three ranks and one up by one, read three times. Why those three fell was not looked into.

With the ten put back the four arms read as before the run, but for one rank of set L by meaning (4th to 5th), which
is the rank the pilot read at 00:42.

## Put back plain

```
BRAIN_BASE=cb4 bun tools/cloud-brain/knowledge-docs.ts put --plain TEN        06:17:22
{"put":10,"public":3,"private":7,"cut":10,"unmarked":0,"summarized":0,"plain":true,"filesWrong":0,"entered":0,"changed":10,"vectors":10,"ms":8573,"source":"origin/main@39a1de11",…}
```

The ten read back at 06:17:32 to `D/sd-3b/plain` and compared with `cmp` against `D/sd-3b/before/<name>.txt`:
`same` for all ten, and no file of the ten has a summary's line. The SHA-256 of `vendoring-npm-dependencies`'s text
is `81803eb0…` before and after the put-back, as in the pilot's three readings, and `dd2083a9…` with the paragraph.

`status` at 06:17:37, `origin/main@39a1de11`: `"stale":0,"missing":0,"unmarked":0,"summarized":0,"behind":0`, with
`"docs":89,"long":47` where it read 92 and 49 before the run. The three fewer are the docs of `cloud-brain-dev`:
`origin/main` moved during the run to a pointer this worktree's clone does not have, and the tool says so in that
line and leaves the three as they are ("the checkout of cloud-brain-dev lacks commit 1d806848"). None of the ten is
one of them.

## The cost

```
the ten                $0.125608      the sum of `usd` of the ten lines; the run's last line says the same
a doc                  $0.005829 to $0.025900, the median $0.009005
the canary             $0.002016
all of this task       $0.127624      the 11 lines
the agent's time       407.7 s in all; a doc 25.9 s to 58.9 s
the wall clock         06:05:30 to 06:13:02
the pilot, haiku       $0.137273 for the same ten, whole summaries
```

**The other long docs at that rate.** `status` before the run has 49 long docs, so 39 others, of 1,624,700
characters against the ten's 346,584 (the `M` of each `cut N of M` line), 4.69 times as much: $0.49 by doc and
$0.59 by length. Neither is a forecast, as the pilot said of its two.

## Not tried

- **A shorter prompt**, or a judge that does not hold the sections to 5,000 characters when they are not put. Three
  of the ten paid a second round for that rule.
- **The ten paragraphs read against their docs** (R7). The judge's number rule held each answer; no sentence was
  read by the writer. The reviewer has them in the attachment.
- Opus, the other 39 long docs, and the release line: not asked.
- Whether a first paragraph is worth its cost when the gate is all it meets. The sets show no gain from it; the
  issue asks for the gate, and what follows from a pass is the issue's ("on a pass, `sd-4` goes on with the
  first-paragraph form").
- Why three docs of set L fell by meaning, and the sets asked later than 3 minutes 40 s after the last put.
- A doc with a first paragraph changed and put by a release, `behind`, `due` by a tenth and `staleSince` on cb4:
  the ten held a paragraph for 4 to 11 minutes. In the tests alone.
- `summarize --first-paragraph` with `--due`, `--dry` or `--model opus`, and a doc refused twice under it.
- A release from one of the six worktrees behind `993f75c3`.
- **A whole summary that lost every heading.** `--check-summaries` takes no heading as the first-paragraph form, so
  an entry whose head is a paragraph and then text with no `## ` line passes it where it failed before. Read in the
  code, not run. Nothing puts such an entry: the judge refuses an answer without the five headings.
- **The pilot's kept first answers.** This run wrote `D/<name>.first-answer.txt` for `maintaining-…`,
  `pushing-cells-to-observablehq` and `cloud-brain-dashboard-service` (06:07 to 06:09). The first two were the opus
  run's, which `records/sd-3-pilot-ten.md` names, and are no longer on this machine.
- A whole summary and a first paragraph on cb4 at once: `status` counts both as `summarized` and its line for a doc
  does not say which.

## Read first

`knowledge.search?semantic=true&limit=6` with `loop-knowledge`, 06:02:55:

| Words | Found | Used |
|---|---|---|
| summary first paragraph alone in a long doc's entry, the rest the doc's own words | `doc:cloud-brain-docs-summarised-for-search` 1.000, `doc:pm-second-summarizer-role` 0.665, `doc:cloud-brain-paper-summarizer-persona` 0.613 | the first: the form of an entry (piece 2) and R5. The second is why no second role or brief was made |
| pilot of ten docs summarised, search by words lost passages, put back plain | the spec 0.900, `finding:2026-10-11:knowledge-search:any-word-and-name` 0.658, `doc:knowledge-reranking` 0.595 | nothing more |

Also read: `records/sd-3-pilot-ten.md` whole, for the order of the pilot and its figures; `knowledge-docs.ts` from
its header to `summarize`; `summarize` and `agentRunner` of `summarize-papers.ts`.
