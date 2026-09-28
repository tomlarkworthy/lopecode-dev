// rc5-train eval (20260928-0847-w12): a Plot bar chart with a button that downloads the chart as a PNG.
// rc5t-sketch-png-download covers a <canvas> drawing; here the chart is an SVG (Plot.plot), so the PNG
// has to be rasterised through an <img> and a canvas. Failure modes this reaches, none of which a write
// result reports: the SVG text saved under a .png name, a canvas drawn before the <img> loaded (a blank
// PNG), a transparent background, a revoked or never-set href (no file).
// setup.collect clicks the download control of every module created during the turn, intercepts the
// offered file (an <a download> clicked in or out of the document, including DOM.download's second
// click), decodes it and checks it is a real, opaque PNG whose bars are in the order of the data.
// Plot sorts band categories alphabetically (Apr, Feb, Jan, Mar); the trace's chart and PNG came out that way.
// The data is in the question, so bars are measured: the longest ink run per column (or per row, for a
// horizontal chart) groups into 4 bars and their lengths must rank like 120, 95, 140, 160.

const INIT = String.raw`(() => {
  const rt = [...globalThis.__ojs_runtime.mains.values()].find(m => m && m._runtime)._runtime;
  globalThis.__rc5tBefore = new Set([...rt._variables].map(v => v._module));
})()`;

const COLLECT = String.raw`(async () => {
  const rt = [...globalThis.__ojs_runtime.mains.values()].find(m => m && m._runtime)._runtime;
  const isUser = v => !globalThis.__rc5tBefore.has(v._module) && v._type === 1 && v._name && !String(v._name).startsWith("module ") && v._name !== "@variable";
  const users = () => [...rt._variables].filter(isUser);
  const out = { downloads: false, isPng: false, opaque: false, bars: false, order: false, why: [] };
  if (!users().length) { out.why.push("no module was created"); return out; }
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const keepers = [];
  for (const v of users()) { try { keepers.push(v._module.variable(true).define([v._name], x => x)); } catch {} }
  const els = () => users().map(v => v._value).filter(x => x instanceof Element);
  const all = sel => els().flatMap(x => [...(x.matches(sel) ? [x] : []), ...x.querySelectorAll(sel)]);
  const host = document.createElement("div");
  host.style.cssText = "position:fixed;left:0;top:0;z-index:99999;background:#fff";
  document.body.appendChild(host);
  const mount = () => { for (const x of els()) if (!x.isConnected) host.appendChild(x); };
  // capture offered files; the blob is fetched at click time because a handler may revoke the URL right after
  const files = [];
  const record = a => {
    if (!(a && a.hasAttribute && a.hasAttribute("download") && a.href)) return;
    const f = { href: a.href, name: a.download || a.getAttribute("download") };
    f.blob = fetch(a.href).then(r => r.blob()).catch(e => { f.err = String(e); return null; });
    files.push(f);
  };
  const origClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () { record(this); };
  const onDocClick = e => { const a = e.composedPath().find(n => n instanceof HTMLAnchorElement && n.hasAttribute("download")); if (a) { e.preventDefault(); record(a); } };
  document.addEventListener("click", onDocClick, true);
  const label = b => (b.textContent || b.value || b.title || b.getAttribute("aria-label") || "").trim();
  const controls = () => [...all("button"), ...all("a[download]"), ...all("input[type=button]")];
  const dlBtn = () => controls().find(b => /download|png|save|export/i.test(label(b)));
  const download = async () => {
    const n = files.length;
    for (let k = 0; k < 2 && files.length === n; k++) {
      const b = dlBtn(); if (!b) return null;
      b.click();
      for (let t = 0; t < 30 && files.length === n; t++) await sleep(100);
    }
    return files.length > n ? files[files.length - 1] : null;
  };
  try {
    await sleep(800);
    mount();
    if (!dlBtn()) { out.why.push("no download control (controls: " + JSON.stringify(controls().map(label).map(s => s.slice(0, 30))) + ")"); return out; }
    const f = await download();
    out.downloads = !!f;
    if (!f) { out.why.push("clicking " + JSON.stringify(label(dlBtn())) + " offered no file"); return out; }
    const blob = await f.blob;
    if (!blob) { out.downloads = false; out.why.push("the offered href could not be read: " + f.err); return out; }
    const head = new Uint8Array(await blob.slice(0, 8).arrayBuffer());
    const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((b, i) => head[i] === b);
    out.isPng = sig && /\.png$/i.test(f.name || "");
    if (!out.isPng) out.why.push("file " + JSON.stringify(f.name) + " type " + JSON.stringify(blob.type) + " png signature " + sig);
    let bmp = null; try { bmp = await createImageBitmap(blob); } catch {}
    if (!bmp) { out.why.push("file did not decode as an image"); return out; }
    const W = bmp.width, H = bmp.height;
    const c = document.createElement("canvas"); c.width = W; c.height = H;
    const ctx = c.getContext("2d"); ctx.drawImage(bmp, 0, 0);
    const d = ctx.getImageData(0, 0, W, H).data;
    const px = (x, y) => { const i = (y * W + x) * 4; return [d[i], d[i + 1], d[i + 2], d[i + 3]]; };
    const corners = [px(1, 1), px(W - 2, 1), px(1, H - 2), px(W - 2, H - 2)];
    out.opaque = corners.every(p => p[3] === 255);
    if (!out.opaque) out.why.push("PNG corner pixels " + JSON.stringify(corners) + " (transparent: dark in a dark viewer)");
    const bg = corners[0];
    const ink = (x, y) => { const p = px(x, y); if (p[3] < 40) return false; return Math.abs(p[0] - bg[0]) + Math.abs(p[1] - bg[1]) + Math.abs(p[2] - bg[2]) > 60 || bg[3] < 40; };
    // longest ink run along each line; bars are the wide groups of long runs
    const measure = vertical => {
      const n = vertical ? W : H, m = vertical ? H : W;
      const runs = [];
      for (let i = 0; i < n; i++) { let best = 0, cur = 0; for (let j = 0; j < m; j++) { if (vertical ? ink(i, j) : ink(j, i)) { cur++; if (cur > best) best = cur; } else cur = 0; } runs.push(best); }
      const min = m * 0.12, groups = [];
      let g = null;
      for (let i = 0; i < n; i++) {
        if (runs[i] >= min) { if (!g) { g = { from: i, len: 0 }; groups.push(g); } g.to = i; g.len = Math.max(g.len, runs[i]); }
        else g = null;
      }
      return groups.filter(x => x.to - x.from + 1 >= n * 0.03);
    };
    let groups = measure(true);
    if (groups.length !== 4) { const h = measure(false); if (h.length === 4) groups = h; }
    out.bars = groups.length === 4;
    if (!out.bars) { out.why.push(W + "x" + H + " PNG: found " + groups.length + " bars, want 4 (blank or not the chart)"); return out; }
    const L = groups.map(x => x.len), want = [120, 95, 140, 160];
    const rank = a => a.map(v => a.filter(w => w < v).length).join();
    out.order = rank(L) === rank(want);
    if (!out.order) out.why.push("bar lengths " + JSON.stringify(L) + " do not rank like " + JSON.stringify(want));
    return out;
  } finally {
    HTMLAnchorElement.prototype.click = origClick;
    document.removeEventListener("click", onDocClick, true);
    for (const k of keepers) { try { k.delete(); } catch {} }
    host.remove();
  }
})()`;

