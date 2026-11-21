// Checks each probe file with the real checker, as selfhost/check.ts does (splitCells, then checkCells; strict index;
// not tsx). A probe whose first line is `// uses: ast, types` is checked with probes/ast.ss.ts and/or lite/types.ss.ts
// in front of it, and a line `// outside: a, b` names cells of another language (core.ts Outside), so its cells can name those types and take those cells. Prints one line per cell of the probe
// itself (the prefix's cells must all be ok; any that is not is printed too), and writes out/results/<probe>.txt.
// Run: bun selfhost/checker-survey/run.ts [probe files…]   (default: every probes/*.ss.ts but ast.ss.ts)
// OUT=name.txt names the summary file in out/results (default ALL.txt)
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { join, basename } from "node:path";
import { splitCells, declaredName } from "../../lite/toolchain/ss-toolchain.ts";
import { checkCells } from "../../lite/stdlib/runtime.ts";
import { sha, FILES } from "./inventory.ts";

const HERE = import.meta.dir, ROOT = join(HERE, "../..");
const args = process.argv.slice(2);
const outName = process.env.OUT ?? "ALL.txt";
const files = args.length ? args : readdirSync(join(HERE, "probes")).filter((f) => f.endsWith(".ss.ts") && f !== "ast.ss.ts").sort().map((f) => join(HERE, "probes", f));
mkdirSync(join(HERE, "out/results"), { recursive: true });
const summary: string[] = [`checker files: ${FILES.map((f) => `${f}@${sha(f)}`).join(" ")}`];
for (const file of files) {
  const own = readFileSync(file, "utf8");
  const uses = /^\/\/ uses: (.*)$/m.exec(own.split("\n")[0] ?? "")?.[1]?.split(/,\s*/) ?? [];
  const prefix = [...(uses.includes("ast") ? [readFileSync(join(HERE, "probes/ast.ss.ts"), "utf8")] : []), ...(uses.includes("astlib") ? [readFileSync(join(HERE, "probes/astlib.ss.ts"), "utf8").replace(/^\/\/ uses:.*\n/, "")] : []), ...(uses.includes("types") ? [readFileSync(join(ROOT, "lite/types.ss.ts"), "utf8")] : [])];
  const preTexts = prefix.flatMap((p) => splitCells(p, false));
  const ownTexts = splitCells(own, false);
  const ownNames = new Set(ownTexts.map(declaredName));
  const outsideNames = /^\/\/ outside: (.*)$/m.exec(own)?.[1]?.split(/,\s*/) ?? null;
  const { result } = checkCells([...preTexts, ...ownTexts], false, outsideNames ? outsideNames.map((name) => ({ name })) : null);
  const preLines = preTexts.join("\n\n").split("\n").length + (preTexts.length ? 1 : 0);
  const out: string[] = [];
  for (const e of result.module) out.push(`module [${e.rule}] L${e.line - preLines} ${e.msg}`);
  let bad = 0;
  for (const c of result.cells) {
    const errs = [...c.errors.map((e) => `[${e.rule}] L${e.line - preLines} ${e.msg}`), ...(c.unsupported ?? []).map((u) => `[unsupported] L${u.line - preLines} ${u.msg}`)];
    const mine = ownNames.has(c.name.replace(/ \(\d+\)$/, ""));
    if (!mine && c.status === "ok" && !errs.length) continue;
    if (c.status !== "ok" || errs.length) bad++;
    out.push(`${mine ? "" : "(prefix) "}${c.name}: ${c.status}${c.value ? ` : ${c.value.slice(0, 160)}` : ""}${c.blockedBy?.length ? ` (blocked by ${c.blockedBy.join(", ")})` : ""}${errs.length ? "\n    " + errs.join("\n    ") : ""}`);
  }
  out.push(`${ownNames.size} probe cells, ${bad} not ok, ${result.module.length} module errors`);
  writeFileSync(join(HERE, "out/results", basename(file).replace(/\.ss\.ts$/, ".txt")), out.join("\n") + "\n");
  summary.push(`== ${basename(file)}`, ...out);
}
writeFileSync(join(HERE, "out/results", outName), summary.join("\n") + "\n");
console.log(summary.join("\n"));
