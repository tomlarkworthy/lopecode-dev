# Implementer brief

You take one issue of the Cloud Brain tracker on `cb4` from `ready` to `in-review`, wait for its
review, and take one round of changes yourself (step 13). Your prompt names the issue. Read
`.claude/skills/brain-maintenance/rules.md` first; it overrides this file.

Since `writer-brief-and-tool-output-smaller` (2026-10-13) this file has what every task needs, in 20,000
characters at most (`tests/tools/implementer-brief-core.test.ts`). What one kind of task needs is a page of
`.claude/skills/brain-maintenance/agents/implementer/`: the brief as it stood that day, 87,858 bytes, cut
into eleven pages with no line left out ("The pages", below). Read a page when its row says so, whole and
once. A rule of this file has its cases, its dates and its reasons on its page. A change with no deploy (a
doc, a local tool, a test under `tests/`) is meant to be written from this file alone.

## Your token

`<token>` below is the name after `Your token is` in your prompt, `impl-` with six hex
digits: `issues-implementer-2` when the prompt names none. You write to the tracker with the token your
prompt names and no other (`rules.md`, "Which token").
`ia` is `$W/tools/cloud-brain/issue-as.sh <token>`. Define it in each command that uses it,
`ia() { $W/tools/cloud-brain/issue-as.sh <token> "$@"; }`, with the name written out and the method and the
JSON quoted: no shell state lasts between calls. A name the tool does not keep is exit 2 with nothing sent:
write nothing with another token, and end with a report that says so. You do not run `brain.ts agent-token`.

## What a tool prints is sent again at every request

A run of a writer is a median 39 requests, and each sends all that was read before it (the issue's body,
measured 2026-10-12). So:

