# lock-sh-default-token-r4

2026-10-12. One change in a local tool, `tools/cloud-brain/lock.sh`, with its test file. No seed, no deploy.

## What was wrong

`lock.sh` made a call with no `LOCK_TOKEN` as `issues-implementer-2`, one of the three role tokens the
owner is to revoke (`plan/cloud-brain-record-names-token-not-agent.md`). The check of R4 in that spec
greps `tools/cloud-brain/*.sh` for those names, and no task of the spec changes this file. Before the change, at
`main` e6cbcadf:

```
$ grep -n 'issues-\(implementer\|reviewer\|overseer\)-[0-9]' tools/cloud-brain/lock.sh
17:# LOCK_TOKEN=<name> before the command is the token the call is made as; issues-implementer-2 with none.
52:AS="${LOCK_TOKEN:-issues-implementer-2}"
$ env -u LOCK_TOKEN BRAIN_STATE_DIR=<an empty scratch directory> LOCK_BASE=http://127.0.0.1:9 bash tools/cloud-brain/lock.sh show land
lock.sh: no token named issues-implementer-2 is kept in <scratch>; nothing was sent
exit 2
```

The second command shows which name the script took; the state directory was empty so that nothing was
sent with it. The issue says that after the revoke such a call is refused by cb4 and is exit 2. That was
not run: the three tokens were not revoked when this was written, as far as this writer read, and a call
to cb4 with a role's token is not this writer's to make.

## What changed

`LOCK_TOKEN` has no default. With none, or with an empty one, the script prints one line and its usage on
stderr and exits 2. The check is after the command and the name are read and before the token file is
read, so nothing is sent:

```
$ env -u LOCK_TOKEN bash tools/cloud-brain/lock.sh show land
lock.sh: no LOCK_TOKEN; nothing was sent
lock.sh take land|cb4 <who> [--wait [seconds]]   take the landing lock (land) or the deploy lock (cb4) as <who>, for 600 s.
…
LOCK_TOKEN=<name> before the command is the token the call is made as, your own. It has no default: exit 2 with none.
exit 2
$ LOCK_TOKEN= bash tools/cloud-brain/lock.sh take land x
lock.sh: no LOCK_TOKEN; nothing was sent
…
exit 2
$ grep -n 'issues-\(implementer\|reviewer\|overseer\)-[0-9]' tools/cloud-brain/*.sh | wc -l
0
```

Line 17 of the header, the last line of the usage, says so. It is still one line: `usage()` prints lines 2
to 17. The comment above the check says "a role's token" and does not name one, as
`issue-stats.ts` does since `issue-stats-default-token-r4`, so R4's grep of the file prints nothing.

A command the script does not have still gets the usage alone (`env -u LOCK_TOKEN bash lock.sh steal land x`
prints the usage from its first line, with no "no LOCK_TOKEN" line): the command is checked first.

With a token the script does what it did. From the worktree's copy, on cb4, 2026-10-12 about 03:20 CEST:

```
$ LOCK_TOKEN=impl-70da49 bash tools/cloud-brain/lock.sh show land
land is not held
exit 1
$ LOCK_TOKEN=impl-70da49 bash tools/cloud-brain/lock.sh show cb4
cb4 is not held
exit 1
```

The landing of this change runs `main`'s copy for the take and the first renew and the changed copy from
the merge on. What each answered is in the comment on the issue, not here: this file was written before it.

## The test

`tests/tools/lock.test.ts`:

- The helper `fresh()` set `LOCK_TOKEN: undefined`, so most of its cases reached the default. It now sets
  `LOCK_TOKEN: "issues-implementer-2"`. That name and `issues-reviewer-2` are keys of the token file the
  test writes for its stand-in service (`TOKENS`, line 19), with the values `secret-impl` and `secret-rev`.
  No case sends them to cb4. R4 does not grep `tests/`.
- One test added, "with no LOCK_TOKEN, or an empty one, every command is exit 2 with the cause and the
  usage, and nothing is sent". It runs `take land a`,
  `take land a --wait 1`, `renew land a`, `release land a`, `show land` and `show cb4`, each with
  `LOCK_TOKEN` unset and with it empty: exit 2, empty stdout, the first line of stderr, the usage's first
  and last lines, and no call at the stand-in. Then the same take with a token is sent, a command the
  script does not have gets no "no LOCK_TOKEN" line, and the script has no role token's name in it.

