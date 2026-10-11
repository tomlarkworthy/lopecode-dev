# A note on the page files a feedback issue

For the issue `annotations-file-feedback` (event 700). Built 2026-10-11, 15:05 to 15:30 CEST, by the
session the owner asked.

## What was asked

Tom, 2026-10-11: "I would like a version of annotate, where the annotations are linked to feedback
tickets so I can annotate anything in the UI to provide feedback and that gets filed automatically.
On page load those types of feedbacks would be loaded from the cluster. Just for the main
cloud-shell. Progress on the ticket would be annotated and I the user would get signal when the work
is done and then when I clocked remove at that point the annotation would be permemenetly removed. I
think this is quite complicated so you probably need new services to do a good job perhaps."

## What was built

| | |
|---|---|
| `tools/cloud-brain/brain-feedback.ojs` | A module of the page, not a Worker. It registers a kind `feedback` on annotate's plugin set `annotate-kinds`. Its first cell is the reference. |
| `@tomlarkworthy/annotate` | A kind may name `home`, a module that both cells of its notes are kept in. Two lines of `a2Store` (`create`, `patch`). A kind with no `home` is as before. |
| `tools/test-annotate.js` | Three checks of a kind with a `home`. |
| `.claude/skills/brain-maintenance/rules.md` | "A feedback issue from a note on the page". |

No new service. The tracker has the kind `feedback`, the owner in the page may open and label, and the
loop already reads feedback. A second store would need a read rule, a sync and a link to the issue.

## Decided in the session

- **The anchor is in the issue's body**, as JSON in a fence named `annotation`, after a sentence that
  says where in words. `issue.list` leaves the body out, so the page calls `issue.get` for each
  listed issue, and again only when `updated_at` moved. No change to `brain-x-issues`.
- **The label `annotation` is the switch.** Loaded: issues with the label. Removed for good: the label
  taken off. The issue is never deleted (the record is append-only).
- **Filing is a button**, not the first keystroke.
- **Remove is for a closed issue.** The × of a note whose issue is open hides it until the next load,
  as the request says "at that point".
- **The cells are kept in `@tomlarkworthy/brain-feedback`.** annotate writes a note into the module it
  points at. On this page that is a Worker's module, and `exportModuleJS` writes every variable of a
  module: the deployer's tests compare that text with what is deployed
  (`brain-deployer.ojs`, the tests that call `exportModuleJS("@tomlarkworthy/brain-static")`).
- **The owner only, at the Brain's address.** Off in a portal, on a `#verify=` page and on a file.

## Measured

| | |
|---|---|
| `bun tools/lope-tests.ts <built> --filter test_feedback` | 7 passed of 7. One of them runs on annotate's own store. The whole notebook: 20 failed and 8 timed out, the same names as the notebook on main. |
| `tools/test-annotate.js`, run from a copy with `executablePath` set to `~/Library/Caches/ms-playwright/chromium_headless_shell-1234/…/chrome-headless-shell` (as written it asks for build 1200, which is not installed) | 145 passed of 145; 142 before the three new checks. |
| A QA tab, Chrome 151, the built file, `feedback` redefined over the rig's tracker and annotate's store | Menu kind armed, one click on the docs heading, text typed, File: the cells `annotation_<id>` and `_note` were in `brain-feedback`, the anchor's module `cloud-brain-docs`. The body's sentence read `on the element that reads "Cloud Brain: what it does and how it works"`. A comment and then a close were drawn after `sync`. The box's × on the closed issue sent one `issue.label` with `remove: ["annotation"]`, and no cell was left. |

## The fresh review (FIX, 8 findings, all taken)

The sentence in the body named the element under the note's box, not under its tip (`resolve` was
given the record). A note placed before annotate knew the kind went into the annotated module:
`feedbackSync` now waits for the kind, and annotate's `patch` leaves a record of an unregistered kind
where it is. A kept note whose issue had lost its label stayed as `fb-…`. `feedbackWhere` ran two
clauses together with no cell. The fixtures' `frac` had the wrong keys.

## Not tried

- **Nothing was filed on cb4.** A page there with the owner signed in is the owner present, and an
  agent does not write as the owner. The first note filed there is the owner's.
- The page on cb4 with many notes: every listed issue is one `issue.get` at load.
- A note whose cell was rebuilt under another pid: annotate's own ladder (cell, quote, adrift) decides.
- A member. The module is off for anyone but the owner.
- The other notebooks that embed annotate were not given the new copy: only its own notebook and
  `quick_start.html`, which the Brain's page is built from.

## Round 2, 2026-10-11: a closed issue is not a done one

