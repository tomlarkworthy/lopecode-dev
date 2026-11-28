// bun test ./infer/attack/incr.test.ts (from lite): the per-cell memo of a check (lite/infer/md-incr.ss.ts) against a
// fresh whole check, over sequences of edits. The memo's entries carry from step to step, as they do in the page;
// after every step the memo's run must equal a whole check with no memo: result (status, messages, value types, module
// errors), facts, the Checker spans, the compile context and the cell states. Sequences: the named edits on the
// checker and runtime modules (incr-modules.json, the page's cells on 2026-11-28), the audit programs of
// soundscript/.scratch/incr1 (each before -> after -> before), and seeded random edits on the runtime module, the
// checker module and corpus modules. Every fifth step uses the entries of two steps back (a stale store). After every
// step parseParts of the cells must equal parseTree of their joined text (D3). Controls: the declaration digest, the
// interface of a named cell, or the Events part left out of the key; each must hide a change.
// INCR_ONLY=named|programs|random|controls runs one part; INCR_CHECKER=0 leaves out the checker module (7 s a check).
import { test, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { runCheck, type CheckRun } from "../../core.ts";
import { mdCheckSources, linkMd, MD_CELLS } from "../../infer-ss.ts";
import * as acorn from "acorn";
import { parse } from "../../parse.ts";
import { parseTree, parseParts } from "../../acorn/index.ts";
import { contextFromCheck, cellStates, splitCells } from "../../toolchain/ss-toolchain.ts";
import { jobs } from "../../../selfhost/late-code/corpus.ts";
import type { MdEntry } from "../md-types.ss.ts";

type Settings = { tsx: boolean; outside: { name: string; view?: boolean }[]; foreign?: string | null; shell?: string | null };
type Mod = { cells: string[]; set: Settings };
type Entry = typeof mdCheckSources;
const ONLY = process.env.INCR_ONLY ?? null, CHECKER = process.env.INCR_CHECKER !== "0";
// INCR_ROUNDTRIP=1: each step's entries go through JSON (Maps and Sets tagged) before the next step reads them, as a
// store saved into the built notebook would (incr2 persistence study)
const ROUNDTRIP = process.env.INCR_ROUNDTRIP === "1";
const enc = (_k: string, v: unknown) => (v instanceof Map ? { $map: [...v] } : v instanceof Set ? { $set: [...v] } : v);
const dec = (_k: string, v: any) => (v && typeof v === "object" && !Array.isArray(v) ? ("$map" in v ? new Map(v.$map) : "$set" in v ? new Set(v.$set) : v) : v);
const FIX = JSON.parse(readFileSync(join(import.meta.dir, "incr-modules.json"), "utf8"));
const modOf = (k: string): Mod => ({ cells: FIX[k].cells, set: { tsx: true, outside: FIX[k].outside } });
const srcOf = (m: Mod) => ({ cells: m.cells.join("\n\n"), tsx: m.set.tsx, outside: m.set.outside, foreign: m.set.foreign ?? null, shell: m.set.shell ?? null });

// a seeded generator (mulberry32)
let seed = 20261128;
const rnd = () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const pick = <T,>(xs: T[]): T => xs[Math.floor(rnd() * xs.length)]!;

// ---- the AST of one cell's text
const tree = (text: string, tsx: boolean): any => { try { return parse(text, { jsx: tsx }); } catch { return null; } };
const stmtOf = (p: any): any => { for (const st0 of p?.program.body ?? []) return st0.type === "ExportNamedDeclaration" && st0.declaration ? st0.declaration : st0; return null; };
const declOf = (text: string, tsx: boolean): string | null => {
  const st = stmtOf(tree(text, tsx));
  if (st?.type === "VariableDeclaration") return st.declarations[0]?.id?.name ?? null;
  if (st?.type === "FunctionDeclaration") return st.id?.name ?? null;
  if (st?.type === "TSTypeAliasDeclaration" || st?.type === "TSInterfaceDeclaration") return `type ${st.id.name}`;
  return null;
};
const idOf = (text: string, tsx: boolean): any => { const st = stmtOf(tree(text, tsx)); return st?.type === "VariableDeclaration" ? st.declarations[0]?.id : st?.id ?? null; };
const cellFn = (text: string, tsx: boolean): any => { const st = stmtOf(tree(text, tsx)); return st?.type === "VariableDeclaration" ? st.declarations[0]?.init ?? null : st?.type === "FunctionDeclaration" ? st : null; };
const nodes = (text: string, tsx: boolean): any[] => {
  const out: any[] = [];
  const walk = (n: any) => { if (!n || typeof n !== "object") return; if (Array.isArray(n)) { n.forEach(walk); return; } if (typeof n.type === "string") out.push(n); for (const k in n) if (k !== "loc") walk(n[k]); };
  walk(tree(text, tsx)?.program);
  return out;
};
const refsOf = (text: string, tsx: boolean): Set<string> => new Set(nodes(text, tsx).filter((n) => (n.type === "Identifier" || n.type === "JSXIdentifier") && typeof n.name === "string").map((n) => n.name));
const splice = (t: string, s: number, e: number, w: string) => t.slice(0, s) + w + t.slice(e);
const withCell = (m: Mod, i: number, t: string | null): Mod => { const cells = [...m.cells]; if (t === null) cells.splice(i, 1); else cells[i] = t; return { ...m, cells }; };
const findCell = (m: Mod, name: string) => m.cells.findIndex((t) => declOf(t, m.set.tsx) === name);

// ---- one cell's edits; null when it does not apply. Kinds: body, type, kind, rename, reject (the cell's body a free name)
const ONE: [string, (t: string, x: boolean) => string | null][] = [
  ["body:num-to-str", (t, x) => { const ls = nodes(t, x).filter((n) => n.type === "Literal" && typeof n.value === "number"); if (!ls.length) return null; const l = pick(ls); return splice(t, l.start, l.end, JSON.stringify(String(l.value))); }],
  ["body:str-edit", (t, x) => { const ls = nodes(t, x).filter((n) => n.type === "Literal" && typeof n.value === "string"); if (!ls.length) return null; const l = pick(ls); return splice(t, l.start, l.end, JSON.stringify(l.value + "z")); }],
  ["body:drop-stmt", (t, x) => { const bs = nodes(t, x).filter((n) => n.type === "BlockStatement" && n.body.length > 1); if (!bs.length) return null; const b = pick(bs); const s = pick(b.body.slice(0, -1)) as any; return splice(t, s.start, s.end, ""); }],
  ["body:add-prop", (t, x) => { const os = nodes(t, x).filter((n) => n.type === "ObjectExpression"); if (!os.length) return null; const o = pick(os); return splice(t, o.start + 1, o.start + 1, o.properties.length ? " zz: 1," : " zz: 1 "); }],
  ["body:wrap-array", (t, x) => { const f = cellFn(t, x); const b = f?.body; return b && b.type !== "BlockStatement" ? splice(t, b.start, b.end, `[${t.slice(b.start, b.end)}]`) : null; }],
  ["type:return-type", (t, x) => { const f = cellFn(t, x); const r = f?.returnType?.typeAnnotation ?? f?.body?.returnType?.typeAnnotation; return r ? splice(t, r.start, r.end, `${t.slice(r.start, r.end)} | null`) : null; }],
  ["type:keyword-swap", (t, x) => { const ks = nodes(t, x).filter((n) => n.type === "TSNumberKeyword" || n.type === "TSStringKeyword" || n.type === "TSBooleanKeyword"); if (!ks.length) return null; const k = pick(ks); return splice(t, k.start, k.end, k.type === "TSNumberKeyword" ? "string" : "number"); }],
  ["type:drop-param", (t, x) => { const f = cellFn(t, x); const ps = f?.params ?? []; if (!ps.length) return null; const q = ps[ps.length - 1]; const s = ps.length > 1 ? ps[ps.length - 2].end : q.start; return splice(t, s, q.end, ""); }],
  ["type:decl-field", (t, x) => { const st = stmtOf(tree(t, x)); if (st?.type !== "TSTypeAliasDeclaration" && st?.type !== "TSInterfaceDeclaration") return null; const lit = nodes(t, x).find((n) => n.type === "TSTypeLiteral" || n.type === "TSInterfaceBody"); return lit ? splice(t, lit.start + 1, lit.start + 1, " readonly zzExtra?: number;") : splice(t, st.end, st.end, ""); }],
  ["kind:make-async", (t, x) => { const f = cellFn(t, x); return f && /Function|Arrow/.test(f.type) && !f.async && !f.generator ? splice(t, f.start, f.start, "async ") : null; }],
  ["kind:make-state", (t, x) => { const f = cellFn(t, x); return f && f.type === "ArrowFunctionExpression" && !f.async && f.params.length === 0 && f.body.type !== "BlockStatement" ? splice(t, f.body.start, f.body.end, `state(${t.slice(f.body.start, f.body.end)})`) : null; }],
  ["kind:make-generator", (t, x) => { const f = cellFn(t, x); return f && f.type === "ArrowFunctionExpression" && !f.async && f.params.length === 0 && f.body.type !== "BlockStatement" ? splice(t, f.start, f.end, `function* () { yield ${t.slice(f.body.start, f.body.end)}; }`) : null; }],
  ["rename", (t, x) => { const id = idOf(t, x); return id?.type === "Identifier" ? splice(t, id.start, id.end, `${id.name}Zr`) : null; }],
  ["reject", (t, x) => { const f = cellFn(t, x); const b = f?.body; return b ? splice(t, b.start, b.end, b.type === "BlockStatement" ? "{ return zzFree; }" : "zzFree") : null; }],
];
// one edit of a module, the cell edits weighted to cells with readers: a cell edit, add, delete, reorder, an outside
// name added or removed, or (repair) the cell a "reject" edit changed put back
type Step = { m: Mod; label: string; repair?: { i: number; text: string } };
const mutate = (m: Mod, repair: Step["repair"] | null): Step | null => {
  const x = m.set.tsx;
  if (repair && rnd() < 0.5 && repair.i < m.cells.length) return { m: withCell(m, repair.i, repair.text), label: `repair #${repair.i}` };
  const r = rnd();
  if (r < 0.06) { const i = Math.floor(rnd() * (m.cells.length + 1)); const cells = [...m.cells]; cells.splice(i, 0, `const zzAdded${i} = () => ${m.cells.length};`); return { m: { ...m, cells }, label: `add at ${i}` }; }
  if (r < 0.10 && m.cells.length > 2) { const i = Math.floor(rnd() * m.cells.length); return { m: withCell(m, i, null), label: `delete ${declOf(m.cells[i]!, x)}` }; }
  if (r < 0.14 && m.cells.length > 2) { const i = Math.floor(rnd() * (m.cells.length - 1)); const cells = [...m.cells]; [cells[i], cells[i + 1]] = [cells[i + 1]!, cells[i]!]; return { m: { ...m, cells }, label: `reorder ${i}` }; }
  if (r < 0.17) { const names = [...new Set(m.cells.flatMap((t) => [...refsOf(t, x)]))].filter((n) => !m.set.outside.some((o) => o.name === n)); if (names.length) { const n = pick(names); return { m: { ...m, set: { ...m.set, outside: [...m.set.outside, { name: n, view: rnd() < 0.5 }] } }, label: `outside + ${n}` }; } }
  if (r < 0.20 && m.set.outside.length) { const o = pick(m.set.outside); return { m: { ...m, set: { ...m.set, outside: m.set.outside.filter((y) => y !== o) } }, label: `outside - ${o.name}` }; }
  const decls = m.cells.map((t) => declOf(t, x));
  const refs = m.cells.map((t) => refsOf(t, x));
  const read = decls.map((d, i) => d !== null && refs.some((rs, j) => j !== i && rs.has(d.replace(/^type /, ""))));
  for (let tries = 0; tries < 40; tries++) {
    const pool = rnd() < 0.7 && read.some((y) => y) ? decls.map((_, i) => i).filter((i) => read[i]) : decls.map((_, i) => i);
    const i = pick(pool), [name, op] = pick(ONE);
    let t: string | null = null;
    try { t = op(m.cells[i]!, x); } catch { t = null; }
    if (t === null || t === m.cells[i] || tree(t, x) === null) continue;
    return { m: withCell(m, i, t), label: `${name} ${decls[i] ?? `#${i}`}`, ...(name === "reject" ? { repair: { i, text: m.cells[i]! } } : {}) };
  }
  return null;
};

// ---- the comparison
const plain = (_k: string, v: unknown) => (v instanceof Map ? { map: [...v] } : v instanceof Set ? { set: [...v] } : v);
const shape = (run: CheckRun, m: Mod): string => {
  const src = srcOf(m);
  let ctx: unknown, states: unknown;
  try { ctx = contextFromCheck(run.result, src.cells, src.tsx); } catch (e) { ctx = `threw ${(e as Error).message}`; }
  try { states = [...cellStates(run.result)]; } catch (e) { states = `threw ${(e as Error).message}`; }
  return JSON.stringify({ result: { ...run.result, ms: 0 }, facts: [...((run.result as any).facts ?? new Map())], spans: run.spans, gap: run.gap, rgGap: run.rgGap, ctx, states }, plain);
};
const attempt = (entry: Entry, m: Mod, memo: Map<string, MdEntry> | null): { run: CheckRun | null; err: string | null } => {
  try { return { run: runCheck(entry, srcOf(m), memo === null ? {} : { memo: (n) => memo.get(n) ?? null, parts: m.cells }), err: null }; } catch (e) { return { run: null, err: (e as Error).message }; }
};
const firstDiff = (x: string, y: string) => { let i = 0; while (i < x.length && x[i] === y[i]) i++; return `${x.slice(Math.max(0, i - 160), i + 200)}\n   vs ${y.slice(Math.max(0, i - 160), i + 200)}`; };
// a sequence of modules checked in turn with the entries carried over; returns the steps whose memo run differs
// kinds: steps by target (checker, runtime, corpus) and edit kind; empty: memo runs that gave no entries, which are
// gap reruns (a whole check) or modules with no cell to keep
type Tally = { steps: number; differ: string[]; reused: number; checked: number; kinds: Map<string, number>; empty: number };
const tally = (): Tally => ({ steps: 0, differ: [], reused: 0, checked: 0, kinds: new Map(), empty: 0 });
const replay = (label: string, ms: { m: Mod; label: string }[], entry: Entry = mdCheckSources, T: Tally = tally()): Tally => {
  const stores: Map<string, MdEntry>[] = [new Map()];
  ms.forEach((s, k) => {
    const store = k % 5 === 4 && stores.length > 2 ? stores.at(-3)! : stores.at(-1)!;
    const fresh = attempt(mdCheckSources, s.m, null), mine = attempt(entry, s.m, store);
    T.steps++;
    const a = fresh.run ? shape(fresh.run, s.m) : `threw ${fresh.err}`, b = mine.run ? shape(mine.run, s.m) : `threw ${mine.err}`;
    if (a !== b) T.differ.push(`${label} step ${k} (${s.label})${store !== stores.at(-1) ? " [stale store]" : ""}:\n   ${firstDiff(a, b)}`);
    const whole = JSON.stringify(parseTree(s.m.cells.join("\n\n"), s.m.set.tsx)), joined = JSON.stringify(parseParts(s.m.cells, s.m.set.tsx));
    if (whole !== joined) T.differ.push(`${label} step ${k} (${s.label}): parseParts differs from parseTree:\n   ${firstDiff(whole, joined)}`);
    const got = mine.run?.entries ?? new Map();
    const kind = `${label === "checker" || label === "runtime" ? label : "corpus"}:${s.label.split(/[ #]/)[0]}`;
    T.kinds.set(kind, (T.kinds.get(kind) ?? 0) + 1);
    if (mine.run && got.size === 0 && (fresh.run?.result.cells.length ?? 0) > 0) T.empty++;
    for (const [n, e] of got) { if (store.get(n) === e) T.reused++; else T.checked++; }
    stores.push(ROUNDTRIP ? new Map(JSON.parse(JSON.stringify([...got], enc), dec)) : new Map(got));
  });
  return T;
};
const P = (cells: string[], outside: { name: string; view?: boolean }[] = []): Mod => ({ cells, set: { tsx: true, outside } });
const tsxOf = true;
// ---- the audit programs of incr1 (proof.ts): [label, before, after]
const programs: [string, Mod, Mod][] = [
  ["S7.1 another cell takes t as Events", P(["const ticks = function* () {\n  yield 1;\n};", "const reader = (ticks: number) => ticks;"]), P(["const ticks = function* () {\n  yield 1;\n};", "const reader = (ticks: number) => ticks;", "const tick = () => action((n: number) => {});", "const on1 = (ticks: Events<number>, tick: Action<[number]>) => on(ticks, tick);"])],
  ["S11.7 a second State of another type, after", P(["const f = (level: State<number>) => 1;"], [{ name: "level", view: true }]), P(["const f = (level: State<number>) => 1;", "const g = (level: State<string>) => 1;"], [{ name: "level", view: true }])],
  ["S11.7 a second State of another type, before", P(["const f = (level: State<number>) => 1;"], [{ name: "level", view: true }]), P(["const g = (level: State<string>) => 1;", "const f = (level: State<number>) => 1;"], [{ name: "level", view: true }])],
  ["S11.7 the first taker's annotation edited", P(["const f = (level: State<number>) => 1;", "const g = (level: State<number>) => 2;"], [{ name: "level", view: true }]), P(["const f = (level: State<string>) => 1;", "const g = (level: State<number>) => 2;"], [{ name: "level", view: true }])],
  ["inject-unknown: the named cell added", P(["const f = (zz: number) => zz;"]), P(["const f = (zz: number) => zz;", "const zz = () => 1;"])],
  ["free-name: the read name becomes a cell", P(["const a = () => foo;"]), P(["const a = () => foo;", "const foo = () => 1;"])],
  ["prelude-shadow: a cell named state", P(["const a = () => state(0);"]), P(["const a = () => state(0);", "const state = () => 1;"])],
  ["a cell shadows a global (JSON)", P(["const a = () => JSON.stringify(1);"]), P(["const a = () => JSON.stringify(1);", "const JSON = () => 1;"])],
  ["a cell shadows a foreign value", { cells: ["const a = (lib: number) => lib;"], set: { tsx: true, outside: [], foreign: "/** pure */ declare const lib: number;" } }, { cells: ["const a = (lib: number) => lib;", "const lib = () => 2;"], set: { tsx: true, outside: [], foreign: "/** pure */ declare const lib: number;" } }],
  ["S11.10 outside cell added", P(["const a = (x: number) => x;", "const b = () => 1;"]), P(["const a = (x: number) => x;", "const b = () => 1;"], [{ name: "x" }])],
  ["S11.10 outside cell deleted", P(["const a = (x: number) => x;", "const b = () => 1;"], [{ name: "x" }]), P(["const a = (x: number) => x;", "const b = () => 1;"])],
  ["S11.10 outside cell renamed", P(["const a = (x: number) => x;", "const b = (y: number) => y;"], [{ name: "x" }]), P(["const a = (x: number) => x;", "const b = (y: number) => y;"], [{ name: "y" }])],
  ["SS cell renamed (readers absent)", P(["const a = () => 1;", "const b = (a: number) => a;", "const c = () => 2;"]), P(["const a2 = () => 1;", "const b = (a: number) => a;", "const c = () => 2;"])],
  ["SS cell deleted", P(["const a = () => 1;", "const b = (a: number) => a;", "const c = () => 2;"]), P(["const b = (a: number) => a;", "const c = () => 2;"])],
  ["duplicate-cell: a cell inserted above both", P(["const a = () => 1;", "const a = () => 2;"]), P(["const z = () => 0;", "const a = () => 1;", "const a = () => 2;"])],
  ["duplicate-cell: the first edited", P(["const a = () => 1;", "const a = () => 2;"]), P(["const a = () =>\n  1;", "const a = () => 2;"])],
  ["S11.9 action-capture through a cell", P(["const n = () => state(0);", "const mid = (level: number) => level;", "const copy = (n: State<number>, mid: number) => action(() => n.set(mid));"], [{ name: "level", view: true }]), P(["const n = () => state(0);", "const mid = (level: number) => 3;", "const copy = (n: State<number>, mid: number) => action(() => n.set(mid));"], [{ name: "level", view: true }])],
  ["S11.9 a function from another language, kept", P(["const g = (fx: () => number) => fx;", "const h = (g: () => number) => [g];"], [{ name: "fx" }]), P(["const g = (fx: () => number) => () => 1;", "const h = (g: () => number) => [g];"], [{ name: "fx" }])],
  ["Mut input", P(["const a = () => [1];", "const b = (a: number[]) => a.length;"]), P(["const a = () => mut([1]);", "const b = (a: number[]) => a.length;"])],
  ["exactness: a field added", P(["const a = () => ({ x: 1 });", "const b = (a: { readonly x: number }) => a.x;"]), P(["const a = () => ({ x: 1, y: 2 });", "const b = (a: { readonly x: number }) => a.x;"])],
  ["literal vs widened", P(["const a = () => 1;", "const b = (a) => a;"]), P(["const a = (): 1 => 1;", "const b = (a) => a;"])],
  ["alias name in a message", P(["type P = { readonly x: number };", "const a = (): P => ({ x: 1 });", "const b = (a: string) => a;"]), P(["type P = { readonly x: number };", "const a = (): { readonly x: number } => ({ x: 1 });", "const b = (a: string) => a;"])],
  ["a type reached only through a dependency", P(["type P = { readonly x: number };", "const a = (): P => ({ x: 1 });", "const b = (a) => a.x;"]), P(["type P = { readonly x: string };", "const a = (): P => ({ x: \"1\" });", "const b = (a) => a.x;"])],
  ["a type reached only through a dependency, a unchanged", P(["type P = { readonly x: number };", "const a = (): P => ({ x: 1 });", "const b = (a) => a.x + 1;"]), P(["type P = { readonly x: number; readonly y?: number };", "const a = (): P => ({ x: 1 });", "const b = (a) => a.x + 1;"])],
  ["blocked: input becomes rejected", P(["const a = () => 1;", "const b = (a: number) => a;"]), P(["const a = () => zz1;", "const b = (a: number) => a;"])],
  ["blocked: the rejected input's message changes", P(["const a = () => zz1;", "const b = (a: number) => a;"]), P(["const a = () => zz2;", "const b = (a: number) => a;"])],
  ["type-cycle: one side edited", P(["type A = B | number;", "type B = A;", "const a = (x: A) => 1;"]), P(["type A = B | string;", "type B = A;", "const a = (x: A) => 1;"])],
  ["type cycle through a record, the other side named", P(["type A = { readonly b: B | null };", "type B = { readonly a: A | null };", "const f = (): B => ({ a: null });"]), P(["type A = { readonly b: B | null; readonly n?: number };", "type B = { readonly a: A | null };", "const f = (): B => ({ a: null });"])],
  ["dependency cycle made", P(["const a = (b: number) => 1;", "const b = () => 1;"]), P(["const a = (b: number) => 1;", "const b = (a: number) => 1;"])],
  ["kind: made async", P(["const a = () => 1;", "const b = (a: number) => a + 1;"]), P(["const a = async () => 1;", "const b = (a: number) => a + 1;"])],
  ["kind: made a state cell", P(["const a = () => 1;", "const b = (a: number) => a + 1;"]), P(["const a = () => state(1);", "const b = (a: number) => a + 1;"])],
  ["kind: made a generator", P(["const a = () => 1;", "const b = (a: number) => a + 1;"]), P(["const a = function* () {\n  yield 1;\n};", "const b = (a: number) => a + 1;"])],
  ["kind: a state reader of a cell made a state cell", P(["const a = () => 1;", "const b = (a: State<number>) => 1;"]), P(["const a = () => state(1);", "const b = (a: State<number>) => 1;"])],
  ["listener: a cell becomes a listener", P(["const ticks = function* () {\n  yield 1;\n};", "const tick = () => action((n: number) => {});", "const l = (ticks: Events<number>, tick: Action<[number]>) => 1;", "const r = (l: number) => l;"]), P(["const ticks = function* () {\n  yield 1;\n};", "const tick = () => action((n: number) => {});", "const l = (ticks: Events<number>, tick: Action<[number]>) => on(ticks, tick);", "const r = (l: number) => l;"])],
  ["compile: an island cell named only by string, made async", P(["const x = () => [1];", "const y = (x: number[]) => x;", "const go = (compile: Compile) => compile({ inputs: [\"x\"], refs: [], outputs: [\"y\"] });"]), P(["const x = () => [1];", "const y = async (x: number[]) => x;", "const go = (compile: Compile) => compile({ inputs: [\"x\"], refs: [], outputs: [\"y\"] });"])],
  ["compile: an island cell's value type changes", P(["const x = () => [1];", "const y = (x: number[]) => x;", "const go = (compile: Compile) => compile({ inputs: [\"x\"], refs: [], outputs: [\"y\"] });", "const use = (go) => go;"]), P(["const x = () => [1];", "const y = (x: number[]) => x.length;", "const go = (compile: Compile) => compile({ inputs: [\"x\"], refs: [], outputs: [\"y\"] });", "const use = (go) => go;"])],
  ["compile: an island cell's params change (not its type)", P(["const x = () => [1];", "const z = () => 2;", "const y = (x: number[]) => x;", "const go = (compile: Compile) => compile({ inputs: [\"x\"], refs: [], outputs: [\"y\"] });"]), P(["const x = () => [1];", "const z = () => 2;", "const y = (x: number[], z: number) => x;", "const go = (compile: Compile) => compile({ inputs: [\"x\"], refs: [], outputs: [\"y\"] });"])],
  ["compile: an island cell takes an async cell it did not take", P(["const x = () => [1];", "const z = async () => 2;", "const y = (x: number[]) => x;", "const go = (compile: Compile) => compile({ inputs: [\"x\"], refs: [], outputs: [\"y\"] });"]), P(["const x = () => [1];", "const z = async () => 2;", "const y = (x: number[], z: number) => x;", "const go = (compile: Compile) => compile({ inputs: [\"x\"], refs: [], outputs: [\"y\"] });"])],
  ["a type reached through two dependencies", P(["type P = { readonly x: number };", "const a = (): P => ({ x: 1 });", "const m = (a) => a;", "const b = (m) => m.x;"]), P(["type P = { readonly x: string };", "const a = (): P => ({ x: \"1\" });", "const m = (a) => a;", "const b = (m) => m.x;"])],
  ["an alias reached through an alias", P(["type Q = { readonly x: number };", "type P = Q;", "const a = (): P => ({ x: 1 });", "const b = (a) => a.x;"]), P(["type Q = { readonly x: string };", "type P = Q;", "const a = (): P => ({ x: \"1\" });", "const b = (a) => a.x;"])],
  ["S7.1 the Events taker deleted", P(["const ticks = function* () {\n  yield 1;\n};", "const reader = (ticks: number) => ticks;", "const tick = () => action((n: number) => {});", "const on1 = (ticks: Events<number>, tick: Action<[number]>) => on(ticks, tick);"]), P(["const ticks = function* () {\n  yield 1;\n};", "const reader = (ticks: number) => ticks;", "const tick = () => action((n: number) => {});"])],
  ["signature flags: a declared function against a lambda of one type", P(["const a = () => Math.max;", "const b = (a: (...v: number[]) => number) => a(1, 2);"]), P(["const a = () => (...v: number[]): number => 0;", "const b = (a: (...v: number[]) => number) => a(1, 2);"])],
  ["signature flags: an untyped reader", P(["const a = () => Math.max;", "const b = (a) => a(1, 2);"]), P(["const a = () => (...v: number[]): number => 0;", "const b = (a) => a(1, 2);"])],
  ["parameter names: a function value's parameter renamed", P(["const a = () => (x: number): number => x;", "const b = (a) => a(\"s\");"]), P(["const a = () => (y: number): number => y;", "const b = (a) => a(\"s\");"])],
  ["S11.7 order moved by an inserted reader", P(["const f = (level: State<number>) => 1;", "const g = (level: State<string>) => 2;"], [{ name: "level", view: true }]), P(["const h = (g: number) => g;", "const f = (level: State<number>) => 1;", "const g = (level: State<string>) => 2;"], [{ name: "level", view: true }])],
  ["three-cell cycle: a reader of b inserted above", P(["const a = (c: number) => 1;", "const b = (a: number) => 1;", "const c = (b: number) => 1;"]), P(["const r = (b: number) => b;", "const a = (c: number) => 1;", "const b = (a: number) => 1;", "const c = (b: number) => 1;"])],
  ["declaration report: a cell above expands the bad type first", P(["type P = { readonly x: Undeclared };", "const a = (v: P) => 1;"], [{ name: "v" }]), P(["const z = (w: P) => 2;", "type P = { readonly x: Undeclared };", "const a = (v: P) => 1;"], [{ name: "v" }, { name: "w" }])],
  ["unannotated cell with readers made rejected", P(["const a = () => [1];", "const b = (a: number[]) => a.length;", "const c = (a: number[]) => a[0];"]), P(["const a = () => zzFree;", "const b = (a: number[]) => a.length;", "const c = (a: number[]) => a[0];"])],
  ["declaration report as the only error: an earlier expander inserted", P(["type P = { readonly x: Undeclared };", "const a = (): P | null => null;"]), P(["const z = (): P | null => null;", "type P = { readonly x: Undeclared };", "const a = (): P | null => null;"])],
    ["gap probe: a conditional type in one cell", P(["const a = (v: number) => 1;", "const b = () => 2;"], [{ name: "v" }]), P(["const a = (v: number extends string ? 1 : 2) => 1;", "const b = () => 2;"], [{ name: "v" }])],
  ["gap probe: a mapped type in one cell", P(["const a = () => 1;", "const b = () => 2;"]), P(["const a = (): { [K in \"x\"]: number } => ({ x: 1 });", "const b = () => 2;"])],
  ["gap probe: a template literal type", P(["const a = () => 1;", "const b = () => 2;"]), P(["const a = (): `a${string}` => \"ab\";", "const b = () => 2;"])],
  ["reorder: two independent cells swapped", P(["const a = () => 1;", "const b = () => [2];", "const c = (a: number, b: number[]) => a;"]), P(["const b = () => [2];", "const a = () => 1;", "const c = (a: number, b: number[]) => a;"])],
  ["calibration: a cell inserted at the top", P(["const a = () => ({ x: 1 });", "const b = (a: { readonly x: number }) => { const t = a.x; return [t, \"s\"].length; };", "const c = (b: string) => b;"]), P(["const zz = () => 0;", "const a = () => ({ x: 1 });", "const b = (a: { readonly x: number }) => { const t = a.x; return [t, \"s\"].length; };", "const c = (b: string) => b;"])],
];

// ---- the named edits of incr1 (proof.ts named, named2), each from the module as it is: base -> edit -> base -> ...
const namedEdits = (ck: Mod, rt: Mod): [string, Mod][] => {
  const ed: [string, Mod][] = [];
  const at = (m: Mod, name: string) => { const i = findCell(m, name); if (i < 0) throw new Error(`no cell ${name}`); return i; };
  const readersOf = (m: Mod, name: string) => m.cells.filter((t) => declOf(t, true) !== name && refsOf(t, true).has(name)).length;
  if (CHECKER) {
    { const i = at(ck, "checkKey"), t = ck.cells[i]!; const l = nodes(t, true).find((n) => n.type === "Literal" && n.value === "x"); ed.push(["checker body edit (checkKey)", withCell(ck, i, splice(t, l.start, l.end, '"x1"'))]); }
    { const i = at(ck, "NUM"), t = ck.cells[i]!; const f = cellFn(t, true); const r = (f.returnType ?? f.body.returnType).typeAnnotation; ed.push(["checker type edit (NUM: (): Ty | null)", withCell(ck, i, splice(t, r.start, r.end, "Ty | null"))]); }
    { const i = at(ck, "type IxK"), t = ck.cells[i]!; const lit = nodes(t, true).find((n) => n.type === "TSTypeLiteral"); ed.push(["checker type IxK: a field added", withCell(ck, i, splice(t, lit.start + 1, lit.start + 1, "\n  readonly extra1?: number;"))]); }
    { const i = at(ck, "NUM"), t = ck.cells[i]!; const f = cellFn(t, true); ed.push(["checker kind: NUM made async", withCell(ck, i, splice(t, f.start, f.start, "async "))]); }
    { const i = at(ck, "NUM"), t = ck.cells[i]!; const id = idOf(t, true); ed.push(["checker rename NUM -> NUMZ", withCell(ck, i, splice(t, id.start, id.end, "NUMZ"))]); }
    { const cells = [...ck.cells]; cells.splice(600, 0, "export const extraCell = () => 1;"); ed.push(["checker add a cell at index 600", { ...ck, cells }]); }
    { const cand = ck.cells.map((t, i) => [i, declOf(t, true)] as const).filter(([, d]) => d && !d.startsWith("type ") && readersOf(ck, d) >= 2 && readersOf(ck, d) <= 4); const [i, d] = cand[Math.floor(cand.length / 2)]!; ed.push([`checker delete ${d}`, withCell(ck, i, null)]); }
    { const cells = [...ck.cells]; [cells[300], cells[301]] = [cells[301]!, cells[300]!]; ed.push(["checker reorder cells 300 and 301", { ...ck, cells }]); }
    ed.push(["checker outside name added (zzOut)", { ...ck, set: { ...ck.set, outside: [...ck.set.outside, { name: "zzOut" }] } }]);
    { const used = ck.set.outside.find((o) => ck.cells.some((t) => refsOf(t, true).has(o.name)))!; ed.push([`checker outside name removed (${used.name})`, { ...ck, set: { ...ck.set, outside: ck.set.outside.filter((o) => o.name !== used.name) } }]); }
    { const i = at(ck, "NUM"), t = ck.cells[i]!; const f = cellFn(t, true); const b = f.body.body ?? f.body; ed.push(["checker NUM made rejected (free name)", withCell(ck, i, splice(t, b.start, b.end, "zzFree"))]); }
    { const i = at(ck, "type Param"), t = ck.cells[i]!; const lit = nodes(t, true).find((n) => n.type === "TSTypeLiteral"); ed.push(["checker type in a cycle (Param): a field added", withCell(ck, i, splice(t, lit.start + 1, lit.start + 1, " readonly zzExtra?: number;"))]); }
    { const i = at(ck, "owMutDeep"), t = ck.cells[i]!, f = cellFn(t, true); ed.push(["checker owMutDeep made rejected", withCell(ck, i, splice(t, f.body.start, f.body.end, "zzFree"))]); }
  }
  { const i = at(rt, "isElem"), t = rt.cells[i]!; const l = nodes(t, true).find((n) => n.type === "Literal" && n.value === "tag"); if (l) ed.push(["runtime body edit (isElem)", withCell(rt, i, splice(t, l.start, l.end, '"tag1"'))]); }
  { const i = at(rt, "wantsValues"), t = rt.cells[i]!; const f = cellFn(t, true); const r = (f.returnType ?? f.body.returnType)?.typeAnnotation; if (r) ed.push(["runtime type edit (wantsValues: boolean | null)", withCell(rt, i, splice(t, r.start, r.end, `${t.slice(r.start, r.end)} | null`))]); }
  { const j = findCell(rt, "ptr"); if (j >= 0) { const t2 = rt.cells[j]!, f2 = cellFn(t2, true); ed.push(["runtime ptr made a state cell", withCell(rt, j, splice(t2, f2.body.start, f2.body.end, `state(${t2.slice(f2.body.start, f2.body.end)})`))]); } }
  return ed;
};

const report = (T: Tally) => `${T.steps} steps, ${T.differ.length} differ; cells from their entries ${T.reused}, checked ${T.checked}; memo runs with no entries ${T.empty}`;
const show = (T: Tally) => { for (const d of T.differ.slice(0, 5)) console.log(d); };

test.if(!ONLY || ONLY === "programs")("the audit programs: before -> after -> before, entries carried", () => {
  const T: Tally = tally();
  for (const [label, a, b] of programs) replay(label, [{ m: a, label: "before" }, { m: b, label: "after" }, { m: a, label: "before again" }, { m: b, label: "after again" }], mdCheckSources, T);
  console.log(`programs (${programs.length}): ${report(T)}`); show(T);
  expect(T.differ).toEqual([]);
}, 600000);

test.if(!ONLY || ONLY === "named")("the named edits on the checker and runtime modules: base -> edit -> base -> next edit", () => {
  const ck = modOf("checker"), rt = modOf("runtime");
  const ed = namedEdits(ck, rt);
  const T: Tally = tally();
  for (const base of [rt, ...(CHECKER ? [ck] : [])]) {
    const mine = ed.filter(([, m]) => (base === ck) === (m.cells.length > 500));
    replay(base === ck ? "checker" : "runtime", [{ m: base, label: "base" }, ...mine.flatMap(([l, m]) => [{ m, label: l }, { m: base, label: `base after ${l}` }])], mdCheckSources, T);
  }
  console.log(`named (${ed.length} edits): ${report(T)}`); show(T);
  expect(T.differ).toEqual([]);
}, 1800000);

// random sequences: each edit made to the module as the last step left it
const sequence = (m0: Mod, n: number): { m: Mod; label: string }[] => {
  const out = [{ m: m0, label: "start" }];
  let m = m0, repair: Step["repair"] | null = null;
  for (let tries = 0; out.length <= n && tries < n * 10; tries++) {
    const s = mutate(m, repair);
    if (s === null) continue;
    repair = s.repair ?? (s.label.startsWith("repair") ? null : repair);
    m = s.m;
    out.push({ m, label: s.label });
  }
  return out;
};
const corpusMods = (): { key: string; m: Mod }[] => jobs().filter((j: any) => j.src).flatMap((j: any) => {
  let cells: string[] | null = null;
  try { cells = splitCells(j.src.cells, !!j.src.tsx); } catch { cells = null; }
  return cells && cells.length >= 3 && cells.length <= 60 ? [{ key: j.key as string, m: { cells, set: { tsx: !!j.src.tsx, outside: [], foreign: j.src.foreign ?? null, shell: j.src.shell ?? null } } }] : [];
});

test.if(!ONLY || ONLY === "random")("seeded random edit sequences: corpus, runtime, checker", () => {
  seed = 20261128;
  const T: Tally = tally();
  const pool = corpusMods();
  for (let k = 0; k < 40; k++) { const j = pick(pool); replay(j.key, sequence(j.m, 6), mdCheckSources, T); }
  replay("runtime", sequence(modOf("runtime"), 40), mdCheckSources, T);
  if (CHECKER) replay("checker", sequence(modOf("checker"), 8), mdCheckSources, T);
  console.log(`random (40 corpus sequences of 6 edits from ${pool.length} modules, runtime 40, checker ${CHECKER ? 8 : 0}): ${report(T)}`); show(T);
  console.log(`  steps by target:kind: ${[...T.kinds].sort().map(([k, n]) => `${k} ${n}`).join(", ")}`);
  expect(T.differ).toEqual([]);
}, 1800000);

// a control: the same replay with a key part taken out must show a hidden change
const controlOf = (over: Record<string, unknown>) => (linkMd(over as any) as any).mdCheckSources as Entry;
// mdKeyOf with its statement on names some cell takes as Events taken out (found on the cell's AST)
const keyNoEvents = (): unknown => {
  const text = String((MD_CELLS as any).mdKeyOf);
  const found: any[] = [];
  const walk = (n: any) => { if (!n || typeof n !== "object") return; if (Array.isArray(n)) { n.forEach(walk); return; }
    if (n.type === "IfStatement" && n.test.type === "CallExpression" && n.test.callee.type === "MemberExpression" && n.test.callee.object.type === "MemberExpression" && n.test.callee.object.property.name === "takenAsEvents") found.push(n);
    for (const k in n) if (k !== "loc") walk(n[k]); };
  walk(acorn.parse(`(${text})`, { ecmaVersion: "latest" }));
  if (found.length !== 1) throw new Error(`mdKeyOf: ${found.length} Events statements`);
  const cut = `(${text})`.slice(0, found[0].start) + `(${text})`.slice(found[0].end);
  return (0, eval)(cut);
};
test.if(!ONLY || ONLY === "controls")("controls: a key without a part hides changes", () => {
  const cases: [string, Record<string, unknown>][] = [
    ["no declaration digest", { mdDigest: (mdHash: unknown) => (D: unknown, texts: unknown, memo: unknown, n: string) => null }],
    ["no interface of a named cell", { mdIface: (typeKey: unknown, mdTyNames: unknown) => (X: unknown, M: unknown, n: string, K: unknown) => "x" }],
    ["no Events part", { mdKeyOf: keyNoEvents() }],
  ];
  for (const [label, over] of cases) {
    const T: Tally = tally();
    for (const [l, a, b] of programs) replay(l, [{ m: a, label: "before" }, { m: b, label: "after" }], controlOf(over), T);
    console.log(`control ${label}: ${report(T)}`);
    expect(T.differ.length).toBeGreaterThan(0);
  }
}, 600000);
