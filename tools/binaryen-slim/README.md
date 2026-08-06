# binaryen-slim

Binaryen 131 pruned to what AssemblyScript's `asc` can actually reach, for
`@tomlarkworthy/coded-landmark-tracking`, which carries the AssemblyScript compiler
as file attachments so the notebook can rebuild `detectrow.wasm` in the page.

`binaryen-131.js.gz` was 3.411MB base64 — a third of a 15.9MB notebook. This build
is 2.025MB, and produces byte-identical output.

## The notebook

`make-notebook.py` assembles `lopebooks/notebooks/assembly_script.html` (5.62MB): the
slim toolchain, a Gauss-Jordan matrix inversion example, and a warm-up benchmark that
runs in the page. It compiles the example with `asc -O3 --runtime stub` and races the
wasm against the same algorithm in JavaScript over 60 passes × 2 runs.

Both compilation caches have to miss for the warm-up to be visible, so each series gets
a unique custom section on the wasm and a unique trailing comment on the JavaScript —
without that, run 2 reuses run 1's compiled code and starts at its floor.

Measured (48×48, 24 inversions a pass): WebAssembly is at its floor by pass 2,
JavaScript takes 10-25 while V8 tiers it up, and the session total is ~1.2× in
wasm's favour. **The steady-state result depends on the engine and is not a win.**
Real Chrome 150 gives parity — three repeats measured 1.09×, 0.99×, 1.01× (both
~2.00ms a pass); Playwright's bundled Chromium reported 1.26×. For straight f64
array math TurboFan emits essentially the same code as wasm once it is warm, so the
honest claim here is time-to-fast, not throughput. Quote the session total, or the
page's own live figure — never a remembered number.

`unchecked()` in the AssemblyScript still matters: with the bounds checks left in,
the wasm is *slower* than the JavaScript at steady state (0.7×).

## Result

Every row verified with the notebook's own acceptance test: `asc -O3 --runtime stub`
on `detectrow.as.ts`, byte-compared against the shipped `detectrow.wasm`.

| build | wasm | gzip | base64 |
|---|---|---|---|
| shipped `binaryen@131` (npm, wasm escaped into a JS string) | 8.907MB | 2.558MB | **3.411MB** |
| local stock build (emsdk 6.0.6) | 9.777MB | 2.292MB | 3.107MB |
| stage 1 — drop 103 unreachable passes | 8.031MB | | |
| stage 2 — + drop the wasm2js/asm.js backend | 7.564MB | | |
| stage 3 — + drop the `.wat` text parser | 6.294MB | 1.514MB | 2.019MB |
| stage 3 + `wasm-opt -Oz` | 5.827MB | 1.482MB | **2.025MB** |

Compare against the *local stock* build, not the npm one — a different emscripten
version accounts for the 9.777 vs 8.907MB gap. Stage 3 is **−35.6%** on the binary;
`-Oz` adds another 7.4%. Against what the notebook ships today: **−40.6%, 1.39MB out
of the file.**

What each cut is worth: passes 1.75MB, text parser 1.27MB, wasm2js 0.47MB, `-Oz` 0.47MB.
The text parser being the second biggest item is the surprise — `asc` never parses
`.wat`, and `gen-s-parser.inc` alone is 246KB of generated source.

No speed cost: compile median 167ms (stage 3) vs 204ms (stock), min 133 vs 121 — noise.

## Why a source build is the only way

Binaryen registers all 180 passes into a name→factory table reached through the elem
section, so nothing is unreachable and neither `wasm-opt`, LTO, nor `wasm-metadce` can
drop a pass. The subsystems are kept alive the same way: `BinaryenModulePrintAsmjs` and
`BinaryenModuleParse` are `EMSCRIPTEN_KEEPALIVE` roots. Removing the *root* is what lets
`wasm-ld` collect the subsystem behind it.

## The keep-list is derived, not hand-written

`prune.py` keeps every pass name that appears in an `add("…")` / `addIfNoDWARFIssues("…")`
call anywhere in libbinaryen — that covers the default `-O` pipelines and passes that
other passes add internally.

**That is not sufficient on its own.** AssemblyScript drives its own pipeline from
JavaScript (`module.runPasses([...])`), which no C++ scan can see. The first pruned build
died with `Fatal: Could not find pass: inlining`. `as_js_passes.json` is every registered
pass name appearing as a string literal in `assemblyscript.js` / `asc.js` — it adds
`inlining`, `licm`, `gufa-optimizing`, `avoid-reinterprets`, `reorder-functions`,
`generate-global-effects`, `discard-global-effects`. Regenerate it whenever the pinned
AssemblyScript version changes:

