---
scope: [local-development]
topics: Cloud Brain; cb4; brain.ts curl; an answer that was cut and a list that is not whole (more, total, the last line); the state file; a token for an agent; no --owner writes; brain.ts agent-token out, the tracker token of a session outside the issue loop; the health check; brain-x-logs; knowledge-docs.ts; what enters a doc into the Brain's search (lock.sh release land, loop-docs)
triggers:
  - "(^Bash |^|[;&|] )bun +tools/cloud-brain/brain\.ts( |$)"
  - "(^Bash |^|[;&|] )BRAIN_BASE=[a-z0-9]+ +bun +tools/cloud-brain/brain\.ts( |$)"
  - "(^Bash |^|[;&|] )bun +tools/cloud-brain/knowledge-docs\.ts( |$)"
  - "(^Bash |^|[;&|] )BRAIN_BASE=[a-z0-9]+ +bun +tools/cloud-brain/knowledge-docs\.ts( |$)"
---

# Calling a Cloud Brain from this checkout

Moved here on 2026-10-11 from `knowledge/working-with-cloud-brain-remote-lopecode-cluster.md`, which was written 2026-10-08 from the session that
built the cluster pairing. Each command was run that day against `cb4`, except where it says not run. The text is as it was there; a line carries its own date where it is later.
The other pages are listed in that file, which is read first.

## Access from this checkout

Everything goes through one CLI, run on this machine:

```
BRAIN_BASE=cb4 bun tools/cloud-brain/brain.ts <command>
```

- `cb4` is the scratch Brain: `https://cb4.endpointservices.workers.dev/`. Owner
  `larkworthy.bsky.social`.
- State is `tools/cloud-brain/.emitted/cb4.json`, git-ignored: recovery key, deployer key, minted
  sessions. The Cloudflare token is `tools/scratch/cloud-brain-experiments/.cf-token`, git-ignored
  and temporary. **Never print or copy either.** If the state file is missing, there is no access;
  ask Tom.
- A `brain.ts` changed in a git worktree has neither file beside it. `BRAIN_STATE_DIR=<main checkout>/tools/cloud-brain/.emitted`
  runs it on the main checkout's state without copying it there (2026-10-10, `records/worktree-rebase-and-state-gaps.md`;
  run with `curl --as` only). The Cloudflare token is read when a command sends it, so `curl`, `token` and `saw` start without it.
- The header comment of `brain.ts` lists the commands. The ones used daily:

| Command | Use |
|---|---|
| `curl <path> --owner [curl args]` | Call the kernel with the owner's session. `--other` calls as a test member. stdout is the answer's body alone, so it pipes into a JSON parser; the status, ` [200]`, is written to stderr (since 2026-10-11, `issue-as.sh` the same; before that it followed the body on stdout). |
| `curl <path> --as NAME [curl args]` | The same call with a token of that name. |
| `token NAME <method…> [--daily=USD]`, `token list`, `token revoke NAME` | Make a token with the owner's session (`token.create`). Its value goes to `.emitted/<base>-tokens.json`, mode 600, and is not printed. |
| `state` | What is deployed. |
| `page up` / `page state` / `page down` | The Brain's page in a browser of the cluster (`knowledge/pairing-with-the-cloud-brain-page.md`). |

`redistil`, `apply` and `saw` are in `knowledge/changing-and-deploying-a-cloud-brain-worker.md`, and `page` in
`knowledge/pairing-with-the-cloud-brain-page.md`.

**An agent writes with a token, not with `--owner`.** A session minted from the state file is the
owner's own session, and a service cannot tell it from the owner in their tab: events 2 to 9 of
cb4's issue record, made with `brain.ts curl --owner`, carry `"via":"session","tab":true`, the same
as event 150, which Tom made in the page (read 2026-10-10 19:20 with `issue.sync?since=0`). So such
a call passes `caller.present` and can approve, revert, install a policy and rebuild. Tom on that
issue (`owner-session-file-is-present`, event 150): "external agents should prefer to us a token
over masquerading as the owner. They can obtain a token using owner if they don;t have other
options". In this checkout:

```
brain.ts token my-task quota.get knowledge.search   # once, with the owner's session; prints the name only
brain.ts curl /xrpc/com.lopecode.brain.quota.get --as my-task
brain.ts token revoke my-task                       # when the work is done
```

