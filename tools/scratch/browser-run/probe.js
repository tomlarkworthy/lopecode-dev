// Scratch probe of the Browser Run binding: POST / { steps: [...] } with x-key. One WebSocket per "connect" step.
// Steps: { http, method } | { connect: sessionId|"$sid", as } | { cdp, params, session, on } | { sleep } | { save, from }
export default {
  async fetch(request, env) {
    if (request.headers.get("x-key") !== env.KEY) return new Response("no", { status: 401 });
    const { steps } = await request.json(), out = [], vars = {}, socks = {};
    const sub = (v) => JSON.parse(JSON.stringify(v ?? null).replace(/\$([a-zA-Z0-9_]+)/g, (m, k) => (k in vars ? vars[k] : m)));
    const pick = (o, path) => path.split(".").reduce((a, k) => (a == null ? a : a[k]), o);
    for (const raw of steps) {
      const s = sub(raw), t0 = Date.now();
      let res;
      try {
        if (s.http) {
          // The Request-object form, as the wrapper's workers cell calls a binding.
          const r = await env.BROWSER.fetch(new Request("https://browser.internal" + s.http, { method: s.method || "GET" }));
          const text = await r.text();
          try { res = { status: r.status, body: JSON.parse(text) }; } catch { res = { status: r.status, body: text.slice(0, 400) }; }
        } else if (s.connect) {
          const r = await env.BROWSER.fetch(new Request("https://browser.internal/v1/devtools/browser/" + s.connect, { headers: { Upgrade: "websocket" } }));
          if (!r.webSocket) res = { status: r.status, body: (await r.text()).slice(0, 300) };
          else {
            const ws = r.webSocket; ws.accept();
            const k = { ws, id: 0, wait: new Map(), events: [], closed: null };
            ws.addEventListener("message", (e) => { const m = JSON.parse(typeof e.data === "string" ? e.data : new TextDecoder().decode(e.data)); if (m.id && k.wait.has(m.id)) { const w = k.wait.get(m.id); k.wait.delete(m.id); w(m); } else if (m.method) k.events.push(m.method); });
            ws.addEventListener("close", (e) => { k.closed = e.code + " " + e.reason; for (const w of k.wait.values()) w({ error: { message: "closed " + k.closed } }); });
            socks[s.as || "a"] = k; res = { status: r.status, connected: true };
          }
        } else if (s.cdp) {
          const k = socks[s.on || "a"], id = ++k.id;
          const sent = new Promise((yes) => { k.wait.set(id, yes); k.ws.send(JSON.stringify({ id, method: s.cdp, params: s.params || {}, ...(s.session ? { sessionId: s.session } : {}) })); });
          const m = s.nowait ? { result: "not awaited" } : await sent;
          res = m.error ? { error: m.error.message } : m.result;
          if (res && res.data) res.data = res.data.length;
        } else if (s.sleep) { await new Promise((r) => setTimeout(r, s.sleep)); res = "slept"; }
        else if (s.drop) { socks[s.drop].ws.close(1000, "drop"); res = "dropped"; }
        else if (s.events) { res = socks[s.events].events.splice(0); }
      } catch (e) { res = { threw: String(e && e.message || e) }; }
      if (raw.save) vars[raw.save] = pick(res, raw.from);
      out.push({ step: raw.http || raw.cdp || Object.keys(raw)[0], ms: Date.now() - t0, res });
    }
    return Response.json(out);
  }
};
