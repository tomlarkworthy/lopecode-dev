// One-off measurement: per-candidate-group cheap features vs whether the group
// actually locks. Read-only w.r.t. the notebook and the harness; produces the
// numbers try-variant.ts cannot (group counts, rejection rates).
//
//   bun scratch/rmbt/prereject-study.ts [--subset 20]
import { chromium } from "playwright";
import { resolve } from "node:path";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";

const NB = resolve("lopebooks/notebooks/tomlarkworthy_coded-landmark-tracking.html");
const DIR = resolve("data/hexcases");
const argOf = (flag: string, dflt: string) => {
  const i = process.argv.indexOf(flag);
  return i === -1 ? dflt : process.argv[i + 1];
};
const SUBSET = Number(argOf("--subset", "20"));

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
page.on("console", (m) => { if (m.type() === "error") console.error("CONSOLE", m.text()); });
await page.addInitScript(() => {
  const orig = (window as any).Runtime; let cap = false;
  Object.defineProperty(window, "Runtime", { get() { return orig; },
    set(N: any) { const W = function (this: any, ...a: any[]) { const i = new N(...a); if (!cap) { (window as any).__ojs_runtime = i; cap = true; } return i; }; W.prototype = N.prototype; Object.assign(W, N); return W; } });
});
await page.goto(`file://${NB}`, { waitUntil: "networkidle", timeout: 180000 });
await page.waitForFunction(() => !!(window as any).__ojs_runtime, { timeout: 180000 });
await page.waitForTimeout(9000);

const out = await page.evaluate(async ({ payload }) => {
  const rt = (window as any).__ojs_runtime;
  const vars = [...rt._variables];
  const val = async (n: string) => { const v = vars.find((z: any) => z._name === n); return v ? await v._module.value(n) : null; };
  const deps: any = {};
  for (const n of ["manRowGroups", "findInvolution", "solveMan", "edges1Dsub", "manLayout",
                   "hexTarget", "renderHexScene"]) deps[n] = await val(n);
  const { manRowGroups, findInvolution, solveMan, edges1Dsub, manLayout, hexTarget, renderHexScene } = deps;

  const real = payload.map((c: any) => {
    const bin = atob(c.grayB64);
    const gray = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) gray[i] = bin.charCodeAt(i);
    return { name: c.meta.name, gray, w: c.meta.w, h: c.meta.h };
  }).filter((f: any) => f.gray.length === f.w * f.h);

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
    return { name: `synth-${c.dPx}`, gray: s.gray, w: s.w, h: s.h };
  });

  const rows: any[] = [];
  for (const set of [{ tag: "real", frames: real }, { tag: "synth", frames: synth }]) {
    for (const f of set.frames) {
      const stride = 4, thr = 12;
      for (let y = Math.floor(stride / 2); y < f.h; y += stride) {
        const se = edges1Dsub(f.gray.subarray(y * f.w, (y + 1) * f.w), thr);
        const n0 = se.length;
        if (n0 < 6) continue;
        const xs = new Float64Array(n0), ss = new Int8Array(n0);
        for (let i = 0; i < n0; i++) { xs[i] = se[i].x; ss[i] = se[i].s; }
        const groups = manRowGroups(xs, {});
        for (const [lo, hi] of groups) {
          const n = hi - lo + 1;
          const sub = [];
          for (let i = lo; i <= hi; i++) sub.push({ x: xs[i], s: ss[i] });
          const iv = findInvolution(sub, {});
          let locked = 0, sup = 0;
          if (iv) { const r = solveMan(iv, manLayout, {}); if (r.ok && r.sup >= 5) { locked = 1; sup = r.sup; } }
          const span = xs[hi] - xs[lo];
          let altViol = 0;
          for (let i = lo; i < hi; i++) if (ss[i] === ss[i + 1]) altViol++;
          let mirrorViol = 0;
          for (let k = 0; k < n >> 1; k++) if (ss[lo + k] === ss[hi - k]) mirrorViol++;
          let nPlus = 0;
          for (let i = lo; i <= hi; i++) if (ss[i] > 0) nPlus++;
          // loose affine mirror about the group midpoint, opposite-sign only
          const mid = (xs[lo] + xs[hi]) / 2;
          const symAt = (fr: number) => {
            const tol = fr * span; let m = 0;
            for (let e = lo; e <= hi && xs[e] < mid; e++) {
              const t = 2 * mid - xs[e];
              for (let g = hi; g > e; g--) {
                if (xs[g] <= mid) break;
                if (ss[g] === -ss[e] && Math.abs(xs[g] - t) <= tol) { m++; break; }
              }
            }
            return m;
          };
          rows.push({
            set: set.tag, n, span: +span.toFixed(1), locked, sup,
            iv: iv ? 1 : 0,
            altViol, mirrorViol, nPlus, nMinus: n - nPlus,
            par: n % 2,
            s0: ss[lo], s1: ss[hi],
            sym05: symAt(0.05), sym10: symAt(0.10), sym15: symAt(0.15),
          });
        }
      }
    }
  }
  return rows;
}, { payload: cases });

