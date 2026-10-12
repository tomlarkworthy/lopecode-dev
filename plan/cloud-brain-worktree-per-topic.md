# Cloud Brain: a worktree for each topic, and no landing in the main checkout

Spec of the feature `worktree-per-topic` on cb4's tracker (opened at event 2456, taken at event
3358, 2026-10-12 03:14:39 CEST by `spec-19144c`). Written 2026-10-12 from 03:14 CEST (the take's `at`) to the first commit's author time
(`git log --format=%ai`), from `lopecode-dev` `origin/main` at `e6cbcadf`. Nothing here is built. Every number
below is from a command run in that span on the owner's laptop, written beside it.

Three findings of the reading change what the issue's body supposed:

- **Most of what was written in the main checkout on 2026-10-11 was not a landing's merge.** Its
  reflog of `main` for that day has 174 `merge bm/…` and 164 commits made in place. 112 of the 164
  touch more than `seen.json` or a submodule pointer, and 45 of those touch `.claude/skills`
  alone: the briefs, edited by an orchestrating session or the overseer. A design that only moves
  the writers' merge leaves half of it.
- **Reuse saves seconds, not minutes.** A worktree from `worktree.sh` took 3.04 s. What a topic's
  worktree gives is one known place for the topic's unlanded work, and one agent that makes and
  removes it.
- **A fix that this project's reports name is `done` and not on `main`.** The issue
  `agent-sh-read-whole-before-run` is `done`. Its commit `d6f4632` is on a local branch of the
  root copy of `cloud-brain-dev` and was never pushed (`git -C cloud-brain-dev rev-list --count
  main..agent-sh-read-whole-before-run` gives 1; `agent.sh` at `3801492` has no block). It waits
  on the letter asked for in comment 2434 of `seen-submodule-landing-unsaid`. Task 1 lands it.

## What was asked

The owner, 2026-10-11, the issue's body:

> so lets do seperate worktrees, the orchstrator ensire the latest one is up to date, and assigns a worktree per topic (maybe record the working tree in the issue so reviewrs and writers can reuse across tasks).. This is a multiplayer issue

The owner, 2026-10-11, comment 2467, of `cloud-brain-dev`:

> can we use the clusters git? I don;t want git bloating from tons of history, so isolated clones of the cloudbrain-dev not in branches. you can use branches in the copy but not in the root one

The owner, 2026-10-10, `philosophy.md`, Clarifications:

> in a multi agent system multiplayer bugs need to be removed.

The reading there: a check whose result depends on what else runs beside it "is moved to where it
runs alone; it is not made tolerant of the company".

## The reports gathered

Parts (`ia "list?parent=worktree-per-topic"`), and the issues linked to it:

| Issue | What was seen | What it becomes |
|---|---|---|
| `seen-main-checkout-edited-outside-lock` (part) | Uncommitted edits of a writer in the main checkout refused another's `merge --ff-only` for 19 minutes | R1 |
| `seen-agent-sh-changed-under-a-run` (part) | `agent.sh` written over by a landing during three reviews; exit 2 after the JSON line | R1 and R6; task 1 lands the fix already written |
| `seen-worktree-left-after-landing` (part) | A done issue's worktree still stood | R5 |
| `seen-submodule-landing-unsaid` (linked, `needs-owner`) | No step and no loop token for a push of `cloud-brain-dev`; a writer used the owner's session | R4. This spec takes choice C of its comment 2434; approving the spec answers it |
| `seen-briefs-change-under-a-writer` (linked) | Eight cases of a brief changed while a writer followed it | R6 |
| `tests-tools-fail-in-a-fresh-worktree` (linked, `done`) | Suite fails in a fresh worktree | Left out: fixed at `5e7e04a1`. Task 2 keeps its count |
| The issue's own list | `index.lock` held by another git process at 18:33:44; a pointer recorded at the wrong commit (`412fc043`); a 20 minute wait for the lock | R1, R4 |
| Reviews 1454 and 2270 | HEAD moved under a review | Left out: the reviewer's brief has made a worktree of its own at `origin/main` since (`brain/roles/reviewer.md`, step 3). R3 moves the making to the orchestrator |

## Requirements

- **R1.** No agent of the loop, and no orchestrating session, commits, merges, builds or edits a
  tracked file in the main checkout. A landing writes nothing there.
- **R2.** A topic has a worktree. The topic of an issue is its parent when it has one, and
  otherwise the issue. The orchestrator makes the worktree, brings it up to `origin/main` before
  an agent is put in it, and does not put an agent in one that holds another's unlanded work.
- **R3.** A reviewer reads the submitted commit in a checkout nobody else writes, made by the
  orchestrator.
- **R4.** `cloud-brain-dev` in a worktree is a clone from the cluster's git. No branch is made in
  the root copy and none is pushed to the cluster. A loop token pushes it.
- **R5.** Where a topic's worktree is, is written on the topic's issue. The orchestrator removes
  it when the topic is `done`, `closed` or `rejected`.
- **R6.** An agent reads its briefs and runs its tools from files that do not change during its run.
- **R7.** It holds on a second machine: nothing in it needs a path of the laptop.

## What exists today, measured

2026-10-12, 03:15 to 03:25 CEST, main checkout at `11be574c` then `e6cbcadf`.

```
git reflog --date=iso main | grep 2026-10-11            174 merge bm/…, 164 commit
  of the 164, touching only seen.json or a submodule pointer    52
  of the other 112, touching .claude/skills alone               45
git worktree list                                       23 lines at 03:15: the main checkout, 2 bm-*, 20 others; 27 and 6 bm-* at 03:26
du -sh .git / lopebooks / a bm-* worktree               6.5 G / 863 M / 1.4 G (1.1 G of it scratch/)
git -C cloud-brain-dev branch                           main, agent-sh-read-whole-before-run (1 commit not on main), rc-3-philosophy (0)
time tools/cloud-brain/worktree.sh worktree-per-topic   3.04 s
time git clone <cb4>/git/cloud-brain-dev.git            2.23 s, .git 2.2 MB, 24 commits; sync.ts in it 0.76 s
issue-stats.ts, locks                                   land: 110 holds, median 20.9 s, longest 323.1 s
bun test ./tests/tools/worktree.test.ts                 7 pass, 0 fail
```

- **The landing** is step 10 of `agents/implementer.md`: under the lock, `git -C <root> pull
  --ff-only`, `merge --ff-only bm/<id>`, a build copied into `<root>/lopebooks`, a commit of
  `seen.json` in the root, a push from the root, then `worktree.sh --remove <id>`.
- **A worktree** is made by the writer, one an issue, from the root's local `main`, with
  `cloud-brain-dev/` a `git worktree` of the root copy (so `git -C cloud-brain-dev worktree list`
  shows 5) and `lopebooks`, `lopecode` as links.
- **Two tasks of one project are written at once in a third of cases.** Of 64 spans from
  `in-progress` to the next move, over the 14 projects with a written task, 21 overlap a span of
  another task of the same project (a script over `issue.get` of every project's parts; not kept).
  So one worktree a topic with one writer in it would queue a third of the writing.
- **Tools already find the state from a worktree.** `lock.sh` and `issue-as.sh` read the tokens
  from the main checkout's `.emitted` through `git rev-parse --git-common-dir`; `brain.ts` does
  with `BRAIN_STATE_DIR`, and writes `seen.json` beside itself (`brain.ts`, line 136: read, not run).
- **`origin` is GitHub over ssh** for `lopecode-dev` and `lopebooks`; for `cloud-brain-dev` the
  fetch address is cb4 and the push address Cloudflare's, with a token from `git.token`.
- **`git.token`** is the owner's (`brain-git.ojs`, line 163, `who: "owner"`). A token that names
  the method gets a write token for any repository of the owner's; the seed's own reference says
  a rule holds one to a repository, and `brain-core.ojs` line 2053 tests a rule on `caller.holder`.

## Read

- The Brain, `knowledge.search?semantic=true`, four searches ("git worktree per topic agents
  share one checkout", "isolated clone of cloud-brain-dev from the cluster git push token",
  "multiple agents concurrent edits same repository merge queue", "landing lock main checkout
  collision"). Used: `module:tomlarkworthy:virtual-monorepo`, the owner's own account of the
  pattern, read in `lopebooks/notebooks/@tomlarkworthy_virtual-monorepo.html`: "The submodule
  checkouts at the root are shared, so nobody commits there directly … the agent makes a git
  worktree off that submodule". R1 is that sentence applied to the loop.
  `doc:cloud-brain-locks-held-in-the-cluster`: the lock is a row of cb4 and is met from any
  machine. `doc:cloud-brain-worker-machine-on-fly` (`awaiting-approval`): its writers on a second
  machine "push nothing" when a deploy is needed and otherwise land as step 10 says; this design
  changes step 10 for both machines and needs nothing from that spec. The third search returned
  eight papers on self-improving agents; none bears on this.
- `git-worktree(1)`, https://git-scm.com/docs/git-worktree, through a tool that answers with a
  model's summary: a branch checked out in one worktree is refused in a second; "the support for
  submodules is incomplete. It is NOT recommended to make multiple checkouts of a superproject."
  That is why `worktree.sh` links or clones each submodule itself.
- The merge queue, read only in a search's summary of the bors forum
  (https://forum.bors.tech/t/how-is-bors-different-from-protected-branches-on-github/346) and
  Jane Street's post (https://blog.janestreet.com/making-never-break-the-build-scale/): one
  serial step rebases a change on the trunk and advances the trunk only to that result; nobody
  pushes the trunk by hand. The landing lock with a fast-forward push is that, with the writer as
  the queue's worker. Not taken: a bot that tests the merged result. The writer's tests after its
  rebase are that test already (step 9 of its brief).

## The design

### 1. A landing is a push from the worktree (R1, R7)

Under the landing lock, in its worktree `$W`:

```
tools/cloud-brain/worktree.sh --rebase <name>     # fetch, then rebase on origin/main
LOCK_TOKEN=<token> lock.sh renew land <id>
git -C $W push origin HEAD:main                   # a fast-forward or refused
```

No `pull`, `merge` or `commit` in the root. `seen.json` is written by the worktree's own
`brain.ts` (`BRAIN_STATE_DIR=<root>/tools/cloud-brain/.emitted bun $W/tools/cloud-brain/brain.ts
apply …`) and committed in `$W` before the push. The emitted file stays in the root's `.emitted`,
which is state, named for the issue and not tracked.

Run in this spec's worktree at 03:23: with `HEAD` one commit behind `origin/main`, `git push
--dry-run origin HEAD:main` was refused ("Note about fast-forwards"); after the rebase below it
answered `Everything up-to-date`. So a worktree that is behind cannot land.

`worktree.sh` takes `origin/main` after a fetch as its base, for a new worktree and for
`--rebase`, in place of the root's local `main`. With that edit made in the worktree's copy,
`--rebase` took 1.32 s, brought in `e6cbcadf` and printed the one file it changed; the edit was
then taken back. `git fetch origin` there took 1.55 s.

**What is still written in the root, and by whom:**

- The built notebook, `<root>/lopebooks/notebooks/@tomlarkworthy_cloud-brain.html`, by
  `notebook-backup.sh` under the lock, and its commit once a day. Left as it is. It is one file,
  written whole from committed seeds, by the lock's holder; none of the reports names it. Moving
  it needs a second working copy of an 863 MB repository or a sparse one, which nobody has tried.
  Reopened by: a refused commit or an `index.lock` failure in `lopebooks` during a landing.
- `git -C <root> pull --ff-only`, by the orchestrator at the start of a pass, so that its own
  skill and the owner's files are current. It is refused when it would write over a file changed
  there, and then nothing is lost: it says so in step 7 and goes on. No agent reads its brief
  from the root (part 3), so this pull changes nothing under a running agent.

### 2. `cloud-brain-dev` is a clone (R4)

In `worktree.sh`, `dev()` clones `https://<brain>/git/cloud-brain-dev.git` into
`$W/cloud-brain-dev`, checks out the commit the worktree's `HEAD` names, detached, and runs
`sync.ts`. Done by hand in this spec's worktree at 03:23: 1.87 s for the three; `bun test.ts
brain-x-static` there gave 12 passed, 0 failed; the `--rebase` above ran with the clone in place.
`worktree.sh --remove` deletes it with the worktree. The root copy has no worktree and no branch
but `main`.

A change to it is committed in the clone, on a branch of the clone when the writer wants one.
Under the landing lock, before the `lopecode-dev` push: `git pull --rebase origin main` in the
clone, a push of that commit to `main` at Cloudflare's address with a write token of 120 s from
`git.token?name=cloud-brain-dev&scope=write` called `--as loop-git`, then the pointer committed
in `$W`. The token is piped into `git -c http.extraHeader=…` and never printed. That is a new
command, `worktree.sh --push-dev <name>`, so that the token's one use is in one place.

### 3. The orchestrator assigns, and writes it on the issue (R2, R5, R6)

Before it spawns a writer for issue `<id>` of topic `<topic>`:

```
tools/cloud-brain/worktree.sh --fresh <topic>        # or <topic>.2 when an agent of yours is in the first
```

`--fresh` makes the worktree when there is none. When there is one it fetches and asks three
things: tracked files changed (`git diff --quiet HEAD -- . ':!lopebooks' ':!lopecode'
':!cloud-brain-dev'`), untracked files but the `tools/node_modules` link, commits not on
`origin/main` (`git rev-list --count origin/main..HEAD`), and the same two counts in the clone
with `deploy/` left out. All none: it rebases on `origin/main`, exit 0. Any: exit 3, the list
printed, nothing touched. Run by hand at 03:23 in this spec's clean worktree: exit 0 and four
zeros; with one line added to a tracked file the first gave exit 1.

Exit 3 is a writer that died or was sent back. When the unlanded work is of the issue being
started (a rework, a resumed round, a `back`), the writer is put in it as it is and told so.
Otherwise the orchestrator takes `<topic>.2` and says so in a comment on the issue whose work
stands there. It deletes nothing of a writer's.

Then one comment on the topic's issue, with its own token, key `orch/<topic>/worktree-<n>`:

```
worktree {"topic":"<topic>","branch":"bm/<topic>","machine":"<hostname -s>","path":"<abs>","at":"<sha of origin/main>","for":"<id>"}
```

The next agent reads it with `ia "get?id=<topic>"`, the events of type `commented` whose key
begins `orch/<topic>/worktree-`. The branch is local and is not pushed: what travels to another
machine is `origin/main`, and the comment tells an orchestrator there that unlanded work may
stand on the machine it names.

The spawn prompt's first line is `Working directory: <W>` and its second names the brief in
`<W>/.claude/skills/…`. A writer runs every tool from `$W`. What it reads does not change until
its own rebase at the landing.

**The orchestrator's own commits** (a brief, `SKILL.md`, a journal line that is tracked) and the
overseer's are made in `bm-orch-<host>` and `bm-over-<host>`, brought up with `--fresh` and
landed as part 1.

**Removal.** At the start of a pass `worktree.sh --list` prints each `bm-*` worktree with its
three counts. For one that is clean, the orchestrator reads `ia "get?id=<topic>"`; at `done`,
`closed` or `rejected` it runs `worktree.sh --remove <name>` and comments `worktree removed
{…}`. One that is not clean is never removed by the loop: it is named in step 7. Only `bm-*`
under `.claude/worktrees` is listed: 20 of the 22 worktrees at 03:15 were not the loop's.

### 4. A reviewer is started in a view (R3, R6)

Before a review of a submit whose last commit ref is `<sha>`:

```
V=$(tools/cloud-brain/worktree.sh --at <sha> rev-<topic>)
CHECKOUT=$V $V/cloud-brain-dev/agent.sh reviewer "review issue <id>; your token is <name>"
```

`--at` makes or resets a detached worktree at `<sha>` (`git checkout --detach -f`, `git clean
-fd` but for the links), with its clone. A view holds nothing kept. `DRY=1` of that `agent.sh`
from this spec's worktree printed `checkout: …/bm-worktree-per-topic`: the launcher's default is
already the directory above it. `worktree.sh` links `lopecode-plugin` as it links `lopebooks`,
since `TAB=1` starts the channel server from the checkout and that directory is empty in a
worktree today. Not run: a `TAB=1` review from a view; task 4 runs one.

The reviewer's brief loses the steps that make and remove a worktree (`brain/roles/reviewer.md`
names a worktree in 21 lines on 2026-10-12, `grep -c worktree`). A note it mends is committed in the view and
pushed as part 1.

### Not chosen

- **A clone of `lopecode-dev` and `lopebooks` for each topic.** 6.5 G and 1.1 G of history
  against 2.2 MB. The owner's word was of `cloud-brain-dev`. Worktrees share one `.git`, and their
  branches are local and deleted with them.
- **A landing worktree kept at `main`.** A second shared working copy, with the same faults as
  the first. The push needs none.
- **One worktree a topic with one occupant.** It queues 21 of 64 writing spans. `<topic>.2` costs 3 s.
- **A reviewer in the writer's worktree.** The reviewer would read what the next writer is
  doing: the multiplayer bug of the 2026-10-10 clarification.
- **A new event type or a ref for the worktree.** A ref is taken on `move` and `review` only
  (`brain-issues.ojs`, lines 736 and 737) and the orchestrator makes neither at that point. A
  type is a deploy of the tracker and a policy install. `cost` began as a comment and became a
  type after 383 of them, when totals were wanted across issues; nothing here is summed.
- **A hook that refuses a write in the main checkout.** A hook cannot tell a session of the
  owner's from the loop's. Check 1 below counts what it would have refused.

## How each requirement is known to be met

Each is run by an agent with its own token, from any worktree. `<root>` is the main checkout.

1. **R1.** `git -C <root> reflog --date=iso main | grep <day> | grep -c 'merge bm/'` and `… |
   grep -c ': commit'`. Run 03:25: 174 and 164 for 2026-10-11. After task 3, for a day the loop
   ran whole: 0, and the commits that remain are a session's of the owner's. It cannot be run
   before a day has passed; task 6 runs it.
2. **R1.** `bun tools/cloud-brain/issue-stats.ts --token=<token>`, the line `land`. Before: median
   20.9 s, longest 323.1 s. Predicted lower, since the build and the merge leave the hold; no
   number is promised.
3. **R2, R5.** `worktree.sh --list` names no `bm-*` worktree whose topic is `done`, `closed` or
   `rejected` and clean. Before, 03:15: 2 stood, of `dv-3-deployer-opens-verify-html` (`done`) and `flow-metrics`
   (`awaiting-approval`); whether they are clean was not read. The command is task 2's and does not exist yet.
4. **R4.** `git -C <root>/cloud-brain-dev branch | wc -l` is 1 and `worktree list | wc -l` is 1.
   Run 03:23: 3 and 5. `git ls-remote <cb4>/git/cloud-brain-dev.git` lists `HEAD` and
   `refs/heads/main` only: so it did at 03:16.
5. **R4.** `brain.ts curl "/xrpc/com.lopecode.brain.git.token?name=cloud-brain-dev&scope=write&seconds=60" --as loop-git -X POST`
   answers 200, and with `name=` any other repository 403. Not run: the token does not exist.
6. **R3, R6.** `bun test ./tests/tools/worktree.test.ts` in a fresh worktree: 7 pass today; the
   tasks add tests for `--fresh` (clean, dirty, ahead), `--at`, `--list`, the clone and the push
   refused when behind, on scratch repositories as the file's seven are.
7. **R5.** `ia "get?id=<topic>"` of the first topic assigned after task 3 has a `commented` event
   whose body begins `worktree {`.

## The tasks, in the order they land

1. **`wt-1-land-the-agent-sh-block`.** Rebase `d6f4632` on `cloud-brain-dev` `main`, run
   `tests/tools/light-agent.test.ts`, push it and the pointer. Needs `loop-git`. Then delete the
   root copy's two branches (check 4).
2. **`wt-2-worktree-sh`.** `worktree.sh`: `origin/main` as the base, the clone, the
   `lopecode-plugin` link, `--fresh`, `--at`, `--list`, `--push-dev`, and `--remove` refusing a
   worktree that is not clean without `--force`. Tests as check 6. No brief changes: step 10 as
   written still works, since its pull makes the root's `main` equal to `origin/main`.
3. **`wt-3-land-by-push`.** Step 10 of `agents/implementer.md` and step 6 of `agents/spec.md` become part 1 and part 2
   (`agents/digest.md` step 7 lands by step 10 and copies its build to the root's `.emitted`, which stays); the writer no longer removes its
   worktree. `SKILL.md`: the pull at the start of a pass, the assignment and comment of part 3,
   the orchestrator's and the overseer's own worktrees, the removal.
4. **`wt-4-reviewer-in-a-view`.** `SKILL.md` step 4 starts the reviewer as part 4; the
   reviewer's brief on the Brain loses its worktree steps (`put.sh roles/reviewer.md`, by the
   writer of a task of an approved spec, `rules.md`). One `TAB=1` review run from a view.
5. **`wt-5-docs`.** `knowledge/changing-and-deploying-a-cloud-brain-worker.md`,
   `cloud-brain-dev/README.md` and `rules.md`'s "Always" (the lines on the main checkout and the
   landing lock; a change to `rules.md` is `major`), and the line for a session outside the loop
   in the doc of `ta-5-outside-session-doc`: `worktree.sh out-<name>`, landed by push.
6. **`wt-6-check-after-a-day`.** Checks 1 to 4 and 7 after one whole day of the loop, with the
   numbers in a record, and what they say against this spec.

## What the orchestrator makes

- **`loop-git`**, methods `git.token` and no other: `BRAIN_BASE=cb4 bun tools/cloud-brain/brain.ts
  token loop-git git.token`. Needed by task 1. Its method reaches every repository of the owner's.
  What holds it to `cloud-brain-dev`: the rule in the owner's list below; until he puts it, an
  agreement, the token being used by `worktree.sh --push-dev` and by nothing else.

## What only the owner can do

- Put the rule that holds `loop-git` to one repository, with his session:
  `rule.put { target: "com.lopecode.brain.git.token", allow: 'caller.session || caller.holder != "secret:loop-git" || request.params.name == "cloud-brain-dev"' }`.
  The text is to be tried in the rig of `brain-git.ojs` first (its line 316 tries one of the same
  shape); it was not run. Whether a member's call passes the first clause was not read.
- Approve the change to `rules.md` in task 5.
- Say whether his own sessions, and those that work for him outside the loop, follow R1. This
  spec does not ask it of them: the main checkout is his.
- Remove the worktrees that are not `bm-*` (20 at 03:15), if he wants them gone. The loop does not touch them.

## What misled the writer of this spec

- `git stash` in a worktree writes the stash list every worktree shares. One was made and popped
  at 03:23; the list is as it was (`git stash list`, 2 entries, both older).
- `README.md` at the root is a link to `CLAUDE.md`: a line added to one to test the dirty check
  changed the other, and was taken back with `git checkout -- CLAUDE.md` in the worktree.
- The issue's body says 29 worktrees stood at 22:00 on 2026-10-11. `git worktree list` gave 23 lines at 03:15, two of
  them the loop's.
