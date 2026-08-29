# Designer resources for notebooks

A record of getting lopecode's input vocabulary in front of designers who work in
[Claude Design](https://claude.ai/design), 2026-08-26 → 2026-08-29. Claude Design builds UI from a
"design system" project of real React components; `/design-sync` (a bundled Claude Code skill)
converts a repo into that format and uploads it. Lopecode is not React, so what ships is a thin
mounting layer over the real thing.

## What exists

| artifact | where | state (2026-08-29) |
|---|---|---|
| Package source | `lopecode/design/` (lopecode repo, commit `cb777fc`) | canonical; self-contained, no submodule |
| Claude Design project | "Lopecode Design System", `69267aa4-420f-4bb0-bb9c-15b738446e84` | 17 components, all graded good, anchored to the committed `ds-bundle/` (`bundleSha12 23e3fae52aab`) |
| Hand-off for others | `lopecode/design/README.md` § "Sync it to claude.ai/design" | clone → `npm ci && npm run build` → `/design-sync`; config carries no `projectId`, so a stranger's run creates their own project |
| Design agent's brief | `lopecode/design/.design-sync/conventions.md` | prepended to the generated README; every token and prop name in it validated against the build |

The 17 components are the Observable Inputs (`Button Checkbox Color DateInput DatetimeInput
FileInput Form NumberInput Radio Range Search Select Table TextInput TextareaInput Toggle`) plus
`Theme`. Each wrapper mounts the real `@observablehq/inputs` DOM in a `useLayoutEffect` and
forwards the `input` event to `onChange`; nothing is reimplemented. `Theme` stamps
`data-lc-theme="<name>"` and paints `--theme-background`/`--theme-foreground` with notebook-kit's
`17px/1.5 var(--serif)` page font. The twelve themes are notebook-kit's, each compiled to a
`tokens/theme-<name>.css` scoped to `[data-lc-theme="<name>"]`.

Both upstreams are ISC, not MIT (`vendor/notebook-kit/package.json` `"license": "ISC"`, © 2025
Observable, Inc.; `@observablehq/inputs` 0.12.0 © 2021–2024). The notice rides in the built CSS
header, `LICENSE-THIRD-PARTY.md`, `package.json`, and the conventions header.

`lopecode-dev/design-system/` and `lopecode-dev/.design-sync/` were the first home; deleted in
`c203815` once the move was verified, because two copies would drift.

## What broke, and what the measurements said

Three defects, all found from designer output rather than from the component cards, because the
cards render each component alone on a wide canvas and none of these show there.

**1. The Range card "looked off".** Measured card vs the `inputs-reference` notebook
(`.ds-sync/truth-probe.mjs`, 2026-08-28): identical — form 360px, label 120, number 165, slider 188,
13px Inter. The cause was presentation: the `Theme` provider painted a one-row black strip on a
white card, magnified ~2× by the design pane. Fix: `Theme` carries the notebook page font, and the
preview provider gets `padding: 16px 20px; min-height: 80px`. All 17 grades cleared and re-run.

**2. Forms overflowed the designer's panels by exactly the panel padding** (screenshot, 2026-08-29:
text inputs 38px past the border, textarea ~320px, Range past the viewport). Inputs' form CSS is
`width: calc(--input-width + --label-width); max-width: 100%`, and the percentage resolves against
the wrapper `<div>` the hook mounts into. A column-flex panel with `align-items: flex-start` sizes
that div to max-content, so `max-width` never bites. Reproduced against the built bundle in six panel
layouts (`.ds-sync/overflow-probe.mjs`):

```
col-flex flex-start panel, 360px:  TextInput over 38   TextareaInput over 318   Range over 38
same, host width:100%; min-width:0:               0                        0              0
```

Fix in the wrapper (`Host` div: `width: 100%; min-width: 0; box-sizing: border-box`), so every
design gets it whether or not the agent read the docs. One hazard the wrapper cannot absorb: a bare
`1fr` grid track grows to the 640px textarea form and the *grid* overflows the page (measured: two
`1fr` panels came out 682px each inside a 760px grid). `conventions.md` says `minmax(0, 1fr)`.

