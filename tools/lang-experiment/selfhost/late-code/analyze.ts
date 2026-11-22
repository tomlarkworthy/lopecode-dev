// Late-code census for one source: the live checker (lite/core.ts runCheck over a linkMd copy whose owCheckIn first
// hands its (R, F, T) to lateHook), and per cell, from the checker's own facts and ow cells:
//   Y/A: in each generator/async function g, a Mut-typed or let binding declared in g before a suspension point
//        (yield, await, for await) and used after it (position; a use inside a loop holding the point counts; a write
//        whose expression holds the point counts; a call of a helper that captures it counts as its use there)
//   K:   per kept function (owKept), the Mut-typed or let bindings it captures (owCaptures' read set, to fixpoint
//        through helpers), written through the capture or not, and written later by the encloser (owLateWrite)
//   P:   bindings a kept function captures whose type holds a promise, generator or iterator
import { runCheck, type Sources } from "../../lite/core.ts";
import { linkMd } from "../../lite/infer-ss.ts";
import * as T from "../../lite/types.ts";

let LINKED: any = null;
let SINK: ((R: any, F: any, Tr: any) => void) | null = null;
const lateHook = (R: any, F: any, Tr: any) => { if (SINK) SINK(R, F, Tr); };
// owCheckIn as ow-entry.ss.ts has it (owLateUses since rule set R, 2026-11-22), after lateHook
const owCheckInHooked = (owBindingOfFn: any, owCaptures: any, owCaptureErrs: any, owPlacement: any, owLateUses: any, owActionEscapes: any, ixOut: any, lateHook: any) => (R: any, F: any, T: any) => {
  lateHook(R, F, T);
  const O = { T, F, R };
  const W = { errs: null, seen: new Set(), unsup: null };
  const caps = owCaptures(O, W);
  const byFn = owBindingOfFn(F);
  owCaptureErrs(O, W, caps, byFn);
  owPlacement(O, W);
  owLateUses(O, W, caps, byFn);
  return { diags: ixOut(W.errs), actions: owActionEscapes(O), unsup: ixOut(W.unsup), gap: T.other };
};
LINKED = linkMd({ owCheckIn: owCheckInHooked } as any, { lateHook });
const L = LINKED;

export type Use = { line: number; write: boolean; how: string; nested: boolean; inLoop: boolean; fresh: boolean };
export type YAHit = { kind: "Y" | "A"; fkind: string; fnLine: number; fnClass: string; visible: boolean; name: string; bkind: string; mut: boolean; prim: boolean; captured: boolean; declLine: number; uses: Use[] };
export type FnRow = { kind: "gen" | "async" | "asyncgen"; line: number; fnClass: string; visible: boolean; points: number; yieldsNonPrim: boolean; yieldsUnknown: boolean };
export type KHit = { fnLine: number; name: string; bkind: string; mut: boolean; prim: boolean; write: boolean; laterWrite: boolean; laterWriteLines: number[] };
export type PHit = { fnLine: number; name: string; what: string };
export type CellRep = {
  name: string; line: number; status: string; rules: string[]; reached: boolean; keptFns: number; textHash: string;
  fns: FnRow[]; ya: YAHit[]; k: KHit[]; p: PHit[];
};

const isFn = (n: any) => n.type === "ArrowFunctionExpression" || n.type === "FunctionExpression" || n.type === "FunctionDeclaration";
const LOOPS = new Set(["ForStatement", "ForOfStatement", "ForInStatement", "WhileStatement", "DoWhileStatement"]);
const HOLDERS = new Set(["Promise", "Generator", "AsyncGenerator", "Iterator", "IterableIterator", "Iterable", "AsyncIterable", "AsyncIterator", "AsyncIterableIterator", "ReadableStream"]);

