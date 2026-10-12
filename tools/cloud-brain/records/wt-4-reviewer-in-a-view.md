# wt-4-reviewer-in-a-view

2026-10-12. Task 4 of `plan/cloud-brain-worktree-per-topic.md`, part 4 of its design: the orchestrator makes
a view for each review and starts the reviewer from it, and the reviewer's brief on the Brain makes no
worktree and writes nothing in the main checkout. Two briefs, the spec, three test files. No seed and no
deploy. Every command below was run on the owner's laptop after the issue's `start` (event 3997; `date`
after it printed 12:25:47 CEST), in the writer's worktree `.claude/worktrees/bm-worktree-per-topic` or in a
view made from it, unless it says otherwise.

Read first, in the Brain (`knowledge.search?semantic=true`, as `loop-knowledge`): "reviewer started in a
detached worktree view of the submitted commit", "light agent reviewer agent.sh checkout TAB channel
server". The first entries were this task's spec, `cloud-brain-lean-reviewer-persona` and the README of
`cloud-brain-dev`. Used: the README's account of `agent.sh` (`CHECKOUT`, `TAB=1`, the Read hook and its
`BRAIN` variable). Nothing else bore on it.

## What changed

**`SKILL.md`.**

- Step 4. Before a review the orchestrator runs `V=$(tools/cloud-brain/worktree.sh --at <sha> rev-<id>)`
  from the main checkout, then `CHECKOUT=$V $V/cloud-brain-dev/agent.sh reviewer "review issue <id>; your
  token is <name>"`, where it ran `<root>/cloud-brain-dev/agent.sh`. `<sha>` is the last `commit` ref of the
  last `submit` or `submit-spec` that is of `lopecode-dev`; with none, `origin/main` after a fetch. The step
  says what exit 0, 1 and 2 of the `--at` are. `TAB=1` goes before the same line. The Agent fallback gets
  the view as its working directory.
- Step 5. When a reviewer has reported, `worktree.sh --remove rev-<id>`. On exit 3: `--force` when the
  counts have `ahead=0` and `dev-ahead=0` (a file the reviewer copied in), and otherwise the view is left
  and named, since a commit of the reviewer's stands there.
- Step 1. Three things are read from the main checkout's copy of `cloud-brain-dev`, where it said four: the
  reviewer's `agent.sh` is the view's. A view that is `not-clean` with no commit, whose issue is not under
  review, goes with `--force`.

**The reviewer's brief**, `roles/reviewer.md` on the Brain (355 lines, sha256 `bdc94a5dee99`, before; the
copy before is kept by `put.sh`).

- The head says the checkout is a view, what it has (the links, a clone of its own, `<root>` by
  `git rev-parse --git-common-dir`), that `brain.ts` takes
  `BRAIN_STATE_DIR=<root>/tools/cloud-brain/.emitted`, that the reviewer moves the view with
  `worktree.sh --at <commit> <view>` and neither makes nor removes one, and that the tools are those of the
  view's commit.
- One paragraph, "Started in no view", for a reviewer whose checkout is on a branch: it makes the view with
  `--at <sha> rev-<id>` and removes it. This is what a reviewer started by a session that has the
  `SKILL.md` of before reads, and the Agent fallback when it is given a repository root.
- Step 3: the fetch is `git -C <checkout> fetch --no-recurse-submodules origin main`; the build of
  `origin/main` is made in the view after `worktree.sh --at origin/main <view>`; `redistil` has the state
  directory. The nine lines the overseer put as a stopgap (comment 3914) are gone.
- Step 4: `sync.ts` and `test.ts` run in the view's clone, where the reviewer made a `git worktree` of the
  main checkout's copy; `tab-tests.ts` runs on the view's build, with no copy and no `--remove`; a test is
  shown to fail without the fix after `--at <sha>^ <view>`.
- The mend of a note is a commit in the view, then the landing lock, `worktree.sh --rebase <view>`,
  `git push origin HEAD:main` and the release, where it pulled, committed and pushed in the main checkout.
- A line for the tests of `tests/tools` that read the brief from the Brain: in a view at a commit from
  before this change, `reviewer-brief-waits-on-show.test.ts` has 1 fail that is not the change's.

**`agents/reviewer.md`**, the pointer: the working directory of the prompt is the checkout.
**`plan/cloud-brain-worktree-per-topic.md`**: an "As built" note under task 4.

