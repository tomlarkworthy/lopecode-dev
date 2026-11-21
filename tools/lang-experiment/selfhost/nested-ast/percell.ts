// Check time per cell of a visitor file (the time from one cell's onCell to the next's), on a checker copy, one run
// after a warm run. Run: bun percell.ts <copy> <file.ss.ts>
const [copy = "recfix", file = "visit-n.ss.ts"] = process.argv.slice(2);
const { checkSources } = await import(`./${copy}/lite/core.ts`);
const { sourceOf, OUTSIDE } = await import("./check.ts");
const { src, own } = sourceOf(file);
const run = () => {
  const marks: [string, number][] = [];
  const t0 = performance.now();
  const r = checkSources({ cells: src, tsx: false, outside: OUTSIDE[file] ?? null }, { onCell: (name: string) => marks.push([name, performance.now()]) });
  const end = performance.now();
  return { r, total: end - t0, per: marks.map(([n, t], i) => [n, (marks[i + 1]?.[1] ?? end) - t] as const) };
};
run();
const { total, per } = run();
console.log(`${copy} ${file}: total ${total.toFixed(0)} ms`);
for (const [n, ms] of per.filter(([n]) => own.has(n)).toSorted((a, b) => b[1] - a[1]).slice(0, 12)) console.log(`  ${n.padEnd(20)} ${ms.toFixed(1)} ms`);
console.log(`  own cells total ${per.filter(([n]) => own.has(n)).reduce((s, [, m]) => s + m, 0).toFixed(0)} ms, prefix cells ${per.filter(([n]) => !own.has(n)).reduce((s, [, m]) => s + m, 0).toFixed(0)} ms`);
