// Raw CDP over browser.cdp, with no library: buy time, connect, one command, one event, round-trip times.
import { session, call, save, HOST, P } from "./lib.ts";
const name = process.argv[2] || "ws", out: any = {};
const post = async (m: string, body: any = {}, q = "") => { const r = await fetch(`https://${HOST}/xrpc/${P}browser.${m}${q}`, { method: "POST", headers: { authorization: "Bearer " + session, "content-type": "application/json" }, body: JSON.stringify(body) }); return { status: r.status, body: await r.json().catch(() => null) }; };
// No time: the upgrade is refused.
const refused = await fetch(`https://${HOST}/xrpc/${P}browser.cdp?browser=${name}-none`, { headers: { authorization: "Bearer " + session } });
out.noUpgrade = [refused.status, (await refused.json()).error];
out.noTime = await new Promise((done) => { const w = new (WebSocket as any)(`wss://${HOST}/xrpc/${P}browser.cdp?browser=${name}-none`, { headers: { authorization: "Bearer " + session } }); w.onopen = () => done("opened"); w.onerror = (e: any) => done(String(e.message || e.type).slice(-60)); });
out.extend = (await post("extend", {}, `?browser=${name}&seconds=${process.argv[3] || 60}`)).body;
const t0 = performance.now();
const ws = new (WebSocket as any)(`wss://${HOST}/xrpc/${P}browser.cdp?browser=${name}`, { headers: { authorization: "Bearer " + session } });
let id = 0; const waiting = new Map<number, (m: any) => void>(), events: any[] = [];
ws.onmessage = (e: any) => { const m = JSON.parse(e.data); if (m.id && waiting.has(m.id)) waiting.get(m.id)!(m); else events.push(m); };
const send = (method: string, params: any = {}, sessionId?: string) => new Promise<any>((done) => { const i = ++id; waiting.set(i, (m) => done(m.result || m)); ws.send(JSON.stringify({ id: i, method, params, sessionId })); });
await new Promise((ok, no) => { ws.onopen = ok; ws.onerror = (e: any) => no(new Error(String(e.message || e.type))); });
out.connectMs = Math.round(performance.now() - t0);
out.version = (await send("Browser.getVersion")).product;
const { targetId } = await send("Target.createTarget", { url: "about:blank" });
const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
await send("Page.enable", {}, sessionId);
await send("Network.enable", {}, sessionId);
await send("Page.navigate", { url: "https://example.com/" }, sessionId);
const until = Date.now() + 8000;
while (!events.some((e) => e.method === "Page.loadEventFired") && Date.now() < until) await new Promise((r) => setTimeout(r, 50));
out.events = [...new Set(events.map((e) => e.method))].slice(0, 12);
out.title = (await send("Runtime.evaluate", { expression: "document.title", returnByValue: true }, sessionId)).result.value;
// Round trips: one command through the socket against one browser.eval call.
const rt: number[] = [];
for (let i = 0; i < 40; i++) { const t = performance.now(); await send("Runtime.evaluate", { expression: "1+1", returnByValue: true }, sessionId); rt.push(performance.now() - t); }
const p50 = (a: number[]) => Math.round([...a].sort((x, y) => x - y)[Math.floor(a.length / 2)] * 10) / 10;
out.socketP50 = p50(rt);
await post("open", { name: "p", url: "https://example.com/", browser: name });
const ev: number[] = [];
for (let i = 0; i < 12; i++) { const t = performance.now(); await post("eval", { name: "p", expression: "1+1", browser: name }); ev.push(performance.now() - t); }
out.evalP50 = p50(ev);
// The per-call methods work beside the open socket; the socket sees the tab they made.
out.targets = (await send("Target.getTargets")).targetInfos.filter((t: any) => t.type === "page").length;
const shot = await send("Page.captureScreenshot", { format: "png" }, sessionId);
out.shotChars = shot.data.length;
if (process.argv[4] === "stay") {
  // Stay connected until the socket is cut; extend once on the way.
  const paid = out.extend.paidUntil; out.paidUntil = paid;
  if (process.argv[5] === "extend") setTimeout(async () => { out.extended = (await post("extend", {}, `?browser=${name}&seconds=30`)).body.paidUntil; }, 5000);
  const cut: any = await new Promise((done) => { ws.onclose = (e: any) => done({ code: e.code, reason: e.reason, at: Date.now() }); });
  out.cut = cut; out.cutAfterPaidMs = cut.at - (out.extended || paid);
} else { ws.close(1000, "done"); out.closeAll = (await post("close", { all: true, browser: name })).status; }
save("cdp-raw", out);
console.log(JSON.stringify(out, null, 1));
process.exit(0);
