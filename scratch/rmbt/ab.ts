#!/usr/bin/env bun
// A/B a kernel variant against the baseline: speed AND agreement of fused
// landmarks, because a faster detector that moves the answer is not a win.
import { readFileSync } from "fs";
const W = 1280, H = 960;
const FRAMES = ["frame-mirror-angled", "frame-mirror-flat", "frame-blank"];
const A: any = await import("./kernel.js");
const B: any = await import("./kernel-opt.js");
const load = (s: string) => ({ gray: new Uint8Array(readFileSync(`scratch/rmbt/imgs/${s}.luma`)), w: W, h: H, n: 0 });

const run = async (K: any, frame: any) => {
  let best: any = null;
  for (let i = 0; i < 4; i++) {
    const t0 = performance.now();
    const r = await K.analyzeFrame(frame, { minMargin: 4, minReadable: 4 });
    const ms = performance.now() - t0;
    if (i && (!best || ms < best.ms)) best = { ms, ...r };
  }
  return best;
};
const rows: any[] = [];
for (const stem of FRAMES) {
  const frame = load(stem);
  const a = await run(A, frame), b = await run(B, frame);
  const byId = (f: any[]) => new Map(f.map((x) => [x.id, x]));
  const ma = byId(a.fused), mb = byId(b.fused);
  let worst = 0, lost: number[] = [], gained: number[] = [];
  for (const [id, x] of ma) {
    const y = mb.get(id);
    if (!y) { lost.push(id); continue; }
    worst = Math.max(worst, Math.hypot(x.xc - y.xc, x.yc - y.yc));
  }
  for (const id of mb.keys()) if (!ma.has(id)) gained.push(id);
  rows.push({
    frame: stem,
    baseMs: +a.ms.toFixed(1), optMs: +b.ms.toFixed(1),
    speedup: +(a.ms / b.ms).toFixed(2),
    baseIds: a.fused.length, optIds: b.fused.length,
    maxShiftPx: +worst.toFixed(3),
    lost: lost.join("/") || "-", gained: gained.join("/") || "-",
    baseHits: a.run.hits.length, optHits: b.run.hits.length
  });
}
console.table(rows);
