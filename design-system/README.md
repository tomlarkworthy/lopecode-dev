# @lopecode/design-system

React wrappers over [Observable Inputs](https://github.com/observablehq/inputs), themed with the twelve [Observable Notebook Kit](https://observablehq.com/notebook-kit/) themes. Built for syncing lopecode's input vocabulary to claude.ai/design; the wrappers mount the real Inputs DOM, they do not reimplement it.

`npm run build` writes `dist/index.js`, `dist/styles.css` (Inputs CSS + Notebook Kit global styles + the default theme) and `tokens/theme-<name>.css` (each theme scoped to `[data-lc-theme="<name>"]`) from `vendor/notebook-kit/src/styles`.

## Attribution

The CSS is Observable, Inc.'s work, redistributed under its ISC license:

- `@observablehq/inputs` — ISC, Copyright 2021–2024 Observable, Inc.
- `@observablehq/notebook-kit` — ISC, Copyright 2025 Observable, Inc.

Full texts in [LICENSE-THIRD-PARTY.md](LICENSE-THIRD-PARTY.md). The wrapper code in `src/` is ISC as well.
