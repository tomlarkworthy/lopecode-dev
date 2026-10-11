# bd-1-knowledge-docs-as-loop-docs

2026-10-11. Task 1 of `plan/cloud-brain-brain-docs-entered-by-hand.md`: `tools/cloud-brain/knowledge-docs.ts`
and a new test file. A local tool; no seed, no build, no deploy. No put was made on cb4: the token
`loop-docs` does not exist until the owner makes it.

## What was wrong

Every call of the tool was made with `--owner` (line 25 of the tool as it was), so `put` was a write
as the owner present, the first line of "Never" in `rules.md`. It read the docs from the files on
disk, so another session's open edit in the main checkout would have been entered. `status` named
every entry of kind `doc` without a file as "no file": the spec's run of 19:13 CEST printed four, and
by their `method` the tool had entered none of them.

## What changed

Commit `71516c9f` (2026-10-11 19:45:20 +0200), in the worktree `bm/bd-1-knowledge-docs-as-loop-docs`.

- **The token.** A call is `brain.ts curl … --as loop-docs`. With the argument `--owner` it is the
  owner's session, as before. `grep -c -- '"--owner"' tools/cloud-brain/knowledge-docs.ts` is 1, the
  line that passes the argument on.
- **No token.** `brain.ts` answers a name it keeps no token for on stdout and exits 1 before it sends
  anything. The tool reads that, prints the command the owner makes the token with, and exits 2. It
  does not call again with the session.
- **The state.** The spawned `brain.ts` gets `BRAIN_STATE_DIR` of the main checkout, found from the
  tool's own place with `git rev-parse --git-common-dir` as `lock.sh` does. One the caller set is kept.
- **The source.** Docs are listed with `git ls-tree -r origin/main knowledge/ plan/` and read with
  `git show origin/main:<path>`; the hash is of those bytes. The stale age is from
  `git log origin/main -- <path>`; the two cases that read a file's mtime are gone.
- **`status --check`** exits 1 when a doc is stale or missing. Without it `status` exits 0 as before.
- **No file.** `entriesWithNoFile` holds an entry only when its `method` is `knowledge-docs`.
- **Three more docs.** `AGENTS.md`, `README.md` and `philosophy.md` of `cloud-brain-dev`, read with
  `git -C cloud-brain-dev show <commit>:<file>` at the commit `git ls-tree origin/main cloud-brain-dev`
  names. Ids `doc:cloud-brain-dev-agents`, `-readme`, `-philosophy`; private; `source`
  `cloud-brain-dev`; `url` the submodule's address in `.gitmodules` of `origin/main`. When the
  checkout of the submodule lacks that commit the three are left out of the count and of
  `entriesWithNoFile`, and the last line has `cloudBrainDev` with the reason.
- **`--limit=SECONDS`** is curl's `-m` for one call (120 without it). The spec gives the landing's
  step 30 s; task 2 passes it.
- The last line of `status` and of `put` has `source`, the commit of `origin/main` that was read.
- The header says the above, and "No step of a landing runs the put yet", which is so until task 2.

Not changed: `knowledge/calling-a-cloud-brain-from-this-checkout.md`. Its section still shows
`put --stale` with nothing before it, which an agent now runs to exit 2 and the owner's command.
The spec gives that section to task 2 (R7), with the sentence that names what enters a doc.

## The test

`tests/tools/knowledge-docs.test.ts`, 11 cases. Each makes a repository in a temporary directory with
a bare `origin`, a second repository as `cloud-brain-dev`, a copy of the tool at
`tools/cloud-brain/knowledge-docs.ts` and a fake `brain.ts` beside it. The tool finds `brain.ts` and
the repository from its own place, so the copy needs no switch in the tool for tests. The fake writes
each call's arguments, body and `BRAIN_STATE_DIR` to a file; no case calls a Brain.
`KNOWLEDGE_DOCS_TS=<path>` runs the cases on another copy of the tool.

In the worktree, 2026-10-11 19:45 CEST:

