// exporter-mcp boot core — the blob-free replacement for exporter-3's networking_script.
//
// Same content-addressing model as exporter-3: every dependency is a <script type="text/plain"
// id="..."> block and `normalize()` maps a specifier onto a block id. What changes is execution.
// exporter-3 hands the source to es-module-shims, which mints a blob: URL per module and native
// -imports it; a sandbox that forbids blob: script URLs kills the whole notebook. Here each module
// is rewritten (lope-esm-rewrite) into a Function body and run with `new Function`, so `eval` is
// the only privilege required. es-module-shims is not shipped at all.
//
// Expects two globals to already exist in the page:
//   __lopeParse    es-module-lexer parse()
//   __lopeRewrite  rewriteModule(src, parse) -> {body, exports}
//
// Publishes:
//   window.importShim      (specifier, opts?) -> Promise<namespace>  — same name the bootloader,
//                          the exporter's generated `main.define("module X", ...)` lines and every
//                          `import()` in a cell already use, so no module needs to change
//   window.lopecode        { dvfBytes, contentSync } — unchanged from exporter-3
(function () {
  const normalize = (url) =>
    url.replace(/^(?:https:\/\/api\.observablehq\.com)?\/(.*?)\.js(?:\?.*)?$/, "$1").replace(/^(d\/[a-f0-9]{16})@\d+$/, "$1");
  const isNotebook = (id) => /^(@[^/]+\/[^/]+|d\/[a-f0-9]{16})$/.test(id);

  // --- streaming gate (verbatim from exporter-3: boot starts before the file finishes parsing) ---
  window.__lopeStreaming = true;
  function __endStreaming() { window.__lopeStreaming = false; }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", __endStreaming, { once: true });
    window.addEventListener("load", __endStreaming, { once: true });
  } else {
    __endStreaming();
  }
  function __isComplete(el) { return !!el && (el.nextSibling != null || !window.__lopeStreaming); }
  function __waitForId(id) {
    if (__isComplete(document.getElementById(id)) || !window.__lopeStreaming) return Promise.resolve();
    return new Promise((resolve) => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        mo.disconnect();
        document.removeEventListener("DOMContentLoaded", onEnd);
        window.removeEventListener("load", onEnd);
        resolve();
      };
      const check = () => { if (__isComplete(document.getElementById(id)) || !window.__lopeStreaming) finish(); };
      const onEnd = () => { __endStreaming(); finish(); };
      const mo = new MutationObserver(check);
      mo.observe(document.documentElement, { childList: true, subtree: true });
      document.addEventListener("DOMContentLoaded", onEnd);
      window.addEventListener("load", onEnd);
      check();
    });
  }

  const b64ToBytes = (b64) => {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  };

  async function dvfBytes(id) {
    await __waitForId(id);
    const el = document.getElementById(id);
    if (!el) return { status: 404 };
    const mime = el.getAttribute("data-mime");
    if (!mime) return { status: 415 };
    const enc = (el.getAttribute("data-encoding") || "text").toLowerCase();
    const text = el.textContent || "";
    try {
      if (enc === "text") return { status: 200, mime, bytes: new TextEncoder().encode(text) };
      if (enc === "base64") return { status: 200, mime, bytes: b64ToBytes(text) };
      if (enc === "base64+gzip") {
        const stream = new Blob([b64ToBytes(text)]).stream().pipeThrough(new DecompressionStream("gzip"));
        return { status: 200, mime, bytes: new Uint8Array(await new Response(stream).arrayBuffer()) };
      }
    } catch {
      return { status: enc.includes("gzip") ? 499 : 422 };
    }
    return { status: 422 };
  }

  function contentSync(id) {
    const el = document.getElementById(id);
    if (!el) return { status: 404 };
    const mime = el.getAttribute("data-mime");
    if (!mime) return { status: 415 };
    const enc = (el.getAttribute("data-encoding") || "text").toLowerCase();
    const text = el.textContent || "";
    try {
      if (enc === "text") return { status: 200, mime, bytes: new TextEncoder().encode(text) };
      if (enc === "base64") return { status: 200, mime, bytes: b64ToBytes(text) };
    } catch {
      return { status: enc.includes("gzip") ? 499 : 422 };
    }
    return { status: 422 };
  }

  // --- object URL registry ---
  // Minting an object URL always succeeds; *consuming* one is what a sandbox blocks. Measured in a
  // claudeusercontent.com artifact frame (2026-07): createObjectURL returns a `blob-request://…`
  // handle that is readable by neither fetch nor import nor <img src>, while data: URLs render as
  // images fine. So never assume the returned string is a usable URL, and never key off the `blob:`
  // scheme — key off registry membership, which holds whatever the host handed back.
  const _fetch = globalThis.fetch.bind(globalThis);
  const blobs = new Map();
  let objectUrlSeq = 0;
  const _createObjectURL = URL.createObjectURL.bind(URL);
  const _revokeObjectURL = URL.revokeObjectURL.bind(URL);

  // Is the host's object URL a real, readable URL? The scheme check catches the artifact frame
  // synchronously (createObjectURL is sync, so callers cannot wait for a probe); the fetch probe
  // then downgrades hosts that mint a well-formed blob: URL they will not let us read.
  let objectUrlUsable = false;
  (function probeObjectUrls() {
    let url;
    try { url = _createObjectURL(new Blob(["probe"], { type: "text/plain" })); } catch { return; }
    objectUrlUsable = typeof url === "string" && url.startsWith("blob:");
    if (!objectUrlUsable) { try { _revokeObjectURL(url); } catch {} return; }
    _fetch(url).then((r) => { if (!r.ok) objectUrlUsable = false; }, () => { objectUrlUsable = false; })
      .then(() => { try { _revokeObjectURL(url); } catch {} });
  })();

  URL.createObjectURL = function (obj) {
    let url;
    try { url = _createObjectURL(obj); } catch { url = null; }
    if (typeof url !== "string") url = `lope-vfs://${++objectUrlSeq}`;
    if (obj && typeof obj.arrayBuffer === "function") blobs.set(url, obj);
    return url;
  };
  URL.revokeObjectURL = function (url) {
    blobs.delete(url);
    if (typeof url === "string" && url.startsWith("lope-vfs://")) return;
    try { return _revokeObjectURL(url); } catch {}
  };

  const toDataUrl = (blob) =>
    new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => res(fr.result);
      fr.onerror = () => rej(fr.error);
      fr.readAsDataURL(blob);
    });

  // <img src=objectURL> is refused where object URLs are unreadable, but data: URLs render. Swap on
  // assignment so `FileAttachment(x).url()` still produces a visible image.
  (function patchImageSrc() {
    const desc = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, "src");
    if (!desc || !desc.set) return;
    Object.defineProperty(HTMLImageElement.prototype, "src", {
      configurable: true,
      enumerable: desc.enumerable,
      get() { return this.__lopeImgSrc ?? desc.get.call(this); },
      set(v) {
        if (!objectUrlUsable && typeof v === "string" && blobs.has(v)) {
          this.__lopeImgSrc = v;
          const el = this;
          toDataUrl(blobs.get(v)).then((d) => desc.set.call(el, d), () => desc.set.call(el, v));
          return;
        }
        this.__lopeImgSrc = undefined;
        desc.set.call(this, v);
      },
    });
  })();

  // --- source resolution ---
  // A key is either a block id, a registered object URL, or an off-notebook absolute URL.
  function resolveKey(spec) {
    if (typeof spec !== "string") throw new Error("bad specifier: " + spec);
    if (blobs.has(spec)) return spec; // registry first: the host's scheme is not ours to predict
    if (spec.startsWith("blob:") || spec.startsWith("data:")) return spec;
    // Block ids are whatever the exporter wrote: usually a bare module name, but some are
    // literally "file://name" (e.g. file://syntax.css), so try the specifier as-is first.
    const id = normalize(spec);
    if (document.getElementById(id)) return id;
    if (spec.startsWith("file://")) return spec.slice(7);
    if (window.__lopeStreaming && isNotebook(id)) return id; // may still be streaming in
    if (isNotebook(id)) return `https://api.observablehq.com/${id}.js?v=4`;
    return id;
  }

  async function sourceFor(key) {
    if (blobs.has(key)) {
      const blob = blobs.get(key);
      return { text: await blob.text(), mime: blob.type || "application/javascript" };
    }
    if (key.startsWith("blob:") || key.startsWith("lope-vfs://")) throw new Error("unregistered object URL: " + key);
    if (key.startsWith("data:")) {
      const comma = key.indexOf(",");
      const head = key.slice(5, comma);
      const body = key.slice(comma + 1);
      const text = head.endsWith(";base64") ? new TextDecoder().decode(b64ToBytes(body)) : decodeURIComponent(body);
      return { text, mime: head.replace(/;base64$/, "") || "text/plain" };
    }
    if (document.getElementById(key) || window.__lopeStreaming) {
      const r = await dvfBytes(key);
      if (r.status === 200) return { text: new TextDecoder().decode(r.bytes), mime: r.mime };
      if (r.status !== 404) throw new Error(`DVF ${r.status} for ${key}`);
    }
    const res = await _fetch(key);
    if (!res.ok) throw new Error(`fetch ${res.status} for ${key}`);
    return { text: await res.text(), mime: res.headers.get("content-type") || "application/javascript" };
  }

  // --- module registry ---
  const modules = new Map();

  function lopeImport(spec, opts) {
    let key;
    try { key = resolveKey(spec); } catch (e) { return Promise.reject(e); }
    const attr = opts && opts.with && opts.with.type;
    const cacheKey = attr ? `${key} ${attr}` : key;
    let mod = modules.get(cacheKey);
    if (!mod) {
      mod = instantiate(key, attr).catch((e) => {
        modules.delete(cacheKey); // a failed import should be retryable
        throw e;
      });
      modules.set(cacheKey, mod);
    }
    return mod;
  }

  async function instantiate(key, attr) {
    const { text, mime } = await sourceFor(key);
    if (attr === "css" || (!attr && /^text\/css/.test(mime))) {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(text);
      return Object.freeze({ default: sheet });
    }
    if (attr === "json" || (!attr && /^application\/json/.test(mime))) {
      return Object.freeze({ default: JSON.parse(text) });
    }
    const ns = Object.create(null);
    const lope = {
      x: ns,
      meta: { url: key, resolve: (s) => resolveKey(s) },
      imp: (s, o) => lopeImport(s, o),
      star: (other) => {
        for (const k of Object.keys(other)) if (k !== "default") ns[k] = other[k];
      },
    };
    let body;
    try {
      body = __lopeRewrite(text, __lopeParse).body;
    } catch (e) {
      throw new Error(`rewrite failed for ${key}: ${e.message}`);
    }
    const fn = new Function("__lope", `"use strict";return (async()=>{\n${body}\n})()\n//# sourceURL=lope:///${key}`);
    await fn(lope);
    return ns;
  }

  // --- platform patches ---
  const bytesResponse = (r) =>
    r.status !== 200
      ? new Response(null, { status: r.status })
      : new Response(r.bytes, {
          status: 200,
          headers: { "Content-Type": r.mime, "Content-Length": String(r.bytes.byteLength) },
        });

  globalThis.fetch = function (url, init) {
    if (typeof url === "string") {
      // serve registered object URLs ourselves: the host may not let us read back what it minted
      if (blobs.has(url)) {
        const blob = blobs.get(url);
        return blob.arrayBuffer().then(
          (ab) => new Response(ab, { status: 200, headers: { "Content-Type": blob.type || "application/octet-stream" } })
        );
      }
      let id = null;
      if (url.startsWith("file://")) id = url.slice(7);
      else if (document.getElementById(normalize(url))) id = normalize(url);
      if (id) return dvfBytes(id).then(bytesResponse);
    }
    return _fetch(url, init);
  };

  // Classic <script src> loads (d3-require pulls the UMD builtins — lodash, htl, marked,
  // highlight — this way). exporter-3 pointed the src at a blob: URL; here we inline the bytes as
  // script text instead, which needs no extra CSP source beyond the 'unsafe-inline' the page
  // already relies on. Insertion is deferred until the bytes are ready, then `load` fires, so
  // callers that wait on onload still work.
  (function patchScriptSrc() {
    const localKey = (v) => {
      if (typeof v !== "string") return null;
      if (blobs.has(v)) return v;
      const id = normalize(v);
      if (document.getElementById(id)) return id;
      if (v.startsWith("file://") && document.getElementById(v.slice(7))) return v.slice(7);
      return null;
    };
    const desc = Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, "src");
    const _create = Document.prototype.createElement;
    Document.prototype.createElement = function (name, opts) {
      const el = _create.call(this, name, opts);
      if (String(name).toLowerCase() !== "script") return el;
      const claim = (v) => {
        const key = localKey(v);
        if (!key) return false;
        el.__lopeKey = key;
        el.__lopeSrc = v;
        return true;
      };
      Object.defineProperty(el, "src", {
        configurable: true,
        get: () => el.__lopeSrc ?? desc.get.call(el),
        set: (v) => { if (!claim(v)) desc.set.call(el, v); },
      });
      const _setAttribute = el.setAttribute.bind(el);
      el.setAttribute = (n, v) => (String(n).toLowerCase() === "src" && claim(v) ? undefined : _setAttribute(n, v));
      return el;
    };
    for (const method of ["appendChild", "insertBefore"]) {
      const orig = Node.prototype[method];
      Node.prototype[method] = function (node, ref) {
        if (!node || !node.__lopeKey || node.__lopeInlined) return orig.call(this, node, ref);
        node.__lopeInlined = true;
        const parent = this;
        sourceFor(node.__lopeKey).then(
          ({ text }) => {
            node.textContent = text;
            orig.call(parent, node, ref);
            node.dispatchEvent(new Event("load"));
          },
          () => node.dispatchEvent(new Event("error"))
        );
        return node;
      };
    }
  })();

  (function patchXHR() {
    const _open = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (method, url, ...rest) {
      if (typeof url === "string" && url.startsWith("file://")) {
        // exporter-3 redirected these to a blob: URL; keep the data in-page instead
        this.__lopeId = url.slice(7);
        return _open.call(this, method, "about:blank", ...rest);
      }
      return _open.call(this, method, url, ...rest);
    };
    const _send = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function (...args) {
      if (!this.__lopeId) return _send.apply(this, args);
      const id = this.__lopeId;
      dvfBytes(id).then((r) => {
        const text = r.status === 200 ? new TextDecoder().decode(r.bytes) : "";
        Object.defineProperty(this, "status", { value: r.status, configurable: true });
        Object.defineProperty(this, "responseText", { value: text, configurable: true });
        Object.defineProperty(this, "response", { value: text, configurable: true });
        Object.defineProperty(this, "readyState", { value: 4, configurable: true });
        this.dispatchEvent(new Event("readystatechange"));
        this.dispatchEvent(new Event(r.status === 200 ? "load" : "error"));
        this.dispatchEvent(new Event("loadend"));
      });
    };
  })();

  window.lopecode = { dvfBytes, contentSync };
  window.importShim = lopeImport;
  window.__lopeImport = lopeImport;
  window.__lopeModules = modules;
})();
