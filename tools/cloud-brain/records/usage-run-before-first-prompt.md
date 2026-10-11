# usage-run-before-first-prompt

2026-10-11. A quick win made beside `usage-local-command-starts-a-run`, in the same file, as a
commit of its own, the one after that issue's. A local tool and its test file; no deploy.

## What was wrong

`agent-usage.ts --run N` counts from the Nth prompt. Requests that come before the first prompt
were in no run, and the first round of some agents has no prompt row.

How a subagent's transcript begins (1447 files, a script not kept, between 20:27 and 20:32 CEST):
1309 with a plain row, 68 with an `isMeta` row (a skill run as a subagent), 68 with a row of type
`fork-context-ref` and then the model's rows, 2 are workflow journals with no `user` or
`assistant` row.

One fork read by its row kinds, `agent-accb75caa34c5bc78.jsonl` (440 rows): a compaction's summary
at row 78, a Skill's text at 115, the coordinator's row at 342, and no other `user` row that is not
a tool result. Its runs, by `usageOf(t, n)` for n from 1:

```
main's tool (c5d4617f)   [33]
the commit before this   [33]
this commit              [101, 33]      --last-run 33
```

So `--run 1` answered the coordinator's message, the agent's second round, and the first round's
101 requests had no number. `SKILL.md` line 145 calls `--run N` "the agent's Nth".

## What changed

`usageOf`: when a row before the first prompt is a request, the top of the file is a prompt too
(`prompts.unshift(0)`). With no prompt at all and a request, the whole file is run 1. With no
request before the first prompt nothing changes: a main session that begins with a local command
gets no run for it.

Not taken: a kind `meta-first` that starts a run when an `isMeta` row is the first of the file.
A fork has no such row, and a main session's first row is the `isMeta` caveat of a local command
in 14 files (`back.ts`, 20:21 CEST), which would be an empty run 1.

The typed messages of a session that has requests before its first prompt are numbered one higher
than a person would count. One main file has them (below).

`tests/tools/agent-usage.test.ts`, one test added, "requests before the first prompt are run 1,
and the runs add up to the whole file": a file with no prompt, a fork with a later coordinator's
row, a session that begins with a local command, and an empty file. At the commit before this one,
with the test added, `bun test ./tests/tools/agent-usage.test.ts` gave 12 pass, 1 fail, this test
(20:46 CEST).

## Counts

- `bun test ./tests/tools/agent-usage.test.ts`: 13 pass, 0 fail (20:56 CEST). `bun test ./tests/tools`, before the worktree was
  brought up to `main`: 284 pass, 0 fail, 33 files, ended 20:55:16 CEST, and after it 303 pass, 0 fail,
  34 files, ended 20:58:28 CEST; each after
  `bun tools/cloud-brain/build.ts --out tools/cloud-brain/.emitted/cloud-brain.html`.
- Every transcript, the commit before against this one (`runs.ts A B`, attached to
  `usage-local-command-starts-a-run`; 636 main files, 1456 subagent files, 20:54 CEST):

  ```
                         main: runs, empty runs    subagents: runs, empty runs
  the commit before      3731, 127                 1453, 7
  this commit            3732, 127                 1589, 7
  ```

  The runs changed in 136 subagent files and 1 main file, each by one run more; 134 subagent files
  and 2 main files have no prompt row at all. The whole-file answer and `--last-run` differ in 0
  files. The runs of a file add up to its requests in all 2092; at the commit before they did not in
  137 (`sumOff`, 20:50 CEST).
- The main file is `~/.claude-personal/projects/-Users-tom-larkworthy-dev-lopecode-dev/f40304e6-f5ee-4efc-9919-e4221793ad04.jsonl`
  (`runs.ts A B --implicit`, 20:46 CEST): a run of 7 requests is now first and the runs that
  were there follow it unchanged. What its first rows are was not read.
- The loop's 18 calls of the other record (`loopcalls.sh`, `main`'s tool against this commit, 20:54
  CEST): all the same.

## Not done, not tried

- Which of the 136 are forks and which are skills was not counted with the tool; 68 and 68 is how
  the files begin, counted apart.
- A skill subagent that was sent a later round was not looked at by eye; the fork above was.
- Whether an agent of the issue loop is ever a fork, and whether the orchestrator calls `--run N`
  on one, was not read.
- Prior art: the three searches of the other record; nothing bore on it.
