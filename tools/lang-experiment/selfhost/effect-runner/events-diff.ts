// Scripted differential of the events shell, for the effects the shipped tests reach rarely or never: a generator
// that throws or rejects (fail), a placeOf that throws (placeFailed), an action that throws, and an action that
// calls listen, release or events while it is being called (a feed from inside the call performer).
// The same random scripts run in two processes, one on the shipped lite/browser/cells.ts and one on this folder's
// (bun --preload ./redirect.ts with SHELLS=events); each prints one line per script, the script's log, compared
// by compare.ts. Frames and microtasks are run by the script; no timers.
// Run: [SHELLS=events [RUNNER_MUTANT=x]] [STEP_TRACE=f] bun --preload ./redirect.ts events-diff.ts [scripts] > out.txt
import * as C from "../../lite/browser/cells.ts";

const N = Number(process.argv[2] ?? 500), STEPS = 60;
const frames: (() => void)[] = [];
C.scheduler.frame = (f) => void frames.push(f);
let log: string[] = [];
const L = (s: string) => void log.push(s);
console.error = (...a: unknown[]) => L(`console.error ${String(a[0])} ${a[1] instanceof Error ? a[1].message : String(a[1])}`);
// a throw from a feed inside a promise callback (an async generator's next value whose delivery places) is unhandled
process.on("unhandledRejection", (e) => L(`unhandled ${(e as Error)?.message ?? String(e)}`));
const rng = (seed: number) => () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const turn = async () => { for (let i = 0; i < 4; i++) await null; };

// the generator functions an events cell may run; make is called with the run's inputs
const MAKES: ((k: number) => any)[] = [
  function* sync(k: number) { let i = 0; while (true) yield `s${k}:${i++}`; },
  function* finite(k: number) { yield `f${k}:0`; yield `f${k}:1`; },
  async function* async_(k: number) { let i = 0; while (true) { await null; yield `a${k}:${i++}`; } },
  function* throws(k: number) { yield `t${k}:0`; throw new Error(`generator t${k} threw`); },
  async function* rejects(k: number) { await null; yield `r${k}:0`; throw new Error(`generator r${k} rejected`); },
];
type Deferred = { p: Promise<unknown>; resolve: () => void };
const deferred = (): Deferred => { let resolve!: () => void; const p = new Promise<unknown>((r) => (resolve = () => r(undefined))); return { p, resolve }; };

async function play(seed: number): Promise<string> {
  const r = rng(seed), pick = <T>(xs: readonly T[]): T | undefined => xs[Math.floor(r() * xs.length)];
  log = [];
  const handles: object[] = [], listeners: object[] = [], actions: ((x: unknown) => void)[] = [], pending: Deferred[] = [];
  const places = new WeakMap<object, [string, number] | null>();
  const guarded = (what: string, f: () => unknown) => { try { f(); } catch (e) { L(`${what} threw ${(e as Error).message}`); } };
  const listenOne = (cell: string, act: (x: unknown) => void) => {
    const h = pick(handles);
    if (!h) return;
    const inv = deferred();
    pending.push(inv);
    guarded(`listen ${cell}`, () => { listeners.push(C.listen(C.on(h, act), cell, inv.p, pick(["A", "B"]) ?? "A")); });
  };
  const makeAction = (cell: string, kind: number) => {
    const act = (x: unknown) => {
      L(`deliver ${cell} ${String(x)}`);
      if (kind === 1) throw new Error(`action ${cell} threw`);
      if (kind === 2) { const l = pick(listeners); if (l) C.release(l); }
      if (kind === 3) listenOne(`${cell}x`, (y) => L(`deliver ${cell}x ${String(y)}`));
      if (kind === 4) guarded("events from an action", () => handles.push(C.events("A", pick(["e0", "e1"])!, [Math.floor(r() * 2)], MAKES[0]!, null)));
    };
    actions.push(act);
    return act;
  };
  for (let s = 0; s < STEPS; s++) {
    const x = r();
    if (x < 0.16) {
      const inv = deferred();
      pending.push(inv);
      const name = pick(["e0", "e1", "e2"])!, args = [Math.floor(r() * 2)], make = pick(MAKES)!;
      guarded(`events ${name}`, () => { handles.push(C.events(pick(["A", "B"])!, name, args, make, r() < 0.5 ? inv.p : null)); });
    } else if (x < 0.34) {
      const cell = pick(["l0", "l1", "l2", "l3"])!;
      listenOne(cell, r() < 0.5 && actions.length ? pick(actions)! : makeAction(cell, Math.floor(r() * 5)));
    } else if (x < 0.44) {
      const d = pending.splice(Math.floor(r() * pending.length), 1)[0];
      d?.resolve();
    } else if (x < 0.66) {
      const take = frames.splice(0);
      for (const f of take) guarded("frame", f);
    } else if (x < 0.72) {
      const v = pick([...listeners, ...handles, ...actions]);
      if (v) guarded("release", () => C.release(v));
    } else if (x < 0.76) {
      const held = new Set([...listeners, ...handles].filter(() => r() < 0.7));
      guarded("sweep", () => C.sweep(held));
    } else if (x < 0.82) {
      for (const v of [...handles, ...listeners]) if (!places.has(v)) places.set(v, r() < 0.8 ? [pick(["A", "B"])!, Math.floor(r() * 5)] : null);
      const kind = Math.floor(r() * 3);
      const placer = kind === 0 ? null : kind === 1 ? (vs: unknown[]) => vs.map((v) => places.get(v as object) ?? null) : () => { throw new Error("placeOf threw"); };
      guarded("setListenerOrder", () => C.setListenerOrder(placer));
    } else if (x < 0.85) {
      guarded("listenerOrderChanged", () => C.listenerOrderChanged());
    }
    await turn();
    L(`running ${C.running()} live ${C.liveEvents()} pulling ${C.pulling()}`);
  }
  // end every script empty: no placer, and two sweeps with nothing held release everything
  C.setListenerOrder(null);
  guarded("sweep", () => C.sweep(new Set()));
  guarded("sweep", () => C.sweep(new Set()));
  for (const d of pending) d.resolve();
  await turn();
  frames.length = 0;
  L(`end running ${C.running()} live ${C.liveEvents()}`);
  return log.join(" | ");
}
for (let seed = 1; seed <= N; seed++) console.log(`${seed}\t${await play(seed)}`);
