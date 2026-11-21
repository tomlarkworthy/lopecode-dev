// Browser capabilities lope-runtime.js does not supply, added to a notebook's vm realm before boot.
// Each is installed from loadNotebook's `instrument(runtime)` hook, reaching the realm through
// runtime._global (the Runtime's window lookup), so the shared harness files stay unedited.

export type Capability = { name: string; install(g: (name: string) => any, runtime: any): void; preBoot?(): void; undo?(): void };

// <script type="module-shim"> with inline text: es-module-shims runs it as a module in a browser.
// lope-runtime's appendChild hook queues only scripts with a src, so an inline one never runs and a
// caller awaiting it (runtime-sdk realize) waits forever. Run it as a blob: module through the
// notebook's own importShim, which compiles blob: URLs as SourceTextModules in the notebook realm.
export const inlineModuleShim: Capability = {
  name: "inline-module-shim",
  install(g) {
    const document = g("document");
    const run = (child: any) => {
      if (child?.tagName !== "SCRIPT" || child.src) return;
      if ((child.getAttribute?.("type") || child.type) !== "module-shim") return;
      const URL = g("URL"), Blob = g("Blob");
      const url = URL.createObjectURL(new Blob([child.textContent || ""], { type: "text/javascript" }));
      Promise.resolve(g("importShim")(url)).then(
        () => child.onload?.(),
        (e: unknown) => { console.error("inline module-shim failed:", e); child.onerror?.(e); },
      );
    };
    const wrap = (target: any) => {
      const orig = target.appendChild;
      target.appendChild = function (child: any) { const r = orig.call(this, child); run(child); return r; };
    };
    // lope-runtime puts its hook on head and body as own properties and on HTMLElement.prototype
    wrap(g("HTMLElement").prototype);
    if (Object.hasOwn(document.head, "appendChild")) wrap(document.head);
    if (document.body && Object.hasOwn(document.body, "appendChild")) wrap(document.body);
  },
};

// Animation frames. happy-dom's requestAnimationFrame is one setImmediate per callback: each callback is a
// frame of its own, run ahead of every timer. A browser runs the callbacks queued before a frame together, at
// one timestamp, with a microtask checkpoint after each and no timer between them, and a page that waits on
// setTimeout(0) sees its timer before the next frame. Here:
// - a frame is requested on a timer turn; it is deferred, one timer turn at a time, while the page has a
//   timer of at most SHORT_MS delay pending, up to MAX_DEFERRALS turns (a page polling with setTimeout(0)
//   still gets frames);
// - its callbacks are queued as immediates in one go, so each is followed by a microtask drain and no timer
//   runs between them; a callback queued meanwhile goes to the next frame.
// The order is logical, not by the clock: no wall-time deadline decides it.
// The Observable Runtime takes requestAnimationFrame when it is imported, before instrument runs, so this
// replaces happy-dom's methods on the window prototype before loadNotebook is called (preBoot).
import { Window } from "happy-dom";
const BW = Object.getPrototypeOf(Window.prototype);
const happy = { raf: BW.requestAnimationFrame, caf: BW.cancelAnimationFrame, st: BW.setTimeout, ct: BW.clearTimeout };
const SHORT_MS = 4, MAX_DEFERRALS = 64;
type FrameState = { queue: Map<number, (t: number) => void>; running: Map<number, (t: number) => void>; scheduled: boolean; id: number; short: Set<unknown> };
export const frames: Capability & { preBoot(): void; undo(): void; count: number; deferred: number; capped: number } = {
  name: "frames",
  count: 0,
  deferred: 0,
  capped: 0,
  install() {},
  preBoot() {
    const state = new WeakMap<object, FrameState>();
    const of = (w: any) => { let s = state.get(w); if (!s) state.set(w, (s = { queue: new Map(), running: new Map(), scheduled: false, id: 0, short: new Set() })); return s; };
    BW.setTimeout = function (cb: any, delay = 0, ...args: unknown[]) {
      const s = of(this);
      if (!(Number(delay) > SHORT_MS)) {
        let h: unknown;
        h = happy.st.call(this, (...a: unknown[]) => { s.short.delete(h); return typeof cb === "function" ? cb(...a) : undefined; }, delay, ...args);
        s.short.add(h);
        return h;
      }
      return happy.st.call(this, cb, delay, ...args);
    };
    BW.clearTimeout = function (h: unknown) { of(this).short.delete(h); return happy.ct.call(this, h); };
    const check = (w: any, n: number) => {
      const s = of(w);
      if (w.closed) return;
      if (s.short.size && n < MAX_DEFERRALS) { frames.deferred++; setTimeout(() => check(w, n + 1), 0); return; }
      if (s.short.size) frames.capped++;
      s.scheduled = false;
      s.running = s.queue;
      s.queue = new Map();
      frames.count++;
      const t = w.performance.now();
      for (const id of s.running.keys()) setImmediate(() => {
        const cb = s.running.get(id);
        if (!cb || w.closed) return;
        s.running.delete(id);
        try { cb(t); } catch (e) { console.error("requestAnimationFrame callback threw:", e); }
      });
    };
    BW.requestAnimationFrame = function (cb: (t: number) => void) {
      if (this.closed) return 0;
      const s = of(this), id = ++s.id;
      s.queue.set(id, cb);
      if (!s.scheduled) { s.scheduled = true; setTimeout(() => check(this, 0), 0); }
      return id;
    };
    BW.cancelAnimationFrame = function (id: number) { const s = of(this); s.queue.delete(id); s.running.delete(id); };
  },
  undo() { Object.assign(BW, { requestAnimationFrame: happy.raf, cancelAnimationFrame: happy.caf, setTimeout: happy.st, clearTimeout: happy.ct }); },
};

