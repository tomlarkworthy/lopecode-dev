# notebook-commit-once-a-day

2026-10-11. A local tool, its test file, the writer's brief and two knowledge docs. No seed, no
deploy. One part is not in force when this lands and is another role's act: the reviewer's brief
on the Brain still reads the `lopebooks` commit of a change (the text for it is below, for the
overseer to put).

The owner, 2026-10-11, in the issue's body: "we don't need to commit  @tomlarkworthy_cloud-brain.html
all the time, that can be a once a day thing for backups. I beleive it can be generated from the
cluster sources easily when needed?"

## What changed

`tools/cloud-brain/notebook-backup.sh <built notebook>` is new. A landing that builds runs it in
place of the `cp` and the `lopebooks` commit of step 10. It writes the build over
`lopebooks/notebooks/@tomlarkworthy_cloud-brain.html` of the main checkout, reads the day of that
file's last commit (`git log -1 --format=%cd --date=format-local:%F`), and prints one line:

```
committed <sha> <day>            the last commit was of an earlier day: the tool committed the file (and its .json)
not due: last committed <day>    the last commit is today's: the file is written, nothing is committed
same: last committed <day>       a commit was due and the build is the committed file, byte for byte
```

It commits those two paths and no other (`git commit -- <paths>`), tries up to three times when a
hook refuses (the spec-sync hook of `lopebooks` writes the `.json`), and does not push. Exit 1 is
no build at the path; exit 3 is a commit refused three times, with the file written.

`.claude/skills/brain-maintenance/agents/implementer.md`: step 10 hands the build to the tool,
commits the `lopebooks` pointer only after `committed`, and says what to do when a pull in
`lopebooks` is refused for the notebook; step 12 asks for no `lopebooks` ref.
`knowledge/working-with-cloud-brain-remote-lopecode-cluster.md` no longer calls the notebook
canonical: the seeds are the source and the file is a build. `knowledge/changing-and-deploying-a-cloud-brain-worker.md`,
step 7, no longer says to commit in `lopebooks`.

## What was settled, and by which line

The issue left six things "for whoever takes it to settle". Each was taken by line 2 of
`philosophy.md` ("the side that is smaller and easier to undo") unless it says otherwise.

| Question | Taken | Not taken, and why |
|---|---|---|
| Who makes the daily commit, when, with what token | The first landing of a day that builds, under the landing lock it already holds, pushed over the checkout's own remote (`git -C lopebooks remote -v`: `git@github.com:tomlarkworthy/lopebooks.git`) | A Worker's schedule or a scheduled agent: each needs a GitHub credential on the cluster or a new Worker, which are the owner's (`rules.md`, Never; the brief's step 3) |
| Is the file on disk still written at a landing | Yes, by the tool, built and not committed | Not writing it: the owner's tab and `tests/tools/needs.ts` (`COMMITTED`) read it there |
| What a submit's refs are | The `lopecode-dev` commits and the deploy. No `lopebooks` ref | |
| `build.ts`, its default `--out` | Left as it is: it writes the same file on disk, and it already refuses in a worktree | Moving it to `.emitted/`: other sessions and `brain.ts shell`'s hint run it bare |
| `tools/cloud-brain/library-homes.ts` | Left as it is. It reads `origin/main:` of `lopebooks` for `cloud-brain`, which is now up to a day behind the seeds | |
| `CLAUDE.md`, "the notebook HTML is the source of truth" | Said in the knowledge doc's table, which a hook makes every agent read before an edit under `tools/cloud-brain/`. `CLAUDE.md` is not edited by an agent of the loop | The line for the owner to add to tip 8 is below |

What this leaves, by design:

- A day with no landing that builds has no backup of its own. The next one that builds commits.
- The backup of a day is the build of its first such landing. What landed later that day is in
  the working file and in the next day's commit. The seeds of every landing are in `lopecode-dev`.
- `lopebooks` reads as modified in the main checkout from a day's second such landing until the next
  day's first.
- The 1.1 GB of history already in `lopebooks` is as it was.

## Tests

`tests/tools/notebook-backup.test.ts`, 11 tests. Eight run the tool on a repository made in a
temporary directory, with the day given (`NOTEBOOK_REPO`, `NOTEBOOK_TODAY`): a second landing of a
day, the first of a later day and the one after it, a due backup equal to the committed file, a
repository that never had the file, another file staged beside it, a hook that writes the `.json`
and refuses once, a hook that always refuses, and no build (absent, empty, no argument). Three
read the brief and the knowledge doc.

```
bun test ./tests/tools/notebook-backup.test.ts     0 pass, 11 fail   before the change (the test file alone, between 22:58 and 23:01 CEST)
bun test ./tests/tools/notebook-backup.test.ts     8 pass, 3 fail    with the tool and no edit of the brief or the doc
bun test ./tests/tools/notebook-backup.test.ts     11 pass, 0 fail   at df8e69ae
bun test ./tests/tools                             416 pass, 1 skip, 0 fail, 417 tests across 46 files   at 26743c2e, after the rebase
```

The skip is `tests/tools/light-agent.test.ts` line 230, which this change does not touch (each file
that has the word `skip` run alone; that one printed `1 skip`).

The pull that the brief now speaks of, run on two clones of one bare repository in the scratchpad
at 23:01 CEST, not in `lopebooks`: clone `b` had the notebook changed and not committed, clone `a`
pushed a commit of it.

```
git pull --ff-only origin main        "Please commit your changes or stash them before you merge. Aborting", exit 1
git checkout -- <the .html> <the .json>
git pull --ff-only origin main        "1 file changed", exit 0
```

## The tool on the checkout's own `lopebooks`

