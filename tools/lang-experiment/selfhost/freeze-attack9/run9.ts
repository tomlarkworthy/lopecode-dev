// bun selfhost/freeze-attack9/run9.ts <set.ts>... [--only s]: each cand through run-sets' verdictOf (rules on, the check's
// facts kept so casts get their shapes) and, when accepted (or ctl), observe.ts observeProgram (which supports
// fetchValue and the publish tap). Silent: a CHANGED line, a drive line with DIFF, or a published-value change.
import { verdictOf } from "../../lite/infer/attack/run-sets.ts";
import { observeProgram } from "../../lite/infer/attack/observe.ts";
const late: string[] = [];
process.on("unhandledRejection", (e: any) => { late.push(String(e?.message ?? e).slice(0, 140)); });
process.on("uncaughtException", (e: any) => { late.push("uncaught " + String(e?.message ?? e).slice(0, 140)); });
const ONLY = (() => { const i = process.argv.indexOf("--only"); return i < 0 ? null : process.argv[i + 1]!; })();
let n = 0, acc = 0, sil = 0, ctl = 0, ctlFired = 0, crash = 0;
const silent: string[] = [];
for (const f of process.argv.slice(2).filter((x) => x.endsWith(".ts"))) {
  const { cands } = await import(new URL(f, `file://${process.cwd()}/`).pathname);
  for (const p of cands) {
    if (ONLY && !p.name.includes(ONLY)) continue;
    late.length = 0;
    if (p.ctl) ctl++; else n++;
    const t0 = performance.now();
    const v = verdictOf(p.src, null, false, !!p.ctl);
    const ms = Math.round(performance.now() - t0);
    console.log(`== ${f}:${p.name}${p.ctl ? " [ctl]" : ""}: ${v.text.slice(0, 300)}${ms > 3000 ? ` (check ${ms} ms)` : ""}`);
    if (!v.ok) continue;
    let r;
    try { r = await observeProgram({ ...p, checked: v.checked }); } catch (x) { crash++; console.log(`   harness crash ${(x as Error).message}`); continue; }
    for (const l of r.lines) console.log(`   ${l}`);
    if (late.length) console.log(`   late throws: ${late.join(" | ")}`);
    const fired = r.silent.length > 0;
    if (p.ctl) { if (fired) ctlFired++; console.log(`   CONTROL ${fired ? "FIRED" : "DID NOT FIRE"}`); continue; }
    acc++;
    if (fired) { sil++; silent.push(`${f}:${p.name}`); console.log("   SILENT"); }
  }
}
console.log(`-- controls ${ctl}, fired ${ctlFired}`);
console.log(`-- harness crashes ${crash}`);
console.log(`-- ${n} candidates, accepted ${acc}, silent ${sil}`);
for (const s of silent) console.log(`SILENT ${s}`);
process.exit(0);
