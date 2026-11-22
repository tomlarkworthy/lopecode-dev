// The acorn cells linked for bun (../link.ts) as the notebook runs them: acornParse (acorn-shell.ts) reaches
// parseTree through the boundary's wrapper (../boundary.ts cross) with the shape the checker gives parseTree's
// parameter, computed here from the declarations over the registry cells, linked here with acornParse as it is before
// crossing (core.ts computes the same shape; acorn.test.ts checks the two are equal).
// Linking does not run the checker; in the notebook these are compiled cells of @tomlarkworthy/soundscript-checker.
import { readFileSync } from "node:fs";
import { join } from "node:path";
// a section of types only, which the build reaches through this import
import "./acorn-types.ss.ts";
import * as kidsCells from "./acorn-kids.ss.ts";
import * as treeCells from "./acorn.ss.ts";
import * as syntaxCells from "./syntax.ss.ts";
import * as messageCells from "../messages.ss.ts";
import { acornParse } from "./acorn-shell.ts";
import { cross, boundaryShape, type Shape } from "../boundary.ts";
import * as rgCtl from "../infer/rg-ctl.ss.ts";
import * as rgConvert from "../infer/rg-convert.ss.ts";
import * as rgSig from "../infer/rg-sig.ss.ts";
import * as rgExpand from "../infer/rg-expand.ss.ts";
import * as rgLoad from "../infer/rg-load.ss.ts";
import * as rgView from "../infer/rg-view.ss.ts";
import { rgRegistryOf, declTreesOf } from "../infer/rg-registry.ts";
import * as T from "../types.ts";
import type { AstNode } from "./acorn-types.ss.ts";
import { link } from "../link.ts";
import * as prelude from "../../prelude.runtime.ts";
export type * from "./acorn-types.ss.ts";
export type { FnNode } from "./acorn.ss.ts";
export type { ModErr, CellAt, ModuleShape, SyntaxDiag, SyntaxResult } from "./syntax.ss.ts";

// the annotation of the first parameter of the cell named cell, in a typed tree's statements
function firstParamType(body: AstNode[], cell: string): AstNode {
  for (const st of body) {
    const d = st.type === "ExportNamedDeclaration" ? st.declaration : st;
    if (d === null || d.type !== "VariableDeclaration") continue;
    const x = d.declarations[0];
    if (x === undefined || x.id.type !== "Identifier" || x.id.name !== cell || x.init === null || x.init.type !== "ArrowFunctionExpression") continue;
    const p = x.init.params[0];
    if (p !== undefined && p.type === "Identifier" && p.typeAnnotation !== null && p.typeAnnotation.type === "TSTypeAnnotation") return p.typeAnnotation.typeAnnotation;
  }
  throw new Error(`no cell ${cell} with an annotated first parameter`);
}
// the boundary shape of the first parameter of the cell named cell, declared in text: over the registry cells, with
// the acorn cells linked to acornParse as it is (lite/toolchain/tc-index.ts takes it for the tc shell)
export function firstParamShape(text: string, cell: string): Shape {
  const A0 = link({ ...kidsCells, ...treeCells, ...messageCells, ...syntaxCells }, prelude, { acornParse });
  const R0 = link({ ...rgCtl, ...rgConvert, ...rgSig, ...rgExpand, ...rgLoad, ...rgView }, prelude,
    { ...T, kidsOf: A0.kidsOf, nodeKind: A0.nodeKind, isFnNode: A0.isFnNode, childrenOf: A0.childrenOf, TYPE_FIELDS: A0.TYPE_FIELDS, leadingComments: A0.leadingComments });
  const reg = rgRegistryOf({ ...R0, parseTree: A0.parseTree }, true, declTreesOf(A0.parseTree));
  const P = A0.parseTree(text, false);
  if (!P.ok) throw new Error(P.message);
  reg.load(P.ast, "user", true);
  const t = reg.convert(firstParamType(P.ast.program.type === "Program" ? P.ast.program.body : [], cell), { tps: new Set(), look: null, ast: P.ast, origin: "user" });
  const gap = reg.gap();
  if (gap !== null) throw new Error(`${cell}'s parameter: the registry cannot read a type (${gap})`);
  const s = boundaryShape(t, (x) => reg.expand(x), (n) => reg.isAlias(n), true);
  if ("error" in s) throw new Error(`${cell}'s parameter does not cross: ${s.error}`);
  return s;
}
// the shape of parseTree's parameter, from acorn-types.ss.ts and its annotation in acorn.ss.ts
export const parseTreeShape = (): Shape => firstParamShape(["acorn-types.ss.ts", "acorn.ss.ts"].map((f) => readFileSync(join(import.meta.dir, f), "utf8")).join("\n"), "parseTree");
const given = { acornParse: cross(acornParse, parseTreeShape(), "parseTree.acornParse") };
// over: cells to put in place of the file's (syntax.test.ts's controls)
export const linkAcorn = (over: Record<string, (...inputs: never[]) => unknown> = {}) => link({ ...kidsCells, ...treeCells, ...messageCells, ...syntaxCells, ...over }, prelude, given);
const L = linkAcorn();
export const { parseTree, lineStarts, lineIn, lineAt, leadingComments, nodeKind, isFnNode, TYPE_FIELDS, kidsOf, byNid, parentNids, preorder, childrenOf } = L;
export const { syntaxCheck, distinctParse, moduleShape, syntaxBans } = L;
