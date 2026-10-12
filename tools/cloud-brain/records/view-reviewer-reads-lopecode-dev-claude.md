# view-reviewer-reads-lopecode-dev-claude

2026-10-12. One pattern more in `cloud-brain-dev/.claude/settings.json`, five lines of its `README.md`,
and one test in `tests/tools/light-agent.test.ts`. No seed, no deploy, `agent.sh` not changed. Every run
below was made by the writer in the worktree of this issue,
`<root>/.claude/worktrees/bm-view-reviewer-reads-lopecode-dev-claude` (`$W` below), on one machine
(macOS, claude 2.1.296, bun 1.4.0). Times are CEST, read from `date` before each command.

## What was wrong

`agent.sh` starts `claude` in the `cloud-brain-dev` directory it is in. Claude Code reads a `CLAUDE.md`
from each directory above that one. `settings.json` there left out the main checkout's:

```
"claudeMdExcludes": ["**/lopecode-dev/CLAUDE.md"],
```

A reviewer in a view is started with the view's own copy, `$V/cloud-brain-dev/agent.sh`
(`SKILL.md`, step 4), and the directory above that is the view, whose copy of the file is
`<root>/.claude/worktrees/bm-rev-<id>/CLAUDE.md`. The pattern does not match that path. The issue has
it from the plain trial reviewer of `wt-4-reviewer-in-a-view` (its report, item 7).

A writer's worktree has the same shape of path (`…/.claude/worktrees/bm-<tree>/CLAUDE.md`, 22,179 bytes
by `wc -c $W/CLAUDE.md`), so the defect was reproduced in `$W`, with no view made. The command: `claude`
started in `$W/cloud-brain-dev` with the arguments `agent.sh` gives it, read from
`CHECKOUT=$W DRY=1 ./agent.sh x y`, and a prompt of its own with no `role:` line:

```
Use no tool. Answer with the absolute path of every CLAUDE.md, AGENTS.md or memory file whose contents
are in this conversation, one a line, and after them one line: YES if the words 'Lopecode Development
Guide' are in what you were given, NO if not.
```

```
--model opus --settings {"advisorModel":""} --strict-mcp-config --tools Bash,Read,Grep,Glob
--allowedTools Bash,Read,Grep,Glob --add-dir $W --output-format stream-json --verbose
```

"First request" is the `usage` of the first `assistant` event of the stream: `input_tokens`,
`cache_creation_input_tokens` and `cache_read_input_tokens`, added. Before the edit, 22:01:07:

```
first request: {"input_tokens": 2, "cache_creation_input_tokens": 13180, "cache_read_input_tokens": 4296, "sum": 17478}
turns: 1 usd: 0.10922720000000001
result: $W/CLAUDE.md
$W/cloud-brain-dev/CLAUDE.md
YES
```

## What changed

In `cloud-brain-dev`, one commit of the clone `$W/cloud-brain-dev`:

```
"claudeMdExcludes": ["**/lopecode-dev/CLAUDE.md", "**/.claude/worktrees/*/CLAUDE.md"],
```

and the paragraph of `README.md` that names `claudeMdExcludes` says there are two patterns and why.

The same command after the edit, 22:01:17:

```
first request: {"input_tokens": 2, "cache_creation_input_tokens": 1912, "cache_read_input_tokens": 6905, "sum": 8819}
turns: 1 usd: 0.018285000000000003
result: $W/cloud-brain-dev/CLAUDE.md
NO
```

17,478 before and 8,819 after: 8,659 fewer in the first request of that start. One run each. The sum is
what is compared, and not the split between what was written to the cache and what was read from it.

One start of `agent.sh` itself after the edit, 22:02:24, with the role `reviewer` and a task that asked
for the same list, no review and no call to the tracker:

```
CHECKOUT=$W $W/cloud-brain-dev/agent.sh reviewer "No review and no call to the tracker: this start is a measurement. …"
{"session": "e52d8192-2d57-4e9b-bbba-efd66f5a78f4", "result": "$W/cloud-brain-dev/CLAUDE.md\nNO", "usd": 0.1543196,
 "usage": {"input": 4, "cacheWrite": 17866, "cacheRead": 15878, "output": 410}, "context": 24777, "turns": 2, "ms": 6761,
 "legs": 1, "toolset": ["Bash", "Glob", "Grep", "Read"], "mode": "default"}
```

Its `context` is the size of its last request, after it read its role file, and is not compared with
the two numbers above.

### Why the wider pattern

Two were possible. `**/.claude/worktrees/bm-rev-*/CLAUDE.md` names views only.
`**/.claude/worktrees/*/CLAUDE.md` names every worktree under a `.claude/worktrees`: a view, a writer's
worktree, and one Claude Code made itself. The second was taken: the file is the same one in each, and
`agent.sh` started from a writer's worktree (the trial above) reads it the same way. What it costs: a
`CLAUDE.md` at the root of a worktree of any other repository is left out too, for a `claude` started in
a `cloud-brain-dev` under it. The file is the settings of the project `cloud-brain-dev`. The writer of this change, an agent of the
orchestrating session, had `<root>/CLAUDE.md` in its own first request, which the first pattern names: that
start did not go by this file.

The `*` is one directory, so the clone's own file, `…/worktrees/bm-rev-<id>/cloud-brain-dev/CLAUDE.md`,
is still read: it is the first path of the answer after the edit, in both starts.

## The test

`tests/tools/light-agent.test.ts`, "settings.json leaves out lopecode-dev's CLAUDE.md, the main
checkout's and a worktree's, and not this directory's own". It reads `claudeMdExcludes` from the
checkout's `cloud-brain-dev/.claude/settings.json` and matches five paths with `Bun.Glob`: the main
checkout's file, a view's and a writer's worktree's are matched, and `cloud-brain-dev/CLAUDE.md` in the
main checkout and in a view is not.

It holds the file's patterns with Bun's glob. Claude Code's own matcher is not run by it: the two starts
above are what asked `claude`.

```
bun test ./tests/tools/light-agent.test.ts      (in $W, with the edit)                         20 pass, 0 fail
the same, with settings.json as the clone's commit before the edit has it                     19 pass, 1 fail
  (fail) settings.json leaves out lopecode-dev's CLAUDE.md, … : [true, false, false, false, false] received
tests/tools/suite.sh                            (in $W, 22:02:52, after the last edit of a test) 710 pass, 0 fail, 72 files
tests/tools/suite.sh                            (in $W, 22:05:57, after a rebase that brought in two test files) 724 pass, 0 fail, 74 files
```

Neither run of the suite printed a `skipped:` line.

## Not done, not tried

- **No start from a view.** Both measurements are from a writer's worktree, `bm-<tree>`, whose path the
  new pattern matches by the same `*` as a view's `bm-rev-<id>`. A reviewer started in a view after this
  landed was not looked at by the writer. Its `context` in the journal is where to read it.
- **One run each**, before and after. The 8,659 is not only the file: nothing was done to say what else,
  if anything, left the request with it.
- **Only the main checkout's file is left out above a worktree.** A walk from a view goes on above it:
  `<root>/.claude/worktrees/`, `<root>/.claude/` and `<root>`. The answers after the edit name no file from
  there (`<root>/CLAUDE.md` is the first pattern's). `CLAUDE.local.md` and `.claude/rules/` do not exist in
  `$W` (`ls`), so nothing was seen of how they would be treated.
- **The user's memory file** (`MEMORY.md` of the project's memory directory) was in neither answer, before
  or after. Whether a start from another directory gets one was not tried.
- **A checkout of `lopecode-dev` under another name** is not matched by the first pattern. Not changed.
- `tools/cloud-brain/records/wt-4-reviewer-in-a-view.md`, line 157, says the file is in a reviewer's first
  request in a view. It is a record of that day and was left.
