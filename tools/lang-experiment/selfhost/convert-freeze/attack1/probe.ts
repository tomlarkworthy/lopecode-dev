// bun probe.ts '<cells source>' : checker verdict, conversion sites and the rewritten text (strong mode from env)
import { checkSources } from "../proto/tree/lite/core.ts";
import { conversionSites } from "../proto/tree/lite/proto-sites.ts";
import { rewrite } from "../proto/convert.ts";
const src = process.argv[2]!;
const r = checkSources({ cells: src, tsx: true, outside: [], foreign: null } as any);
for (const c of r.cells) console.log(`cell ${c.name}: ${c.status} ${c.errors.map((e: any) => `[${e.rule}] ${e.msg ?? e.message}`).join(" | ")} ${c.unsupported?.length ? "unsupported " + JSON.stringify(c.unsupported) : ""}`);
for (const m of r.module) console.log(`module [${m.rule}] ${m.msg ?? m.message}`);
const { sites } = conversionSites(src, true);
const w = rewrite(src, sites, true);
console.log("sites:", sites.map((s) => `${s.kind}@${src.slice(s.start, s.end).slice(0, 40)}`).join("; "));
console.log("rewritten:\n" + w.out);
