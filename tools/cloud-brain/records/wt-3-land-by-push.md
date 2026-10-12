# wt-3-land-by-push

2026-10-12. Task 3 of `plan/cloud-brain-worktree-per-topic.md`: parts 1, 2 and 3 of its design written
into the briefs and `SKILL.md`, and check 9 on scratch repositories. Five briefs, one local tool, four
test files. No seed and no deploy. Every command below was run on the owner's laptop after the issue's
`start` (event 3887; `date` after it printed 09:42:33 CEST), in the writer's worktree,
`.claude/worktrees/bm-wt-3-land-by-push`, unless it says the main checkout.

Read first, in the Brain (`knowledge.search?semantic=true`, as `loop-knowledge`): "landing is a push from
the worktree origin main", "orchestrator assigns worktree per topic bm-occupant", "pull ff-only refused
submodule deploy checkout clean". The first entry of each was this task's spec. Nothing else bore on it.

## What changed

**`agents/implementer.md`.**

- A part before the steps, "Where you work": `$W` is the directory the first line of the prompt names,
  `<tree>` what follows `bm-` in its name, `<root>` the main checkout, read with
  `git rev-parse --git-common-dir`. The writer makes no worktree and removes none. Tools are run from
  `$W`. A prompt that names the main checkout is from a session that runs the procedure of before this
  change, and that writer makes its own worktree as before.
- Step 10 is part 1 of the spec. With no deploy it is five lines, in a fenced block: take,
  `worktree.sh --rebase <tree>`, renew, `git -C $W push origin HEAD:main`, release. With a deploy the
  build, the backup, the apply, the commit of `seen.json` and the `lopebooks` pointer come between the
  rebase and that renew, each in `$W`. It has no `git -C <root> pull`, no `merge --ff-only`, no commit
  in the main checkout and no `worktree.sh --remove`.
- `brain.ts` of a landing is the worktree's, with `BRAIN_STATE_DIR=<root>/tools/cloud-brain/.emitted`.
- Step 13 runs `issue-wait.sh` from `$W`.
- "A resumed round" no longer makes a worktree. It runs `worktree.sh --rebase <tree>` and reads
  `git -C $W diff --stat <sha> origin/main`, and the log of `philosophy.md` in `$W/cloud-brain-dev`.

**`agents/spec.md`**: step 5 writes in the worktree the prompt names, step 6 lands by the five lines,
and "A resumed round" has no "Make the worktree again". **`agents/digest.md`**: step 2 works in the
worktree the prompt names; step 7 no longer says "before the worktree goes". **`agents/overseer.md`**:
its commits are made in `bm-over-<host>` and landed by the five lines, where it said "Writers land in
the same checkout".

**`SKILL.md`.**

- Step 1 begins with the two pulls of the main checkout and of its `cloud-brain-dev`, what refuses each,
  the four commands for a refusal over `deploy/`, and the two reads of check 9. Three fenced blocks.
- Step 1 lists the worktrees with `worktree.sh --list` and removes a clean one with no occupant whose
  issue is `done`, `closed` or `rejected`, with a comment `worktree removed {…}`; a view whose issue is
  not under review; never one that is `not-clean`.
- The health step reads `git -C <root> show origin/main:tools/cloud-brain/seen.json`.
- Step 4, before a spawn: `worktree.sh --fresh <topic> --for <the agent's token>`, what each of exit 0, 2,
  3 and 4 is, the comment `worktree {…}` on the topic with the key `orch/<topic>/worktree-<n>`, and a
  prompt whose first two lines name `<W>`. Step 5 runs `--leave`.
- The orchestrator's own commits are made in `bm-orch-<host>`, the overseer's in `bm-over-<host>`.
- The message of a resumed round has a line `Working directory: <W>`, after a second `--fresh`.

**`tools/cloud-brain/notebook-backup.sh`**, one line. The message of the day's backup commit named
`git -C "$ROOT" rev-parse --short HEAD`, the main checkout's commit. A landing no longer moves the main
checkout, so that commit would not be the one the notebook was built from. It now names the `HEAD` of the
checkout the script is run from, which for a landing is its worktree.

## Where the build is not the spec's sentence

- **A renew and a pull of `lopebooks` before the build.** Part 1 step 3 goes from the rebase to
  `build.ts`. Step 10 as it was renewed the lock before the main checkout was written to, and pulled
  the main checkout's `lopebooks` for a backup made on another machine. Both are kept, before the build.
  The pull is of `lopebooks`, which R1 does not name.
