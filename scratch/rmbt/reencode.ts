// Re-encode the frame-bank captures. Greyscale uses the SAME luma weights the
// capture path uses (77/150/29 >> 8), so a variant differs from the original in
// codec only -- not in how the colour was collapsed.
import { chromium } from "playwright";
import { readFileSync, writeFileSync, readdirSync } from "node:fs";

const DIR = "scratch/rmbt/imgs";
const SRC = readdirSync(DIR).filter((f) => f.endsWith(".png") && !f.includes("--"));

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto("about:blank");

for (const name of SRC) {
  const b64 = readFileSync(`${DIR}/${name}`).toString("base64");
  const stem = name.replace(/\.png$/, "");
  const variants = await page.evaluate(async (b64) => {
    const img = new Image();
    img.src = "data:image/png;base64," + b64;
    await img.decode();
    const { width: w, height: h } = img;
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const ctx = c.getContext("2d", { willReadFrequently: true })!;
    ctx.drawImage(img, 0, 0);
    const px = ctx.getImageData(0, 0, w, h).data;
    // exact pipeline luma, written back into all three channels
    for (let p = 0; p < px.length; p += 4) {
      const g = (px[p] * 77 + px[p + 1] * 150 + px[p + 2] * 29) >> 8;
      px[p] = px[p + 1] = px[p + 2] = g; px[p + 3] = 255;
    }
    ctx.putImageData(new ImageData(px, w, h), 0, 0);

    const enc = async (cv: HTMLCanvasElement, type: string, q?: number) => {
      const blob: Blob = await new Promise((r) => cv.toBlob((b) => r(b!), type, q));
      const buf = new Uint8Array(await blob.arrayBuffer());
      let s = ""; for (const b of buf) s += String.fromCharCode(b);
      return btoa(s);
    };
    const half = document.createElement("canvas");
    half.width = w >> 1; half.height = h >> 1;
    half.getContext("2d")!.drawImage(c, 0, 0, half.width, half.height);

    const out: Record<string, string> = {};
    out["grey.png"] = await enc(c, "image/png");
    for (const q of [95, 92, 90, 85, 75]) out[`grey-q${q}.jpg`] = await enc(c, "image/jpeg", q / 100);
    out["half.png"] = await enc(half, "image/png");
    out["half-q92.jpg"] = await enc(half, "image/jpeg", 0.92);
    return out;
  }, b64);

  for (const [suffix, data] of Object.entries(variants)) {
    const buf = Buffer.from(data, "base64");
    writeFileSync(`${DIR}/${stem}--${suffix}`, buf);
    console.log(`${stem}--${suffix}`.padEnd(46), String(buf.length).padStart(9));
  }
}
await browser.close();
