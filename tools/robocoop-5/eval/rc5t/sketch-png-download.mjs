// rc5-train eval (20260928-0847-w3): a sketch canvas whose Download PNG button saves what is on screen.
// rc5t-drawing-pad never clicks a download; this one does. setup.collect intercepts every file the page
// offers (an <a download> clicked in or out of the document, including DOM.download's second click),
// decodes the PNG and checks it: PNG bytes and a .png name, the stroke in the picked colour, a second
// download after Clear + a new stroke holds only the new stroke (not a snapshot taken at cell time),
// and an opaque background (the page shows white; a transparent PNG shows dark ink on black in a dark viewer).
// Download handler after @tomlarkworthy/suminagashi._download (lopebooks/notebooks/@tomlarkworthy_suminagashi.html):
// canvas.toBlob -> <a download=… href=objectURL> -> link.click().

const INIT = String.raw`(() => {
  const rt = [...globalThis.__ojs_runtime.mains.values()].find(m => m && m._runtime)._runtime;
  globalThis.__rc5tBefore = new Set([...rt._variables].map(v => v._module));
})()`;

const COLLECT = String.raw`(async () => {
  const rt = [...globalThis.__ojs_runtime.mains.values()].find(m => m && m._runtime)._runtime;
  const isUser = v => !globalThis.__rc5tBefore.has(v._module) && v._type === 1 && v._name && !String(v._name).startsWith("module ") && v._name !== "@variable";
  const users = () => [...rt._variables].filter(isUser);
  const out = { downloads: false, isPng: false, hasStroke: false, colour: false, current: false, opaque: false, why: [] };
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
  const pad = () => { mount(); return all("canvas").sort((a, b) => b.width * b.height - a.width * a.height)[0]; };
  // capture offered files: <a download> clicks (attached or not); stop the browser's own download
  const files = [];
  const record = a => { if (a && a.hasAttribute && a.hasAttribute("download") && a.href) files.push({ href: a.href, name: a.download || a.getAttribute("download") }); };
  const origClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () { record(this); };
  const onDocClick = e => { const a = e.composedPath().find(n => n instanceof HTMLAnchorElement && n.hasAttribute("download")); if (a) { e.preventDefault(); setTimeout(() => record(a), 0); } };
  document.addEventListener("click", onDocClick, true);
  const fire = (t, type, x, y, buttons) => {
    const o = { bubbles: true, cancelable: true, composed: true, clientX: x, clientY: y, button: 0, buttons, pointerId: 1, pointerType: "mouse", isPrimary: true, view: window };
    if (type.startsWith("pointer")) t.dispatchEvent(new PointerEvent(type, o)); else t.dispatchEvent(new MouseEvent(type, o));
  };
  const drag = async (p, pts) => {
    const r = p.getBoundingClientRect();
    const at = ([fx, fy]) => [r.left + fx * r.width, r.top + fy * r.height];
    let [x, y] = at(pts[0]);
    fire(p, "pointerover", x, y, 0); fire(p, "pointerenter", x, y, 0); fire(p, "mouseover", x, y, 0);
    fire(p, "pointerdown", x, y, 1); fire(p, "mousedown", x, y, 1);
    for (let k = 1; k < pts.length; k++) {
      const [x0, y0] = at(pts[k - 1]), [x1, y1] = at(pts[k]);
      for (let s = 1; s <= 24; s++) { x = x0 + (x1 - x0) * s / 24; y = y0 + (y1 - y0) * s / 24; fire(p, "pointermove", x, y, 1); fire(p, "mousemove", x, y, 1); await sleep(3); }
    }
    fire(p, "pointerup", x, y, 0); fire(p, "mouseup", x, y, 0);
    await sleep(150);
  };
  const setInput = (inp, value) => {
    const set = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(inp), "value").set; set.call(inp, value);
    inp.dispatchEvent(new Event("input", { bubbles: true })); inp.dispatchEvent(new Event("change", { bubbles: true }));
  };
  const label = b => (b.textContent || b.value || b.title || b.getAttribute("aria-label") || "").trim();
  const controls = () => [...all("button"), ...all("a[download]"), ...all("input[type=button]")];
  const dlBtn = () => controls().find(b => /download|png|save|export/i.test(label(b)) && !/clear/i.test(label(b)));
  const clearBtn = () => controls().find(b => /clear|wipe|erase|reset/i.test(label(b)));
  // click the download control, allowing DOM.download's two-click form; returns the newest file
  const download = async () => {
    const n = files.length;
    for (let k = 0; k < 2 && files.length === n; k++) {
      const b = dlBtn(); if (!b) return null;
      b.click(); await sleep(600);
    }
    return files.length > n ? files[files.length - 1] : null;
  };
  const decode = async f => {
    const blob = await (await fetch(f.href)).blob();
    const head = new Uint8Array(await blob.slice(0, 8).arrayBuffer());
    const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((b, i) => head[i] === b);
    let bmp = null; try { bmp = await createImageBitmap(blob); } catch {}
    if (!bmp) return { png, px: null };
    const c = document.createElement("canvas"); c.width = bmp.width; c.height = bmp.height;
    const ctx = c.getContext("2d"); ctx.drawImage(bmp, 0, 0);
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    // sample by fraction of the image
    return { png, w: c.width, h: c.height, px: (fx, fy) => { const i = (Math.floor(fy * c.height) * c.width + Math.floor(fx * c.width)) * 4; return [d[i], d[i + 1], d[i + 2], d[i + 3]]; } };
  };
  const ink = px => px && px[3] > 40 && !(px[0] > 235 && px[1] > 235 && px[2] > 235);
  const reddish = px => px && px[3] > 40 && px[0] > 180 && px[1] < 90 && px[2] < 90;
  const onLine = (img, fy, test) => { let n = 0; for (let fx = 0.3; fx <= 0.7001; fx += 0.05) if (test(img.px(fx, fy))) n++; return n; };
  try {
    await sleep(800);
    let p = pad();
    if (!p) { out.why.push("no canvas"); return out; }
    const ci = all("input[type=color]")[0];
    if (ci) { setInput(ci, "#ff0000"); await sleep(400); } else out.why.push("no <input type=color>");
    const si = all("input[type=range]")[0];
    if (si) { setInput(si, String(Math.min(Number(si.max || 12), 12))); await sleep(300); }
    p = pad();
    await drag(p, [[0.25, 0.3], [0.75, 0.3]]);
    if (!dlBtn()) { out.why.push("no download control (controls: " + JSON.stringify(controls().map(label).map(s => s.slice(0, 30))) + ")"); return out; }
    const f1 = await download();
    out.downloads = !!f1;
    if (!f1) { out.why.push("clicking " + JSON.stringify(label(dlBtn())) + " offered no file"); return out; }
    const a = await decode(f1);
    out.isPng = a.png && /\.png$/i.test(f1.name || "");
    if (!out.isPng) out.why.push("file " + JSON.stringify(f1.name) + " png signature " + a.png);
    if (!a.px) { out.why.push("file did not decode as an image"); return out; }
    const s1 = onLine(a, 0.3, ink);
    out.hasStroke = s1 >= 7;
    if (!out.hasStroke) out.why.push("PNG has ink at " + s1 + "/9 points along the stroke");
    const red = onLine(a, 0.3, reddish);
    out.colour = !!ci && red >= 7;
    if (ci && !out.colour) out.why.push("PNG stroke after picking #ff0000 red at " + red + "/9 points; mid pixel " + JSON.stringify(a.px(0.5, 0.3)));
    const bg = [a.px(0.1, 0.9), a.px(0.9, 0.1), a.px(0.5, 0.75)];
    out.opaque = bg.every(x => x[3] === 255);
    if (!out.opaque) out.why.push("PNG background pixels " + JSON.stringify(bg) + " (the pad on screen is not transparent)");
    // Clear, draw elsewhere, download again: only the new stroke
    const cb = clearBtn();
    if (!cb) { out.why.push("no Clear button"); return out; }
    cb.click(); await sleep(400);
    p = pad();
    await drag(p, [[0.25, 0.7], [0.75, 0.7]]);
    const f2 = await download();
    if (!f2) { out.why.push("second download offered no file"); return out; }
    const b = await decode(f2);
    const newInk = b.px ? onLine(b, 0.7, ink) : 0, oldInk = b.px ? onLine(b, 0.3, ink) : 9;
    out.current = newInk >= 7 && oldInk === 0;
    if (!out.current) out.why.push("second PNG (after Clear + new stroke): new stroke " + newInk + "/9, cleared stroke " + oldInk + "/9");
    return out;
  } finally {
    HTMLAnchorElement.prototype.click = origClick;
    document.removeEventListener("click", onDocClick, true);
    for (const k of keepers) { try { k.delete(); } catch {} }
    host.remove();
  }
})()`;

