# bun-verify

```
bun tools/lang-experiment/bun-verify/run.ts [--filter s] [--mains a,b] [--all] [--timeout ms]
    [--without capability] [--no-toggle] [--hash h] [--poll ms] [--report f.json] [--verbose] [notebook]
```

Boots `lopebooks/notebooks/soundscript.html` (or the path given) through `tools/lope-runtime.js`
(happy-dom, no browser) and runs its `test_*` cells. It prints one line per test that did not pass,
then a summary: how many test cells are out of scope, how many gated tests were pending at boot, the
boot and test times, and last `bun-verify: N pass, F fail, T timed out, S skipped; W s`. It exits 1 on any failure or timeout.
A test gated by "run the tests" that has a value before the toggle is turned on is counted as a
failure (verify.ts makes the same check). That path has not fired in any run here, and the gated set
is a name pattern in `run.ts` (`test_(ss_|breakout|compile|examples|async_click)` in a main module), so a
new ungated test with such a name would trip it.

- Default scope: modules matching `/^@tomlarkworthy\/(soundscript(-[a-z]+)?|raw-cells)$/`, which are the
  modules the SoundScript build writes. `--all` runs every module (461 cells).
- `--mains soundscript,soundscript-spec` boots only those modules. It writes a 4 MB copy of the file to
  `bun-verify/.cache/` (ignored by `bun-verify/.gitignore`) with a rewritten `bootconf.json` block. `soundscript-spec` alone is not enough: 4 fail
  and 11 time out, because the spec reads the core through `runtime.mains`.
- `--without <capability>` removes one of the capabilities listed below. Use it as a control.

## What it adds to lope-runtime.js (`capabilities.ts`)

Each capability is added from `loadNotebook`'s `instrument` hook, or by patching happy-dom's window
prototype before boot. The shared tools are not edited. The removal column was measured on
2026-11-21 with `--all --without X`, on a scratch copy (sha1 `4d40cc5…`, not kept). A fresh reviewer
reran the column the same day on `lopebooks/notebooks/soundscript.html` (sha1 `04ec69a…`) and got the
same counts. The column counts tests that pass with every capability and fail without this one,
so it can include a test that passed before any capability was added (`test_ui_button_by_text`
is one of the 16 for `script-innerhtml-is-text`).

| capability | the missing behaviour | tests lost without it |
|---|---|---|
| `inline-module-shim` | lope-runtime runs a script only when it has a `src`. runtime-sdk's `realize` appends an inline `<script type="module-shim">` and waits on it, so `spec_load`, `ss_language.apply` and everything built on them never resolve. The capability runs the script as a `blob:` module through the page's `importShim`. | 55 |
| `script-innerhtml-is-text` | happy-dom parses `script.innerHTML = s` as HTML. `StateCell<number>` loses `<number>`, and the checker answers `StateCell takes one type argument`. | 16 |
| `frames` | happy-dom's `requestAnimationFrame` is one `setImmediate` per callback. Callbacks are batched per frame, and a frame waits up to 64 timer turns while a page timer of 4 ms or less is pending. | 1 (`test_breakout_memo`) |
| `symbol-keys-on-form-proxies` | happy-dom's `<form>`/`<select>` proxy calls `Number(symbol)`, so `Object.hasOwn(form, sym)` throws. | 2 (S11_7, S11_8) |
| `worker` | The realm has no `Worker`. Bun's Worker runs the pool's blob URL. Message data is made in bun's realm, not the page's. | 1 (`test_compile_pool_matches_main`) |
| toggle (`--no-toggle`) | The 19 tests in the core and the tutorial wait on `tests_on = run_tests ? true : invalidation`. The toggle is set as a click sets it. | 19 |

The first two versions of `frames` failed `test_spec_S8_5` (`gave [6,2,26], expected [7,2,26]`):

- one frame per `setTimeout(0)`, with callbacks run in series: 4 of 4 full runs;
- a 16.7 ms deadline that overrides pending timers: 1 of 3 runs, and 3 of 3 with the deadline set to 0.

The browser verify logs (`tools/lang-experiment/lite/soundscript/.scratch/review4/verify-*.log`,
written by `tools/lang-experiment/lite/soundscript/verify.ts`; local and gitignored) never show S8_5 failing. The current version is ordered by
timer turns, not by the clock.

## Measured

2026-11-21, on AC power (`pmset -g batt`: "Now drawing from 'AC Power'"), on the copy `4d40cc5…`. The notebook of 21:44
(`04ec69a…`) gave the same 168 pass in 5.4 s wall.

