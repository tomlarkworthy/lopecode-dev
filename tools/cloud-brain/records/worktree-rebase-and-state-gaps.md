# worktree-rebase-and-state-gaps

The issue (event 262, started by event 272 on 2026-10-10) lists three things writers worked round in
a worktree made by `tools/cloud-brain/worktree.sh`, and says none was reproduced by whoever filed
it. It leaves two choices to the implementer. No seed changed and nothing was deployed.

## Reproduced before any change, 2026-10-10

In a scratch repository with two submodules and a `.gitmodules`, shaped as `worktree.sh` expects,
git 2.55.0. Each landing on its `main` changes a file and moves the `lopebooks` pointer, as step 10
of the implementer brief does.

1. **A rebase that stops fails on the links.** Reproduced:

   ```
   $ git -C $W rebase main            # main changed the same line of the seed
   CONFLICT (content): Merge conflict in seed.ojs
   $ … resolve, git add seed.ojs …
   $ GIT_EDITOR=true git -C $W rebase --continue
   error: expected submodule path 'lopecode' not to be a symbolic link
   error: could not commit staged changes.
   ```

   The journal's line names `lopebooks`. Here it is `lopecode`, because the rebase had already put
   an empty directory where the `lopebooks` link was (its pointer moved); the other link is what
   the commit met.

   A rebase with no conflict did not fail here: exit 0, and `lopebooks` an empty directory after
   it. The line of round 1 of panel-for-your-attention ("git rebase in a worktree needs the
   submodule links removed first") was not reproduced as a failure of a clean rebase.

2. **`ORIG_HEAD` is stale.** Reproduced: after a rebase that brought in `lopebooks` and
   `other.txt`, a second `git rebase main` answered "Current branch bm/t1 is up to date." and
   `git diff --name-only ORIG_HEAD HEAD` printed `lopebooks` and `other.txt` again.

3. **The worktree has no state.** Reproduced in this issue's worktree: `bun test brain-cli.test.ts`
   from `tests/tools` there read `0 pass, 7 skip`. The test skips when the Cloudflare token file is
   absent, and `brain.ts` read that file at its first lines, whatever the command.

   The node suite, `node --test tests/notebooks/*.test.js`, node v26.7.0, both run at the same time:

   ```
   main checkout   tests 115   pass 104   fail 6    skipped 2
   worktree        tests 25    pass 8     fail 12   skipped 2
   ```

   The journal's "8 failures not 2" was not met; the counts above are today's. Three failures that
   only the worktree has were read, and each is a file git does not track:
   `notebooks/@tomlarkworthy_jumpgate/modules/@tomlarkworthy/exporter-2.js` (`exporter.test.js`),
   `tools/scratch/mermaid-lens/fixtures.mjs` (`mermaid-lens.test.js`) and
   `modules/@tomlarkworthy/svg-lens.js` (`svg-lens.test.js`). The others were not read one by one.
   A file that fails to load reports none of its tests, which is why the worktree counts 25.

Two more defects were found while reproducing, both in a commit a writer could make:

- `git commit -a` in a worktree records each link in the submodule's place (`mode change 160000 =>
  120000 lopebooks`). `merge --ff-only` would take that to `main`. The brief says `git add` the
  files; nothing checked.
- `worktree.sh` found the main checkout from its own path. The worktree's copy, run as
  `$W/tools/cloud-brain/worktree.sh`, took the worktree for the main checkout: met when this
  issue's own rebase answered "no worktree for 'worktree-rebase-and-state-gaps'".

## What changed

`tools/cloud-brain/worktree.sh`, `tools/cloud-brain/brain.ts`, and two test files. 247 lines added,
16 removed; 202 of those lines are in the two test files.

**`worktree.sh --rebase <id>`.** In place of `git rebase main` in the worktree.

- It notes the commit the branch left `main` at and `main`'s tip, takes both links out, and runs
  `git rebase main`.
- On success it puts the links back and prints, one a line on stdout, the files that differ
  between those two commits: what came in from `main`, without the writer's own files. When
  `main` had not moved it prints nothing. Everything git says goes to stderr.
- When the rebase stops it prints the unmerged files and what to do on stderr, exits 1 and leaves
  the links out. Run again after `git add`, it runs `git rebase --continue`, and prints the files
  measured from where the rebase began. The plain `worktree.sh <id>` does not put the links back
  while a rebase is stopped.
- It refuses, before and after, when `HEAD` has `lopebooks` or `lopecode` as anything but a
  submodule pointer.
- A rebase git refuses to start (an uncommitted change) exits 1 with the links back.
- A rebase stopped in the worktree that this script did not start is left alone, exit 1.

**The main checkout is found from git** (`git rev-parse --git-common-dir`), so the script does the
same from the main checkout and from a worktree's copy.

**`brain.ts`.** The choice the issue left open: `BRAIN_STATE_DIR`, not a line in the brief.

- `BRAIN_STATE_DIR=<main checkout>/tools/cloud-brain/.emitted` makes `brain.ts` read and write the
  state file, the token files and the emitted records of that directory, and the Cloudflare token
  beside it (`../../scratch/cloud-brain-experiments/.cf-token` from there). `seen.json` and a
  module's attachments stay those of the checkout the script is in: they are tracked files a
  worktree edits.
- The Cloudflare token is read when a command sends it (`api`, `install`), not at start. `curl`,
  `token`, `saw` and the commands that go through the deployer start with no such file.
- Why this and not the line: with the line alone the seven tests of `brain-cli.test.ts` were still
  skipped in every worktree, so "run by a test with no state" would have meant no run. Reading
  the token late fixes that by itself; the variable is for the run against cb4 that rounds 1 to 3
  of owner-session-file-is-present made by copying a candidate into the main checkout.
- What it does not do: a candidate `brain.ts` run with the variable holds the owner's session and
  the recovery key, as the copy did. Event 219 (`token.create` with the owner's session, from such
  a copy) is as possible as before. The rules decide what an agent sends, not this.

Run on cb4 at 20:30 CEST with the worktree's `brain.ts`, a read with the implementer's token:

```
$ BRAIN_BASE=cb4 bun tools/cloud-brain/brain.ts curl "…issue.get?id=worktree-rebase-and-state-gaps" --as issues-implementer-2
no token "issues-implementer-2" is kept; make one with: token issues-implementer-2 <method…>
$ BRAIN_BASE=cb4 BRAIN_STATE_DIR=<main>/tools/cloud-brain/.emitted bun tools/cloud-brain/brain.ts curl … --as issues-implementer-2
… "state":"in-progress" … [200]
```

The worktree's `.emitted` was empty after both.

**This issue's own rebase** was made with the new subcommand on the real repository, 20:30 CEST,
`main` having moved from `ff06290c` to `d1c1a971` with the `lopebooks` pointer:

```
$ worktree.sh --rebase worktree-rebase-and-state-gaps
lopebooks
tools/cloud-brain/brain-issues.ojs
tools/cloud-brain/records/panel-for-your-attention.md
tools/cloud-brain/seen.json
$ worktree.sh --rebase worktree-rebase-and-state-gaps      # again: prints nothing, exit 0
```

Both links were links after it and `git ls-tree HEAD lopebooks lopecode` showed two `160000 commit`.

## Tests

16 of 16 with `cd tests/tools && bun test worktree.test.ts brain-cli.test.ts` in the worktree after
the rebase (bun 1.4.0, 4.0 s). Not from the repository root: see the note at the top of
`brain-cli.test.ts`.

`tests/tools/worktree.test.ts`, new, 7 tests. Each builds the scratch repository above in a
temporary directory and runs the script copied into it. Against the script of `main`
(`WORKTREE_SH=<that file>`): 0 pass, 7 fail.

| Test | What it reads |
|---|---|
| clean rebase | exit 0; stdout is `lopebooks`, `other.txt`; both links; both gitlinks; the branch is on `main` |
| rebase that did nothing | second run prints no file (gap 2) |
| conflict | exit 1, stdout empty, stderr names `seed.ojs`, links out; plain `worktree.sh t1` leaves them out; run again unresolved: exit 1; resolved: exit 0, three files, links back, the commit holds `seed.ojs` only (gap 1) |
| commit made with `-a` | refused, stderr names `lopebooks` |
| uncommitted change | exit 1, links back; after `git checkout` of the file it rebases |
| worktree that does not exist | exit 1 |
| the worktree's own copy | prints the same path, rebases, makes no `.claude` inside the worktree |

`tests/tools/brain-cli.test.ts`: 9 tests, 7 as before and no longer skipped without the token file,
2 new. Against a copy of `main`'s `brain.ts` in a directory with no token file: 0 pass, 9 fail.
Against `main`'s `brain.ts` where it is: 8 pass, 1 fail (the `BRAIN_STATE_DIR` test).

- `BRAIN_STATE_DIR`: a temporary directory holds a token file with a made-up value. A server on a
  loopback port records the `authorization` header. Without the variable: "no token … is kept" and
  no request. With it: `ok [200]`, the header is `Bearer <the value>`, and the value is not in
  the output.
- With an empty `BRAIN_STATE_DIR`, `curl … --as nobody` answers "no token" and stderr has no `ENOENT`.

## Not tried

- `apply`, `saw <name>`, `token`, `session`, `shell`, `page` and `install-deployer` with
  `BRAIN_STATE_DIR`. Each is a write to cb4, a deploy or the owner's session. Only `curl --as` was
  run with it. That every state path goes through the one function `E` was read in the source
  (the default of `shell` was the one that did not, and was changed).
- A conflict on the real repository. The real run had none; the conflict is the scratch
  repository's.
- A rebase that stops twice (two of the writer's commits each conflict). Read in the script: each
  run continues once and stops again with the note kept. Not run.
- `git rebase --abort` after a stop: the note `bm-rebase` stays in the worktree's git directory
  and the next `--rebase` writes it again. Not run.
- A branch with a merge commit, and a `main` that moves between a stop and the run that continues
  (the files printed are up to the tip the rebase began with).
- Two calls of `--rebase` on one worktree at once.
- bash other than 3.2.57, git other than 2.55.0.
- The node suite: nothing was changed for it. A worktree cannot give that count while the suite
  reads untracked files.

## Left for the overseer

`implementer.md` is not edited here; the issue keeps it for the overseer. What the tools now allow:

- Step 4, "`git status` fails in the worktree": also never `git commit -a` or `git add -A` there.
- Steps 9 and 10: `tools/cloud-brain/worktree.sh --rebase <id>` in place of `git -C $W rebase main`
  and the second `worktree.sh <id>`; its stdout in place of `git diff --name-only ORIG_HEAD HEAD`.
- Step 6: a changed `brain.ts` is run from the worktree with `BRAIN_STATE_DIR`, never copied into
  the main checkout; `tests/tools/*.test.ts` run in the worktree; the count of
  `node --test tests/notebooks/*.test.js` is the main checkout's.
