// ss_toolchain: SoundScript cells <-> Lopecode runtime variables.
// A compiled cell is ordinary JS whose first comment is /*{lang:"ss"}*/. The typed source is kept in
// it (types as /*ss:...*/ comments, JSX as /*ss<...*/, the text around the function in a /*ss^{...}*/
// header), so decompile recovers the cell exactly from the variable's definition text. The work is the cells of the
// section "The toolchain over typed trees" (lite/toolchain/tc-*.ss.ts); this file gives them the shapes its callers
// pass (sets and records for the cells' sets and maps), remembers langOf, parseCompiled and decompileVariable per text, and reads the
// call of a compiled definition with acorn for the callers that walk it (Compiled call and fn).
import * as acorn from "acorn";
import {
  tcLANG, tcSTATE_VALUE, tcRuntimeCells, tcINPUTS, tcInputsIn, tcSplitCells, tcContextOf, tcAcceptedOf, tcWhyOf, tcContextFromCheck, tcCellStates,
  tcVariableName, tcKeyOfVariable, tcIsDuplicateKey, tcHandleName, tcCellOfVariable, tcCompileCell, tcCompileCellText, tcCompileModule, tcLangOf,
  tcParseCompiled, tcKinds, tcDecompileVariable, tcDecompileModule, tcEsc, tcUnesc, tcCommentTypes, tcUncommentTypes, tcCompileTypes, tcDecompileTypes,
  tcErase, tcModuleJs, tcSyntaxStub, tcFromObservableVariables,
} from "./tc-index.ts";
import type { CellInfo } from "../facts.ts";
import type { TcCtx, TcInfo, TcCheck, TcCompiled, TcShape } from "./tc-index.ts";
export { declaredNameAt, declaredName, tokensOf, paramsOf, type Token } from "./tc-shell.ts";

// the cells this file calls, as one record (lite/toolchain/tc-diff.ts hands a linked copy with one cell replaced)
export const TC = {
  tcLANG, tcSTATE_VALUE, tcRuntimeCells, tcINPUTS, tcInputsIn, tcSplitCells, tcContextOf, tcAcceptedOf, tcWhyOf, tcContextFromCheck, tcCellStates,
  tcVariableName, tcKeyOfVariable, tcIsDuplicateKey, tcHandleName, tcCellOfVariable, tcCompileCell, tcCompileCellText, tcCompileModule, tcLangOf,
  tcParseCompiled, tcKinds, tcDecompileVariable, tcDecompileModule, tcEsc, tcUnesc, tcCommentTypes, tcUncommentTypes, tcCompileTypes, tcDecompileTypes,
  tcErase, tcModuleJs, tcSyntaxStub, tcFromObservableVariables,
};
export type TcCalls = typeof TC;
export type Variable = { name: string; inputs: string[]; definition: string };
export type Context = { generators: ReadonlySet<string>; events: ReadonlySet<string>; accepted: ReadonlySet<string> | null; facts?: ReadonlyMap<string, CellInfo> | null; why?: ReadonlyMap<string, string[]> | null; inputs?: Record<string, string>; module?: string | null };
export type CellState = { state: "ok" | "rejected" | "blocked"; why: string[]; blockedBy: string[] };
export type Shape = TcShape;
// the cells' record of a compiled definition, with the acorn nodes of its call and of the function in that call
export type Compiled = TcCompiled & { call: acorn.Node | null; fn: acorn.Node | null };
type CheckCell = { name: string; status: string; errors: { rule: string; msg: string }[]; unsupported?: { msg: string }[]; blockedBy?: string[]; value?: string };
type CheckLike = { cells: CheckCell[]; facts?: ReadonlyMap<string, CellInfo>; unparsed?: ReadonlyMap<string, string> };
type Translated = { text: string } | { reason: string };

