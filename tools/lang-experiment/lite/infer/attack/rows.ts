// bun lite/infer/attack/rows.ts <file.json>: the rule set spec_rulesOf gives each candidate reject row of the file
// ([{statement, rule, source}]), and whether it is exactly the row's rule
import { readFileSync } from "node:fs";
import { checkSources } from "../../core.ts";
for (const c of JSON.parse(readFileSync(process.argv[2], "utf8"))) {
  const r = checkSources({ cells: c.source, shell: c.shell ?? null, tsx: true, outside: c.outside ?? null });
  const got = [...new Set([...r.module, ...r.cells.flatMap((x) => x.errors)].map((e) => e.rule))].sort();
  console.log(`${got.length === 1 && got[0] === c.rule ? "ok  " : "BAD "} ${c.statement} [${c.rule}] got [${got.join(", ")}] ${JSON.stringify(c.source).slice(0, 90)}`);
}
