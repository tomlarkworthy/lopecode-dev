(() => { try {
  const c = document.createElement("canvas"); c.width = 64; c.height = 64;
  const gl = c.getContext("webgl2", { stencil: true, antialias: false, preserveDrawingBuffer: true });
  const sh = (t, s) => { const x = gl.createShader(t); gl.shaderSource(x, s); gl.compileShader(x); if (!gl.getShaderParameter(x, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(x)); return x; };
  const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, "#version 300 es\nlayout(location=0) in vec2 a; void main(){ gl_Position = vec4(a, 0.0, 1.0); }"));
  gl.attachShader(p, sh(gl.FRAGMENT_SHADER, "#version 300 es\nprecision highp float; out vec4 o; void main(){ o = vec4(1.0, 0.0, 0.0, 1.0); }")); gl.linkProgram(p); gl.useProgram(p);
  // a 12-gon, centre first, closing vertex repeated
  const N = 12; const v = [];
  for (let i = 0; i <= N; i++) { const t = 2 * Math.PI * i / N; v.push(0.8 * Math.cos(t), 0.8 * Math.sin(t)); }
  const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
  const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(v), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const idx = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idx); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array([0, 3, 6, 9]), gl.STATIC_DRAW);
  const count = () => { const px = new Uint8Array(64 * 64 * 4); gl.readPixels(0, 0, 64, 64, gl.RGBA, gl.UNSIGNED_BYTE, px); let n = 0; for (let i = 0; i < px.length; i += 4) if (px[i] > 128) n++; return n; };
  const out = {};
  const stencilFill = (draw) => { gl.clearColor(0, 0, 0, 1); gl.clearStencil(0); gl.clear(gl.COLOR_BUFFER_BIT | gl.STENCIL_BUFFER_BIT); gl.enable(gl.STENCIL_TEST);
    gl.colorMask(false, false, false, false); gl.stencilFunc(gl.ALWAYS, 0, 0xff); gl.stencilOpSeparate(gl.FRONT, gl.KEEP, gl.KEEP, gl.INCR_WRAP); gl.stencilOpSeparate(gl.BACK, gl.KEEP, gl.KEEP, gl.DECR_WRAP);
    draw();
    gl.colorMask(true, true, true, true); gl.stencilFunc(gl.NOTEQUAL, 0, 0xff); gl.stencilOp(gl.ZERO, gl.ZERO, gl.ZERO);
    gl.drawArrays(gl.TRIANGLE_FAN, 0, N + 1); gl.disable(gl.STENCIL_TEST); return count(); };
  gl.clear(gl.COLOR_BUFFER_BIT); gl.drawArrays(gl.TRIANGLE_FAN, 0, N + 1); out.plainFan = count();
  gl.clear(gl.COLOR_BUFFER_BIT); gl.drawElements(gl.TRIANGLE_FAN, 4, gl.UNSIGNED_INT, 0); out.elementsFanUint32 = count();
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 3, 6, 9]), gl.STATIC_DRAW);
  gl.clear(gl.COLOR_BUFFER_BIT); gl.drawElements(gl.TRIANGLE_FAN, 4, gl.UNSIGNED_SHORT, 0); out.elementsFanUint16 = count();
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array([0, 3, 6, 9]), gl.STATIC_DRAW);
  out.stencilFullFan = stencilFill(() => gl.drawArrays(gl.TRIANGLE_FAN, 0, N + 1));
  out.stencilChunks = stencilFill(() => { for (const f of [0, 3, 6, 9]) gl.drawArrays(gl.TRIANGLE_FAN, f, 4); });
  out.stencilChunksPlusCoarse = stencilFill(() => { for (const f of [0, 3, 6, 9]) gl.drawArrays(gl.TRIANGLE_FAN, f, 4); gl.drawElements(gl.TRIANGLE_FAN, 4, gl.UNSIGNED_INT, 0); });
  out.stencilCoarseOnly = stencilFill(() => gl.drawElements(gl.TRIANGLE_FAN, 4, gl.UNSIGNED_INT, 0));
  const multi = gl.getExtension("WEBGL_multi_draw");
  if (multi) { out.stencilMultiPlusCoarse = stencilFill(() => { multi.multiDrawArraysWEBGL(gl.TRIANGLE_FAN, new Int32Array([0, 3, 6, 9]), 0, new Int32Array([4, 4, 4, 4]), 0, 4); gl.drawElements(gl.TRIANGLE_FAN, 4, gl.UNSIGNED_INT, 0); });
    out.stencilMultiOnly = stencilFill(() => multi.multiDrawArraysWEBGL(gl.TRIANGLE_FAN, new Int32Array([0, 3, 6, 9]), 0, new Int32Array([4, 4, 4, 4]), 0, 4)); }
  out.err = gl.getError();
  return JSON.stringify(out);
} catch (e) { return "ERR " + e.stack; } })()
