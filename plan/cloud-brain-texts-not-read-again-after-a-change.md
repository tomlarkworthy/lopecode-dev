# Cloud Brain: a sentence that was seen to be untrue is filed, and nobody mends it

Spec of the project `texts-not-read-again-after-a-change` on cb4's tracker. Written 2026-10-11 from
21:34 (event 2277's `at`, the take) to 21:46 CEST (the first commit's author time, `git log --format=%ai`), from `lopecode-dev` `origin/main` at
`f7d03412` and the tracker at event 2277. Nothing here is built. Every measurement below was run between the take and 21:44 (a `date`
before the file was written); the one time read at a run is the 21:40 of the checks. Not read by a fresh agent before
the submit: the loop's reviewer reads it.

The project's title says "nothing finds the texts that speak of a thing". The record says
otherwise. All six sentences were found, each by an agent of the loop, within the round of the
change or by one `grep`. Each was then filed as a feedback ticket, three with the fix in one line, because
no brief let the agent that saw it mend it. Two of the six were never true, and one was made
untrue by no change at all. So this spec proposes a way to mend, and one line of search, and no
tool that finds.

## What was asked

The owner has said nothing of this project. It was opened by the overseer (event 2154) from six
feedback tickets. His words that bear on it, all in `philosophy.md`:

- 2026-10-10, line 3: "self documenting and "obvious" how to use it from an agents perspective."
- 2026-10-11: "I think if an agent has spare context left and it already knows how to fix an issue
  it should jsut do it as a quick win while it is there."
- 2026-10-11, event 2099: "Reviewers should not be padenatic about world measurements, only
  functional quality, not background information."
