// @tomlarkworthy/robocoop-4 — the self-contained app: agent terminal ABOVE the chat facade.
//
// agentTerminal renders the SAME shell the agent drives (rc4_agentShell, imported from -engine) so you
// watch its bash session live, in this module, right above the conversation. The facade cell is the
// chat: a collapsible credentials/model/prompt strip, a scrolling transcript (talk only), and an input.
// It drives the imported `session` (from -engine); the LLM's bash work shows in the terminal, not chat.
//
// Imports: terminal (robocoop-4-bash-terminal); session, keyView, modelView, promptView, rc4_agentShell
// (-engine, view aliases plain-named — never `viewof X`, which editor-5 mangles). No window globals.

// agentTerminal — the agent's live shell, embedded (renders the engine's rc4_agentShell directly).
const _agentTerminal = function _agentTerminal(html, terminal, rc4_agentShell){
  // Definite height (not max-height) + overflow:hidden so the terminal's OWN .jb-term-scroll (height:100% →
  // flex:1) is the bounded scroll container; otherwise the wrapper scrolls and the terminal's autoscroll-to-
  // bottom targets an element that never scrolls (output stops following the latest line).
  const root = html`<div style="border:1px solid #30363d;border-radius:8px;height:35vh;min-height:240px;overflow:hidden;margin-bottom:8px"></div>`;
  root.append(terminal(rc4_agentShell, { title: "agent — live shell (the LLM's session)" }));
  return root;
};

