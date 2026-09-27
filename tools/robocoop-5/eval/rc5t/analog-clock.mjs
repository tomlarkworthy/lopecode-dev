// rc5-train eval (20260928-0040-w9): an analog clock that shows the current time and ticks.
// Run 20260928-0040-w9-before (xiaomi/mimo-v2.5-pro) passed this: Generators.observe + setInterval with a
// dispose, hour hand (h + m/60 + s/3600) * 30, 0 deg at 12. The eval records the properties that make a
// ticking clock correct so a later prompt/model change that breaks them is seen:
//   hands     the hour, minute and second hands point at the page's local time (hour hand includes minutes)
//   ticks     the second hand moves between two reads ~2.5s apart
//   noLeak    redefining the module's cells 3 times does not multiply the timer callbacks
//             (setInterval / setTimeout / requestAnimationFrame without invalidation cleanup)
// Behavioural, not spelling: hands are read from the drawn geometry, SVG (any element whose points run
// from near the face centre outwards, via getScreenCTM) or canvas 2D (moveTo/lineTo/rect recorded with
// the context transform). The page clock is pinned (FakeDate, as rc5t/forecast-window.mjs) and reset to
// 10:36:25 America/New_York when collect starts, so a UTC-hours slip or a missing minute fraction on the
// hour hand (300 deg vs 318 deg) is visible.

const INIT_SCRIPT = String.raw`(() => {
  const RealDate = Date, realNow = RealDate.now.bind(RealDate);
  let off = 0;
  function FakeDate(...a) {
    if (!new.target) return new RealDate(realNow() + off).toString();
    return a.length ? new RealDate(...a) : new RealDate(realNow() + off);
  }
  FakeDate.prototype = RealDate.prototype;
  Object.setPrototypeOf(FakeDate, RealDate);
  FakeDate.now = () => realNow() + off;
  FakeDate.parse = RealDate.parse; FakeDate.UTC = RealDate.UTC;
  globalThis.Date = FakeDate;
  globalThis.__rc5tSetNow = (ms) => { off = ms - realNow(); };

  // timer-callback counter, for the leak check
  const T = globalThis.__rc5tTimers = { fired: 0, liveIntervals: new Set() };
  const wrap = (fn) => typeof fn === "function" ? function (...a) { T.fired++; return fn.apply(this, a); } : fn;
  const si = globalThis.setInterval, ci = globalThis.clearInterval, st = globalThis.setTimeout, raf = globalThis.requestAnimationFrame;
  globalThis.setInterval = function (fn, ms, ...a) { const id = si.call(this, wrap(fn), ms, ...a); T.liveIntervals.add(id); return id; };
  globalThis.clearInterval = function (id) { T.liveIntervals.delete(id); return ci.call(this, id); };
  globalThis.setTimeout = function (fn, ms, ...a) { return st.call(this, (ms || 0) >= 100 ? wrap(fn) : fn, ms, ...a); };
  if (raf) globalThis.requestAnimationFrame = function (fn) { return raf.call(this, wrap(fn)); };

  // canvas 2D recorder: shapes (beginPath..) of the current frame (since the last full clear)
  const C = globalThis.CanvasRenderingContext2D && CanvasRenderingContext2D.prototype;
  if (C) {
    const st = (ctx) => ctx.__rc5t || (ctx.__rc5t = { shapes: [], arcs: [], cur: null });
    const pt = (ctx, x, y) => { const m = ctx.getTransform(); return { x: m.a * x + m.c * y + m.e, y: m.b * x + m.d * y + m.f }; };
    const cur = (ctx) => { const s = st(ctx); if (!s.cur) { s.cur = []; s.shapes.push(s.cur); } return s.cur; };
    const reset = (ctx, x, y, w, h) => { if (Math.abs(w * h) >= 0.8 * ctx.canvas.width * ctx.canvas.height) { const s = st(ctx); s.shapes = []; s.arcs = []; s.cur = null; } };
    const patch = (name, f) => { const o = C[name]; C[name] = function (...a) { try { f(this, ...a); } catch {} return o.apply(this, a); }; };
    patch("beginPath", (ctx) => { st(ctx).cur = null; });
    patch("moveTo", (ctx, x, y) => cur(ctx).push(pt(ctx, x, y)));
    patch("lineTo", (ctx, x, y) => cur(ctx).push(pt(ctx, x, y)));
    patch("rect", (ctx, x, y, w, h) => cur(ctx).push(pt(ctx, x, y), pt(ctx, x + w, y), pt(ctx, x + w, y + h), pt(ctx, x, y + h)));
    patch("fillRect", (ctx, x, y, w, h) => { reset(ctx, x, y, w, h); st(ctx).shapes.push([pt(ctx, x, y), pt(ctx, x + w, y), pt(ctx, x + w, y + h), pt(ctx, x, y + h)]); });
    patch("clearRect", (ctx, x, y, w, h) => reset(ctx, x, y, w, h));
    patch("arc", (ctx, x, y, r) => { const m = ctx.getTransform(); const c = pt(ctx, x, y); st(ctx).arcs.push({ ...c, r: r * Math.hypot(m.a, m.b) }); });
    globalThis.__rc5tCanvasFrame = (canvas) => { const ctx = canvas.__rc5tCtx; return ctx && ctx.__rc5t; };
    const gc = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (kind, ...a) { const ctx = gc.call(this, kind, ...a); if (kind === "2d" && ctx) this.__rc5tCtx = ctx; return ctx; };
  }
})();`;

