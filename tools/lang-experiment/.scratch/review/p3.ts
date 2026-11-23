import { checkSources } from "../../lite/core.ts";
import { readdirSync, readFileSync } from "node:fs";
const d = "lite/notebook/examples/";
for (const f of [...readdirSync(d).filter(f=>/\.tsx?$/.test(f)).map(f=>d+f), "lite/soundscript/tutorial-async.tsx","lite/soundscript/tutorial-ordinary.tsx"]) {
  const r = checkSources({ cells: readFileSync(f, "utf8"), tsx: f.endsWith("x") });
  console.log(f, JSON.stringify([...r.module, ...r.cells.flatMap((x: any) => x.errors)].map((e: any) => e.rule)));
}
