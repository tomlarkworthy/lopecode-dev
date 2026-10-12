# A post mortem is found by the Brain's search, and its form is held by a test (`pm-1-file-and-search`)

Task 1 of `plan/cloud-brain-post-mortems-declared-and-kept.md`. Written 2026-10-12 by a writer of the
issue loop, round 1. A local tool, three test files and two docs; no Worker is deployed. Every time
below is from `date` or an event's `at`, in CEST.

## What was wrong

`tools/cloud-brain/post-mortems/` had one file since `2939a2c0`, and the search every design starts
with did not answer it. `knowledge-docs.ts` listed `knowledge/` and `plan/` only, and named a doc by
the second part of its path with three characters cut, which is right for `knowledge/x.md` and gives
`cloud-br` for `tools/cloud-brain/post-mortems/pm-x.md`. Two searches with `loop-knowledge` at 22:13:10,
before the change, the first six of 20 each:

```
q=post mortem second summarizer role
  doc:cloud-brain-post-mortems-declared-and-kept 1      doc:cloud-brain-paper-summarizer-persona 0.539
  web:carbonell-1998-mmr 0.416                          doc:cloud-brain-docs-summarised-for-search 0.392
  module:tomlarkworthy:exporter-2 0.215                 arxiv:2411.11767 0.174
q=summarise knowledge docs for search, which role writes the summary
  doc:cloud-brain-docs-summarised-for-search 1          web:carbonell-1998-mmr 0.725
  doc:cloud-brain-paper-summarizer-persona 0.687        doc:cloud-brain-post-mortems-declared-and-kept 0.552
  doc:knowledge-reranking 0.402                         doc:cloud-brain-brain-docs-entered-by-hand 0.385
```

No `doc:pm-…` in either. Nothing held the form of a post mortem, and no doc named the directory
(comment 4523 of `post-mortems-declared-and-kept`: "No doc points at it yet").

## What changed

Landed as `eb320720`, which is on `origin/main`.

- **`tools/cloud-brain/knowledge-docs.ts`**, three edits. `tools/cloud-brain/post-mortems/` is a third
  path of its `ls-tree`; the filter has `/^tools\/cloud-brain\/post-mortems\/[^/]+\.md$/`; a doc's name
  is `p.split("/").at(-1)` with `.md` cut. For `knowledge/x.md` and `plan/cloud-brain-x.md` the last part
  of the path is the second, so no kept entry changed its id: `status` after the landing reads 89 docs,
  89 fresh, and `entriesWithNoFile` is `[]` (below). A post mortem has no frontmatter, so it is entered
  private, as a design of `plan/` is.
- **`tests/tools/knowledge-docs.test.ts`**, two cases more. A repository with two post mortems, a file
  below the directory, a `notes.txt` in it, a record of the same name and a guide beside the directory:
  the two are `missing private pm-x` and `pm-y`, are put as `doc:pm-x` and `doc:pm-y` with the file's
  address on GitHub, and nothing else is taken. And one of 16,001 characters is cut with the line that
  names its file.
- **`tests/tools/post-mortems.test.ts`**, new, 4 tests: the form of design part 3 over every file of the
  directory. Its header lists what is held and what is not.
- **`knowledge/working-with-cloud-brain-remote-lopecode-cluster.md`**, "Where the documents are": one row
  for the directory, after the row of the records.
- **`knowledge/calling-a-cloud-brain-from-this-checkout.md`**, "The knowledge docs in the Brain's search":
  the directory is in the list of what the tool enters, with a sentence on how an entry is named. The
  search of step 11 found this list; the task does not name the file.
- **`tests/tools/pm-1-file-and-search.test.ts`**, new, 3 tests: the row, the list, and the tool's header.

The first post mortem's file is not changed (the spec, part 3: "task 1 changes no word of it").

## The tests fail without the change

Each run in the worktree before the commit and the rebase of the landing, between 22:13 and 22:18.

The two cases of the docs tool, with the tool of `origin/main` in its place
(`KNOWLEDGE_DOCS_TS=<origin/main's copy> bun test --timeout=30000 ./tests/tools/knowledge-docs.test.ts -t "pm-1|every doc"`):
`1 pass, 2 fail`, the first with `Expected: 1  Received: 0` for the exit of `status --check`: no file of
the directory is listed. With the new path and filter and the old name (one line put back by `sed`),
`-t "pm-1"`: `0 pass, 2 fail`, and the first prints

```
-   "missing private pm-x",
-   "missing private pm-y",
+   "missing private cloud-br",
+   "missing private cloud-br",
```

So the line that names a doc is run by the test, and is what the second failure is of.

