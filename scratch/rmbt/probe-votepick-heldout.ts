// Held-out validation of the voteMargin pick.
//
// voteMargin was CHOSEN by looking at the 16-frame bank, so scoring it there is
// not evidence. The archive has ~174 labelled cases; this scores base vs vote
// on every case the bank does NOT contain, through the pooled path the live
// camera uses. Batched because the payload is 691KB of luma per case.
import { chromium } from "playwright";
import { resolve } from "node:path";
import { readFileSync, readdirSync } from "node:fs";

const DIR = resolve("data/hexcases");
const NB = resolve("lopebooks/notebooks/tomlarkworthy_coded-landmark-tracking.html");
const t = readFileSync("modules/@tomlarkworthy/coded-landmark-tracking.js", "utf8");
const s = t.indexOf("const _1m3an4z = function _mergeManAxes(");
const e = t.indexOf("\nconst _", s + 10);
const SRC = t.slice(s, e).replace(/^const _1m3an4z = /, "").replace(/;\s*$/, "");
if (!/axisPick/.test(SRC)) throw new Error("axisPick not in working copy");

const names = readdirSync(DIR).filter((f) => f.endsWith(".gray")).map((f) => f.slice(0, -5)).sort();
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
const errs: string[] = [];
page.on("pageerror", (x) => errs.push(x.message.slice(0, 140)));
await page.addInitScript(() => {
  const orig = (window as any).Runtime; let cap = false;
  Object.defineProperty(window, "Runtime", { get() { return orig; }, set(N: any) {
    const W = function (this: any, ...a: any[]) { const i = new N(...a); if (!cap) { (window as any).__ojs_runtime = i; cap = true; } return i; };
    W.prototype = N.prototype; Object.assign(W, N); return W; } });
});
await page.goto(`file://${NB}#view=S100(@tomlarkworthy/coded-landmark-tracking)`, { waitUntil: "networkidle", timeout: 300000 });
await page.waitForFunction(() => !!(window as any).__ojs_runtime, { timeout: 300000 });
await page.waitForTimeout(15000);

await page.evaluate(async (SRC: string) => {
  const rt = (window as any).__ojs_runtime;
  const mod = rt.mains.get("@tomlarkworthy/coded-landmark-tracking");
  mod.redefine("mergeManAxes", ["unrotatePoint"], (0, eval)("(" + SRC + ")"));
  await new Promise((r) => setTimeout(r, 1500));
  const val = async (n: string) => {
    const v = [...rt._variables].find((z: any) => z._module === mod && z._name === n);
    return v ? await v._promise : null;
  };
  const g: any = globalThis;
  g.__bankNames = new Set(((await val("hexFrameBank")) as any[]).map((b: any) => b.name));
  g.__opts = await val("hexRigOpts");
  g.__async = await val("analyzeFrameManAsync");
  g.__pool = await val("detectPool");
  g.__score = await val("hexRigScore");
}, SRC);

const bankNames: string[] = await page.evaluate(() => [...(globalThis as any).__bankNames]);
const heldOut = names.filter((n) => !bankNames.includes(n));
console.log(`archive ${names.length} cases; bank holds ${bankNames.length}; held out ${heldOut.length}`);

const residBase = new Map<string, number>(), residVote = new Map<string, number>();
let counts = { base: { read: 0, missing: 0, misplaced: 0, off: 0 }, vote: { read: 0, missing: 0, misplaced: 0, off: 0 } };
let picks = 0, flips = 0, skipped = 0, graded = 0;

