// The compiled inputs of each prototype cell, as ts-cells.ts ssStatements compiles a shipped source: compileCell
// with contextFromCheck of the joint check and inputsIn(runtime module or not). A cell outside the runtime module
// that uses mut/freeze takes them from `ss` (the 2026-11-20 landing limit 1); inside it, from its own cells.
// Run: bun selfhost/port-rest/compile-inputs.ts <file.ss.ts> <runtime|other> [--with a.ss.ts,b.ss.ts]
import { readFileSync } from "node:fs";
import { checkSources } from "../../lite/core.ts";
import { splitCells, compileCell, contextFromCheck, inputsIn, declaredName } from "../../lite/toolchain/ss-toolchain.ts";
import { ssCellTexts } from "../../lite/soundscript/ts-cells.ts";

const [path, where] = process.argv.slice(2);
const at = process.argv.indexOf("--with");
const withFiles = at >= 0 ? process.argv[at + 1].split(",") : [];
const texts = splitCells(readFileSync(path, "utf8"), false);
const r = checkSources({ cells: [...withFiles.flatMap(ssCellTexts), ...texts].join("\n\n"), tsx: true });
const ctx = { ...contextFromCheck(r), inputs: inputsIn(where === "runtime") };
for (const t of texts) {
  const n = declaredName(t);
  if (!n || t.trimStart().startsWith("export type")) continue;
  const vs = compileCell(t, false, ctx).filter((v) => v.name === n);
  console.log(`${n}\tinputs=[${vs.map((v) => v.inputs.join(",")).join(" | ")}]`);
}
