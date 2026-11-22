// FROZEN FIXTURE (2026-11-22, switch4): lite/core.ts as it was before the rg, cp and tc cells were switched on.
// Only the differentials and tests compare against it; nothing shipped imports it, and the build does not reach it.
// Changed since: MdReg.loadUser takes the parsed tree (it reads ast.src) and cell takes the cell's start (ignored), as
// the md cells call them from phase B on.
// The lite checker without file access. checkSources runs mdCheckSources, the SoundScript cells of lite/infer (module
// shape, syntax bans, injection, the per-cell type check, the ownership rules, the captures and the value rules), on a
// record of the Registry's functions made here. Each cell ends ok, rejected, unsupported (a construct lite does not
// model) or blocked (a dependency has no usable type).
// The glue left in TypeScript: the Registry, which converts type syntax from parse.ts nodes, so the text is parsed
// again with parse.ts and each typed node is mapped to the parse.ts node of the same span and type; the reports the
// registry makes, with their lines; one view of it per cell; and the result as LiteResult.
import { parse, type Node, type Parsed } from "./parse.ts";
import { Registry } from "./registry.ts";
import { ERR, UNDEF, cloneProblemWith, type Ty } from "../../../types.ts";
import { CAPABILITIES, ALLOWED_GLOBALS, PRELUDE_FNS } from "../../../intrinsics.ts";
import { childrenOf } from "../../../acorn/index.ts";
import { mdCheckSources } from "../../../infer-ss.ts";
import type { CellInfo } from "./facts.ts";
import type { Shape } from "../../../boundary.ts";
import type { AstNode } from "../../../acorn/acorn-types.ss.ts";
import type { IxReg, IxRegCore, IxDiag, IxInput, IxKind, IxProbe, IxProbeAsk } from "../../ix-types.ss.ts";
import type { MdReg, MdResult, MdReport, MdCompiled, MdForeign } from "../../md-types.ss.ts";

export type LiteError = { rule: string; line: number; msg: string };
export type LiteCell = {
  name: string; status: "ok" | "rejected" | "unsupported" | "blocked"; line: number;
  errors: LiteError[]; unsupported: LiteError[]; blockedBy: string[]; value?: string;
};
// facts: per cell, what the compiler needs (facts.ts), from this check's parse. probe: what opts.probe asked for, with
// the registry its types belong to. Neither is enumerable, so a result prints and compares as before.
export type LiteResult = {
  port: string; file: string; ok: boolean; module: LiteError[]; cells: LiteCell[]; ms: number;
  readonly facts?: ReadonlyMap<string, CellInfo>; readonly probe?: { found: IxProbe | null; reg: Registry };
};

// outside: the module's cells in other languages (Observable JavaScript, raw), by name; view when the
// module also has `viewof <name>` (an Observable JavaScript view, or a SoundScript state cell imported with its
// viewof). A SoundScript cell takes one through an annotated parameter (boundary.ts).
export type Outside = { name: string; view?: boolean };
export type Sources = { cells: string; tsx?: boolean; foreign?: string | null; shell?: string | null; name?: string; outside?: readonly Outside[] | null };
// per parameter that names an outside cell: its value's shape, and whether it is taken as State (its viewof)
export type Boundary = { shape: Shape; ref: boolean };
// strictIndex: an index read may be undefined. onCell: called once per cell checked. probe: completion's question, a
// name whose first read (or, member, whose first read as a member) records what complete.ts offers there
export type CheckOpts = { strictIndex?: boolean; onCell?: () => void; probe?: IxProbeAsk | null };
type Entry = (R: MdReg, S: Parameters<typeof mdCheckSources>[1]) => MdResult;
export type CheckRun = { result: LiteResult; gap: string | null; spans: { at: number; ch: string[]; chUnsup: string[] }[] };

// Browser-safe: no file system. check.ts checkPort reads a port directory and calls this.
export function checkSources(src: Sources, opts: CheckOpts = {}): LiteResult {
  return runCheck(mdCheckSources, src, opts).result;
}

const spanKey = (n: { start: number; end: number; type: string }) => `${n.start}:${n.end}:${n.type}`;
// every parse.ts node of P, by span and type (type positions included)
function nodeIndex(P: Parsed): Map<string, Node> {
  const out = new Map<string, Node>();
  const walk = (n: Node) => {
    if (!out.has(spanKey(n))) out.set(spanKey(n), n);
    for (const k in n) {
      if (k === "loc") continue;
      const v = n[k];
      if (Array.isArray(v)) { for (const x of v) if (x && typeof x.type === "string") walk(x); }
      else if (v && typeof v === "object" && typeof v.type === "string") walk(v);
    }
  };
  walk(P.program);
  return out;
}
const pIndex = new WeakMap<Parsed, Map<string, Node>>();
const indexOf = (P: Parsed) => { let idx = pIndex.get(P); if (!idx) pIndex.set(P, (idx = nodeIndex(P))); return idx; };

