// bun try-src.ts <base|proto> <json file of Sources>: the checker of that tree on one Sources record
const tree = process.argv[2] ?? "base";
const { checkSources } = await import(`./${tree}/lite/core.ts`);
const src = JSON.parse(await Bun.file(process.argv[3]!).text());
const r = checkSources(src);
for (const c of r.cells) console.log(c.name, c.status, c.errors.map((e: any) => `[${e.rule}] ${e.msg}`).join(" | "), c.unsupported.map((e: any) => e.msg).join(","));
for (const m of r.module) console.log("module", m.rule, m.msg);