Run on cb4 2026-10-10 19:21 with a token for `quota.get`: `quota.get` 200, `inbox.list` 403 "this
token does not name com.lopecode.brain.inbox.list", `revoke` `{"revoked":1}`. A token's call arrives
`via delegation:<id>` with `tab: false`, so it is never the owner present. A token cannot name
`infra`, `secret`, `token`, `grant`, `people` or `delegation` methods (the kernel's `token.create`
answers 400); those and `apply` stay with the owner's session or the recovery key, and the reads
in the health check below are still made with `--owner`. Nothing refuses a write sent with `--owner`: this is an agreement, as the deploy lock is.
A method list also takes a prefix (`'browser.*'`), quoted: zsh stops on a bare one with "no matches found".
`--as` also reads `.emitted/<base>-issues-tokens.json` and `.emitted/<base>-agent-tokens.json`, where the tokens of the issue loop are.

**No token for the tracker from `brain.ts token`.** Until 2026-10-10 the example above made a token for
`'issue.*'`. Each token is a delegation of its own, and the tracker takes each as another actor:
on issue `doc-example-mints-tracker-token` event 234 is `via delegation:84cd2100b161` (holder
`secret:issues-reviewer-2`) and event 236 `via delegation:b6559fa96c36` (holder
`secret:issues-implementer-2`). The workflow's guard for a pass is
`r.verdict == "pass" && r.actor != issue.by.start` (`tools/cloud-brain/brain-issues.ojs`), and
between two tokens one agent made that keeps nothing apart. This is an agreement: `token.create` does not refuse `issue.*` to a caller that holds one, which would be a
change to the kernel and is the owner's (the triage of that issue, event 236).

Since 2026-10-11 a token for the tracker is made with `brain.ts agent-token`, one for each agent and
each session, as a child of the token `loop-agents` and with no session of the owner
(`plan/cloud-brain-record-names-token-not-agent.md`; `.claude/skills/brain-maintenance/rules.md`,
"Which token"). An agent of the issue loop writes through `tools/cloud-brain/issue-as.sh` with the
token its prompt names and makes none: the orchestrating session made it. Until that day each
role had one token, which every agent of the role wrote with.

**A session outside the loop makes itself a token before its first write to the tracker**, and
writes with that one, not with a role's token (`issues-implementer-2`, `issues-reviewer-2`,
`issues-overseer-1`). Outside the loop is any session that is not the orchestrating session of
`/brain-maintenance` and was not started by it. From the main checkout, whose `.emitted/` has the
parent:

```
BRAIN_BASE=cb4 bun tools/cloud-brain/brain.ts agent-token out "a few words on what the session is for"   # stdout is the name alone, out- and six hex digits
tools/cloud-brain/issue-as.sh out-xxxxxx comment '{"key":"out/<issue id>/note-1","id":"<issue id>","body":"…"}'
BRAIN_BASE=cb4 bun tools/cloud-brain/brain.ts agent-token revoke out-xxxxxx                               # when the session has no more to write
```

- The token names `issue.*` and ends 48 hours after it is made. Its value goes to
  `.emitted/cb4-agent-tokens.json`, mode 600, where `issue-as.sh` and `brain.ts curl --as` read it,
  and is not printed. The words after the role are the token's note, which `agent-token list`
  prints (`ROLES`, `HOURS` and `AGENTS` of `tools/cloud-brain/brain.ts`; what each command sends and
  keeps is the table of `tools/cloud-brain/records/ta-1-agent-token-command.md`).
- With no `loop-agents` kept the command is exit 1 with
  `no token "loop-agents" is kept. The owner makes it once: token loop-agents 'issue.*' --delegate`
  (that record, of a run on 2026-10-11 before the owner made it). The parent is the owner's to make.
  A role's token is not used in its place: `rules.md` keeps the three "for an agent whose prompt
  names no token, and for nothing else".
- Why: an event's `by.holder` is the token that wrote it. Event 3993 of the record, written with
  the writer's token `impl-cdf92d`, has `"holder":"secret:impl-cdf92d"`. 10 events of
  `issues-overseer-1` were a session's outside the loop, a review and a move among them, and the
  record cannot tell them from the overseer's (the spec, "What exists today"; issue
  `seen-outside-session-overseer-token`).
