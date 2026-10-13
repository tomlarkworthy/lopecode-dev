# The deploys that wait for the owner: one read, and an issue on his page for each

Issue `undeployed-seeds-not-shown-to-owner`, started 2026-10-13 10:24:57 CEST (event 6396). Round 1.

Since `never-list-three-reductions` a fix to the seed of the kernel, the core, the database or the deployer is landed on
`main` with no deploy, and the deploy is the owner's. Once the fix's issue was `done` nothing listed it. The owner chose,
on that issue, "a list on his page of the deploys that wait" (comment 6388 of this issue quotes his "1 A 2 C 3 B").

No change of this issue is deployed: it is a local tool, a step of `lock.sh`, tests and docs. No seed was changed.

## What changed

- `tools/cloud-brain/waiting-deploys.ts`, new. With no argument it prints, for `brain`, `brain-core`, `brain-db` and
  `brain-deployer`, `same` or `waits` with the cells that differ and the commits between, each with its issue. With
  `--file <token>` it then keeps one issue a Worker that waits, `deploy-waits-<worker>`, labelled `needs-owner`.
  Its header is the reference.
- `tools/cloud-brain/lock.sh`: a release of `land` runs `waiting-deploys.ts --file <LOCK_TOKEN>` after the docs step
  and prints its last line. `LOCK_DEPLOYS=0` leaves it out, `LOCK_DEPLOYS=<program>` runs a program in its place, and
  with `LOCK_BASE` set (the tests) only such a program is run.
- Docs: `knowledge/changing-and-deploying-a-cloud-brain-worker.md`, a section "The deploys that wait for the owner";
  one sentence in `knowledge/calling-a-cloud-brain-from-this-checkout.md`; `SKILL.md` step 7, a paragraph for the
  orchestrating session, and a sentence in the row `labeled needs-owner` of its step 3, so that a pass does not take
  the label off such an issue as answered by `philosophy.md`; `agents/implementer/start.md` and `landing.md`, a sentence each on the line a release prints;
  the header of `land.sh`, step 9.

## The place on his page

His word was the page. Two ways were weighed.

- **A new group in the panel of `brain-issues.ojs`.** The page has no git, so the panel cannot compute the list: a tool
  would still have to write it somewhere the page reads. It needs a change to the seed of `brain-x-issues` and a deploy.
- **The block that is there.** "For your attention" lists every open issue labelled `needs-owner`, under "To answer"
  (the first `md` cell of `brain-issues.ojs`). One issue a Worker that waits is in it with no change to the page.

The second was taken, by line 2 of `philosophy.md` (the smaller side, easier to undo: closing two issues undoes it) and
the clarification of 2026-10-12 there (a thing with the same job is made to hold more; no second one beside it).
`philosophy.md`, "What `needs-owner` means", has the label for "something for him to answer or to run".

What this costs: the block shows one issue at a time, so the four Workers are up to four places in it and not one
table. And the label is counted as time waiting for the owner by `flow.stays`.

## How the read compares

A text comparison does not work. Run 2026-10-13 in the worktree, the seeds at `fd2dd0fd` against the files `sync.ts`
had read from cb4:

```
brain-static 54766 57429 false
brain-core 223592 228581 false
brain-db 83647 85736 false
```

(seed built, text cb4 ran, equal.) The first cell of `brain-static` is `_spec_0_0` in the build and
`_brainstatic_anon_66b289a9de` in the text cb4 ran.

The tool splits both sides into cells with `parseVariableGroups` of `tools/lope-push-ws.js` and compares a cell's body
with `sig` of `tools/triage/cellwise.ts` (its tokens and comments), its inputs in order, the cells with no name as a
set, and the imports. Both are imported, not copied. Run 2026-10-13 10:32:19 CEST with that comparison, every module
`infra.getModules` of cb4 listed against its seed in the worktree:

