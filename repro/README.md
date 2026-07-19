# DevTools "Aw, Snap" on notebook reload — investigation

## Finding

Not a lopecode bug, and unrelated to async stream loading.

**The V8 CPU sampling profiler crashes the renderer if it is sampling at the moment a Web Audio
render thread starts up.** DevTools' Performance panel enables that profiler (`JS samples`, on by
default → trace category `disabled-by-default-v8.cpu_profiler`). `@tomlarkworthy_lopecode-live-2026`
boots `@tomlarkworthy/butter-synth`, which constructs an `AudioContext` and connects a graph to
`destination` during boot — so profiling a reload lands squarely on the AudioContext startup.

## Evidence

Trace-category bisect (single category at a time, reload while tracing):

| category | result |
|---|---|
| `disabled-by-default-v8.cpu_profiler` | **CRASH** |
| `disabled-by-default-v8.compile` | ok |
| `disabled-by-default-devtools.timeline.stack` | ok |
| `disabled-by-default-devtools.screenshot` | ok |
| `devtools.timeline` (+basic) | ok |
| `v8.execute` | ok |

Phase isolation on the notebook (4 reps each):

| when the profiler is running | crashes |
|---|---|
| across a cold load | 4/4 |
| already-loaded page, idle | 0/4 |
| across a reload | 3/4 |
| across a navigation away | 0/4 |

Leave-one-out over `bootconf.json` mains — `butter-synth` is the only one whose removal fixes it.

Minimal, lopecode-free repro (`m-*.html`, `n-*.html`), 6 reps:

| page | crashes |
|---|---|
| plain HTML | 0/6 |
| `new AudioContext()`, nothing connected | 0/6 |
| 8 oscillators → gain → destination | 4/6 |
| butter-synth's fx chain (convolver/waveshaper/delay/compressor) | 6/6 |
| the real notebook | 5/6 |

Timing is what matters, not page load:

| | crashes |
|---|---|
| profiler already running, AudioContext created 5s later (`late-fx.html`) | 4/4 |
| audio graph already running, profiler started afterwards | 0/4 |

## Scripts

- `rate.mjs <reps> <url>…` — crash rate, profiler running across a cold load
- `rate-after.mjs <reps> <url>…` — profiler started after the page is up
- `phase.mjs <file> [reps]` — the load / idle / reload / unload phase matrix
- `phaseA-matrix.mjs <url>…` — single deterministic cold-load probe per url
- `bisect-categories.mjs <file>` — which trace category is responsible
- `bisect2.mjs [loo|only]` — leave-one-out / only-one over `bootconf.json` mains
- `crash-real-devtools.mjs <file> [reloads]` — real DevTools frontend attached, reloads

Requires the notebook at `repro/base.html` (copy the target notebook there).

## Not reproduced

DevTools merely open on the default panel: 5 reloads, no crash. The user's screenshot shows the
Performance panel with a recorded trace, which fits. Whether merely *selecting* the Performance
panel (Live Metrics keeps a trace running) is enough was not confirmed — driving the DevTools
frontend from Playwright didn't work.
