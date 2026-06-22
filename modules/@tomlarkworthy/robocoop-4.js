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
  const root = html`<div style="border:1px solid #30363d;border-radius:8px;max-height:35vh;overflow:auto;margin-bottom:8px"></div>`;
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
  const cfgBody = html`<div style="display:flex;flex-direction:column;gap:8px;margin-top:8px"></div>`;
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
