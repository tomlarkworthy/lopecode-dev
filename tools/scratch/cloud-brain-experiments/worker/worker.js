import "./shim.js";
import { Runtime } from "@observablehq/runtime";
import { DurableObject } from "cloudflare:workers";
import { newQuickJSWASMModuleFromVariant, newVariant } from "quickjs-emscripten-core";
import RELEASE_SYNC from "@jitl/quickjs-wasmfile-release-sync";
import wasmModule from "./quickjs.wasm";
import runtimeSrc from "./runtime.iife.txt";
import defineRc5Core from "./rc5-core.js";
import seed from "./seed.js";
import { OAuthClient, generateClientAssertionKey } from "@atcute/oauth-node-client";
import { CompositeDidDocumentResolver, CompositeHandleResolver, LocalActorResolver, PlcDidDocumentResolver, WebDidDocumentResolver, WellKnownHandleResolver, DohJsonHandleResolver } from "@atcute/identity-resolver";
import { Client } from "@atcute/client";
import { parsePublicMultikey, verifySig } from "@atcute/crypto";

// E13: an atproto service: DID document, and a service JWT checked against the issuer's DID document.
const HOST = "cb-experiments.endpointservices.workers.dev";
const SERVICE_DID = "did:web:" + HOST;
const b64u = (t) => Uint8Array.from(atob(t.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(t.length / 4) * 4, "=")), (c) => c.charCodeAt(0));
const xrpcError = (status, error, message) => Response.json({ error, message }, { status });
async function verifyServiceJwt(request, nsid) {
  const auth = request.headers.get("authorization") || "";
  if (!auth.startsWith("Bearer ")) return { fail: xrpcError(401, "AuthMissing", "no bearer token") };
  const [h, p, sgn] = auth.slice(7).split(".");
  let header, claims;
  try { header = JSON.parse(new TextDecoder().decode(b64u(h))); claims = JSON.parse(new TextDecoder().decode(b64u(p))); } catch { return { fail: xrpcError(401, "BadJwt", "not a JWT") }; }
  const now = Date.now() / 1000;
  if (claims.aud !== SERVICE_DID && claims.aud !== SERVICE_DID + "#brain") return { fail: xrpcError(401, "BadJwtAudience", "aud " + claims.aud) };
  if (!(claims.exp > now)) return { fail: xrpcError(401, "JwtExpired", "exp " + claims.exp) };
  if (claims.lxm && claims.lxm !== nsid) return { fail: xrpcError(401, "BadJwtLexiconMethod", "lxm " + claims.lxm) };
  const t0 = Date.now();
  const doc = await new CompositeDidDocumentResolver({ methods: { plc: new PlcDidDocumentResolver(), web: new WebDidDocumentResolver() } }).resolve(claims.iss);
  const vm = (doc.verificationMethod || []).find((m) => m.id.endsWith("#atproto"));
  if (!vm) return { fail: xrpcError(401, "BadJwtIssuer", "no #atproto key") };
  const resolveMs = Date.now() - t0, t1 = Date.now();
  const ok = await verifySig(parsePublicMultikey(vm.publicKeyMultibase), b64u(sgn), new TextEncoder().encode(h + "." + p), { allowMalleableSig: true });
  if (!ok) return { fail: xrpcError(401, "BadJwtSignature", "signature does not verify") };
  return { header, claims, resolveMs, verifyMs: Date.now() - t1, keyType: vm.type };
}
async function xrpc(request, env) {
  const url = new URL(request.url);
  const nsid = url.pathname.slice("/xrpc/".length);
  if (nsid === "_health") return Response.json({ version: String(env.BUILD ?? null) });
  if (nsid !== "com.lopecode.brain.getInfo") return xrpcError(501, "MethodNotImplemented", nsid);
  const v = await verifyServiceJwt(request, nsid);
  if (v.fail) return v.fail;
  const { header, claims } = v;
  return Response.json({ worker: "cb-experiments", build: String(env.BUILD ?? null), caller: claims.iss, alg: header.alg, aud: claims.aud, lxm: claims.lxm ?? null, lifetimeSeconds: claims.exp - (claims.iat ?? claims.exp), hasJti: !!claims.jti, keyType: v.keyType, resolveMs: v.resolveMs, verifyMs: v.verifyMs, forwardedHeaders: [...request.headers.keys()].filter((k) => /^(atproto|x-|user-agent|via|forwarded)/.test(k)) });
}
import * as observableParser from "@observablehq/parser";
import * as acornWalk from "acorn-walk";
import { compileCell, observableToJsCell } from "./toolchain-cells.js";