const INIT = String.raw`(() => {
  const rt = [...globalThis.__ojs_runtime.mains.values()].find(m => m && m._runtime)._runtime;
  globalThis.__rc5tBefore = new Set([...rt._variables].map(v => v._module));
})()`;

const NY_10_36_25 = Date.UTC(2026, 8, 28, 14, 36, 25); // 10:36:25 EDT

const COLLECT = String.raw`(async () => {
  const out = { clock: false, hands: false, ticks: false, stable: false, noLeak: false, svgValid: false, detail: "" };
  const rt = [...globalThis.__ojs_runtime.mains.values()].find(m => m && m._runtime)._runtime;
  const userVars = [...rt._variables].filter(v => !globalThis.__rc5tBefore.has(v._module) && v._name &&
    !String(v._name).startsWith("module ") && v._name !== "@variable");
  if (!userVars.length) { out.detail = "no module was created"; return out; }
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const keepers = [];
  for (const v of userVars) { try { keepers.push(v._module.variable(true).define([v._name], x => x)); } catch {} }
  const surfaces = () => {
    const found = [];
    for (const v of userVars) {
      const x = v._value;
      if (!(x instanceof Element)) continue;
      for (const el of [x, ...x.querySelectorAll("svg,canvas")]) {
        if (el instanceof SVGSVGElement && !(el.ownerSVGElement)) found.push(el);
        else if (el instanceof HTMLCanvasElement) found.push(el);
      }
    }
    return [...new Set(found)];
  };
  const deg = (dx, dy) => ((Math.atan2(dx, -dy) * 180 / Math.PI) + 360) % 360;
  const handsOf = (shapes, c, R) => shapes.map(pts => {
    const d = pts.map(p => Math.hypot(p.x - c.x, p.y - c.y));
    const i = d.indexOf(Math.max(...d));
    return { near: Math.min(...d) / R, far: d[i] / R, angle: deg(pts[i].x - c.x, pts[i].y - c.y) };
  }).filter(h => h.near < 0.35 && h.far > 0.3 && h.far < 1.15);
  const readSvg = (svg) => {
    // read a clone attached off-screen so a detached or hidden value still has geometry
    const box = document.createElement("div");
    box.style.cssText = "position:absolute;left:-10000px;top:0;visibility:hidden";
    const clone = svg.cloneNode(true);
    box.appendChild(clone); document.body.appendChild(box);
    try {
      const P = (el, x, y) => { const p = new DOMPoint(x, y).matrixTransform(el.getScreenCTM()); return { x: p.x, y: p.y }; };
      let face = null;
      for (const el of clone.querySelectorAll("*")) {
        if (!(el instanceof SVGCircleElement || el instanceof SVGEllipseElement)) continue;
        const cx = el.cx.baseVal.value, cy = el.cy.baseVal.value, r = el.r ? el.r.baseVal.value : el.rx.baseVal.value;
        const c = P(el, cx, cy), e = P(el, cx + r, cy), R = Math.hypot(e.x - c.x, e.y - c.y);
        if (!face || R > face.R) face = { ...c, R };
      }
      // no dial circle (a styled <svg> background, only a centre cap): the svg box is the face
      const b = clone.getBoundingClientRect();
      if (!face || face.R < 0.25 * Math.min(b.width, b.height) / 2) face = { x: b.x + b.width / 2, y: b.y + b.height / 2, R: Math.min(b.width, b.height) / 2 };
      const shapes = [];
      for (const el of clone.querySelectorAll("*")) {
        // only elements the browser draws: SVG namespace (an HTML <line> inside <svg> renders nothing)
        if (!(el instanceof SVGGeometryElement) || !/^(line|polyline|polygon|path|rect)$/.test(el.localName)) continue;
        let pts = [];
        if (el.localName === "line") pts = [P(el, el.x1.baseVal.value, el.y1.baseVal.value), P(el, el.x2.baseVal.value, el.y2.baseVal.value)];
        else if (el.localName === "rect") { const x = el.x.baseVal.value, y = el.y.baseVal.value, w = el.width.baseVal.value, h = el.height.baseVal.value; pts = [P(el, x, y), P(el, x + w, y), P(el, x + w, y + h), P(el, x, y + h)]; }
        else if (el.localName === "path") { const L = el.getTotalLength(); for (let k = 0; k <= 24; k++) { const q = el.getPointAtLength(L * k / 24); pts.push(P(el, q.x, q.y)); } }
        else pts = Array.from({ length: el.points.numberOfItems }, (_, k) => el.points.getItem(k)).map(q => P(el, q.x, q.y));
        if (pts.length) shapes.push(pts);
      }
      return { face, hands: handsOf(shapes, face, face.R), size: Math.round(face.R * 2), count: clone.querySelectorAll("*").length };
    } finally { box.remove(); }
  };
  const readCanvas = (cv) => {
    const f = globalThis.__rc5tCanvasFrame(cv);
    if (!f) return null;
    let face = f.arcs.reduce((a, b) => (!a || b.r > a.r ? b : a), null);
    face = face && face.r >= 0.25 * Math.min(cv.width, cv.height) / 2 ? { x: face.x, y: face.y, R: face.r } : { x: cv.width / 2, y: cv.height / 2, R: Math.min(cv.width, cv.height) / 2 };
    return { face, hands: handsOf(f.shapes.filter(s => s.length >= 2), face, face.R), size: Math.round(face.R * 2), count: f.shapes.length };
  };
  const htmlInSvg = (svg) => [...svg.querySelectorAll("*")].filter(el => el.namespaceURI !== "http://www.w3.org/2000/svg" && !el.closest("foreignObject")).map(el => el.localName);
  const read = () => {
    for (const s of surfaces()) {
      const r = s instanceof HTMLCanvasElement ? readCanvas(s) : readSvg(s);
      if (r && r.hands.length >= 2) return { ...r, surface: s };
    }
    return null;
  };
  const near = (a, b, tol) => Math.abs(((a - b + 540) % 360) - 180) <= tol;
  const expected = () => {
    const d = new Date();
    const h = d.getHours() % 12, m = d.getMinutes(), s = d.getSeconds() + d.getMilliseconds() / 1000;
    return { hour: (h + m / 60 + s / 3600) * 30, minute: (m + s / 60) * 6, second: s * 6 };
  };
  try {
    globalThis.__rc5tSetNow(${NY_10_36_25});
    await sleep(2200);
    const r1 = read(), e1 = expected();
    if (!r1) { out.detail = "no clock face with hands found (surfaces: " + surfaces().map(s => s.localName + (s instanceof SVGSVGElement ? "[html children: " + htmlInSvg(s).length + ", text: " + JSON.stringify((s.textContent || "").trim().slice(0, 40)) + "]" : "")).join(",") + ")"; return out; }
    out.clock = true;
    const stray = r1.surface instanceof SVGSVGElement ? htmlInSvg(r1.surface) : [];
    out.svgValid = stray.length === 0;
    const angles = r1.hands.map(h => Math.round(h.angle));
    const hourOk = r1.hands.some(h => near(h.angle, e1.hour, 3));
    const minOk = r1.hands.some(h => near(h.angle, e1.minute, 4));
    const secHand = r1.hands.find(h => near(h.angle, e1.second, 13));
    out.hands = hourOk && minOk && !!secHand;
    out.detail = "size " + r1.size + "px; hand angles " + JSON.stringify(angles) + " expected h/m/s " + [e1.hour, e1.minute, e1.second].map(Math.round).join("/") + (hourOk ? "" : " HOUR off") + (minOk ? "" : " MINUTE off") + (secHand ? "" : " SECOND off") + (stray.length ? "; HTML elements inside <svg>: " + stray.length + " (" + [...new Set(stray)].join(",") + ")" : "");
    await sleep(2500);
    const r2 = read(), e2 = expected();
    const sec2 = r2 && r2.hands.find(h => near(h.angle, e2.second, 13));
    out.ticks = !!(secHand && sec2 && near(sec2.angle - secHand.angle, 15, 10));
    // each tick replaces the hands; appending new ones into a face built once leaves a trail
    out.stable = !!r2 && r2.count <= r1.count + 2;
    if (!out.stable && r2) out.detail += "; drawn elements grew " + r1.count + " -> " + r2.count + " in 2.5s (hands appended, not replaced)";
    out.detail += "; second hand " + (secHand ? Math.round(secHand.angle) : "?") + " -> " + (sec2 ? Math.round(sec2.angle) : "?");
    // leak check: timer callbacks per 3s before and after redefining every cell 3 times
    const T = globalThis.__rc5tTimers;
    const rate = async () => { const a = T.fired; await sleep(3000); return T.fired - a; };
    const before = await rate(), iv0 = T.liveIntervals.size;
    // the clock's own module only, and only its cells (inputs local or builtin), not import aliases
    const home = (userVars.find(v => v._value instanceof Element && surfaces().some(x => v._value === x || v._value.contains(x))) || {})._module;
    const own = userVars.filter(v => v._module === home && v._type === 1 && typeof v._definition === "function" &&
      v._inputs.every(i => i._name));
    const errs = [];
    const plan = own.map(v => [v, v._definition, [...v._inputs]]);
    const sv = userVars.find(v => v._value instanceof Element && surfaces().some(x => v._value === x || v._value.contains(x)));
    const val0 = sv && sv._value;
    for (let k = 0; k < 3; k++) {
      // a fresh function each time: the runtime skips a define with an identical definition
      for (const [v, f, ins] of plan) {
        // resolve each input name to the variable it was bound to (v._shadow is consulted first by define)
        const prev = v._shadow;
        try { v._shadow = new Map(ins.map(i => [i._name, i])); v.define(v._name, ins.map(i => i._name), function (...a) { return f.apply(this, a); }); }
        catch (e) { errs.push(String(e).slice(0, 80)); }
        finally { v._shadow = prev; }
      }
      await sleep(700);
    }
    await sleep(1500);
    const after = await rate(), iv1 = T.liveIntervals.size;
    out.noLeak = after - before < 6 && iv1 - iv0 < 2;
    out.detail += "; timer callbacks/3s " + before + " -> " + after + " after 3 redefinitions, live intervals " + iv0 + " -> " + iv1 + " (" + own.length + " cells redefined; " + (sv ? sv._name + " value " + (sv._value === val0 ? "same" : "new") + " err " + sv._error + " reach " + sv._reachable : "no sv") + (errs.length ? ", errors " + errs[0] : "") + ")";
    return out;
  } finally {
    for (const k of keepers) { try { k.delete(); } catch {} }
  }
})()`;

