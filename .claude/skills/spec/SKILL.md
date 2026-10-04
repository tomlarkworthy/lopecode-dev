---
name: spec
description: Use when the user asks for a spec, design doc or implementation plan for a non-trivial piece of work ("/spec <topic>", "spec this out", "write a spec for X", "plan X before building"), or when Claude would otherwise write a `plan/*.md` spec. Produces a lopecode notebook instead of markdown: prose in editable-md, visual design as svg-lens drawings, requirements and open questions as data, robocoop-5 in a pane, and the user reviews by annotating. Ends by opening the notebook paired on a file:// URL.
version: 0.1.0
---

# Spec as a notebook

A spec here is `plan/specs/<slug>.html`: a copy of `quick_start.html` whose main module is
`@spec/<slug>`. The user reviews it by annotating, rewriting prose in place and dragging shapes;
Claude revises it over the pairing channel; an implementing agent reads the module source.

Built and checked 2026-10-04 with the template as its own first notebook
(`plan/specs/spec-template.html`): 39 cells, build 1.65 s, no cell errors, `connected` received,
robocoop-5's `pairedEndpoint` resolved to the channel port.

## Steps

1. **Research before writing.** Read the code the work touches. Every control, message string
   and state the spec mentions comes from the source, not from memory of the page
   (`knowledge/preparing-a-good-claude-design-spec-handover.md`).
2. **Write the seed.** Copy `.claude/skills/spec/template.ojs` to `tools/scratch/spec/<slug>.ojs`
   and replace every italic placeholder. The seed is Observable source, one cell per chunk,
   chunks separated by a line `// %%`. Keep the cell names; the readiness strip and the
   handover read `requirements`, `questions`, `states`, `copy_*` and `artboard_*` by name.
   Do not write a title cell: the tool adds `# <title>` first.
3. **Build.**
   ```
   bun tools/spec-notebook.ts --seed tools/scratch/spec/<slug>.ojs --slug <slug> --title "<Title>"
   ```
   It compiles the seed with the toolchain notebook's `compile` cell (headless, no browser),
   puts the module in blank-notebook's place, takes robocoop-5, switchboard, annotate, editor-5,
   pairing and change-history from the robocoop-5 notebook, and prints the file URL. A cell that does not compile is reported by
   index and nothing is written. An existing spec is not overwritten without `--force`.
