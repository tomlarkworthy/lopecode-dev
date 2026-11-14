// The SoundScript standard library's runtime half, bundled into @tomlarkworthy/soundscript as ss.js.gz.
// Compiled cells call ss.cell(...); a ref cell's value variable calls ss.refValues(handle).
import * as P from "../../prelude.runtime.ts";
import { h } from "../jsx/h.ts";
import { create, patch } from "../jsx/render.ts";
import { lowerJsx } from "../jsx/lower.ts";
import { erase } from "../browser/erase.ts";
import { on, isSubs, generatorish, cellsOf, guard as guardWith } from "../browser/cells.ts";
export { cellsOf };
import { island, type IslandSpec } from "../island.ts";
import { pagePool, runHere, type Pool } from "../browser/workers.ts";
export { compileCell, compileModule, contextOf, contextFromCheck, acceptedOf, decompileVariable, decompileModule, langOf, cellOfVariable, splitCells, handleName } from "../toolchain/ss-toolchain.ts";
import { checkSources } from "../core.ts";
export { checkSources };
// checkSources for SoundScript cells, remembered for the last 16 sources. The editor asks about the
// same module source several times per keystroke (lint, the cells an edit would break, the compile
// context); a result is never written to, so one is shared.
const checks = new Map<string, ReturnType<typeof checkSources>>();
export function check(source: string, tsx = true): ReturnType<typeof checkSources> {
  const key = (tsx ? "x" : "s") + source;
  let r = checks.get(key);
  if (r) { checks.delete(key); checks.set(key, r); return r; }
  r = checkSources({ cells: source, tsx });
  checks.set(key, r);
  if (checks.size > 16) checks.delete(checks.keys().next().value!);
  return r;
}


export const { ref, action, mut, freeze, borrow, snapshot, equals, refValues } = P;
export { h, on, create, patch, pagePool };

// Values a generator has yielded. A reader of one may be handed the same buffer mutated between
// yields (borrow), so a memoised cell does not reuse its last value when one of these is an input.
const lent = new WeakSet<object>();
const guard = (g: Generator) => guardWith(g, (v) => lent.add(v));

// Per compiled text (opts.id, a hash made by the compiler), the inputs and value of its last run. An
// edit changes the id, so it starts empty; equal text with equal inputs gives the same value.
const memos = new Map<string, { args: unknown[]; value: unknown }>();
export const stats = { evals: 0, memoHits: 0 };
// body runs per compiled text: a variable's count is evals(variable._definition)
const evalCounts = new Map<string, number>();
const idOf = new WeakMap<object, string | null>();
export const evals = (definition: object) => {
  if (!idOf.has(definition)) idOf.set(definition, /\bid: "(\w+)", invalidation: [\w$]+\}\); \}$/.exec(String(definition))?.[1] ?? null);
  const id = idOf.get(definition);
  return id ? evalCounts.get(id) ?? 0 : 0;
};

// drops what memos and run counts keep for a compiled definition that no variable holds any more
export const forget = (definition: object) => {
  const id = /\bid: "(\w+)", invalidation: [\w$]+\}\); \}$/.exec(String(definition))?.[1];
  if (id) { memos.delete(id); evalCounts.delete(id); }
};
export const memoSize = () => memos.size;
export const memoHas = (id: string) => memos.has(id);

type Opts = { kind: "cell" | "ref" | "source"; name: string; memo: boolean; id: string; invalidation: Promise<unknown> | null };

export function cell(fn: (...a: unknown[]) => unknown, args: unknown[], o: Opts): unknown {
  if (o.memo) {
    const last = memos.get(o.id);
    if (last && args.length === last.args.length && args.every((v, i) => Object.is(v, last.args[i]) && !(typeof v === "object" && v !== null && lent.has(v)))) {
      stats.memoHits++;
      // a memo hit is still a new run of the cell: the set it returns again is held for this run too
      if (isSubs(last.value)) hold(last.value, o.invalidation);
      return last.value;
    }
  }
  if (o.kind === "source") return Object.freeze({ source: o.name, make: () => guard(fn(...args) as Generator) });
  P.state.evalDepth++;
  let value: unknown;
  try {
    stats.evals++;
    evalCounts.set(o.id, (evalCounts.get(o.id) ?? 0) + 1);
    const r = fn(...args);
    if (o.kind === "ref") {
      if (!P.isRefCell(r)) throw new Error(`${o.name} did not return ref(...)`);
      return P.materialize(r, o.name);
    }
    value = generatorish(r) ? guard(r) : r;
  } finally {
    P.state.evalDepth--;
  }
  if (o.memo) memos.set(o.id, { args, value });
  if (isSubs(value)) hold(value, o.invalidation);
  return value;
}

