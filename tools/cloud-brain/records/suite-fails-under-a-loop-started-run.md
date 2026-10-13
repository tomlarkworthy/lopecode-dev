# suite-fails-under-a-loop-started-run: two tests of `agent.sh` give it an environment with no `WORK` and no `SESSION`

2026-10-13. Part of no project. Two test files changed and one added: no seed, no deploy.

Written by a judgment run (`agents/orchestrator.md`), token `orch-677121`, which triaged the issue and took
it as a quick win. The run is a `claude` process that `loop.ts start` began, in the worktree
`bm-orch-MacBook-Pro-3`, so its own environment has the six names the issue is about (`env`, 15:00 CEST:
`WORK`, `SESSION`, `LOOP_TOKEN`, `LOOP_RUN`, `LOOP_RUN_TOKEN`, `LOOP_TS`). Every run below was made with
them set unless it says otherwise. Times are CEST from `date`.

## What was seen before the change

Each file alone, `bun test ./tests/tools/<file>`, then the same after `env -u WORK -u SESSION`:

```
reviewer-brief-names-token   3 pass 1 fail     -> 4 pass 0 fail
reviewer-in-a-view           9 pass 1 fail     -> 10 pass 0 fail
reviewer-brief-kept-copy     5 pass 1 fail     -> 6 pass 0 fail
```

`WORK` and `SESSION` alone change these tests: the four `LOOP_` names were still set in the second run of
each. The issue left that open.

The first two start `agent.sh` with `{ ...process.env, … }`. With `WORK` set, `agent.sh` sends its second
argument as the prompt, with no `role:` and no `checkout:` line:

```
Expected: "role: reviewer"
Received: "review issue some-issue; your token is rev-3fa2c1"
```

The third starts no `agent.sh`. Its failing test runs every file that holds the brief as a child `bun test`,
`reviewer-brief-names-token.test.ts` among them, and what it printed was that child's failure.

## What changed

- `tests/tools/reviewer-brief-names-token.test.ts`: the environment given to `agent.sh` has
  `WORK: undefined, SESSION: undefined`.
- `tests/tools/reviewer-in-a-view.test.ts`: `WORK: ""` and `SESSION: ""` beside the `TAB: ""` and `READS: ""`
  that were there for the same reason.
- `tests/tools/agent-sh-tests-own-env.test.ts`, new: runs each of those two files as a child `bun test` with
  the six names set in the child's environment, and expects 0 fail, more than 0 pass and exit 0.
  `reviewer-brief-kept-copy.test.ts` is not changed and is not among the two: it passes when its child does.

The other way the issue names was `suite.sh` taking the names out before bun. Not taken: a file run alone
has no `suite.sh` round it, and three of the four reports were of a writer or reviewer that then had to
find the `env -u` form.

## Tests

```
bun test --timeout=30000 ./tests/tools/agent-sh-tests-own-env.test.ts ./tests/tools/reviewer-brief-names-token.test.ts ./tests/tools/reviewer-in-a-view.test.ts ./tests/tools/reviewer-brief-kept-copy.test.ts
 22 pass
 0 fail
Ran 22 tests across 4 files.
```

The new file against the two files as `HEAD` had them (`git show HEAD:<file>` written over each, then put
back), run with `env -u WORK -u SESSION` so that only the names the test itself sets are in play:

```
(fail) reviewer-brief-names-token.test.ts passes with the names of a started run in the caller's environment
(fail) reviewer-in-a-view.test.ts passes with the names of a started run in the caller's environment
 0 pass
 2 fail
```

The suite, `tests/tools/suite.sh` with nothing taken out, 15:05:01 to 15:07:43, before the landing's rebase:

```
 1235 pass
 0 fail
Ran 1235 tests across 127 files. [154.60s]
```

## Not tried, and what is left

- No other file of `tests/tools` was read for the same leak. Nine more name `agent.sh`; the suite's 0 fail
  with the six names set says none of them fails today, and nothing more.
- The suite was not run with the names unset after the change.
- The new test skips where `cloud-brain-dev/agent.sh` is absent (`testNeeding`); that case was not run.
- The reviewer's brief has a line that gives the `env -u` command. It is the overseer's to take out.
- The issue quotes the writer of `st-6`: a `loop.ts` command typed with no `LOOP_TOKEN=` acts as the session
  that started the run. That is of the same six names and is not changed here.