- 2026-10-11, of the loop: "the real performance improvement would be reduce review rounds"
  (quoted in the reviewer's brief).

The overseer's body leaves three things under "Not known": how many such sentences no reviewer has
met; whether a search of the docs for the names a change touches, at the landing, would have found
the six; whether a spec is kept true after its tasks land. The first two are measured below. The
third is answered in the design, by line 2 (the smaller side, easy to undo).

## The reports gathered

`list?parent=texts-not-read-again-after-a-change` answers six parts. `specs-kept-in-the-cluster` is
linked and is no part.

| Report | The sentence, and what made it untrue | Becomes |
|---|---|---|
| `seen-spec-says-note-under-panels` (1263) | `plan/cloud-brain-dashboards-share-series-and-controls.md` lines 243 and 325, "the note under the panels". Never true: at the spec's first commit, `1357813c`, the cell `dashboard` of `cloud-brain.ojs` draws the note before the grid | R1 |
| `seen-dashboard-spec-owner-reaches-every` (1895) | `plan/cloud-brain-dashboard-service.md` line 294, "The owner and his tokens reach every one." `dsv-3-dashboards` (`bfc72c07`) built otherwise and its record says why | R2 |
| `seen-knowledge-renew-600-s-more` (1962) | `knowledge/changing-and-deploying-a-cloud-brain-worker.md` line 43, "`renew` gives the holder 600 s more". Never true: the sentence was added by `fba5d851`, the commit of `lk-3` that made `renew` | R1 |
| `seen-step-10-omits-docs-line` (1841) | `agents/implementer.md` line 259, "It prints when the lock was taken and when it went." True until `b7cbfff7` (`bd-2`), in a file that commit did not touch. The writer of `bd-2` saw it and said so (comment 1643, "Not edited": the brief is the overseer's) | R1 |
| `seen-spec-brief-says-not-yet-run` (1920) | The reviewer's brief on the Brain, "A spec": "First written 2026-10-11; not yet run." Made untrue by use, not by a commit: 19 reviews of a spec by event 1920 | R3 |
| `seen-token-name-in-other-refs` (1580) | `brain-browser.ojs` lines 97 and 131, `brain-blob.ojs` line 36, `cloudflare-iac.ojs` line 1628 name `token:NAME` as a caller. The core has sent `owner` with the holder `secret:NAME` since 2026-10-10 | R4 for the first two files. The third is in the owner's list |
| The body, "nothing finds the texts" | | R5 |
| The body, "which of the six he would count as background" | | The owner's choice, below |

The requirements:

- **R1.** The three sentences read as the tickets' one-line fixes give them.
- **R2.** The sentence of the dashboard spec has what was built beside it, with the task and its
  record. The approved sentence stays.
- **R3.** "A spec" of the reviewer's brief does not say "not yet run".
- **R4.** The references of `brain-x-browser` and `brain-x-blob` do not name `token:NAME` as a
  caller the core sends.
- **R5.** An agent that sees a sentence its change made untrue, in a text another agent acts by,
  mends it in the same landing, or hands the overseer the line when the file is not its to edit.
  It looks for such sentences once before the submit.

## What exists today, measured

**Who saw each of the six, and when.** From the `opened` event of each ticket (`get?id=`, `at` read
with `date -r`):

```
1263  18:46:38  the reviewer of ds-2, round 2          fix in the ticket: two lines read "above the panels"
1580  20:06:21  the writer of knowledge-by-says-…      by `grep token:NAME tools/cloud-brain/*.ojs`
1841  20:25:26  the reviewer of bd-2                   fix in the ticket, one sentence; the writer had seen it too
1895  20:40:21  the reviewer of dsv-3, round 1         no fix given; names the record that says why
1920  20:44:13  a reviewer of a spec, in its own brief
1962  20:48:09  the reviewer of lk-3                   fix in the ticket: "600 s from the renew"
```

Six of six were seen by a writer or a reviewer of the loop. Three tickets carry the mend (1263, 1841, 1962). At
`origin/main` `f7d03412` all six sentences still stand (`git grep` of each phrase).

**Why the agent that saw it did not mend it.** Read in the briefs as they are:

- A reviewer mends "a note in a document" only "of this change", and "not a file the change did
  not touch" (the reviewer's brief on the Brain, put 21:13 CEST, after all six tickets). For
  anything else: "you do not fix it … Open the feedback ticket below, with the fix in one line."
- A writer holds its own sentences (`agents/implementer.md` step 9). A sentence elsewhere is a
  quick win, an issue of its own with its own review: 167,000 tokens at the least
  (`philosophy.md`, line 5).
- A brief is the overseer's, at two edits an oversight (`agents/overseer.md`). `oversight.md` line
  471: "Two puts to the reviewer's brief wait for the next oversight, since two edits were taken",
  one of them the line of 1920.
- No brief says who mends a spec after its approval. Review 1202 of `ds-2` sent three texts back
  that had followed the spec; round 2 mended the three and left the spec
  (`oversight.md` line 397: "A comment and not a task: a round for two lines of a plan file costs
  more than the two writers reading one comment").

**What it has cost.** The round after review 1202: 195,204 tokens for the writer and 89,946 for
the review (`plan/cloud-brain-record-checked-by-review-alone.md`, the table of costs). Six
tickets. `ds-3` and `ds-4` were sent to the spec with a comment each (1339, 1340). No other round
is on the record for these six.

**Would a search for the names a change touches have found them** (Not known 2).
`git grep -n -F` at each change's commit over `knowledge`, `plan/cloud-brain-*.md`, the briefs and
`tools/cloud-brain/*.md|*.ojs|*.sh|*.ts`:

| | Name | Lines printed | The stale line among them |
|---|---|---|---|
| 1841 | `release land`, at the parent of `b7cbfff7` | 18 in 7 files | yes, `implementer.md:239` as it then was |
| 1580 | `token:NAME`, `token:<name>`, at `origin/main` | 50 in 15 files | yes, all four; 12 are of `plan/cloud-brain-authority.md`, which says what was |
| 1962 | `renew`, at `fba5d851` | 1 in `knowledge/` (90 in all) | yes, and the commit wrote it |
| 1895 | `dashboard.put`, at `bfc72c07` | 6 in the spec | the passage, not by the sentence's own words |
| 1263 | none: a layout, no name | | no |
| 1920 | none: no commit | | no |

So a name the writer chooses finds two of six that the writer had not already in hand (1841,
1580), and in 1841 the writer knew. The other four were read where they stood.

**Would a tool that picks the names find them.** The method of DOCER (under "Read"): a name that
the change takes out of the code and that the docs still hold. `names.py`, at the end of this
file, over the last 150 commits that touch a tool or a seed:

```
python3 names.py origin/main 150
  commits 150 with a line 4 lines 4 max 1
```

Four lines in 150 commits, and none is of the six: `release`, `renew`, `dashboard.put` and
`token:` are all still in the code. The six are sentences about what a thing does, and the thing
kept its name.

**How many no reviewer has met** (Not known 1). Not counted. The six phrases, searched over the
same files, gave three more that no ticket names:

```
knowledge/working-with-cloud-brain-remote-lopecode-cluster.md:41   "(written 2026-10-10, not yet run as a loop)"   2277 events on the record
.claude/skills/brain-maintenance/agents/spec.md:9                  "Not yet run"                                    28 stays in `spec` (issue-stats.ts)
plan/specs/cloud-brain.html, R16                                   "owner, token:NAME, a DID or anonymous"          the owner's spec, not edited on disk
```

Three in six searches is not a rate.

**1580, read against the code.** The ticket says "Not read against what those three services do".
Read in the seeds at `f7d03412`: `brain-blob.ojs` line 191 still has `if (who.startsWith("token:")) return { all: true, stamp: ["by:" + who] }`,
and line 189 stamps a delegation's upload `by:d:<id>`. `brain-browser.ojs` line 99 says a call under
a delegation has the owner `d:<id>`; its test at line 1712 still sends `token:laptop`. So the
branches for `token:` are in the code and no caller reaches them
(`plan/cloud-brain-backlog.md` line 800: "no caller has that name now"). The sentences are untrue
of what a token's call does today. Whether a blob tagged `by:token:NAME` before 2026-10-10 is
still kept on cb4 was not read.

## The design

Three tasks, a text for the overseer, and one choice that is the owner's.

**R1, R2 and the two found here: one task mends six lines.** No seed, no deploy.

```
plan/cloud-brain-dashboards-share-series-and-controls.md:243,325   "under the panels" -> "above the panels"
knowledge/changing-and-deploying-a-cloud-brain-worker.md:43       "600 s more" -> "600 s from the renew"
agents/implementer.md:259                                          after "…when it went": then one line `docs (cb4): …`, and `not entered (…)` is no failure of the landing
plan/cloud-brain-dashboard-service.md:294                          after "reach every one.": (As built, `dsv-3-dashboards`, 2026-10-11: they read every one and write no member's and no built-in name; `tools/cloud-brain/records/dsv-3-dashboards.md`.)
knowledge/working-with-cloud-brain-remote-lopecode-cluster.md:41   "not yet run as a loop" -> "run as a loop since that day"
agents/spec.md:9                                                   "Not yet run: say" -> "Run since 2026-10-11: say"
```

The two lines of the dashboards spec are mended in place: they say what the page draws, which the
owner did not choose. The line of the dashboard-service spec is a choice he approved, so it stays
and what was built is put beside it. `plan/cloud-brain-authority.md` does the same under "Built so
far". This holds wherever `specs-kept-in-the-cluster` puts a spec.

**R3: a text for the overseer.** The reviewer's brief is a file of the Brain, put with `loop-roles`,
which `rules.md` gives to the overseer alone (`seen-writer-put-brief-with-loop-roles` is open for a
writer that did). Task 2's record carries the line: "First written 2026-10-11; not yet run."
becomes "First written 2026-10-11; 19 reviews of a spec by event 1920."

**R5: one item in the writer's list, and the same words in the reviewer's brief.** Step 11 of
`agents/implementer.md`, "Before the submit, read your change as the reviewer will", gains a ninth
item:

> - What you changed is spoken of elsewhere. For each command, method, flag or step whose
>   behaviour you changed, `git grep -n -F '<name>' -- knowledge 'plan/cloud-brain-*.md' .claude/skills/brain-maintenance 'tools/cloud-brain/*.md'`,
>   and read the lines in files you did not touch. One your change made untrue is mended in this
>   landing. In the spec of your task, when the sentence is a choice the owner approved, it stays
>   and gains "(As built, `<id>`, <date>: …; the record.)". In a file that is not yours (the
>   reviewer's brief on the Brain, a seed whose Worker you do not deploy, `rules.md`,
>   `philosophy.md`), the line and its mend go in your comment under "For the overseer". Say in the
>   comment what you searched for and how many lines it printed.

(As built, `fb-batch-role-briefs`, 2026-10-13: the command of the brief has `-e` before the name,
`git grep -n -F -e '<name>' -- …`. As written above it answers `error: unknown option` and exit 129 for a name
that begins with a dash, and a flag is one of the four things the item names; `seen-ninth-item-grep-refuses-a-flag`,
the record.)

A writer edits `implementer.md`, `spec.md` and `SKILL.md` for a fact about a tool its change
altered: `lk-3` did (`fba5d851` changes four briefs) and passed review. The item says so, and says
no more: a step, a check or a refusal of a brief is still the overseer's.

The other half is the reviewer's brief, and it is the owner's choice below. Its text is written in
task 2's record and put by the overseer after his word.

**R4: one task, two deploys.** The three sentences of `brain-browser.ojs` (97, 131) and
`brain-blob.ojs` (36) say what the core sends now: `owner`, with the holder `secret:NAME`, and the
owner `d:<id>` or the stamp `by:d:<id>`. A reference is a cell of the seed, so each is a deploy
the loop may make. The `token:` branches and the tests that send `token:laptop` are left: taking
code out is another change, and the backlog has its line. This task lands last and is the one to
drop if the owner reads line 5 against it: no agent is on the record as misled by these three
(the one that was, `knowledge-by-says-owner-for-a-token`, is done).

Not chosen:

- *A tool at the landing that prints the docs' lines for names the change removed.* Four lines in
  150 commits, none of the six.
- *A tool that prints the lines for every name the diff holds.* `renew` alone prints 90. A list
  that long is not read; the writer knows which two or three names it changed.
- *`knowledge.search` in place of `git grep`.* It answers a doc, not a line, and an entry holds
  16,000 characters of files that run to 83,849 bytes. Not run on the six.
- *A test that holds each sentence by its letters.* The body has the case: the test of
  `knowledge-by-says-owner-for-a-token` held the wrong sentence and would have failed on its
  correction (review 1624).
- *A reviewer that sends the change back for such a sentence.* 285,150 tokens for the one round on
  the record, for three lines.
- *A quick-win issue for each.* Six rounds of 167,000 tokens or more for six lines.
- *A rule against writing "not yet run".* Three lines carry it; the sentence asks the first agents
  for a report, and that is worth having. They are mended once, here.
- *Rewriting an approved spec to what was built.* It loses what he approved. A line beside it is
  undone by deleting it.

## How each requirement is known to be met

Each is a command an agent runs with no token. "Today" was run at 21:40 CEST in a worktree at
`f2637f36`. "After" was run there with task 1's six edits made, which were then taken back
(`git checkout --` of the six files).

| | Check | Today | After |
|---|---|---|---|
| R1 | `grep -c "under the panels" plan/cloud-brain-dashboards-share-series-and-controls.md` | 2 | 0 |
| R1 | `grep -c "above the panels"` of the same | 1 | 3 |
| R1 | `grep -c "600 s more" knowledge/changing-and-deploying-a-cloud-brain-worker.md` | 1 | 0 |
| R1 | `grep -c "600 s from the renew"` of the same | 0 | 1 |
| R1 | `grep -c 'docs (cb4)' .claude/skills/brain-maintenance/agents/implementer.md` | 0 | 1 |
| R1 | `grep -c "not yet run as a loop" knowledge/working-with-cloud-brain-remote-lopecode-cluster.md` | 1 | 0 |
| R1 | `grep -ci "not yet run" .claude/skills/brain-maintenance/agents/spec.md` | 1 | 0 |
| R2 | `grep -c "As built" plan/cloud-brain-dashboard-service.md`, and `grep -c "reach every one"` | 0, 1 | 1, 1 |
| R3 | `curl -s https://cb4.endpointservices.workers.dev/static/cloud-brain-dev/roles/reviewer.md \| grep -c "not yet run"` | 1 | not run: it reads 0 after the overseer's put, which no task makes |
| R4 | `curl -s "https://cb4.endpointservices.workers.dev/xrpc/com.lopecode.brain.getSource?worker=brain-x-browser&part=reference" \| grep -o 'token:NAME\|token:<name>' \| wc -l`; the same of `brain-x-blob` | 2; 1 | not run: it reads 0 and 0 after task 3's two deploys |
| R5 | `grep -c "What you changed is spoken of elsewhere" .claude/skills/brain-maintenance/agents/implementer.md` | 0 | not run: 1 after task 2, whose test holds it |
| R5, in use | At an oversight, the comments of the submits since task 2: how many say what was searched and the count of lines, and how many `seen-…` tickets were opened for a sentence a change made untrue | | read by the overseer; no condition of a task |

`bun test ./tests/tools` in that worktree gave 314 pass and 1 fail with the edits and the same
without them. The fail is `issue-lock-sql.test.ts`, which reads a build the worktree does not have
(`tools/cloud-brain/.emitted/cloud-brain.html`). A doc alone still submits a count, so each task
adds a test under `tests/tools/` that reads the files as they are and fails before the edit.

## The tasks, in the order they land

Each is one writer and one review.

1. `tx-1-six-lines`: R1, R2 and the two found here. Six files, the six edits above, a test file
   that holds the "After" column. No seed, no deploy. It closes 1263, 1895, 1962 and 1841 with the
   commit as the reason.
2. `tx-2-writer-searches-before-the-submit`: R5 and R3. The ninth item of step 11 of
   `agents/implementer.md`, as written above, and its test. In its record, for the overseer: the
   line of "A spec" (R3), and the paragraph of the reviewer's brief under the owner's choice,
   marked as waiting for his word. 1920 is closed by the overseer with its put.
3. `tx-3-two-references`: R4. Three sentences in two seeds, their Workers deployed and verified as
   step 10 of the writer's brief has it. It closes 1580, with the line of `cloudflare-iac.ojs`
   named in the reason as the owner's.

Tasks 1 and 2 both edit `agents/implementer.md`, at lines 259 and 286: task 1 lands first. Task 3
touches no file of the others.

## What only the owner can do

- **One line of `cloudflare-iac.ojs`** (1628, `caller.id`: "`token:NAME`"). The deployer's hash
  covers that file. For his next deploy of the deployer: the row reads `owner`, `anonymous`,
  `deployer`, `did:plc:…`, `worker:brain-x-NAME`, with a token's call named by `caller.holder`.
- **R16 of `plan/specs/cloud-brain.html`** says the kernel sets `x-brain-caller` to "owner,
  token:NAME, a DID or anonymous". The spec is his and is not edited on disk.
- **One choice.** It widens what a role may write, which line 1 as read in `philosophy.md` keeps
  from an agent.

  The loop exists so that the Brain's tools and docs get better without him. A reviewer of the
  loop reads a change after its writer and may mend a small thing in a document of that change.
  On 2026-10-11 four reviewers each found a sentence that the change under review had shown to be
  untrue, in a guide, a spec or a brief (1263, 1841, 1895, 1962). None could mend it by the brief
  of that hour. Each opened a ticket, three with the fix in one line. The tickets are this project. The next writers read the
  sentences as they stood; one round of 285,150 tokens is on the record for it.

  - **A. The reviewer mends it.** The mend rule of the reviewer's brief reaches a `knowledge/*.md`
    or `plan/*.md` the change did not touch, when the change under review is what shows the
    sentence untrue and the fix is one sentence. Never a brief, a seed or `rules.md`. For it: the
    agent that holds the evidence makes the fix, at no round; 1263 and 1895 would have been mended
    within the review that saw them (1962 is reached by the rule as it is since 21:13: `lk-3`
    touched that guide; 1841 is a brief and is reached by neither). Against it: nobody reads the reviewer's mend, and a
    reviewer may then change a guide that every agent reads on a judgment of its own.
  - **B. The reviewer files it, as today**, and task 2 has the writer search first. For it: every
    line of a guide is written by an agent whose work is reviewed. Against it: what a writer's
    search misses (four of six, by the table above) waits for a ticket, an oversight and a task.

  The writer would take A, by line 2 and by his words of event 2099 ("only functional quality"):
  a sentence the next writer builds from is not background, and a round is the dearest way to
  change one. To answer: "A" or "B" as a comment on the project. Tasks 1 to 3 do not wait.

## Read

- The Brain, five searches with `loop-knowledge` (`knowledge.search?semantic=true`):
  "a sentence in a doc that became untrue after the behaviour changed", "stale documentation found
  when code changes", "keep a spec true after its tasks land, as built", "search the docs for the
  names a change touches", "documentation drift outdated references code comment inconsistency".
  Used: `doc:cloud-brain-record-checked-by-review-alone` (read whole: the costs of a round, the
  class S of review 1202, and its "Not offered: a reviewer that also mends `SKILL.md`, a knowledge
  doc or a seed's reference", which choice A above reopens for a knowledge doc and a plan only);
  `doc:cloud-brain-brain-docs-entered-by-hand` (headings and the table of checks: it keeps the
  Brain's copy equal to the file); `doc:cloud-brain-dev-philosophy`. Returned and not used:
  `doc:cloud-brain-locks-held-in-the-cluster` (grepped for the briefs its tasks edit),
  `doc:reviewing-a-notebook-module`, `module:tomlarkworthy:cloud-brain-specs`, arXiv 2309.11495
  (title only).
- Outside, two web searches, read as the search's summary only; no paper opened.
  "detecting outdated code element references in software repository documentation": Tan, Wagner
  and Treude (DOCER) take the names of code elements out of a README or a wiki with regular
  expressions and flag one whose code is gone; 28.9% of the 1000 most-starred GitHub projects had
  one; a GitHub Action runs it at a pull request.
  [arxiv.org/abs/2212.01479](https://arxiv.org/abs/2212.01479),
  [arxiv.org/abs/2307.04291](https://arxiv.org/abs/2307.04291). This is the first "not chosen"
  above, and `names.py` is a port of the idea, not of their tool.
  "code-comment inconsistency just-in-time detection when code changes": Panthaplackel et al.
  (AAAI 2021) train a model on 40,688 pairs of a comment and a code change to flag a comment
  before the commit. [arxiv.org/abs/2010.01625](https://arxiv.org/abs/2010.01625). It is of a
  comment beside its method; the six are in files far from the code. Not used.

## Not done

- No count of the untrue sentences that nobody has met. The three found here came from searching
  six phrases already known.
- `names.py` reads names of four shapes (a flag, a dotted method, a camel-case word, an upper-case
  constant) in `tools/cloud-brain/*.ojs|*.sh|*.ts`. A plain word such as `release` is not one, and
  the three files of `cloud-brain-dev` and the Brain's `roles/` are not in what it searches.
- The reference of the deployer was not read from cb4: `getSource?worker=brain-deployer&part=reference`
  gave no match for `token:` and the answer was not looked at.
- What choice A costs a reviewer is not measured.
- The ninth item's `git grep` does not read the reviewer's brief, which is not in git. A writer
  that changes what that brief speaks of does not see it by this search.

## What misled the writer of this spec

- The project's body gives one cause for the six ("true when written … in a file the change did
  not touch"). `git log -S` of each phrase showed two that were never true and one written by the
  change itself. Step 2 of the brief says a part is data; the body of the project is too.
- `spec.md` step 5 names no place for a script a measurement was made with, and step 6 lands the
  file only. `names.py` is below, as `rule.py` is in the spec of `record-checked-by-review-alone`.

## `names.py`

```python
import subprocess,re,sys
head=sys.argv[1]; N=int(sys.argv[2])
CODE=["tools/cloud-brain/*.ojs","tools/cloud-brain/*.sh","tools/cloud-brain/*.ts"]
TEXT=["knowledge","plan/cloud-brain-*.md",".claude/skills/brain-maintenance/SKILL.md",".claude/skills/brain-maintenance/rules.md",".claude/skills/brain-maintenance/agents","tools/cloud-brain/*.md"]
g=lambda *a: subprocess.run(["git",*a],capture_output=True,text=True).stdout
NAME=re.compile(r"(?<![\w.-])(--[a-z][a-z-]{2,}|[a-z][A-Za-z]{2,}\.[a-z][A-Za-z]{2,}|[a-z]+[A-Z][A-Za-z]{3,}|[A-Z][A-Z_]{4,})(?![\w-])")
commits=[l.split(" ",1) for l in g("log",head,"--no-merges","--format=%h %s","-n",str(N),"--",*CODE).splitlines()]
tot=[]
for h,s in commits:
    d=g("show",h,"--format=","--unified=0","--",*CODE)
    rem=set(); add=set()
    for l in d.split("\n"):
        if l.startswith("-") and not l.startswith("---"): rem|=set(NAME.findall(l))
        if l.startswith("+") and not l.startswith("+++"): add|=set(NAME.findall(l))
    changed=set(g("show",h,"--format=","--name-only").split())
    gone=sorted(n for n in rem-add if not g("grep","-l","-F","-w","-e",n,h,"--",*CODE))   # in no code file after the commit
    hits=0; files=set()
    for n in gone:
        for l in g("grep","-n","-F","-w","-e",n,h,"--",*TEXT).splitlines():
            f=l.split(":")[1]
            if f in changed: continue
            hits+=1; files.add(f)
    tot.append(hits)
    print(h, "removed-or-changed names",len(rem-add),"gone from the code",len(gone),"lines",hits,"files",len(files),"|",s[:60])
print("commits",len(tot),"with a line",sum(1 for t in tot if t),"lines",sum(tot),"max",max(tot))
```
