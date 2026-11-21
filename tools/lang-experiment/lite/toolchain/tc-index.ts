// The tc cells linked for bun (../link.ts), with the exports and signatures of ss-toolchain.ts, comment-types.ts,
// module-js.ts and ../browser/erase.ts, so a caller can take either. Each value of tc-shell.ts reaches its cell
// through the boundary's wrapper (../boundary.ts cross) with the shape of the cell's annotation, as acorn/index.ts
// gives acornParse. What is not ported is re-exported from the shipped file and listed outside PORTED.
// The two remembered-per-text maps of the shipped files (langOf, parseCompiled) are kept here, not in a cell.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import "./tc-types.ss.ts";
import * as text from "./tc-text.ss.ts";
import * as cuts from "./tc-cuts.ss.ts";
import * as free from "./tc-free.ss.ts";
import * as build from "./tc-build.ss.ts";
import * as ctxCells from "./tc-ctx.ss.ts";
import * as decomp from "./tc-decomp.ss.ts";
import * as modjs from "./tc-modjs.ss.ts";
import * as shell from "./tc-shell.ts";
import { link } from "../link.ts";
import { linkAcorn } from "../acorn/index.ts";
import { linkMd } from "../infer-ss.ts";
import { cross, boundaryShape, type Shape } from "../boundary.ts";
import { Registry } from "../registry.ts";
import { parse, type Node } from "../parse.ts";
import * as prelude from "../../prelude.runtime.ts";
import * as orig from "./ss-toolchain.ts";
import type { CellInfo } from "../facts.ts";
import type { TcCtx, TcInfo, TcCheck, TcVar, TcCompiled } from "./tc-types.ss.ts";
export type * from "./tc-types.ss.ts";

export const TC_FILES = ["types", "text", "cuts", "free", "build", "ctx", "decomp", "modjs"].map((x) => `tc-${x}.ss.ts`);
export const TC_CELLS = { ...text, ...cuts, ...free, ...build, ...ctxCells, ...decomp, ...modjs };

// the shape of the first parameter of a cell of tc-text.ss.ts, from its annotation
function paramShape(cell: string): Shape {
  const files = ["../acorn/acorn-types.ss.ts", "tc-types.ss.ts", "tc-text.ss.ts"];
  const P = parse(files.map((f) => readFileSync(join(import.meta.dir, f), "utf8")).join("\n"));
  const reg = new Registry();
  reg.load(P, "user", true);
  const decl = (P.program.body as Node[]).map((st) => (st.type === "ExportNamedDeclaration" ? st.declaration : st)).find((d) => d?.type === "VariableDeclaration" && d.declarations[0].id.name === cell);
  const s = boundaryShape(reg.convert(decl.declarations[0].init.params[0].typeAnnotation.typeAnnotation, { tps: new Set() }, P), (t) => reg.expand(t), (n) => reg.isAlias(n), true);
  if ("error" in s) throw new Error(`${cell}'s parameter does not cross: ${s.error}`);
  return s;
}
const TAKERS: Record<string, string> = {
  tcLex: "tcLexed", tcFirstComment: "tcFirstOf", tcJsError: "tcJsErrorOf", tcDeclaredName: "tcNameOf", tcLower: "tcLowered",
  tcCellsOf: "tcInfosOf", tcIsIdentifier: "tcIdentOk", tcCapNames: "tcCaps", tcPreludeFns: "tcPrelude", tcOjsGlobals: "tcOjsInputGlobals",
};
export const crossedShell = (plain = false): Record<string, unknown> =>
  Object.fromEntries(Object.entries(TAKERS).map(([n, taker]) => [n, plain ? (shell as Record<string, unknown>)[n] : cross((shell as Record<string, unknown>)[n], paramShape(taker), `${taker}.${n}`)]));
const A = linkAcorn();
const M = linkMd();
export const GIVEN = { parseTree: A.parseTree, childrenOf: A.childrenOf, kidsOf: A.kidsOf, nodeKind: A.nodeKind, TYPE_FIELDS: A.TYPE_FIELDS, leadingComments: A.leadingComments, mdRebinds: M.mdRebinds, mdPreludeCalls: M.mdPreludeCalls };
// over: cells in place of the port's (tc-diff.ts's controls); plain: the shell's functions without the boundary
export const linkTc = (over: Record<string, (...inputs: never[]) => unknown> = {}, plain = false) =>
  link({ ...TC_CELLS, ...over } as typeof TC_CELLS, prelude, { ...GIVEN, ...crossedShell(plain) });

