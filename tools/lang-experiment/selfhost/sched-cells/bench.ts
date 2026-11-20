// Delivery cost: cells.ts, ../sched (one step function), split cells linked, split cells as compile's island run synchronously: one sync events cell of N values to L listeners, frames run
// by hand, with H other idle events handles live (each step copies every map of the state, so H is the copy size).
// One warm-up round, then ROUNDS rounds arm order rotated per round; prints min-max us/value.
// Run: bun selfhost/sched-cells/bench.ts
const P = await import("../../prelude.runtime.ts");
const cellsShell = await import("./shell.ts");
const { islandStepSync } = await import("./island.ts");
const impls = { original: await import("../../lite/browser/cells.ts"), giant: await import("../sched/shell.ts"), linked: cellsShell, island: cellsShell };
const stepOf = { linked: null, island: islandStepSync } as Record<string, any>;
const N = 20000, ROUNDS = 5;
const configs = [[1, 0], [3, 0], [1, 100], [1, 1000]] as const;
let run = 0;
function once(label: keyof typeof impls, L: number, H: number) {
  const C = impls[label], tag = `${label}${run++}`;
  if (label in stepOf) cellsShell.useStep(stepOf[label]);
  const frames: (() => void)[] = [];
  C.scheduler.frame = (f) => void frames.push(f);
  const idle = Array.from({ length: H }, (_, i) => C.events(tag, `idle${i}`, [], () => (function* () {})() as any, null));
  const h = C.events(tag, "bench", [], () => (function* () { for (let i = 0; i < N; i++) yield i; })() as any, null);
  let got = 0;
  const ls = Array.from({ length: L }, (_, i) => C.listen(C.on(h, P.action(() => void got++)), `l${i}`, null, tag));
  const t0 = performance.now();
  while (frames.length) frames.splice(0).forEach((f) => f());
  const ms = performance.now() - t0;
  for (const x of [...ls, h, ...idle]) C.release(x);
  if (got !== N * L) throw new Error(`${label}: ${got} deliveries, wanted ${N * L}`);
  return (ms * 1000) / N;
}
const labels = Object.keys(impls) as (keyof typeof impls)[];
for (const [L, H] of configs) for (const l of labels) once(l, L, H);
const times = new Map<string, number[]>();
for (let r = 0; r < ROUNDS; r++)
  for (const [L, H] of configs)
    for (const label of [...labels.slice(r % labels.length), ...labels.slice(0, r % labels.length)]) {
      const k = `${label} L=${L} H=${H}`;
      times.set(k, [...(times.get(k) ?? []), once(label, L, H)]);
    }
for (const [k, ts] of times) console.log(`${k.padEnd(22)} ${Math.min(...ts).toFixed(2)}-${Math.max(...ts).toFixed(2)} us/value`);
