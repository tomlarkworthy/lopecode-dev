// rc5-train eval (20260928-0530-w26): a mouse drawing pad with pen colour, pen size, Clear and a stroke count.
// setup.collect drives real pointer + mouse events on the module's canvas (or SVG), then reads pixels:
// a stroke paints, the picked colour and size are used, changing the pen keeps the drawing, Clear wipes, the count follows strokes, and
// redefining the module's cells (as every edit does) does not make one drag count as several strokes.
// No baseline trace: run 20260928-0530-w26-before stopped on OpenRouter 429 before the first model reply.
// Controls (oracle mode): the SOLUTION scores 1.00; Clear built with bare `html` fails only `clears`;
// a pad cell that lists `colour`/`size` (re-renders on pen change) fails only `keepsOnPenChange`.
// Canvas pointer handling copied from @tomlarkworthy/robocoop-2.pong_game (lopebooks/notebooks/@tomlarkworthy_gallery.html).

const INIT = String.raw`(() => {
  const rt = [...globalThis.__ojs_runtime.mains.values()].find(m => m && m._runtime)._runtime;
  globalThis.__rc5tBefore = new Set([...rt._variables].map(v => v._module));
})()`;

const COLLECT = String.raw`(async () => {
  const rt = [...globalThis.__ojs_runtime.mains.values()].find(m => m && m._runtime)._runtime;
  const isUser = v => !globalThis.__rc5tBefore.has(v._module) && v._type === 1 && v._name && !String(v._name).startsWith("module ") && v._name !== "@variable";
  const users = () => [...rt._variables].filter(isUser);
  const out = { draws: false, colour: false, size: false, keepsOnPenChange: false, counts: false, clears: false, noDoubleCount: false, why: [] };
  if (!users().length) { out.why.push("no module was created"); return out; }
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const keepers = [];
  for (const v of users()) { try { keepers.push(v._module.variable(true).define([v._name], x => x)); } catch {} }
  const els = () => users().map(v => v._value).filter(x => x instanceof Element);
  const all = sel => els().flatMap(x => [...(x.matches(sel) ? [x] : []), ...x.querySelectorAll(sel)]);
  // a pad must be on screen to be drawn on: mount detached cell elements the way the notebook would
  const host = document.createElement("div");
  host.style.cssText = "position:fixed;left:0;top:0;z-index:99999;background:#fff";
  document.body.appendChild(host);
  const mount = () => { for (const x of els()) if (!x.isConnected) host.appendChild(x); };
  const pad = () => { mount(); return all("canvas").sort((a, b) => b.width * b.height - a.width * a.height)[0] || all("svg").sort((a, b) => b.getBoundingClientRect().width - a.getBoundingClientRect().width)[0]; };
  const text = () => els().map(x => x.textContent).join(" | ") + " | " + users().filter(v => typeof v._value === "number" || typeof v._value === "string").map(v => v._name + "=" + v._value).join(" ");
  const strokeCount = () => {
    const v = users().find(v => /stroke|count/i.test(v._name) && !/^(initial|mutable) /.test(v._name) && typeof v._value === "number");
    if (v) return v._value;
    const m = text().match(/strokes?(?:\s+drawn)?\s*[:=]?\s*(\d+)|(\d+)\s*strokes?/i);
    return m ? +(m[1] ?? m[2]) : null;
  };
  // pixels in page coordinates: canvas via getImageData, svg via rasterising its markup
  const sample = async (p) => {
    const r = p.getBoundingClientRect();
    if (p instanceof HTMLCanvasElement) {
      const ctx = p.getContext("2d"); if (!ctx) return null;
      const d = ctx.getImageData(0, 0, p.width, p.height).data, sx = p.width / r.width, sy = p.height / r.height;
      return (x, y) => { const i = (Math.floor((y - r.top) * sy) * p.width + Math.floor((x - r.left) * sx)) * 4; return [d[i], d[i + 1], d[i + 2], d[i + 3]]; };
    }
    const c = document.createElement("canvas"); c.width = Math.ceil(r.width); c.height = Math.ceil(r.height);
    const clone = p.cloneNode(true); clone.setAttribute("width", r.width); clone.setAttribute("height", r.height);
    if (!clone.getAttribute("xmlns")) clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    const img = new Image(); img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(new XMLSerializer().serializeToString(clone));
    await img.decode().catch(() => {});
    const ctx = c.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    return (x, y) => { const i = (Math.floor(y - r.top) * c.width + Math.floor(x - r.left)) * 4; return [d[i], d[i + 1], d[i + 2], d[i + 3]]; };
  };
  const ink = px => px && px[3] > 40 && !(px[0] > 235 && px[1] > 235 && px[2] > 235);
  const reddish = px => px && px[3] > 40 && px[0] > 180 && px[1] < 90 && px[2] < 90;
  // one drag: pointer and mouse events together, as a real mouse sends them; move/up also reach window
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
      for (let s = 1; s <= 8; s++) { x = x0 + (x1 - x0) * s / 8; y = y0 + (y1 - y0) * s / 8; fire(p, "pointermove", x, y, 1); fire(p, "mousemove", x, y, 1); await sleep(4); }
    }
    fire(p, "pointerup", x, y, 0); fire(p, "mouseup", x, y, 0); fire(p, "click", x, y, 0);
    await sleep(150);
  };
  const setInput = (inp, value) => {
    const set = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(inp), "value").set; set.call(inp, value);
    inp.dispatchEvent(new Event("input", { bubbles: true })); inp.dispatchEvent(new Event("change", { bubbles: true }));
  };
  const colourInput = () => all("input[type=color]")[0];
  const sizeInput = () => all("input[type=range],input[type=number]").find(i => i.type === "range") || all("input[type=number]")[0];
  const clearBtn = () => all("button").find(b => /clear|wipe|erase|reset/i.test(b.textContent)) || all("input[type=button]").find(b => /clear|wipe|erase|reset/i.test(b.value));
  const inkOnLine = (px, p, fy, test) => { const r = p.getBoundingClientRect(); let n = 0; for (let fx = 0.3; fx <= 0.7; fx += 0.05) if (test(px(r.left + fx * r.width, r.top + fy * r.height))) n++; return n; };
  try {
    await sleep(800);
    let p = pad();
    if (!p) { out.why.push("no canvas or svg (vars " + JSON.stringify(users().map(v => v._name + ":" + (v._value instanceof Element ? v._value.tagName : typeof v._value))).slice(0, 300) + ")"); return out; }
    const n0 = strokeCount();
    // 1. a drag paints along its path
    await drag(p, [[0.25, 0.3], [0.75, 0.3]]);
    p = pad();
    let px = await sample(p);
    const hit = inkOnLine(px, p, 0.3, ink);
    out.draws = hit >= 6;
    if (!out.draws) out.why.push("drag across y=0.3 left ink at " + hit + "/9 sample points");
    const n1 = strokeCount();
    // 2. colour: pick red, draw, the new stroke is red
    const ci = colourInput();
    if (!ci) out.why.push("no <input type=color>");
    else { setInput(ci, "#ff0000"); await sleep(300); }
    // 3. size: pick the largest size, draw; the stroke is thick
    const si = sizeInput();
    if (!si) out.why.push("no size input (range/number)");
    else { setInput(si, si.max || "40"); await sleep(300); }
    p = pad();
    await drag(p, [[0.25, 0.6], [0.75, 0.6]]);
    p = pad(); px = await sample(p);
    out.colour = !!ci && inkOnLine(px, p, 0.6, reddish) >= 6;
    // changing the pen must not wipe what is already drawn
    const kept = inkOnLine(px, p, 0.3, ink);
    out.keepsOnPenChange = out.draws && kept >= 6;
    if (out.draws && !out.keepsOnPenChange) out.why.push("the first stroke was gone after changing pen colour/size (" + kept + "/9 still inked)");
    if (ci && !out.colour) out.why.push("stroke after picking #ff0000 not red: " + JSON.stringify(px(p.getBoundingClientRect().left + p.getBoundingClientRect().width / 2, p.getBoundingClientRect().top + 0.6 * p.getBoundingClientRect().height)));
    if (si) {
      const r = p.getBoundingClientRect(), maxW = Number(si.max || 40), off = Math.max(3, Math.min(maxW / 2 - 2, 12));
      const cy = r.top + 0.6 * r.height;
      let thick = 0; for (let fx = 0.35; fx <= 0.65; fx += 0.05) { const x = r.left + fx * r.width; if (ink(px(x, cy - off)) && ink(px(x, cy + off))) thick++; }
      out.size = maxW >= 8 && thick >= 5;
      if (!out.size) out.why.push("stroke at size " + si.value + " (max " + si.max + ") not inked ±" + off + "px from centre (" + thick + "/7)");
    }
    const n2 = strokeCount();
    out.counts = n0 != null && n1 === n0 + 1 && n2 === n0 + 2;
    if (!out.counts) out.why.push("stroke count " + n0 + " -> " + n1 + " -> " + n2 + " over 2 drags (text " + JSON.stringify(text().slice(0, 160)) + ")");
    // 4. Clear wipes the pad
    const cb = clearBtn();
    if (!cb) out.why.push("no Clear button (buttons: " + JSON.stringify(all("button").map(b => b.textContent.trim().slice(0, 30))) + ")");
    else {
      cb.click(); await sleep(400);
      p = pad(); px = await sample(p);
      const left = inkOnLine(px, p, 0.3, ink) + inkOnLine(px, p, 0.6, ink);
      out.clears = left === 0;
      if (!out.clears) out.why.push("after Clear, " + left + "/18 sample points still inked");
    }
    // 5. redefine every cell (as each edit does), then one drag must add exactly one stroke
    for (const v of users()) { try { v.define(v._name, v._inputs.map(i => i._name), v._definition); } catch {} }
    await sleep(800);
    p = pad();
    const m0 = strokeCount();
    await drag(p, [[0.3, 0.45], [0.7, 0.45]]);
    const m1 = strokeCount();
    out.noDoubleCount = m0 != null && m1 === m0 + 1;
    out.why.push("after redefining the cells, one drag: count " + m0 + " -> " + m1);
    return out;
  } finally {
    for (const k of keepers) { try { k.delete(); } catch {} }
    host.remove();
  }
})()`;