export const SOLUTION = `const _intro = function intro(md){return( md\`# Sketch pad\` )};
const _viewof_colour = function viewof_colour(Inputs){return( Inputs.color({label: "Colour", value: "#222222"}) )};
const _colour = (G, _) => G.input(_);
const _viewof_size = function viewof_size(Inputs){return( Inputs.range([1, 30], {label: "Size", value: 4, step: 1}) )};
const _size = (G, _) => G.input(_);
// pointer handling after @tomlarkworthy/robocoop-2.pong_game (lopebooks/notebooks/@tomlarkworthy_gallery.html)
const _pad = function pad(htl, $colour, $size, invalidation){
  const canvas = htl.html\`<canvas width=480 height=320 style="border:1px solid #888;touch-action:none;cursor:crosshair"></canvas>\`;
  const ctx = canvas.getContext("2d");
  const blank = () => { ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, canvas.width, canvas.height); };
  blank();
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  let drawing = false;
  const at = e => { const r = canvas.getBoundingClientRect(); return [(e.clientX - r.left) * canvas.width / r.width, (e.clientY - r.top) * canvas.height / r.height]; };
  const onDown = e => { drawing = true; try { canvas.setPointerCapture(e.pointerId); } catch {} ctx.strokeStyle = $colour.value; ctx.lineWidth = $size.value; const [x, y] = at(e); ctx.beginPath(); ctx.moveTo(x, y); };
  const onMove = e => { if (!drawing) return; const [x, y] = at(e); ctx.lineTo(x, y); ctx.stroke(); };
  const onUp = () => { drawing = false; };
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp);
  invalidation.then(() => { canvas.removeEventListener("pointerdown", onDown); canvas.removeEventListener("pointermove", onMove); canvas.removeEventListener("pointerup", onUp); });
  const clear = htl.html\`<button onclick=\${blank}>Clear</button>\`;
  // after @tomlarkworthy/suminagashi._download (lopebooks/notebooks/@tomlarkworthy_suminagashi.html)
  const save = htl.html\`<button onclick=\${() => canvas.toBlob(blob => {
    const link = htl.html\`<a download="sketch.png" href=\${URL.createObjectURL(blob)}>\`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }, "image/png")}>Download PNG</button>\`;
  return htl.html\`<div>\${canvas}<div>\${clear} \${save}</div></div>\`;
};
export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;
  $def("_intro", "intro", ["md"], _intro);
  $def("_viewof_colour", "viewof colour", ["Inputs"], _viewof_colour);
  $def("_colour", "colour", ["Generators", "viewof colour"], _colour);
  $def("_viewof_size", "viewof size", ["Inputs"], _viewof_size);
  $def("_size", "size", ["Generators", "viewof size"], _size);
  $def("_pad", "pad", ["htl", "viewof colour", "viewof size", "invalidation"], _pad);
  return main;
}
`;

export const criteria = [
  { name: "collected_equals", args: { key: "downloads", equals: true }, weight: 2 },
  { name: "collected_equals", args: { key: "isPng", equals: true }, weight: 1 },
  { name: "collected_equals", args: { key: "hasStroke", equals: true }, weight: 2 },
  { name: "collected_equals", args: { key: "colour", equals: true }, weight: 1 },
  { name: "collected_equals", args: { key: "current", equals: true }, weight: 2 },
  { name: "collected_equals", args: { key: "opaque", equals: true }, weight: 1 },
];

export default {
  id: "rc5t-sketch-png-download",
  category: "rc5-train",
  question: "Give me a canvas I can sketch on with the mouse, with a colour picker, a clear button, and a button that downloads the drawing as a PNG.",
  setup: { init: INIT, collect: COLLECT },
  criteria,
  oracle: [
    { tool: "write_file", args: { file_path: "/src/@user/sketch-pad.js", content: SOLUTION }, settleMs: 1500 },
  ],
};
