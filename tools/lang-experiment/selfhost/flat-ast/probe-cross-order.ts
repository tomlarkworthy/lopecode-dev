// Does cross() depend on the order of FNode's members? The same records as ast-a.ss.ts with the FNode union reordered
// by census frequency (most frequent first), against the generated alphabetical order. Prints the first members of each
// shape and cross() time over the corpus, median of 5. Run: bun selfhost/flat-ast/probe-cross-order.ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { checkSources } from "../../lite/core.ts";
import { cross } from "../../lite/boundary.ts";
import { parse } from "../../lite/parse.ts";
import { flatParse } from "./adapter.ts";
import { corpus } from "./corpus.ts";
import CENSUS from "./out/census.json";
const H = import.meta.dir, src = readFileSync(join(H, "ast-a.ss.ts"), "utf8");
// the FNode declaration, by AST, replaced with a frequency-ordered one
const st = parse(src).program.body.find((s: any) => s.declaration?.id?.name === "FNode");
const members = st.declaration.typeAnnotation.types.map((t: any) => t.typeName.name as string);
const freq = members.toSorted((a: string, b: string) => ((CENSUS as any)[b]?.count ?? 0) - ((CENSUS as any)[a]?.count ?? 0));
const alpha = members.toSorted();
const variants: [string, string][] = [["alphabetical", src.slice(0, st.start) + `export type FNode = ${alpha.join(" | ")};` + src.slice(st.end)], ["by frequency", src.slice(0, st.start) + `export type FNode = ${freq.join(" | ")};` + src.slice(st.end)]];
const vals = corpus().map((c) => flatParse(c.src, c.tsx));
for (const [label, s] of variants) {
  const r = checkSources({ cells: s + `\nexport const take = (flatParse: Parse): number => 1;`, tsx: false, outside: [{ name: "flatParse" }] });
  const shape: any = r.facts?.get("take")?.params[0]?.boundary?.shape;
  const nodesShape = shape.ts.find((x: any) => x.props.some((p: any) => p[0] === "ast")).props.find((p: any) => p[0] === "ast")[1].props.find((p: any) => p[0] === "nodes")[1].el;
  const first = nodesShape.ts.slice(0, 4).map((m: any) => m.props.find((p: any) => p[0] === "type")[1].v);
  const ts: number[] = [];
  for (let k = 0; k < 5; k++) { const t0 = performance.now(); for (const v of vals) cross(v, shape, "take.flatParse"); ts.push(performance.now() - t0); }
  console.log(`${label}: shape members begin ${first.join(", ")}; cross over the corpus ${ts.toSorted((a, b) => a - b)[2]!.toFixed(0)} ms`);
}