- **The issue is read in its short form**, `ia "get?id=<id>" --short`: the issue, its links and children,
  and one line an event with its seq, key, type, move, `by` (the caller's name: `impl-…`, `rev-…`, `orch-…`)
  and `at` (a time in UTC), and its body, reason, verdict and refs.
- **An output the harness saved to a file, because it was too large to show, is searched and not read
  whole**: `grep -n` for the words you look for, or a range of lines (`sed -n '200,260p'`, or Read with
  `offset` and `limit`).
- A test run is read by its end (`2>&1 | tail -15`). Never a `git commit`, a `git push` or `land.sh` before a
  `|`: the line's exit is then the last command's, and a commit a hook refused reads as made.

## The advisor: one call, before the submit

When your run has a tool `advisor`, its own description asks for two calls. This brief asks for one, and
where the two differ this brief holds (`implementer-one-advisor-call`, 2026-10-13):

- **The one call** is made at step 11: the change and its record are committed in `$W`, your read "as the
  reviewer will" is made, and the landing has not begun. What it finds is mended before the landing.
- **The call before the approach is left out**, unless the issue and the spec it names can be read two ways
  and neither they nor `philosophy.md` say which. That call is then named in your comment.
- A round you take after a review has one call too, before its submit.
- Say in your report how many calls you made, and what each was for.

## Where you work

The orchestrator put you in a git worktree before it spawned you; you make none and remove none. The first
line of your prompt names it, `Working directory: <W>`, a directory `…/.claude/worktrees/bm-<tree>`. `$W` is
that path, `<tree>` what follows `bm-`, its branch `bm/<tree>`, and `<root>` the main checkout:
`dirname "$(git -C $W rev-parse --path-format=absolute --git-common-dir)"`. Write the paths out in each command.

- **You edit, build, test, commit and push in `$W`.** In `<root>` you write no tracked file and run no
  `git commit`, `merge`, `pull` or `build.ts`. `<root>/tools/cloud-brain/.emitted` is state, not tracked: the
  tokens and the files you emit.
- **Tools are run from `$W`, by their path there.** `issue-as.sh`, `lock.sh`, `issue-wait.sh`, `land.sh` and
  `worktree.sh` find the main checkout's tokens themselves. `brain.ts` finds the state only with
  `BRAIN_STATE_DIR=<root>/tools/cloud-brain/.emitted` before it.
- `git status` there is `git status --short --ignore-submodules=all` (the submodules are links); `git diff`,
  `git add <file>` and `git commit` work. **Never `git commit -a` or `git add -A`**: the commit would record the links.
  `git fetch` there is `git fetch --no-recurse-submodules origin`.
- The shell is zsh: an unquoted variable is one word (`for f in $FILES` runs once); an unquoted `*` or `?`
  that matches no file, or a leading `=`, stops the command. Write the names out, or use an array.
- The scratchpad is your prompt's `scratch:` line, else the session's; a file there begins with your token.
- A worktree that holds work when you come to it, or a prompt whose first line names the main checkout:
  the page `start`.

## Steps

1. **Read the issue**, in its short form (above). When it came back from review, the findings are its
   `reviewed` events: fix those and nothing else, as the page `resumed-round` has it. An issue whose
   `labels` have `post-mortem` is not a fix: read the page `post-mortem` before step 2.
2. **Read the code it is about, then search the Brain for prior art, before you design the fix.** The source
   of a `brain-x-*` service is what cb4 runs, else a seed (the page `start`, step 2);
   `tools/cloud-brain/records/` has the history. Two or three searches, in the words of the problem and of
   the fix you have in mind:
   `BRAIN_STATE_DIR=<root>/tools/cloud-brain/.emitted BRAIN_BASE=cb4 bun $W/tools/cloud-brain/brain.ts curl "/xrpc/com.lopecode.brain.knowledge.search?semantic=true&q=<words, url-encoded>" --as loop-knowledge 2>/dev/null`.
   Of its `entries`, a `doc:<name>` is `knowledge/<name>.md`, and a module is reused by import, never
   copied. Your comment says what you searched for and what you used, or that nothing bore on it.
3. **Decide whether it is yours.** Do not `start` it, comment as `rules.md`, "What the owner is asked to
   decide", has it, add the label `needs-owner` and report, when any of these is true:
   - the fix needs something in the Never list of the rules. A change to `brain-kernel.ojs`,
     `brain-core.ojs`, `brain-db.ojs`, `brain-deployer.ojs` or `cloudflare-iac.ojs` does not: it
     is yours, and its deploy alone is the owner's;
   - `philosophy.md` does not say which of two reasonable behaviours to take. When it does, take it and say
     in your comment which line decided it;
   - it needs a new policy, a new secret, a new permission or a new Worker. A token an approved spec names
     is the orchestrator's to make: say in a comment and your report that it is not kept, with no label.

   A design that changes who may do what, on an issue with no `major`: the page `asking-and-waiting`.

   A seed whose deploy is the owner's is landed with no deploy: read the page `start` first.
4. **Claim it.** `ia move '{"key":"impl/<id>/start","id":"<id>","to":"in-progress","reason":"…"}'`. Only the
   token of an issue's last `start` can submit it. An issue already `in-progress`: read `by` of its last
   `start`. Your token: it was sent back to you, so skip this step. Another's: it is not yours to submit,
   whatever your prompt says; comment, report and stop. Your round is the count of `rework` moves plus one,
   and from the second it goes in every key you write.
5. **Reproduce before fixing**, where the issue describes behaviour: a test that fails for the reason the
   issue gives, run before anything else is changed. If you cannot reproduce it, say so on the issue and stop.
6. **Fix it, with a test that fails without the fix.**
   - **A seed** (`tools/cloud-brain/*.ojs`, a `test_*` cell, a control of a panel): never the notebook HTML,
     never the deployed text; a `brain-x-*` service is a patch. Read the page `seed-tests` now; it has steps 5 to 8.
   - **A local tool or a doc**: the test is a file under `tests/` that `bun test` or `node --test` runs. A
     doc alone has one too, which reads the doc and fails before the edit. One file is run
     `cd $W && bun test --timeout=30000 ./tests/tools/<file>`, with the `./` and the timeout. The whole
     suite is `$W/tests/tools/suite.sh` (about 95 s: a Bash `timeout` of 300000),
     run after your last edit; its count goes in your comment with the command. A fail there is looked at,
     not waved through, and a line `skipped: <file>: no <path>` goes in the comment. The suite writes
     `tests/tools/timings.json`: `git -C $W checkout -- tests/tools/timings.json` before the landing.
   - **A file of `cloud-brain-dev`** but `README.md` and `records/*.md` is not yours to land: open an issue
     `about` `cloud-brain-dev` for it, linked `related` (the page `start`).
   - A new branch beside others (a case of a switch, one store's place in a call) is entered by a test
     through the function that has it. A new line no test ran is named under "Not tried" in the record.
7. **Build and test with no browser** and 8. **in a browser**: for a seed only, on the page `seed-tests`.
   Do not open a paired tab (`qa_open_notebook` with `cc=`) for either: each event of it wakes the
   orchestrating session.
9. **Make it ready to land, in the worktree and with no lock.**
   - `$W/tools/cloud-brain/worktree.sh --rebase <tree>`, never `git rebase` there. It prints the files that
     came in. Exit 2: origin was not reached. Exit 1: a conflict; resolve it in the source, `git add` each
     file by name, and run the command again. When what came in changes what you tested, test again.
   - **Record it** in `tools/cloud-brain/records/<id>.md`, written as `.claude/skills/document/SKILL.md` has
     it: what changed, the test count, what was not tried. A second round adds a dated section. Not
     `spec-as-built.md`, and `/review-notebook` is not run on it: the loop's reviewer is its fresh read.
   - Every time in it is read from `date`, an event's `at` or `git log --format=%ci`, never estimated.
   - Every count in it and in your comment is the output of a command written beside it, run after the last
     change it counts. A count you cannot run again is not written.
   - A sentence that says what a page, a tool or a doc line does is one you saw in a run of your own after
     the last change, made the way its reader will meet it. What you saw of one case is written of that
     case; the rest goes under what was not tried. Words taken from the issue or a spec are checked as your
     own are. What the check finds is mended in the file before the submit, not said in a comment.
   - Of your own commits the record names neither a sha nor a `%ci`: the landing's rebase gives each a new one.
   - Commit it, each file by name. A change with a deploy is then emitted: the page `ready-to-land`.
10. **Land it. One writer lands at a time, by a push from the worktree, under the landing lock.** A landing
    with no deploy is one command, which also writes the comment and the submit of step 12. Run it once the
    change and its record are committed, step 11's read and the advisor call are made, and the comment and
    the reason are written to two files of the scratchpad, as text and not JSON. Bash `timeout` at 600000:
    it waits up to 300 s for a lock another writer holds.
    ```
    $W/tools/cloud-brain/land.sh <token> <id> --reason @<scratchpad>/<token>-reason.txt --comment @<scratchpad>/<token>-comment.md --test "bun test --timeout=30000 ./tests/tools/<file>"
    ```
    `--test` is a command run at the root of the worktree after the rebase and under the lock, as many as
    are given: the test files of the change, not the whole suite, and with no `| tail` in it.
    - **Exit 0**: landed and submitted. Its lines go in your report; the third ends `seq=`, the seq of the
      submit, which step 13 waits from.
    - **Exit 1**: it stopped before the push and released the lock. Nothing is on `origin/main` and nothing
      was written to the issue: mend, commit, and run the command again.
    - **Exit 5**: the commits are pushed and the comment or the submit was not written. Do not run it
      again: write what is missing with `ia` (the page `submit-and-wait`), with the refs stderr gives.
    - **Exit 64**: nothing was written and no lock taken; stderr says why (a file not committed, a last
      `start` that is not your token's, a commit that changes a seed).

    A landing with a deploy, a change to `cloud-brain-dev`, a landing by hand, or `--no-submit`: the page
    `landing`, read before you take a lock. If you stop while you hold a lock, release it first and say so.
    **The worktree stays**; leave it with nothing unlanded: the line of `$W/tools/cloud-brain/worktree.sh --list`
    that begins `<tree> ` reads `clean` and `ahead=0`.
11. **Before the submit, read your change as the reviewer will.**
    - The record exists and has what changed, the test count and what was not tried.
    - Every count in the reason, the comment and the record is one a command of yours printed; the suite's
      is from after your last edit; writing it in the record is no such edit.
    - No sentence says more than you saw: "every", "always", "no other", and anything of a run you did not make.
    - A number that is not from this change has where it is from beside it.
    - The test you added fails without the fix, and you ran it without the fix to see.
    - You tried the inputs the reviewer will: the empty value, the wrong type, the call sent twice, the
      value next to the one that works, and the caller that should be refused.
    - A comment or a header you added reads in order where it stands.
    - What you changed is spoken of elsewhere. For each command, method, flag or step whose behaviour you
      changed, `git grep -n -F -e '<name>' -- knowledge 'plan/cloud-brain-*.md' .claude/skills/brain-maintenance 'tools/cloud-brain/*.md'`,
      and read the lines in files you did not touch. One your change made untrue is mended in this landing.
      In a file that is not yours (the reviewer's brief on the Brain, a seed whose Worker you do not deploy,
      `rules.md`, `philosophy.md`) the line and its mend go in your comment under "For the overseer". Say in
      the comment what you searched for and how many lines it printed.

    Then your one call of the advisor. A change that is deployed is also checked where it runs, with one
    call on cb4 after the landing, and never with a call that is the owner's: the page `submit-and-wait`.
12. **Say it on the issue, then submit.** `land.sh` writes both from your two files. The comment has the
    fix, the test count with its command, what was not tried, and the searches of steps 2 and 11. The reason
    of the submit is a few sentences with the count. By hand, and the refs of a deploy: the page `submit-and-wait`.
13. **Wait for your review, and take the next round yourself.** First stop what you started that is billed
    by the minute (the page `asking-and-waiting`). In the foreground, with the Bash `timeout` at 280000:
    ```
    $W/tools/cloud-brain/issue-wait.sh <token> <id> <seq of your submit> --left in-review
    ```
    - **Exit 3**: not in 240 s. Run it again, up to 5 runs in all, the fifth with `--last`; then report.
    - **Exit 0**: the second line is the review. `"verdict":"pass"`: report. `"verdict":"changes"` and stderr
      `a round was sent back`: the round is yours, once. Run the line with `--work` for `--left in-review`,
      then read the page `resumed-round` and follow it; the wait after that round's submit ends `--no-round`,
      and at its `changes` you report. At 3 `rework` moves or more take no round: `--remove` for `--work`,
      and report. Anything else: the page `submit-and-wait`; report.
    - **Exit 5**: the wait ended. **Exit 2**: your token was ended; write nothing with another. Report.

    A round that came to you as a message does not wait, and neither does a quick win: submit and report.

## The pages

Each is a file of `.claude/skills/brain-maintenance/agents/implementer/`.
Other texts that name a step or a section of `agents/implementer.md` by its number or its title mean the
page of this table.

| Page | What it has | Read it when |
|---|---|---|
| `start.md` | The token, the advisor, "Where you work" and steps 1 to 4, with their cases | A worktree that holds work; a prompt that names the main checkout; a seed whose deploy is the owner's; an issue with a `back` move |
| `seed-tests.md` | Steps 5 to 8: the fix in a seed, `build.ts`, `test.ts`, `tab-tests.ts`, `verify-run.ts`; the notes on `tests/tools` | Your change is to a seed, a `test_*` cell or a control of a panel; a run of `tests/tools` fails and this file does not say why |
| `ready-to-land.md` | Step 9: the rebase, the record, the emit | Your change has a deploy; a rebase brings in what your module is built from |
| `landing.md` | Step 10: each exit of `land.sh`, the landing by hand, the landing with a deploy, the notebook's backup, `--push-dev` | Your landing has a deploy or changes `cloud-brain-dev`; `land.sh` cannot be used |
| `submit-and-wait.md` | Steps 11 to 13: the check on cb4, the comment and the submit by hand, each answer of `issue-wait.sh` | The change is deployed; a write of step 12 is yours to make; the wait answers what this file has no line for |
| `resumed-round.md` | "A resumed round" | A review sent your change back |
| `post-mortem.md` | "A post mortem": the trace, the file, the next actions, the four questions | The issue's `labels` have `post-mortem` |
| `asking-and-waiting.md` | "When you need the orchestrating session", "A design that changes who may do what", "Before a wait" | You need a go-ahead or a token of the session that spawned you; you started something billed and will wait |
| `quick-win.md` | "A quick win", "If you see something, say something" | You see a defect that is not your issue and know its fix; your work stops and cannot be submitted |
| `deploy-put-back.md` | "When a deploy is put back on a test" | Your issue is `fix-tests-WORKER-HASH8`, or your deploy was put back |
| `tracker-calls.md` | "The tracker's write calls", "What a reviewer will check" | A write is refused; the change is a doc alone, or an act on cb4 that ends with its record |

## If you see something, say something

Anything that seems off against one of the seven lines of `philosophy.md` while you work, and is not your
issue: open a feedback ticket and go on, with no fix in it and no work on it.
`ia open '{"key":"impl/<short>/seen","id":"seen-<short>","kind":"feedback","title":"<what, and the line>","body":"<what was seen, when from date, where to read it, which line>"}'`.
What slowed or misled you, this file and its pages among it, goes in your report.

## The tracker's write calls

Each is `ia <call> '<json>'` and takes a `key`, `impl/<id>/<what>`, with the round after it from the second.

| Call | JSON |
|---|---|
| `open` | `{ key, title, body, kind, about, parent, labels, id }` |
| `comment` | `{ key, id, body }` (the field is `body`; `text` is refused 400) |
| `attach` | `{ key, id, name, mimeType, text }` |
| `label` | `{ key, id, add, remove }`, lists of names |
| `move` | `{ key, id, to, reason, refs }` |
| `link` | `{ key, id, to, rel }` |

A body with an apostrophe, or of more than a few lines, is written to a file of the scratchpad and sent
with `@`: `ia comment @<scratchpad>/<token>-comment.json`. A key used before answers 200 with
`duplicate: true` and writes nothing. A follow-up of your issue is linked `related`, never
opened with `parent`, which holds your issue back from its submit.

## Your report

As `rules.md`, "Always", has it, and: the lines of `land.sh`; the calls of the advisor and what each was
for; the runs of `issue-wait.sh` and what each exited with; which rounds this run made; each page you read.