Review 908 (event 908), one finding. The note took "the issue is closed" as the signal that the
work is done. The loop closes a feedback issue when it has gathered it, which is before any work.
The owner's first note, `fb-a2kw99i9wy`, was closed at event 863, five minutes after he filed it,
and made part of `dashboards-share-series-and-controls` at event 865. That project was at
`spec-review`. His page read **Done** with a Remove button, and the reason shown named an id that
the tracker had refused (corrected in event 866, which a closed note did not show).

"Nothing was filed on cb4" under "Not tried" above was true when written and stopped being true at
event 858.

### What changed

All in `tools/cloud-brain/brain-feedback.ojs`.

| | |
|---|---|
| `feedbackFollows(issue)` (new) | For a closed issue: its `parent`, and the `to` of each link it says. Empty for an open issue. |
| `feedbackProgress(ticket, followed)` | Answers `done` (closed, and every followed issue read and closed) and `gathered` (closed and not done). Each line of `links` ends with the followed issue's state. `last` is the latest event of the issue and of those it follows, with the id in front when it is a followed one's. `reason`, when done, is `<id> <state>: <reason>` for each followed issue, and the issue's own when it follows none. |
| `feedbackApp`, `view` | **Done** and Remove on `done`. On `gathered` the heading is `gathered`, there is no button, and the last event is shown in place of the close reason. |
| `feedbackApp`, `gone` | The box's × takes the label off on `done` only. Before, it did so for any closed issue, so the × on a gathered note would have removed it for good. |
| `feedbackApp`, `sync` | A followed issue has no label, so `issue.list?label=annotation` does not say when it moved. Each one is read with `issue.get` on every ask: one call a followed issue every 30 s while the tab is visible. One that cannot be read counts as not done. |
| The first `md` cell | Rows Progress, Gathered, Done, Remove. |

### Chosen between two

The review offered: the note follows what the issue is part of or linked to, or a gathered note
reads as gathered and has no Remove "until then". The second alone has no "then": nothing would
ever say Done. Both are built: `gathered` while a followed issue is open, **Done** when all are closed.

- **Links are followed as the parent is.** The close guard of the feedback workflow takes a parent
  or a link (review 908), so a feedback issue closed with `cause X` is gathered the same way.
  Only links the issue says (`links`), not those said of it (`linked`).
- **One step.** A followed issue that is itself closed as part of a third counts as closed. The
  smaller side (`philosophy.md`, line 2); a chain was not met on cb4, where one issue carries the label.
- **A followed issue that was rejected reads Done**, with `proj rejected: <reason>` as the reason. The
  work is over either way and the owner reads why.

### Measured

Each run after the last change to the seed (`git log -1 --format=%ci -- tools/cloud-brain/brain-feedback.ojs`).

| | |
|---|---|
| Before the fix, with the new test and `feedbackFollows` alone: `bun tools/lope-tests.ts tools/cloud-brain/.emitted/cloud-brain.html --filter test_feedback_a_gathered` | 0 passed, 1 failed. The note of a closed issue whose project was at `spec-review` had a `Remove` button and the reason "In the spec of a-name-that-was-refused." |
| After: `bun tools/lope-tests.ts tools/cloud-brain/.emitted/cloud-brain.html --filter test_feedback` in the worktree | 8 passed, 0 failed, of 8. |
| The step-8 snippet of `agents/implementer.md` in a headless QA tab on that file, `S70(@tomlarkworthy/brain-feedback)`, two fresh loads (`r=7731`, `r=7732`) | `[8,[]]` both times. |
| The same tab, `feedbackRig` given what `issue.get` answered on cb4 for `fb-a2kw99i9wy` and `dashboards-share-series-and-controls` at 16:20 CEST (the issue, and each event's type, to, reason, body, at, by) | `data-feedback="gathered"`, 0 buttons, "part of dashboards-share-series-and-controls: spec-review", and the last line was the project's latest comment. Calls: `issue.list`, `issue.get` of each. |

`test.ts` and `verify-run.ts` take a Worker; this module is in the page's shell and has none, so
neither was run. The two fresh loads stand in for the second.

### Not tried

- The page on cb4 with the owner signed in. The note of `fb-a2kw99i9wy` there is the owner's to look at.
- A followed issue the owner cannot read (`hidden: true`). The rig's tracker has none; the pure
  function counts one that is open as not done (the new test, last block).
- A followed issue reopened after its note read Done and before Remove: the next ask reads it again
  and the note goes back to `gathered`. Not run.
- Many gathered notes: one `issue.get` each, every 30 s.
- annotate did not change; `tools/test-annotate.js` was not run again.