function analyzeCell(R: any, F: any, Tr: any): Omit<CellRep, "name" | "line" | "status" | "rules" | "reached"> & { at: number } {
  const O = { T: Tr, F, R };
  const RQ = R.quiet ?? R;
  const OQ = { T: Tr, F, R: RQ };
  const W = { errs: null, seen: new Set(), unsup: null };
  const caps: Map<number, any> = L.owCaptures(OQ, W);
  const byFn: Map<number, number> = L.owBindingOfFn(F);
  const encl = (n: any) => L.owEncl(O, n);
  const parts = (f: any) => L.ixFnParts(f);
  const kept = new Map<number, boolean>();
  for (const f of Tr.fns) kept.set(f.nid, f.nid !== Tr.fn.nid && L.owKept(OQ, byFn, f));
  const isMut = (b: any) => T.isNamed(b.t, "Mut");
  const cand = (b: any) => !b.cellParam && b.kind !== "global" && b.kind !== "prelude" && b.kind !== "fn" && (isMut(b) || b.kind === "let");
  const isWrite = (r: any) => L.owAssignedRef(O, r) || L.owWriteRef(O, r);
  const howOf = (r: any) => (L.owAssignedRef(O, r) ? "assign" : L.owWriteRef(O, r) ? "member/method" : "read");
  // the node a write by r is performed at: up through members (r as object) to the call, assignment, update or delete
  const writeExpr = (r: any): any => {
    let cur = r;
    for (let p = Tr.parent.get(cur.nid); p !== undefined; p = Tr.parent.get(cur.nid)) {
      if (p.type === "MemberExpression" && p.object.nid === cur.nid) { cur = p; continue; }
      if (p.type === "CallExpression" || p.type === "AssignmentExpression" || p.type === "UpdateExpression" || (p.type === "UnaryExpression" && p.operator === "delete")) return p;
      if (p.type === "ArrayPattern" || p.type === "ObjectPattern" || p.type === "Property" || p.type === "AssignmentPattern") { cur = p; continue; }
      return null;
    }
    return null;
  };
  const within = (a: any, b: any) => a.start >= b.start && a.end <= b.end;
  // loops around n inside g (not crossing a function)
  const loopsIn = (n: any, g: any): any[] => {
    const out: any[] = [];
    for (let p = Tr.parent.get(n.nid); p !== undefined && p.nid !== g.nid; p = Tr.parent.get(p.nid)) {
      if (isFn(p)) break;
      if (LOOPS.has(p.type)) out.push(p);
    }
    return out;
  };
  // each binding's uses: its refs, and the calls of helpers whose captures (to fixpoint) include it
  const usesOf = (b: any): { node: any; write: boolean; how: string }[] => {
    const out = (Tr.refs.get(b.id) ?? []).map((r: any) => ({ node: r, write: isWrite(r), how: howOf(r) }));
    for (const [fnid, c] of caps) {
      if (!c.read.includes(b.id)) continue;
      const hid = byFn.get(fnid), hb = hid === undefined ? undefined : F.bindings.get(hid);
      if (hb === undefined) continue;
      for (const r of Tr.refs.get(hb.id) ?? []) if (L.owIsCallee(O, r)) out.push({ node: Tr.parent.get(r.nid), write: c.wmut.includes(b.id) || c.let.includes(b.id), how: "helper-call" });
    }
    return out;
  };
  const fnClass = (g: any): string => (g.nid === Tr.fn.nid ? "cell" : kept.get(g.nid) ? "kept" : "helper");
  // g's values may be seen by other cells before g ends: g is a generator or kept; or g is nested and its encloser is
  // not async (it returns before g ends) or is itself visible. A nested async g in an async encloser is taken as awaited
  // by it (not checked). The cell is not visible unless it is a generator.
  const visibleFn = (g: any): boolean => {
    const fp = parts(g);
    if (fp?.generator || kept.get(g.nid)) return true;
    if (g.nid === Tr.fn.nid) return false;
    const e = encl(g);
    return !parts(e)?.async || visibleFn(e);
  };
  const fns: FnRow[] = [], ya: YAHit[] = [];
  for (const g of Tr.fns) {
    const fp = parts(g);
    if (fp === null || (!fp.async && !fp.generator)) continue;
    const points = Tr.all.filter((n: any) => encl(n).nid === g.nid && (n.type === "YieldExpression" || n.type === "AwaitExpression" || (n.type === "ForOfStatement" && n.await)));
    const kind: FnRow["kind"] = fp.async && fp.generator ? "asyncgen" : fp.generator ? "gen" : "async";
    const cls = fnClass(g);
    const visible = visibleFn(g);
    let nonPrim = false, unknown = false;
    for (const y of points) if (y.type === "YieldExpression") {
      if (y.argument === null) continue;
      const t = F.types.get(y.argument.nid);
      if (y.delegate || t === undefined) { if (y.delegate) nonPrim = true; else unknown = true; continue; }
      if (!T.isPrimitive(t)) nonPrim = true;
    }
    fns.push({ kind, line: g.line, fnClass: cls, visible, points: points.length, yieldsNonPrim: nonPrim, yieldsUnknown: unknown });
    if (!points.length) continue;
    for (const b of F.bindings.values()) {
      if (!cand(b)) continue;
      const d = Tr.byNid.get(b.nid);
      if (d === undefined) continue;
      // declared in g, or captured by g from an encloser (then only uses inside g count)
      const captured = encl(d).nid !== g.nid;
      if (captured && !(caps.get(g.nid)?.read ?? []).includes(b.id)) continue;
      const uses: Use[] = [];
      for (const u of usesOf(b)) {
        if (u.node === undefined || u.node.nid === b.nid) continue;
        const r = u.node;
        if (captured && !within(r, g)) continue;
        let hit: Use | null = null;
        for (const p of points) {
          if (!captured && d.start >= p.start) continue;
          const pAt = p.type === "ForOfStatement" ? p.right.end : p.end;
          const nested = encl(r).nid !== g.nid;
          if (r.start >= pAt && !(p.type === "ForOfStatement" && within(r, p.right))) { hit = { line: r.line, write: u.write, how: u.how, nested, inLoop: false, fresh: false }; break; }
          if (u.write) { const we = writeExpr(r); if (we !== null && within(p, we)) { hit = { line: r.line, write: true, how: u.how + "(holds point)", nested, inLoop: false, fresh: false }; break; } }
          const ls = loopsIn(p, g);
          if (p.type === "ForOfStatement") ls.unshift(p);
          const L0 = ls.find((l) => within(r, l) && !(l.nid === p.nid && within(r, p.right)));
          if (L0 !== undefined) { const fresh = !captured && L0.body !== undefined && within(d, L0.body); hit = { line: r.line, write: u.write, how: u.how, nested, inLoop: true, fresh }; if (!fresh) break; }
        }
        if (hit) uses.push(hit);
      }
      if (uses.length) ya.push({ kind: fp.generator ? "Y" : "A", fkind: kind, fnLine: g.line, fnClass: cls, visible, name: b.name, bkind: b.kind, mut: isMut(b), prim: !isMut(b) && T.isPrimitive(b.t), captured, declLine: d.line, uses });
      // an async generator's awaits are A points too; counted under Y (its body is a generator body)
    }
  }
  const k: KHit[] = [], p: PHit[] = [];
  for (const f of Tr.fns) {
    if (!kept.get(f.nid)) continue;
    const c = caps.get(f.nid);
    if (c === undefined) continue;
    for (const id of c.read) {
      const b = F.bindings.get(id);
      if (b === undefined) continue;
      const what = holderIn(RQ, b.t, 0);
      if (what !== null) p.push({ fnLine: f.line, name: b.name, what });
      if (!cand(b)) continue;
      const late: number[] = [];
      for (const r of Tr.refs.get(b.id) ?? []) if ((r.start < f.start || r.start > f.end) && isWrite(r) && L.owLateWrite(O, r, f)) late.push(r.line);
      k.push({ fnLine: f.line, name: b.name, bkind: b.kind, mut: isMut(b), prim: !isMut(b) && T.isPrimitive(b.t), write: c.wmut.includes(b.id) || c.let.includes(b.id), laterWrite: late.length > 0, laterWriteLines: late });
    }
  }
  return { at: Tr.fn.start, end: Tr.fn.end, fns, ya, k, p, keptFns: [...kept.values()].filter(Boolean).length };
}
function holderIn(R: any, t: any, depth: number): string | null {
  if (depth > 12 || t === undefined) return null;
  if (t.k === "named" && HOLDERS.has(t.n)) return T.show(t);
  if (t.k === "fn") return null;
  const ks = t.k === "named" ? (R.isAlias(t.n) ? [R.expand(t)] : t.args) : L.owTyKids(t);
  for (const x of ks) { const w = holderIn(R, x, depth + 1); if (w) return w; }
  return null;
}

