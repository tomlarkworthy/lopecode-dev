import { conversionSites } from "../tree/lite/proto-sites.ts";
const srcs = process.argv.slice(2);
for (const s of srcs) { const r = conversionSites(s, true); console.log(JSON.stringify(r.result.cells.map((c: any) => [c.name, c.status, c.value, c.errors.map((e: any) => e.rule + ":" + e.msg.slice(0,80))])), r.sites.map((x) => `${x.kind}@${s.slice(x.start, x.end)}${x.names ? "[" + x.names + "]" : ""}`).join(" | ")); }
