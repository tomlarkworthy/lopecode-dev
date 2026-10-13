# fb-batch-rules-md

Written 2026-10-13 by the writer of the issue (token `impl-5a9f8e`). The issue is a batch: six
feedback issues about `.claude/skills/brain-maintenance/rules.md`, gathered by title by a session
the owner was in (`out-5bc2ed`, event 6867) and read one by one by a judgment run (`orch-40e665`,
comment 6915). This run did what that comment gave each entry. One entry changed a file: an item
of `rules.md` and its test. Nothing was built or deployed. Of cb4 the tracker was called, and
`knowledge.search` three times.

## The six entries

"Triage" is comment 6915 of `fb-batch-rules-md`. Each state in the last column was read with
`issue-as.sh impl-5a9f8e "get?id=<id>"` at 21:05 CEST, after the last of the writes.

| Row | Entry | Triage | What this run did | Its state after |
|---|---|---|---|---|
| 1 | `seen-never-crossed-on-chat-word` | close: mended by `rules-md-acts-on-the-owners-word` | Read the section "An act of Never, on the owner's word" of `rules.md` (lines 109 to 167) and that its last item names the three cases of the ticket. Comment 6953, close 6954. No file changed. | `closed` |
| 2 | `seen-writer-put-brief-with-loop-roles` | close: mended | Read "The files of the Brain an agent reads" (lines 442 to 452): the sentence the ticket quotes is gone, and the section says a writer of a task of an approved spec puts a brief too. Comment 6955, close 6956. No file changed. | `closed` |
| 3 | `seen-a-small-either-or-put-to-the-owner` | close, nothing to change | The ticket names no issue or event where the question was put. Comment 6957, close 6958, with what would reopen it. No file changed. | `closed` |
| 4 | `seen-own-files-cell-with-no-name` | mend | The item "Its own files" of `rules.md`, and two tests ("What changed", below). | `open`: closed after the push, see "Not done in this record's commit" |
| 5 | `seen-agent-made-fly-deploy-token` | take out, `major` and `needs-owner` | Opened `rules-never-other-company-credential` (event 6945) with the choice for the owner as comment 6946, linked `related` to the entry and to the batch. Comment 6959 and close 6960 on the entry. No file changed. | `closed`; the new issue `open`, labels `needs-owner` and `major` |
| 6 | `seen-outside-session-wrote-as-impl-2` | take out, `needs-owner` | Opened `revoke-three-old-role-tokens` (event 6947) as a part of `record-names-token-not-agent`, which the entry is a part of, with the choice for the owner as comment 6948, linked `related` to the entry and to the batch. Comment 6961 and close 6962 on the entry. No file changed. | `closed`; the new issue `open`, label `needs-owner` |

A feedback issue has one move from `open`, `close`, which a token may make with a reason
(`issue-as.sh impl-5a9f8e policy`, the workflow the kind `feedback` names).

### What was checked of each close, and what was not

- Row 1. `rules-md-acts-on-the-owners-word` is `done` and its last move is `approve`
  (`get?id=`). Not read: comments 1020, 2426 and events 2608 to 2611, which the section cites.
- Row 2. `grep -c -i 'no other role does' rules.md` is 1, the line "No other role does." that
  follows the sentence on a writer. Whether the put of 2026-10-11 the ticket reports was by a
  writer of a task of an approved spec was not looked up: the close says the rule now names who
  may, not that the put was within it.
- Row 3. `philosophy.md` has the heading "What `needs-owner` means" (line 77) and `rules.md` the
  section "What the owner is asked to decide". No search was made for a later case of a small
  choice put to the owner.
- Row 5. `grep -n -i -c fly rules.md` is 0. `grep -n fly metadev`, in the main checkout, prints
  `--add-dirs=~/.fly` (line 51). `tools/cloud-brain/records/fly-1-by-hand.md`, "A choice the writer
  made", has the choice in the writer's words. Triage gave two texts, A and B; the comment for the
  owner has a third, C, to leave it unwritten.
- Row 6. `bun tools/cloud-brain/token-checks.ts --token impl-5a9f8e` at 21:03 CEST, at event 6944:

  ```
  R1, first check: FAIL
    issues-implementer-2: 64 events after N, 2682 to 6376, keys {"impl":15,"orch2":47,"fly":2}
    issues-reviewer-2: 3 events after N, 4175 to 4177, keys {"rev":3}
    issues-overseer-1: 0 events after N
  ```

  The spec of the project puts the owner's revoke "when task 6's first check has passed"
  (`plan/cloud-brain-record-names-token-not-agent.md`, "What only the owner can do"). The check
  counts events that are in the record, so it does not pass by waiting. The comment for the owner
  says so as the one flaw. This is this writer's reading of the tool's output; `token-checks.ts`
  was run and not read.

## Row 4: what was wrong

`rules.md`, "The approver", "Its own files", said: "a commit of the seed that touches no policy
cell and no policy part is marked `tracker`, which is no refusal". `policyCells` of
`tools/cloud-brain/approver.ts` has a case that answers otherwise (line 314):

```
  if (a.loose !== b.loose) out.push("a cell with no name (an import, or prose with ${ in it)");
```

`loose` is every cell of the seed with no name that is not prose with no `${` in it (`cellsOf`,
lines 134 to 144), sorted and joined. A name in the answer makes the seed the approver's own
(`own`, line 326) and its mark `policy` (`marks`, line 327). So a commit that only adds an import
to `brain-issues.ojs` is refused by the tool, and the item read as if it were not. The tool
refuses more than the item said, so no approval was made that the item would not allow. Note 1 of
review 6824 of `rules-md-own-files-says-policy-cell` found it; its writer filed the entry.

