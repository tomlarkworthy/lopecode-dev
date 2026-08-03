// Probe: does the Observable runtime already run independent async cells concurrently,
// and how much does the scheduler itself cost? (research for worker-offload feasibility)
import { Runtime } from "../vendor/observable-runtime/src/index.js";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ---- 1. concurrency of independent async cells -----------------------------
{
  const runtime = new Runtime();
  const main = runtime.module();
  const N = 8, MS = 200;
  const done: number[] = [];
  const t0 = performance.now();
  for (let i = 0; i < N; i++) {
    main.variable({ fulfilled: () => done.push(performance.now() - t0) })
      .define(`leaf${i}`, [], async () => { await sleep(MS); return i; });
  }
  // a join cell that depends on all of them
  main.variable({ fulfilled: (v) => done.push(-(performance.now() - t0)) })
    .define("join", Array.from({ length: N }, (_, i) => `leaf${i}`), (...xs) => xs.length);
  await sleep(MS * N + 500);
  const wall = Math.max(...done.map(Math.abs));
  console.log(`[1] ${N} independent async cells, ${MS}ms each`);
  console.log(`    wall clock to settle all + join: ${wall.toFixed(0)}ms`);
  console.log(`    serial would be ~${N * MS}ms, concurrent ~${MS}ms => ${wall < N * MS / 2 ? "CONCURRENT" : "SERIALIZED"}`);
}

// ---- 2. chained (dependent) async cells: must serialize ---------------------
{
  const runtime = new Runtime();
  const main = runtime.module();
  const N = 8, MS = 100;
  let last = 0;
  const t0 = performance.now();
  main.variable().define("c0", [], async () => { await sleep(MS); return 0; });
  for (let i = 1; i < N; i++) {
    main.variable(i === N - 1 ? { fulfilled: () => (last = performance.now() - t0) } : undefined)
      .define(`c${i}`, [`c${i - 1}`], async (p: number) => { await sleep(MS); return p + 1; });
  }
  await sleep(MS * N + 500);
  console.log(`[2] chain of ${N} dependent async cells, ${MS}ms each: ${last.toFixed(0)}ms (expected ~${N * MS} serial)`);
}

// ---- 3. scheduler overhead: how much time is the runtime itself? ------------
{
  for (const N of [100, 1000, 5000]) {
    const runtime = new Runtime();
    const main = runtime.module();
    main.variable().define("root", [], 0);
    // wide fan-out: N cells depending on root, all observed
    for (let i = 0; i < N; i++) {
      main.variable({ fulfilled: () => {} }).define(`v${i}`, ["root"], (r: number) => r + i);
    }
    await sleep(200);
    const root = (main as any)._scope.get("root");
    const t0 = performance.now();
    const ROUNDS = 20;
    for (let k = 0; k < ROUNDS; k++) {
      root.define("root", [], k + 1);
      await sleep(0);
      await new Promise((r) => setTimeout(r, 5));
    }
    const t = (performance.now() - t0) / ROUNDS;
    console.log(`[3] fan-out ${N} cells: ${t.toFixed(2)}ms per full recompute (~${(t * 1000 / N).toFixed(1)}us/cell incl. promise plumbing + 5ms sleep floor)`);
  }
}
process.exit(0);
