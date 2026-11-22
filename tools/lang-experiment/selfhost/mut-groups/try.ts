// bun try.ts <base|proto> '<cells>': the checker of that tree on cells given on the command line
const tree = process.argv[2] ?? "base";
const { checkSources } = await import(`./${tree}/lite/core.ts`);
const src = process.argv[3] ?? "";
const r = checkSources({ cells: src, tsx: true, outside: [] });
for (const c of r.cells) console.log(c.name, c.status, c.errors.map((e: any) => `[${e.rule}] ${e.msg}`).join(" | "), c.unsupported.map((e: any) => e.msg).join(","));
for (const m of r.module) console.log("module", m.rule, m.msg);
