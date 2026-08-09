---
name: document
description: Use whenever writing or substantially editing prose that will be read later — a `knowledge/*.md` file, a `plan/*.md` design doc, notebook `md` cells, a README, a PR body, or a long commit message. Triggers on "document this", "write up X", "add a doc for", "explain this in the docs", "write the README". Encodes the house documentation standard, drawn from Tom's hand-written docs, and names the failure modes Claude's unaided prose falls into in this repo.
version: 0.2.0
---

# Writing documentation

A doc here is **a record of work that was done**, not a description of a thing that exists.
A description can be written by reading the code, so it can also be written by guessing, and the
reader cannot tell which happened. A record carries the observations that produced it, so a reader
can check it and a later session can falsify it.

The failure this skill exists to stop: fluent, confident, timeless prose that describes a system
accurately enough to survive a read-through, contains no evidence, states no uncertainty, and
therefore cannot be checked or corrected by anyone.

## The rule that generates the others

**Never write a claim you cannot point at.** A command you ran, a file and line you read, an output
you captured, a test that passed, a measurement with its date. If you cannot point at it: go and
verify it, or write it down as unverified and say so. Silently promoting an inference to a
statement of fact is the defect.

A doc written at the end of a long session from memory of what happened fails this by construction.
Capture evidence **while** the work happens and assemble the doc from that trail
(`feedback_persist_captured_data_at_capture_time`).

## Read one of these before writing anything substantial

The reference class, all hand-written by Tom. Match the genre you are writing.

| doc | genre | read it for |
|---|---|---|
| `knowledge/svg-editor-architecture.md` (human-authored sections) | work record / architecture | epistemic status, dead ends, laws |
| `@tomlarkworthy/exporter-2` prose cells | reference / library docs | demo-first, annotated code, literal artifacts |
| `@tomlarkworthy/observable-notes` | explainer | one mechanism per cell, drawbacks adjacent |
| `@tomlarkworthy/blog-netlify-deployment-manager` | blog / narrative | motive before mechanism, links as evidence |

Extract them with `bun tools/lope-reader.ts <notebook.html> --get-module <module>`.

## Work records and architecture docs

From `svg-editor-architecture.md`, which is the standard for anything describing work you did.

1. **Every claim carries its epistemic status.** Held, verified how, or falsified by what.
   > *Falsified by:* the node's identity changing across a commit; or a second lens on the page
   > adopting the first one's state.

   > **Held**: T11, in a browser, over four view changes and two matched drags.

2. **Quote the raw artifact, then reason from it in front of the reader.**
   > ```
   > painted -77.248 -85.096 2.0107 2.0107   wanted -77.248 -85.096 643.42 442.35
   > ```
   > **Equal width and height is a signature, and it names one line of code.**

3. **Record the dead ends.** Often the most useful content, because it stops the next session
   repeating them.
   > Four instrumented attempts failed to reproduce it (… 143 frames across three commits at
   > `k = 2.5`, zero bad frames). A recorder left running during ordinary use produced what none
   > of them could, in one line.

4. **Give alternatives with their costs, then recommend.** One path presented alone reads as the
   only path — usually false, always unfalsifiable.
   > Two ways in, and they trade differently … Cost: it is opt-in at *every* call site …
   > Recommendation: explicit, with the marker search only as a fallback.

5. **Defend load-bearing qualifiers**, so a finding is not mistaken for hedging.
   > **With alignment snapping off**, and that qualifier is a finding, not an escape hatch.

