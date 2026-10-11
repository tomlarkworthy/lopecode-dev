# bd-2-release-land-enters-docs

2026-10-11. Task 2 of `plan/cloud-brain-brain-docs-entered-by-hand.md`: `tools/cloud-brain/lock.sh`, the
calling guide, the header of `knowledge-docs.ts`, and the listing of `i1546`, which the orchestrator
carried into this task (event 1550). Local tools and a doc; no seed, no build, no deploy. No put was
made on cb4: the token `loop-docs` had not been made when this was written.

Written in the worktree of the branch `bm/bd-2-release-land-enters-docs`, on `main` at `7e50dddc`.
Three commits, one a change.

## 1. `lock.sh release land` runs the docs step

After `rm holder && rmdir` and the line `land.lock released by …`, the `release` branch runs

```
bun <dir of lock.sh>/knowledge-docs.ts put --stale --limit=30
```

with `BRAIN_BASE` exported as `${BRAIN_BASE:-cb4}`, and prints one line:

| The tool | The line |
|---|---|
| exit 0 | `docs (<brain>): <the last line of its output that is not empty>` |
| any other exit | `docs (<brain>): not entered (<why>)`, cut at 400 characters |

`<why>` is the first line of the output that begins `error: ` (what bun prints for an uncaught throw,
after the source lines), without those words. With no such line it is the last line that is not
empty, and with no output `exit N, and it printed nothing`. The branch then ends with `exit 0`.

The step is not run for `release cb4`, for a release that was refused (not held, or held by another),
or with `LOCK_DOCS=0`. `LOCK_DOCS=<program>` runs that program in the tool's place with the same
three arguments. The usage text (`lock.sh` with no arguments) has three more lines for it.

It is the last lines of `release`, as the spec asks for `lk-3`, which rewrites the file.

### The test

`tests/tools/lock.test.ts`: `fresh()` now sets `LOCK_DOCS=0`, so the 12 cases that were there call
nothing. 4 new cases, each with a stub program that appends its arguments and its `BRAIN_BASE` to a file.

| Case | What it reads |
|---|---|
| a release of land runs the tool | with `BRAIN_BASE` taken out of the environment, the stub's file is `put --stale --limit=30\|cb4`, the release's output is its own line and then `docs (cb4): {"put":2,"entered":2}` (the stub prints two lines; the last is taken) |
| a `BRAIN_BASE` the caller set is kept | `BRAIN_BASE=cbx`: the file has `cbx`, the line is `docs (cbx): …`, and `cb4` is nowhere in the output |
| a tool that fails | three stubs (exit 2 with the no-token sentence on stderr; exit 1 with a throw as bun prints it; exit 1 with no output) and a path with no program: the release is exit 0, `land.lock` is gone, the next writer takes it, and the line is `not entered (…)` with the reason |
| the step is for a release of land that happened | nothing is called by `LOCK_DOCS=0`, `take cb4`, `release cb4`, a release with no lock, `take land`, `show land` or a release by another; the holder's release then calls once |

2026-10-11 20:09:44 CEST, in the worktree, `<main>` the main checkout at `7e50dddc`:

```
$ LOCK_SH=<main>/tools/cloud-brain/lock.sh bun test ./tests/tools/lock.test.ts
 12 pass
 4 fail
$ bun test ./tests/tools/lock.test.ts ./tests/tools/knowledge-docs.test.ts ./tests/tools/docs-entered-by-the-landing.test.ts
 32 pass
 0 fail
$ bun test ./tests/tools
 269 pass
 0 fail
Ran 269 tests across 32 files.
```

The 32 are 16 of `lock.test.ts`, 12 of `knowledge-docs.test.ts` and 4 of the phrase test below.
`bun test ./tests/tools` needs a built notebook at `tools/cloud-brain/.emitted/cloud-brain.html`,
which a new worktree does not have: `tests/tools/issue-lock-sql.test.ts` reads it. With the file moved
aside, `bun test ./tests/tools/issue-lock-sql.test.ts` gave 0 pass, 1 fail; with it back, 7 pass
(20:12:13 CEST). That test is `lk-1`'s and is not changed here.

Also run at 20:12:13 with `BRAIN_BASE=zzz LOCK_DOCS=/bin/false` in the caller's shell,
`bun test ./tests/tools/lock.test.ts`: 16 pass. The cases set both themselves.

### With the tool itself

