// Corpus totals and tables from modules.json + cells.jsonl (written by classify.ts).
import { readFileSync } from "node:fs";
const { modules, vendored, nonModule } = JSON.parse(readFileSync(new URL("modules.json", import.meta.url), "utf8"));
const cells = readFileSync(new URL("cells.jsonl", import.meta.url), "utf8").trim().split("\n").map((l) => JSON.parse(l));
const S = (k: string) => modules.reduce((a: number, m: any) => a + m[k], 0);
const pct = (a: number, b: number) => (b ? Math.round((100 * a) / b) : 0);
const code = S("codeLines");
console.log(`notebook modules ${modules.length}; vendored/blob modules ${vendored.length}; non-module JS blocks ${nonModule.length}`);
console.log(`cells ${S("cells")} (code ${S("codeCells")}, prose ${S("proseCells")}, blob ${S("blobCells")}, loaders ${S("loaderCells")}); import variables ${S("importCells")}`);
console.log(`lines ${S("lines")} (code ${code}, prose ${S("proseLines")}, blob ${S("blobLines")})`);
console.log(`by code lines: Y ${pct(S("YL"), code)}%  H ${pct(S("HL"), code)}%  N ${pct(S("NL"), code)}%`);
console.log(`literal-data cells (Y): ${cells.filter((c) => c.literal && c.verdict === "Y").length} cells, ${S("literalLines")} lines; Y on logic lines ${pct(S("YL") - S("literalLines"), code - S("literalLines"))}%`);
console.log(`by code cells: Y ${pct(S("Y"), S("codeCells"))}%  H ${pct(S("H"), S("codeCells"))}%  N ${pct(S("N"), S("codeCells"))}%`);
const withCode = modules.filter((m: any) => m.codeLines > 0);
for (const t of [80, 50]) console.log(`modules >=${t}% Y+H by code lines: ${withCode.filter((m: any) => (100 * (m.YL + m.HL)) / m.codeLines >= t).length} of ${withCode.length} (>=${t}% Y alone: ${withCode.filter((m: any) => (100 * m.YL) / m.codeLines >= t).length})`);
const big = withCode.filter((m: any) => m.codeLines >= 150);
for (const t of [80, 50]) console.log(`  of the ${big.length} with >=150 code lines: >=${t}% Y+H ${big.filter((m: any) => (100 * (m.YL + m.HL)) / m.codeLines >= t).length}`);
// blockers: primary (priority order) and sole
const prim = new Map<string, [number, number]>(), sole = new Map<string, [number, number]>(), any = new Map<string, [number, number]>();
const add = (m: Map<string, [number, number]>, k: string, l: number) => { const e = m.get(k) ?? [0, 0]; e[0]++; e[1] += l; m.set(k, e); };
for (const c of cells) if (c.verdict === "N" || c.verdict === "H") {
  add(prim, c.primary, c.lines);
  const nb = c.blockers.filter((b: string) => (c.verdict === "N" ? !["FNH", "FILE", "INPUTS", "BUILTIN"].includes(b) : true));
  if (nb.length === 1) add(sole, nb[0], c.lines);
  for (const b of c.blockers) add(any, b, c.lines);
}
console.log("\nblocker\tprimary cells\tprimary lines\tsole-N-blocker cells\tsole lines\tany cells\tany lines");
for (const [k, v] of [...prim].sort((a, b) => b[1][1] - a[1][1])) console.log([k, v[0], v[1], sole.get(k)?.[0] ?? 0, sole.get(k)?.[1] ?? 0, any.get(k)?.[0], any.get(k)?.[1]].join("\t"));
const top = process.argv.includes("--top");
if (top) {
  // ranked on logic lines: code lines minus cells that are only a literal value (data tables, embedded source text)
  const rank = withCode.map((m: any) => ({ ...m, logic: m.codeLines - m.literalLines })).filter((m: any) => m.logic >= 150 && !m.soundscript)
    .map((m: any) => ({ ...m, y: (100 * (m.YL - m.literalLines)) / m.logic, yh: (100 * (m.YL - m.literalLines + m.HL)) / m.logic }))
    .sort((a: any, b: any) => b.y - a.y).slice(0, 25);
  console.log("\nmodule\tcells\tcodeCells\tcodeLines\tliteralLines\tlogicLines\tY%logic\tH%logic\tN%logic\tdominant\tcopies\tnotebook");
  for (const m of rank) console.log([m.id, m.cells, m.codeCells, m.codeLines, m.literalLines, m.logic, Math.round(m.y), pct(m.HL, m.logic), pct(m.NL, m.logic), m.dominant, m.copies, m.notebook].join("\t"));
}
// rewrites inside Y
const yc = cells.filter((c) => c.verdict === "Y");
const rw = new Map<string, number>(); for (const c of yc) for (const r of [...c.rewrites, ...(c.unsupported.length ? ["unsupported-method"] : [])]) rw.set(r, (rw.get(r) ?? 0) + c.lines);
console.log("\nY lines needing a rewrite:", [...rw].map(([k, v]) => `${k} ${v}`).join(", "), "of", yc.reduce((a, c) => a + c.lines, 0));
// MUTARG is rejected as written but has a pure rewrite (probe G1/G2/L3b): the share if those cells were rewritten
const onlyMutarg = cells.filter((c) => c.verdict === "N" && c.blockers.filter((b: string) => !["FNH", "FILE", "INPUTS", "BUILTIN"].includes(b)).every((b: string) => b === "MUTARG"));
const toY = onlyMutarg.filter((c) => c.blockers.every((b: string) => b === "MUTARG")).reduce((a, c) => a + c.lines, 0);
const toH = onlyMutarg.reduce((a, c) => a + c.lines, 0) - toY;
console.log(`MUTARG-only cells: ${onlyMutarg.length}, ${toY} lines would be Y and ${toH} H after a pure rewrite: Y ${pct(S("YL") + toY, code)}% H ${pct(S("HL") + toH, code)}%`);
