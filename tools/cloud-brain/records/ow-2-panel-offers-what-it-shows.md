# ow-2-panel-offers-what-it-shows

2026-10-11. Task 2 of `plan/cloud-brain-owner-acts-on-what-waits-for-him.md`: the tracker's module
(`tools/cloud-brain/brain-issues.ojs`) answers what the block "For your attention" shows as data,
puts a text in the box of a waiting issue, and offers both in the plugin set `"attention"`. Nothing
reads that set yet: task 3 (`ow-3-operator-shown-the-issue`) is the reader. No handler, SQL or
policy of the service changed. The seed's commit is the first ref of the issue's submit.

## What changed

- `issuesAttention(panel)` answers `{ shown, draft }`.
- `panel.row(id)`, new on the panel: `{ issue, group, ask, about, box }` for an id that waits, else
  `null`. It is what `issuesAttention` reads. The text a row draws as what is asked about is now made
  once (`asked` in `drawWaiting`) and used by the row and by `row(id)`.
- The cell `issues_attention` adds `issuesAttention(viewof issuesView)` to `plugins` under
  `"attention"` with its `invalidation`.
- The first `md` cell has a new item, "The block as data", and `panel.row(id)` in the block's item.

`shown()` is `null` or `{ id, title, state, kind, group, ask, about, place, of }`, as the spec has it.
`draft(id, text)` puts the text in the box, calls the box's `oninput`, calls `panel.scrub(id)` and
answers `{ id, drafted: true }`. It throws, each message starting `attention draft: `, in this order:

| when | message |
|---|---|
| the argument has no `row` function (nobody signed in, `null`) | `no panel of the owner on this page` |
| the id does not wait | `<id> does not wait for the owner` |
| the issue is not shown to this caller | `<id> is not shown to this caller and has no box` |
| the text is not a string, or is empty after line breaks become spaces and it is trimmed | `no text` |
| the box has any character in it | `the box of <id> has text already: "<the text>"` |

Readings where the spec left room, taken under line 2 of `philosophy.md` (the smaller side):

- `about` is `null`, not `""`, where the row has no event it is asked about: a security report, an
  issue opened with `needs-owner` and no body, and any issue until its `issue.get` has answered.
- A hidden issue is shown as `{ title: null, ask: "", group: "hidden", about: null }` with its id,
  state and kind, which is what its row draws. `draft` of it throws; the spec names two throws and
  this is a third, since the row has no box.
- "A box that has text already" is any character, a space among them: a space he typed is his. The
  buttons judge the box trimmed; `draft` does not.
- A text with no character is a throw. Not taken: answering `drafted: true` with nothing put.
- The cell's value is a line of text, as `issues_announce` has, not the part: the page draws a cell's
  value. Not taken: the part, as `operatorChat` returns; a test reads the set and not the cell.
- No limit on the length of `text`. `issuesLimits` has `body: 20000` and `reason: 2000`; a press
  with a longer text was not tried.

`draft` shows the issue whichever one was shown (the spec: "shows the issue"). When the owner is
typing in another issue's box at that moment, that box leaves the page with its text kept and the
caret lost. Task 3 decides when the Operator drafts; nothing here holds it back.

Searched in the Brain first (`knowledge.search?semantic=true`, `loop-knowledge`): "panel offers what
it shows to another module plugin registry", "draft text into input box from agent owner presses",
"attention block shown issue operator watch". Found `module:tomlarkworthy:plugin-registry` (read from
the built notebook: `add(name, value, { invalidation })`, `get(name)` a generator of the set; used as
imported already), the spec, `doc:cloud-brain-i1842` and `records/operator-tab-module.md` (how
`operatorChat` offers itself under `"operator"`, which the cell follows). `doc:event-handlers-in-cells`
was listed and not opened.

## Tests

Two new cells. `grep -c '^test_' tools/cloud-brain/brain-issues.ojs`: 35 (33 on `main` before).
`grep -c 'plugins.add("attention"' tools/cloud-brain/brain-issues.ojs`: 1 (the spec's check; 0 before).

- `test_issues_attention_part_says_what_is_shown`: a panel on a rig of its own with a client that
  lists every write. `shown()` with nothing waiting, for an approval, an answer of 30 lines, an issue
  opened with the label, a security report, and after `scrub` and the forward button; `draft` into an
  empty box (the box, the issue shown, Answer and Comment enabled, 0 events and 0 writes); a second
  draft and a draft over typed text; an id that does not wait, an unknown id, no id; `""`, `" \n "`,
  `5` and no text; line breaks; another caller's comment on the drafted issue (the same box with the
  draft); a press that takes the issue out of the block, held, then dropped; the drafted text sent by
  a press of Answer as one comment; a hidden issue on a token's panel; `issuesPanel` with no client,
  and `null`.
