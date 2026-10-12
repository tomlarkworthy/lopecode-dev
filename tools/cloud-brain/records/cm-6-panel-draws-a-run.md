# cm-6-panel-draws-a-run

Task 6 of `plan/cloud-brain-run-cost-is-part-of-the-issue-model.md` (approved for the owner at
event 2610), its requirement R5: the tracker's panel draws a run as a line of the issue, and the
totals of the open issue. Written 2026-10-12; the seed's commit reads 02:53:54 +0200
(`git log -1 --format=%ci`, before the rebase of the landing). A deploy of `brain-x-issues`.

On cb4 no issue has a run yet: `issue-as.sh impl-1be9d6 "runs?limit=1"` answered
`{"runs":[],"total":{"runs":0,…},"more":false}` on 2026-10-12, before this was built. So nothing of
this change is drawn on cb4 until task 4 (`cm-4-enter-the-runs-again`) writes the events. Everything
under "Tests" was seen on a rig, in a headless Chrome of this machine. Task 4 wrote its events while
this landed; "On cb4, after the deploy" has what the deployed cells make of them.

## What changed

`tools/cloud-brain/brain-issues.ojs`:

- Four new cells with no I/O. `issueCount(n, of)`: a whole number with a comma at each thousand,
  and with `of` a noun after it, plural unless `n` is 1. `issueUsageSaid(u)`: the five sums and the
  advisor's calls of a usage or of some totals. `issueRunSaid(e)`: a run as one line.
  `issueCostSaid(c)`: the totals of `issueCost` as one line.
- `said` in `issuesPanel`: an event of type `cost` is `issueRunSaid(e)`. Before, it fell to
  `e.body || ""` and drew as its type with nothing after it.
- `drawOne` in `issuesPanel`: under the links of the open issue, when the row has a run, one
  element `<div data-cost=N>` with the word `cost` and `issueCostSaid(issueCost(i.runs))`. `N` is
  the count of runs. It is made from the row of the page's copy, not from `cost` of `issue.get`.
- Each line of the open issue's events has `data-event=<type>`. The test reads the `cost` lines by it.
- The block "For your attention": where a waiting issue has no comment the row shows its last
  event. That is now the last event that is not of type `cost`.
- The first `md` cell: what the two lines read, in "A row", and the passing over, in "For your attention".
- Two new test cells, `test_issues_cost_is_said_as_a_line` (no page) and
  `test_issues_panel_draws_a_run_and_the_totals` (a panel on a rig).

`plan/cloud-brain-run-cost-is-part-of-the-issue-model.md` has an "As built" note under "The page (R5)".

The two lines, as the tests have them:

```
implementer round 2, resumed, in-review · 410 s · context 201,310 · billed in 61, written 141,873, read 3,561,349, out 17,885, 29 requests · advisor 2 calls · replaces 1203
cost 3 runs · 1,820 s · 2 with a usage: in 122, written 283,746, read 7,122,698, out 35,770, 58 requests · advisor 4 calls · $0.3 of 2 runs
```

The first is the spec's own example, character for character, with `replaces 1203` after a ` · `.

## Where the spec is silent, and what was taken

Each by line 2 of `philosophy.md` ("take the side that is smaller and easier to undo").

| Open in the spec | Built | Why |
|---|---|---|
| A run sent with no `usage` | `no usage` where the sums are | 33 of the 288 runs of the spec's count have none. A line that stops at `context` reads as a run that billed nothing |
| The advisor at 0 calls | Left out | The spec's example has it at 2. 0 says nothing |
| `usd` of a run | `$N` after the sums, the number as it was sent | The field is in the event and is the one figure a light reviewer reports of itself |
| `how` when it is `fresh` | Written, as `resumed` and `light` are | One shape of line |
| The totals of an issue with no run | No line | Most issues have none before task 4, and a line of zeros on each says nothing |
| What the totals line has | The runs, the seconds, how many runs have a usage and their sums, the dollars and of how many runs | `issueCost` as it is. `byRole` is not drawn: the spec asks for one line |
| Where the totals come from | The row's `runs` in the page's copy | The spec: "from the row". It is drawn with the issue, before `issue.get` answers |
| How a number is grouped | A comma at each thousand, by a regular expression | `toLocaleString()` writes what the browser's locale has, and the tests hold the text |
| `tools`, `event`, `of`, `agent`, `session`, `token`, `backfilled` | Not drawn | Not in the spec's line. `issue.get` and `issue.runs` answer them |
| A waiting issue with no comment whose last event is a `cost` | The block shows the event before it | The spec speaks of `brain-feedback`'s `lastOf` alone, which passes a `cost` event over. With `said` drawing the event, the row of an issue that waits for an answer would show what a run cost as the last thing said. `issueApply` leaves `updated_at` for the same reason: "What a run cost is not work on the issue" |

The last row goes past "said and the totals line". Undone it is one expression, `events.at(-1)`.

## Tests

