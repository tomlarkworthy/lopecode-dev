// Soft y-swap: how much of the column pass's y to take, as a function of how
// far the two passes disagree about y. d0 = Infinity is the shipped hard swap,
// d0 = 0 is find-only. Paired, and reported over ALL frames rather than only
// the LOO-eligible ones, because the previous sweep's LOO set was 7 frames and
// one of them dominated it.
import { chromium } from "playwright";
import { resolve } from "node:path";
import { readFileSync } from "node:fs";

const t = readFileSync("modules/@tomlarkworthy/coded-landmark-tracking.js", "utf8");
const s = t.indexOf("const _1m3an4z = function _mergeManAxes(");
const e = t.indexOf("\nconst _", s + 10);
const MERGE_SRC = t.slice(s, e).replace(/^const _1m3an4z = /, "").replace(/;\s*$/, "");
if (!/axisBlendHalf/.test(MERGE_SRC)) throw new Error("soft-blend mergeManAxes not found");

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

  const ARMS = [
    { tag: "hard swap", o: { bothAxes: true } },
    { tag: "d0=8",  o: { bothAxes: true, axisBlendHalf: 8 } },
    { tag: "d0=5",  o: { bothAxes: true, axisBlendHalf: 5 } },
    { tag: "d0=3",  o: { bothAxes: true, axisBlendHalf: 3 } },
    { tag: "d0=2",  o: { bothAxes: true, axisBlendHalf: 2 } },
    { tag: "d0=1.5",o: { bothAxes: true, axisBlendHalf: 1.5 } },
    { tag: "d0=1",  o: { bothAxes: true, axisBlendHalf: 1 } },
    { tag: "d0=0.5",o: { bothAxes: true, axisBlendHalf: 0.5 } },
    { tag: "find-only", o: { bothAxes: true, axisBlendHalf: 0 } },
    { tag: "single axis", o: { bothAxes: false } }
  ];
  const resid: any = {}, loo: any = {}, counts: any = {};
  for (const A of ARMS) {
    resid[A.tag] = new Map(); loo[A.tag] = new Map();
    counts[A.tag] = { read: 0, missing: 0, misplaced: 0, off: 0 };
    for (const bk of bank as any[]) {
      const res = analyze({ gray: bk.frame.gray, w: bk.frame.w, h: bk.frame.h }, { ...opts, ...A.o });
      const sc = score(res, bk.truth);
      counts[A.tag].read += sc.counts.read; counts[A.tag].missing += sc.counts.missing;
      counts[A.tag].misplaced += sc.counts.misplaced; counts[A.tag].off += sc.offTarget.length;
      for (const m of sc.marks) if (m.residualPx != null) resid[A.tag].set(bk.name + "/" + m.id, m.residualPx);
      const marks = (res.fused ?? []).filter((f: any) => T.byId.has(f.id)).map((f: any) => ({ x: f.xc, y: f.yc, id: f.id }));
      const byId = new Map((bk.truth as any[]).map((x: any) => [x.id, x]));
      for (const held of marks) {
        const tr: any = byId.get(held.id); if (!tr) continue;
        const rest = marks.filter((z) => z !== held);
        if (rest.length < 5) continue;
        const pl = ransac(rest); if (!pl || !pl.fit) continue;
        const mk = T.byId.get(held.id);
        const [px, py] = pl.fit.map(mk.xMm, mk.yMm);
        loo[A.tag].set(bk.name + "/" + held.id, Math.hypot(px - tr.x, py - tr.y));
      }
    }
  }
  const tags = ARMS.map((A) => A.tag);
  const common = (M: any) => { let set = [...M[tags[0]].keys()];
    for (const k of tags.slice(1)) set = set.filter((x: any) => M[k].has(x)); return set; };
  const rK = common(resid), lK = common(loo);
  const stat = (v: number[]) => { const q = v.slice().sort((a, b) => a - b);
    return q.length ? { p50: +q[q.length >> 1].toFixed(2), p90: +q[Math.floor(q.length * 0.9)].toFixed(2),
      mean: +(q.reduce((a, c) => a + c, 0) / q.length).toFixed(3), worst: +q[q.length - 1].toFixed(2) } : null; };
  const base = "hard swap";
  return { rN: rK.length, lN: lK.length, rows: tags.map((k) => ({
    tag: k, counts: counts[k],
    resid: stat(rK.map((x: any) => resid[k].get(x))), loo: stat(lK.map((x: any) => loo[k].get(x))),
    rB: rK.filter((x: any) => resid[k].get(x) < resid[base].get(x) - 1e-9).length,
    rW: rK.filter((x: any) => resid[k].get(x) > resid[base].get(x) + 1e-9).length,
    lB: lK.filter((x: any) => loo[k].get(x) < loo[base].get(x) - 1e-9).length,
    lW: lK.filter((x: any) => loo[k].get(x) > loo[base].get(x) + 1e-9).length
  })) };
}, MERGE_SRC);

console.log(`paired on ${out.rN} residual marks / ${out.lN} LOO marks\n`);
console.log("arm          read miss |  resid p50  p90   mean   worst | B/W   |  LOO p50 p90   mean   worst | B/W");
for (const r of out.rows)
  console.log(`${r.tag.padEnd(13)}${String(r.counts.read).padEnd(5)}${String(r.counts.missing).padEnd(6)}|  ` +
    `${String(r.resid?.p50).padEnd(10)}${String(r.resid?.p90).padEnd(6)}${String(r.resid?.mean).padEnd(7)}${String(r.resid?.worst).padEnd(7)}| ` +
    `${(r.rB + "/" + r.rW).padEnd(6)}|  ${String(r.loo?.p50).padEnd(8)}${String(r.loo?.p90).padEnd(6)}` +
    `${String(r.loo?.mean).padEnd(7)}${String(r.loo?.worst).padEnd(7)}| ${r.lB}/${r.lW}`);
console.log("pageerrors:", errs.length ? errs.slice(0, 4) : "none");
await browser.close();
