# feedback-draft-box-redrawn-on-ask

## Round 1, 2026-10-11

A quick win of the writer of `feedback-draft-lost-on-reload`, met in the same seed.

`sync` of `feedbackApp` (`tools/cloud-brain/brain-feedback.ojs`) ended with
`for (const id of els.keys()) draw(id);`, and `draw` puts a new view in the note's element. The view
of a note not yet filed is a new textarea with the text so far. `feedbackSync` calls `sync` every
30 s while the tab is visible (`feedbackLimits.everyMs`), so the box of a note being typed in was
replaced each time.

The change is one line: `sync` draws again only the notes that show an issue (`of.has(id)`). A draft
shows nothing of the tracker. What a draft's line says (`Write something first.`, a refusal) is drawn
by `file` itself, and a draft that becomes an issue's note in `sync` is in `of` by then.

No Worker's module changed and nothing was deployed; it is on cb4 when the shell is posted, with
`feedback-draft-lost-on-reload` (the command is in that record). Times are CEST, from `date`.

### Tests

`test_feedback_an_ask_leaves_a_draft_box_as_it_is`, new: a note of an issue and a draft on one app;
text typed in the draft; another caller's move on the issue; `sync`. The issue's note is a new
element and reads `triaged`; the draft's textarea is the same element with its text.

- Before the change, 22:13:08, `bun tools/cloud-brain/tab-tests.ts tools/cloud-brain/.emitted/cloud-brain.html @tomlarkworthy/brain-feedback`
  in the worktree: `"tests":14,"passed":13`, this one failed, the third value `false` where `true` was expected.
- After, on the last build, three times from 22:21:00, the same command: `"tests":14,"passed":14,"failed":[]` each time.
  `bun tools/lope-tests.ts tools/cloud-brain/.emitted/cloud-brain.html --filter test_feedback`, 22:21:09: `Tests: 14 passed, 0 failed, 0 timed out, 0 skipped, 14 total`.

### Not tried

- The caret and the focus themselves. The test's note is not in a document; it asks whether the
  textarea is the same element. That the owner lost his caret every 30 s was read from the code and
  not seen on his page.
- The owner's page, and the cluster's Chrome 128.