Note 2 of that review is beside it: the item said a read route "changed or added" is no policy
part, and one removed is none either.

## What changed

- `rules.md`, the item. "changed or added" is "changed, added or removed". "no policy cell and no
  policy part" is "no policy cell, no policy part and no cell with no name". One sentence is new,
  after it: "A cell with no name is an import, or prose with `${` in it: of one added, changed or
  removed the tool names `a cell with no name`, the seed is marked `policy`, and the issue is the
  owner's (said here since `fb-batch-rules-md`, 2026-10-13; the tool did so before)."
  `git diff --numstat HEAD` of the file before the commit: 7 lines added, 4 removed.
- `tests/tools/rules-md-own-files-policy-parts.test.ts`: 26 lines added, 2 removed (the same
  command). Two `toContain` of the test "what is no policy part" ask the two changed clauses, and
  it has one case more: the seed with a plain `count` route as the side before and the seed as the
  side after answers `[]`. A new test, the eighth, asks the new sentence and holds it beside the
  tool: an import added, changed and removed, and prose with `${` in it added, changed and
  removed, each answers the tool's name of a cell with no name; `marks` and `own` of that answer
  are `policy` and true; prose with no `${` added, and a named cell that no policy cell reads
  added, each answers `[]`.

`approver.ts`, `tests/tools/approver.test.ts` and `agents/approver.md` were read and not changed:
they are the approver's own, and a landed change to the brief or the tool stops every approval
until the owner installs a policy. Nothing of who may do what changes. The item is in `rules.md`,
so the issue is `major`.

## Counts

Each is the output of the command beside it, run in the worktree on 2026-10-13 after the last edit
of `rules.md` and of the test.

- `bun test --timeout=30000 ./tests/tools/rules-md-own-files-policy-parts.test.ts`: 8 pass, 0 fail.
  With `rules.md` as `HEAD` had it (`git show HEAD:<path>` written over the file, then put back
  from a copy), the same command: 6 pass, 2 fail. The two that fail are "what is no policy part: a
  read route beside those statements, and an entry no policy reads; the mark is then tracker" and
  the new test, each at its first `toContain` of the item.
- `bun test --timeout=30000 ./tests/tools/rules-md-the-approver.test.ts ./tests/tools/rules-md-reading-note.test.ts`:
  19 pass, 0 fail, 2 files. They read the section and the note on the file's length.
- `grep -c 'expect(diff\|expect(policyCells' tests/tools/rules-md-own-files-policy-parts.test.ts`:
  28 lines of the test call `policyCells`. It was 19 in the record of
  `rules-md-own-files-says-policy-cell`.
- `tests/tools/suite.sh`, once, at 21:08 CEST, after the record was first written and with no
  edit of `rules.md` or of the test after it: 1293 pass, 0 fail, 135 files, 150.45 s. No line
  `skipped:` and no `(fail)` in its output (`grep -n` of the saved output). `uptime` after it:
  load averages 7.05 5.61 4.15.
- `git grep -n -F 'changed or added' -- knowledge 'plan/cloud-brain-*.md' .claude/skills/brain-maintenance 'tools/cloud-brain/*.md'`:
  3 lines. One is of the route, in a file this run did not change: `agents/approver.md` line 140,
  "A route that takes a GET and is neither of the two, changed or added, carries a mark only for
  a statement in it". It is not untrue, and it does not say removed. The second is a record of an
  earlier change (`records/approver-policy-mark-takes-every-route.md`, line 118), and the third
  is of another matter (`plan/cloud-brain-locks-held-in-the-cluster.md`, line 597).
- `git grep -c -F 'cell with no name' --` the same paths, before this record was written: 3 lines
  of `rules.md`, all the item, and 8 lines of three records. None is in `agents/approver.md`: step
  6 there says "`tracker` is `brain-issues.ojs` in a commit that changes no policy cell", and the
  tool's verdict line names a cell with no name among "its policy cells". Both lines are the
  approver's brief and are left for the overseer, in the comment on the issue.

## Not tried

- `approver.ts facts` or `approve` on an issue with such a commit. The test calls `policyCells`,
  `marks` and `own`, which those call. `tests/tools/approver.test.ts` has the refusal itself, on a
  commit whose prose runs an expression (its lines 348 to 351); it was read and, as part of the
  suite, run.
- Two answers of `policyCells` that the item still does not name: "the whole file (it is not read
  on one side of the commit)" and "`<cell>` (not there once on each side of the commit)". Each
  names something, so the mark is `policy`. Whether a reader takes "touches a policy cell" to
  cover them was not asked of anyone.
- A cell with no name moved in the seed. `loose` is sorted, so by the code a move alone is no
  difference; no case of the test moves one.
- That an agent reads the item as meant. It is 22 lines (205 to 226 of the file); no agent was
  given it.
- The seed at another commit: the test reads the seed as the checkout has it.
- For the two issues opened for the owner: whether the comment written for him reads as "What the
  owner is asked to decide" asks is held by this writer alone, as that section says of every such
  comment. Which issues are today `in-progress` or at `spec` with a start by one of the three old
  tokens was not looked up.

## Not done in this record's commit

Row 4's entry, `seen-own-files-cell-with-no-name`, is closed by this writer after the push, when
the clause is on `main`: the close is an event of that issue and is read there, not here. The
batch is `major`, so after its review it waits for the owner's approval; if that is refused the
entry is reopened by whoever undoes the change.
