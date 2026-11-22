// bun diag.ts '<source>': every diagnostic the checker gives, with its message
import { checkSources } from "../../lite/core.ts";
const r: any = checkSources({ cells: process.argv[2]!, tsx: true, outside: [], foreign: null } as any);
for (const m of r.module) console.log(`module [${m.rule}] ${m.msg}`);
for (const c of r.cells) console.log(`${c.name}: ${c.status} ${c.errors.map((e: any) => `[${e.rule}] ${e.msg}`).join(" | ")} ${c.unsupported.map((e: any) => `{unsupported ${e.msg}}`).join(" ")}`);
