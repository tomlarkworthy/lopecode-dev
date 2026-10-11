# page-feedback-filed-twice-never-arrived

## Round 1, 2026-10-11

The owner wrote feedback on his page twice and neither reached the tracker. Comments 2002 and 2035
of the issue found why, on his page: the three notes had no kind. They were annotate's plain notes,
which have no File button and which nothing sends. Asked which way to mend it, he wrote (event
2043, whole): "yes make it the default".

The change is in `brain-feedback.ojs` alone. No Worker's module changed and nothing was deployed.
**It is not on cb4 until the shell is posted**, which is the owner's act:
`BRAIN_BASE=cb4 bun tools/cloud-brain/brain.ts shell tools/cloud-brain/.emitted/page-feedback-filed-twice-never-arrived-shell.html tools/cloud-brain/.emitted/page-feedback-filed-twice-never-arrived-verify.html`.
Those two files are the landing's build of `main`, copied there from the worktree. The command was not run.

Times are CEST, from `date` beside each run. The QA tab's acts have no clock reading of their own:
they were between 21:47:04 (the worktree made) and 21:52:26 (the snippet's own time in the last load).

### What annotate does, read in the module as the notebook has it

`bun tools/lope-reader.ts lopebooks/notebooks/@tomlarkworthy_cloud-brain.html --get-module @tomlarkworthy/annotate`:

- `a2KindsRef.builtin` is `{ id: "note", order: 0 }`; the feedback kind has `order: 1`. The plain
  note is the first entry of the menu's children, of the palette's commands and of the selection
  chips (`✎ annotate`, then `✉ feedback`).
- Each of the three names a kind when it starts a note. Two places create one, the chip's press and
  `armedUp`, and both give `store.create` the anchor and no fields for the plain note
  (`armedUp`: `store.create(anchor, kind === "note" ? undefined : { kind })`).
- `store` there is the value of the cell `a2Store` (`const store = a2Store`), the object
  `brain-feedback` imports.

So no entry point arms "no kind" that a default could fill: the plain note is itself a choice in
each list, and the first one. Whichever of the three he used, it ended in `create` with no fields.

### The change

- `feedbackApp` has `byDefault()`. It puts a function in the place of `store.create` that adds
  `kind: "feedback"` when the caller gave no `kind` and no `src`, and answers a function that takes
  it away. The function it puts carries `byDefault = "feedback"`, which a test can read.
- A cell `feedbackDefault` calls it when `feedback` is on (the owner signed in at the Brain's
  address) and takes it away on the cell's invalidation.
- The reference (first cell) has a row "The default".
- `test_feedback_a_note_made_with_no_kind_is_a_feedback_note`, new, on the rig's store.
  `test_feedback_is_off_away_from_the_owners_page` also reads `feedbackDefault` and
  `a2Store.create.byDefault`: set on the owner's page, absent anywhere else.

The side taken: on the owner's page there is no plain note at all. Note in the menu and the chip
`annotate` make a feedback note, as Feedback does. Comment 2043 reads his word as "of the Feedback
kind unless he picks another"; a plain note cannot be told from "no kind" where it is created, and
it is the trap he fell in. A note of another registered kind is passed through.

Not taken:

- A change to `@tomlarkworthy/annotate` (a kind that says it is the default, the builtin left out
  of the lists). It is a shared module with its canonical in `lopebooks`, other notebooks use the
  plain note, and comment 2043 asks for the Brain's side. `philosophy.md` line 2: the smaller side,
  easier to undo. The cost of this side: `brain-feedback` writes a method of an object another
  module owns, and the menu still lists Note beside Feedback, both now making the same note.
- A draft kept over a reload, which the issue's body asks for and the triage reason sizes.
  Comments 2002 and 2035 show it was not the cause: the notes were on the page with their text.
  The reference still says "Text typed and not filed is lost on a reload."

### Seen with the default held off, in a QA tab

The worktree's build as a file, layout `C100(S70(brain-feedback),S30(claude-code-pairing))`.
`feedbackOn` is false on a file, so `feedback` was redefined in the tab over the rig's tracker and
annotate's own store, as the first record of this module did, and `feedbackDefault` was redefined
to a constant so the default was off. `feedbackKind` then read `registered the kind feedback`.
`a2Layer.arm("note")` (the action of the menu's Note, called and not clicked), then a real click on
the heading:

```
{"id":"a24b3sgszo","kind":null,"box":true,"textarea":false,"file":["✎","⌖","×"]}
```

A note, no textarea, no File: what comment 2002 found on his page.

### Seen with the change, the same tab

`feedbackDefault` defined again with the seed's body; `a2Store.create.byDefault` read `feedback`.

| Act | The note |
|---|---|
| `a2Layer.arm("note")`, a real click | `kind: "feedback"`, a textarea, buttons `✎ ⌖ × File` |
| text put in the textarea (value and an `input` event), a real click on File | `issue: "fb-a2s97yx7wm"`, the note reads `open fb-a2s97yx7wm made with Note armed`; the rig got one `issue.open` with the label `annotation` |
| the heading's text selected, a real click on the chip `✎ annotate` (chips shown: `✎ annotate`, `✉ feedback`, `✳ ask`) | `kind: "feedback"`, quote `brain-feedback`, a textarea and File |
| `feedbackDefault` redefined to a constant (its invalidation runs), then `a2Store.create(anchor)` | no kind; `a2Store.create.byDefault` absent |

`a2Layer.arm()` with no kind still reads `armedKind() === "note"`: annotate's status line says
`annotating` and not `annotating (feedback)` while such a note is being placed.

### Tests

`brain-feedback` is no Worker's module, so `cloud-brain-dev/test.ts` does not take it.

- `bun tools/lope-tests.ts tools/cloud-brain/.emitted/cloud-brain.html --filter test_feedback`, in
  the worktree after the rebase onto `3848a5f1`, 21:53:38: `Tests: 10 passed, 0 failed, 0 timed out, 0 skipped, 10 total`.
  10 is `grep -c "^test_" tools/cloud-brain/brain-feedback.ojs`.
- The snippet of the brief's step 8 in two fresh loads (`r=9301`, and `r=9304` at 21:52:26):
  `[10,[]]` each time. Those two were of the build before the rebase, which brought in
  `cloud-brain.ojs`, a seed this module does not import, and no other seed.
- Without the fix: the seed with `on &&` of `byDefault` changed to `false &&`, built to another
  file, the same `lope-tests` command, 21:52:57: `Tests: 9 passed, 1 failed`, the failed one
  `test_feedback_a_note_made_with_no_kind_is_a_feedback_note`. The seed was put back and built again;
  `grep -c "false && !(fields" tools/cloud-brain/.emitted/shell.html` is 0.
- The page a deploy's test run opens, on the built `verify.html`, 21:53:08, from the main checkout:
  `BRAIN_BASE=cb4 bun tools/cloud-brain/verify-run.ts brain-x-page --shell $W/tools/cloud-brain/.emitted/verify.html --times 3`:
  `"runs":3,"passed":3,"failed":0,"none":0,"from":["brain"],"hashes":["51843bb7da90"],"byChance":[]`.
  `from` is `brain`: the Worker's module was the deployed one. It shows the built verify page
  still passes that run; it runs no test of `brain-feedback`.

### Not tried

- The owner's page. It needs the shell posted, and then the owner signed in. Every run here was a
  file with `feedback` redefined over a rig; `feedbackOn` true was not seen with this change.
- The menu's Note and the palette's Annotate by a click or a key. Their action, `a2Layer.arm("note")`,
  was called. Two failed tries: reading the menu's items with `[...plugins.get("lp2-menu")]` crashed
  the tab twice (the page stopped answering and a screenshot read "Target crashed"); not looked into.
- A note of another registered kind in the browser. `a2Store.create(anchor, { kind: "switchboard" })`
  made a plain note there, because the kind of the chip `✳ ask` has another id that was not read.
  The test passes a named kind through on the rig's store.
- A note made by anything that calls `a2Store.create` with no kind and is not the owner's hand.
  `grep -o "[sS]tore\.create(" ` over the built notebook finds annotate's two and this module's own;
  a module joined later, or an agent paired with his page, was not looked at. Such a note becomes a
  feedback draft there, which sends nothing until File.
- Two apps on one store taken away out of order in the browser; the test does it on the rig.
- The cluster's Chrome 128. The QA tab was the channel's Chromium.
- A draft kept over a reload: not built, as above.
