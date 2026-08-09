// Build the notebook cell sources for @tomlarkworthy/compile-dataflow from the headless twin,
// so the notebook and tools/compile-dataflow/compile-dataflow.mjs never drift.
import { readFileSync, writeFileSync } from "node:fs";

const dir = new URL(".", import.meta.url).pathname;
const impl = readFileSync(dir + "compile-dataflow.mjs", "utf8")
  .replace(/^\/\/[^\n]*\n/gm, (m, off) => (off < 700 ? "" : m)) // drop the file header comment
  .replace(/^export default [^\n]*\n/gm, "")
  .replace(/^export /gm, "")
  .trim();

const cells = [`compileDataflow = {\n${impl}\n\nreturn compileDataflow;\n}`];

const add = (src) => cells.push(src.trim());

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
    expect(await value({ a: 1 })).toEqual({ b: 2 });
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
    expect(await value({ a: 1 })).toEqual({ b: 101 });
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
    expect(await value({ a: 4 })).toEqual({ b: 12 });
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
    expect(await fn({ a: 1 })).toEqual({ b: 2 });
    mod.redefine("b", ["a"], (a) => a + 100);
    expect(fn.recompile()).not.toBeNull();
    expect(await fn({ a: 1 })).toEqual({ b: 101 });
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
    mod.variable({ fulfilled: (v) => seen.push(v.scale) }).define("out", ["compiled"], (f) => f({ x: 3 }));
    await cdTicks();
    expect(seen).toEqual([6]);
    mod.redefine("scale", ["x", "k"], (x, k) => x * k + 1);
    w.fire();
    await cdTicks();
    expect(seen).toEqual([6, 7]);
    return "as a cell value the handle drives downstream, with no runtime edge to the subgraph";
  } finally { cdDispose(mod); }
}`);

add(`test_cd_return_releases_contexts = {
  let cleaned = 0;
  const mod = cdFixture((m) =>
    m.define("widget", ["x", "invalidation"], (x, inv) => (inv.then(() => cleaned++), { x })));
  try {
    const fn = compileDataflow(null, { module: mod, inputs: ["x"], outputs: ["widget"] });
    await fn({ x: 1 });
    await fn({ x: 2 });
    await fn.next();
    expect(cleaned).toBe(0);
    await fn.return();
    await cdTicks(2);
    expect(cleaned).toBe(2);
    return ".return() releases every context the compilation still holds";
  } finally { cdDispose(mod); }
}`);

add(`test_cd_supersede_disposes = {
  let cleaned = 0;
  const mod = cdFixture((m) =>
    m.define("widget", ["x", "invalidation"], (x, inv) => (inv.then(() => cleaned++), { x })));
  const w = cdWatch();
  try {
    const fn = compileDataflow(null, { module: mod, inputs: ["x"], outputs: ["widget"], watch: w.watch });
    await fn({ x: 1 });
    await fn.next();
    const pull = fn.next();
    await cdTicks(1);
    mod.redefine("widget", ["x", "invalidation"], (x, inv) => (inv.then(() => cleaned++), { x: x * 2 }));
    w.fire();
    await pull;
    await cdTicks(2);
    expect(cleaned).toBe(1);
    await fn.return();
    return "superseding a compilation disposes everything it built";
  } finally { cdDispose(mod); }
}`);

add(`test_cd_return_stops_stream = {
  let stopped = false;
  const mod = cdFixture((m) =>
    m.define("stream", ["x"], async function* (x) {
      try { for (let i = 1; ; i++) { yield x + i; await new Promise((r) => setTimeout(r, 5)); } }
      finally { stopped = true; }
    }));
  try {
    const fn = compileDataflow(null, {
      module: mod, inputs: ["x"], outputs: ["stream"], mode: "stream", driver: "stream"
    });
    const it = fn({ x: 0 });
    expect((await it.next()).value).toEqual({ stream: 1 });
    await fn.next();
    await fn.return();
    await cdTicks(3);
    expect(stopped).toBe(true);
    return ".return() terminates a streaming cell's generator";
  } finally { cdDispose(mod); }
}`);

add(`test_cd_dispose_counts = {
  const mod = cdFixture((m) => m.define("b", ["a"], (a) => a + 1));
  try {
    const fn = compileDataflow(null, { module: mod, inputs: ["a"], outputs: ["b"], live: false });
    await fn({ a: 1 });
    await fn({ a: 2 });
    expect(fn.dispose()).toBe(2);
    expect(fn.dispose()).toBe(0);
    return "fn.dispose() reports how many contexts it released";
  } finally { cdDispose(mod); }
}`);

writeFileSync(dir + "cells.json", JSON.stringify(cells, null, 2));
console.log(`${cells.length} cells, ${cells[0].length} chars for compileDataflow`);
