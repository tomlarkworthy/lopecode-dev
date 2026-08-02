// Diagnostic only. Runs a variant file (or the shipping cell) and, for every
// truth mark that is not "read", lists the nearby entries the detector DID
// produce -- fused and unidentified alike, with the reason each was rejected.
// Numbers that matter still come from try-variant.ts.
import { chromium } from "playwright";
import { resolve } from "node:path";
import { readFileSync, readdirSync } from "node:fs";

const NB = resolve("lopebooks/notebooks/tomlarkworthy_coded-landmark-tracking.html");
const DIR = resolve("data/hexcases");
const argOf = (f: string, d: string) => { const i = process.argv.indexOf(f); return i === -1 ? d : process.argv[i + 1]; };
const SUBSET = Number(argOf("--subset", "20"));
const VF = process.argv.slice(2).find((a) => a.endsWith(".js"));
const VSRC = VF ? readFileSync(resolve(VF), "utf8") : "";

let names = readdirSync(DIR).filter((f) => f.endsWith(".gray")).map((f) => f.slice(0, -5)).sort();
if (SUBSET > 0 && SUBSET < names.length) {
  const step = names.length / SUBSET;
  names = Array.from({ length: SUBSET }, (_, i) => names[Math.floor(i * step)]);
}
const cases = names.map((n) => ({
  meta: JSON.parse(readFileSync(resolve(DIR, n + ".json"), "utf8")),
  grayB64: readFileSync(resolve(DIR, n + ".gray")).toString("base64"),
}));

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
page.on("pageerror", (e) => console.error("PAGE ERROR:", e.message));
await page.addInitScript(() => {
  const orig = (window as any).Runtime; let cap = false;
  Object.defineProperty(window, "Runtime", { get() { return orig; },
    set(N: any) { const W = function (this: any, ...a: any[]) { const i = new N(...a); if (!cap) { (window as any).__ojs_runtime = i; cap = true; } return i; }; W.prototype = N.prototype; Object.assign(W, N); return W; } });
});
await page.goto(`file://${NB}`, { waitUntil: "networkidle", timeout: 180000 });
await page.waitForFunction(() => !!(window as any).__ojs_runtime, { timeout: 180000 });
await page.waitForTimeout(9000);

const out = await page.evaluate(async ({ payload, VSRC }) => {
  const rt = (window as any).__ojs_runtime;
  const vars = [...rt._variables];
  const val = async (n: string) => { const v = vars.find((z: any) => z._name === n); return v ? await v._module.value(n) : null; };
  const deps: any = {};
  for (const n of ["analyzeFrameMan", "detectRowMan", "manRowGroups", "findInvolution", "solveMan",
                   "fitManPose", "fitHexPose", "edges1Dsub", "manLayout", "hexRigScore", "hexRigLoo",
                   "rotateFrame", "unrotatePoint", "hexTarget", "renderHexScene"]) deps[n] = await val(n);

  let analyze = deps.analyzeFrameMan;
  if (VSRC) analyze = (new Function("deps", `return (${VSRC.replace(/;\s*$/, "")});`)(deps))(deps);

  const real = payload.map((c: any) => {
    const bin = atob(c.grayB64); const gray = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) gray[i] = bin.charCodeAt(i);
    return { name: c.meta.name, gray, w: c.meta.w, h: c.meta.h, truth: c.meta.truth ?? [] };
  }).filter((f: any) => f.gray.length === f.w * f.h);

  const SCENES = [
    { dPx: 100, blur: 1.0, yaw: 10, tilt: 30, seed: 11 },
    { dPx: 110, blur: 1.0, yaw: 10, tilt: 30, seed: 11 },
    { dPx: 120, blur: 1.0, yaw: 10, tilt: 30, seed: 11 },
    { dPx: 130, blur: 1.0, yaw: 10, tilt: 30, seed: 11 },
    { dPx: 125, blur: 1.1, yaw: 0, tilt: 25, seed: 9 },
    { dPx: 160, blur: 0.9, yaw: 20, tilt: 40, seed: 3 },
  ];
  const { hexTarget, renderHexScene } = deps;
  const synth = SCENES.map((c) => {
    const scale = c.dPx / hexTarget.diameterMm;
    const H = Math.round((Math.max(hexTarget.heightMm, hexTarget.widthMm) * scale) / 0.8);
    const W = Math.round((H * 16) / 9);
    const s = renderHexScene({ target: hexTarget, W, H, fill: (hexTarget.heightMm * scale) / H,
      yawDeg: c.yaw, tiltDeg: c.tilt, rollDeg: 0, blur: c.blur, noise: 4, seed: c.seed });
    return { name: `synth-${c.dPx}`, gray: s.gray, w: s.w, h: s.h,
             truth: s.truth.map((t: any) => ({ id: t.id, x: t.x, y: t.y, radiusPx: c.dPx / 2 })) };
  });

  const report: any[] = [];
  for (const set of [{ tag: "real", frames: real }, { tag: "synth", frames: synth }]) {
    for (const f of set.frames) {
      const res = analyze({ gray: f.gray, w: f.w, h: f.h }, { stride: 4 });
      const sc = deps.hexRigScore(res, f.truth);
      const bad = sc.marks.filter((m: any) => m.state !== "read");
      if (!bad.length && !sc.offTarget.length) continue;
      const pool = [...(res.fused ?? []).map((e: any) => ({ ...e, k: "F" })),
                    ...(res.unidentified ?? []).map((e: any) => ({ ...e, k: "u" }))];
      const items = bad.map((m: any) => {
        const t = f.truth.find((z: any) => z.id === m.id);
        const near = pool.filter((e: any) => Math.hypot(e.xc - t.x, e.yc - t.y) < 1.3 * t.radiusPx)
          .map((e: any) => ({ k: e.k, id: e.id, rows: e.rows, vm: e.voteMargin, posed: e.posed,
            why: e.why, dx: Math.round(e.xc - t.x), dy: Math.round(e.yc - t.y),
            ar: e.axisRatio == null ? null : +e.axisRatio.toFixed(2),
            cov: e.cover == null ? null : +e.cover.toFixed(2) }));
        return { id: m.id, state: m.state, resid: m.residualPx, tol: Math.round(0.6 * t.radiusPx), near };
      });
      report.push({ set: set.tag, name: f.name, counts: sc.counts, off: sc.offTarget, items });
    }
  }
  return report;
}, { payload: cases, VSRC });

await browser.close();
let nMiss = 0, nLoc = 0, nMisp = 0;
for (const fr of out) {
  console.log(`\n=== ${fr.set}/${fr.name}  read=${fr.counts.read} loc=${fr.counts.located} miss=${fr.counts.missing} misp=${fr.counts.misplaced} off=${JSON.stringify(fr.off)}`);
  for (const it of fr.items) {
    nMiss += it.state === "missing" ? 1 : 0; nLoc += it.state === "located" ? 1 : 0; nMisp += it.state === "misplaced" ? 1 : 0;
    console.log(`  mark ${it.id} ${it.state} resid=${it.resid} tol=${it.tol}`);
    for (const n of it.near)
      console.log(`     ${n.k} id=${n.id} rows=${n.rows} vm=${n.vm} posed=${n.posed} why=${n.why} ar=${n.ar} cov=${n.cov} d=(${n.dx},${n.dy})`);
  }
}
console.log(`\ntotals: missing=${nMiss} located=${nLoc} misplaced=${nMisp}`);
