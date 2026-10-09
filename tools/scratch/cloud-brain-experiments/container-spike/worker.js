import { DurableObject } from "cloudflare:workers";
export class Box extends DurableObject {
  async fetch(req) {
    const u = new URL(req.url), c = this.ctx.container;
    if (u.pathname === "/_state") return Response.json({ running: c.running, keys: Object.getOwnPropertyNames(Object.getPrototypeOf(c)) });
    if (u.pathname === "/_start") {
      const t = Date.now(); let how = "already", mon = null; const bare = u.searchParams.get("bare");
      if (!c.running) { const ep = u.searchParams.get("ep"); bare ? c.start() : c.start({ enableInternet: true, ...(ep ? { entrypoint: JSON.parse(ep) } : {}) }); how = bare ? "bare" : "opts"; c.monitor().then(() => (mon = "exited"), (e) => (mon = "error " + e)); }
      let tries = 0, last = null;
      if (u.searchParams.get("nowait")) { await new Promise((r) => setTimeout(r, 1500)); return Response.json({ how, mon, running: c.running }); }
      while (Date.now() - t < 40000 && !mon) { tries++; try { const r = await c.getTcpPort(80).fetch("http://box/", { signal: AbortSignal.timeout(2000) }); await r.arrayBuffer(); return Response.json({ how, readyMs: Date.now() - t, tries, status: r.status }); } catch (e) { last = String(e); await new Promise((r) => setTimeout(r, 50)); } }
      return Response.json({ how, mon, last, tries, running: c.running, ms: Date.now() - t }, { status: 504 });
    }
    if (u.pathname === "/_stop") { const t = Date.now(); await c.destroy(); return Response.json({ stopped: true, ms: Date.now() - t, running: c.running }); }
    if (u.pathname === "/_exec") { try { const t = Date.now(); const p = await c.exec(JSON.parse(u.searchParams.get("cmd") || '["uname","-a"]')); const o = await p.output(); const d = new TextDecoder(); return Response.json({ ms: Date.now() - t, out: d.decode(o.stdout).slice(0, 3000), err: d.decode(o.stderr).slice(0, 1500), code: o.exitCode }); } catch (e) { return Response.json({ err: String(e) }, { status: 500 }); } }
    if (u.pathname === "/_bench") { const ts = []; for (let i = 0; i < 20; i++) { const t = Date.now(); const r = await c.getTcpPort(80).fetch("http://box/"); await r.arrayBuffer(); ts.push(Date.now() - t); } return Response.json({ inDoMs: ts }); }
    if (u.pathname === "/_timeout") { await c.setInactivityTimeout(Number(u.searchParams.get("ms"))); return Response.json({ set: true }); }
    return c.getTcpPort(80).fetch(new Request("http://box" + u.pathname, req));
  }
}
export default { async fetch(req, env) {
  const u = new URL(req.url);
  if (u.searchParams.get("k") !== env.KEY) return new Response("no", { status: 404 });
  if (u.pathname === "/_noop") return new Response("ok");
  if (u.pathname === "/_do") return env.BOX.get(env.BOX.idFromName(u.searchParams.get("n") || "a")).fetch(new Request("http://box/_state"));
  return env.BOX.get(env.BOX.idFromName(u.searchParams.get("n") || "a")).fetch(req);
} };
