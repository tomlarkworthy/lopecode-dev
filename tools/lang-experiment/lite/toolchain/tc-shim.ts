// The exports of ss-toolchain.ts, comment-types.ts, module-js.ts and ../browser/erase.ts with the tc cells in place
// of every ported function, for tc-preload.ts. 
import * as orig from "./ss-toolchain.ts";
import { api, linkTc } from "./tc-index.ts";

// TC_CONTROL=<name>: one broken cell, to show a test runs on the cells
const CONTROLS: Record<string, Record<string, (...x: any[]) => unknown>> = {
  args: { tcArgsParts: (tcArgParts: any, tcT: any) => (info: any, refs: any, IN: any, mod: any) => info.params.flatMap((p: any, i: number) => [...(i > 0 ? [tcT(",")] : []), ...tcArgParts(p, info.name, refs, IN, mod)]) },
  edits: { tcApplyEdits: () => (src: string) => src },
  ownthis: { tcOwnThis: () => () => null },
  lang: { tcLangOf: () => () => null },
};
const control = process.env.TC_CONTROL;
if (control && !CONTROLS[control]) throw new Error(`TC_CONTROL ${control}: no such control`);
const T = api(linkTc(control ? CONTROLS[control] : {}));
export const { LANG, STATE_VALUE, RUNTIME_CELLS, INPUTS, inputsIn, splitCells, contextOf, acceptedOf, whyOf, contextFromCheck, cellStates, variableName, keyOfVariable, isDuplicateKey, handleName, cellOfVariable,
  compileCell, compileCellText, compileModule, langOf, compiledKind, decompileVariable, decompileModule, esc, unesc, commentTypes, uncommentTypes, compile, decompile, erase, moduleJs, syntaxStub } = T;
// the port's parseCompiled is plain data; a test that reads acorn nodes (call, fn) reads today's for those two fields
export const parseCompiled = (d: string) => { const p = T.parseCompiled(d); return p && { ...p, call: orig.parseCompiled(d)?.call, fn: orig.parseCompiled(d)?.fn }; };
export const fromObservableVariables = (vars: Parameters<typeof orig.fromObservableVariables>[0], opts: { expression?: boolean } = {}) => {
  const r = T.fromObservableVariables(vars, opts.expression ?? null);
  return r.text !== null ? { text: r.text } : { reason: r.reason };
};
export const { declaredNameAt, declaredName, tokensOf, paramsOf } = orig;