const attempt = (f) => { try { return { ok: f() }; } catch (e) { return { err: String(e) }; } };
const attemptAsync = async (f) => { try { return { ok: await f() }; } catch (e) { return { err: String(e) }; } };

// A notebook module, as the exporter emits it.
const log = [];
function define(runtime, observer) {
  const main = runtime.module();
  main.variable(observer("a")).define("a", [], () => { log.push("a"); return 21; });
  main.variable(observer("b")).define("b", ["a"], (a) => { log.push("b"); return a * 2; });
  main.variable(observer("dom")).define("dom", [], () => { log.push("dom"); return document.body; });
  main.variable(observer("fetch")).define("fetch", ["b"], (b) => (request) => new Response("hello " + b));
  return main;
}

// E4: what works in global scope.
const startup = {
  eval: attempt(() => (0, eval)("1 + 1")),
  newFunction: attempt(() => new Function("return 2 + 2")()),
  runtime: attempt(() => { const rt = new Runtime(); define(rt, () => undefined); return "constructed"; }),
};

let lazy;
const getMain = () => (lazy ??= (() => { const rt = new Runtime(); return define(rt, () => undefined); })());

let qjs;
const getQuickJS = () => (qjs ??= newQuickJSWASMModuleFromVariant(newVariant(RELEASE_SYNC, { wasmModule })));
const drain = (vm) => { for (;;) { const r = vm.runtime.executePendingJobs(); if (r.error) { const e = vm.dump(r.error); throw new Error("job " + JSON.stringify(e)); } if (r.value === 0) return; } };
const evalDump = (vm, code) => { const r = vm.evalCode(code); if (r.error) { const e = vm.dump(r.error); if (r.error.alive) r.error.dispose(); throw new Error(JSON.stringify(e)); } const v = vm.dump(r.value); if (r.value.alive) r.value.dispose(); return v; };

