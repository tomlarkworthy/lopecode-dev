# design-sync notes — Lopecode Design System

Started 2026-08-26. Target project `69267aa4-420f-4bb0-bb9c-15b738446e84` ("Lopecode Design System"). An earlier project `96a2db57…` of the same name was created under a different design login on 2026-08-26 and became unreachable after a `/design-login` switch — it may still exist in that other account, empty. Re-confirmed 2026-08-28 after a machine transfer: `get_project` on 69267aa4 → editable, `list_files` → empty; 96a2db57 → 404. Config re-pinned to 69267aa4.

## What the synced package is

- Lopecode is a notebook corpus (Observable runtime, single-file HTML), not a React package. The
  sync source is `design-system/` — a small in-repo package of React wrappers (`src/index.tsx`)
  that mount the real `@observablehq/inputs` DOM elements (the input vocabulary
  `@tomlarkworthy/inputs-reference` documents). No component is reimplemented; the wrapper is
  mounting glue + an `input`-event → `onChange` bridge.
- Component names: `TextInput`/`TextareaInput`/`NumberInput`/`DateInput`/`DatetimeInput`/`FileInput`
  are suffixed because the bare names shadow JS globals in any importing file. The rest
  (`Button`, `Toggle`, `Checkbox`, `Radio`, `Select`, `Range`, `Color`, `Search`, `Table`, `Form`)
  keep the Inputs names. `Theme` scopes a notebook-kit theme via `[data-lc-theme]`.
- Styling: `design-system/build.mjs` assembles `dist/styles.css` (Inputs' own `dist/index.css` +
  notebook-kit `global/inspector/highlight/plot/index.css` + the default theme on `:root`) and
  `dist/tokens/theme-<name>.css` (each theme with `:root` rewritten to `[data-lc-theme="<name>"]`).
  Sources are `vendor/notebook-kit/src/styles/` — the same files `@tomlarkworthy/themes` fetches
  at runtime, pinned there at commit `6c2ec69` (an ancestor of the vendored HEAD; only
  `global.css`/`inspector.css` differ by 8 lines).
- Default theme is `near-midnight` — `@tomlarkworthy/themes`' fallback (`themes.get('near-midnight')`).
  12 themes synced (the module's list); notebook-kit also has `theme-ink.css`, deliberately not
  included because the lopecode module doesn't expose it.
- Fonts: notebook-kit's `global.css` names `Inter Variable`, `Source Serif 4 Variable`,
  `Spline Sans Mono Variable`; notebook-kit depends on `@fontsource-variable/*` for them, so
  the package does too and `extraFonts` points at their `index.css`. Lopecode notebooks
  themselves fall back to `ui-serif`/`ui-sans-serif`/Menlo (no fonts shipped) — the synced DS is
  therefore slightly *more* faithful to notebook-kit than to a live lopecode page.
- `theme-deep-space.css` and `theme-stark.css` import `syntax-dark.css` directly (no
  `abstract-*`); build.mjs follows each theme's real `@import` chain rather than assuming a shape.

## Environment

- The bundled skill scripts under `/private/tmp/claude-502/bundled-skills/...` were wiped mid-run
  on 2026-08-26 (along with the session scratchpad); the skill must be re-invoked by the user to
  restage them — it is `disable-model-invocation`.
- esbuild's postinstall is blocked by the npm install-scripts policy here; run
  `node design-system/node_modules/esbuild/install.js` after a fresh `npm i` in `design-system/`.
- Playwright chromium is at `~/Library/Caches/ms-playwright/chromium-1169` (playwright-core 1.52.0
  at the repo root) — the macOS cache path, not `~/.cache/ms-playwright`.

- `tokensGlob` is resolved relative to the tokens PACKAGE (`node_modules/@lopecode/design-system-tokens`,
  a `file:./tokens` symlink), not to `design-system/`. `"tokens/theme-*.css"` silently copied 0 files
  (build log `tokens: 0 files`); `"theme-*.css"` with `tokensPkg` set explicitly copies all 12.
- The render check launches `chromium_headless_shell-<rev>`, a separate download from `chromium-<rev>`;
  a cache with only `chromium-1169` fails `[RENDER_SKIPPED] Executable doesn't exist`. Install with
  `npx playwright install chromium-headless-shell` from `.ds-sync/` (playwright pinned 1.52.0 there
  to match the cached revision).

## First upload (2026-08-28)

- 17 components, 17 authored previews all graded good, render check 17/17 clean, no warn lines
  (so "Known render warns" is empty — any warn on a re-sync is new). 121 files uploaded to
  69267aa4 on the atomic path (sentinel → content → sentinel → `_ds_sync.json`); `report_validate`
  counts total 17 / bad 0 / thin 0 / identical 0 / iterations 3.
- `cfg.overrides.<Name>.cardMode = "column"` on Color, Form, NumberInput, Range, Search, TextInput,
  Theme — the `[GRID_OVERFLOW]` set from the first validate; presentation-only.
- Range's `format` must return a numeric string (Inputs writes it into `<input type=number>`,
  which blanks on "1×"). Documented on `RangeProps.format` in `src/index.tsx`; the Formatted story
  uses `toFixed(2)`.
