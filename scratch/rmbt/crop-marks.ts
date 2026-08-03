// Side-by-side, 1:1 then 2x, of one mark from a frame that works and one from
// a frame that reads nothing. "Is the signal there" is a question about the
// radial profile, and a whole-frame view cannot answer it.
import { readFileSync, writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";
const crc32 = (b: Buffer) => { let c = ~0; for (const x of b) { c ^= x; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1)); } return ~c >>> 0; };
const chunk = (t: string, d: Buffer) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t, "ascii"), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc32(td)); return Buffer.concat([l, td, c]); };
const png = (g: Uint8Array, w: number, h: number) => { const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 0; const raw = Buffer.alloc(h * (w + 1)); for (let y = 0; y < h; y++) { raw[y * (w + 1)] = 0; raw.set(g.subarray(y * w, (y + 1) * w), y * (w + 1) + 1); } return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ih), chunk("IDAT", deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0))]); };

const W = 960, H = 720, S = 180, Z = 2;
const load = (n: string) => new Uint8Array(readFileSync(`data/hexcases/hexcase-6ib0-${n}.gray`));
const crop = (g: Uint8Array, cx: number, cy: number) => {
  const o = new Uint8Array(S * Z * S * Z);
  for (let y = 0; y < S * Z; y++) for (let x = 0; x < S * Z; x++) {
    const sx = Math.min(W - 1, Math.max(0, cx - (S >> 1) + (x / Z | 0)));
    const sy = Math.min(H - 1, Math.max(0, cy - (S >> 1) + (y / Z | 0)));
    o[y * S * Z + x] = g[sy * W + sx];
  }
  return o;
};
const panels: [string, number, number][] = [["07", 490, 252], ["14", 505, 285], ["09", 480, 360], ["15", 480, 360]];
const P = S * Z, sheet = new Uint8Array(P * panels.length * P);
panels.forEach(([n, cx, cy], i) => {
  const c = crop(load(n), cx, cy);
  for (let y = 0; y < P; y++) sheet.set(c.subarray(y * P, (y + 1) * P), y * P * panels.length + i * P);
});
writeFileSync("scratch/rmbt/caseimgs/marks-compare.png", png(sheet, P * panels.length, P));
console.log("07 (reads 7) | 14 (dead) | 09 (dead) | 15 (dead), 2x");
