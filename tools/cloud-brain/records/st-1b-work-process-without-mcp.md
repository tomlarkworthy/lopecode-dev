# st-1b-work-process-without-mcp: a role started with `WORK` has no MCP server

2026-10-13. A local tool of the repository `cloud-brain-dev`, its README, the spec's part 1 and the
tests. No seed, no deploy. Nothing of the issue loop starts an agent with `WORK` yet (`st-2` is the
first that will).

Every run below was made on one laptop (macOS, `claude` 2.1.296, config directory
`~/.claude-personal`), from Bash calls of the writer of this issue, which is itself an `Agent` of a
`claude` session in its sandbox. `$W` is the worktree `…/.claude/worktrees/bm-st-1b-no-mcp`.

## What was wrong

`WORK=DIR agent.sh ROLE "prompt"` started `claude -p` with `--permission-mode bypassPermissions` and
without `--strict-mcp-config`. Such a process had each MCP server of the user's and the project's
settings, and no call of one asked anybody. The approved spec
(`plan/cloud-brain-orchestrator-as-steps.md`, design part 1) says of such a process: "What an
`Agent` call has that such a process has not: the session's MCP servers."

Seen again here before the change, with the `agent.sh` of `cloud-brain-dev` 1d80684 (`git show
HEAD:agent.sh`), haiku, `WORK=$W`, the prompt "Answer OK and nothing else.", started 06:16:14 CEST:

```
toolset 119: 26 of claude, 93 MCP (mempalace 44, lopecode 30, claude_ai_Google_Drive 11, claude_ai_Claude_Docs 8)
mode bypassPermissions    context 51,067
```

## What changed

| File | Change |
|---|---|
| `cloud-brain-dev/agent.sh` | with `WORK`, `--strict-mcp-config` is no longer taken off; the header |
| `cloud-brain-dev/README.md` | "A light agent for one role": what a `WORK` process has, what was measured |
| `plan/cloud-brain-orchestrator-as-steps.md` | part 1, the `WORK` item: "As built", four lines after its sentence |
| `tests/tools/light-agent.test.ts` | 2 new tests, 3 changed |

The change to the script is one word of one line: `STRICT=()` is gone from what `WORK` sets. The
arguments `DRY=1 WORK=$W agent.sh implementer "Issue: x"` prints after the prompt:

```
before   --model opus --permission-mode bypassPermissions --output-format stream-json --verbose
after    --model opus --strict-mcp-config --permission-mode bypassPermissions --output-format stream-json --verbose
```

`DRY=1 WORK=$W agent.sh --resume <uuid> "more"` prints the same after `--resume <uuid>`. No
`--mcp-config` is given, so the flag leaves no server: it is how the light agent has had none since
2026-10-11. The permission mode is not changed. `TAB=1` with `WORK` is refused as before, and a
reviewer started with `TAB=1` and no `WORK` has the one server `lopecode` as before (a test holds
both).

**No server is left in by name.** The issue: "If a role is found to need one of the servers, say
which and why". What was read for it:

- `git grep -n -c -i -E 'qa_|mcp|palace' -- .claude/skills/brain-maintenance/agents` prints three
  files with one line each: `implementer.md`, `implementer/seed-tests.md` and `digest.md`. Each line
  says not to open a paired tab. The last two go on: "When you must look at the page itself (a
  screenshot, a click), open one, do that, and close it by name at once" (a writer of a seed), "When
  you must look at the page itself, open a tab, look, and close it by name at once" (a digest
  writer). That is `qa_open_notebook` of the server `lopecode`.
- The record of `st-1-agent-sh-any-role`: 0 MCP calls in 6,031 tool calls of the 116 writers of
  2026-10-12.

So two roles are allowed a tab by their brief for one case, and no writer of that day took it. A
writer or a digest writer started with `WORK` has no `qa_*` tool for that case. It was not left in:
the issue asks for none, `TAB` is the way `agent.sh` gives that server and the issue leaves it
refused with `WORK`, and those two lines hold today for every writer, which is an `Agent` of a
session. They stop holding for a role when a later task starts it as a process; see "For the tasks
after this one".

## The real starts

Two processes at once, 06:16:14 to 06:16:20 CEST, haiku, `WORK=$W`, `SESSION` a new uuid each, the
prompt "Answer OK and nothing else.": the script of the commit before, and the script of this change.
Both exit 0, both answered `OK`.

| | before | after |
|---|---|---|
| `toolset` | 119 | 26 |
| of them `mcp__…` | 93 | 0 |
| `mode` | `bypassPermissions` | `bypassPermissions` |
| `context` (one request and its reply) | 51,067 | 46,038 |
| cache written | 37,501 | 32,472 |
| `usd` | 0.0076 | 0.0066 |

