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
| `bun tools/lope-tests.ts <built> --filter test_feedback` | 6 passed of 6, 16.7 s. One of them runs on annotate's own store. |
| `node tools/test-annotate.js` (headless shell 1234) | 145 passed of 145; 142 before the three new checks. |
| A QA tab, Chrome 151, the built file, `feedback` redefined over the rig's tracker and annotate's store | Menu kind armed, one click on the docs heading, text typed, File: the cells `annotation_<id>` and `_note` were in `brain-feedback`, the anchor's module `cloud-brain-docs`. The body's sentence read `on the element that reads "Cloud Brain: what it does and how it works"`. A comment and then a close were drawn after `sync`. The box's × on the closed issue sent one `issue.label` with `remove: ["annotation"]`, and no cell was left. |

## Not tried

- **Nothing was filed on cb4.** A page there with the owner signed in is the owner present, and an
  agent does not write as the owner. The first note filed there is the owner's.
- The page on cb4 with many notes: every listed issue is one `issue.get` at load.
- A note whose cell was rebuilt under another pid: annotate's own ladder (cell, quote, adrift) decides.
- A member. The module is off for anyone but the owner.
- The other notebooks that embed annotate were not given the new copy: only its own notebook and
  `quick_start.html`, which the Brain's page is built from.
