// Visual control for the bench: a technique that paints NOTHING benchmarks
// perfectly, so every row in the sheet gets a frame on disk to be judged against.
import { chromium } from "playwright";

const N = Number(process.argv[2] ?? 600);
const browser = await chromium.launch({ headless: false });
const page = await browser.newPage({ viewport: { width: 1300, height: 760 } });
await page.goto("file://" + import.meta.dir + "/svg-particles.html");
await page.waitForFunction("window.TECHS");
const techs: string[] = (await page.evaluate("window.TECHS")) as string[];

for (const t of techs) {
  await page.evaluate(([t, n]) => (window as any).run(t, n, 30, 5), [t, N] as any);
  await page.screenshot({ path: `${import.meta.dir}/shots/${t}.png`, clip: { x: 300, y: 120, width: 520, height: 340 } });
  console.log("shot", t);
}
await browser.close();