- **The pointer takes the whole sha.** Part 1 step 4 has
  `git update-index --cacheinfo 160000,<sha>,lopebooks` with `<sha>` the one the backup printed, which is
  8 characters. `update-index` refuses those (a test). The brief reads it with
  `git -C <root>/lopebooks rev-parse HEAD`.
- **A writer whose prompt names the main checkout** still makes a worktree. The orchestrating session that
  started this task runs the procedure of before it, and so will any session that has not read `SKILL.md`
  again. Without the line that writer would have none. `philosophy.md` line 2.
- **The removal leaves a worktree with an occupant.** Part 3 removes one that is clean and whose topic is
  `done`. A writer that waits for its review (step 13) is in a clean worktree and has not reported.
- **A resumed round is given its worktree in the message.** Part 3 says a resumed writer "is put in it as
  it is". After its landing the worktree is clean and free, and a later task of the topic may be in it
  when the round is sent, so the orchestrator runs `--fresh` again and names the path.
- **`agents/overseer.md`** is not in the task's list of files. Its lines on the landing lock said the
  overseer commits in the checkout writers land in, which this change makes untrue.
- **`verify-run.ts` and `issue-stats.ts` are still run from the main checkout.** Part 3 has "A writer runs
  every tool from `$W`". Neither reads `BRAIN_STATE_DIR` (`grep -n BRAIN_STATE_DIR` in each printed
  nothing), and making them do so is a change to two tools that this task does not list.

## Tests

`tests/tools/worktree.test.ts` had 36 tests and has 44. The eight new ones read a fenced block out of
the brief by a command only that block has, fill in `<root>`, `$W`, `<tree>`, `<id>` and `<token>`, and
run each line with `bash -c` in a checkout made in a temporary directory, as the file's other tests do.
`lock.sh` there is a program that writes each call down.

| Test | What it runs |
|---|---|
| `SKILL.md step 1, the two pulls …` | Another machine lands a file and a commit of `cloud-brain-dev` with its pointer. Before the pulls the second read of check 9 fails. After the two lines both copies are at origin, the first read prints `0`, the second exits 0. |
| `… the pull of cloud-brain-dev refused …` | Twice. A tracked file under `deploy/` that `sync.ts` wrote, changed by a landing: the pull is refused, the first read prints `1`, the four commands bring it up. A file there that is untracked and that a landing added: refused, still refused after `checkout -- deploy` alone, taken after `clean -fd deploy`. |
| `… the main checkout's pull refused …` | A changed file the landing changes; a commit that is not pushed. Each time the pull is refused, the file or the commit is as it was, and the second pull still runs. |
| `… the health step reads seen.json …` | The main checkout's pull is refused and it has no `seen.json`; the brief's `git show` prints the one a landing pushed. |
| `implementer.md step 10, a landing with no deploy …` | The five lines after another landing: origin's `main` is the worktree's `HEAD` with both changes, the main checkout's `main` and files are as before, the lock was taken, renewed and released under the token, and `--list` reads `clean … ahead=0`. |
| `implementer.md step 10, the day's backup …` | The three lines of the pointer after a commit in the main checkout's `lopebooks`: pushed there, one commit of the path `lopebooks` in the worktree, the links kept, landed. 8 characters of the sha are refused. |
| `the briefs after wt-3 …` | Sentences that must be gone from the five briefs, and the commands and the comment's shape that `SKILL.md` must have. |
| `check 8 …` | No `/Users/` in the six briefs and four tools. |

`tests/tools/notebook-backup.test.ts` has one more: the tool run from a `git worktree` with a commit of
its own names that commit and not the main checkout's. With the old line (`git stash` of the script,
then `git stash pop`) that test failed, 11 pass and 1 fail.

Two tests pinned sentences this change made untrue and were changed with them:
`briefs-name-the-prompts-token.test.ts` counted 3 `LOCK_TOKEN=<token> ` in the overseer's brief, now 4
with the renew; `rework-resumes-the-implementer.test.ts` asked for `git -C <root> diff --stat` in "A
resumed round", now `git -C $W diff --stat <sha> origin/main`.

```
bun test ./tests/tools/worktree.test.ts, BRIEFS the main checkout's briefs (65dfee70)     37 pass, 7 fail
bun test ./tests/tools/worktree.test.ts                                                   44 pass, 0 fail, 416 expects
bun test ./tests/tools   before any edit                                                  555 pass, 0 fail, 58 files
bun test ./tests/tools   after the commit of the change and --rebase (which brought
  nothing in), 10:03:18 to 10:06:49 CEST                                                  564 pass, 0 fail, 58 files
bun test ./tests/tools   after the rebase under the lock, which brought in six lines of
  step 6 of implementer.md (another's), 10:09:21 to 10:12:48 CEST                         564 pass, 0 fail, 58 files
```

