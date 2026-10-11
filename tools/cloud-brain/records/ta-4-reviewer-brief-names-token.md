# ta-4-reviewer-brief-names-token

2026-10-11. Task 4 of `plan/cloud-brain-record-names-token-not-agent.md`: the reviewer's brief on cb4 says
which token a reviewer writes with. One file of the Brain was changed. No seed, no deploy, no commit in
`cloud-brain-dev`.

## Who made the put

`rules.md` gives the token `loop-roles` to the overseer ("The overseer changes a brief with it; no other
role does"). The owner answered on the issue at event 1406, written in his tab: `A, narrowed to "a writer
may put a brief when its issue is a task of a spec you approved"`. This issue is a task of
`record-names-token-not-agent`, approved at event 1285. The writer of this task made the put, with
`cloud-brain-dev/put.sh` from the main checkout. The line of `rules.md` is as it was; its change is in
`ta-3-orchestrator-steps`.

## What changed

`/static/cloud-brain-dev/roles/reviewer.md`. `put.sh` was run between two reads of `date`, 19:21:25 and
19:21:27 CEST.

```
before  sha256 31b5157b…  kept by put.sh as 2026-10-11T17-21-25Z-31b5157b   (put.sh --history roles/reviewer.md, last line)
after   sha256 642cf35b…  13301 bytes                                        (curl -s <brain>/static/cloud-brain-dev/roles/reviewer.md | shasum -a 256; | wc -c)
```

The paragraph that read `Your token is issues-reviewer-2` now reads, as fetched from cb4 after the put:

```
You write with the token your task names: the `task:` line of your prompt, or the prompt itself
when you were spawned as an Agent, says "your token is" and a name. `issues-reviewer-2` when it names none.
`<token>` below is that name, written out. Shorthand: `ir` is
`tools/cloud-brain/issue-as.sh <token>`. Define it as a function,
`ir() { tools/cloud-brain/issue-as.sh <token> "$@"; }`, in each command that uses it, with the
name in place of `<token>` and no variable for it:
the shell is zsh, which does not word-split a variable, and no shell state lasts between calls.
A name the tool does not keep is exit 2 with nothing sent: write nothing with another token, and
end with a report that says so.
```

The sentence above it, "Your prompt names the issue and nothing else", now reads "names the issue, and may
name your token, and nothing else". Nothing else in the file was changed: the kept copy, made the file on
disk with `put.sh --restore roles/reviewer.md 2026-10-11T17-21-25Z-31b5157b` and not put, against the Brain's
copy gives three hunks in `diff`, `20,21c20,21`, `23,25c23,28` and `26a30,31`, 15 lines marked `<` or `>`.

Three things in that text are this writer's and not the spec's:

- **Both ways a reviewer is started.** The `agent.sh` reviewer has a `task:` line; one spawned with the Agent
  tool has a prompt and no such line (the brief already tells the two apart for the scratchpad).
- **The name is written out, never held in a variable.** The brief's own reason was already there: no shell
  state lasts between calls.
- **The last sentence.** `issue-as.sh rev-nosuch "get?id=ta-4-reviewer-brief-names-token"` printed
  `issue-as.sh: no token named rev-nosuch is kept; nothing was sent` and exit 2. A reviewer that then took
  the role's token would write under the name the project is taking out of the record. It is to stop and
  say so. The fallback is for a task that names no token, not for a name that failed.

`issues-reviewer-2` is in the brief once, by design: `curl -s <brain>/static/cloud-brain-dev/roles/reviewer.md
| grep -c issues-reviewer-2` is 1. R4 of the spec wants 0; that is the second half of this task and goes
with the owner's revoke of the three role tokens.

## `agent.sh` is not changed

The issue names "agent.sh's task text". The spec says of it: "The reviewer started with `agent.sh` gets it
in the task text." `agent.sh` puts its second argument after `task: ` as given, so the name reaches the
reviewer when the caller writes it there. The caller is the orchestrator, `SKILL.md` step 4
(`agent.sh reviewer "review issue <id>"`, "with nothing added to the task"), which is task 3's to change.
The fourth test below holds `agent.sh` to it: a task that ends `; your token is rev-3fa2c1` is the last line
of the prompt, whole.

A second reason it was left: `agent.sh` and its README are in the repository `cloud-brain-dev`, and the loop
keeps no token that can push it (`records/fb-a2vp4smwzq.md`: "which the loop has no token to push"; the
names in `.emitted/cb4-tokens.json` are `loop-bluesky`, `loop-deploys`, `loop-knowledge`, `loop-library`,
`loop-roles`). So `cloud-brain-dev/README.md` still shows the reviewer started with no token in the task,
which is true of the loop until task 3.

## Tests

`tests/tools/reviewer-brief-names-token.test.ts`, 4 tests. The brief has one copy, on the Brain, so three of
them fetch it from cb4 with no token; `BRIEF=<file>` reads a file in its place. The fourth runs `agent.sh`
with a stand-in `claude` on PATH and sends nothing.

```
before the put   $ cd <worktree> && bun test ./tests/tools/reviewer-brief-names-token.test.ts
                 1 pass, 3 fail, 6 expect() calls        (the three that read the brief; the agent.sh test passed)
after the put    the same command
                 4 pass, 0 fail, 9 expect() calls
```

The whole directory, in the worktree after the rebase onto `main`: see the submit's comment for the command
and its count.

## Not tried

- **No reviewer has been started with a token named in its task.** Task 3 has not landed, and the loop still
  starts the reviewer with `review issue <id>` alone. Whether a reviewer reads the name out of a task line
  and writes it into `ir` is not known from this change.
- **A reviewer spawned with the Agent tool and a token in its prompt**: not tried either.
- **A named token that is kept and was revoked** answers 401, not exit 2 (the spec, R2). The brief does not
  say what a reviewer does then.
- **The fallback's removal**, with the owner's revoke.
- **The test reads the network.** With cb4 not answering, three of the four fail; no skip was written.
- The kept copy was restored to disk and read, as above. It was not put back, so a return to it is not shown.
