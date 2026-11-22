// paper-attack probes (snap/paper-attack/k1*.ts) under the prototype: checker verdict (env switches), then a run;
// a probe accepted that runs with no cell in error made a plain alias and then wrote the object: I broken (by construction)
import { verdictOf } from "./tree/lite/infer/attack/run-sets.ts";
import { runCells } from "./tree/lite/browser/run.ts";
import { readdirSync } from "node:fs";
process.on("unhandledRejection", () => {});
const dir = new URL("./snap/paper-attack/", import.meta.url).pathname;
let n = 0, acc = 0, broke = 0, threw = 0; const brokeList: string[] = [];
for (const f of readdirSync(dir).filter((f) => /^k1[a-h]\.ts$/.test(f)).sort()) {
  for (const p of (await import(dir + f)).progs) {
    n++;
    const v = verdictOf(p.src, null, false);
    if (!v.ok) { console.log(`== ${f}:${p.name}: ${v.text.slice(0, 160)}`); continue; }
    acc++;
    const prog = runCells(p.src, { tsx: true });
    await prog.settle(800);
    const errs = [...prog.recs.values()].filter((r) => r.status === "rejected").map((r) => `${r.name}: ${String((r.error as Error)?.message ?? r.error).slice(0, 100)}`);
    const vals = [...prog.recs.values()].map((r) => `${r.name}=${JSON.stringify(r.value)?.slice(0, 60)}`);
    prog.dispose();
    if (errs.length) threw++; else { broke++; brokeList.push(`${f}:${p.name}`); }
    console.log(`== ${f}:${p.name}: ACCEPT ${errs.length ? "THREW " + errs.join("; ") : "RAN " + vals.join(" ")}`);
  }
}
console.log(`-- paper k1: ${n} probes, accepted ${acc}, accepted+threw ${threw}, accepted+ran (alias made, write not stopped) ${broke}`);
for (const b of brokeList) console.log(`RAN ${b}`);
process.exit(0);
