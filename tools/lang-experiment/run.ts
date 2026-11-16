// bun run.ts ports/<name> [--order forward|reverse] [--json] [--settle-ms N] [--bench <cell> --n <k>]
// Loads a port on the real @observablehq/runtime and reports every cell.
import { Runtime } from "@observablehq/runtime";
import ts from "typescript";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve, dirname, basename } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { analyze, type Cell } from "./analyze.ts";
import * as P from "./prelude.runtime.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const PRELUDE_RT = join(HERE, "prelude.runtime.ts");
const DOM_ERROR = /\b(document|window|navigator|HTMLElement|Element|Node|requestAnimationFrame|Image|HTMLCanvasElement|CanvasRenderingContext2D|WebGL\w*|getComputedStyle|ResizeObserver|IntersectionObserver|customElements)\b/;

export type CellStatus = "fulfilled" | "rejected" | "shell-skip" | "blocked" | "pending";
export type CellResult = {
  name: string;
  file: string;
  status: CellStatus;
  value?: unknown; // serialized
  error?: string;
  test?: "pass" | "fail" | "blocked";
  evals: number;
};
export type RunResult = {
  port: string;
  order: "forward" | "reverse";
  settled: boolean;
  cells: CellResult[];
  tests: { pass: number; fail: number; blocked: number };
  logs: string[];
};

// Stable serialization for cross-order comparison. Functions compare by kind only.
export function serialize(v: unknown, seen = new Set<unknown>()): unknown {
  if (v === undefined) return { $: "undefined" };
  if (typeof v === "number") return Number.isFinite(v) ? v : { $num: String(v) };
  if (typeof v === "bigint") return { $bigint: String(v) };
  if (typeof v === "symbol") return { $symbol: String(v) };
  if (typeof v === "function") return { $fn: P.isAction(v) ? "action" : "function" };
  if (v === null || typeof v !== "object") return v;
  if (seen.has(v)) return { $: "cycle" };
  seen.add(v);
  try {
    if (P.isRefHandle(v)) return { $ref: true };
    if (ArrayBuffer.isView(v) && !(v instanceof DataView)) return { $ta: v.constructor.name, data: Array.from(v as unknown as ArrayLike<number>, (x) => serialize(x, seen)) };
    if (v instanceof Map) return { $map: [...v].map(([k, x]) => [serialize(k, seen), serialize(x, seen)]) };
    if (v instanceof Set) return { $set: [...v].map((x) => serialize(x, seen)) };
    if (v instanceof Error) return { $error: v.message };
    if (v instanceof Promise) return { $: "promise" };
    if (Array.isArray(v)) return v.map((x) => serialize(x, seen));
    const proto = Object.getPrototypeOf(v);
    if (proto !== Object.prototype && proto !== null) return { $class: v.constructor?.name ?? "?" };
    const o: Record<string, unknown> = {};
    for (const k of Object.keys(v).sort()) o[k] = serialize((v as Record<string, unknown>)[k], seen);
    return o;
  } finally {
    seen.delete(v);
  }
}

type Rec = { name: string; cell?: Cell; status: CellStatus; value?: unknown; error?: unknown; evals: number; observed: boolean };
type Def = { varName: string; inputs: string[]; def: (...a: unknown[]) => unknown; rec: Rec; raw?: (...a: unknown[]) => unknown };

let buildCounter = 0;
const UNSUPPLIED = Symbol("unsupplied foreign");

