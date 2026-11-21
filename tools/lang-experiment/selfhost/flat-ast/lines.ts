// Code lines (as checker-survey/inventory.ts counts: lines holding a non-comment token) of each original and its port,
// located on the AST; the largest port cell; and, over the checker sources, the counts the whole-checker estimate uses.
// Run: bun selfhost/flat-ast/lines.ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "../../lite/parse.ts";
import { codeLines } from "./q2.ts";
import { CHECKER_FILES } from "./kinds.ts";

const ROOT = join(import.meta.dir, "../.."), HERE = import.meta.dir;
const top = (file: string) => { const src = readFileSync(file, "utf8"); return { src, P: parse(src) }; };
const declName = (s: any) => { const d = s.type === "ExportNamedDeclaration" && s.declaration ? s.declaration : s; return d.id?.name ?? d.declarations?.[0]?.id?.name ?? null; };
// lines of the named top-level declarations of a file
function linesOf(file: string, names: string[]): number {
  const { P } = top(file);
  return P.program.body.filter((s: any) => names.includes(declName(s))).reduce((n: number, s: any) => n + codeLines(file, s.start, s.end), 0);
}
// cell sizes of a port file
function cells(file: string) {
  const { P } = top(file);
  return P.program.body.filter((s: any) => s.type === "ExportNamedDeclaration" && s.declaration?.type === "VariableDeclaration").map((s: any) => ({ name: declName(s), lines: codeLines(file, s.start, s.end) }));
}
// checkSources' module-shape statements: from `const cells` through the loop over cells with `seen`, plus the clash loop
function shapeLoopLines(): number {
  const file = join(ROOT, "lite/core.ts"), { P } = top(file);
  const cs = P.program.body.map((s: any) => (s.type === "ExportNamedDeclaration" ? s.declaration : s)).find((d: any) => d?.type === "FunctionDeclaration" && d.id.name === "checkSources");
  const body = cs.body.body;
  const from = body.findIndex((s: any) => s.type === "VariableDeclaration" && s.declarations[0].id.name === "cells");
  const seenAt = body.findIndex((s: any) => s.type === "VariableDeclaration" && s.declarations[0].id.name === "seen");
  // the statements from `const cells` to the loop after `const seen`, without `reg.load` (counted as one line either way)
  return body.slice(from, seenAt + 2).reduce((n: number, s: any) => n + codeLines(file, s.start, s.end), 0);
}

