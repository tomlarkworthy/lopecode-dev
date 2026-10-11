# Cloud Brain: the docs of the checkout are entered by the landing, not by hand

Spec of the project `brain-docs-entered-by-hand` on cb4's tracker. Written 2026-10-11 between
19:10 and 19:40 CEST from `lopecode-dev` `eb6b653a`, `cloud-brain-dev` `4c17e68` and the tracker at
event 1370. Nothing here is built. Each number under "The design" that is not under "What exists
today" is an estimate and says so.

## What was asked

The owner gave no words for this project. The overseer gathered it (event 1314, 2026-10-11 19:05
CEST) from three feedback tickets, under his word of the same day on gathering (`philosophy.md`,
Clarifications): "I think we need something consolodating isolated issues into one larger set of
gather requirements for a large reenginneing project".

Two things he did say bear on it:

- Tom, 2026-10-11, in `agents/spec.md` step 4 and `agents/implementer.md` step 2: "update the loop
  instructions to use knowledge.search to do prior art research before implementing or designing".
  Every writer and spec writer now searches the entries this project is about.
- Tom, 2026-10-11, the note `fb-a2vp4smwzq` on the page's operator: "it should have access to
  cloudbrain-dev and the knwledge base and be more aware of how things work than it currently does,
  not with a big system prompt but to points of where to get more information from".

The project's body asks one thing of the spec before a design: "What the defect costs today is not
measured, and the spec should say it". It is under "What the defect costs".

## The reports gathered

| Report | What it saw | What it becomes |
|---|---|---|
| `seen-knowledge-docs-stale-in-search` (1111) | 3 docs stale for 9.9, 9.2 and 6.9 h and 3 missing, of 57; no step of the loop runs the put | R1, R2, R3, R5 |
| `seen-doc-entries-with-no-file` (1189) | `status` names four entries as having no file | R4. The report is wrong about what the four are: see "The four entries" below. No entry is deleted |
| `seen-operator-cannot-read-dev-repo` (1187) | `AGENTS.md`, `philosophy.md` and `README.md` of `cloud-brain-dev` are in no entry and at no address | R6 |

Beside the project and not parts of it: `knowledge-by-says-owner-for-a-token` (an entry a token
put reads `by: owner`; so will the entries of this design) and `seen-knowledge-get-cuts-long-guides`
(an entry's text ends at 16,000 characters; 22 of the 63 docs are longer, counted 19:17 CEST by
`len()` of each file). This design changes neither.

## Requirements

- **R1.** When a landing of the loop ends, every doc of `knowledge/*.md` and
  `plan/cloud-brain-*.md` on `origin/main` has an entry with that file's SHA-256.
- **R2.** The put is made with a token an agent may write with. No agent calls it with `--owner`.
- **R3.** An entry is made from the pushed file, not from the file on disk, so that another
  session's open edit in the main checkout is not entered.
- **R4.** `status` names as "no file" only an entry this tool entered.
- **R5.** A doc that fell behind by any other way (a commit with no landing, a put that failed) is
  entered by the next landing, and one command with an exit code says whether any doc is behind.
- **R6.** The operator of the page finds the three files of `cloud-brain-dev` with the tools its
  brief already names.
- **R7.** The guide and the tool's header say what enters a doc. Both say today that nothing does.

## What exists today, measured

**The tool.** `tools/cloud-brain/knowledge-docs.ts`, 102 lines. `status` lists `knowledge.list?kind=doc`
and compares each entry's `sha256` with the file on disk. `put --stale` sends `knowledge.put` for
each doc that is not fresh. Both go through one function, line 24:

```
const r = spawnSync("bun", [join(root, "tools/cloud-brain/brain.ts"), "curl", "/xrpc/com.lopecode.brain." + path, "--owner", …
```

So the put is a write as the owner present, the first line of "Never" in `rules.md`. It has been
run by writers of the loop all the same: `records/light-reviewer-tab-and-docs.md` line 78,
"`knowledge-docs.ts put --stale`, `{"put":10,"entered":7,"changed":3,"vectors":8}`". Three other
records say the writer left the doc stale instead (`doc-example-mints-tracker-token.md` line 50,
`land-lock-any-session-can-remove.md` line 93, `redistil-apply-leaves-seen-json.md` line 158). A
writer today either crosses the rule or leaves the search behind.

**Now.** `BRAIN_BASE=cb4 bun tools/cloud-brain/knowledge-docs.ts status`, 2026-10-11 19:13:14 CEST,
0.84 s wall:

```
missing  private cloud-brain-dashboard-service
stale    private cloud-brain-locks-held-in-the-cluster stale 0.8 h (since 2026-10-11T16:26Z, commit 4afeac1e)
missing  private cloud-brain-record-names-token-not-agent
{"docs":63,"fresh":59,"stale":2,"missing":2,"entriesWithNoFile":["doc:research-memento-3-build","doc:research-memento-3","doc:research-talorys","doc:knowledge-reranking"]}
```

The second stale doc is `changing-and-deploying-a-cloud-brain-worker` (the overseer's comment,
event 1338). This spec will be the third missing doc when it lands.

**The four entries.** `knowledge.list?kind=doc&limit=100` with the owner's session (a read),
19:14 CEST: 65 entries, all `by: owner`, 38 public. By `method`:

```
knowledge-docs 61    research:memento-3 2    research:talorys 1    research:knowledge-reranking 1
```

The four that `status` prints are the four that `knowledge-docs.ts` did not enter. Their `url`s are
`tools/cloud-brain/research-talorys.md` and `tools/cloud-brain/knowledge-reranking.md` (both files
exist, `ls`, 19:17), `/library/research-memento-3` and
`/static/corpus/research-memento-3/build/README.md` on cb4 (not fetched by me). Line 87 of the tool
counts every entry of kind `doc` whose id is not a file of its two directories. No doc of
`knowledge/` or `plan/cloud-brain-*.md` has been deleted or renamed since 2026-10-01
(`git log --since=2026-10-01 --diff-filter=DR --name-status -- knowledge/ 'plan/cloud-brain-*.md'`
prints nothing). So the count of entries left behind by a deleted doc is 0.

**The files of `cloud-brain-dev`.** `/static/cloud-brain-dev/index.md` (269 bytes, fetched 19:14)
lists `brain/roles/reviewer.md` alone. The three files are tracked in the repository
(`git -C cloud-brain-dev ls-files`), 4,106, 12,676 and 16,045 characters. The repository is read by
anyone: `git ls-remote https://cb4.endpointservices.workers.dev/git/cloud-brain-dev.git`, with no
token, answered `4c17e688… refs/heads/main` at 19:17. So the three files, the owner's quoted words
in `philosophy.md` among them, are public already. That answers the body's "Whether AGENTS.md,
philosophy.md and README.md may be served" for line 1: showing them shows nothing new. The entries
of this design are private anyway.

**Tokens.** `loop-knowledge` names `knowledge.search` alone: `knowledge.list` with it answered
`403 … this token does not name com.lopecode.brain.knowledge.list` (19:18). A search with it does
answer each entry's `sha256`: `knowledge.search?q=doc:cloud-brain-issues&kind=doc` gave
`d7b106ff2d46…`, the same as `shasum -a 256 plan/cloud-brain-issues.md`. A token that names
`knowledge.put` can put: `knowledge-by-says-owner-for-a-token` (event 1287) entered 75 entries with
one, `rsi-index`. That answers the body's first "Not known". A token is the Brain's side
(`brain-knowledge.ojs` line 135, `knowledgeTenant`), and "The Brain changes and deletes any entry"
(the same seed, "Who reads an entry"): a token that names `knowledge.put` can write over any of the
entries, the papers and the module cards among them. A scope is a method name or a prefix
(`plan/cloud-brain-authority.md`, "Scope"); nothing holds a token to a kind.

**Where a landing ends.** Every landing ends with `tools/cloud-brain/lock.sh release land <id>`
(`agents/implementer.md` step 10; `agents/spec.md` step 6 names that step; `rules.md`, "Always":
"Commit, build or push in the main checkout only while holding the landing lock"). The push is
before the release. No git hook is installed: `.git/hooks` holds `post-merge.backup` and
`pre-commit.backup` only.

### What the defect costs

How often a doc changes: 115 changes of a doc file in commits since the first entries
(2026-10-10 10:10 CEST), in 14 distinct docs; 51 commits touched a doc on 2026-10-11 by 19:15, 18 of
them `knowledge/working-with-cloud-brain-remote-lopecode-cluster.md`
(`git log --since=… --name-only -- knowledge/ 'plan/cloud-brain-*.md'`).

How far behind the entries were, each time someone looked:

| When, 2026-10-11 CEST | docs | fresh | stale | missing | by |
|---|---|---|---|---|---|
| about 18:10 | 57 | 51 | 3 (9.9 h, 9.2 h, 6.9 h) | 3 | review, event 1111 |
| 18:17, after a writer's put | 61 | 61 | 0 | 0 | review 1176 |
| 18:46 | 62 | 59 | 2 | 1 | review 1259 |
| 19:05 | 63 | 59 | 2 | 2 | overseer, 1314 |
| 19:13 | 63 | 59 | 2 | 2 | this spec |

