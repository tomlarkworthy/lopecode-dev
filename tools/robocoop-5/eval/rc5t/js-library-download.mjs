// rc5-train eval (20260929-0620-m65): "Turn the functions in my module into a JavaScript library I can
// download: an ES module file with a package.json and a README."
// setup.files seeds @user/edge-kit. Its four function cells are copied unmodified from
// @tomlarkworthy/fast-1d-circular-barcode-matching (lopebooks/notebooks/
// @tomlarkworthy_fast-1d-circular-barcode-matching.html, lopebooks f7c4ae35): clamp, gaussianKernel1D,
// canny (depends on gaussianKernel1D and clamp) and edges1D. Seeded where the original lacks them: a
// constant cell EDGE_THRESHOLD = 6 that edges1D uses as its default threshold (the original hard-codes
// `thr = 6`), and notebook-only cells beside them: an md intro, a `viewof sigma` slider and an md demo.
//
// setup.collect acts as the user. It computes PROBE (fixed inputs) on the live cells, finds a download
// control in @user/edge-kit or any module created during the turn, clicks every such control, catches
// each offered file (<a download>, in or out of the document) and unzips a .zip. Then it edits the
// gaussianKernel1D cell (kernel half-width 3σ -> 2σ, as an edit in the editor does), recomputes PROBE
// and downloads again. The criterion collected_node_check (tools/robocoop-4/eval/live/criteria.mjs) writes each download's
// files to a temp dir and runs NODE_CHECK in node:
//   downloads   - one click yields a zip, or two or more files, including a .js
//   packageJson - package.json parses, has an npm-valid name, a semver version, type "module", and
//                 main or exports resolving to a .js file in the download
//   nodeImport  - node imports that file with no error (a reference to md, Inputs, FileAttachment,
//                 html or another notebook builtin at module level throws here)
//   matchesLive - the exports clamp, gaussianKernel1D, canny, edges1D (named, or on the default export)
//                 return what the live cells return on PROBE, canny and edges1D included, so the
//                 inter-cell dependencies and EDGE_THRESHOLD came along
//   readme      - a README names all four functions
//   tracksEdits - the second download, after the edit, returns the edited cells' results. A library
//                 assembled from a pasted copy of the cells passes every other check and fails this one.
// Any correct build passes: the control can be in the fixture or a new module, one zip or several
// files, source taken from the function values or from the cells' definitions.

const FIX = "@user/edge-kit";

