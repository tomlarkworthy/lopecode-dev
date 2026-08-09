// After the flip: the page level must be white, must come from ONE cell, and
// the four consumers must all agree with it. Then re-run the three test cells
// that score against synthetic scenes, since their scenes just changed colour.
import { chromium } from "playwright";
import { resolve } from "node:path";
import { writeFileSync } from "node:fs";
const IN = resolve("lopebooks/notebooks/tomlarkworthy_coded-landmark-tracking.html");
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errs: string[] = [];
page.on("pageerror", (x) => errs.push(x.message.slice(0, 160)));
await page.addInitScript(() => {
  const orig = (window as any).Runtime; let cap = false;
  Object.defineProperty(window, "Runtime", { get() { return orig; }, set(N: any) {
    const W = function (this: any, ...a: any[]) { const i = new N(...a); if (!cap) { (window as any).__ojs_runtime = i; cap = true; } return i; };
    W.prototype = N.prototype; Object.assign(W, N); return W; } });
});
await page.goto(`file://${IN}#view=S100(@tomlarkworthy/coded-landmark-tracking)`, { waitUntil: "networkidle", timeout: 300000 });
await page.waitForFunction(() => !!(window as any).__ojs_runtime, { timeout: 300000 });
await page.waitForTimeout(18000);
const out = await page.evaluate(async () => {
  const rt = (window as any).__ojs_runtime;
  const mod = rt.mains.get("@tomlarkworthy/coded-landmark-tracking");
  const val = async (n: string) => {
    const v = [...rt._variables].find((z: any) => z._module === mod && z._name === n);
    if (!v) return null;
    return await Promise.race([v._promise, new Promise((r) => setTimeout(() => r("<timeout>"), 90000))]);
  };
  const [lvl, sheet, mark, color, scene, hexScene, target]: any = await Promise.all(
    ["manPageLevel", "hexTargetSvg", "manMarkSvgSource", "manColor", "manScene", "renderHexScene", "hexTarget"].map(val));

  const sDef = sheet(), sGray = sheet({ pageFill: "#808080" });
  const mDef = mark(22), mGray = mark(22, { pageFill: "#808080" });

  // Every consumer must report the same page level as the cell.
  const L = (await val("manLayout")) as any;
  const consumers = {
    manColor_beyond_rim: color(L.R + 1, [0, 0, 0, 0, 0, 0], L),
    manScene_corner: scene.gray[0],
    renderHexScene_paper: (() => {
      const f = hexScene({ yawDeg: 0, tiltDeg: 0, rollDeg: 0 });
      // a pixel on the sheet but well outside every mark
      const T = target;
      let best = null;
      for (let i = 0; i < f.gray.length; i += 37) {
        const x = i % f.w, y = (i / f.w) | 0;
        if (Math.abs(x - f.w / 2) < 40 && Math.abs(y - f.h / 2) < 40) continue;
        best = best === null ? f.gray[i] : Math.max(best, f.gray[i]);
      }
      return best;
    })()
  };

  const tests = {} as any;
  for (const t of ["manSceneTest", "manAxesTest", "sectionAudit"]) {
    const v = await val(t);
    tests[t] = typeof v === "string" ? v : v && (v as any).textContent ? (v as any).textContent.trim() : String(v);
  }
  return {
    manPageLevel: lvl,
    sheetDefaultWhite: sDef.includes('fill="#ffffff"') && !sDef.includes('fill="#808080"'),
    sheetGrayOnRequest: sGray.includes('fill="#808080"'),
    markDefaultWhite: mDef.includes('fill="#ffffff"/>\n') || /<rect [^>]*fill="#ffffff"/.test(mDef),
    legendDefault: sDef.includes("do not trim"),
    legendGray: sGray.includes("do not trim"),
    labelDefault: (mDef.match(/fill="(#[0-9a-f]{6})" text-anchor/) ?? [])[1],
    labelGray: (mGray.match(/fill="(#[0-9a-f]{6})" text-anchor/) ?? [])[1],
    discsSame: (sDef.match(/<circle/g) ?? []).length === (sGray.match(/<circle/g) ?? []).length,
    consumers, tests, sDef, mDef
  };
});
writeFileSync("scratch/rmbt/hex-target-white.svg", out.sDef);
writeFileSync("scratch/rmbt/man-mark-22-white.svg", out.mDef);
console.log("manPageLevel                       :", out.manPageLevel);
console.log("default sheet is white             :", out.sheetDefaultWhite);
console.log("default single mark is white       :", out.markDefaultWhite);
console.log("pageFill '#808080' still works     :", out.sheetGrayOnRequest);
console.log("'do not trim' legend default/gray  :", out.legendDefault, "/", out.legendGray);
console.log("mark label fill    default/gray    :", out.labelDefault, "/", out.labelGray);
console.log("same disc count both ways          :", out.discsSame);
console.log("\nconsumers must all equal manPageLevel:");
for (const [k, v] of Object.entries(out.consumers)) console.log(`  ${k.padEnd(24)} ${v}`);
console.log("\n--- test cells ---");
for (const [k, v] of Object.entries(out.tests)) console.log(`\n[${k}]\n${v}`);
console.log("\npageerrors:", errs.length ? errs.slice(0, 3) : "none");
await browser.close();
