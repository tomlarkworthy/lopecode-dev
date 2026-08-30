// Build the notebook cell sources for @tomlarkworthy/compile-dataflow from the headless twin,
// so the notebook and tools/compile-dataflow/compile-dataflow.mjs never drift.
import { readFileSync, writeFileSync } from "node:fs";

const dir = new URL(".", import.meta.url).pathname;
const impl = readFileSync(dir + "compile-dataflow.mjs", "utf8")
  .replace(/^\/\/[^\n]*\n/gm, (m, off) => (off < 700 ? "" : m)) // drop the file header comment
  .replace(/^export default [^\n]*\n/gm, "")
  .replace(/^export /gm, "")
  .trim();

// One cell holds the whole implementation.
const cells = [`compileDataflow = {\n${impl}\n\nreturn compileDataflow;\n}`];

const add = (src) => cells.push(src.trim());

// --- documentation ---------------------------------------------------------------------------
// Prose lives in docs.md and is escaped into NAMED md cells here, so a change to the compiler and a
// change to what it claims land in the same commit.
const docs = readFileSync(dir + "docs.md", "utf8");
const escapeMd = (s) => s.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
const sections = docs.split(/^=== (\w+)$/m).slice(1);
if (!sections.length) throw new Error("docs.md has no `=== cellName` sections");
for (let i = 0; i < sections.length; i += 2)
  add(`${sections[i]} = md\`${escapeMd(sections[i + 1].trim())}\``);

// The one chart. Measured numbers, transcribed from a bench run — not computed at boot, where a
// cold JIT and a busy page would report something else entirely.
add(`cdBench = [
  // tools/compile-dataflow/bench.mjs, 2026-08-10, bun 1.3.11, darwin arm64.
  // ms, median of 500 calls after 500 warm-up calls.
  {shape: "1x10",  cells: 12,  runtime: 0.0202, compiled: 0.0005},
  {shape: "1x50",  cells: 52,  runtime: 0.0842, compiled: 0.0022},
  {shape: "5x20",  cells: 102, runtime: 0.0975, compiled: 0.0045},
  {shape: "20x25", cells: 502, runtime: 0.4981, compiled: 0.0286}
]`);

add(`cdSpeedChart = {
  const speedup = (d) => d.runtime / d.compiled;
  return Plot.plot({
    height: 260,
    width: 720,
    marginLeft: 54,
    marginRight: 76,   // the rightmost point's label sits outside the frame and clips without it
    marginBottom: 40,
    style: {background: "transparent", color: "var(--theme-foreground, #1a1a2e)", fontSize: "12px"},
    x: {type: "log", label: "cells in the subgraph \\u2192", ticks: cdBench.map((d) => d.cells), tickFormat: String, grid: true},
    y: {label: "\\u2191 compiled call vs runtime (\\u00d7)", domain: [0, 46], grid: true},
    marks: [
      Plot.ruleY([1], {stroke: "currentColor", strokeOpacity: 0.35, strokeDasharray: "3 3"}),
      Plot.lineY(cdBench, {x: "cells", y: speedup, stroke: "currentColor", strokeOpacity: 0.55}),
      Plot.dot(cdBench, {x: "cells", y: speedup, fill: "currentColor", r: 4}),
      Plot.text(cdBench, {
        x: "cells", y: speedup, dy: -14, fill: "currentColor",
        text: (d) => speedup(d).toFixed(0) + "\\u00d7 (" + d.shape + ")"
      })
    ]
  });
}`);

// The demo the prose points at. Four cells with no captures at all, so `polygonPath.source` is
// self-contained text — which is the claim the section makes, shown rather than asserted.
add(`polygonPath = {
  const mod = cdFixture((m) => {
    m.define("sides", [], () => 5);
    m.define("radius", [], () => 40);
    m.define("points", ["sides", "radius"], (n, r) =>
      Array.from({ length: n }, (_, i) => {
        const a = (i / n) * 2 * Math.PI - Math.PI / 2;
        return [+(r * Math.cos(a)).toFixed(2), +(r * Math.sin(a)).toFixed(2)];
      }));
    m.define("path", ["points"], (pts) => "M" + pts.map((p) => p.join(",")).join("L") + "Z");
  });
  invalidation.then(() => cdDispose(mod));   // the demo owns a Runtime; give it back on re-run
  const names = ["sides", "radius", "points", "path"];
  return compileDataflow(names.map((n) => mod._scope.get(n)), { live: false, name: "polygonPath" });
}`);