const tcInfo = (c: CellInfo): TcInfo => ({ name: c.name, returnsRef: c.returnsRef, generator: c.generator, compiles: c.compiles.map((s) => ({ refs: s.refs })), casts: c.casts ?? [], params: c.params.map((p) => ({ name: p.name, refTyped: p.refTyped, eventsTyped: p.eventsTyped, boundary: p.boundary ?? null })) });
const toCheckCell = (c: CheckCell) => ({ name: c.name, status: c.status, errors: c.errors, unsupported: c.unsupported ?? [], blockedBy: c.blockedBy ?? [] });
// a bounded memo: a hit, or f's value remembered
function remembered<V>(m: Map<string, V>, k: string, f: () => V): V {
  const hit = m.get(k);
  if (hit !== undefined) return hit;
  const v = f();
  const oldest = m.keys().next();
  if (m.size > 4096 && !oldest.done) m.delete(oldest.value);
  m.set(k, v);
  return v;
}
// the call in a compiled definition whose callee or an argument starts at the end of its header, and that node
function callAt(definition: string, at: number): { call: acorn.Node | null; fn: acorn.Node | null } {
  const todo: acorn.Node[] = [acorn.parseExpressionAt(definition, 0, { ecmaVersion: "latest" })];
  for (let n = todo.shift(); n !== undefined; n = todo.shift()) {
    if (n.type === "CallExpression") {
      const c = n as acorn.CallExpression, f = c.callee.start === at ? c.callee : c.arguments.find((x) => x.start === at);
      if (f) return { call: c, fn: f };
    }
    for (const v of Object.values(n)) for (const x of Array.isArray(v) ? v : [v]) if (x && typeof x === "object" && typeof (x as acorn.Node).type === "string") todo.push(x as acorn.Node);
  }
  return { call: null, fn: null };
}
// the shipped functions over a record of the cells
export function toolchainOf(L: TcCalls) {
  const infoMemo = new WeakMap<object, Map<string, TcInfo>>();
  const factsOf = (f: ReadonlyMap<string, CellInfo> | null | undefined): Map<string, TcInfo> | null => {
    if (!f) return null;
    let m = infoMemo.get(f);
    if (!m) { m = new Map([...f].map(([k, v]) => [k, tcInfo(v)])); infoMemo.set(f, m); }
    return m;
  };
  const toTc = (c: Context | undefined): TcCtx => !c ? { generators: new Set(), events: new Set(), accepted: null, facts: null, why: null, inputs: null, module: null } : {
    generators: new Set(c.generators), events: new Set(c.events), accepted: c.accepted ? new Set(c.accepted) : null, facts: factsOf(c.facts),
    why: c.why ? new Map(c.why) : null, inputs: c.inputs ? new Map(Object.entries(c.inputs)) : null, module: c.module ?? null,
  };
  const fromTc = (c: TcCtx, facts: ReadonlyMap<string, CellInfo> | null = null): Context => ({ generators: c.generators, events: c.events, accepted: c.accepted, facts, why: c.why });
  const toCheck = (r: CheckLike): TcCheck => ({ cells: r.cells.map(toCheckCell), facts: factsOf(r.facts), unparsed: r.unparsed ? new Map(r.unparsed) : null });
  const langs = new Map<string, string | null>(), parsed = new Map<string, Compiled | null>(), decompiled = new Map<string, string | null>();
  const langOf = (js: string): string | null => remembered(langs, js, () => L.tcLangOf(js));
  const parseCompiled = (d: string): Compiled | null => remembered(parsed, d, () => { const p = L.tcParseCompiled(d); return p === null ? null : { ...p, ...(p.hasFn ? callAt(d, p.headerEnd) : { call: null, fn: null }) }; });
  const rec = (m: Map<string, string>) => Object.fromEntries(m);
  return {
    LANG: L.tcLANG, STATE_VALUE: L.tcSTATE_VALUE, RUNTIME_CELLS: L.tcRuntimeCells, INPUTS: rec(L.tcINPUTS),
    inputsIn: (runtimeModule: boolean) => rec(L.tcInputsIn(runtimeModule)),
    splitCells: (src: string, tsx: boolean): string[] => L.tcSplitCells(src, tsx),
    contextOf: (texts: string[], tsx: boolean, accepted: ReadonlySet<string> | null = null): Context => fromTc(L.tcContextOf(texts, tsx, accepted ? new Set(accepted) : null)),
    acceptedOf: (r: CheckLike): Set<string> => L.tcAcceptedOf(toCheck(r)),
    whyOf: (r: CheckLike, c: CheckCell): string[] => L.tcWhyOf(toCheck(r), toCheckCell(c)),
    contextFromCheck: (r: CheckLike, _source?: string, _tsx = true): Context => fromTc(L.tcContextFromCheck(toCheck(r)), r.facts ?? null),
    cellStates: (r: CheckLike): Map<string, CellState> => L.tcCellStates(toCheck(r)),
    variableName: L.tcVariableName, keyOfVariable: L.tcKeyOfVariable, isDuplicateKey: L.tcIsDuplicateKey, handleName: L.tcHandleName, cellOfVariable: L.tcCellOfVariable,
    compileCell: (t: string, tsx: boolean, c?: Context, nameHint: string | null = null): Variable[] => L.tcCompileCell(t, tsx, toTc(c), nameHint),
    compileCellText: (t: string, tsx: boolean, c?: Context, nameHint: string | null = null): string => L.tcCompileCellText(t, tsx, toTc(c), nameHint),
    compileModule: (src: string, tsx: boolean, accepted: ReadonlySet<string> | null = null): Variable[] => L.tcCompileModule(src, tsx, accepted ? new Set(accepted) : null),
    langOf, parseCompiled,
    compiledKind: (d: string) => { const p = parseCompiled(d); return p === null || p.callee === null ? null : { callee: p.callee, kind: L.tcKinds.get(p.callee) ?? null, refs: p.refs }; },
    decompileVariable: (d: string): string | null => remembered(decompiled, d, () => L.tcDecompileVariable(d)),
    decompileModule: (ds: string[]): string => L.tcDecompileModule(ds),
    fromObservableVariables: (vars: { name: string | null; inputs: string[]; definition: string }[], opts: { expression?: boolean } = {}): Translated => {
      const r = L.tcFromObservableVariables(vars, opts.expression ?? null);
      return r.text !== null ? { text: r.text } : { reason: r.reason };
    },
    // comment-types.ts, ../browser/erase.ts, module-js.ts
    esc: L.tcEsc, unesc: L.tcUnesc, commentTypes: (src: string): string => L.tcCommentTypes(src).text, uncommentTypes: L.tcUncommentTypes, compile: L.tcCompileTypes, decompile: L.tcDecompileTypes,
    erase: L.tcErase, moduleJs: L.tcModuleJs, syntaxStub: L.tcSyntaxStub,
  };
}
export const TOOLCHAIN = toolchainOf(TC);
export const LANG = TOOLCHAIN.LANG;
export const STATE_VALUE = TOOLCHAIN.STATE_VALUE;
export const RUNTIME_CELLS = TOOLCHAIN.RUNTIME_CELLS;
export const INPUTS = TOOLCHAIN.INPUTS;
export const inputsIn = (runtimeModule: boolean): Record<string, string> => TOOLCHAIN.inputsIn(runtimeModule);
export const splitCells = (src: string, tsx: boolean): string[] => TOOLCHAIN.splitCells(src, tsx);
export const contextOf = (texts: string[], tsx: boolean, accepted: ReadonlySet<string> | null = null): Context => TOOLCHAIN.contextOf(texts, tsx, accepted);
export const acceptedOf = (r: CheckLike): Set<string> => TOOLCHAIN.acceptedOf(r);
export const whyOf = (r: CheckLike, c: CheckCell): string[] => TOOLCHAIN.whyOf(r, c);
export const contextFromCheck = (r: CheckLike, source?: string, tsx = true): Context => TOOLCHAIN.contextFromCheck(r, source, tsx);
export const cellStates = (r: CheckLike): Map<string, CellState> => TOOLCHAIN.cellStates(r);
export const variableName = (key: string): string => TOOLCHAIN.variableName(key);
export const keyOfVariable = (name: string): string => TOOLCHAIN.keyOfVariable(name);
export const isDuplicateKey = (key: string | null): key is string => TOOLCHAIN.isDuplicateKey(key);
export const handleName = (key: string): string => TOOLCHAIN.handleName(key);
export const cellOfVariable = (name: string): string => TOOLCHAIN.cellOfVariable(name);
export const compileCell = (text: string, tsx: boolean, ctx?: Context, nameHint: string | null = null): Variable[] => TOOLCHAIN.compileCell(text, tsx, ctx, nameHint);
export const compileCellText = (text: string, tsx: boolean, ctx?: Context, nameHint: string | null = null): string => TOOLCHAIN.compileCellText(text, tsx, ctx, nameHint);
export const compileModule = (src: string, tsx: boolean, accepted: ReadonlySet<string> | null = null): Variable[] => TOOLCHAIN.compileModule(src, tsx, accepted);
export const langOf = (js: string): string | null => TOOLCHAIN.langOf(js);
export const parseCompiled = (definition: string): Compiled | null => TOOLCHAIN.parseCompiled(definition);
export const compiledKind = (definition: string) => TOOLCHAIN.compiledKind(definition);
export const decompileVariable = (definition: string): string | null => TOOLCHAIN.decompileVariable(definition);
export const decompileModule = (definitions: string[]): string => TOOLCHAIN.decompileModule(definitions);
export const fromObservableVariables = (vars: { name: string | null; inputs: string[]; definition: string }[], opts: { expression?: boolean } = {}): Translated => TOOLCHAIN.fromObservableVariables(vars, opts);
