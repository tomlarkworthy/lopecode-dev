#!/usr/bin/env bun
// Crop a frame with NO resampling: the man mark needs ~4px per tooth, and any
// resize filter merges them (measured: 1280 -> 960 took a frame from 5 marks
// read to 2). A crop keeps the camera's own pixels and just narrows the field.
import { PNG } from "pngjs";
import { readFileSync, writeFileSync } from "node:fs";
const [src, dst, X, Y, W, H] = process.argv.slice(2);
const png = PNG.sync.read(readFileSync(src));
const x0 = +X, y0 = +Y, w = +W, h = +H;
const out = new PNG({ width: w, height: h });
for (let y = 0; y < h; y++)
  for (let x = 0; x < w; x++) {
    const s = ((y0 + y) * png.width + (x0 + x)) * 4;
    const d = (y * w + x) * 4;
    out.data[d] = png.data[s]; out.data[d + 1] = png.data[s + 1];
    out.data[d + 2] = png.data[s + 2]; out.data[d + 3] = 255;
  }
writeFileSync(dst, PNG.sync.write(out, { deflateLevel: 9 }));
console.log(`${dst} ${w}x${h}`);
