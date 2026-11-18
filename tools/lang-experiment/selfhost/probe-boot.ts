// Headless: ms from navigation until the tutorial's half has a value and until the checker module's
// soundscript has one, polled every animation frame. Run: bun selfhost/probe-boot.ts <notebook.html> [runs]
import { chromium } from "../../../node_modules/playwright/index.mjs";
const browser = await chromium.launch();
for (let i = 0; i < Number(process.argv[3] ?? 3); i++) {
  const page = await browser.newPage();
  await page.route("**/*", (r) => (/^(file|blob|data):/.test(r.request().url()) ? r.continue() : r.abort()));
  await page.addInitScript(() => {
    const w = window as any; w.__t = {};
    const tick = () => {
      const rt = w.__ojs_runtime;
      if (rt?.mains) {
        const half = rt.mains.get("@tomlarkworthy/soundscript-tutorial")?._scope.get("half");
        if (half && half._value !== undefined) w.__t.half ??= performance.now();
        const ssv = [...rt._variables].find((x: any) => x._name === "soundscript" && x._value);
        if (ssv) w.__t.soundscript ??= performance.now();
      }
      if (!(w.__t.half && w.__t.soundscript)) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await page.goto(`file://${process.argv[2]}`);
  await page.waitForFunction(() => (window as any).__t.half && (window as any).__t.soundscript, null, { timeout: 60000 }).catch(() => {});
  const t = await page.evaluate(() => (window as any).__t);
  console.log(`half ${t.half?.toFixed(0)} ms, soundscript ${t.soundscript?.toFixed(0)} ms, soundscript - half ${(t.soundscript - t.half).toFixed(0)} ms`);
  await page.close();
}
await browser.close();
