// bun run.ts <set.ts>...: freeze-attack3's runCand on each program; silent = a CHANGED line (harness) or a drive
// line containing DIFF (the drive compares what a cell was given with what it holds after the run)
import { runCand } from "../freeze-attack3/harness.ts";
const late: string[] = [];
process.on("unhandledRejection", (e: any) => { late.push(String(e?.message ?? e).slice(0, 140)); });
process.on("uncaughtException", (e: any) => { late.push("uncaught " + String(e?.message ?? e).slice(0, 140)); });
const ONLY = (() => { const i = process.argv.indexOf("--only"); return i < 0 ? null : process.argv[i + 1]!; })();
let n = 0, acc = 0, sil = 0, ctl = 0, ctlFired = 0, ctlAcc = 0, crash = 0;
const silent: string[] = [], crashes: string[] = [];
for (const f of process.argv.slice(2).filter((x) => x.endsWith(".ts"))) {
  const { cands } = await import(new URL(f, `file://${process.cwd()}/`).pathname);
  for (const p of cands) {
    if (ONLY && !p.name.includes(ONLY)) continue;
    late.length = 0;
    if (p.ctl) ctl++; else n++;
    let r;
    try { r = await runCand(p); } catch (x) { crash++; crashes.push(`${f}:${p.name}: ${(x as Error).message}`); console.log(`== ${f}:${p.name}: harness crash ${(x as Error).message}`); continue; }
    console.log(`== ${f}:${p.name}${p.ctl ? " [ctl]" : ""}: ${r.verdict.slice(0, 300)}`);
    for (const l of r.lines) console.log(`   ${l}`);
    if (late.length) console.log(`   late throws: ${late.join(" | ")}`);
    if (!r.ok) continue;
    const fired = r.silent.length > 0 || r.lines.some((l: string) => l.startsWith("drive -> ") && l.includes("DIFF"));
    if (p.ctl) { ctlAcc++; if (fired) ctlFired++; console.log(`   CONTROL ${fired ? "FIRED" : "DID NOT FIRE"}`); continue; }
    acc++;
    if (fired) { sil++; silent.push(`${f}:${p.name}`); console.log("   SILENT"); }
  }
}
console.log(`-- controls ${ctl}, ran ${ctlAcc}, fired ${ctlFired}`);
console.log(`-- harness crashes ${crash}`);
console.log(`-- ${n} candidates, accepted ${acc}, silent ${sil}`);
for (const s of silent) console.log(`SILENT ${s}`);
for (const s of crashes) console.log(`CRASH ${s}`);
process.exit(0);
