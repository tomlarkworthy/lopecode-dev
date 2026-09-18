// reload the phone's suminagashi tab and time: response, DOMContentLoaded, runtime, canvas, first paint of the tray
const tabs = await (await fetch("http://localhost:9222/json")).json();
const tab = tabs.find((t: any) => t.url.includes("suminagashi"));
const ws = new WebSocket(tab.webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r));
let id = 0; const pending = new Map<number, (v: any) => void>();
ws.onmessage = (e) => { const m = JSON.parse(String(e.data)); if (m.id) { pending.get(m.id)?.(m.result ?? m.error); pending.delete(m.id); } };
const send = (method: string, params = {}) => new Promise<any>((r) => { pending.set(++id, r); ws.send(JSON.stringify({ id, method, params })); });
const evaluate = async (expression: string) => { const r = await send("Runtime.evaluate", { expression, returnByValue: true }); if (!r.result) console.log("eval:", JSON.stringify(r).slice(0, 120)); return r.result?.value; };
await send("Runtime.enable"); await send("Page.enable");
await send("Page.reload", { ignoreCache: true });
const t0 = Date.now(); const marks: Record<string, number> = {};
for (;;) {
  await new Promise((r) => setTimeout(r, 2000));
  const s = await evaluate(`(() => { const t = performance.timing; const rt = window.__ojs_runtime; let vars = 0, computed = 0; if (rt) for (const v of rt._variables) { vars++; if (v._value !== undefined) computed++; }
    return { response: t.responseEnd - t.navigationStart, dcl: t.domContentLoadedEventEnd - t.navigationStart, load: t.loadEventEnd - t.navigationStart, runtime: !!rt, vars, computed, canvas: !!document.querySelector("canvas"), tray: !!(rt && [...rt._variables].find(v => v._name === "tray" && v._value)) }; })()`).catch(() => null);
  if (!s) continue;
  console.log(((Date.now() - t0) / 1000).toFixed(1), JSON.stringify(s));
  const now = (Date.now() - t0) / 1000;
  for (const k of ["runtime", "canvas", "tray"]) if (s[k] && !(k in marks)) marks[k] = now;
  if (s.load > 0 && !("load" in marks)) { marks.response = s.response / 1000; marks.dcl = s.dcl / 1000; marks.load = s.load / 1000; }
  if (s.tray && now > 3) { console.log(JSON.stringify({ ...marks, vars: s.vars, computed: s.computed, wallToTray: now })); break; }
  if (now > 120) { console.log("timeout", JSON.stringify(s)); break; }
}
ws.close();
