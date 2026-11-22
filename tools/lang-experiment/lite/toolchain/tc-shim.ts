// The exports of ss-toolchain.ts, comment-types.ts, module-js.ts and ../browser/erase.ts over a linked copy of the tc
// cells, one of them broken when TC_CONTROL is set, for tc-preload.ts: a test that passes on the shipped files and fails
// here runs on the cells. Until 2026-11-22 this put the cells in place of the shipped functions.
import { toolchainOf, TC } from "./ss-toolchain.ts";
import { linkTc } from "./tc-index.ts";

// TC_CONTROL=<name>: one broken cell, to show a test runs on the cells
const CONTROLS: Record<string, Record<string, (...x: any[]) => unknown>> = {
  args: { tcArgsParts: (tcArgParts: any, tcT: any) => (info: any, refs: any, IN: any, mod: any) => info.params.flatMap((p: any, i: number) => [...(i > 0 ? [tcT(",")] : []), ...tcArgParts(p, info.name, refs, IN, mod)]) },
  edits: { tcApplyEdits: () => (src: string) => src },
  ownthis: { tcOwnThis: () => () => null },
  lang: { tcLangOf: () => () => null },
};
const control = process.env.TC_CONTROL;
if (control && !CONTROLS[control]) throw new Error(`TC_CONTROL ${control}: no such control`);
const T = toolchainOf({ ...TC, ...linkTc(control ? CONTROLS[control] : {}) });
export const { LANG, STATE_VALUE, RUNTIME_CELLS, INPUTS, inputsIn, splitCells, contextOf, acceptedOf, whyOf, contextFromCheck, cellStates, variableName, keyOfVariable, isDuplicateKey, handleName, cellOfVariable,
  compileCell, compileCellText, compileModule, langOf, compiledKind, decompileVariable, decompileModule, esc, unesc, commentTypes, uncommentTypes, compile, decompile, erase, moduleJs, syntaxStub,
  parseCompiled, fromObservableVariables } = T;
export { declaredNameAt, declaredName, tokensOf, paramsOf } from "./tc-shell.ts";