// Running subscriptions, one per (source handle, action) on the page, counted by the subscription
// sets that hold it, so a cell that forwards a set does not start a second copy. A sync generator is
// stepped once per animation frame, an async one as soon as each next() resolves.
type Running = { source: unknown; action: unknown; count: number; stop: () => void };
const live: Running[] = [];
// per set: what it holds, and how many runs of a cell currently return it
const held = new Map<object, { mine: Running[]; runs: number; pinned: boolean }>();
export const running = () => live.length;
// removes a stopped subscription from live and from every set's list, once
function unlist(e: Running) {
  const i = live.indexOf(e);
  if (i >= 0) live.splice(i, 1);
  for (const h of held.values()) { const j = h.mine.indexOf(e); if (j >= 0) h.mine.splice(j, 1); }
  e.count = 0;
}
const label = (x: any) => (x && typeof x === "object" ? x.source : x?.name) || "(anonymous)";
function start(source: { make: () => any }, act: (x: unknown) => void): Running {
  let stopped = false;
  const gen = source.make();
  // A generator or action that throws logs the error naming the source and action, and stops only
  // its own subscription: it leaves live and every set that held it, while every other subscription
  // keeps running. A set made later that holds the same (source, action) pair starts it afresh.
  const fail = (e: unknown) => {
    if (stopped) return;
    console.error(`subscription ${label(source)} -> ${label(act)} failed:`, e);
    entry.stop();
    unlist(entry);
  };
  const step = () => {
    if (stopped) return;
    try {
      const res = gen.next();
      const handle = (r: IteratorResult<unknown>, async: boolean) => {
        if (stopped || r.done) return;
        act(r.value);
        if (async) step(); else requestAnimationFrame(step);
      };
      if (res && typeof res.then === "function") res.then((r: IteratorResult<unknown>) => { try { handle(r, true); } catch (e) { fail(e); } }, fail);
      else handle(res, false);
    } catch (e) { fail(e); }
  };
  const entry: Running = { source, action: act, count: 0, stop: () => { stopped = true; try { gen.return(); } catch {} } };
  requestAnimationFrame(step);
  return entry;
}
function hold(set: { source: any; action: any }[], invalidation: Promise<unknown> | null) {
  let h = held.get(set);
  if (!h) {
    const mine: Running[] = [];
    for (const w of set) {
      let e = live.find((r) => r.source === w.source && r.action === w.action);
      if (!e) { e = start(w.source, w.action); live.push(e); }
      if (!mine.includes(e)) { e.count++; mine.push(e); }
    }
    held.set(set, (h = { mine, runs: 0, pinned: false }));
  }
  // A run with no invalidation (a cell that forwards a set) is never released by the runtime, so all
  // such runs of a set count as one holder, which release(set) or sweep removes.
  if (!invalidation) { if (!h.pinned) { h.pinned = true; h.runs++; } return; }
  h.runs++;
  // dropped after the cell's next value is held, so a set that keeps a subscription does not restart it
  invalidation.then(() => setTimeout(() => release(set), 0));
}
// One holder of a subscription set is gone: the set's subscriptions stop when no holder remains.
// Equal compiled text in two modules shares a memo id, so two variables can hold one set object.
// Each run of a cell that returns the set is a holder, and its invalidation releases it. The runtime
// does not resolve invalidation when a variable is deleted, so the module calls this once with the
// deleted variable's value; a variable whose invalidation will resolve must not also call it.
export function release(set: unknown) {
  const h = held.get(set as object);
  if (h && --h.runs <= 0) drop(set as object);
}
// stops what a set held, whatever its holder count
function drop(set: object) {
  const h = held.get(set);
  if (!h) return;
  held.delete(set);
  bornAt.delete(set);
  for (const e of [...h.mine]) if (--e.count <= 0) { e.stop(); unlist(e); }
}