```
$ KNOWLEDGE_DOCS_TS=<main checkout>/tools/cloud-brain/knowledge-docs.ts bun test ./tests/tools/knowledge-docs.test.ts
 1 pass
 10 fail
$ bun test ./tests/tools/knowledge-docs.test.ts
 11 pass
 0 fail
$ bun test ./tests/tools
 245 pass
 0 fail
Ran 245 tests across 29 files.
```

The first run is the tool as it was. The one case that passes there is the cut at 16,000 characters,
which the change keeps.

| Requirement | Case |
|---|---|
| R2 | the fake's arguments hold `--as loop-docs` and no `--owner` for `put --stale`; `--owner` given, the reverse. With no token: exit 2, the owner's command in the output, for `status`, `status --check` and `put --stale`, and three calls in the fake's file, none with `--owner` |
| R3 | a doc edited on disk, a new file on disk and a commit not pushed: `status --check` exits 0 with 6 of 6 fresh, `put --stale` sends nothing, `put --all` sends the pushed text and its hash |
| R4 | two entries with no file, `method` `research:x` and `knowledge-docs`: the second alone is named |
| R5 | a pushed change with an old entry: `status --check` exits 1, `status` 0, `put --stale` sends that doc alone; a doc with no entry: exit 1 |
| R6 | the submodule's checkout one commit ahead of the recorded one: the three are sent with the hashes of the recorded commit, private, with the address. The recorded commit absent from the checkout: 3 docs of 3 fresh, `cloudBrainDev` names the commit, `put --all` sends three ids. A file of 16,000 characters and more: the first 16,000 are sent, the hash is of the whole file |
| | the state is the main checkout's from a worktree of the temporary repository; a `BRAIN_STATE_DIR` set by the caller is kept; `--limit=30` is `-m 30` |

## On cb4

From the worktree, 2026-10-11 19:44:03 CEST, before the commit and with the same text of the tool:

```
$ BRAIN_BASE=cb4 bun tools/cloud-brain/knowledge-docs.ts status --check
no token "loop-docs" is kept. The owner makes it once: BRAIN_BASE=cb4 bun tools/cloud-brain/brain.ts token loop-docs knowledge.put knowledge.list
exit 2
$ BRAIN_BASE=cb4 bun tools/cloud-brain/knowledge-docs.ts put --stale
(the same line)
exit 2
$ BRAIN_BASE=cb4 bun tools/cloud-brain/knowledge-docs.ts status --check --owner | grep -v '^fresh'
stale    private changing-and-deploying-a-cloud-brain-worker stale 1.3 h (since 2026-10-11T16:28Z, commit b63b1675)
missing  private cloud-brain-brain-docs-entered-by-hand
missing  private cloud-brain-dashboard-service
stale    private cloud-brain-locks-held-in-the-cluster stale 1.3 h (since 2026-10-11T16:26Z, commit 4afeac1e)
missing  private cloud-brain-record-names-token-not-agent
missing  private cloud-brain-dev-agents
missing  private cloud-brain-dev-readme
missing  private cloud-brain-dev-philosophy
{"docs":67,"fresh":59,"stale":2,"missing":6,"entriesWithNoFile":[],"source":"origin/main@0bce5726"}
exit 1
```

The third is a read with the owner's session (`knowledge.list`), made once to see the tool against
the real entries. It ran from a worktree, whose own `.emitted/` has no session, so the state it used
was the main checkout's. `entriesWithNoFile` is empty, where the tool as it was named four (R4 on cb4).

## Not tried

- A put on cb4, with any token. The first is task 3, after the owner has made `loop-docs`. So it is
  not known that `knowledge.put` takes `source: "cloud-brain-dev"` and the `.gitmodules` address as
  `url`.
- `--limit` cutting a call that is slow: the test reads the argument given to `brain.ts`, no more.
- A list of more than one page. The fake answers one page with no cursor. The run on cb4 above
  matched 61 entries to docs (59 fresh, 2 stale); whether its list had a second page was not read.
- The stale age of one of the three files of `cloud-brain-dev`. The case of a stale doc is `knowledge/b.md`.
- An `origin/main` that is behind GitHub's. The tool fetches nothing; it reads the ref as the last
  push or fetch of this checkout left it.
- A token `loop-docs` that is kept and refused (revoked, or without `knowledge.list`): the tool then
  throws with the status, as for any refused call. Not run.
