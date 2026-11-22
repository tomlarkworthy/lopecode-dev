// bun selfhost/no-mut/deletable.ts: line counts of the checker cells named in RESULTS.md section 5, from each file's
// AST (the top-level `export const NAME = ...` declaration, first to last line). Partial deletions are listed in
// RESULTS.md with hand counts; this prints whole cells only.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { TS } from "../../lite/infer/frozen/ts/parse.ts";

const ROOT = join(import.meta.dir, "../..");
const whole: [string, string[]][] = [
  ["lite/infer/ow-capture.ss.ts", ["owMutIn", "owMut", "owMutDeep", "owLocalHoldsMut", "owStripMut"]],
  ["lite/infer/ix-expr.ss.ts", ["ixCheckFresh"]],
  ["lite/infer/ow-tree.ss.ts", ["owMutParamArg"]],
];
const partial: [string, string[]][] = [
  ["lite/subtype.ss.ts", ["namedSubWith"]],
  ["lite/infer/rg-convert.ss.ts", ["rgNamedRef", "RG_ONE_ARG"]],
  ["lite/infer/md-inject.ss.ts", ["mdInject"]],
  ["lite/infer/md-cell.ss.ts", ["mdKeep"]],
  ["lite/infer/ow-capture.ss.ts", ["owWriteRef"]],
  ["lite/infer/ow-late.ss.ts", ["owLateMsg"]],
  ["lite/infer/ix-expr.ss.ts", ["ixCheck1"]],
  ["lite/infer/ix-lit.ss.ts", ["ixObjCtx"]],
];
function spans(file: string): Map<string, [number, number]> {
  const src = readFileSync(join(ROOT, file), "utf8");
  const prog: any = TS.parse(src, { ecmaVersion: "latest", sourceType: "module", locations: true } as any);
  const out = new Map<string, [number, number]>();
  for (const st of prog.body) {
    const d = st.type === "ExportNamedDeclaration" ? st.declaration : st;
    if (d?.type !== "VariableDeclaration") continue;
    for (const v of d.declarations) if (v.id.type === "Identifier") out.set(v.id.name, [st.loc.start.line, st.loc.end.line]);
  }
  return out;
}
let total = 0;
for (const [kind, list] of [["whole", whole], ["partial (cell size; the lines removed are counted by hand)", partial]] as const) {
  console.log(`${kind}:`);
  for (const [f, names] of list) {
    const s = spans(f);
    for (const n of names) {
      const sp = s.get(n);
      if (!sp) { console.log(`  ${f} ${n}: NOT FOUND`); continue; }
      const lines = sp[1] - sp[0] + 1;
      if (kind === "whole") total += lines;
      console.log(`  ${f}:${sp[0]} ${n}: ${lines} lines`);
    }
  }
}
console.log(`whole cells: ${total} lines`);
