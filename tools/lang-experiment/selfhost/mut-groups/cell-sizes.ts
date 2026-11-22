// bun cell-sizes.ts <tree> [file...]: on the TypeScript AST, the line span of each top-level statement (a cell) of
// <tree>/lite/infer/*.ss.ts (or the files named); prints the cells over 26 lines and the longest cell per file.
import ts from "typescript";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
const D = join(import.meta.dir, process.argv[2] ?? "proto", "lite/infer");
const want = process.argv.slice(3);
const files = (want.length ? want : readdirSync(D).filter((f) => f.endsWith(".ss.ts"))).sort();
let over = 0, max = 0;
for (const f of files) {
  const sf = ts.createSourceFile(f, readFileSync(join(D, f), "utf8"), ts.ScriptTarget.Latest, true);
  let best = 0, bestName = "";
  for (const st of sf.statements) {
    if (!ts.isVariableStatement(st)) continue;
    const n = sf.getLineAndCharacterOfPosition(st.getEnd()).line - sf.getLineAndCharacterOfPosition(st.getStart()).line + 1;
    const name = st.declarationList.declarations[0]!.name.getText();
    if (n > 26) { over++; console.log(`OVER ${f} ${name} ${n} lines`); }
    if (n > best) { best = n; bestName = name; }
  }
  max = Math.max(max, best);
  if (want.length) console.log(`${f}: longest ${bestName} ${best} lines`);
}
console.log(`${files.length} files: cells over 26 lines ${over}; longest ${max}`);
