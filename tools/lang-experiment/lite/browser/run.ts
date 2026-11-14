// Runs checked cells in a private Observable Runtime, without TypeScript or the file system: the
// browser counterpart of ../../run.ts loadPort (cells.ts or cells.tsx only; no shell or foreign).
import { Runtime } from "@observablehq/runtime";
import { parse, type Node } from "../parse.ts";
import { lowerJsx } from "../jsx/lower.ts";
import { h } from "../jsx/h.ts";
import { erase } from "./erase.ts";
import * as P from "../../prelude.runtime.ts";
import { island, specOf, compileCalls, type IslandSpec } from "../island.ts";
import { pagePool, runHere, type Pool } from "./workers.ts";

export type Status = "pending" | "fulfilled" | "rejected";
export type Rec = { name: string; status: Status; value?: unknown; error?: unknown; evals: number };
// now and random are made per consuming cell, as the harness does.
export type Capabilities = { now?: (cell: string) => () => number; random?: (cell: string) => () => number; fetch?: typeof fetch; log?: (cell: string, line: string) => void; pool?: () => Pool };
export type CellInfo = { name: string; params: { name: string; refTyped: boolean; sourceTyped: boolean }[]; returnsRef: boolean; generator: boolean; compiles: IslandSpec[] };
// The checker's verdict per cell, as checkSources returns it; compile refuses an island that is not all ok.
export type Verdicts = { cells: { name: string; status: string; errors: unknown[] }[] };

const CAPS = new Set(["now", "random", "fetch", "log", "invalidation", "compile", "pool"]);
const PRELUDE = ["ref", "action", "mut", "freeze", "borrow", "snapshot", "equals", "on", "h"];
// on(source, action): a subscription, as a value. The runner keeps running the set a cell returns.
const SUB = Symbol("sub");
export const on = (source: unknown, act: unknown) => Object.freeze({ [SUB]: true, source, action: act });
const isSubs = (v: unknown): v is { source: { make: () => any }; action: (x: unknown) => void }[] =>
  Array.isArray(v) && v.length > 0 && v.every((x) => x && typeof x === "object" && SUB in x);

function isRefCall(e: Node | null | undefined): boolean {
  while (e && (e.type === "ParenthesizedExpression" || e.type === "TSAsExpression")) e = e.expression;
  return !!e && e.type === "CallExpression" && e.callee.type === "Identifier" && e.callee.name === "ref";
}

export function cellsOf(src: string): CellInfo[] {
  const out: CellInfo[] = [];
  const add = (name: string, fn: Node) => {
    const rt = fn.returnType?.typeAnnotation;
    const returnsRef = (rt?.type === "TSTypeReference" && rt.typeName.name === "RefCell") ||
      (fn.body.type === "BlockStatement" ? fn.body.body.some((s: Node) => s.type === "ReturnStatement" && isRefCall(s.argument)) : isRefCall(fn.body));
    out.push({
      name, returnsRef, generator: !!fn.generator,
      compiles: compileCalls(fn).map(specOf).filter((s): s is NonNullable<ReturnType<typeof specOf>> => !!s).map(({ inputs, refs, outputs }) => ({ inputs, refs, outputs })),
      params: fn.params.map((p: Node) => {
        const a = p.typeAnnotation?.typeAnnotation;
        const ref = (n: string) => a?.type === "TSTypeReference" && a.typeName.name === n;
        return { name: p.type === "Identifier" ? p.name : "", refTyped: ref("Ref"), sourceTyped: ref("Source") };
      }),
    });
  };
  for (const st of parse(src).program.body) {
    const d = st.type === "ExportNamedDeclaration" ? st.declaration : null;
    if (d?.type === "FunctionDeclaration") add(d.id.name, d);
    else if (d?.type === "VariableDeclaration")
      for (const x of d.declarations)
        if (x.id.type === "Identifier" && x.init && /^(Arrow)?FunctionExpression$/.test(x.init.type)) add(x.id.name, x.init);
  }
  return out;
}