// Idiom: @tomlarkworthy/observablejs-reference._invalidation_example
// (lopebooks/notebooks/@tomlarkworthy_observablejs-reference.html): build the element once,
// setInterval updates it, invalidation.then(() => clearInterval(timer)).
const SOLUTION = `const _intro = function intro(md){return( md\`# Analog clock\` )};

const _clock = function clock(htl, invalidation){
  const R = 90;
  const hand = (len, w, color) => htl.svg\`<line x1="0" y1="10" x2="0" y2=\${-len} stroke=\${color} stroke-width=\${w} stroke-linecap="round"/>\`;
  const hour = hand(R * 0.5, 5, "#222"), minute = hand(R * 0.75, 3, "#222"), second = hand(R * 0.85, 1.2, "crimson");
  const svg = htl.svg\`<svg viewBox="-100 -100 200 200" width="240" height="240">
    <circle r=\${R} fill="white" stroke="#222" stroke-width="3"/>
    \${Array.from({ length: 12 }, (_, i) => htl.svg\`<line y1=\${-R + 4} y2=\${-R + 12} stroke="#222" stroke-width="2" transform="rotate(\${i * 30})"/>\`)}
    \${hour}\${minute}\${second}<circle r="3" fill="crimson"/>
  </svg>\`;
  const render = () => {
    const d = new Date();
    const s = d.getSeconds(), m = d.getMinutes() + s / 60, h = (d.getHours() % 12) + m / 60;
    hour.setAttribute("transform", \`rotate(\${h * 30})\`);
    minute.setAttribute("transform", \`rotate(\${m * 6})\`);
    second.setAttribute("transform", \`rotate(\${s * 6})\`);
  };
  render();
  const timer = setInterval(render, 1000);
  invalidation.then(() => clearInterval(timer));
  return svg;
};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;
  $def("_intro", "intro", ["md"], _intro);
  $def("_clock", "clock", ["htl", "invalidation"], _clock);
  return main;
}
`;



