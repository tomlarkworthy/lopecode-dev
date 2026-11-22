// the converted checker (treeconv) on the shipped sections: per cell verdicts, as JSON lines, to diff against tree
const root = process.argv[2] ?? "tree";
const { checkSources } = await import(`./${root}/lite/core.ts`);
const { SS_SOURCES, sectionSource } = await import(`./tree/lite/soundscript/ts-cells.ts`);
const units = new Map<string, string>();
for (const f of SS_SOURCES) { const u = sectionSource(f).unit; if (!units.has(u)) units.set(u, f); }
for (const [u, f] of units) { const s = sectionSource(f); let r: any; try { r = checkSources({ cells: s.src, tsx: true, shell: s.shell }); } catch (x) { console.log(JSON.stringify({ u, crash: String((x as Error).stack).slice(0, 600) })); continue; }
  for (const m of r.module) console.log(JSON.stringify({ u, module: `${m.rule}: ${m.msg}`.slice(0, 300) }));
  for (const c of r.cells) console.log(JSON.stringify({ u, c: c.name, st: c.status, e: [...c.errors, ...c.unsupported].map((e: any) => `${e.rule}: ${e.msg}`.slice(0, 300)) })); }
process.exit(0);