- Not run as written: the writer of this paragraph was an agent of the loop, which makes no token.
  On 2026-10-12 12:23 CEST no event of the record had a holder that starts `out-` (3995 events,
  read with `issue.sync`). The first session to run the three lines says here how they went.
- A session that opens an issue on the owner's word puts `owner` in the `labels` of the open
  (`"labels":["owner"]` in the JSON of `issue-as.sh <token> open`), since 2026-10-11. The issue
  loop takes such an issue as the owner's, and its watch prints the open whatever token made it
  (`.claude/skills/brain-maintenance/SKILL.md`, step 3, "The owner's"). The label gives precedence
  and no authority. An issue he opens himself in the page needs none. (Until 2026-10-12 a
  paragraph of its own here, "An issue the owner asked for"; the heading above it was "No token of
  your own for the tracker".)
- A comment written with an `out-` token is printed by the issue loop's watch, since 2026-10-12
  (issue `watch-prints-an-outside-sessions-comment`): each one wakes the orchestrating session,
  which reads it. So one comment for one thing the loop should read, with the owner's words whole
  when it carries them. A move, a label or a link by that token prints no line. Until then such a
  comment was read at the loop's next whole pass: comment 4916 of `fly-1-by-hand`, the owner's
  question about a billed machine, was no line of the watch
  (`tools/cloud-brain/post-mortems/pm-agent-request-not-seen-fly-idle.md`). The watch reads the
  name of the token: a session that writes with a role's token, or with a name of another form,
  is not printed.
- A change to a tracked file by such a session can be made as an agent of the loop makes one since
  2026-10-12: in a worktree of its own, landed by a push, with nothing committed in the main
  checkout (`plan/cloud-brain-worktree-per-topic.md`, task 5). From the main checkout:

```
W=$(tools/cloud-brain/worktree.sh out-<name>)      # prints the path: .claude/worktrees/bm-out-<name>, branch bm/out-<name>, at origin/main
# edit in "$W", `git -C "$W" add <file>` each file by its name, `git -C "$W" commit`
LOCK_TOKEN=out-xxxxxx tools/cloud-brain/lock.sh take land out-<name>
tools/cloud-brain/worktree.sh --rebase out-<name>
git -C "$W" push origin HEAD:main
LOCK_TOKEN=out-xxxxxx tools/cloud-brain/lock.sh release land out-<name>
tools/cloud-brain/worktree.sh --remove out-<name>
```

  The issue loop lists a `bm-out-*` worktree and leaves it (`SKILL.md`, step 1: "`orch-*`, `over-*`
  and `out-*` are of no issue and are left"), so the last line is the session's own. Never
  `git commit -a` or `git add -A` there: `lopebooks`, `lopecode` and `lopecode-plugin` are links in
  a worktree, and the commit would record them. Run 2026-10-12 21:18 CEST by the writer of this
  item, an agent of the loop, with the name `out-wt5-try`: the first line took its place in
  `worktree.sh --list` as `out-wt5-try clean changed=0 untracked=0 ahead=0 dev-changed=0 dev-ahead=0 occupant=- branch=bm/out-wt5-try head=1d545375`,
  and the last removed the directory and the branch, 20 s for the three. The four lines between
  were not run in an `out-` worktree or with an `out-` token; the same four, with an `impl-` token,
  landed this item from the worktree `bm-worktree-per-topic`
  (`tools/cloud-brain/records/wt-5-docs.md`). The spec asks this of the loop's agents and not of
  the owner's sessions: "This spec does not ask it of them: the main checkout is his."

A health check that takes ten seconds:

```
brain.ts curl /xrpc/com.lopecode.brain.lease.get --owner     # {"held":true}
brain.ts redistil | grep -c same                             # 20 on 2026-10-10 11:57 (18 on 2026-10-09)
brain.ts curl /xrpc/com.lopecode.brain.browser.all --owner   # browsers that cost money
brain.ts curl /xrpc/com.lopecode.brain.container.all --owner # containers that cost money
brain.ts curl /xrpc/com.lopecode.brain.quota.get --owner     # today's spend
```

## An answer that was cut, and a list that is not whole

An answer that is not all of what was asked for says so in one of two shapes (since 2026-10-12,
`plan/cloud-brain-answers-cut-and-not-said.md`). **A field**, in an answer a program reads: `more: true` beside
the list, and `total` where the service counts the matches. **A last line**, in a text a person or a model reads,
which says how much is shown, how long the whole is, and how the rest is read. An answer with neither is not known
to be whole: the two are in the places below and no others were looked at.

```
issue.list    { issues, total, more }       100 issues, 500 with limit=500, no second page: a narrower filter, or issue.snapshot
issue.sync    { seq, wait, events, more }   200 events, 500 with limit=500; the next page is after=<the seq of the last event>
tab-tests.ts, verify-run.ts                              … (cut: 400 of 1421 characters; --whole prints all)
a tool of the Brain's page, on a query                   [characters 0 to 20000 of 27094. The rest: the same call with offset 20000]
an entry of kind doc over 16,000 characters              [the first N of M characters of this entry's text. The whole is the file <file> in this Brain's brain-static: static.get?path=<file>]
```

- Run 2026-10-13 04:08 CEST with a tracker token, the record at 5675 events: `list?limit=100` answered 100 issues,
  `total` 460 and `more: true`; `list?limit=500` 460 and `more: false`; `sync?after=0` events 1 to 200 and
  `more: true`, and with `&limit=500` events 1 to 500 and `more: true`. `issue.queue` and `issue.runs` have a
  `more` too, by their rows of the reference (`tools/cloud-brain/brain-issues.ojs`); neither was called for this.
- The third line is what `tools/cloud-brain/cut.ts` made of a text of 1,421 characters cut at 400, the same day;
  `cloud-brain-dev/test.ts` has a copy of that function, with a value cut at 120 and an error at 600, by its source. The
  fourth is the line a test of `tools/cloud-brain/cloud-brain.ojs` expects of `callAnswer`, not one read in the page;
  for a procedure the same function ends the line `The rest is not read: a procedure called again would run a second time`.
- A cut doc's last line names its file, which is the whole ("The knowledge docs in the Brain's search", below).
  This page is such a doc: at 04:09 CEST that day its entry had the first 15727 of 26628 characters, by its last line.

## Why did that happen: the logs

`brain-x-logs` passes Cloudflare's log queries through, scoped to this Brain, owner's session only.
One read is not the owner's alone (since 2026-10-11): `logs.deploys?from=MS&to=MS` answers what the deployer
wrote about deploys (`at: "deploy.…"`) over a span, whole, with the test runs counted by Worker, hash and
failed test, and since 2026-10-12 `restores`, a row for each put-back with the next deploy of that Worker that stood. A token that names it reads it: `brain.ts curl "/xrpc/com.lopecode.brain.logs.deploys" --as loop-deploys`
(the last 24 hours; the token is made once with the owner's session, `brain.ts token loop-deploys logs.deploys`).
What its counts mean and do not is in `brain-logs.ojs`, "The deploys of a span": a member's line leaves without the member's DID and text, and `runs` is whole only for a span that starts at or after 2026-10-11 05:52:03 UTC (`from=1791697923049`).
The core writes one line a call with keys `at ray caller via origin delegation holder method worker status
error ms price rule by`. Three traps met on the first day:

- `method` is the short name (`bluesky.poll`), not the NSID. A filter on the NSID returns nothing.
- A `calculations` query with `groupBys`: set `limit` to 500. With 50 and more groups than that, a group of 19 calls was left out (2026-10-09).
- `ray` is the `cf-ray` without the part after the hyphen.
- Cloudflare stores the request's path and query string beside each line. Do not put a long-lived
  secret in a query string. Short-lived single-use codes are acceptable.

## The knowledge docs in the Brain's search

`knowledge/*.md`, `plan/cloud-brain-*.md`, the post mortems of the issue loop (`tools/cloud-brain/post-mortems/*.md`, since
2026-10-12, issue `pm-1-file-and-search`) and three files of `cloud-brain-dev` (`AGENTS.md`, `README.md`,
`philosophy.md`) are entries of kind `doc` in the Brain's knowledge base (`knowledge.search?semantic=true&kind=doc&q=`).
The first were entered 2026-10-10. The tool is `tools/cloud-brain/knowledge-docs.ts`; its header is the reference.
For a file of this repository an entry's id is `doc:` and the file's name in lower case with no `.md`, whatever its directory:
`doc:pm-second-summarizer-role` for `tools/cloud-brain/post-mortems/pm-second-summarizer-role.md`. The three of `cloud-brain-dev` are
`doc:cloud-brain-dev-agents`, `-readme` and `-philosophy`.

**The whole of a doc is a file the Brain keeps** (since 2026-10-12, issue `sd-1-doc-files`, task 1 of
`plan/cloud-brain-docs-summarised-for-search.md`). A put of a doc is two calls with `loop-docs`, the file first:

```
static.put?path=docs/<source>/<path>&public=<true|false>&tags=knowledge-doc     the file's bytes, as git has them
knowledge.put { …, file: "docs/<source>/<path>", sha256 }                        25 entries a call, after their files
```

- `<source>/<path>` is `lopecode-dev/<the path in this repository>` or `cloud-brain-dev/<FILE>.md`:
  `docs/lopecode-dev/knowledge/notebook-programming-concepts.md`, `docs/cloud-brain-dev/philosophy.md`.
- The file is public when the entry is (`in-notebook` in the frontmatter's scope), and `public` is sent on every put.
  Read with no token at 22:52:44 CEST that day: `https://cb4.endpointservices.workers.dev/static/docs/lopecode-dev/knowledge/notebook-programming-concepts.md`
  answered 200 with the bytes of `git show origin/main:knowledge/notebook-programming-concepts.md` (one SHA-256,
  `496ebd6e…`) and `access-control-allow-origin: *`; `…/static/docs/lopecode-dev/plan/cloud-brain-backlog.md` and
  `…/static/docs/cloud-brain-dev/philosophy.md`, both private, answered 401. A private file is read with
  `static.get?path=<file>` by a caller that may read it; not run, `loop-docs` does not name that method.
- An entry is `fresh` when it has the file's `sha256`, the same `public` and that `file`. A doc's line of `status`
  ends `file not kept` or `file differs` when the kept file has not the doc's `sha256` and `public`, and the last line
  has `files`, the docs whose file is right, and `filesWrong`, the names of the others. `status --check` does not
  fail for a wrong file. `put --stale` puts such a doc, fresh or not, and counts them in `filesWrong` of its last line.
- A doc over 16,000 characters is cut, and its last line names the file:
  `[the first N of M characters of this entry's text. The whole is the file <file> in this Brain's brain-static: static.get?path=<file>]`,
  with `, and /static/<file> at the Brain's address` before the bracket for a public doc. Until this change it named
  an address on `raw.githubusercontent.com`.
- Nothing is deleted: the token names no `static.delete`. A doc removed from the repository keeps its entry and its file.
- The prefix is `docs/` and not the `knowledge-docs/` of the spec: 53 docs had a file there already, put on
  2026-10-10 under a delegation of the owner's, which their entries named (`tools/cloud-brain/records/sd-1-doc-files.md`).
- All 89 docs were put this way by hand at 22:51:07 CEST, before the landing: 69.6 s for 89 files and 4 calls of
  `knowledge.put`, 2.1 MB. A copy of the tool from before this change puts a changed doc's entry and no file, and
  puts a cut doc with the older line; the next release by a copy that has the change puts both again.

**What enters a changed doc** (since 2026-10-11, `plan/cloud-brain-brain-docs-entered-by-hand.md`): the last
command of every landing, `LOCK_TOKEN=<token> tools/cloud-brain/lock.sh release land <who>`. With the lock gone it runs
`knowledge-docs.ts put --stale --limit=30` and prints one more line. The release is exit 0 whatever that line says.

```
docs (cb4): {"put":2,…}                     the tool's last line: what was entered
docs (cb4): nothing to put
docs (cb4): not entered (<why>)             the tool failed; the docs wait for the next landing
```

- The name in brackets is the Brain: `BRAIN_BASE`, and `cb4` when the caller's shell has none.
- The call is made with the token `loop-docs`, which the owner makes once:
  `BRAIN_BASE=cb4 bun tools/cloud-brain/brain.ts token loop-docs knowledge.put knowledge.list static.put static.list`
  (four methods since 2026-10-12, for the file of each doc: the orchestrating session revoked the token of two methods
  and made this one at 22:11:52 CEST on the owner's choice of one token over a second, comment 4775 of
  `sd-1-doc-files`; `brain.ts token` refuses a name that is kept). A token that does not name a method the tool calls
  is exit 2 with those two commands, as the tests have it; not seen on cb4. An agent does not
  make it and does not pass `--owner` to the tool. It was made 2026-10-11, by the orchestrating session on the owner's
  word (`bd-3-first-run-of-the-docs-step`, event 1952). The first put with it was a release's, not a put by hand:
  12 entries carry `at` 2026-10-11 20:48:28 CEST (`knowledge.list` with `loop-docs`), 9 of them new and 3 changed, after
  the landing of `49fa9983` (its writer gives the release as 20:48:26); `status --check` at 20:50:28 read 70 docs, 70 fresh, exit 0
  (`tools/cloud-brain/records/bd-3-first-run-of-the-docs-step.md`).
- With no `loop-docs` kept the tool exits 2 and the release prints, as it did at 20:05:34 that day with its lock and
  state in a temporary directory, in 1.2 s:
  `docs (cb4): not entered (no token "loop-docs" is kept. The owner makes it once: BRAIN_BASE=cb4 bun tools/cloud-brain/brain.ts token loop-docs knowledge.put knowledge.list)`.
  Since `sd-1-doc-files` the command in that line ends `knowledge.put knowledge.list static.put static.list`.
  The first line above was printed by cb4 at the release of 20:54:42 that day, for one changed doc:
  `docs (cb4): {"put":1,"public":0,"private":1,"entered":0,"changed":1,"vectors":1,"ms":1597,"source":"origin/main@bd71b157"}`,
  3.1 s for the release with its step. No release was seen to print the second (`nothing to put`): the tool printed it
  run by hand on cb4 at 20:50:20, and the stub of `tests/tools/lock.test.ts` prints a put line, `{"put":2,"entered":2}`.
- The source is `origin/main`, read with git. A file edited on disk and a commit not pushed are not seen, by
  `status` or by `put`.
- Not entered until the next landing of anyone: a commit pushed with no landing, and a push of `cloud-brain-dev` alone
  (its three files are read at the commit `lopecode-dev`'s `origin/main` records for the submodule).
- `LOCK_DOCS=0` before the release leaves the step out. The tests of `lock.sh` set it.

By hand:

```
BRAIN_BASE=cb4 bun tools/cloud-brain/knowledge-docs.ts status --check   # fresh / stale (and for how long) / missing / badname, one line a doc
BRAIN_BASE=cb4 bun tools/cloud-brain/knowledge-docs.ts put --stale      # what the release runs; $0.00005 a doc whose text changed
```

`put --stale` puts a doc that `status` reads `stale` or `missing`, one whose kept file is not the doc's (above), and since 2026-10-12 one whose line ends `, unmarked`:
a doc over 16,000 characters whose entry is fresh by its file's hash and does not end with the line that says it was cut
(`tools/cloud-brain/records/knowledge-docs-put-stale-skips-unmarked.md`). The last line of the put has `unmarked`, the docs
it put whose entry did not end with the line the tool now puts. A changed doc over 16,000 characters is counted there too,
its entry ending with the line of the older text: the release of 21:05:09 CEST that day put the two docs its landing
changed and printed `"put":2,…,"cut":2,"unmarked":2`.

Since `sd-2-one-summarizer` (2026-10-12, task 2 of `plan/cloud-brain-docs-summarised-for-search.md`) the tool knows a
summary in the entry of a doc over 16,000 characters. None was on cb4 when this was written: `status` there answered
`"long":48,"summarized":0` at 23:45 CEST, and the first are put by task 3 of that plan. (Task 3, `sd-3-pilot-ten`, put ten on
2026-10-13 with haiku and then with opus and put them back with `put --plain`: with either, the search by words no longer found
three and two of ten passages it found before; `tools/cloud-brain/records/sd-3-pilot-ten.md`. `sd-3b-first-paragraph-alone` put the same ten
again that day with `summarize --first-paragraph`, haiku, and put them back: the search by words found all ten passages at the ranks
of before, and the ten questions from past the kept text were not found better; `tools/cloud-brain/records/sd-3b-first-paragraph-alone.md`.
None is on cb4 since 06:17 CEST that day.) What changed in the two commands above:

- An entry that holds the line `Summary by summarizer (…)` is neither cut nor unmarked. A put of its doc keeps the
  text to the end of that line and makes the line after it and the doc's start anew. The last line of `put` counts
  such docs as `summarized`.
- `put --stale` leaves a long doc whose entry `knowledge.list` answered with no text, which until then it counted
  unmarked and put, and a doc that has a file `<name>.running` under ten minutes old in `.emitted/docs/` of the main
  checkout. Its last line names them, `noText` and `running`.
- The last line of `status` has `long`, `summarized`, `behind`, and by name `due` and `refused`.

The commands that came with it, each said in the header of `tools/cloud-brain/knowledge-docs.ts`:

```
BRAIN_BASE=cb4 bun tools/cloud-brain/knowledge-docs.ts summarize <name>… --dry        # one agent a doc (haiku); the summary to .emitted/docs/<name>.summary.txt, nothing put
BRAIN_BASE=cb4 bun tools/cloud-brain/knowledge-docs.ts summarize --due --usd-max 1    # every doc whose summary is due; puts each with loop-docs
BRAIN_BASE=cb4 bun tools/cloud-brain/knowledge-docs.ts summarize <name>… --first-paragraph   # the entry holds the summary's first paragraph and none of its five sections (2026-10-13)
BRAIN_BASE=cb4 bun tools/cloud-brain/knowledge-docs.ts status --check-summaries       # reads only; exit 1 on a summary not in its form, due for over 24 hours, or refused twice
BRAIN_BASE=cb4 bun tools/cloud-brain/knowledge-docs.ts put --plain <name>…            # a long doc as it is put with no summary: the way one is put back
```

`status --check` exits 0 when no doc is behind, 1 when one is, and 2 with the owner's command when no `loop-docs` is
kept. A tool that threw also exits 1 (seen with no `BRAIN_BASE`; a refused call throws the same way, not run): the
last line is then bun's and not the JSON. `badname` is a doc whose file name gives no id the service takes
(a space, a character outside ASCII, anything but `a-z 0-9 . _ : -` once in lower case): it is in no put until the file has another name. No doc of
`origin/main` was one on 2026-10-11 20:04 CEST (67 docs, `status --check --owner`).

## The summaries of the kept papers

Each kept paper with the tag `awesome-rsi` has, first in its entry's text, a summary written by one light agent of
the role `paper-summarizer`, and the entry's vector is made from the summary's first paragraph. (The role is named
`summarizer` since `sd-2-one-summarizer`, 2026-10-12, and takes a doc as well: its brief is `brain/roles/summarizer.md`,
`run` starts it with a task line `summarize a paper: …`, and a summary written from then on has the line
`Summary by summarizer (…)`. The 63 put before have `Summary by paper-summarizer (…)`, which `check` reads as before.)
(`plan/cloud-brain-paper-summarizer-persona.md`; the runs are `tools/cloud-brain/records/ps-3-pilot-ten.md` and
`ps-4-the-rest.md`). For papers entered later, or another tag, it is two commands and then the check, from the main
checkout or a worktree. The header of `tools/cloud-brain/summarize-papers.ts` is the reference.

```
BRAIN_BASE=cb4 bun tools/cloud-brain/summarize-papers.ts text  --tag TAG                # keeps each entry as entered (<id>.entry.json) and fetches each text; puts nothing
BRAIN_BASE=cb4 bun tools/cloud-brain/summarize-papers.ts run   --tag TAG --usd-max 50   # one agent a paper, one after another; puts each summary with loop-papers
BRAIN_BASE=cb4 bun tools/cloud-brain/summarize-papers.ts check --tag TAG                # reads only; exit 1 and the ids when an entry is not summarized
```

- `text` first: `run` skips and names an entry with no `<id>.entry.json`, since `restore --ids a,b` puts an entry back
  from that file and from nowhere else. The files are in `tools/cloud-brain/.emitted/papers/` of the main checkout,
  git-ignored, on this machine only.
- `run` is longer than an agent's turn and is started as a background command. It can be run again after it stopped
  or died: an entry whose summary is of the same text is skipped at no cost, and a paper refused twice for that text is
  not asked again without `--again`.
- `--usd-max N` starts no agent for a paper once the agents of that run have cost N dollars or more; the count is
  from 0 at each run. A put that is refused stops the run as well. Both are exit 1 with `stopped` in the last line.
- It needs `pdftotext` on the machine for a paper arXiv has no HTML page of, and the tokens `loop-knowledge` and
  `loop-papers`.
- What a run cost is `usd` of its lines in `.emitted/papers/journal.jsonl`; it goes on the task's issue as one `cost`
  event of the role `paper-summarizer` (`.claude/skills/brain-maintenance/SKILL.md`, step 5).