2026-10-11 20:05:34 CEST, the worktree's `lock.sh`, no stub, the lock in a temporary directory
(`BRAIN_STATE_DIR=$D`), `echo ${BRAIN_BASE:-unset}` printing `unset`:

```
$ BRAIN_STATE_DIR=$D bash tools/cloud-brain/lock.sh take land probe
land.lock taken by probe at 2026-10-11 20:05:34 CEST
$ BRAIN_STATE_DIR=$D bash tools/cloud-brain/lock.sh release land probe
land.lock released by probe at 2026-10-11 20:05:34 CEST (taken 2026-10-11 20:05:34 CEST)
docs (cb4): not entered (no token "loop-docs" is kept. The owner makes it once: BRAIN_BASE=cb4 bun tools/cloud-brain/brain.ts token loop-docs knowledge.put knowledge.list)
exit 0, real 1.20 s
```

This run is not the landing's: `BRAIN_STATE_DIR` was the temporary directory, which the tool hands on
to `brain.ts`, so the token was looked for there and not in the main checkout's `.emitted/`. The
line of this landing's own release, run as the brief gives it, is printed after this file is
committed. It is in the issue's comment.

## 2. `i1546`: the listing, and a name that gives no id

`knowledge-docs.ts` listed the docs with `git ls-tree -r --name-only`. git writes a path with a
character outside ASCII in quotes with escapes (`"knowledge/caf\303\251.md"`), which matched neither
pattern, so the doc had no line in `status` and `--check` did not count it. The listing is now
`ls-tree -r -z --name-only`, split on NUL.

That alone would have made it worse. The id is `doc:` and the file's name in lower case, and the
service takes an id of `/^[a-z0-9][a-z0-9._:-]*$/`, 100 characters at most (`brain-knowledge.ojs`
line 140, `knowledgePatterns.id`; line 137, `knowledgeLimits.id`). `knowledge.put` checks every entry
before it writes any and answers 400 `entry N: id: …` for the call (the same seed, the loop under
"What is kept under the ids given"). Read in the seed, not run on cb4. So one doc named `café.md`,
once listed, would have had each put of its 25 refused, at every landing. The same holds today for a
name with a space or an underscore, which the old listing did pass on: `knowledge/Upper Case.md` was
`doc:upper case` (the question of event 1550).

So a doc whose id is outside that pattern is:

- `badname` in `status`, with the pattern in its line;
- in `badNames` of the last line of `status` and of `put` (the field is absent when there is none);
- counted by `status --check` (exit 1);
- in no put, also when named as an argument. `put --stale` with nothing else behind prints
  `nothing to put; not entered, the id is not one knowledge.put takes (…): <names>`, one line, which
  is what a landing shows.

Decided by line 2 of `philosophy.md` ("autonomously self healing"): one file's name does not stop
the other docs from being entered, and the line of every landing says which file it is.

The pattern in the tool is a copy of the service's two values, with where they were read beside it.
It was not imported: the tool would have to load the module `brain-knowledge` for one expression.
If the service's pattern is widened the tool goes on leaving out names the service would take.

`tests/tools/knowledge-docs.test.ts`, 1 new case: `knowledge/café.md`, `knowledge/Upper Case.md` and
`knowledge/MixedCase.md` pushed. `status --check` exits 1 with 9 docs, 6 fresh, 1 missing and the two
in `badNames`; `put --stale` exits 0 and sends `doc:mixedcase` alone; `put --all` and
`put café "Upper Case"` send no id outside the pattern; with nothing else behind, `put --stale`
prints the one line.

```
$ KNOWLEDGE_DOCS_TS=<main>/tools/cloud-brain/knowledge-docs.ts bun test ./tests/tools/knowledge-docs.test.ts
 11 pass
 1 fail
```

and 12 pass in the worktree, within the 32 above (20:09:55 CEST).

On cb4, a read with the owner's session (`knowledge.list`), from the worktree, 2026-10-11 20:04:44 CEST:

```
$ BRAIN_BASE=cb4 bun tools/cloud-brain/knowledge-docs.ts status --check --owner | grep -v '^fresh'
stale    private changing-and-deploying-a-cloud-brain-worker stale 1.6 h (since 2026-10-11T16:28Z, commit b63b1675)
missing  private cloud-brain-brain-docs-entered-by-hand
missing  private cloud-brain-dashboard-service
stale    private cloud-brain-locks-held-in-the-cluster stale 1.6 h (since 2026-10-11T16:26Z, commit 4afeac1e)
missing  private cloud-brain-record-names-token-not-agent
missing  private cloud-brain-dev-agents
missing  private cloud-brain-dev-readme
missing  private cloud-brain-dev-philosophy
{"docs":67,"fresh":59,"stale":2,"missing":6,"entriesWithNoFile":[],"source":"origin/main@639a2c90"}
exit 1
```

