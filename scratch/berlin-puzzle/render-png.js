// Render SVG files to PNG via Playwright Chromium, for visual inspection.
// Usage: bun render-png.js out/foo.svg [out/bar.svg ...]
import { chromium } from "../../tools/node_modules/playwright/index.mjs";
import { readFileSync } from "fs";
import { resolve } from "path";

const files = process.argv.slice(2);
if (!files.length) { console.error("usage: bun render-png.js file.svg ..."); process.exit(1); }

const browser = await chromium.launch();
const page = await browser.newPage();
for (const f of files) {
  const svg = readFileSync(f, "utf8");
  const m = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
  const [w, h] = m ? [parseFloat(m[1]), parseFloat(m[2])] : [400, 300];
  const scale = Math.min(2200 / w, 2200 / h, 6);
  await page.setViewportSize({ width: Math.ceil(w * scale), height: Math.ceil(h * scale) });
  await page.setContent(
    `<body style="margin:0;background:#fff"><div style="width:${w * scale}px;height:${h * scale}px">` +
    svg.replace(/width="[\d.]+mm" height="[\d.]+mm"/, `width="${w * scale}" height="${h * scale}"`) +
    `</div></body>`);
  const out = f.replace(/\.svg$/, ".png");
  await page.screenshot({ path: out });
  console.log("wrote", resolve(out));
}
await browser.close();