const FIXTURE = "const _intro = function _intro(md){return(\nmd`# Edge kit\n\nEdge detection helpers for the circular barcode scanner: a Gaussian blur kernel, a Canny edge detector for greyscale images, and a 1-D edge finder for a single scan line.`\n)};\nconst _EDGE_THRESHOLD = function _EDGE_THRESHOLD(){return(\n6\n)};\nconst _clamp = function _clamp(){return(\nfunction clamp(v, lo, hi) {\n  return v < lo ? lo : v > hi ? hi : v;\n}\n)};\nconst _gaussianKernel1D = function _gaussianKernel1D(){return(\nfunction gaussianKernel1D(sigma) {\n  const s = Math.max(0.3, sigma);\n  const half = Math.max(1, Math.round(s * 3));\n  const size = 2 * half + 1;\n  const data = new Float32Array(size);\n  const a = 1 / (Math.sqrt(2 * Math.PI) * s);\n  const twoSigma2 = 2 * s * s;\n  let sum = 0;\n  for (let i = -half; i <= half; i++) {\n    const v = a * Math.exp(-(i * i) / twoSigma2);\n    data[i + half] = v;\n    sum += v;\n  }\n  for (let i = 0; i < size; i++) data[i] /= sum;\n  return { data, half };\n}\n)};\nconst _canny = function _canny(gaussianKernel1D,clamp){return(\nfunction canny(src, w, opts = {}) {\n  const { sigma = 1.0, low = 20, high = 60 } = opts;\n  if (!Number.isInteger(w) || w <= 0)\n    throw new Error(\"w must be positive integer\");\n  const h = (src.length / w) | 0;\n  if (w * h !== src.length) throw new Error(\"buffer length not divisible by w\");\n\n  // 1) Gaussian blur, separable\n  const k = gaussianKernel1D(sigma);\n  const tmp = new Float32Array(w * h);\n  const blur = new Float32Array(w * h);\n\n  // horizontal\n  for (let y = 0; y < h; y++) {\n    const base = y * w;\n    for (let x = 0; x < w; x++) {\n      let acc = 0;\n      for (let i = -k.half; i <= k.half; i++) {\n        const xx = clamp(x + i, 0, w - 1);\n        acc += k.data[i + k.half] * src[base + xx];\n      }\n      tmp[base + x] = acc;\n    }\n  }\n  // vertical\n  for (let x = 0; x < w; x++) {\n    for (let y = 0; y < h; y++) {\n      let acc = 0;\n      for (let i = -k.half; i <= k.half; i++) {\n        const yy = clamp(y + i, 0, h - 1);\n        acc += k.data[i + k.half] * tmp[yy * w + x];\n      }\n      blur[y * w + x] = acc;\n    }\n  }\n\n  // 2) Sobel gradients\n  const gx = new Float32Array(w * h);\n  const gy = new Float32Array(w * h);\n  for (let y = 0; y < h; y++) {\n    const ym1 = Math.max(0, y - 1),\n      yp1 = Math.min(h - 1, y + 1);\n    for (let x = 0; x < w; x++) {\n      const xm1 = Math.max(0, x - 1),\n        xp1 = Math.min(w - 1, x + 1);\n      const a = blur[ym1 * w + xm1],\n        b = blur[ym1 * w + x],\n        c = blur[ym1 * w + xp1];\n      const d = blur[y * w + xm1],\n        /* e = blur[y*w + x] */ f = blur[y * w + xp1];\n      const g = blur[yp1 * w + xm1],\n        hh = blur[yp1 * w + x],\n        i = blur[yp1 * w + xp1];\n      gx[y * w + x] = c + 2 * f + i - (a + 2 * d + g);\n      gy[y * w + x] = g + 2 * hh + i - (a + 2 * b + c);\n    }\n  }\n\n  // gradient magnitude (L2), scaled to 0..255 for thresholding\n  const mag = new Float32Array(w * h);\n  let maxMag = 0;\n  for (let idx = 0; idx < mag.length; idx++) {\n    const m = Math.hypot(gx[idx], gy[idx]);\n    mag[idx] = m;\n    if (m > maxMag) maxMag = m;\n  }\n  const scale = maxMag > 0 ? 255 / maxMag : 0;\n\n  // 3) Non-maximum suppression along quantized directions (0,45,90,135)\n  const thin = new Uint8Array(w * h); // holds scaled magnitude at local maxima\n  for (let y = 1; y < h - 1; y++) {\n    for (let x = 1; x < w - 1; x++) {\n      const idx = y * w + x;\n      const gxx = gx[idx],\n        gyy = gy[idx];\n      const m = mag[idx] * scale;\n\n      // direction sector\n      const angle = Math.atan2(gyy, gxx) * (180 / Math.PI);\n      const a = angle < 0 ? angle + 180 : angle;\n      let n1 = 0,\n        n2 = 0;\n      if ((a >= 0 && a < 22.5) || (a >= 157.5 && a < 180)) {\n        n1 = mag[idx - 1] * scale;\n        n2 = mag[idx + 1] * scale; // horizontal\n      } else if (a >= 22.5 && a < 67.5) {\n        n1 = mag[idx - w - 1] * scale;\n        n2 = mag[idx + w + 1] * scale; // 45°\n      } else if (a >= 67.5 && a < 112.5) {\n        n1 = mag[idx - w] * scale;\n        n2 = mag[idx + w] * scale; // vertical\n      } else {\n        // 112.5..157.5\n        n1 = mag[idx - w + 1] * scale;\n        n2 = mag[idx + w - 1] * scale; // 135°\n      }\n      thin[idx] = m >= n1 && m >= n2 ? m | 0 : 0;\n    }\n  }\n\n  // 4) Hysteresis thresholding via stack flood fill\n  const STRONG = 255;\n  const WEAK = 128;\n  const out = new Uint8Array(w * h);\n  const stack = new Int32Array(w * h);\n  let sp = 0;\n\n  for (let i = 0; i < thin.length; i++) {\n    const v = thin[i];\n    if (v >= high) {\n      out[i] = STRONG;\n      stack[sp++] = i;\n    } else if (v >= low) {\n      out[i] = WEAK;\n    }\n  }\n\n  // promote weak connected to strong (8-connectivity)\n  while (sp > 0) {\n    const idx = stack[--sp];\n    const y = (idx / w) | 0,\n      x = idx % w;\n    for (let dy = -1; dy <= 1; dy++) {\n      for (let dx = -1; dx <= 1; dx++) {\n        if (dx === 0 && dy === 0) continue;\n        const xx = x + dx,\n          yy = y + dy;\n        if (xx < 0 || xx >= w || yy < 0 || yy >= h) continue;\n        const j = yy * w + xx;\n        if (out[j] === WEAK) {\n          out[j] = STRONG;\n          stack[sp++] = j;\n        }\n      }\n    }\n  }\n\n  // suppress remaining weak\n  for (let i = 0; i < out.length; i++) out[i] = out[i] === STRONG ? 255 : 0;\n  return out;\n}\n)};\nconst _edges1D = function _edges1D(EDGE_THRESHOLD){return(\nfunction edges1D(sig, thr = EDGE_THRESHOLD) {\n  const n = sig.length;\n  const d = new Float32Array(n);\n  for (let i = 1; i < n; i++) d[i] = sig[i] - sig[i - 1];\n  const idx = [];\n  for (let i = 2; i < n - 2; i++) {\n    const v = d[i];\n    if (Math.abs(v) < thr) continue;\n    if (\n      (v > 0 && d[i] >= d[i - 1] && d[i] >= d[i + 1]) ||\n      (v < 0 && d[i] <= d[i - 1] && d[i] <= d[i + 1])\n    ) {\n      idx.push({ x: i, s: Math.sign(v) });\n    }\n  }\n  return idx;\n}\n)};\nconst _sigma = function _sigma(Inputs){return(\nInputs.range([0.5, 3], {value: 1.2, step: 0.1, label: \"Blur sigma\"})\n)};\nconst _testImage = function _testImage(){return(\n(() => { const img = new Uint8Array(16 * 16); for (let y = 4; y < 12; y++) for (let x = 4; x < 12; x++) img[y * 16 + x] = 200; return img; })()\n)};\nconst _demo = function _demo(md,canny,testImage,sigma){return(\nmd`A 16×16 test square has ${canny(testImage, 16, {sigma}).filter(v => v).length} edge pixels at sigma ${sigma}.`\n)};\nexport default function define(runtime, observer) {\n  const main = runtime.module();\n  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;\n  $def(\"_intro\", \"intro\", [\"md\"], _intro);\n  $def(\"_EDGE_THRESHOLD\", \"EDGE_THRESHOLD\", [], _EDGE_THRESHOLD);\n  $def(\"_clamp\", \"clamp\", [], _clamp);\n  $def(\"_gaussianKernel1D\", \"gaussianKernel1D\", [], _gaussianKernel1D);\n  $def(\"_canny\", \"canny\", [\"gaussianKernel1D\", \"clamp\"], _canny);\n  $def(\"_edges1D\", \"edges1D\", [\"EDGE_THRESHOLD\"], _edges1D);\n  $def(\"_sigma\", \"viewof sigma\", [\"Inputs\"], _sigma);\n  main.variable(observer(\"sigma\")).define(\"sigma\", [\"Generators\", \"viewof sigma\"], (G, v) => G.input(v));\n  $def(\"_testImage\", \"testImage\", [], _testImage);\n  $def(\"_demo\", \"demo\", [\"md\", \"canny\", \"testImage\", \"sigma\"], _demo);\n  return main;\n}\n";