// the shipped files' API over a linked set of cells
export function api(L: ReturnType<typeof linkTc>) {
  const infoMemo = new WeakMap<object, Map<string, TcInfo>>();
  const tcInfo = (c: CellInfo): TcInfo => ({ name: c.name, returnsRef: c.returnsRef, generator: c.generator, compiles: c.compiles.map((s) => ({ refs: s.refs })), params: c.params.map((p) => ({ name: p.name, refTyped: p.refTyped, eventsTyped: p.eventsTyped, boundary: p.boundary ?? null })) });
  const factsOf = (f: ReadonlyMap<string, CellInfo> | null | undefined): Map<string, TcInfo> | null => {
    if (!f) return null;
    let m = infoMemo.get(f);
    if (!m) { m = new Map([...f].map(([k, v]) => [k, tcInfo(v)])); infoMemo.set(f, m); }
    return m;
  };
  const toTc = (c: orig.Context | undefined): TcCtx => !c ? { generators: new Set(), events: new Set(), accepted: null, facts: null, why: null, inputs: null, module: null } : {
    generators: new Set(c.generators), events: new Set(c.events), accepted: c.accepted ? new Set(c.accepted) : null, facts: factsOf(c.facts),
    why: c.why ? new Map(c.why) : null, inputs: c.inputs ? new Map(Object.entries(c.inputs)) : null, module: c.module ?? null,
  };
  const fromTc = (c: TcCtx, facts: ReadonlyMap<string, CellInfo> | null = null): orig.Context => ({ generators: c.generators, events: c.events, accepted: c.accepted, facts, why: c.why });
  type CheckLike = Parameters<typeof orig.acceptedOf>[0];
  const toCheck = (r: CheckLike): TcCheck => ({
    cells: r.cells.map((c) => ({ name: c.name, status: c.status, errors: c.errors, unsupported: c.unsupported ?? [], blockedBy: c.blockedBy ?? [] })),
    facts: factsOf(r.facts), unparsed: r.unparsed ? new Map(r.unparsed) : null,
  });
  const langs = new Map<string, string | null>();
  const langOf = (js: string): string | null => {
    const hit = langs.get(js);
    if (hit !== undefined) return hit;
    const lang = L.tcLangOf(js);
    if (langs.size > 4096) langs.delete(langs.keys().next().value!);
    langs.set(js, lang);
    return lang;
  };
  const parsed = new Map<string, TcCompiled | null>();
  const parseCompiled = (definition: string): TcCompiled | null => {
    const hit = parsed.get(definition);
    if (hit !== undefined) return hit;
    const out = L.tcParseCompiled(definition);
    if (parsed.size > 4096) parsed.delete(parsed.keys().next().value!);
    parsed.set(definition, out);
    return out;
  };
  const rec = (m: Map<string, string>) => Object.fromEntries(m);
  return {
    LANG: L.tcLANG, STATE_VALUE: L.tcSTATE_VALUE, RUNTIME_CELLS: L.tcRuntimeCells, INPUTS: rec(L.tcINPUTS),
    inputsIn: (runtimeModule: boolean) => rec(L.tcInputsIn(runtimeModule)),
    splitCells: (src: string, tsx: boolean) => L.tcSplitCells(src, tsx),
    contextOf: (texts: string[], tsx: boolean, accepted: ReadonlySet<string> | null = null) => fromTc(L.tcContextOf(texts, tsx, accepted ? new Set(accepted) : null)),
    acceptedOf: (r: CheckLike) => L.tcAcceptedOf(toCheck(r)),
    whyOf: (r: CheckLike, c: CheckLike["cells"][number]) => L.tcWhyOf(toCheck(r), { name: c.name, status: c.status, errors: c.errors, unsupported: c.unsupported ?? [], blockedBy: c.blockedBy ?? [] }),
    contextFromCheck: (r: CheckLike, _source?: string, _tsx = true) => fromTc(L.tcContextFromCheck(toCheck(r)), r.facts ?? null),
    cellStates: (r: CheckLike) => L.tcCellStates(toCheck(r)),
    variableName: L.tcVariableName, keyOfVariable: L.tcKeyOfVariable, isDuplicateKey: L.tcIsDuplicateKey, handleName: L.tcHandleName, cellOfVariable: L.tcCellOfVariable,
    compileCell: (t: string, tsx: boolean, c?: orig.Context, nameHint: string | null = null): TcVar[] => L.tcCompileCell(t, tsx, toTc(c), nameHint),
    compileCellText: (t: string, tsx: boolean, c?: orig.Context, nameHint: string | null = null): string => L.tcCompileCellText(t, tsx, toTc(c), nameHint),
    compileModule: (src: string, tsx: boolean, accepted: ReadonlySet<string> | null = null) => L.tcCompileModule(src, tsx, accepted ? new Set(accepted) : null),
    langOf, parseCompiled,
    compiledKind: (d: string) => { const p = parseCompiled(d); return p === null || p.callee === null ? null : { callee: p.callee, kind: L.tcKinds.get(p.callee) ?? null, refs: p.refs }; },
    decompileVariable: (d: string) => L.tcDecompileVariable(d),
    decompileModule: (ds: string[]) => L.tcDecompileModule(ds),
    // comment-types.ts
    esc: L.tcEsc, unesc: L.tcUnesc, commentTypes: (src: string) => L.tcCommentTypes(src).text, uncommentTypes: L.tcUncommentTypes, compile: L.tcCompileTypes, decompile: L.tcDecompileTypes,
    // erase.ts
    erase: L.tcErase,
    // module-js.ts
    moduleJs: L.tcModuleJs, syntaxStub: L.tcSyntaxStub,
    // not ported: the shell
    declaredNameAt: orig.declaredNameAt, declaredName: orig.declaredName, tokensOf: orig.tokensOf, paramsOf: orig.paramsOf,
    fromObservableVariables: L.tcFromObservableVariables,
  };
}
// the functions of the shipped files the cells give (the rest of api() is the shipped code)
export const PORTED = new Set(["LANG", "STATE_VALUE", "RUNTIME_CELLS", "INPUTS", "inputsIn", "splitCells", "contextOf", "acceptedOf", "whyOf", "contextFromCheck", "cellStates",
  "variableName", "keyOfVariable", "isDuplicateKey", "handleName", "cellOfVariable", "compileCell", "compileCellText", "compileModule", "langOf", "parseCompiled", "compiledKind",
  "decompileVariable", "decompileModule", "esc", "unesc", "commentTypes", "uncommentTypes", "compile", "decompile", "erase", "moduleJs", "syntaxStub", "fromObservableVariables"]);
export const TC = api(linkTc());
