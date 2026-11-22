// bun codemod.ts <tree>: rewrite <tree>/lite/infer/{ix,md}-*.ss.ts in place so the four tables travel as one group.
// On the TypeScript AST (symbols from a ts.Program over the files): a parameter run `T: IxTypes, V: IxVars, W: IxFlows,
// C: IxCtls` (in that order, adjacent) of a function or a function type becomes `G: IxTabs`; inside such a function a
// reference to one of those parameters becomes `G.T` (`G.V`, ...); an argument run `T, V, W, C` of four references to
// such parameters becomes `G`. The cells that make the tables (ixCheckFn, mdCell, mdInferFn) are edited by hand
// afterwards (refactor.ts). Prints per file the edits made.
import ts from "typescript";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
const D = join(import.meta.dir, process.argv[2] ?? "refac", "lite/infer");
const files = readdirSync(D).filter((f) => /^(ix|md)-.*\.ss\.ts$/.test(f)).map((f) => join(D, f));
const prog = ts.createProgram(files, { noLib: true, noResolve: true, allowJs: false, target: ts.ScriptTarget.Latest });
const ck = prog.getTypeChecker();
const RUN = [["T", "IxTypes"], ["V", "IxVars"], ["W", "IxFlows"], ["C", "IxCtls"]];
type Edit = { s: number; e: number; t: string };
const runAt = (ps: readonly ts.ParameterDeclaration[]): number => {
  for (let i = 0; i + 4 <= ps.length; i++)
    if (RUN.every(([n, ty], k) => { const p = ps[i + k]!; return p.name.getText() === n && p.type?.getText() === ty; })) return i;
  return -1;
};
let total = 0;
for (const f of files) {
  const sf = prog.getSourceFile(f)!;
  const edits: Edit[] = [];
  const grouped = new Set<ts.Symbol>();
  const skip: [number, number][] = [];
  const fnLike = (n: ts.Node): n is ts.SignatureDeclaration => ts.isArrowFunction(n) || ts.isFunctionExpression(n) || ts.isFunctionDeclaration(n) || ts.isFunctionTypeNode(n);
  const visit = (n: ts.Node) => {
    if (fnLike(n)) {
      const i = runAt(n.parameters);
      if (i >= 0) {
        const ps = n.parameters;
        edits.push({ s: ps[i]!.getStart(), e: ps[i + 3]!.getEnd(), t: "G: IxTabs" });
        for (let k = 0; k < 4; k++) { const s = ck.getSymbolAtLocation(ps[i + k]!.name); if (s) grouped.add(s); }
      }
    }
    if (ts.isCallExpression(n) || ts.isNewExpression(n)) {
      const as = n.arguments ?? ts.factory.createNodeArray();
      for (let i = 0; i + 4 <= as.length; i++) {
        const four = as.slice(i, i + 4);
        if (four.every((a, k) => ts.isIdentifier(a) && a.text === RUN[k]![0] && grouped.has(ck.getSymbolAtLocation(a)!))) {
          edits.push({ s: four[0]!.getStart(), e: four[3]!.getEnd(), t: "G" });
          skip.push([four[0]!.getStart(), four[3]!.getEnd()]);
          i += 3;
        }
      }
    }
    n.forEachChild(visit);
  };
  visit(sf);
  const refs = (n: ts.Node) => {
    if (ts.isIdentifier(n) && !ts.isParameter(n.parent) && ["T", "V", "W", "C"].includes(n.text)) {
      const s = ck.getSymbolAtLocation(n);
      const at = n.getStart();
      if (s && grouped.has(s) && !skip.some(([a, b]) => at >= a && at < b)) {
        if (ts.isShorthandPropertyAssignment(n.parent)) throw new Error(`${f}: shorthand ${n.text}`);
        edits.push({ s: at, e: n.getEnd(), t: `G.${n.text}` });
      }
    }
    n.forEachChild(refs);
  };
  refs(sf);
  let text = sf.getFullText();
  for (const ed of edits.sort((a, b) => b.s - a.s)) text = text.slice(0, ed.s) + ed.t + text.slice(ed.e);
  writeFileSync(f, text);
  total += edits.length;
  console.log(`${f.split("/").pop()}: ${edits.length} edits (${edits.filter((e) => e.t === "G: IxTabs").length} signatures, ${edits.filter((e) => e.t === "G").length} argument runs, ${edits.filter((e) => e.t.startsWith("G.")).length} references)`);
}
console.log(`total ${total} edits`);
