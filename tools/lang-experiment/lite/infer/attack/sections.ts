// bun lite/infer/attack/sections.ts <out.json>: every registered SoundScript section, checked as the build checks it
// (ts-cells.ts sectionCheck), one record per cell; with ndiff.ts it counts what a rule change rejects in shipped cells.
import { writeFileSync } from "node:fs";
import { SS_SOURCES, sectionCheck } from "../../soundscript/ts-cells.ts";

const out: Record<string, string[]> = {};
for (const f of [...SS_SOURCES, "pool.ss.ts"]) {
  const r = sectionCheck(f);
  out[`section:${f}`] = [...r.module.map((e) => `module [${e.rule}] ${e.msg}`),
    ...r.cells.map((c) => `${c.name}: ${c.status}${c.errors.map((e) => ` [${e.rule}] L${e.line} ${e.msg}`).join("")}`)];
}
writeFileSync(process.argv[2], JSON.stringify(out, null, 1));
const bad = Object.values(out).flat().filter((l) => !/: ok$/.test(l));
console.log(`${Object.keys(out).length} sections, ${Object.values(out).flat().length} records, not ok ${bad.length}`);
for (const l of bad.slice(0, 20)) console.log("  " + l);
