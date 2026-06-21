// @tomlarkworthy/robocoop-4 — the chat facade (the visible right-hand pane).
//
// One imperative cell: a collapsible credentials/model/prompt strip, a scrolling chat transcript,
// and a message input. It drives the imported `session` (from -engine) and renders session.messages
// (which persist across turns). Built once with its own listeners — it does NOT re-run per keystroke;
// it only re-runs when the session is rebuilt (i.e. the API key changed → a fresh conversation).
// The terminal lives in the @tomlarkworthy/justbash pane beside this one.
//
// Imports (all plain-named — never `viewof X`, which editor-5 mangles): session, keyView, modelView,
// promptView (from -engine). keyView/modelView/promptView are the actual view ELEMENTS to embed.

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
  const cfgBody = html`<div style="display:flex;flex-direction:column;gap:8px;margin-top:8px"></div>`;
  cfgBody.append($key, $model, $prompt);
  cfg.append(cfgBody);
  root.append(cfg);

  // ── transcript ───────────────────────────────────────────────────────────
  const log = html`<div style="flex:1;min-height:0;overflow:auto;padding:10px;display:flex;flex-direction:column;gap:8px"></div>`;
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
  let busy = false;
  const render = () => {
    log.innerHTML = "";
    for (const m of session.messages) {
      if (m.role === "user") {
        log.append(bubble("right", C.user, document.createTextNode(String(m.content || ""))));
      } else if (m.role === "assistant" && m.content) {
        let node; try { node = md`${String(m.content)}`; } catch { node = document.createTextNode(String(m.content)); }
        log.append(bubble("left", C.asst, node));
      }
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

  // ── input ─────────────────────────────────────────────────────────────────
  const ta = html`<textarea rows="2" placeholder="Message robocoop-4…  (Enter to send, Shift+Enter for newline)" style="flex:1;resize:none;background:#010409;color:${C.fg};border:1px solid ${C.border};border-radius:8px;padding:8px;font:inherit"></textarea>`;
  const send = html`<button style="background:${C.user};color:#fff;border:0;border-radius:8px;padding:0 14px;cursor:pointer">Send</button>`;
  const bar = html`<div style="display:flex;gap:8px;padding:10px;border-top:1px solid ${C.border}"></div>`;
  bar.append(ta, send);
  root.append(bar);

  const submit = async () => {
    const text = ta.value.trim();
    if (!text || busy) return;
    busy = true; ta.value = ""; send.disabled = true;
    render(); // show the user bubble immediately is handled by session.send pushing the user msg
    try {
      await session.send(text, { onText: render, onToolCall: render, onToolResult: render, onFinish: render });
    } catch (err) {
      const e = document.createElement("div");
      e.style.cssText = "color:" + C.err; e.textContent = "error: " + (err && err.message ? err.message : err);
      log.append(e);
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

  $def("rc4_facade", null, ["html", "md", "session", "keyView", "modelView", "promptView"], _facade);
  return main;
}
