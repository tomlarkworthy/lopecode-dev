// Decompose the classic bank's 0/180 disagreement into its along-scan (x) and
// across-scan (y) components. Turns 0 and 180 both scan along image x, so dx
// compares two MEASURED centres and dy compares two V-fit EXTRAPOLATIONS. If
// dy dominates, the single hypot bar is the defect, not the detector.
import { chromium } from "playwright";
import { resolve } from "node:path";
const NB = resolve(process.argv[2] ?? "lopebooks/notebooks/tomlarkworthy_coded-landmark-tracking.html");
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
page.on("pageerror", (e) => console.error("PAGE ERROR:", e.message));
await page.addInitScript(() => {
  const orig = (window as any).Runtime; let cap = false;
  Object.defineProperty(window, "Runtime", { get() { return orig; },
    set(N: any) { const W = function (this: any, ...a: any[]) { const i = new N(...a); if (!cap) { (window as any).__ojs_runtime = i; cap = true; } return i; }; W.prototype = N.prototype; Object.assign(W, N); return W; } });
});
await page.goto(`file://${NB}`, { waitUntil: "networkidle", timeout: 120000 });
await page.waitForFunction(() => !!(window as any).__ojs_runtime, { timeout: 120000 });
await page.waitForTimeout(11000);
const out = await page.evaluate(async () => {
  const rt = (window as any).__ojs_runtime; const vars = [...rt._variables];
  const v = vars.find((z: any) => z._name === "testFrameResults");
  const res: any = await v._module.value("testFrameResults");
  return res.map((f: any) => {
    const t0 = f.turns[0].at, t2 = f.turns[2].at, t1 = f.turns[1].at, t3 = f.turns[3].at;
    const rows: any[] = [];
    for (const id of f.unionIds) {
      const a = t0.get(id), b = t2.get(id);
      const c = t1.get(id), d = t3.get(id);
      rows.push({
        id,
        dx0180: a && b ? +Math.abs(a.x - b.x).toFixed(2) : null,
        dy0180: a && b ? +Math.abs(a.y - b.y).toFixed(2) : null,
        dx90270: c && d ? +Math.abs(c.x - d.x).toFixed(2) : null,
        dy90270: c && d ? +Math.abs(c.y - d.y).toFixed(2) : null,
      });
    }
    return { name: f.name, pass: f.pass, primary: f.primaryDisagreePx, worst: f.worstDisagreePx, rows };
  });
});
for (const f of out) {
  console.log(`\n=== ${f.name}   pass:${f.pass}  primary(hypot) ${f.primary?.toFixed?.(2)}  worstAnyTurn ${f.worst?.toFixed?.(2)}`);
  console.log("  id   |dx| 0/180   |dy| 0/180     |dx| 90/270  |dy| 90/270");
  for (const r of f.rows)
    console.log(`  ${String(r.id).padStart(2)}   ${String(r.dx0180).padStart(9)}   ${String(r.dy0180).padStart(9)}     ${String(r.dx90270).padStart(9)}  ${String(r.dy90270).padStart(9)}`);
  const mx = (k: string) => Math.max(...f.rows.map((r: any) => r[k] ?? 0));
  console.log(`  MAX  ${mx("dx0180").toFixed(2).padStart(9)}   ${mx("dy0180").toFixed(2).padStart(9)}     ${mx("dx90270").toFixed(2).padStart(9)}  ${mx("dy90270").toFixed(2).padStart(9)}`);
}
await browser.close();