```
$ LOCK_SH=<root>/tools/cloud-brain/lock.sh bun test ./tests/tools/lock.test.ts     # main's script, e6cbcadf, before the merge
error: take land a, unset
Expected: 2
Received: 0
(fail) with no LOCK_TOKEN, or an empty one, every command is exit 2 with the cause and the usage, and nothing is sent
 23 pass
 1 fail
$ bun test ./tests/tools/lock.test.ts                                              # the worktree's
 24 pass
 0 fail
 320 expect() calls
```

Against `main`'s script the new test stops at its first run: with `LOCK_TOKEN` unset, `take land a` is
exit 0, taken as the role's name, which the stand-in's token file has. The other 23 pass against it
because the helper's token is the one it defaulted to.

The whole directory, in the worktree, before anything was changed (at `main` 11be574c) and after the
rebase onto e6cbcadf with this record written:

```
$ bun test ./tests/tools          # before
 464 pass
 1 skip
 0 fail
Ran 465 tests across 50 files.
$ bun test ./tests/tools          # after
 465 pass
 1 skip
 0 fail
 2548 expect() calls
Ran 466 tests across 50 files.
```

## Lines elsewhere that the change made untrue

`git grep -n -F 'LOCK_TOKEN' -- knowledge 'plan/cloud-brain-*.md' .claude/skills/brain-maintenance 'tools/cloud-brain/*.md'`
printed 56 lines after these edits. Mended in this landing:

| File | Was | Now |
|---|---|---|
| `.claude/skills/brain-maintenance/agents/implementer.md`, step 10 | "with no `LOCK_TOKEN` the call is made with a role's token" | the script sends nothing, exit 2, with its usage |
| `.claude/skills/brain-maintenance/SKILL.md`, step 1 | "with none the call is made with a role's token (`lock.sh`, line 52)" | the same; and the `lock.sh show land` of the health check has `LOCK_TOKEN=<your token>` before it |
| `knowledge/changing-and-deploying-a-cloud-brain-worker.md`, step 4 | `lock.sh take cb4 <who>` and `release cb4 <who>` with no token | `LOCK_TOKEN=<token>` before each, and what happens with none |
| `knowledge/calling-a-cloud-brain-from-this-checkout.md` | `lock.sh release land <who>` with no token | `LOCK_TOKEN=<token>` before it |
| `plan/cloud-brain-locks-held-in-the-cluster.md`, "`issues-implementer-2` when unset" | the approved sentence | kept, with an "(As built, …)" note |

Both knowledge pages are `scope: [local-development]`, so no notebook's wiki copy changes.

Not mended, because `rules.md` is the owner's: its lines 82 and 87 write `lock.sh take land <who>`,
`lock.sh release land <who>`, `lock.sh take cb4 <who>` and `lock.sh release cb4 <who>` with no
`LOCK_TOKEN`. As commands they are now exit 2. The line and its mend are in the comment on the issue,
for the overseer. Records and `oversight.md` keep their lines: they say what was run then.

## Not tried

- A session or an agent that read its brief before `ta-3-orchestrator-steps` (2026-10-11) and still calls
  `lock.sh` with no `LOCK_TOKEN`. The issue held the change back for that case. Whether one was running at
  the merge was not read; what was read is that neither lock was held at about 03:20 CEST (the lines
  above). Such a caller now gets exit 2 and the line that says why.
- A call with no `LOCK_TOKEN` after the owner's revoke, on the script before the change: the 401 the issue
  describes. Not reproduced, as said above.
- `LOCK_TOKEN` of spaces alone (`LOCK_TOKEN=" "`): it is not empty, so the script goes on to the token
  file and ends `no token named   is kept in …; nothing was sent`, exit 2. Run once; no test holds it.
- The reviewer's brief on the Brain (`cloud-brain-dev/roles/`): `git -C cloud-brain-dev grep -n 'lock\.sh' | grep -v 'LOCK_TOKEN='`
  printed nothing in the main checkout's copy. The copy on cb4 was not fetched.
- The docs step of `release land` with no token: the release ends before it.
