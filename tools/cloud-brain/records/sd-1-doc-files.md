# The whole of every doc is a file the Brain keeps, and its entry names it (`sd-1-doc-files`)

Task 1 of `plan/cloud-brain-docs-summarised-for-search.md` (there `ds-1-doc-files`). Written 2026-10-12
by a writer of the issue loop, round 1. A local tool, two test files and six docs; no Worker is
deployed. 89 files and 89 entries were put on cb4 with the token `loop-docs`. Every time below is from
`date` or a file's `savedAt`, in CEST.

## What was there, and what the spec did not know

The spec's section 5 says of a doc's entry: "The entry's `file` is empty". Read before any change, with
`loop-docs` (`knowledge.list?kind=doc&limit=100`, then `static.list?prefix=docs/` and
`static.list?prefix=knowledge-docs/`):

```
93 entries of kind doc, 89 of them with method knowledge-docs
  53 name a file docs/lopecode-dev/<path>      38 public entries, 15 private
  36 name no file
static.list?prefix=docs/             53 files: 50 under docs/lopecode-dev/knowledge, 3 under docs/lopecode-dev/plan
                                     every one private, tags [by:<the owner's DID>], writer "owner by d:56b22a77aae2"
                                     savedAt 2026-10-10 12:01:14 to 12:05:21
static.list?prefix=knowledge-docs/   0 files
```

So 53 docs had a file in `brain-static` at `docs/<source>/<path>`, the shape the spec gives under
another first segment, and their entries named it. A put that leaves `file` out keeps it
(`brain-knowledge.ojs`, "A field left out, or `null`, keeps its value"), so the name outlived two days
of puts while the bytes stayed those of 2026-10-10. What put them is not known:
`git grep -n -F "docs/lopecode-dev" -- knowledge plan tools/cloud-brain .claude/skills` printed nothing
outside this task's spec. The spec's writer asked one address under `knowledge-docs/` (404) and no list.

**The tool puts under `docs/`.** Two ways, and what each costs:

| | For | Against |
|---|---|---|
| `knowledge-docs/`, as the spec has it | The spec the owner approved names it, in its design, its two `curl` checks and the agreement for the token (comment 4775: "for files only under `knowledge-docs/`") | A second place for a job a place has. 53 files of 2026-10-10 stay under `docs/`, private and older than their docs, named by nothing, and the token cannot delete them |
| `docs/`, where the 53 are | One place. The 53 are written over with today's bytes, and no file is left that nothing names | The spec's addresses and the token's agreement name another prefix; both are noted as built |

Taken by `philosophy.md`, Clarifications, 2026-10-12, which was written of this spec's first round:
"where a thing exists that has the same job for the same purpose (a role, a brief, a tool, a token), it
is made more general, and a second one beside it is not made" (the orchestrating session's reading of
the owner's "we just make the summarizer more general as it has the same basic job for the same
purpose"). To undo it: the constant `FILES` of `knowledge-docs.ts`, and one `put --all`.

## What changed

- **`tools/cloud-brain/knowledge-docs.ts`.**
  - A put of a doc is two calls, the file first: `static.put?path=docs/<source>/<path>&public=<true|false>&tags=knowledge-doc`
    with the bytes git has, then `knowledge.put` with that path as `file`, 25 entries a call after their 25
    files. The tool reads the put's answer and stops when its `sha256` or `public` is not the doc's.
  - `fresh` is the entry's `sha256`, `public` and `file`. A stale doc whose hash is the file's says why in
    its line of `status`: `visibility differs`, `the entry names no file`, `the entry names the file <other>`.
  - `status` reads `static.list?prefix=docs/`. A doc's line ends `file not kept` or `file differs`, and
    the last line has `files` and `filesWrong`. `status --check` exits as before: a wrong file does not fail it.
  - `put --stale` also puts a doc whose kept file is not the doc's, fresh or not, and the last line of
    `put` has `filesWrong`, their count among the docs put. The spec does not ask this. It is there
    because a copy of the tool from before this change puts a changed doc's entry with its new hash
    and no file: the entry is then fresh and the file a version behind, and nothing else would put it.
    Seen the same minute (below).
  - A cut doc's last line names the Brain's file, `static.get?path=<file>`, and `/static/<file>` when the
    doc is public. The address on `raw.githubusercontent.com` is gone from the tool, and with it the
    second wording for a file of `cloud-brain-dev`.
  - The token's command has four methods. A 403 that says the token "does not name" a method is exit 2
    with the revoke and the make.
  - A doc whose path `static.put` does not take is `badname`, as one whose id `knowledge.put` does not take.