const B = 12;
for (let i = 0; i < heldOut.length; i += B) {
  const batch = heldOut.slice(i, i + B).map((n) => {
    const meta = JSON.parse(readFileSync(resolve(DIR, n + ".json"), "utf8"));
    return { meta, grayB64: readFileSync(resolve(DIR, n + ".gray")).toString("base64") };
  }).filter((c) => c.meta.labelled && Array.isArray(c.meta.truth) && c.meta.truth.length);

  const res = await page.evaluate(async (payload: any[]) => {
    const g: any = globalThis;
    const out: any = { resid: [], counts: { base: { read: 0, missing: 0, misplaced: 0, off: 0 }, vote: { read: 0, missing: 0, misplaced: 0, off: 0 } }, picks: 0, flips: 0, skipped: 0, graded: 0 };
    for (const c of payload) {
      const bin = atob(c.grayB64);
      const gray = new Uint8Array(bin.length);
      for (let k = 0; k < bin.length; k++) gray[k] = bin.charCodeAt(k);
      if (gray.length !== c.meta.w * c.meta.h) { out.skipped++; continue; }
      const frame = { gray, w: c.meta.w, h: c.meta.h };
      out.graded++;
      for (const arm of ["base", "vote"]) {
        const o: any = { ...g.__opts, bothAxes: true, runRows: g.__pool.runRows };
        if (arm === "vote") o.axisPick = "vote";
        const r = await g.__async(frame, o);
        const sc = g.__score(r, c.meta.truth);
        out.counts[arm].read += sc.counts.read; out.counts[arm].missing += sc.counts.missing;
        out.counts[arm].misplaced += sc.counts.misplaced; out.counts[arm].off += sc.offTarget.length;
        if (arm === "vote") for (const m of (r.fused ?? [])) if (m.axis === "both") { out.picks++; if (m.pickedCol === false) out.flips++; }
        for (const m of sc.marks) if (m.residualPx != null) out.resid.push([arm, c.meta.name + "/" + m.id, m.residualPx]);
      }
    }
    return out;
  }, batch);

  for (const [arm, k, v] of res.resid) (arm === "base" ? residBase : residVote).set(k, v);
  for (const a of ["base", "vote"] as const) for (const k of ["read", "missing", "misplaced", "off"] as const) counts[a][k] += res.counts[a][k];
  picks += res.picks; flips += res.flips; skipped += res.skipped; graded += res.graded;
  process.stdout.write(`\r  graded ${graded}/${heldOut.length}`);
}
console.log();

const ks = [...residBase.keys()].filter((k) => residVote.has(k));
const st = (v: number[]) => { const q = v.slice().sort((a, b) => a - b);
  return { n: q.length, p50: +q[q.length >> 1].toFixed(3), p90: +q[Math.floor(q.length * 0.9)].toFixed(2),
    mean: +(q.reduce((a, c) => a + c, 0) / q.length).toFixed(3), worst: +q[q.length - 1].toFixed(2) }; };
const better = ks.filter((k) => residVote.get(k)! < residBase.get(k)! - 1e-9);
const worse = ks.filter((k) => residVote.get(k)! > residBase.get(k)! + 1e-9);
const g = (kk: string[]) => +kk.reduce((x, k) => x + (residVote.get(k)! - residBase.get(k)!), 0).toFixed(2);

console.log(`\ncases graded ${graded} (skipped ${skipped}), fused-from-both marks ${picks}, vote flipped to row ${flips}`);
console.log(`counts  base: read ${counts.base.read} missing ${counts.base.missing} misplaced ${counts.base.misplaced} off ${counts.base.off}`);
console.log(`        vote: read ${counts.vote.read} missing ${counts.vote.missing} misplaced ${counts.vote.misplaced} off ${counts.vote.off}`);
console.log(`\nresidual, paired on ${ks.length} marks`);
console.log(`  base ${JSON.stringify(st(ks.map((k) => residBase.get(k)!)))}`);
console.log(`  vote ${JSON.stringify(st(ks.map((k) => residVote.get(k)!)))}`);
console.log(`  ${better.length} better (${g(better)}px)   ${worse.length} worse (+${g(worse)}px)   NET ${(g(better) + g(worse)).toFixed(2)}px`);

import { writeFileSync } from "node:fs";
writeFileSync("scratch/rmbt/votepick-heldout.json", JSON.stringify(
  ks.map((k) => ({ k, base: residBase.get(k), vote: residVote.get(k) })), null, 0));
console.log("wrote scratch/rmbt/votepick-heldout.json");
console.log("pageerrors:", errs.length ? errs.slice(0, 3) : "none");
await browser.close();