- `test_issues_attention_is_offered_by_name`: after the cell `issues_attention`, the first value of
  `plugins.get("attention")` has a part with `shown` and `draft`. It reads the page's own set and
  calls neither function.

The first test was written before the change. `bun tools/cloud-brain/tab-tests.ts <build>
@tomlarkworthy/brain-issues` on a build of the seed with that test and without the change printed
`"tests":34,"passed":29` and `failed` as five entries, each
`test_issues_attention_part_says_what_is_shown issuesAttention is not defined`. Why the tool lists
one failed cell five times, and counts 29 passed, was not looked into; with the change the same
command printed `"tests":34,"passed":34,"failed":[]`.

A build with the change and `r.box.oninput();` of `draft` replaced by `void 0;`, same command:
`"tests":34,"passed":33`, the one failed being this test, on the line that reads the two buttons
(`Expected false, false`, `Received true, true`).

The runs submitted, made on a build of the worktree after its rebase onto `main` (`57f05f8b`),
22:29 to 22:31 CEST (`date`):

- `cd cloud-brain-dev && bun test.ts brain-x-issues --with <the built module>`:
  `"passed":21,"failed":0,"needsBrowser":14`. The 14 are the 12 panel tests and the two new ones
  (`location is not defined`).
- `bun tools/cloud-brain/tab-tests.ts tools/cloud-brain/.emitted/cloud-brain.html @tomlarkworthy/brain-issues --emit issues_service=…`:
  `"tests":35,"passed":35,"failed":[]`, Chrome 151.0.7922.34.
- `BRAIN_BASE=cb4 bun tools/cloud-brain/verify-run.ts brain-x-issues --shell <the build> --times 20`:
  last line `"runs":20,"passed":20,"failed":0,"none":0,"from":["document"],"byChance":[]`;
  `mains` of the first line is brain-shell and brain-issues; `"tests":35` in the last run's line, which is 21 + 14.

Of the brief's cases for a control that sends a write: `draft` sends none, and the new test holds
that with the client's list of writes. A second call before anything else: the second `draft`
throws. A write that is refused, having taken its row off the page: no draft while it is on its way,
a draft once the row is back. Another caller's event on the row: held for a box that is not focused.

## Not tried

- The part on the owner's page, signed in, with the issues that wait there. The loop does not open
  cb4's page. On cb4 the read made after the deploy is in the issue's comment.
- Any reader of the set. `ow-3` is not built; that the Operator can call `draft` through
  `plugins.get("attention")` from the page's module rests on the second test and on `brain-operator`
  reading `"operator"` the same way.
- A draft while the owner's caret is in the box of the drafted issue, or of another issue. By the
  code the first throws when he has typed anything and otherwise sets the value under the caret; the
  second is described above.
- A draft into the empty box of an issue whose write is on its way and that still waits (a move
  that keeps it in the block). By the code the text is put, the buttons stay disabled until the
  answer, and the answer leaves the text. No test holds it.
- Two tracker panels on one page: each run of `issues_attention` adds one part, and task 3 picks.
- A text longer than the service takes.
- Chrome 128, the cluster's browser. It has not run this build: see below.

## The deploy had no test run of the deployer's

The apply (22:31:55 to 22:32:12 CEST, `lock.sh`) answered `"state":"probation"` for hash
`e3b34e862cd1`. The deployer's lines, read with `logs.deploys` (`--as loop-deploys`), have why:

```
deploy.verify.none  brain-x-issues  reason: browser.extend answered 402 owner has made 2000 priced
calls today, which is the most for one day. The count is new at 00:00 UTC
```

So the deployer leased no browser and ran no test. `brain.ts state` read
`probation e3b34e862cd1 until 2026-10-11T20:42:10.970Z`, after which the version is put back. At
22:34:42 CEST (`date`) `brain.ts confirm brain-x-issues` answered `{"confirmed":["brain-x-issues"]}`,
which is the step `knowledge/changing-and-deploying-a-cloud-brain-worker.md` gives for a probation
with a reason read. The version stands on the three runs under "Tests", all in Chrome 151 on this
machine. Not taken: letting it be put back, which leaves `main` and the notebook ahead of cb4 until
a deploy after 00:00 UTC. To undo: `brain.ts rollback`.