const routes = {
  async "/e1"(request) {
    const t0 = performance.now();
    const main = getMain();
    const handler = await main.value("fetch");
    const res = await handler(request);
    return Response.json({ body: await res.text(), log: [...log], ms: performance.now() - t0, startup });
  },
  async "/e1/redefine"(request) {
    const n = Number(new URL(request.url).searchParams.get("a") ?? 5);
    getMain().redefine("a", [], () => { log.push("a'"); return n; });
    return new Response("redefined a=" + n);
  },
  async "/e4"() {
    return Response.json({
      startup,
      request: { eval: attempt(() => (0, eval)("1 + 1")), newFunction: attempt(() => new Function("return 2 + 2")()),
        asyncFunction: attempt(() => (async () => {}).constructor("return 1")),
        wasmCompile: await attemptAsync(async () => (await WebAssembly.compile(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0]))) && "compiled"),
        dynamicImportData: await attemptAsync(async () => (await import(["data:text/javascript,export default ", String(Date.now() % 7)].join(""))).default),
        dynamicImportBlob: await attemptAsync(async () => (await import(URL.createObjectURL(new Blob(["export default 7"], { type: "text/javascript" })))).default),
      },
    });
  },
  async "/e6"() {
    const t0 = performance.now();
    const QuickJS = await getQuickJS();
    const t1 = performance.now();
    const vm = QuickJS.newContext();
    const out = { loadMs: t1 - t0, onePlusOne: evalDump(vm, "1 + 1") };
    // (a) the whole Observable runtime inside the interpreter
    evalDump(vm, "globalThis.setTimeout = (f) => { Promise.resolve().then(f); return 0; }; 0");
    const t2 = performance.now();
    evalDump(vm, runtimeSrc + "\n0");
    evalDump(vm, `const rt = new Runtime(); const m = rt.module();
      m.variable().define("a", [], () => 21); m.variable().define("b", ["a"], (a) => a * 2);
      globalThis.out = "pending"; m.value("b").then((v) => { globalThis.out = v; }); 0`);
    drain(vm);
    out.runtimeInside = { b: evalDump(vm, "out"), ms: performance.now() - t2 };
    evalDump(vm, `m.variable().define("c", ["b"], (0, eval)("(b) => b + 1000")); m.value("c").then((v) => { globalThis.out = v; }); 0`);
    drain(vm);
    out.runtimeInside.cellFromString = evalDump(vm, "out");
    // (b) a cell of the HOST runtime whose body is interpreted
    const interpretedCell = (source) => (...inputs) => {
      const fn = vm.evalCode("(" + source + ")"); if (fn.error) throw new Error(JSON.stringify(vm.dump(fn.error)));
      const args = inputs.map((x) => { const h = vm.evalCode("(" + JSON.stringify(x) + ")"); return h.value; });
      const r = vm.callFunction(fn.value, vm.undefined, ...args);
      args.forEach((h) => h.dispose()); fn.value.dispose();
      if (r.error) throw new Error(JSON.stringify(vm.dump(r.error)));
      const v = vm.dump(r.value); r.value.dispose(); return v;
    };
    const host = new Runtime(); const hm = host.module();
    hm.variable().define("a", [], () => 21);
    hm.variable().define("b", ["a"], (a) => a * 2);
    hm.variable().define("c", ["a", "b"], interpretedCell("(a, b) => ({ sum: a + b, squares: [a * a, b * b] })"));
    out.hostCell = { first: await hm.value("c") };
    hm.redefine("a", [], () => 1);
    out.hostCell.afterRedefine = await hm.value("c");
    // (c) speed
    const loop = "(() => { let s = 0; for (let i = 0; i < 3e6; i++) s = (s + i * i) % 1000003; return s; })";
    const nativeLoop = () => { let s = 0; for (let i = 0; i < 3e6; i++) s = (s + i * i) % 1000003; return s; };
    const n0 = Date.now(); const nat = nativeLoop(); const n1 = Date.now();
    const q0 = Date.now(); const q = evalDump(vm, loop + "()"); const q1 = Date.now();
    out.loop = { same: nat === q, nativeMs: n1 - n0, quickjsMs: q1 - q0, note: "workerd clocks do not advance during CPU work; see wall time from curl" };
    vm.dispose();
    return Response.json(out);
  },
  async "/e7"(request, env) {
    const QuickJS = await getQuickJS();
    const vm = QuickJS.newContext();
    const out = {};
    const pass = (name, x) => { out[name] = attempt(() => { const h = vm.evalCode("(" + JSON.stringify(x) + ")"); const v = vm.dump(h.value); h.value.dispose(); return v; }); };
    pass("number", 3.5); pass("object", { a: [1, { b: "c" }] }); pass("string", "héllo");
    // host function, sync
    const double = vm.newFunction("double", (h) => vm.newNumber(vm.getNumber(h) * 2));
    vm.setProp(vm.global, "double", double); double.dispose();
    out.hostFunctionSync = attempt(() => evalDump(vm, "double(21)"));
    // host function, async: the guest awaits a host promise (here a Durable Object call through env)
    const stub = env.STATE.get(env.STATE.idFromName("main"));
    const hostFetch = vm.newFunction("hostFetch", (pathH) => {
      const path = vm.getString(pathH);
      const p = vm.newPromise();
      stub.fetch("https://do" + path).then((r) => r.text()).then((t) => { const s = vm.newString(t); p.resolve(s); s.dispose(); }, (e) => { const s = vm.newString(String(e)); p.reject(s); s.dispose(); });
      p.settled.then(() => drain(vm));
      return p.handle;
    });
    vm.setProp(vm.global, "hostFetch", hostFetch); hostFetch.dispose();
    // a Request crosses as plain data plus host functions
    const reqH = vm.evalCode("(" + JSON.stringify({ method: request.method, url: request.url, headers: Object.fromEntries(request.headers) }) + ")");
    vm.setProp(vm.global, "request", reqH.value); reqH.value.dispose();
    const r = vm.evalCode(`(async () => { const body = await hostFetch("/count"); return { status: 200, body: "guest saw " + request.method + " " + new URL(request.url).pathname + " and DO said " + body }; })()`);
    out.guestHandler = await attemptAsync(async () => {
      if (r.error) throw new Error(JSON.stringify(vm.dump(r.error)));
      const settled = await vm.resolvePromise(r.value); r.value.dispose();
      if (settled.error) throw new Error(JSON.stringify(vm.dump(settled.error)));
      const v = vm.dump(settled.value); settled.value.dispose(); return v;
    });
    out.globalsInGuest = attempt(() => evalDump(vm, "['URL','fetch','TextEncoder','crypto','setTimeout','console','Promise','Map','Proxy','BigInt','WeakRef'].map((k) => k + ':' + typeof globalThis[k]).join(' ')"));
    out.guestPure = await attemptAsync(async () => { const r2 = vm.evalCode(`(async () => { const body = await hostFetch("/count"); return "guest saw " + request.method + " " + request.url.split("/").pop() + "; DO said " + body.slice(0, 40); })()`); const st = await vm.resolvePromise(r2.value); r2.value.dispose(); if (st.error) throw new Error(JSON.stringify(vm.dump(st.error))); const v = vm.dump(st.value); st.value.dispose(); return v; });
    out.dispose = attempt(() => { vm.dispose(); return "clean"; });
    return Response.json(out);
  },
  async "/e8"(request) {
    const source = new URL(request.url).searchParams.get("src") ?? "viewof total = Inputs.range([0, a + b])";
    const rt = new Runtime(); const m = rt.module();
    m.variable({}).define("parser", [], () => observableParser);
    m.variable({}).define("acorn_walk", [], () => acornWalk);
    m.variable({}).define("observableToJs", ["acorn_walk", "parser"], observableToJsCell);
    m.variable({}).define("compile", ["parser", "observableToJs"], compileCell);
    const compile = await m.value("compile");
    const t0 = Date.now();
    const compiled = compile(source);
    // then run the compiled cell through the QuickJS definition proxy in a host runtime
    const QuickJS = await getQuickJS(); const vm = QuickJS.newContext();
    const interp = (def) => (...inputs) => { const fn = vm.evalCode("(" + def + ")"); if (fn.error) throw new Error(JSON.stringify(vm.dump(fn.error))); const hs = inputs.map((x) => vm.evalCode("(" + JSON.stringify(x) + ")").value); const r = vm.callFunction(fn.value, vm.undefined, ...hs); hs.forEach((h) => h.dispose()); fn.value.dispose(); if (r.error) throw new Error(JSON.stringify(vm.dump(r.error))); const v = vm.dump(r.value); r.value.dispose(); return v; };
    const live = compile("total = a * b + 1");
    const host = new Runtime(); const hm = host.module();
    hm.variable({}).define("a", [], () => 6); hm.variable({}).define("b", [], () => 7);
    for (const c of live) hm.variable({}).define(c._name, c._inputs, interp(c._definition));
    const total = await hm.value("total");
    vm.dispose();
    return Response.json({ source, compiled, ms: Date.now() - t0, liveCell: { source: "total = a * b + 1", compiled: live, total } });
  },
  async "/e5"(request, env) {
    const code = new URL(request.url).searchParams.get("code") ?? `export default { async fetch(req) { let out = "none"; try { await fetch("https://example.com"); out = "fetched"; } catch (e) { out = String(e); } return new Response("dynamic says " + (6 * 7) + "; outbound: " + out); } }`;
    const t0 = Date.now();
    const r = await attemptAsync(async () => {
      const id = "cell-" + [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(code)))].slice(0, 6).map((b) => b.toString(16)).join("");
      const worker = env.LOADER.get(id, async () => ({ compatibilityDate: "2025-09-01", mainModule: "main.js", modules: { "main.js": code }, env: {}, globalOutbound: null }));
      const res = await worker.getEntrypoint().fetch(new Request("https://dyn/"));
      return { id, body: await res.text() };
    });
    return Response.json({ ...r, ms: Date.now() - t0, hasLoader: !!env.LOADER });
  },
};

