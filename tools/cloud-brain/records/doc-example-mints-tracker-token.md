# doc-example-mints-tracker-token

Issue opened by the reviewer of `owner-session-file-is-present` (event 234, 2026-10-10). The
token example in `knowledge/working-with-cloud-brain-remote-lopecode-cluster.md` was

```
brain.ts token my-task 'issue.*' knowledge.search
brain.ts curl /xrpc/com.lopecode.brain.issue.list --as my-task
```

An agent that followed it held a second token for the tracker. The tracker tells actors apart by
delegation (events 234 and 236 of this issue: `delegation:84cd2100b161` for the reviewer's token,
`delegation:b6559fa96c36` for the implementer's), and the guard for a pass is
`r.actor != issue.by.start` (`brain-issues.ojs`), so the agent could start an issue with one token
and pass it with the other. `rules.md` already says a role's token and no other.

## What changed

- The example makes a token for `quota.get knowledge.search` and calls `quota.get` with it. The
  paragraph under it already records a run with a token for `quota.get` (cb4, 2026-10-10 19:21),
  so the example now shows a call that was made. Both lines changed: with the old second line the
  token would not name `issue.list`, and that paragraph shows such a call answers 403.
- The zsh note on the old line (a bare `issue.*` stops with "no matches found") is kept as a
  sentence about a prefix, with `'browser.*'` (the prefix the kernel's own reference uses).
- A paragraph, "No token of your own for the tracker", with the two events above, the guard, and
  where the role's token is used.

Triage took the doc side (event 236). The other side, `token.create` refusing `issue.*` to a
caller that holds one, is a kernel change and the owner's. Nothing enforces the paragraph.

## Test

`tests/tools/doc-token-example.test.ts`, new: no line of `knowledge/**/*.md` or
`.claude/skills/brain-maintenance/**/*.md` is a `brain.ts token NAME …` that names an `issue.`
method (text after a `#` is not read). Run in the worktree, `cd tests/tools && bun test doc-token-example.test.ts`:

```
before the edit   1 pass 1 fail   knowledge/working-with-cloud-brain-remote-lopecode-cluster.md:114: brain.ts token my-task 'issue.*' knowledge.search …
after             2 pass 0 fail, 7 expect() calls
```

`bash scripts/check-learnings-triggers.sh` after the edit: `0 error(s)`.

## Not done, not tried

- No call to cb4. `brain.ts token my-task quota.get knowledge.search` was not run (a write with
  the owner's session); the 19:21 run it rests on was another session's, with `quota.get` alone.
- A prefix through `brain.ts token` (`'browser.*'`) has not been run by anyone; that it is taken
  is read from the kernel's reference ("Lists of methods", `brain-kernel.ojs`).
- `knowledge-docs.ts put --stale` was not run, so the Brain's search has the doc's old text until
  someone does. It uses the owner's session.
- The test reads two directories. `spec-as-built.md` and `records/owner-session-file-is-present.md`
  quote the old line as history and are not read by it. `cloud-brain-dev/*.md` and
  `tools/cloud-brain/*.md` are not read; a grep of them on 2026-10-10 found no such line.
- The copy of this doc in a notebook wiki: its scope is `local-development`, so `sync-wiki.ts` does not ship it.
