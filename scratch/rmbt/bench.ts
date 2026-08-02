#!/usr/bin/env bun
// Offline whole-frame profile of the serialised detector. No browser, no other
// cells, so the numbers are the detector's own.
import { readFileSync } from "fs";

const W = 1280, H = 960;
const FRAMES = ["frame-mirror-angled", "frame-mirror-flat", "frame-blank"];
const K: any = await import("./kernel.js");

const load = (stem: string) => ({
  gray: new Uint8Array(readFileSync(`scratch/rmbt/imgs/${stem}.luma`)),
  w: W, h: H, n: 0
});

const rows: any[] = [];
for (const stem of FRAMES) {
  const frame = load(stem);
  let best: any = null;
  for (let rep = 0; rep < 5; rep++) {
    const t0 = performance.now();
    const { run, fused } = await K.analyzeFrame(frame, { minMargin: 4, minReadable: 4 });
    const ms = performance.now() - t0;
    if (rep === 0) continue;
    if (!best || ms < best.ms) best = { ms, run, fused };
  }
  const { run, fused, ms } = best;
  rows.push({
    frame: stem, ids: fused.length,
    ms: +ms.toFixed(1), msDetect: +run.msDetect.toFixed(1), msDecode: +run.msDecode.toFixed(1),
    rows: run.rowsTouched, edges: run.scanEdges,
    windows: run.windows, survived: run.survived, hits: run.hits.length
  });
}
console.table(rows);
