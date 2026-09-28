(async () => {
  const out = { animates: false, period: false, continuity: false, pause: false, resume: false, plot: false, singleLoop: false, detail: "" };
  const note = (s) => { out.detail += (out.detail ? "; " : "") + s; };
  const rt = [...globalThis.__ojs_runtime.mains.values()].find(m => m && m._runtime)._runtime;
  const userVars = () => [...rt._variables].filter(v => !globalThis.__rc5tBefore.has(v._module) && v._name &&
    !String(v._name).startsWith("module ") && v._name !== "@variable");
  if (!userVars().length) { note("no module was created"); return out; }
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const keepers = [];
  for (const v of userVars()) { try { keepers.push(v._module.variable(true).define([v._name], x => x)); } catch {} }
  const roots = () => userVars().map(v => v._value).filter(x => x instanceof Element);
  const all = (sel) => [...new Set(roots().flatMap(x => [...(x.matches(sel) ? [x] : []), ...x.querySelectorAll(sel)]))];

  // ---- the angle, read from the drawing: a rod (segment) with a bob (circle) centred on one end ----
  const rodAngle = (segs, bobs) => {
    let best = null;
    for (const [p, q] of segs) for (const b of bobs) for (const [piv, end] of [[p, q], [q, p]]) {
      const len = Math.hypot(end.x - piv.x, end.y - piv.y);
      // the bob is the largest circle on a rod end; a pivot cap on the other end is smaller
      if (Math.hypot(end.x - b.x, end.y - b.y) <= Math.max(3, 0.6 * b.r) && len >= 2 * b.r &&
          (!best || b.r > best.r || (b.r === best.r && len > best.len)))
        best = { len, r: b.r, a: Math.atan2(end.x - piv.x, end.y - piv.y) };
    }
    return best;
  };
  const svgRod = (svg) => {
    if (!svg.querySelector("circle,ellipse")) return null;
    const box = document.createElement("div");
    box.style.cssText = "position:absolute;left:-10000px;top:0;visibility:hidden";
    const clone = svg.cloneNode(true);
    box.appendChild(clone); document.body.appendChild(box);
    try {
      const P = (el, x, y) => { const p = new DOMPoint(x, y).matrixTransform(el.getScreenCTM()); return { x: p.x, y: p.y }; };
      const bobs = [...clone.querySelectorAll("circle,ellipse")].map(el => {
        const cx = el.cx.baseVal.value, cy = el.cy.baseVal.value, r = el.r ? el.r.baseVal.value : el.rx.baseVal.value;
        const c = P(el, cx, cy), e = P(el, cx + r, cy);
        return { ...c, r: Math.hypot(e.x - c.x, e.y - c.y) };
      }).filter(b => b.r >= 2);
      const segs = [];
      for (const el of clone.querySelectorAll("line,path,polyline")) {
        if (el.localName === "line") segs.push([P(el, el.x1.baseVal.value, el.y1.baseVal.value), P(el, el.x2.baseVal.value, el.y2.baseVal.value)]);
        else if (el.localName === "polyline" && el.points.numberOfItems === 2) segs.push([0, 1].map(k => { const q = el.points.getItem(k); return P(el, q.x, q.y); }));
        else if (el.localName === "path" && ((el.getAttribute("d") || "").match(/[a-z]/gi) || []).length <= 3) {
          const L = el.getTotalLength(); const a = el.getPointAtLength(0), b = el.getPointAtLength(L);
          segs.push([P(el, a.x, a.y), P(el, b.x, b.y)]);
        }
      }
      return rodAngle(segs, bobs);
    } finally { box.remove(); }
  };
  const canvasRod = (cv) => {
    const f = globalThis.__rc5tCanvasFrame && globalThis.__rc5tCanvasFrame(cv);
    if (!f) return null;
    const segs = f.shapes.filter(s => s.length >= 2).map(s => [s[0], s[s.length - 1]]);
    return rodAngle(segs, f.arcs.filter(a => a.r >= 2));
  };
  const cssAngle = () => {
    for (const el of all("[style*=rotate]")) {
      const m = /rotate\(\s*(-?[\d.eE+-]+)\s*(deg|rad|turn)?\s*\)/.exec(el.style.transform || "");
      if (m) return { a: m[2] === "rad" ? +m[1] : m[2] === "turn" ? +m[1] * 2 * Math.PI : +m[1] * Math.PI / 180 };
    }
    return null;
  };
  const varAngle = () => {
    const nameRe = /^(theta|angle|phi|θ|φ|ang)$/i;
    for (const v of userVars()) {
      let x = v._value;
      if (typeof x === "number" && nameRe.test(v._name)) return { a: x, deg: /deg/i.test(v._name) };
      if (x && typeof x === "object" && !(x instanceof Element) && !Array.isArray(x)) {
        if (x.value && typeof x.value === "object") x = x.value;
        for (const k of Object.keys(x)) if (nameRe.test(k) && typeof x[k] === "number") return { a: x[k] };
      }
    }
    return null;
  };
  let source = null;
  // every place an angle can be read; calibrate() keeps the one that moves most
  const readers = () => {
    const r = [];
    all("svg").filter(x => !x.ownerSVGElement).forEach((x, i) => r.push(["svg rod #" + i, () => { const s = all("svg").filter(y => !y.ownerSVGElement)[i]; const q = s && svgRod(s); return q ? q.a : null; }]));
    all("canvas").forEach((x, i) => r.push(["canvas rod #" + i, () => { const c = all("canvas")[i]; const q = c && canvasRod(c); return q ? q.a : null; }]));
    r.push(["css rotate", () => { const q = cssAngle(); return q ? q.a : null; }]);
    r.push(["variable", () => { const q = varAngle(); return q ? q.a : null; }]);
    return r;
  };
  let reader = null;
  const calibrate = async () => {
    const rs = readers().map(([name, f]) => ({ name, f, vals: [] }));
    for (let k = 0; k < 30; k++) { for (const r of rs) { const a = r.f(); if (a != null) r.vals.push(a); } await sleep(40); }
    const spread = (v) => v.length ? Math.max(...v) - Math.min(...v) : -1;
    const best = rs.filter(r => r.vals.length >= 5).sort((a, b) => spread(b.vals) - spread(a.vals))[0];
    if (best) { reader = best.f; source = best.name; }
    return best ? spread(best.vals) : null;
  };
  const readAngle = () => { try { return reader ? reader() : null; } catch { return null; } };
  const sample = async (ms, step = 25) => {
    const t0 = performance.now(), s = [];
    while (performance.now() - t0 < ms) { const a = readAngle(); if (a != null) s.push({ t: (performance.now() - t0) / 1000, a }); await sleep(step); }
    return s;
  };
  const maxRate = (s) => { let m = 0; for (let i = 1; i < s.length; i++) m = Math.max(m, Math.abs(s[i].a - s[i - 1].a) / Math.max(1e-3, s[i].t - s[i - 1].t)); return m; };

  // ---- controls ----
  const rangeFor = (re) => all("input[type=range],input[type=number]").find(i => {
    const host = i.closest("form,label,div") || i.parentElement;
    const lab = (i.labels && [...i.labels].map(l => l.textContent).join(" ")) || "";
    return re.test(lab + " " + (host ? host.textContent : "") + " " + (i.name || "") + " " + (i.id || ""));
  });
  const setRange = (inp, val) => { inp.value = String(val); inp.dispatchEvent(new Event("input", { bubbles: true })); inp.dispatchEvent(new Event("change", { bubbles: true })); };
  const lenIn = rangeFor(/length|\blen\b|\bL\b/i), gIn = rangeFor(/grav|\bg\b/i);
  const unitScale = (inp) => /\bcm\b/i.test((inp.closest("form,label,div") || inp).textContent) ? 0.01 : 1;
  const L = () => lenIn ? +lenIn.value * unitScale(lenIn) : null;
  const G = () => gIn ? +gIn.value : null;
  const buttonLike = () => [...all("button"), ...all("input[type=button],input[type=checkbox]")];
  const labelOf = (b) => (b.textContent || "").trim() || (b.labels && [...b.labels].map(l => l.textContent).join(" ")) || ((b.closest("label,form") || {}).textContent || "").trim() || b.value || "";
  const find = (re) => buttonLike().find(b => re.test(labelOf(b)));

  // K(k) by the arithmetic-geometric mean: large-amplitude period T = 4 sqrt(L/g) K(sin(θ0/2))
  const K = (k) => { let a = 1, b = Math.sqrt(1 - k * k); for (let i = 0; i < 20; i++) [a, b] = [(a + b) / 2, Math.sqrt(a * b)]; return Math.PI / (2 * a); };

  try {
    await sleep(1500);
    if (!lenIn || !gIn) note("sliders: length " + !!lenIn + ", gravity " + !!gIn);
    let spread = await calibrate();
    if (spread == null) { note("no pendulum angle readable (no rod+bob in svg/canvas, no rotate() transform, no theta/angle value)"); return out; }
    out.animates = spread > 0.02;
    note("angle from " + source + ", moved " + spread.toFixed(3) + " rad in 1.2s");
    if (!out.animates) {
      const start = find(/resume|play|start|▶/i);
      if (start) { start.click(); await sleep(800); spread = await calibrate(); out.animates = spread != null && spread > 0.02; note("clicked " + JSON.stringify((start.textContent || "").trim()) + " to start: animates " + out.animates); }
      if (!out.animates) return out;
    }

    // ---- plot: some drawn path with >= 20 points (outside the rod) changes within 1s ----
    const plotSig = () => {
      const sig = [];
      for (const p of all("svg path, svg polyline")) { const d = p.getAttribute("d") || p.getAttribute("points") || ""; if ((d.match(/[\d.]+/g) || []).length >= 40) sig.push(d.length + ":" + d.slice(-60)); }
      for (const c of all("canvas")) { const f = globalThis.__rc5tCanvasFrame && globalThis.__rc5tCanvasFrame(c); if (f) for (const s of f.shapes) if (s.length >= 20) sig.push(s.length + ":" + s.slice(-3).map(q => q.x.toFixed(1) + "," + q.y.toFixed(1)).join(" ")); }
      return sig.join("|");
    };
    const p1 = plotSig(); await sleep(1000); const p2 = plotSig();
    out.plot = !!p1 && !!p2 && p1 !== p2;
    note("plot " + (p1 ? (p1 !== p2 ? "updates" : "static over 1s") : "no line with >= 20 points"));

    // ---- period against 4 sqrt(L/g) K(sin(θ0/2)) (== 2π sqrt(L/g) at small amplitude) ----
    // move length off its default (often 1, where g/L and g*L agree)
    if (lenIn) {
      const lo = +lenIn.min || 0, hi = +lenIn.max || 2 * +lenIn.value, cur = +lenIn.value;
      setRange(lenIn, 2 * cur <= hi ? 2 * cur : Math.max(lo, cur / 2));
      await sleep(500);
    }
    if (L() && G()) {
      const T0 = 2 * Math.PI * Math.sqrt(L() / G());
      const s = await sample(Math.min(Math.max(2.6 * T0, 4) , 14) * 1000, 15);
      const mean = s.reduce((a, p) => a + p.a, 0) / s.length;
      const ups = [];
      for (let i = 1; i < s.length; i++) if (s[i - 1].a < mean && s[i].a >= mean) ups.push(s[i - 1].t + (mean - s[i - 1].a) / (s[i].a - s[i - 1].a) * (s[i].t - s[i - 1].t));
      let amp = Math.max(...s.map(p => Math.abs(p.a - mean)));
      if (amp > Math.PI) amp = amp * Math.PI / 180;
      const Tex = 4 * Math.sqrt(L() / G()) * K(Math.sin(Math.min(amp, 3.1) / 2));
      if (ups.length >= 2) {
        const T = (ups[ups.length - 1] - ups[0]) / (ups.length - 1);
        const err = Math.min(Math.abs(T - Tex) / Tex, Math.abs(T - T0) / T0);
        out.period = err <= 0.05;
        note("L " + L() + " g " + G() + " amp " + amp.toFixed(2) + " rad: period " + T.toFixed(3) + "s vs 2π√(L/g) " + T0.toFixed(3) + "s / exact " + Tex.toFixed(3) + "s (err " + (100 * err).toFixed(1) + "%)");
      } else note("period: fewer than 2 upward crossings in " + s.length + " samples (2π√(L/g) = " + T0.toFixed(2) + "s)");
    } else note("period not checked: no length/gravity slider value");

    // ---- slider change keeps the swing (no jump back to the start angle) ----
    if (lenIn) {
      const ref = await sample(1000, 20);
      const rate = maxRate(ref), amp = Math.max(...ref.map(p => Math.abs(p.a)));
      // wait for the fast part of the swing, where a reset to ±θ0 is a large jump
      let pre = null;
      for (let k = 0; k < 150; k++) { const a = readAngle(); if (a != null && Math.abs(a) < 0.35 * amp) { pre = a; break; } await sleep(10); }
      const lo = +lenIn.min || 0, hi = +lenIn.max || 2 * +lenIn.value, cur = +lenIn.value;
      const target = cur + (hi - lo) * (cur - lo > (hi - lo) / 2 ? -0.2 : 0.2);
      setRange(lenIn, target);
      const post = await sample(400, 15);
      const first = post[0];
      const bound = 2.5 * rate * Math.max(0.05, first ? first.t + 0.03 : 0.05) + 0.05;
      const jump = first && pre != null ? Math.abs(first.a - pre) : null;
      // and no jump anywhere in the next 400ms bigger than the swing's own speed allows
      const postRate = maxRate(post);
      out.continuity = jump != null && jump <= bound && postRate <= 3 * rate + 0.5 && Math.max(...post.map(p => p.a)) - Math.min(...post.map(p => p.a)) > 0.005;
      note("length " + cur + " -> " + lenIn.value + ": angle " + (pre == null ? "?" : pre.toFixed(3)) + " -> " + (first ? first.a.toFixed(3) : "?") + " (allowed jump " + bound.toFixed(3) + ", max rate " + rate.toFixed(2) + " -> " + postRate.toFixed(2) + " rad/s)");
    }

    // ---- pause freezes, resume continues from where it stopped ----
    const pauseB = find(/pause|stop|⏸/i);
    if (!pauseB) note("no Pause button (buttons: " + JSON.stringify(buttonLike().map(b => labelOf(b).slice(0, 30))) + ")");
    else {
      pauseB.click();
      await sleep(250);
      const a1 = readAngle(); await sleep(1000); const a2 = readAngle();
      out.pause = a1 != null && a2 != null && Math.abs(a1 - a2) < 1e-4;
      note("pause: " + (a1 == null ? "?" : a1.toFixed(4)) + " -> " + (a2 == null ? "?" : a2.toFixed(4)) + " over 1s");
      const resB = find(/resume|play|start|▶/i) || (pauseB.isConnected ? pauseB : null) || find(/pause|stop|⏸/i);
      if (!resB) note("no Resume button");
      else {
        resB.click();
        const s = await sample(900, 15);
        const moved = s.length > 3 && Math.max(...s.map(p => p.a)) - Math.min(...s.map(p => p.a)) > 0.02;
        const first = s[0];
        const cont = first && a2 != null && Math.abs(first.a - a2) <= 0.25;
        out.resume = moved && !!cont;
        note("resume: moved " + moved + ", " + (a2 == null ? "?" : a2.toFixed(3)) + " -> " + (first ? first.a.toFixed(3) : "?") + " at +" + (first ? Math.round(first.t * 1000) : "?") + "ms");
      }
    }

    // ---- a single loop: timer/rAF callbacks per 3s before vs after slider moves and 3 redefinitions ----
    const T = globalThis.__rc5tTimers;
    if (!T) { note("timer counter not installed"); return out; }
    const rateOf = async () => { const a = T.fired; await sleep(3000); return T.fired - a; };
    const before = await rateOf(), iv0 = T.liveIntervals.size;
    for (const [inp, f] of [[lenIn, 0.9], [gIn, 0.8], [lenIn, 1.1], [gIn, 1.25], [lenIn, 1]]) {
      if (!inp) continue;
      const lo = +inp.min || 0, hi = +inp.max || 2 * +inp.value;
      setRange(inp, Math.min(hi, Math.max(lo, +inp.value * f)));
      await sleep(300);
    }
    const home = (userVars().find(v => v._value instanceof Element && (v._value.querySelector("svg,canvas") || v._value.matches("svg,canvas"))) || {})._module;
    const own = userVars().filter(v => v._module === home && v._type === 1 && typeof v._definition === "function" && v._inputs.every(i => i._name));
    const plan = own.map(v => [v, v._definition, [...v._inputs]]);
    const errs = [];
    for (let k = 0; k < 3; k++) {
      for (const [v, f, ins] of plan) {
        const prev = v._shadow;
        try { v._shadow = new Map(ins.map(i => [i._name, i])); v.define(v._name, ins.map(i => i._name), function (...a) { return f.apply(this, a); }); }
        catch (e) { errs.push(String(e).slice(0, 80)); }
        finally { v._shadow = prev; }
      }
      await sleep(700);
    }
    await sleep(1500);
    const after = await rateOf(), iv1 = T.liveIntervals.size;
    out.singleLoop = after <= 1.3 * before + 15 && iv1 - iv0 < 2;
    note("timer+rAF callbacks/3s " + before + " -> " + after + " after 5 slider moves and 3 redefinitions of " + own.length + " cells, live intervals " + iv0 + " -> " + iv1 + (errs.length ? ", errors " + errs[0] : ""));
    return out;
  } finally {
    for (const k of keepers) { try { k.delete(); } catch {} }
  }
})()
