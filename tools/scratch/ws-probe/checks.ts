// Part 1, the rest: what the service saw, calls enforcement, the charge, frame sizes.
import { open, session, token, call, save, P, HOST } from "./lib.ts";
const X = "/xrpc/" + P, out: any = {};
const tok = await token();
const hello = async (path: string, auth: string | null) => { const w = await open(path, auth, { wait: 300 }); return w.got[0] ? JSON.parse(w.got[0]).seen : w; };
out.sawOwner = await hello(X + "wsprobe.ws", session);
out.sawToken = await hello(X + "wsprobe.ws", tok);
out.sawAnon = await hello(X + "wsprobe.open", null);
// A forged caller header from the internet.
out.forged = await new Promise((done) => { const ws = new (WebSocket as any)(`wss://${HOST}${X}wsprobe.open`, { headers: { "x-brain-caller": "owner", "x-brain-origin": "owner" } }); ws.onmessage = (e: any) => { done(JSON.parse(e.data).seen); ws.close(); }; ws.onerror = () => done("error"); });
// calls: wsclient declared wsprobe.ws and wsprobe.paid, not wsprobe.open.
out.undeclared = (await call("wsclient.go?m=open")).body;
// The charge for a priced upgrade.
const before = (await call("quota.get")).body.spent;
await open(X + "wsprobe.paid", session, { wait: 200 });
out.charged = Number(((await call("quota.get")).body.spent - before).toFixed(6));
// Frame sizes, both ways: client -> service (echoSize), and service -> client ("big:N").
out.frames = [];
for (const n of [1e3, 1e5, 1e6, 4e6, 16e6, 33e6]) {
  const r: any = await new Promise((done) => {
    const ws = new (WebSocket as any)(`wss://${HOST}${X}wsprobe.ws?every=600000`, { headers: { authorization: "Bearer " + session } });
    const res: any = { n }; let t = 0;
    ws.onopen = () => { t = performance.now(); ws.send("y".repeat(n)); };
    ws.onmessage = (e: any) => {
      const d = String(e.data);
      if (d.startsWith('{"hello"')) return;
      if (d.startsWith('{"echoSize"') || (n <= 2000 && d.length === n && !("up" in res))) { res.up = d.length === n ? n : JSON.parse(d).echoSize; res.upMs = Math.round(performance.now() - t); t = performance.now(); ws.send("big:" + n); return; }
      res.down = d.length; res.downMs = Math.round(performance.now() - t); ws.close(1000, "ok");
    };
    ws.onclose = (e: any) => done({ ...res, close: e.code, reason: e.reason });
    ws.onerror = (e: any) => { res.error = String(e.message || e.type); };
    setTimeout(() => { try { ws.close(); } catch {} done({ ...res, timeout: true }); }, 30000);
  });
  out.frames.push(r);
}
save("checks", out);
console.log(JSON.stringify(out, null, 1).slice(0, 3500));
