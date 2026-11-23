// bun tally.ts: per set, from out-a.txt and out-b.txt
import { readFileSync } from "node:fs";
const parse = (f: string) => {
  const rows = new Map<string, { set: string; acc: boolean; ctl: boolean; fired: boolean }>();
  let cur: string | null = null;
  for (const l of readFileSync(f, "utf8").split("\n")) {
    const m = l.match(/^== (\w+)\.ts:(\S+?)( \[ctl\])?: (.*)$/);
    if (m) { cur = m[2]!; rows.set(cur, { set: m[1]!, acc: !m[4]!.startsWith("REJECT"), ctl: !!m[3], fired: false }); continue; }
    if (cur && (l === "   SILENT" || l === "   CONTROL FIRED")) rows.get(cur)!.fired = true;
  }
  return rows;
};
const A = parse("out-a.txt"), Bm = parse("out-b.txt");
const sets = [...new Set([...A.values()].map((r) => r.set))];
console.log("| set | programs | accepted | silent a | silent b | controls | fired a | fired b |\n|---|---|---|---|---|---|---|---|");
const tot = [0, 0, 0, 0, 0, 0, 0];
for (const s of sets) {
  const ks = [...A.keys()].filter((k) => A.get(k)!.set === s);
  const p = ks.filter((k) => !A.get(k)!.ctl), c = ks.filter((k) => A.get(k)!.ctl);
  const row = [p.length, p.filter((k) => A.get(k)!.acc).length, p.filter((k) => A.get(k)!.fired).length, p.filter((k) => Bm.get(k)!.fired).length, c.length, c.filter((k) => A.get(k)!.fired).length, c.filter((k) => Bm.get(k)!.fired).length];
  row.forEach((x, i) => (tot[i]! += x));
  console.log(`| ${s} | ${row.join(" | ")} |`);
}
console.log(`| total | ${tot.join(" | ")} |`);
const diff = [...A.keys()].filter((k) => A.get(k)!.acc !== Bm.get(k)!.acc);
console.log("verdict differs between modes:", diff.length);
