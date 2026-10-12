# wt-5-docs

## 2026-10-12: "Always" of `rules.md` and four docs say what `wt-3-land-by-push` built

Task 5 of `plan/cloud-brain-worktree-per-topic.md`, which the owner approved at event 3737 of
`worktree-per-topic`. Docs and a test file: no seed, no Worker, no deploy. Started at event 4469
(2026-10-12 21:16 CEST). The change to `rules.md` is `major`: it is on `main` once this lands, and
its approval is the owner's.

Since `wt-3-land-by-push` the briefs land a change by a push from a worktree. The rules the briefs
are under still said the opposite, in three places of "Always":

```
$ git show 1d545375:.claude/skills/brain-maintenance/rules.md | grep -n 'Commit, build or push\|worktree.sh <id>\|Push `lopebooks`'
136:- Commit, build or push in the main checkout only while holding the landing lock:
141:  builds are in its worktree (`tools/cloud-brain/worktree.sh <id>`) and need no lock. A seed's tests are run
148:- Work on `main`. Stage only the files you changed. Push `lopebooks` and `lopecode-dev`.
```

The brief says of `rules.md` that "it overrides this file" (`agents/implementer.md`, line 4), so a
writer who read both had a rule that let it commit in the main checkout under the lock and a brief
that forbade it. The record of `wt-3-land-by-push` left the line for this task ("Not done, not
tried": "It is the owner's file and task 5's").

### What changed

| File | Before | After |
|---|---|---|
| `rules.md`, "Always", item 3 | "Commit, build or push in the main checkout only while holding the landing lock" and "A writer's own edits and builds are in its worktree (`tools/cloud-brain/worktree.sh <id>`)" | "Write no tracked file of `lopecode-dev` in the main checkout", where the work is, who makes the worktree (`worktree.sh --fresh <topic> --for <token>`), `bm-orch-<host>` and `bm-over-<host>`, the three writes that remain, that `.emitted` is state, and what the item read until now |
| the same, a new item 4 | the lock's two commands were in item 3 | "Land by a push from your worktree, and only while holding the landing lock": take, `worktree.sh --rebase <name>`, `git push origin HEAD:main`, release. The sentences on the token, the cluster and `deploy/` are as they were; "that worktree's `cloud-brain-dev/`" gains "a clone of its own" |
| the same, "Work on `main`" | "Stage only the files you changed. Push `lopebooks` and `lopecode-dev`." | the branch `bm/<name>` is local; files staged by name, never `commit -a` or `add -A` (the links); `cloud-brain-dev` by `worktree.sh --push-dev <name>`; `lopebooks` when the backup committed |
| `knowledge/changing-and-deploying-a-cloud-brain-worker.md` | steps written for the main checkout; step 7 "Commit on `main` here, and push" | a paragraph before step 1 for an agent of the loop; step 2 has the build with `--out` and what `build.ts` answers with none; step 7 has the landing by push |
| `knowledge/calling-a-cloud-brain-from-this-checkout.md`, the part for a session outside the loop | no worktree named | a last item with seven lines: `worktree.sh out-<name>`, the lock, the rebase, the push, the release, `--remove` |
| `knowledge/working-with-cloud-brain-remote-lopecode-cluster.md`, the row of `cloud-brain-dev/` | the push by hand | and `worktree.sh --push-dev <name>` from a worktree |
| `cloud-brain-dev/README.md` | the push by hand, with a token of `git.token` | a part "A change from a worktree of lopecode-dev", with the owner's words of comment 2467 |
| `cloud-brain-dev/AGENTS.md` | "Work in a copy of your own (`git worktree add`)" | the copy is made by `worktree.sh <name>`, a clone |
| `plan/cloud-brain-worktree-per-topic.md`, task 5 | | an "(As built, …)" line |

Three things here are not in the task's sentence. "Work on `main`" is a third item of "Always": the
task names "the lines on the main checkout and the landing lock", and "Push `lopebooks` and
`lopecode-dev`" is a line on what a landing pushes that the push from a worktree made untrue. The
hub's row and `AGENTS.md` each had one line of the same kind, met by the search below.

The line for a session outside the loop is offered ("can be made as an agent of the loop makes
one"), not required. The spec, "What only the owner can do": "Say whether his own sessions, and
those that work for him outside the loop, follow R1. This spec does not ask it of them: the main
checkout is his." The same is said in the paragraph added to the guide to changing a Worker. "Always" speaks to
"every agent of the issue loop" (the file's title) and names no session of the owner's.

### What was run

Each line by the writer, 2026-10-12, in `bm-worktree-per-topic`, at the time `date` printed.

```
21:18:05  tools/cloud-brain/worktree.sh out-wt5-try            exit 0, printed …/.claude/worktrees/bm-out-wt5-try
          tools/cloud-brain/worktree.sh --list | grep '^out-wt5-try '
          out-wt5-try clean changed=0 untracked=0 ahead=0 dev-changed=0 dev-ahead=0 occupant=- branch=bm/out-wt5-try head=1d545375
          git -C <that path> rev-parse HEAD origin/main       1d545375… twice
          tools/cloud-brain/worktree.sh --remove out-wt5-try   exit 0; the directory and the branch gone
21:18:25
21:18:29  bun tools/cloud-brain/build.ts                       exit 1, "error: in a worktree: pass --out tools/cloud-brain/.emitted/cloud-brain.html"
21:22:47  worktree.sh --push-dev worktree-per-topic --dry-run  exit 1, "2 file(s) of …/cloud-brain-dev are changed or new and not committed; nothing was pushed"
21:22:56  the same, after the commit in the clone              exit 0, "dry run: the token and the address were taken; 1 commit(s) of the clone are not on its origin/main; nothing was written"
```

The exit 1 at 21:22:47 is the refusal the new part of the README names; it was met, not planned.

### Tests

`tests/tools/wt-5-docs.test.ts`, 9 tests. Each of `RULES`, `CHANGING`, `GUIDE`, `HUB`, `README` and
`AGENTS` names another copy of a file, so the file before the change can be read:

```
$ S=<scratch>; git show 1d545375:<path> > $S/<name> for the four of lopecode-dev; git -C cloud-brain-dev show ca5299a:<path> for the two of the clone
$ RULES=$S/rules.md CHANGING=$S/changing.md GUIDE=$S/guide.md HUB=$S/hub.md README=$S/README.md AGENTS=$S/AGENTS.md bun test ./tests/tools/wt-5-docs.test.ts
 0 pass
 9 fail                                                         21:20:26
$ bun test ./tests/tools/wt-5-docs.test.ts
 9 pass
 0 fail                                                         21:20:15
```

What they hold: the three items of "Always" by their words and the landing's four commands by their
order; that each `worktree.sh` flag the four docs of `lopecode-dev` name is a line of the tool's
header; that the words the guide gives for `build.ts` with no `--out` are the ones `build.ts` throws;
the seven lines of the part for a session outside the loop, and that `SKILL.md` leaves an `out-*`
worktree; the README's part and the line of `AGENTS.md`. The ninth reads the clone, and prints
`skipped: wt-5-docs.test.ts, its test of cloud-brain-dev: no <file>` in a checkout that has none.
They hold words: none of them runs a landing.

Eight files of the suite hold other sentences of `rules.md` or of the guides, or enter the docs. Run with the new test
after the edits, 21:20: `bun test ./tests/tools/wt-5-docs.test.ts ./tests/tools/rules-md-acts-on-the-owners-word.test.ts
./tests/tools/rules-md-lock-sh-lines-name-token.test.ts ./tests/tools/rules-md-owners-word-not-secrets.test.ts
./tests/tools/rules-md-philosophy-push-leave.test.ts ./tests/tools/rules-count-for-a-task-with-no-tests.test.ts
./tests/tools/ta-5-outside-session-doc.test.ts ./tests/tools/knowledge-docs.test.ts ./tests/tools/docs-entered-by-the-landing.test.ts`
gave 65 pass, 3 fail. The 3 were of `knowledge-docs.test.ts`, each at 5,00x ms: that command has
bun's 5 s for a test and not the suite's 30 s. `bun test --timeout=30000 ./tests/tools/knowledge-docs.test.ts`
then gave 16 pass, 0 fail. `scripts/check-learnings-triggers.sh` was exit 0.

The whole suite, `tests/tools/suite.sh`, twice, both after the last edit of a doc or the test:

```
21:23:04 to 21:27:34   692 pass, 2 fail, 694 tests across 69 files [269.98s]
21:38:28 to 21:41:27   694 pass, 0 fail, 694 tests across 69 files [178.39s]   no line `skipped:`
```

The 2 of the first run each ended at 30,00x ms, the suite's limit for a test:
`knowledge-docs.test.ts`, "put --stale also puts a fresh doc whose entry is unmarked", and
`summarize-papers.test.ts`, "check: a summarized entry passes". `uptime` at 21:27 gave load
averages of 31.34, 28.24 and 19.76, with other agents' runs on the machine, and the brief has the
suite at 93 to 95 s. The two files run again at once (21:27 to 21:35, 464 s for 42 tests) failed
those two and a third of the second file the same way. Each of the three then passed when run
alone with a longer limit: `bun test --timeout=240000 ./tests/tools/knowledge-docs.test.ts -t 'put --stale also puts'`,
1 pass in 37.30 s (21:35), and `bun test --timeout=260000 ./tests/tools/summarize-papers.test.ts -t 'refused once|check: a summarized entry passes'`,
2 pass in 65.91 s (21:36). So the count submitted is the second run's, 694 pass and 0 fail, and
the first run's 2 are read as the machine's load, on those three runs alone: what each of the
two files reads was not looked into. The record was edited once during the second run (the counts of the
search below).

### Searched

The Brain, three searches with `knowledge.search?semantic=true` as `loop-knowledge`: "worktree for
each topic landing by push", "session outside the loop commit main checkout landing lock", "push
cloud-brain-dev clone write token". Each answered the spec first or second, with the three guides
and `doc:cloud-brain-dev-readme`, which are the files changed here. Nothing else bore on it.

The checkout, for what the changed lines are spoken of elsewhere
(`git grep -n -F '<words>' -- knowledge 'plan/cloud-brain-*.md' .claude/skills/brain-maintenance 'tools/cloud-brain/*.md' CLAUDE.md`,
with this record left out, 21:38): `worktree.sh <id>` 9 lines, `Commit, build or push` 5, `Push `lopebooks`` 2, `Not a branch`
1, `git worktree add` 8, `pushurl` 5, `Work on `main`` 2. Of those not in a file changed here, two
are in specs of other tasks and quote the old first sentence of the item as the rule of their day:
`plan/cloud-brain-brain-docs-entered-by-hand.md` line 124 and
`plan/cloud-brain-locks-held-in-the-cluster.md` line 668. They are left, and named in the comment
of the submit. The rest are records, the briefs' line for a prompt that names the main checkout
(`implementer.md` lines 73 and 540, `spec.md` line 49: the plain `worktree.sh <id>`, which the
header still has), and `oversight.md`.

### Not done, not tried

- **The seven lines for a session outside the loop, as a whole.** The first and the last were run
  under the name `out-wt5-try`. The four between were run by this landing from
  `bm-worktree-per-topic` with an `impl-` token. No commit was made in an `out-` worktree, no lock
  was taken with an `out-` token, and no session outside the loop has run them.
- **`notebook-backup.sh` from a worktree, and the push of `lopebooks`.** This landing has no build.
  What the docs say of them is the script's header and step 10 of the implementer's brief.
- **The orchestrating session's two pulls.** Named in "Always" from `SKILL.md` and the spec; not
  made or watched by the writer.
- **Whether the owner's sessions work in a worktree.** Not asked of them, and not decided here.
- **Other lines of `rules.md` that speak of the main checkout** ("A token an approved spec names":
  "from the main checkout"; "A Bluesky DM": "Run it from the main checkout, by its absolute path").
  Both are a tool run there that writes no tracked file. They are outside "Always" and were left.
- **The ninth test in the main checkout before its copy of `cloud-brain-dev` is pulled.** It reads
  the working file of the checkout it is in. With the main checkout's copy named, at `ca5299a`
  (21:45, before this landing):
  `README=<root>/cloud-brain-dev/README.md AGENTS=<root>/cloud-brain-dev/AGENTS.md bun test ./tests/tools/wt-5-docs.test.ts`
  gave 8 pass, 1 fail. So the suite run in the main checkout fails that test from this landing
  until the orchestrating session's pull of that copy. A worktree or a view made after the landing
  has its clone at the pointer, which names the commit with the lines. The test was left as it is.
- **A reader with the files alone.** `/review-notebook` was not run: the loop's reviewer is the
  fresh read (`agents/implementer.md`, step 9).

### The landing

No deploy. Under the landing lock, taken as `wt-5-docs` at 21:47:02 CEST after a wait behind three
landings (the first take, 21:45:56, was exit 1).

The change to `cloud-brain-dev` was landed by `worktree.sh --push-dev`, the second real push by the
command (the first is the pointer commit `d448fbae` of 13:41:45 that day):

```
21:47:24  tools/cloud-brain/worktree.sh --push-dev worktree-per-topic
          24 services, 78 shared modules, 62 files                 (stderr, sync.ts after the push)
          d9957f81679b80d43a7221bec93f794f08f19f54                 (stdout)   exit 0
21:47:28
$ git ls-remote https://cb4.endpointservices.workers.dev/git/cloud-brain-dev.git
d9957f81679b80d43a7221bec93f794f08f19f54	HEAD
d9957f81679b80d43a7221bec93f794f08f19f54	refs/heads/main
$ git ls-tree HEAD cloud-brain-dev                                  in the worktree
160000 commit d9957f81679b80d43a7221bec93f794f08f19f54	cloud-brain-dev
```

4 s. The commit was made on the clone's detached `HEAD`, with no branch, and it was one commit on
the cluster's `main` as it stood, so the command's rebase had nothing to move. It made the
pointer's commit in the worktree itself, "cloud-brain-dev: the pointer at d9957f8, pushed by
worktree.sh --push-dev". Not met: a rebase of the clone that moves a commit, a conflict, a push
that is refused.

`worktree.sh --rebase worktree-per-topic` under the lock refused once, exit 1, "cannot rebase: You
have unstaged changes": two mends of this record stood uncommitted. Committed, it brought in 20
files, among them `SKILL.md`, which the new test reads one sentence of; the test was run again
after it, 9 pass, 0 fail (21:47:24). The whole suite was not run again after that rebase: its
last run is the one of 21:38.
