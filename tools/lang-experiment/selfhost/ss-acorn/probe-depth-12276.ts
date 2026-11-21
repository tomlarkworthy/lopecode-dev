// What today's checker (base/) returns for a+a+… just past the probe's "cell ok" limit, which probe-depth.ts only
// reported as its own formatting error. Run: bun probe-depth-12276.ts
import { checkSources } from "./base/lite/core.ts";
for (const n of [12275, 12276, 13000, 21275]) {
  const s = `export const f = () => { const a = 1; return ${Array(n).fill("a").join("+")}; };`;
  try {
    const r = checkSources({ cells: s, tsx: false });
    console.log(`${n}: cells ${JSON.stringify(r.cells.map((c: any) => [c.name, c.status, c.errors?.[0]?.msg?.slice(0, 120)]))}; module ${JSON.stringify(r.module.map((m: any) => String(m.msg).slice(0, 120)))}`);
  } catch (e) { console.log(`${n}: throws ${String(e).slice(0, 160)}`); }
}
