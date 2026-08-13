// The @tomlarkworthy/claude-code-browser app cell (INTERACTIVE + rc5 fs).
// Mounts an xterm.js terminal in the notebook cell and runs the unmodified
// Claude Code cli.js v2.1.112 as a full interactive TUI inside a persistent
// same-origin srcdoc iframe, its stdio bridged to the terminal. cli.js's
// filesystem tools are backed by the notebook's own modules via __RC5FS.
//
// Build-time substitution: /*__IMPORT_MAP__*/  ->  the node:* -> dist importmap.
// This file is `node --check`-able and carries no literal close-script token.
function _claudeCodeBrowser(FileAttachment, runtime, importShim, createModule, currentModules, exportModuleJS, jbApply, probeDefine){return((() => {
  const IMPORT_MAP = /*__IMPORT_MAP__*/;
  window.__CB_INSTANCES = (window.__CB_INSTANCES || 0) + 1;
  const INSTANCE = window.__CB_INSTANCES;
  // This cell re-renders whenever its reactive inputs change, and currentModules floods
  // as modules load. Each re-render used to build a brand new terminal while cli.js kept
  // writing to the previous one: measured under CPU throttle as instance 4 of 4 on
  // screen, the boot output sitting in instance 1's buffer, screen blank forever. That,
  // not paint timing, is what blanks the terminal. So the first instance owns the
  // terminal, the iframe and the DOM for the life of the page; later instances only
  // publish fresh dependency values and hand back the same node.
  window.__CB_DEPS = { FileAttachment, runtime, importShim, createModule, currentModules, exportModuleJS, jbApply, probeDefine };
  const D = () => window.__CB_DEPS;
  if (window.__CB_ROOT) return window.__CB_ROOT;
  // No key ships with the notebook. Blank key => the rate-limited demo gateway
  // (per-IP daily budget, MiMo-only, injects the key server-side), same as
  // robocoop-5's _client. A user key goes straight to OpenRouter instead.
  const GATEWAY = "https://openrouter-gateway.endpointservices.workers.dev/v1";
  const DIRECT = "https://openrouter.ai/api/v1";
  const ANTHROPIC = "https://api.anthropic.com";
  const KEY_LS = "openrouter_key";
  const PROVIDER_LS = "claude_provider";
  const URL_LS = "claude_base_url";
  const YOLO_LS = "claude_yolo";

  // ---- UI shell ----
  const root = document.createElement("div");
  window.__CB_ROOT = root;
  root.style.cssText = "font:14px/1.5 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;height:100%;display:flex;flex-direction:column;gap:8px;padding:8px;box-sizing:border-box;background:#1e1e1e;color:#ddd";
  root.innerHTML = [
    "<div style='display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap'>",
    "  <div style='display:flex;flex-direction:column;gap:3px;flex:0 0 150px'>",
    "    <label style='font-size:11px;font-weight:600;opacity:.7'>API</label>",
    "    <select id='cb-provider' style='font:inherit;padding:6px 8px;border:1px solid #555;border-radius:5px;background:#2a2a2a;color:#eee'>",
    "      <option value='openrouter'>OpenRouter</option>",
    "      <option value='anthropic'>Anthropic</option>",
    "    </select>",
    "  </div>",
    "  <div style='display:flex;flex-direction:column;gap:3px;flex:1;min-width:230px'>",
    "    <label style='font-size:11px;font-weight:600;opacity:.7'>Base URL <span id='cb-url-hint' style='font-weight:400;opacity:.6'></span></label>",
    "    <input id='cb-url' type='text' spellcheck='false' style='font:inherit;padding:6px 8px;border:1px solid #555;border-radius:5px;background:#2a2a2a;color:#eee'>",
    "  </div>",
    "  <div style='display:flex;flex-direction:column;gap:3px;flex:1;min-width:260px'>",
    "    <label style='font-size:11px;font-weight:600;opacity:.7'>Model <span id='cb-model-hint' style='font-weight:400;opacity:.6'></span></label>",
    "    <input id='cb-model' type='text' list='cb-models' value='xiaomi/mimo-v2.5-pro' spellcheck='false' style='font:inherit;padding:6px 8px;border:1px solid #555;border-radius:5px;background:#2a2a2a;color:#eee'>",
    "    <datalist id='cb-models'></datalist>",
    "  </div>",
    "  <div style='display:flex;flex-direction:column;gap:3px;flex:0 0 240px'>",
    "    <label style='font-size:11px;font-weight:600;opacity:.7'><span id='cb-key-label'>OpenRouter</span> API key <span style='font-weight:400;opacity:.6'>(optional)</span></label>",
    "    <input id='cb-key' type='password' placeholder='blank = demo gateway' autocomplete='off' spellcheck='false' style='font:inherit;padding:6px 8px;border:1px solid #555;border-radius:5px;background:#2a2a2a;color:#eee'>",
    "  </div>",
    "  <button id='cb-restart' title='Reboot the session' style='font:inherit;font-weight:600;padding:7px 14px;border:0;border-radius:5px;background:#444;color:#fff;cursor:pointer'>Restart</button>",
    "</div>",
    "<div style='display:flex;gap:16px;align-items:center;flex-wrap:wrap;font-size:12px;opacity:.85'>",
    "  <label style='display:flex;gap:6px;align-items:center;cursor:pointer' title='--dangerously-skip-permissions. Safe here: the filesystem is this notebook&#39;s own modules, subprocesses fail gracefully and sockets are inert.'>",
    "    <input id='cb-yolo' type='checkbox' style='margin:0'> YOLO mode <span style='opacity:.6'>(skip permission prompts)</span>",
    "  </label>",
    "</div>",
    "<div id='cb-demo' style='display:none;font-size:12px;line-height:1.6;padding:8px 10px;border:1px solid #3a3a3a;border-radius:6px;background:#242424'></div>",
    "<div id='cb-status' style='font-size:12px;opacity:.8;min-height:16px'></div>",
    "<div id='cb-term' style='flex:1;min-height:360px;background:#000;border:1px solid #333;border-radius:6px;overflow:hidden'></div>"
  ].join("\n");

  const q = (id) => root.querySelector("#" + id);
  const keyEl = q("cb-key"), modelEl = q("cb-model"),
        restartEl = q("cb-restart"), statusEl = q("cb-status"), termHost = q("cb-term"),
        yoloEl = q("cb-yolo"), providerEl = q("cb-provider"), urlEl = q("cb-url");
  try { providerEl.value = localStorage.getItem(PROVIDER_LS) || "openrouter"; } catch {}
  const provider = () => (providerEl.value === "anthropic" ? "anthropic" : "openrouter");
  // Blank means "whatever this provider defaults to", so the field can always be
  // cleared back to a working state.
  const defaultUrl = () => (provider() === "anthropic" ? ANTHROPIC : (keyEl.value.trim() ? DIRECT : GATEWAY));
  const baseUrl = () => (urlEl.value.trim().replace(/\/+$/, "") || defaultUrl());
  function syncProviderUI() {
    const anth = provider() === "anthropic";
    q("cb-key-label").textContent = anth ? "Anthropic" : "OpenRouter";
    keyEl.placeholder = anth ? "blank = sign in with /login" : "blank = demo gateway";
    urlEl.placeholder = defaultUrl();
    q("cb-url-hint").textContent = urlEl.value.trim() ? "(overridden)" : "(default)";
    demoEl.innerHTML = anth ? ANTHROPIC_NOTE : DEMO_NOTE;
    q("cb-model-hint").textContent = anth ? "(Anthropic model ids)" : q("cb-model-hint").textContent;
  }
  try { const k = localStorage.getItem(KEY_LS); if (k) keyEl.value = k; } catch {}
  try { const u = localStorage.getItem(URL_LS); if (u) urlEl.value = u; } catch {}
  // YOLO defaults ON: in this sandbox the fs is the notebook's own modules,
  // child_process fails gracefully and sockets are inert, so prompts are friction.
  yoloEl.checked = (() => { try { return localStorage.getItem(YOLO_LS) !== "0"; } catch { return true; } })();
  yoloEl.addEventListener("change", () => { try { localStorage.setItem(YOLO_LS, yoloEl.checked ? "1" : "0"); } catch {} });

  const DEMO_NOTE = "Leave the key blank and this runs on a shared <b>demo gateway</b> that supplies the key for you. "
    + "It is rate limited per user against a small daily budget and serves MiMo only, so if it stops responding the day's budget is likely spent. "
    + "Add your own key from openrouter.ai/keys to use any model on your own quota.";
  // Measured, not assumed: api.anthropic.com refuses a browser outright unless the
  // request carries anthropic-dangerous-direct-browser-access (added for you here), and
  // the OAuth token endpoint sends no CORS headers at all, so /login can produce a code
  // it cannot then redeem.
  const ANTHROPIC_NOTE = "Talks to the Anthropic API directly, with no translation. "
    + "<b>Paste an API key</b> to use it. With the key blank no credential is sent at all, so <code>/login</code> runs and will show you a sign-in URL "
    + "— but the browser blocks the final token exchange (CORS), so a subscription login cannot complete in-page yet.";
  const demoEl = q("cb-demo");
  demoEl.style.display = "";
  demoEl.innerHTML = DEMO_NOTE;

  // Model list from the endpoint actually in use. Datalist rather than a select so
  // any id can still be typed or pasted. Demo mode lists only what it can serve.
  // Anthropic's /v1/models needs credentials we may deliberately not have (the whole
  // point of the no-key path is to let /login supply them), so that list is static.
  const ANTHROPIC_MODELS = ["claude-opus-4-5", "claude-sonnet-4-5", "claude-haiku-4-5"];
  async function loadModels() {
    const dl = q("cb-models"), hint = q("cb-model-hint");
    const demo = !keyEl.value.trim();
    dl.innerHTML = "";
    if (provider() === "anthropic") {
      for (const id of ANTHROPIC_MODELS) { const o = document.createElement("option"); o.value = id; dl.appendChild(o); }
      hint.textContent = "(Anthropic)";
      return;
    }
    try {
      const r = await fetch(baseUrl() + "/models");
      let models = ((await r.json()).data || []).slice().sort((a, b) => a.id < b.id ? -1 : 1);
      if (demo) models = models.filter((m) => /^xiaomi\//.test(m.id)); // gateway key is MiMo-only
      for (const m of models) {
        const o = document.createElement("option");
        o.value = m.id;
        if (m.name) o.label = m.name;
        dl.appendChild(o);
      }
      hint.textContent = demo ? "(" + models.length + " on the demo gateway)" : "(" + models.length + " from OpenRouter)";
    } catch (e) { hint.textContent = "(list unavailable — type an id)"; }
  }
  syncProviderUI();
  loadModels();
  const setStatus = (t) => { statusEl.textContent = t; };

  // gzip FileAttachment -> text (DecompressionStream).
  async function gunzipText(att) {
    const stream = (await att.stream()).pipeThrough(new DecompressionStream("gzip"));
    return await new Response(stream).text();
  }

  // ---- xterm (inlined offline; injected as real <script>/<style>) ----
  // The lopepage global has an AMD `define` (define.amd), so a bare xterm UMD would
  // register with AMD instead of assigning window.Terminal. Evaluate it inside an IIFE
  // that shadows define/module/exports as undefined, forcing the browser-global branch.
  function injectUMD(src) {
    const wrapped = "(function(define, module, exports){\n" + src + "\n}).call(globalThis, void 0, void 0, void 0);";
    const s = document.createElement("script"); s.textContent = wrapped; document.head.appendChild(s);
  }
  let term = null, fit = null;
  function newTerminal() {
    const t = new window.Terminal({
      cols: 100, rows: 30, convertEol: false, cursorBlink: true,
      fontFamily: 'ui-monospace, Menlo, Monaco, "Courier New", monospace',
      fontSize: 13, theme: { background: "#000000", foreground: "#e0e0e0" },
      allowProposedApi: true,
    });
    try { fit = new window.FitAddon.FitAddon(); t.loadAddon(fit); } catch {}
    attachProbes(t);
    return t;
  }
  async function ensureXterm() {
    if (!window.Terminal) {
      const css = await gunzipText(FileAttachment("xterm.css.gz"));
      const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
      injectUMD(await gunzipText(FileAttachment("xterm.js.gz")));
      injectUMD(await gunzipText(FileAttachment("addon-fit.js.gz")));
    }
    if (!term) {
      term = newTerminal();
      window.__term = () => term; // debug handle; term is swapped by healIfBlank
      window.__ptyWrite = (s) => { health.writes++; trace("write", { n: s.length }); try { term.write(s); } catch (e) { trace("write-threw", { msg: String(e && e.message) }); } };
      window.__sendKeys = (s) => ptyIn(s);
      window.__dumpTerm = () => {
        const buf = term.buffer.active; const lines = [];
        for (let i = 0; i < buf.length; i++) { const l = buf.getLine(i); lines.push(l ? l.translateToString(true) : ""); }
        while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
        return lines.join("\n");
      };

      // Input bridge. An ancestor in the lopepage pane has a capture-phase
      // keydown listener that stopPropagation()s before events reach this cell,
      // so a host-level listener never fires (verified: window/document see the
      // key, the cell host sees 0). Listen at document capture — which runs
      // before that ancestor — and act only while an xterm textarea holds focus.
      // Convert keys to PTY bytes ourselves; xterm's own key path is unreliable
      // here too.
      const inTerm = () => { const a = document.activeElement; return !!(a && termHost.contains(a)); };
      document.addEventListener("keydown", (e) => {
        if (!inTerm()) return;
        const b = keyToBytes(e);
        if (b == null) return;
        ptyIn(b);
        e.preventDefault(); e.stopImmediatePropagation();
      }, true);
      document.addEventListener("paste", (e) => {
        if (!inTerm()) return;
        try { const t = (e.clipboardData || window.clipboardData).getData("text"); if (t) ptyIn(t); } catch {}
        e.preventDefault(); e.stopImmediatePropagation();
      }, true);
      termHost.tabIndex = 0;
      termHost.addEventListener("mousedown", () => { try { term.focus(); } catch {} });

      await openTerminal();
    }
  }

  // A Terminal opened while the window is not actually painting — another monitor, a
  // background window, a hidden pane — comes up permanently wedged: rows never fill
  // even though the buffer does, and nothing revives it (write, resize, refresh,
  // fontSize change and fit were all verified to fail on a wedged instance). Only a
  // Terminal constructed while the page really paints works. Since no public API
  // reports the broken state, prove it: write a canary and check it reached the DOM.
  const sized = () => termHost.clientWidth > 0 && termHost.clientHeight > 0;
  const whenSized = () => sized() ? Promise.resolve()
    : new Promise((res) => { const ro = new ResizeObserver(() => { if (sized()) { ro.disconnect(); res(); } }); ro.observe(termHost); });
  const whenVisible = () => document.visibilityState === "visible" ? Promise.resolve()
    : new Promise((res) => { const h = () => { if (document.visibilityState === "visible") { document.removeEventListener("visibilitychange", h); res(); } }; document.addEventListener("visibilitychange", h); });
  const twoFrames = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  const renderedLen = () => { const r = termHost.querySelector(".xterm-rows"); return r ? r.textContent.trim().length : 0; };
  const bufferedLen = () => { try { return window.__dumpTerm().trim().length; } catch { return 0; } };

  // Health is measured from the terminal's OWN events, not from a clock:
  //   onWriteParsed - the emulator consumed the bytes we wrote
  //   onRender      - the renderer painted rows (and which rows)
  // Comparing "the renderer says it painted" against "the DOM has characters"
  // identifies a wedged terminal directly and immediately, instead of inferring it
  // from how long something took, which is really a guess about machine speed.
  const health = { writes: 0, parses: 0, renders: 0, lastRange: null, blankPaints: 0, openRetries: 0, wedges: 0, nudges: 0, trace: [] };
  let renderWaiters = [];
  function attachProbes(t) {
    try {
      t.onRender((e) => {
        health.renders++; health.lastRange = e;
        // The direct wedge test, available on EVERY paint rather than only at open:
        // the renderer says it drew these rows, so if the screen is empty while the
        // buffer holds text, this terminal is not putting output where anyone can see it.
        const chars = renderedLen();
        trace("render", { rows: e.end - e.start + 1, chars });
        if (chars === 0) {
          const buffered = bufferedLen();
          // A single empty paint is not a verdict - xterm clears rows mid-repaint, so
          // this is a suspicion. It becomes a wedge only if the screen is still empty
          // after the app has been asked to redraw (see healIfBlank).
          if (buffered > 0) { health.blankPaints++; trace("blank-paint", { rows: e.end - e.start + 1, buffered }); onWedge(); }
        }
        const w = renderWaiters; renderWaiters = [];
        for (const fn of w) fn();
      });
    } catch { trace("no-onRender", {}); }
    try { t.onWriteParsed(() => { health.parses++; trace("parsed", { chars: renderedLen() }); onParsed(); }); }
    catch { trace("no-onWriteParsed", {}); }
  }
  function trace(ev, data) {
    health.trace.push({ ev, r: health.renders, p: health.parses, ...data });
    if (health.trace.length > 60) health.trace.shift();
  }

  // Frames are used ONLY as a give-up bound for an event that may never arrive, never
  // as the measurement. A frame budget stretches with the hardware (frames tick when
  // the browser paints), so a slow machine simply gets more wall-clock time.
  function waitFrames(pred, maxFrames) {
    return new Promise((resolve) => {
      let n = 0;
      const tick = () => {
        if (pred()) return resolve(true);
        if (++n >= maxFrames) return resolve(false);
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }
  // Resolves true when the renderer reports a paint, false if it never reports one.
  function nextRender(maxFrames) {
    return new Promise((resolve) => {
      let done = false;
      const settle = (v) => { if (!done) { done = true; resolve(v); } };
      renderWaiters.push(() => settle(true));
      waitFrames(() => done, maxFrames || 240).then(() => settle(false));
    });
  }

  window.__canaryLog = [];
  // Write a glyph and ask the renderer what happened. Three distinguishable outcomes:
  //   painted + DOM has it  -> healthy
  //   painted + DOM empty   -> wedged, known immediately (this is the failure mode)
  //   never painted         -> the window is not drawing yet; not evidence of a wedge
  async function paintsCanary() {
    const before = health.renders;
    term.write("\u2588"); health.writes++;
    const painted = await nextRender();
    const chars = renderedLen();
    const ok = painted && chars > 0;
    // Wedged at open: the renderer painted and produced nothing. openTerminal discards
    // this terminal and builds another, so it is a recovered condition, not a failure.
    if (painted && chars === 0) health.openRetries++;
    window.__canaryLog.push({ ok, painted, chars, renders: health.renders - before,
      rowsEl: !!termHost.querySelector(".xterm-rows"), host: termHost.clientWidth + "x" + termHost.clientHeight });
    try { term.reset(); } catch {}
    return ok;
  }

  async function openTerminal(attempts) {
    const last = (attempts || 6) - 1;
    for (let attempt = 0; attempt <= last; attempt++) {
      await whenVisible();
      await whenSized();
      try { await document.fonts.ready; } catch {}
      await twoFrames();
      term.open(termHost);
      try { fit && fit.fit(); } catch {}
      if (await paintsCanary()) break;
      // Never end the loop holding an unopened terminal: output would land in a
      // buffer with nothing on screen, turning a false negative into a dead pane.
      // Degrade to the opened one and let the watchdog retry instead.
      if (attempt === last) break;
      try { term.dispose(); } catch {}   // wedged — discard and wait for a real paint
      termHost.innerHTML = "";
      term = newTerminal();
      await waitFrames(() => false, 30); // yield real frames before retrying
    }
    try { window.__termSize = { cols: term.cols, rows: term.rows }; } catch {}
    pushResize();
    try { term.focus(); } catch {}
  }

  // If it wedges anyway — the window can stay unpainted for the whole boot, so the
  // canary loop above can time out and attach a wedged terminal — rebuild and make
  // Ink repaint via a real SIGWINCH. The buffer cannot be replayed, so the redraw
  // has to come from the app. Keep watching: the moment the user actually looks at
  // the window it paints again, and that is when the rebuild can succeed.
  // Re-inserting an iframe anywhere in the document reloads it, which would restart
  // cli.js and lose the session, so it never lives inside the cell's own DOM. It is
  // display:none regardless, so a permanent host on <body> costs nothing.
  function frameHost() {
    let h = window.__CB_FRAMEHOST;
    if (!h || !h.isConnected) {
      h = document.createElement("div"); h.id = "cb-frame-host"; h.style.display = "none";
      document.body.appendChild(h); window.__CB_FRAMEHOST = h;
    }
    return h;
  }
  const frameEl = () => frameHost().querySelector("#cb-cli-frame");
  let healing = false;
  window.__healLog = [];

  // Recovery is NON-DESTRUCTIVE and event-driven. Rebuilding a live terminal was
  // measured to be the problem rather than the cure (under CPU throttling it fired 7-8
  // times, each teardown destroying output the previous one was still drawing), and a
  // periodic timer is what kept firing it. So this runs off real data flow instead: the
  // app wrote something, the emulator parsed it, the renderer reported a paint - and
  // the DOM is still empty. Then, and only then, ask Ink to redraw. That costs nothing
  // if the terminal was in fact fine.
  async function healIfBlank() {
    if (healing || !term || !frameEl()) return false;
    if (renderedLen() > 0 || bufferedLen() === 0) return false;
    healing = true;
    try {
      if (await nextRender() && renderedLen() > 0) return false; // it was mid-paint
      if (renderedLen() > 0) return false;
      sigwinch();
      await nextRender();
      const ok = renderedLen() > 0;
      if (!ok) health.wedges++; // confirmed: painted, asked to redraw, still nothing
      window.__healLog.push({ redrawWorked: ok, chars: renderedLen(), renders: health.renders, parses: health.parses });
      return ok;
    } finally { healing = false; }
  }
  // The app redrawing is the natural trigger to check whether the redraw landed.
  function onParsed() { if (!healing && bufferedLen() > 0 && renderedLen() === 0) healIfBlank(); }
  function onWedge() { if (!healing) healIfBlank(); }
  function sigwinch() {
    const fe = frameEl(); const w = fe && fe.contentWindow;
    if (!w || !w.__ptyResize) return;
    health.nudges++;
    w.__ptyResize(Math.max(2, term.cols - 1), term.rows);
    nextRender().then(() => w.__ptyResize(term.cols, term.rows));
  }
  window.__heal = () => healIfBlank();
  // One place to read the engine's real state, for tests and for debugging a live pane.
  window.__termHealth = () => ({
    instance: INSTANCE, instances: window.__CB_INSTANCES,
    ...health,
    renderedChars: renderedLen(), bufferedChars: bufferedLen(),
    cols: term && term.cols, rows: term && term.rows,
    opened: !!termHost.querySelector(".xterm-rows"),
    hasFrame: !!frameEl(), healing,
    canary: window.__canaryLog.slice(-8), heals: window.__healLog.slice(-5),
  });
  window.__healState = () => window.__termHealth();
  window.addEventListener("focus", () => healIfBlank());
  document.addEventListener("visibilitychange", () => healIfBlank());

  // ---- cli.js + shim assets ----
  let DIST_FILES = null, CLI_SRC = null;
  async function ensureAssets() {
    if (DIST_FILES) return;
    DIST_FILES = JSON.parse(await gunzipText(FileAttachment("shims.js.gz")));
    CLI_SRC = await gunzipText(FileAttachment("cli.js.gz"));
  }

  // ---- rc5 filesystem adapter (lean binding over the notebook's own engines) ----
  const rc5_store = { srcFns: new Map(), scratch: new Map() };
  // NOTE: the imported `jbApply` cell is already curried with importShim
  // (its cell = _jbApply(importShim) = makeApply), so call it directly.
  const applyCore = (id, def) => D().jbApply({ currentModules: D().currentModules, runtime: D().runtime, probeDefine: D().probeDefine, createModule: D().createModule })(id, def);
  const MODULE_PATH = /^\/(?:notebook|src)\/(.+)\.js$/;
  let cache = null;

  function moduleIds() {
    const ids = [];
    try { for (const info of D().currentModules.values()) if (info && info.name) ids.push(info.name); } catch {}
    return ids;
  }
  async function seedSrc(id) {
    try {
      const r = await Promise.race([D().exportModuleJS(id), new Promise((res) => setTimeout(() => res(null), 5000))]);
      return r && r.source ? r.source : null;
    } catch { return null; }
  }
  // A notebook block, addressed by its id exactly as it appears in the HTML. This is how
  // rc5 serves /content, and the knowledge docs are stored as blocks with those ids.
  function blockText(id) {
    const el = document.getElementById(id);
    if (!el || el.tagName !== "SCRIPT") return null;
    const enc = (el.getAttribute("data-encoding") || "text").toLowerCase();
    const raw = el.textContent || "";
    if (enc === "text") return raw;
    try {
      const bin = atob(raw.replace(/\s+/g, ""));
      const u = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
      return new TextDecoder().decode(u); // atob alone gives latin1, mangling any non-ASCII
    } catch { return null; }
  }
  function domContent(id) {
    try {
      const c = window.lopecode && window.lopecode.contentSync(id);
      if (!c || c.status !== 200) return null;
      const b = c.bytes;
      if (typeof b === "string") return b;
      if (b instanceof Uint8Array) return new TextDecoder().decode(b);
      return null;
    } catch { return null; }
  }
  // Build the define function SYNCHRONOUSLY, so a compile error is raised during the
  // write rather than inside a promise nobody awaits. `export default function define`
  // becomes `return function define`, which `new Function` can compile without an
  // import(); the cell consts above it stay in scope as the closure they already are.
  // Returns null when the source is not that shape, so the caller falls back to import().
  function defineFromSource(src) {
    if (/^\s*import\s/m.test(src)) return null; // real top-level imports need the async path
    const body = src.replace(/^\s*export\s+default\s+function\s+define/m, "return function define");
    if (body === src) return null;
    return new Function(body)();
  }
  // Throws on failure: fs.writeFileSync propagates it, so cli.js reports the Write as
  // failed in the SAME turn — which is what the session prompt promises. The file keeps
  // the agent's exact text either way; only the live runtime is left untouched.
  function applyModuleSrcSync(id, src) {
    let def;
    try { def = defineFromSource(src); }
    catch (e) { throw new Error("FAILED TO COMPILE " + id + ": " + (e && e.message || e)); }
    if (!def) { applyModuleSrc(id, src); return; } // not our shape: async fallback, no verdict
    let r = null;
    try { r = applyCore(id, def); }
    catch (e) { throw new Error("FAILED TO APPLY " + id + ": " + (e && e.message || e)); }
    def.src = src;
    rc5_store.srcFns.set(id, def);
    if (!(r && r.applied)) throw new Error("FAILED TO APPLY " + id + ": the runtime did not accept the module");
  }

  async function applyModuleSrc(id, src) {
    const u = URL.createObjectURL(new Blob([src], { type: "text/javascript" }));
    let mod = null;
    try { mod = await import(u); } catch (e) { rc5_store.srcFns.set(id, Object.assign(function(){}, { src })); return { ok: false, error: String(e) }; }
    if (!mod || !mod.default) { rc5_store.srcFns.set(id, Object.assign(function(){}, { src })); return { ok: false }; }
    let r = null;
    try { r = applyCore(id, mod.default); } catch (e) { return { ok: false, error: String(e) }; }
    mod.default.src = src;
    rc5_store.srcFns.set(id, mod.default);
    return { ok: !!(r && r.applied) };
  }
  async function readPathAsync(path) {
    if (rc5_store.scratch.has(path)) return rc5_store.scratch.get(path);
    const c = path.match(/^\/content\/(.+)$/);
    if (c) return blockText(c[1]);
    let m = path.match(/^\/src\/(.+)\.js$/);
    if (m) {
      const id = m[1];
      if (rc5_store.srcFns.has(id)) return rc5_store.srcFns.get(id).src;
      const s = await seedSrc(id);
      if (s) { rc5_store.srcFns.set(id, Object.assign(function(){}, { src: s })); return s; }
      return null;
    }
    m = path.match(/^\/notebook\/(.+)\.js$/);
    if (m) return await seedSrc(m[1]);
    m = path.match(/^\/content\/(.+)$/);
    if (m) return domContent(m[1]);
    return null;
  }

  function installRC5() {
    window.__RC5FS = {
      snapshot() { return cache; },
      readSync(path) {
        if (rc5_store.scratch.has(path)) return rc5_store.scratch.get(path);
        const m = path.match(/^\/src\/(.+)\.js$/);
        if (m && rc5_store.srcFns.has(m[1])) return rc5_store.srcFns.get(m[1]).src;
        return (path in cache) ? cache[path] : null;
      },
      writeSync(path, content) {
        if (path.includes("/.claude") || path.startsWith("/home") || path.startsWith("/root")) return;
        cache[path] = content;
        const m = path.match(MODULE_PATH);
        if (m) { applyModuleSrcSync(m[1], content); }
        else rc5_store.scratch.set(path, content);
      },
      exists(path) {
        if (this.readSync(path) != null) return true;
        const pref = path.replace(/\/?$/, "/");
        return Object.keys(cache).some((p) => p.startsWith(pref));
      },
      list() { return Object.keys(cache); },
    };
    // Debug handle for the boot-test (runtime objects only; no secrets).
    window.__RC5DEBUG = { store: rc5_store, applyModuleSrc, readPathAsync, deps: D,
      exportModuleJS: (...a) => D().exportModuleJS(...a),
      get currentModules() { return D().currentModules; },
      get runtime() { return D().runtime; } };
  }

  let primed = null;
  function primeRC5() {
    if (primed) return primed;
    cache = Object.create(null);
    installRC5(); // __RC5FS available immediately; the shared cache object is filled below.
    primed = (async () => {
      await Promise.all(moduleIds().map(async (id) => {
        const s = await seedSrc(id);
        if (s) { cache["/src/" + id + ".js"] = s; cache["/notebook/" + id + ".js"] = s; }
      }));
      // Plain-text blocks (the knowledge docs and bootconf) under /content, so glob and
      // grep reach them. Encoded blocks are skipped: cli.js.gz alone is 5MB of base64.
      const live = new Set(moduleIds());
      for (const el of document.querySelectorAll('script[type="text/plain"][id]')) {
        const id = el.id;
        if (live.has(id)) continue;
        // Select on MIME, not encoding: two of the knowledge docs are base64 blocks and
        // an encoding test silently dropped them from the listing. Gzip payloads (cli.js
        // alone is 5MB of base64) are excluded by their mime instead.
        const mime = (el.getAttribute("data-mime") || "text/plain").toLowerCase();
        if (!/^text\/|json/.test(mime)) continue;
        if ((el.textContent || "").length > 512 * 1024) continue;
        const txt = blockText(id);
        if (txt != null) cache["/content/" + id] = txt;
      }
      return cache;
    })();
    return primed;
  }

  // ---- stdio bridge (parent xterm <-> frame cli.js) ----
  let frame = null;
  function ptyIn(d) { try { const w = frame && frame.contentWindow; if (w && w.__ptyIn) w.__ptyIn(d); } catch {} }
  // Map a keydown to the bytes a PTY expects (xterm-256color).
  function keyToBytes(e) {
    const k = e.key;
    if (e.metaKey) return null; // leave browser shortcuts (copy/paste/reload) alone
    if (e.ctrlKey && k.length === 1) {
      const c = k.toLowerCase().charCodeAt(0);
      if (c >= 97 && c <= 122) return String.fromCharCode(c - 96); // Ctrl-A..Z
      return null;
    }
    switch (k) {
      case "Enter": return "\r";
      case "Backspace": return "\x7f";
      case "Tab": return "\t";
      case "Escape": return "\x1b";
      case "ArrowUp": return "\x1b[A";
      case "ArrowDown": return "\x1b[B";
      case "ArrowRight": return "\x1b[C";
      case "ArrowLeft": return "\x1b[D";
      case "Home": return "\x1bOH";
      case "End": return "\x1bOF";
      case "Delete": return "\x1b[3~";
      case "PageUp": return "\x1b[5~";
      case "PageDown": return "\x1b[6~";
      default: return (k.length === 1 && !e.altKey) ? k : null;
    }
  }
  function pushResize() {
    try { fit && fit.fit(); } catch {}
    if (!term) return;
    window.__termSize = { cols: term.cols, rows: term.rows };
    const w = frame && frame.contentWindow;
    if (w && w.__ptyResize) w.__ptyResize(term.cols, term.rows);
  }
  window.addEventListener("resize", pushResize);

  // ---- the interactive sandbox document (blob-URL importmap; NO -p; __HOSTFS) ----
  const SRCDOC = [
"<!doctype html><meta charset=utf-8><body><script>",
"(async () => {",
"  const P = window.parent, FILES = P.__DIST_FILES, CLI_SRC = P.__CLI_SRC, CFG = P.__runConfig, MAP = P.__IMPORT_MAP;",
"  const say = (m) => { try { P.__frameLog && P.__frameLog(m); } catch {} };",
"  // interactive + host-fs wiring MUST be set before any shim import.",
"  globalThis.__INTERACTIVE = true;",
"  globalThis.__FS_TRACE = !!P.__CB_FSTRACE;",
"  globalThis.__termSize = (P.__termSize || { cols: 100, rows: 30 });",
"  globalThis.__HOSTFS = P.__RC5FS || null;",
"  // Project memory, seeded before any shim import so cli.js finds it at startup.",
"  globalThis.__SEED_FILES = P.__CLAUDE_MD ? { '/home/user/project/CLAUDE.md': P.__CLAUDE_MD } : {};",
"  globalThis.__ptyWrite = (s) => { try { P.__ptyWrite && P.__ptyWrite(s); } catch {} };",
"  try {",
"    const urlFor = Object.create(null);",
"    const depRe = /([\\\"\\'])\\.\\/(chunk-[A-Za-z0-9]+\\.js)\\1/g;",
"    let remaining = new Set(Object.keys(FILES));",
"    while (remaining.size) {",
"      let progressed = false;",
"      for (const name of [...remaining]) {",
"        const src = FILES[name];",
"        const deps = [...src.matchAll(depRe)].map((m) => m[2]);",
"        if (deps.every((d) => urlFor[d])) {",
"          const out = src.replace(depRe, (m, q, d) => q + urlFor[d] + q);",
"          urlFor[name] = URL.createObjectURL(new Blob([out], { type: 'text/javascript' }));",
"          remaining.delete(name); progressed = true;",
"        }",
"      }",
"      if (!progressed) throw new Error('unresolved chunk deps: ' + [...remaining].join(','));",
"    }",
"    const imports = {};",
"    for (const [spec, file] of Object.entries(MAP)) { if (urlFor[file]) imports[spec] = urlFor[file]; }",
"    const im = document.createElement('script'); im.type = 'importmap';",
"    im.textContent = JSON.stringify({ imports }); document.head.appendChild(im);",
"    if (CFG.provider === 'anthropic') {",
"      // Talk the native protocol: no translation, and NO synthetic credential. With no",
"      // key cli.js sees an unauthenticated Anthropic endpoint and can run its own",
"      // /login flow, which a fake ANTHROPIC_API_KEY would suppress.",
"      const env = { ANTHROPIC_BASE_URL: CFG.base, CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1' };",
"      if (CFG.key) env.ANTHROPIC_API_KEY = CFG.key;",
"      globalThis.__ENV_OVERRIDES = env;",
"      installDirect(CFG.base);",
"    } else {",
"      globalThis.__ENV_OVERRIDES = { ANTHROPIC_BASE_URL: 'http://cli.local', ANTHROPIC_API_KEY: 'sk-ant-browser-native', CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1' };",
"      installTranslator(CFG.key, CFG.model, CFG.base);",
"    }",
"    installMCP(CFG.mcp);",
"    const mcpCfg = JSON.stringify({ mcpServers: { notebook: { type: 'http', url: CFG.mcp } } });",
"    globalThis.__ARGV = ['/usr/bin/node', '/cli.js', '--mcp-config', mcpCfg].concat(CFG.yolo ? ['--dangerously-skip-permissions'] : []).concat(P.__CB_DEBUG ? ['--debug'] : []);",
"    window.addEventListener('unhandledrejection', (e) => { const r = e.reason; if (r && r.name === 'ProcessExit') { globalThis.__cliExit = r.code; e.preventDefault(); return; } say('reject: ' + (r && (r.stack || r.message) || r)); });",
"    window.addEventListener('error', (e) => say('error: ' + (e.message || e)));",
"    await import(urlFor['bootstrap.js']);",
"    await import(urlFor['preload.js']);",
"    const cliUrl = URL.createObjectURL(new Blob([CLI_SRC], { type: 'text/javascript' }));",
"    try { await import(cliUrl); } catch (e) { if (!e || e.name !== 'ProcessExit') say('cli threw: ' + (e && (e.stack || e.message) || e)); }",
"  } catch (e) { say('fatal: ' + (e && (e.stack || e.message) || e)); globalThis.__cliExit = globalThis.__cliExit ?? 1; }",
"",
"  // Anthropic in a browser needs one header the CLI never sends; otherwise this is a",
"  // pure passthrough - the point of this mode is that nothing is translated.",
"  function installDirect(base) {",
"    const real = globalThis.fetch.bind(globalThis);",
"    globalThis.fetch = async (input, init) => {",
"      let req; try { req = new Request(input, init); } catch { return real(input, init); }",
"      if (req.url.indexOf(base) === 0 || /anthropic\\.com/.test(req.url)) {",
"        try { req.headers.set('anthropic-dangerous-direct-browser-access', 'true'); } catch {}",
"        say('-> Anthropic ' + req.method + ' ' + req.url.replace(base, ''));",
"      }",
"      return real(req);",
"    };",
"  }",
"",
"  // The notebook's own MCP server, served from inside the page. cli.js is pointed at",
"  // MCP_URL with --mcp-config; the request never leaves the frame, so there is no",
"  // channel server, no port and no pairing token to supply.",
"  function installMCP(mcpUrl) {",
"    const real = globalThis.fetch.bind(globalThis);",
"    const T = () => P.__NBTOOLS;",
"    const rpc = async (msg) => {",
"      const id = msg.id, m = msg.method;",
"      const ok = (result) => ({ jsonrpc: '2.0', id, result });",
"      try {",
"        if (m === 'initialize') { T().note('initialize'); return ok({ protocolVersion: msg.params && msg.params.protocolVersion || '2025-06-18', capabilities: { tools: {} }, serverInfo: { name: 'notebook', version: '1.0.0' } }); }",
"        if (m === 'tools/list') { T().note('tools/list'); return ok({ tools: T().list() }); }",
"        if (m === 'tools/call') {",
"          const r = await T().call(msg.params.name, msg.params.arguments);",
"          return ok({ content: [{ type: 'text', text: typeof r === 'string' ? r : JSON.stringify(r, null, 2) }] });",
"        }",
"        if (m === 'ping') return ok({});",
"        if (m === 'resources/list') return ok({ resources: [] });",
"        if (m === 'prompts/list') return ok({ prompts: [] });",
"        return { jsonrpc: '2.0', id, error: { code: -32601, message: 'method not found: ' + m } };",
"      } catch (e) {",
"        return { jsonrpc: '2.0', id, error: { code: -32603, message: String(e && e.message || e) } };",
"      }",
"    };",
"    // cli.js probes connectivity before the handshake and does not always pass a",
"    // string: a URL or a Request both have to resolve here, or the request escapes to",
"    // the real network and fails DNS (observed: 'HTTP Connection failed: Failed to",
"    // fetch' with the interceptor installed and never consulted).",
"    const urlOf = (input) => { try { return typeof input === 'string' ? input : (input && typeof input.url === 'string' ? input.url : String(input || '')); } catch { return ''; } };",
"    const host = (() => { try { return new URL(mcpUrl).host; } catch { return 'notebook.local'; } })();",
"    globalThis.fetch = async (input, init) => {",
"      const url = urlOf(input);",
"      if (url.indexOf(host) < 0) return real(input, init);",
"      const method = String((init && init.method) || (input && input.method) || 'GET').toUpperCase();",
"      // No server-initiated stream: 405 tells the client to use POST only.",
"      if (method !== 'POST') { T().note('probe:' + method); return new Response('', { status: 405, headers: { 'content-type': 'text/plain' } }); }",
"      let body = null;",
"      try { body = JSON.parse(init && init.body != null ? (typeof init.body === 'string' ? init.body : await new Response(init.body).text()) : await new Request(input, init).text()); } catch {}",
"      if (body == null) return new Response('', { status: 202 });",
"      const msgs = Array.isArray(body) ? body : [body];",
"      const out = [];",
"      for (const msg of msgs) { if (msg && msg.id !== undefined) out.push(await rpc(msg)); else if (msg) T().note(msg.method || 'notification'); }",
"      if (!out.length) return new Response('', { status: 202 });",
"      return new Response(JSON.stringify(Array.isArray(body) ? out : out[0]), { status: 200, headers: { 'content-type': 'application/json' } });",
"    };",
"  }",
"",
"  function installTranslator(key, model, base) {",
"    const real = globalThis.fetch.bind(globalThis);",
"    const textOf = (c) => typeof c === 'string' ? c : (Array.isArray(c) ? c.filter((b) => b.type === 'text').map((b) => b.text).join('') : '');",
"    const FINISH = { stop: 'end_turn', length: 'max_tokens', tool_calls: 'tool_use', content_filter: 'end_turn' };",
"    function toOpenAIMessages(body) {",
"      const msgs = [];",
"      if (body.system) { const sys = typeof body.system === 'string' ? body.system : textOf(body.system); if (sys) msgs.push({ role: 'system', content: sys }); }",
"      for (const m of body.messages || []) {",
"        if (typeof m.content === 'string') { msgs.push({ role: m.role, content: m.content }); continue; }",
"        const blocks = Array.isArray(m.content) ? m.content : [];",
"        if (m.role === 'assistant') {",
"          const text = blocks.filter((b) => b.type === 'text').map((b) => b.text).join('');",
"          const toolUses = blocks.filter((b) => b.type === 'tool_use');",
"          const om = { role: 'assistant', content: text || null };",
"          if (toolUses.length) om.tool_calls = toolUses.map((t) => ({ id: t.id, type: 'function', function: { name: t.name, arguments: JSON.stringify(t.input || {}) } }));",
"          msgs.push(om);",
"        } else {",
"          const toolResults = blocks.filter((b) => b.type === 'tool_result');",
"          const others = blocks.filter((b) => b.type !== 'tool_result');",
"          for (const tr of toolResults) { let c = tr.content; if (Array.isArray(c)) c = c.map((x) => x.type === 'text' ? x.text : JSON.stringify(x)).join(''); msgs.push({ role: 'tool', tool_call_id: tr.tool_use_id, content: String(c ?? '') }); }",
"          if (others.length) { const txt = others.filter((b) => b.type === 'text').map((b) => b.text).join(''); if (txt) msgs.push({ role: 'user', content: txt }); }",
"        }",
"      }",
"      return msgs;",
"    }",
"    function toOpenAIRequest(body) {",
"      const req = { model, messages: toOpenAIMessages(body), stream: false };",
"      if (body.max_tokens) req.max_tokens = body.max_tokens;",
"      if (body.temperature != null) req.temperature = body.temperature;",
"      if (body.top_p != null) req.top_p = body.top_p;",
"      if (Array.isArray(body.stop_sequences) && body.stop_sequences.length) req.stop = body.stop_sequences;",
"      if (Array.isArray(body.tools) && body.tools.length) req.tools = body.tools.map((t) => ({ type: 'function', function: { name: t.name, description: t.description || '', parameters: t.input_schema || { type: 'object' } } }));",
"      if (body.tool_choice) { const tc = body.tool_choice; if (tc.type === 'auto') req.tool_choice = 'auto'; else if (tc.type === 'any') req.tool_choice = 'required'; else if (tc.type === 'tool' && tc.name) req.tool_choice = { type: 'function', function: { name: tc.name } }; }",
"      return req;",
"    }",
"    function buildSSE(oai, mdl) {",
"      const choice = (oai.choices && oai.choices[0]) || {}; const msg = choice.message || {};",
"      const id = 'msg_' + String(oai.id || 'x').replace(/[^A-Za-z0-9]/g, '').slice(0, 24);",
"      const blocks = [];",
"      if (msg.content) blocks.push({ type: 'text', text: String(msg.content) });",
"      for (const tc of msg.tool_calls || []) { let input = {}; try { input = JSON.parse(tc.function.arguments || '{}'); } catch {} blocks.push({ type: 'tool_use', id: tc.id || ('toolu_' + Math.floor(Math.random() * 1e6)), name: tc.function.name, input }); }",
"      if (!blocks.length) blocks.push({ type: 'text', text: '' });",
"      const usage = oai.usage || {}; const inTok = usage.prompt_tokens || 0; const outTok = usage.completion_tokens || 0;",
"      const stopReason = FINISH[choice.finish_reason] || 'end_turn';",
"      const ev = []; const push = (event, data) => ev.push('event: ' + event + '\\ndata: ' + JSON.stringify(data) + '\\n\\n');",
"      push('message_start', { type: 'message_start', message: { id, type: 'message', role: 'assistant', model: mdl, content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: inTok, output_tokens: 0 } } });",
"      blocks.forEach((blk, i) => {",
"        if (blk.type === 'text') { push('content_block_start', { type: 'content_block_start', index: i, content_block: { type: 'text', text: '' } }); push('content_block_delta', { type: 'content_block_delta', index: i, delta: { type: 'text_delta', text: blk.text } }); }",
"        else { push('content_block_start', { type: 'content_block_start', index: i, content_block: { type: 'tool_use', id: blk.id, name: blk.name, input: {} } }); push('content_block_delta', { type: 'content_block_delta', index: i, delta: { type: 'input_json_delta', partial_json: JSON.stringify(blk.input) } }); }",
"        push('content_block_stop', { type: 'content_block_stop', index: i });",
"      });",
"      push('message_delta', { type: 'message_delta', delta: { stop_reason: stopReason, stop_sequence: null }, usage: { output_tokens: outTok } });",
"      push('message_stop', { type: 'message_stop' });",
"      return ev.join('');",
"    }",
"    const estimateTokens = (body) => { let chars = (typeof body.system === 'string' ? body.system : textOf(body.system || '')).length; for (const m of body.messages || []) chars += textOf(m.content).length; return Math.max(1, Math.ceil(chars / 4)); };",
"    async function bodyText(input, init) { if (init && init.body != null) return typeof init.body === 'string' ? init.body : await new Response(init.body).text(); if (input && typeof input.text === 'function') return await input.clone().text(); return '{}'; }",
"    globalThis.fetch = async (input, init) => {",
"      const url = typeof input === 'string' ? input : (input && input.url) || '';",
"      let path; try { path = new URL(url, 'http://cli.local').pathname; } catch { path = url; }",
"      if (path.endsWith('/count_tokens')) { let body = {}; try { body = JSON.parse(await bodyText(input, init)); } catch {} return new Response(JSON.stringify({ input_tokens: estimateTokens(body) }), { status: 200, headers: { 'content-type': 'application/json' } }); }",
"      if (path.endsWith('/v1/messages')) {",
"        let body; try { body = JSON.parse(await bodyText(input, init)); } catch (e) { return new Response(JSON.stringify({ type: 'error', error: { type: 'invalid_request_error', message: 'bad json' } }), { status: 400, headers: { 'content-type': 'application/json' } }); }",
"        say('-> ' + (key ? 'OpenRouter ' : 'demo gateway ') + model + ' (' + (toOpenAIMessages(body).length) + ' msgs, ' + ((body.tools || []).length) + ' tools)');",
"        const hdrs = { 'Content-Type': 'application/json', 'HTTP-Referer': 'https://lopecode.com', 'X-Title': 'claude-code-browser' };",
"        if (key) hdrs.Authorization = 'Bearer ' + key;", // gateway injects its own key server-side
"        let up; try { up = await real(base + '/chat/completions', { method: 'POST', headers: hdrs, body: JSON.stringify(toOpenAIRequest(body)) }); }",
"        catch (e) { return new Response(JSON.stringify({ type: 'error', error: { type: 'api_error', message: String(e && e.message || e) } }), { status: 502, headers: { 'content-type': 'application/json' } }); }",
"        const txt = await up.text();",
"        if (!up.ok) { say('upstream ' + up.status + ': ' + txt.slice(0, 200)); return new Response(JSON.stringify({ type: 'error', error: { type: 'api_error', message: 'upstream ' + up.status + ': ' + txt.slice(0, 500) } }), { status: up.status, headers: { 'content-type': 'application/json' } }); }",
"        let oai = {}; try { oai = JSON.parse(txt); } catch {}",
"        say('<- OpenRouter finish=' + (oai.choices && oai.choices[0] && oai.choices[0].finish_reason));",
"        return new Response(buildSSE(oai, body.model || model), { status: 200, headers: { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' } });",
"      }",
"      return real(input, init);",
"    };",
"  }",
"})();",
"<\/script>"
  ].join("\n");

  // ---- pairing: the notebook's own tools, served to the browser Claude over MCP ----
  // No channel server and no token: the agent is already inside the page, so the tools
  // are wired straight to the live runtime instead of over a WebSocket. The frame
  // serves them at MCP_URL (intercepted, never a real request) and cli.js is pointed at
  // it with --mcp-config. An external pairing session over `cc=` still works alongside;
  // this is what fills the gap when no token was supplied.
  const MCP_URL = "http://notebook.local/mcp";
  window.__MCPLOG = [];
  const NBTOOLS = {
    list_modules: {
      description: "List the module ids defined in this notebook.",
      schema: { type: "object", properties: {} },
      run: async () => moduleIds(),
    },
    read_module: {
      description: "Read a module's compiled JavaScript source.",
      schema: { type: "object", properties: { name: { type: "string", description: "module id, e.g. @tomlarkworthy/foo" } }, required: ["name"] },
      run: async ({ name }) => (await readPathAsync("/src/" + name + ".js")) || "(not found)",
    },
    write_module: {
      description: "Replace a module's source and apply it to the live runtime. Source must export default define(runtime, observer).",
      schema: { type: "object", properties: { name: { type: "string" }, source: { type: "string" } }, required: ["name", "source"] },
      run: async ({ name, source }) => await applyModuleSrc(name, source),
    },
    eval_js: {
      description: "Evaluate a JavaScript expression in the notebook page and return the result as JSON.",
      schema: { type: "object", properties: { code: { type: "string" } }, required: ["code"] },
      run: async ({ code }) => {
        const v = await (new Function("return (" + code + ")"))();
        try { return JSON.parse(JSON.stringify(v ?? null)); } catch { return String(v); }
      },
    },
  };
  window.__NBTOOLS = {
    list: () => Object.entries(NBTOOLS).map(([name, t]) => ({ name, description: t.description, inputSchema: t.schema })),
    call: async (name, args) => {
      window.__MCPLOG.push({ ev: "call", name });
      const t = NBTOOLS[name];
      if (!t) throw new Error("no such tool: " + name);
      return await t.run(args || {});
    },
    note: (ev, extra) => { window.__MCPLOG.push({ ev, ...(extra || {}) }); },
  };

  // ---- project memory, read from the modules that own it ----
  // robocoop-5's prompt already describes this exact situation (an agent editing
  // Observable modules at /src/<id>.js through file tools), and markdown-wiki owns the
  // doc index. Both are CELLS in modules bundled here, so they are imported and read —
  // a baked copy of the text would fork silently the next time either is edited.
  const SESSION_HEADER = [
    "# This session",
    "",
    "You are Claude Code running in a browser, inside the lopecode notebook described below.",
    "What follows is this project's own canonical guidance, written for an agent with",
    "equivalent tools under different names. Map them like this:",
    "",
    "  read_file -> Read      write_file -> Write     edit_file -> Edit",
    "  glob -> Glob           grep -> Grep",
    "",
    "Differences from that description: there is no `/notebook` tree here; live cell VALUES",
    "come from the `notebook` MCP server (`eval_js`, `list_modules`, `read_module`,",
    "`write_module`) rather than inspect_value/list_values/watch_variable; and there is no",
    "task_complete — you simply answer. `/content/<id>` is read-only and holds the raw",
    "notebook blocks, including the knowledge docs indexed at the end of this file.",
    "",
    "There is no operating system under you: no shell, no git, no npm, and sockets are inert.",
    "Editing `/src/<module-id>.js` applies to the running notebook immediately. A module",
    "that does not compile is REFUSED: the write fails in the same turn with",
    "`FAILED TO COMPILE <id>: <error>`, the file keeps your exact text, and the live",
    "runtime is left untouched — fix it and write again. That check is syntactic only, so",
    "a module can compile and still have cells that ERROR when they run; the write says",
    "nothing about that. Check a cell's live value with the `eval_js` MCP tool.",
    "",
    "",
  ].join("\n");

  async function cellValue(moduleId, cellName) {
    const def = (await importShim("/" + moduleId + ".js?v=4")).default;
    return await runtime.module(def).value(cellName);
  }
  let claudeMdOnce = null;
  function claudeMd() {
    if (claudeMdOnce) return claudeMdOnce;
    claudeMdOnce = (async () => {
      let body = "";
      // Best-effort, and deliberately separate awaits: a wiki that fails to render its
      // index should not cost the session its authoring guidance.
      try { body += await cellValue("@tomlarkworthy/robocoop-5-engine", "systemPrompt"); } catch (e) { body += "(robocoop-5 prompt unavailable: " + (e && e.message || e) + ")"; }
      try { body += "\n\n" + await cellValue("@tomlarkworthy/markdown-wiki", "wiki_index"); } catch {}
      return SESSION_HEADER + body + "\n";
    })();
    return claudeMdOnce;
  }

  // ---- session lifecycle ----
  let starting = false, pending = false, lastCfg = null;
  async function startSession() {
    if (starting) { pending = true; return; } // coalesce changes made mid-boot
    const key = keyEl.value.trim(); // blank is fine: the demo gateway supplies one
    const base = baseUrl();
    const prov = provider();
    try { localStorage.setItem(KEY_LS, key); } catch {}
    const model = modelEl.value.trim() || "xiaomi/mimo-v2.5-pro";
    const yolo = !!yoloEl.checked;
    starting = true; restartEl.disabled = true;
    lastCfg = JSON.stringify({ key, model, yolo, provider: prov, url: base });
    try {
      setStatus("Loading terminal…");
      await ensureXterm();
      setStatus("Decompressing runtime (first run only)…");
      await ensureAssets();
      setStatus("Indexing notebook modules for the filesystem…");
      await primeRC5();

      window.__DIST_FILES = DIST_FILES;
      window.__CLI_SRC = CLI_SRC;
      window.__CLAUDE_MD = await claudeMd();
      window.__IMPORT_MAP = IMPORT_MAP;
      window.__runConfig = { key, model, yolo, base, provider: prov, mcp: MCP_URL };
      try { fit && fit.fit(); } catch {}
      window.__termSize = { cols: term.cols, rows: term.rows };
      window.__cliExit = undefined;
      window.__frameMsgs = window.__frameMsgs || []; window.__frameMsgs.length = 0;
      window.__frameLog = (m) => { window.__frameMsgs.push(String(m)); };
      term.reset();

      if (frame) { frame.remove(); frame = null; }
      frame = document.createElement("iframe");
      frame.id = "cb-cli-frame";
      frame.style.display = "none";
      frame.srcdoc = SRCDOC;
      frameHost().appendChild(frame);
      frame.addEventListener("load", () => { setStatus("Running via " + (key ? "OpenRouter (your key)" : "the demo gateway") + " · " + model + (yolo ? " · YOLO" : " · permission prompts on") + " — type in the terminal."); setTimeout(pushResize, 300); });
      setStatus("Starting interactive session…");
      setTimeout(() => { try { term.focus(); } catch {} }, 120);
    } catch (e) {
      setStatus("Failed to start: " + (e && e.message || e));
    } finally {
      starting = false; restartEl.disabled = false;
      if (pending) { pending = false; startSession(); }
    }
  }

  // Any setting change reboots the session; unchanged values (a blur with no edit)
  // are ignored so the terminal is not torn down for nothing.
  function settingChanged() {
    const cfg = JSON.stringify({ key: keyEl.value.trim(), model: modelEl.value.trim() || "xiaomi/mimo-v2.5-pro", yolo: !!yoloEl.checked, provider: provider(), url: baseUrl() });
    if (cfg === lastCfg) return;
    startSession();
  }
  providerEl.addEventListener("change", () => {
    try { localStorage.setItem(PROVIDER_LS, provider()); } catch {}
    // A URL typed for one provider is meaningless for the other.
    urlEl.value = ""; syncProviderUI(); loadModels(); settingChanged();
  });
  urlEl.addEventListener("change", () => { try { localStorage.setItem(URL_LS, urlEl.value.trim()); } catch {} syncProviderUI(); loadModels(); settingChanged(); });
  // `change` (not `input`) so a key is not rebooted on every keystroke.
  keyEl.addEventListener("change", () => { loadModels(); settingChanged(); });
  modelEl.addEventListener("change", settingChanged);
  yoloEl.addEventListener("change", settingChanged);
  restartEl.addEventListener("click", () => { lastCfg = null; startSession(); });
  window.__autostart = () => startSession();

  // Mount the terminal, then boot straight in if a key is already saved.
  ensureXterm().then(() => startSession()).catch((e) => setStatus("xterm load failed: " + (e && e.message || e)));

  return root;
})())}