After a full put, four docs were behind within 48 minutes. The docs that fall behind are the ones
being worked on: the three missing at 18:10 and the two missing now are specs of projects in
progress, which is what a writer of one of their tasks would search for.

What is not measured: how many searches answered a writer with old text or without a doc that
existed. 13 of the journals in `.emitted/issue-loop/` mention `knowledge.search`; one says its own
new section "is therefore not in `knowledge.search`" (`playwright-headed-chromium-1200.md`), and
none says a search misled its writer. The core's log of calls is the owner's session only, so the
count of searches by `loop-knowledge` was not read. I tried to measure the wait of each commit from
the entries' `wordsAt`; it does not hold, since `wordsAt` moves only when the first 16,000
characters change and each entry keeps only its last put. The cost stated is therefore exposure,
not harm: a search step every writer runs, over entries that were 6 to 10 hours old for the docs
changed that day.

What a put costs: "$0.00005 a doc whose text changed" (the calling guide, line 117). A `status` is
0.84 s. The time of a put was not measured by me; a put is a write I may not make.

## Read

In the Brain, `knowledge.search?semantic=true` with `loop-knowledge`, 19:16 CEST:

| Searched | Found | Used |
|---|---|---|
| "docs entered into the knowledge base go stale when the file changes" | `doc:knowledge-reranking` 0.85, `doc:working-with-cloud-brain…` 0.65, `doc:calling-a-cloud-brain-from-this-checkout` 0.60 | the calling guide, "The knowledge docs in the Brain's search": the sentence R7 changes |
| "reindex documentation on commit, keep a search index in step with a git repository" | `doc:maintaining-and-updating-…` 0.75, `module:tomlarkworthy:virtual-monorepo` 0.58 | nothing bore on it |
| "token for an agent that names one method" | `doc:cloud-brain-authority` 0.71 | "Scope": a scope is a name or a prefix, so no token is held to kind `doc` |
| "landing step lock merge push" | `doc:cloud-brain-locks-held-in-the-cluster` 1.0 | `lock.sh` stays the command when the locks move to the cluster ("The feature's body, whether lock.sh stays as the command: it stays"), so a step in it survives that project. The entry read was the stale one; the file was read in the checkout |
| "incremental index maintenance stale retrieval corpus freshness" | eight papers on ranking | nothing bore on it |
| "operator of the page reads AGENTS.md philosophy cloud-brain-dev" | `doc:working-with-cloud-brain…` 0.98 | nothing new |

In the Brain's own code: `brain-x-library` already does this for module cards. A put to the library
enters a card for each module and marks a kept card `staleSince` when the notebook's copy differs
(`brain-knowledge.ojs`, `ifAbsent`). The entry is made by the act that changes the source, not by a
later pass. This design does the same for docs, at the landing.

Outside, 19:20 CEST:

- LangChain's indexing API (`reference.langchain.com/python/langchain-core/indexing/api/index`),
  read only in a search summary, not the page. It keeps a hash for each document and writes only
  what changed. Its `full` cleanup deletes what the loader did not return, with the warning that a
  loader which returns part of the set makes it delete what it should not, and the precondition
  that the store was not filled by another way. Used for R4: the Brain's kind `doc` was filled by
  four methods, so this tool counts and would delete only what it entered.
- LlamaIndex's ingestion pipeline (`developers.llamaindex.ai/python/framework/module_guides/loading/ingestion_pipeline/`),
  fetched: "stores a map of each `doc_id` to a `document_hash`"; a changed hash is processed again
  and an unchanged one skipped. That is what `status` and `put --stale` already do. Nothing taken.

## The design

**`lock.sh release land` enters what is behind, with a token made for it.**

1. **The token**, made once by the owner: `brain.ts token loop-docs knowledge.put knowledge.list`.
   `knowledge-docs.ts` calls with `--as loop-docs` and finds the main checkout's state as `lock.sh`
   does (`git rev-parse --git-common-dir`), so it runs from a worktree. With `--owner` given it
   calls as now, for the owner's own use. With no `loop-docs` kept it prints the command above and
   exits 2; it does not fall back to the session (R2).
2. **The source is `origin/main`** (R3). The tool reads each doc with `git show origin/main:<path>`
   and lists them with `git ls-tree`. The entry's `url` is the file on GitHub's `main`, so the
   entry and its address then hold the same text. A commit not pushed and an edit not committed are
   not seen, by `status` or by `put`.
