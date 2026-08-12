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
  const KEY_LS = "openrouter_key";

  // ---- UI shell ----
  const root = document.createElement("div");
  root.style.cssText = "font:14px/1.5 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;height:100%;display:flex;flex-direction:column;gap:8px;padding:8px;box-sizing:border-box;background:#1e1e1e;color:#ddd";
  root.innerHTML = [
    "<div style='display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap'>",
    "  <div style='display:flex;flex-direction:column;gap:3px;flex:1;min-width:220px'>",
    "    <label style='font-size:11px;font-weight:600;opacity:.7'>OpenRouter API key</label>",
    "    <input id='cb-key' type='password' placeholder='sk-or-...' autocomplete='off' spellcheck='false' style='font:inherit;padding:6px 8px;border:1px solid #555;border-radius:5px;background:#2a2a2a;color:#eee'>",
    "  </div>",
    "  <div style='display:flex;flex-direction:column;gap:3px;flex:0 0 220px'>",
    "    <label style='font-size:11px;font-weight:600;opacity:.7'>Model</label>",
    "    <input id='cb-model' type='text' value='xiaomi/mimo-v2.5-pro' spellcheck='false' style='font:inherit;padding:6px 8px;border:1px solid #555;border-radius:5px;background:#2a2a2a;color:#eee'>",
    "  </div>",
    "  <button id='cb-start' style='font:inherit;font-weight:600;padding:7px 14px;border:0;border-radius:5px;background:#2f6feb;color:#fff;cursor:pointer'>Start session</button>",
    "  <button id='cb-restart' style='font:inherit;font-weight:600;padding:7px 14px;border:0;border-radius:5px;background:#444;color:#fff;cursor:pointer'>Restart</button>",
    "</div>",
    "<div id='cb-status' style='font-size:12px;opacity:.8;min-height:16px'></div>",
    "<div id='cb-term' style='flex:1;min-height:360px;background:#000;border:1px solid #333;border-radius:6px;overflow:hidden'></div>"
  ].join("\n");

  const q = (id) => root.querySelector("#" + id);
  const keyEl = q("cb-key"), modelEl = q("cb-model"), startEl = q("cb-start"),
        restartEl = q("cb-restart"), statusEl = q("cb-status"), termHost = q("cb-term");
  try { const k = localStorage.getItem(KEY_LS); if (k) keyEl.value = k; } catch {}
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
  async function ensureXterm() {
    if (!window.Terminal) {
      const css = await gunzipText(FileAttachment("xterm.css.gz"));
      const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
      injectUMD(await gunzipText(FileAttachment("xterm.js.gz")));
      injectUMD(await gunzipText(FileAttachment("addon-fit.js.gz")));
    }
    if (!term) {
      term = new window.Terminal({
        cols: 100, rows: 30, convertEol: false, cursorBlink: true,
        fontFamily: 'ui-monospace, Menlo, Monaco, "Courier New", monospace',
        fontSize: 13, theme: { background: "#000000", foreground: "#e0e0e0" },
        allowProposedApi: true,
      });
      try { fit = new window.FitAddon.FitAddon(); term.loadAddon(fit); } catch {}
      window.__ptyWrite = (s) => { try { term.write(s); } catch {} };
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

      // Render fix. Opening xterm while the pane is zero-size leaves the DOM
      // renderer painting nothing (buffer fills, screen stays blank) and it does
      // not recover on a later resize. Defer open() until the host has real
      // size, then fit; keep fitting as the pane resizes.
      const sized = () => termHost.clientWidth > 0 && termHost.clientHeight > 0;
      const doOpen = () => {
        term.open(termHost);
        try { fit && fit.fit(); } catch {}
        try { window.__termSize = { cols: term.cols, rows: term.rows }; } catch {}
        pushResize();
        try { term.focus(); } catch {}
      };
      if (sized()) doOpen();
      else { const ro = new ResizeObserver(() => { if (sized()) { ro.disconnect(); doOpen(); } }); ro.observe(termHost); }
    }
  }

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
  const applyCore = jbApply({ currentModules, runtime, probeDefine, createModule });
  const MODULE_PATH = /^\/(?:notebook|src)\/(.+)\.js$/;
  let cache = null;

  function moduleIds() {
    const ids = [];
    try { for (const info of currentModules.values()) if (info && info.name) ids.push(info.name); } catch {}
    return ids;
  }
  async function seedSrc(id) {
    try {
      const r = await Promise.race([exportModuleJS(id), new Promise((res) => setTimeout(() => res(null), 5000))]);
      return r && r.source ? r.source : null;
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
        if (m) { applyModuleSrc(m[1], content); }
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
    window.__RC5DEBUG = { store: rc5_store, applyModuleSrc, readPathAsync, currentModules, runtime, exportModuleJS };
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
"  globalThis.__termSize = (P.__termSize || { cols: 100, rows: 30 });",
"  globalThis.__HOSTFS = P.__RC5FS || null;",
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
"    globalThis.__ENV_OVERRIDES = { ANTHROPIC_BASE_URL: 'http://cli.local', ANTHROPIC_API_KEY: 'sk-ant-browser-native', CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1' };",
"    installTranslator(CFG.key, CFG.model);",
"    globalThis.__ARGV = ['/usr/bin/node', '/cli.js'];",
"    window.addEventListener('unhandledrejection', (e) => { const r = e.reason; if (r && r.name === 'ProcessExit') { globalThis.__cliExit = r.code; e.preventDefault(); return; } say('reject: ' + (r && (r.stack || r.message) || r)); });",
"    window.addEventListener('error', (e) => say('error: ' + (e.message || e)));",
"    await import(urlFor['bootstrap.js']);",
"    await import(urlFor['preload.js']);",
"    const cliUrl = URL.createObjectURL(new Blob([CLI_SRC], { type: 'text/javascript' }));",
"    try { await import(cliUrl); } catch (e) { if (!e || e.name !== 'ProcessExit') say('cli threw: ' + (e && (e.stack || e.message) || e)); }",
"  } catch (e) { say('fatal: ' + (e && (e.stack || e.message) || e)); globalThis.__cliExit = globalThis.__cliExit ?? 1; }",
"",
"  function installTranslator(key, model) {",
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
"        say('-> OpenRouter ' + model + ' (' + (toOpenAIMessages(body).length) + ' msgs, ' + ((body.tools || []).length) + ' tools)');",
"        let up; try { up = await real('https://openrouter.ai/api/v1/chat/completions', { method: 'POST', headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json', 'HTTP-Referer': 'https://lopecode.local/claude-emu', 'X-Title': 'claude-emu' }, body: JSON.stringify(toOpenAIRequest(body)) }); }",
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

  // ---- session lifecycle ----
  let starting = false;
  async function startSession() {
    if (starting) return;
    const key = keyEl.value.trim();
    if (!key) { setStatus("Enter your OpenRouter API key first."); keyEl.focus(); return; }
    try { localStorage.setItem(KEY_LS, key); } catch {}
    const model = modelEl.value.trim() || "xiaomi/mimo-v2.5-pro";
    starting = true; startEl.disabled = true;
    try {
      setStatus("Loading terminal…");
      await ensureXterm();
      setStatus("Decompressing runtime (first run only)…");
      await ensureAssets();
      setStatus("Indexing notebook modules for the filesystem…");
      await primeRC5();

      window.__DIST_FILES = DIST_FILES;
      window.__CLI_SRC = CLI_SRC;
      window.__IMPORT_MAP = IMPORT_MAP;
      window.__runConfig = { key, model };
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
      root.appendChild(frame);
      frame.addEventListener("load", () => { setStatus("Session running (interactive) — type in the terminal."); setTimeout(pushResize, 300); });
      setStatus("Starting interactive session…");
      setTimeout(() => { try { term.focus(); } catch {} }, 120);
    } catch (e) {
      setStatus("Failed to start: " + (e && e.message || e));
    } finally {
      starting = false; startEl.disabled = false;
    }
  }

  startEl.addEventListener("click", startSession);
  restartEl.addEventListener("click", startSession);
  window.__autostart = () => startSession();

  // Mount the terminal immediately so the pane isn't blank before Start.
  ensureXterm().then(() => setStatus("Enter your OpenRouter key and press Start.")).catch((e) => setStatus("xterm load failed: " + (e && e.message || e)));

  return root;
})())}
