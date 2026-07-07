// @tomlarkworthy/robocoop-5 — the self-contained app: chat facade (no terminal — robocoop-5 has no shell).
//
// The facade is a collapsible credentials/model/prompt strip, a scrolling transcript, and an input. It
// drives the imported `session` (from robocoop-5-engine). With no terminal pane, the agent's tool work is
// shown IN the transcript as compact activity lines (one per tool call), plus the live status line.
//
// Imports: session, keyView, modelView, promptView (robocoop-5-engine; view aliases plain-named — never
// `viewof X`, which editor-5 mangles); summarizeTurn, toolLabel (robocoop-5-core). No window globals.

const _facade = function _facade(html, md, session, keyView, modelView, promptView, summarizeTurn, toolLabel){
  const C = {
    bg: "#0d1117", fg: "#c9d1d9", muted: "#8b949e", border: "#30363d",
    user: "#1f6feb", asst: "#161b22", tool: "#21262d", accent: "#7ee787", err: "#ff7b72"
  };

  const root = html`<div style="display:flex;flex-direction:column;height:100%;min-height:300px;font:13px/1.55 ui-monospace,Menlo,monospace;color:${C.fg};background:${C.bg}"></div>`;

  // ── credentials / model / prompt (collapsed by default) ──────────────────
  const cfg = html`<details style="border-bottom:1px solid ${C.border};padding:8px 10px">
    <summary style="cursor:pointer;color:${C.muted}">⚙ settings — key, model, system prompt</summary>
  </details>`;
  const cfgBody = html`<div class="rc5-settings" style="display:flex;flex-direction:column;gap:8px;margin-top:8px"></div>`;
  // Observable Inputs render with a light-theme palette (near-invisible on the dark UI). Force legible colors
  // on the form controls + labels; scoped to .rc5-settings so it can't leak into the agent's own rendered cells.
  cfgBody.append(html`<style>
    .rc5-settings label { color:${C.muted} !important; }
    .rc5-settings input, .rc5-settings select, .rc5-settings textarea {
      background:#010409 !important; color:${C.fg} !important; border:1px solid ${C.border} !important;
      border-radius:6px; font:13px/1.5 ui-monospace,Menlo,monospace !important; }
    .rc5-settings input::placeholder, .rc5-settings textarea::placeholder { color:${C.muted} !important; opacity:.7; }
    .rc5-settings option { background:#010409; color:${C.fg}; }
  </style>`);
  cfgBody.append(keyView, modelView, promptView);
  cfg.append(cfgBody);
  root.append(cfg);

  // ── transcript ───────────────────────────────────────────────────────────
  // flex:1 + min-height:0 scrolls when the pane bounds us; max-height is a fallback so the log
  // scrolls (and the input bar stays reachable) even when lopepage gives the cell an unbounded height.
  const log = html`<div style="flex:1 1 0;min-height:0;max-height:60vh;overflow-y:auto;padding:10px;display:flex;flex-direction:column;gap:8px"></div>`;
  root.append(log);

  const bubble = (side, bgc, node) => {
    const wrap = document.createElement("div");
    wrap.style.cssText = "display:flex;justify-content:" + (side === "right" ? "flex-end" : "flex-start");
    const b = document.createElement("div");
    b.style.cssText = "max-width:85%;padding:6px 10px;border-radius:10px;background:" + bgc + ";border:1px solid " + C.border + ";white-space:normal;overflow-wrap:anywhere";
    b.append(node);
    wrap.append(b);
    return wrap;
  };
  // A user message is a string, or OpenAI content parts (text + image_url) when images were attached.
  const renderContent = (content) => {
    const frag = document.createDocumentFragment();
    if (Array.isArray(content)) {
      for (const p of content) {
        if (p?.type === "image_url" && p.image_url?.url) {
          const im = document.createElement("img");
          im.src = p.image_url.url;
          im.style.cssText = "max-width:220px;max-height:160px;border-radius:6px;margin-top:4px;display:block";
          frag.append(im);
        } else if (p?.type === "text" && p.text) {
          const d = document.createElement("div"); d.textContent = p.text; frag.append(d);
        }
      }
    } else {
      frag.append(document.createTextNode(String(content ?? "")));
    }
    return frag;
  };
  let busy = false;
  const errors = [];   // surfaced agent failures (e.g. OpenRouter 402); part of render state so they persist
  let lastOutcome = null;   // a turn-end summary shown when the agent stops WITHOUT a final reply (so it's never silent)

  // Live per-step status — a cheap, persistent line so a running turn is never silent. Updated directly
  // (textContent), NOT through the heavy render() that wipes+re-parses every bubble.
  let stepN = 0;
  const statusEl = document.createElement("div");
  statusEl.style.cssText = "display:none;color:" + C.accent + ";font-size:12px;font-style:italic;padding:4px 10px;border-top:1px solid " + C.border;
  const setStatus = (txt) => { statusEl.textContent = txt || ""; statusEl.style.display = txt ? "block" : "none"; };

  // Memoized render: md-parse each message bubble ONCE per content change (cached by message identity in a
  // WeakMap), reuse the node otherwise, then reconcile with replaceChildren. With no terminal pane, an
  // assistant message's tool_calls render as a compact muted activity line so the agent's work is visible
  // in place (the transcript is the ONLY surface).
  const msgCache = new WeakMap();
  const activityLine = (calls) => {
    const d = document.createElement("div");
    d.style.cssText = "color:" + C.muted + ";font-size:11.5px;padding:0 4px";
    d.textContent = "⚙ " + calls.map((c) => {
      let args = c?.function?.arguments;
      try { if (typeof args === "string") args = JSON.parse(args); } catch { args = {}; }
      return toolLabel(c?.function?.name || "tool", args);
    }).join("  ·  ");
    return d;
  };
  const cacheKey = (m) => String(m.content ?? "") + "|" + (Array.isArray(m.tool_calls) ? m.tool_calls.length : 0);
  const renderMsg = (m) => {
    if (m.role === "user") return bubble("right", C.user, renderContent(m.content));
    if (m.role === "assistant") {
      const parts = [];
      if (m.content) {
        let node; try { node = md`${String(m.content)}`; } catch { node = document.createTextNode(String(m.content)); }
        parts.push(bubble("left", C.asst, node));
      }
      if (Array.isArray(m.tool_calls) && m.tool_calls.length) parts.push(activityLine(m.tool_calls));
      if (!parts.length) return null;
      const wrap = document.createElement("div");
      wrap.style.cssText = "display:flex;flex-direction:column;gap:4px";
      wrap.append(...parts);
      return wrap;
    }
    return null;   // tool result messages don't show (their effect is the next assistant step)
  };
  const render = () => {
    const desired = [];
    for (const m of session.messages) {
      const c = msgCache.get(m);
      let wrap;
      if (c && (m.role === "user" || c.key === cacheKey(m))) wrap = c.wrap;   // unchanged → reuse
      else { wrap = renderMsg(m); msgCache.set(m, { key: cacheKey(m), wrap }); }
      if (wrap) desired.push(wrap);
    }
    for (const er of errors) {
      const d = document.createElement("div");
      d.style.cssText = "color:" + C.err + ";background:#2d0f0f;border:1px solid " + C.err +
        ";border-radius:8px;padding:6px 10px;font-size:12px;white-space:pre-wrap;overflow-wrap:anywhere";
      d.textContent = "⚠ agent error — " + er;
      desired.push(d);
    }
    if (lastOutcome) {
      const d = document.createElement("div");
      d.style.cssText = "color:" + C.muted + ";font-size:12px;font-style:italic;text-align:center;padding:4px 10px";
      d.textContent = lastOutcome;
      desired.push(d);
    }
    log.replaceChildren(...desired);
    log.scrollTop = log.scrollHeight;
  };
  render();

  // ── input (with image attachments — paste, drop, or 📎) ─────────────────────
  const pendingImages = [];   // data URLs staged for the next send; shown as removable thumbnails
  const thumbs = html`<div style="display:none;gap:6px;flex-wrap:wrap;padding:8px 10px 0"></div>`;
  const renderThumbs = () => {
    thumbs.innerHTML = "";
    thumbs.style.display = pendingImages.length ? "flex" : "none";
    pendingImages.forEach((url, i) => {
      const w = document.createElement("div"); w.style.cssText = "position:relative";
      const im = document.createElement("img"); im.src = url;
      im.style.cssText = "width:48px;height:48px;object-fit:cover;border-radius:6px;border:1px solid " + C.border;
      const x = document.createElement("button"); x.textContent = "×"; x.title = "remove";
      x.style.cssText = "position:absolute;top:-6px;right:-6px;width:18px;height:18px;line-height:15px;border-radius:50%;border:0;background:" + C.err + ";color:#fff;cursor:pointer;font-size:12px;padding:0";
      x.addEventListener("click", () => { pendingImages.splice(i, 1); renderThumbs(); });
      w.append(im, x); thumbs.append(w);
    });
  };
  const addImageFile = (f) => new Promise((res) => {
    if (!f || !/^image\//.test(f.type || "")) return res();
    const fr = new FileReader();
    fr.onload = () => { pendingImages.push(fr.result); renderThumbs(); res(); };
    fr.onerror = () => res();
    fr.readAsDataURL(f);
  });

  const ta = html`<textarea rows="2" placeholder="Message robocoop-5…  (Enter to send · paste or drop an image)" style="flex:1;resize:none;background:#010409;color:${C.fg};border:1px solid ${C.border};border-radius:8px;padding:8px;font:inherit"></textarea>`;
  const fileInput = html`<input type="file" accept="image/*" multiple style="display:none">`;
  const attach = html`<button title="Attach image" style="background:${C.tool};color:${C.fg};border:1px solid ${C.border};border-radius:8px;padding:0 12px;cursor:pointer">📎</button>`;
  const send = html`<button style="background:${C.user};color:#fff;border:0;border-radius:8px;padding:0 14px;cursor:pointer">Send</button>`;
  const stop = html`<button title="Stop the agent (end this turn)" style="display:none;background:${C.err};color:#fff;border:0;border-radius:8px;padding:0 14px;cursor:pointer">Stop</button>`;
  const newchat = html`<button title="New chat — clear the conversation history (your built modules stay)" style="background:${C.tool};color:${C.fg};border:1px solid ${C.border};border-radius:8px;padding:0 10px;cursor:pointer">⟲</button>`;
  const bar = html`<div style="display:flex;gap:8px;padding:10px;border-top:1px solid ${C.border}"></div>`;
  bar.append(newchat, attach, ta, send, stop, fileInput);
  // Active-model line: makes a mid-conversation model switch visibly take effect.
  const modelEl = document.createElement("div");
  modelEl.style.cssText = "color:" + C.muted + ";font-size:11px;padding:0 10px 4px;text-align:right";
  const refreshModel = () => {
    const sel = modelView.querySelector?.("select");
    const label = sel?.selectedOptions?.[0]?.textContent?.trim() || modelView.value || "—";
    modelEl.textContent = "model: " + label;
  };
  refreshModel();
  // Switching the picker mid-turn interrupts the in-flight call so the new model drives the very next step.
  modelView.addEventListener("input", () => {
    refreshModel();
    if (busy) { session.interrupt?.(); setStatus("↪ switching model → " + (modelView.value || "") + " · step " + stepN); }
  });
  root.append(thumbs, statusEl, modelEl, bar);

  attach.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", async () => { for (const f of fileInput.files) await addImageFile(f); fileInput.value = ""; });
  ta.addEventListener("paste", async (ev) => {
    const items = ev.clipboardData?.items || [];
    let had = false;
    for (const it of items) if (it.type && it.type.startsWith("image/")) { const f = it.getAsFile(); if (f) { had = true; await addImageFile(f); } }
    if (had) ev.preventDefault();
  });
  root.addEventListener("dragover", (ev) => { ev.preventDefault(); root.style.outline = "2px dashed " + C.accent; root.style.outlineOffset = "-2px"; });
  root.addEventListener("dragleave", (ev) => { if (ev.target === root) root.style.outline = ""; });
  root.addEventListener("drop", async (ev) => { ev.preventDefault(); root.style.outline = ""; for (const f of (ev.dataTransfer?.files || [])) await addImageFile(f); });

  const submit = async () => {
    const text = ta.value.trim();
    if (!text && !pendingImages.length) return;
    const images = pendingImages.splice(0);   // take and clear the staged images
    const input = images.length ? { text: text || null, images } : text;

    // STEERING: if a turn is already running, inject this as a redirect into the live conversation (aborts the
    // in-flight model call so the agent reads it on the next step) rather than blocking.
    if (busy) {
      session.steer?.(input);
      ta.value = ""; renderThumbs();
      setStatus("↪ steering… · step " + stepN);
      ta.focus();
      return;
    }

    busy = true; ta.value = ""; send.textContent = "Steer"; stop.style.display = ""; errors.length = 0; lastOutcome = null; stepN = 0; renderThumbs();
    setStatus("● thinking…");
    try {
      // send() pushes the user message synchronously before its first await, so kicking it off and rendering
      // immediately shows the user's bubble right away. Tool calls land in the transcript as activity lines
      // (render on each tool call), and the cheap statusEl carries the live signal.
      const p = session.send(input, {
        onStep: (i) => { stepN = (i | 0) + 1; setStatus("● thinking… · step " + stepN); },
        onToolCall: (callId, name, args) => { setStatus("⚙ " + toolLabel(name, args) + " · step " + stepN); render(); },
        onToolResult: () => setStatus("● thinking… · step " + stepN),
        onSteer: render,   // a steered user message was injected into the running turn → show its bubble
        onInterrupt: () => setStatus("↪ redirecting… · step " + stepN),
        onText: render,
        onFinish: render
      });
      render();
      const result = await p;
      // If the turn produced no closing assistant text, show why it ended so the user is never left guessing.
      const last = session.messages[session.messages.length - 1];
      if (!(last && last.role === "assistant" && last.content)) lastOutcome = summarizeTurn(result);
    } catch (err) {
      errors.push(err && err.message ? err.message : String(err));
    } finally {
      busy = false; send.textContent = "Send"; stop.style.display = "none"; setStatus(""); render(); ta.focus();
    }
  };
  send.addEventListener("click", submit);
  stop.addEventListener("click", () => { if (busy) { session.abort?.(); setStatus("⏹ stopping…"); } });
  // New chat: abort any running turn, then wipe the LLM conversation history. The agent's built modules
  // are separate and are NOT touched — only the chat context is reset.
  newchat.addEventListener("click", () => {
    if (busy) session.abort?.();
    session.reset?.();
    errors.length = 0; lastOutcome = null; stepN = 0; setStatus(""); render(); ta.focus();
  });
  ta.addEventListener("keydown", (ev) => { if (ev.key === "Enter" && !ev.shiftKey) { ev.preventDefault(); submit(); } });

  return root;
};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  // Imports from the engine.
  main.define("module @tomlarkworthy/robocoop-5-engine", async () =>
    runtime.module((await import("/@tomlarkworthy/robocoop-5-engine.js?v=4")).default));
  main.define("session", ["module @tomlarkworthy/robocoop-5-engine", "@variable"], (_, v) => v.import("session", _));
  // Import plain-named view aliases (NOT `viewof X` — editor-5 mangles those into a bare `viewof`).
  main.define("keyView", ["module @tomlarkworthy/robocoop-5-engine", "@variable"], (_, v) => v.import("keyView", _));
  main.define("modelView", ["module @tomlarkworthy/robocoop-5-engine", "@variable"], (_, v) => v.import("modelView", _));
  main.define("promptView", ["module @tomlarkworthy/robocoop-5-engine", "@variable"], (_, v) => v.import("promptView", _));

  // Pure result formatters live in core (DOM-free, node-tested); the facade renders with them.
  main.define("module @tomlarkworthy/robocoop-5-core", async () =>
    runtime.module((await import("/@tomlarkworthy/robocoop-5-core.js?v=4")).default));
  main.define("summarizeTurn", ["module @tomlarkworthy/robocoop-5-core", "@variable"], (_, v) => v.import("summarizeTurn", _));
  main.define("toolLabel", ["module @tomlarkworthy/robocoop-5-core", "@variable"], (_, v) => v.import("toolLabel", _));

  $def("rc5_facade", "robocoop_5", ["html", "md", "session", "keyView", "modelView", "promptView", "summarizeTurn", "toolLabel"], _facade);
  return main;
}
