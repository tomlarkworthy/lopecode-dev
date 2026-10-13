# st-1-agent-sh-any-role: `WORK` and `SESSION` in `agent.sh`, and a writer and a spec writer run as processes

2026-10-13. Task 1 of `plan/cloud-brain-orchestrator-as-steps.md` (design part 1). A local tool of the
repository `cloud-brain-dev`, its README and its tests. No seed, no deploy. Nothing of the issue loop
starts an agent this way yet: `SKILL.md` step 4 is not changed, and `loop.ts` is `st-2`.

Every run below was made on one laptop (macOS, `claude` 2.1.296, config directory `~/.claude-personal`),
from Bash calls of the writer of this issue, which is itself an `Agent` of a `claude` session in its
sandbox. `$W` is the worktree `…/.claude/worktrees/bm-st-1-agent-sh`.

## What changed

| File | Change |
|---|---|
| `cloud-brain-dev/agent.sh` | `WORK=DIR`, `SESSION=UUID`, their refusals, the header |
| `cloud-brain-dev/README.md` | "A light agent for one role": the two variables, what was measured |
| `tests/tools/light-agent.test.ts` | 5 tests; the stand-in `claude` also writes down the directory it was started in |

`WORK=DIR agent.sh ROLE "prompt"` starts `claude -p` in `DIR`. Before and after, the arguments
`DRY=1 WORK=$W agent.sh implementer "Issue: x"` prints after the prompt (before: with `CHECKOUT=$W`,
and the prompt was four lines):

```
before   --model opus --settings {"advisorModel":""} --strict-mcp-config --tools Bash,Read,Grep,Glob
         --allowedTools Bash,Read,Grep,Glob --add-dir $W --output-format stream-json --verbose
after    --model opus --permission-mode bypassPermissions --output-format stream-json --verbose
```

`SESSION=<uuid>` adds `--session-id <uuid>` after the prompt. `WORK=DIR agent.sh --resume SESSION "message"`
has the flags of "after"; with no `WORK` a resume has the four tools, as before.

Where the spec left a choice, the smaller side was taken (`philosophy.md`, line 2):

- **`ROLE` is not sent with `WORK`.** The spec: "with the prompt as the caller gives it", and "The prompt is
  the four lines of `SKILL.md` step 4, unchanged". `ROLE` is still asked for, so a call has one shape. The
  spec's part 3 has `WORK=… agent.sh orchestrator "<do> <id>; …"`, a prompt that names no brief: that
  caller's prompt has to name it, since `agent.sh` adds nothing.
- **`READS` and `TAB` with `WORK` are refused**, exit 1 before `claude`. `READS` is the agent with one tool,
  and `TAB` adds a server by `--mcp-config` to a run that has `--strict-mcp-config`; `WORK` has neither flag.
- **`ADVISOR` is not read with `WORK`.** The spec: "the advisor left on". `ADVISOR=0` there leaves it on too.
- **`CHECKOUT` is not read with `WORK`**, and `DIR` is held to be a directory, not a checkout.
- **`SESSION` is refused when it is not 8-4-4-4-12 hex digits, and on `--resume`.** The spec names neither.
  `claude` was not asked what it does with either; the refusal is made before it is started.
- **`SESSION` holds without `WORK` too** (a reviewer, a `READS` agent). The spec lists it "beside `TAB`,
  `READS` and `MODEL`" and `st-2` writes the id of every run before it starts.

## Tests

```
cd $W && bun test --timeout=30000 ./tests/tools/light-agent.test.ts
agent.sh of this change                                28 pass, 0 fail, 110 expect() calls
agent.sh of cloud-brain-dev b42788e (git show HEAD:)   23 pass, 5 fail (the five new tests)
$W/tests/tools/suite.sh                                1031 pass, 0 fail, 105 files (run 06:03 CEST, after the last edit)
```

