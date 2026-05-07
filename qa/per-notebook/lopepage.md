# lopepage — per-notebook QA guidance

The GoldenLayout-based shell that hosts every other lopecode notebook in tabs/stacks. Boot config sets `mains: ["@tomlarkworthy/lopepage"]` and a default `#view=R100(S70(@tomlarkworthy/lopepage),S30(@tomlarkworthy/module-selection))`. Almost everything the user can see depends on this notebook routing the URL hash → live layout correctly.

## Recommended hash to QA with

Use the bootconf default. For URL-routing tests, you can also try multi-stack hashes like `R100(S50(@a),S50(@b,@c))` to verify focus/stack semantics.

## Feature inventory

Cells worth exercising:

| Cell | What it does | How to verify |
|---|---|---|
| `page` | Top-level DOM container that golden-layout mounts into | Renders at boot — verify `qa_screenshot` shows panes |
| `layout` | The GoldenLayout instance | `get_variable layout` — should be a non-null `GoldenLayout` |
| `sync_layout_from_url` | Reads URL hash → applies via `treeSyncGolden` | Set hash, screenshot tabs |
| `sync_layout_to_url` | Reads layout state → commits canonical view= | After interaction, `location.hash` should match the live layout |
| `treeSyncGolden` | Non-destructive layout reconciler | Indirect — exercised by every hash sync |
| `setHashURL` | Atomic hash write that drops `from`/`open`/`close`/`focus` | After commit, the intent params should be cleared |
| `test_url_roundtrip` | Self-test: pre-URL == post-URL | `get_variable test_url_roundtrip` should be `true` |
| `modulePanel` / `blobPanel` | golden-layout component factories | They're functions; the test is "do tabs render" |
| `settings` | Golden-layout config (header icons, etc.) | `get_variable settings` |
| `appendScrollLog` / `scrollLog` | In-page tracing — does NOT go to console | Inspect for clues, but don't rely on it being trimmed |

Documented intent params in the URL (per the "State model" section of the notebook): `view`, `open`, `close`, `focus`, `from`. **Only `view` and `open` are implemented** at the time of the 2026-05-07 QA pass — the others trigger the layout-wipe regression below.

## Known-bad behaviors to re-verify on every pass

1. **`#close=X` wipes the layout.** Any hash without a `view=` (close=, focus=, cc= alone, unknown params) collapses to `S100()`. Root cause: `sync_layout_from_url` only reads `view` and `open`; null view → `parseGoldenDSL(null)` → empty stack → `treeSync` prunes everything.
2. **`#focus=X` does the same wipe**, even when X is a tab in the live layout.
3. **The notebook's own "reset view" link** (`<a href="#testNavigation">`) triggers issue #1 because `#testNavigation` has no `view=`. Clicking it nukes tabs.
4. **The "refresh page" link** is hardcoded to `https://observablehq.com/@tomlarkworthy/lopepage#testNavigation`. Wrong on file://, GitHub Pages, or anywhere except the upstream Observable URL.
5. **Malformed view= sticks in the URL** without canonical recovery — e.g. `#view=R100(S50(@x/y` (no closing paren) renders 1 tab and leaves the URL un-rewritten so a refresh re-loads the broken state. Root cause is permissive `parseViewDSL` (see lopepage-urls QA issue #8).
6. **Rapid-fire `#open=` intents drop some.** 10 opens at 50 ms cadence → only 7 added (3 silently lost during commit-then-clear race).

If any of these pass cleanly on a future run, *update this file* — the bug got fixed.

## How to probe

```js
// Inspect the live runtime
const runtime = window.__ojs_runtime;
const mod = [...runtime._modules.values()].find(m => m._scope.has('test_url_roundtrip'));

// Critical cell snapshot
['page','layout','layout_state','sync_layout_from_url','sync_layout_to_url','test_url_roundtrip','background_jobs','onLoadConfig','config','setHashURL','treeSyncGolden','fix_scroll','modulePanel','blobPanel','settings'].map(name => {
  const v = mod._scope.get(name);
  return [name, {hasValue: v?._value !== undefined, hasError: !!v?._error, errMsg: v?._error?.message?.slice?.(0,100) || null}];
});

// Trigger a URL change and observe — but ALWAYS reset to a known view= afterward, or you'll be stuck on an empty layout
location.hash = '#view=R100(S70(@tomlarkworthy/lopepage),S30(@tomlarkworthy/module-selection))&cc=...';
```

## Things that are fine (to avoid re-litigating)

- Console hygiene is **clean**: lopepage routes its tracing through `appendScrollLog`/`scrollLog`, not `console.*`. Don't expect rich console signal — trace via `get_variable scrollLog` instead.
- `test_url_roundtrip` is one assertion; it covers the boot URL only. It will not catch most behavioral regressions.
- The empty-layout state shows a "Lost? Open the module explorer" recovery link — that escape hatch is intentional and works.
- `scrollLog` grows unboundedly (12k entries in 5 min) — known issue but low-impact for a typical session.
- The author's own prose admits `fix_scroll` is "over-complex" — known, on the cleanup list.

## Severity hierarchy for this notebook

A "high" here usually means *the user's tabs disappear*. A "medium" means the URL gets into a bad state but the user can manually edit the hash to recover. A "low" means cosmetic / presentational.

## What to expect a QA report to flag

Until issue #1 (close=/focus= wipe) is fixed, this notebook reliably scores **fail on #2, #3, #4, #10**, **partial on #5/#6/#7/#8**. The fixes:
- One-line fix for #1: short-circuit `sync_layout_from_url` to no-op when there's no `view=`/`open=`/`close=`/`focus=`/`from=` to act on.
- One-line fix for #2: change `<a href="#testNavigation">` → `<a href="...known-good-view">` or remove the link.
- One-line fix for #3: replace hardcoded URL with `linkTo("@tomlarkworthy/lopepage")`.

After those, expect score to lift to mostly pass except #2 (still missing the elevator pitch).