// Stops the sets no live variable holds. A set made since the last sweep is spared once: it may be
// a value the runtime has not assigned yet.
let generation = 0;
const bornAt = new Map<object, number>();
export function sweep(values: Set<unknown>) {
  generation++;
  for (const set of [...held.keys()]) {
    if (values.has(set)) { bornAt.delete(set); continue; }
    if (!bornAt.has(set)) { bornAt.set(set, generation); continue; }
    if (bornAt.get(set)! < generation) { bornAt.delete(set); drop(set); }
  }
}

// page-wide, so two modules' islands never share a key in one pool
let made = 0;
const ISLANDS = 64;
// compile for one module. read() returns that module's SoundScript source; an island runs only when
// the checker accepts it and the calling cell.
export function compiler(read: () => string) {
  const owners = new Map<string, { dead: boolean }>();
  // island text -> key, least recently used first, at most ISLANDS entries. A key is never reused for
  // other text (workers cache compiled islands by key), so an evicted island gets a fresh key.
  const keys = new Map<string, string>();
  const keyFor = (js: string, caller: string) => {
    let key = keys.get(js);
    if (key) keys.delete(js);
    else key = `island${++made}:${caller}`;
    keys.set(js, key);
    if (keys.size > ISLANDS) keys.delete(keys.keys().next().value!);
    return key;
  };
  return {
    islands: () => keys.size,
    // called each time the calling cell runs: the functions it made before are superseded
    for(caller: string, refs: Record<string, unknown>) {
      owners.get(caller) && (owners.get(caller)!.dead = true);
      const owner = { dead: false };
      owners.set(caller, owner);
      return (spec: IslandSpec & { options?: { runtime?: Pool } }) => {
        const source = read();
        const result = check(source);
        // cell facts and text come from the check's parse
        const byName = new Map([...result.facts!.values()].map((info) => [info.name, { info, text: source.slice(info.span![0], info.span![1]) }] as const));
        const isl = island([...byName.values()].map(({ info }) => ({ name: info.name, params: info.params.map((p) => p.name), refCell: info.returnsRef })), spec);
        if (isl.problems.length) throw new Error(isl.problems.map((p) => p.msg).join("; "));
        const verdict = new Map(result.cells.map((c) => [c.name, c.status === "ok" && !c.errors.length]));
        const notOk = [caller, ...isl.order].filter((n) => !verdict.get(n));
        if (notOk.length) throw new Error(`compile refused: ${notOk.join(", ")} not ok by the checker`);
        const js = erase(lowerJsx(isl.order.map((n) => byName.get(n)!.text).join("\n\n")));
        const key = keyFor(js, caller);
        const order = isl.order.map((n) => ({ name: n, params: byName.get(n)!.info.params.map((p) => p.name) }));
        const runtime = spec.options?.runtime;
        return async (args: Record<string, unknown>) => {
          const job = { key, js, names: isl.order, order, values: { ...refs, ...args }, outputs: spec.outputs };
          if (runtime && typeof runtime.run === "function") return runtime.run(job, owner);
          await null;
          return runHere(job);
        };
      };
    },
  };
}
export const compileFor = (c: ReturnType<typeof compiler>, caller: string, refs: Record<string, unknown>) => {
  if (!c || typeof c.for !== "function") throw new Error(`${caller} takes compile, and this module defines no ss_compile = ss.compiler(...)`);
  return c.for(caller, refs);
};

// An element value as DOM: patches the node it made last time (pass `this` from an ojs cell).
export function mount(x: unknown, prev: any): Node {
  if (prev && prev.__elem && x && typeof x === "object" && prev.__elem.tag === (x as any).tag) {
    patch(prev, x as any);
    return prev;
  }
  return create(document, x);
}

// The page's worker pool, made on first use, so a notebook that never compiles starts no workers.
export function lazyPool(): Pool {
  let p: Pool | null = null;
  const get = () => (p ??= pagePool());
  return { get size() { return get().size; }, run: (job, owner) => get().run(job, owner) };
}
