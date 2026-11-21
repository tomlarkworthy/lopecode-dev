// The acorn cells linked for bun (../link.ts) as the notebook runs them: acornParse (acorn-shell.ts) reaches
// parseTree through the boundary's wrapper (../boundary.ts cross) with the shape the checker gives parseTree's
// parameter, computed here from the declarations as core.ts computes it (acorn.test.ts checks the two are equal).
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
import { Registry } from "../registry.ts";
import { parse, type Node } from "../parse.ts";
import { link } from "../link.ts";
import * as prelude from "../../prelude.runtime.ts";
export type * from "./acorn-types.ss.ts";
export type { FnNode } from "./acorn.ss.ts";
export type { ModErr, CellAt, ModuleShape, SyntaxDiag, SyntaxResult } from "./syntax.ss.ts";

// the shape of parseTree's parameter, from acorn-types.ss.ts and its annotation in acorn.ss.ts
export function parseTreeShape(): Shape {
  const P = parse(["acorn-types.ss.ts", "acorn.ss.ts"].map((f) => readFileSync(join(import.meta.dir, f), "utf8")).join("\n"));
  const reg = new Registry();
  reg.load(P, "user", true);
  const decl = (P.program.body as Node[]).map((st) => (st.type === "ExportNamedDeclaration" ? st.declaration : st)).find((d) => d?.type === "VariableDeclaration" && d.declarations[0].id.name === "parseTree");
  const s = boundaryShape(reg.convert(decl.declarations[0].init.params[0].typeAnnotation.typeAnnotation, { tps: new Set() }, P), (t) => reg.expand(t), (n) => reg.isAlias(n), true);
  if ("error" in s) throw new Error(`parseTree's parameter does not cross: ${s.error}`);
  return s;
}
const given = { acornParse: cross(acornParse, parseTreeShape(), "parseTree.acornParse") };
// over: cells to put in place of the file's (syntax.test.ts's controls)
export const linkAcorn = (over: Record<string, (...inputs: never[]) => unknown> = {}) => link({ ...kidsCells, ...treeCells, ...messageCells, ...syntaxCells, ...over }, prelude, given);
const L = linkAcorn();
export const { parseTree, lineStarts, lineIn, lineAt, leadingComments, nodeKind, isFnNode, TYPE_FIELDS, kidsOf, byNid, parentNids, preorder, childrenOf } = L;
export const { syntaxCheck, distinctParse, moduleShape, syntaxBans } = L;
