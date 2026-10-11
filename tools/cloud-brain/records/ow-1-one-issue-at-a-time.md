# ow-1-one-issue-at-a-time

2026-10-11. Task 1 of `plan/cloud-brain-owner-acts-on-what-waits-for-him.md`: the block "For your
attention" of the tracker's panel (`issuesPanel`, `tools/cloud-brain/brain-issues.ojs`) shows one
waiting issue at a time. The seed's commit is the first ref of the issue's submit; it was first made at
2026-10-11 22:05:36 +0200 (`git log -1 --format='%h %ci'`, before the rebase onto `main`). The panel only: no handler, SQL or policy of the service changed.

## What the owner said

His note on the page, 2026-10-11 20:40:18 CEST, quoted in event 1998 and in the spec: "In For Your
Attension, I would prefer if we had a single issue open at a time with a forward/back scrubber and
make it much bigger coz currently it gets squeezed in the scroll boz and all the items are open and
blurring together ."

## What changed

| | before (`3848a5f1`) | now |
|---|---|---|
| What is in the block | a row for every waiting issue, under a heading for each group | the row of one issue |
| Its first line | `For your attention` and the count | `For your attention`, `‹ back`, the place (`2 of 5`), `forward ›`, then each group that has an issue with its count, the shown issue's group in bold |
| An event under a row | `white-space:pre-wrap;max-height:7em;overflow:auto` | `white-space:pre-wrap` |
| A row that is not shown | did not exist | stays in the panel's `rows` map, out of the document, with its box |
| On the panel | `attention` | also `waiting()` (ids in order), `shown()` (the id, or `null`), `scrub(id)` |

Which issue is shown (`at` in `drawWaiting`):

- The first, when none was shown.
- The same one while it waits, whatever comes to wait before it; the place counts on.
- When it stops waiting, the issue now at the index it had, which is the one that was after it; past
  the end, the last.
- A press on the shown issue's own row that takes it out of the block (approve, reject, take
  needs-owner off, the label half of Answer) shows the next one while the write is on its way. If
  the issue waits when that press has been answered, it is shown again. This is the spec's "the
  refusal is in front of him with his text".
- `scrub(id)` of an id that does not wait, or of none, changes nothing and answers the id shown.

The head of the block is made once and its parts are written to. A pressed button that is still
enabled keeps the focus: seen in the QA tab on a panel with three issues, `scrub("q3")`, focus and
click on back, answer `["q2", true]` (the id shown, `document.activeElement === back`). At an end
the button is disabled and the focus leaves it.

Two readings where the spec left room, taken under line 2 of `philosophy.md`:

- The spec says "the four group names each with its count". A group with no issue is not named, as
  before: its own test lists three for five issues, and "Not shown to this caller (0)" would be on
  the owner's page always. Not taken: all four, which would keep the line the same length.
- The buttons read `‹ back` and `forward ›`. The spec names the `data-scrub` values and no text.

Searched in the Brain first (`knowledge.search?semantic=true`): "for your attention block one issue
scrubber", "panel row kept out of document caret kept refused write", "pager back forward one item
at a time panel". Found the spec, `module:mbostock:scrubber` (a player that steps a value through a
range on a timer; this is two buttons over a list of ids, so not imported) and the two records
`attention-block-unreadable-to-owner.md` and `panel-for-your-attention.md`, both read for what a panel test waits on.

## Tests

`grep -c '^test_' tools/cloud-brain/brain-issues.ojs`: 33 (32 before). `grep -c 'data-scrub'`: 4 (0
before). `grep -c 'max-height:7em'`: 0 (1 before).

New: `test_issues_panel_attention_shows_one_issue`. Changed, to read the one row and to show
another with `panel.scrub(id)`: `test_issues_panel_lists_what_waits_for_the_owner`,
`test_issues_panel_attention_rows_say_what_is_asked`, `test_issues_panel_keeps_the_caret_in_a_row_box`,
`test_issues_panel_a_refused_write_gives_the_row_back`. `test_issues_panel_a_second_press_writes_once`
is the fifth test the spec names; it has one issue, which is the one shown, and was not changed. In no test
does a helper that is polled call `scrub`: a read that moved the block would make `shown()` true by reading it.

