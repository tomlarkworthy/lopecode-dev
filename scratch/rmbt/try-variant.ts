// Score a candidate detector against the shipping one, on the same photons.
//
//   bun scratch/rmbt/try-variant.ts variants/foo.js [variants/bar.js ...]
//        [--reps 3] [--subset 20] [--json out.json]
//
// A VARIANT FILE is a JS expression that evaluates to a factory:
//
//   (deps) => (frame, opts) => result          // same contract as analyzeFrameMan
//
// `deps` hands you the REAL notebook cells -- manLayout, edges1Dsub,
// manRowGroups, findInvolution, solveMan, fitManPose, detectRowMan and
// analyzeFrameMan itself -- so a variant reuses the shipping cascade and
// replaces only the part it is arguing about. Nothing is copied out of the
// notebook, which is the only way the measurement stays honest: a hand-copied
// helper drifts from the cell it was copied from and then you are tuning a
// fork.
//
// The identity variant
//
//   ({ analyzeFrameMan }) => (f, o) => analyzeFrameMan(f, o)
//
// must score EXACTLY zero delta. If it does not, the harness is broken and no
// number below it means anything -- run it first.
//
// TWO TEST SETS, AND BOTH ARE LOAD-BEARING:
//
//   real   70 archived camera frames, scored against the labels FROZEN at
//          capture (hexRigScore), never against a fresh fit of the thing being
//          measured. This is where latency is measured, because it is the only
//          set with real backgrounds in it.
//   synth  rendered scenes scored against the RENDERER's truth, which the fit
//          never sees. The archive cannot detect an invented mark -- it has no
//          ground truth for marks nobody detected -- and inventing marks is the
//          one failure a positioning system must not have. gapFrac 0.2 looked
//          like a free win on the archive and put a spurious mark on the
//          rendered scene; that is why this half exists.
import { chromium } from "playwright";
import { resolve } from "node:path";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";

const NB = resolve("lopebooks/notebooks/tomlarkworthy_coded-landmark-tracking.html");
const DIR = resolve("data/hexcases");
const argOf = (flag: string, dflt: string) => {
  const i = process.argv.indexOf(flag);
  return i === -1 ? dflt : process.argv[i + 1];
};
const REPS = Number(argOf("--reps", "3"));
const SUBSET = Number(argOf("--subset", "0"));
const JSON_OUT = argOf("--json", "");
const files = process.argv.slice(2).filter((a) => a.endsWith(".js"));

const variants = files.map((f) => ({ name: f.split("/").pop()!.replace(/\.js$/, ""), src: readFileSync(f, "utf8") }));

let names = readdirSync(DIR).filter((f) => f.endsWith(".gray")).map((f) => f.slice(0, -5)).sort();
// A subset for iteration, chosen by every k-th case rather than the first N:
// the archive is sorted by name, which groups by sitting, so the first N would
// be one room.
if (SUBSET > 0 && SUBSET < names.length) {
  const step = names.length / SUBSET;
  names = Array.from({ length: SUBSET }, (_, i) => names[Math.floor(i * step)]);
}
const cases = names.map((n) => ({
  meta: JSON.parse(readFileSync(resolve(DIR, n + ".json"), "utf8")),
  grayB64: readFileSync(resolve(DIR, n + ".gray")).toString("base64"),
}));
console.log(`${cases.length} real case(s), ${variants.length} variant(s), ${REPS} rep(s)\n`);

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

