// Did the merge rewrite recover the blurred frames without spoiling the ones
// that already worked? Runs the whole saved archive with bothAxes ON through
// whichever build is pointed at, so the same script scores before and after.
//
//   bun scratch/rmbt/check-merge.ts --nb scratch/rmbt/before-merge.html
//   bun scratch/rmbt/check-merge.ts
import { chromium } from "playwright";
import { resolve } from "node:path";
import { readFileSync, readdirSync } from "node:fs";

const DIR = resolve("data/hexcases");
const NB = resolve(process.argv.includes("--nb")
  ? process.argv[process.argv.indexOf("--nb") + 1]
  : "lopebooks/notebooks/tomlarkworthy_coded-landmark-tracking.html");
const only = process.argv.includes("--only") ? process.argv[process.argv.indexOf("--only") + 1] : "";
const names = readdirSync(DIR).filter((f) => f.endsWith(".gray") && f.includes(only))
  .map((f) => f.slice(0, -5)).sort();
const payload = names.map((n) => ({
  meta: JSON.parse(readFileSync(resolve(DIR, n + ".json"), "utf8")),
  grayB64: readFileSync(resolve(DIR, n + ".gray")).toString("base64")
}));
console.error(`${names.length} cases, ${NB.split("/").pop()}`);

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

const ARMS: [string, any][] = [["both", {}]];
await page.evaluate((a) => { (window as any).__ARMS = a; }, ARMS);
const evalChunk = async (payload: any[]) => await page.evaluate(async (payload) => {
  const rt = (window as any).__ojs_runtime;
  const vars = [...rt._variables];
  const val = async (n: string) => { const v = vars.find((z: any) => z._name === n); return v ? await v._module.value(n) : null; };
  const analyzeFrameMan: any = await val("analyzeFrameMan");
  const fitHexPose: any = await val("fitHexPose");
  const hexRigLoo: any = await val("hexRigLoo");
  const manLayout: any = await val("manLayout");
  const LAY = { ...manLayout, minAxisRatio: 1 / 3, minCover: 0.3, maxASpread: 0.35 };
  const base = (over: any = {}) => ({ stride: 4, edgeThreshold: 12, minRows: 3, minVotes: 2,
    voteRatio: 2, gapFrac: 0.3, layout: LAY, ...over });

  return payload.map((c: any) => {
    const bin = atob(c.grayB64);
    const gray = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) gray[i] = bin.charCodeAt(i);
    const f = { gray, w: c.meta.w, h: c.meta.h };
    const score = (over: any) => {
      const r = analyzeFrameMan(f, base(over));
      const pose = fitHexPose({ ...r, w: f.w, h: f.h });
      const loo = pose.ok ? hexRigLoo(r) : null;
      return { read: r.fused.length, poseOk: !!pose.ok,
        rms: pose.ok ? pose.rmsResidualPx : null,
        loo: loo && isFinite(loo.worstPx) ? +loo.worstPx.toFixed(2) : null,
        axisUsed: r.axisUsed ?? null, colWon: r.colWon ?? 0,
        crossRejected: r.crossRejected ?? 0 };
    };
    const arms: any = { rows: score({ bothAxes: false }) };
    for (const [tag, over] of (window as any).__ARMS)
      arms[tag] = score({ bothAxes: true, ...over });
    return { name: c.meta.name.replace("hexcase-", ""), ...arms };
  });
}, payload);

// One evaluate per chunk: 156 cases of base64 in a single call is ~140MB of
// strings and takes the page down with it.
const out: any[] = [];
for (let i = 0; i < payload.length; i += 12) {
  out.push(...await evalChunk(payload.slice(i, i + 12)));
  console.error(`  ${out.length}/${payload.length}`);
}
await browser.close();

// Aggregates. LOO only means something at 6+ marks: at 5 the leave-one-out
// refit is exactly determined and its residual is unbounded.
const agg = (pick: (r: any) => any) => {
  const xs = out.map(pick);
  const posed = xs.filter((x: any) => x.poseOk);
  const loos = xs.filter((x: any) => x.read >= 6 && x.loo != null).map((x: any) => x.loo).sort((a: number, b: number) => a - b);
  return {
    read: xs.reduce((a: number, x: any) => a + x.read, 0),
    posed: posed.length,
    dead: xs.filter((x: any) => x.read === 0).length,
    n6: loos.length,
    medLoo6: loos.length ? loos[loos.length >> 1] : null,
    worstLoo6: loos.length ? loos[loos.length - 1] : null
  };
};
const pad = (x: any, n: number) => String(x).padEnd(n);
console.log(pad("arm", 11) + pad("read", 7) + pad("posed", 7) + pad("dead", 6) +
  pad("n6", 5) + pad("medLoo6", 9) + pad("worstLoo6", 11) + "colCarried");
for (const arm of ["rows", ...ARMS.map((a) => a[0])]) {
  const a: any = agg((r: any) => r[arm]);
  const cc = out.filter((r: any) => r[arm].axisUsed === "col").length;
  console.log(pad(arm, 11) + pad(a.read, 7) + pad(a.posed, 7) + pad(a.dead, 6) +
    pad(a.n6, 5) + pad(a.medLoo6, 9) + pad(a.worstLoo6, 11) + cc);
}
const best = "both";
console.log("\nrescued by " + best + ":");
for (const r of out.filter((r: any) => r.rows.read === 0 && r[best].read > 0))
  console.log(`  ${r.name}: 0 -> ${r[best].read} (${r[best].axisUsed}, loo ${r[best].loo})`);
console.log("\nframes " + best + " makes materially worse than rows-only:");
for (const r of out.filter((r: any) => r.rows.read >= 6 && r[best].read >= 6 &&
    r.rows.loo != null && r[best].loo != null && r[best].loo > r.rows.loo + 2))
  console.log(`  ${r.name}: ${r.rows.loo} -> ${r[best].loo}`);
