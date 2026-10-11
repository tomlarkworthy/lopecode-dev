# ta-1-agent-token-command

## Part one, 2026-10-11: the commands, tested against a local stand-in. Nothing was made on cb4

Task 1 of `plan/cloud-brain-record-names-token-not-agent.md`, approved at event 1285. The code is
commit `3158d6d0` (written 2026-10-11 19:06:10 +0200 as `7943b8d5`, before the rebase onto `main`) (`git log --format='%h %ci'`). Local tools: no seed,
no Worker, no deploy.

**No child was made on cb4, and no parent.** The parent `loop-agents` is the owner's to make
(the spec, "What only the owner can do"), and `token … --delegate` is a write with his session,
which the loop does not send. With the worktree's `brain.ts` on the main checkout's state:

```
$ BRAIN_STATE_DIR=<root>/tools/cloud-brain/.emitted BRAIN_BASE=cb4 bun tools/cloud-brain/brain.ts agent-token list
no token "loop-agents" is kept. The owner makes it once: token loop-agents 'issue.*' --delegate
exit 1
```

That is the only run of the new commands against cb4's state, and it sends nothing. Everything
under "What the test holds" was seen against a stand-in written from `brain-core.ojs`
(`delegating`, `delegation.create`, `list`, `revoke`, `asSecret`), which is not the core.

### What changed

| Command | What it sends | What it keeps and prints |
|---|---|---|
| `brain.ts token NAME <method…> --delegate` | `delegation.create { name, holder: { secret: true }, scope, caps: ["delegate"] }` with the owner's session. `token.create` takes no caps (`brain-kernel.ojs` line 470) | the answer's `secret` in `.emitted/<base>-tokens.json`, mode 600; prints the name |
| `brain.ts agent-token <role> [what for]` | `delegation.create { name: "<role>-<6 hex>", holder: { secret: true }, scope: ["com.lopecode.brain.issue.*"], until: now + 48 h, note: "<role>; <what for>" }` with the parent's value | the `secret` in `.emitted/<base>-agent-tokens.json`, mode 600. stdout is the name alone, so `N=$(… agent-token impl <issue>)` reads it; a line for a person is on stderr |
| `brain.ts agent-token list` | `delegation.list` with the parent's value | a JSON line a child: `name`, `note`, `made`, `until`, `kept` (its value is in this checkout's file) |
| `brain.ts agent-token revoke NAME` | `delegation.list` to find the id, `delegation.revoke { id }`, then `GET issue.policy` with the child's value | `401: …` and exit 0, the entry gone. Another status: exit 1, the entry kept |
| `issue-as.sh NAME …` | as before | reads `cb4-issues-tokens.json`, then `cb4-agent-tokens.json`. A name in neither: exit 2, one line on stderr, nothing sent |
| `brain.ts curl <path> --as NAME` | as before | also takes a name of the agent tokens file |

The role is one of `orch impl rev spec over dig out`. Another word, or no parent kept, is exit 1
before any call.

Three things differ from the spec's sentence, each a choice of this task:

- **The read after a revoke is repeated.** The spec says "one read". The kernel docs say a token
  "ends within 5 s of `token.revoke`, the time a core instance remembers a row"
  (`brain-kernel.ojs` line 38), so a value used a moment before can answer 200 once more. The read
  is sent again a second apart until it answers 401, for 12 s; then it is exit 1. One read and
  exit 1 on a 200 was the alternative: it would fail the routine case, an orchestrator ending a
  token right after the agent's last call. How long cb4 takes was not measured.
- **The file is changed under a lock**, the directory `<base>-agent-tokens.json.lock`, held for the
  read and the write and for no call. Without it two agents making a token at once would each
  write the file they read, and one value would be lost. A lock older than 10 s is taken as left
  by a dead process. Two processes that both find such a lock at the same moment can both take
  it; not tried.
- **`agent-token revoke` of a name that is kept and no longer a row** (ended, or revoked from
  elsewhere) sends no revoke, reads 401 and removes the entry. So it is also how a stale entry goes.

`B()` in `brain.ts` reads `brainUrl` of the state file when it is `http://127.0.0.1:<port>`, as
`deployerUrl` already did for the deployer. Only the test writes it.

### What the test holds

`tests/tools/agent-token.test.ts` runs both tools as processes, `issue-as.sh` with the real curl
through a `curl` first on `PATH` that sends cb4's address to the stand-in.

```
$ git show dd4b4e48:tools/cloud-brain/brain.ts > <tmp>/brain.ts; git show dd4b4e48:tools/cloud-brain/issue-as.sh > <tmp>/issue-as.sh
$ cd <worktree> && BRAIN_TS=<tmp>/brain.ts ISSUE_AS_SH=<tmp>/issue-as.sh bun test ./tests/tools/agent-token.test.ts
 1 pass
 15 fail                                   # the two tools as of dd4b4e48, the commit before the landing
$ bun test ./tests/tools/agent-token.test.ts
 16 pass
 0 fail
 126 expect() calls                        # commit 3158d6d0
$ bun test ./tests/tools
 217 pass
 0 fail
Ran 217 tests across 25 files.            # on main at 0894760e; 211 across 24 before ta-2's test file came in
```

The one that passes before is `issue-as.sh` with no agent tokens file: the old behaviour, kept.
Most of the 15 fail before on the first call, because main's `brain.ts` has no `brainUrl` and no
`agent-token`; they do not each show a separate defect.