// Evaluated both on the live cells (page) and on the downloaded library's exports (node).
const PROBE = String.raw`(f) => {
  const img = new Uint8Array(16 * 16);
  for (let y = 4; y < 12; y++) for (let x = 4; x < 12; x++) img[y * 16 + x] = 200;
  const k = f.gaussianKernel1D(1.2);
  const sig = [0, 0, 0, 0, 10, 30, 30, 30, 30, 5, 0, 0, 0, 40, 40, 40, 0, 0, 0, 0];
  return {
    clamp: [f.clamp(5, 0, 3), f.clamp(-1, 0, 3), f.clamp(2, 0, 3)],
    kernel: { half: k.half, data: Array.from(k.data) },
    canny: Array.from(f.canny(img, 16, { sigma: 1.2 })),
    edges: f.edges1D(sig).map(e => [e.x, e.s]),
    edgesThr: f.edges1D(sig, 25).map(e => [e.x, e.s]),
  };
}`;

const INIT = String.raw`(() => {
  const rt = [...globalThis.__ojs_runtime.mains.values()].find(m => m && m._runtime)._runtime;
  globalThis.__rc5tBefore = new Set([...rt._variables].map(v => v._module));
})()`;

const COLLECT = String.raw`(async () => {
  const FIX = "@user/edge-kit";
  const PROBE = new Function("return " + ${JSON.stringify(PROBE)})();
  const mains = globalThis.__ojs_runtime.mains;
  const rt = [...mains.values()].find(m => m && m._runtime)._runtime;
  const fixMod = mains.get(FIX);
  const out = { why: [], downloads: [], expected: [] };
  if (!fixMod) { out.why.push(FIX + " is not loaded"); return out; }
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const NAMES = ["clamp", "gaussianKernel1D", "canny", "edges1D"];
  const live = async () => { const f = {}; for (const n of NAMES) f[n] = await fixMod.value(n); return PROBE(f); };
  const isUser = v => (v._module === fixMod || !globalThis.__rc5tBefore.has(v._module)) && v._type === 1 && v._name && !String(v._name).startsWith("module ") && v._name !== "@variable";
  const users = () => [...rt._variables].filter(isUser);
  const keepers = [];
  for (const v of users()) { try { keepers.push(v._module.variable(true).define([v._name], x => x)); } catch {} }
  const els = () => users().map(v => v._value).filter(x => x instanceof Element);
  const all = sel => els().flatMap(x => [...(x.matches(sel) ? [x] : []), ...x.querySelectorAll(sel)]);
  const host = document.createElement("div");
  host.style.cssText = "position:fixed;left:0;top:0;z-index:99999;background:#fff";
  document.body.appendChild(host);
  const files = [];
  const record = a => {
    if (!(a && a.hasAttribute && a.hasAttribute("download") && a.href)) return;
    const f = { href: a.href, name: a.download || a.getAttribute("download") || "download" };
    f.bytes = fetch(a.href).then(r => r.arrayBuffer()).then(b => new Uint8Array(b)).catch(e => { f.err = String(e); return null; });
    files.push(f);
  };
  const origClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () { record(this); };
  const onDocClick = e => { const a = e.composedPath().find(n => n instanceof HTMLAnchorElement && n.hasAttribute("download")); if (a) { e.preventDefault(); record(a); } };
  document.addEventListener("click", onDocClick, true);
  const unzip = async bytes => {
    const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let eocd = -1;
    for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    if (eocd < 0) return null;
    const count = dv.getUint16(eocd + 10, true);
    let p = dv.getUint32(eocd + 16, true);
    const res = [];
    for (let k = 0; k < count; k++) {
      if (dv.getUint32(p, true) !== 0x02014b50) break;
      const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true);
      const nlen = dv.getUint16(p + 28, true), xlen = dv.getUint16(p + 30, true), clen = dv.getUint16(p + 32, true);
      const local = dv.getUint32(p + 42, true);
      const name = new TextDecoder().decode(bytes.subarray(p + 46, p + 46 + nlen));
      p += 46 + nlen + xlen + clen;
      if (name.endsWith("/")) continue;
      const start = local + 30 + dv.getUint16(local + 26, true) + dv.getUint16(local + 28, true);
      const raw = bytes.subarray(start, start + csize);
      let text = null;
      if (method === 0) text = new TextDecoder().decode(raw);
      if (method === 8) text = new TextDecoder().decode(await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).arrayBuffer());
      res.push({ path: name, text });
    }
    return res;
  };
  const label = b => (b.textContent || b.value || b.title || b.getAttribute("aria-label") || b.getAttribute("download") || "").trim();
  const controls = () => [...all("button"), ...all("a[download]"), ...all("input[type=button]")];
  const dlBtns = () => controls().filter(b => /download|export|zip|package|library|bundle|save|\.js\b|readme/i.test(label(b)) || b.matches("a[download]"));
  const download = async () => {
    const n = files.length;
    for (let k = 0; k < 2 && files.length === n; k++) {
      for (const x of els()) if (!x.isConnected) host.appendChild(x);
      const bs = dlBtns(); if (!bs.length) return null;
      for (const b of bs) { b.click(); await sleep(50); }
      let seen = files.length;
      for (let t = 0; t < 40; t++) { await sleep(100); if (files.length > n && files.length === seen && t > 10) break; seen = files.length; }
    }
    const got = files.slice(n);
    if (!got.length) return null;
    const outFiles = [];
    for (const f of got) {
      const bytes = await f.bytes;
      if (!bytes) { out.why.push("could not read " + f.name + ": " + f.err); continue; }
      const isZip = bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 3 && bytes[3] === 4;
      if (isZip) { const z = await unzip(bytes); if (z) { outFiles.push(...z.map(e => ({ ...e, zip: f.name }))); continue; } }
      outFiles.push({ path: f.name.split("/").pop(), text: new TextDecoder().decode(bytes) });
    }
    return { offered: got.map(f => f.name), files: outFiles };
  };
  try {
    await sleep(800);
    out.expected.push(await live());
    for (const x of els()) if (!x.isConnected) host.appendChild(x);
    if (!dlBtns().length) { out.why.push("no download control (controls: " + JSON.stringify(controls().map(label).map(s => s.slice(0, 30))) + ")"); return out; }
    const d1 = await download();
    if (!d1) { out.why.push("clicking " + JSON.stringify(dlBtns().map(label)) + " offered no file"); return out; }
    out.downloads.push(d1);
    // the user edits a function cell after the turn; a new download must carry the edit
    const v = [...rt._variables].find(x => x._module === fixMod && x._name === "gaussianKernel1D");
    if (!v) { out.why.push("gaussianKernel1D cell not found in " + FIX); return out; }
    v.define("gaussianKernel1D", [], function _gaussianKernel1D(){return(
function gaussianKernel1D(sigma) {
  const s = Math.max(0.3, sigma);
  const half = Math.max(1, Math.round(s * 2));
  const size = 2 * half + 1;
  const data = new Float32Array(size);
  const a = 1 / (Math.sqrt(2 * Math.PI) * s);
  const twoSigma2 = 2 * s * s;
  let sum = 0;
  for (let i = -half; i <= half; i++) {
    const v = a * Math.exp(-(i * i) / twoSigma2);
    data[i + half] = v;
    sum += v;
  }
  for (let i = 0; i < size; i++) data[i] /= sum;
  return { data, half };
}
)});
    await sleep(1500);
    out.expected.push(await live());
    const d2 = await download();
    if (!d2) { out.why.push("second click offered no file"); return out; }
    out.downloads.push(d2);
    return out;
  } catch (e) {
    out.why.push("collect threw: " + (e && e.message || e));
    return out;
  } finally {
    HTMLAnchorElement.prototype.click = origClick;
    document.removeEventListener("click", onDocClick, true);
    for (const k of keepers) { try { k.delete(); } catch {} }
    host.remove();
  }
})()`;

