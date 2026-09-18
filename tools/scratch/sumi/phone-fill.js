(() => { try {
  const get = (n) => { for (const v of window.__ojs_runtime._variables) if (v._name === n) return v._value; };
  const gl = get("gl"), tray = get("tray"), contours = tray.contours, c = document.querySelector("canvas");
  const sh = (t, s) => { const x = gl.createShader(t); gl.shaderSource(x, s); gl.compileShader(x); if (!gl.getShaderParameter(x, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(x)); return x; };
  const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, get("contourVertexShader"))); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, get("contourFragmentShader"))); gl.linkProgram(p);
  const at = (n) => gl.getUniformLocation(p, n);
  const { packed, n, box } = contours.pack(0);
  const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
  const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, packed, gl.DYNAMIC_COPY);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const CHUNK = 32, chunks = Math.ceil(n / CHUNK);
  const firsts = Int32Array.from({ length: chunks }, (_, k) => k * CHUNK), counts = Int32Array.from({ length: chunks }, (_, k) => Math.min(CHUNK, n - k * CHUNK) + 1);
  const idx = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idx); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, Uint32Array.from(firsts), gl.DYNAMIC_DRAW);
  const multi = gl.getExtension("WEBGL_multi_draw");
  const count = () => { const px = new Uint8Array(c.width * c.height * 4); gl.readPixels(0, 0, c.width, c.height, gl.RGBA, gl.UNSIGNED_BYTE, px); let k = 0; for (let i = 0; i < px.length; i += 4) if (px[i] > 128) k++; return k; };
  const fill = (draw) => { gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, c.width, c.height); gl.useProgram(p); gl.bindVertexArray(vao);
    gl.uniform2f(at("uSize"), contours.width, contours.height); gl.uniform3f(at("uColor"), 1, 0, 0);
    gl.clearColor(0, 0, 0, 1); gl.clearStencil(0); gl.clear(gl.COLOR_BUFFER_BIT | gl.STENCIL_BUFFER_BIT); gl.enable(gl.STENCIL_TEST);
    gl.colorMask(false, false, false, false); gl.stencilFunc(gl.ALWAYS, 0, 0xff); gl.stencilOpSeparate(gl.FRONT, gl.KEEP, gl.KEEP, gl.INCR_WRAP); gl.stencilOpSeparate(gl.BACK, gl.KEEP, gl.KEEP, gl.DECR_WRAP);
    gl.uniform1i(at("uCover"), 0); draw();
    gl.colorMask(true, true, true, true); gl.stencilFunc(gl.NOTEQUAL, 0, 0xff); gl.stencilOp(gl.ZERO, gl.ZERO, gl.ZERO);
    gl.uniform4f(at("uBox"), box[0] - 2, box[1] - 2, box[2] + 2, box[3] + 2); gl.uniform1i(at("uCover"), 1); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.disable(gl.STENCIL_TEST); return count(); };
  const out = { n, chunks, plainFan: fill(() => gl.drawArrays(gl.TRIANGLE_FAN, 0, n + 1)) };
  out.loopChunksPlusCoarse = fill(() => { firsts.forEach((f, k) => gl.drawArrays(gl.TRIANGLE_FAN, f, counts[k])); if (chunks > 2) gl.drawElements(gl.TRIANGLE_FAN, chunks, gl.UNSIGNED_INT, 0); });
  out.loopChunksOnly = fill(() => firsts.forEach((f, k) => gl.drawArrays(gl.TRIANGLE_FAN, f, counts[k])));
  if (multi) { out.multiPlusCoarse = fill(() => { multi.multiDrawArraysWEBGL(gl.TRIANGLE_FAN, firsts, 0, counts, 0, chunks); if (chunks > 2) gl.drawElements(gl.TRIANGLE_FAN, chunks, gl.UNSIGNED_INT, 0); });
    out.multiOnly = fill(() => multi.multiDrawArraysWEBGL(gl.TRIANGLE_FAN, firsts, 0, counts, 0, chunks)); }
  out.coarseOnly = fill(() => gl.drawElements(gl.TRIANGLE_FAN, chunks, gl.UNSIGNED_INT, 0));
  out.err = gl.getError();
  gl.deleteVertexArray(vao); gl.deleteBuffer(b); gl.deleteBuffer(idx); gl.deleteProgram(p);
  return JSON.stringify(out);
} catch (e) { return "ERR " + e.stack; } })()