async function importTranspiled(dir: string, file: string, tag: string) {
  let src = await Bun.file(join(dir, file)).text();
  // cells.ts names its cells without `export`; the harness exports them to import the module
  if (file === "cells.ts") {
    const P = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true);
    const isExp = (st: ts.Statement) => !!(ts.canHaveModifiers(st) && ts.getModifiers(st)?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword));
    const names = P.statements.flatMap((st) => isExp(st) ? [] : ts.isFunctionDeclaration(st) && st.name ? [st.name.text]
      : ts.isVariableStatement(st) ? st.declarationList.declarations.flatMap((d) => (ts.isIdentifier(d.name) ? [d.name.text] : [])) : []);
    if (names.length) src += `\nexport { ${names.join(", ")} };\n`;
  }
  const js = new Bun.Transpiler({ loader: "ts" }).transformSync(src);
  const out = join(HERE, ".build", `${basename(dir)}-${process.pid}-${tag}-${buildCounter++}`);
  mkdirSync(out, { recursive: true });
  const target = join(out, file.replace(/\.ts$/, ".mjs"));
  const header = `import { state, action, mut, freeze, borrow, snapshot, equals, read } from ${JSON.stringify(pathToFileURL(PRELUDE_RT).href)};\n`;
  writeFileSync(target, header + js);
  return (await import(pathToFileURL(target).href)) as Record<string, unknown>;
}

function guardGenerator(g: Generator) {
  const wrap = (m: "next" | "return" | "throw") => (...a: unknown[]) => {
    P.rt.evalDepth++;
    try {
      return (g[m] as (...x: unknown[]) => unknown)(...a);
    } finally {
      P.rt.evalDepth--;
    }
  };
  return { next: wrap("next"), return: wrap("return"), throw: wrap("throw"), [Symbol.iterator]() { return this; } };
}
const generatorish = (v: unknown): v is Generator =>
  !!v && typeof (v as Generator).next === "function" && typeof (v as Generator).return === "function";

