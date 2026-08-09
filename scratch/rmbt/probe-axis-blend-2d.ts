// Two knobs, because the coordinates are not symmetric. wX is how much of the
// row pass's x to keep, wY how much of the column pass's y. (1,1) is shipped
// behaviour; (1,0) is "use the column pass only to FIND marks, never to place
// them", which the one-knob sweep could not express.
//
// Paired throughout: a mark counts only where every arm produced a value.
import { chromium } from "playwright";
import { resolve } from "node:path";
import { readFileSync } from "node:fs";

const t = readFileSync("modules/@tomlarkworthy/coded-landmark-tracking.js", "utf8");
const s = t.indexOf("const _1m3an4z = function _mergeManAxes(");
const e = t.indexOf("\nconst _", s + 10);
const MERGE_SRC = t.slice(s, e).replace(/^const _1m3an4z = /, "").replace(/;\s*$/, "");
if (!/axisBlendY/.test(MERGE_SRC)) throw new Error("two-knob mergeManAxes not found");

const IN = resolve("lopebooks/notebooks/tomlarkworthy_coded-landmark-tracking.html");
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errs: string[] = [];
page.on("pageerror", (x) => errs.push(x.message.slice(0, 160)));
await page.addInitScript(() => {
  const orig = (window as any).Runtime; let cap = false;
  Object.defineProperty(window, "Runtime", { get() { return orig; }, set(N: any) {
    const W = function (this: any, ...a: any[]) { const i = new N(...a); if (!cap) { (window as any).__ojs_runtime = i; cap = true; } return i; };
    W.prototype = N.prototype; Object.assign(W, N); return W; } });
});
await page.goto(`file://${IN}#view=S100(@tomlarkworthy/coded-landmark-tracking)`, { waitUntil: "networkidle", timeout: 300000 });
await page.waitForFunction(() => !!(window as any).__ojs_runtime, { timeout: 300000 });
await page.waitForTimeout(15000);

