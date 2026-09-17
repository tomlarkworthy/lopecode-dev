(async () => { let blob, name; const make = URL.createObjectURL; URL.createObjectURL = (b) => { blob = b; return make.call(URL, b); };
 const click = HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click = function () { name = this.download; };
 const measure = async (redraw) => { blob = undefined;
  const button = [...document.querySelectorAll("button")].find((b) => b.textContent === "download png");
  if (!redraw) { const t = [...window.__ojs_runtime._variables].find((v) => v._name === "tray")._value; var keep = t.repaint; t.repaint = undefined; }
  await new Promise((r) => setTimeout(r, 300)); button.click(); if (!redraw) [...window.__ojs_runtime._variables].find((v) => v._name === "tray")._value.repaint = keep;
  const t0 = performance.now(); while (!blob && performance.now() - t0 < 5000) await new Promise((r) => setTimeout(r, 50));
  const bitmap = await createImageBitmap(blob); const c = new OffscreenCanvas(bitmap.width, bitmap.height); const g = c.getContext("2d"); g.drawImage(bitmap, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height).data; let inked = 0, black = 0;
  for (let i = 0; i < d.length; i += 4) { if (d[i] + d[i + 1] + d[i + 2] === 0) black++; else if (Math.abs(d[i] - 246) + Math.abs(d[i + 1] - 241) + Math.abs(d[i + 2] - 230) > 30) inked++; }
  return { name, type: blob.type, bytes: blob.size, size: [bitmap.width, bitmap.height], inked, black, pixels: d.length / 4 }; };
 const withRedraw = await measure(true); const without = await measure(false);
 URL.createObjectURL = make; HTMLAnchorElement.prototype.click = click; return { withRedraw, without }; })()
