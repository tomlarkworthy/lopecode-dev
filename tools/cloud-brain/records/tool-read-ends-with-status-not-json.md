# tool-read-ends-with-status-not-json

## Round 1, 2026-10-11: the HTTP status of `issue-as.sh` and `brain.ts curl` goes to stderr

Both tools called curl with `-w ' [%{http_code}]\n'`, so stdout was the body and then the status:

```
{"seq":602,"wait":5000,"events":[]} [200]
```

A read piped to a parser failed: `json.load` gave "Extra data: line 1 column 144334" on
`issue-as.sh issues-overseer-1 "sync?after=533"` (the issue, event 604, which names two more reports
in the journal). Triage took the smaller side by line 2 of `philosophy.md` (event 617): the status
moves to stderr, no flag. The code is commit `1dc3ea5d`, 2026-10-11 14:31:46 +0200
(`git log --format='%h %ci'`). Local tools: no seed, no Worker, no deploy.

### What changed

`-w '%{stderr} [%{http_code}]\n'` in `tools/cloud-brain/issue-as.sh` (both calls) and in the `curl`
command of `tools/cloud-brain/brain.ts`. `%{stderr}` is curl 7.63 or later; this machine has
`curl 8.7.1` (`curl --version`). With the worktree's `brain.ts` against cb4, the token
`issues-implementer-2`, stderr to a file:

```
brain.ts curl "/xrpc/com.lopecode.brain.issue.get?id=…" --as issues-implementer-2 2>status | python3 -c 'json.load(sys.stdin)…'
json ok, state in-progress
od -c status:   [   2   0   0   ]  \n
```

What a caller sees:

| Reads | Before | After |
|---|---|---|
| a terminal, or `2>&1` | body, ` [200]`, newline | the same |
| stdout alone (a pipe, `> file`, `$(…)`) | body, ` [200]`, newline | the body, with no newline added |
| stderr alone | curl's own errors | curl's own errors, then ` [200]` and a newline, last |

`2>&1` was read three times on `https://example.com` with the same `-w`: the body came first each
time. The test below holds it for `issue-as.sh` (`{"error":"Forbidden"} [403]\n`).

### Callers that read the status from stdout

`grep -rnE 'issue-as\.sh|brain\.ts.{0,40}curl|"curl"'` over `tools tests .claude scripts
cloud-brain-dev` found five scripts that spawn `brain.ts curl` and match ` [NNN]` at the end of its
stdout. Unchanged, each would have failed in its own way:

| Script | With the status gone from stdout | Now |
|---|---|---|
| `knowledge-docs.ts`, `call` | throws on every call | status from `r.stderr`, body is stdout |
| `knowledge-eval/knowledge-eval.ts`, `brainOnce` | status 0, so `brain` sends each call 4 times | status from stderr, piped explicitly |
| `digests/keep.ts`, `put` | every put answers `{ error }` | status from `r.stderr`; the `knowledge.put` line prints it too |
| `library-backfill.ts` | each row logged with status 0 | status from stderr, and cut from the row's `message` |
| `library-homes.ts`, `brain` | status 0 | status from stderr |

Two more read the body only. `issue-stats.ts` cut the output from the first `{` to the last `}`; it
now parses it whole, and pipes the child's stderr so a run does not print ` [200]` a page.
`merge-live.py` cuts a saved file at the last `}` and is left: it reads files saved before today too.

No brief of `.claude/skills/brain-maintenance/` shows ` [200]` after an answer in an example
(`grep -rnE '\[(200|201|400|401|403|404|409|500)\]'`: the two hits there are lines of `oversight.md`,
a journal of what was met). `spec-as-built.md` lines 4847 to 5062 quote output of 2026-10-10 and
are left as they were printed. The header of each tool and the `curl` row of
`knowledge/working-with-cloud-brain-remote-lopecode-cluster.md` now say where the status is.

### Tests

`tests/tools/tool-status-stderr.test.ts`, new, 5 tests. Each runs the tool with the real curl against
a local server: `brain.ts curl` by its address, `issue-as.sh` through a `curl` first on `PATH` that
swaps the address and passes every other argument, so the script's own `-w` is the one that runs.
Read, write, a 403, and `2>&1`.

Two older tests could not see the change and were made to. `brain-cli.test.ts` joined stdout and
stderr before looking for `ok [200]`, which holds on both sides of the change; it now reads each
alone. The fake curl of `issue-as-time-check.test.ts` printed ` [200]` to stdout whatever it was
given; it now puts the status where its `-w` says.

Against the tools of `main` before the change, from the worktree:

```
BRAIN_TS=<root>/tools/cloud-brain/brain.ts ISSUE_AS_SH=<root>/tools/cloud-brain/issue-as.sh \
  bun test ./tests/tools/tool-status-stderr.test.ts ./tests/tools/brain-cli.test.ts ./tests/tools/issue-as-time-check.test.ts
21 pass, 7 fail      (the 5 new, and one of each older file; 6 of the 7 are "JSON Parse error")
```

With the change, same three files with no variables: 28 pass, 0 fail. The whole directory,
`bun test ./tests/tools` in the worktree: 109 pass, 0 fail, 13 files.

### Not tried

- `library-backfill.ts`, `library-homes.ts`, `digests/keep.ts` and `knowledge-eval.ts` were not run:
  each writes to cb4 with the owner's session or spends on searches. They were built with
  `bun build <file> --target=bun` (no error) and read. No test loads them.
- `knowledge-docs.ts status`, a read, was run from the worktree against cb4 and answered
  `{"docs":55,"fresh":51,"stale":3,"missing":1,…}`. Its `put` was not run.
- A curl older than 7.63 prints `%{stderr}` as text on stdout. Not tried; no such machine is in use.
- A caller in zsh that writes `2>&1 >/dev/null | …` to read the status alone gets the body too:
  zsh sends stdout to both places. Seen while probing; `2>&1 >/dev/null` is not a way to read stderr
  there. `2>file` is.
- Agents' habits. A brief or a session that cuts ` [200]` with `sed` or a slice still works on a body
  with nothing to cut. One that reads the status with `tail -c 6` of stdout does not; none was found
  in the briefs.
