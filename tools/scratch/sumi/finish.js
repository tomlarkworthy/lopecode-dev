(async () => { const get = (n) => { for (const v of window.__ojs_runtime._variables) if (v._name === n) return v._value; };
 const t0 = performance.now(); while (!get("finished") && performance.now() - t0 < 15000) await new Promise(r => setTimeout(r, 200));
 const before = { waited: Math.round(performance.now() - t0), finished: get("finished"), vertices: get("tray").contours.count(), turn: get("turn"), note: document.body.innerText.match(/The picture is finished[^\n]*/)?.[0] };
 document.querySelector("canvas").dispatchEvent(new PointerEvent("pointerdown", { pointerId: 1, bubbles: true }));
 await new Promise(r => setTimeout(r, 1500));
 return { before, after: { finished: get("finished"), vertices: get("tray").contours.count(), turn: get("turn") } }; })()
