// M3: the checker's own cost, main design (tree/, boundary freeze + registrations at link) vs the converted cells
// (treeconv/, ss_f at sites, boundary freeze off): import ("boot") then check every shipped section 3 times.
// bun m3-checker.ts tree|treeconv
const root = process.argv[2] ?? "tree";
const t0 = performance.now();
const { checkSources } = await import(`./${root}/lite/core.ts`);
const { SS_SOURCES, sectionSource } = await import(`./tree/lite/soundscript/ts-cells.ts`);
const tBoot = performance.now();
const units = new Map<string, string>();
for (const f of SS_SOURCES) { const u = sectionSource(f).unit; if (!units.has(u)) units.set(u, f); }
const srcs = [...units.values()].map((f) => sectionSource(f));
const runs: number[] = []; let cells = 0, ok = 0;
for (let k = 0; k < Number(process.env.RUNS ?? 3); k++) { const t = performance.now(); cells = 0; ok = 0; for (const s of srcs) { const r = checkSources({ cells: s.src, tsx: true, shell: s.shell }); cells += r.cells.length; ok += r.cells.filter((c: any) => c.status === "ok").length; } runs.push(performance.now() - t); }
const { SS_F_STAT } = await import(`./${root}/lite/freeze.ts`);
console.log(`${root}: boot ${(tBoot - t0).toFixed(0)} ms; check ${srcs.length} units (${cells} cells, ${ok} ok): ${runs.map((x) => x.toFixed(0)).join(", ")} ms; ss_f calls ${SS_F_STAT.calls}, nodes ${SS_F_STAT.nodes}`);
for (const [k, v] of [...((globalThis as any).__ssCrash ?? new Map())].sort((a: any, b: any) => b[1] - a[1])) console.log(`CRASH ${v} ${k}`);
process.exit(0);
