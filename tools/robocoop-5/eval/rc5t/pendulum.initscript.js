(() => {
  // timer-callback counter for the single-loop check (as rc5t/analog-clock.mjs)
  const T = globalThis.__rc5tTimers = { fired: 0, raf: 0, liveIntervals: new Set() };
  const wrap = (fn, raf) => typeof fn === "function" ? function (...a) { T.fired++; if (raf) T.raf++; return fn.apply(this, a); } : fn;
  const si = globalThis.setInterval, ci = globalThis.clearInterval, raf = globalThis.requestAnimationFrame;
  globalThis.setInterval = function (fn, ms, ...a) { const id = si.call(this, wrap(fn), ms, ...a); T.liveIntervals.add(id); return id; };
  globalThis.clearInterval = function (id) { T.liveIntervals.delete(id); return ci.call(this, id); };
  if (raf) globalThis.requestAnimationFrame = function (fn) { return raf.call(this, wrap(fn, true)); };
  // canvas 2D recorder: the shapes and arcs of the current frame (since the last full clear)
  const C = globalThis.CanvasRenderingContext2D && CanvasRenderingContext2D.prototype;
  if (C) {
    const st = (ctx) => ctx.__rc5t || (ctx.__rc5t = { shapes: [], arcs: [], cur: null, frame: 0 });
    const pt = (ctx, x, y) => { const m = ctx.getTransform(); return { x: m.a * x + m.c * y + m.e, y: m.b * x + m.d * y + m.f }; };
    const cur = (ctx) => { const s = st(ctx); if (!s.cur) { s.cur = []; s.shapes.push(s.cur); } return s.cur; };
    const reset = (ctx, w, h) => { if (Math.abs(w * h) >= 0.8 * ctx.canvas.width * ctx.canvas.height) { const s = st(ctx); s.shapes = []; s.arcs = []; s.cur = null; s.frame++; } };
    const patch = (name, f) => { const o = C[name]; C[name] = function (...a) { try { f(this, ...a); } catch {} return o.apply(this, a); }; };
    patch("beginPath", (ctx) => { st(ctx).cur = null; });
    patch("moveTo", (ctx, x, y) => { st(ctx).cur = null; cur(ctx).push(pt(ctx, x, y)); });
    patch("lineTo", (ctx, x, y) => cur(ctx).push(pt(ctx, x, y)));
    patch("fillRect", (ctx, x, y, w, h) => reset(ctx, w, h));
    patch("clearRect", (ctx, x, y, w, h) => reset(ctx, w, h));
    patch("arc", (ctx, x, y, r) => { const m = ctx.getTransform(); const c = pt(ctx, x, y); st(ctx).arcs.push({ ...c, r: r * Math.hypot(m.a, m.b) }); });
    patch("ellipse", (ctx, x, y, rx) => { const m = ctx.getTransform(); const c = pt(ctx, x, y); st(ctx).arcs.push({ ...c, r: rx * Math.hypot(m.a, m.b) }); });
    globalThis.__rc5tCanvasFrame = (canvas) => { const ctx = canvas.__rc5tCtx; return ctx && ctx.__rc5t; };
    const gc = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (kind, ...a) { const ctx = gc.call(this, kind, ...a); if (kind === "2d" && ctx) this.__rc5tCtx = ctx; return ctx; };
  }
})();