const _facade = function _facade(html, md, session, $key, $model, $prompt){
  const C = {
    bg: "#0d1117", fg: "#c9d1d9", muted: "#8b949e", border: "#30363d",
    user: "#1f6feb", asst: "#161b22", tool: "#21262d", accent: "#7ee787", err: "#ff7b72"
  };

  const root = html`<div style="display:flex;flex-direction:column;height:100%;min-height:300px;font:13px/1.55 ui-monospace,Menlo,monospace;color:${C.fg};background:${C.bg}"></div>`;

  // ── credentials / model / prompt (collapsed by default) ──────────────────
  const cfg = html`<details style="border-bottom:1px solid ${C.border};padding:8px 10px">
    <summary style="cursor:pointer;color:${C.muted}">⚙ settings — key, model, system prompt</summary>
  </details>`;
  const cfgBody = html`<div class="rc4-settings" style="display:flex;flex-direction:column;gap:8px;margin-top:8px"></div>`;
  // Observable Inputs render with a light-theme palette (near-invisible on the dark UI). Force legible colors
  // on the form controls + labels; scoped to .rc4-settings so it can't leak into the agent's own rendered cells.
  cfgBody.append(html`<style>
    .rc4-settings label { color:${C.muted} !important; }
    .rc4-settings input, .rc4-settings select, .rc4-settings textarea {
      background:#010409 !important; color:${C.fg} !important; border:1px solid ${C.border} !important;
      border-radius:6px; font:13px/1.5 ui-monospace,Menlo,monospace !important; }
    .rc4-settings input::placeholder, .rc4-settings textarea::placeholder { color:${C.muted} !important; opacity:.7; }
    .rc4-settings option { background:#010409; color:${C.fg}; }
  </style>`);
  cfgBody.append($key, $model, $prompt);
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
  // Talk-only transcript: human messages + assistant TEXT replies. The LLM's bash work (tool calls
  // and their output) is its terminal SESSION — it streams into the agent terminal pane, not here.
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
  const render = () => {
    log.innerHTML = "";
    for (const m of session.messages) {
      if (m.role === "user") {
        log.append(bubble("right", C.user, renderContent(m.content)));
      } else if (m.role === "assistant" && m.content) {
        let node; try { node = md`${String(m.content)}`; } catch { node = document.createTextNode(String(m.content)); }
        log.append(bubble("left", C.asst, node));
      }
    }
    for (const er of errors) {
      const d = document.createElement("div");
      d.style.cssText = "color:" + C.err + ";background:#2d0f0f;border:1px solid " + C.err +
        ";border-radius:8px;padding:6px 10px;font-size:12px;white-space:pre-wrap;overflow-wrap:anywhere";
      d.textContent = "⚠ agent error — " + er;
      log.append(d);
    }
    if (busy) {
      const w = document.createElement("div");
      w.style.cssText = "color:" + C.muted + ";font-size:12px;font-style:italic";
      w.textContent = "● working… (watch the agent terminal)";
      log.append(w);
    }
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

  const ta = html`<textarea rows="2" placeholder="Message robocoop-4…  (Enter to send · paste or drop an image)" style="flex:1;resize:none;background:#010409;color:${C.fg};border:1px solid ${C.border};border-radius:8px;padding:8px;font:inherit"></textarea>`;
  const fileInput = html`<input type="file" accept="image/*" multiple style="display:none">`;
  const attach = html`<button title="Attach image" style="background:${C.tool};color:${C.fg};border:1px solid ${C.border};border-radius:8px;padding:0 12px;cursor:pointer">📎</button>`;
  const send = html`<button style="background:${C.user};color:#fff;border:0;border-radius:8px;padding:0 14px;cursor:pointer">Send</button>`;
  const bar = html`<div style="display:flex;gap:8px;padding:10px;border-top:1px solid ${C.border}"></div>`;
  bar.append(attach, ta, send, fileInput);
  root.append(thumbs, bar);

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
    if ((!text && !pendingImages.length) || busy) return;
    const images = pendingImages.splice(0);   // take and clear the staged images
    busy = true; ta.value = ""; send.disabled = true; errors.length = 0; renderThumbs();
    try {
      const input = images.length ? { text: text || null, images } : text;
      // send() pushes the user message synchronously before its first await, so kicking it off and rendering
      // immediately shows the user's bubble (and any attached image) right away, not only once the agent replies.
      const p = session.send(input, { onText: render, onToolCall: render, onToolResult: render, onFinish: render });
      render();
      await p;
    } catch (err) {
      errors.push(err && err.message ? err.message : String(err));
    } finally {
      busy = false; send.disabled = false; render(); ta.focus();
    }
  };
  send.addEventListener("click", submit);
  ta.addEventListener("keydown", (ev) => { if (ev.key === "Enter" && !ev.shiftKey) { ev.preventDefault(); submit(); } });

  return root;
};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  // Imports from the engine.
  main.define("module @tomlarkworthy/robocoop-4-engine", async () =>
    runtime.module((await import("/@tomlarkworthy/robocoop-4-engine.js?v=4")).default));
  main.define("session", ["module @tomlarkworthy/robocoop-4-engine", "@variable"], (_, v) => v.import("session", _));
  // Import plain-named view aliases (NOT `viewof X` — editor-5 mangles those into a bare `viewof`).
  main.define("keyView", ["module @tomlarkworthy/robocoop-4-engine", "@variable"], (_, v) => v.import("keyView", _));
  main.define("modelView", ["module @tomlarkworthy/robocoop-4-engine", "@variable"], (_, v) => v.import("modelView", _));
  main.define("promptView", ["module @tomlarkworthy/robocoop-4-engine", "@variable"], (_, v) => v.import("promptView", _));
  main.define("rc4_agentShell", ["module @tomlarkworthy/robocoop-4-engine", "@variable"], (_, v) => v.import("rc4_agentShell", _));

  // terminal widget for the embedded agent shell.
  main.define("module @tomlarkworthy/robocoop-4-bash-terminal", async () =>
    runtime.module((await import("/@tomlarkworthy/robocoop-4-bash-terminal.js?v=4")).default));
  main.define("terminal", ["module @tomlarkworthy/robocoop-4-bash-terminal", "@variable"], (_, v) => v.import("terminal", _));

  // agent terminal first, chat below — same module, stacked in the pane.
  $def("rc4_agentTerminal", null, ["html", "terminal", "rc4_agentShell"], _agentTerminal);
  $def("rc4_facade", null, ["html", "md", "session", "keyView", "modelView", "promptView"], _facade);
  return main;
}