The docs test, on the two docs and the tool as `origin/main` had them, copied to a directory of the
same shape: `0 pass, 3 fail`.

The test of the form has nothing to fail before: there was no test. Its second and third cases write
files that lack the form and read each one's failure, from a temporary directory as the real one is read:

```
pm-missing.md   no heading `## What is not known`
pm-order.md     `## The root cause` stands after `## What is not known`
pm-over.md      16001 characters, over 16000
pm-at-the-limit.md, pm-good.md   nothing
```

## Three choices the spec leaves open, each taken the narrower way

`philosophy.md`, line 2: "the side that is smaller and easier to undo". A test that is too narrow fails
on a file with its reason printed, and is loosened in one line; one that is too wide says nothing.

- **The seven headings and no other `## `.** The spec's table has "its parts, in order". An eighth `## `
  heading fails as "a heading the form does not have". A heading may go on after the table's words
  (`## Next actions, filed`, the first's); `### ` is not read, and neither is a line inside a code fence.
- **16,000 characters of the whole file**, counted as the tool counts (`.length` of the text). The
  entry's text is the file with its title line out, so it is shorter than the file by that line: a file
  that passes is entered whole. The first is 12,662 (`wc -m`).
- **The name is `pm-<short>.md`**, an id the tracker takes (`a-z 0-9 -`, 40 at most). The spec has "`<id>.md`,
  with `<id>` the issue's id" and "id `pm-<short>`". This is also what keeps a post mortem's entry from
  the id of another doc: the tool does not look for two files of one name, and
  `git ls-tree -r --name-only origin/main knowledge/ plan/` has 0 lines that begin `knowledge/pm-` (22:21;
  a file of `plan/` is taken only as `cloud-brain-…`).

Also held, and not in the spec's words: something stands under each heading. Not held: the one line
under the title (the first has four lines there, and passes "as it is"), and what a part says.

## The first file attached

`get?id=pm-second-summarizer-role` at 22:13 had no `attachments` in its `issue`. Sent 22:19:36 with this task's token, the
text of `git show origin/main:tools/cloud-brain/post-mortems/pm-second-summarizer-role.md`:

```
ia attach @<scratchpad>/impl-2f5ada-attach.json      key impl/pm-1-file-and-search/attach-first
200  {'seq': 4803, 'type': 'attached', 'name': 'pm-second-summarizer-role-r1.md', 'size': 12664,
      'sha256': '59032dcd8dea159f88b7c8234e3b5a4d8150a5903fa80d881c91b8740b3c58ac'}
```

`shasum -a 256` of the file is the same. `ia "attachment?id=pm-second-summarizer-role&name=pm-second-summarizer-role-r1.md"`
answered 200 with a `text` of that hash, and `attachments` of the issue lists the name. The issue was
`done` when it was sent, and the call was taken.

## The three R4 checks, on cb4

The entry was made by the release of the landing lock, 22:20:18, with no put by hand:

```
docs (cb4): {"put":3,"public":0,"private":3,"cut":1,"unmarked":1,"entered":1,"changed":2,"vectors":3,"ms":1658,"source":"origin/main@eb320720"}
```

Which two were changed was not looked at; this landing changed two docs of `knowledge/`.

1. `BRAIN_BASE=cb4 bun tools/cloud-brain/knowledge-docs.ts status`, from the worktree, 22:20:31:

   ```
   fresh    private pm-second-summarizer-role
   {"docs":89,"fresh":89,"stale":0,"missing":0,"cut":47,"unmarked":0,"entriesWithNoFile":[],"source":"origin/main@eb320720"}
   ```

   The line has no `cut`. The spec read 86 docs at 21:30; which two beside this one came in since was not looked at.
2. `q=post mortem second summarizer role`, 22:20:33: `doc:pm-second-summarizer-role` is **third** of 20.

   ```
   1 doc:cloud-brain-post-mortems-declared-and-kept 1     2 doc:cloud-brain-paper-summarizer-persona 0.549
   3 doc:pm-second-summarizer-role 0.474                  4 web:carbonell-1998-mmr 0.416
   5 doc:cloud-brain-docs-summarised-for-search 0.402
   ```
3. `q=summarise knowledge docs for search, which role writes the summary`, the words of a later design,
   22:20:34: it is **fifth** of 20, the last place the spec's check takes.

   ```
   1 doc:cloud-brain-docs-summarised-for-search 1         2 web:carbonell-1998-mmr 0.724
   3 doc:cloud-brain-paper-summarizer-persona 0.689       4 doc:cloud-brain-post-mortems-declared-and-kept 0.552
   5 doc:pm-second-summarizer-role 0.479
   ```

Each search is the one of `agents/implementer.md` step 2: `knowledge.search?semantic=true&q=`, called as
`loop-knowledge`. In the third the two designs the post mortem is of stand first and third, and the post
mortem that says the second was sent back is under them. A spec writer who reads the first five meets it;
one who reads three does not.

## Counts

Each run in the worktree at `eb320720`, after the rebase of the landing; the record was written after them
and no test reads it.

```
bun test ./tests/tools/post-mortems.test.ts ./tests/tools/pm-1-file-and-search.test.ts     22:20
 7 pass, 0 fail, 2 files (with tp-4-docs.test.ts, which reads the same doc: 14 pass, 0 fail, 3 files)
bun test --timeout=30000 ./tests/tools/knowledge-docs.test.ts                              22:20:58 to 22:21:26
 21 pass, 0 fail, 161 expect() calls, 28.32 s      (the spec's run of 21:28 had 19)
tests/tools/suite.sh                                                                       22:21:26 to 22:24:00
 740 pass, 0 fail, 77 files, 153.67 s
```

The count of the first pair alone is from the run before the rebase (22:16: `7 pass, 0 fail, 34 expect() calls`);
after it the three files were run together. The suite's run before the rebase, at 22:17:52,
took 88.01 s for 733 tests in 76 files; why the second took 153.67 s was not looked at.
`scripts/check-learnings-triggers.sh`, 22:19: `0 error(s)`.

## Two sentences of the docs mended before the submit, 22:26

Both landed with `eb320720` and were found at the read before the submit.

- The new row of "Where the documents are" said a file is an entry "from the landing after its own". The
  release above entered the post mortem and changed two docs in one put, from `origin/main` as the push
  had left it: a file is entered by the release of the landing that pushes it. The first was already on
  `main`, so this change's release entered it. The row says that now.
- "The knowledge docs in the Brain's search" said an entry's id is the file's name "whatever its
  directory". The three files of `cloud-brain-dev` are `doc:cloud-brain-dev-agents`, `-readme` and
  `-philosophy` (`status`, above). The sentence is of a file of this repository, and names the three.

After the two edits, 22:26:27 to 22:28:01: `tests/tools/suite.sh`, `740 pass, 0 fail`, 77 files, 93.68 s;
`bun test ./tests/tools/pm-1-file-and-search.test.ts`, `3 pass, 0 fail`; `scripts/check-learnings-triggers.sh`,
`0 error(s)`. No test holds either sentence.

## Read before the design

Four searches of the Brain at 22:13:10. Two are those above. "docs tool enters a directory of files
into the knowledge search" answered `doc:cloud-brain-brain-docs-entered-by-hand` 0.827 first, the design
of the tool, whose R1 names the two directories it then took; and "a test that holds the form of every
file of a directory, headings in order" answered `doc:writing-unit-tests-in-a-notebook` 0.59 first, which
is of notebook cells. Used: nothing beyond the tool's own header and its test file, whose fixture
(`fresh`, `pushed`) the two new cases are written with.

## Not done, not tried

- **A second file.** The directory has one. The test of the form ran on that one and on the files it
  writes itself.
- **A post mortem named as another doc is.** Two files of one name give two docs of one id; the tool
  puts both. Not tried. The name `pm-…` is what stands against it today (above).
- **A post mortem deleted or renamed.** `entriesWithNoFile` of `status` would name its entry, by the
  code that names any; no case of the test has it for this directory.
- **A file over 16,000 characters on cb4.** In the fixture only.
- **The entry's text.** `status` reads it fresh by the file's hash and not cut. The entry was not read back.
- **The page.** That the attachment is drawn on the issue's panel was not looked at: no tab was opened.
- **Other words.** Two queries, each once. A design that searches "doc summarizer persona" or "enter a
  summary of a long doc" was not tried, and the order of a search moves when an entry near it is put.
- **`R1`, `R6`, `R7`, `R8`** of the spec are of tasks 2 to 4.

## For the next writer of this topic

Two lines of briefs say what a `doc` entry is, and were short of it before this change (a design of
`plan/` is a `doc` too). They are not this task's files; task 2 is in the first.

- `.claude/skills/brain-maintenance/agents/implementer.md`, step 2: "a `doc:<name>` is `knowledge/<name>.md`".
  A `doc:pm-<short>` is `tools/cloud-brain/post-mortems/pm-<short>.md`, and a `doc:cloud-brain-<x>` is
  `plan/cloud-brain-<x>.md`.
- `.claude/skills/brain-maintenance/agents/spec.md`, step 4: "`doc` a guide in `knowledge/`".