// Runs in node, cwd = a temp dir holding collected.json. Prints one JSON line of verdicts.
const NODE_CHECK = String.raw`
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname, resolve, posix } from "node:path";
import { pathToFileURL } from "node:url";
const PROBE = new Function("return " + ${JSON.stringify(PROBE)})();
const NAMES = ["clamp", "gaussianKernel1D", "canny", "edges1D"];
const c = JSON.parse(readFileSync("collected.json", "utf8"));
const r = { downloads: false, packageJson: false, nodeImport: false, matchesLive: false, readme: false, tracksEdits: false, why: [...(c.why || [])] };
const eq = (a, b) => {
  if (typeof a === "number" && typeof b === "number") return Math.abs(a - b) <= 1e-6 * Math.max(1, Math.abs(a));
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((x, i) => eq(x, b[i]));
  if (a && b && typeof a === "object" && typeof b === "object") { const ka = Object.keys(a).sort(), kb = Object.keys(b).sort(); return eq(ka.join(), kb.join()) && ka.every(k => eq(a[k], b[k])); }
  return a === b;
};
const firstDiff = (a, b) => { for (const k of Object.keys(a)) if (!eq(a[k], b?.[k])) return k + ": live " + JSON.stringify(a[k]).slice(0, 80) + " vs library " + JSON.stringify(b?.[k]).slice(0, 80); return ""; };
async function check(k) {
  const d = c.downloads?.[k];
  const res = { downloads: false, packageJson: false, nodeImport: false, matches: false, readme: false };
  if (!d) return res;
  const dir = resolve("d" + k);
  const files = (d.files || []).filter(f => typeof f.text === "string" && !/(^|\/)\.\.(\/|$)/.test(f.path));
  for (const f of files) { const p = join(dir, posix.normalize(f.path).replace(/^\/+/, "")); mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, f.text); }
  const jsFiles = files.filter(f => /\.(m?js)$/.test(f.path));
  res.downloads = (files.length >= 2 || d.files.some(f => f.zip)) && jsFiles.length > 0;
  if (!res.downloads) r.why.push("download " + (k + 1) + ": files " + JSON.stringify(files.map(f => f.path)));
  const pkgFile = files.filter(f => /(^|\/)package\.json$/.test(f.path)).sort((a, b) => a.path.split("/").length - b.path.split("/").length)[0];
  if (!pkgFile) r.why.push("download " + (k + 1) + ": no package.json");
  const root = pkgFile ? join(dir, dirname(pkgFile.path)) : dir;
  let pkg = {};
  try { if (pkgFile) pkg = JSON.parse(pkgFile.text); } catch (e) { r.why.push("package.json does not parse: " + e.message); }
  const ex = pkg.exports;
  const entryRel = typeof ex === "string" ? ex : ex && typeof ex === "object" ? (typeof ex["."] === "string" ? ex["."] : ex["."]?.import || ex["."]?.default || ex.import || ex.default) : pkg.main || pkg.module;
  const entry = typeof entryRel === "string" ? join(root, entryRel) : null;
  const pkgOk = typeof pkg.name === "string" && /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/.test(pkg.name) && typeof pkg.version === "string" && /^\d+\.\d+\.\d+(-[\w.]+)?$/.test(pkg.version) && pkg.type === "module" && !!entry && /\.m?js$/.test(entry) && existsSync(entry);
  res.packageJson = pkgOk;
  if (!pkgOk && pkgFile) r.why.push("package.json " + JSON.stringify({ name: pkg.name, version: pkg.version, type: pkg.type, main: pkg.main, exports: pkg.exports, entryExists: !!entry && existsSync(entry) }));
  const readme = files.find(f => /(^|\/)readme(\.md|\.markdown|\.txt)?$/i.test(f.path));
  res.readme = !!readme && NAMES.every(n => readme.text.includes(n));
  if (!res.readme) r.why.push(readme ? "README misses " + NAMES.filter(n => !readme.text.includes(n)).join(",") : "no README");
  const target = entry && existsSync(entry) ? entry : jsFiles.length ? join(dir, jsFiles[0].path) : null;
  if (!target) return res;
  let mod;
  try { mod = await import(pathToFileURL(target).href + "?k=" + k); res.nodeImport = true; }
  catch (e) { r.why.push("download " + (k + 1) + ": node import of " + target.slice(dir.length) + " threw: " + String(e && e.message || e).slice(0, 200)); return res; }
  const src = NAMES.every(n => typeof mod[n] === "function") ? mod : mod.default && NAMES.every(n => typeof mod.default[n] === "function") ? mod.default : null;
  if (!src) { r.why.push("download " + (k + 1) + ": exports " + JSON.stringify(Object.keys(mod)) + " lack " + NAMES.filter(n => typeof mod[n] !== "function").join(",")); }
  else {
    let got;
    try { got = PROBE(src); } catch (e) { r.why.push("download " + (k + 1) + ": calling the exports threw: " + String(e && e.message || e).slice(0, 200)); }
    if (got) { res.matches = eq(c.expected[k], got); if (!res.matches) r.why.push("download " + (k + 1) + " differs from the live cells: " + firstDiff(c.expected[k], got)); }
  }
  return res;
}
const a = await check(0);
Object.assign(r, { downloads: a.downloads, packageJson: a.packageJson, nodeImport: a.nodeImport, matchesLive: a.matches, readme: a.readme });
if (c.downloads?.length > 1) {
  const b = await check(1);
  const changed = !eq(c.expected[0], c.expected[1]);
  r.tracksEdits = changed && b.matches;
  if (!changed) r.why.push("the edit did not change the live cells' results");
}
console.log(JSON.stringify(r));
`;

