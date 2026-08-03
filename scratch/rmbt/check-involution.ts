// Hold the current findInvolution to the outputs recorded from an earlier one.
//
// involution-cases.json carries, for all 42984 calls the 16 bank frames make,
// both the inputs and what the implementation of the day returned. So any edit
// to the cell -- the binary-search rewrite, a Zig arm, anything -- can be
// checked against 42984 real answers in a minute instead of hoping the bank
// reports notice. Regenerate the file (capture-involution.ts) ONLY when the
// output is meant to change, otherwise it stops being a regression test.
//
//   bun scratch/rmbt/check-involution.ts
import { chromium } from "playwright";
import { resolve } from "node:path";

const arg = (n: string, d: string) => {
  const i = process.argv.indexOf("--" + n);
  return i >= 0 ? process.argv[i + 1] : d;
};
const NB = resolve(arg("nb", "lopebooks/notebooks/tomlarkworthy_coded-landmark-tracking.html"));
const cases = await Bun.file(arg("cases", "scratch/rmbt/involution-cases.json")).json();

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
page.on("pageerror", (e) => console.error("PAGEERROR", e.message.slice(0, 300)));
await page.addInitScript(() => {
  const orig = (window as any).Runtime; let cap = false;
  Object.defineProperty(window, "Runtime", { get() { return orig; }, set(N: any) {
    const W = function (this: any, ...a: any[]) { const i = new N(...a); if (!cap) { (window as any).__ojs_runtime = i; cap = true; } return i; };
    W.prototype = N.prototype; Object.assign(W, N); return W; } });
});
await page.goto(`file://${NB}`, { waitUntil: "networkidle", timeout: 180000 });
await page.waitForFunction(() => !!(window as any).__ojs_runtime, { timeout: 180000 });
await page.waitForTimeout(15000);

const out = await page.evaluate(async (calls) => {
  const rt = (window as any).__ojs_runtime;
  const mod = rt.mains.get("@tomlarkworthy/coded-landmark-tracking");
  const findInvolution = await mod.value("findInvolution");
  const bad: any[] = [];
  let nNull = 0, nReal = 0;
  // exact, not approximate: this is the same arithmetic in the same order, so
  // any drift at all is a changed answer rather than rounding.
  const same = (a: number, b: number) => a === b || (Number.isNaN(a) && Number.isNaN(b));
  for (let k = 0; k < calls.length; k++) {
    const c = calls[k];
    const r = findInvolution(c.xs.map((x: number, i: number) => ({ x, s: c.ss[i] })),
      { tolPx: c.tolPx, minInliers: c.minInliers });
    // JSON has no Infinity: the recorder wrote it as null.
    const expQ = c.out && c.out.Q === null ? Infinity : c.out && c.out.Q;
    if (!c.out) { nNull++; if (r) bad.push({ k, why: `was null, now inl ${r.inl}` }); continue; }
    nReal++;
    if (!r) { bad.push({ k, why: `was inl ${c.out.inl}, now null` }); continue; }
    if (r.inl !== c.out.inl) { bad.push({ k, why: `inl ${c.out.inl} -> ${r.inl}` }); continue; }
    if (!same(r.P, c.out.P)) { bad.push({ k, why: `P ${c.out.P} -> ${r.P}` }); continue; }
    if (!same(r.Q, expQ)) { bad.push({ k, why: `Q ${expQ} -> ${r.Q}` }); continue; }
    if (r.up.length !== c.out.nUp) { bad.push({ k, why: `nUp ${c.out.nUp} -> ${r.up.length}` }); continue; }
    for (let t = 0; t < r.up.length; t++)
      if (!same(r.up[t].u, c.out.u[t])) { bad.push({ k, why: `u[${t}] ${c.out.u[t]} -> ${r.up[t].u}` }); break; }
    if (bad.length > 30) break;
  }
  return { n: calls.length, nNull, nReal, nBad: bad.length, bad: bad.slice(0, 12) };
}, cases.calls);

await browser.close();
console.log(`${out.n} recorded calls (${out.nReal} an involution, ${out.nNull} null)`);
if (out.nBad) {
  console.log(`\nCHANGED: ${out.nBad}${out.nBad > 30 ? "+" : ""}`);
  for (const b of out.bad) console.log(`  case ${b.k}: ${b.why}`);
  process.exit(1);
}
console.log("\nidentical to the recorded implementation, bit for bit, on every call");
