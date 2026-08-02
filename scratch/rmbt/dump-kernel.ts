#!/usr/bin/env bun
// Serialise the live detector into a standalone module so it can be profiled and
// tuned offline, with no browser and no other cells competing for the thread.
// Same trick detectKernelSource uses for the workers, extended to the
// coarse-to-fine layer so a whole frame can be timed.
import { chromium } from "playwright";
import { resolve } from "path";
import { writeFileSync } from "fs";

const NB = resolve("lopebooks/notebooks/tomlarkworthy_coded-landmark-tracking.html");
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
page.on("console", (m) => { if (m.type() === "error") console.error("[page]", m.text()); });
await page.goto(`file://${NB}#view=R100(S100(@tomlarkworthy/coded-landmark-tracking))`);
await page.waitForFunction(() => (globalThis as any).__ojs_runtime, null, { timeout: 60000 });
await page.waitForFunction(async () => {
  const m = (globalThis as any).__ojs_runtime.mains?.get?.("@tomlarkworthy/coded-landmark-tracking");
  if (!m) return false;
  try { await m.value("detectKernelSource"); return true; } catch { return false; }
}, null, { timeout: 60000 });

const src = await page.evaluate(async () => {
  const m = (globalThis as any).__ojs_runtime.mains.get("@tomlarkworthy/coded-landmark-tracking");
  const kernel = await m.value("detectKernelSource");
  const extra = ["template_edges", "scanLattice", "clusterWindows", "fuseCluster",
                 "fuseLandmarks", "analyzeFrame", "rowStride"];
  // fuseCluster is imported from Part III and closes over ITS module's cells, which
  // toString() cannot carry, so fall back to Part III's scope for the leaves
  const m3 = (globalThis as any).__ojs_runtime.mains.get("@tomlarkworthy/realtime-multi-barcode-tracking");
  const parts = [];
  for (const n of extra) {
    const v = await m.value(n).catch(() => m3.value(n));
    parts.push(typeof v === "function" ? `const ${n} = ${v.toString()};`
                                       : `const ${n} = ${JSON.stringify(v)};`);
  }
  // strip the kernel's worker onmessage tail; keep the definitions
  const cut = kernel.indexOf("self.onmessage");
  return (cut < 0 ? kernel : kernel.slice(0, cut)) + "\n" + parts.join("\n");
});
await browser.close();

writeFileSync("scratch/rmbt/kernel.js", `${src}
export { runPipeline, analyzeFrame, detectLandmarkRow, windowCandidates, edges1Dsub,
         rowOf, decodeLandmark, fuseLandmarks, scanLattice, clusterWindows,
         LAYOUT, crCurve, carrierTemplate, codebook, templateAtOffset, fitMobiusLS,
         dpAlignFast, dpScratch, crossRatio, crDistance, xFromK };
`);
console.log("wrote scratch/rmbt/kernel.js", src.length, "chars");