- **`tests/tools/knowledge-docs.test.ts`**: the fake `brain.ts` answers `static.put` and `static.list`
  and keeps what was put; every fixture entry names its file; 8 tests added (`sd-1: …`), and 5 of the older ones hold another value than before.
- **`tests/tools/sd-1-doc-files.test.ts`**, new, 4 tests: the guide, the tool's header, the spec's note, this file.
- **`knowledge/calling-a-cloud-brain-from-this-checkout.md`**, "The knowledge docs in the Brain's
  search": a paragraph on the file, the token's four methods, and what `put --stale` puts.
- **`plan/cloud-brain-docs-summarised-for-search.md`**: a note at its head and ten notes "As built":
  one token (the owner's B), the prefix, and section 5's sentence.
- Four sentences this change made untrue, each with a note: the token of two methods in
  `plan/cloud-brain-brain-docs-entered-by-hand.md` and in the `fly-docs` row of
  `plan/cloud-brain-worker-machine-on-fly.md`, the cut line's address in
  `plan/cloud-brain-answers-cut-and-not-said.md`, and "The file is not copied into `brain-static`" in
  `tools/cloud-brain/knowledge-vectors.md`. That last file, of 2026-10-10, has "Rejected: a copy under
  `knowledge-docs/`, as the kept papers have. It would be a second copy to keep in step": the cost it
  names is the one this task takes on, on the owner's "a link to the original in file/blob storage",
  and `filesWrong` is what shows a copy out of step.

## The tests

Run in the worktree after the last edit of the tool and its tests:

```
bun test --timeout=30000 ./tests/tools/knowledge-docs.test.ts     29 pass, 0 fail
KNOWLEDGE_DOCS_TS=<the tool as HEAD had it, 6db2f088> bun test --timeout=30000 ./tests/tools/knowledge-docs.test.ts
                                                                  16 pass, 13 fail
```

The 13 are the 8 added and the 5 changed (the order of calls and the token's command in the two `R2`
cases, and the line of `pm-1: … cut`, `ac-4: a text of 16,001` and `ac-4: a cut file of cloud-brain-dev`).
The counts of `sd-1-doc-files.test.ts` and of the whole suite are in the issue's comment: this file is
one of the texts they read.

## The puts on cb4

From the worktree, with `loop-docs` through the changed tool, before the landing. The source was
`origin/main@45687267`.

`status` at 22:49:55, before any put:

```
{"docs":89,"fresh":53,"stale":36,"missing":0,"cut":47,"unmarked":47,"files":11,"filesWrong":[78 names],…}
53 fresh    36 stale, each "the entry names no file"    42 lines "file differs"    36 lines "file not kept"
```

11 of the 53 older files still had their doc's bytes. All 47 cut docs were unmarked: each entry ended
with the line of before.

One doc first, since no `static.put` had been made with the token (comment 4775, "Not tried"), at 22:50:11:

```
$ BRAIN_BASE=cb4 bun tools/cloud-brain/knowledge-docs.ts put pairing-with-the-cloud-brain-page
{"put":1,"public":0,"private":1,"cut":0,"unmarked":0,"filesWrong":1,"entered":0,"changed":1,"vectors":0,"ms":1151,…}
```

`static.list` then answered the file with the hash of `git show origin/main:knowledge/pairing-with-the-cloud-brain-page.md | shasum -a 256`
(`b2d28112…`), `public: false`, tags `by:<the owner's DID>` and `knowledge-doc`; its address answered 401 with no token.

Then all of them, 22:51:07 to 22:52:19:

```
$ BRAIN_BASE=cb4 bun tools/cloud-brain/knowledge-docs.ts put --all
{"put":89,"public":38,"private":51,"cut":47,"unmarked":47,"filesWrong":77,"entered":0,"changed":89,"vectors":47,"ms":69605,"source":"origin/main@45687267"}
```

**69.6 s for 89 files and 4 calls of `knowledge.put`**, each call a `bun brain.ts curl` of its own, with
the machine's load at 9.69 (`uptime`, 22:51). The spec had this as not measured. 47 vectors, one for each cut
doc, whose text changed with its line: $0.00235 at the $0.00005 a text of `brain-knowledge.ojs`.

Read back at 22:52:44:

```
static.list?prefix=docs/     89 files, 2,142,636 bytes: 38 public, 51 private, every one with the tag knowledge-doc
                             and the writer "owner by d:d83d526c6cef" (the token); none of the 53 is left as it was
knowledge.list?kind=doc      89 entries of method knowledge-docs, each with a file under docs/
curl -s https://cb4.endpointservices.workers.dev/static/docs/lopecode-dev/knowledge/notebook-programming-concepts.md | shasum -a 256
                             496ebd6e0e4d2155c6c35e132de5b03626f4c1a870998d12de404e9be737bc9a
git show origin/main:knowledge/notebook-programming-concepts.md | shasum -a 256
                             496ebd6e0e4d2155c6c35e132de5b03626f4c1a870998d12de404e9be737bc9a
curl -s -o /dev/null -w '%{http_code}' …/static/docs/lopecode-dev/plan/cloud-brain-backlog.md      401
curl -s -o /dev/null -w '%{http_code}' …/static/docs/cloud-brain-dev/philosophy.md                 401
curl -s -o /dev/null -w '%{http_code}' …/static/knowledge-docs/lopecode-dev/knowledge/notebook-programming-concepts.md   404
```

The public file is sent with `content-type: text/markdown; charset=utf-8`, `access-control-allow-origin: *`
and `content-security-policy: sandbox; …`. The first three lines of `curl` are the spec's two checks of R1
and R4, under `docs/`.

## A release by an older copy, seen during the put

`status --check` at 22:52:21, two seconds after the put, exit 0:

```
{"docs":89,"fresh":89,"stale":0,"missing":0,"cut":47,"unmarked":37,"files":87,"filesWrong":["working-with-cloud-brain-remote-lopecode-cluster","cloud-brain-post-mortems-declared-and-kept"],"entriesWithNoFile":[],"source":"origin/main@8a5cb44b"}
```

`origin/main` had moved to `8a5cb44b` (`pm-2-brief-and-procedure`) while the put ran, and its landing's
release ran the tool as it was before this change. That copy entered the two docs its landing changed
with their new hash and no file (`filesWrong`, 2), and took the cut entries this put had just written
for unmarked, since they end with another line than its own: 37 entries ended with the address on
`raw.githubusercontent.com` again (read from `knowledge.list` at 22:52:44: 37 of 89). This is what the
spec says of its task 2 under "A copy of the tool from before task 2 undoes a summary", met at task 1.

Not put again before the landing: each release by an older copy would undo it once more. A landing
rebases under the lock before its release (`agents/implementer.md`, step 10), so from this change's
push a landing's copy has it, and its `put --stale` puts the unmarked and the wrong files with the docs
it changed. The `status` after this landing's own release is in the issue's comment.

## Not tried

- `static.get?path=<file>` of a private doc's file: `loop-docs` does not name it. That a caller who may
  read the entry reads the file, and no other, is read from `brain-static.ojs` ("read: the owner; anyone
  if `public`; …") and seen only as 401 for a caller with no token.
- A token that does not name `static.put`, on cb4. The message is from a fake that answers the core's
  words for another method (`this token does not name com.lopecode.brain.…`, 403).
- `knowledge.put` failing after its files were put. The test refuses a file's put and reads that no
  entry follows; the other order rests on the entry keeping its older `sha256`.
- The branch `file.length <= 200` of `named`: with an id of 100 characters at most no path of the three
  directories reaches 200, so no test runs it. The `:` of the same line is run.
- `put` with `--owner`: the file would then be the owner's own, not sandboxed.
- A release from a worktree behind this change, after it: it flips the cut entries' line back and enters
  a changed doc with no file, as at 22:52. Not mended: the next release by a newer copy puts them again,
  47 files and entries at most for the line, about 0.8 s a doc by the run above.
- Whether the page's operator, shown a cut entry, reads the file with `static.get`. It needs the owner's tab.
- The docs step of a landing on the worker machine: `plan/cloud-brain-worker-machine-on-fly.md` gives its
  token two methods; the row has a note.

## Read first

`knowledge.search?semantic=true&limit=6` with `loop-knowledge`, 22:38:

| Words | Found | Used |
|---|---|---|
| kept copy of a doc file in brain-static path sha256 entry file | `module:tomlarkworthy:brain-static` 1, `brain-library` 0.679, `brain-blob` 0.657, `doc:working-with-cloud-brain-remote-lopecode-cluster` 0.494 with `file` `docs/lopecode-dev/knowledge/…` | the seed of `brain-static`, for the put's labels and the path's pattern; the last answer's `file` is what showed the 53 |
| static.put public false tags replace labels token put file before entry | `module:tomlarkworthy:brain-static` 1, nothing else over 0.3 | the same seed |
| cut doc last line names the whole file raw.githubusercontent | `doc:cloud-brain-answers-cut-and-not-said` 1, `doc:cloud-brain-docs-summarised-for-search` 0.937 | both, for the line; the first gained a note |

Also read: `cloud-brain-dev/put.sh`, for how a file's bytes are sent through `brain.ts curl`.
