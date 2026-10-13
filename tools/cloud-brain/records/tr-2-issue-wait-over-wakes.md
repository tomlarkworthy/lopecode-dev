# tr-2-issue-wait-over-wakes

Task 2 of `plan/cloud-brain-tracker-trigger-rules.md` (approved for the owner at event 4903 of
`tracker-trigger-rules`), part 3 of its design, the tool's half: `issue-wait.sh` writes a wait with
`issue.wait` and reads `issue.wakes`, and `issue-watch.sh` prints a line for a due wait. Written
2026-10-13 by `impl-7e7f45`; the `start` move is event 5769. No seed, no deploy. No brief names the
new forms yet: that is task 3 (`tr-3-briefs-and-queue`), and until it lands every waiter runs the old
form, which this change leaves as it was.

Commands below are run in the worktree `bm-tr-2-issue-wait`.

## What changed

| File | What |
|---|---|
| `tools/cloud-brain/issue-wait.sh` | Four forms more, told from the old one by a flag: `--when '<CEL>'` and `--left <state>` (a wait, then reads of `wakes?id=`), `--work`, `--remove`; and `--last`, `--no-round`, `--until <minutes>` beside the first two. The header has each exit. The old form (`<token> <id> <after seq> [seconds]`) and `--filter` run the lines they ran before |
| `tools/cloud-brain/issue-watch.sh` | A fourth read at each turn of its loop, `wakes` with no `id`, and a mode `--wakes <file>` that prints `WAKE <id> <when>` from one answer on stdin, as `--queue <file>` does for the queue |
| `tests/tools/issue-wait.test.ts` | 13 tests more, against a stand-in for `issue-as.sh` that keeps one issue's keys, wait, state and events in a file |
| `tests/tools/issue-watch.test.ts` | 4 tests more: `--wakes` (two), the loop, and the three texts below |
| `.claude/skills/brain-maintenance/SKILL.md`, step 8 | Two sentences, four lines: the watch also reads `wakes` and prints `WAKE`, and no step writes a wait yet |
| `plan/cloud-brain-worker-machine-on-fly.md` | It cites the watch by line; the `sleep` is line 111 now (`grep -n 'sleep "\$every"\|never exits' tools/cloud-brain/issue-watch.sh`: 5 and 111) |
| `plan/cloud-brain-tracker-trigger-rules.md` | Two notes "As built" in part 3, for the items of the next section, and a third in the row R3 of "How each requirement is known to be met", which said `--work` sends one call |

## Where it differs from the spec

- **`--work` is a read and a write.** The spec has it write `issue.state != "<the state the issue is
  in at this call>"` and also says "Each is one call". No one call gives the state. The tool reads
  `get?id=` and then writes. The other reading, a `when` that names both `in-progress` and `spec` and
  needs no read, was not taken: the table of conditions in the seed's "A wait" has the one-state form
  for a writer at work, and tr-3's queue will read these waits.
- **Exit 5 is "not live", which is wider than "past `until`".** `issue.wakes` leaves a wait out of
  both lists when it is past its `until`, when it was taken off, and when the same actor wrote
  another on the issue. The tool tells its own wait by the seq of its event (the answer of the write,
  which is the first event again for a kept key), finds it in neither list, and cannot tell which of
  the three happened. stderr names all three. Seen on cb4 for the third (run 5 below).
- **A refused wait is exit 64.** A `when` the tracker answers 400 for, an id it answers 404 for, and
  a key that another actor wrote (the answer has `duplicate: true` and no `event`) end the run after
  one call with the tracker's message. The spec has no exit for them. Exit 2 stays for a token that
  is not kept or a call answered 401 or 403. A 403 from a `wait` guard would read as an ended token;
  the default policy's guard refuses no token (the spec, part 1), and no such answer was seen.
- **Due, and `get?id=` gives no answer: exit 3.** The second line of exit 0 is `null` "when there is
  none", so a review that could not be read is not printed as `null`. The run goes on reading until
  its seconds end, prints nothing, takes nothing off (but with `--last`), and stderr says the wait is
  due. The next run finds it due at its first read.
- **`--work` and `--remove` are exit 1 when their write was not made**, with the status and the
  message on stderr. `--remove` with no wait there (404 `no such wait`) is exit 0: what the caller
  wanted is so.
- **A `remove` whose key was kept writes nothing, and says so.** The key is `…/remove-<after seq>`
  for the tool's own remove and for `--remove`, as the spec has it. So `--remove` after a run that
  took its wait off is answered `duplicate: true`. A wait written between the two (a `--work` with
  the same seq) then stands until its time; stderr says that. Seen on cb4 (run 8). No sequence of the
  spec's part 3 does this: there a remove is the last call of its seq.
- **The round is told from the state `get?id=` answers**, read after the due entry, and from the
  entry's `issue.state` when that answer has none.
