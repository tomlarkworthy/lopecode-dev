// Minimal PNG encoder (RGBA, 8-bit) + a simple scatter rasterizer.
import { deflateSync } from "node:zlib";

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  dv.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

export function encodePNG(width: number, height: number, rgba: Uint8Array): Uint8Array {
  const ihdr = new Uint8Array(13);
  const dv = new DataView(ihdr.buffer);
  dv.setUint32(0, width);
  dv.setUint32(4, height);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA
  const raw = new Uint8Array(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    raw[y * (1 + width * 4)] = 0; // filter: none
    raw.set(rgba.subarray(y * width * 4, (y + 1) * width * 4), y * (1 + width * 4) + 1);
  }
  const idat = deflateSync(raw);
  const sig = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const parts = [sig, chunk("IHDR", ihdr), chunk("IDAT", new Uint8Array(idat)), chunk("IEND", new Uint8Array(0))];
  const total = parts.reduce((a, p) => a + p.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) { out.set(p, off); off += p.length; }
  return out;
}

export type Pt = { x: number; y: number; r: number; g: number; b: number };

// points in [0,1]^2 (y down), splatted as 2x2 px on white
export function scatterPNG(width: number, height: number, pts: Pt[], title = ""): Uint8Array {
  const img = new Uint8Array(width * height * 4).fill(255);
  const put = (px: number, py: number, r: number, g: number, b: number) => {
    if (px < 0 || py < 0 || px >= width || py >= height) return;
    const o = (py * width + px) * 4;
    img[o] = r; img[o + 1] = g; img[o + 2] = b; img[o + 3] = 255;
  };
  for (const p of pts) {
    const px = Math.round(p.x * width), py = Math.round(p.y * height);
    put(px, py, p.r, p.g, p.b);
    put(px + 1, py, p.r, p.g, p.b);
    put(px, py + 1, p.r, p.g, p.b);
    put(px + 1, py + 1, p.r, p.g, p.b);
  }
  return encodePNG(width, height, img);
}

// Barycentric layout for a 3-simplex belief -> [0,1]^2 (y down, triangle upright)
const V0 = [0.08, 0.90], V1 = [0.92, 0.90], V2 = [0.50, 0.9 - 0.84 * Math.sin(Math.PI / 3)];
export function baryXY(eta: ArrayLike<number>): [number, number] {
  const x = eta[0] * V0[0] + eta[1] * V1[0] + eta[2] * V2[0];
  const y = eta[0] * V0[1] + eta[1] * V1[1] + eta[2] * V2[1];
  return [x, y];
}

export function beliefColor(eta: ArrayLike<number>): [number, number, number] {
  const c = (p: number) => Math.round(30 + 215 * Math.min(1, Math.max(0, p)));
  return [c(eta[0]), c(eta[1]), c(eta[2])];
}
