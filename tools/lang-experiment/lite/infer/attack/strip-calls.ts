// The S4 language change (2026-11-22) on the TypeScript AST, for the attack programs written before it (their folders
// are not edited): every call mut(e) / freeze(e) / borrow(e) becomes e, parenthesised where its place needs it; mut<T>(e)
// as an unannotated declarator's initializer gives the binding the annotation Mut<T>. A copy of
// lite/soundscript/.scratch/holes5/codemod.ts rewriteSS, which rewrote the shipped code.
import ts from "typescript";
import { readFileSync, writeFileSync } from "node:fs";

const NAMES = new Set(["mut", "freeze", "borrow"]);
const odd: string[] = [];

const parse = (src: string, tsx: boolean) => {
  const sf = ts.createSourceFile("x." + (tsx ? "tsx" : "ts"), src, ts.ScriptTarget.Latest, true, tsx ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  return { sf, ok: ((sf as any).parseDiagnostics ?? []).length === 0 };
};
const isTarget = (n: ts.Node): n is ts.CallExpression =>
  ts.isCallExpression(n) && ts.isIdentifier(n.expression) && NAMES.has(n.expression.text) && n.arguments.length === 1;
// an argument that may stand where the call stood with no parentheses
const primary = (a: ts.Expression) => ts.isIdentifier(a) || ts.isCallExpression(a) || ts.isPropertyAccessExpression(a) || ts.isElementAccessExpression(a) ||
  ts.isArrayLiteralExpression(a) || ts.isParenthesizedExpression(a) || ts.isNewExpression(a) || ts.isStringLiteral(a) || ts.isNumericLiteral(a) ||
  ts.isNoSubstitutionTemplateLiteral(a) || ts.isTemplateExpression(a) || a.kind === ts.SyntaxKind.ThisKeyword || ts.isNonNullExpression(a);
const loose = (p: ts.Node, c: ts.Node) => ts.isVariableDeclaration(p) || ts.isReturnStatement(p) || ts.isArrayLiteralExpression(p) || ts.isSpreadElement(p) ||
  ts.isPropertyAssignment(p) || ts.isParenthesizedExpression(p) || ts.isExpressionStatement(p) || (ts.isCallExpression(p) && p.expression !== c) ||
  (ts.isNewExpression(p) && p.expression !== c) || (ts.isBinaryExpression(p) && p.operatorToken.kind === ts.SyntaxKind.EqualsToken && p.right === c) ||
  (ts.isArrowFunction(p) && p.body === c) || ts.isYieldExpression(p) || ts.isAwaitExpression(p) || ts.isShorthandPropertyAssignment(p);

// one pass: the outermost target calls; a nested one is rewritten on the next pass
function rewriteOnce(src: string, tsx: boolean, where: string): { out: string; n: number; typed: number } | null {
  const { sf, ok } = parse(src, tsx);
  if (!ok) return null;
  const edits: { s: number; e: number; t: string }[] = [];
  let typed = 0;
  const visit = (n: ts.Node) => {
    if (!isTarget(n)) return ts.forEachChild(n, visit);
    const a = n.arguments[0]!, p = n.parent;
    let text = src.slice(a.getStart(sf), a.end);
    const obj = ts.isObjectLiteralExpression(a);
    if (!primary(a) && !(loose(p, n) && !(obj && (ts.isArrowFunction(p) || ts.isExpressionStatement(p))))) text = `(${text})`;
    if (n.typeArguments?.length) {
      const T = src.slice(n.typeArguments[0]!.getStart(sf), n.typeArguments[n.typeArguments.length - 1]!.end);
      const name = (n.expression as ts.Identifier).text;
      if (ts.isVariableDeclaration(p) && p.initializer === n && !p.type && name === "mut") { edits.push({ s: p.name.end, e: p.name.end, t: `: Mut<${T}>` }); typed++; }
      else odd.push(`${where}: ${src.slice(n.getStart(sf), n.end).slice(0, 120)}`);
    }
    edits.push({ s: n.getStart(sf), e: n.end, t: text });
  };
  visit(sf);
  if (!edits.length) return { out: src, n: 0, typed };
  edits.sort((x, y) => y.s - x.s);
  let out = src;
  for (const ed of edits) out = out.slice(0, ed.s) + ed.t + out.slice(ed.e);
  return { out, n: edits.length - typed, typed };
}
export function rewriteSS(src: string, tsx: boolean, where: string): { out: string; n: number; typed: number } | null {
  let cur = src, n = 0, typed = 0;
  for (let i = 0; i < 8; i++) {
    const r = rewriteOnce(cur, tsx, where);
    if (r === null) return i === 0 ? null : { out: cur, n, typed };
    if (r.n === 0) break;
    cur = r.out; n += r.n; typed += r.typed;
  }
  return { out: cur, n, typed };
}
