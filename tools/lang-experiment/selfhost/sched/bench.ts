// Delivery cost, original cells.ts against shell.ts: one sync events cell of N values to L listeners, frames run
// by hand, with H other idle events handles live (each step copies every map of the state, so H is the copy size).
// One warm-up round, then ROUNDS rounds with the two arms alternated per configuration; prints min-max us/value.
// Run: bun selfhost/sched/bench.ts
const P = await import("../../prelude.runtime.ts");
const impls = { original: await import("../../lite/browser/cells.ts"), shell: await import("./shell.ts") };
const N = 20000, ROUNDS = 5;
const configs = [[1, 0], [3, 0], [1, 100], [1, 1000]] as const;
let run = 0;
function once(label: keyof typeof impls, L: number, H: number) {
  const C = impls[label], tag = `${label}${run++}`;
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
for (const [L, H] of configs) { once("original", L, H); once("shell", L, H); }
const times = new Map<string, number[]>();
for (let r = 0; r < ROUNDS; r++)
  for (const [L, H] of configs)
    for (const label of (r % 2 ? ["shell", "original"] : ["original", "shell"]) as (keyof typeof impls)[]) {
      const k = `${label} L=${L} H=${H}`;
      times.set(k, [...(times.get(k) ?? []), once(label, L, H)]);
    }
for (const [k, ts] of times) console.log(`${k.padEnd(22)} ${Math.min(...ts).toFixed(2)}-${Math.max(...ts).toFixed(2)} us/value`);