The five: the flags and the directory of a `WORK` start, with `CHECKOUT` wrong and `ADVISOR` 1 and 0; the
same on `--resume`, and a relative `DIR`; `SESSION` with `WORK`, alone and with `READS`; the `DRY=1` lines
(the spec's check for R3: "no `--tools` line is printed, and `--session-id` is followed by the `SESSION`
given"); ten refusals, each exit 1 with `claude` not started.

## A writer and a spec writer, each as a process and as an `Agent`

Four runs, started 05:57:16 to 05:57:35 CEST, model opus, of issues that are `done`. The prompt of each was
the four lines of `SKILL.md` step 4 with the token of this issue's writer (`impl-d81690`; a writer makes no
token, as `wt-4-reviewer-in-a-view` found), and a fifth line: steps 1 and 2 of the brief and no step after,
nothing written to the tracker, no file edited or committed, no lock, no advisor, no agent; then an answer
with the commands run and the lines of the brief that did not hold. The process was started
`WORK=$W SESSION=<uuid> agent.sh <role> "<prompt>"`; the `Agent` was `subagent_type: general-purpose`,
`model: opus`, the same prompt.

| | writer, process | writer, `Agent` | spec writer, process | spec writer, `Agent` |
|---|---|---|---|---|
| issue | `ac-5-prose-names-the-two-shapes` | the same | `answers-cut-and-not-said` | the same |
| brief | `agents/implementer.md` | the same | `agents/spec.md` | the same |
| `toolset` | 119: 26 of `claude`, 93 MCP | not in its transcript | 119, the same | not in its transcript |
| `mode` | `bypassPermissions` | | `bypassPermissions` | |
| first request | 51,668 | 40,811 | 51,660 | 40,803 |
| last request (`context`) | 104,411 | 114,621 | 116,330 | 94,451 |
| requests | 8 | 9 | 7 | 8 |
| input | 16 | 17 | 14 | 16 |
| cache written | 92,572 | 105,328 | 105,347 | 86,315 |
| cache read | 568,026 | 617,810 | 525,863 | 512,728 |
| output | 5,403 | 6,457 | 5,933 | 5,523 |
| `usd` | 0.96 | not given | 1.07 | not given |
| time | 62.6 s (`ms`) | 73.7 s | 64.3 s (`ms`) | 62.4 s |
| tool calls | Bash 10, Read 2 | Bash 7, Read 5 | Bash 8, Read 5 | Bash 7, Read 5 |
| advisor calls | 0 | 0 | 0 | 0 |

The usage of the two processes is their JSON line, and `agent-usage.ts <transcript> --run 1` printed the same
four numbers. The usage of the two `Agent` runs is `agent-usage.ts` on their transcripts. Requests, the
first and the last request and the tool calls are read from the transcripts (the script is at the end).
The 93 MCP tools: `mempalace` 44, `lopecode` 30, `claude_ai_Google_Drive` 11, `claude_ai_Claude_Docs` 8.
`usd` is the harness's estimate; an `Agent` run has none. The time of an `Agent` is the `duration_ms` of
its notice.

What the table shows, of these four runs and no more:

- **A process began 10,857 and 10,857 tokens larger than the `Agent` of the same role** (51,668 less 40,811;
  51,660 less 40,803). Part of it is the MCP servers: a haiku start in `$W` told to answer "OK" was 51,097
  through `WORK`, and 46,070 with `claude` given the same flags and `--strict-mcp-config` by hand (26 tools):
  5,027. The other 5,830 were not looked for.
- **At the end the two ways are not ordered**: the writer's process was the smaller (104,411 against
  114,621), the spec writer's the larger (116,330 against 94,451). Each agent chose what to read: the two
  spec writers differ in whether they read each of the nine parts. One run a cell is not a comparison.
- **The spec's sentence "less the session's MCP servers" did not hold.** With no `--strict-mcp-config` a
  process in `$W` has the servers of the user's and the project's settings, the paired-tab server among
  them. No tool of them was called in these runs. The flags are the spec's and were not changed.

