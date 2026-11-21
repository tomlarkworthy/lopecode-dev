// The ix cells (the port of lite/infer.ts Checker) linked for bun, and the registry view they are handed: the
// Registry stays TypeScript, so its methods come in as a record of functions over the typed tree's nodes, each
// mapped to the parse.ts node of the same span and type. Nothing here is used by the shipped checker.
import "./ix-types.ss.ts";
import * as core from "./ix-core.ss.ts";
import * as hides from "./ix-hides.ss.ts";
import * as expr from "./ix-expr.ss.ts";
import * as ops from "./ix-ops.ss.ts";
import * as cond from "./ix-cond.ss.ts";
import * as fn from "./ix-fn.ss.ts";
import * as stmt from "./ix-stmt.ss.ts";
import * as flow from "./ix-flow.ss.ts";
import * as lit from "./ix-lit.ss.ts";
import * as call from "./ix-call.ss.ts";
import * as apply from "./ix-apply.ss.ts";
import * as prelude from "./ix-prelude.ss.ts";
import * as jsx from "./ix-jsx.ss.ts";
import * as entry from "./ix-entry.ss.ts";
import * as facts from "./ix-facts.ss.ts";
import "./ow-types.ss.ts";
import * as owTree from "./ow-tree.ss.ts";
import * as owCapture from "./ow-capture.ss.ts";
import * as owPos from "./ow-pos.ss.ts";
import * as owPlace from "./ow-place.ss.ts";
import * as owFlow from "./ow-flow.ss.ts";
import * as owStmt from "./ow-stmt.ss.ts";
import * as owLoop from "./ow-loop.ss.ts";
import * as owAction from "./ow-action.ss.ts";
import * as owTaint from "./ow-taint.ss.ts";
import * as owOpaque from "./ow-opaque.ss.ts";
import * as owEntry from "./ow-entry.ss.ts";
import * as runtimePrelude from "../../prelude.runtime.ts";
import { link } from "../link.ts";
import * as T from "../types.ts";
import { linkAcorn } from "../acorn/index.ts";
import { ALLOWED_GLOBALS, PRELUDE_FNS } from "../intrinsics.ts";
import { kids, type Node, type Parsed } from "../parse.ts";
import type { Registry } from "../registry.ts";
import type { AstNode } from "../acorn/acorn-types.ss.ts";
import type { IxReg, IxRegCore, IxDiag, IxInput, IxOutput, IxKind } from "./ix-types.ss.ts";
import type { Ty } from "../types.ss.ts";

export const IX_FILES = ["types", "core", "hides", "expr", "ops", "cond", "fn", "stmt", "flow", "lit", "call", "apply", "prelude", "jsx", "entry", "facts"].map((x) => `ix-${x}.ss.ts`);
// the ownership port (lite/own.ts), linked with the ix cells it reads
export const OW_FILES = ["types", "tree", "capture", "pos", "place", "flow", "stmt", "loop", "action", "taint", "opaque", "entry"].map((x) => `ow-${x}.ss.ts`);
export const OW_CELLS = { ...owTree, ...owCapture, ...owPos, ...owPlace, ...owFlow, ...owStmt, ...owLoop, ...owAction, ...owTaint, ...owOpaque, ...owEntry };
export const IX_CELLS = { ...core, ...hides, ...expr, ...ops, ...cond, ...fn, ...stmt, ...flow, ...lit, ...call, ...apply, ...prelude, ...jsx, ...entry, ...facts, ...OW_CELLS };
const A = linkAcorn();
const GIVEN = {
  NUM: T.NUM, STR: T.STR, BIGINT: T.BIGINT, NULL: T.NULL, UNDEF: T.UNDEF, VOID: T.VOID, NEVER: T.NEVER, UNKNOWN: T.UNKNOWN,
  OBJECT: T.OBJECT, ERR: T.ERR, SYMBOL: T.SYMBOL, BOOL: T.BOOL, lit: T.lit, arr: T.arr, named: T.named, unwrap: T.unwrap,
  propT: T.propT, union: T.union, members: T.members, show: T.show, subst: T.subst, hasTv: T.hasTv, instantiate: T.instantiate,
  widen: T.widen, isPrimitive: T.isPrimitive, isNamed: T.isNamed, kidsOf: A.kidsOf, nodeKind: A.nodeKind, isFnNode: A.isFnNode, childrenOf: A.childrenOf, TYPE_FIELDS: A.TYPE_FIELDS,
};
// over: cells to put in place of the port's (diff.ts's control)
export const linkIx = (over: Record<string, (...inputs: never[]) => unknown> = {}) => link({ ...IX_CELLS, ...over } as typeof IX_CELLS, runtimePrelude, GIVEN);