6. **Enumerate, then generalise.** Name the instances before naming the class.
   > Three separate bugs now (P7's restore, M17's undo-drops-selection, B2's flash) have the same cause.

7. **Date and stamp state.** `added 2026-07-23`, `✅ done`, `[x]`, "Last full triage:". Absolute
   dates. A measured number without a date rots silently.

8. **Quantify.** "221 notebooks, 217 managed modules, 3369 differing pairs" beats "most copies are
   stale". If the number is unknown, say so rather than reaching for a quantifier.

9. **Say what is undecidable.** The best sentence in `resyncing-modules-across-the-corpus.md` is the
   one naming what the tool *cannot* tell you — "content hashes carry no ordering … `audit` reports
   drift but cannot report direction" — followed by the counterexample proving it matters.

## Reference and library docs

From `@tomlarkworthy/exporter-2`. Different rules, because the reader wants to use the thing.

- **Demo first.** exporter-2 renders the working exporter UI in the cell immediately after the H1,
  before a word of explanation. Show it working, then explain. Do not open with a definition.
- **The annotated code block IS the API doc.** Options are documented as inline comments on a
  copy-pasteable call, not paraphrased into prose:
  ```js
  exporter({
    handler: (action, state) => {}, // Optional UI click handler
    output: (out) => {},            // hook to get result of exporting
  })
  ```
  Having written that block, do not then re-describe the same options in sentences. That is what
  produced the grid-container wall.
- **Quote the literal artifact for a format spec.** The real `<script id=… data-encoding=… >` block,
  not a description of its shape.
- **Property lists carry consequences, not adjectives.** `**Moldable**, the file format is
  uncompressed, readable, editable with a text editor, and diffable by Git.` The bold term is the
  claim; what follows is why it is true. A bare adjective list is filler.
- **State the limit where the feature is described**, with the workaround adjacent — "URLs are
  limited in size, if you need to move large amounts of data across an export, use a local
  FileAttachment instead." Not in a separate Limitations section at the bottom.

## Explainers

From `@tomlarkworthy/observable-notes`.

- **One mechanism per cell**, and the cell is short. The sandbox, the drawback of the sandbox, the
  runtime, module scoping — each its own cell.
- **The drawback rides with the mechanism**: "A drawback of the sandbox approach is several Web APIs
  don't work (sharedArrayBuffer, Bluetooth) and default form submission will redirect the inner page."
- **Link the canonical source at every technical noun**, and **attribute techniques to people**
  ("mootari's hack"). Links are how the evidence gets carried.

## Narrative and blog

From `blog-netlify-deployment-manager`.

- **Motive before mechanism**, in first person: "The main motivation for building
  _yet-another-static-site-generator_ is…", "Some of my frustrations with existing CMSs are…".
- **Name the exact mechanism**, not a paraphrase of it — the `contains-array-any` query operator,
  `O(n)` deployment complexity — each linked to its documentation.

## Compression, and where the documentation actually goes

From `@tomlarkworthy/coded-landmark-tracking`, where Tom's cells and Claude's sit side by side and
are separable at a glance.

- **State the claim and stop.** *"Adjacent scanlines can be joined if their P are close."* Nine words,
  one cell. Claude's equivalent runs sixty and derives the result for the reader. The derivation is
  correct and it is still slop, because a notebook is a lab record and not a textbook.
- **Scope-limit explicitly, in the prose.** *"This notebook is just about the single frame recognition
  algorithm."* · *"It is probably true that some of the bits can be decoded even if the scan is
  off-center, but not tried here."* Say what was not tried. Claude writes as though the covered
  ground is the whole ground.
- **Lead with what is unique.** *"There are a few optical trackers… The unique thing about this one
  is the design around single scan lines."* Position against the alternatives in the first two
  sentences.
- **Vary the scaffold.** Claude's tell in this notebook is one repeated shape: assertion, em-dash,
  justification, then "which is why…". Three of those in a row is a texture the reader stops
  reading. Tom's cells have no recurring shape.
- **Documentation goes at the site of the work.** The best-documented facts in this project are in
  commit messages and code comments, not md cells — §4.3's "64px of spread against 23px" lives in a
  comment beside the code that depends on it. Prefer the site over a prose layer that can drift.
- **Record negative results where the next person will look.** `lopebooks@195b84c` reverted a binary
  search that did not pay and left the reason in the comment: motive ("looked like free money"),
  standard of proof ("held to all 42984 recorded real calls bit-for-bit… against an unchanged wasm
  yardstick in the same session"), the raw measurement (`linear 424ms / binary 427ms`), the cause
  (13 edges at the median, 33 at most), and a transferable law ("asymptotics need an `n` this problem
  does not have"). A comment that constrains future edits — "anything replacing this has to match
  that or the detector answers differently" — is worth more than one describing present behaviour.

## Reporting a change — commit messages, changelogs, PR bodies

The best-written documents in this repo are Tom's commit messages on
`lopebooks/notebooks/tomlarkworthy_coded-landmark-tracking.html`. Claude's are inventory-shaped
("X + Y (doc + submodule)"); these are arguments. Read `195b84c`, `aca1b75`, `30b5c2b`, `b5eb4ef`,
`7478498` before writing a substantial commit message.

- **Open with the reported symptom, in quotes, then say what it was not.**
  > "It always starts slow then gets really fast" was 8.4x and it was not the camera.
- **Put the measurement inline as aligned text with an arrow to the conclusion.** Not a markdown
  table, not prose.
  > ```
  > jobs  1-17  wall 28-47ms, workers reported 7-10ms  -> 25.4ms of QUEUEING
  > job   18    wall 7.2ms                             -> poolAgreement resolved
  > ```
- **Always before → after.** `queueing 25.4ms -> 0.4ms`, `19ms -> 8ms median … 2.38x, worst frame
  31ms -> 12ms`.
- **Mark the epistemic standard explicitly.** "Measured, not reasoned", "Verified as pure code
  motion, not just plausible", "held to all 42984 recorded real calls bit-for-bit".
- **Give the minimal falsifying test, concretely.**
  > after one such tear-down a freshly defined cell of `1 + 1` never computed either.
- **Report the shortfall against expectation, unprompted.**
  > Not 6x, and the per-worker times say why -- a job reads 3,3,3,2,3,5ms, so one unlucky worker
  > sets the frame's cost.
- **Justify the choice against the alternative you rejected.**
  > Removed rather than left behind a flag: a flag would have preserved the wrong intuition with it.
- **State the blast radius — what this does *not* affect.**
  > check-all.ts runs camera-off, so the allIdentical verdict is unaffected.
- **Name the test that now guards it.**
  > check-pool.ts asserts it: the in-flight job must reject and the runtime must still compute afterwards.
- **Say why an instrument was needed, not just that it was added.**
  > Workers now report their own scan time, which is what separates "the pool is barely faster" from
  > "the workers are fast and the time goes elsewhere". Only the measurement could tell them apart.
- **State the experimental control.** "arms interleaved frame by frame so load drift hits both";
  "measured against an unchanged wasm yardstick in the same session".
- **Call out the counterintuitive result.**
  > Undershooting there costs ~20ms a frame, which is the opposite of what a smaller image looks
  > like it buys.
- **Say why the write-up will be needed again.**
  > New §5.1 records how the capture path had to be tuned, because it will need tuning again.

## Anti-patterns — observed defects in Claude-authored prose in this repo

- **The appositive-definition opener.** `@tomlarkworthy/grid-container` opens *"A responsive
  container that composes named cells as rearrangeable atoms on a snap-to-grid surface — a widget
  builder."* Every content word is defined by the notebook itself, so it orients no one.
- **The wall.** grid-container puts 570 words into 3 `md` cells (190/cell) and re-describes in prose
  what its own code block already said. In a lopecode notebook the cell is the unit the reader edits
  and the page renders — one idea per cell.
- **The stub.** `@tomlarkworthy/markdown-wiki` ships 31 words of prose for an entire notebook.
- **Structure imposed before it is earned.** Headings and tables laid down as a template, then
  filled. Let the material produce the structure.
- **Timeless present throughout.** No dates, no history, no "this changed when". Ages invisibly.
- **Exhaustive enumeration in place of selection.** Deciding what to leave out is most of the work.
- **Summary in place of evidence.** "Verified working", with nothing a reader can check.
- **Unsourced precision** — a confident number with no measurement behind it is a defect *even when
  the number is right* (`feedback_plausibility_is_not_verification`).
- **Hyperbole and filler.** No "robust", "seamless", "powerful", "simply", "just" (CLAUDE.md rule 15).
- **Metric-chasing.** Do not imitate the surface tics — em-dash rhythm, the word "Held", a
  *falsified by* line — on a claim that was never verified. That fakes the signal the reader relies
  on and is worse than plain prose.

## Prose shape is not the signal

Sentence length and paragraph size do **not** separate good documentation from bad here.
`blog-netlify-deployment-manager` runs 196 words per prose cell; `bitcoin-energy` has 29% of its
sentences over 40 words; both are fine. Shape metrics measure genre and era, not quality — do not
optimise them. The one exception is the lopecode cell-granularity rule above, which is about the
editing and rendering medium rather than about prose.

## Before finishing

- [ ] Every non-obvious claim points at a command, file:line, output, test, or measurement.
- [ ] Anything unverified is labelled unverified.
- [ ] At least one raw artifact is quoted where a conclusion was drawn from it.
- [ ] Dead ends and rejected approaches are recorded.
- [ ] Measured numbers carry their date.
- [ ] Where a decision was made, the alternative and its cost are stated.
- [ ] Limits sit next to the features they limit.
- [ ] No paragraph opens by defining the subject in terms of itself.
- [ ] Nothing was re-described in prose that a code block or quoted artifact already said.
- [ ] Nothing is written that would survive unchanged if the code were different.