4. **Open it paired.** `get_pairing_token`, then `open_url` with
   ```
   bun tools/spec-notebook.ts --url plan/specs/<slug>.html --token <TOKEN>
   ```
   One `cc=` pairs Claude Code and, when the channel runs with `LOPECODE_LLM_RUNNER=1`
   (metadev's default), gives robocoop-5 its model. Wait for `connected`.
5. **Give the user the URL** and say what needs their eye first: the Words section, the
   drawings, and the open questions listed in the strip at the top. Stop there; the user reviews
   in the page.

After step 3 the HTML is the source of truth. Never rebuild over a spec the user has opened;
their edits and annotations are in the file.

## What goes in each section

The template's placeholders say what each section holds. The parts that are easy to get wrong:

- **Not your concern.** Name every adjacent system here in one line and nowhere else at length.
  A design agent built what Ledger v1 described at length (the feed, the pane divider) and
  dropped what it summarised in one row (bulk delete, publish). Word count is read as importance.
- **Words.** The deliverable's title, opening paragraph and UI strings are written out as
  `copy_*` cells for the user to rewrite. Draft them, expect them to be replaced, and tell the
  implementer to use them verbatim.
- **Visual design.** One `artboard_<state>` per state: default, empty, loading, error, and any
  the feature adds. Draw to scale in the viewBox at the target width. Rough layout hands an
  implementing model room to invent colour and padding, so give real sizes and the theme
  variables. Each drawing cell must be `name = svgLens({ keyboard: true })\`<svg>…</svg>\`` with
  the SVG as a literal in that cell, or edits cannot be written back.
- **Design diagrams.** Architecture is mermaid text, not a drawing: `architecture` (flowchart)
  and `sequence` (sequenceDiagram), each `onPaper(mermaid\`…\`)`. `onPaper` gives a light
  backing, because mermaid's dark text was unreadable on the dark theme (seen 2026-10-04).
  The stdlib `mermaid` is 9.2.2 and loads from a CDN, so these cells need a network connection.
  Keep svg-lens for anything with a layout the user should drag.
- **Open questions.** One decision per row in `questions`. The strip at the top lists every
  unanswered row, every requirement with no check and every undrawn state, each with a link that
  scrolls to it; a question written as a sentence inside prose or inside another row's answer is
  not listed and is not found (2026-10-04: three "not settled" points sat inside answers in the
  robocoop-5 spec and the reviewer could not find the open questions). Anything the user must
  decide goes in `questions`, including what comes up after the first draft.
- **Behaviour.** One requirement per row, priority order, each with a `check` that is a
  command, a test name, or an action and what is seen. A row with no check counts against
  readiness.
- **Worked examples.** Where the logic is small, write it as cells and let it run. Those cells
  are the implementation's first tests.
- **Handover.** File paths, the existing pattern to copy, always / ask first / never, exact
  check commands, ordered steps with stop points. The implementer starts with no other context.

Size the spec to the work. A two-hour change needs the opening, scope, one drawing if it has a
face, three requirements and the checks; delete the other sections from the seed.

## Revising after review

The user has two gestures under ☰ → Annotate (seen 2026-10-04: the submenu lists **Ask Claude**
and **Note** in a paired spec):

- **Note** leaves a review comment. Notes are the task queue, read as below.
- **Ask** is the switchboard prompt (`plan/switchboard.md`): the text goes to one agent with the
  anchor, quote and cell, and the reply threads at that spot. It routes to Claude Code while a
  session is paired, otherwise to robocoop-5. An Ask to Claude arrives over the channel; answer
  it when it arrives rather than on the next poll.

The user's notes are the task queue. Each is a pair of cells in the spec module,
`annotation_<id>` (the anchor: cell, pid, quoted text) and `annotation_<id>_note` (the note).

- `list_cells` on `@spec/<slug>` and read the `annotation_*` pairs. A note still reading
  `note…` has not been typed yet; leave it.
- Act on each, then leave the annotation for the user to delete.
- Record a decision where it is read later: set that row's `answer` in `questions` to the
  decision, who made it, the date and their words in quotes, then change the requirements, steps
  and Decisions table it affects. If the answer leaves part undecided, add that part as a new
  row with an empty `answer`.
- A design decision reached in an Ask thread is not in the spec until it is written there. The
  thread is deleted when the user closes it.
- A `cell_change` for a cell you just updated is your own edit coming back, not a user edit. A
  note whose text is still `note…` has not been typed.
- Always pass `module: "@spec/<slug>"` to `define_cell` / `update_cell`, and give the cell's
  name in the source (`copy_title = md\`…\``). A bare body drops the name.
- `update_cell` on an md cell with `${…}` holes flattens them; rewrite the whole cell source.
- `export_notebook` after each batch. Cells defined over the channel exist only in the page
  until then.
- Do not edit the HTML file on disk while the page is open: the next save in the page
  overwrites it.
- A page in a background tab does not recompute and `export_notebook` times out
  (`document.visibilityState` is `hidden`; seen 2026-10-04). Cell definitions still update, values
  do not. Ask the user to bring the tab forward, or check behaviour in a `qa_open_notebook`
  session, which is always visible.

## Handing over

Ready means the strip at the top reads **Ready to hand over**: no annotations, no blocking
questions, every requirement has a check, every state has a drawing, status set to approved by
the user. Claude does not set the status.

The status is a `sticky` control: choosing a value rewrites the cell's source in the page, and the
file on disk has it only after a save. On 2026-10-04 the page read "approved for handover" while
the file still said "draft" and held a deleted note. After the user approves, `export_notebook`,
then read the module back from the file and check the status cell, that there are no
`annotation_*` cells, and the last edits, before saying the file is ready.

The implementing agent reads the spec as text:

```
bun tools/lope-reader.ts plan/specs/<slug>.html --get-module @spec/<slug>
```

Prose is in the `md` literals, each drawing is the SVG literal in its `artboard_*` cell,
and `requirements`, `states`, `questions` and `examples` are array literals.

## Not done

- A spec with no interface (a refactor, a tool) sets `states = []` and deletes the Visual design
  section and the `svgLens` import. `states` stays because `readiness` reads it.
- `questions` and `requirements` are array literals, so answering one question re-sends the whole
  cell through `update_cell` (about 6 KB in the robocoop-5 spec, sent 8 times on 2026-10-04).
  One cell per row would avoid it and is not built.
- The strip links to questions, requirements and states. It does not link to annotations.

- quick_start was resynced 2026-10-04 (lopecode `04fb4f8`, lopebooks `af3ab866`): switchboard
  added, 11 modules brought to their canonicals. A build after it reported no blocks replaced or
  added, so `OVERLAY` in `tools/spec-notebook.ts` is now a guard against quick_start falling
  behind again, not a fix.
- An Ask to Claude Code was driven end to end in a spec notebook on 2026-10-04: question in,
  reply threaded, thread resolved. An Ask routed to robocoop-5 was not.

- The template is not yet a `spec` entry in blank-notebook's `templates`. The seed cells are in
  the form that entry takes.
- A built spec keeps every quick_start block (4.68 MB). The first Save in place drops the
  modules it does not boot; the size after a save was not measured.
- Annotating, save in place and a robocoop-5 turn were not exercised in a spec notebook on
  2026-10-04. Boot, pairing, the endpoint probe and the tool strip's `setTool` were.
- The skill depends on this repo's `tools/` and content submodules. It is not in lopecode-plugin.
