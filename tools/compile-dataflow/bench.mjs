// bun tools/compile-dataflow/bench.mjs
//
// What staying synchronous buys, against the two things it can replace: the same subgraph emitted
// async (`fn.asAsync`), and re-running the subgraph in the Observable runtime.
//
// The two compiled arms come from ONE emitter and one plan — `asAsync` recompiles the same
// variables with the async colour forced, so the definitions, the order and the slots are
// identical and only the awaits differ. That is what makes the ratio attributable to the await.
//
// The runtime arm is the honest baseline but it is not the same operation: redefining an input and
// awaiting the sink schedules the whole graph, so it pays a microtask per generation plus the
// runtime's own bookkeeping. It is here to size the gap, not to be raced.
import { Runtime } from "../../vendor/observable-runtime/src/index.js";
import { compileDataflow } from "./compile-dataflow.mjs";

// A chain of `width` parallel strands, each `depth` long, joined at the end. Arithmetic only, so the
// measurement is scheduling and call overhead rather than the cells' own work.
function buildGraph(width, depth) {
  const runtime = new Runtime({});
  const main = runtime.module();
  main.define("x", [], () => 1);
  const names = ["x"];
  const tips = [];
  for (let w = 0; w < width; w++) {
    let prev = "x";
    for (let d = 0; d < depth; d++) {
      const n = `c${w}_${d}`;
      main.define(n, [prev], (p) => p + 1);
      names.push(n);
      prev = n;
    }
    tips.push(prev);
  }
  main.define("out", tips, (...vs) => vs.reduce((a, b) => a + b, 0));
  names.push("out");
  return { runtime, main, names, cells: names.length };
}

const median = (xs) => xs.slice().sort((a, b) => a - b)[xs.length >> 1];

async function timeAsync(fn, n) {
  const s = [];
  for (let i = 0; i < n; i++) {
    const t = performance.now();
    await fn(i);
    s.push(performance.now() - t);
  }
  return s;
}

function timeSync(fn, n) {
  const s = [];
  for (let i = 0; i < n; i++) {
    const t = performance.now();
    fn(i);
    s.push(performance.now() - t);
  }
  return s;
}

const N = 500;
const rows = [];

for (const [width, depth] of [[1, 10], [1, 50], [5, 20], [20, 25]]) {
  const { main, names, cells } = buildGraph(width, depth);
  const scope = names.map((n) => main._scope.get(n));

  const syncFn = compileDataflow(scope, { live: false, inputs: ["x"], outputs: ["out"] });
  const asyncFn = syncFn.asAsync;
  // No definition here is async, so the async arm's awaits are all conditional: it tests each value
  // and suspends on none of them. What is being priced is the async colour plus that test.
  if (asyncFn.awaits !== 0) throw new Error(`expected 0 unconditional awaits, got ${asyncFn.awaits}`);

  // Same answer, or the comparison is meaningless.
  const a = await asyncFn({ x: 0 });
  const b = syncFn({ x: 0 });
  if (a.out !== b.out) throw new Error(`arms disagree: ${a.out} vs ${b.out}`);

  // 50 warms nothing at 500 cells: the first batch of 500 read 0.2563ms and every batch after it
  // 0.033ms, so the median was still measuring tier-up. Warm with a full batch.
  await timeAsync((i) => asyncFn({ x: i }), N);
  timeSync((i) => syncFn({ x: i }), N);

  const asyncS = await timeAsync((i) => asyncFn({ x: i }), N);
  const syncS = timeSync((i) => syncFn({ x: i }), N);

  // Runtime arm: redefine the source cell and await the sink.
  const rtS = await timeAsync(async (i) => {
    main.redefine("x", [], () => i);
    await main.value("out");
  }, 100);

  rows.push({
    shape: `${width}x${depth}`,
    cells,
    answer: b.out,
    runtime: median(rtS),
    async: median(asyncS),
    sync: median(syncS)
  });
}

const f = (x) => x.toFixed(4).padStart(9);
console.log(`median ms per call, N=${N} (runtime arm N=100)\n`);
console.log("shape    cells   runtime      async       sync   async / sync");
for (const r of rows)
  console.log(
    `${r.shape.padEnd(8)}${String(r.cells).padStart(5)}${f(r.runtime)}${f(r.async)}${f(r.sync)}` +
      `        ${(r.async / r.sync).toFixed(2)}x`
  );

// ---------------------------------------------------------------------------
// One async cell in a big graph — the case that actually shows up
// ---------------------------------------------------------------------------
//
// A subgraph is rarely all-async or all-sync; it is usually sync with a fetch or two in it. Three
// arms on the same shape, all from the same emitter:
//
//   sync        no async definition -> a synchronous function, no awaits at all
//   conditional the same subgraph forced async -> n tests, 0 suspends
//   one async   one definition made async -> 1 suspend, n-1 tests
//
// The gap between the last two is what a single genuine await costs; the gap between the first two
// is what the async colour costs when nothing suspends.
{
  console.log("\n\none async cell among n, median ms per call, N=" + N + "\n");
  console.log("cells       sync   conditional     one async   one async vs sync");
  for (const [width, depth] of [[1, 50], [5, 20], [20, 25]]) {
    const { main, names, cells } = buildGraph(width, depth);
    const scope0 = names.map((n) => main._scope.get(n));
    const syncFn = compileDataflow(scope0, { live: false, inputs: ["x"], outputs: ["out"] });
    const condFn = syncFn.asAsync;

    // make exactly one cell in the middle of the first strand async, then recompile
    const victim = names[Math.floor(names.length / 2)];
    const prevInputs = main._scope.get(victim)._inputs.map((v) => v._name);
    main.redefine(victim, prevInputs, async (p) => p + 1);
    const oneFn = compileDataflow(names.map((n) => main._scope.get(n)), {
      live: false, inputs: ["x"], outputs: ["out"]
    });
    if (oneFn.awaits !== 1) throw new Error(`expected 1 unconditional await, got ${oneFn.awaits}`);
    if (condFn.awaits !== 0) throw new Error(`expected 0, got ${condFn.awaits}`);

    const a = syncFn({ x: 0 }), b = await condFn({ x: 0 }), c = await oneFn({ x: 0 });
    if (a.out !== b.out || a.out !== c.out) throw new Error(`arms disagree: ${a.out} ${b.out} ${c.out}`);

    timeSync((i) => syncFn({ x: i }), N);
    await timeAsync((i) => condFn({ x: i }), N);
    await timeAsync((i) => oneFn({ x: i }), N);
    const syncMs = median(timeSync((i) => syncFn({ x: i }), N));
    const condMs = median(await timeAsync((i) => condFn({ x: i }), N));
    const oneMs = median(await timeAsync((i) => oneFn({ x: i }), N));
    console.log(
      String(cells).padEnd(8) + syncMs.toFixed(4).padStart(10) + condMs.toFixed(4).padStart(14) +
        oneMs.toFixed(4).padStart(14) + ("   " + (oneMs / syncMs).toFixed(1) + "x").padStart(20)
    );
  }
}
