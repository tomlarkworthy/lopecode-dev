# st-7-switch-and-texts: the texts for the loop as steps; the switch was not made

2026-10-13. Task 7 of `plan/cloud-brain-orchestrator-as-steps.md`, which the owner approved at event 5736.
Texts, one test file, two lines of a comment in `loop.ts`. No seed, no deploy, no program changed.

**The switch is not in this change.** No `tools/cloud-brain/loop.sh` and no `loop.ts run` without `--dry`
was run by this writer. The writers of `st-5-driver` and `st-6-a-day-beside-the-session` ran none either
(the record of each, "Not tried" and "What this did not see"), and comment 6488 of the issue, from a
session the owner is in, has: "Start no `loop.ts run` and no `loop.sh` without `--dry`". Whether another
session ran one is in no record this writer read. The texts say that the
first run is the owner's and that its first minutes are watched. Nothing below was seen of a driver that runs.

The writer is a `claude` process that `loop.ts start` began for the session `out-5bc2ed`, with the token
`impl-a2289e`, on one laptop (macOS, bun 1.4.0). `$W` is the worktree `…/.claude/worktrees/bm-orchestrator-as-steps`.
Times are CEST from `date`.

## What changed

| File | Change |
|---|---|
| `.claude/skills/brain-maintenance/rules.md` | a section "A session the owner is in"; "Two standing leaves of the orchestrating session" is "Two standing leaves of a session the owner is in"; "A token an approved spec names" has that session as the maker; Never names the three acts as that session's and no step's; "Which token" has a row for the driver, one for a judgment run and "The driver's line"; "Always" has the two pulls as the driver's too, and what makes a writer's worktree |
| `.claude/skills/brain-maintenance/SKILL.md` | "Run it" written again; "Runs" takes a line a run of the driver and has a line for 2026-10-13; three lines elsewhere that the change made untrue |
| `knowledge/working-with-cloud-brain-remote-lopecode-cluster.md` | the row of the loop names the driver, `loop.sh`, `status.md` and that it had not been started |
| `knowledge/calling-a-cloud-brain-from-this-checkout.md`, `knowledge/changing-and-deploying-a-cloud-brain-worker.md` | one line each: what makes an agent's token, and what makes a writer's worktree |
| `plan/cloud-brain-worker-machine-on-fly.md` | four "As amended" notes: part 1 "What starts", the head of part 2, T2, T4 |
| `plan/cloud-brain-orchestrator-as-steps.md` | part 5, "As built (`st-7-switch-and-texts`…)" |
| `tools/cloud-brain/loop.ts` | the line of its header that said nothing of the loop calls it yet |
| `tests/tools/st-7-switch-and-texts.test.ts` | new, 10 tests |
| `tests/tools/rules-md-philosophy-push-leave.test.ts` | the section's new name in 3 places, and the sentence "Both are made by a session the owner is in." |

`git diff --numstat origin/main -- .claude knowledge plan tests tools` has each file's lines.

## What the owner is asked to approve

The change to `rules.md` is his to approve (the spec, "What only the owner can do"). Three things in it
are this writer's reading and not a word of his or of the spec.

1. **A session the owner is in makes one of the three acts in a turn a message of his began, and not at
   a wake.** The spec says the acts "wait for a session he is in", and choice A as he was shown it
   (comment 5289 of `orchestrator-as-steps`) says "the three acts the session makes today while you are
   away … wait for a session you are in". Two readings: any session he opened, at any wake of it, which
   is what a `/loop /brain-maintenance` did before; or a session he is typing to at the time. The second
   was taken, by the first of the seven of `philosophy.md` as that file reads it: "A change that only
   narrows what a caller may do is taken." Its cost: after going back to `/loop /brain-maintenance`, a
   token an approved spec names, a post of the shell and a push of his quotes wait for a message of his.
2. **A pass by hand makes no pass while `loop` is held.** The spec has one loop a cluster, held by the
   lock (part 4), and the Fly spec has "A session that finds it held does no pass". `SKILL.md`, "Run
   it", says so, with `lock.sh show loop` as the read. A pass by hand takes no `loop`: that take is
   `fly-4-loop-files`'.
3. **His word for A is "Ok approve last 2".** He named no letter. The session that made the `approve`
   move for him read it as A and wrote so in the move's reason (event 5736). `rules.md` quotes the
   choice, his four words and that reading, in that order.

## What was not changed, and why

- **Steps 4 and 5 of `SKILL.md`** are written for the `Agent` call. The task names "Run it" and "Runs".
  "Run it" says a pass by hand starts its agents with `loop.ts start` and that the header of `loop.ts`
  holds where the two differ. Step 8 (the watch) is as it was, for a session's `/loop`.
- **The bodies of `fly-2-image-and-run-sh` and `fly-4-loop-files`.** The tracker has no call that changes a
  body (`agents/implementer.md`, "The tracker's write calls": six calls, none an edit). Each got a comment with this writer's token, 13:06: 6493 on
  `fly-4-loop-files` (key `impl/st-7-switch-and-texts/amended-fly-4`) and 6494 on `fly-2-image-and-run-sh`
  (`…/amended-fly-2`), which is `done` and closed and took the comment, answer 200.