export type RegView = IxReg & { restore: () => void; requeue: (ds: IxDiag[]) => void; toP: (n: AstNode) => Node };
// the Registry's methods the cells call, as a record
export function regCore(reg: Registry): IxRegCore {
  return {
    isAlias: (n) => reg.isAlias(n), expand: (t) => reg.expand(t), member: (t, k) => reg.member(t, k), sub: (a, b) => reg.sub(a, b),
    callSigs: (t) => reg.callSigs(t), iterElem: (t) => reg.iterElem(t), unify: (p, a, m, tvs) => reg.unify(p, a, m, tvs), isTypedArray: (t) => reg.isTypedArray(t),
    mayHideMemo: new Map(),
  };
}
// core with each method run inside around
function regAround(core: IxRegCore, around: <X>(f: () => X) => X): IxRegCore {
  return {
    ...(Object.fromEntries(Object.entries(core).flatMap(([k, f]) => typeof f === "function" ? [[k, (...a: unknown[]) => around(() => (f as (...a: unknown[]) => unknown)(...a))]] : [])) as IxRegCore),
    mayHideMemo: core.mayHideMemo,
  };
}
// whether a node holds a typeof type query, remembered by node
function typeQueries(): (n: AstNode) => boolean {
  const memo = new Map<number, boolean>();
  const has = (n: AstNode): boolean => {
    const hit = memo.get(n.nid);
    if (hit !== undefined) return hit;
    const r = n.type === "TSTypeQuery" || childrenOf(n).some((k: { node: AstNode }) => has(k.node));
    memo.set(n.nid, r);
    return r;
  };
  return has;
}
// the registry as one cell's check sees it; drain gives what onErr and onUnsup received since the last drain
export function makeReg(reg: Registry, P: Parsed): RegView {
  const index = indexOf(P);
  const toP = (n: AstNode): Node => index.get(spanKey(n)) ?? missing(n);
  const buf: IxDiag[] = [];
  const was = [reg.onErr, reg.onUnsup] as const;
  reg.onErr = (n, rule, msg) => void buf.push({ start: n.start, end: n.end, rule, msg });
  reg.onUnsup = (n, what) => void buf.push({ start: n.start, end: n.end, rule: "unsupported", msg: what });
  const core = regCore(reg);
  const lax = <X>(f: () => X): X => { const s = reg.strictIndex; reg.strictIndex = false; try { return f(); } finally { reg.strictIndex = s; } };
  const ctx = (tps: string[], look: Map<string, Ty> | null) => ({ tps: new Set(tps), typeofLookup: (name: string) => look?.get(name) });
  return {
    ...core,
    quiet: regAround(core, (f) => reg.peek(f)), lax: regAround(core, lax), strictIndex: reg.strictIndex, same: (a, b) => a === b,
    origin: (n) => reg.types.get(n)?.origin ?? null,
    convert: (n, tps, look) => reg.convert(toP(n), ctx(tps, look), P),
    sig: (params, ret, tps, look) => reg.sig(params.map(toP), toP(ret), undefined, ctx(tps, look), P, "user"),
    hasTypeQuery: typeQueries(), cloneProblem: (t) => cloneProblemWith(reg.ops)(t, 0),
    drain: () => buf.splice(0), compile: null,
    restore: () => { [reg.onErr, reg.onUnsup] = was; },
    requeue: (ds) => void buf.push(...ds), toP,
  };
}
const missing = (n: AstNode): never => { throw new Error(`no parse.ts node at ${spanKey(n)}`); };
// the globals a cell's check binds in scope 0: the prelude functions, the allowed intrinsics and undefined
export function globalsOf(reg: Registry): IxInput["globals"] {
  const out = new Map<string, { name: string; t: Ty; kind: IxKind }>();
  for (const name of PRELUDE_FNS) out.set(name, { name, t: ERR, kind: "prelude" });
  for (const name of ALLOWED_GLOBALS) {
    const v = reg.values.get(name);
    if (name === "undefined") out.set(name, { name, t: UNDEF, kind: "global" });
    else if (v && v.origin === "intrinsic") out.set(name, { name, t: v.t, kind: "global" });
  }
  for (const name of ["equals", "messageOf"]) {
    const v = reg.values.get(name), b = out.get(name);
    if (v && b) b.t = v.t;
  }
  return [...out.values()];
}