One run, in this change's own landing, under the landing lock (taken 23:12:48 CEST), after the
merge, with `main` at `c476ef9a` and `lopebooks` at `997e73e4`, whose last commit of the notebook was
of that day:

```
cd $W && bun tools/cloud-brain/build.ts --out tools/cloud-brain/.emitted/cloud-brain.html
cmp tools/cloud-brain/.emitted/cloud-brain.html <root>/lopebooks/notebooks/@tomlarkworthy_cloud-brain.html     exit 0
<root>/tools/cloud-brain/notebook-backup.sh "$W/tools/cloud-brain/.emitted/cloud-brain.html"
not due: last committed 2026-10-11                                                                          exit 0
```

`lopebooks` was at `997e73e4` after it and `git -C lopebooks status --short` printed nothing: the
build was the committed file, so nothing was written. This is the `not due` line only.

Not run on `lopebooks` itself: the commit. Its hooks there (`lope-token-scan`, `lope-preflight`,
`lope-spec-sync`, `lope-sitemap`, `lope-content-index`, `lopebooks/.pre-commit-config.yaml`) are stood
in for, in the test, by a `pre-commit` written by hand that writes the `.json` and refuses once. The
first real commit is the first landing that builds on 2026-10-12 or later.

## For the overseer: the reviewer's brief

`roles/reviewer.md` on the Brain (read 2026-10-11 before 22:58 CEST, 258 lines by `wc`) reads the `lopebooks` commit
of a change in its steps 2, 3 and 4. A writer of this issue may not put it (`rules.md`, "The files of the
Brain an agent reads": the issue is no task of an approved spec). Until it is put, a review of a
seed change that landed after this one finds no `lopebooks` ref and, after the first landing of a
day, an `origin/main` notebook that lacks the change.

- Step 2: `git -C lopebooks show --stat <sha>` goes; the refs name `lopecode-dev` commits and a deploy.
- Step 3: the fetch of `lopebooks`, `git -C lopebooks merge-base --is-ancestor <sha> origin/main` and
  `git -C lopebooks show origin/main:notebooks/@tomlarkworthy_cloud-brain.html` become: fetch
  `lopecode-dev`, `git merge-base --is-ancestor <sha> origin/main`, then build the notebook of
  `origin/main` in a worktree of the reviewer's own
  (`W=$(tools/cloud-brain/worktree.sh rev-<id>)`, `git -C $W checkout -q --detach origin/main`,
  `bun tools/cloud-brain/build.ts --out tools/cloud-brain/.emitted/cloud-brain.html` there) and
  compare `getSource`'s `text` with `lope-reader.ts <that file> --get-module <module>`. The compare
  with `lopebooks/notebooks/@tomlarkworthy_cloud-brain.html` (the working file) goes.
- Step 4: "the notebook of the commit" is that build at `<sha>` (the last `lopecode-dev` ref), in
  place of `git -C lopebooks show <sha>:"notebooks/@tomlarkworthy_cloud-brain.html"`. The paragraph
  for "no deploy ref and no `lopebooks` commit" already builds this way (review 874 of
  `dv-3-deployer-opens-verify-html`); it becomes the way for every seed change. The paragraph for
  "a `lopebooks` commit and no deploy ref" (a module of the shell) is then "commits that touch a
  seed of the shell and no deploy ref".
- `tests/tools/reviewer-brief-waits-on-show.test.ts`, its third test, holds three of those strings
  of step 3 and fails when they go: it is changed with the put.
- `oversight.md` line 277 holds "558 names no lopebooks commit" as something to send back; a submit
  now has none.

Not tried: a review made this way. `build.ts --out` at a commit giving the committed notebook's
bytes is the issue's own measurement (its body: "the same, byte for byte (`cmp`)"); the one run of it
here is under "The tool on the checkout's own `lopebooks`".

"The notebook of a change is the build of its `lopecode-dev` commit" has one qualifier: `build.ts`
reads `lopebooks/notebooks/quick_start.html` as its frame (`build.ts`, the line `let html = readFileSync(…quick_start.html…)`),
and in a worktree `lopebooks` is a link to the main checkout's. A build of an old commit made after
that file changed has the new frame.

## For the owner

- `CLAUDE.md`, tip 8, says "the notebook HTML is the source of truth, the `.js` is a working copy".
  For the Brain's modules it is the seed. A line to add there, if he wants it where every session
  reads it: "The modules of the Cloud Brain are the exception: their source is the seed,
  `tools/cloud-brain/*.ojs`, and the notebook is a build of the seeds."
- `rules.md` line 90, "Push `lopebooks` and `lopecode-dev`", holds as it is for the landing that
  makes the day's backup; the other landings have nothing to push in `lopebooks`.

## Not tried

- A landing of a seed change under the new step 10 by another writer.
- A second machine: a daily commit made on one and met by a changed working file on the other, in
  `lopebooks` itself. Tried on two scratch repositories only (above).
- Two landings that both read "an earlier day" at once. The landing lock is what keeps them apart; no test of it.
- The clock at midnight: a landing that takes the lock on one day and runs the tool on the next commits, by the tool's own `date`.
- A notebook assembled from the cluster alone (`cloud-brain-dev/sync.ts`), which the owner asked about. The issue's body says no tool does it; none was written.
- Prior art: `knowledge.search` with `semantic=true` answered 402 three times ("owner has made 2000 priced calls today"); by words, three searches ("notebook committed landing lopebooks", "build.ts seeds", "daily backup") gave nothing that bears on it (`@tomlarkworthy/github-backups` backs up Observable notebooks to GitHub from a notebook, not a file from a checkout).
