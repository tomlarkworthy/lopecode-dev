(async () => { const get = (n) => { for (const v of window.__ojs_runtime._variables) if (v._name === n) return v._value; };
 const sleep = (ms) => new Promise(r => setTimeout(r, ms)); const cv = document.querySelector("canvas");
 const at = (x, y) => ({ pointerId: 1, bubbles: true, clientX: cv.getBoundingClientRect().left + x, clientY: cv.getBoundingClientRect().top + y });
 const drop = async (x, y, ms) => { cv.dispatchEvent(new PointerEvent("pointerdown", at(x, y))); await sleep(ms); cv.dispatchEvent(new PointerEvent("pointerup", at(x, y))); await sleep(250); };
 const stroke = async (x1, y1, x2, y2) => { cv.dispatchEvent(new PointerEvent("pointerdown", at(x1, y1))); let frames = 0; const t0 = performance.now();
   for (let k = 1; k <= 60; k++) { cv.dispatchEvent(new PointerEvent("pointermove", at(x1 + (x2 - x1) * k / 60, y1 + (y2 - y1) * k / 60))); await new Promise(r => requestAnimationFrame(r)); frames++; }
   cv.dispatchEvent(new PointerEvent("pointerup", at(x2, y2))); const fps = frames / ((performance.now() - t0) / 1000); await sleep(400); return Math.round(fps); };
 const tool = (name) => [...document.querySelectorAll("label")].find(l => l.textContent.trim() === name).click();
 const out = {};
 for (let round = 0; round < 4; round++) {
   tool("brush"); await sleep(100);
   for (let k = 0; k < 12; k++) await drop(480, 285, 220);
   tool("blow"); await sleep(100);
   const fps = []; for (const s of [[250,420,700,150],[750,430,300,200],[480,80,480,500],[300,285,660,285]]) { if (get("finished")) break; fps.push(await stroke(...s)); }
   let n = 0; const w0 = performance.now(); while (performance.now() - w0 < 5000 && !get("finished")) { await new Promise(r => requestAnimationFrame(r)); n++; } const windFps = Math.round(n / ((performance.now() - w0) / 1000));
   const tray = get("tray"); const t0 = performance.now(); for (let i = 0; i < 30; i++) tray.step(); tray.read("pressure");
   out["round" + round] = { strokeFps: fps, windFps, vertices: tray.contours.count(), finished: get("finished") ? get("finished").why : false, ms30steps: Math.round(performance.now() - t0), heapMB: Math.round(performance.memory.usedJSHeapSize / 1e6) };
   if (get("finished")) { await sleep(2300); cv.dispatchEvent(new PointerEvent("pointerdown", at(10, 10))); cv.dispatchEvent(new PointerEvent("pointerup", at(10, 10))); } else [...document.querySelectorAll("button")].find(b => /empty the tray/.test(b.textContent)).click();
   await sleep(1200); out["round" + round].afterReset = { vertices: get("tray").contours.count(), finished: !!get("finished") };
 }
 return out; })()