3. **The step.** After `lock.sh release land <who>` has removed the lock, it runs
   `knowledge-docs.ts put --stale` and prints its one line. The release's exit code is the
   release's alone: a put that fails prints `docs: not entered (<why>)` and the lock is still
   released. It runs for every landing, with or without a doc in it, so a doc left behind by any
   other way is entered by the next landing (R5). Each call of this mode has a limit of 30 s.
   `LOCK_DOCS=0` leaves the step out, for `tests/tools/lock.test.ts`.
4. **The check.** `knowledge-docs.ts status --check` exits 1 when any doc is stale or missing and 0
   otherwise (R5). The overseer runs it beside `issue-stats.ts` and records the line.
5. **No file** (R4). Line 87 counts an entry only when its `method` is `knowledge-docs`. Today that
   is 0. Nothing is deleted.
6. **Three more docs** (R6): `AGENTS.md`, `README.md` and `philosophy.md`, read at the commit that
   `lopecode-dev`'s `origin/main` records for the submodule (`git ls-tree origin/main cloud-brain-dev`,
   then `git -C cloud-brain-dev show <commit>:<file>`). A landing fetches nothing of that repository,
   so its own `origin/main` is not a thing a landing can rely on; the recorded commit is. When the
   submodule's checkout lacks that commit the three are left as they are and the line says so.
   Ids `doc:cloud-brain-dev-agents`,
   `doc:cloud-brain-dev-readme`, `doc:cloud-brain-dev-philosophy`, private, `url` the repository's
   address on the Brain. The operator's brief already says `knowledge.search` with `kind: "doc"`
   then `knowledge.get` (`fb-a2vp4smwzq`, event 1234). `philosophy.md` is 16,045 characters and an
   entry holds 16,000 after the title line is taken off: the text the tool would send is 15,987
   characters today (counted as line 46 of the tool does), 13 under the limit, and will be cut at its end when the file grows.
   That cut is `seen-knowledge-get-cuts-long-guides`.
7. **The words** (R7): the tool's header, and "A changed doc is not entered again by anything" in
   `knowledge/calling-a-cloud-brain-from-this-checkout.md`.

What the design does not cover, and what happens then. A commit to `main` made without the landing
lock, the owner's or a session's, is entered by the next landing of anyone. A change to
`cloud-brain-dev` is entered by the first landing after `lopecode-dev`'s pointer to it has moved; a
push of that repository alone changes no entry. Between landings the entries are behind; today that would have been
minutes (51 doc commits in 12 hours). When the loop is stopped it lasts until the loop runs again.

**After the release, not inside the lock.** Inside, the puts are in the order of the landings.
After, a second writer's put could arrive before the first's, and the first would then write the
older text of a doc both changed. For that the second writer must take the lock, merge, push and
release within the seconds of the first's put. The next landing's `put --stale` sets it right, and
`status --check` shows it until then. Inside the lock, a slow Brain holds every writer for up to
the limit. The smaller harm was taken (line 2).

### Not chosen

- **A line in `implementer.md` step 10 and `spec.md` step 6.** A step in a brief is done when the
  agent remembers it. Three records above say "was not run". Line 3: the tool is changed.
- **A git hook** (`post-merge`). `.git/hooks` is not in the repository, so a fresh checkout has
  none and nothing says so.
- **The Brain pulls the docs from GitHub itself**, as `brain-x-snapshot` pulls feeds. It needs no
  token on this machine and covers every commit, with a lag. It is a new scheduled read in a
  Worker, GitHub's limit for calls with no key from Cloudflare's addresses, and a second writer of
  the same entries. Larger, and harder to undo. It is what to build if the check of R5 shows docs
  behind for hours while the loop is stopped and that is found to matter.
- **`knowledge.delete` in the token.** It would let the tool remove the entry of a deleted doc. No
  doc has been deleted since 2026-10-01, and the token could then delete any entry of the Brain.
  Reopen when `status` first names an entry of `method: knowledge-docs` with no file.
- **A method that enters docs only** (`knowledge.putDoc`), so the token could not write a paper.
  A new method on a service for one caller. As with `loop-roles` in `rules.md`, the bound is an
  agreement: `loop-docs` is used through `knowledge-docs.ts` and for nothing else.
- **The three files at an address** (`put.sh` to `/static/cloud-brain-dev/`). `brain/` is where the
  Brain's copy is the source and a Read fetches it; these three have their source in git. Two
  directions in one directory, and `loop-roles` is the overseer's. A raw read of a file on
  `brain-x-git` would be a new method over Cloudflare's git storage; not read whether its API has one.
