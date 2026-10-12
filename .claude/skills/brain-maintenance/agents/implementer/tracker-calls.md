<!-- A page of `agents/implementer.md`: the tracker's write calls, the count of a change with no seed and no tool, and what a reviewer will check.
Read it when a write to the tracker is refused, a body has an apostrophe or many lines, or the change is a doc alone or an act on cb4.
Cut from the brief 2026-10-13 (`writer-brief-and-tool-output-smaller`), as it stood. "Above" and "below" in it are of the
brief before the cut: the table "The pages" of `agents/implementer.md` has the page of each step and section. -->
## The tracker's write calls

Each is `ia <call> '<json>'`, and each takes a `key`. The shapes, from the tracker's own reference
(`getSource?worker=brain-x-issues&part=reference`, read 2026-10-10 23:30):

| Call | JSON |
|---|---|
| `open` | `{ key, title, body, kind, about, parent, labels, id }`. `about` is `brain` or a Worker's name; `id` is `a-z 0-9 -`, 40 at most. |
| `comment` | `{ key, id, body }` |
| `attach` | `{ key, id, name, mimeType, text }`, or `base64` in place of `text`. A file for the reviewer or the owner (a diff, a log, a screenshot): 1 MB, 20 an issue, a name once. Read back with `ia "attachment?id=<id>&name=<name>"`. Since 2026-10-11 (`records/n9e1c1256.md`). |
| `label` | `{ key, id, add, remove }`, lists of names |
| `move` | `{ key, id, to, reason, refs }` |

A body with an apostrophe, or of more than a few lines, is written to a file in the scratchpad (the
Write tool) and sent with `@`: `ia comment @<scratchpad>/<token>-comment.json`. The scratchpad is one
directory for every agent of the session, so each file you write there begins with your token: on
2026-10-12 a writer's call sent another writer's `comment.json` and `submit.json` with its own token
(`wt-4-reviewer-in-a-view`; both keys were used already, so nothing was written). An apostrophe ends the quoting
of an inline `'<json>'` and zsh sends nothing; a body over ARG_MAX (1048576 bytes here) is "argument
list too long". The file's bytes are the body as they are, the time check reads them, and a file that
is absent or empty is exit 4 with nothing sent (`records/issue-as-body-from-a-file.md`).

A follow-up opened with this issue as `parent` holds this issue back from review until it is
closed (the submit is refused 403, `issue.children.open == 0`; `brain-tests-fail-headless-unread`,
2026-10-10). Open a follow-up with no `parent` and name this issue in its body.

A change with no seed and no local tool in it (a doc alone) still needs a count for the submit:
a test file under `tests/` that reads the doc and fails before the edit (`tests/tools/doc-token-example.test.ts`).
A test that holds a sentence of a record reads the record and, for anything else, a file as a commit
named in the record has it (`git show <commit>:<path>`; `tests/tools/ds-3-record.test.ts`), never the
file as it is: a later line there fails the test while the record is true.
A task that is an act on cb4 and ends with nothing but its record (a row put, a notebook published) is not
this case. Its count is the one `rules.md` gives (Never, the last item): the confirmation that the act
happened, made by you where it took effect, which is the check the spec names for the task when it names one.
Give that count in the submit, and the suite's beside it when the landing has a record
(`dsv-7-second-dashboard-as-data`, 2026-10-12: this paragraph, `rules.md` and the spec each gave another count).

## What a reviewer will check

That the tests were run and by whom, that what is deployed is what the seed builds, and that the
record says what was not tried. On 2026-10-10 a session submitted three fixes with "not run: no
notebook runtime" and a module edited by hand after compiling; both were caught in review.
