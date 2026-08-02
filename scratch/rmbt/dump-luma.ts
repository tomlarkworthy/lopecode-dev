// Dump raw single-channel luma (pipeline weights) so a proper grayscale PNG can
// be encoded on the node side. canvas.toBlob only ever emits RGBA.
import { chromium } from "playwright";
import { readFileSync, writeFileSync } from "node:fs";

const DIR = "scratch/rmbt/imgs";
const STEMS = ["frame-mirror-angled", "frame-mirror-flat", "frame-blank"];

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto("about:blank");

for (const stem of STEMS) {
  const b64 = readFileSync(`${DIR}/${stem}.png`).toString("base64");
  const { w, h, luma } = await page.evaluate(async (b64) => {
    const img = new Image();
    img.src = "data:image/png;base64," + b64;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    const ctx = c.getContext("2d", { willReadFrequently: true })!;
    ctx.drawImage(img, 0, 0);
    const px = ctx.getImageData(0, 0, c.width, c.height).data;
    const g = new Uint8Array(c.width * c.height);
    for (let i = 0, p = 0; i < g.length; i++, p += 4)
      g[i] = (px[p] * 77 + px[p + 1] * 150 + px[p + 2] * 29) >> 8;
    let s = ""; for (const b of g) s += String.fromCharCode(b);
    return { w: c.width, h: c.height, luma: btoa(s) };
  }, b64);
  writeFileSync(`${DIR}/${stem}.luma`, Buffer.from(luma, "base64"));
  console.log(stem, w, h, "luma bytes", w * h);
}
await browser.close();
