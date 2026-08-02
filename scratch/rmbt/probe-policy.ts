// Read-only: run the coarse-to-fine BOX policy for several parameter sets and
// report the deterministic work proxy (sum n^2 over offered candidate groups)
// split into coarse and dense, plus the fraction of each scanned row that
// survives masking. Uses the real edges1Dsub / manRowGroups / detectRowMan.
import { chromium } from "playwright";
import { resolve } from "node:path";
import { readFileSync, readdirSync } from "node:fs";

const NB = resolve("lopebooks/notebooks/tomlarkworthy_coded-landmark-tracking.html");
const DIR = resolve("data/hexcases");
const SUBSET = Number(process.argv.includes("--subset") ? process.argv[process.argv.indexOf("--subset") + 1] : 20);
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

const SETS = [
  { name: "id C24 p48 k2", C: 24, kx: 2.0, ky: 2.0, acc: "id", pad: 48 },
  { name: "id C24 p96 k2", C: 24, kx: 2.0, ky: 2.0, acc: "id", pad: 96 },
  { name: "id C32 p64 k2", C: 32, kx: 2.0, ky: 2.0, acc: "id", pad: 64 },
  { name: "id C48 p96 k2", C: 48, kx: 2.0, ky: 2.0, acc: "id", pad: 96 },
  { name: "hull C24 e0.3", C: 24, kx: 2.0, ky: 2.0, acc: "id", pad: 48, hull: 0.3 },
  { name: "hull C32 e0.5", C: 32, kx: 2.0, ky: 2.0, acc: "id", pad: 48, hull: 0.5 },
];

