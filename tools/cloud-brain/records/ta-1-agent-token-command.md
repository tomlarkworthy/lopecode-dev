# ta-1-agent-token-command

## Part one, 2026-10-11: the commands, tested against a local stand-in. Nothing was made on cb4

Task 1 of `plan/cloud-brain-record-names-token-not-agent.md`, approved at event 1285. The code is
commit `7943b8d5`, 2026-10-11 19:06:10 +0200 (`git log --format='%h %ci'`). Local tools: no seed,
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
$ cd <worktree> && BRAIN_TS=<root>/tools/cloud-brain/brain.ts ISSUE_AS_SH=<root>/tools/cloud-brain/issue-as.sh bun test ./tests/tools/agent-token.test.ts
 1 pass
 15 fail                                   # main's copies, before
$ bun test ./tests/tools/agent-token.test.ts
 16 pass
 0 fail
 126 expect() calls                        # commit 7943b8d5
$ bun test ./tests/tools
 211 pass
 0 fail
Ran 211 tests across 24 files.
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
