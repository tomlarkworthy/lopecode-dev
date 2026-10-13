# sd-4-the-rest-and-the-release-line: a first paragraph on each of the 49 long docs of cb4; a release names the docs that wait for one

**Done as the owner chose, and nothing here measures a gain from it.** Task 4 of
`plan/cloud-brain-docs-summarised-for-search.md`. The pilot's second try (`records/sd-3b-first-paragraph-alone.md`)
found that a first paragraph leaves the search by words where it was and does not raise the questions from past the
kept text. The owner was shown that and answered "1 B" (comment 6005 of this issue, quoting him): go on, paragraphs on
every long doc and the step at each landing. This task did not ask the two sets again.

Written 2026-10-13 by the task's writer, round 1, token `impl-52b6f4`, in the worktree `bm-sd-4-the-rest`. Times are
`date` on this machine or a journal line's `at`, CEST, that day. `D` is `<main checkout>/tools/cloud-brain/.emitted/docs`.
The task is an act and a change: 49 puts to the knowledge base of cb4 with `loop-docs`, through `knowledge-docs.ts`,
and a change to that tool, to `lock.sh`, to two briefs, `SKILL.md` and the guide. No seed, no deploy.

## The run

```
07:30:14  status                      "docs":92,"long":49,"cut":49,"summarized":0, and all 49 under "due"   origin/main@d133b284
07:30:28  BRAIN_BASE=cb4 bun tools/cloud-brain/knowledge-docs.ts summarize --due --first-paragraph --usd-max 2      (a background command)
09:08:46  {…,"picked":49,"put":48,"dry_written":0,"refused":1,"failed":0,"refusedBefore":[],"skipped":[],"usd":0.661978,"source":"origin/main@d133b284"}   exit 0
09:08:56  BRAIN_BASE=cb4 bun tools/cloud-brain/knowledge-docs.ts summarize cloud-brain-brain-docs-entered-by-hand --first-paragraph --again
09:09:51  {…,"picked":1,"put":1,…,"usd":0.008417,"source":"origin/main@1a6e8f2e"}
09:10:01  status                      "docs":94,"long":51,"cut":2,"summarized":49,"behind":4,"due":[two specs landed during the run],"refused":[]   origin/main@c5281c4b
```