The seven that fail on the old briefs are the first seven of the table. `check 8` passes on both.

Check 8 of the spec, by its own command, after the last edit: `grep -c "/Users/"` printed 0 for each of
11 files (`worktree.sh`, `lock.sh`, `issue-as.sh`, `notebook-backup.sh`, `cloud-brain-dev/agent.sh`,
`SKILL.md` and the five `agents/*.md`).

## Run outside the tests

- **Tools from the worktree**, between the `date` lines of 09:42:33 and 09:58:13 CEST: `issue-as.sh impl-… "get?id=…"` answered 200;
  `LOCK_TOKEN=… lock.sh show land` answered `land is not held`, exit 1; `issue-wait.sh` ran 20 s under
  `timeout 20` and was ended by it, where a token it does not find is exit 2 at once;
  `BRAIN_STATE_DIR=<root>/tools/cloud-brain/.emitted BRAIN_BASE=cb4 bun tools/cloud-brain/brain.ts curl
  "/xrpc/com.lopecode.brain.knowledge.search?…" --as loop-knowledge` answered entries, and the same
  with no `BRAIN_STATE_DIR` answered `no token "loop-knowledge" is kept`.
- **Check 9 on the main checkout**, 09:58:13 CEST, the two reads as `SKILL.md` has them, with no pull
  before them: `0`, and exit 0. `git ls-remote` of the cluster's `cloud-brain-dev.git`, the pointer of
  `origin/main` and the copy's `HEAD` were each `06a4a2b`, and `git -C cloud-brain-dev branch | wc -l` was 1.
- **`worktree.sh --list`** from the worktree, 10:03 CEST: three lines, `dv-3-deployer-opens-verify-html`
  and `flow-metrics` both `clean` with `occupant=-`, and this task's own `not-clean` with `ahead=1`.
- **The lock, taken once and given back.** 10:09:03 CEST: take, exit 0; `worktree.sh --rebase` printed
  `.claude/skills/brain-maintenance/agents/implementer.md`, a brief, with no conflict; released at 10:09:21
  with nothing pushed, and the suite run again (above), as step 10 says of a rebase that changes what was tested.
- **This change is landed by step 10 as it now reads**: the five lines, from this worktree. How that went
  is in the comment of the submit, since the record is part of what is pushed.

## Not done, not tried

- **The two pulls, and the four commands, on the main checkout.** They are the orchestrator's. On scratch
  repositories only.
- **A pull refused for `index.lock`.** The brief says what to do; no test holds a lock file.
- **A pass of an orchestrator with this `SKILL.md`**: `--fresh --for` before a spawn, the comment
  `worktree {…}` (check 7 of the spec), `--leave`, the removal with its comment, a spawn whose prompt
  names a worktree, a resumed round's message with its `Working directory:` line. None was run. The
  commands of `worktree.sh` among them are the tests of `wt-2-worktree-sh`.
- **A landing with a deploy from a worktree.** `brain.ts apply`, `saw` and `redistil` with
  `BRAIN_STATE_DIR` and the worktree's `seen.json` were read in `brain.ts` (lines 24, 25, 69 and 136 to
  139) and not run. The commit of `seen.json` in the worktree has no test of its own: it is `git add`
  of one file by name.
- **The `lopebooks` pointer on the real repositories**, and `notebook-backup.sh` run by a landing from a
  worktree. On scratch repositories.
- **`worktree.sh --push-dev` for a real change.** Nothing of `cloud-brain-dev` changed here. As the
  record of `wt-2-worktree-sh` says, it was run on scratch repositories and as a dry run.
- **Two orchestrating sessions on one machine**, and a second machine.
- **`rules.md`, "Always"**, still says "Commit, build or push in the main checkout only while holding the
  landing lock". It is the owner's file and task 5's (`wt-5-docs`), with
  `knowledge/changing-and-deploying-a-cloud-brain-worker.md` and `cloud-brain-dev/README.md`.
- **The reviewer** is still started from `<root>/cloud-brain-dev/agent.sh` and makes its own worktree:
  task 4.

## What misled

- `git stash` was used once in the worktree to see the new test of `notebook-backup.sh` fail, which the
  spec's own "What misled the writer" warns of: the stash list is every worktree's. `git stash list`
  after the pop had the 2 entries it had before.
- A test first read the name of the worktree as `<name>`, which the brief already uses for a service
  (`<name>_service`) and `SKILL.md` for a token. It is `<tree>`.
- The fixture's `lopebooks` has no upstream and is on the branch `git init` gives; `git push` with no
  arguments, as the brief has it for the real one, needed `push -u origin HEAD` there first.