The new test was written first. The snippet of step 8 of `agents/implementer.md` in a headless QA
tab (Chrome 151) on a build of the seed with the test and without the change:

```
[33,["test_issues_panel_attention_shows_one_issue panel.waiting is not a function"]]
```

It stops at its first line there, so that run does not show that its later lines fail on five rows.

After the change, the same snippet, first thing run in a fresh tab on the build of the seed as committed: `[33,[]]`.

A build with the one expression that shows the issue of a refused press again taken out
(`&& (at = i.id)` made `&& false`), same snippet in a fresh tab. That build was of the seed a step before the one committed, when `fell` was one id and not a set; the expression and the tests were the same:

```
[33, [test_issues_panel_a_refused_write_gives_the_row_back, test_issues_panel_attention_rows_say_what_is_asked]]
```

both on `expect(received).toBe(expected)`, `Expected: true`, `Received: false`.

The rebase onto `main` (`8c837a66`) brought in `cloud-brain.ojs`, which this module imports from, so
the three runs below were made again on a build of the rebased worktree, 2026-10-11 22:06 to 22:07
CEST (`date`). They are the counts submitted.

`cd cloud-brain-dev && bun test.ts brain-x-issues --with <the built module>`: `passed 21, failed 0,
needsBrowser 12`. The 12 are the panel's tests (`location is not defined`), the new one among them.

`bun tools/cloud-brain/tab-tests.ts tools/cloud-brain/.emitted/cloud-brain.html @tomlarkworthy/brain-issues --emit issues_service=…`:
`tests 33, passed 33, failed []`, exit 0.

`BRAIN_BASE=cb4 bun tools/cloud-brain/verify-run.ts brain-x-issues --shell <the build> --times 20`,
last line: `runs 20, passed 20, failed 0, none 0, from ["document"], byChance []`; `mains` of its
first line starts with brain-shell. Before the rebase the same command gave the same line, with
`tests: 33` in the first and the last run's line, which is 21 + 12.

The three runs in a paired QA tab above were made before this session had read that a writer's
paired tab wakes the orchestrating session (`records/writers-qa-tabs-wake-the-orchestrator.md`,
which landed while this was written); `tab-tests.ts` is the tool for it now.

Of the brief's cases for a control that writes, where they are held now that one issue is shown:
a second press before the answer (`…a_second_press_writes_once`, unchanged, and Answer in
`…rows_say_what_is_asked`); a refused write that had taken the issue out of the block
(`…a_refused_write_gives_the_row_back`: `shown()` is `r2` while the write is on its way and `r1`
after the refusal; the same for a refused move, and for the label half of Answer in
`…rows_say_what_is_asked`); two answers out of order (`…a_refused_write_gives_the_row_back`, with
the second press made after `scrub` to the other issue, and `shown()` unchanged by a comment that
is taken); another caller's event while the box has the caret (`…keeps_the_caret_in_a_row_box`: on
the shown issue, on the issue after it, and an issue that comes to wait before it).

## Not tried

- The block on the owner's page with the issues that wait there, at his window. The loop does not
  open cb4's page. What was looked at: a panel on a rig of three issues, 900 px wide, in the QA tab;
  a 30-line comment drew 765 px high with `scrollHeight` 765.
- Whether "much bigger" is met. The height limit is gone and the block holds one issue. No font or
  width was changed. It is in the owner's list in the spec.
- A back or forward press made between a press that takes an issue out and its refusal. By the code
  the refused issue is shown again over the one he went to; no test holds it.
- Two refusals that land one after the other: by the code the later one is shown.
- A press on back or forward while the shown box has the caret, and keys: the box is taken out of the
  document and the focus with it; the text is kept (held by the new test), the caret is not.
- A panel of a caller who is not the owner with several hidden issues: one hidden row is read by
  `…lists_what_waits_for_the_owner`.
- Chrome 128, the cluster's browser, before the deploy. The deployer runs the tests there after it.