export default {
  id: "rc5t-analog-clock",
  category: "rc5-train",
  question: "Draw an analog clock that shows the current time and ticks every second.",
  setup: { initScript: INIT_SCRIPT, init: INIT, collect: COLLECT, timezoneId: "America/New_York" },
  criteria: [
    { name: "collected_equals", args: { key: "clock", equals: true }, weight: 1 },
    // hour hand includes the minute fraction, 0 deg at 12, local time
    { name: "collected_equals", args: { key: "hands", equals: true }, weight: 3 },
    { name: "collected_equals", args: { key: "ticks", equals: true }, weight: 2 },
    // the drawing does not grow tick by tick (a re-run cell appending hands into a face built once)
    { name: "collected_equals", args: { key: "stable", equals: true }, weight: 2 },
    // a timer without invalidation cleanup multiplies on every redefinition
    { name: "collected_equals", args: { key: "noLeak", equals: true }, weight: 3 },
    // every element inside the clock's <svg> is an SVG element (htl.html`<line>` fragments are HTML and not drawn)
    { name: "collected_equals", args: { key: "svgValid", equals: true }, weight: 2 },
    // weight 0: prints the measurements (angles, tick, timer rates) into the feedback
    { name: "collected_equals", args: { key: "detail", equals: "" }, weight: 0 },
  ],
  oracle: [
    { tool: "write_file", args: { file_path: "/src/@user/analog-clock.js", content: SOLUTION }, settleMs: 1500 },
  ],
};
