(async () => { try {
  const get = (n) => { for (const v of window.__ojs_runtime._variables) if (v._name === n) return v._value; };
  const gl = get("gl"), ctx = get("ctx"), programs = get("programs");
  const target = (w, h) => { const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex); gl.texStorage2D(gl.TEXTURE_2D, 1, ctx.format.internal, w, h);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    const fbo = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fbo); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0); gl.clearBufferfv(gl.COLOR, 0, [0, 0, 0, 0]); return { tex, fbo, size: [w, h] }; };
  const read = (t) => { gl.bindFramebuffer(gl.FRAMEBUFFER, t.fbo); const a = new Float32Array(t.size[0] * t.size[1] * 4); gl.readPixels(0, 0, t.size[0], t.size[1], gl.RGBA, gl.FLOAT, a); return a; };
  const stat = (a) => { let nan = 0, sum = 0, min = Infinity, max = -Infinity; for (let i = 0; i < a.length; i += 4) { const v = a[i]; if (Number.isNaN(v)) nan++; else { sum += v; min = Math.min(min, v); max = Math.max(max, v); } } return { nan, sum: +sum.toFixed(2), min, max }; };
  const out = [];
  for (const [w, h] of [[128, 96], [200, 200], [256, 256]]) {
    let source = target(w, h); gl.bindFramebuffer(gl.FRAMEBUFFER, source.fbo); gl.clearBufferfv(gl.COLOR, 0, [0.1, 0, 0, 1]);
    const row = { size: [w, h], levels: [] };
    for (let lw = w, lh = h; lw > 1 || lh > 1; ) { lw = Math.ceil(lw / 8); lh = Math.ceil(lh / 8); const level = target(lw, lh);
      programs.run(programs.reduce, level.fbo, level.size, { uSource: source, uSourceB: source, uSourceSize: source.size, uFilm: 0 });
      row.levels.push({ size: [lw, lh], ...stat(read(level)), err: gl.getError() }); source = level; }
    out.push(row);
  }
  return JSON.stringify(out);
} catch (e) { return "ERR " + e.stack; } })()
