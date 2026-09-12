// usage: bun probe.ts <url> <outdir> [settleMs]
import { chromium } from "/Users/tom.larkworthy/dev/lopecode-dev/node_modules/playwright/index.mjs";
import { mkdirSync, writeFileSync } from "fs";

const url = process.argv[2]!;
const out = process.argv[3]!;
const settle = Number(process.argv[4] ?? 20000);
mkdirSync(out + "/net", { recursive: true });

const INIT = `(() => {
  if (window.__cap) return;
  const cap = window.__cap = { runtimes: [], modules: [], log: [], msgs: [], evals: [], importSnaps: [], t0: performance.now() };
  const origOf = new WeakMap();
  window.__capOrig = origOf;
  const now = () => Math.round(performance.now());
  const head = (f, n=300) => { try { return String(origOf.get(f) || f).slice(0, n); } catch (e) { return "<" + e + ">"; } };
  const snapVar = (v) => ({ name: v._name, type: v._type, inputs: (v._inputs||[]).map(i => i && i._name), def: head(v._definition, 300) });
  let patchedVar = false, patchedMod = false, patchedRt = false;
  const stackLine = () => { const s = (new Error().stack || "").split("\\n").slice(3, 6).map(x => x.trim()).join(" | "); return s.slice(0, 400); };
  const patchVariableProto = (proto) => {
    if (patchedVar) return; patchedVar = true;
    const od = proto.define;
    proto.define = function (...args) {
      const i = args.length - 1;
      if (typeof args[i] === "function" && /import\\(/.test(String(args[i]))) {
        const orig = args[i];
        const self = this;
        const w = function (...a) {
          const snap = { t: now(), phase: "before", name: self._name, outputs: [...self._outputs].map(snapVar) };
          cap.importSnaps.push(snap);
          const r = orig.apply(this, a);
          Promise.resolve(r).then((val) => {
            cap.importSnaps.push({ t: now(), phase: "after", name: self._name, returned: val && typeof val === "object" ? Object.keys(val).slice(0, 50) : typeof val, outputs: [...self._outputs].map(snapVar) });
          }, (e) => cap.importSnaps.push({ t: now(), phase: "after-error", name: self._name, error: String(e) }));
          return r;
        };
        origOf.set(w, orig);
        try { Object.defineProperty(w, "toString", { value: () => String(orig) }); } catch {}
        args[i] = w;
      }
      const r = od.apply(this, args);
      if (cap.log.length < 3000) cap.log.push({ t: now(), op: "variable.define", mod: cap.modules.indexOf(this._module), ...snapVar(this), stack: cap.log.length < 400 ? stackLine() : undefined });
      return r;
    };
    const oi = proto.import;
    if (oi) proto.import = function (...args) {
      const r = oi.apply(this, args);
      cap.log.push({ t: now(), op: "variable.import", args: args.map(a => typeof a === "string" ? a : (a && a._scope ? "module#" + cap.modules.indexOf(a) : typeof a)), mod: cap.modules.indexOf(this._module), name: this._name });
      return r;
    };
  };
  const patchModuleProto = (proto) => {
    if (patchedMod) return; patchedMod = true;
    const ob = proto.builtin;
    proto.builtin = function (name, value) { cap.log.push({ t: now(), op: "module.builtin", mod: cap.modules.indexOf(this), name, value: head(value, 200) }); return ob.apply(this, arguments); };
    const oim = proto.import;
    proto.import = function () { cap.log.push({ t: now(), op: "module.import", mod: cap.modules.indexOf(this), args: [...arguments].map(a => typeof a === "string" ? a : (a && a._scope ? "module#" + cap.modules.indexOf(a) : typeof a)) }); return oim.apply(this, arguments); };
  };
  const patchRuntimeProto = (proto) => {
    if (patchedRt) return; patchedRt = true;
    const om = proto.module;
    proto.module = function (define, observer) {
      const r = om.apply(this, arguments);
      if (define !== undefined) cap.log.push({ t: now(), op: "runtime.module", mod: cap.modules.indexOf(r), define: head(define, 300), defineName: define && define.name, stack: stackLine() });
      return r;
    };
  };
  const odp = Object.defineProperties;
  Object.defineProperties = function (obj, props) {
    const r = odp.apply(this, arguments);
    try {
      if (props && typeof props === "object") {
        if ("_variables" in props && "_builtin" in props) { cap.runtimes.push(obj); patchRuntimeProto(Object.getPrototypeOf(obj)); cap.log.push({ t: now(), op: "runtime.new", stack: stackLine() }); }
        else if ("_scope" in props && "_builtins" in props) { cap.modules.push(obj); patchModuleProto(Object.getPrototypeOf(obj)); }
        else if ("_definition" in props && "_outputs" in props) { patchVariableProto(Object.getPrototypeOf(obj)); }
      }
    } catch (e) {}
    return r;
  };
  const oael = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function (type, fn, opts) {
    if (type === "message" && typeof fn === "function" && (this === window)) {
      const wrapped = function (ev) {
        try {
          let s; try { s = JSON.stringify(ev.data); } catch { s = String(ev.data); }
          if (cap.msgs.length < 500) cap.msgs.push({ t: now(), origin: ev.origin, len: s ? s.length : 0, data: s ? s.slice(0, 60000) : s, keys: ev.data && typeof ev.data === "object" ? Object.keys(ev.data) : null });
        } catch (e) {}
        return fn.apply(this, arguments);
      };
      return oael.call(this, type, wrapped, opts);
    }
    return oael.apply(this, arguments);
  };
  const OF = window.Function;
  window.Function = new Proxy(OF, { construct(t, a) { cap.evals.push({ t: now(), kind: "new Function", src: a.map(String).join(" ,, ").slice(0, 600), stack: stackLine() }); return Reflect.construct(t, a); }, apply(t, th, a) { cap.evals.push({ t: now(), kind: "Function()", src: a.map(String).join(" ,, ").slice(0, 600), stack: stackLine() }); return Reflect.apply(t, th, a); } });
  const oev = window.eval;
  window.eval = function (s) { cap.evals.push({ t: now(), kind: "eval", src: String(s).slice(0, 600), stack: stackLine() }); return oev(s); };
})();`;