// foreign.d.ts loaded into reg: what it reported (got collects onErr and onUnsup), what it left, and its values
function loadForeign(reg: Registry, got: MdReport[], text: string): MdForeign {
  const FP = parse(text);
  got.length = 0;
  const rest = reg.load(FP, "foreign");
  const values = [...reg.values].filter(([, v]) => v.origin === "foreign").map(([name, v]) => ({ name, marker: v.marker || null, line: FP.line(v.node.start), t: v.t }));
  return { reports: got.splice(0), rest: rest.map((st) => ({ kind: st.type as string, line: FP.line(st.start) })), values };
}
// the user's declarations loaded into reg, the statements at clash (a cell's name taken again) left out
function loadUser(reg: Registry, got: MdReport[], text: string, jsx: boolean, clash: number[]): { P: Parsed; reports: MdReport[] } {
  const P = parse(text, { jsx });
  const at = new Set(clash), skip = new Set<Node>();
  for (const st of P.program.body as Node[]) { const d = st.type === "ExportNamedDeclaration" && st.declaration ? st.declaration : st; if (at.has(d.start)) skip.add(d); }
  got.length = 0;
  reg.load(P, "user", true, skip);
  return { P, reports: got.splice(0) };
}
// The Registry as the record mdCheckSources is handed. foreign.d.ts's reports and the user declarations' are kept with
// their lines; each cell gets its own view, the previous one's handlers put back. onCell: called for each cell's view.
export type MdRegGlue = MdReg & { finish: () => void; reg: Registry };
export function mdRegistry(strictIndex = true, onCell: (() => void) | null = null): MdRegGlue {
  const reg = new Registry();
  reg.strictIndex = strictIndex;
  let P: Parsed | null = null, cur: RegView | null = null;
  const got: MdReport[] = [];
  reg.onUnsup = (n, what) => void got.push({ rule: "unsupported", line: n.loc?.start.line ?? 0, msg: what });
  reg.onErr = (n, rule, msg) => void got.push({ rule, line: n.loc?.start.line ?? 0, msg });
  const parsed = (): Parsed => P ?? missingUser();
  const cell = () => {
    onCell?.();
    cur?.restore();
    const ix = (cur = makeReg(reg, parsed()));
    return { ix, withHook: (hook: (e: AstNode, options: Ty | null) => MdCompiled) => ({ ...ix, compile: (e: AstNode, options: Ty | null) => { const r = hook(e, options); ix.requeue(r.out); return r.res; } }) };
  };
  return {
    reg, builtin: reg.builtinTypeNames(), ops: reg.ops, globals: globalsOf(reg), allowed: ALLOWED_GLOBALS, capabilities: new Map(Object.entries(CAPABILITIES)),
    loadForeign: (text) => loadForeign(reg, got, text),
    loadUser: (ast, jsx, clash) => { const u = loadUser(reg, got, ast.src, jsx, clash); P = u.P; return u.reports; },
    cell,
    peekType: (n) => reg.peek(() => { const t = reg.convert(indexOf(parsed()).get(spanKey(n)) ?? missing(n), { tps: new Set() }, parsed()); return t.k === "named" && reg.isAlias(t.n) ? reg.expand(t) : t; }),
    finish: () => { cur?.restore(); cur = null; },
  };
}
const missingUser = (): never => { throw new Error("the user's declarations are not loaded"); };

// checkSources by entry (mdCheckSources, or a copy with cells replaced: lite/infer/diff.ts's controls). gap: what the
// entry met that it does not implement; spans: each cell's Checker lists with positions, for the differential
export function runCheck(entry: Entry, src: Sources, opts: CheckOpts = {}): CheckRun {
  const t0 = performance.now();
  const R = mdRegistry(opts.strictIndex ?? true, opts.onCell ?? null);
  let r: MdResult;
  try {
    r = entry(R, { cells: src.cells, tsx: !!src.tsx, foreign: src.foreign ?? null, shell: src.shell ?? null, name: src.name ?? null, outside: (src.outside ?? []).map((o) => ({ name: o.name, view: !!o.view })), probe: opts.probe ?? null });
  } finally { R.finish(); }
  const cells: LiteCell[] = r.cells.map((c) => ({ name: c.name, status: c.status, line: c.line, errors: c.errors.map((e) => ({ ...e })), unsupported: c.unsupported.map((e) => ({ ...e })), blockedBy: [...c.blockedBy], ...(c.value === null ? {} : { value: c.value }) }));
  const result: LiteResult = { port: r.port, file: r.file, ok: r.ok, module: r.module.map((e) => ({ ...e })), cells, ms: performance.now() - t0 };
  const facts = new Map<string, CellInfo>(r.facts.map((f) => [f.name, {
    name: f.name, span: [f.span[0] ?? 0, f.span[1] ?? 0], returnsRef: f.returnsRef, generator: f.generator, compiles: f.compiles.map((c) => ({ ...c })),
    params: f.params.map((p) => ({ name: p.name, refTyped: p.refTyped, eventsTyped: p.eventsTyped, ...(p.boundary ? { boundary: p.boundary } : {}) })),
  }]));
  Object.defineProperty(result, "facts", { value: facts, enumerable: false });
  if (opts.probe) Object.defineProperty(result, "probe", { value: { found: r.probe, reg: R.reg }, enumerable: false });
  const fmt = (d: IxDiag) => `${d.rule} @${d.start}-${d.end} ${d.msg}`;
  return { result, gap: r.gap, spans: r.cells.map((c) => ({ at: c.at, ch: c.ch.map(fmt), chUnsup: c.chUnsup.map(fmt) })) };
}
