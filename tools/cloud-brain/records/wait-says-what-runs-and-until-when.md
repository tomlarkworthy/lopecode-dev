# An ask says how long its agent waits and what is billed meanwhile, or it is not written (`wait-says-what-runs-and-until-when`)

The second action of the post mortem `tools/cloud-brain/post-mortems/pm-agent-request-not-seen-fly-idle.md`,
for "the two things beside" its cause: the answer was tied to a condition with no time, and nothing
said what a billed machine does while its writer waits. Round 1, by a writer of the issue loop,
token `impl-22ebca`, on 2026-10-12; its `start` is event 5219 (23:36 CEST). A new local tool, a change
to a local tool, two texts an agent reads and two test files. No seed, no deploy, no install.

## Guard or sentence

The issue asks that a guard be weighed first (the owner, comment 4981 of the post mortem: "generally
fixes are better as guards"). What was weighed, by the kinds of `agents/implementer.md`, "The next actions":

| Kind | For this | Built |
|---|---|---|
| `guard`, `workflow` | A guard of the installed policy on the label would be the owner's install, for what a local tool can refuse. Whether a guard can read the text of a comment was not read. | no |
| `refusal` | **`tools/cloud-brain/issue-ask.sh`**: one call writes the ask, and it is refused with no minutes or no word of what is billed. | yes |
| `refusal`, of the machine itself | Nothing of the loop reads Fly. `brain-x-fly` of `worker-machine-on-fly`, which could stop a machine after some idle minutes, is not built. | no |
| `observability` | **`issue-watch.sh`** prints a line `asks-still` for an ask the session has not answered in 5 minutes. | yes |
| `text` | The wait for a review, the wait for a lock, and the session's message that asks an agent to wait. Why no tool holds each is below. | yes |

**Why the ask had to be a tool.** The brief told a writer to send the ask with `issue-as.sh` and to
write in it "until when you wait, a time read from `date` and 10 minutes at most". `issue-as.sh`
refuses a body that names a time more than a minute ahead of the clock. Run from this worktree at
23:36:52 CEST, with no server behind the address:

```
ISSUE_AS_BASE=http://127.0.0.1:9 issue-as.sh impl-22ebca comment '{"key":"k","id":"x","body":"I wait until 23:59:00"}'
issue-as.sh: not sent. The body names 23:59:00, 22 min ahead of the clock (2026-10-12 23:36:52 CEST).
exit 3
```

No ask had been made that way ("First ask made this way: not yet", the record of
`asks-orchestrator-label-and-watch`). The tool takes minutes, writes the times from the clock itself,
and sends that one comment with `ISSUE_AS_TIME_AHEAD=1`.

## What changed

- **`tools/cloud-brain/issue-ask.sh`**, new.
  ```
  issue-ask.sh <token> <id> <n> <minutes> --nothing-billed <the ask>
  issue-ask.sh <token> <id> <n> <minutes> --runs <what> --since <HH:MM> --stop-in <minutes> <the ask>
  ```
  Exit 64 with nothing sent: no `<minutes>`, or one outside 1 to 10; neither `--nothing-billed` nor
  `--runs`, or both; `--runs` with no `--since` or no `--stop-in`; a `--stop-in` past the wait; no
  words of an ask. Else the comment (`<role>/<id>/ask-<n>`), then the label (`<role>/<id>/asks-<n>`).
  The comment as the test has it, with the clock at 22:21:06:
  ```
  one orch token and a go-ahead
  Waits until 2026-10-12 22:31:06 CEST (10 min from this write); then it takes the label off and ends the run with a report.
  Billed while it waits: a Fly machine, performance-2x, running since 2026-10-12 21:36:00 CEST. This agent stops it by 2026-10-12 22:25:06 CEST (4 min from this write), answered or not.
  ```
  Its header has the exits.
- **`tools/cloud-brain/issue-watch.sh`.** With each read of `sync` the loop reads
  `list?label=asks-orchestrator&limit=100` and prints `<seq> asks-still <id> <N> min with the label
  asks-orchestrator and no event of the issue: answer it` for an issue of that answer whose
  `updated_at` is 5 minutes old or more. `<N>` is in fives, and the loop keeps the lines it printed,
  so a line is printed once at 5 minutes and once at 10. `--still <now, ms>` reads one answer from
  stdin; `ISSUE_AS_SH` names another `issue-as.sh`, for the test.
- **`agents/implementer.md`.** A section "Before a wait" after "When you need the orchestrating
  session": the sentence of the issue, and a table of four waits with what holds each. Step 13 names
  it before `issue-wait.sh`. In "When you need the orchestrating session" the two calls of `ia` are
  the tool's call, and the sentence "what a billed thing does through a wait is
  `wait-says-what-runs-and-until-when`, not written when this was" is gone.
- **`SKILL.md`.** A section "A message that asks an agent to wait" before "A rework round goes to
  the agent that wrote the change": the time by which the session answers, 10 minutes at most, what
  the agent does at that time, how it asks, and no wait when no time can be named. The row of the
  label in step 3 says what the tool writes under the ask and what an `asks-still` line is; step 8
  has the line.
- **`plan/cloud-brain-worker-machine-on-fly.md`** cites `issue-watch.sh` by line: 59 and 7 now, and
  the sentence says that the watch makes a second read every 30 s.

## What is a sentence, and why

- **The session's message.** `SendMessage` and the prompt of an `Agent` call are the harness's. No
  tool of the loop reads either, and a hook on them is a change of the session's configuration, which
  an agent does not make. The agent's half is held: a writer told to wait with no time still writes
  no ask without its minutes, and at their end it stops and reports.
- **The wait for a review** (`issue-wait.sh`, up to 20 minutes) and **for a lock**. The tool reads
  the tracker. What a writer started (a Fly machine, a browser, a container) is in no call it could
  make with the writer's token: the post mortem's writer could not read `browser.all` or
  `container.all` with one. A flag by which the writer declares "nothing billed" to `issue-wait.sh`
  was weighed and not built: it would change the call of step 13 for a declaration nothing checks.
- **That `--nothing-billed` is true** is the writer's word. The tool holds that the word is given.

## The tests

`tests/tools/issue-ask.test.ts`, new, 11 tests, and `tests/tools/issue-watch.test.ts`, 28 tests on
`origin/main` at `a73d397d` and 32 now. Both files, run in the worktree at 23:52 CEST after the last
edit of either:

```
bun test --timeout=30000 ./tests/tools/issue-ask.test.ts ./tests/tools/issue-watch.test.ts     43 pass  0 fail
```

Against the files of `a73d397d` (`IMPLEMENTER=`, `SKILL=` and `ISSUE_WATCH_SH=` name a copy made with
`git show a73d397d:<path>`), and against the tool with one line changed (`ISSUE_ASK_SH=` names the copy):

```
the brief of a73d397d                                40 pass  3 fail   Before a wait; the tool's call in the brief; the line asks-still
SKILL.md of a73d397d                                 41 pass  2 fail   the section of the message; the line asks-still
the watch of a73d397d                                40 pass  3 fail   the two of --still (at the 30 s timeout: that script takes --still for a token and loops), the loop
the tool, minutes not held to 1..10                  42 pass  1 fail   "an ask with no time is refused, …"
the tool, no --runs read as nothing billed           42 pass  1 fail   "an ask that does not say what is billed … is refused, …"
the tool, a stop past the wait taken                 42 pass  1 fail   the same
the tool, no ISSUE_AS_TIME_AHEAD                     41 pass  2 fail   the comment's call; the real issue-as.sh
the tool, the label before the comment               39 pass  4 fail
```

What the tests of the tool give it: no minutes, `0`, `11`, `soon`, `22:31`, `5m`, `-5`; thirteen sets
of flags that say too little or two things, among them `--runs ""`, a `--since` of `25:00` and of
`an hour ago`, and `--stop-in 6` of a wait of 5 beside `--stop-in 5`; no ask, an ask of spaces, a
token with no role, an id with a space, `<n>` of `0`; an ask with an apostrophe; a `--since` later
than the clock (the day before's); a comment answered 403 (no label is sent), a label answered 403,
an empty answer, both keys used before, the comment's key used and the label's not, and
a token `issue-as.sh` does not keep. One test runs the tool through the real `issue-as.sh` against a
local server: both writes arrive, and the comment's body sent with `issue-as.sh` alone is exit 3.

The tests of the two texts hold that the sentences are there. Whether an agent or a session follows
them is not tested.

**A test that failed by the clock, and was mended.** The test through the real `issue-as.sh` first ran
with the machine's clock. At 23:50 CEST it failed: the wait's end was `2026-10-13 00:00:36`, and
`issue-as.sh` does not compare a time that stands beside another day's date, so the plain send was
not exit 3. Both clocks are now set in the test (`ISSUE_ASK_NOW`, `ISSUE_AS_NOW`). So the sentence of
the brief, "`issue-as.sh` refuses a body that names a time ahead of the clock (exit 3), and the wait's
end is one", is of a wait that ends the same day; in the last 10 minutes of a day such a body would
have been sent.

The whole suite, `tests/tools/suite.sh` in the worktree: the counts are in the comment of the submit,
from the run after the last edit.

## On cb4

- **A label moves `updated_at`**, which the line `asks-still` rests on. With this writer's token on
  its own issue, 23:38 CEST, a label of another name (`wait-check`), so that no watch printed it:
  `updated_at` 1791841012312 before (the `start`, 5219), 1791841095807 after the label was put on
  (5226), 1791841096969 after it was taken off (5227), and `list?label=wait-check` gave the issue
  with that `updated_at` between the two.
- **A `cost` event does not move it**: `get?id=asks-orchestrator-label-and-watch` at 23:37 had
  `updated_at` 1791840448119, the `at` of its `pass`, and a later `cost` event at 1791840499378. So
  "no event of the issue" in the line is "no event that moves `updated_at`".
- **The changed watch against cb4**, `issue-watch.sh impl-22ebca 5219 2` from the worktree for 7 s at
  23:47:52 CEST, before the rebase that brought in the line for a comment of an `out-` token: four
  lines, each a line of the script as it was (an open by another token, three submits), and none of
  `asks-still`. `list?label=asks-orchestrator&limit=100` answered `{"issues":[],"total":0,"more":false}`
  then, and `list?label=owner&limit=100` through `--still` printed nothing, exit 0.

## Not tried, not done

- **No ask was made with the tool on cb4.** The label wakes the orchestrating session, which answers
  over its whole context, and this change needed nothing of it. The tool's two writes were seen at a
  stand-in and at a local server through the real `issue-as.sh`; a writer's token putting the label
  on is events 5125 and 5126 of the first action.
- **No `asks-still` line was printed from cb4**: that needs the label on an issue for 5 minutes.
- **The line at 10 minutes in the loop.** The loop's test runs 4 s and sees one line, not two reads
  of it; that 5 and 10 minutes give two different lines is the test of `--still`.
- **The watch's second read fails** (cb4 not reached): then `--still` reads nothing and prints
  nothing, as the test of an empty answer has it. Not run in the loop.
- **An agent's comment on its own issue after its ask** moves `updated_at`, so the 5 minutes start
  again. Not held against.
- **An ask whose words name a time ahead** is sent, since the whole comment goes with
  `ISSUE_AS_TIME_AHEAD=1`. The check of `issue-as.sh` is off for the ask's own words.
- **The wait itself.** The agent still reads the label once a minute as the brief has it and takes
  the label off at `until`. A tool that waits and takes it off was not built.
- **`spec.md`, `digest.md`, `overseer.md` and the reviewer's brief** have no "Before a wait". The issue
  names the implementer's brief; the tool takes any token whose name has a role.
- **A watch armed before this landing** prints no `asks-still` until it is armed again.

## Prior art

Three searches of `knowledge.search?semantic=true` at 23:34 CEST: "agent waits while billed machine
runs stop before wait", "ask refused without a time until deadline label printed again", "message
asks agent to wait names a time not a condition". The post mortem was first or second in each
(scores 1, 0.791, 0.752). `doc:cloud-brain-tracker-trigger-rules` was first for the third (0.864): a
wait as data in the tracker, with a `when` and a `WAKE` line for the waiter's own token. The post
mortem had read it for this case ("The questions of the body", 2): "a writer's wait wakes the writer",
and a `when` reads an issue's state, labels, links and parts. Nothing of it was used here. Used: the post mortem, and the record
of `asks-orchestrator-label-and-watch` for the form of the watch's tests.
