(() => { try {
  const get = (n) => { for (const v of window.__ojs_runtime._variables) if (v._name === n) return v._value; };
  const gl = get("gl"), tray = get("tray"), contours = tray.contours, c = document.querySelector("canvas");
  const sh = (t, s) => { const x = gl.createShader(t); gl.shaderSource(x, s); gl.compileShader(x); if (!gl.getShaderParameter(x, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(x)); return x; };
  const link = (v, f, captured) => { const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, v)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, f)); if (captured) gl.transformFeedbackVaryings(p, captured, gl.SEPARATE_ATTRIBS); gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p)); return p; };
  const p = link(get("contourVertexShader"), get("contourFragmentShader"));
  const copy = link("#version 300 es\nlayout(location=0) in vec2 aPosition; out vec2 vPosition; void main(){ vPosition = aPosition; gl_Position = vec4(0.0,0.0,0.0,1.0); }", get("contourFragmentShader"), ["vPosition"]);
  const at = (n) => gl.getUniformLocation(p, n);
  const { packed, n, box } = contours.pack(0);
  const side = () => { const buffer = gl.createBuffer(); const vao = gl.createVertexArray(); gl.bindVertexArray(vao); gl.bindBuffer(gl.ARRAY_BUFFER, buffer); gl.bufferData(gl.ARRAY_BUFFER, 4 * 2 * packed.length, gl.DYNAMIC_COPY); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0); return { buffer, vao }; };
  const sides = [side(), side()]; gl.bindVertexArray(null);
  gl.bindBuffer(gl.ARRAY_BUFFER, sides[0].buffer); gl.bufferSubData(gl.ARRAY_BUFFER, 0, packed);
  const CHUNK = 32, chunks = Math.ceil(n / CHUNK);
  const firsts = Int32Array.from({ length: chunks }, (_, k) => k * CHUNK), counts = Int32Array.from({ length: chunks }, (_, k) => Math.min(CHUNK, n - k * CHUNK) + 1);
  const multi = gl.getExtension("WEBGL_multi_draw");
  const count = () => { const px = new Uint8Array(c.width * c.height * 4); gl.readPixels(0, 0, c.width, c.height, gl.RGBA, gl.UNSIGNED_BYTE, px); let k = 0; for (let i = 0; i < px.length; i += 4) if (px[i] > 128) k++; return k; };
  const fill = (vao, draw) => { gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, c.width, c.height); gl.useProgram(p); gl.bindVertexArray(vao);
    gl.uniform2f(at("uSize"), contours.width, contours.height); gl.uniform3f(at("uColor"), 1, 0, 0);
    gl.clearColor(0, 0, 0, 1); gl.clearStencil(0); gl.clear(gl.COLOR_BUFFER_BIT | gl.STENCIL_BUFFER_BIT); gl.enable(gl.STENCIL_TEST);
    gl.colorMask(false, false, false, false); gl.stencilFunc(gl.ALWAYS, 0, 0xff); gl.stencilOpSeparate(gl.FRONT, gl.KEEP, gl.KEEP, gl.INCR_WRAP); gl.stencilOpSeparate(gl.BACK, gl.KEEP, gl.KEEP, gl.DECR_WRAP);
    gl.uniform1i(at("uCover"), 0); draw();
    gl.colorMask(true, true, true, true); gl.stencilFunc(gl.NOTEQUAL, 0, 0xff); gl.stencilOp(gl.ZERO, gl.ZERO, gl.ZERO);
    gl.uniform4f(at("uBox"), box[0] - 2, box[1] - 2, box[2] + 2, box[3] + 2); gl.uniform1i(at("uCover"), 1); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.disable(gl.STENCIL_TEST); gl.bindVertexArray(null); return count(); };
  const loop = () => firsts.forEach((f, k) => gl.drawArrays(gl.TRIANGLE_FAN, f, counts[k]));
  const md = () => multi.multiDrawArraysWEBGL(gl.TRIANGLE_FAN, firsts, 0, counts, 0, chunks);
  const out = { n, chunks, uploaded: { loop: fill(sides[0].vao, loop), multi: fill(sides[0].vao, md) } };
  // copy side 0 to side 1 through transform feedback, as advect does
  const tf = gl.createTransformFeedback();
  gl.useProgram(copy); gl.bindVertexArray(sides[0].vao); gl.bindBuffer(gl.ARRAY_BUFFER, null);
  gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, tf); gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, sides[1].buffer);
  gl.enable(gl.RASTERIZER_DISCARD); gl.beginTransformFeedback(gl.POINTS); gl.drawArrays(gl.POINTS, 0, packed.length / 2); gl.endTransformFeedback(); gl.disable(gl.RASTERIZER_DISCARD);
  gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, null); gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null); gl.bindVertexArray(null);
  out.afterFeedback = { loop: fill(sides[1].vao, loop), multi: fill(sides[1].vao, md) };
  // and once more with the feedback buffer left bound at index 0 the whole time
  gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, sides[1].buffer);
  out.feedbackStillBound = { loop: fill(sides[1].vao, loop), multi: fill(sides[1].vao, md) };
  gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, null);
  out.err = gl.getError();
  return JSON.stringify(out);
} catch (e) { return "ERR " + e.stack; } })()
