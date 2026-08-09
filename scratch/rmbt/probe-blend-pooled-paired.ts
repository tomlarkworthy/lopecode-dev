// The serial and pooled paths disagree (a known, pre-existing defect), so a
// gain measured on serial does not transfer by assumption. Paired per mark on
// the POOLED path -- the live camera path -- and swept, so the d0 plateau can
// be read there directly instead of inherited.
import { chromium } from "playwright";
import { resolve } from "node:path";
import { readFileSync } from "node:fs";

const t = readFileSync("modules/@tomlarkworthy/coded-landmark-tracking.js", "utf8");
const s = t.indexOf("const _1m3an4z = function _mergeManAxes(");
const e = t.indexOf("\nconst _", s + 10);
const MERGE_SRC = t.slice(s, e).replace(/^const _1m3an4z = /, "").replace(/;\s*$/, "");

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
  const [bank, opts, asyncA, pool, score] = await Promise.all(
    ["hexFrameBank", "hexRigOpts", "analyzeFrameManAsync", "detectPool", "hexRigScore"].map(val)
  );
  if (!pool) return { err: "no pool" };
  const D0 = [Infinity, 8, 5, 3, 2, 1, 0.5, 0];
  const resid: any = {}, counts: any = {};
  // Determinism check first: the same arm twice must give identical marks, or
  // any A/B below is measuring worker scheduling rather than the blend.
  const det: string[] = [];
  for (let pass = 0; pass < 2; pass++) {
    const acc: string[] = [];
    for (const bk of bank as any[]) {
      const r = await asyncA({ gray: bk.frame.gray, w: bk.frame.w, h: bk.frame.h },
        { ...opts, bothAxes: true, runRows: pool.runRows });
      acc.push((r.fused ?? []).map((m: any) => `${m.id}@${m.xc.toFixed(3)},${m.yc.toFixed(3)}`).sort().join("|"));
    }
    det.push(acc.join("#"));
  }
  for (const d0 of D0) {
    const k = String(d0);
    resid[k] = new Map(); counts[k] = { read: 0, missing: 0 };
    for (const bk of bank as any[]) {
      const r = await asyncA({ gray: bk.frame.gray, w: bk.frame.w, h: bk.frame.h },
        { ...opts, bothAxes: true, axisBlendHalf: d0, runRows: pool.runRows });
      const sc = score(r, bk.truth);
      counts[k].read += sc.counts.read; counts[k].missing += sc.counts.missing;
      for (const m of sc.marks) if (m.residualPx != null) resid[k].set(bk.name + "/" + m.id, m.residualPx);
    }
  }
  const tags = D0.map(String);
  let rK = [...resid[tags[0]].keys()];
  for (const k of tags.slice(1)) rK = rK.filter((x) => resid[k].has(x));
  const stat = (v: number[]) => { const q = v.slice().sort((a, b) => a - b);
    return { p50: +q[q.length >> 1].toFixed(2), p90: +q[Math.floor(q.length * 0.9)].toFixed(2),
      mean: +(q.reduce((a, c) => a + c, 0) / q.length).toFixed(3), worst: +q[q.length - 1].toFixed(2) }; };
  const base = tags[0];
  return { deterministic: det[0] === det[1], n: rK.length, rows: tags.map((k) => ({
    d0: k, counts: counts[k], stat: stat(rK.map((x) => resid[k].get(x))),
    B: rK.filter((x) => resid[k].get(x) < resid[base].get(x) - 1e-9).length,
    W: rK.filter((x) => resid[k].get(x) > resid[base].get(x) + 1e-9).length })) };
}, MERGE_SRC);

if ((out as any).err) console.log(out);
else {
  console.log(`pooled path deterministic across repeats: ${out.deterministic}`);
  console.log(`paired on ${out.n} marks\n`);
  console.log("d0        read miss |  resid p50  p90   mean   worst | better/worse vs hard swap");
  for (const r of out.rows)
    console.log(`${r.d0.padEnd(10)}${String(r.counts.read).padEnd(5)}${String(r.counts.missing).padEnd(6)}|  ` +
      `${String(r.stat.p50).padEnd(10)}${String(r.stat.p90).padEnd(6)}${String(r.stat.mean).padEnd(7)}${String(r.stat.worst).padEnd(7)}| ${r.B}/${r.W}`);
}
console.log("pageerrors:", errs.length ? errs.slice(0, 4) : "none");
await browser.close();