- **Putting only the docs a landing changed** (`git diff --name-only`). `put --stale` costs one
  `list` and enters what any earlier failure left; the narrower step would not heal (R5).

## How each requirement is known to be met

Each is run by an agent with a token of the loop. Until the owner has made `loop-docs`, tasks 1 and
2 are known by their tests alone, and task 3 waits.

| | Known by |
|---|---|
| R1 | Task 3: after a landing that changes a doc, the release prints the put's line and `BRAIN_BASE=cb4 bun tools/cloud-brain/knowledge-docs.ts status --check` exits 0. Without the new token: `knowledge.search?q=doc:<name>&kind=doc` with `loop-knowledge` answers the `sha256` of `git show origin/main:<path> \| shasum -a 256` |
| R2 | `grep -c -- '"--owner"' tools/cloud-brain/knowledge-docs.ts` shows the flag only where the argument `--owner` passes it; the test runs `put` with a fake `brain.ts` and reads `--as loop-docs` in its arguments |
| R3 | The test: a repository with a doc changed on disk and not pushed; `status` reads it fresh and `put --stale` sends nothing |
| R4 | The test: a fake list with an entry of `method: research:x` and one of `knowledge-docs`, neither with a file; `entriesWithNoFile` has the second alone. On cb4: the array is empty |
| R5 | `tests/tools/lock.test.ts`: a release calls the tool (a stub that writes a file), a stub that exits 1 leaves the release at exit 0 with the lock gone, `LOCK_DOCS=0` calls nothing. `status --check` exits 1 in the test of R3's opposite case (a pushed change, an old entry) |
| R6 | Task 3: `knowledge.search?q=doc:cloud-brain-dev-philosophy&kind=doc` with `loop-knowledge` answers the entry, its `sha256` that of the file at the commit `git ls-tree origin/main cloud-brain-dev` names |
| R7 | `grep -c "not entered again by anything" knowledge/calling-a-cloud-brain-from-this-checkout.md` is 0 |

Not a condition of any task: whether the operator in the owner's tab reads the three entries
through its own `brain_call`. That needs his tab. It goes in his list.

## The tasks, in the order they land

Each is one writer and one review. No Worker is deployed by any of them.

1. **`knowledge-docs.ts`**: `--as loop-docs` and the state of the main checkout; `origin/main` as
   the source; `status --check`; the `method` filter; the three files of `cloud-brain-dev`; the
   header. `tests/tools/knowledge-docs.test.ts` with a fake `brain.ts` and a repository made in a
   temporary directory, as `lock.test.ts` makes its lock directory. Worth having if nothing after
   it lands: R3 and R4 are met by it alone.
2. **`lock.sh release land`** runs the step; the tests of R5; the section of the calling guide
   (R7), which then says what enters a doc and what does not. The project
   `locks-held-in-the-cluster` rewrites `lock.sh`; whichever lands second rebases over the other,
   and the step is the last lines of `release` in both.
3. **The first run**, after the owner has made `loop-docs`: `put --stale` by the writer, its line,
   `status --check` at exit 0, the two searches of R1 and R6, the time the put took. An act with no
   tests: its confirmation is the count from `status`, made by the writer (`rules.md`, the last
   item of "Never"). The three reports are closed with it. The overseer adds `status --check` to
   its measures in `agents/overseer.md`; that edit is the overseer's.

## What only the owner can do

- Approve this spec. It is `major`: a token of the loop gains a write it did not have.
- Make the token: `BRAIN_BASE=cb4 bun tools/cloud-brain/brain.ts token loop-docs knowledge.put knowledge.list`.
- A paragraph in `rules.md` beside "Searching what the Brain knows", his to word. Proposed:
  "`loop-docs` names `knowledge.put` and `knowledge.list`. It is used through
  `tools/cloud-brain/knowledge-docs.ts` and for nothing else, and only for entries of kind `doc`:
  the token itself is not held to that kind, so this is an agreement."
- Once, in his tab: ask the page's operator what `philosophy.md` of `cloud-brain-dev` says, and see
  that it answers from the entry.

## What misled the writer of this spec

- The body and `seen-doc-entries-with-no-file` say four entries have no file "in the checkout" or
  that their file "is gone". Two have files under `tools/cloud-brain/` and two are addresses on
  cb4; all four were entered by other methods. Read from the entries' `method` and `url`.
- The body's "Whether a token that names knowledge.put could do the put" was answered by an issue
  the body itself names as beside the project (event 1287).
