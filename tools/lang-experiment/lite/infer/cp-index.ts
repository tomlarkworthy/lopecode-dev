// The cells of lite/infer/cp-*.ss.ts (completion and cell facts) linked for bun with the ix and md cells they take,
// behind the exports of lite/complete.ts and lite/facts.ts. Not switched on: nothing shipped imports this file.
// The glue left in TypeScript: running the module check (checkSources, and the throw complete.ts catches), the
// Registry as the record CpReg, a value's prototype and own property for annotationOf, the completionWork counter,
// the parse error as a throw, and the facts as facts.ts's CellInfo.
import "./cp-types.ss.ts";
import * as text from "./cp-text.ss.ts";
import * as membersCells from "./cp-members.ss.ts";
import * as modes from "./cp-modes.ss.ts";
import * as param from "./cp-param.ss.ts";
import * as factsCells from "./cp-facts.ss.ts";
import { IX_CELLS, MD_CELLS, MD_GIVEN } from "../infer-ss.ts";
import { link } from "../link.ts";
import { checkSources, type Outside, type Sources, type CheckOpts, type LiteResult } from "../core.ts";
import { Registry } from "../registry.ts";
import { CAPABILITIES, PRELUDE_DECLS, JSX_DECLS } from "../intrinsics.ts";
import type { CellInfo } from "../facts.ts";
import type { Completion, Completions } from "../complete.ts";
import type { Ty } from "../types.ts";
import type { CpReg, CpHost, CpConst } from "./cp-types.ss.ts";
import type { MdInfo } from "./md-types.ss.ts";
import type { AstNode } from "../acorn/acorn-types.ss.ts";
import type { FnNode } from "../acorn/acorn.ss.ts";
import * as prelude from "../../prelude.runtime.ts";
export type * from "./cp-types.ss.ts";

export const CP_FILES = ["types", "text", "members", "modes", "param", "facts"].map((x) => `cp-${x}.ss.ts`);
export const CP_CELLS = { ...text, ...membersCells, ...modes, ...param, ...factsCells };
// over: cells in place of the port's (cp-diff.ts's controls)
export const linkCp = (over: Record<string, (...inputs: never[]) => unknown> = {}) =>
  link({ ...IX_CELLS, ...MD_CELLS, ...CP_CELLS, ...over } as typeof IX_CELLS & typeof MD_CELLS & typeof CP_CELLS, prelude, MD_GIVEN);
export type CpLinked = ReturnType<typeof linkCp>;

export const regOf = (reg: Registry): CpReg => ({
  expand: (t) => reg.expand(t), member: (t, k) => reg.member(t, k), callSigs: (t) => reg.callSigs(t),
  ifaceKeys: (n) => (reg.types.has(n) ? [...reg.ifaceRec(n).props.keys()] : null),
});
// what completionsAt has done: module checks run, and the cells those checks inferred (complete.ts completionWork)
export const completionWork = { checks: 0, cells: 0 };
const counted = () => { completionWork.checks++; return () => { completionWork.cells++; }; };
export type Check = (src: Sources, opts: CheckOpts) => LiteResult;
export function hostOf(L: CpLinked, tsx: boolean, outside: readonly Outside[] | null, annotate: ((name: string) => string | null) | null, check: Check = checkSources): CpHost {
  return {
    probe: (cells, member) => {
      let probe: LiteResult["probe"];
      try { probe = check({ cells, tsx, outside }, { onCell: counted(), probe: { name: L.cpPH, member } }).probe; } catch { return null; }
      return probe?.found ? { found: probe.found, reg: regOf(probe.reg) } : null;
    },
    cellTypes: (cells) => { try { return check({ cells, tsx, outside }, { onCell: counted() }).cells.map((c): [string, string] => [c.name, c.value ?? ""]); } catch { return null; } },
    annotate: (n) => { try { return annotate?.(n) ?? null; } catch { return null; } },
    fresh: () => regOf(new Registry()),
  };
}

const L = linkCp();
const consts = new WeakMap<CpLinked, CpConst>();
// the capabilities and type names, once per link
export const constOf = (L: CpLinked): CpConst => {
  let c = consts.get(L);
  if (!c) consts.set(L, (c = { caps: new Map(Object.entries(CAPABILITIES)), typeNames: L.cpTypeNames(PRELUDE_DECLS, JSX_DECLS) }));
  return c;
};
export function completionsAtWith(L: CpLinked, cells: readonly string[], at: number, offset: number, tsx = true, outside: readonly Outside[] | null = null, annotate: ((name: string) => string | null) | null = null, check: Check = checkSources): Completions {
  return L.cpCompletionsAt(hostOf(L, tsx, outside, annotate, check), constOf(L), [...cells], at, offset, tsx, [...(outside ?? [])]) as Completions;
}
export const completionsAt = (cells: readonly string[], at: number, offset: number, tsx = true, outside: readonly Outside[] | null = null, annotate: ((name: string) => string | null) | null = null): Completions =>
  completionsAtWith(L, cells, at, offset, tsx, outside, annotate);
export const membersOf = (reg: Registry, t: Ty): Completion[] | null => L.cpMembersOf(regOf(reg), t);
const plain = (v: unknown) => { const p = Object.getPrototypeOf(v); return p === Object.prototype || p === null; };
const field = (v: unknown, k: string) => (v as Record<string, unknown>)[k];
export const annotationOf = (v: unknown): string | null => L.cpAnnotationOf(plain, field, v);
export const addParameter = (source: string, name: string, annotation: string | null = null): { from: number; to: number; insert: string } | null => L.cpAddParameter(source, name, annotation);

// facts.ts: the facts as CellInfo, keys in factsOf's order
export const infoOf = (f: MdInfo, span = true): CellInfo => ({
  name: f.name, ...(span ? { span: [f.span[0] ?? 0, f.span[1] ?? 0] as [number, number] } : {}), returnsRef: f.returnsRef, generator: f.generator,
  compiles: f.compiles.map(({ inputs, refs, outputs }) => ({ inputs, refs, outputs })),
  params: f.params.map((p) => ({ name: p.name, refTyped: p.refTyped, eventsTyped: p.eventsTyped })),
});
export function cellsOfWith(L: CpLinked, src: string): CellInfo[] {
  const r = L.cpCellsOf(src);
  if (!r.ok) throw new Error(r.message);
  return r.cells.map((f) => infoOf(f));
}
export const cellsOf = (src: string): CellInfo[] => cellsOfWith(L, src);
export const factsOf = (name: string, fn: FnNode, stmt?: AstNode): CellInfo => infoOf(L.mdFactsOf(name, { name, fn, stmt: stmt ?? fn }, null), !!stmt);
// typed-tree nodes, by nid (facts.ts gives the parse.ts nodes)
export const preludeCalls = (fn: AstNode, name: string): Set<number> => L.mdPreludeCalls(fn, name);
export const globalRefs = (fn: AstNode, name: string): Set<number> => L.cpGlobalRefs(fn, name);
export { L as CP };