const out = await page.evaluate(async ({ payload, variants, REPS }) => {
  const rt = (window as any).__ojs_runtime;
  const vars = [...rt._variables];
  const val = async (n: string) => { const v = vars.find((z: any) => z._name === n); return v ? await v._module.value(n) : null; };

  const deps: any = {};
  for (const n of ["analyzeFrameMan", "detectRowMan", "manRowGroups", "findInvolution", "solveMan",
                   "fitManPose", "fitHexPose", "edges1Dsub", "manLayout", "hexRigScore", "hexRigLoo",
                   "rotateFrame", "unrotatePoint", "hexTarget", "renderHexScene"])
    deps[n] = await val(n);
  const { fitHexPose, hexRigScore, hexRigLoo, hexTarget, renderHexScene } = deps;

  // ---- frames ------------------------------------------------------------
  const real = payload.map((c: any) => {
    const bin = atob(c.grayB64);
    const gray = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) gray[i] = bin.charCodeAt(i);
    return { name: c.meta.name, gray, w: c.meta.w, h: c.meta.h, truth: c.meta.truth ?? [] };
  }).filter((f: any) => f.gray.length === f.w * f.h);

  // Rendered scenes, with the renderer's own truth. Deliberately spread across
  // the size where this cascade comes apart (~100-130px marks) plus two easy
  // ones, so a variant that buys recall by loosening a gate has somewhere to
  // show the cost.
  const SCENES = [
    { dPx: 100, blur: 1.0, yaw: 10, tilt: 30, seed: 11 },
    { dPx: 110, blur: 1.0, yaw: 10, tilt: 30, seed: 11 },
    { dPx: 120, blur: 1.0, yaw: 10, tilt: 30, seed: 11 },
    { dPx: 130, blur: 1.0, yaw: 10, tilt: 30, seed: 11 },
    { dPx: 125, blur: 1.1, yaw: 0, tilt: 25, seed: 9 },
    { dPx: 160, blur: 0.9, yaw: 20, tilt: 40, seed: 3 },
  ];
  const synth = SCENES.map((c) => {
    const scale = c.dPx / hexTarget.diameterMm;
    const H = Math.round((Math.max(hexTarget.heightMm, hexTarget.widthMm) * scale) / 0.8);
    const W = Math.round((H * 16) / 9);
    const s = renderHexScene({ target: hexTarget, W, H, fill: (hexTarget.heightMm * scale) / H,
      yawDeg: c.yaw, tiltDeg: c.tilt, rollDeg: 0, blur: c.blur, noise: 4, seed: c.seed });
    return { name: `synth-${c.dPx}`, gray: s.gray, w: s.w, h: s.h,
             truth: s.truth.map((t: any) => ({ id: t.id, x: t.x, y: t.y, radiusPx: c.dPx / 2 })) };
  });

  // ---- one arm -----------------------------------------------------------
  const runArm = (analyze: any) => {
    const per: any[] = [];
    for (const set of [{ tag: "real", frames: real }, { tag: "synth", frames: synth }]) {
      for (const f of set.frames) {
        const ts: number[] = [];
        let res: any = null, err: string | null = null;
        for (let r = 0; r < REPS; r++) {
          const t0 = performance.now();
          try { res = analyze({ gray: f.gray, w: f.w, h: f.h }, { stride: 4 }); }
          catch (e: any) { err = String(e && e.message || e); break; }
          ts.push(performance.now() - t0);
        }
        if (err) { per.push({ set: set.tag, name: f.name, error: err }); continue; }
        ts.sort((a, b) => a - b);
        const s = hexRigScore(res, f.truth);
        const pose = fitHexPose({ ...res, w: f.w, h: f.h });
        const loo = pose.ok ? hexRigLoo(res) : null;
        const rMed = pose.ok ? pose.marks.map((m: any) => m.radiusPx).sort((a: number, b: number) => a - b)[3] : null;
        per.push({
          set: set.tag, name: f.name,
          ms: +ts[ts.length >> 1].toFixed(2),
          read: s.counts.read, located: s.counts.located, missing: s.counts.missing,
          misplaced: s.counts.misplaced, off: s.offTarget.length, score: s.score,
          rowsTried: res.rowsTried ?? null, rowHits: res.rowHits ?? null,
          fused: (res.fused ?? []).length, unread: (res.unidentified ?? []).length,
          looR: loo && rMed ? +(loo.worstPx / rMed).toFixed(2) : null,
        });
      }
    }
    return per;
  };

  const arms: any = { baseline: runArm(deps.analyzeFrameMan) };
  const errors: any = {};
  for (const v of variants) {
    let analyze: any = null;
    try {
      // eslint-disable-next-line no-new-func
      const factory = new Function("deps", `return (${v.src.replace(/;\s*$/, "")});`)(deps);
      analyze = factory(deps);
      if (typeof analyze !== "function") throw new Error("factory did not return a function");
    } catch (e: any) { errors[v.name] = `load failed: ${e && e.message || e}`; continue; }
    try { arms[v.name] = runArm(analyze); }
    catch (e: any) { errors[v.name] = `run failed: ${e && e.message || e}`; }
  }
  return { arms, errors, nReal: real.length, nSynth: synth.length };
}, { payload: cases, variants, REPS });

await browser.close();