export type SourceRep = { ok: boolean; cells: CellRep[]; module: string[]; crash?: string };
export function analyzeSource(src: Sources): SourceRep {
  const got = new Map<number, ReturnType<typeof analyzeCell>>();
  const errs: string[] = [];
  SINK = (R, F, Tr) => { try { const a = analyzeCell(R, F, Tr); got.set(a.at, a); } catch (x) { errs.push((x as Error).stack ?? String(x)); } };
  try {
    const run = runCheck(L.mdCheckSources, src, {});
    if (errs.length) throw new Error("analyzer threw: " + errs[0]);
    const cells: CellRep[] = run.result.cells.map((c, i) => {
      const at = run.spans[i]?.at ?? -1, a = got.get(at);
      return { name: c.name, line: c.line, status: c.status, rules: [...new Set(c.errors.map((e) => e.rule))], reached: a !== undefined, textHash: a === undefined ? "" : Bun.hash(`${c.name}\n${src.cells.slice(a.at, a.end)}`).toString(36), keptFns: a?.keptFns ?? 0, fns: a?.fns ?? [], ya: a?.ya ?? [], k: a?.k ?? [], p: a?.p ?? [] };
    });
    return { ok: run.result.ok, cells, module: run.result.module.map((m) => m.rule) };
  } finally { SINK = null; }
}
