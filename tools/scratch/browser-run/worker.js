// Spike: hold a page open in Cloudflare Browser Run with raw CDP over the binding. No library.
const HOST = "https://fake.host";
const PROBE = `window.__probe = { raf: 0, t: 0, at: Date.now() }; (function f() { __probe.raf++; requestAnimationFrame(f); })(); setInterval(() => __probe.t++, 100);`;
const READY = `(() => { const r = window.__ojs_runtime; const p = window.__probe || {}; const o = { vis: document.visibilityState, focus: document.hasFocus(), raf: p.raf, t: p.t, rs: document.readyState, n: 0, d: 0, e: 0, who: null };
  if (r) for (const v of r._variables) { o.n++; if (v._value !== undefined) o.d++; if (v._error !== undefined) o.e++; if (v._name === "brainWho" && v._value) o.who = JSON.stringify(v._value).slice(0, 120); }
  return JSON.stringify(o); })()`;

class Cdp {
  constructor(ws) {
    this.ws = ws; this.id = 0; this.wait = new Map(); this.events = []; this.closed = null;
    ws.addEventListener("message", (e) => {
      const m = JSON.parse(typeof e.data === "string" ? e.data : new TextDecoder().decode(e.data));
      if (m.id && this.wait.has(m.id)) { const w = this.wait.get(m.id); this.wait.delete(m.id); m.error ? w.no(new Error(m.error.message)) : w.yes(m.result); }
      else if (m.method) this.onEvent && this.onEvent(m);
    });
    ws.addEventListener("close", (e) => { this.closed = `${e.code} ${e.reason}`; for (const w of this.wait.values()) w.no(new Error("closed " + this.closed)); });
  }
  send(method, params = {}, sessionId) {
    const id = ++this.id;
    return new Promise((yes, no) => { this.wait.set(id, { yes, no }); this.ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) })); });
  }
}

const acquire = async (env, keep) => {
  const r = await env.BROWSER.fetch(`${HOST}/v1/devtools/browser?keep_alive=${keep}`, { method: "POST" });
  const text = await r.text();
  if (r.status !== 200) throw new Error(`acquire ${r.status} ${text.slice(0, 200)}`);
  return JSON.parse(text).sessionId;
};
const connect = async (env, sessionId) => {
  const r = await env.BROWSER.fetch(`${HOST}/v1/devtools/browser/${sessionId}`, { headers: { Upgrade: "websocket" } });
  if (!r.webSocket) throw new Error(`connect ${r.status} ${(await r.text()).slice(0, 200)}`);
  r.webSocket.accept();
  return new Cdp(r.webSocket);
};
const evalIn = async (cdp, sid, expression, awaitPromise = false) => {
  const r = await cdp.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise }, sid);
  if (r.exceptionDetails) throw new Error("page: " + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
  return r.result.value;
};

