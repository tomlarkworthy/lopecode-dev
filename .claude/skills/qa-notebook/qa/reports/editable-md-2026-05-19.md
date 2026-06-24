## QA report: editable-md

**Date:** 2026-05-19
**Notebook:** lopebooks/notebooks/@tomlarkworthy_editable-md.html
**URL hash:** `#view=S100(@tomlarkworthy/editable-md,@tomlarkworthy/module-selection)&cc=TOKEN`
**Browser:** Playwright Chromium (headed, 1280×900)
**Trigger:** user-reported misfeature — "it inserts smart quotes which is a misfeature when trying to use strings inside interpolation blocks"

## Summary

User report **reproduced and confirmed as a high-severity correctness bug**. ProseMirror's `exampleSetup` enables the `smartQuotes` input rule, which silently rewrites straight `'`/`"` to U+2018/U+2019/U+201C/U+201D as the user types — including inside `${…}` interpolation blocks. On commit, `markdownToMdTagged → compile(...)` reports `SyntaxError: Unexpected character '“'`, the title cell is replaced with a `throw new SyntaxError(...)` stub, **and the corruption persists across reload via local-change-history** (provenance `source: "git"`). All other surfaces (focusout commit, in-notebook tests, click-to-edit happy path) behave as documented. 1 fail, 1 partial, 9 pass.

## Criterion scoring

| # | Criterion | Status | Evidence |
|---|---|---|---|
| 1 | Clear title | pass | H1 "Inline editable `md`" rendered (pre-corruption) |
| 2 | Explanation | pass | First paragraph describes drop-in replacement and SHIFT+ENTER commit |
| 3 | Doc matches impl | pass | Documented behaviors (click-to-edit, SHIFT+ENTER, `dom.markdown` getter, runtime push-back) all observed |
| 4 | Does what it says | **fail** | Smart-quote rewrite inside `${…}` produces uncompilable source → cell becomes throwing stub. SHIFT+ENTER ostensibly "parses back into the tagged template representation and pushes back" — but on this code path the user is given no warning, just a dead cell. |
| 5 | Feature list | partial | One undocumented behavior: commit-on-focusout. Prose only mentions SHIFT+ENTER. The `dom.markdown` getter is documented in section "Value access to the markdown" — good. |
| 6 | Lean code | pass | Module is ~10 cells of real logic + 5 self-tests; reuses prosemirror, observablejs-toolchain, exporter-3 |
| 7 | Scoped domain | pass | Single concern: inline-editable `md` template tag |
| 8 | Claims tested | partial | 5 self-tests cover `mdCellSourceToMarkdown`, `markdownToMdTagged`, escape round-trip, and prosemirror parser escape preservation. **None cover the smart-quote behavior of ProseMirror's `exampleSetup`** — the highest-impact failure mode is uncovered. |
| 9 | Serialization | not exercised | Did not export this pass; not relevant to user complaint |
| 10 | Adversarial / try to break | fail | Trivial adversarial input (typing `"foo"` inside `${}`) breaks the round-trip. The cell-replacement throws a `SyntaxError` whose stack lands the user in `_anonymous` with no path back to the original source from the in-page UI. |
| 11 | Clean console logs | pass | No errors at boot; no unexpected errors during normal interaction. (Verbose `keepalive: dynamic observe …` and `selectVariable Variable` chatter from runtime-sdk/editor-5 are pre-existing — out of scope.) |

## Issues found

### 1. ProseMirror `smartQuotes` input rule corrupts interpolation expressions — severity: high — criterion: #4, #10