Each of the four said it wrote nothing to the tracker. After them `get?id=` of each issue has no event by
`impl-d81690` (15 and 22 events, the last seq 5685 and 5683, as before). Both processes wrote a file they
were told not to and removed it: `/tmp/impl-d81690-search.json`, and `tools/scratch-impl-d81690-get.json` in
the worktree. Neither is there now. A process is given no scratchpad, and its prompt names none.

## One `--resume` of each

05:58:57 CEST, both at once, from `/tmp`: `WORK=$W agent.sh --resume <uuid> "<a second message: run date,
name the issue of the trial and the first file read>"`. Exit 0 for both, at 05:59:05.

| | writer | spec writer |
|---|---|---|
| `session` | the uuid given as `SESSION` | the same |
| answer | the issue id, `agents/implementer.md`, `Tue 13 Oct 2026 05:59:01 CEST` | the issue id, `agents/spec.md`, the same second |
| `toolset`, `mode` | 119, `bypassPermissions` | 119, `bypassPermissions` |
| `context` | 105,835 | 118,729 |
| usage (2 requests) | 6 in, 2,167 written, 209,162 read, 191 out | 6 in, 2,248 written, 234,793 read, 229 out |
| `usd` of the line | 1.03 (first run 0.96) | 1.14 (first run 1.07) |

So the resumed run had the tools of the first (it ran `date` with Bash), which is what `WORK` on `--resume`
is for. `usd` of a resumed line was more than the first run's while the resumed run was 2 requests: read as
the session's sum. `st-2` writes a `cost` event from this line.