// textContent, not a template: the emitted source is full of backticks and \${} and must not be
// re-interpreted by anything on the way to the screen.
add(`polygonPathSource = {
  const pre = document.createElement("pre");
  pre.style = "font: 12px/1.45 ui-monospace, SFMono-Regular, monospace; white-space: pre-wrap; " +
    "overflow-x: auto; padding: 12px; border-radius: 4px; " +
    "background: var(--theme-background-raised, var(--theme-background, #f6f8fa)); " +
    "color: var(--theme-foreground, #1a1a2e); " +
    "border: 1px solid var(--theme-foreground-faintest, #d8d8d8);";
  pre.textContent = polygonPath.source;
  return pre;
}`);

add(`polygonPathValue = ({
  called: polygonPath(),            // synchronous — no await anywhere in this cell
  captures: polygonPath.captureNames,
  params: polygonPath.params
})`);

// The viewof demo. A compiled function has no reactive state, so each call builds a fresh widget
// that owns its own value — which is what makes it usable as a view. `document` is a free global
// here, not an input: `new Function` sees the real one at call time, so nothing is captured.
add(`buildSlider = {
  const mod = cdFixture((m) => {
    m.define("min", [], () => 0);
    m.define("max", [], () => 100);
    m.define("start", ["min", "max"], (lo, hi) => Math.round((lo + hi) / 2));
    m.define("slider", ["min", "max", "start"], (min, max, start) => {
      const el = document.createElement("input");
      el.type = "range";
      el.min = min;
      el.max = max;
      el.value = start;
      el.style.width = "100%";
      return el;
    });
  });
  invalidation.then(() => cdDispose(mod));
  const names = ["min", "max", "start", "slider"];
  return compileDataflow(names.map((n) => mod._scope.get(n)), { live: false, name: "buildSlider" });
}`);

// The whole wiring. NOT Generators.input(...) — the runtime already applies that to build the value
// half, and applying it twice throws (tools/compile-dataflow/viewof-probe.mjs).
add(`viewof compiledSlider = buildSlider().slider`);

add(`compiledSliderValue = ({
  value: compiledSlider,                                        // drag the slider; this follows
  isAsync: buildSlider.isAsync,                                 // false, so no await is needed
  statelessPerCall: buildSlider().slider !== buildSlider().slider  // a fresh widget every call
})`);

add(`cdTicks = async (n = 8) => { for (let i = 0; i < n; i++) await new Promise((r) => setTimeout(r, 5)); }`);

add(`cdWatch = () => {
  let notify = null;
  return {
    watch: (cb) => { notify = cb; return () => (notify = null); },
    fire: () => notify && notify(),
    get armed() { return !!notify; }
  };
}`);

add(`test_cd_live_is_generatorish = {
  const mod = cdFixture((m) => m.define("b", ["a"], (a) => a + 1));
  try {
    const fn = compileDataflow(null, { module: mod, inputs: ["a"], outputs: ["b"] });
    expect(typeof fn.next).toBe("function");
    expect(typeof fn.return).toBe("function");
    expect(fn.live).toBe(true);
    return "the handle is generatorish, so the Observable runtime iterates it";
  } finally { cdDispose(mod); }
}`);

add(`test_cd_live_false_is_bare = {
  const mod = cdFixture((m) => m.define("b", ["a"], (a) => a + 1));
  try {
    const fn = compileDataflow(null, { module: mod, inputs: ["a"], outputs: ["b"], live: false });
    expect(fn.next).toBeUndefined();
    expect(fn.return).toBeUndefined();
    return "live:false returns the bare compiled function, no generator protocol";
  } finally { cdDispose(mod); }
}`);

