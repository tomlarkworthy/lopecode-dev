// bun tally.ts: per set and mode, from the ROW lines of <set>-<mode>.txt
import { readFileSync, existsSync } from "node:fs";
const SETS = ["r1", "r2", "r3", "s1", "s56", "t1"], MODES = ["a", "b", "c", "d"];
const NAME: Record<string, string> = { a: "shipped", b: "REG=0", c: "BODYFN=0", d: "REG=0+BODYFN=0" };
const load = (f: string) => readFileSync(f, "utf8").split("\n").filter((l) => l.startsWith("ROW ")).map((l) => JSON.parse(l.slice(4)));
const out: string[] = [];
out.push("set\tmode\tprograms\tcontrols\taccepted\tbase-accepted\tsilent(chk on)\tsilent(chk skipped)\tcontrols fired\tthrow classes (chk on | skipped)");
const silentBy: Record<string, string[]> = {};
for (const s of SETS) for (const m of MODES) {
  const f = `${s}-${m}.txt`;
  if (!existsSync(f)) continue;
  const rows = load(f), progs = rows.filter((r) => !r.ctl), ctls = rows.filter((r) => r.ctl);
  const cls = (k: "chk" | "skip") => { const c: Record<string, number> = {}; for (const r of progs) if (r[k]) c[r[k].cls] = (c[r[k].cls] ?? 0) + 1; return Object.entries(c).map(([a, b]) => `${a} ${b}`).join(", "); };
  const sc = progs.filter((r) => r.chk?.silent), ss = progs.filter((r) => r.skip?.silent);
  const cf = ctls.filter((r) => r.skip?.silent);
  out.push(`${s}\t${NAME[m]}\t${progs.length}\t${ctls.length}\t${progs.filter((r) => r.acc).length}\t${progs.filter((r) => r.base).length}\t${sc.length}\t${ss.length}\t${cf.length}/${ctls.length}\t${cls("chk")} | ${cls("skip")}`);
  silentBy[`${s} ${NAME[m]} chk-on`] = sc.map((r) => r.name);
  silentBy[`${s} ${NAME[m]} chk-skipped`] = ss.map((r) => r.name);
  silentBy[`${s} ${NAME[m]} controls fired`] = cf.map((r) => r.name);
}
console.log(out.join("\n"));
console.log("");
for (const [k, v] of Object.entries(silentBy)) console.log(`## ${k}: ${v.length}\n${v.join(" ")}`);