**3. After (2), the two Range rows still overflowed.** Rendered the designer's actual
`ThemeSwitcher.dc.html` locally — fetched with `DesignSync get_file` along with their `support.js`
runtime, served through a Playwright `route` (`.ds-sync/dc-probe.mjs`):

```
form 360   .inputs-input div 360   number 165   range 188     -> label 120 + 360 = 487 in a 360 form
```

Cause: `build.mjs` emitted notebook-kit `global.css` *after* the Inputs CSS. Its
`input[type=range|number] { width: 240px }` has the same specificity as Inputs'
`.inputs-…-input > input { width: inherit }`, so the later fixed width won, and fixed-width children
give the flex row an automatic minimum the label pushes out. notebook-kit loads Inputs CSS via
`runtime/stdlib/inputs.css` *with the runtime*, i.e. after `global.css`, and that file also carries
the dark-theme table overrides — the white `<thead>` in the designer's table was the same ordering
bug. Order is now shared CSS → Inputs CSS → `stdlib/inputs.css` → theme. After:

```
form 360   .inputs-input div 234   number 92   range 135      page scrollWidth == viewport
```

**The lopecode `inputs-reference` notebook measures the same 120/165/188** — the defect is inherited
from lopecode's own stylesheet order, invisible there because a notebook form has no border. Not
fixed in lopecode; that is a shared-module change.

## How to tell whether a designer's project is current

A consuming design project holds a *bound copy* of the design system under
`_ds/lopecode-design-system-<projectId>/`; "resync" in the app refreshes that copy. The check that
settled "the resync didn't work" (2026-08-29): `md5` of `_ds_bundle.js` in three places — local
build, the DS project, the bound copy — all `abcb0e7d0c7e`. The copy was current; the remaining
overflow was defect 3 above.

## Sync mechanics worth knowing

- Run `/design-sync` with cwd `lopecode/design`. The converter needs `--entry dist/index.js`
  (without it: `ENOENT …/node_modules/@lopecode/design-system/package.json`).
- The driver keys re-grading on component *source*. A wrapper-style-only change (defect 2) changes
  the bundle but no source key, so it skips the visual check; run
  `package-validate.mjs ds-bundle --render-sample 0` by hand.
- A bare `package-build.mjs` run rewrites `ds-bundle/_ds_sync.json`; copy the remote anchor *before*
  building or the diff sees no change.
- Upload order is sentinel `_ds_needs_recompile` → content → sentinel → `_ds_sync.json` last, so the
  anchor never vouches for a half-applied state.
- Per-machine state the skill does not restore: `.ds-sync/` staged from the bundled skill dir
  (path changes per Claude Code version), `chromium_headless_shell-1169` in
  `~/Library/Caches/ms-playwright/` (`npx playwright install` hung; a direct fetch of the zip worked).
- `tokensGlob` is relative to the tokens *package*, not the repo.
- Anything the design agent adds inside the project by hand (it added `/* @kind font */` on the
  four font/spacing tokens and a root `LICENSE-THIRD-PARTY.md`, three times) is overwritten by the
  next sync. Both now come from the repo (lopecode `b878009`): `build.mjs` annotates `--serif`,
  `--sans-serif`, `--monospace` (`font`) and `--max-width` (`spacing`), and `guidelinesGlob:
  ["LICENSE-THIRD-PARTY.md"]` ships the licence as `guidelines/LICENSE-THIRD-PARTY.md` — the only
  plan path that carries a loose file (a user-supplied glob bypasses the converter's LICENSE
  exclusion; a root path is outside the plan's writes).

## Not done

- `editor-5` and `lopepage-2` were scoped as best-effort follow-ups and not attempted; their runtime
  dependencies make them a port, not a wrapper.
- `Form` exposes `fields: { name: (I) => I.text(...) }`, a bag of raw Inputs builders. A composable
  `<Form><TextInput name=…/></Form>` would suit the design agent better; unbuilt, unasked.
- The lopecode-side stylesheet order (defect 3) is recorded, not fixed.
