---
scope: [local-development]
topics: Cloud Brain; cb4; brain.ts curl; the state file; a token for an agent; no --owner writes; the health check; brain-x-logs; knowledge-docs.ts; what enters a doc into the Brain's search (lock.sh release land, loop-docs)
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
`--as` also reads `.emitted/<base>-issues-tokens.json`, where the tokens of the issue loop are.

**No token of your own for the tracker.** Until 2026-10-10 the example above made a token for
`'issue.*'`. Each token is a delegation of its own, and the tracker takes each as another actor:
on issue `doc-example-mints-tracker-token` event 234 is `via delegation:84cd2100b161` (holder
`secret:issues-reviewer-2`) and event 236 `via delegation:b6559fa96c36` (holder
`secret:issues-implementer-2`). The workflow's guard for a pass is
`r.verdict == "pass" && r.actor != issue.by.start` (`tools/cloud-brain/brain-issues.ojs`), and
between two tokens one agent made that keeps nothing apart. An agent of the
issue loop writes to the tracker with its role's token through `tools/cloud-brain/issue-as.sh`
(`.claude/skills/brain-maintenance/rules.md`, "Which token") and makes no other. This is an
agreement: `token.create` does not refuse `issue.*` to a caller that holds one, which would be a
change to the kernel and is the owner's (the triage of that issue, event 236).

**An issue the owner asked for.** A session that opens an issue on the owner's word puts `owner`
in the `labels` of the open (`"labels":["owner"]` in the JSON of `issue-as.sh <token> open`), since
2026-10-11. The issue loop takes such an issue as the owner's, and its watch prints the open
whatever token made it (`.claude/skills/brain-maintenance/SKILL.md`, step 3, "The owner's"). The
label gives precedence and no authority. An issue he opens himself in the page needs none.

A health check that takes ten seconds:

```
brain.ts curl /xrpc/com.lopecode.brain.lease.get --owner     # {"held":true}
brain.ts redistil | grep -c same                             # 20 on 2026-10-10 11:57 (18 on 2026-10-09)
brain.ts curl /xrpc/com.lopecode.brain.browser.all --owner   # browsers that cost money
brain.ts curl /xrpc/com.lopecode.brain.container.all --owner # containers that cost money
brain.ts curl /xrpc/com.lopecode.brain.quota.get --owner     # today's spend
```

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

`knowledge/*.md`, `plan/cloud-brain-*.md` and three files of `cloud-brain-dev` (`AGENTS.md`, `README.md`,
`philosophy.md`) are entries of kind `doc` in the Brain's knowledge base (`knowledge.search?semantic=true&kind=doc&q=`).
The first were entered 2026-10-10. The tool is `tools/cloud-brain/knowledge-docs.ts`; its header is the reference.

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
  `BRAIN_BASE=cb4 bun tools/cloud-brain/brain.ts token loop-docs knowledge.put knowledge.list`. An agent does not
  make it and does not pass `--owner` to the tool. It was made 2026-10-11, by the orchestrating session on the owner's
  word (`bd-3-first-run-of-the-docs-step`, event 1952). The first put with it was a release's, not a put by hand:
  12 entries carry `at` 2026-10-11 20:48:28 CEST (`knowledge.list` with `loop-docs`), 9 of them new and 3 changed, after
  the landing of `49fa9983` (its writer gives the release as 20:48:26); `status --check` at 20:50:28 read 70 docs, 70 fresh, exit 0
  (`tools/cloud-brain/records/bd-3-first-run-of-the-docs-step.md`).
- With no `loop-docs` kept the tool exits 2 and the release prints, as it did at 20:05:34 that day with its lock and
  state in a temporary directory, in 1.2 s:
  `docs (cb4): not entered (no token "loop-docs" is kept. The owner makes it once: BRAIN_BASE=cb4 bun tools/cloud-brain/brain.ts token loop-docs knowledge.put knowledge.list)`.
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

`status --check` exits 0 when no doc is behind, 1 when one is, and 2 with the owner's command when no `loop-docs` is
kept. A tool that threw also exits 1 (seen with no `BRAIN_BASE`; a refused call throws the same way, not run): the
last line is then bun's and not the JSON. `badname` is a doc whose file name gives no id the service takes
(a space, a character outside ASCII, anything but `a-z 0-9 . _ : -` once in lower case): it is in no put until the file has another name. No doc of
`origin/main` was one on 2026-10-11 20:04 CEST (67 docs, `status --check --owner`).

## The summaries of the kept papers

Each kept paper with the tag `awesome-rsi` has, first in its entry's text, a summary written by one light agent of
the role `paper-summarizer`, and the entry's vector is made from the summary's first paragraph
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