The 26, the same names in both: `Task`, `Bash`, `CronCreate`, `CronDelete`, `CronList`, `DesignSync`,
`Edit`, `EnterWorktree`, `ExitWorktree`, `ListAgents`, `LSP`, `Monitor`, `NotebookEdit`,
`PushNotification`, `Read`, `RemoteTrigger`, `ReportFindings`, `ScheduleWakeup`, `SendMessage`, `Skill`,
`TaskStop`, `ToolSearch`, `WebFetch`, `WebSearch`, `Workflow`, `Write`.

The request is 5,029 smaller (51,067 less 46,038). Beside the record of `st-1-agent-sh-any-role`: its
haiku "OK" start was 51,097 through `WORK` and 46,070 with the flag added by hand, and the first
request of its opus writer, with the four-line prompt, was 51,668. An opus writer was not started
here, so the 51,668 has no number of this change beside it but those two of haiku.

Then a `--resume` of each session with the script of this change, from `/tmp`, 06:16:31 to 06:16:35
CEST, `WORK=$W`, the message "How many of your tools have a name that starts with mcp__ ? Answer with
the number and nothing else." Both exit 0, each with the `session` it was given.

| | resume of "before" | resume of "after" |
|---|---|---|
| `toolset` | 26, 0 of them `mcp__…` | 26, 0 |
| answer | `0` | `0` |
| `context` | 51,517 | 46,102 |

A session begun with the servers and resumed without them has none in its `toolset`, and is still
the larger. Its transcript has what the first run was told of them: a row `deferred_tools_delta` of
14,664 bytes and a row `mcp_instructions_delta` of 13,159, where the other session's has a
`deferred_tools_delta` of 1,519 and no `mcp_instructions_delta`. The resume added a
`deferred_tools_delta` of 4,812 bytes and an `mcp_instructions_delta` of 868 to it. What those two
say was not read. No such session waits: the two of `st-1-agent-sh-any-role` were trials.

`toolset` is what `claude` wrote in its `init` row. No call of an `mcp__` tool was tried in either
process.

## Tests

```
cd $W && bun test --timeout=30000 ./tests/tools/light-agent.test.ts
this change                                                     30 pass, 0 fail, 120 expect() calls
CLOUD_BRAIN_DEV=<git archive of cloud-brain-dev 1d80684> …      25 pass, 5 fail
$W/tests/tools/suite.sh                                         1063 pass, 0 fail, 106 files (06:19:45 to 06:21:37 CEST, after the last edit of a file a test reads)
```

The five that fail on the script and the README of the commit before:

- new: `WORK=DIR` starts no MCP server. `--strict-mcp-config` once and no `--mcp-config`, in what
  `DRY=1` prints and in what the stand-in `claude` is sent, for five calls (a start; with `SESSION`;
  with `ADVISOR=1`; with `MODEL=haiku`; `--resume`). `TAB=1` with `WORK` is refused on a start and on
  a resume. A reviewer with `TAB=1` has the flag and the one server `lopecode`.
- new: the README, the header of `agent.sh` and the spec's part 1 each say `--strict-mcp-config`
  with no `--mcp-config` and name this issue; the two files of `cloud-brain-dev` no longer say "no
  `--strict-mcp-config`" of `WORK`.
- changed: the three tests of `st-1` that hold the whole list of arguments of a `WORK` call (a start,
  a resume, the `DRY=1` lines) now have the flag after the model.

The second of them reads the spec from the checkout, which the `CLOUD_BRAIN_DEV` run does not turn
back: `git show HEAD:plan/cloud-brain-orchestrator-as-steps.md | grep -c st-1b-work-process-without-mcp`
printed 0 before the edit was committed.

## For the tasks after this one

- `agents/implementer/seed-tests.md` and `agents/digest.md` let their role open a tab "when you must
  look at the page itself". The task that starts a writer or a digest writer with `WORK` makes that
  line untrue for it: the line then names what stands in (a Playwright script of `tools/`, as
  `tab-tests.ts` is), or `agent.sh` gives that one server with `WORK` by name. Not decided here.
- A process has `Task`, `Workflow`, `RemoteTrigger`, the three `Cron…` tools, `WebFetch` and
  `WebSearch`, with nothing asked. The issue is of the MCP servers and says the permission mode is
  the spec's; these are named so that the list has been read once.

## Not tried

- A call of an `mcp__` tool from a `WORK` process, and what a subagent it starts with `Task` has.
- A server that is neither of the user's nor the project's settings: one of a plugin, of a managed
  policy, or of a `.mcp.json` in a `DIR` other than this worktree. The four that went are the four
  this machine had.
- Another version of `claude` than 2.1.296, another machine, Linux, root (the Fly machine).
- An opus start, a writer run to its submit, a run with a real brief. Each start here was one request
  of haiku.
- `safehouse`: the session's sandbox is what the runs were in.
- The one line of `agent.sh` that changed is run by the tests; no line of it is new.