await browser.close();
writeFileSync(resolve("scratch/rmbt/prereject-study.json"), JSON.stringify(out));

const groups = out as any[];
const rep = (tag: string) => {
  const g = groups.filter((r) => r.set === tag);
  const lock = g.filter((r) => r.locked);
  console.log(`\n=== ${tag}: ${g.length} groups, ${lock.length} lock, ${g.filter((r:any)=>r.iv).length} pass findInvolution`);
  const hist = (k: string, rs: any[]) => {
    const m = new Map<number, number>();
    for (const r of rs) m.set(r[k], (m.get(r[k]) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => a[0] - b[0]).map(([v, c]) => `${v}:${c}`).join(" ");
  };
  for (const k of ["n", "altViol", "mirrorViol", "par", "s0", "s1", "sym05", "sym10", "sym15"]) {
    console.log(`  ${k.padEnd(10)} all   ${hist(k, g)}`);
    console.log(`  ${"".padEnd(10)} lock  ${hist(k, lock)}`);
  }
  // candidate filters
  const cands: [string, (r: any) => boolean][] = [
    ["altViol<=0", (r) => r.altViol <= 0],
    ["altViol<=1", (r) => r.altViol <= 1],
    ["altViol<=2", (r) => r.altViol <= 2],
    ["altViol<=3", (r) => r.altViol <= 3],
    ["mirrorViol<=1", (r) => r.mirrorViol <= 1],
    ["mirrorViol<=2", (r) => r.mirrorViol <= 2],
    ["even n", (r) => r.par === 0],
    ["s0=-1&&s1=+1", (r) => r.s0 === -1 && r.s1 === 1],
    ["sym05>=3", (r) => r.sym05 >= 3],
    ["sym10>=3", (r) => r.sym10 >= 3],
    ["sym10>=4", (r) => r.sym10 >= 4],
    ["sym15>=3", (r) => r.sym15 >= 3],
    ["sym15>=4", (r) => r.sym15 >= 4],
    ["min(np,nm)>=3", (r) => Math.min(r.nPlus, r.nMinus) >= 3],
  ];
  const cost = (rs: any[]) => rs.reduce((a, r) => a + r.n * r.n, 0);
  const c0 = cost(g);
  console.log(`  filter                 keep%   lockKept   costKept%`);
  for (const [name, f] of cands) {
    const kept = g.filter(f);
    const lk = kept.filter((r) => r.locked).length;
    console.log(`  ${name.padEnd(20)} ${((100 * kept.length) / g.length).toFixed(1).padStart(6)}  ` +
      `${lk}/${lock.length}`.padStart(10) + `  ${((100 * cost(kept)) / c0).toFixed(1).padStart(8)}`);
  }
};
rep("real");
rep("synth");