**Tests.** `tests/tools/reviewer-in-a-view.test.ts`, new, 10 tests: six read the brief, three read
`SKILL.md`, one runs `agent.sh` with `DRY=1` and a directory in the view's place.
`tests/tools/reviewer-brief-waits-on-show.test.ts`: its third test held the fetch line, the detach line and
the `$W` path of before, and holds the new three.

## What was run

**The new test before any edit** (12:31:01 CEST): `bun test ./tests/tools/reviewer-in-a-view.test.ts` gave
1 pass, 9 fail. The pass is the test of `agent.sh`, which this task does not change.

**A scratch view**, `worktree.sh --at 440173cb rev-wt-4-try`, 4.5 s. In it:

```
git symbolic-ref -q HEAD                                  exit 1 (detached)
DRY=1 CHECKOUT=$V $V/cloud-brain-dev/agent.sh reviewer …   checkout: …/bm-rev-wt-4-try   (the same with no CHECKOUT)
tools/cloud-brain/issue-as.sh impl-148fcb "get?id=…"       [200]
LOCK_TOKEN=impl-148fcb tools/cloud-brain/lock.sh show land land is not held, exit 1
BRAIN_BASE=cb4 bun tools/cloud-brain/brain.ts redistil     TypeError: getaddrinfo ENOTFOUND cb4-deployer.undefined.workers.dev
BRAIN_STATE_DIR=<root>/… the same                          every Worker `same`
bun tools/cloud-brain/build.ts --out …                     2.0 s
(cd cloud-brain-dev && bun test.ts brain-x-static)         passed 12, failed 0
bun tools/cloud-brain/tab-tests.ts … brain-static          tests 12, passed 12
getSource of brain-x-static against the build, diff -w -B  12 lines, the `[]` of three imported modules
worktree.sh --at 440173cb^ rev-wt-4-try                    0.9 s, HEAD 467073f7; .emitted/cloud-brain.html still there
git fetch -q origin main                                   exit 128, expected submodule path 'lopebooks' not to be a symbolic link
git fetch --no-recurse-submodules origin main              exit 0
```

**The mend, with `git push --dry-run` in the push's place and no lock.** The view at `origin/main~1`, one
line added to a record and committed, then `worktree.sh --rebase rev-wt-4-try`: exit 0, the commit on
`origin/main`, HEAD still detached, the links back. `git push --dry-run origin HEAD:main` answered
`5fe4ef8f..c1b9612f  HEAD -> main`. `--list` then read `not-clean … ahead=1`, and `--remove` was exit 3.
A second commit that changed the lines `origin/main` had changed: `--rebase` exit 1, `--at` refused ("a
rebase is stopped"), and after `git rebase --abort` the `--at origin/main` put the view back, `clean`.
`--at deadbeefdeadbeef rev-wt-4-try`: `no commit … here or on origin/main`, exit 1.

**Two trial reviews from a view.** A writer makes no `rev-` token and may not start a review of an issue at
`in-review` beside the orchestrator's, so each trial was of an issue already `done`, with the writer's own
token in the task and, after it, a sentence that this is a trial: steps 1 to 6 as the brief has them, nothing
written to the tracker, no mend, no lock, and a report of each command and each line of the brief that did
not hold. The draft of the brief was served from this machine, and each reviewer read it through the hook
of its view's clone (`BRAIN=http://127.0.0.1:8765` before the command; the server's log has a `GET
/static/cloud-brain-dev/roles/reviewer.md` 200 for each). The views were `rev-wt-4-trial-plain` and
`rev-wt-4-trial-tab`: a name of no issue, so that an orchestrator's pass does not remove one under its
reviewer.

| | plain | `TAB=1` |
|---|---|---|
| issue, view at | `tests-tools-suite-three-minutes`, `5fe4ef8f` | `tp-2-push-to-receive`, `154356f5` |
| started (`date`), `ms` of the JSON line | 12:34, 266,177 | 12:34, 441,235 |
| `usd`, `context`, `turns` | 1.23, 97,394, 17 | 2.46, 150,137, 43 |
| `toolset` | Bash, Glob, Grep, Read | those four and 30 `mcp__lopecode__…` |
| what it ran in the view | the suite (582 pass, 1 fail), the new test of that issue, `--at bc0de01c^` and back | `redistil`, two builds and compares (12 lines each), `--at origin/main` and back, `sync.ts`, `test.ts` (13 passed), two `--with` copies (12 of 13 each), `tab-tests.ts` (13 of 13), the suite (503 pass, 1 fail), nine reads of cb4 |
| the tab | none | `qa_open_notebook` of the view's build as session `rev-tp-2-trial-tab`, `run_tests` 13 of 13, `qa_close` by that name |
| verdict it would have given | `pass` | `pass` |

