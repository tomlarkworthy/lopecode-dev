// bun mut-in-latent.ts: over the K3 corpus, Mut<…> type references written beneath a function type, or a type argument of
// Promise / Iterable / Generator / State / Action / Events (the positions rule F would make Mut-exact). AST walk.
import ts from "typescript";
import { readFileSync } from "node:fs";
import { Glob } from "bun";
const ROOT = new URL("../../../", import.meta.url).pathname;
const files = [...new Glob("lite/**/*.ss.ts").scanSync(ROOT)].filter((f) => !f.includes(".scratch"))
  .concat([...new Glob("lite/notebook/examples/*.{ts,tsx}").scanSync(ROOT)], [...new Glob("lite/soundscript/spec-*.ts").scanSync(ROOT)]);
const LATENT = new Set(["Promise", "Iterable", "Generator", "State", "Action", "Events"]);
let total = 0; const at: Record<string, number> = {}; const ex: string[] = [];
for (const file of files) {
  const sf = ts.createSourceFile(file, readFileSync(ROOT + file, "utf8"), ts.ScriptTarget.Latest, true, file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const v = (n: ts.Node): void => {
    if (ts.isTypeReferenceNode(n) && ts.isIdentifier(n.typeName) && n.typeName.text === "Mut") {
      total++;
      for (let q = n.parent; q && !ts.isStatement(q) && !ts.isParameter(q) ? true : q && ts.isParameter(q) && ts.isFunctionTypeNode(q.parent); q = q.parent) {
        const k = ts.isFunctionTypeNode(q) ? "fn-type" : ts.isTypeReferenceNode(q) && ts.isIdentifier(q.typeName) && LATENT.has(q.typeName.text) ? q.typeName.text : null;
        if (k) { at[k] = (at[k] ?? 0) + 1; if (ex.length < 12) ex.push(`${file}:${sf.getLineAndCharacterOfPosition(n.getStart()).line + 1} ${q.getText().slice(0, 90)}`); break; }
      }
    }
    ts.forEachChild(n, v);
  };
  v(sf);
}
console.log(`Mut<…> references ${total}; beneath a latent position: ${JSON.stringify(at)}`);
for (const e of ex) console.log("  " + e);
