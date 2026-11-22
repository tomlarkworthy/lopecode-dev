// bun run.ts <batch.ts>... [--only s] [--compiled]: every candidate through harness.ts runCand
import { runCand } from "./harness.ts";
import { compileModule } from "../../lite/toolchain/ss-toolchain.ts";
const arg = (k: string) => { const i = process.argv.indexOf(k); return i < 0 ? null : process.argv[i + 1]!; };
const ONLY = arg("--only"), COMPILED = process.argv.includes("--compiled");
const late: string[] = [];
process.on("unhandledRejection", (e: any) => { late.push(String(e?.message ?? e).slice(0, 140)); });
process.on("uncaughtException", (e: any) => { late.push("uncaught " + String(e?.message ?? e).slice(0, 140)); });
let n = 0, acc = 0, sil = 0, ctl = 0, ctlFired = 0, pend = 0;
const silent: string[] = [];
for (const f of process.argv.slice(2).filter((x) => x.endsWith(".ts"))) {
  const { cands } = await import(new URL(f, `file://${process.cwd()}/`).pathname);
  for (const p of cands) {
    if (ONLY && !p.name.includes(ONLY)) continue;
    late.length = 0;
    if (p.ctl) ctl++; else n++;
    if (COMPILED) try { for (const c of compileModule(p.src, true)) console.log(`   compiled ${c.name}: ${c.definition.slice(0, 1200)}`); } catch (x) { console.log(`   compile threw ${(x as Error).message}`); }
    let r;
    try { r = await runCand(p); } catch (x) { console.log(`== ${f}:${p.name}: harness crash ${(x as Error).message}`); continue; }
    console.log(`== ${f}:${p.name}: ${r.verdict.slice(0, 240)}`);
    for (const l of r.lines) console.log(`   ${l}`);
    if (late.length) console.log(`   late throws: ${late.join(" | ")}`);
    if (!r.ok) continue;
    if (p.ctl) { if (r.silent.length) ctlFired++; console.log(`   CONTROL ${r.silent.length ? "FIRED" : "DID NOT FIRE"}`); continue; }
    acc++;
    if (r.lines.some((l: string) => l.startsWith("PENDING"))) pend++;
    if (r.silent.length) { sil++; silent.push(`${f}:${p.name}`); }
  }
}
console.log(`-- controls ${ctl}, fired ${ctlFired}`);
console.log(`-- accepted with a cell still pending at the end: ${pend}`);
console.log(`-- ${n} candidates, accepted ${acc}, silent ${sil}`);
for (const s of silent) console.log(`SILENT ${s}`);
process.exit(0);