export const generatorish = (v: any): v is Generator => !!v && typeof v.next === "function" && typeof v.return === "function";
export function guard(g: Generator) {
  const wrap = (m: "next" | "return" | "throw") => (...a: unknown[]) => {
    P.state.evalDepth++;
    try { return (g[m] as (...x: unknown[]) => unknown)(...a); } finally { P.state.evalDepth--; }
  };
  return { next: wrap("next"), return: wrap("return"), throw: wrap("throw"), [Symbol.iterator]() { return this; } };
}

export type Program = ReturnType<typeof runCells>;

let programs = 0;

export function runCells(source: string, opts: { tsx?: boolean; caps?: Capabilities; onChange?: (r: Rec) => void; checked?: Verdicts } = {}) {
  const programId = `p${++programs}`;
  const ts = opts.tsx ? lowerJsx(source) : source;
  const js = erase(ts);
  const cells = cellsOf(ts);
  const names = cells.map((c) => c.name);
  const exports = new Function(...PRELUDE, `"use strict";\n${js}\nreturn {${names.join(", ")}};`)(
    P.ref, P.action, P.mut, P.freeze, P.borrow, P.snapshot, P.equals, on, h) as Record<string, (...a: unknown[]) => unknown>;
  const byName = new Map(cells.map((c) => [c.name, c]));
  const caps = opts.caps ?? {};
  const runtime = new Runtime();
  const main = runtime.module();
  const recs = new Map<string, Rec>();
  const logs: string[] = [];
  const hidden = new Set<string>();
  const variables: { name: string; inputs: string[]; kind: string }[] = [];
  const refValues = new Map<string, Record<string, unknown>>();
  const owners = new Map<string, { dead: boolean }[]>();
  const verdict = new Map((opts.checked?.cells ?? []).map((c) => [c.name, c.status === "ok" && !c.errors.length]));
  const islandCells = () => cells.map((c) => ({ name: c.name, params: c.params.map((p) => p.name), refCell: c.returnsRef }));
  // compile for one calling cell: the island runs the erased module in a worker (or here), from the
  // refs captured when the calling cell last ran plus the call's arguments.
  const compileFor = (caller: CellInfo) => (spec: IslandSpec & { options?: { runtime?: Pool } }) => {
    if (!opts.checked) throw new Error("compile needs the checker's verdict (runCells(..., { checked }))");
    const isl = island(islandCells(), spec);
    if (isl.problems.length) throw new Error(isl.problems.map((p) => p.msg).join("; "));
    const notOk = [caller.name, ...isl.order].filter((n) => !verdict.get(n));
    if (notOk.length) throw new Error(`compile refused: ${notOk.join(", ")} not ok by the checker`);
    const refs = { ...(refValues.get(caller.name) ?? {}) };
    const owner = { dead: false };
    owners.get(caller.name)?.push(owner);
    const order = isl.order.map((n) => ({ name: n, params: byName.get(n)!.params.map((p) => p.name) }));
    const runtime = spec.options?.runtime;
    const key = `${programId}`;
    return async (args: Record<string, unknown>) => {
      const job = { key, js, names, order, values: { ...refs, ...args }, outputs: spec.outputs };
      if (runtime && typeof runtime.run === "function") return runtime.run(job, owner);
      await null;
      return runHere(job);
    };
  };
  // Running subscriptions. One entry per (source handle, action) for the whole program, counted by
  // the cells whose set holds it, so a cell that forwards a set does not start a second copy. A sync
  // generator is stepped once per animation frame, an async one as soon as each next() resolves.
  type Running = { source: unknown; action: unknown; count: number; stop: () => void };
  const live: Running[] = [];
  const held = new Map<string, Running[]>();
  const start = (source: { make: () => any }, act: (x: unknown) => void): Running => {
    let stopped = false;
    const gen = source.make();
    const step = () => {
      if (stopped) return;
      const res = gen.next();
      const handle = (r: IteratorResult<unknown>, async: boolean) => {
        if (stopped || r.done) return;
        act(r.value);
        if (async) step(); else requestAnimationFrame(step);
      };
      if (res && typeof res.then === "function") res.then((r: IteratorResult<unknown>) => handle(r, true));
      else handle(res, false);
    };
    requestAnimationFrame(step);
    return { source, action: act, count: 0, stop: () => { stopped = true; try { gen.return(); } catch {} } };
  };
  const reconcile = (cell: string, v: unknown) => {
    const want = isSubs(v) ? v : [];
    const next: Running[] = [];
    for (const w of want) {
      let e = live.find((r) => r.source === w.source && r.action === w.action);
      if (!e) { e = start(w.source, w.action); live.push(e); }
      if (!next.includes(e)) { e.count++; next.push(e); }
    }
    for (const e of held.get(cell) ?? []) {
      if (--e.count === 0) { e.stop(); live.splice(live.indexOf(e), 1); }
    }
    if (next.length) held.set(cell, next); else held.delete(cell);
  };
  const stopAll = () => { for (const c of [...held.keys()]) reconcile(c, []); };
  const listeners = new Set<(r: Rec) => void>();
  const changed = (r: Rec) => { opts.onChange?.(r); for (const f of listeners) f(r); };

  const input = (c: CellInfo, p: CellInfo["params"][number]): string => {
    const t = byName.get(p.name);
    if (t) return t.returnsRef && p.refTyped ? `${p.name}$ref` : t.generator && p.sourceTyped ? `${p.name}$source` : p.name;
    if (CAPS.has(p.name) && p.name !== "invalidation") {
      const v = `${p.name}@${c.name}`;
      if (!hidden.has(v)) {
        hidden.add(v);
        const value = p.name === "compile" ? compileFor(c) : p.name === "pool" ? (caps.pool ?? pagePool)()
          : p.name === "now" ? caps.now?.(c.name) ?? (() => performance.now())
          : p.name === "random" ? caps.random?.(c.name) ?? Math.random
          : p.name === "fetch" ? caps.fetch ?? globalThis.fetch.bind(globalThis)
          : (...a: unknown[]) => { const line = a.map(String).join(" "); logs.push(`${c.name}: ${line}`); caps.log?.(c.name, line); };
        main.define(v, [], () => value);
        variables.push({ name: v, inputs: [], kind: `capability ${p.name}, for ${c.name} only` });
      }
      return v;
    }
    return p.name;
  };
  const observe = (rec: Rec) => ({
    pending() { rec.status = "pending"; changed(rec); },
    fulfilled(v: unknown) { reconcile(rec.name, v); rec.status = "fulfilled"; rec.value = v; rec.error = undefined; changed(rec); },
    rejected(e: unknown) { reconcile(rec.name, undefined); rec.status = "rejected"; rec.error = e; rec.value = undefined; changed(rec); },
  });
  for (const c of cells) {
    const raw = exports[c.name];
    const rec: Rec = { name: c.name, status: "pending", evals: 0 };
    recs.set(c.name, rec);
    const counted = (...a: unknown[]) => {
      rec.evals++;
      P.state.evalDepth++;
      try { const r = raw(...a); return generatorish(r) ? guard(r) : r; } finally { P.state.evalDepth--; }
    };
    const inputs = c.params.map((p) => input(c, p));
    // A compile call's refs are hidden inputs: the cell recomputes, and returns a new function, when one changes.
    const refNames = [...new Set(c.compiles.flatMap((s) => s.refs))].filter((n) => byName.has(n));
    const nParams = inputs.length;
    if (refNames.length) {
      const inner = counted;
      inputs.push(...refNames);
      const wrapped = (...a: unknown[]) => {
        refValues.set(c.name, Object.fromEntries(refNames.map((n, i) => [n, a[nParams + i]])));
        for (const o of owners.get(c.name) ?? []) o.dead = true;
        owners.set(c.name, []);
        return inner(...a.slice(0, nParams));
      };
      main.variable(observe(rec)).define(c.name, inputs, wrapped);
      variables.push({ name: c.name, inputs, kind: `cell; ${refNames.join(", ")} read for compile` });
      continue;
    }
    // A generator some cell takes as Source<T>: its variable is a handle that makes a fresh instance
    // per subscription, so nothing steps the generator unless something subscribes to it.
    if (c.generator && cells.some((d) => d.params.some((p) => p.name === c.name && p.sourceTyped))) {
      main.variable(observe(rec)).define(`${c.name}$source`, inputs, (...a: unknown[]) => Object.freeze({ source: c.name, make: () => counted(...a) }));
      main.variable(observe(rec)).define(c.name, [`${c.name}$source`], (s: unknown) => s);
      variables.push({ name: `${c.name}$source`, inputs, kind: "source: a handle, one generator per subscription" }, { name: c.name, inputs: [`${c.name}$source`], kind: "source cell: the handle again" });
      continue;
    }
    if (c.returnsRef) {
      const refRec: Rec = { name: `${c.name}$ref`, status: "pending", evals: 0 };
      main.variable(observe(refRec)).define(`${c.name}$ref`, inputs, (...a: unknown[]) => {
        const r = counted(...a);
        if (!P.isRefCell(r)) throw new Error(`${c.name} did not return ref(...)`);
        return P.materialize(r, c.name);
      });
      main.variable(observe(rec)).define(c.name, [`${c.name}$ref`], (hd: unknown) => P.refValues(hd as object));
      variables.push({ name: `${c.name}$ref`, inputs, kind: "ref cell: the handle Ref<T> parameters get" }, { name: c.name, inputs: [`${c.name}$ref`], kind: "ref cell: its current value, one per write" });
    } else if (c.generator) {
      main.variable(observe(rec)).define(c.name, inputs, counted);
      variables.push({ name: c.name, inputs, kind: "cell" });
    } else {
      // Memoised on its inputs: when every input is the same value (Object.is) as last time, the body
      // does not run and the cell returns its last value, so its readers see the same value too.
      // Sound because accepted values are immutable; a generator input may lend one buffer mutated
      // between yields (borrow), so a cell reading a generator is not memoised; nor is one taking a
      // capability that can answer differently on the same inputs.
      const memo = !c.params.some((p) => (byName.get(p.name)?.generator && !p.sourceTyped) || ["now", "random", "fetch", "log"].includes(p.name));
      let last: { args: unknown[]; value: unknown } | null = null;
      const def = (...a: unknown[]) => {
        if (memo && last && a.every((v, i) => Object.is(v, last!.args[i]))) return last.value;
        const value = counted(...a);
        last = { args: a, value };
        return value;
      };
      main.variable(observe(rec)).define(c.name, inputs, def);
      variables.push({ name: c.name, inputs, kind: memo ? "cell (memoised on its inputs)" : "cell" });
    }
  }

  const rt = runtime as unknown as { _computing: Promise<void> | null; dispose(): void };
  async function settle(maxMs = 3000): Promise<boolean> {
    const t0 = performance.now();
    let stable = 0;
    while (performance.now() - t0 < maxMs) {
      await new Promise((r) => setTimeout(r, 0));
      if (rt._computing) { stable = 0; await Promise.race([rt._computing, new Promise((r) => setTimeout(r, 20))]); continue; }
      const busy = [...recs.values()].some((r) => r.status === "pending") || P.state.flushScheduled || P.state.queue.length > 0;
      if (busy) { stable = 0; continue; }
      if (++stable >= 5) return true;
    }
    return false;
  }
  return {
    cells, variables, js, lowered: ts, recs, logs, settle,
    value: (n: string) => recs.get(n)?.value,
    status: (n: string) => recs.get(n)?.status,
    error: (n: string) => { const e = recs.get(n)?.error; return e === undefined ? undefined : String((e as Error)?.message ?? e); },
    evals: (n: string) => recs.get(n)?.evals ?? 0,
    subscribe: (f: (r: Rec) => void) => { listeners.add(f); return () => void listeners.delete(f); },
    dispose: () => { listeners.clear(); stopAll(); rt.dispose(); },
  };
}