// ---- report ----------------------------------------------------------------
type Row = any;
const agg = (per: Row[], set: string) => {
  const rows = per.filter((r) => r.set === set && !r.error);
  const ms = rows.map((r) => r.ms).sort((a, b) => a - b);
  const sum = (k: string) => rows.reduce((a, r) => a + (r[k] ?? 0), 0);
  return {
    n: rows.length,
    read: sum("read"), misplaced: sum("misplaced"), off: sum("off"),
    wrong: sum("misplaced") + sum("off"), score: sum("score"),
    msMed: ms.length ? +ms[ms.length >> 1].toFixed(1) : 0,
    msP90: ms.length ? +ms[Math.min(ms.length - 1, Math.floor(0.9 * ms.length))].toFixed(1) : 0,
    msTot: +rows.reduce((a, r) => a + r.ms, 0).toFixed(0),
    rowHits: sum("rowHits"),
    looMax: Math.max(0, ...rows.map((r) => r.looR ?? 0)),
    errors: per.filter((r) => r.set === set && r.error).length,
  };
};
const d = (a: number, b: number, dp = 0) => {
  const x = a - b;
  return (x > 0 ? "+" : "") + x.toFixed(dp);
};
const base = out.arms.baseline;
const bR = agg(base, "real"), bS = agg(base, "synth");

console.log(`REAL n=${bR.n}   SYNTH n=${bS.n}   (marks: ${7 * bR.n} real, ${7 * bS.n} synth)\n`);
console.log("  arm                 real:read  wrong  ms_med  ms_p90  ms_tot  rowHits  looMax | synth:read  wrong");
const line = (name: string, r: any, s: any, rel?: { r: any; s: any }) =>
  console.log(`  ${name.padEnd(20)}` +
    `${String(r.read).padStart(9)}${String(r.wrong).padStart(7)}` +
    `${String(r.msMed).padStart(8)}${String(r.msP90).padStart(8)}${String(r.msTot).padStart(8)}` +
    `${String(r.rowHits).padStart(9)}${String(r.looMax.toFixed(2)).padStart(8)} | ` +
    `${String(s.read).padStart(10)}${String(s.wrong).padStart(7)}` +
    (rel ? `\n  ${"".padEnd(20)}${d(r.read, rel.r.read).padStart(9)}${d(r.wrong, rel.r.wrong).padStart(7)}` +
      `${d(r.msMed, rel.r.msMed, 1).padStart(8)}${d(r.msP90, rel.r.msP90, 1).padStart(8)}` +
      `${d(r.msTot, rel.r.msTot).padStart(8)}${d(r.rowHits, rel.r.rowHits).padStart(9)}` +
      `${d(r.looMax, rel.r.looMax, 2).padStart(8)} | ` +
      `${d(s.read, rel.s.read).padStart(10)}${d(s.wrong, rel.s.wrong).padStart(7)}` : ""));

line("baseline", bR, bS);
const summary: any = { baseline: { real: bR, synth: bS }, variants: {} };
for (const [name, per] of Object.entries(out.arms)) {
  if (name === "baseline") continue;
  const r = agg(per as Row[], "real"), s = agg(per as Row[], "synth");
  line(name, r, s, { r: bR, s: bS });
  summary.variants[name] = { real: r, synth: s };
}
for (const [name, e] of Object.entries(out.errors)) console.log(`  ${name.padEnd(20)} ERROR: ${e}`);

// Per-case regressions. A net +6 that hides a -3 on one frame is two different
// changes, and the loser is usually the interesting one.
for (const [name, per] of Object.entries(out.arms)) {
  if (name === "baseline") continue;
  const byName = new Map((per as Row[]).map((r) => [r.set + "/" + r.name, r]));
  const bad: string[] = [];
  for (const b of base) {
    const v = byName.get(b.set + "/" + b.name);
    if (!v) continue;
    if (v.error) { bad.push(`    ${b.name}  THREW ${v.error}`); continue; }
    const dr = v.read - b.read, dw = v.wrong - b.wrong;
    if (dr < 0 || (v.misplaced + v.off) > (b.misplaced + b.off))
      bad.push(`    ${(b.set + "/" + b.name).padEnd(28)} read ${b.read}->${v.read}` +
        `  wrong ${b.misplaced + b.off}->${v.misplaced + v.off}  ms ${b.ms}->${v.ms}`);
  }
  if (bad.length) console.log(`\n  ${name}: ${bad.length} frame(s) got worse\n${bad.join("\n")}`);
}

if (JSON_OUT) {
  writeFileSync(JSON_OUT, JSON.stringify({ summary, per: out.arms }, null, 1));
  console.log(`\nwrote ${JSON_OUT}`);
}
