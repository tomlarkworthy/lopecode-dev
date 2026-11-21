// Checks SoundScript files with the real checker, as selfhost/checker-survey/run.ts does (splitCells, then checkCells;
// strict index; not tsx), with probes/ast.ss.ts and lite/types.ss.ts in front when the first line is `// uses: ast, types`.
// Prints one line per cell of the file itself (a prefix cell is printed only when it is not ok) and writes out/<file>.txt.
// Run: bun selfhost/checker-shape/check.ts <file.ss.ts>…
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, basename } from "node:path";
import { splitCells, declaredName } from "../../lite/toolchain/ss-toolchain.ts";
import { checkCells } from "../../lite/stdlib/runtime.ts";
import { sha } from "../checker-survey/inventory.ts";

const HERE = import.meta.dir, ROOT = join(HERE, "../..");
mkdirSync(join(HERE, "out"), { recursive: true });
// SWAP=tablesB=tablesB2 checks a file with another file in place of one it uses
const SWAP = new Map((process.env.SWAP ?? "").split(",").filter(Boolean).map((kv) => kv.split("=") as [string, string]));
export function checkFile(file: string): { text: string; bad: number; ms: number } {
  const own = readFileSync(file, "utf8");
  const uses = /^\/\/ uses: (.*)$/m.exec(own.split("\n")[0] ?? "")?.[1]?.split(/,\s*/) ?? [];
  const prefix = [
    ...(uses.includes("ast") ? [readFileSync(join(ROOT, "selfhost/checker-survey/probes/ast.ss.ts"), "utf8")] : []),
    ...(uses.includes("types") ? [readFileSync(join(ROOT, "lite/types.ss.ts"), "utf8")] : []),
    ...uses.filter((u) => u !== "ast" && u !== "types").map((u) => readFileSync(join(HERE, `${SWAP.get(u) ?? u}.ss.ts`), "utf8").replace(/^\/\/ uses:.*\n/, "")),
  ];
  const preTexts = prefix.flatMap((p) => splitCells(p, false));
  const ownTexts = splitCells(own, false);
  const ownNames = new Set(ownTexts.map(declaredName));
  const t0 = performance.now();
  const { result } = checkCells([...preTexts, ...ownTexts], false, null);
  const ms = performance.now() - t0;
  const preLines = preTexts.join("\n\n").split("\n").length + (preTexts.length ? 1 : 0);
  const out: string[] = [];
  for (const e of result.module) out.push(`module [${e.rule}] L${e.line - preLines} ${e.msg}`);
  let bad = 0;
  for (const c of result.cells) {
    const errs = [...c.errors.map((e) => `[${e.rule}] L${e.line - preLines} ${e.msg}`), ...(c.unsupported ?? []).map((u) => `[unsupported] L${u.line - preLines} ${u.msg}`)];
    const mine = ownNames.has(c.name.replace(/ \(\d+\)$/, ""));
    if (!mine && c.status === "ok" && !errs.length) continue;
    if (c.status !== "ok" || errs.length) bad++;
    out.push(`${mine ? "" : "(prefix) "}${c.name}: ${c.status}${c.value ? ` : ${c.value.slice(0, 120)}` : ""}${c.blockedBy?.length ? ` (blocked by ${c.blockedBy.join(", ")})` : ""}${errs.length ? "\n    " + errs.join("\n    ") : ""}`);
  }
  out.push(`checker: lite/core.ts@${sha("lite/core.ts")} lite/infer.ts@${sha("lite/infer.ts")} lite/registry.ts@${sha("lite/registry.ts")} lite/own.ts@${sha("lite/own.ts")}`);
  out.push(`${ownNames.size} cells (splitCells units: type declarations count), ${bad} not ok, ${result.module.length} module errors, check ${ms.toFixed(0)} ms`);
  const text = out.join("\n") + "\n";
  writeFileSync(join(HERE, "out", basename(file).replace(/\.ss\.ts$/, "") + [...SWAP.values()].map((v) => `+${v}`).join("") + ".txt"), text);
  return { text, bad: bad + result.module.length, ms };
}
if (import.meta.main) {
  let bad = 0;
  for (const f of process.argv.slice(2)) { const r = checkFile(f); console.log(`== ${basename(f)}\n${r.text}`); bad += r.bad; }
  process.exit(bad ? 1 : 0);
}
