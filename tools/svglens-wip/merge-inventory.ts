import { readFileSync, writeFileSync } from "node:fs";

const cells = JSON.parse(readFileSync("tools/svglens-wip/cells.json", "utf8")) as any[];
const { inventory, overlaps } = JSON.parse(readFileSync("tools/svglens-wip/census-result.json", "utf8"));

const inv = new Map<string, any>();
for (const r of inventory) inv.set(r.name, r);
const ccOf = new Map(cells.map((c) => [c.name, c.cc]));
const clean = (s: string) => String(s || "").replace(/\|/g, "/").replace(/\n/g, " ").trim();

// name -> overlap cluster index (1-based, for the ⚠ marker)
const clusterOf = new Map<string, number>();
overlaps.forEach((c: any, k: number) => c.cells.forEach((n: string) => { if (!clusterOf.has(n)) clusterOf.set(n, k + 1); }));

const out: string[] = [];
out.push("# svg-lens cell inventory\n");
out.push("Full census for the consistency/refactoring phase (architecture §9), produced by a 20-agent");
out.push("workflow (`tools/svglens-wip/inventory-workflow.js`) and merged back here. One row per cell:");
out.push("**user** = the user-facing job (`—` if internal) · **how** = implementation · LOC/CC from the");
out.push("code-metrics pipeline. `#n` in a row = member of overlap cluster n in the ranked table at the end.\n");
out.push(`${cells.length} cells · ${inventory.length} inventoried · ${overlaps.length} overlap clusters.\n`);

let tableOpen = false;
const openTable = () => { out.push("\n| ✓ | cell | user | how | LOC | CC | ⚠ |"); out.push("|---|---|---|---|---|---|---|"); tableOpen = true; };
for (const c of cells) {
  const src: string = c.source || "";
  const hMatch = src.match(/md`(#{2,3})\s+([^\n`]+)/);
  const secMatch = src.match(/\bsec\("([^"]+)"\)/);
  if (hMatch) { out.push(`\n### ${hMatch[2].trim()}  ·  \`${c.name}\` (${hMatch[1].length === 2 ? "H2" : "H3"})`); tableOpen = false; continue; }
  if (secMatch && src.length < 120) { out.push(`\n### §${secMatch[1]}  ·  \`${c.name}\` (paper section)`); tableOpen = false; continue; }
  if (!tableOpen) openTable();
  const r = inv.get(c.name) || { user: "—", how: "?" };
  const flag = clusterOf.has(c.name) ? `#${clusterOf.get(c.name)}` : "";
  out.push(`| ☑ | \`${c.name}\` | ${clean(r.user)} | ${clean(r.how)} | ${c.loc} | ${ccOf.get(c.name)} | ${flag} |`);
}

out.push("\n\n## Overlaps, ranked by lines-of-code impact\n");
out.push("Found by cross-referencing the `user` column across all 341 cells. Each is a real duplication a");
out.push("reader can confirm from the named cells. This is the dedupe/refactor queue; work top-down, each");
out.push("change gated by the 59 laws staying green.\n");
out.push("| # | sev | kind | LOC | shared job | cells | dedupe |");
out.push("|---|---|---|---|---|---|---|");
overlaps.forEach((c: any, k: number) => {
  out.push(`| ${k + 1} | ${c.severity} | ${c.kind} | ${c.totalLoc} | ${clean(c.job)} | ${c.cells.map((n: string) => "`" + n + "`").join(" ")} | ${clean(c.recommendation)} |`);
});
out.push(`\nTotal LOC in overlapping cells: ${overlaps.reduce((a: number, c: any) => a + c.totalLoc, 0)}.\n`);
out.push("### Dedupe tasks (top-down)\n");
overlaps.forEach((c: any, k: number) => {
  out.push(`- [ ] **#${k + 1} · ${clean(c.job)}** (${c.totalLoc} LOC, ${c.severity}). ${clean(c.recommendation)} Cells: ${c.cells.map((n: string) => "`" + n + "`").join(", ")}.`);
});

writeFileSync("knowledge/svg-lens-cell-inventory.md", out.join("\n") + "\n");
console.log(`wrote inventory: ${cells.length} cells, ${overlaps.length} clusters, ${out.length} lines`);