const SOLUTION = `const _intro = function intro(md){return( md\`# Drawing pad\` )};
const _viewof_colour = function viewof_colour(Inputs){return( Inputs.color({label: "Pen colour", value: "#222222"}) )};
const _colour = (G, _) => G.input(_);
const _viewof_size = function viewof_size(Inputs){return( Inputs.range([1, 40], {label: "Pen size", value: 4, step: 1}) )};
const _size = (G, _) => G.input(_);
const _initial_strokes = function initial_strokes(){return( 0 )};
const _mutable_strokes = function mutable_strokes(Mutable, initial_strokes){return( new Mutable(initial_strokes) )};
const _strokes = function strokes(mutable_strokes){return( mutable_strokes.generator )};
// canvas pointer handling after @tomlarkworthy/robocoop-2.pong_game (lopebooks/notebooks/@tomlarkworthy_gallery.html):
// pointerdown/move/up on the canvas with setPointerCapture, listeners removed on invalidation
const _pad = function pad(htl, $colour, $size, $strokes, invalidation){
  const canvas = htl.html\`<canvas width=480 height=320 style="border:1px solid #888;touch-action:none;cursor:crosshair;background:#fff"></canvas>\`;
  const ctx = canvas.getContext("2d");
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  let drawing = false;
  const at = e => { const r = canvas.getBoundingClientRect(); return [(e.clientX - r.left) * canvas.width / r.width, (e.clientY - r.top) * canvas.height / r.height]; };
  const onDown = e => {
    drawing = true;
    try { canvas.setPointerCapture(e.pointerId); } catch {}
    ctx.strokeStyle = $colour.value; ctx.lineWidth = $size.value;
    const [x, y] = at(e); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y); ctx.stroke();
  };
  const onMove = e => { if (!drawing) return; const [x, y] = at(e); ctx.lineTo(x, y); ctx.stroke(); };
  const onUp = e => { if (!drawing) return; drawing = false; try { canvas.releasePointerCapture(e.pointerId); } catch {} $strokes.value += 1; };
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", onUp);
  invalidation.then(() => {
    canvas.removeEventListener("pointerdown", onDown);
    canvas.removeEventListener("pointermove", onMove);
    canvas.removeEventListener("pointerup", onUp);
    canvas.removeEventListener("pointercancel", onUp);
  });
  const clear = htl.html\`<button onclick=\${() => { ctx.clearRect(0, 0, canvas.width, canvas.height); $strokes.value = 0; }}>Clear</button>\`;
  return htl.html\`<div>\${canvas}<div>\${clear}</div></div>\`;
};
const _count = function count(htl, strokes){return( htl.html\`<div>Strokes drawn: \${strokes}</div>\` )};
export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;
  $def("_intro", "intro", ["md"], _intro);
  $def("_viewof_colour", "viewof colour", ["Inputs"], _viewof_colour);
  $def("_colour", "colour", ["Generators", "viewof colour"], _colour);
  $def("_viewof_size", "viewof size", ["Inputs"], _viewof_size);
  $def("_size", "size", ["Generators", "viewof size"], _size);
  $def("_initial_strokes", "initial strokes", [], _initial_strokes);
  $def("_mutable_strokes", "mutable strokes", ["Mutable", "initial strokes"], _mutable_strokes);
  $def("_strokes", "strokes", ["mutable strokes"], _strokes);
  $def("_pad", "pad", ["htl", "viewof colour", "viewof size", "mutable strokes", "invalidation"], _pad);
  $def("_count", "count", ["htl", "strokes"], _count);
  return main;
}
`;

export default {
  id: "rc5t-drawing-pad",
  category: "rc5-train",
  question: "Give me a small drawing pad: I draw with the mouse, can pick the pen colour and size, and a Clear button wipes it. Also show how many strokes I've drawn.",
  setup: { init: INIT, collect: COLLECT },
  criteria: [
    { name: "collected_equals", args: { key: "draws", equals: true }, weight: 2 },
    { name: "collected_equals", args: { key: "colour", equals: true }, weight: 1 },
    { name: "collected_equals", args: { key: "size", equals: true }, weight: 1 },
    { name: "collected_equals", args: { key: "keepsOnPenChange", equals: true }, weight: 1 },
    { name: "collected_equals", args: { key: "counts", equals: true }, weight: 2 },
    { name: "collected_equals", args: { key: "clears", equals: true }, weight: 1 },
    { name: "collected_equals", args: { key: "noDoubleCount", equals: true }, weight: 1 },
  ],
  oracle: [
    { tool: "write_file", args: { file_path: "/src/@user/drawing-pad.js", content: SOLUTION }, settleMs: 1500 },
  ],
};
