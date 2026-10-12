# wt-2-worktree-sh

2026-10-12. Task 2 of `plan/cloud-brain-worktree-per-topic.md`. Two local tools,
`tools/cloud-brain/worktree.sh` and `tools/cloud-brain/issue-as.sh`, and their test file. No seed, no
deploy, no brief changed. Every command below was run on the owner's laptop after the issue's `start`
(event 3823, `at` 08:47:08 CEST), in the writer's worktree unless it says the main checkout. A time is one
`date` printed beside the command, or an event's `at`.

Read first, in the Brain (`knowledge.search?semantic=true`, as `loop-knowledge`): "git worktree per topic
occupant one agent", "clone cloud-brain-dev push with loop-git token", "worktree.sh rebase origin/main
submodule links". The spec of this task was the first entry of the first and the third, and
`doc:cloud-brain-dev-readme` of the second, which has the push as the script now makes it. Nothing else
bore on it.

## What changed

**`worktree.sh`**, 69 lines before and 328 after (`wc -l`). Its header is the reference.

| Command | What it does now |
|---|---|
| `worktree.sh <name>` | A new worktree is made at `origin/main` after `git fetch --no-recurse-submodules origin main`, on `bm/<name>` with no upstream. Before: at the main checkout's local `main`, with no fetch. |
| `--rebase <name>` | The same fetch, then a rebase on `origin/main`. Origin not reached is exit 2 with nothing changed. |
| `--fresh <name> [--for <token>]` | New. None there: makes one. One there: reads five counts; all 0, it is brought up to `origin/main`, exit 0 with the path. A count that is not 0: exit 3, the counts on stderr, nothing touched. Another token in it: exit 4. |
| `--leave <name>` | New. Removes `bm-occupant` from the worktree's git directory. |
| `--at <sha> <name>` | New. A detached worktree at `<sha>`; one of that name that is detached is put there with `checkout --detach -f` and `clean -fd`. A worktree on a branch is refused, exit 1. |
| `--list` | New. One line for each `bm-*` worktree: name, `clean` or `not-clean`, the five counts, `occupant=`, `branch=`, `head=`. |
| `--push-dev <name> [--dry-run]` | New. Rebases the clone's commits on its `origin/main`, pushes to `main` with a 60 s write token from `git.token` called `--as loop-git`, commits the pointer in the worktree, prints the commit. |
| `--remove <name> [--force]` | Exit 3 and nothing removed when a count is not 0. `--force` removes it as it is. Before: always forced. |

The five counts: tracked files that differ from `HEAD` (the links and `cloud-brain-dev` left out), untracked
files that are not ignored (the `tools/node_modules` link left out), commits not on `origin/main`, and in
`cloud-brain-dev` the changed or new files with `deploy/` left out and the commits its origin has not, on
any branch of the clone. A stopped rebase is a sixth word, `rebase=stopped`, and is not clean.

**`cloud-brain-dev/` in a worktree is a clone**, from the address `.gitmodules` names, checked out detached
at the commit the worktree's `HEAD` names, then `sync.ts`. A clone that lacks the commit is fetched first.
Before, it was a `git worktree` of the main checkout's copy. A worktree made before this change still has
one; `--rebase` keeps it up and `--remove` removes it from that copy (a test of its own).

**`lopecode-plugin`** is linked to the main checkout's, as `lopebooks` and `lopecode` are.

**`issue-as.sh`** reads the token files from `BRAIN_STATE_DIR`, or with none from the main checkout's
`tools/cloud-brain/.emitted` through `git rev-parse --git-common-dir`, as `lock.sh` does. A copy in no git
repository reads `.emitted` beside itself, which is how `issue-as-body-file.test.ts` and
`issue-as-time-check.test.ts` run it. `ISSUE_AS_BASE` is the
address, for the tests.

## The defect of `issue-as.sh`, seen and then gone

In a worktree at `origin/main` (`ab4ef9c2`, made by `--fresh wt-2-try`), which has the script as it was:

```
$ bm-wt-2-try/tools/cloud-brain/issue-as.sh impl-baa92e "get?id=wt-2-worktree-sh"
issue-as.sh: no token named impl-baa92e is kept; nothing was sent          exit 2
```

The changed script, from the writer's worktree, whose own `.emitted/` has no token file:

```
$ bm-wt-2-worktree-sh/tools/cloud-brain/issue-as.sh impl-baa92e "get?id=wt-2-worktree-sh" >/dev/null
 [200]                                                                      exit 0
$ … issue-as.sh impl-nobody "get?id=wt-2-worktree-sh"
issue-as.sh: no token named impl-nobody is kept; nothing was sent          exit 2
```

## Where the build is not the spec's sentence