export async function loadPort(dirIn: string, opts: { order?: "forward" | "reverse" } = {}) {
  const dir = resolve(dirIn);
  const order = opts.order ?? "forward";
  P.reset();
  const an = analyze(dir);
  const tag = order;
  const mods: Record<string, Record<string, unknown>> = {};
  if (an.files.cells != null) mods["cells.ts"] = await importTranspiled(dir, "cells.ts", tag);
  if (an.files.shell != null) mods["shell.ts"] = await importTranspiled(dir, "shell.ts", tag);
  let foreignValues: Record<string, unknown> = {};
  const fr = join(dir, "foreign.runtime.ts");
  if (existsSync(fr)) {
    const m = await import(pathToFileURL(fr).href);
    foreignValues = (m.default ?? m.foreign ?? m) as Record<string, unknown>;
  }
  const byName = new Map(an.cells.map((c) => [c.name, c]));
  const logs: string[] = [];
  const runtime = new Runtime();
  const main = runtime.module();
  const recs = new Map<string, Rec>();
  const hidden = new Map<string, unknown>();
  const defs: Def[] = [];

  const inputFor = (c: Cell, p: Cell["params"][number]): string => {
    if (p.source === "cell" || p.source === "shell") {
      const t = byName.get(p.name)!;
      return t.returnsRef && p.refTyped ? `${p.name}$ref` : p.name;
    }
    if (p.source === "capability") {
      if (p.name === "invalidation") return "invalidation";
      const v = `${p.name}@${c.name}`;
      if (!hidden.has(v))
        hidden.set(v, p.name === "now" ? P.makeClock() : p.name === "random" ? P.makeRandom(c.name) : p.name === "log" ? P.makeLog(c.name, logs) : globalThis.fetch);
      return v;
    }
    if (p.source === "foreign") {
      const v = `foreign:${p.name}`;
      if (!hidden.has(v)) hidden.set(v, Object.hasOwn(foreignValues, p.name) ? foreignValues[p.name] : UNSUPPLIED);
      return v;
    }
    return p.name; // stdlib/unknown: resolved through globalThis, usually "not defined"
  };

  for (const c of an.cells) {
    const f = mods[c.file]?.[c.name];
    const counter = { n: 0 };
    const rec: Rec = { name: c.name, cell: c, status: "pending", evals: 0, observed: true };
    Object.defineProperty(rec, "evals", { get: () => counter.n, set: () => {} });
    recs.set(c.name, rec);
    const raw = typeof f === "function" ? (f as (...a: unknown[]) => unknown) : () => { throw new Error(`${c.name} is not exported as a function`); };
    const counted = function (this: unknown, ...args: unknown[]) {
      counter.n++;
      P.rt.evalDepth++;
      try {
        const r = raw.apply(this, args);
        return generatorish(r) ? guardGenerator(r) : r;
      } finally {
        P.rt.evalDepth--;
      }
    };
    const inputs = c.params.map((p) => inputFor(c, p));
    if (c.returnsRef) {
      const refRec: Rec = { name: `${c.name}$ref`, status: "pending", evals: 0, observed: true };
      recs.set(refRec.name, refRec);
      defs.push({
        varName: `${c.name}$ref`, inputs, rec: refRec, raw,
        def: (...a: unknown[]) => {
          const r = counted(...a);
          if (!P.isStateCell(r)) throw new Error(`${c.name} did not return state(...)`);
          return P.materialize(r, c.name);
        },
      });
      defs.push({ varName: c.name, inputs: [`${c.name}$ref`], rec, def: (h: unknown) => P.refValues(h as object) });
    } else defs.push({ varName: c.name, inputs, rec, def: counted, raw });
  }

  // A foreign declared in foreign.d.ts but absent from foreign.runtime.ts fails like an unsupplied stdlib name.
  for (const [name, value] of hidden)
    main.define(name, [], value === UNSUPPLIED ? () => { throw new Error(`${name.replace(/^foreign:/, "")} is not defined`); } : () => value);
  const ordered = order === "forward" ? defs : [...defs].reverse();
  for (const d of ordered) {
    const rec = d.rec;
    main.variable({
      pending() { rec.status = "pending"; },
      fulfilled(v: unknown) { rec.status = "fulfilled"; rec.value = v; rec.error = undefined; },
      rejected(e: unknown) { rec.status = "rejected"; rec.error = e; rec.value = undefined; },
    }).define(d.varName, d.inputs, d.def);
  }

  const rt = runtime as unknown as { _computing: Promise<void> | null; dispose(): void };
  async function settle(maxMs = 5000): Promise<boolean> {
    const t0 = performance.now();
    let stable = 0;
    while (performance.now() - t0 < maxMs) {
      await new Promise((r) => setTimeout(r, 0));
      if (rt._computing) { stable = 0; await Promise.race([rt._computing, new Promise((r) => setTimeout(r, 20))]); continue; }
      const busy = [...recs.values()].some((r) => r.observed && r.status === "pending") || !P.idle();
      if (busy) { stable = 0; continue; }
      if (++stable >= 5) return true;
    }
    return false;
  }

  function results(): CellResult[] {
    const out = new Map<string, CellResult>();
    const status = (c: Cell): CellStatus => {
      const r = recs.get(c.name)!;
      if (r.status !== "rejected") return r.status;
      const msg = String((r.error as Error)?.message ?? r.error);
      if (c.file === "shell.ts" && (/ is not defined$/.test(msg) || DOM_ERROR.test(msg))) return "shell-skip";
      return "rejected";
    };
    for (const c of an.cells) out.set(c.name, { name: c.name, file: c.file, status: status(c), evals: recs.get(c.name)!.evals });
    // A rejection that comes from a skipped shell cell upstream is "blocked", not a failure.
    const upstreamSkip = (c: Cell, seen = new Set<string>()): boolean =>
      c.params.some((p) => {
        const t = byName.get(p.name);
        if (!t || seen.has(t.name)) return false;
        seen.add(t.name);
        return out.get(t.name)!.status === "shell-skip" || upstreamSkip(t, seen);
      });
    for (const c of an.cells) {
      const res = out.get(c.name)!;
      const r = recs.get(c.name)!;
      if (res.status === "rejected" && upstreamSkip(c)) res.status = "blocked";
      if (res.status === "fulfilled") res.value = serialize(r.value);
      if (res.status !== "fulfilled" && r.error !== undefined) res.error = String((r.error as Error)?.message ?? r.error);
      if (c.name.startsWith("test_")) res.test = res.status === "fulfilled" ? "pass" : res.status === "blocked" ? "blocked" : "fail";
      if (res.test === "fail" && res.status === "pending") res.error = "did not settle";
    }
    return [...out.values()];
  }

  return {
    an, runtime, main, recs, logs, settle, results,
    value: (name: string) => recs.get(name)?.value,
    evals: (name: string) => recs.get(name)?.evals ?? 0,
    status: (name: string) => recs.get(name)?.status,
    dispose: () => rt.dispose(),
    async bench(name: string, n: number) {
      const d = defs.find((x) => x.varName === name || x.varName === `${name}$ref`);
      if (!d || !d.raw) throw new Error(`no cell ${name}`);
      const args = d.inputs.map((i) =>
        i === "invalidation" ? new Promise(() => {}) : hidden.has(i) ? hidden.get(i) : recs.get(i)?.value);
      const times: number[] = [];
      for (let k = 0; k < n; k++) {
        const t0 = performance.now();
        let r = d.raw(...args);
        if (generatorish(r)) r = (r as Generator).next().value;
        await r;
        times.push(performance.now() - t0);
      }
      times.sort((a, b) => a - b);
      return times[Math.floor(times.length / 2)];
    },
  };
}