if (import.meta.main) {
  const A = join(HERE, "visit-a.ss.ts"), B = join(HERE, "visit-b.ss.ts"), C = join(HERE, "visit-c.ss.ts");
  const core = join(ROOT, "lite/core.ts"), cap = join(ROOT, "lite/capture.ts"), pars = join(ROOT, "lite/parse.ts");
  const groups: [string, number, string[], string[]?][] = [
    ["module shape", shapeLoopLines(), ["declOf", "typeClash", "isTypeStatement", "declaratorCell", "moduleLevelRule", "Found", "statementCells", "moduleShape", "kindOf"]],
    ["syntax pass", linesOf(core, ["syntaxPass", "SYNTAX", "TYPE_POSITIONS"]), ["Diag", "SYNTAX", "TYPE_POSITIONS", "typeRows", "namedByParent", "argumentsAsName", "isAsConst", "reservedAt", "argumentsAt", "bansAt", "syntaxPass"],
      ["kid", "text", "flag", "Diag", "SYNTAX", "TYPE_POSITIONS", "typeRows", "namedByParent", "argumentsAsName", "isAsConst", "reservedAt", "argumentsAt", "bansAt", "syntaxPass"]],
    ["captures", linesOf(cap, ["isActionCall", "refs", "bound", "declaredIn", "captures"]), ["Capture", "isActionCall", "readsBinding", "refs", "bound", "declares", "declaredIn", "outsideActions", "Local", "localOf", "spreadTaint", "actionCaptures", "captures"]],
  ];
  for (const [name, orig, portA, portB] of groups) {
    const portC = name === "syntax pass" ? `; port C ${linesOf(C, ["tree", "Diag", "SYNTAX", "TYPE_POSITIONS", "kindOf", "typeRows", "namedByParent", "argumentsAsName", "isAsConst", "reservedAt", "argumentsAt", "bansAt", "syntaxPass"])} (with kindOf and tree)` : "";
    console.log(`${name}: original ${orig} code lines; port A ${linesOf(A, portA)}${portB ? `; port B ${linesOf(B, portB)}` : ""}${portC}`);
  }
  console.log(`line + leading: parse.ts ${(() => { const { P, src } = top(pars); const f = P.program.body.find((s: any) => declName(s) === "parse"); return f ? "inside parse(), see RESULTS" : "?"; })()}; port A ${linesOf(A, ["lineOf", "leading"])}`);
  const ca = cells(A), cb = cells(B);
  const big = (cs: { name: string; lines: number }[]) => cs.toSorted((a, b) => b.lines - a.lines).slice(0, 3).map((c) => `${c.name} ${c.lines}`).join(", ");
  console.log(`visit-a.ss.ts: ${ca.length} cells, ${codeLines(A)} code lines; largest ${big(ca)}`);
  console.log(`visit-b.ss.ts: ${cb.length} cells, ${codeLines(B)} code lines; largest ${big(cb)}`);

  // whole checker: functions and methods with a parameter annotated Node, and the calls to them by name
  const takesNode = new Set<string>();
  let typeReads = 0, forIn = 0;
  const walk = (n: any, f: (x: any) => void) => { if (!n || typeof n !== "object") return; if (Array.isArray(n)) return n.forEach((x) => walk(x, f)); if (typeof n.type !== "string") return; f(n); for (const k in n) if (k !== "loc") walk(n[k], f); };
  const isNodeAnn = (p: any) => { const a = (p.type === "AssignmentPattern" ? p.left : p).typeAnnotation?.typeAnnotation; return a?.type === "TSTypeReference" && a.typeName.name === "Node" || (a?.type === "TSUnionType" && a.types.some((t: any) => t.type === "TSTypeReference" && t.typeName.name === "Node")); };
  const files = CHECKER_FILES.filter((f) => !f.endsWith(".ss.ts"));
  for (const file of files) {
    const { P } = top(join(ROOT, file));
    walk(P.program, (x) => {
      const fn = x.type === "MethodDefinition" ? x.value : x.type === "FunctionDeclaration" || ((x.type === "ArrowFunctionExpression" || x.type === "FunctionExpression")) ? x : null;
      const name = x.type === "MethodDefinition" ? x.key.name : x.type === "FunctionDeclaration" ? x.id?.name : null;
      if (fn && name && fn.params.some(isNodeAnn)) takesNode.add(name);
      if (x.type === "VariableDeclarator" && x.id.type === "Identifier" && (x.init?.type === "ArrowFunctionExpression" || x.init?.type === "FunctionExpression") && x.init.params.some(isNodeAnn)) takesNode.add(x.id.name);
      if (x.type === "MemberExpression" && !x.computed && x.property.name === "type") typeReads++;
      if (x.type === "ForInStatement") forIn++;
    });
  }
  let calls = 0;
  for (const file of files) {
    const { P } = top(join(ROOT, file));
    walk(P.program, (x) => {
      if (x.type !== "CallExpression") return;
      const c = x.callee, name = c.type === "Identifier" ? c.name : c.type === "MemberExpression" && !c.computed ? c.property.name : null;
      if (name && takesNode.has(name)) calls++;
    });
  }
  console.log(`checker .ts files (${files.length}): ${takesNode.size} functions/methods take a Node parameter; ${calls} call sites call one by name; ${typeReads} .type reads; ${forIn} for-in loops`);
}