export class Page {
  constructor(state, env) { this.state = state; this.env = env; this.cdp = null; this.sid = null; this.errors = []; this.born = Date.now(); }
  async attach() {
    // After an eviction the socket is gone; the browser session and its tab are not.
    if (this.cdp && !this.cdp.closed) return;
    const s = await this.state.storage.get("s");
    if (!s) throw new Error("no page open");
    this.cdp = await connect(this.env, s.sessionId);
    this.cdp.onEvent = (m) => this.note(m);
    this.sid = (await this.cdp.send("Target.attachToTarget", { targetId: s.targetId, flatten: true })).sessionId;
    await this.cdp.send("Runtime.enable", {}, this.sid);
    await this.cdp.send("Performance.enable", {}, this.sid).catch(() => {});
    this.reattached = (this.reattached || 0) + 1;
  }
  note(m) {
    if (m.method === "Runtime.exceptionThrown") this.errors.push(("ex: " + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text)).slice(0, 200));
    if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") this.errors.push(("console: " + m.params.args.map((a) => a.value ?? a.description).join(" ")).slice(0, 200));
    if (m.method === "Inspector.targetCrashed") this.errors.push("CRASHED");
    if (this.errors.length > 40) this.errors.splice(0, this.errors.length - 40);
  }
  async open(url, { keep = 600000, visible = false, hold = true, any = false } = {}) {
    const t0 = Date.now(), T = {};
    const sessionId = await acquire(this.env, keep); T.acquire = Date.now() - t0;
    this.cdp = await connect(this.env, sessionId); T.connect = Date.now() - t0;
    this.cdp.onEvent = (m) => this.note(m);
    const { targetId } = await this.cdp.send("Target.createTarget", { url: "about:blank" });
    this.sid = (await this.cdp.send("Target.attachToTarget", { targetId, flatten: true })).sessionId;
    const sid = this.sid;
    await this.cdp.send("Page.enable", {}, sid);
    await this.cdp.send("Runtime.enable", {}, sid);
    await this.cdp.send("Page.addScriptToEvaluateOnNewDocument", { source: PROBE }, sid);
    if (visible) await this.cdp.send("Emulation.setFocusEmulationEnabled", { enabled: true }, sid).catch((e) => this.errors.push("focusEmu: " + e.message));
    await this.state.storage.put("s", { sessionId, targetId, url, opened: t0 });
    let dom = null, load = null;
    const prev = this.cdp.onEvent;
    this.cdp.onEvent = (m) => { prev(m); if (m.method === "Page.domContentEventFired") dom = Date.now() - t0; if (m.method === "Page.loadEventFired") load = Date.now() - t0; };
    await this.cdp.send("Page.navigate", { url }, sid); T.navigated = Date.now() - t0;
    let last = null, ready = null;
    for (let i = 0; i < 120 && Date.now() - t0 < 90000; i++) {
      await new Promise((r) => setTimeout(r, 500));
      try { last = JSON.parse(await evalIn(this.cdp, sid, READY)); } catch (e) { last = { err: e.message }; }
      if (any) { if (last.n > 0 && last.rs === "complete" && last.d === this.pd) { if (++this.same >= 4) { ready = Date.now() - t0; break; } } else this.same = 0; this.pd = last.d; }
      else if (last.who && !ready) { ready = Date.now() - t0; break; }
    }
    T.dom = dom; T.load = load; T.ready = ready;
    const metrics = await this.cdp.send("Performance.getMetrics", {}, sid).catch(() => null);
    const heap = metrics && Object.fromEntries(metrics.metrics.filter((m) => /JSHeap|Nodes|Documents/.test(m.name)).map((m) => [m.name, m.value]));
    await this.cdp.send("Performance.enable", {}, sid).catch(() => {});
    if (hold) await this.state.storage.setAlarm(Date.now() + 30000);
    return { sessionId, T, last, heap, errors: this.errors.slice(0, 12) };
  }
  async sample() {
    await this.attach();
    const v = JSON.parse(await evalIn(this.cdp, this.sid, READY));
    const m = await this.cdp.send("Performance.getMetrics", {}, this.sid).catch(() => null);
    const h = m && m.metrics.find((x) => x.name === "JSHeapUsedSize"); v.heapMB = h ? Math.round(h.value / 1e6) : null;
    v.at = Date.now(); v.inst = this.born; v.re = this.reattached || 0;
    return v;
  }
  async alarm() {
    const s = await this.state.storage.get("s");
    if (!s) return;
    const log = (await this.state.storage.get("log")) || [];
    try { log.push(await this.sample()); } catch (e) { log.push({ at: Date.now(), err: e.message }); }
    await this.state.storage.put("log", log);
    if (Date.now() - s.opened < (s.holdMs || 660000)) await this.state.storage.setAlarm(Date.now() + 30000);
    else await this.close().catch(() => {});
  }
  async close() {
    const s = await this.state.storage.get("s");
    if (!s) return { closed: false };
    try { await this.attach(); await this.cdp.send("Browser.close"); } catch (e) { this.errors.push("close: " + e.message); }
    await this.state.storage.delete("s");
    await this.state.storage.deleteAlarm();
    return { closed: true, ms: Date.now() - s.opened };
  }
  async fetch(request) {
    const u = new URL(request.url), q = u.searchParams;
    try {
      if (u.pathname === "/open") return Response.json(await this.open(q.get("url"), { visible: q.get("visible") === "1", hold: q.get("hold") !== "0", keep: Number(q.get("keep") || 600000) }));
      if (u.pathname === "/once") { const r = await this.open(q.get("url"), { hold: false, keep: 60000, any: q.get("any") === "1" }); await this.cdp.send("Performance.enable", {}, this.sid); r.after = await this.sample().catch((e) => ({ err: e.message })); r.closed = await this.close(); return Response.json(r); }
      if (u.pathname === "/eval") { await this.attach(); return Response.json({ value: await evalIn(this.cdp, this.sid, await request.text(), true) }); }
      if (u.pathname === "/cdp") { await this.attach(); const b = await request.json(); return Response.json(await this.cdp.send(b.method, b.params || {}, b.browser ? undefined : this.sid)); }
      if (u.pathname === "/status") return Response.json({ s: await this.state.storage.get("s"), log: await this.state.storage.get("log"), errors: this.errors, inst: this.born });
      if (u.pathname === "/drop") { if (this.cdp) this.cdp.ws.close(1000, "drop"); this.cdp = null; return Response.json({ dropped: true }); }
      if (u.pathname === "/sample") return Response.json(await this.sample());
      if (u.pathname === "/close") return Response.json(await this.close());
      if (u.pathname === "/reset") { await this.state.storage.deleteAll(); return Response.json({ reset: true }); }
    } catch (e) { return Response.json({ error: e.message, errors: this.errors.slice(-5) }, { status: 500 }); }
    return new Response("?", { status: 404 });
  }
}

export default {
  async fetch(request, env) {
    const u = new URL(request.url);
    if (u.searchParams.get("k") !== env.KEY) return new Response("no", { status: 401 });
    if (["/limits", "/sessions", "/history"].includes(u.pathname)) { const r = await env.BROWSER.fetch(`${HOST}/v1${u.pathname}`); return new Response(await r.text(), { status: r.status }); }
    const name = u.searchParams.get("page") || "main";
    return env.PAGE.get(env.PAGE.idFromName(name)).fetch(request);
  }
};
