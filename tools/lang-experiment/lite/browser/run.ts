// Runs checked cells in a private Observable Runtime, without TypeScript or the file system: the
// browser counterpart of ../../run.ts loadPort (cells.ts or cells.tsx only; no shell or foreign).
import { Runtime } from "@observablehq/runtime";
import { type Node } from "../parse.ts";
import { lowerJsx } from "../jsx/lower.ts";
import { h } from "../jsx/h.ts";
import { erase } from "./erase.ts";
// a state cell's value is Observable's own Generators.input of its handle (a view)
import { input } from "../../../../vendor/observable-stdlib/src/generators/input.js";
import * as P from "../../prelude.runtime.ts";
import { island, type IslandSpec } from "../island.ts";
import { CAPABILITIES, PRELUDE_FNS } from "../intrinsics.ts";
import { cellsOf, on, events, listen, nameAction, release, guard, generatorish, type CellInfo } from "./cells.ts";
export { cellsOf, on, guard, generatorish, type CellInfo };
import { pagePool, runHere, type Pool } from "./workers.ts";

export type Status = "pending" | "fulfilled" | "rejected";
export type Rec = { name: string; status: Status; value?: unknown; error?: unknown; evals: number };
// now and random are made per consuming cell, as the harness does.
export type Capabilities = { now?: (cell: string) => () => number; random?: (cell: string) => () => number; fetch?: typeof fetch; log?: (cell: string, line: string) => void; pool?: () => Pool };
// The checker's verdict per cell, as checkSources returns it; compile refuses an island that is not all ok.
export type Verdicts = { cells: { name: string; status: string; errors: unknown[] }[] };

const CAPS = new Set(Object.keys(CAPABILITIES));
const PRELUDE_VALUES: Record<string, unknown> = { state: P.state, action: P.action, mut: P.mut, freeze: P.freeze, borrow: P.borrow, snapshot: P.snapshot, equals: P.equals, messageOf: P.messageOf, on, read: P.read, h };
const PRELUDE = [...PRELUDE_FNS, "h"];
if (PRELUDE.some((n) => !(n in PRELUDE_VALUES))) throw new Error("a prelude function has no runtime value");
export type Program = ReturnType<typeof runCells>;

let programs = 0;

export function runCells(source: string, opts: { tsx?: boolean; caps?: Capabilities; onChange?: (r: Rec) => void; checked?: Verdicts } = {}) {
  const programId = `p${++programs}`;
  const ts = opts.tsx ? lowerJsx(source) : source;
  const js = erase(ts);
  const cells = cellsOf(ts);
  const names = cells.map((c) => c.name);
  const exports = new Function(...PRELUDE, `"use strict";\n${js}\nreturn {${names.join(", ")}};`)(
    ...PRELUDE.map((n) => PRELUDE_VALUES[n])) as Record<string, (...a: unknown[]) => unknown>;
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
  // every variable value this program made, so dispose ends its listeners and stops its generators
  const made = new Set<unknown>();
  const stopAll = () => { for (const v of made) release(v); made.clear(); };
  const listeners = new Set<(r: Rec) => void>();
  const changed = (r: Rec) => { opts.onChange?.(r); for (const f of listeners) f(r); };

  const input = (c: CellInfo, p: CellInfo["params"][number]): string => {
    const t = byName.get(p.name);
    if (t) return t.returnsRef && p.refTyped ? `${p.name}$ref` : p.name;
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
    fulfilled(v: unknown) { made.add(v); rec.status = "fulfilled"; rec.value = v; rec.error = undefined; changed(rec); },
    rejected(e: unknown) { rec.status = "rejected"; rec.error = e; rec.value = undefined; changed(rec); },
  });
  for (const c of cells) {
    const raw = exports[c.name];
    const rec: Rec = { name: c.name, status: "pending", evals: 0 };
    recs.set(c.name, rec);
    const counted = (...a: unknown[]) => {
      rec.evals++;
      P.rt.evalDepth++;
      try { const r = raw(...a); return generatorish(r) ? guard(r) : r; } finally { P.rt.evalDepth--; }
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
    // A generator some cell takes as Events<T>: its value is a handle, kept across runs (found by program and
    // cell name); the generator in it is pulled only while a listener is attached.
    if (c.generator && cells.some((d) => d.params.some((p) => p.name === c.name && p.eventsTyped))) {
      main.variable(observe(rec)).define(c.name, [...inputs, "invalidation"], (...a: unknown[]) =>
        events(programId, c.name, a.slice(0, -1), () => counted(...a.slice(0, -1)) as any, a[a.length - 1] as Promise<unknown>));
      variables.push({ name: c.name, inputs, kind: "events: a handle; its generator runs while a listener is attached" });
      continue;
    }
    // A cell that calls on(...) is a listener: each run attaches its value until the run's invalidation.
    if (/\bon\s*\(/.test(ts.slice(...(c.span ?? [0, 0])))) {
      main.variable(observe(rec)).define(c.name, [...inputs, "invalidation"], (...a: unknown[]) => listen(counted(...a.slice(0, -1)), c.name, a[a.length - 1] as Promise<unknown>, programId));
      variables.push({ name: c.name, inputs, kind: "listener" });
      continue;
    }
    if (c.returnsRef) {
      const refRec: Rec = { name: `${c.name}$ref`, status: "pending", evals: 0 };
      main.variable(observe(refRec)).define(`${c.name}$ref`, inputs, (...a: unknown[]) => {
        const r = counted(...a);
        if (!P.isStateCell(r)) throw new Error(`${c.name} did not return state(...)`);
        return P.materialize(r, c.name);
      });
      main.variable(observe(rec)).define(c.name, [`${c.name}$ref`], (hd: unknown) => input(hd));
      variables.push({ name: `${c.name}$ref`, inputs, kind: "state cell: the handle State<T> parameters get" }, { name: c.name, inputs: [`${c.name}$ref`], kind: "state cell: its current value, one per write" });
    } else if (c.generator) {
      main.variable(observe(rec)).define(c.name, inputs, counted);
      variables.push({ name: c.name, inputs, kind: "cell" });
    } else {
      // Memoised on its inputs: when every input is the same value (Object.is) as last time, the body
      // does not run and the cell returns its last value, so its readers see the same value too.
      // Sound because accepted values are immutable; a generator input may lend one buffer mutated
      // between yields (borrow), so a cell reading a generator is not memoised; nor is one taking a
      // capability that can answer differently on the same inputs.
      const memo = !c.params.some((p) => (byName.get(p.name)?.generator && !p.eventsTyped) || ["now", "random", "fetch", "log"].includes(p.name));
      let last: { args: unknown[]; value: unknown } | null = null;
      const def = (...a: unknown[]) => {
        if (memo && last && a.every((v, i) => Object.is(v, last!.args[i]))) return last.value;
        const value = counted(...a);
        nameAction(value, c.name);
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
      const busy = [...recs.values()].some((r) => r.status === "pending") || !P.idle();
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