export class State extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    ctx.storage.sql.exec("CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v INTEGER)");
    this.born = Date.now();
    this.runtime = new Runtime();
    const m = (this.main = this.runtime.module());
    m.variable().define("counter", [], () => ({ n: 0 }));
    m.variable().define("fetch", ["counter"], (counter) => () => ++counter.n);
    m.variable().define("pinnedCounter", [], () => ({ n: 0 }));
    m.variable({}).define("pinnedFetch", ["pinnedCounter"], (counter) => () => ++counter.n); // observed, so it stays computed
  }
  // E12: atproto OAuth as a confidential client; key and sessions in this object's SQLite.
  async oauth() {
    if (this._oauth) return this._oauth;
    const sql = this.ctx.storage.sql;
    sql.exec("CREATE TABLE IF NOT EXISTS oauth (ns TEXT, k TEXT, v TEXT, PRIMARY KEY (ns, k))");
    const store = (ns) => ({
      get: (k) => { const r = [...sql.exec("SELECT v FROM oauth WHERE ns = ? AND k = ?", ns, k)][0]; return r ? JSON.parse(r.v) : undefined; },
      set: (k, v) => { sql.exec("INSERT INTO oauth VALUES (?, ?, ?) ON CONFLICT(ns, k) DO UPDATE SET v = excluded.v", ns, k, JSON.stringify(v)); },
      delete: (k) => { sql.exec("DELETE FROM oauth WHERE ns = ? AND k = ?", ns, k); },
      clear: () => { sql.exec("DELETE FROM oauth WHERE ns = ?", ns); },
    });
    const keys = store("key");
    let jwk = keys.get("main");
    if (!jwk) { jwk = await generateClientAssertionKey("main", "ES256"); keys.set("main", jwk); }
    const origin = "https://cb-experiments.endpointservices.workers.dev/e3/auth";
    return (this._oauth = new OAuthClient({
      metadata: { client_id: origin + "/client-metadata.json", redirect_uris: [origin + "/callback"], scope: "atproto transition:generic", jwks_uri: origin + "/jwks.json", client_name: "cb-experiments" },
      keyset: [jwk],
      stores: { sessions: store("session"), states: store("state") },
      actorResolver: new LocalActorResolver({
        handleResolver: new CompositeHandleResolver({ methods: { dns: new DohJsonHandleResolver({ dohUrl: "https://mozilla.cloudflare-dns.com/dns-query" }), http: new WellKnownHandleResolver() } }),
        didDocumentResolver: new CompositeDidDocumentResolver({ methods: { plc: new PlcDidDocumentResolver(), web: new WebDidDocumentResolver() } }),
      }),
    }));
  }
  async auth(path, url) {
    const oauth = await this.oauth();
    if (path === "/auth/client-metadata.json") return Response.json(oauth.metadata);
    if (path === "/auth/jwks.json") return Response.json(oauth.jwks);
    if (path === "/auth/login") { const t0 = Date.now(); const { url: to } = await oauth.authorize({ target: { type: "account", identifier: url.searchParams.get("handle") }, state: { t: Date.now() } }); return url.searchParams.get("dry") ? Response.json({ ms: Date.now() - t0, authorizeHost: new URL(to).host, hasRequestUri: new URL(to).searchParams.has("request_uri") }) : Response.redirect(to.toString(), 302); }
    if (path === "/auth/callback") { const { session } = await oauth.callback(url.searchParams); this.ctx.storage.sql.exec("INSERT INTO oauth VALUES ('owner', 'did', ?) ON CONFLICT(ns, k) DO UPDATE SET v = excluded.v", JSON.stringify(session.did)); return new Response("signed in as " + session.did + ". Tokens are in the Durable Object; this page holds none."); }
    if (path === "/auth/session") { const r = [...this.ctx.storage.sql.exec("SELECT v FROM oauth WHERE ns = 'owner' AND k = 'did'")][0]; if (!r) return Response.json({ signedIn: false }); const did = JSON.parse(r.v); const session = await oauth.restore(did); const client = new Client({ handler: session }); const res = await client.get("com.atproto.server.getSession"); return Response.json({ signedIn: true, did, ok: res.ok, handle: res.data?.handle, status: res.status }); }
    if (path === "/auth/proxy") {
      // E14, E15: the owner's PDS forwards an XRPC call to another service, signing a service JWT.
      const r = [...this.ctx.storage.sql.exec("SELECT v FROM oauth WHERE ns = 'owner' AND k = 'did'")][0]; if (!r) return Response.json({ signedIn: false });
      const session = await oauth.restore(JSON.parse(r.v));
      const service = url.searchParams.get("service") || (SERVICE_DID + "#brain");
      const nsid = url.searchParams.get("nsid") || "com.lopecode.brain.getInfo";
      const params = Object.fromEntries([...url.searchParams].filter(([k]) => !["service", "nsid"].includes(k)));
      const client = new Client({ handler: session, proxy: service === "none" ? null : service });
      const t0 = Date.now();
      const res = await client.get(nsid, { params });
      return Response.json({ service, nsid, ms: Date.now() - t0, status: res.status, ok: res.ok, data: res.data });
    }
    if (path === "/auth/logout") { const r = [...this.ctx.storage.sql.exec("SELECT v FROM oauth WHERE ns = 'owner' AND k = 'did'")][0]; if (!r) return new Response("no session"); let revoked = "ok"; try { await oauth.revoke(JSON.parse(r.v)); } catch (e) { revoked = String(e); } this.ctx.storage.sql.exec("DELETE FROM oauth WHERE ns IN ('owner', 'session', 'state')"); return Response.json({ revoked, sessionRows: [...this.ctx.storage.sql.exec("SELECT count(*) AS n FROM oauth WHERE ns = 'session'")][0].n }); }
    return new Response("no such auth route", { status: 404 });
  }
  // E9: robocoop-5-core's loop, with a scripted model. `dieAtCall` simulates the object dying mid-turn.
  async agentTurn(input, { dieAtCall = 0, restore = null } = {}) {
    const sql = this.ctx.storage.sql;
    const core = this.runtime.module(defineRc5Core);
    const createAgentSession = await core.value("createAgentSession");
    const defineTool = await core.value("defineTool");
    let calls = 0;
    const client = { chat: async ({ messages }) => {
      calls++;
      if (dieAtCall && calls === dieAtCall) throw new Error("simulated eviction");
      const toolResults = messages.filter((m) => m.role === "tool");
      if (toolResults.length < 2) { const n = toolResults.length; return { message: { role: "assistant", content: null, tool_calls: [{ id: "call_" + n, type: "function", function: { name: "add", arguments: JSON.stringify({ a: n + 1, b: 10 }) } }] }, finish_reason: "tool_calls", usage: {} }; }
      return { message: { role: "assistant", content: "sums: " + toolResults.map((m) => m.content).join(", ") }, finish_reason: "stop", usage: {} };
    } };
    const add = defineTool({ id: "add", description: "add two numbers", parameters: { type: "object", properties: { a: { type: "number" }, b: { type: "number" } }, required: ["a", "b"] }, execute: async ({ a, b }) => ({ title: "add", output: String(a + b), metadata: {} }) });
    const session = createAgentSession({ client, tools: [add], model: "fake", systemPrompt: "test" });
    if (restore) session.messages.push(...restore);
    const save = (messages) => sql.exec("INSERT INTO kv2 VALUES ('transcript', ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v", JSON.stringify(messages));
    let finish = null, err = null;
    try { await session.send(input, { onStep: (_step, messages) => save(messages), onFinish: (f) => { finish = f.finishReason; } }); } catch (e) { err = String(e); }
    if (!err) save(session.messages);
    return { calls, finish, err, roles: session.messages.map((m) => m.role + (m.tool_calls ? ":call" : "")), last: session.messages.at(-1)?.content };
  }
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;
    const sql = this.ctx.storage.sql;
    sql.exec("CREATE TABLE IF NOT EXISTS kv2 (k TEXT PRIMARY KEY, v TEXT)");
    const saved = () => { const r = [...sql.exec("SELECT v FROM kv2 WHERE k = 'transcript'")][0]; return r ? JSON.parse(r.v) : null; };
    if (path.startsWith("/auth/")) return this.auth(path, url).catch((e) => new Response("auth error: " + String(e && e.stack || e).slice(0, 600), { status: 500 }));
    if (path === "/agent/turn") return Response.json(await this.agentTurn("add some numbers").catch((e) => ({ threw: String(e && e.stack || e) })));
    if (path === "/agent/die") return Response.json(await this.agentTurn("add some numbers", { dieAtCall: 2 }).catch((e) => ({ threw: String(e) })));
    if (path === "/agent/saved") return Response.json((saved() ?? []).map((m) => m.role + (m.tool_calls ? ":call" : "") + (m.role === "tool" ? "=" + m.content : "")));
    if (path === "/agent/resume") return Response.json(await this.agentTurn("continue from where you stopped", { restore: saved() }).catch((e) => ({ threw: String(e) })));
    if (path === "/agent/webhook") { sql.exec("INSERT INTO kv2 VALUES ('inbox', ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v", "add some numbers"); sql.exec("DELETE FROM kv2 WHERE k = 'reply'"); await this.ctx.storage.setAlarm(Date.now()); return new Response("accepted"); }
    if (path === "/agent/reply") return Response.json([...sql.exec("SELECT k, v FROM kv2 WHERE k IN ('reply')")]);
    if (path === "/alarm/set") { const ms = Number(url.searchParams.get("ms") ?? 1000); await this.ctx.storage.setAlarm(Date.now() + ms); return new Response("alarm set +" + ms); }
    if (path === "/self-deploy") {
      // E10: the Worker reads its own uploaded parts, re-uploads them as a new version with BUILD changed, and deploys it.
      const env = this.env, api = "https://api.cloudflare.com/client/v4/accounts/" + env.ACCOUNT_ID + "/workers/scripts/cb-experiments";
      const auth = { authorization: "Bearer " + env.CF_API_TOKEN };
      const next = "self-" + Date.now().toString(36);
      const fail = url.searchParams.get("fail") === "1";
      sql.exec("INSERT INTO kv2 VALUES ('checkpoint', ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v", JSON.stringify({ from: env.BUILD, to: next, at: new Date().toISOString() }));
      await this.ctx.storage.setAlarm(Date.now() + 15000);
      const t0 = Date.now();
      const content = await fetch(api + "/content/v2", { headers: auth });
      const entry = content.headers.get("cf-entrypoint");
      const parts = await content.formData();
      const t1 = Date.now();
      const form = new FormData();
      const names = [];
      for (const [name, file] of parts) { names.push(name + " (" + file.type + ", " + file.size + ")"); form.append(name, file, name); }
      form.append("metadata", new Blob([JSON.stringify({ main_module: entry, compatibility_date: "2025-09-01",
        annotations: { "workers/message": "self-deploy from " + env.BUILD },
        bindings: [{ type: "plain_text", name: "BUILD", text: next }, { type: "plain_text", name: "ACCOUNT_ID", text: env.ACCOUNT_ID }, ...(fail ? [{ type: "plain_text", name: "BROKEN", text: "1" }] : []),
          { type: "worker_loader", name: "LOADER" }, { type: "durable_object_namespace", name: "STATE", class_name: "State" }, { type: "inherit", name: "CF_API_TOKEN" }] })], { type: "application/json" }));
      const up = await fetch(api + "/versions", { method: "POST", headers: auth, body: form });
      const upJson = await up.json();
      const t2 = Date.now();
      if (!upJson.success) return Response.json({ step: "upload", status: up.status, errors: upJson.errors, names });
      const dep = await fetch(api + "/deployments", { method: "POST", headers: { ...auth, "content-type": "application/json" }, body: JSON.stringify({ strategy: "percentage", versions: [{ version_id: upJson.result.id, percentage: 100 }] }) });
      const depJson = await dep.json();
      return Response.json({ from: env.BUILD, to: next, version: upJson.result.id, deployed: depJson.success, errors: depJson.errors, readMs: t1 - t0, uploadMs: t2 - t1, deployMs: Date.now() - t2, names });
    }
    if (path === "/checkpoint") return Response.json([...sql.exec("SELECT k, v FROM kv2 WHERE k IN ('checkpoint', 'alarmRanOnBuild')")]);
    if (path === "/alarm/ran") return Response.json([...sql.exec("SELECT k, v FROM kv2 WHERE k = 'alarmRanOnBuild'")]);
    const inMemory = (await this.main.value("fetch"))();
    const pinned = (await this.main.value("pinnedFetch"))();
    sql.exec("INSERT INTO kv VALUES ('n', 1) ON CONFLICT(k) DO UPDATE SET v = v + 1");
    const rows = [...sql.exec("SELECT k, v FROM kv")];
    return Response.json({ build: this.env.BUILD ?? null, unobserved: inMemory, observed: pinned, rows, bornMsAgo: Date.now() - this.born });
  }
  async alarm() {
    const sql = this.ctx.storage.sql;
    sql.exec("CREATE TABLE IF NOT EXISTS kv2 (k TEXT PRIMARY KEY, v TEXT)");
    const inbox = [...sql.exec("SELECT v FROM kv2 WHERE k = 'inbox'")][0];
    if (inbox) { sql.exec("DELETE FROM kv2 WHERE k = 'inbox'"); const r = await this.agentTurn(inbox.v); sql.exec("INSERT INTO kv2 VALUES ('reply', ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v", JSON.stringify(r)); return; }
    sql.exec("INSERT INTO kv2 VALUES ('alarmRanOnBuild', ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v", String(this.env.BUILD ?? null) + " at " + new Date().toISOString());
    sql.exec("INSERT INTO kv VALUES ('alarms', 1) ON CONFLICT(k) DO UPDATE SET v = v + 1");
    (await this.main.value("fetch"))();
  }
}

