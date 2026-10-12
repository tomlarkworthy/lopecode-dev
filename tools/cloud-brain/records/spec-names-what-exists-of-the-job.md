# A spec names what exists of the same job (`spec-names-what-exists-of-the-job`)

Written 2026-10-12 by the writer of the issue (token `impl-d802a7`, `start` at event 4579). The issue
is the first next action of the post mortem `tools/cloud-brain/post-mortems/pm-second-summarizer-role.md`:
a spec added a second summarizer role beside the one that existed, no text asked its writer or its
reviewer what existed of the same job, and the owner sent it back.

The issue asks for two texts. One is changed here. The other is not, and is filed.

## What changed

`.claude/skills/brain-maintenance/agents/spec.md`, step 5, the item of the design. It read "the
smallest design that meets the requirements, and what was not chosen and why;". It now goes on: for
each standing thing the design adds (a role and its brief, a tool, a token, a Worker, a method, a
store) the spec names what exists today that does the same job for the same purpose and says under
"Not chosen" why that is not extended; where the writer looks; that "Nothing exists" is said with
the search or the listing that showed it; and the owner's sentence of comment 4463 of
`docs-summarised-for-search`, whole, with its date.

The issue's body names three places to read: `agents/`, `roles/` and `tools/cloud-brain/`. The
brief gives each as it is reached from a worktree:

- `.claude/skills/brain-maintenance/agents/`, a directory of the checkout;
- `tools/cloud-brain/`, the same;
- the roles of the Brain as an address, `https://cb4.endpointservices.workers.dev/static/cloud-brain-dev/index.md`.
  A worktree has no `cloud-brain-dev/brain/` until a file of it is read (`ls` of it in this worktree:
  "No such file or directory"). The address answered 200 at 22:03:25 CEST (`date`, then `curl -s -o /dev/null -w '%{http_code}'`) with two rows,
  `brain/roles/paper-summarizer.md` and `brain/roles/reviewer.md`.

## What did not change, and where it went

The reviewer's brief, "A spec", question 3. It is a file of the Brain, changed by a put with the
token `loop-roles`. `rules.md`, "The files of the Brain an agent reads", gives that put to the
overseer and to "a writer whose issue is a task of a spec the owner approved". This issue has no
parent and no spec, so the put is not this writer's, and the issue's own body says so ("the
reviewer's brief is put by the overseer").

The kept copy, `tests/tools/fixtures/reviewer-brief.md`, was not edited either. Its header in
`tests/tools/reviewer-brief.ts` says it is the brief as cb4 served it, so a line written into it
before the put would be a line no reviewer follows, held by a test.

Filed as `reviewer-q3-reads-what-exists` (event 4591, linked `related` at 4592): the wording of
question 3, the overseer's put, and after it a writer's commit of the kept copy with a test. The
wording is in that issue's body and in comment 4654 of this one, under "For the overseer".

So of "Done when" ("Both texts have the line, with a test under `tests/tools/` that holds each"),
this landing has the first text and its test.

## The question the issue left to the writer

"Whether the check should also be a line of the fresh review a spec writer runs before its submit
(`.claude/skills/review-notebook/reviewer.md`)". Not added. That reviewer is given the file and no
context, and its markdown target checks commands, paths, flags and numbers against the repository.
The post mortem did not file it either ("whether it can know what exists is not clear"). The
loop's reviewer reads the parts and the spec, and is the one the filed issue changes. Decided by
line 2 of `philosophy.md`, the smaller side; what would reopen it is a spec that passes the loop's
review under the new question 3 and is still sent back for a thing that existed.

## Tests

`tests/tools/spec-brief-names-what-exists.test.ts`, four tests of step 5 as the file has it: the
six kinds and the sentence, the places (the two directories exist in the checkout), "Nothing
exists" with its search, and the owner's words with date and comment.

```
$ bun test ./tests/tools/spec-brief-names-what-exists.test.ts     # before the edit of spec.md
 0 pass
 4 fail
$ bun test ./tests/tools/spec-brief-names-what-exists.test.ts     # after it
 4 pass
 0 fail
```

The whole suite, after the last edit of a file a test reads and after the rebase of step 9 (which
brought in `tests/tools/topic-sql.test.ts`; 712 pass before it). A third run, after the rebase under
the landing lock had brought in `SKILL.md` and a record, gave the same 713 and 0 in 142.14 s:

```
$ tests/tools/suite.sh
 713 pass
 0 fail
 4753 expect() calls
Ran 713 tests across 73 files. [111.71s]
```

## Read before the change

Three searches of the Brain (`knowledge.search?semantic=true`, token `loop-knowledge`):

| Words | First answers | Used |
|---|---|---|
| "spec names what exists that does the same job before adding a role" | `doc:cloud-brain-post-mortems-declared-and-kept` 0.743, `module:tomlarkworthy:robocoop-5-spec-lock` 0.651 | The first names this issue as the post mortem's action (its line 479). Nothing of the wording. |
| "reuse an existing role or tool instead of adding a second" | `arxiv:2603.18000` 0.752, `arxiv:2510.04618` 0.597 | Not read. Titles only: papers on agents that change themselves. |
| "what was not chosen and why in a spec" | `doc:cloud-brain-answers-cut-and-not-said` 0.806, `doc:cloud-brain-deploy-verdict-from-a-shared-page` 0.785 | Not used: specs that have a "Not chosen" part, not a rule for one. |

`git grep -n -F '<words>' -- knowledge 'plan/cloud-brain-*.md' .claude/skills/brain-maintenance 'tools/cloud-brain/*.md'`,
run after the change: `Not chosen` 107 lines, `smallest design` 4, `smallest version` 2, `what was
not chosen` 5. Of the 107, 73 are in `plan/` and none in `knowledge`. The 73 were not each read: a
filter of them for `brief`, `spec.md`, `step 5` and `question 3` printed no line. The other 34, and
the lines of the other three searches, were read. Outside the files of this change they are a
record's or a spec's own "Not chosen", and the post mortem's quotes of both texts "read at
619354c2". None says what step 5 asks today, so none was mended.

## Not tried

- No spec was written under the changed step 5, and none was reviewed under the proposed question 3.
  Whether either would have caught the second summarizer role is not known (the post mortem says
  the same).
- The reviewer's brief was not put and its kept copy was not changed.
- The three kinds of place were not each tried for each of the six kinds of thing: a token is kept
  in `.emitted/cb4-tokens.json`, which an agent does not read into its output, and the brief names
  no listing of tokens. A spec writer finds a token in `rules.md` or in the spec that named it.
- The test holds phrases of the brief. It does not show that a writer who reads them does what
  they say.
