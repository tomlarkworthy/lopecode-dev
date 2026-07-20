# Diagnosing notebook load and boot glitches

For a notebook that won't boot, boots blank, crashes the tab, or loads slowly — and the cause isn't
obvious from the code. Written after an investigation that spent two-thirds of its time on
avoidable detours; the order of these steps is the lesson.

## 0. A plausible mechanism is not a diagnosis

The failure mode here is generating a good story and believing it. In the "Aw, Snap on reload with
DevTools open" investigation, three mechanisms were each plausible enough to act on:

- the per-waiter `MutationObserver` fan-out in the bootloader's `__waitForId` during streaming
- `console.log("responding", id, el)` in the bootloader retaining megabyte `<script>` nodes in the
  DevTools console
- the 14 stray `debugger;` statements in the notebook

All three were wrong. The actual cause was outside lopecode entirely: Chrome's V8 CPU sampling
profiler crashes the renderer if it is sampling when a Web Audio render thread starts up. Cost of
guessing first: several experiments. Cost of measuring first: one category bisect.

Write hypotheses down, then rank experiments by *how much they discriminate*, not by how likely the
hypothesis feels.

## 1. Get a deterministic signal before you bisect anything

A bisect on a flaky signal produces confident nonsense. The reload-based signal in that
investigation crashed ~1 in 3; a leave-one-out over 11 booted modules read "ok" on all 11 — every
one a false negative.

Two ways out, use both:

- **Repeat.** Never accept a single trial. `bun tools/lope-boot-probe.ts <url> --runs 6` reports a
  rate (`crash 4/6`), which is a usable signal even when it isn't 100%.
- **Vary *when* the condition applies.** This is the highest-value move and it is easy to skip.
  `--phase load | reload | idle` runs the same instrumentation across a cold load, across a reload,
  or against an already-settled page. In the DevTools crash the numbers were 4/4, 3/4, and 0/4 —
  which simultaneously made the signal deterministic *and* localised the bug to AudioContext
  startup rather than to page load. Phase separation is diagnosis, not just noise reduction.

## 2. Assert the variant still works, on every trial

The most expensive failure mode in a bisect is a broken variant reading as a pass. A regex over
`<script id="bootconf.json"` matched an *earlier* occurrence inside exporter template code and
non-greedily swallowed ~20k lines; every variant then loaded to 130 DOM nodes instead of 2222, and
all of them scored "ok".

- Edit `bootconf.json` with `bun tools/lope-bootconf.ts` (`--get-mains`, `--set-mains`, `--drop`,
  `--only`), never with a hand-rolled regex. It selects the block that is both
  `data-mime="application/json"` and JSON-parseable, and rewrites only the `"mains"` line. A
  `--drop` of one module should change the file by roughly the length of that module's name — check
  it.
- Always pass `--min-nodes` to the probe. Without it, "ok" only means "did not crash", which is
  exactly the hole the broken variants fell through.

## 3. Bisect the environment before the content

Cheaper, and it was decisive here. If the glitch only appears under DevTools, suspect a specific
piece of instrumentation rather than DevTools as a whole:

```
bun tools/lope-boot-probe.ts nb.html --runs 4 --min-nodes 500 \
  --trace-categories disabled-by-default-v8.cpu_profiler
```

One category at a time. In the crash investigation `disabled-by-default-v8.cpu_profiler` (what the
Performance panel enables when "JS samples" is on, i.e. by default) crashed 100%, while
`v8.compile`, `devtools.timeline`, `timeline.stack`, `screenshot` and `v8.execute` were all clean.
The same shape applies to CDP domains — `Debugger.enable` alone changes V8 behaviour substantially,
and if `Debugger.enable` is on you must handle `Debugger.paused` or a stray `debugger;` will hang
the page and look like a boot failure.

## 4. Then bisect the content, then leave lopecode behind

Leave-one-out over booted modules:

```
for m in $(bun tools/lope-bootconf.ts nb.html --get-mains | jq -r '.[]'); do
  bun tools/lope-bootconf.ts nb.html --drop "$m" --out /tmp/v.html
  bun tools/lope-boot-probe.ts /tmp/v.html --runs 4 --min-nodes 500 --trace-categories <cat>
done
```

Exactly one module's removal fixing it is the result you want (`butter-synth`, there). Then **build
a minimal page outside lopecode that reproduces it**. This is the step that converts "our notebook
is broken" into "this is a browser bug": ~15 lines of plain HTML constructing the same Web Audio
graph crashed at the same rate as the 3.6MB notebook, which settled that the notebook's streaming
loader was never involved.

Keep reducing the minimal page. Node-by-node it showed a suspended `AudioContext` was harmless
(0/6) but any graph actually rendering to `destination` crashed (4/6 upward with DSP load) — the
distinction that produced the workaround.

## 5. Harness facts (macOS + safehouse)

Re-derived the hard way; they cost real time.

- **Playwright is CJS.** In an `.mjs` script `import { chromium } from 'playwright'` throws
  `Named export 'chromium' not found`. Use `import pw from '...playwright/index.js'; const { chromium } = pw;`
  or write the tool as `.ts` under `tools/` and use bun's `import { chromium } from 'playwright'`.
- **Real Chrome is unavailable.** `channel: 'chrome'` fails with `dlopen ... blocked by sandbox`,
  and `spawn`ing the Chromium binary directly fails too. Only `chromium.launch()` /
  `launchPersistentContext()` work. Bundled Chromium has reproduced every Chrome-reported issue so
  far.
- **`page.on('crash')` is the only renderer-death signal.** After it fires every `page.evaluate`
  rejects with `Target crashed`, so capture state *before* asserting.
- **No crash dumps.** Playwright passes `--disable-breakpad`; `--enable-crash-reporter` +
  `ignoreDefaultArgs` still yields no usable dump (`chrome_crashpad_handler: --database is
  required`), and `~/Library/Logs/DiagnosticReports` stays empty. Do not plan an investigation
  around getting a stack trace.
- **Browser stderr needs `DEBUG=pw:browser`.** The `logger` launch option only carries Playwright's
  own API log. Even then a renderer CHECK failure may print nothing — the log is drowned in
  `Histogram:` and `VERBOSE1:` lines, so filter hard.
- **DevTools frontend is not a Playwright page.** `--auto-open-devtools-for-tabs` really does open
  it (it shows up as a `devtools://` target in `http://127.0.0.1:<port>/json/list`), but it never
  appears in `context.pages()`, so you cannot drive panel selection. Emulate what a panel *does*
  via CDP (`Tracing.start` with its categories) instead of trying to click it.
- **Don't broad-`pkill` Chrome.** `pkill -f "[Cc]hrom"` kills the user's daily browser. Close
  contexts in the script instead.

## 6. Slow rather than broken?

For latency rather than crashes use `bun tools/lope-load-profiler.ts <url> --runs 3`, which reports
navigation/paint/LCP timings, module-map phase markers timestamped in-page, and the slowest
sub-resources. It works on `file://` and `https://` so local and remote are directly comparable.
`lope-boot-probe.ts` answers "does it work"; `lope-load-profiler.ts` answers "why is it slow".

## Worked example

`repro/README.md` on branch `investigate/devtools-crash` records the full DevTools-crash
investigation — category bisect table, phase matrix, leave-one-out, and the minimal non-lopecode
reduction — as a template for the sequence above.