The main checkout's tool, run next, printed the same last line. So the new listing reads the same
67 docs, and none of them is a `badname`.

## 3. The two texts (R7)

- `knowledge/calling-a-cloud-brain-from-this-checkout.md`, "The knowledge docs in the Brain's search":
  written again. It names `lock.sh release land`, the three lines the step prints, the Brain's name,
  the token and the owner's command, `origin/main`, what waits for the next landing (a commit pushed
  with no landing; a push of `cloud-brain-dev` alone), `LOCK_DOCS=0`, the exits of `status --check`
  and `badname`. `topics` in its frontmatter has the step.
- The header of `knowledge-docs.ts`: "No step of a landing runs the put yet" is replaced by what runs
  it and what waits.

`tests/tools/docs-entered-by-the-landing.test.ts`, 4 cases. The spec's R7 gives six counts. One of
them, "Nothing re-enters a changed doc" at 0 in the tool, was already 0: `bd-1` replaced that sentence
with "No step of a landing runs the put yet". The test counts that sentence too, so it fails on the
texts as they were. A fourth case reads five phrases in the guide's section.

2026-10-11 20:09:44 CEST, the test file beside the two texts of `7e50dddc` (`git show` into a
temporary directory), then the counts in the worktree:

```
$ (cd $T && bun test ./tests/tools)
 0 pass
 4 fail
$ grep -c "lock.sh release land" / "loop-docs" / "not entered again by anything" / "Nothing re-enters a changed doc" / "No step of a landing runs the put yet"
knowledge/calling-a-cloud-brain-from-this-checkout.md 2 5 0 0 0
tools/cloud-brain/knowledge-docs.ts 1 2 0 0 0
$ grep -c -- '"--owner"' tools/cloud-brain/knowledge-docs.ts
1
```

## Read before the design

`knowledge.search?semantic=true` with `loop-knowledge`, 2026-10-11, before the issue was started (event 1572):

| Searched | Found first | Used |
|---|---|---|
| "landing lock release runs a step after push" | `doc:cloud-brain-locks-held-in-the-cluster` 1.0 | "whichever lands second rebases over the other": the step is the last lines of `release` |
| "enter knowledge docs into search at landing loop-docs" | `doc:knowledge-reranking` 0.67, `module:tomlarkworthy:brain-knowledge` 0.63 | the seed of the module, for the id pattern of part 2 |
| "git ls-tree quotes non-ASCII path core.quotePath" | `doc:reading-csv-and-delimited-text` 0.92 | nothing bore on it |

## Not tried

- A put on cb4, by the step or by hand. `docs (cb4): {"put":…}` and `docs (cb4): nothing to put`
  were printed with a stub in the tool's place only. The first put is task 3.
- What `knowledge.put` answers for `doc:café` or `doc:upper case` on cb4. Read in the seed.
- A slow Brain. `--limit=30` is for one call, and a put of 67 docs is one list and three puts, so the
  step has no bound of its own under 120 s. An agent's command that ends with the release may be cut
  by its own limit while the step runs; the lock is gone by then.
- Two releases whose puts overlap, the order the spec gives under "After the release, not inside the lock".
- The notes of review 1547 (event 1557), which the orchestrator passed on as "none a finding": a
  thrown tool and `status --check` with a doc behind both exit 1, and `--limit=abc` gives 120 s
  without a word. The tool is as it was for both. The step is not misled by the first: it runs `put`,
  for which any exit but 0 is a failure with its reason. The guide now says that a throw exits 1.
- `LOCK_DOCS` as a path with a space in it, or as a path that is not absolute.
- `lock.sh release land` run from the main checkout while `bun` is not on the path: the case of a
  program that is not there was run with `LOCK_DOCS=/nowhere/docs.sh`.
- `lk-3` over this change. It rebases; nothing of it exists yet.
- `agents/implementer.md` step 10 still says of the release "It prints when the lock was taken and when
  it went" (line 239), with no word of the docs line. Not edited: the spec gives this task the guide
  and the header.
