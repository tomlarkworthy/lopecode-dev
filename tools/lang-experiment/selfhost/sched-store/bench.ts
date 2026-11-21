// Store cost, prelude.runtime.ts against shell.ts: us per set inside one action (to one store, and to K distinct
// stores), per read, per top-level action call of one update, and per store made. One warm-up round, then ROUNDS
// rounds with the arm order alternated; commits run between rounds. Prints min-max us per operation. The prototype's
// state keeps every store made (the original's are in WeakMaps), so later rounds run with more stores held.
// Run: bun selfhost/sched-store/bench.ts
const impls = { original: await import("../../prelude.runtime.ts"), prototype: await import("./shell.ts") };
type P = (typeof impls)["original"];
const ROUNDS = 5, N = 20000;
const settle = () => new Promise((r) => setTimeout(r, 1));
const cases: Record<string, (P: P) => number> = {
  "set, one store": (P) => { const n: any = P.materialize(P.state(0), "n"); let ms = 0; P.action(() => { const t = performance.now(); for (let i = 0; i < N; i++) n.set(i); ms = performance.now() - t; })(); return (ms * 1000) / N; },
  "set, 100 stores": (P) => { const ns: any[] = Array.from({ length: 100 }, (_, i) => P.materialize(P.state(0), `n${i}`)); let ms = 0; P.action(() => { const t = performance.now(); for (let i = 0; i < 100; i++) ns[i].set(i); ms = performance.now() - t; })(); return (ms * 1000) / 100; },
  "read": (P) => { const n: any = P.materialize(P.state(0), "n"); let ms = 0; P.action(() => { n.set(1); const t = performance.now(); for (let i = 0; i < N; i++) P.read(n); ms = performance.now() - t; })(); return (ms * 1000) / N; },
  "store made": (P) => { const t = performance.now(); for (let i = 0; i < 1000; i++) P.materialize(P.state(i), `m${i}`); return ((performance.now() - t) * 1000) / 1000; },
  "call of one update": (P) => { const n: any = P.materialize(P.state(0), "n"); const a = P.action(() => n.update((v: number) => v + 1)); const t = performance.now(); for (let i = 0; i < N; i++) a(); return ((performance.now() - t) * 1000) / N; },
};
const labels = Object.keys(impls) as (keyof typeof impls)[];
const times = new Map<string, number[]>();
for (let r = -1; r < ROUNDS; r++)
  for (const [name, f] of Object.entries(cases))
    for (const label of r % 2 ? labels : [...labels].reverse()) {
      const held = impls.prototype.storesHeld(), us = f(impls[label]);
      if (r >= 0) times.set(`${label.padEnd(10)} ${name}`, [...(times.get(`${label.padEnd(10)} ${name}`) ?? []), us]);
      if (label === "prototype" && name === "store made") console.log(`round ${r}: prototype store made ${us.toFixed(3)} us with ${held} stores held`);
      await settle();
    }
for (const [k, ts] of [...times].sort()) console.log(`${k.padEnd(40)} ${Math.min(...ts).toFixed(3)}-${Math.max(...ts).toFixed(3)} us`);
console.log(`prototype: ${impls.prototype.stepsRun()} steps; ${impls.prototype.storesHeld()} stores held in its state at the end`);
