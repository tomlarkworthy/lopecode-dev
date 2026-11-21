// Overhead of runner.ts against the shipped shells. Arms are interleaved, 9 rounds, medians printed.
// A: the loop alone, with a stub step (the shipped cells.ts loop copied, against runner.ts)
// B: events end to end: shipped lite/browser/cells.ts against events-shell.ts, sync generators, frames run by hand
// C: pool: shipped makePool against pool-shell.ts, fake workers answering at once; also with a stub step
// D: store: shipped prelude.runtime.ts against store-shell.ts, top-level action calls with one write, a commit per 10
// Run: bun bench.ts
import { runner } from "./runner.ts";
import * as shippedCells from "../../lite/browser/cells.ts";
import * as mineCells from "./events-shell.ts";
import { makePool as shippedPool } from "../../lite/browser/workers.ts";
import { makePool as minePool } from "./pool-shell.ts";
import * as shippedStore from "../../prelude.runtime.ts";
import * as mineStore from "./store-shell.ts";
import { poolStep } from "../../lite/runtime-ss.ts";

const med = (xs: number[]) => xs.toSorted((a, b) => a - b)[xs.length >> 1]!;
const rounds = <K extends string>(arms: Record<K, () => number>, n = 9): Record<K, number> => {
  const got = Object.fromEntries(Object.keys(arms).map((k) => [k, [] as number[]])) as Record<K, number[]>;
  for (let r = 0; r < n; r++) for (const k of Object.keys(arms) as K[]) got[k].push(arms[k]());
  return Object.fromEntries(Object.entries(got).map(([k, v]) => [k, med(v as number[])])) as Record<K, number>;
};
const print = (title: string, unit: string, r: Record<string, number>) => {
  const base = Object.values(r)[0]!;
  console.log(`${title}: ${Object.entries(r).map(([k, v]) => `${k} ${v.toFixed(3)} ${unit} (${(v / base).toFixed(2)}x)`).join(", ")}`);
};

// A: the loop alone
{
  type Ev = { t: "tick"; n: number };
  type Fx = { fx: "then"; ev: Ev } | { fx: "noop" };
  const stub = (s: number, ev: Ev) => ({ state: s + 1, effects: ev.n > 0 ? [{ fx: "then", ev: { t: "tick", n: ev.n - 1 } } as Fx, { fx: "noop" } as Fx] : [] });
  // the shipped loop of lite/browser/cells.ts, with this stub's two effects in its switch
  let st = 0;
  const perform = (e: Fx): Ev | void => { switch (e.fx) { case "then": return e.ev; case "noop": return; } };
  const shippedFeed = (first: Ev) => {
    const work: (Ev | Fx)[] = [first];
    while (work.length) {
      const x = work.pop()!;
      if ("fx" in x) { const next = perform(x); if (next) work.push(next); continue; }
      const r = stub(st, x);
      st = r.state;
      for (let i = r.effects.length - 1; i >= 0; i--) work.push(r.effects[i]!);
    }
  };
  const R = runner(stub, 0, { then: (e) => e.ev, noop: () => {} });
  const STEPS = 1000, FEEDS = 200;
  const time = (feed: (ev: Ev) => unknown) => () => { const t0 = performance.now(); for (let i = 0; i < FEEDS; i++) feed({ t: "tick", n: STEPS }); return ((performance.now() - t0) * 1e6) / (FEEDS * (STEPS + 1)); };
  // one feed per step: the cost of starting a feed (the runner makes a run object each time)
  const time1 = (feed: (ev: Ev) => unknown) => () => { const t0 = performance.now(); for (let i = 0; i < 200000; i++) feed({ t: "tick", n: 0 }); return ((performance.now() - t0) * 1e6) / 200000; };
  print("A loop alone, 1000 steps per feed", "ns/step", rounds({ shipped: time(shippedFeed), runner: time(R.feed) }));
  print("A loop alone, 1 step per feed", "ns/feed", rounds({ shipped: time1(shippedFeed), runner: time1(R.feed) }));
}

