// Read the notebook tab in Chrome on the phone over raw CDP:
//   adb forward tcp:9222 localabstract:chrome_devtools_remote
const arg = (n: string, d?: string) => { const i = process.argv.indexOf(n); return i < 0 ? d : process.argv[i + 1]; };
const tabs = await (await fetch("http://localhost:9222/json")).json();
const tab = tabs.find((t: any) => t.url.includes(arg("--tab", "suminagashi")));
if (!tab) { console.log("no such tab"); process.exit(1); }
const ws = new WebSocket(tab.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0; const pending = new Map<number, (v: any) => void>(); const log: string[] = [];
ws.onmessage = (e) => { const m = JSON.parse(String(e.data));
  if (m.id) { pending.get(m.id)?.(m.result ?? m.error); pending.delete(m.id); return; }
  if (m.method === "Runtime.consoleAPICalled" && ["error", "warning"].includes(m.params.type)) log.push(`${m.params.type}: ${m.params.args.map((a: any) => a.value ?? a.description ?? "").join(" ").slice(0, 500)}`);
  if (m.method === "Runtime.exceptionThrown") log.push(`exception: ${(m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text).slice(0, 500)}`);
  if (m.method === "Log.entryAdded" && m.params.entry.level === "error") log.push(`log: ${m.params.entry.text.slice(0, 500)}`); };
const send = (method: string, params = {}) => new Promise<any>((r) => { pending.set(++id, r); ws.send(JSON.stringify({ id, method, params })); });
const evaluate = async (expression: string) => { const r = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true }); return r.result?.value ?? r; };
await send("Runtime.enable"); await send("Log.enable"); await send("Page.enable");
const url = arg("--url");
if (url) await send("Page.navigate", { url });
else if (!process.argv.includes("--noreload")) await send("Page.reload", { ignoreCache: true });
await new Promise((r) => setTimeout(r, +(arg("--wait", "10000") as string)));
const info = await evaluate(`(() => {
  const rt = window.__ojs_runtime;
  const get = (n) => { if (rt) for (const v of rt._variables) if (v._name === n) return v; };
  const c = document.querySelector("canvas");
  const gl = c && c.getContext("webgl2");
  const dbg = gl && gl.getExtension("WEBGL_debug_renderer_info");
  const errs = [];
  if (rt) for (const v of rt._variables) if (v._value instanceof Error) errs.push(v._name + ": " + String(v._value).slice(0, 300));
  const ok = (n) => { const v = get(n); return v ? (v._value instanceof Error ? "ERR" : v._value === undefined ? "pending" : "ok") : "none"; };
  return { ua: navigator.userAgent, dpr: devicePixelRatio, screen: [innerWidth, innerHeight], runtime: !!rt, canvas: c ? [c.width, c.height] : null,
    renderer: dbg && gl ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : null, rgba32f: gl ? !!gl.getExtension("EXT_color_buffer_float") : null,
    cells: Object.fromEntries(["ctx", "tray", "contourPainter", "mainLoop", "canvas"].map((n) => [n, ok(n)])), errs,
    finished: get("finished")?._value, vertices: get("tray")?._value?.contours?.count?.(), text: document.body.innerText.slice(0, 300) };
})()`);
const custom = arg("--eval"); const extra = custom ? await evaluate(custom) : undefined;
console.log(JSON.stringify({ info, log, extra }, null, 1));
if (process.argv.includes("--shot")) { const r = await send("Page.captureScreenshot", { format: "png" }); await Bun.write(arg("--shot") as string, Buffer.from(r.data, "base64")); }
ws.close();
