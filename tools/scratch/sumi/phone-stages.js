(async () => { try {
  const get = (n) => { for (const v of window.__ojs_runtime._variables) if (v._name === n) return v._value; };
  const gl = get("gl"), ctx = get("ctx"), programs = get("programs"), d = get("defaults");
  const target = (w, h) => { const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex); gl.texStorage2D(gl.TEXTURE_2D, 1, ctx.format.internal, w, h);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const fbo = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fbo); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0); gl.clearBufferfv(gl.COLOR, 0, [0, 0, 0, 0]); return { tex, fbo, size: [w, h] }; };
  const read = (t) => { gl.bindFramebuffer(gl.FRAMEBUFFER, t.fbo); const a = new Float32Array(t.size[0] * t.size[1] * 4); gl.readPixels(0, 0, t.size[0], t.size[1], gl.RGBA, gl.FLOAT, a); return a; };
  const stat = (t) => { const a = read(t); const r = []; for (let ch = 0; ch < 2; ch++) { let nan = 0, sum = 0, max = -Infinity; for (let i = ch; i < a.length; i += 4) { const v = a[i]; if (Number.isNaN(v)) nan++; else { sum += v; max = Math.max(max, Math.abs(v)); } } r.push({ nan, sum: +sum.toFixed(3), max: +max.toPrecision(3) }); } return r; };
  const out = [];
  for (const [w, h] of [[200, 200], [256, 256]]) {
    const size = [w, h];
    const filmA = target(w, h), filmB = target(w, h); gl.bindFramebuffer(gl.FRAMEBUFFER, filmA.fbo); gl.clearBufferfv(gl.COLOR, 0, [0, 0, 0, 0.1]);
    const means = []; for (let lw = w, lh = h; lw > 1 || lh > 1; ) { lw = Math.ceil(lw / 8); lh = Math.ceil(lh / 8); means.push(target(lw, lh)); }
    const total = (source, isFilm) => { means.forEach((level, i) => { const both = isFilm && i === 0; programs.run(programs.reduce, level.fbo, level.size, { uSource: both ? filmA : source, uSourceB: both ? filmB : source, uSourceSize: source.size, uFilm: both ? 1 : 0 }); source = level; }); return source; };
    const v0 = target(w, h), v1 = target(w, h), force = target(w, h), scratch = target(w, h), rhs = target(w, h), p0 = target(w, h), p1 = target(w, h), v2 = target(w, h);
    const row = { size };
    programs.run(programs.confinement, force.fbo, size, { uVelocity: v0, uSize: size }); row.force = stat(force);
    programs.run(programs.velocity, v1.fbo, size, { uVelocity: v0, uForce: force, uSize: size, uDt: d.dt, uDrag: d.drag, uViscosity: d.viscosity, uCurl: d.curl, uStrokeFrom: [0, 0], uStrokeTo: [0, 0], uStrokeVelocity: [0, 0], uStrokeRadius: 1, uStrokeStrength: 0 }); row.velocity = stat(v1);
    const tf = total({ size, tex: filmA.tex }, true); row.filmTotal = stat(tf);
    programs.run(programs.divergence, scratch.fbo, size, { uVelocity: v1, uFilm: filmA, uFilmB: filmB, uTotal: tf, uSize: size, uStiffness: d.stiffness / d.dt }); row.divergence = stat(scratch);
    const ts = total(scratch); row.divTotal = stat(ts);
    programs.run(programs.shift, rhs.fbo, size, { uSource: scratch, uTotal: ts, uSize: size }); row.rhs = stat(rhs);
    const tp = total(p0); programs.run(programs.shift, p1.fbo, size, { uSource: p0, uTotal: tp, uSize: size }); row.pShift = stat(p1);
    programs.run(programs.project, v2.fbo, size, { uVelocity: v1, uPressure: p1, uSize: size, uMaxSpeed: 0.4 * d.transportSteps / d.dt }); row.project = stat(v2);
    programs.run(programs.pressure, p0.fbo, size, { uPressure: p1, uRhs: rhs, uSize: size, uH2: 1 }); row.smooth1 = stat(p0);
    row.err = gl.getError();
    out.push(row);
  }
  return JSON.stringify(out);
} catch (e) { return "ERR " + e.stack; } })()
