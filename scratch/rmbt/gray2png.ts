// Saved cases are raw luma. Look at them without a browser: an 8-bit
// grayscale PNG, written by hand, so a failing frame can be inspected as a
// picture rather than as a count.
//
//   bun scratch/rmbt/gray2png.ts 6ib0                 every case matching
//   bun scratch/rmbt/gray2png.ts 6ib0 --contact       one contact sheet
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { deflateSync } from "node:zlib";

const DIR = resolve("data/hexcases");
const OUT = resolve("scratch/rmbt/caseimgs");
mkdirSync(OUT, { recursive: true });
const match = process.argv[2] ?? "";
const contact = process.argv.includes("--contact");

const crc32 = (b: Buffer) => {
  let c = ~0;
  for (const x of b) { c ^= x; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1)); }
  return ~c >>> 0;
};
const chunk = (type: string, data: Buffer) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
};
const png = (gray: Uint8Array, w: number, h: number) => {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 0; // 8-bit, greyscale
  const raw = Buffer.alloc(h * (w + 1));
  for (let y = 0; y < h; y++) {
    raw[y * (w + 1)] = 0; // filter: none
    raw.set(gray.subarray(y * w, (y + 1) * w), y * (w + 1) + 1);
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0))
  ]);
};

const names = readdirSync(DIR).filter((f) => f.endsWith(".gray") && f.includes(match))
  .map((f) => f.slice(0, -5)).sort();
if (!names.length) { console.log("no cases matching " + match); process.exit(1); }

if (!contact) {
  for (const n of names) {
    const meta = JSON.parse(readFileSync(resolve(DIR, n + ".json"), "utf8"));
    const gray = new Uint8Array(readFileSync(resolve(DIR, n + ".gray")));
    writeFileSync(resolve(OUT, n + ".png"), png(gray, meta.w, meta.h));
    console.log(`${n}.png  ${meta.w}x${meta.h}  read=${meta.capture?.counts?.read ?? "-"}`);
  }
} else {
  // half scale, 3 across, so a dozen frames fit in one look
  const metas = names.map((n) => JSON.parse(readFileSync(resolve(DIR, n + ".json"), "utf8")));
  const W = metas[0].w >> 1, H = metas[0].h >> 1, COLS = 3;
  const rows = Math.ceil(names.length / COLS);
  const sheet = new Uint8Array(W * COLS * H * rows);
  const SW = W * COLS;
  names.forEach((n, i) => {
    const m = metas[i];
    const g = new Uint8Array(readFileSync(resolve(DIR, n + ".gray")));
    const ox = (i % COLS) * W, oy = Math.floor(i / COLS) * H;
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++)
        sheet[(oy + y) * SW + ox + x] = g[(y * 2) * m.w + x * 2];
  });
  writeFileSync(resolve(OUT, "contact-" + (match || "all") + ".png"), png(sheet, SW, H * rows));
  console.log("contact sheet: " + names.join(", "));
}