```
python3 - <<'EOF'
import re, json
regs = set(re.findall(r'register(?:Test)?Pass\s*\(\s*"([^"]+)"', open('.work/src/binaryen/src/passes/pass.cpp').read()))
js = open('assemblyscript.js').read() + open('asc.js').read()
json.dump(sorted(set(re.findall(r'["`\']([a-z][a-z0-9$-]{2,40})["`\']', js)) & regs), open('as_js_passes.json','w'))
EOF
```

Over-pruning fails loudly — Binaryen aborts with `Could not find pass: X`, it does not
silently emit different code.

## What this build no longer does

- `binaryen.emitAsmjs()` / wasm2js — asc never calls it
- `binaryen.parseText()` / `BinaryenModuleParse` — asc never parses `.wat`
- `asc --runPasses X` for any of the 109 dropped passes (asyncify, souperify, outlining,
  monomorphize, safe-heap, instrument-*, translate-to-new-eh, multi-memory-lowering,
  i64-to-i32-lowering, …). The 71 passes asc's own pipelines use are all present.

`emitText` / `--textFile` still works (the printer is kept; only the parser is gone).

## Verification

`verify.mjs` runs the notebook's acceptance test. `diffone.mjs` is the stronger gate: it
compiles every program in `astests/` under 7 flag sets (`-O0`/`-O3`/`-Oz`, `stub` and
`incremental` runtimes, `--enable simd`, `--trapMode clamp`, `--textFile`) and emits a
JSON fingerprint, so a pruned build can be diffed against a stock one. Current status:
**28/28 combinations identical**, including a deliberately broken program that must still
produce the same diagnostics, and SIMD that must still compile under `--enable simd` and
fail without it.

```
./build.sh 131 3
node verify.mjs dist
node diffone.mjs <stock-dir> > a.json && node diffone.mjs dist > b.json && diff a.json b.json
```

## Route B (binary surgery on the C API) — tried, does not work

The idea: 1,457 `_Binaryen*` KEEPALIVE exports are all DCE roots, and `asc` calls only a
fraction, so strip the unused ones, run `remove-unused-module-elements`, and let the
collector follow. `routeb.mjs` and `usedexports.mjs` implement and measure it. Two findings,
both negative:

**It buys 16KB.** Cutting all 671 provably-unused exports and re-running DCE + `-Oz` gives
5,810,919 bytes against 5,826,585 for `-Oz` alone — **0.27%**. The reason is in the elem
section: **10,565 of ~10,000 functions are in the function table**. Emscripten C++ builds put
vtables and `std::function` targets in the *data* section as integers, so no analysis can
tell which table slots are live; every entry stays a root and DCE cannot follow the export
graph. The near-zero result is the empirical proof — Binaryen's own
`remove-unused-module-elements` ran and found almost nothing.

**And it isn't safe anyway.** The glue calls the C API during its own initialization —
`Module._BinaryenBlockId()` and friends build the JS API object at load time — so the
"unused" exports are used before `asc` ever runs. The stripped build dies immediately with
`TypeError: Module._BinaryenBlockId is not a function`.

Also worth recording: cutting on *dynamic* coverage would have been wrong. A sweep of 11
programs × 10 flag sets exercised 165 C functions, but AssemblyScript's sources statically
reference **781**. The 616 difference is real code for features the tests don't use (data
segments, tags, array ops). `keep_c.json` is the static union.

### What is left after Route A

Re-running the `log-execution` coverage on the slim build: **7,836 of 9,978 functions
(3.638MB, 57.6%) still never execute** during a real build, down from 6.504MB / 72.8%
before pruning. Route A removed 2.87MB of dead weight. The residual is not separable —
it is diagnostics, the paths for AS features this program doesn't use (see the 616 above),
libc++, and IR/analysis code shared with the passes that are kept.

## Cost

The shipped compiler is no longer `npm i binaryen@131`; it is this recipe. That weakens
the notebook's "you can rebuild every artifact it ships" claim by one step — the `.wasm`
is still reproducible in the page, but the compiler that builds it now has a build of its
own. `build.sh` is that build, and it needs only docker.
