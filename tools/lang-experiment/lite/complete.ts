// Completion for one cell of a module, from the checker's types. The cell text is usually incomplete
// while typing, so a copy is checked with a placeholder identifier at the cursor; if the copy does not
// parse, the cell is cut at the cursor and its open brackets closed. When neither copy can be checked
// the answer is an empty list, never a guess from runtime values. The decisions are the cells of the section
// "Completion and cell facts over typed trees" (lite/infer/cp-*.ss.ts); this file runs the module check they ask
// for, hands them the registry as a record, reads a value's prototype and own properties for annotationOf, and counts
// the work (completionWork).
import { checkSources, rgRegistry, type Outside, type Sources, type CheckOpts, type LiteResult, type RgRegistry } from "./core.ts";
import { cpCompletionsAt, cpMembersOf, cpAnnotationOf, cpAddParameter, cpTypeNames, cpPH } from "./infer-ss.ts";
import type { CpReg, CpHost, CpConst } from "./infer-ss.ts";
import type { Ty } from "./types.ts";
import { CAPABILITIES, PRELUDE_FNS, PRELUDE_DECLS, JSX_DECLS } from "./intrinsics.ts";

export type Completion = { label: string; type: string; detail?: string; apply?: string };
export type Completions = { from: number; to: number; options: Completion[]; mode: "member" | "name" | "param" | "type" | "jsx" | "none" };
// the cells this file calls, as one record (lite/infer/cp-diff.ts hands a copy with one cell replaced)
export const CP = { cpCompletionsAt, cpMembersOf, cpAnnotationOf, cpAddParameter, cpTypeNames, cpPH };
export type CpCalls = typeof CP;

export const regOf = (reg: RgRegistry): CpReg => ({
  expand: (t) => reg.expand(t), member: (t, k) => reg.member(t, k), callSigs: (t) => reg.callSigs(t),
  ifaceKeys: (n) => (reg.types.has(n) ? [...reg.ifaceRec(n).props.keys()] : null),
});
// what completionsAt has done: module checks run, and the cells those checks inferred
export const completionWork = { checks: 0, cells: 0 };
const counted = () => { completionWork.checks++; return () => { completionWork.cells++; }; };
export type Check = (src: Sources, opts: CheckOpts) => LiteResult;
export function hostOf(C: CpCalls, tsx: boolean, outside: readonly Outside[] | null, annotate: ((name: string) => string | null) | null, check: Check = checkSources): CpHost {
  return {
    probe: (cells, member) => {
      let probe: LiteResult["probe"];
      try { probe = check({ cells, tsx, outside }, { onCell: counted(), probe: { name: C.cpPH, member } }).probe; } catch { return null; }
      return probe?.found ? { found: probe.found, reg: regOf(probe.reg) } : null;
    },
    cellTypes: (cells) => { try { return check({ cells, tsx, outside }, { onCell: counted() }).cells.map((c): [string, string] => [c.name, c.value ?? ""]); } catch { return null; } },
    annotate: (n) => { try { return annotate?.(n) ?? null; } catch { return null; } },
    fresh: () => regOf(rgRegistry()),
  };
}
const consts = new WeakMap<CpCalls, CpConst>();
// the capabilities and type names, once per record
export const constOf = (C: CpCalls): CpConst => {
  let c = consts.get(C);
  if (!c) consts.set(C, (c = { caps: new Map(Object.entries(CAPABILITIES)), typeNames: C.cpTypeNames(PRELUDE_DECLS, JSX_DECLS) }));
  return c;
};
// outside: the module's cells in other languages (core.ts Outside), so a parameter that reads one has its annotated type.
// annotate: for a parameter-list completion of an outside name, the annotation its current value suggests (or null).
export function completionsAtWith(C: CpCalls, cells: readonly string[], at: number, offset: number, tsx = true, outside: readonly Outside[] | null = null, annotate: ((name: string) => string | null) | null = null, check: Check = checkSources): Completions {
  return C.cpCompletionsAt(hostOf(C, tsx, outside, annotate, check), constOf(C), [...cells], at, offset, tsx, [...(outside ?? [])]) as Completions;
}
export const completionsAt = (cells: readonly string[], at: number, offset: number, tsx = true, outside: readonly Outside[] | null = null, annotate: ((name: string) => string | null) | null = null): Completions =>
  completionsAtWith(CP, cells, at, offset, tsx, outside, annotate);
export const membersOf = (reg: RgRegistry, t: Ty, C: CpCalls = CP): Completion[] | null => C.cpMembersOf(regOf(reg), t);
const isPlainValue = (v: unknown) => { const p = Object.getPrototypeOf(v); return p === Object.prototype || p === null; };
const ownField = (v: unknown, k: string) => (v as Record<string, unknown>)[k];
export const annotationOf = (v: unknown, C: CpCalls = CP): string | null => C.cpAnnotationOf(isPlainValue, ownField, v);
export const addParameter = (source: string, name: string, annotation: string | null = null, C: CpCalls = CP): { from: number; to: number; insert: string } | null => C.cpAddParameter(source, name, annotation);

export { PRELUDE_FNS };
