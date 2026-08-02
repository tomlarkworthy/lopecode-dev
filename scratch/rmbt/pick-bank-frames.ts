// Choose a VISUALLY VARIED subset of data/hexcases for the notebook to ship.
//
// The rig collects whatever the camera was pointed at, and a sitting produces a
// dozen frames of the same sheet on the same desk in the same light. Twelve of
// those in a row tell a reader nothing they did not learn from the first one --
// worse, they read as one photo duplicated, which makes the bank look like
// decoration rather than evidence. So the criterion here is literally "does not
// look like anything already picked", measured on the pixels rather than on the
// metadata, plus a geometry term so two different rooms at the same tilt do not
// both win.
//
//   bun scratch/rmbt/pick-bank-frames.ts [--n 16] [--out scratch/rmbt/bank]
//                                        [--exclude name,name] [--allow-clipped]
//
// FRAMES SHIP WHOLE. Cropping to the target would halve the bytes, and it is
// the wrong saving: the background is the specificity test. Window bars, picture
// frames, tiled floors and leaves are the structures a scanline detector fires
// on by mistake, so a bank cropped to the marks only ever asks whether the
// detector can read a mark it has already been handed -- never whether it
// invents one. --crop exists for measuring that difference, not for shipping.
//
// Never resized either, cropped or not: a man mark needs about 4 pixels per
// tooth and resampling costs marks outright (see the note on
// frame-man-phone.png, where 1280 -> 960 took five marks down to two).
import { readFileSync, readdirSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { resolve, basename } from "node:path";
import { deflateSync } from "node:zlib";

const DIR = resolve("data/hexcases");
const argOf = (flag: string, dflt: string) => {
  const i = process.argv.indexOf(flag);
  return i === -1 ? dflt : process.argv[i + 1];
};
const N = Number(argOf("--n", "16"));
const OUT = resolve(argOf("--out", "scratch/rmbt/bank"));
const ALLOW_CLIPPED = process.argv.includes("--allow-clipped");
const EXCLUDE = argOf("--exclude", "").split(",").map((s) => s.trim()).filter(Boolean);
const CROP = process.argv.includes("--crop"); // see the header: not for shipping
const MARGIN = Number(argOf("--margin", "1.6")); // --crop only: in median mark radii

type Case = {
  name: string; w: number; h: number; gray: Buffer; meta: any;
  desc: Float64Array; geo: number[];
};

// ---- load ------------------------------------------------------------------
const names = readdirSync(DIR).filter((f) => f.endsWith(".gray")).map((f) => f.slice(0, -5)).sort();
const cases: Case[] = [];
for (const n of names) {
  const meta = JSON.parse(readFileSync(resolve(DIR, n + ".json"), "utf8"));
  const gray = readFileSync(resolve(DIR, n + ".gray"));
  if (gray.length !== meta.w * meta.h) {
    console.warn(`  skip ${n}: ${gray.length} bytes for ${meta.w}x${meta.h}`);
    continue;
  }
  if (EXCLUDE.some((e) => n.includes(e))) {
    console.log(`  exclude ${n}: named on --exclude`);
    continue;
  }
  // A frame whose target runs off the edge is still a legitimate ARCHIVE case --
  // the sweep should absolutely be graded on partial marks. It is a bad GALLERY
  // frame: a reader sees a photo that missed, not a detector that coped, and
  // asks why the picture is wrong instead of looking at the detection. Four of
  // seventy captures are like this, so dropping them costs almost no variety.
  const clipped = (meta.truth ?? []).filter(
    (m: any) => m.x < m.radiusPx || m.y < m.radiusPx || m.x > meta.w - m.radiusPx || m.y > meta.h - m.radiusPx);
  if (clipped.length && !ALLOW_CLIPPED) {
    console.log(`  exclude ${n}: ${clipped.length}/${(meta.truth ?? []).length} marks cut by the frame edge`);
    continue;
  }
  cases.push({ name: n, w: meta.w, h: meta.h, gray, meta, desc: null as any, geo: null as any });
}
if (!cases.length) { console.log("no cases"); process.exit(0); }

// ---- descriptors -----------------------------------------------------------
// 8x8 mean-pooled luma, then z-normalised per frame so that "the same room at a
// different exposure" is NOT counted as variety -- brightness is the one thing a
// reader will not notice and the auto-exposure will not hold constant anyway.
const GRID = 8;
function describe(c: Case): Float64Array {
  const d = new Float64Array(GRID * GRID);
  const cnt = new Float64Array(GRID * GRID);
  for (let y = 0; y < c.h; y++) {
    const gy = Math.min(GRID - 1, (y * GRID / c.h) | 0);
    for (let x = 0; x < c.w; x++) {
      const gi = gy * GRID + Math.min(GRID - 1, (x * GRID / c.w) | 0);
      d[gi] += c.gray[y * c.w + x];
      cnt[gi]++;
    }
  }
  for (let i = 0; i < d.length; i++) d[i] /= cnt[i] || 1;
  const mean = d.reduce((a, b) => a + b, 0) / d.length;
  let sd = Math.sqrt(d.reduce((a, b) => a + (b - mean) ** 2, 0) / d.length);
  if (sd < 1e-6) sd = 1;
  for (let i = 0; i < d.length; i++) d[i] = (d[i] - mean) / sd;
  return d;
}

// Geometry the reader also sees as variety: shape of the frame, how big the
// target is in it, how hard the pose is. Weighted to be worth roughly as much
// as the appearance term so a second room does not beat a second ANGLE.
function geometry(c: Case): number[] {
  const t = c.meta.truth ?? [];
  const rs = t.map((m: any) => m.radiusPx).filter((r: number) => r > 0).sort((a: number, b: number) => a - b);
  const r = rs.length ? rs[rs.length >> 1] : 1;
  const xs = t.map((m: any) => m.x), ys = t.map((m: any) => m.y);
  const spanX = xs.length ? Math.max(...xs) - Math.min(...xs) : 0;
  const spanY = ys.length ? Math.max(...ys) - Math.min(...ys) : 0;
  const cap = c.meta.capture ?? {};
  // anisotropy of the mark ring is the visible signature of tilt, and unlike
  // capture.tiltDeg it is present on every case
  const aniso = spanX && spanY ? Math.log(spanX / spanY) : 0;
  return [
    2 * Math.log(c.w / c.h),                      // portrait vs landscape
    2 * Math.log(Math.max(r, 1) / 40),            // apparent mark size
    1.5 * aniso,                                  // tilt, as seen
    1.0 * ((cap.counts?.read ?? 0) / 7),          // how much of it worked
  ];
}
for (const c of cases) { c.desc = describe(c); c.geo = geometry(c); }

const dist = (a: Case, b: Case) => {
  let s = 0;
  for (let i = 0; i < a.desc.length; i++) s += (a.desc[i] - b.desc[i]) ** 2;
  const appearance = Math.sqrt(s / a.desc.length);
  let g = 0;
  for (let i = 0; i < a.geo.length; i++) g += (a.geo[i] - b.geo[i]) ** 2;
  return appearance + Math.sqrt(g);
};

// ---- greedy farthest-point selection ---------------------------------------
// Seed with the two most unlike each other, then repeatedly take whichever case
// is furthest from everything already chosen. This is the standard max-min
// diversity greedy; it has the property we want here, that a cluster of twelve
// near-identical frames contributes ONE member before anything else in the
// cluster is even considered.
let best = [0, 1], bestD = -1;
for (let i = 0; i < cases.length; i++)
  for (let j = i + 1; j < cases.length; j++) {
    const d = dist(cases[i], cases[j]);
    if (d > bestD) { bestD = d; best = [i, j]; }
  }
const picked = [best[0], best[1]];
const minD: number[] = cases.map((c, i) => Math.min(dist(c, cases[best[0]]), dist(c, cases[best[1]])));
while (picked.length < Math.min(N, cases.length)) {
  let arg = -1, far = -1;
  for (let i = 0; i < cases.length; i++) {
    if (picked.includes(i)) continue;
    if (minD[i] > far) { far = minD[i]; arg = i; }
  }
  if (arg === -1) break;
  picked.push(arg);
  for (let i = 0; i < cases.length; i++) minD[i] = Math.min(minD[i], dist(cases[i], cases[arg]));
}

// ---- crop + encode ---------------------------------------------------------
function crc32(buf: Buffer): number {
  let c, table = (crc32 as any)._t;
  if (!table) {
    table = (crc32 as any)._t = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c;
    }
  }
  let crc = -1;
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  return (crc ^ -1) >>> 0;
}
function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, "latin1"), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
// 8-bit greyscale PNG. Lossless for luma by construction, and half the bytes of
// the RGBA that canvas.toBlob is forced to emit.
function encodeGray(w: number, h: number, px: Buffer): Buffer {
  // Adaptive per-row filtering, chosen by the usual minimum-sum-of-absolute-
  // differences heuristic. Worth doing rather than shipping filter 0: on these
  // frames it is a quarter of the bytes, and the bank is the single largest
  // thing in the notebook.
  const raw = Buffer.alloc((w + 1) * h);
  const prev = Buffer.alloc(w);
  const cand = [Buffer.alloc(w), Buffer.alloc(w), Buffer.alloc(w), Buffer.alloc(w)];
  const paeth = (a: number, b: number, c: number) => {
    const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
    return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
  };
  for (let y = 0; y < h; y++) {
    const line = px.subarray(y * w, y * w + w);
    let sum0 = 0, sum1 = 0, sum2 = 0, sum4 = 0;
    for (let i = 0; i < w; i++) {
      const v = line[i], a = i ? line[i - 1] : 0, b = prev[i], c = i ? prev[i - 1] : 0;
      cand[0][i] = v;
      cand[1][i] = (v - a) & 255;
      cand[2][i] = (v - b) & 255;
      cand[3][i] = (v - paeth(a, b, c)) & 255;
      sum0 += v;
      sum1 += Math.min(cand[1][i], 256 - cand[1][i]);
      sum2 += Math.min(cand[2][i], 256 - cand[2][i]);
      sum4 += Math.min(cand[3][i], 256 - cand[3][i]);
    }
    const sums = [sum0, sum1, sum2, sum4];
    let k = 0;
    for (let i = 1; i < 4; i++) if (sums[i] < sums[k]) k = i;
    raw[y * (w + 1)] = [0, 1, 2, 4][k];
    cand[k].copy(raw, y * (w + 1) + 1);
    line.copy(prev);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 0; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const spec: any[] = [];
let total = 0;
console.log(`picked ${picked.length} of ${cases.length}:`);
for (const idx of picked) {
  const c = cases[idx];
  const t = c.meta.truth ?? [];
  const rs = t.map((m: any) => m.radiusPx).filter((r: number) => r > 0).sort((a: number, b: number) => a - b);
  const r = rs.length ? rs[rs.length >> 1] : 60;
  const pad = MARGIN * r;
  const x0 = CROP ? Math.max(0, Math.floor(Math.min(...t.map((m: any) => m.x)) - pad)) : 0;
  const y0 = CROP ? Math.max(0, Math.floor(Math.min(...t.map((m: any) => m.y)) - pad)) : 0;
  const x1 = CROP ? Math.min(c.w, Math.ceil(Math.max(...t.map((m: any) => m.x)) + pad)) : c.w;
  const y1 = CROP ? Math.min(c.h, Math.ceil(Math.max(...t.map((m: any) => m.y)) + pad)) : c.h;
  const cw = x1 - x0, ch = y1 - y0;
  let out = c.gray;
  if (CROP) {
    out = Buffer.alloc(cw * ch);
    for (let y = 0; y < ch; y++) c.gray.copy(out, y * cw, (y0 + y) * c.w + x0, (y0 + y) * c.w + x0 + cw);
  }
  const png = encodeGray(cw, ch, out);
  const file = `hexframe-${spec.length + 1}.png`;
  writeFileSync(resolve(OUT, file), png);
  total += png.length;
  const cap = c.meta.capture ?? {};
  spec.push({
    file, name: c.name, w: cw, h: ch, from: { w: c.w, h: c.h, x: x0, y: y0 },
    // truth follows the crop, or the bank grades against the wrong pixels
    truth: t.map((m: any) => ({ ...m, x: +(m.x - x0).toFixed(1), y: +(m.y - y0).toFixed(1) })),
    capture: { read: cap.counts?.read ?? null, distanceMm: cap.distanceMm ?? null,
               tiltDeg: cap.tiltDeg ?? null, mmPerPx: cap.mmPerPx ?? null },
    cfg: c.meta.cfg ?? null,
  });
  console.log(`  ${file.padEnd(30)} ${String(c.w + "x" + c.h).padStart(9)} -> ${String(cw + "x" + ch).padStart(9)}  ` +
              `${(png.length / 1024).toFixed(0).padStart(4)}KB  read ${cap.counts?.read ?? "?"}/7` +
              `${cap.distanceMm ? `  ${cap.distanceMm}mm ${cap.tiltDeg}deg` : ""}`);
}
writeFileSync(resolve(OUT, "hexframes.json"), JSON.stringify(spec, null, 1));
console.log(`\n${(total / 1024 / 1024).toFixed(2)} MB of greyscale PNG -> ${OUT}`);

// How alike are the picks? A bank whose closest pair is much tighter than the
// rest has a duplicate in it, and that is the exact thing this exists to stop.
let worst = Infinity, worstPair = "";
for (let i = 0; i < picked.length; i++)
  for (let j = i + 1; j < picked.length; j++) {
    const d = dist(cases[picked[i]], cases[picked[j]]);
    if (d < worst) { worst = d; worstPair = `${cases[picked[i]].name} / ${cases[picked[j]].name}`; }
  }
console.log(`closest pair in the bank: ${worstPair} at ${worst.toFixed(2)}` +
            `  (median distance among ALL cases ${(() => {
              const ds: number[] = [];
              for (let i = 0; i < cases.length; i++)
                for (let j = i + 1; j < cases.length; j++) ds.push(dist(cases[i], cases[j]));
              ds.sort((a, b) => a - b);
              return ds[ds.length >> 1].toFixed(2);
            })()})`);

// ---- --install: put the picks into the notebook ----------------------------
// Attachments are just <script type="text/plain"> blocks keyed <module>/<name>,
// so installing is textual. Re-running is safe: every hexframe-* block this
// tool owns is removed first, which is what makes "collect more data, re-run"
// the whole update procedure.
const installAt = process.argv.indexOf("--install");
if (installAt !== -1) {
  const nb = resolve(process.argv[installAt + 1]);
  const MODULE = "@tomlarkworthy/coded-landmark-tracking";
  let html = readFileSync(nb, "utf8");
  const before = html.length;

  const owned = new RegExp(
    `<script id="${MODULE}/hexframes?-?[^"]*"[\\s\\S]*?</script>\\n?`, "g");
  const dropped = (html.match(owned) ?? []).length;
  html = html.replace(owned, "");

  const assets = [...readdirSync(OUT).filter((f) => f.endsWith(".png")).sort(
      (a, b) => Number(a.match(/\d+/)![0]) - Number(b.match(/\d+/)![0])), "hexframes.json"];
  const blocks = assets.map((f) => {
    const b64 = readFileSync(resolve(OUT, f)).toString("base64");
    const mime = f.endsWith(".json") ? "application/json" : "image/png";
    return `<script id="${MODULE}/${f}" \n  type="text/plain"\n  data-encoding="base64"\n  data-mime="${mime}"\n>\n${b64}\n</script>\n`;
  });

  // insert after the module's last existing attachment block
  const anchor = html.lastIndexOf(`<script id="${MODULE}/`);
  if (anchor === -1) throw new Error(`no ${MODULE} attachment block to anchor to`);
  const end = html.indexOf("</script>", anchor) + "</script>\n".length;
  html = html.slice(0, end) + blocks.join("") + html.slice(end);

  // the define() footer lists the names it will resolve; a file not named there
  // is unreachable no matter that its bytes are present
  const marker = `const module_name = "${MODULE}";`;
  const mi = html.indexOf(marker);
  if (mi === -1) throw new Error("could not find the module's fileAttachments map");
  const mapStart = html.lastIndexOf("new Map([", mi);
  const mapEnd = html.indexOf("]", mapStart);
  const existing: string[] = JSON.parse("[" + html.slice(mapStart + "new Map([".length, mapEnd) + "]");
  const names = [...existing.filter((n) => !n.startsWith("hexframe")), ...assets];
  html = html.slice(0, mapStart + "new Map([".length) + names.map((n) => JSON.stringify(n)).join(",") +
         html.slice(mapEnd);

  // testFrameFiles names each slot in a literal FileAttachment() call -- the
  // runtime will not accept a computed name -- so the slot COUNT is source code
  // and changing --n is a code edit. Doing it here keeps the two in step; a bank
  // of 16 with a cell listing 8 loses half the frames silently.
  const slots = assets.filter((f) => f.endsWith(".png"));
  const slotRe = /(?: *\["hexframe-\d+\.png", FileAttachment\("hexframe-\d+\.png"\)\],\n)+/;
  if (!slotRe.test(html)) throw new Error("could not find testFrameFiles' hexframe slot lines");
  html = html.replace(slotRe,
    slots.map((f) => `  [${JSON.stringify(f)}, FileAttachment(${JSON.stringify(f)})],\n`).join(""));

  writeFileSync(nb, html);
  console.log(`\ninstalled ${blocks.length} frame(s) into ${basename(nb)} (removed ${dropped} stale)`);
  console.log(`  fileAttachments now: ${names.join(", ")}`);
  console.log(`  ${(before / 1048576).toFixed(2)} MB -> ${(html.length / 1048576).toFixed(2)} MB`);
}