- **What:** Typing a straight ASCII `'` or `"` into the ProseMirror editor — anywhere, including inside a `${…}` interpolation block — is silently auto-replaced with curly typographic quotes (U+2018/U+2019/U+201C/U+201D). On commit (SHIFT+ENTER or focusout) `markdownToMdTagged` faithfully forwards the curly characters into the JS template source, and `compile()` rejects them with `SyntaxError: Unexpected character '“' (line:col)`. The cell is then replaced with a throwing stub function and **the broken source is persisted to local-change-history**, surviving reload (history event shows `provenance.source: "git"`).
- **Where:** `@tomlarkworthy/editable-md` — `md` cell (pid `_9tswvb`), specifically inside the `saveAndRender()` closure that calls `compile(template)` after the editor is built from `prosemirror.exampleSetup({ schema })`. Root cause is upstream in `exampleSetup`: it bundles `smartQuotes()` from `prosemirror-inputrules`.
- **Evidence:**
  - PM editor inner text after typing ` ${"hello"} and ${'world'}`:
    `… ${“hello”} and ${‘world’} …` (curly quotes confirmed in `console.log("PM_TEXT", …)`).
  - Channel `history` event after SHIFT+ENTER:
    `{op: "upd", _name: "title", _inputs: [], _definition: "function _anonymous() { throw Object.assign(new SyntaxError(…)…"}`.
  - Definition body read via `__ojs_runtime._variables`:
    `throw Object.assign(new SyntaxError("Unexpected character '“' (11:142)"), {…})`.
  - After `location.reload()`: title cell renders as `title = SyntaxError: Unexpected character '“'`; derived `title.markdown` cell renders as `RuntimeError: Unexpected character '“'`. Recovery requires manually editing the cell via the JS code editor below.