// SVG -> <img> -> canvas: no corpus cell rasterises an SVG; the serialisation is
// @tomlarkworthy/corepox._artSheet (lopebooks/notebooks/corepox.html), the click-time toBlob + <a download>
// is @tomlarkworthy/suminagashi._download (lopebooks/notebooks/@tomlarkworthy_suminagashi.html).
export const SOLUTION = `const _intro = function intro(md){return( md\`# Bar chart\` )};
const _rows = function rows(){return( [{k: "Jan", v: 120}, {k: "Feb", v: 95}, {k: "Mar", v: 140}, {k: "Apr", v: 160}] )};
const _chart = function chart(Plot, rows){return( Plot.plot({width: 480, height: 300, x: {domain: rows.map(d => d.k)}, marks: [Plot.barY(rows, {x: "k", y: "v", fill: "steelblue"}), Plot.ruleY([0])]}) )};
const _save = function save(htl, chart){return(
  htl.html\`<button onclick=\${() => {
    const svg = chart instanceof SVGSVGElement ? chart : chart.querySelector("svg");
    const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)], {type: "image/svg+xml"}));
    const img = new Image();
    img.onload = () => {
      const w = svg.width.baseVal.value, h = svg.height.baseVal.value;
      const canvas = document.createElement("canvas");
      canvas.width = w * 2; canvas.height = h * 2;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob(blob => {
        const link = htl.html\`<a download="chart.png" href=\${URL.createObjectURL(blob)}>\`;
        link.click();
        setTimeout(() => URL.revokeObjectURL(link.href), 1000);
      }, "image/png");
    };
    img.src = url;
  }}>Download PNG</button>\`
)};
export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;
  $def("_intro", "intro", ["md"], _intro);
  $def("_rows", "rows", [], _rows);
  $def("_chart", "chart", ["Plot", "rows"], _chart);
  $def("_save", "save", ["htl", "chart"], _save);
  return main;
}
`;

export const criteria = [
  { name: "collected_equals", args: { key: "downloads", equals: true }, weight: 2 },
  { name: "collected_equals", args: { key: "isPng", equals: true }, weight: 2 },
  { name: "collected_equals", args: { key: "opaque", equals: true }, weight: 1 },
  { name: "collected_equals", args: { key: "bars", equals: true }, weight: 2 },
  { name: "collected_equals", args: { key: "order", equals: true }, weight: 1 },
];

export default {
  id: "rc5t-chart-png-download",
  category: "rc5-train",
  question: "Here is some sales data: month,sales / Jan,120 / Feb,95 / Mar,140 / Apr,160. Show it as a bar chart and give me a button to download the chart as a PNG.",
  setup: { init: INIT, collect: COLLECT },
  criteria,
  oracle: [
    { tool: "write_file", args: { file_path: "/src/@user/bar-chart.js", content: SOLUTION }, settleMs: 1500 },
  ],
};