```
26 modules listed; 26 with a seed; 24 same; 2 differ:
brain-deployer: ~deployerOps +test_apply_unchanged_keeps_the_source_of_what_runs_over_an_older_row
brain-core: ~coreApp +test_llms_txt_says_where_the_rule_of_a_method_is
```

The two that differ are the two the issue names as waiting. No module read `differ` that was not expected to.

## The runs on cb4

2026-10-13 10:31:23 CEST, `bun tools/cloud-brain/waiting-deploys.ts --file impl-d7dbd6`, after a fetch (the head of
`origin/main` at that second was not printed):

```
brain: same
brain-core: waits. 2 differences (~coreApp +test_llms_txt_says_where_the_rule_of_a_method_is). 1 commit: core-getinfo-line-says-access f7c4801f 2026-10-13.
brain-db: same
brain-deployer: waits. 2 differences (~deployerOps +test_apply_unchanged_keeps_the_source_of_what_runs_over_an_older_row). 1 commit: apply-unchanged-keeps-no-newer-source be363d5a 2026-10-13.
deploys (cb4): brain-core, brain-deployer behind main, the deploy is the owner's; deploy-waits-brain-core opened, deploy-waits-brain-deployer opened
```

The same command at 10:31:28 ended `…; nothing written`. The read alone took 2.9 s (`time`, one run).

- The two opens are events 6405 and 6406. `issue.get` of `deploy-waits-brain-core` answered `state: open`,
  `labels: ["needs-owner"]`, and the body:

  ```
  The core (`brain-core`) on cb4 is behind `main`: 1 change to its seed landed with no deploy, which is yours. None is live on cb4 until you deploy the core.

  - `core-getinfo-line-says-access` (done): The core's reference line of getInfo says a Worker answers access; since the deployer e4b02e4f4481 it answers neither access nor methods

  Nothing to choose: one deploy of the core from `main` carries them all, and one that is not `done` has not passed its review yet.
  The commands are in the record of each issue, under "For the owner: the deploy". The loop closes this issue once cb4 runs the seed of `main`.
  ```

- `issue.queue` listed both under `waiting` with `why: owner`, and neither under `queue`.
- The base the walk found for the deployer is `904e2a1b` (`ds-ingestion-tail-to-analytics-engine`, a change to
  `cloudflare-iac.ojs`): cb4's deployer runs that change, and `be363d5a` alone is after it.

**A list that changed.** The rebase of this change brought in three commits of `services-table-drawn-three-times-a-read`
to `cloudflare-iac.ojs`, which the deployer's Worker holds. 2026-10-13 10:40:15 CEST, the same command, `origin/main`
at `d8265d68`:

```
brain-deployer: waits. 4 differences (~deployerOps +test_apply_unchanged_keeps_the_source_of_what_runs_over_an_older_row ~serviceList +test_a_read_of_the_same_rows_puts_no_new_services_table_in_place). 4 commits: apply-unchanged-keeps-no-newer-source be363d5a 2026-10-13; services-table-drawn-three-times-a-read 6d0fa779 c2efb119 d8265d68 2026-10-13.
deploys (cb4): brain-core, brain-deployer behind main, the deploy is the owner's; deploy-waits-brain-deployer list changed
```

Event 6423 is the comment, with a second line `services-table-drawn-three-times-a-read (in-review): …`; the run after
it ended `nothing written`. Its record has a section "For the owner: the deploy" too (line 134 of
`records/services-table-drawn-three-times-a-read.md`). The body's last line said that of "each issue", which a commit
with no such record would make untrue: it was changed after that run to "What to run is in the record of an issue that
was landed for your deploy", and "its seed" to "its seeds" for the deployer. The two issues on cb4 have the older wording
until a release writes a comment to each.

The issue's "Done when" has three parts. With a seed on `main` and not on cb4 the read names the Worker and the issue:
the run above, and the tests. After his deploy it names none: the tests alone, with a stand-in for the Brain; no deploy
of the four was made, and none is the loop's to make.