// B: events end to end
{
  type Cells = typeof shippedCells;
  const H = 20, FRAMES = 200;
  const bench = (C: Cells, tag: string) => () => {
    const frames: (() => void)[] = [];
    C.scheduler.frame = (f) => void frames.push(f);
    let got = 0;
    const act = () => void got++;
    const hs = Array.from({ length: H }, (_, i) => C.events(tag, `e${i}`, [], function* () { let k = 0; while (true) yield k++; } as never, null));
    hs.forEach((h, i) => { C.listen(C.on(h, act), `a${i}`, null, tag); C.listen(C.on(h, act), `b${i}`, null, tag); });
    const t0 = performance.now();
    for (let f = 0; f < FRAMES; f++) for (const run of frames.splice(0)) run();
    const us = ((performance.now() - t0) * 1000) / got;
    C.sweep(new Set()); C.sweep(new Set());
    return us;
  };
  print(`B events, ${H} events cells x 2 listeners, sync generators`, "µs/delivered value", rounds({ shipped: bench(shippedCells, "S"), runner: bench(mineCells as unknown as Cells, "M") }));
}

// C: pool (as lite/soundscript/.scratch/ports-night/pool-bench.ts)
{
  class W { onmessage: any = null; onerror: any = null; posted: any[] = []; postMessage(m: any) { this.posted.push(m); } }
  const job = (i: number) => ({ key: `k${i % 4}`, js: "c", names: [], order: [], values: { x: i }, outputs: [] });
  const owner = { dead: false };
  const round = (make: typeof shippedPool, D: number, total: number, step?: typeof poolStep) => () => {
    const ws: W[] = [];
    const pool = make(2, () => { const w = new W(); ws.push(w); return w as unknown as Worker; }, step);
    const t0 = performance.now();
    for (let done = 0; done < total; done += D) {
      for (let i = 0; i < D; i++) pool.run(job(done + i), owner).catch(() => {});
      for (let left = D; left > 0;) for (const w of ws) { const m = w.posted.shift(); if (m) { w.onmessage({ data: { id: m.id, out: { v: 1 } } }); left--; } }
    }
    return ((performance.now() - t0) * 1000) / total;
  };
  // a stub step: every run is posted to slot 0 at once and every message resolves it; the shell's cost without poolStep's
  const stub = ((st: any, ev: any) => ev.t === "run" ? { state: st, effects: [{ fx: "post", slot: 0, id: ev.qid, qid: ev.qid, withCode: true, resend: false }] }
    : ev.t === "message" ? { state: st, effects: [{ fx: "resolve", qid: ev.id }] } : { state: st, effects: [] }) as unknown as typeof poolStep;
  for (const D of [1, 10, 100]) print(`C pool, size 2, queue depth ${D}`, "µs/job", rounds({ shipped: round(shippedPool, D, 20000), runner: round(minePool, D, 20000) }));
  print("C pool with a stub step, queue depth 1", "µs/job", rounds({ shipped: round(shippedPool, 1, 20000, stub), runner: round(minePool, 1, 20000, stub) }));
}

// D: store
{
  type Store = typeof shippedStore;
  const timers: (() => void)[] = [];
  (globalThis as any).setTimeout = (f: () => void) => { timers.push(f); return 0; };
  const bench = (P: Store) => () => {
    P.reset();
    const h = P.materialize(P.state(0), "n") as unknown as { update(f: (v: number) => number): void };
    const inc = P.action(() => h.update((x) => x + 1)) as () => void;
    const CALLS = 20000;
    const t0 = performance.now();
    for (let i = 0; i < CALLS; i++) { inc(); if (i % 10 === 9) timers.shift()!(); }
    return ((performance.now() - t0) * 1000) / CALLS;
  };
  print("D store, one write per action call, a commit per 10 calls", "µs/call", rounds({ shipped: bench(shippedStore), runner: bench(mineStore as unknown as Store) }));
}
