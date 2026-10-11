# The snapshot opens the day's digest task

2026-10-11, in a session with Tom. He asked why no second research note had been sent, and then:
"we should automatically file a task in the issues to run the research summary. Then our claude
can process it automatically".

## What was found first

Read 2026-10-11 08:29 to 08:40 CEST from cb4's public files and this checkout.

```
snapshot 2026-10-10  ranAt 06:00:42Z  129 items  12 papers  reddit 429
snapshot 2026-10-11  ranAt 06:00:38Z  156 items   3 papers
/library/research-2026-10-09  200      /library/research-2026-10-10  404      -2026-10-11  404
RemoteTrigger list: []                 CronList: no scheduled jobs
```

The snapshot ran each day. Nothing asked for a digest: the first one was written by a session
(`digests/README.md`), and its summary to Tom was drafted and not sent. arXiv's feed held 0 items
on both days (`of: 0`), a Saturday and a Sunday; whether that is the weekend or a fault is not
known until the run of Monday 2026-10-12.

## What changed

`brain-snapshot.ojs`. `run()` calls `issue.open` as the Worker once the day's files are written
and before the index, and puts the answer in the index as `issue`:

```
{ key: "snapshot/<day>/digest", id: "digest-<day>", kind: "task", about: "brain-x-snapshot", labels: ["digest"], title, body }
```

- The key is the day's, so a second run that day opens nothing. A run that kept no items opens
  none (`{ skipped }`). A Brain with no tracker gets `{ error }` and a whole run.
- The body is the run's facts: day, `ranAt`, counts, two addresses, each source that failed. It
  does not say how a digest is written, because the Worker runs on any Brain and the method is
  a brief of this checkout's loop.
- No access rule changed. `issue.open` already lets a Worker in
  (`caller.kind in ["owner", "token", "worker"]`), and the task workflow's `open` guard is `"true"`.
- Not built: a setting to switch it off. Removing the call is a deploy.

Rejected: opening the task from the timer only. A day whose timed run failed would get no task
from the owner's `snapshot.run`, and the key already stops a second one.

The loop: `agents/digest.md` (the writer), two rows in step 3 of `SKILL.md` with a section "The
daily digest", and "A digest" in `agents/reviewer.md`. None of the three has been run by a loop.

## A test that put the Worker back

`brain.ts state` at 08:45 read `brain-x-snapshot: rolled-back 5cbec0bab498 its tests failed:
test_the_panel_lists_the_days_and_the_sources_of_one`, expected 2, received 1. The test waited
50 ms after a click for a redraw; the deployer's browser put the Worker back on it twice that
morning (`records/reference-holes-four-more-workers.md`). Any deploy of this Worker would have
been put back the same way. The test now waits for the redraw's `input` event.

## Measured

```
test.ts brain-x-snapshot --with <built>     9 passed, 0 failed, 1 needs a browser
QA tab, the worktree's notebook             10 tests, 0 failed (run twice, once before the panel fix)
08:46:55  apply                             64a036e75bf4 verified, 10 tests, 24359 ms
          redistil                          brain-x-snapshot same 64a036e75bf4
06:48:14Z snapshot.run, the owner's session 158 items, 3 papers; issue digest-2026-10-11, event 379
```

Event 379 as the tracker gave it back: `opener: "worker:brain-x-snapshot"`, `state: "open"`,
`labels: ["digest"]`, `by.caller: "worker:brain-x-snapshot"`, `origin.caller: "owner"`. That run
replaced the files of the 06:00:38Z run of the same day. Event 380 is a comment that the digest
also covers 2026-10-10, for which no task exists.

## Not tried

- The timer's own run opening a task on cb4. The first is 2026-10-12 06:00 UTC. In the tests it
  does (`test_a_run_that_kept_items_opens_one_task_for_the_days_digest`).
- A second `snapshot.run` on cb4 the same day, to see `duplicate` answered by the real tracker.
  The rig answers as the tracker's reference says it does.
- A pass of the loop over `digest-2026-10-11`.

## What still stops a digest reaching Tom

1. `library.put` is `allow: "caller.session", fixed: true` (`brain-library.ojs`). A token cannot
   publish, and `rule.put` refuses a fixed rule. Read in the seed; no call was sent.
2. `rules.md`, Never: "Send a WhatsApp or Bluesky message." The summary is a Bluesky DM.
3. The loop has not run since Tom stopped it on 2026-10-10 at about 21:25 CEST. A task waits in
   the tracker until a session runs `/loop /brain-maintenance`.
4. `digests/keep.ts` calls with `--owner`.

## After the fresh review, 2026-10-11

`/review-notebook` on the module, `agents/digest.md` and this record: FIX, FIX, CLEAR. 4 findings
on the module and 5 on the brief, each checked against the source and all taken.

- The run's log line has `issue` when the tracker refused. Before, a refusal was in `index.json`
  alone, and the timer does not run again that day.
- An answer that names another issue is `{ error: "issue.open answered <id>" }`: the tracker
  answers a held key with the event that holds it, and the index would have named that issue as
  the day's task. Not met on cb4; the rig's `held` shows it.
- Prose: the count of calls in one run names `knowledge.put` and `issue.open`; `issue` is in
  indexes since 2026-10-11; a refusal has more causes than a Brain with no tracker.
- The brief: a `file://` page cannot read `/static`, so the built file gives two numbers and the
  library address four; the 2026-10-09 seed's loader reads `arxiv.json` whole and never
  `papers.json`; the built file is copied out before the worktree goes; counts come from
  `index.json`, not the issue's body; keys are `digest/digest-<day>/<what>`.

The reviewer could not open a browser (`chromium_headless_shell-1200` is missing), so it did not
run the panel test. 10 tests, 0 failed, in a QA tab of this session on the fixed build.