```
full (default scope)          168 pass   wall 5.3-6.0 s over 10 runs   boot 4.2 s, tests 1.1 s
--filter test_spec_           119 pass   wall 4.4 s
--filter test_spec_S6_         19 pass   wall 4.6 s
--mains soundscript,soundscript-spec              149 pass   wall 2.5-2.6 s over 10 runs
--mains soundscript,soundscript-spec --poll 25    149 pass   wall 1.6-1.7 s over 10 runs
--mains soundscript,soundscript-spec --filter test_spec_S6_ --poll 25   19 pass   wall 1.6 s
4 default-scope runs at once, 3 rounds            168 pass in 12 of 12   wall 6.1-6.6 s each
--all                         414 pass, 6 fail, 3 timed out, 38 skipped   wall 19.3 s
lope-tests.ts --timeout 60000, same file, all modules, no capabilities added   348 pass, 14 fail, 62 timed out, 37 skipped   wall 63.6 s
```

Almost all of the time is boot, because main modules are observed headless and their tests compute
while the page boots. Parsing the 4 MB file takes 0.01 s. The settle loop ends after 5 unchanged
polls, so `--poll` sets a floor of 5 × poll on boot. At the default of 100 the full run is 5.3 s; at
250 it is 6.4 s, and at 25 it is 4.6 s.

## Not settled

- lope-runtime's settle loop calls `runtime._computeNow()` on every poll. That is a compute outside
  any frame, which a browser never makes. With the loop replaced by one that only counts,
  `test_spec_S7_7` failed 5 of 5 runs with every frame scheduler tried. A trace showed `zeta`
  computed twice after its edit (versions 3 and 4, the same definition, in consecutive frames).
  One beat went to `alpha` first. With `--mains soundscript,soundscript-spec --poll 250`,
  `test_spec_S7_5` gave 16 for 15 (3 of 3 runs). At `--poll 100` both pass: 20 of 20 runs.
  The cause is not found. The gate depends on the loop's extra computes.
- `--all` leaves failures outside SoundScript's modules. No browser run of them exists to compare:
  - ui-testing: 5 fail, 2 time out (the timeouts not diagnosed). These are reported FAIL and
    TIMEOUT, not SKIPPED: no probe has been written that names the missing capability. 3 of the failures ask `runtime.mains` for
    `@tomlarkworthy/ui-testing`, which this notebook does not boot as a main. A browser should fail
    those the same way, but no browser run confirms it. The others show happy-dom's form proxy not
    being the same object as the form, and a `<select>` value of `null`.
  - `test_persistentId` expects pid `_o83sai`; the build assigns `_xejgj8`.
  - `test_tests_example`: `example_type` has no default, so the test is pending by design.
  - `test_networking_script_resolves_in_a_blob_fork` is SKIPPED. A probe in the realm finds that an
    iframe's `<script>` does not run (lope-runtime sets `disableJavaScriptEvaluation`).
- With `&viz_tests&cellmap_tests&cp_tests` in the hash: cell-map passes 16 of 17, the 17 visualizer
  tests time out, and the 2 command-palette tests fail. These were not looked into.

## What needs the browser

Of the 649 `pass` lines in `tools/lang-experiment/lite/soundscript/.scratch/review4/verify-mine.log`
(a browser run of `verify.ts` on battery power; local, gitignored), classified on 2026-11-21 by
`tools/lang-experiment/lite/soundscript/.scratch/bun-notebook/classify-verify.ts` against a default-scope run:

- 162 are test cells that pass here in the default scope.
- 106 could be ported without a browser: module error counts, the boot counts, prose, reference,
  ss_bytes, the checker and runtime module sweeps, cell values that are not `test_*`, the
  `core-only` and `no-raw` variant builds, and the "no module fetched / page errors" lines.
- 381 need the browser: export and reopen, save and reload (248 of these, including 154 test cells
  rerun on the exported file), typing into editors, completion, the picker and language switch,
  copy and paste, layout in px, themes and contrast, phone and touch, and Breakout's 90 of 90 frames.

The 154 test cells rerun on the exported file are covered here only if a browser writes the export
and this tool is then pointed at the file.

## Changes worth making in the shared tools

- `lope-runtime.js`: run inline `<script type="module-shim">`/`module` scripts, and treat
  `innerHTML` on a script as its text.
- `lope-runtime.js`: a frame source that batches callbacks per frame, in place of happy-dom's.
- `lope-runtime.js`: add `Worker`.
- `lope-tests.ts`: turn on the "run the tests" toggles, keep each test's latest outcome
  (`test_detectsNewModule` fails on its first value and passes on its second), and accept a
  `mains` override.