- Conventions header: `.design-sync/conventions.md` (tokens-only idiom, `Theme` wrapper); every
  token/component name in it was checked against the built `styles.css`/`tokens/` and
  `components/general/` before upload.

## Second upload (2026-08-29) — panel presentation

- Tom: "the range sliders look off". Measured against the inputs-reference notebook (probe
  `.ds-sync/truth-probe.mjs`): card and notebook are pixel-identical — form 360px, label 120 /
  number 165 / slider 188, 13px Inter. What looked wrong was the `Theme` provider painting a
  one-row-tall black strip across a white card, shown ~2x in the design pane. Fix: `Theme` now
  applies notebook-kit's `html` font (`17px/1.5 var(--serif)`), and the preview provider carries
  `style: {padding: "16px 20px", minHeight: "80px"}` so every card is a padded notebook panel.
  Provider change is preview-affecting → all 17 grades cleared and re-graded good.

## Re-sync risks

- `vendor/notebook-kit` moving past the pinned themes commit changes the theme CSS silently; the
  lopecode runtime still fetches `6c2ec69`. Diff `src/styles` between the two before trusting a rebuild.
- `@observablehq/inputs` version drift (0.12.0 at first sync) changes `dist/index.css` and
  component markup.
- `.design-sync/.cache/review/*.grade.json` is gitignored; on a fresh clone the anchor in the uploaded
  `_ds_sync.json` is the only carry-forward — fetch it before the driver run or everything re-verifies.
- The headless-shell browser and `.ds-sync/` staging are machine state; a transferred machine needs
  both re-created (see Environment).

## Re-sync driver invocation (recorded 2026-08-29)

Run from the repo root; `--entry` is required (the package has no `main` the converter can find on its own):

    node .ds-sync/resync.mjs --config .design-sync/config.json \
      --node-modules design-system/node_modules --entry design-system/dist/index.js \
      --out ds-bundle --remote <fetched _ds_sync.json>

Without `--entry` the build fails with `ENOENT …/node_modules/@lopecode/design-system/package.json`.
2026-08-29 re-sync: anchor ok, 17/17 unchanged, no upload needed.

## Third upload (2026-08-29) — host width fix

A designer-built page showed every input overflowing its panel by the panel padding, and the
textarea by ~320px. Cause: Inputs forms are `width: calc(--input-width + --label-width)` with
`max-width: 100%`, and the percentage resolves against the wrapper `<div>` the hook mounts into.
A column-flex panel with `align-items: flex-start` sizes that div to max-content, so the form
never shrinks. Fix: `Host` now carries `width: 100%; min-width: 0; box-sizing: border-box`.
Reproduced and verified with `.ds-sync/overflow-probe.mjs` (six panel variants; 38px/318px
overflow before, 0 after). A bare `1fr` grid track is a second hazard the DS cannot fix (the
track grows to the 640px textarea form); conventions.md now says `minmax(0, 1fr)`.
The driver keyed all 17 as unchanged (host style is bundle-only, not a sourceKey), so the
render check was run by hand (`package-validate.mjs ds-bundle --render-sample 0`, 17/17).

## Fourth upload (2026-08-29) — stylesheet order

The designer's Theme Switcher page still overflowed on the two Range rows after the host fix.
Rendered locally (`.ds-sync/dc-probe.mjs` serves the fetched `.dc.html` + `support.js` through
a Playwright route): the `.inputs-…-input` div was 360px inside a 360px form next to a 120px
label. Cause: `styles.css` emitted notebook-kit `global.css` AFTER the Inputs CSS, so its
`input[type=range|number] {width:240px}` beat Inputs' `width:inherit` at equal specificity;
fixed-width children give the div a min-content the label pushes out. notebook-kit itself loads
Inputs CSS through `runtime/stdlib/inputs.css` with the runtime, i.e. after global.css, and that
file also carries the dark-theme table overrides (the white `thead` was the same ordering bug).
`build.mjs` now emits shared CSS, then Inputs CSS, then stdlib/inputs.css, then the theme.
After: input div 234px, number 92 + slider 135; page scrollWidth == viewport.
The lopecode reference notebook (`inputs-reference.html`) measures the same 120/165/188 overflow
— the bug is inherited from lopecode's own stylesheet order, not introduced here.
Driver gotcha: run `package-build.mjs` only through the driver, or copy the anchor BEFORE
building — a bare build rewrites `ds-bundle/_ds_sync.json`, and the diff then sees no change.

## Moved (2026-08-29): canonical source is now lopecode/design

The package, previews, conventions and a verified `ds-bundle/` live in the `lopecode` repo at
`design/` (commit cb777fc), with notebook-kit's style sources vendored so no submodule is needed
and `config.json` unpinned so a stranger's `/design-sync` creates their own project. The live
project 69267aa4 was re-anchored from that build (bundleSha12 23e3fae52aab). Building there gives
different hashes from building here only because `lopecode/design/package.json` is
`"type": "module"` (esbuild emits `"use strict"` in previews and a different entry comment).
Sync from `lopecode/design` from now on; `lopecode-dev/design-system` is the stale twin.
