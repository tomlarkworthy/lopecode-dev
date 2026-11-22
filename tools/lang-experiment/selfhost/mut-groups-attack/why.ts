// bun why.ts <attacks.ts> <name> [tree]: the checker's full messages for one attack
const [file, name, tree = "proto"] = process.argv.slice(2);
const { attacks } = await import(file!);
const { checkSources } = await import(`../mut-groups/${tree}/lite/core.ts`);
for (const a of attacks.filter((a: any) => a.name.includes(name!))) {
  const r = checkSources({ cells: a.src, tsx: true, outside: [] });
  console.log(`== ${a.name} (${tree})`);
  for (const c of r.cells) console.log(" ", c.name, c.status, c.errors.map((e: any) => `[${e.rule}] L${e.line} ${e.msg}`).join(" | "), c.unsupported.map((e: any) => e.msg).join(","), c.blockedBy?.join(","));
  for (const m of r.module) console.log("  module", m.rule, m.msg);
}