- **`tools/cloud-brain/fly/run.sh`** starts `claude -p "/loop /brain-maintenance"` as `fly-2` landed it.
  That task is `done`. The note in the Fly spec gives the change to `fly-4-loop-files`.
- **Records and plans that name the section by its old name**: 7 files under `tools/cloud-brain/records/`
  (`git grep -l -F 'Two standing leaves of the orchestrating session' -- tools/cloud-brain/records`), and
  two plans that name it "Two standing leaves" (`plan/cloud-brain-answers-cut-and-not-said.md`,
  `plan/cloud-brain-page-modifications-how-they-are-kept.md`). Each is a record of its day.
- **`knowledge/calling-a-cloud-brain-from-this-checkout.md`**, two lines read and left: "Outside the loop is
  any session that is not the orchestrating session of `/brain-maintenance` and was not started by it", and
  the line that an `out-` comment "wakes the orchestrating session". Both hold of a session's loop. A
  sentence added to each was written and taken out: `tests/tools/ac-5-prose-names-the-two-shapes.test.ts`
  holds a section of that page before its 15,000th character, and the first whole run of the suite
  failed there at 15,328.

## Tests

`cd $W && bun test --timeout=30000 ./tests/tools/st-7-switch-and-texts.test.ts ./tests/tools/rules-md-philosophy-push-leave.test.ts`:
**18 pass, 0 fail** (10 and 8: `grep -c '^test('` of each file).

**Without the change** (12:55:17). The files the new test reads, as `git archive HEAD` has them, in a
directory of their own with the test beside them: 1 pass, 9 fail. The one that passes is the test of the
helper `section()`.

What the test holds beside the words of the texts: the notes of the two tokens as `loop.ts` makes them
(`driver:<host>`, `judgment:<issue>`), the ten parts of `status.md`, that `loop.ts` below its header has
no `yield` and no `fly.`, and that `run.sh` starts `claude -p`. So the "Not built" lines of the Fly notes
fail the test when one of them is built.

The whole suite, `env -u WORK -u SESSION -u LOOP_TOKEN -u LOOP_RUN -u LOOP_RUN_TOKEN -u LOOP_TS $W/tests/tools/suite.sh`:

| Ended | | |
|---|---|---|
| 12:57:35 | 1224 pass, 1 fail, 125 files | `ac-5-prose-names-the-two-shapes.test.ts`: 15,328 against 15,000, above |
| 13:00:08 | 1225 pass, 0 fail, 125 files | after the two sentences were taken out |
| 13:03:52 | 1225 pass, 0 fail, 125 files | after the line of the changing page |
| 13:08:35 | **1225 pass, 0 fail**, 125 files | after the last edit of a text the tests read ("Run it", the dry driver). Later edits are to this record |

## Searches

- The Brain, three (`knowledge.search?semantic=true`, as `loop-knowledge`): "driver of the issue loop
  started and stopped by the owner", "a session the owner is in makes a token an approved spec names",
  "worker machine on fly run.sh loop lock yield". The entries were the two specs this task edits and
  specs it does not change; nothing else bore on it.
- Where the change is spoken of elsewhere, each
  `git grep -n -F '<words>' -- knowledge 'plan/cloud-brain-*.md' .claude/skills/brain-maintenance 'tools/cloud-brain/*.md'`
  (13:04, before this file was added, which has each of the four): `Two standing leaves of the orchestrating session` 8 lines (7 records, and the note of this
  change in the spec); `/loop /brain-maintenance` 14 lines; `loop.sh` 28 lines; `the orchestrating
  session, before the spawn` 0.

## Not tried

- **The driver.** `loop.sh`, `loop.ts run` without `--dry`, a step that is not dry: none was run. Every
  sentence of "Run it" about what a running driver prints, holds or leaves is from the header of
  `loop.ts`, its tests and the records of `st-5-driver` and `st-6-a-day-beside-the-session`.
- **The reads "Run it" gives for the first minutes.** `lock.sh show loop` while a driver holds it, a
  `running` run of a `start` among a line's acts, `pgrep -a -f 'loop-run-<token>( |$)'` for a run a
  driver started: the last was seen once, by the writer of `st-6`, for a run a session started.
- **`status.md`.** No file of that name was in the main checkout (`ls`, 12:50): no step that is not
  dry has run there. Its parts are read from `loop.ts`.
- **A pass by hand with `loop.ts start`.** The session `out-5bc2ed` started this task's agents that way;
  a whole pass of `SKILL.md` made so was not.
- **`loop.sh --dry`.** "Run it" gives `loop.ts run --dry` for a dry driver. `metadev`'s `ENV_PASS` has 16
  names and no `LOOP_TOKEN` (`sed -n '22p' <root>/metadev | tr ',' '\n' | grep -c .`, and `grep -o 'LOOP[A-Z_]*'`
  of that line printed nothing); what `safehouse` does with a variable that is not named there was not tried.
- **Going back.** `/loop /brain-maintenance` after a driver, and `loop.ts ended` for a run that session
  did not start.
- **The Fly machine.** Nothing of the "As amended" notes was run there.
