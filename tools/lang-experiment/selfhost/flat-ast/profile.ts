// Per-cell check time: checkSources' onCell hook is called before each cell is checked, so the time between two calls
// is the earlier cell's check (the last cell runs to the end of checkSources). Median of 3 runs.
// Run: bun selfhost/flat-ast/profile.ts [visit-a.ss.ts]
import { checkSources } from "../../lite/core.ts";
import { sourceOf, OUTSIDE } from "./check.ts";

export function profile(file: string, runs = 3): { name: string; ms: number }[] {
  const { src, own } = sourceOf(file);
  const per = new Map<string, number[]>();
  for (let k = 0; k < runs; k++) {
    let last: string | null = null, t = performance.now();
    const close = () => { const now = performance.now(); if (last) per.set(last, [...(per.get(last) ?? []), now - t]); t = now; };
    checkSources({ cells: src, tsx: false, outside: OUTSIDE[file] ?? null }, { onCell: (name) => { close(); last = name; } });
    close();
  }
  return [...per].filter(([n]) => own.has(n)).map(([name, ms]) => ({ name, ms: ms.toSorted((a, b) => a - b)[ms.length >> 1]! }));
}

if (import.meta.main) {
  const rows = profile(process.argv[2] ?? "visit-a.ss.ts");
  const total = rows.reduce((s, r) => s + r.ms, 0);
  for (const r of rows.toSorted((a, b) => b.ms - a.ms)) console.log(`${r.ms.toFixed(1).padStart(8)} ms  ${r.name}`);
  console.log(`${total.toFixed(1)} ms in ${rows.length} cells`);
}
