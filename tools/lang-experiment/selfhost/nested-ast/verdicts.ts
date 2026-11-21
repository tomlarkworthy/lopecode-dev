// Do the copies change any checker verdict? checkSources of orig/ against each named copy, over the corpus (spec
// rejects, fixtures, orig/lite/*.ss.ts) and the synthetic inputs: per input, the module errors and per cell the
// status and errors (rule, line, message), as ordered lists. Prints every difference (first 300 chars).
// Run: bun verdicts.ts recfix rec fix
import { corpus } from "./corpus.ts";
import { SYNTHETIC } from "./synthetic.ts";
import { SYNTHETIC_OWN } from "./synthetic-own.ts";
import { SYNTHETIC_REC } from "./synthetic-recursive.ts";
const copies = process.argv.slice(2);
const load = async (c: string) => (await import(`./${c}/lite/core.ts`)).checkSources as (i: any) => any;
const base = await load("orig");
const others = await Promise.all(copies.map(load));
const verdict = (f: any, c: any) => {
  try {
    const r = f({ cells: c.src, tsx: c.tsx, outside: c.outside ?? null, shell: c.shell ?? null });
    return [...r.module.map((e: any) => `module ${e.rule} L${e.line} ${e.msg}`), ...r.cells.flatMap((x: any) => [`cell ${x.name} ${x.status}`, ...x.errors.map((e: any) => `  ${x.name} ${e.rule} L${e.line} ${e.msg}`)])];
  } catch (e: any) { return [`throws ${e?.message}`]; }
};
const inputs = [...corpus(), ...SYNTHETIC, ...SYNTHETIC_OWN, ...SYNTHETIC_REC];
if (process.env.SHOW_REC) for (const c of SYNTHETIC_REC) console.log(c.id, JSON.stringify(verdict(base, c).filter((l) => !l.startsWith("cell ") || l.includes(c.src.split("\n").at(-1)!.slice(6, 12)))).slice(0, 300));
const diffs = copies.map(() => [] as string[]);
let lines = 0;
for (const c of inputs) {
  const want = verdict(base, c);
  lines += want.length;
  others.forEach((f, k) => {
    const got = verdict(f, c);
    if (want.length !== got.length || want.some((x, i) => x !== got[i])) {
      const only = (a: string[], b: string[]) => a.filter((x) => !b.includes(x));
      diffs[k]!.push(`${c.id}: orig only ${JSON.stringify(only(want, got))} | ${copies[k]} only ${JSON.stringify(only(got, want))}`);
    }
  });
}
console.log(`${inputs.length} inputs, ${lines} verdict lines from orig`);
copies.forEach((c, k) => { console.log(`${c}: ${diffs[k]!.length} inputs differ`); for (const d of diffs[k]!) console.log(`  ${d.slice(0, 300)}`); });