- **`--until` takes 1 to 43200 minutes** (30 days, the service's `waitDays`), and `--no-round` is
  refused beside `--when`, where it would change nothing.
- **The role** in a key is the token's name up to its first `-`: `impl` for `impl-7e7f45`. For
  `issues-implementer-2`, one of the three old tokens, that is `issues`. Not run with one.
- **The watch knows a wait by its issue and the seq of its event**, and prints its line again when
  it is due after an answer without it, as a `QUEUE` line is. The spec says "once for each due wait".

## Tests

`tests/tools/issue-wait.test.ts`, the 13 new, each a row of "How each requirement is known to be
met" of the spec or a line of the section above:

- the first run writes the wait (its key, `when`, 25 minutes) and then only reads; exit 3 prints
  nothing and sends no remove;
- due: two lines, the entry and `null`, and the remove is sent; at `in-progress` with `--when` too;
- `--last` sends the remove at exit 3, and the next run of the same arguments is exit 5;
- a wait past its `until` is exit 5 after one write and one read;
- `--left` with the issue moved to `in-progress` by the third read: the second line is the review
  with the highest seq over `<after seq>` of three, one of them under it, whole; nothing is sent after `get`; stderr has the
  two commands. The same with `spec-review` and `spec`, and a `spec-` token's key;
- `--no-round` there, and `--left` at a pass: the remove is sent;
- the second run after a move, once to `done` and once to `in-progress`: run 1 is exit 3, run 2
  sends the same key, the stand-in keeps one wait event, and run 2 is exit 0 after one read;
- `--work` (a read, a write, 60 minutes, the note, in the place of the wait that stood) and
  `--remove` (one call);
- `--remove` with no wait, with a kept key, and both forms not written;
- `--until`, and the three refusals that are exit 64;
- 30 argument lists refused with no call;
- calls that are not answered: the write is sent again until it is read, unread reads are counted,
  a due wait whose issue is not read is exit 3;
- exit 2 for each of the three forms, for a token not kept and for 401 and 403.

`tests/tools/issue-watch.test.ts`: `--wakes` over four answers in a row; an answer that is not one
of `wakes`, a `when` of two lines, entries with no id or seq; the loop against a stand-in, which
asks `wakes` with no query more than once and prints one line; and SKILL.md, the Fly plan's two line
numbers read against the script, and the two notes of the spec.

**Without the change.** The two tools as they were at `23b7e9c0`, written to two files with
`git show`, and the tests of this change:

```
ISSUE_WAIT_SH=<old>/issue-wait.sh bun test --timeout=30000 ./tests/tools/issue-wait.test.ts     14 pass, 12 fail
ISSUE_WATCH_SH=<old>/issue-watch.sh bun test --timeout=30000 ./tests/tools/issue-watch.test.ts  37 pass, 3 fail
```

The thirteenth new test of the first file, the argument lists, passes on the old tool: it answers
64 for a flag it does not know. That second run was made before the test of the three texts was
added; that test was run alone with each text as it was (`SKILL=`, `FLY_PLAN=`, `TRIGGER_PLAN=` and
`-t "step 8, has the WAKE"`): `0 pass, 1 fail`, three times.

Counts, each from a run after the rebase and after the last edit of a tool or a test:

| Command | Result |
|---|---|
| `bun test --timeout=30000 ./tests/tools/issue-wait.test.ts` | `26 pass, 0 fail`, 216 expects |
| `bun test --timeout=30000 ./tests/tools/issue-watch.test.ts` | `41 pass, 0 fail`, 144 expects |
| `tests/tools/suite.sh` | 06:07:37 to 06:09:15 CEST: `1056 pass, 0 fail` in 106 files, 94.00 s |

## The tool against cb4

2026-10-13, 06:01:51 to 06:02:34 CEST (`date` before and after), with `impl-7e7f45` on this issue,
which was at `in-progress`. `iw` is `tools/cloud-brain/issue-wait.sh impl-7e7f45 tr-2-issue-wait-over-wakes`.

| | Command | Answer |
|---|---|---|
| 1 | `iw 5769 --when 'issue.state != "in-progress"' 20 --until 5` | exit 3 after 20.21 s, nothing printed |
| 2 | the reads of the next section | |
| 3 | `get?id=`, `issue.waits` | one wait, `holder` `secret:impl-7e7f45`, `seq` 5787, that `when` |
| 4 | `iw 5769 --work` | exit 0, `{"seq":5791,"key":"impl/tr-2-issue-wait-over-wakes/work-5769","when":"issue.state != \"in-progress\"","until":1791867734964,"note":"at work on the round"}` |
| 5 | run 1 again | exit 5: `the wait …/wait-5769 (event 5787) is not live: …` |
| 6 | `iw 5769 --remove` | exit 0, `{"seq":5792,"key":"…/remove-5769","remove":true}` |
| 7 | `iw 5770 --when 'issue.state == "in-progress"' 20` | exit 0 after 1.65 s. Line 1 the due entry, `"seq":5793`, `"issue":{"state":"in-progress","closed":false,"last":{"move":"start",…},"labels":[]}`; line 2 `null`. Then `issue.waits` of `get?id=` was `null` and the events had `…/remove-5770` at 5794 |
| 8 | `iw 5770 --remove` | exit 0, `"duplicate":true`, and stderr: `the key …/remove-5770 was kept before, so nothing was written now: …` |
| 9 | `iw 5771 --left in-review 20` | exit 0: the entry (`"seq":5795`), `null`, and stderr `tr-2-issue-wait-over-wakes is at in-progress: a round was sent back, and the wait stands as it is. Take the round: issue-wait.sh impl-7e7f45 tr-2-issue-wait-over-wakes 5771 --work   Leave it: … --remove`. No round had been sent back: the issue was at `in-progress` from its `start`, which the tool cannot tell from a `rework` |
| 10 | `issue-as.sh impl-7e7f45 wakes \| issue-watch.sh --wakes <file>`, twice | first `WAKE tr-2-issue-wait-over-wakes issue.state != "in-review"`, then nothing; the file had `tr-2-issue-wait-over-wakes 5795` |
| 11 | `iw 5772 --when 'issue.nope == 1' 20`, and with `caller.kind == "owner"` | exit 64 each: `the wait was refused [400] when: No such key: nope`, `… when: Unknown variable: caller` |
| 12 | `iw 5771 --remove`, again, and `iw 5773 --remove` | exit 0 three times: written (5796); `duplicate`; `no wait of this token stands on …: nothing to take off` |

Row 9 is a limit of `--left`: it is for a caller that left the issue in the state it names. A
caller that runs it on an issue it is working on is told a round was sent back.

**The watch's loop**, 06:04:50 to 06:04:59 CEST: a wait left due by `iw 5774 --left in-review 20`,
then `perl -e 'alarm 7; exec @ARGV' bash tools/cloud-brain/issue-watch.sh impl-7e7f45 5800 2`. Its
lines but the `QUEUE` ones: `WAKE tr-2-issue-wait-over-wakes issue.state != "in-review"`, once, in
7 s of a loop that reads every 2 s. Then `iw 5774 --remove`, exit 0.

These runs wrote nine `waits` events on this issue, 5787 and 5791 to 5796, 5800 and 5801, and no
wait stands (`issue.waits` of `get?id=` after the last).

## One read a waiter makes (R4 of the spec)

`/usr/bin/time -p tools/cloud-brain/issue-as.sh impl-7e7f45 <read>`, three runs each, 2026-10-13.
The first two at 06:02 CEST, with one wait of the token that was not due; the third at 06:06:33:

```
wakes?id=tr-2-issue-wait-over-wakes    0.32 0.34 0.29 s      162 bytes
wakes (no id, the watch's read)        0.47 0.31 0.42 s      162 bytes
sync?after=5769 (the old form's read)  0.44 0.38 0.42 s   45,128 bytes, 35 events behind
```

The spec measured the old read at 0.36 to 0.51 s and about 134,000 bytes, 79 events behind
(2026-10-12). The time of a read is the same within what three runs show. The bytes are not: the old
read grows with every event of any issue since the submit, and the new one has the caller's waits.
`wakes` with no `id` is under the spec's "Not tried", since it "loads every row": these three runs
are that read. How many rows the tracker had then was not read; the read with an `id` had answered
`seq` 5790 just before.

## Not tried

- A run of 240 s, a fifth run with `--last` after four, and the sequence of a real round (a wait,
  `--work`, a submit, a wait with `--no-round`, a second `changes`) on cb4. The stand-in has each
  part; tr-3 puts the sequence in the brief and in the module's rig.
- A review on cb4 as the second line: no review of this issue existed when the runs were made.
- A wait past its `until` on cb4. In the stand-in it is in neither list, as the seed's prose says.
- A token ended while it waits, a 403 from a `wait` guard, and an old token's role.
- A call cut by its timeout. `call` gives each 30 s at most and what is left of the seconds and 30;
  the old form's test of that bound was not written again for the new forms.
- `--work` on an issue whose state is not one of a round (`done`, `in-review`): it writes the wait
  for whatever state it reads.
- `--until 43200` on cb4: the tool takes it, and the service judges "at most 30 days" by its own clock.
- An id of more than 40 characters, which the tool refused before this change too.
- What the watch's two temp files are left as when it is killed by a signal it has no trap for.
  The trap removes four names where it removed two; the runs above ended by `alarm`.
- The `WAKE` line with a wait of an orchestrating session: no step of `SKILL.md` writes one.
