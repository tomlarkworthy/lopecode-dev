// bun lite/infer/attack/drive-run.ts <set.ts>... [--only s] (p1, 2026-11-23): selfhost/freeze-attack6/run.ts's check
// for any folder of `cands` (freeze-attack3/harness.ts runCand), plus observe.ts's publish tap around each run. Silent:
// a CHANGED line of the harness, a drive line containing DIFF, or a value a state write or a memo store kept that reads
// differently at the end (TAP lines; read each by hand, see tapStart). Sets load relative to the working directory.
import { runCand } from "../../../selfhost/freeze-attack3/harness.ts";
import { tapStart } from "./observe.ts";
const late: string[] = [];
process.on("unhandledRejection", (e: any) => { late.push(String(e?.message ?? e).slice(0, 140)); });
process.on("uncaughtException", (e: any) => { late.push("uncaught " + String(e?.message ?? e).slice(0, 140)); });
const ONLY = (() => { const i = process.argv.indexOf("--only"); return i < 0 ? null : process.argv[i + 1]!; })();
let n = 0, acc = 0, sil = 0, ctl = 0, ctlFired = 0, ctlAcc = 0, crash = 0, byTap = 0;
const silent: string[] = [];
for (const f of process.argv.slice(2).filter((x) => x.endsWith(".ts"))) {
  const { cands } = await import(new URL(f, `file://${process.cwd()}/`).pathname);
  for (const p of cands) {
    if (ONLY && !p.name.includes(ONLY)) continue;
    late.length = 0;
    if (p.ctl) ctl++; else n++;
    let r, tap: string[] = [];
    const stop = tapStart();
    try { r = await runCand(p); } catch (x) { crash++; console.log(`== ${f}:${p.name}: harness crash ${(x as Error).message}`); continue; } finally { tap = stop(); }
    console.log(`== ${f}:${p.name}${p.ctl ? " [ctl]" : ""}: ${r.verdict.slice(0, 300)}`);
    for (const l of r.lines) console.log(`   ${l}`);
    for (const l of tap) console.log(`   TAP ${l}`);
    if (late.length) console.log(`   late throws: ${late.join(" | ")}`);
    if (!r.ok) continue;
    const old = r.silent.length > 0 || r.lines.some((l: string) => l.startsWith("drive -> ") && l.includes("DIFF"));
    const fired = old || tap.length > 0;
    if (p.ctl) { ctlAcc++; if (fired) ctlFired++; console.log(`   CONTROL ${fired ? "FIRED" : "DID NOT FIRE"}`); continue; }
    acc++;
    if (fired) { sil++; if (!old) byTap++; silent.push(`${f}:${p.name}${old ? "" : " (tap only)"}`); console.log("   SILENT"); }
  }
}
console.log(`-- controls ${ctl}, ran ${ctlAcc}, fired ${ctlFired}`);
console.log(`-- harness crashes ${crash}`);
console.log(`-- ${n} candidates, accepted ${acc}, silent ${sil} (by the tap alone ${byTap})`);
for (const s of silent) console.log(`SILENT ${s}`);
process.exit(0);