- **The 98 minutes are not the run's time.** The machine slept from about 07:35 to 08:35: the journal has a put at
  07:35:44 and the next at 08:35:31, of a doc whose agent is written with 126 s. The agents' own time is 2,311 s for
  the 52 lines, a doc 28.8 s to 126.4 s, the median 43.3 s. `caffeinate -i` was refused in this shell ("Failed to
  create PreventUserIdleSystemSleep assertion"), so a later run of this length can sleep the same way.
- **One doc was refused twice**, `cloud-brain-brain-docs-entered-by-hand`: its sections were 5,974 and then 5,288
  characters, over the judge's 5,000. The sections are not put in this form; the rule is the judge's all the same
  (`sd-3b`'s record, "Not tried"). Run again with `--again`, as the spec's task 3 has it for a doc refused twice, it
  was put at the first answer.
- **16 of the 49 puts took a second round**: 7 for an empty line before the first heading, 9 for sections over 5,000
  characters. No put has a number the judge refused (R7's reading of the journal: every `put` line's last `refused`
  is `[]`).
- The first paragraphs are 644 to 1,166 characters. None was read against its doc by the writer.

The journal's lines of this task are lines 43 to 94 of `D/journal.jsonl`, 52 lines: a canary (`at` 1791869440009,
07:30:40), 48 puts and one refusal, a second canary, one put. Each put has `firstParagraph: true`.

```
sed -n '43,94p' D/journal.jsonl | <sum of usd, of ms, the largest context>
lines 52   usd 0.674005   seconds 2311   context 86854
a doc      $0.005873 to $0.025056, the median $0.011003
canaries   $0.002051 and $0.001559
```

`sd-3b` estimated $0.49 by doc and $0.59 by length for 39 docs beyond its ten; the 49 cost $0.670 without the
canaries, $0.0137 a doc against the ten's $0.0126.

## What cb4 holds, read after the run

```
09:11:17  status --check-summaries      {"checked":52,"summarized":49,"excepted":[],"failing":[],"source":"origin/main@32569c72"}   exit 0
```

52 long docs by then: three specs had landed since 07:30 and have no summary (`"state":"no summary"`, due under an
hour, which the check does not fail before 24 hours). Four of the 49 are `behind`: their files changed on
`origin/main` during the run by under a tenth of their lines, and the docs step of those landings kept the paragraph.

One entry was read as a searcher gets it, `knowledge.search?kind=doc&q=calling-a-cloud-brain-from-this-checkout` with
`loop-knowledge` at 09:11:27: 16,000 characters, a paragraph of 892 that begins "This doc says how to call the cb4
scratch Cloud Brain", no line that begins `## ` before the summary's line, then

```
Summary by summarizer (haiku), 2026-10-13, of lopecode-dev/knowledge/calling-a-cloud-brain-from-this-checkout.md as it was with sha256 a53e9699….
The whole doc is the file docs/lopecode-dev/knowledge/calling-a-cloud-brain-from-this-checkout.md in this Brain's brain-static, 30964 characters: static.get?path=docs/…. Its start follows.
```

The other 48 were not read; `--check-summaries` holds each to that form.

**The worktrees.** A copy of the tool from before `993f75c3` puts the cut text over a summary at a release. At 07:30,
of the 17 names of `worktree.sh --list`, five were behind that commit: `approver-persona.2`,
`record-names-token-not-agent`, `record-names-token-not-agent.2`, `topics-service`, `worktree-per-topic`, each
`clean … ahead=0 … occupant=-`. A landing rebases before its release, so the risk is a release by hand from one of
the five. `"cut":2` at 09:10 is the two new specs: no summary had been undone by then.

## What was built

**`put --stale` names the docs that wait for a summarizer.** Before its last line, and only with `--stale`:

```
summaries due: cloud-brain-fly-exec-for-blessed-services, cloud-brain-page-modifications-how-they-are-kept, cloud-brain-rules-checked-and-stale-knowledge-seen
nothing to put
```

That is the worktree's copy on cb4 at 09:11:37, the three specs with no summary. A doc is named when `summarize --due`
would start an agent for it: long, with no summary or changed by over a tenth of its lines since, not refused twice
at its file, and with no `.running` file under ten minutes old. Eight names, then `and N more`.

**`lock.sh release land` prints the line with the command**, after `docs (<brain>): …`, when the tool exited 0:

```
summaries due (cb4): <names>. A writer or a spec writer runs, and names the journal's lines in its report: BRAIN_BASE=cb4 bun <the directory of the lock.sh that ran>/knowledge-docs.ts summarize --due --first-paragraph --usd-max 1 (a reviewer leaves it: the next landing prints it again)
```

The release starts nothing and stays exit 0. It has not been printed by a release on cb4 when this is written: the
release of this task's landing is the first that can; what it printed is in a comment the writer makes on the issue after the landing.

**Chosen against the spec, four times**, each also in the spec's note "As built, task 4":

- The spec has the line "made from the tool's last line", with `due` in it. A line of the tool's own was taken:
  `put`'s last line is printed whole as `docs (cb4): …`, and 49 names in it would be printed twice at a landing. The
  cost is a second line for `lock.sh` to find, by `sed -n 's/^summaries due: //p'`.
- The spec's line "names every doc that is due". Eight are named and the rest counted (`and N more`): at 07:30 the
  line would have had 49 names, about 1,800 characters in every landing's output. The cost is that a writer sees 8 of
  them; the command runs all.
- The command has `--first-paragraph`, which the spec's line has not: it is the form the owner chose. `summarize --due`
  typed with no flag still puts a whole summary, the form that lost passages in the pilot. Making the flag the default
  would close that; it changes what task 2's tests hold, and was not done.
- The sentence for the implementer is in the page `agents/implementer/landing.md`, at the release, and not in
  `agents/implementer.md`: the brief was 19,996 characters of the 20,000 that `implementer-brief-core.test.ts` allows at `d133b284`, where the
  task began, and is 19,961 after the rebase of 09:12 (`len()` of the file in python3, both).
  A writer who lands with `land.sh` reads no page; `land.sh` prints the release's lines, and the line itself says who
  runs the command. For the overseer: a sentence in the brief's step 10 needs about 60 characters cut elsewhere.

**A put after a refusal ends it.** At 09:10 `status --check-summaries` exited 1 on one doc:

```
{"name":"cloud-brain-brain-docs-entered-by-hand","state":"summarized","fails":["refused twice at this file (the journal)"]}
```

Its summary had been put a minute before with `--again`. `refusedAt` read any refusal at that file; it now reads the
last line of the doc at that file among its refusals and puts. The check at 09:11:17 above is with the change.

**The time it adds to a release.** On cb4 at 09:11, 52 long docs, nothing to put: 3.4 s with the line and 1.9 s with
the tool of before, one run each. The 1.6 s is a `git log` a long doc.

**The texts.** `SKILL.md` step 5: the paragraph is "The role `summarizer`", for a paper and a doc, key
`cost/<id>/summarizer/<round>`; the list of roles has `summarizer`. `agents/spec.md` step 6 and
`agents/implementer/landing.md`: run the command in the background, read its last line, name the `at` of the first
journal line. The guide (`knowledge/calling-a-cloud-brain-from-this-checkout.md`): the fourth line of a release, who
runs it, that the 49 long docs of 07:30 have a paragraph since 09:09, and the role's name where it speaks of the papers.

## The tests

```
cd <worktree> && bun test --timeout=30000 ./tests/tools/lock.test.ts ./tests/tools/knowledge-docs-summaries.test.ts ./tests/tools/knowledge-docs.test.ts ./tests/tools/ps-4-docs.test.ts ./tests/tools/sd-3b-first-paragraph-alone.test.ts ./tests/tools/sd-2-one-summarizer.test.ts ./tests/tools/sd-4-the-rest-and-the-release-line.test.ts
 84 pass  0 fail  918 expect() calls  (7 files)
```

Four tests are new, two of `lock.test.ts` (the line after a put and after `nothing to put`, with the caller's Brain;
no line with no name, an empty list, a tool that failed, a release of `cb4`; the whole path of the copy beside a
`lock.sh` called by a relative path) and two of `knowledge-docs-summaries.test.ts` (the line with a put and with
none, not for a put by name, `--all` or `--plain`, not for a doc running, refused twice or summarized, again for one
changed by 30 lines of 200; nine docs as 8 names and `and 1 more`). One case was added to the test of a doc refused
twice. Three expectations of older tests were changed with what they hold: two outputs of `put --stale` that now
begin with the line, and the paragraph's name in `ps-4-docs.test.ts`. Two sentences of the guide that this task made
untrue are held by older tests, which were changed with them: `sd-3b-first-paragraph-alone.test.ts` ("None is on
cb4 since 06:17") and `sd-2-one-summarizer.test.ts` (the command for the due docs, which now has `--first-paragraph`).

Without the change, each with the file of `d133b284` in the tool's place (`LOCK_SH=`, `KNOWLEDGE_DOCS_TS=`):
`lock.test.ts` 26 pass, 2 fail; `knowledge-docs-summaries.test.ts` 10 pass, 3 fail; `knowledge-docs.test.ts` with it,
2 more fail.

The whole suite, `tests/tools/suite.sh`, after the last edit (started 09:33 CEST, after the advisor's findings were mended): `1119 pass, 0 fail, 9248 expect() calls, 114 files`, as at 09:25 before them. This line was written before the run and the run was read against it.

## Not tried

- **Whether the search is better.** Sets K and L were not asked with 49 paragraphs in place. `sd-3b` measured ten.
- The 49 paragraphs against their docs. The judge's number rule held each; one entry's head was read.
- The line printed by a release on cb4 before this landing, and the command run by an agent other than this writer.
- Two agents that run the command at once on one machine (the `.running` file is the only guard, a doc at a time),
  or on two machines (`D` is one machine's: the spec says so and does not mend it).
- A doc due again by a tenth on cb4, its `staleSince`, and a paragraph written a second time. In the tests alone.
- A release by hand from one of the five worktrees behind `993f75c3`.
- `--usd-max 1` reached by the release's command; a doc refused twice under it on cb4 was seen once, above.
- **The section of the guide that `ac-5-prose-names-the-two-shapes.test.ts` holds inside the kept part of its entry.**
  The test bounds it at 15,000 characters of the file. With a paragraph the entry keeps less of the doc: by this
  writer's count the section ends at character 14,504 of the text the tool makes and the entry of 09:11 kept about
  14,640, so it is inside by about 130. A longer paragraph at a later summary (the limit is 1,458 for this title)
  would cut the section's end. The test was not changed.
- Opus. A name outside `[A-Za-z0-9@._-]` in the line: such a doc is a `badname` and is in no put.
- A cost event of the role `summarizer`: it is the orchestrating session's to write, from the figures above.

## Read first

`knowledge.search?semantic=true&limit=5` with `loop-knowledge`, 07:30:

| Words | Found | Used |
|---|---|---|
| summaries due line printed by lock.sh release land | `doc:cloud-brain-locks-held-in-the-cluster` 0.762, `doc:cloud-brain-brain-docs-entered-by-hand` 0.724, the spec 0.719 | the spec's piece 4; the second is where the docs step is designed, read in `lock.sh` itself |
| cost event role summarizer written by the orchestrator | `doc:pm-second-summarizer-role` 1, `doc:cloud-brain-orchestrator-as-steps` 0.812, `doc:cloud-brain-run-cost-is-part-of-the-issue-model` 0.707 | nothing more than `SKILL.md` step 5 has |

Also read whole: `records/sd-3b-first-paragraph-alone.md`, `knowledge-docs.ts`, the release of `lock.sh`.
