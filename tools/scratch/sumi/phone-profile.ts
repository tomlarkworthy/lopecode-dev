// CPU-profile the phone's boot of the suminagashi tab; prints the top self-time functions
const tabs = await (await fetch("http://localhost:9222/json")).json();
const tab = tabs.find((t: any) => t.url.includes("suminagashi"));
const ws = new WebSocket(tab.webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r));
let id = 0; const pending = new Map<number, (v: any) => void>();
ws.onmessage = (e) => { const m = JSON.parse(String(e.data)); if (m.id) { pending.get(m.id)?.(m.result ?? m.error); pending.delete(m.id); } };
const send = (method: string, params = {}) => new Promise<any>((r) => { pending.set(++id, r); ws.send(JSON.stringify({ id, method, params })); });
await send("Runtime.enable"); await send("Page.enable"); await send("Profiler.enable");
await send("Profiler.setSamplingInterval", { interval: 2000 });
await send("Profiler.start");
await send("Page.reload", { ignoreCache: true });
const t0 = Date.now();
for (;;) { await new Promise((r) => setTimeout(r, 3000));
  const r = await send("Runtime.evaluate", { expression: `!!(window.__ojs_runtime && [...window.__ojs_runtime._variables].find(v => v._name === "tray" && v._value))`, returnByValue: true });
  if (r.result?.value || Date.now() - t0 > 150000) break; }
const wall = (Date.now() - t0) / 1000;
const { profile } = await send("Profiler.stop");
const byId = new Map(profile.nodes.map((n: any) => [n.id, n]));
const parent = new Map<number, number>(); for (const n of profile.nodes) for (const c of n.children || []) parent.set(c, n.id);
const self = new Map<string, number>(), total = new Map<string, number>();
const dt = profile.timeDeltas; const samples = profile.samples;
const key = (n: any) => `${n.callFrame.functionName || "(anon)"} ${(n.callFrame.url || "").split("/").pop().slice(0, 40)}:${n.callFrame.lineNumber}`;
for (let i = 0; i < samples.length; i++) { const ms = (dt[i] || 0) / 1000; const n = byId.get(samples[i]); self.set(key(n), (self.get(key(n)) || 0) + ms);
  const seen = new Set<string>(); for (let p = samples[i]; p !== undefined; p = parent.get(p)) { const k = key(byId.get(p)); if (seen.has(k)) continue; seen.add(k); total.set(k, (total.get(k) || 0) + ms); } }
const top = (m: Map<string, number>) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 18).map(([k, v]) => `${(v / 1000).toFixed(1).padStart(6)} s  ${k}`).join("\n");
console.log(`wall to tray ${wall.toFixed(1)} s, profiled ${((profile.endTime - profile.startTime) / 1e6).toFixed(1)} s\n== self\n${top(self)}\n== total\n${top(total)}`);
ws.close();
