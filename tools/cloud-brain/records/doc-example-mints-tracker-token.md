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
- The test reads two directories. `tools/cloud-brain/*.md`, `tools/cloud-brain/records/*.md` and
  `cloud-brain-dev/*.md` are not read by it. Two lines there match its pattern, both in
  `tools/cloud-brain/spec-as-built.md` and both history of `owner-session-file-is-present`: line
  5041 (the old line, unquoted) and line 5077 (a "Not tried"). This record's own lines 7 and 38
  match too. `cloud-brain-dev/*.md` has none (corrected 2026-10-10 in round 2, below).
- The copy of this doc in a notebook wiki: its scope is `local-development`, so `sync-wiki.ts` does not ship it.

## Round 2, 2026-10-10 23:29 CEST

Review 1 (event 351, `changes`) had two findings. The doc change was found right and is as it was.

1. **The test threw where `cloud-brain-dev/` is not checked out.**
   `.claude/skills/brain-maintenance/philosophy.md` is a link to `../../../cloud-brain-dev/philosophy.md`.
   `readdirSync` lists it as a `.md` and `readFileSync` throws on it. `md()` now leaves out a name
   that `existsSync` does not find (it follows the link). A third test makes a directory with one
   file and one link to nothing and expects the file alone. In the worktree, `cd tests/tools && bun test doc-token-example.test.ts`:

   ```
   third test added, md() as it was   2 pass 1 fail   Received + "philosophy.md"
   with existsSync                    3 pass 0 fail, 8 expect() calls
   ```

   The reviewer's case, a `git worktree add --detach` of the branch with `cloud-brain-dev/` empty
   (`ls cloud-brain-dev | wc -l`: 0):

   ```
   the test of f24f5836    1 pass 1 fail   ENOENT … .claude/skills/brain-maintenance/philosophy.md
   this round's test       3 pass 0 fail, 8 expect() calls
   ```

   There the test reads one doc fewer. `philosophy.md` has no token line (grep, with the submodule present).

2. **This record said a grep of `tools/cloud-brain/*.md` found no such line.** It was wrong:
   `grep -n "brain\.ts token [a-z-]* .*issue\." tools/cloud-brain/*.md tools/cloud-brain/records/*.md cloud-brain-dev/*.md`
   gives `spec-as-built.md` lines 5041 and 5077 and this record's lines 7 and 38.
   `records/owner-session-file-is-present.md` names `'issue.*'` (lines 59, 63) without the command,
   so the first round's "quote the old line" was wrong of it too. The bullet above is corrected.

Not tried in round 2: the reviewer's four lines the pattern does not catch (`'*'`, two spaces
after `brain.ts`, a line continued with a backslash, `token.create` sent with `curl --owner`);
they were not held against the change and the pattern is as it was. A link to a directory of
docs is not followed (`isDirectory()` is false for a link); neither directory has one.