const out = await page.evaluate(async (MERGE_SRC: string) => {
  const rt = (window as any).__ojs_runtime;
  const mod = rt.mains.get("@tomlarkworthy/coded-landmark-tracking");
  const val = async (n: string) => {
    const v = [...rt._variables].find((z: any) => z._module === mod && z._name === n);
    if (!v) throw new Error("no variable " + n); return await v._promise;
  };
  mod.redefine("mergeManAxes", ["unrotatePoint"], (0, eval)("(" + MERGE_SRC + ")"));
  await new Promise((r) => setTimeout(r, 1500));
  const [bank, opts, analyze, ransac, T, score] = await Promise.all(
    ["hexFrameBank", "hexRigOpts", "analyzeFrameMan", "fitPlaneRansac", "hexTarget", "hexRigScore"].map(val)
  );

  const ARMS: any[] = [
    { tag: "single axis",  o: { bothAxes: false } },
    { tag: "1,1 SHIPPED",  o: { bothAxes: true, axisBlendX: 1, axisBlendY: 1 } },
    { tag: "1,0 find-only",o: { bothAxes: true, axisBlendX: 1, axisBlendY: 0 } },
    { tag: "1,0.5",        o: { bothAxes: true, axisBlendX: 1, axisBlendY: 0.5 } },
    { tag: "1,0.75",       o: { bothAxes: true, axisBlendX: 1, axisBlendY: 0.75 } },
    { tag: "1,0.9",        o: { bothAxes: true, axisBlendX: 1, axisBlendY: 0.9 } },
    { tag: "0.9,0.9",      o: { bothAxes: true, axisBlendX: 0.9, axisBlendY: 0.9 } },
    { tag: "0.5,0.5 avg",  o: { bothAxes: true, axisBlendX: 0.5, axisBlendY: 0.5 } },
    { tag: "0.5,0",        o: { bothAxes: true, axisBlendX: 0.5, axisBlendY: 0 } },
    { tag: "0,0",          o: { bothAxes: true, axisBlendX: 0, axisBlendY: 0 } }
  ];

  const resid: any = {}, loo: any = {}, counts: any = {}, perFrame: any = {};
  for (const A of ARMS) {
    resid[A.tag] = new Map(); loo[A.tag] = new Map(); perFrame[A.tag] = [];
    counts[A.tag] = { read: 0, missing: 0, misplaced: 0, off: 0 };
    for (const bk of bank as any[]) {
      const res = analyze({ gray: bk.frame.gray, w: bk.frame.w, h: bk.frame.h }, { ...opts, ...A.o });
      const sc = score(res, bk.truth);
      counts[A.tag].read += sc.counts.read; counts[A.tag].missing += sc.counts.missing;
      counts[A.tag].misplaced += sc.counts.misplaced; counts[A.tag].off += sc.offTarget.length;
      const fr: number[] = [];
      for (const m of sc.marks) if (m.residualPx != null) {
        resid[A.tag].set(bk.name + "/" + m.id, m.residualPx); fr.push(m.residualPx);
      }
      const marks = (res.fused ?? []).filter((f: any) => T.byId.has(f.id))
        .map((f: any) => ({ x: f.xc, y: f.yc, id: f.id }));
      const byId = new Map((bk.truth as any[]).map((x: any) => [x.id, x]));
      for (const held of marks) {
        const tr: any = byId.get(held.id); if (!tr) continue;
        const rest = marks.filter((z) => z !== held);
        if (rest.length < 5) continue;
        const plane = ransac(rest); if (!plane || !plane.fit) continue;
        const mk = T.byId.get(held.id);
        const [px, py] = plane.fit.map(mk.xMm, mk.yMm);
        loo[A.tag].set(bk.name + "/" + held.id, Math.hypot(px - tr.x, py - tr.y));
      }
      fr.sort((a, b) => a - b);
      perFrame[A.tag].push({ name: bk.name, p50: fr.length ? +fr[fr.length >> 1].toFixed(2) : null });
    }
  }

  const tags = ARMS.map((A) => A.tag);
  const common = (M: any) => { let set = [...M[tags[0]].keys()];
    for (const k of tags.slice(1)) set = set.filter((x: any) => M[k].has(x)); return set; };
  const rK = common(resid), lK = common(loo);
  const stat = (v: number[]) => { const q = v.slice().sort((a, b) => a - b);
    return q.length ? { n: q.length, p50: +q[q.length >> 1].toFixed(2),
      p90: +q[Math.floor(q.length * 0.9)].toFixed(2), worst: +q[q.length - 1].toFixed(2),
      mean: +(q.reduce((a, c) => a + c, 0) / q.length).toFixed(3) } : null; };
  const base = "1,1 SHIPPED";
  const rows = tags.map((k) => ({
    tag: k, counts: counts[k],
    resid: stat(rK.map((x: any) => resid[k].get(x))),
    loo: stat(lK.map((x: any) => loo[k].get(x))),
    better: rK.filter((x: any) => resid[k].get(x) < resid[base].get(x) - 1e-9).length,
    worse: rK.filter((x: any) => resid[k].get(x) > resid[base].get(x) + 1e-9).length,
    looBetter: lK.filter((x: any) => loo[k].get(x) < loo[base].get(x) - 1e-9).length,
    looWorse: lK.filter((x: any) => loo[k].get(x) > loo[base].get(x) + 1e-9).length
  }));
  return { rows, rN: rK.length, lN: lK.length, perFrame, tags };
}, MERGE_SRC);

console.log(`paired on ${out.rN} residual marks / ${out.lN} LOO marks\n`);
console.log("arm            read miss |  resid p50  p90   mean   | vs shipped  |  LOO p50  p90   mean   | vs shipped");
for (const r of out.rows) {
  console.log(`${r.tag.padEnd(15)}${String(r.counts.read).padEnd(5)}${String(r.counts.missing).padEnd(6)}|  ` +
    `${String(r.resid?.p50).padEnd(10)}${String(r.resid?.p90).padEnd(6)}${String(r.resid?.mean).padEnd(7)}| ` +
    `${(r.better + "/" + r.worse).padEnd(12)}|  ` +
    `${String(r.loo?.p50).padEnd(9)}${String(r.loo?.p90).padEnd(6)}${String(r.loo?.mean).padEnd(7)}| ${r.looBetter}/${r.looWorse}`);
}
console.log("\nper-frame residual p50:");
const names = out.perFrame[out.tags[0]].map((x: any) => x.name);
console.log("  frame".padEnd(30) + out.tags.map((h: string) => h.slice(0, 11).padEnd(12)).join(""));
for (let i = 0; i < names.length; i++)
  console.log("  " + String(names[i]).slice(0, 26).padEnd(28) +
    out.tags.map((h: string) => String(out.perFrame[h][i].p50).padEnd(12)).join(""));
console.log("pageerrors:", errs.length ? errs.slice(0, 4) : "none");
await browser.close();