export default {
  async fetch(request, env, ctx) {
    const path = new URL(request.url).pathname;
    if (path === "/.well-known/did.json") return Response.json({ "@context": ["https://www.w3.org/ns/did/v1"], id: SERVICE_DID, service: [{ id: "#brain", type: "CloudBrain", serviceEndpoint: "https://" + HOST }] });
    if (path.startsWith("/xrpc/")) return xrpc(request, env).catch((e) => xrpcError(500, "InternalServerError", String(e && e.stack || e).slice(0, 500)));
    if (path === "/build") return new Response(String(env.BUILD ?? null));
    if (path.startsWith("/seed/") || path === "/seed") { const u = new URL(request.url); u.pathname = path.slice(5) || "/"; return seed.fetch(new Request(u, request)); }
    if (path === "/health") return env.BROKEN ? new Response("broken", { status: 500 }) : new Response("ok " + env.BUILD);
    if (path.startsWith("/e3")) return env.STATE.get(env.STATE.idFromName("main")).fetch("https://do" + (path.slice(3) || "/count") + new URL(request.url).search, { redirect: "manual" });
    const h = routes[path];
    if (!h) return new Response(Object.keys(routes).join("\n"), { status: 404 });
    try { return await h(request, env, ctx); } catch (e) { return new Response(String(e && e.stack || e), { status: 500 }); }
  },
};
