// bun k3.ts [file] [--list]: over the shipped cell sources, locals (const/let with an initializer, unannotated or annotated Mut<…>) written (member
// write, ++/--, mutating method) at a text position after an escape: identifier as a call argument, returned (return x /
// arrow body x), element/property of a literal, yielded/awaited, RHS of an annotated declaration or of an assignment,
// or referenced inside a nested function that is not immediately called. AST walk (TypeScript compiler API).
import ts from "typescript";
import { readFileSync } from "node:fs";
import { Glob } from "bun";
const ROOT = process.argv[2] && !process.argv[2].startsWith("--") ? "" : new URL("../../../", import.meta.url).pathname;
const files = process.argv[2] && !process.argv[2].startsWith("--") ? [process.argv[2]] : [...new Glob("lite/**/*.ss.ts").scanSync(ROOT)].filter((f) => !f.includes(".scratch") && !f.includes("node_modules"))
  .concat([...new Glob("lite/notebook/examples/*.{ts,tsx}").scanSync(ROOT)], [...new Glob("lite/soundscript/spec-*.ts").scanSync(ROOT)]).sort();
const MUT = new Set("push pop shift unshift splice sort reverse fill copyWithin set add delete clear".split(" "));
type Hit = { file: string; name: string; line: number; esc: string; escLine: number; wr: string; wrLine: number };
const isMutT = (t: ts.TypeNode) => ts.isTypeReferenceNode(t) && ts.isIdentifier(t.typeName) && t.typeName.text === "Mut";
const hits: Hit[] = []; let locals = 0, written = 0;
const isFn = (n: ts.Node): n is ts.FunctionLikeDeclaration => ts.isArrowFunction(n) || ts.isFunctionExpression(n) || ts.isFunctionDeclaration(n) || ts.isMethodDeclaration(n);
const iife = (f: ts.Node) => { let p = f.parent; while (p && ts.isParenthesizedExpression(p)) p = p.parent; return p && ts.isCallExpression(p) && (p.expression === f || ts.isParenthesizedExpression(p.expression)); };
for (const file of files) {
  const text = readFileSync(ROOT + file, "utf8");
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const ln = (p: number) => sf.getLineAndCharacterOfPosition(p).line + 1;
  const visitDecl = (d: ts.VariableDeclaration) => {
    if (!ts.isIdentifier(d.name) || !d.initializer || (d.type && !isMutT(d.type))) return;
    const name = d.name.text;
    // the scope: nearest enclosing function body (or source file)
    let scope: ts.Node = d; while (scope.parent && !isFn(scope.parent) && !ts.isSourceFile(scope.parent)) scope = scope.parent;
    const body = scope.parent && isFn(scope.parent) ? scope.parent : sf;
    locals++;
    const escs: { pos: number; why: string; node?: ts.Node }[] = [], wrs: { pos: number; why: string; node?: ts.Node }[] = [];
    const walk = (n: ts.Node, nestedFn: ts.Node | null) => {
      if (n !== body && isFn(n)) {
        // a nested function redeclaring the name as a parameter shadows it
        if (n.parameters.some((p) => ts.isIdentifier(p.name) && p.name.text === name)) return;
        const kept = !iife(n);
        ts.forEachChild(n, (c) => walk(c, nestedFn ?? (kept ? n : null)));
        return;
      }
      if (ts.isIdentifier(n) && n.text === name && n !== d.name && n.pos > d.pos) {
        const p = n.parent;
        if (nestedFn) escs.push({ pos: nestedFn.getStart(), why: "captured", node: nestedFn });
        if (ts.isCallExpression(p) && p.arguments.includes(n as any)) escs.push({ pos: n.getStart(), why: "arg", node: n });
        else if (ts.isNewExpression(p) && p.arguments?.includes(n as any)) escs.push({ pos: n.getStart(), why: "arg" });
        else if (ts.isReturnStatement(p)) escs.push({ pos: n.getStart(), why: "return" });
        else if (ts.isArrowFunction(p) && p.body === n) escs.push({ pos: n.getStart(), why: "return" });
        else if (ts.isArrayLiteralExpression(p) || ts.isShorthandPropertyAssignment(p) || (ts.isPropertyAssignment(p) && p.initializer === n)) escs.push({ pos: n.getStart(), why: "literal", node: n });
        else if (ts.isYieldExpression(p) || ts.isAwaitExpression(p)) escs.push({ pos: n.getStart(), why: "yield/await" });
        else if (ts.isVariableDeclaration(p) && p.initializer === n && p.type && !isMutT(p.type)) escs.push({ pos: n.getStart(), why: "annot-init", node: n });
        else if (ts.isBinaryExpression(p) && p.right === n && p.operatorToken.kind === ts.SyntaxKind.EqualsToken) escs.push({ pos: n.getStart(), why: "assign-rhs", node: n });
        else if (ts.isJsxExpression(p)) escs.push({ pos: n.getStart(), why: "jsx" });
        // writes: x.a = / x[i] = / x.a++ / x.m(...) mutating
        if ((ts.isPropertyAccessExpression(p) || ts.isElementAccessExpression(p)) && p.expression === n) {
          const g = p.parent;
          if (ts.isBinaryExpression(g) && g.left === p && g.operatorToken.kind >= ts.SyntaxKind.FirstAssignment && g.operatorToken.kind <= ts.SyntaxKind.LastAssignment) wrs.push({ pos: g.getStart(), why: "member=", node: g });
          else if ((ts.isPrefixUnaryExpression(g) || ts.isPostfixUnaryExpression(g)) && (g.operator === ts.SyntaxKind.PlusPlusToken || g.operator === ts.SyntaxKind.MinusMinusToken)) wrs.push({ pos: g.getStart(), why: "member++", node: g });
          else if (ts.isPropertyAccessExpression(p) && MUT.has(p.name.text) && ts.isCallExpression(g) && g.expression === p) wrs.push({ pos: g.getStart(), why: "." + p.name.text, node: g });
          else if (ts.isDeleteExpression(g)) wrs.push({ pos: g.getStart(), why: "delete", node: g });
        }
      }
      ts.forEachChild(n, (c) => walk(c, nestedFn));
    };
    ts.forEachChild(body, (c) => walk(c, null));
    if (wrs.length) written++;
    const e0 = escs.sort((a, b) => a.pos - b.pos)[0];
    const w = e0 && wrs.filter((w) => w.pos > e0.pos).sort((a, b) => a.pos - b.pos)[0];
    if (e0 && w) hits.push({ file, name, line: ln(d.getStart()), esc: e0.why, escLine: ln(e0.pos), wr: w.why, wrLine: ln(w.pos) });
    else {
      // a write textually before an escape that a loop enclosing both runs again after it (back edge)
      const loopOf = (n: ts.Node): ts.Node[] => { const ls: ts.Node[] = []; for (let q = n.parent; q && q !== body; q = q.parent) if (ts.isIterationStatement(q, false)) ls.push(q); return ls; };
      const back = escs.flatMap((e) => (e.node ? wrs.filter((w) => w.node && w.pos < e.pos && loopOf(e.node!).some((l) => loopOf(w.node!).includes(l))).map((w) => [e, w] as const) : []))[0];
      if (back) hits.push({ file, name, line: ln(d.getStart()), esc: back[0].why + "(loop)", escLine: ln(back[0].pos), wr: back[1].why, wrLine: ln(back[1].pos) });
    }
  };
  const v = (n: ts.Node): void => { if (ts.isVariableDeclaration(n)) visitDecl(n); ts.forEachChild(n, v); };
  v(sf);
}
const by = (k: keyof Hit) => Object.entries(hits.reduce((m: Record<string, number>, h) => ((m[h[k] as string] = (m[h[k] as string] ?? 0) + 1), m), {})).sort((a, b) => b[1] - a[1]);
console.log(`files ${files.length}, unannotated initialised locals ${locals}, written ${written}, written after an escape ${hits.length}`);
console.log("first escape:", JSON.stringify(by("esc")));
console.log("files:", JSON.stringify(by("file").slice(0, 12)));
if (process.argv.includes("--list")) for (const h of hits) console.log(`${h.file}:${h.line} ${h.name} esc ${h.esc}@${h.escLine} write ${h.wr}@${h.wrLine}`);
