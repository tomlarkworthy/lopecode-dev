// Writes wsprobe.json and wsclient.json into tools/cloud-brain/.emitted: two scratch services for the WebSocket
// experiment of 2026-10-08. wsprobe accepts a WebSocket on three methods and one path; wsclient opens one to it
// through the core by its own key. Deployed with `brain.ts apply`, removed after.
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
const P = "com.lopecode.brain.";
const emit = (name: string, body: string, deps = ["cloudflare", "xrpc", "Response"]) => {
  const cell = `function _${name}_service(${deps.join(",")}) {\n${body}\n}`;
  const id = `_brain${name}_${name}_service`;
  const text = `
const ${id} = ${cell};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  $def("${id}", "${name}_service", ${JSON.stringify(deps)}, ${id});  
  main.define("module @tomlarkworthy/cloudflare-iac", async () => runtime.module((await import("/@tomlarkworthy/cloudflare-iac.js?v=4")).default));  
${deps.filter((d) => d !== "Response").map((d) => `  main.define("${d}", ["module @tomlarkworthy/cloudflare-iac", "@variable"], (_, v) => v.import("${d}", _));`).join("  \n")}
  return main;
}
`;
  writeFileSync(resolve(import.meta.dir, "../../cloud-brain/.emitted", `${name}.json`), JSON.stringify({ name, hash: "scratch", meta: { secrets: [] }, source: { module: "@tomlarkworthy/brain-" + name, text } }));
  console.log("written", name);
};

emit("wsprobe", `
  const seen = (request) => Object.fromEntries([...request.headers].filter(([k]) => k.startsWith("x-brain-") || k === "upgrade" || k.startsWith("sec-websocket")).map(([k, v]) => [k, k === "x-brain-context" || k === "sec-websocket-key" ? v.length + " chars" : v]));
  return cloudflare.Service("wsprobe", async (request, { ctx }) => {
    const url = new URL(request.url);
    if (request.headers.get("upgrade") !== "websocket") return Response.json({ upgrade: false, seen: seen(request), path: url.pathname });
    const [client, server] = Object.values(new WebSocketPair());
    server.accept();
    const born = Date.now();
    let n = 0;
    server.send(JSON.stringify({ hello: true, seen: seen(request), path: url.pathname, born }));
    const tick = setInterval(() => { try { server.send(JSON.stringify({ tick: ++n, age: Date.now() - born })); } catch { clearInterval(tick); } }, Number(url.searchParams.get("every") || 5000));
    server.addEventListener("message", (e) => {
      const size = typeof e.data === "string" ? e.data.length : e.data.byteLength;
      // "big:N" asks for N characters back, to find the largest frame each way.
      const big = typeof e.data === "string" && /^big:([0-9]+)$/.exec(e.data);
      server.send(big ? "x".repeat(+big[1]) : size > 2000 ? JSON.stringify({ echoSize: size }) : e.data);
    });
    server.addEventListener("close", () => clearInterval(tick));
    return new Response(null, { status: 101, webSocket: client });
  }, {
    methods: {
      "${P}wsprobe.ws": { type: "query", who: "workers" },
      "${P}wsprobe.open": { type: "query", who: "anyone" },
      "${P}wsprobe.paid": { type: "query", who: "workers", price: "0.0001" }
    },
    paths: [{ path: "/wsprobe/*", who: "workers" }]
  });
`);

emit("wsclient", `
  return cloudflare.Service("wsclient", async (request) => {
    const q = new URL(request.url).searchParams, out = { got: [] };
    const t0 = Date.now();
    const r = await xrpc.fetch("${P}wsprobe." + (q.get("m") || "ws"), { headers: { Upgrade: "websocket" }, params: { every: "300" } });
    out.status = r.status;
    out.ms = Date.now() - t0;
    out.servedBy = r.headers.get("x-brain-served-by");
    if (!r.webSocket) { out.body = await r.text().catch(() => null); return Response.json(out); }
    const ws = r.webSocket;
    ws.accept();
    await new Promise((done) => {
      ws.addEventListener("message", (e) => { out.got.push(String(e.data).slice(0, 600)); if (out.got.length === 1) ws.send("ping from wsclient"); if (out.got.length >= 4) done(); });
      ws.addEventListener("close", done);
      setTimeout(done, 5000);
    });
    ws.close(1000, "done");
    return Response.json(out);
  }, { methods: { "${P}wsclient.go": { type: "query", who: "owner" }, "${P}wsclient.undeclared": { type: "query", who: "owner" } }, calls: ["${P}wsprobe.ws", "${P}wsprobe.paid"] });
`);

// A Worker that uses the browser's CDP socket by its own key: buy time, connect through the core, one command, one event.
emit("wscdp", `
  const B = "${P}browser.";
  return cloudflare.Service("wscdp", async (request) => {
    const out = { events: [] }, t0 = Date.now();
    out.extend = await (await xrpc.fetch(B + "extend", { method: "POST", params: { seconds: "20" }, body: "{}", headers: { "content-type": "application/json" } })).json();
    const r = await xrpc.fetch(B + "cdp", { headers: { Upgrade: "websocket" } });
    out.status = r.status;
    if (!r.webSocket) { out.body = await r.text().catch(() => null); return Response.json(out); }
    const ws = r.webSocket;
    ws.accept();
    out.connectMs = Date.now() - t0;
    let id = 0;
    const waiting = new Map();
    ws.addEventListener("message", (e) => { const m = JSON.parse(e.data); if (m.id && waiting.has(m.id)) waiting.get(m.id)(m.result || m); else out.events.push(m.method); });
    const send = (method, params = {}) => new Promise((done) => { const i = ++id; waiting.set(i, done); ws.send(JSON.stringify({ id: i, method, params })); });
    out.version = (await send("Browser.getVersion")).product;
    await send("Target.setDiscoverTargets", { discover: true });
    await send("Target.createTarget", { url: "about:blank" });
    await new Promise((r) => setTimeout(r, 300));
    out.events = [...new Set(out.events)];
    ws.close(1000, "done");
    out.status2 = await (await xrpc.fetch(B + "status")).json().then((s) => ({ owner: s.owner, browser: s.browser }));
    out.close = (await xrpc.fetch(B + "close", { method: "POST", body: JSON.stringify({ all: true }), headers: { "content-type": "application/json" } })).status;
    return Response.json(out);
  }, { methods: { "${P}wscdp.go": { type: "query", who: "owner" } }, calls: ["${P}browser.*"] });
`);
