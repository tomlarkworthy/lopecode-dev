# tests-tools-fail-in-a-fresh-worktree

2026-10-11. Five test files under `tests/tools/`, one helper, one sentence of the writer's brief.
No seed, no deploy. The commits are the three before this record's; the submit names them.

## What was wrong

Two causes, in two kinds of checkout. Both runs below are at `bcf9e955`, before any edit.

**A worktree fresh from `worktree.sh`, nothing built** (made 22:16 CEST by the links' `ls -la` time and run next, `bun test ./tests/tools`):

```
(fail) (unnamed)       tests/tools/issue-lock-sql.test.ts, its beforeAll
 360 pass  1 skip  1 fail      Ran 362 tests across 40 files
```

`issue-lock-sql.test.ts` read `tools/cloud-brain/.emitted/cloud-brain.html` whenever `.git` is a
file. That file is made by `build.ts`, and a writer of a doc or a local tool runs no build. This is
the "1 fail" of the three writers the issue quotes.

**A plain `git worktree add --detach`, with `lopebooks` linked by hand** (22:29:01 CEST, made at
`.claude/worktrees/plain-ttf`; `cloud-brain-dev/` and `lopecode/` empty, as git leaves a submodule):

```
(fail) (unnamed)                                  atproto-publish.test.ts, its beforeAll
(fail) x3   reviewer-brief-names-token.test.ts    "fetch is not a function"
(fail) x1   reviewer-brief-names-token.test.ts    ENOENT cloud-brain-dev/agent.sh
(fail) (unnamed)                                  issue-lock-sql.test.ts
(fail) x5   reviewer-brief-waits-on-show.test.ts  "fetch is not a function"
error       light-agent.test.ts                   ENOENT cloud-brain-dev/agent.sh, read at load
 328 pass  12 fail  1 error    Ran 340 tests across 40 files
```

Eight of the twelve are one defect that is not about the worktree's files at all.
`atproto-publish.test.ts` read `globalThis.fetch` into `realFetch` on the line after
`loadPublisher(…/lopecode/notebooks/atproto.html)`. With no `lopecode`, `loadPublisher` threw first,
`realFetch` stayed `undefined`, and the file's `afterAll` assigned it to `globalThis.fetch`. Every
test file bun ran after it in that process had no `fetch`; the eight tests that read the reviewer's
brief from cb4 are the ones that ask for it. Shown alone, before the fix, with `lopecode` renamed
away in the worktree made by `worktree.sh`:

```
bun test ./atproto-publish.test.ts ./needs-fetch.fixture.ts      (in tests/tools)
  fetch after: undefined        0 pass, 2 fail
```

This is the reviewers' case: "the failures are tests of the reviewer brief and agent.sh"
(`writers-qa-tabs-wake-the-orchestrator`, 309 pass 11 fail of 320 at `70b324f0`). Their count is not
reproduced exactly. A plain worktree at `70b324f0` in the session's scratchpad, outside the
checkout, gave 303 pass, 17 fail of 320 (between 22:16 and 22:21:44): there `light-agent.test.ts` had no read at load, so
its 15 tests failed one by one, and the reviewer-brief tests passed because `atproto-publish.test.ts`
failed earlier still, at its import (`Cannot find package 'linkedom'`: a worktree outside the
checkout finds no `node_modules` above it). So the fails differ by what the checkout lacks
(`cloud-brain-dev`, `lopecode`, a build, a `node_modules` above it), and by the commit only in how a
file fails for want of the same thing.

Not traced: the fail "named from a worktree" of review 2270 at `5ecbbc0c`. The two tests with those
words in their names (`knowledge-docs.test.ts`, `summarize-papers.test.ts`) gave 23 pass, 0 fail in a
plain worktree at `5ecbbc0c` (after 22:21:44). Not reproduced: the `atproto-publish` timeout at 5000 ms the
triage reason names; no run of mine showed it.

## What changed

- **`tests/tools/needs.ts`**, new. `notebookOf` picks the notebook: the one `BRAIN_NOTEBOOK` names,
  else a worktree's build when the file is there, else the committed
  `lopebooks/notebooks/@tomlarkworthy_cloud-brain.html`. `testNeeding(file, paths)` gives `test`
  when every path exists, and otherwise `test.skip` after printing one line:
  `skipped: <file>: no <paths>. tools/cloud-brain/worktree.sh makes a worktree that has it; …`.
- **`issue-lock-sql.test.ts`** uses both. In a worktree with no build it reads the committed notebook
  through the `lopebooks` link. It is skipped when the notebook or
  `cloud-brain-dev/deploy/@tomlarkworthy/brain-db.js` is absent.
- **`atproto-publish.test.ts`** reads `fetch` at load, so `afterAll` puts back a function whatever
  `beforeAll` did. It is skipped with no `atproto.html`; `ATPROTO_HTML` names another.
- **`light-agent.test.ts`** and the one test of `agent.sh` in **`reviewer-brief-names-token.test.ts`**
  are skipped with no `agent.sh` (and `put.sh`). The second file now takes `CLOUD_BRAIN_DEV`, as the
  first did.
- **`agents/implementer.md`**, step 6: a fresh worktree gave 0 fail, so a fail in that count is
  looked at, and a `skipped:` line goes in the comment.

The issue offered a skip or a read from a place the worktree has. For the notebook the read was
taken, because a skip would leave seven tests of `issue.lock`'s SQL out of every writer's count.
Its cost: a writer who changes `brain-issues.ojs` and runs this file before building tests the
committed notebook and not the seed. The main checkout has always done that. Building in the test
was the third way (not timed here) and was not taken: `build.ts`
also writes `shell.html` and `verify.html` into `.emitted/`.

For a missing submodule there is nothing to read in its place, so those are skips, each with its line.

## Counts

The first two at the second commit as it was before the rebase onto `main` (`c01d74c8` then, `67bb0902` on `main`), 2026-10-11.

```
worktree.sh worktree, .emitted/ empty, 22:33:38      bun test ./tests/tools
  373 pass  1 skip  0 fail     Ran 374 tests across 41 files
plain worktree, cloud-brain-dev/ and lopecode/ empty, 22:35:03      bun test ./tests/tools
  342 pass  32 skip  0 fail    Ran 374 tests across 41 files, and four `skipped:` lines:
  atproto-publish.test.ts; reviewer-brief-names-token.test.ts, its test of agent.sh;
  issue-lock-sql.test.ts; light-agent.test.ts
```

The one skip of the first run was there before the change (`light-agent.test.ts`, the test of
`agent.sh` written over). `tests/tools/needs.test.ts` holds the change: 6 tests, each of the four
files run with its path pointed at a directory that does not exist, and `needs-fetch.fixture.ts`
run after `atproto-publish.test.ts` in one process. With `needs.ts` in place and the three test
files of the first commit put back as `bcf9e955` has them, `bun test ./tests/tools/needs.test.ts`
gave 1 pass, 3 fail (before 22:25:59; four tests then).

After the last edit (the `skipped:` line names `lopecode` too, `c2643032`) and the rebase onto `main`
at `9de0dd52`, which brought in three test files of other writers:

```
worktree.sh worktree, .emitted/ empty, 22:37:07      bun test ./tests/tools
  391 pass  1 skip  0 fail     Ran 392 tests across 44 files
```

That is the count of the submit. The plain worktree was not run again after the rebase.

## Not tried

- A reviewer's own run in the checkout its brief makes. The brief is a file of the Brain and was
  not changed: this issue is no task of an approved spec, so the put is the overseer's.
- A worktree whose `cloud-brain-dev` is at another commit than its HEAD names. `agent.sh` is then
  there, the tests run against it, and may fail on what that commit lacks.
- A plain worktree outside the checkout after the change, in full. At the first commit one gave
  340 pass, 27 skip, 1 fail, 1 error (22:27), the fail and the error both `atproto-publish.test.ts`
  on `Cannot find package 'linkedom'`. The second commit does not change that: the import is at the
  top of the file.
- `node --test tests/notebooks/*.test.js` in a worktree. Step 6 still gives its count to the main
  checkout.
- The main checkout itself with a submodule not initialised.
- Whether one worktree a topic (open, the owner's) changes where a suite is run.
