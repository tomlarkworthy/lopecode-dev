# Module store — extraction & skew report

Scanned 203 notebooks across 2 directories.

- Distinct @tomlarkworthy/* modules: **223**
- With a home notebook (authoritative): **175**
- Orphans (no home, canonical = mode): **48**
- **Skewed** (>1 version embedded): **48**

## Skewed modules (canonical chosen ✓)

| Module | Versions | Copies | Canonical | Stale copies |
|---|---|---|---|---|
| `@tomlarkworthy/exporter-3` | 9 | 201 | home `dbb8c35c` | 199 |
| `@tomlarkworthy/cell-map` | 6 | 203 | home `c8281cd2` | 24 |
| `@tomlarkworthy/module-selection` | 6 | 203 | home `4a1faa9f` | 5 |
| `@tomlarkworthy/themes` | 6 | 201 | home `2320f0d9` | 199 |
| `@tomlarkworthy/exporter-2` | 5 | 10 | home `a9c2b2ac` | 6 |
| `@tomlarkworthy/cells-to-clipboard` | 4 | 203 | home `7af7898b` | 189 |
| `@tomlarkworthy/runtime-sdk` | 4 | 203 | home `d6da0322` | 9 |
| `@tomlarkworthy/acorn-8-11-3` | 3 | 203 | mode `cfbb603f` | 15 |
| `@tomlarkworthy/flow-queue` | 3 | 203 | home `97db7ca4` | 6 |
| `@tomlarkworthy/local-storage-view` | 3 | 203 | home `da3fda1c` | 6 |
| `@tomlarkworthy/module-map` | 3 | 203 | home `ddf9b084` | 3 |
| `@tomlarkworthy/observablejs-toolchain` | 3 | 203 | home `b89f6c3c` | 195 |
| `@tomlarkworthy/stream-operators` | 3 | 203 | home `e36abaed` | 189 |
| `@tomlarkworthy/summarizejs` | 3 | 203 | home `d5ca198f` | 5 |
| `@tomlarkworthy/visualizer` | 3 | 203 | home `006c7bdb` | 5 |
| `@tomlarkworthy/bootloader` | 3 | 203 | home `5714a03c` | 21 |
| `@tomlarkworthy/openai-responses-api` | 3 | 21 | home `6f30587b` | 3 |
| `@tomlarkworthy/tabbed-pane-view` | 3 | 21 | home `19bc7f79` | 2 |
| `@tomlarkworthy/whisper-input` | 3 | 21 | home `ca076f10` | 2 |
| `@tomlarkworthy/robocoop-2` | 3 | 20 | home `47a5db4e` | 3 |
| `@tomlarkworthy/prosemirror` | 3 | 11 | home `cda535d6` | 6 |
| `@tomlarkworthy/claude-code-pairing` | 2 | 203 | home `9ef62cad` | 6 |
| `@tomlarkworthy/dataflow-templating` | 2 | 203 | home `252c8b30` | 6 |
| `@tomlarkworthy/dom-view` | 2 | 203 | home `5d93999f` | 6 |
| `@tomlarkworthy/escodegen` | 2 | 203 | mode `d5e79311` | 6 |
| `@tomlarkworthy/golden-layout-2-6-0` | 2 | 203 | home `24f5fad0` | 6 |
| `@tomlarkworthy/import-notebook` | 2 | 203 | home `b6b75803` | 3 |
| `@tomlarkworthy/inspector` | 2 | 203 | home `4388a121` | 5 |
| `@tomlarkworthy/isomorphic-git-1-30-1` | 2 | 203 | mode `16fa79b7` | 6 |
| `@tomlarkworthy/jest-expect-standalone` | 2 | 203 | home `418ef332` | 6 |
| `@tomlarkworthy/jszip-3-10-1` | 2 | 203 | mode `2b119c57` | 6 |
| `@tomlarkworthy/lightning-fs-4-6-0` | 2 | 203 | mode `1f609555` | 6 |
| `@tomlarkworthy/lopepage-urls` | 2 | 203 | home `28f1a311` | 1 |
| `@tomlarkworthy/observable-runtime-v6` | 2 | 203 | home `6bc9db7b` | 5 |
| `@tomlarkworthy/reversible-attachment` | 2 | 203 | home `bd5c80a2` | 6 |
| `@tomlarkworthy/spectral-layout` | 2 | 203 | home `35a448bc` | 5 |
| `@tomlarkworthy/tests` | 2 | 203 | home `a4ead3e1` | 6 |
| `@tomlarkworthy/view` | 2 | 203 | home `970bf1f3` | 5 |
| `@tomlarkworthy/file-sync` | 2 | 202 | home `adcaf784` | 4 |
| `@tomlarkworthy/modern-screenshot` | 2 | 21 | home `2068c45a` | 3 |
| `@tomlarkworthy/editable-md` | 2 | 10 | home `1b4d30b4` | 1 |
| `@tomlarkworthy/robocoop-3` | 2 | 10 | home `ada2416d` | 3 |
| `@tomlarkworthy/blank-notebook` | 2 | 5 | home `4c06c87c` | 1 |
| `@tomlarkworthy/at-write` | 2 | 4 | mode `27d7c087` | 1 |
| `@tomlarkworthy/atlas` | 2 | 4 | home `ebe077f3` | 1 |
| `@tomlarkworthy/reactive-reflective-testing` | 2 | 4 | home `a306e224` | 3 |
| `@tomlarkworthy/dexie-4` | 2 | 3 | mode `e3fbf164` | 1 |
| `@tomlarkworthy/debugger-2` | 2 | 2 | home `d4c2987a` | 1 |

## Orphan modules (no home notebook)

These have no `@author_<name>.html` home; canonical = most-common copy. Review:

- `@tomlarkworthy/acorn-8-11-3` (3 version(s), 203 copies)
- `@tomlarkworthy/escodegen` (2 version(s), 203 copies)
- `@tomlarkworthy/isomorphic-git-1-30-1` (2 version(s), 203 copies)
- `@tomlarkworthy/jszip-3-10-1` (2 version(s), 203 copies)
- `@tomlarkworthy/lightning-fs-4-6-0` (2 version(s), 203 copies)
- `@tomlarkworthy/at-write` (2 version(s), 4 copies)
- `@tomlarkworthy/dexie-4` (2 version(s), 3 copies)
- `@tomlarkworthy/footer` (1 version(s), 34 copies)
- `@tomlarkworthy/reconcile-nanomorph` (1 version(s), 14 copies)
- `@tomlarkworthy/bulma` (1 version(s), 10 copies)
- `@tomlarkworthy/testing` (1 version(s), 10 copies)
- `@tomlarkworthy/fetchp` (1 version(s), 6 copies)
- `@tomlarkworthy/serverless-cells` (1 version(s), 6 copies)
- `@tomlarkworthy/at-login` (1 version(s), 4 copies)
- `@tomlarkworthy/atproto` (1 version(s), 4 copies)
- `@tomlarkworthy/api-hosting-with-express` (1 version(s), 4 copies)
- `@tomlarkworthy/blog-navigation` (1 version(s), 4 copies)
- `@tomlarkworthy/blog-sidebar` (1 version(s), 4 copies)
- `@tomlarkworthy/firebase-admin` (1 version(s), 4 copies)
- `@tomlarkworthy/github-backups` (1 version(s), 4 copies)
- `@tomlarkworthy/repository-dispatch-min` (1 version(s), 4 copies)
- `@tomlarkworthy/secure-random-id@65` (1 version(s), 4 copies)
- `@tomlarkworthy/serverside-cells` (1 version(s), 4 copies)
- `@tomlarkworthy/netlify-deploy` (1 version(s), 3 copies)
- `@tomlarkworthy/aws4fetch` (1 version(s), 3 copies)
- `@tomlarkworthy/exporter` (1 version(s), 3 copies)
- `@tomlarkworthy/ledger` (1 version(s), 1 copies)
- `@tomlarkworthy/at-read` (1 version(s), 1 copies)
- `@tomlarkworthy/lopefeed` (1 version(s), 1 copies)
- `@tomlarkworthy/modules` (1 version(s), 1 copies)
- `@tomlarkworthy/grid@1105` (1 version(s), 1 copies)
- `@tomlarkworthy/dependancy` (1 version(s), 1 copies)
- `@tomlarkworthy/metaprogramming` (1 version(s), 1 copies)
- `@tomlarkworthy/agentic-planner` (1 version(s), 1 copies)
- `@tomlarkworthy/agentic-planner-prototype` (1 version(s), 1 copies)
- `@tomlarkworthy/editor-4` (1 version(s), 1 copies)
- `@tomlarkworthy/gepa` (1 version(s), 1 copies)
- `@tomlarkworthy/robocoop-eval` (1 version(s), 1 copies)
- `@tomlarkworthy/just-bash` (1 version(s), 1 copies)
- `@tomlarkworthy/justbash-session` (1 version(s), 1 copies)
- `@tomlarkworthy/justbash-filesync` (1 version(s), 1 copies)
- `@tomlarkworthy/justbash-terminal` (1 version(s), 1 copies)
- `@tomlarkworthy/codemirror-6` (1 version(s), 1 copies)
- `@tomlarkworthy/codemirror-6-22-2-view` (1 version(s), 1 copies)
- `@tomlarkworthy/editor` (1 version(s), 1 copies)
- `@tomlarkworthy/minicell` (1 version(s), 1 copies)
- `@tomlarkworthy/track-parent` (1 version(s), 1 copies)
- `@tomlarkworthy/js-toolchain` (1 version(s), 1 copies)
