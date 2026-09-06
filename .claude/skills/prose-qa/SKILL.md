---
name: prose-qa
description: Use when the user asks to "prose QA", "/prose-qa <notebook>", "check which paragraphs read as AI", "run pangram on the newsletter", or as the prose step of a /qa-notebook pass on a PUBLIC blog, newsletter or paper. Scores a module's markdown with Pangram 4 (paid API, ~$0.05 per 100 words), then drops one annotation on every paragraph that still reads as machine-written so the author can rewrite it in place. Not for internal programming notebooks — their prose need not be human.
version: 0.1.0
---

# Prose QA with Pangram

Pangram is an AI-text detector, not an editor. Its output is a score per window of text plus
character offsets. This skill maps those windows onto the paragraphs of one module's `md`
cells and turns each flagged paragraph into an `@tomlarkworthy/annotate` note pinned to the
paragraph's first line. The author rewrites, saves in place, and rescores.

The detector does not know what good prose is. A flag means "this paragraph carries the
statistical signature of LLM output", which in this corpus is usually fluent, evidence-free,
timeless prose (see the `document` skill). The fix is specifics, dates, numbers, observed
facts, in the author's own phrasing. Never run a rewrite loop against the score.

## Scope gate

Only public prose: blog posts, newsletters, papers, the tour. Internal programming notebooks
are exempt unless the user names one. Tom, 2026-09-06: "some internal programming notebooks
don't need to be written by human, it's only for blog posts."

## Cost

One credit per started 100 words, $0.05 each, on Pangram 4 (`model: "pangram-4"`). The key
lives in `tools/prose-qa/.env` (gitignored, `PANGRAM_API_KEY=…`). Prepaid credit; a `402
Insufficient credits` means top up at pangram.com/solutions/api. The dry run prints the exact
credit count before anything is spent. Proceed without asking below $3; ask above.

## Steps

1. **Dry run** to see the paragraph count, cost, and the exact text that will be sent:
   ```
   bun tools/prose-qa/pangram-score.ts <notebook.html> --module <id>
   ```
   Eyeball the text for markdown or `${…}` residue; the stripper is approximate.

2. **Score and emit cells**:
   ```
   bun tools/prose-qa/pangram-score.ts <notebook.html> --module <id> --score \
     --emit-cells tools/prose-qa/reports/<slug>-cells.ojs [--min 0.7]
   ```
   The raw response is saved under `tools/prose-qa/reports/` and can be replayed with
   `--from <json>` at no cost (change `--min`, re-emit).

3. **Place the annotations in the live notebook.** The notebook must be paired (open it with
   the usual `cc=TOKEN` recipe if not). Then:
   - Check the module already imports `annotation`: `lope-reader --get-module <id> | grep
     'v.import("annotation"'`. If absent, `define_cell` the import FIRST:
     `import {annotation} from "@tomlarkworthy/annotate"` (an import defined after a reference
     is dropped on export).
   - Check `bootconf.json` `mains` includes `@tomlarkworthy/annotate`; if not, the cells still
     persist but nothing paints them. Tell the user.
   - `list_cells` on the module; `delete_cell` every existing `annotation_prose_*` and
     `annotation_prose_*_note` so a rescore replaces rather than stacks.
   - `define_cell` each cell from the emitted file in order, `module: <id>`. Each flagged
     paragraph is two cells: `annotation_prose_<pid>_<n>` and its `_note`.

4. **Tell the user to save in place** (or export). Annotations are cells in the module, so
   they persist with it and round-trip through export.

5. **Report**: headline, `fraction_ai` / `fraction_ai_assisted` / `fraction_human`, the number of
   paragraphs at or above the threshold, and the opening words of each. When run inside a
   `/qa-notebook` pass this is criterion 17 of `qa/general.md`.

## Rescoring

After edits, repeat steps 1 to 3. Paragraphs that now pass lose their annotation in the
delete step. Compare `fraction_ai` across the saved reports rather than trusting one run.

## Known limits

- Anchors quote one source line with no `${…}` hole in it, so a note lands on the longest
  plain run of the paragraph, not necessarily its first sentence.
- Quoted material, transcripts and structured technical text draw false positives. Read the
  flagged paragraph before rewriting it; a quote from a paper is meant to sound like the paper.
- The phrase-level explanations ("delve", "a testament to", with likelihood ratios) exist only
  in Pangram's web dashboard, not in the API. `public_dashboard_link` is off by default.