The haiku session of the "OK" start (`SESSION` given, begun with "Remember the word heron") was resumed three
ways from `/tmp`, 05:56:29 CEST: `WORK=$W`; `WORK=<an empty directory of the scratchpad>`; and no `WORK`,
`CHECKOUT=$W` (the light agent's flags). Each answered `heron` with the same `session`. `usd` of the four
lines: 0.0081, 0.0120, 0.0126, 0.0139. The transcript is under the project directory of `$W`
(`~/.claude-personal/projects/-Users-…-bm-st-1-agent-sh/<uuid>.jsonl`), and was found from the other two.

## The detach, from a shell that is not `claude`

The two processes above were started by a bash script, `launch.sh`, not by a `claude -p`:

```
WORK="$W" SESSION="$3" nohup "$W/cloud-brain-dev/agent.sh" "$2" "$(cat prompt)" > result.json 2> err < /dev/null &
echo "$!" > pid
```

The script printed `launcher 14035 started agent.sh 14040 and ends` and ended. At 05:57:26 `pgrep -fl
impl-d81690-launch` printed nothing, `kill -0 14040` answered, and `pgrep -P 14040` printed the `claude`
(14047) and the `python3` (14049) of `agent.sh`. The Bash call that ran the script had returned; the run
went on through three more Bash calls and two `Agent` starts, and wrote its one JSON line at 05:58:20
(the file's time), 64 s after the start. The second (`agent.sh` 14048) the same, at 05:58:22.

What this is not: the script was itself started by a Bash call of a `claude` session, so every process here
has `claude` above it. `ps` is refused in the session's sandbox ("operation not permitted"), so the parent
of 14040 after the script ended was not read. See "Not tried".

## Which MCP tools writers called on 2026-10-12

None. Of 1,629 subagent transcripts under `~/.claude*/projects`, 116 have a first prompt of 2026-10-12 (UTC)
that names `agents/implementer.md`. Their tool calls, 6,031:

```
Bash 4961 in 116 writers    Read 731 in 116    Write 206 in 110    Edit 75 in 31    Skill 43 in 43
ToolSearch 10 in 10         WebFetch 2 in 1    TaskStop 2 in 1     WebSearch 1 in 1
mcp calls 0
ToolSearch queries: select:Monitor 7, select:WebFetch 1, select:WebSearch 1, select:TaskStop 1
```

So no writer of that day called the memory palace or a tab tool, and none loaded one with `ToolSearch`.
The count is of `tool_use` blocks; the advisor is not one and is not counted here. A writer that was sent a
second round is one transcript. Run 05:57:48 CEST with the second script at the end.

## For the tasks after this one

- A process started with `WORK` in a worktree has 93 MCP tools it did not call on 2026-10-12 and is 5,027
  tokens larger at each request for them (haiku, one start each way). `--strict-mcp-config` with `WORK` would
  take them off. Not done here: the spec lists the flag as left out.
- A process has no scratchpad. Both wrote a file outside one.
- `usd` of a resumed line is not the resumed run's alone.
- Both spec writers reported that `agents/spec.md` has no `--short` and names the token as `spec-`; both
  writers read `rules.md`, `philosophy.md` and one or two knowledge pages before the first `brain.ts` (the
  `Agent` counted about 120,000 bytes), where `agents/implementer.md` says a change with no deploy is
  written from it alone.
  These are of the briefs, not of `agent.sh`.

## Not tried

- A writer as a process to its submit. These two stopped after step 2, by their prompt.
- A process with a shell above it that no `claude` started (a terminal, `launchd`, `ssh`), and the parent
  of a detached run. A run longer than 66 s, the laptop's sleep, Linux.
- `safehouse`: the session's sandbox is what the runs were in.
- What `claude` answers to a `SESSION` that is in use, or to `--session-id` with `--resume`.
- Two resumes of one session at once.
- `MODEL` other than opus and haiku. `--permission-mode bypassPermissions` as root (the Fly machine,
  `records/fly-1-by-hand.md`).
- A digest writer, an approver, an overseer.
- One new line of `agent.sh` no test runs: the exit when `cd "$WORK"` fails for a `DIR` that is a
  directory (one the caller may not enter). The other branches (`WORK`, `SESSION`, the two refusals of
  each, the usage line of a `WORK` call with no prompt) are entered by a test through the script.

## The two scripts

The first and last request and the tool calls of a transcript:

```
python3 -c '
import json, sys, collections
for f in sys.argv[1:]:
    seen = {}; calls = collections.Counter()
    for line in open(f, errors="replace"):
        try: o = json.loads(line)
        except ValueError: continue
        m = o.get("message") or {}
        if o.get("type") != "assistant": continue
        u = m.get("usage") or {}
        seen[m.get("id")] = sum(u.get(k) or 0 for k in ("input_tokens", "cache_creation_input_tokens", "cache_read_input_tokens", "output_tokens"))
        for b in m.get("content") or []:
            if b.get("type") == "tool_use": calls[b["name"]] += 1
    v = list(seen.values())
    print("requests", len(v), "first", v[0], "last", v[-1], dict(calls))
' <transcript>…
```

For a process it was run after the resume, so its 10 and 9 requests are the 8 and 7 of the table and the 2
of the resume, and the "last" it printed is the resume's `context`.

The tools the writers of a day called:

```
python3 -c '
import json, glob, os, sys, collections
day = sys.argv[1]
files = glob.glob(os.path.expanduser("~/.claude*/projects/*/*/subagents/*.jsonl"))
writers = 0; calls = collections.Counter(); per = collections.Counter(); searches = collections.Counter()
for f in files:
    first = None; names = []; q = []
    for line in open(f, errors="replace"):
        try: o = json.loads(line)
        except ValueError: continue
        c = (o.get("message") or {}).get("content")
        if first is None and o.get("type") == "user":
            first = (o.get("timestamp") or "", c if isinstance(c, str) else " ".join(b.get("text", "") for b in c if isinstance(b, dict)))
        if o.get("type") == "assistant" and isinstance(c, list):
            for b in c:
                if b.get("type") == "tool_use":
                    names.append(b["name"])
                    if b["name"] == "ToolSearch": q.append(str((b.get("input") or {}).get("query")))
    if not first or not first[0].startswith(day) or "agents/implementer.md" not in first[1]: continue
    writers += 1; calls.update(names); per.update(set(names)); searches.update(q)
print("transcripts read", len(files), "writers", writers, "tool calls", sum(calls.values()))
for n, k in calls.most_common(): print(n, k, "in", per[n])
print("mcp calls", sum(k for n, k in calls.items() if n.startswith("mcp__")), dict(searches))
' 2026-10-12
```