- **The base when the main checkout is ahead.** The spec says step 10 of the writer's brief still works
  "since its pull makes the root's `main` equal to `origin/main`". It does not when a session committed in
  the main checkout and did not push: the worktree is then rebased on `origin/main`, and `merge --ff-only
  bm/<id>` there is refused. `--rebase` says so on stderr with the count (a test). At 09:16:11 CEST, after a
  fetch, `git rev-list --left-right --count origin/main...main` in the main checkout gave `0 0`.
  `philosophy.md` line 3.
- **`--push-dev` runs `git fetch origin main` and `git rebase origin/main`** in the clone where the spec has
  `git pull --rebase origin main`: the clone's `HEAD` is detached, and `sync.ts` has written over tracked
  files under `deploy/`, which a rebase refuses. `deploy/` is put back (`git checkout -- deploy`,
  `git clean -fd deploy`) before the rebase and read again by `sync.ts` after the push.
- **The token is given to git in the environment** (`GIT_CONFIG_COUNT`, `GIT_CONFIG_KEY_0`,
  `GIT_CONFIG_VALUE_0`), not as `-c http.extraHeader=…`: `ps` shows a command's arguments.
- **`--push-dev` makes the pointer's commit itself**, of the path `cloud-brain-dev` only. The spec leaves
  "then the pointer committed in `$W`" to no one. A pointer that is staged and not committed is in none of
  the five counts, so a worktree with one would read clean. It commits only when the clone's commit has
  the old pointer as an ancestor and is on the clone's `origin/main`.
- **Where a push goes.** The clone's fetch address is the cluster's, where a push is not found. The push
  address is Cloudflare's, which `git.get` answers to the owner only (`brain-git.ojs`, `who: "owner"`), so
  `loop-git` cannot read it. It is copied from `remote.origin.pushurl` of the main checkout's copy, when
  that has one. A second machine whose copy has none gets git's refusal and a line that names
  `cloud-brain-dev/README.md`. This is a gap of R7 that the spec does not name.
- **`--dry-run`** is not in the spec. It asks for the token and sends `git push --dry-run` of the clone's
  `origin/main`, so the token and the address are tried with nothing written.
- **A clone with commits of its own is left where it is** by `--rebase` and the plain call, with a line on
  stderr. Before, `dev()` checked out the pointer, detached, and a commit made on a detached `HEAD` there
  was then in the reflog only.
- **`--for` is optional**, for the orchestrator's own `bm-orch-<host>`. With none no occupant is written;
  an occupant that is there still gives exit 4.
- **Exit 3 leaves `bm-occupant` as it was**, also when its token is gone (a test). A writer put in a
  worktree "as it is" after an exit 3 is not written as its occupant. No second agent is put there by
  `--fresh` while the work stands, since every later call is exit 3 or exit 4.