add(`test_cd_live_first_yield = {
  const mod = cdFixture((m) => m.define("b", ["a"], (a) => a + 1));
  try {
    const fn = compileDataflow(null, { module: mod, inputs: ["a"], outputs: ["b"] });
    const { done, value } = await fn.next();
    expect(done).toBe(false);
    expect(value({ a: 1 }, { })).toEqual({ b: 2 });
    await fn.return();
    return "the first .next() yields the compiled function immediately";
  } finally { cdDispose(mod); }
}`);

add(`test_cd_live_redefine_yields = {
  const mod = cdFixture((m) => m.define("b", ["a"], (a) => a + 1));
  const w = cdWatch();
  try {
    const fn = compileDataflow(null, { module: mod, inputs: ["a"], outputs: ["b"], watch: w.watch });
    await fn.next();
    const pull = fn.next();
    await cdTicks(1);
    mod.redefine("b", ["a"], (a) => a + 100);
    w.fire();
    const { done, value } = await pull;
    expect(done).toBe(false);
    expect(value({ a: 1 }, { })).toEqual({ b: 101 });
    await fn.return();
    return "a redefine in the body yields a freshly compiled function";
  } finally { cdDispose(mod); }
}`);

add(`test_cd_live_no_spurious_yield = {
  const mod = cdFixture((m) => m.define("b", ["a"], (a) => a + 1));
  const w = cdWatch();
  try {
    const fn = compileDataflow(null, { module: mod, inputs: ["a"], outputs: ["b"], watch: w.watch });
    await fn.next();
    let yielded = false;
    fn.next().then(() => (yielded = true));
    await cdTicks(1);
    w.fire();
    await cdTicks(2);
    expect(yielded).toBe(false);
    await fn.return();
    return "a notification with nothing changed does not yield";
  } finally { cdDispose(mod); }
}`);

add(`test_cd_live_polls_without_watch = {
  const mod = cdFixture((m) => m.define("b", ["a"], (a) => a + 1));
  try {
    const fn = compileDataflow(null, { module: mod, inputs: ["a"], outputs: ["b"], interval: 5 });
    await fn.next();
    const pull = fn.next();
    await cdTicks(1);
    mod.redefine("b", ["a"], (a) => a * 3);
    const { value } = await pull;
    expect(value({ a: 4 }, { })).toEqual({ b: 12 });
    await fn.return();
    return "with no watch it polls the subgraph and picks the change up";
  } finally { cdDispose(mod); }
}`);

add(`test_cd_live_return_closes = {
  const mod = cdFixture((m) => m.define("b", ["a"], (a) => a + 1));
  const w = cdWatch();
  try {
    const fn = compileDataflow(null, { module: mod, inputs: ["a"], outputs: ["b"], watch: w.watch });
    await fn.next();
    const pull = fn.next();
    await cdTicks(1);
    expect(w.armed).toBe(true);
    expect(await fn.return()).toEqual({ done: true, value: undefined });
    expect(await pull).toEqual({ done: true, value: undefined });
    expect(w.armed).toBe(false);
    return ".return() closes the stream and unsubscribes the watch";
  } finally { cdDispose(mod); }
}`);

add(`test_cd_live_handle_tracks_latest = {
  const mod = cdFixture((m) => m.define("b", ["a"], (a) => a + 1));
  const w = cdWatch();
  try {
    const fn = compileDataflow(null, { module: mod, inputs: ["a"], outputs: ["b"], watch: w.watch });
    expect(fn({ a: 1 })).toEqual({ b: 2 });
    mod.redefine("b", ["a"], (a) => a + 100);
    expect(fn.recompile()).not.toBeNull();
    expect(fn({ a: 1 })).toEqual({ b: 101 });
    await fn.return();
    return "calling the handle runs the newest compilation";
  } finally { cdDispose(mod); }
}`);