By name: the request of `--delegate` and of a child (bearer, scope, note, `until` within 48 h, no
caps); the secret in no output; mode 600 after a create and after a revoke; seven roles; eight
made at once all kept; a 403 of the core is exit 1 with nothing kept; revoke is 401, exit 0, then
`issue-as.sh` exit 2 with no call; a remembered secret is read 3 times; one that never ends is
exit 1 with the entry kept; `loop-agents` is not revoked by `agent-token revoke`; `token revoke`
of the parent ends a child.

### Not tried

- Anything on cb4: `--delegate` with the owner's session, a child, `issue.get` with it, `list`,
  `revoke`, the 401, and the two R6 checks (16 events). Part two, after the owner's act.
- That `issue.policy` answers 200 to a token for `issue.*`, and 401 (not 403) after a revoke. The
  stand-in says so because the spec read it from `brain-core.ojs` line 314.
- That `token revoke loop-agents` ends the parent on cb4. It calls the kernel's `token.revoke`
  by name; the kernel docs say `token.list` shows such a token as `delegate: true`.
- After the parent is revoked or made again, the entries of its children stay in the file and
  `agent-token revoke` cannot be used to clear them one by one unless a parent is kept. Their
  values answer 401. No command clears the file.
- `issue-as.sh` still names cb4 and its two files; `<base>` in the spec is cb4 there.
- The briefs, the docs and `issue-stats.ts` are tasks 2 to 5. No brief names the new command yet.

## Round 2, 2026-10-11: a lock left behind that cannot be removed

Review 1420 (`changes`, one finding). In `changeAgentTokens` the branch for a lock older than 10 s
was `try { rmdirSync(lock); } catch {} continue;`, which passed over both the limit of 400 tries
and the sleep. With a file in the lock directory the `rmdir` fails each time, so `agent-token <role>`
went round with no end, after `delegation.create` had been sent: a child on the Brain, not kept and
not revoked. Nothing of the tools writes into the directory, so the reviewer made the case by hand.

The same case as a test, before the fix (the test kills a run at 20 s):

```
$ bun test ./tests/tools/agent-token.test.ts
(fail) agent-token: a lock left behind that cannot be removed is exit 1, and the child that was made is revoked and not kept [20024.96ms]
(fail) brain.ts curl --as a name that is not kept names both ways to make one [18.65ms]
 17 pass
 2 fail
```

After: the limit is counted on every try, a removed stale lock goes on to the sleep and the next
`mkdir`, and an `rmdir` that fails with anything but `ENOENT` is an error at once. The create's
`catch` then revokes the child and prints `"<name>" was made and could not be kept (<lock> was left
more than 10 s ago and cannot be removed (ENOTEMPTY)); it is revoked`, exit 1. The lock is left as
it was found: what wrote into it is not known to the tool.

```
$ bun test ./tests/tools/agent-token.test.ts
 19 pass
 0 fail
 143 expect() calls
$ bun test ./tests/tools
 220 pass
 0 fail
Ran 220 tests across 25 files.            # in the worktree before its rebase at the landing: this round's change without ta-4's test file. No commit of main is that tree
 224 pass
 0 fail
Ran 224 tests across 26 files.            # on main at aaeb1fff, the landed commit: ta-4's test file (4 tests) came in with the rebase
```

Part one's sentence "A lock older than 10 s is taken as left by a dead process" holds for an empty
one, and a second new test holds that (taken in under 5 s, the child kept).

The review's second note, taken: `brain.ts curl <path> --as NAME` for a name that is not kept
now ends `…, or for an agent's tracker calls: agent-token <role>`. The third new test.

Not tried in this round: a lock held by a live process for longer than 400 tries (about 10 s),
which ends the same way through `is held`; an `rmdir` refused for another reason than a file in
the directory (permissions). Nothing on cb4, as before.

## Round 3, 2026-10-11: the count of round 2 says where it was taken; a revoke that meets the same lock

Review 1456 (`changes`, one finding, in this record). Round 2 gave `bun test ./tests/tools` as 220
in 25 files and named no tree. It was the worktree before the rebase that brought in
`reviewer-brief-names-token.test.ts` (4 tests, `bbe69435`), and no commit of `main` gives it. The
block above now has both counts and says which is which. The sha the worktree stood on was not
written down in round 2 and is not given.

The review's note, taken: `agent-token revoke NAME` with a lock that cannot be removed sent the
revoke, read 401, and then ended in a stack trace of `brain.ts`. It now ends in one line, exit 1,
the entry kept: `"<name>" is revoked and its value is refused (401), and its entry could not be
removed (<why>). When that is mended: agent-token revoke <name>`. Run again with the lock gone it
is exit 0 with no second revoke sent.

```
$ bun test ./tests/tools/agent-token.test.ts      # the new test, brain.ts as of aaeb1fff
(fail) agent-token revoke: a lock that cannot be removed is exit 1 with one line and the entry kept; again with the lock gone removes it
 19 pass
 1 fail
$ bun test ./tests/tools/agent-token.test.ts      # with the change
 20 pass
 0 fail
 153 expect() calls
```

The count of the whole directory at the landed commit is in the issue's comment of this round, not
here: it is run after the landing, and this file is landed with the change.

Not tried: the create's own revoke is not read ("it is revoked" is printed whatever it answered,
review 1456); nothing on cb4.