- **`--remove` does not read `bm-occupant`.** The spec asks only that it refuse a worktree that is not clean.
- **The tracker not reached** (curl's exit, any status but 401) is not a token that is gone: exit 4 (a test).

## Tests

`tests/tools/worktree.test.ts`: 7 tests before, 36 after. Each makes a checkout in a new temporary
directory: a bare repository for `origin`, a bare repository for the cluster's `cloud-brain-dev.git`, a
clone that stands for the main checkout, and a second clone that lands. The landing never moves the main
checkout's own `main`, so a base read from it fails. The tracker is a stand-in on `127.0.0.1`
(`ISSUE_AS_BASE`), the push token a program (`WORKTREE_GIT_TOKEN`).

```
bun test ./tests/tools/worktree.test.ts                                    36 pass, 0 fail, 302 expects
the same, WORKTREE_SH and ISSUE_AS_SH the two scripts of ab4ef9c2           5 pass, 31 fail
the same, ISSUE_AS_SH alone the script of ab4ef9c2                         31 pass, 5 fail
bun test ./tests/tools   (09:11:19 CEST at its end)                        553 pass, 0 fail, 58 files
bun test ./tests/tools   before any edit, second run                       524 pass, 0 fail, 58 files
```

After `worktree.sh --rebase` at 09:16 CEST, which brought in `tests/tools/rows-add-within-sql.test.ts`,
`cloudflare-iac.ojs` and a record, with the two scripts and the test file as they are committed:

```
bun test ./tests/tools/worktree.test.ts   (09:17:35 CEST at its end)       36 pass, 0 fail, 302 expects
bun test ./tests/tools                    (09:20:40 CEST at its end)       554 pass, 0 fail, 58 files
```

The five that pass on the scripts of `ab4ef9c2` (the names `comm -23` printed of all 36 against the 31
failed): "--rebase of a worktree that does not exist stops", "a commit that carries a link in a
submodule's place is refused", "step 10 of the writer's brief as written still lands", "the main
checkout's push address is copied into the clone when it has one" and "the scripts name no path of one
machine". They hold what was true before and must stay so.

The first run of the whole directory before any edit gave 514 pass, 10 fail, with `Cannot find module
'…/T/seed-module-7603558bc1be/cloudflare-iac.js'`; the second, a minute later, 524 pass. Not looked into.

Check 8 of the spec, in the worktree after the last edit: `grep -c "/Users/" tools/cloud-brain/worktree.sh
tools/cloud-brain/lock.sh tools/cloud-brain/issue-as.sh tools/cloud-brain/notebook-backup.sh
cloud-brain-dev/agent.sh .claude/skills/brain-maintenance/SKILL.md .claude/skills/brain-maintenance/agents/*.md`
printed 0 for each of 11 files.

## Run on the main checkout, 09:08:33 to 09:08:49 CEST

With the worktree's copy of the script, on a name of its own, `wt-2-try`, removed at the end:

```
--fresh wt-2-try --for impl-baa92e             exit 0, 6.7 s; bm-occupant is impl-baa92e; cloud-brain-dev/.git a
                                               directory; its HEAD 06a4a2b, the pointer 06a4a2b
bun test.ts brain-x-static, in that clone      passed 12, failed 0, needsBrowser 0
--fresh wt-2-try --for impl-000000             exit 4, "is occupied by impl-baa92e; nothing was touched"
--push-dev wt-2-try --dry-run                  exit 0, "the token and the address were taken; 0 commit(s) …"
the same, WORKTREE_GIT_TOKEN a program that    exit 1, git: "could not read Username for 'https://….artifacts.
  prints `not-a-token`                         cloudflare.net'"
--list                                         4 lines: 3 clean, 1 not-clean (the writer's own, changed=3)
--leave wt-2-try; --remove wt-2-try            exit 0; `git worktree list | grep -c wt-2-try` 0, no branch bm/wt-2-try
git -C cloud-brain-dev branch | wc -l          1 (the main checkout's copy)
```

An earlier pass at 09:02 CEST, before the last two edits of the script: the plain `worktree.sh wt-2-try`
took 7.4 s (3.04 s in the spec's measurement of the script before); an occupant file that named
`impl-nobody`, a token `issue-as.sh` keeps none of, was taken over with "the occupant impl-nobody is gone";
`--remove` of the worktree with one untracked file was exit 3 with `untracked=1`; `--at 154356f5
rev-wt-2-try` made a view whose clone was at `d6f4632`, the pointer of that commit, and `--at ab4ef9c2`
on it removed a new file and a changed `CLAUDE.md`; `--list` then had `rev-wt-2-try clean … branch=detached`.

`git -C cloud-brain-dev worktree list | wc -l` in the main checkout was 5 at 09:02 and 4 at 09:08: the
writers' worktrees made before this change, one fewer because `ds-1-rows-add-within`, in `--list` at 09:02
and not at 09:08, was removed by its writer between the two. The clones add none (a test). Check 4 of the
spec reads 1 there when the old ones are gone.

## What misled, and one mistake of the writer's

The first run of the old test file against the new script wrote into the writer's own worktree: every
`worktree.sh <id>` was exit 2 (the old fixture had no `origin`), the fixture read its empty stdout as the
path, and `join("", "seed.ojs")` is a file of the directory the tests were started in. One commit `mine`
with `seed.ojs` was made on `bm/wt-2-worktree-sh`, and `cloud-brain-dev/agent.sh` there was written over.
Both were undone (`git reset --soft HEAD~1`, `git rm --cached seed.ojs`, `git checkout -- agent.sh`);
`git -C <root>/cloud-brain-dev branch -a` and the main checkout's reflog showed nothing of it. The fixture
now throws on a cwd or a printed path that is not under the temporary directory.

Two runs of the new file with the scripts of `ab4ef9c2` sent reads to cb4 with the bearers `secret-a` and
`secret-t`, since that `issue-as.sh` has no `ISSUE_AS_BASE`. Each is a read that is refused.

## Not done, not tried

- **A real push with `--push-dev`.** Nothing of `cloud-brain-dev` was changed by this task. What was run on
  the cluster is the dry run above; the push, the rebase and the pointer's commit were run on scratch
  repositories only, where the push address is a directory and the header is not read.
- **Two `--fresh` calls at one moment.** The occupant's file is written with `noclobber`; no test starts two.
  Nor two calls for a name with no worktree, where the second `git worktree add` would be refused.
- **A token whose 48 hours ended.** The 401 is the stand-in's. What cb4 answers such a token was not seen,
  as the spec says.
- **`--at` and `--fresh` of a worktree whose `cloud-brain-dev` is the old `git worktree`.** `--rebase` and
  `--remove` of one are tested; the other two were not run on one.
- **A second machine.** As check 8 has it: a checkout at another path with its own `.emitted`.
- **`TAB=1` from a worktree with the `lopecode-plugin` link.** The link is made (a test, and `ls -ld` in
  `bm-wt-2-try` at 09:02); no channel server was started from one. Task 4 runs one.
- **`--list` with more worktrees than the 4 that stood.** It took 3.2 s for 5 at 09:02.
- **The briefs.** The task says none changes. Lines of them that this change makes untrue are in the
  comment of the submit, for task 3 and the overseer.