export async function runPort(dir: string, order: "forward" | "reverse", settleMs = 5000): Promise<RunResult> {
  const h = await loadPort(dir, { order });
  const settled = await h.settle(settleMs);
  const cells = h.results();
  h.dispose();
  const tests = { pass: 0, fail: 0, blocked: 0 };
  for (const c of cells) if (c.test) tests[c.test]++;
  return { port: resolve(dir), order, settled, cells, tests, logs: h.logs };
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  const opt = (k: string) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
  const dir = args.find((a, i) => !a.startsWith("--") && !["--order", "--bench", "--n", "--settle-ms"].includes(args[i - 1]));
  if (!dir) { console.error("usage: bun run.ts ports/<name> [--order forward|reverse] [--json] [--bench <cell> --n <k>]"); process.exit(2); }
  const order = (opt("--order") ?? "forward") as "forward" | "reverse";
  const settleMs = Number(opt("--settle-ms") ?? 5000);
  const bench = opt("--bench");
  if (bench) {
    const h = await loadPort(dir, { order });
    await h.settle(settleMs);
    const n = Number(opt("--n") ?? 100);
    const ms = await h.bench(bench, n);
    console.log(`${bench}: median ${ms.toFixed(4)} ms over ${n} runs`);
    h.dispose();
    process.exit(0);
  }
  const r = await runPort(dir, order, settleMs);
  if (args.includes("--json")) console.log(JSON.stringify(r, null, 2));
  else {
    for (const c of r.cells) {
      const v = c.status === "fulfilled" ? JSON.stringify(c.value) : c.error ?? "";
      console.log(`${c.status.padEnd(10)} ${c.test ? `[${c.test}] ` : ""}${c.file}:${c.name}  ${String(v).slice(0, 100)}`);
    }
    console.log(`order ${order}: tests pass ${r.tests.pass}, fail ${r.tests.fail}, blocked ${r.tests.blocked}; settled ${r.settled}`);
  }
  const bad = r.cells.some((c) => c.status === "rejected" || c.status === "pending" || c.test === "fail");
  process.exit(bad ? 1 : 0);
}

// Cells whose test result or (non-shell) value differs between two runs.
export function compareOrders(a: RunResult, b: RunResult): string[] {
  const diffs: string[] = [];
  const bm = new Map(b.cells.map((c) => [c.name, c]));
  for (const x of a.cells) {
    const y = bm.get(x.name);
    if (!y) { diffs.push(`${x.name}: missing`); continue; }
    if (x.test !== y.test) diffs.push(`${x.name}: test ${x.test} vs ${y.test}`);
    if (x.file === "shell.ts") continue;
    if (x.status !== y.status) diffs.push(`${x.name}: status ${x.status} vs ${y.status}`);
    else if (JSON.stringify(x.value) !== JSON.stringify(y.value)) diffs.push(`${x.name}: value differs`);
  }
  return diffs;
}
