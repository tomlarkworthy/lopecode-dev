# A `related` link between two open notes is no tie, and the owner's finished notes go to the orchestrator (`owners-feedback-held-by-related-links`)

Round 1, by a writer of the issue loop on 2026-10-12, started at event 4315 (20:41 CEST). No seed, no
deploy: `tools/cloud-brain/issue-stats.ts`, two texts of the loop, and three notes in a spec.

## What was there

The overseer filed it at event 4269: three feedback issues of the owner's had waited at `open`, two of
them 21.3 h at event 4252, in neither list of `issue-stats.ts`. The tool before this change, on the
record as it was at event 4295 (run 20:43 CEST from the main checkout):

```
bun tools/cloud-brain/issue-stats.ts --token impl-ceaa5a --until 4295
feedback       30 open, 86 with a parent or a link
feedback due to be closed, each tie done or closed: 0
feedback of the owner's with no tie, to promote: 0
```

`--until 4295`, because the orchestrating session promoted two of the three by hand at events 4296 and
4298, before this round began. The record at a later event no longer has the case.

What held each, read with `get?id=` at 20:42 CEST:

- `health-chart-not-useful-remove`: its own `related` link to `dashboards-share-series-and-controls`
  (2174), a project at `done`; and `related` links made to it by `services-chart-near-the-top` (2001)
  and `health-dashboard-three-panels-stale` (2543), both feedback at `open`. Two live ties, so not due;
  a tie, so not to promote.
- `services-chart-near-the-top`: one tie, its own `related` link to the note above.
- `specs-kept-in-the-cluster`: labeled `needs-owner` (4097). Neither list has such an issue, before or
  after. This change does nothing for it.

## What changed

**The tie.** In `issue-stats.ts` a `related` link whose other end is a feedback issue at `open` of the
feedback workflow is no tie, from either end. Every other link is one, as before: `cause`, `duplicate`
and `after` to such a note, `part-of` (the parent), `related` to a note that is closed or promoted, and
any link to an issue the token is not shown (its kind is not known to the tool, so it stays a tie and
the note stays where it is). The fold kept the target of a link and dropped its rel; it keeps both now,
and a link taken off is matched by rel and target, as the tracker does (`brain-issues.ojs`, line 560).

`after` is not in the issue's proposed text. It is kept as a tie: the rule drops one thing, a `related`
link between two open notes, and a note that says it comes after another is not that.

**The owner's.** One of his with each tie at `done` or `closed` was in `due`, the overseer's list,
marked "the owner's", and the overseer's brief had it closed only when the finished work could be
named, and left with a comment otherwise. That is where `health-chart-not-useful-remove` would have
stayed with the tie fixed alone: its project was `done` and the chart was still drawn. Now:

- `feedback.toPromote`: the owner's, with no tie or with each tie at `done` or `closed`. A `held:`
  comment does not take one off it. Each row is `{ id, ties }`; it was a list of ids.
- `feedback.due`: not the owner's. Its rows lost the field `owners`.

Whether a finished tie did what he asked is not something the tool reads. The orchestrator judges it
at the row: promote when none did, close with the commit named when one did. The alternative was to
leave the judgment with the overseer and have it mark a note for promotion with a comment the tool
reads. That keeps the ask at `open` until the next oversight and adds a second marker beside `held:`;
`philosophy.md` line 4 (what he asked does not wait) and line 2 (the smaller side) decided against it.

The tool after the change, on the same record (20:43 CEST):

```
ISSUE_AS=<root>/tools/cloud-brain/issue-as.sh bun $W/tools/cloud-brain/issue-stats.ts --token impl-ceaa5a --until 4295
feedback due to be closed, not the owner's, each tie done or closed: 5
  seen-bun-test-matches-other-worktrees    tests-tools-fail-in-a-fresh-worktree done
  seen-assembled-races-verdict             verify-run-shell-runs-deployed done
  seen-any-token-takes-annotation-off      annotations-file-feedback done
  seen-assembled-asks-again-in-a-loop      verify-run-shell-runs-deployed done
  health-dashboard-three-panels-stale      fb-a2oogpkdjb done, fb-a2g3jyhecp done
feedback of the owner's with no tie, or each tie done or closed, to promote or to close: 2
  health-chart-not-useful-remove           dashboards-share-series-and-controls done
  services-chart-near-the-top              no tie
```

The five answer the issue's "Not known": at event 4295 five feedback issues that are not the owner's
were kept from `due` by nothing but `related` links with open notes. They were counted, not read.

**The texts.**

- `SKILL.md`, the row for `open`, kind `feedback`: the tie, both cases of the owner's (promote, or
  close with the call), and the new names of the two lists.
- `agents/overseer.md`, "Feedback that is due": the tie, and "One that is the owner's is the
  orchestrator's, not yours".
- `plan/cloud-brain-bookkeeping-in-the-tracker.md`: the two `promote` rows (the service's and the
  procedure's) and the sentence after part 5 each gained an "As built" note. The owner approved those
  sentences, so they stand. `bk-3-queue-and-hold` builds the queue's `promote` row from them and was at
  `triaged` when read before this round's start: nothing of the queue is built, and this change builds none of it.

## Tests

`tests/tools/feedback-closed-or-promoted.test.ts`, which had the fixture, gained 21 notes and 3 tests
(8 before, 11 now); its tests of the lists' rows, of the printed lines and of the two texts were changed to the new form.

```
bun test ./tests/tools/feedback-closed-or-promoted.test.ts                       -> 11 pass, 0 fail
ISSUE_STATS_TS=<issue-stats.ts of origin/main> SKILL=<SKILL.md of origin/main> \
  OVERSEER=<overseer.md of origin/main> bun test ./tests/tools/feedback-closed-or-promoted.test.ts   -> 2 pass, 9 fail
tests/tools/suite.sh                                                             -> 673 pass, 0 fail, 67 files (21:01 to 21:03 CEST)
```

A first run of the suite, begun about 20:46 CEST with its output through `| tail -6`, had not ended at
21:01: one worker process was left, with no child. It was killed and the run above made with the output
to a file. What it waited on was not found.

## Not done, not tried

- No call to promote or close was made: the two of the owner's were promoted by the orchestrating
  session before this round, and the five due ones are the next oversight's.
- The owner's with a tie at `rejected` or `reverted` is in neither list, as before
  (`owners-rejected` in the fixture). Nobody did what such a note asks, and nothing lists it.
- `issue-stats.ts` was run on the live record at events 4295 and 4315, and on no other.
- The tool's `gathered` count ("with a parent or a link") still counts every link.
- `oversight.md` and `records/feedback-closed-or-promoted.md` name the lists as they were when they
  were written, and were not changed.
- An issue linked twice with the same rel is one link now (the tracker's fold does the same); no test
  of that alone.
