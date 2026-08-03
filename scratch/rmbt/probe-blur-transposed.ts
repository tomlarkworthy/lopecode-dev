// The crop shows what the gradient ratio hinted at: the smear runs along x, so
// the ring flanks a ROW crosses are the ones destroyed, and the top/bottom arcs
// a COLUMN crosses survived. bothAxes still read nothing — but by design it
// routes column-only sightings to axisOnly and never fuses them, so a frame
// only the column pass can see reads zero by construction.
//
// So run the transposed frame on its own, as a plain single-axis detection.
// That separates "the signal is gone" from "the merge throws it away".
import { chromium } from "playwright";
import { resolve } from "node:path";
import { readFileSync, readdirSync } from "node:fs";

const DIR = resolve("data/hexcases");
const NB = resolve("lopebooks/notebooks/tomlarkworthy_coded-landmark-tracking.html");
const match = process.argv[2] ?? "6ib0";
const names = readdirSync(DIR).filter((f) => f.endsWith(".gray") && f.includes(match))
  .map((f) => f.slice(0, -5)).sort();
const payload = names.map((n) => ({
  meta: JSON.parse(readFileSync(resolve(DIR, n + ".json"), "utf8")),
  grayB64: readFileSync(resolve(DIR, n + ".gray")).toString("base64")
}));

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
page.on("pageerror", (e) => console.error("PAGE ERROR:", e.message.slice(0, 160)));
await page.addInitScript(() => {
  const orig = (window as any).Runtime; let cap = false;
  Object.defineProperty(window, "Runtime", { get() { return orig; }, set(N: any) {
    const W = function (this: any, ...a: any[]) { const i = new N(...a); if (!cap) { (window as any).__ojs_runtime = i; cap = true; } return i; };
    W.prototype = N.prototype; Object.assign(W, N); return W; } });
});
await page.goto(`file://${NB}`, { waitUntil: "networkidle", timeout: 180000 });
await page.waitForFunction(() => !!(window as any).__ojs_runtime, { timeout: 180000 });
await page.waitForTimeout(12000);

const out = await page.evaluate(async (payload) => {
  const rt = (window as any).__ojs_runtime;
  const vars = [...rt._variables];
  const val = async (n: string) => { const v = vars.find((z: any) => z._name === n); return v ? await v._module.value(n) : null; };
  const analyzeFrameMan: any = await val("analyzeFrameMan");
  const rotateFrame: any = await val("rotateFrame");
  const fitHexPose: any = await val("fitHexPose");
  const hexRigLoo: any = await val("hexRigLoo");
  const manLayout: any = await val("manLayout");
  const LAY = { ...manLayout, minAxisRatio: 1 / 3, minCover: 0.3, maxASpread: 0.35 };
  const base = (over: any = {}) => ({ stride: 4, edgeThreshold: 12, minRows: 3, minVotes: 2,
    voteRatio: 2, gapFrac: 0.3, bothAxes: false, layout: LAY, ...over });

  return payload.map((c: any) => {
    const bin = atob(c.grayB64);
    const gray = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) gray[i] = bin.charCodeAt(i);
    const f = { gray, w: c.meta.w, h: c.meta.h };
    const rot = rotateFrame(f, 1);

    // A read is not a detection until the geometry agrees. The rotated frame is
    // the same plane seen by a rotated camera, so a homography fit and its
    // leave-one-out mean exactly what they mean on an unrotated frame.
    const arm = (frame: any, over: any) => {
      const r = analyzeFrameMan(frame, base(over));
      const pose = fitHexPose({ ...r, w: frame.w, h: frame.h });
      const loo = pose.ok ? hexRigLoo(r) : null;
      return { n: r.fused.length, ids: r.fused.map((z: any) => z.id).sort((a: number, b: number) => a - b),
        poseOk: !!pose.ok, rms: pose.ok ? pose.rmsResidualPx : null,
        loo: loo && isFinite(loo.worstPx) ? +loo.worstPx.toFixed(2) : null };
    };
    const both = analyzeFrameMan(f, base({ bothAxes: true }));
    return {
      name: c.meta.name.replace("hexcase-", ""),
      rowsThr12: arm(f, {}),
      colsThr12: arm(rot, {}),
      colsThr8: arm(rot, { edgeThreshold: 8 }),
      colsThr6: arm(rot, { edgeThreshold: 6 }),
      colsThr6s2: arm(rot, { edgeThreshold: 6, stride: 2 }),
      bothFused: both.fused.length,
      bothAxisOnly: (both.axisOnly ?? []).length,
      axisOnlyIds: (both.axisOnly ?? []).map((z: any) => z.id).sort((a: number, b: number) => a - b)
    };
  });
}, payload);
await browser.close();

const pad = (s: any, n: number) => String(s).padEnd(n);
console.log(pad("case", 9) + pad("rows12", 8) + pad("cols12", 8) + pad("cols8", 8) +
  pad("cols6", 8) + pad("cols6s2", 9) + pad("bothFused", 11) + pad("axisOnly", 10) + "axisOnly ids");
for (const r of out)
  console.log(pad(r.name, 9) + pad(r.rowsThr12.n, 8) + pad(r.colsThr12.n, 8) + pad(r.colsThr8.n, 8) +
    pad(r.colsThr6.n, 8) + pad(r.colsThr6s2.n, 9) + pad(r.bothFused, 11) + pad(r.bothAxisOnly, 10) +
    "[" + r.axisOnlyIds + "]");
console.log("\ncolumn pass on the frames rows cannot see — read, pose, worst leave-one-out:");
for (const r of out.filter((x: any) => x.rowsThr12.n <= 1))
  for (const [tag, a] of [["thr12", r.colsThr12], ["thr8", r.colsThr8], ["thr6", r.colsThr6], ["thr6,s2", r.colsThr6s2]] as any)
    console.log(`  ${pad(r.name, 9)} ${pad(tag, 8)} read=${a.n} pose=${a.poseOk ? "ok" : "--"} ` +
      `rms=${pad(a.rms, 6)} loo=${pad(a.loo, 8)} ids=[${a.ids}]`);
