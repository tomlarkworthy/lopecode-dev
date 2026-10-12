# specs-kept-in-the-cluster

Written 2026-10-12 by the writer of the issue, round 1. The spec writer's brief
(`.claude/skills/brain-maintenance/agents/spec.md`) now has the writer attach the spec to its issue
before the move to `spec-review`. No seed changed and nothing was deployed.

## What was asked

The owner, 2026-10-11, in the issue's body: "I think we write good specs but they get lost. I think
they should be saved somewhere not in lopecode-dev, in the cluster".

The overseer put three choices to him in comment 4085. A: "promote it to a task now, the smallest
version being the spec attached to its issue at spec-review, which costs one line of agents/spec.md
and no service". His answer is quoted whole in comment 4380, by the session he gave it in: "9 A".
That this issue was number 9 of the list he answered is that session's reading (the same comment).

## What changed

`agents/spec.md`, step 7. After the issue is read again and before the move, the writer runs two
lines. The first writes the body of the call as a file in the scratchpad, with the spec as `text`;
the second is `ia attach @<that file>`. The key is `spec/<id>/attach-<round>`, the name
`cloud-brain-<id>-r<round>.md`, the type `text/markdown`. The paragraph then says how the writer
knows the attached text is the commit's (the event's `sha256` beside
`git show <sha>:plan/cloud-brain-<id>.md | shasum -a 256`), and what is refused. The last sentence of
the step, for a round sent back, reads "attach and submit again with the next round's key and name".

The file in `plan/` and the commit ref of the move are as they were. It is 17 lines added and 1
changed (`git diff --stat HEAD -- .claude`, before the commit: `18 +++++++++++++++++-`).

Decided while writing:

- **The round is in the name.** `issue.attach` takes a name once an issue (the tracker's reference,
  and the 403 below), so a spec sent back is attached again as `-r2`. The issue then holds each
  round's text, with the `seq` of its event.
- **The name is the file's own, not `spec.md`.** The page saves an attachment as a file of its name
  (the reference), so two specs saved by the owner do not get one name. The longest id, 40
  characters, gives a name of 59 with a round of two digits, under the 100 the method takes; the test holds the pattern.
- **`newline=""` in the line.** Python's `open` in text mode otherwise turns `\r\n` into `\n`, and
  the `sha256` of the event would not be the file's. The test's file has a CRLF.
- **The attach is after the landing**, so the commit exists to compare with, and before the move,
  so the issue has the text when a reviewer is spawned.

## Prior art searched

`knowledge.search?semantic=true` on cb4 with `loop-knowledge`, 2026-10-12, two searches: "spec
attached to its issue", "where specs are kept issue.attach file". The first 8 entries of each were
looked at. Read:
`tools/cloud-brain/records/n9e1c1256.md` (the record of `issue.attach`: a name once, 1 MB, the read
through `issue.attachment` only) and the method's rows in the reference
(`getSource?worker=brain-x-issues&part=reference`). `doc:how-file-attachments-work` is about a
notebook's files and did not bear on it.

The searches also showed that one line of the issue's body no longer holds. It says "`plan/*.md` are
not entered" in the knowledge base. The first 8 entries of the first search are each a
`doc:cloud-brain-…` whose file is in `plan/` (`ls`, 8 of 8), and `tools/cloud-brain/knowledge-docs.ts` line 105 lists
`plan/cloud-brain-*.md`. So files of `plan/` are among what the search answers. The body was not edited.

Before this change a spec writer had attached files to a project at `spec`: events 4016 and 4017,
`measure.py` and `replay.py` on `bookkeeping-in-the-tracker`, by `spec-8717a9`, before its
`submit-spec` at 4029 (`ia "sync?after=4010"`). That is the evidence that the workflow lets a spec
writer attach there. No spec had been attached: `ia list` answered 100 issues, 3 with attachments,
none of them a file of `plan/`.

## The test

`tests/tools/spec-brief-attaches-the-spec.test.ts`, new, three tests. It reads the brief as it is.
The third takes the `python3 -c` line out of step 7, puts an id, a round, a directory and a token in
the placeholders, runs it under zsh on a file with an apostrophe, a double quote, a backslash, a
CRLF, `é`, `→`, `$HOME` and a backtick, and compares the SHA-256 of the body's `text` with the
file's.

```
bun test ./tests/tools/spec-brief-attaches-the-spec.test.ts
```

Before the edit of `spec.md`: `1 pass`, `2 fail`, 7 expect() calls. The one that passed is the test
of the name's pattern, which does not read the brief. After the edit: `3 pass`, `0 fail`, 17
expect() calls.

The whole suite, `tests/tools/suite.sh` in the worktree, after the last edit of the brief and the
test: `688 pass`, `0 fail`, 4588 expect() calls, 688 tests across 69 files, 154 s (ended 21:18:28 CEST, `date`).

## Run on cb4

The brief's two lines, with this issue's id, a key and a name of a trial, and a spec of
`origin/main` as the file (`plan/cloud-brain-locks-held-in-the-cluster.md`, 66566 bytes, the second
largest of the 30 `plan/cloud-brain-*.md`; `wc -c`), sent with the writer's token at 21:14:35 CEST
(`date`):

| Call | Answer |
|---|---|
| `ia attach @…-attach.json` | 200, event 4459, `attached`, `size` 66566, `sha256` `737536ea…f572` |
| `shasum -a 256` of the file, and of `git show HEAD:<the file>` | `737536ea…f572`, twice |
| `ia "attachment?id=specs-kept-in-the-cluster&name=trial-cloud-brain-locks-held-in-the-cluster-r1.md"` | `size` 66566, the same `sha256`; the SHA-256 of the answer's `text`, computed here, is the same |
| `ia "get?id=specs-kept-in-the-cluster"` | `attachments` has the one entry, `seq` 4459 |
| the same name with another key | 403 `the issue has an attachment of this name` |
| the same key again | 200, `duplicate: true`, `seq` 4459 |
| a `text` of 1048577 bytes, another name | 400 `1048576 bytes at most` |

The trial's attachment stays on this issue: nothing deletes one.

## Not tried

- **A spec writer has not run the step.** The trial was a writer's token on a task at
  `in-progress`. That a `spec-` token may attach to a project at `spec` rests on events 4016 and
  4017, not on a run of mine.
- **The page.** That the tracker's panel shows an attachment as a line under the issue's body, and
  saves it as a file, is the reference's sentence. No tab was opened, and the brief says whose
  sentence it is.
- **A second round.** The `-r2` name was not attached; the 403 for a name used twice was.
- **A spec over 1 MB, or one that is not UTF-8.** The largest file of `plan/` is 83849 bytes. The
  line reads the file as UTF-8 (`open(…, encoding="utf-8")`); a file that is not was not given to it.
- **The specs written before this.** None was attached to its project, and the 30 files of
  `plan/cloud-brain-*.md` were not sorted into specs of the loop and older designs.
- **The rest of the issue's body.** A link beside the approve button, an entry of kind `spec` in the
  knowledge base, moving the files out of `plan/`, and keeping a project's as-built record with its
  spec are choice B of comment 4085, which he did not take.
