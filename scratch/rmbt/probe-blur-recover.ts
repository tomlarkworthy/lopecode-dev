// Five of the new cases read nothing at all. The gradient measurement says the
// smear is barely directional, so bothAxes is not the answer; what separates
// them from the ones that worked is edge CONTRAST — mean |dI/dx| 2.95-3.18
// against 3.75-4.29. With a fixed edgeThreshold of 12 that is a cliff, not a
// slope, which would explain 5 reads collapsing straight to 0.
//
// So: sweep the threshold (and stride) per case and see whether the signal is
// still there to be had. A recovered read is only interesting if the geometry
// agrees, so every arm reports the pose and its leave-one-out too.
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
  const fitHexPose: any = await val("fitHexPose");
  const hexRigLoo: any = await val("hexRigLoo");
  const manLayout: any = await val("manLayout");

  const frames = payload.map((c: any) => {
    const bin = atob(c.grayB64);
    const gray = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) gray[i] = bin.charCodeAt(i);
    return { name: c.meta.name.replace("hexcase-", ""), gray, w: c.meta.w, h: c.meta.h,
      baseRead: c.meta.capture?.counts?.read ?? 0 };
  });

  const LAY = { ...manLayout, minAxisRatio: 1 / 3, minCover: 0.3, maxASpread: 0.35 };
  const run = (f: any, over: any) => {
    const opts: any = { stride: 4, edgeThreshold: 12, minRows: 3, minVotes: 2, voteRatio: 2,
      gapFrac: 0.3, bothAxes: false, layout: LAY, ...over };
    const res = analyzeFrameMan({ gray: f.gray, w: f.w, h: f.h }, opts);
    const pose = fitHexPose({ ...res, w: f.w, h: f.h });
    const loo = pose.ok ? hexRigLoo(res) : null;
    return {
      read: res.fused.length,
      ids: res.fused.map((z: any) => z.id).sort((a: number, b: number) => a - b),
      poseOk: !!pose.ok,
      rms: pose.ok ? pose.rmsResidualPx : null,
      loo: loo && isFinite(loo.worstPx) ? +loo.worstPx.toFixed(1) : null,
      ms: +res.ms.toFixed(1)
    };
  };

  const ARMS: any[] = [
    { tag: "base(thr12,s4)", over: {} },
    { tag: "thr8", over: { edgeThreshold: 8 } },
    { tag: "thr6", over: { edgeThreshold: 6 } },
    { tag: "thr4", over: { edgeThreshold: 4 } },
    { tag: "thr6,s2", over: { edgeThreshold: 6, stride: 2 } },
    { tag: "thr6,both", over: { edgeThreshold: 6, bothAxes: true } },
    { tag: "base,both", over: { bothAxes: true } },
    { tag: "thr6,minRows2", over: { edgeThreshold: 6, minRows: 2 } }
  ];
  return frames.map((f: any) => ({
    name: f.name, baseRead: f.baseRead,
    arms: ARMS.map((a) => ({ tag: a.tag, ...run(f, a.over) }))
  }));
}, payload);
await browser.close();

const pad = (s: any, n: number) => String(s).padEnd(n);
const tags = out[0].arms.map((a: any) => a.tag);
console.log(pad("case", 9) + tags.map((t: string) => pad(t, 15)).join(""));
console.log(pad("", 9) + tags.map(() => pad("read/pose/loo", 15)).join(""));
for (const r of out) {
  console.log(pad(r.name, 9) + r.arms.map((a: any) =>
    pad(`${a.read}${a.poseOk ? "/ok" : "/--"}${a.loo != null ? "/" + a.loo : ""}`, 15)).join(""));
}
console.log("\nids recovered on the five dead cases, best arm:");
for (const r of out.filter((x: any) => x.baseRead === 0)) {
  const best = r.arms.slice().sort((a: any, b: any) => b.read - a.read)[0];
  console.log(`  ${pad(r.name, 9)} ${pad(best.tag, 14)} read=${best.read} ids=[${best.ids}] ` +
    `pose=${best.poseOk} rms=${best.rms} loo=${best.loo} ${best.ms}ms`);
}