Each count is from the command beside it, run in the worktree after the last edit of the seed
(the build is of that seed; `…` is the worktree's `tools/cloud-brain/.emitted`).

| Command | Result |
|---|---|
| `cd cloud-brain-dev && bun test.ts brain-x-issues` (what cb4 runs, hash `1ca0115693d0`) | `passed` 26, `failed` 0, `needsBrowser` 14 |
| `bun test.ts brain-x-issues --with …/cm-6-panel-draws-a-run.js` (the build) | `passed` 27, `failed` 0, `needsBrowser` 15 |
| `bun tools/cloud-brain/tab-tests.ts …/cloud-brain.html @tomlarkworthy/brain-issues` (Chrome 151.0.7922.34) | `tests` 42, `passed` 42, `failed` [] |
| `BRAIN_BASE=cb4 bun tools/cloud-brain/verify-run.ts brain-x-issues --shell …/cloud-brain.html --times 20` | `runs` 20, `passed` 20, `failed` 0, `none` 0, `byChance` [], `from` ["document"]; `"tests":42` in each of the 20 lines |

42 is 27 and 15. `test_issues_cost_is_said_as_a_line` is among the 27, and
`test_issues_panel_draws_a_run_and_the_totals` among the 15: `issuesPanel` names `location`.

**The tests fail without the change.** The panel test was written first and run alone on the seed
with no other change, then four lines of the change were altered one at a time, each one build and
one `tab-tests.ts`:

| The seed | `tests`, `passed` | Which failed |
|---|---|---|
| the panel test and nothing else | 41, 40 | `…panel_draws_a_run_and_the_totals`: "Cannot read properties of null (reading 'dataset')", no totals line |
| the block shows `events.at(-1)` | 42, 41 | the same test: `"cost"` where `"opened"` is expected |
| no `cost` branch in `said` | 42, 41 | the same test, at the two lines of the runs |
| no `replaces` | 42, 40 | both new tests |
| the totals line drawn for every issue | 42, 38 | the same test and three older panel tests, whose issues have no `runs` |

The first run of `test_issues_cost_is_said_as_a_line` failed on the change itself: the grouping as
first written gave `1,234567` for 1234567. The expression was replaced and the test left as it was.

What the panel test holds, on a rig with a token writing the runs and the owner's panel reading:

- An issue with two runs, one with a usage and a `usd`: the totals line with `data-cost="2"` and
  its whole text, drawn before `issue.get` has answered; then two lines of the events, each whole.
- The run with no usage written again with one, by another caller, while the issue is open: after
  one `sync` a third line that ends `replaces N`, `N` the seq of the first, and the totals still of
  two runs, now both with a usage.
- An issue with no run, opened next: no element `[data-cost]`.
- An issue labelled `needs-owner`, with no body, no comment and a `cost` event last: its row in the
  block has one line, of type `opened`.

## On cb4, after the deploy

The apply answered `"state":"verified","tests":42` for hash `0f7eb7a35b38` (32.7 s): the deployer
ran the 42 tests in the cluster's browser. `bun sync.ts … && bun test.ts brain-x-issues` after it:
that hash, `passed` 27, `failed` 0, `needsBrowser` 15.

Between 02:57:21 and 02:58:11 CEST on 2026-10-12 (`date` before the first call and after the
second) `runs?limit=1` answered `total.runs` 300 and then `runs?limit=500` answered 362 runs:
another writer was entering them. The page was not opened (it needs the
owner's session). In its place the text cells of the deployed module were run over what cb4
answered: `getSource?worker=brain-x-issues` written to a file, loaded with
`tools/notebook-import.ts`, and `issueRunSaid`, `issueCost` and `issueCostSaid` called on the
answers of `get?id=record-first-resumed-rework-round` and `runs?limit=500`, both read with the
writer's token. The script was in the session's scratch directory and is not kept.

```
cost 8 runs · 2,004 s · 8 with a usage: in 251, written 902,028, read 10,607,797, out 113,376, 116 requests · advisor 7 calls · $8.96 of 4 runs
8 cost events; 8 runs
implementer round 1, fresh, in-review · 514 s · context 128,564 · billed in 61, written 119,786, read 2,850,853, out 26,352, 28 requests · advisor 2 calls
reviewer round 1, light, changes · 290 s · context 87,067 · billed in 30, written 76,302, read 927,944, out 16,225, 13 requests · advisor 2 calls · $2.97
362 runs read; 0 lines with undefined, NaN, null or [object; 33 no usage; 160 longest
all: 362 runs · 198,111 s · 329 with a usage: in 19,373, written 41,881,263, read 925,042,922, out 7,352,214, 7,883 requests · advisor 358 calls · $215 of 125 runs
```

The first line has the four numbers of the spec's check of R3 (8 runs, 2,004 s, 10,607,797 read,
7 advisor calls). It is the text the totals line would have for that issue, not the line as the
page draws it.

## Not tried

- The page on cb4. No tab was opened, here or in the cluster, and the two lines were not looked at
  by eye on any page: the tests read their text.
- A browser other than Chrome 151 for the panel test. The deployer's is Chrome 128 and runs the
  tests in the apply, which answered `verified` with 42.
- The width of the lines on the page. The spec's example with `replaces 1203` is 172 characters
  (`len()` of the string in Python), in a `div` with no style of its own; whether it wraps well in
  the panel was not looked at.
- A `cost` event that is pending in the panel. The panel has no control that sends one.
- An issue with more runs than 2 in the panel, or totals over 1,000 runs. `issueCount` is tested to
  628,778,702 with no page.
- A `usd` with many decimals. It is written as the number is; a run's is as sent, and the totals'
  is `issueCost`'s sum, to a millionth.
- A tab that was open before the deploy. It has the module it loaded, and draws a `cost` event as
  its type alone until it is loaded again ("A newer panel is deployed", with Reload).
- A number that is not whole, or below 0, in `issueCount`. The service refuses both in a `cost` event.
