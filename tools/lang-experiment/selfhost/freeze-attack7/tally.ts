// bun tally.ts: the per-set table from <set>-a.txt and <set>-b.txt, and every crash-like line
import { readFileSync } from "node:fs";
const sets = ["b1", "b2", "b4", "b5", "b6", "b7", "b8"];
const num = (t: string, re: RegExp) => Number(t.match(re)?.[1] ?? NaN);
console.log("| set | programs | accepted | silent A | silent B | controls | fired A | fired B |\n|---|---|---|---|---|---|---|---|");
const tot = [0, 0, 0, 0, 0, 0, 0];
for (const s of sets) {
  const a = readFileSync(`${s}-a.txt`, "utf8"), b = readFileSync(`${s}-b.txt`, "utf8");
  const row = [num(a, /-- (\d+) candidates/), num(a, /accepted (\d+)/), num(a, /silent (\d+)/), num(b, /silent (\d+)/), num(a, /-- controls (\d+)/), num(a, /fired (\d+)/), num(b, /fired (\d+)/)];
  if (num(a, /accepted (\d+)/) !== num(b, /accepted (\d+)/)) console.log(`!! ${s}: accepted differs between modes`);
  row.forEach((x, i) => (tot[i] += x));
  console.log(`| ${s} | ${row.join(" | ")} |`);
}
console.log(`| total | ${tot.join(" | ")} |`);
for (const s of sets) for (const m of ["a", "b"]) {
  const t = readFileSync(`${s}-${m}.txt`, "utf8");
  for (const l of t.split("\n")) if (/harness crash:|late throws|PENDING|run crash|drive threw/.test(l)) console.log(`${s}-${m}: ${l.trim().slice(0, 200)}`);
  console.log(`${s}-${m}: ${(t.match(/-- harness crashes \d+/) ?? ["?"])[0]}`);
}