// Symbol keys on <form> and <select>. happy-dom (20.8.4) returns a Proxy for each, whose getOwnPropertyDescriptor
// trap calls Number(property) for a key the element lacks, so Object.hasOwn(form, aSymbol) throws "Cannot convert
// a symbol to a number"; in a browser it is false. SoundScript's viewRef tests a view's element that way. The trap
// is created inside happy-dom's constructor, so the Proxy constructor of this realm (happy-dom's) is wrapped to
// answer a symbol key from the target itself, for a handler whose target is a happy-dom Node.
import { Node as HappyNode } from "happy-dom";
const RealProxy = globalThis.Proxy;
export const symbolKeysOnFormProxies: Capability & { preBoot(): void; undo(): void } = {
  name: "symbol-keys-on-form-proxies",
  install() {},
  preBoot() {
    globalThis.Proxy = new RealProxy(RealProxy, {
      construct(P, [target, handler]: [any, ProxyHandler<any>], nt) {
        const trap = handler?.getOwnPropertyDescriptor;
        if (trap && target instanceof HappyNode) {
          handler = { ...handler, getOwnPropertyDescriptor: (t, p) => (typeof p === "symbol" ? Reflect.getOwnPropertyDescriptor(t, p) : trap.call(handler, t, p)) };
        }
        return Reflect.construct(P, [target, handler], nt);
      },
    });
  },
  undo() { globalThis.Proxy = RealProxy; },
};

// Worker. happy-dom has none, so the vm realm has none. Bun's Worker runs a blob: URL made by the realm's
// URL.createObjectURL (lope-runtime's PatchedURL calls bun's own), with self.onmessage / self.postMessage and
// transfer lists. One difference from a browser: a message's data is made in bun's realm, not the page's, so
// `data instanceof Uint8Array` in notebook code is false (ArrayBuffer.isView and indexing work).
export const worker: Capability = {
  name: "worker",
  install(g) { g("window").Worker = globalThis.Worker; },
};

// A <script> is a raw-text element: in a browser `script.innerHTML = s` stores s verbatim. happy-dom parses it as
// HTML, so `StateCell<number>` in realize's module text loses `<number>` (an element) and the checker rejects the
// cell ("StateCell takes one type argument"). Setting innerHTML on a script sets its text instead.
export const scriptInnerHtmlIsText: Capability = {
  name: "script-innerhtml-is-text",
  install(g) {
    const SP = g("HTMLScriptElement").prototype;
    let p = SP, d: PropertyDescriptor | undefined;
    while (p && !(d = Object.getOwnPropertyDescriptor(p, "innerHTML"))) p = Object.getPrototypeOf(p);
    Object.defineProperty(SP, "innerHTML", { configurable: true, get() { return d!.get!.call(this); }, set(s: string) { this.textContent = String(s); } });
  },
};

export const ALL: Capability[] = [inlineModuleShim, scriptInnerHtmlIsText, frames, symbolKeysOnFormProxies, worker];

// Tests that need a capability this harness does not supply. A failure of one of these is reported SKIPPED
// only when `present` (a probe of the page's realm, run after the tests) says the capability is absent.
export const NEEDS: { module: string; test: string; capability: string; why: string; present(g: (name: string) => any): Promise<boolean> | boolean }[] = [
  {
    module: "@tomlarkworthy/exporter-3", test: "test_networking_script_resolves_in_a_blob_fork",
    capability: "script execution in an iframe",
    why: "lope-runtime.js runs happy-dom with disableJavaScriptEvaluation; a blob: iframe's scripts never run",
    present: (g) => {
      const d = g("document"), f = d.createElement("iframe");
      d.body.appendChild(f);
      try {
        const s = f.contentDocument.createElement("script");
        s.textContent = "window.__bunVerifyProbe = 1";
        f.contentDocument.body.appendChild(s);
        return f.contentWindow.__bunVerifyProbe === 1;
      } catch { return false; } finally { f.remove(); }
    },
  },
];