add(`test_cd_live_drives_downstream = {
  const mod = cdFixture((m) => {
    m.define("k", [], () => 2);
    m.define("scale", ["x", "k"], (x, k) => x * k);
  });
  const w = cdWatch();
  try {
    mod.define("compiled", [], () =>
      compileDataflow(null, { module: mod, inputs: ["x"], outputs: ["scale"], watch: w.watch }));
    const seen = [];
    mod.variable({ fulfilled: (v) => seen.push(v.scale) }).define("out", ["compiled"], (f) => f({ x: 3 }, { k: 2 }));
    await cdTicks();
    expect(seen).toEqual([6]);
    mod.redefine("scale", ["x", "k"], (x, k) => x * k + 1);
    w.fire();
    await cdTicks();
    expect(seen).toEqual([6, 7]);
    return "as a cell value the handle drives downstream, with no runtime edge to the subgraph";
  } finally { cdDispose(mod); }
}`);

add(`test_cd_sentinels_are_captures = {
  const mod = cdFixture((m) => {
    m.define("k", [], () => 2);
    m.define("torn", [], () => []);
    m.define("widget", ["k", "invalidation", "torn"], (k, inv, torn) => (inv.then(() => torn.push(1)), { k }));
  });
  try {
    const fn = compileDataflow(null, { module: mod, inputs: ["k"], outputs: ["widget"], live: false });
    // neither varies with k, so both stay outside the subgraph and arrive as arguments
    expect(fn.captureNames.sort()).toEqual(["invalidation", "torn"]);
    expect(fn.sentinels).toEqual(["invalidation"]);
    const torn = [];
    let invalidate;
    const inv = new Promise((r) => (invalidate = r));
    expect(fn({ k: 3 }, { invalidation: inv, torn })).toEqual({ widget: { k: 3 } });
    invalidate();
    await inv;
    expect(torn).toEqual([1]);   // the CALLER owns the lifecycle, so the caller can fire it
    return "invalidation is a parameter: the caller decides when what it built dies";
  } finally { cdDispose(mod); }
}`);

add(`test_cd_sync = {
  const mod = cdFixture((m) => { m.define("a", [], () => 3); m.define("b", ["a"], (a) => a * 2); });
  try {
    const fn = compileDataflow([mod._scope.get("a"), mod._scope.get("b")], {live: false});
    const out = fn();                       // no await: nothing in this subgraph is async
    expect(out).toEqual({b: 6});
    expect(fn.isAsync).toBe(false);
    expect(fn.source).not.toMatch(/\basync\b|\bawait\b/);
    return "a subgraph with nothing async compiles to a synchronous function";
  } finally { cdDispose(mod); }
}`);

add(`test_cd_async_awaits = {
  const mod = cdFixture((m) => { m.define("a", [], async () => 1); m.define("b", ["a"], (a) => a + 1); });
  try {
    const fn = compileDataflow([mod._scope.get("a"), mod._scope.get("b")], {live: false});
    expect(fn.isAsync).toBe(true);
    expect(fn.asyncCells).toEqual(["a"]);
    expect(await fn()).toEqual({b: 2});
    return "an async cell is compiled to await, not refused";
  } finally { cdDispose(mod); }
}`);

add(`test_cd_refuses_streams = {
  const mod = cdFixture((m) => {
    m.define("ticks", [], function* () { yield 1; });
    m.define("b", ["ticks"], (t) => t);
  });
  try {
    let msg = null;
    try { compileDataflow([mod._scope.get("ticks"), mod._scope.get("b")], {live: false}); }
    catch (e) { msg = e.message; }
    expect(msg).toMatch(/ticks is a generator function, so its value is a stream/);
    return "a generator is refused by name: one call cannot stand for a stream";
  } finally { cdDispose(mod); }
}`);

add(`test_cd_closure_free = {
  // built by hand rather than in a cell, so the captured binding survives to the definition
  const mod = cdFixture((m) => {});
  try {
    let secret = 42;
    mod.define("a", [], () => secret + 1);
    const fn = compileDataflow([mod._scope.get("a")], {live: false});
    let threw = null;
    try { fn(); } catch (e) { threw = e; }
    expect(threw instanceof ReferenceError).toBe(true);
    return "new Function gives the emitted code no scope to close over";
  } finally { cdDispose(mod); }
}`);

writeFileSync(dir + "cells.json", JSON.stringify(cells, null, 2));
console.log(`${cells.length} cells, ${cells[0].length} chars for compileDataflow`);