## Tests

`cd <worktree> && bun test --timeout=30000 ./tests/tools/waiting-deploys.test.ts`: 12 pass, 0 fail (run after the last
edit of the tool and the docs). The seeds are five small ones in a repository the test makes, compiled by the tool's
compiler; what the Brain runs is a build with its ids renamed and a space put at line ends; the tracker is a stand-in.
They hold: the four `same`; the core alone `waits` with its cells and its issue, and `same` again when the Brain runs
`main`; each of the five seeds moves its own Worker, `cloudflare-iac` the deployer; a change to a cell with no name;
a commit that changes no cell; two issues, a commit with no issue and a commit already deployed; a Brain that runs no
commit of the depth; `plan` for each state of the issue; `--file` through open, no write, a changed list, close, open
again, a refused write (exit 1) and a token that is not kept; arguments not understood and a Brain not read (exit 2);
the docs.

`bun test --timeout=30000 ./tests/tools/lock.test.ts`: 30 pass, 0 fail; with `lock.sh` of before the change, 28 pass
and 2 fail, the two added.

The whole of `tests/tools`, `tests/tools/suite.sh`: 1178 pass, 0 fail, 121 files, at 10:53 CEST on 2026-10-13, after the rebase and the
last edit of a file other than this one.

## Not tried

- The page. "For your attention" was not opened: an agent of the loop does not open the Brain's page in the cluster's
  browser (`rules.md`, Never), and the page on this machine needs the owner's session. That the two issues are rows of
  "To answer" rests on the panel's reference and on `issue.queue` answering `why: owner` for both.
- The release of a landing on cb4 with the step was not tried before the landing. The first was this change's own,
  2026-10-13 10:54 CEST: it wrote a comment with the newer wording to each of the two issues (events 6435 and 6436 of
  the tracker, by `impl-d7dbd6`). The line it printed is not kept: the writer's comment on the issue was sent before
  the release and does not have it.
- A close and a reopen on cb4. Each needs a deploy by the owner. They ran against the stand-in.
- An issue the owner rejected: `plan` writes nothing to it (a test), since the policy's `reopen` refuses a token
  after an `owner-reject`. The Worker is then on his page no more, though it waits. Not seen on cb4.
- The write keys are `deploys/<worker>/<what>-<seq>` and not `<role>/<issue id>/<what>` of `rules.md`, "Always": two
  releases that read one state are to send one key. And the tool sets `ISSUE_AS_TIME_AHEAD=1` for its own calls of
  `issue-as.sh`, which leaves out that script's check of a time ahead of the clock: the text is made from titles and
  commit days, and a title that names a time of day would have the write refused at every release.
- The owner's Answer on such an issue, which comments and takes the label off: the issue then stands at `open` with no
  label and `issue.queue` would list it as `triage`. `SKILL.md` step 7 tells the orchestrating session to leave it; no
  code holds that.
- Two releases at once. A key ends with the seq of the issue's last event, so the second of two equal writes is a
  duplicate; an `open` of an issue that is there was not sent twice on cb4.
- A module's files (`hono.js`, `atcute.js`, …) are not compared: a change to one alone reads `same`.
- A change to `cloudflare-iac.ojs` is said of the deployer and not of the kernel, the core or the database, whose
  distilled text holds its wrapper.
- A seed of `origin/main` that does not compile: the tool is then exit 2 for all four, and the release prints
  `deploys (cb4): not read (…)`. Seen for a Brain that is not read, not for a seed.
- A comment in a cell. `sig` compares comments, but a comment after an expression cell's expression did not reach the
  compiled cell in a first form of the test, so that case was taken out; a comment inside a block cell was not tried.
- A rollback of one of the four to an older version, and a Brain other than cb4.
- A commit subject of the form `<word>: …` whose word is not an issue: the tracker answers 404 for it and the body
  lists the commit as one "that names no issue of the tracker" (in the tests); the line of the read still prints the word.