const browser = await chromium.launch({ headless: !process.env.HEADED });
const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
await ctx.addInitScript(INIT);
const page = await ctx.newPage();
const manifest: any[] = [];
let n = 0;
const pending: Promise<any>[] = [];
page.on("response", (r) => {
  const rt = r.request().resourceType();
  if (["image", "font", "media"].includes(rt)) return;
  const idx = n++;
  pending.push((async () => {
    const u = r.url();
    let body: Buffer | null = null;
    try { body = await Promise.race([r.body(), new Promise<null>((res) => setTimeout(() => res(null), 8000))]); } catch {}
    const safe = u.replace(/^https?:\/\//, "").replace(/[^a-zA-Z0-9._@-]+/g, "_").slice(0, 120);
    const file = `net/${String(idx).padStart(3, "0")}_${safe}`;
    if (body) writeFileSync(`${out}/${file}`, body);
    manifest.push({ idx, url: u, method: r.request().method(), status: r.status(), type: rt, ct: r.headers()["content-type"], bytes: body?.length ?? null, frame: r.frame()?.url().slice(0, 150), file: body ? file : null });
  })());
});
await page.goto(url, { waitUntil: "load", timeout: 90000 });
await page.waitForTimeout(settle / 2);
const frame = page.frames().find((f) => f.url().includes("observableusercontent")) ?? page.mainFrame();
console.error("frames:", page.frames().map((f) => f.url().slice(0, 150)));
for (let i = 0; i < 12; i++) {
  await frame.evaluate(() => window.scrollBy(0, 2000)).catch(() => {});
  await page.mouse.wheel(0, 2000);
  await page.waitForTimeout(700);
}
await page.waitForTimeout(settle / 2);

const dump = await frame.evaluate(async () => {
  const cap: any = (window as any).__cap;
  const origOf: WeakMap<any, any> = (window as any).__capOrig;
  const rt: any = (window as any).__ojs_runtime ?? cap.runtimes.reduce((a: any, b: any) => (b._variables.size > a._variables.size ? b : a));
  const runtimeSizes = cap.runtimes.map((r: any) => ({ vars: r._variables.size, modules: r._modules.size, chosen: r === rt }));
  const src = (f: any, n = 300) => String(origOf.get(f) ?? f).slice(0, n);
  const mods: any[] = [...new Set([rt._builtin, ...cap.modules, ...[...rt._variables].map((v: any) => v._module)])];
  const modId = (m: any) => (m === rt._builtin ? "builtin" : "M" + mods.indexOf(m));
  const settleState = async (v: any) => {
    const t = new Promise((r) => setTimeout(() => r({ state: "pending" }), 30));
    return Promise.race([
      Promise.resolve(v._promise).then(
        (x) => ({ state: "fulfilled" }),
        (e) => ({ state: "rejected", error: (() => { try { return e instanceof Error ? `${e.constructor.name}: ${e.message}` : JSON.stringify(e) ?? String(e); } catch { return String(e); } })() })
      ),
      t,
    ]);
  };
  const valDesc = (x: any) => {
    if (x === undefined) return "undefined";
    if (x === null) return "null";
    const t = typeof x;
    if (t === "function") return "function " + (x.name || "") + " :: " + String(x).slice(0, 80);
    if (t !== "object") return t + " " + JSON.stringify(x)?.slice(0, 80);
    const c = x.constructor?.name;
    if (x instanceof Element) return `${c} <${x.tagName.toLowerCase()}> ${x.outerHTML.slice(0, 120)}`;
    let keys = ""; try { keys = Object.keys(x).slice(0, 10).join(","); } catch {}
    return `object ${c} {${keys}}`;
  };
  const observed = (v: any) => {
    const o = v._observer;
    if (typeof o === "symbol") return false;
    return o ? (o.constructor?.name || typeof o) + (o._node ? ":node" : "") : false;
  };
  const vars: any[] = [];
  for (const v of rt._variables) {
    const st: any = await settleState(v);
    vars.push({
      mod: modId(v._module),
      name: v._name,
      type: v._type,
      inputs: v._inputs.map((i: any) => (i._module === v._module ? i._name : `${i._name}@${modId(i._module)}`)),
      outputs: [...v._outputs].map((o: any) => `${o._name}@${modId(o._module)}`),
      reachable: v._reachable,
      observed: observed(v),
      version: v._version,
      shadow: v._shadow ? [...v._shadow].map(([k, sv]: any) => ({ k, inputs: sv._inputs.map((i: any) => i._name), def: src(sv._definition, 200) })) : null,
      ...st,
      value: valDesc(v._value),
      def: src(v._definition, 300),
    });
  }
  const modules = mods.map((m) => ({
    id: modId(m),
    inRtModules: [...rt._modules].filter(([k, mm]: any) => mm === m).map(([k]: any) => String(k).slice(0, 200)),
    builtins: [...m._builtins.keys()],
    scope: [...m._scope.keys()],
    source: m._source ? String(m._source).slice(0, 200) : null,
  }));
  const ifr = document.createElement("iframe");
  document.body.appendChild(ifr);
  const std = new Set(Object.getOwnPropertyNames(ifr.contentWindow));
  ifr.remove();
  const globals = Object.getOwnPropertyNames(window).filter((k) => !std.has(k));
  return {
    href: location.href,
    hasOjsRuntime: !!(window as any).__ojs_runtime,
    capturedRuntimes: cap.runtimes.length,
    runtimeSizes,
    sameRuntime: (window as any).__ojs_runtime ? (window as any).__ojs_runtime === cap.runtimes[0] : null,
    runtimeProtoKeys: Object.getOwnPropertyNames(Object.getPrototypeOf(rt)),
    runtimeOwnKeys: Object.getOwnPropertyNames(rt),
    runtimeFileAttachments: rt.fileAttachments ? String(rt.fileAttachments).slice(0, 400) : null,
    builtinScope: [...rt._builtin._scope.keys()],
    builtinDefs: [...rt._builtin._scope].map(([k, v]: any) => ({ k, def: src(v._definition, 200) })),
    globals,
    modules,
    vars,
    log: cap.log,
    importSnaps: cap.importSnaps,
    msgs: cap.msgs,
    evals: cap.evals,
    html: document.documentElement.outerHTML.length,
  };
});
writeFileSync(`${out}/runtime-dump.json`, JSON.stringify(dump, null, 1));
const topCap = await page.evaluate(() => ({ msgs: (window as any).__cap?.msgs, evals: (window as any).__cap?.evals?.length, runtimes: (window as any).__cap?.runtimes?.length }));
writeFileSync(`${out}/top-cap.json`, JSON.stringify(topCap, null, 1));
writeFileSync(`${out}/iframe-dom.html`, await frame.content());
writeFileSync(`${out}/top-dom.html`, await page.content());
await Promise.allSettled(pending);
manifest.sort((a, b) => a.idx - b.idx);
writeFileSync(`${out}/manifest.json`, JSON.stringify(manifest, null, 1));
console.error("vars", dump.vars.length, "log", dump.log.length, "msgs", dump.msgs.length, "evals", dump.evals.length, "responses", manifest.length);
await browser.close();