- **Hypothesis:** Pass an inputRules-off variant of exampleSetup (`exampleSetup({ schema, ...({ inputRules: false } as any) })` is not supported by the default exampleSetup signature, so either:
  1. Construct plugins manually (omit `prosemirror-inputrules.smartQuotes`), or
  2. Re-straighten typographic quotes inside `${…}` regions in `markdownToMdTagged` before compile, or
  3. Strip the smart-quote rules from the returned plugin array after `exampleSetup(...)`.
  Option (1) is the lowest-risk fix. Option (3) is the lowest-diff fix.

### 2. Cell corruption is sticky across reload — severity: high — criterion: #4

- **What:** The thrown-stub definition from issue #1 is captured by `@tomlarkworthy/local-change-history` and re-applied on reload (provenance object names the local git branch). Until the user manually edits the JS cell, the rendered prose stays broken on every revisit. A naïve user has no obvious way to recover ("reload doesn't fix it" → friction).
- **Where:** Side effect of issue #1 + normal local-change-history behavior. The pairing is what makes #1 unrecoverable in the rendered surface.
- **Evidence:** Second `history` event after reload — same broken `_definition` with `provenance: {source: "git", repo: "/@tomlarkworthy/editable-md", oid: "2618ae7f…"}`.
- **Hypothesis:** Behavior is by-design for local-change-history; the asymmetry is that this notebook produces *uncompilable* commits with no in-prose rollback. Fixing issue #1 sidesteps this. A defence-in-depth would be: do not write the cell on commit failure — `saveAndRender` could compile *first*, only call `self.define(...)` on success, and surface the error to the user (e.g. flash the cell red or show an inline message) instead of pushing the stub.

### 3. Interactive-target filter may miss link clicks — severity: low — criterion: #4

- **What:** Clicking on the `test_defaultMarkdownParser_preserves_escapes` anchor link inside the rendered Known Issues bullet switched the cell into edit mode instead of navigating (URL hash unchanged, `.ProseMirror` mounted). Expected: `isInteractiveTarget` returns true (link `<a href="#…">` is in `interactiveSelector`).
- **Where:** `_9tswvb` (`md` cell), `isInteractiveTarget` closure.
- **Evidence:** After `qa_click(270, 343)` on the link, `LOCATION_HASH` unchanged and `PM_COUNT=1`. Editor visibly mounted with blue border around the bullet.
- **Hypothesis:** Either (a) the click landed on margin/padding adjacent to the `<a>`, not on it; or (b) `event.target` is the rendered link's wrapping element rather than the `<a[href]`, and `closest()` returns null for some structural reason. Verify by adding a brief `console.log(event.target.outerHTML)` at the top of the listener in a repro session. Not load-bearing for the user's stated complaint — flagging for follow-up.

## Per-notebook guidance applied
- No prior `qa/per-notebook/editable-md.md` existed; created at the end of this pass.

## Things checked and OK

**Feature inventory (`@tomlarkworthy/editable-md`):**
- Exports: `md` (the custom editable template tag, drop-in replacement for stdlib `md`), `markdownToMdTagged`, `mdCellSourceToMarkdown`, `tokenizeMarkdownTemplate`, `escapeTemplateChunk`, `irToEditableText`, `replaceArgPlaceholders`, `randstr`.
- Interactive controls inside the notebook: `viewof control` (Inputs.range), inline click-to-edit on every `md`-rendered cell, ProseMirror toolbar (Bold/Italic/Code/Link/Insert/Type/Undo/Redo/List/Indent/Blockquote/Image), keyboard shortcut SHIFT+ENTER, focusout commit.
- Persisted state: every commit is recorded in local-change-history → IndexedDB git branch.

**Happy-path coverage (matrix executed):**
| # | Feature | Action | Outcome |
|---|---|---|---|
| 1 | Click-to-edit | click on title prose at (200, 90) | editor mounted; toolbar visible; original markdown shown editable; `${control}` exposed as raw source |
| 2 | Template interpolation in render | read `control` then look at rendered text | "the value of the slider is: 0.5" — matches `control = 0.5` |
| 3 | `dom.markdown` getter | `await titleVar._value.markdown` | returns the full markdown source (965 chars), beginning `# Inline editable \`md\` …` |
| 4 | Focusout commit (undocumented) | type `FOCUSOUT_TEST`, click outside cell | history event fires with `op: upd, source: runtime`; cell `_definition` contains `FOCUSOUT_TEST` |
| 5 | Empty-edit commit | open Known Issues cell, type nothing, click outside | commit fires, cell unchanged in behavior, no error |
| 6 | Self-tests | inspect `test_*` variable values | all 5 resolve with `hasError: false` (test_mdCellSourceToMarkdown returns `"foo ${'cool'}"`, the four `expect(...)` tests resolve to undefined without throwing) |
| 7 | Boot console | drain after load | no JS errors; failed-requests are unrelated (notebookwebhook.mov 404 from embedded asset, harmless blob: aborts) |

**Adversarial coverage (matrix executed):**
| # | Technique | Action | Outcome |
|---|---|---|---|
| A1 | Special characters in `${…}` | type `${"hello"}` and `${'world'}` inside text, SHIFT+ENTER | **FAILS** — smart-quote rewrite breaks compile (issue #1) |
| A2 | Persistence round-trip | reload after A1 | **FAILS** — local-change-history re-applies broken cell (issue #2) |
| A3 | Empty commit | focusout with no typing | passes, see happy-path row 5 |
| A4 | Link click inside rendered md | click `test_defaultMarkdownParser_preserves_escapes` anchor | **PARTIAL** — opens editor instead of navigating (issue #3) |

## Notes for follow-up

- Issue #1 fix recommendation: rebuild the plugin array without the smart-quote input rule. The current call site is
  `prosemirror.exampleSetup({ schema: prosemirror.schema })`. The fix is to construct the plugins manually omitting `prosemirror-inputrules.smartQuotes()`, or to filter the returned plugin array.
- Issue #1 is **adversarial in the trivial-input sense** — any user who types `"` while editing prose will hit it eventually, not just when adding interpolation. Inside `${}` it produces a compile error; inside plain prose the user just gets curly quotes silently (which may or may not be wanted, but is at least non-destructive).
- Consider compile-then-define (issue #2 hypothesis) as defence-in-depth so future bugs in any future input-rule never reach local-change-history.
- The test suite would benefit from one new assertion: `expect(markdownToMdTagged('text ${"hi"} text')).toBe('md\`text ${"hi"} text\`')` and then `compile(...)` it — that would have caught issue #1 in isolation.
- Did not retest the documented "Known Issues" escape-loss item via UI this pass; the `test_defaultMarkdownParser_preserves_escapes` self-test resolved without error, suggesting the parser preserves at least the bare `\${}` case. The README's caveat is broader (escapes outside code blocks).
- I did not reset the corrupted local-change-history before closing; the next person to open this notebook will see the broken title until the JS cell is hand-edited or the IndexedDB store is cleared.
