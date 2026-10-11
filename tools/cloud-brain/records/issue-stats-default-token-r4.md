# issue-stats-default-token-r4

2026-10-11. A quick win of the writer of `ta-3-orchestrator-steps`: the issue's triage (event 1364)
says "it goes with ta-3". One change in a local tool. No seed, no deploy.

## What was wrong

`tools/cloud-brain/issue-stats.ts` named `issues-overseer-1` twice: in its usage line and as the
default of `--token`. The check of R4 in `plan/cloud-brain-record-names-token-not-agent.md` greps
this file for the three role tokens, and no task of the spec changes it. After the owner's revoke
of those tokens a run with no `--token` would have asked `issue-as.sh` for a name cb4 refuses.

## What changed

`--token` has no default. With none, or with another flag where its value should be, the tool
prints its usage on stderr and exits 2 before any call:

```
$ bun tools/cloud-brain/issue-stats.ts; echo "exit $?"
issue-stats.ts: no --token; nothing was sent
  bun tools/cloud-brain/issue-stats.ts --token NAME [--after SEQ] [--until SEQ] [--window SEQ] [--idle HOURS] [--json]
  NAME is your own token, the one your prompt names (a name issue-as.sh keeps)
exit 2
```

The two briefs that run it pass `--token=` already (`agents/overseer.md`, `agents/spec.md`); no
other file of `tools/cloud-brain/`, `.claude/skills/`, `knowledge/` or `tests/tools/` runs it
(`grep -rn "issue-stats.ts"` over those, records and `oversight.md` left out).

## The test

One test added to `tests/tools/issue-stats.test.ts`: the source has no role token's name, and the
tool run as a process with `[]`, `--json`, `--token` and `--token --json` is exit 2 with an empty
stdout and the usage on stderr.

```
$ git show HEAD~1:tools/cloud-brain/issue-stats.ts > <scratch>/tools/cloud-brain/issue-stats.ts   # the tool before, issue-as.sh beside it
$ ISSUE_STATS_TS=<scratch>/tools/cloud-brain/issue-stats.ts bun test ./tests/tools/issue-stats.test.ts
 16 pass
 1 fail
$ bun test ./tests/tools/issue-stats.test.ts
 17 pass
 0 fail
 69 expect() calls
$ bun test ./tests/tools                       # after the rebase onto main at a3124e62
 362 pass
 0 fail
Ran 362 tests across 39 files.
```

The copy of the tool before the change was run in a scratch directory with no tokens beside it, so
its failing run sent nothing either: it failed on the source's two lines.

## Not tried

- The tool with `--token=<an agent's token>` after this change, from the main checkout: run once
  before it, with `impl-f7643c` (`records/ta-3-orchestrator-steps.md`, "Tried on cb4"). The change
  is in what happens with no token.
- `tools/cloud-brain/lock.sh` has the same kind of default (`LOCK_TOKEN`, lines 17 and 52). It is
  not changed here: a writer started before the briefs changed calls `lock.sh` with no `LOCK_TOKEN`.
  It is the issue `lock-sh-default-token-r4`.