// The library source is derived from the function cells' current values, as
// @tomlarkworthy/belief-geometry.workerSource (lopebooks/notebooks/@tomlarkworthy_belief-geometry.html)
// builds a worker program from `beliefKitFactory.toString() + gptFactory.toString()`. The zip is
// @tomlarkworthy/local-change-history._exportFsToZip's JSZip use; the click-time <a download> is
// @tomlarkworthy/suminagashi._download.
export const LIBRARY_MODULE = String.raw`const _library = function _library(EDGE_THRESHOLD,clamp,gaussianKernel1D,canny,edges1D){return(
[
  "export const EDGE_THRESHOLD = " + JSON.stringify(EDGE_THRESHOLD) + ";",
  ...Object.entries({clamp, gaussianKernel1D, canny, edges1D}).map(([name, fn]) => "export const " + name + " = " + fn.toString() + ";")
].join("\n\n") + "\n"
)};
const _pkg = function _pkg(){return(
{name: "edge-kit", version: "1.0.0", type: "module", main: "index.js", exports: "./index.js"}
)};
const _readme = function _readme(){return(
"# edge-kit\n\n` + "```" + String.raw`js\nimport {canny, edges1D} from \"edge-kit\";\n` + "```" + String.raw`\n\n- clamp(v, lo, hi)\n- gaussianKernel1D(sigma)\n- canny(src, w, {sigma, low, high})\n- edges1D(sig, thr = EDGE_THRESHOLD)\n"
)};
const _download = function _download(htl,JSZip,library,pkg,readme){return(
htl.html${"`"}<button onclick=${"$"}{async () => {
  const zip = new JSZip();
  zip.file("edge-kit/index.js", library);
  zip.file("edge-kit/package.json", JSON.stringify(pkg, null, 2));
  zip.file("edge-kit/README.md", readme);
  const link = htl.html${"`"}<a download="edge-kit.zip" href=${"$"}{URL.createObjectURL(await zip.generateAsync({type: "blob"}))}>${"`"};
  link.click();
}}>Download library</button>${"`"}
)};
export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;
  $def("_library", "library", ["EDGE_THRESHOLD", "clamp", "gaussianKernel1D", "canny", "edges1D"], _library);
  $def("_pkg", "pkg", [], _pkg);
  $def("_readme", "readme", [], _readme);
  $def("_download", "download", ["htl", "JSZip", "library", "pkg", "readme"], _download);
  for (const n of ["EDGE_THRESHOLD", "clamp", "gaussianKernel1D", "canny", "edges1D"]) main.define(n, ["module @user/edge-kit", "@variable"], (_, v) => v.import(n, _));
  main.define("module @user/edge-kit", async () => runtime.module((await import("/@user/edge-kit.js?v=4")).default));
  main.define("module @tomlarkworthy/jszip-3-10-1", async () => runtime.module((await import("/@tomlarkworthy/jszip-3-10-1.js?v=4")).default));
  main.define("JSZip", ["module @tomlarkworthy/jszip-3-10-1", "@variable"], (_, v) => v.import("JSZip", _));
  return main;
}
`;

export const criteria = [
  { name: "collected_node_check", args: { script: NODE_CHECK, key: "downloads" }, weight: 2 },
  { name: "collected_node_check", args: { script: NODE_CHECK, key: "packageJson" }, weight: 1 },
  { name: "collected_node_check", args: { script: NODE_CHECK, key: "nodeImport" }, weight: 2 },
  { name: "collected_node_check", args: { script: NODE_CHECK, key: "matchesLive" }, weight: 2 },
  { name: "collected_node_check", args: { script: NODE_CHECK, key: "readme" }, weight: 1 },
  { name: "collected_node_check", args: { script: NODE_CHECK, key: "tracksEdits" }, weight: 2 },
];

export { FIXTURE, NODE_CHECK, PROBE };

export default {
  id: "rc5t-js-library-download",
  category: "rc5-train",
  question: "Turn the functions in my module into a JavaScript library I can download: an ES module file with a package.json and a README.",
  setup: { files: { ["/src/" + FIX + ".js"]: FIXTURE }, init: INIT, collect: COLLECT },
  criteria,
  oracle: [
    { tool: "write_file", args: { file_path: "/src/@user/edge-kit-package.js", content: LIBRARY_MODULE }, settleMs: 3000 },
  ],
};
