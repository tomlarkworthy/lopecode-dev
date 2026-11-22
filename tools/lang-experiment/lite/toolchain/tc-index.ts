// The tc cells (tc-*.ss.ts) linked for bun (../link.ts) as the notebook runs them: each value of tc-shell.ts reaches
// its cell through the boundary's wrapper (../boundary.ts cross) with the shape the checker gives the parameter, as
// acorn/index.ts gives acornParse. Linking does not run the checker; in the notebook these are compiled cells of
// @tomlarkworthy/soundscript-checker, and the glue that runs them is ss-toolchain.ts, comment-types.ts, module-js.ts
// and ../browser/erase.ts.
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
import { linkAcorn, firstParamShape } from "../acorn/index.ts";
import { linkMd } from "../infer-ss.ts";
import { cross, type Shape } from "../boundary.ts";
import * as prelude from "../../prelude.runtime.ts";
export type * from "./tc-types.ss.ts";

export const TC_FILES = ["types", "text", "cuts", "free", "build", "ctx", "decomp", "modjs"].map((x) => `tc-${x}.ss.ts`);
export const TC_CELLS = { ...text, ...cuts, ...free, ...build, ...ctxCells, ...decomp, ...modjs };

// the shape of the first parameter of a cell of tc-text.ss.ts, from its annotation
const paramShape = (cell: string): Shape => firstParamShape(["../acorn/acorn-types.ss.ts", "tc-types.ss.ts", "tc-text.ss.ts"].map((f) => readFileSync(join(import.meta.dir, f), "utf8")).join("\n"), cell);
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
export type TcLinked = ReturnType<typeof linkTc>;
// the cells the glue calls, by name
export const {
  tcLANG, tcSTATE_VALUE, tcRuntimeCells, tcINPUTS, tcInputsIn, tcSplitCells, tcContextOf, tcAcceptedOf, tcWhyOf, tcContextFromCheck, tcCellStates,
  tcVariableName, tcKeyOfVariable, tcIsDuplicateKey, tcHandleName, tcCellOfVariable, tcCompileCell, tcCompileCellText, tcCompileModule, tcLangOf,
  tcParseCompiled, tcKinds, tcDecompileVariable, tcDecompileModule, tcEsc, tcUnesc, tcCommentTypes, tcUncommentTypes, tcCompileTypes, tcDecompileTypes,
  tcErase, tcModuleJs, tcSyntaxStub, tcFromObservableVariables,
} = linkTc();
