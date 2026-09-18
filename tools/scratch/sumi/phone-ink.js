(async () => { try {
  const get = (n) => { for (const v of window.__ojs_runtime._variables) if (v._name === n) return v._value; };
  const gl = get("gl") || get("ctx").gl || get("ctx"), tray = get("tray"), c = document.querySelector("canvas");
  const attrs = gl.getContextAttributes();
  const b = c.getBoundingClientRect();
  const ev = (type, x, y) => c.dispatchEvent(new PointerEvent(type, { pointerId: 1, pointerType: "touch", isPrimary: true, clientX: b.left + x, clientY: b.top + y, bubbles: true }));
  ev("pointerdown", b.width / 2, b.height / 2); await new Promise(r => setTimeout(r, 800)); ev("pointerup", b.width / 2, b.height / 2);
  await new Promise(r => setTimeout(r, 2500));
  const count = () => { gl.bindFramebuffer(gl.FRAMEBUFFER, null); const px = new Uint8Array(c.width * c.height * 4); gl.readPixels(0, 0, c.width, c.height, gl.RGBA, gl.UNSIGNED_BYTE, px);
    let inked = 0, black = 0; for (let i = 0; i < px.length; i += 4) { if (px[i] + px[i+1] + px[i+2] === 0) black++; else if (Math.abs(px[i] - 246) + Math.abs(px[i+1] - 241) + Math.abs(px[i+2] - 230) > 30) inked++; } return { inked, black }; };
  get("contourPainter").paint(tray.contours, [0.965, 0.945, 0.9]); const lines = count();
  tray.render({ absorb: get("absorbance"), strength: get("params").inkStrength, paper: [0.965, 0.945, 0.9], view: 0 }); const print = count();
  return JSON.stringify({ stencil: attrs.stencil, stencilBits: gl.getParameter(gl.STENCIL_BITS), antialias: attrs.antialias, samples: gl.getParameter(gl.SAMPLES), lost: gl.isContextLost(), glError: gl.getError(), vertices: tray.contours.count(), curves: tray.contours.curves.length, lines, print, multiDraw: !!gl.getExtension("WEBGL_multi_draw") });
} catch (e) { return "ERR " + e.stack; } })()
