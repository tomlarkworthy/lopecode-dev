# Notebook QA

Guidance for QA passes on lopecode notebooks. Used by the `qa-notebook` skill (see `.claude/skills/qa-notebook/SKILL.md`) and by humans running checks by hand.

## Files

- **`general.md`** — universal criteria every notebook should pass. Read this before every QA pass.
- **`per-notebook/<notebook-slug>.md`** — notebook-specific guidance: known issues, important interactions to exercise, shape of "good output." Created/updated by QA passes — every pass that learns something new about a specific notebook should append to this file.
- **`reports/`** — output. One report per pass, named `<notebook-slug>-<YYYY-MM-DD>.md`. Reports are evidence; `per-notebook/` files are durable knowledge distilled from many reports.

## Workflow for a QA pass

1. Read `general.md` and `per-notebook/<slug>.md` (if it exists).
2. Run the pass via the `qa-notebook` skill (Playwright + lopecode MCP introspection).
3. Write the report to `reports/`.
4. **If you learned something durable** (a new failure mode, a tricky interaction worth re-testing, a behavioral quirk that's actually intentional), append it to `per-notebook/<slug>.md` so the next pass benefits.

## What goes where

- **General criterion**: applies to every notebook. → `general.md`
- **Findable from this notebook's source**: e.g. cell names, layout. → don't write down, derive at QA time.
- **Notebook-specific behavior or known quirk**: e.g. "the right-pane checkbox doesn't open a module — drag-into-pane instead." → `per-notebook/<slug>.md`
- **One pass's findings**: → `reports/<slug>-<date>.md`
