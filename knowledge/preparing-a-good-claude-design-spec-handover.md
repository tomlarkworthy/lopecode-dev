---
topics: writing a design brief for the Claude Design agent; handing a lopecode surface to a designer; what a brief must contain; packaging the brief as a zip
triggers:
  - "^(Edit|Write|MultiEdit) .*plan/[a-z0-9-]*brief[a-z0-9-]*\.md"
---

# Preparing a good Claude Design spec handover

A record of two handovers to the Claude Design agent on 2026-08-29, one that worked and one that
did not, and what separated them. The designer is a language model working in claude.ai/design
with the Lopecode Design System bound (`knowledge/designer-resources-for-notebooks.md`); it cannot
open Claude Code artifacts, so the brief travels as a zip.

## The two handovers

| | Lopefeed (`plan/lopefeed-design-brief.md`) | Ledger v1 (same day, superseded) |
|---|---|---|
| subject | one page, the feed | one page, the author profile — but the brief opened with the feed |
| result | `Lopefeed Dark`: implementable, shipped as lopecode #210 the same day | designer composed feed + ledger on one artboard, drew a pane divider, omitted bulk delete, Bluesky link/unlink and standard.site publish |
| Tom | "OK the designer did a redesign … come up with a plan of implementation" | "they heavily mixed in lopefeed and did not get that the two panels are hosted via Lopepage and so the divider is not a design concern. They forgot all the important functionality like bulk deletion, editing the post metadata … a really bad handover that wasted time" |

The Lopefeed brief was 124 lines: what ships today as a literal layout sketch, seven numbered defects
from a live render, constraints, must/want tables, deliverables, open questions. Ledger v1 had the
same headings and failed anyway. The difference was where the detail went.

## What went wrong in Ledger v1, line by line

- A section "The new requirement: Ledger as an aside of the feed" (20 lines) explained how blog
  notebooks open a lopepage-2 split, that lopepage-2 has no responsive behaviour, and asked for the
  panel to "work as both a ~40% column at ≥1000px and a full-width block at ≤600px". Deliverable 2
  asked for "Feed + Ledger aside at 1280 and 390". **The designer designed what was described at
  length: the feed, the split, the divider.** The pane boundary is lopepage's job and should have been
  a one-line exclusion.
- The owner tools — 400 lines of source (`bulkBar`, module L306–729): delete with confirm and
  progress, compose/link/change/unlink Bluesky post with five message strings, standard.site
  publish/update/unpublish with a disclosed title/description form and a state probe — were one
  table row: "Owner actions as DS Button/TextInput/…: Delete N, link/unlink bsky post,
  publish/unpublish to standard.site, cancel selection". **The designer dropped what was summarised.**
- "Same card grammar as the feed … reuse the feed's byline/title/summary/actions/disclosures
  vocabulary" invited the feed onto the Ledger artboards.

The pattern: **the design agent allocates attention in proportion to the brief's word count, not
its importance markers.** Bold, "must have", M-numbering did not rescue a one-row summary.

## The shape that works (Ledger v2, `plan/ledger-design-brief.md`, 222 lines)

1. **§1 Scope, first, boxed.** "Design one thing: …" then "Not your concern, do not draw it:" naming
   every adjacent system by name — the sibling page, the host chrome (tab bar, panes, splitters,
   dividers), shared widgets (the sign-in popover from `at-login`). State the *container* the design
   fills (one scrolling column of `--theme-background`) and the widths it is shown at (860 / 380),
   and that narrow is the same design reflowed, not a second design.
2. **§2 Inventory, from source, exhaustive.** Read the module and enumerate: every element with its
   data field and today's value; every control with label, placeholder, prefill, and the rule that
   enables/hides it; every message string and confirm text verbatim; every state of every strip
   (signed out / owner / other). ASCII sketches of the composite widgets. Mark the few things that may
   be dropped; everything else is required by default. Include "data available (nothing else exists)"
   so the designer does not invent view counts or follow buttons.
3. **§3 Rules** that are decisions the designer must make and write down (the 380px table strategy;
   the bespoke-widget list with a reason per widget).
4. **§4 Deliverables as named artboards** with the exact contents of each (`ledger-owner-selected-1-860`
   — 1 row selected, layers A + B1 + B2, std.site form disclosed, bundle already linked and
   published, so `Change`/`Unlink`/`▸ Update…`/`Unpublish` and the at-URI are all visible). Ten
   artboards for Ledger. A designer cannot omit a flow that has an artboard named after it.
5. **§5 Open questions** — answer-in-the-note, non-blocking.

What to keep from the Lopefeed brief: the live-render defect list with measured numbers and the
screenshots, the constraints block (theme, tokens, DS components, "will be rebuilt in htl so bespoke
widgets cost"), and the ask to add artboards to the *same* design project so tokens are shared.

## Before sending — checklist

- [ ] Every control in the module source appears in the brief by its label. Grep the module for
      `<button`, `<input`, `<textarea`, `Inputs.`, `confirm(`, `textContent =` and reconcile.
- [ ] Every mention of another page or the host chrome is inside the not-your-concern list, and
      nowhere else at length.
- [ ] Each deliverable is a named artboard with its required visible state.
- [ ] Screenshots of today's page at both target widths are in the package, dated.
- [ ] The brief was written from the source, not from memory of the page.

## Packaging

The design agent cannot open Claude Code artifacts ("the bot cannot open artifacts. Can you zip it
up", 2026-08-29). Ship a zip: `<name>-brief/<name>-design-brief.html` (self-contained, screenshots
as data URIs, same stylesheet as the previous brief so the series reads alike), the `.md` source,
and the PNGs. Build the HTML with a Sonnet subagent from the `.md` (`feedback_delegate_mechanical_work_to_opus_on_fable`);
verify it parses and each embedded PNG decodes to the source byte count. `open <scratchpad dir>`
so Tom can drag it into the design chat. Commit the `.md` to `plan/` on lopecode-dev main.

## Not covered

Whether a shorter brief with the same structure would have worked as well — v2 has not been
handed over as of this writing (2026-08-29); its result will say whether length or structure did
the work.