The 1 fail of each suite run is `reviewer-brief-waits-on-show.test.ts`, which at those commits holds the
brief's lines of before, read against the draft. Neither wrote to the tracker: `get?id=` of each issue
after the runs has no event by `secret:impl-148fcb`.

What the two reports changed in the brief:

- The tools of a view are of its commit. At `154356f5`, from before `wt-2-worktree-sh`, the view's
  `issue-as.sh` kept no token (exit 2) and its `worktree.sh` had no `--at`; that reviewer used the main
  checkout's two. The brief has the line, and the command that tells (`merge-base --is-ancestor b5077cde HEAD`).
- `origin/main` moved between the reviewer's fetch and its `--at origin/main` (`9d9ea979` to `4e02e2e9`):
  the refs are shared with every checkout of the machine. The brief said "as the fetch left it".
- `<sha>^` is the parent of the last ref, which may be a record's commit and have the fix.
- The expected diff is four lines of `diff` output a module, where the brief said two.
- `git diff --stat` with no path lists the four links; the move took 1.0 to 2.9 s, where the draft said
  about 1 s; the scratchpad is kept by a move; how to tell a commit from before this change.

## Counts

`tests/tools/suite.sh`, in the writer's worktree, after the brief was put and after the last edit of a test
or of `SKILL.md`: 593 pass, 0 fail, 593 tests in 61 files, 95.84 s (ended 12:46:34 CEST).

`bun test ./tests/tools/reviewer-in-a-view.test.ts`, the brief read from the Brain: 10 pass, 0 fail.

## Not done, not tried

- **A review of an issue at `in-review`, started by an orchestrator as step 4 has it.** The two runs were
  trials. The first real one is the review of this issue, if the orchestrating session has pulled `SKILL.md`
  by then.
- **Step 7 and a real mend from a view.** No review, no move, no lock taken by a reviewer in a view, and
  the mend's push was a dry run by the writer.
- **A spec's review and a digest's review from a view.** Neither was run. A spec's `submit-spec` ref was
  read on `worktree-per-topic` (events 3487 and 3537: a bare sha), and that is all.
- **The Agent fallback with a view as its working directory.** Not spawned.
- **"Started in no view".** Not run by a reviewer: `--at` and `--remove` are the commands the writer ran,
  from a worktree on a branch.
- **The orchestrator's lines of step 4 and step 5 as written.** The `--at`, the launch and the `--remove`
  were each run by the writer; `--remove … --force` on a view with a copied file was not (the test of
  `worktree.test.ts` for `--force` is of a worktree on a branch; not read further).
- **A view under an orchestrator's pass while its reviewer still runs after its move** (a ticket being
  opened after the verdict): step 1 removes a clean view whose issue left `in-review`. `--at` writes no
  occupant. Not seen, not tried.
- **Two reviewers at once in two views**: the two trials ran together from 12:34 to 12:39, and each ran
  the tools suite then; nothing else of it was measured.
- **`lopecode-dev`'s `CLAUDE.md` is in a reviewer's first request in a view.** `cloud-brain-dev/.claude/settings.json`
  excludes `**/lopecode-dev/CLAUDE.md`, and a view's is `…/worktrees/bm-rev-<id>/CLAUDE.md` (the plain
  trial's report, item 7). Not changed here: filed as `view-reviewer-reads-lopecode-dev-claude` (event 4024).
- **The six things comment 3914 lists as said of the brief and not put** are not in this change.
- **Other writers' worktrees.** A worktree at a commit from before this one has the old
  `reviewer-brief-waits-on-show.test.ts`, which fails 1 against the brief as put, until it is rebased.

## What misled the writer

- `BRIEF=<file> tests/tools/suite.sh` gave 6 fail: `tests-tools-suite-parallel.test.ts` and
  `overseer-md-order-of-service-reads.test.ts` read another brief from the same variable. The suite's count
  is from a run with no `BRIEF`, after the put.
- `put.sh` run from a worktree's clone calls `brain.ts` with no
  `BRAIN_STATE_DIR`: `./put.sh roles/reviewer.md` there answered `the copy before was not kept; nothing changed`,
  exit 1, and with `BRAIN_STATE_DIR=<root>/tools/cloud-brain/.emitted` before it `roles/reviewer.md put; index written`
  (12:44:50 CEST; the Brain's copy is then 401 lines, sha256 `31a706a4570d`, and `put.sh --history` ends with
  `2026-10-12T10-44-50Z-bdc94a5d`). `put.sh --get` needs no token and worked without.
