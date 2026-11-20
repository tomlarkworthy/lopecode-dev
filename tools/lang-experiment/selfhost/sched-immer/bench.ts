// ../sched/bench.ts over every variant of variants.ts plus the original cells.ts. Arm order rotates per round.
// Run: bun selfhost/sched-immer/bench.ts [variant ...]
const P = await import("../../prelude.runtime.ts");
const { makeShell } = await import("./factory.ts");
const V = await import("./variants.ts");
const names = process.argv.length > 2 ? process.argv.slice(2) : V.NAMES;
const impls: Record<string, any> = { original: await import("../../lite/browser/cells.ts") };
for (const n of names) impls[n] = makeShell(V.pick(n));
const labels = Object.keys(impls);
const N = 20000, ROUNDS = 5;
const configs = [[1, 0], [3, 0], [1, 100], [1, 1000]] as const;
let run = 0;
function once(label: string, L: number, H: number) {
  const C = impls[label], tag = `${label}${run++}`;
  const frames: (() => void)[] = [];
  C.scheduler.frame = (f: () => void) => void frames.push(f);
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
for (const [L, H] of configs) for (const l of labels) once(l, L, H);
const times = new Map<string, number[]>();
for (let r = 0; r < ROUNDS; r++)
  for (const [L, H] of configs)
    for (let i = 0; i < labels.length; i++) {
      const label = labels[(i + r) % labels.length], k = `${label}|${L},${H}`;
      times.set(k, [...(times.get(k) ?? []), once(label, L, H)]);
    }
const f = (ts: number[]) => `${Math.min(...ts).toFixed(2)}-${Math.max(...ts).toFixed(2)}`;
console.log(["variant".padEnd(22), ...configs.map(([L, H]) => `L=${L} H=${H}`.padEnd(13))].join(" "));
for (const l of labels) console.log([l.padEnd(22), ...configs.map(([L, H]) => f(times.get(`${l}|${L},${H}`)!).padEnd(13))].join(" "));
