import { readFileSync } from "fs";
const K: any = await import("./kernel-count.js");
const W = 1280, H = 960;
for (const stem of ["frame-mirror-angled", "frame-mirror-flat"]) {
  const frame = { gray: new Uint8Array(readFileSync(`scratch/rmbt/imgs/${stem}.luma`)), w: W, h: H, n: 0 };
  await K.analyzeFrame(frame, { minMargin: 4, minReadable: 4 });   // warm
  K.__reset();
  const t0 = performance.now();
  const { run, fused } = await K.analyzeFrame(frame, { minMargin: 4, minReadable: 4 });
  const ms = performance.now() - t0;
  console.log(stem, "ms", ms.toFixed(1), "ids", fused.length, "rows", run.rowsTouched);
  console.log("  ", JSON.stringify(K.__C), "avgMobPts", (K.__C.mobPts / K.__C.fitMobiusLS).toFixed(1),
              "avgDpCells", (K.__C.dpCells / K.__C.dpAlignFast).toFixed(0));
}
