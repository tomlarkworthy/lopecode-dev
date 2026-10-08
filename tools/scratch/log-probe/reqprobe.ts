// What does Cloudflare attach to a custom log line with invocation_logs off? bun reqprobe.ts up|down|hit|read
import { api, account, save, query } from "./lib.ts";
const NAME = "cbx-logprobe";
const a = await account();
const S = `/accounts/${a}/workers/scripts/${NAME}`;
const cmd = process.argv[2];
const sub = (await api(`/accounts/${a}/workers/subdomain`)).result.subdomain;
const base = `https://${NAME}.${sub}.workers.dev`;
if (cmd === "down") { const r = await api(S + "?force=true", { method: "DELETE" }); console.log("deleted", r.status); process.exit(0); }
if (cmd === "up") {
  const code = `
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === "/quiet") return new Response("quiet");
    if (url.pathname === "/ws") { const p = new WebSocketPair(); p[1].accept(); console.log({ at: "ws" }); p[1].addEventListener("message", (e) => { console.log({ at: "ws.msg" }); p[1].send("ok"); }); return new Response(null, { status: 101, webSocket: p[0] }); }
    if (url.pathname === "/late") { ctx.waitUntil(new Promise((r) => setTimeout(r, 50)).then(() => console.log({ at: "late" }))); return new Response("late"); }
    if (url.pathname === "/hop") { const r = await env.SELF.fetch("https://self.internal/inner?hopsecret=HOPVALUE777", { headers: { "x-probe-h": "HEADERVALUE555" } }); return new Response(await r.text()); }
    console.log({ at: "plain", path: url.pathname });
    return new Response("ok");
  },
  async scheduled(event, env, ctx) { console.log({ at: "cron" }); }
};`;
  const meta = { main_module: "worker.js", compatibility_date: "2026-10-01", bindings: [{ type: "service", name: "SELF", service: NAME }], observability: { enabled: true, logs: { enabled: true, invocation_logs: false } } };
  const up = async (m: any) => { const f = new FormData(); f.append("metadata", new Blob([JSON.stringify(m)], { type: "application/json" })); f.append("worker.js", new Blob([code], { type: "application/javascript+module" }), "worker.js"); return api(S, { method: "PUT", body: f }); };
  let r = await up({ ...meta, bindings: [] }); console.log("up1", r.status, JSON.stringify(r.errors || ""));
  r = await up(meta); console.log("up2", r.status, JSON.stringify(r.result?.observability ?? null));
  await api(S + "/subdomain", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ enabled: true, previews_enabled: false }) });
  const c = await api(S + "/schedules", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify([{ cron: "* * * * *" }]) }); console.log("cron", c.status);
  console.log(base); process.exit(0);
}
if (cmd === "hit") {
  for (const p of ["/plain?qsecret=QVALUE111", "/quiet?quietsecret=QUIETVALUE222", "/late?latesecret=LATEVALUE333", "/hop?outer=OUTERVALUE444"]) { const r = await fetch(base + p, { headers: { "x-probe-h": "HEADERVALUE555" } }); console.log(p, r.status, await r.text()); }
  const ws = new WebSocket(base.replace("https", "wss") + "/ws?wssecret=WSVALUE666");
  await new Promise<void>((res) => { ws.onopen = () => ws.send("hi"); ws.onmessage = () => { ws.close(); res(); }; ws.onerror = () => res(); });
  console.log("ws done", new Date().toISOString()); process.exit(0);
}
const now = Date.now();
const out: any = {};
for (const needle of ["QVALUE111", "QUIETVALUE222", "LATEVALUE333", "OUTERVALUE444", "HOPVALUE777", "HEADERVALUE555", "WSVALUE666"]) {
  const r = await query(a, { queryId: "p", timeframe: { from: now - 1800000, to: now }, view: "events", limit: 20, parameters: { datasets: ["cloudflare-workers"], filters: [{ key: "$workers.scriptName", operation: "eq", type: "string", value: NAME }], needle: { value: needle } } });
  const ev = r.result?.events?.events || [];
  const where = new Set<string>();
  const find = (o: any, p: string) => { if (typeof o === "string") { if (o.includes(needle)) where.add(p); } else if (o && typeof o === "object") for (const k in o) find(o[k], p + "." + k); };
  for (const e of ev) find(e, "");
  out[needle] = { lines: ev.length, at: ev.map((e: any) => e.source?.at), where: [...where] };
}
const all = await query(a, { queryId: "p", timeframe: { from: now - 1800000, to: now }, view: "events", limit: 50, parameters: { datasets: ["cloudflare-workers"], filters: [{ key: "$workers.scriptName", operation: "eq", type: "string", value: NAME }] } });
const evs = all.result?.events?.events || [];
out.kinds = evs.map((e: any) => ({ at: e.source?.at, type: e.$metadata?.type, eventType: e.$workers?.eventType, event: e.$workers?.event ? Object.fromEntries(Object.entries(e.$workers.event).map(([k, v]: any) => [k, v && typeof v === "object" ? Object.keys(v) : typeof v])) : null, trigger: e.$metadata?.trigger }));
save("reqprobe", { out, sample: evs.slice(0, 12) });
console.log(JSON.stringify(out, null, 1));