const out = await page.evaluate(async ({ payload, SETS }) => {
  const rt = (window as any).__ojs_runtime;
  const vars = [...rt._variables];
  const val = async (n: string) => { const v = vars.find((z: any) => z._name === n); return v ? await v._module.value(n) : null; };
  const deps: any = {};
  for (const n of ["edges1Dsub", "manRowGroups", "detectRowMan"]) deps[n] = await val(n);
  const { edges1Dsub, manRowGroups, detectRowMan } = deps;

  const frames = payload.map((c: any) => {
    const bin = atob(c.grayB64);
    const gray = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) gray[i] = bin.charCodeAt(i);
    return { name: c.meta.name, gray, w: c.meta.w, h: c.meta.h, truth: c.meta.truth ?? [] };
  }).filter((f: any) => f.gray.length === f.w * f.h);

  const work = (sig: Uint8Array) => {
    const se = edges1Dsub(sig, 12);
    if (se.length < 6) return 0;
    const xs = new Float64Array(se.length);
    for (let i = 0; i < se.length; i++) xs[i] = se[i].x;
    let W = 0;
    for (const [lo, hi] of manRowGroups(xs, {})) { const n = hi - lo + 1; W += n * n; }
    return W;
  };

  const res: any[] = [];
  for (const f of frames) {
    const stride = 4;
    let wTot = 0;
    for (let y = 2; y < f.h; y += stride) wTot += work(f.gray.subarray(y * f.w, (y + 1) * f.w));
    const per: any = {};
    for (const S of SETS) {
      const pad = S.pad ?? S.C;
      const cap = f.h / 4;
      const boxes: number[][] = [];
      let wCoarse = 0, coarseRows = 0, coarseHits = 0;
      for (let y = Math.floor(S.C / 2); y < f.h; y += S.C) {
        coarseRows++;
        const se = edges1Dsub(f.gray.subarray(y * f.w, (y + 1) * f.w), 12);
        wCoarse += work(f.gray.subarray(y * f.w, (y + 1) * f.w));
        for (const hit of detectRowMan(se, {})) {
          if (S.acc === "id" && hit.id == null) continue;
          if (S.acc === "idsup" && (hit.id == null || hit.sup < 7)) continue;
          coarseHits++;
          const r = Math.min(hit.wHalf, cap);
          boxes.push([y - (S.ky * r + pad), y + (S.ky * r + pad),
                      hit.foot - (S.kx * r + pad), hit.foot + (S.kx * r + pad)]);
        }
      }
      const y0 = 2, K = Math.ceil((f.h - y0) / stride);
      const iv: any[] = new Array(K);
      for (const b of boxes) {
        let lo = Math.max(0, Math.ceil((b[0] - y0) / stride)), hi = Math.min(K - 1, Math.floor((b[1] - y0) / stride));
        let x0 = Math.max(0, Math.floor(b[2])), x1 = Math.min(f.w - 1, Math.ceil(b[3]));
        if (x1 < x0) continue;
        for (let k = lo; k <= hi; k++) (iv[k] || (iv[k] = [])).push([x0, x1]);
      }
      let wDense = 0, keptPx = 0, denseRows = 0, totPx = 0;
      const rowbuf = new Uint8Array(f.w);
      for (let k = 0; k < K; k++) {
        const list = iv[k]; if (!list) continue;
        denseRows++; totPx += f.w;
        const off = (y0 + k * stride) * f.w;
        list.sort((a: number[], b: number[]) => a[0] - b[0]);
        const spans: number[][] = [];
        for (const s of list) {
          const last = spans[spans.length - 1];
          if (last && s[0] <= last[1] + 1) { if (s[1] > last[1]) last[1] = s[1]; } else spans.push([s[0], s[1]]);
        }
        rowbuf.fill(0);
        let cur = 0;
        for (const [a, b] of spans) {
          rowbuf.set(f.gray.subarray(off + a, off + b + 1), a);
          keptPx += b - a + 1;
          if (a > cur) {
            const L = cur > 0 ? rowbuf[cur - 1] : f.gray[off + a];
            const R = f.gray[off + a];
            const need = Math.ceil(Math.abs(R - L) / 8);
            if (a - cur < need) { rowbuf.set(f.gray.subarray(off + cur, off + a), cur); keptPx += a - cur; }
            else { let v = L; for (let x = cur; x < a; x++) { const dd = R - v; v += dd > 8 ? 8 : dd < -8 ? -8 : dd; rowbuf[x] = v; } }
          }
          cur = b + 1;
        }
        if (cur < f.w) rowbuf.fill(cur > 0 ? rowbuf[cur - 1] : 0, cur, f.w);
        wDense += work(rowbuf);
      }
      if (S.hull && boxes.length) {
        let a0 = Infinity, a1 = -Infinity, b0 = Infinity, b1 = -Infinity;
        for (const b of boxes) { a0 = Math.min(a0, b[0]); a1 = Math.max(a1, b[1]); b0 = Math.min(b0, b[2]); b1 = Math.max(b1, b[3]); }
        const eh = S.hull * (a1 - a0), ew = S.hull * (b1 - b0);
        boxes.length = 0; boxes.push([a0 - eh, a1 + eh, b0 - ew, b1 + ew]);
        iv.length = 0; iv.length = K;
        for (const b of boxes) {
          let lo = Math.max(0, Math.ceil((b[0] - y0) / stride)), hi = Math.min(K - 1, Math.floor((b[1] - y0) / stride));
          let x0 = Math.max(0, Math.floor(b[2])), x1 = Math.min(f.w - 1, Math.ceil(b[3]));
          if (x1 < x0) continue;
          for (let k = lo; k <= hi; k++) (iv[k] || (iv[k] = [])).push([x0, x1]);
        }
        wDense = 0; keptPx = 0; denseRows = 0; totPx = 0;
        for (let k = 0; k < K; k++) {
          const list = iv[k]; if (!list) continue;
          denseRows++; totPx += f.w;
          const off = (y0 + k * stride) * f.w;
          list.sort((a: number[], b: number[]) => a[0] - b[0]);
          const spans: number[][] = [];
          for (const s2 of list) { const last = spans[spans.length - 1]; if (last && s2[0] <= last[1] + 1) { if (s2[1] > last[1]) last[1] = s2[1]; } else spans.push([s2[0], s2[1]]); }
          rowbuf.fill(0);
          let cur = 0;
          for (const [a, b] of spans) {
            rowbuf.set(f.gray.subarray(off + a, off + b + 1), a); keptPx += b - a + 1;
            if (a > cur) {
              const L = cur > 0 ? rowbuf[cur - 1] : f.gray[off + a]; const R = f.gray[off + a];
              const need = Math.ceil(Math.abs(R - L) / 8);
              if (a - cur < need) { rowbuf.set(f.gray.subarray(off + cur, off + a), cur); keptPx += a - cur; }
              else { let v = L; for (let x = cur; x < a; x++) { const dd = R - v; v += dd > 8 ? 8 : dd < -8 ? -8 : dd; rowbuf[x] = v; } }
            }
            cur = b + 1;
          }
          if (cur < f.w) rowbuf.fill(cur > 0 ? rowbuf[cur - 1] : 0, cur, f.w);
          wDense += work(rowbuf);
        }
      }
      let covered = 0;
      for (const t of f.truth) covered += boxes.some((b: number[]) => t.y >= b[0] && t.y <= b[1] && t.x >= b[2] && t.x <= b[3]) ? 1 : 0;
      per[S.name] = { covered, nTruth: f.truth.length, wFrac: +((wCoarse + wDense) / wTot).toFixed(3), coarseFrac: +(wCoarse / wTot).toFixed(3),
                      denseFrac: +(wDense / wTot).toFixed(3), pxFrac: +(keptPx / (totPx || 1)).toFixed(3),
                      denseRows, K, boxes: boxes.length, coarseHits };
    }
    res.push({ name: f.name, wTot: Math.round(wTot), per });
  }
  return res;
}, { payload: cases, SETS });

await browser.close();
const keys = Object.keys(out[0].per);
const T = out.reduce((a: number, f: any) => a + f.wTot, 0);
for (const k of keys) {
  const wf = out.reduce((a: number, f: any) => a + f.per[k].wFrac * f.wTot, 0) / T;
  const cf = out.reduce((a: number, f: any) => a + f.per[k].coarseFrac * f.wTot, 0) / T;
  const px = out.reduce((a: number, f: any) => a + f.per[k].pxFrac, 0) / out.length;
  const rr = out.reduce((a: number, f: any) => a + f.per[k].denseRows / f.per[k].K, 0) / out.length;
  const cov = out.reduce((a: number, f: any) => a + f.per[k].covered, 0), nt = out.reduce((a: number, f: any) => a + f.per[k].nTruth, 0);
  console.log(k.padEnd(16), "work", wf.toFixed(3), "(coarse", cf.toFixed(3) + ")", "pxKept", px.toFixed(3), "denseRowFrac", rr.toFixed(3), "truthCovered", cov + "/" + nt);
}
console.log("\nper frame, " + keys[0] + " / " + keys[2] + ":");
for (const f of out) console.log(f.name.padEnd(20), keys.map((k) => f.per[k].wFrac).join(" "));