const keyOf = (n: { start: number; end: number; type: string }) => `${n.start}:${n.end}:${n.type}`;
// every parse.ts node of P, by span and type (type positions included)
function nodeIndex(P: Parsed): Map<string, Node> {
  const out = new Map<string, Node>();
  const walk = (n: Node) => {
    if (!out.has(keyOf(n))) out.set(keyOf(n), n);
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

// the registry as the port sees it; drain gives what onErr and onUnsup received since the last drain
// core.ts's compile hook, called with the checker methods it uses (diff.ts lends it the real checker's)
export type CompileCh = { infer: (n: Node) => Ty; err: (n: Node, rule: string, msg: string) => void; unsupported: (n: Node, what: string) => void };
export type CompileHook = (e: Node, ch: CompileCh) => Ty;
const STOP = new Error("ix: the compile hook asked for a type");
function findIn(n: AstNode, key: string): AstNode | null {
  if (keyOf(n) === key) return n;
  for (const k of A.childrenOf(n)) { const x = findIn(k.node, key); if (x) return x; }
  return null;
}
export function makeReg(reg: Registry, P: Parsed, hook: CompileHook | null = null): IxReg & { restore: () => void } {
  let idx = pIndex.get(P);
  if (!idx) pIndex.set(P, (idx = nodeIndex(P)));
  const index = idx;
  const toP = (n: AstNode): Node => {
    const x = index.get(keyOf(n));
    if (!x) throw new Error(`ix: no parse.ts node at ${keyOf(n)}`);
    return x;
  };
  const buf: IxDiag[] = [];
  const was = [reg.onErr, reg.onUnsup] as const;
  reg.onErr = (n, rule, msg) => void buf.push({ start: n.start, end: n.end, rule, msg });
  reg.onUnsup = (n, what) => void buf.push({ start: n.start, end: n.end, rule: "unsupported", msg: what });
  const core: IxRegCore = {
    isAlias: (n) => reg.isAlias(n), expand: (t) => reg.expand(t), member: (t, k) => reg.member(t, k), sub: (a, b) => reg.sub(a, b),
    callSigs: (t) => reg.callSigs(t), iterElem: (t) => reg.iterElem(t), unify: (p, a, m, tvs) => reg.unify(p, a, m, tvs), isTypedArray: (t) => reg.isTypedArray(t),
  };
  const wrap = (around: <X>(f: () => X) => X): IxRegCore =>
    Object.fromEntries(Object.entries(core).map(([k, f]) => [k, (...a: unknown[]) => around(() => (f as (...a: unknown[]) => unknown)(...a))])) as IxRegCore;
  const lax = <X>(f: () => X): X => { const s = reg.strictIndex; reg.strictIndex = false; try { return f(); } finally { reg.strictIndex = s; } };
  const ctx = (tps: string[], look: Map<string, Ty> | null) => ({ tps: new Set(tps), typeofLookup: (name: string) => look?.get(name) });
  const tq = new Map<number, boolean>();
  const hasTypeQuery = (n: AstNode): boolean => {
    const hit = tq.get(n.nid);
    if (hit !== undefined) return hit;
    const r = n.type === "TSTypeQuery" || A.childrenOf(n).some((k: { node: AstNode }) => hasTypeQuery(k.node));
    tq.set(n.nid, r);
    return r;
  };
  return {
    ...core,
    quiet: wrap((f) => reg.peek(f)), lax: wrap(lax), strictIndex: reg.strictIndex, same: (a, b) => a === b,
    origin: (n) => reg.types.get(n)?.origin ?? null,
    convert: (n, tps, look) => reg.convert(toP(n), ctx(tps, look), P),
    sig: (params, ret, tps, look) => reg.sig(params.map(toP), toP(ret), undefined, ctx(tps, look), P, "user"),
    hasTypeQuery, cloneProblem: (t) => T.cloneProblemWith(reg.ops)(t, 0),
    drain: () => buf.splice(0),
    compile: hook && ((e, options) => {
      const asked: { n: Node | null } = { n: null }, mark = buf.length;
      const ch: CompileCh = {
        infer: (n) => { if (options === null) { asked.n = n; throw STOP; } return options; },
        err: (n, rule, msg) => void buf.push({ start: n.start, end: n.end, rule, msg }),
        unsupported: (n, what) => void buf.push({ start: n.start, end: n.end, rule: "unsupported", msg: what }),
      };
      try { return { k: "done" as const, t: hook(toP(e), ch) }; } catch (x) { if (x !== STOP) throw x; }
      buf.length = mark;
      const at = asked.n && findIn(e, keyOf(asked.n));
      if (!at) throw new Error("ix: the compile hook asked for a node outside the call");
      return { k: "options" as const, at };
    }),
    restore: () => { [reg.onErr, reg.onUnsup] = was; },
  };
}
// the globals the Checker constructor binds
export function globalsOf(reg: Registry): IxInput["globals"] {
  const out = new Map<string, { name: string; t: Ty; kind: IxKind }>();
  for (const name of PRELUDE_FNS) out.set(name, { name, t: T.ERR, kind: "prelude" });
  for (const name of ALLOWED_GLOBALS) {
    const v = reg.values.get(name);
    if (name === "undefined") out.set(name, { name, t: T.UNDEF, kind: "global" });
    else if (v && v.origin === "intrinsic") out.set(name, { name, t: v.t, kind: "global" });
  }
  const eq = reg.values.get("equals"), b = out.get("equals");
  if (eq && b) b.t = eq.t;
  return [...out.values()];
}
export type IxLinked = ReturnType<typeof linkIx>;
export function runIx(L: IxLinked, reg: Registry, P: Parsed, input: Omit<IxInput, "globals">, hook: CompileHook | null = null): IxOutput {
  const R = makeReg(reg, P, hook);
  try { return L.ixCheckFn(R, { ...input, globals: globalsOf(reg) }); } finally { R.restore(); }
}
// the registry's methods as the ownership port calls them, outside any check (own.ts runs after fnExpr)
export function regCore(reg: Registry): IxRegCore {
  return { isAlias: (n) => reg.isAlias(n), expand: (t) => reg.expand(t), member: (t, k) => reg.member(t, k), sub: (a, b) => reg.sub(a, b),
    callSigs: (t) => reg.callSigs(t), iterElem: (t) => reg.iterElem(t), unify: (p, a, m, tvs) => reg.unify(p, a, m, tvs), isTypedArray: (t) => reg.isTypedArray(t) };
}
export { kids };
