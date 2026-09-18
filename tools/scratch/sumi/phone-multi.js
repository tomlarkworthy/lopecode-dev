(() => { try {
  const get = (n) => { for (const v of window.__ojs_runtime._variables) if (v._name === n) return v._value; };
  const gl = get("gl"), tray = get("tray"), painter = get("contourPainter"), c = document.querySelector("canvas");
  const multi = gl.getExtension("WEBGL_multi_draw"); const P = WebGL2RenderingContext.prototype;
  const count = () => { gl.bindFramebuffer(gl.FRAMEBUFFER, null); const px = new Uint8Array(c.width * c.height * 4); gl.readPixels(0, 0, c.width, c.height, gl.RGBA, gl.UNSIGNED_BYTE, px); let k = 0; for (let i = 0; i < px.length; i += 4) if (Math.abs(px[i] - 246) + Math.abs(px[i+1] - 241) + Math.abs(px[i+2] - 230) > 30) k++; return k; };
  const paint = () => { painter.paint(tray.contours, [0.965, 0.945, 0.9]); return count(); };
  const out = { normal: paint() };
  const origMulti = multi.multiDrawArraysWEBGL; const log = [];
  multi.multiDrawArraysWEBGL = function (mode, firsts, fo, counts, co, n) { log.push([firsts.constructor.name, fo, counts.constructor.name, co, n, firsts.length, counts.length, Array.from(counts.slice(0, 3))]); return origMulti.call(this, mode, firsts, fo, counts, co, n); };
  paint(); multi.multiDrawArraysWEBGL = origMulti; out.multiCalls = log.slice(0, 3); out.multiCallCount = log.length;
  multi.multiDrawArraysWEBGL = () => {}; out.withoutMulti = paint(); multi.multiDrawArraysWEBGL = origMulti;
  const origEl = P.drawElements; P.drawElements = () => {}; out.withoutCoarse = paint(); P.drawElements = origEl;
  // the same paint with the chunk fans drawn one by one instead of multi-draw
  multi.multiDrawArraysWEBGL = function (mode, firsts, fo, counts, co, n) { for (let i = 0; i < n; i++) gl.drawArrays(mode, firsts[fo + i], counts[co + i]); }; out.loopInsteadOfMulti = paint(); multi.multiDrawArraysWEBGL = origMulti;
  out.err = gl.getError();
  return JSON.stringify(out);
} catch (e) { return "ERR " + e.stack; } })()
