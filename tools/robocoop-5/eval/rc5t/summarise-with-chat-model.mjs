// rc5-train eval (20260928-0300-w19): "a text box and a button that summarises it using the same AI model you use".
// The summariser needs an OpenRouter key and model. The chat already keeps both per-browser
// (@tomlarkworthy/robocoop-5-engine `viewof OPENROUTER_API_KEY` = localStorageView('OPENROUTER_API_KEY'),
// `viewof model` = localStorageView('robocoop4_model'); exported as `keyView` / `modelView`, which
// @tomlarkworthy/robocoop-5 itself imports). The defects this catches:
//   - the key written into module source (it is then in every saved or shared copy of the file)
//   - a model id hard-coded or read once at boot instead of the one picked in settings
//   - a request on every recompute/keystroke instead of one per click
//   - a failed request that shows nothing
// Observed (mimo-v2.5-pro, 20260928-0300-w19): no run leaked the key (all imported `client` and `model`/`modelView`
// from robocoop-5-engine). The defect that did occur: the button never sent the text at click time
// (DOM search for the textarea, a cell body awaiting a click, a listener re-added per run, the action cell
// listing the text value). `once` fails on all of these; the replay of each trace module scores <= 0.55.
// Network: the initScript wraps fetch BEFORE boot (the chat's client captures fetch when created). While
// the collect sets __rc5tSum.on, every */chat/completions request is recorded and answered with a fake
// (SSE when the body asks to stream, JSON otherwise), so no real model call is made by the check.
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const COLLECT = readFileSync(resolve(here, "summarise-with-chat-model.collect.js"), "utf8");

const INIT_SCRIPT = String.raw`(() => {
  const orig = globalThis.fetch;
  const S = globalThis.__rc5tSum = { on: false, fail: false, reply: "", delayMs: 0, calls: [] };
  globalThis.fetch = async function (input, init) {
    const url = typeof input === "string" ? input : (input && input.url) || String(input);
    if (!S.on || !/\/chat\/completions/.test(url)) return orig.apply(this, arguments);
    let raw = init && init.body;
    if (raw == null && input && typeof input.clone === "function") { try { raw = await input.clone().text(); } catch {} }
    let body = {}; try { body = JSON.parse(raw || "{}"); } catch {}
    const h = new Headers((init && init.headers) || (input && input.headers) || {});
    S.calls.push({ model: body.model, auth: h.get("authorization"), stream: !!body.stream,
      hasText: /quarterly report shows revenue/.test(JSON.stringify(body.messages || body.input || body.prompt || "")) });
    if (S.delayMs) await new Promise(r => setTimeout(r, S.delayMs));
    if (S.fail) return new Response(JSON.stringify({ error: { message: "User not found.", code: 401 } }), { status: 401, headers: { "content-type": "application/json" } });
    const content = S.reply;
    if (body.stream) {
      const sse = "data: " + JSON.stringify({ id: "x", model: body.model, choices: [{ index: 0, delta: { role: "assistant", content } }] }) + "\n\n" +
        "data: " + JSON.stringify({ id: "x", model: body.model, choices: [{ index: 0, delta: {}, finish_reason: "stop" }], usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 } }) + "\n\n" +
        "data: [DONE]\n\n";
      return new Response(sse, { status: 200, headers: { "content-type": "text/event-stream" } });
    }
    return new Response(JSON.stringify({ id: "x", model: body.model, choices: [{ index: 0, message: { role: "assistant", content }, finish_reason: "stop" }],
      usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 } }), { status: 200, headers: { "content-type": "application/json" } });
  };
})()`;

const INIT = String.raw`(() => {
  const rt = [...globalThis.__ojs_runtime.mains.values()].find(m => m && m._runtime)._runtime;
  globalThis.__rc5tBefore = new Set([...rt._variables].map(v => v._module));
})()`;

// Reuses the chat's own settings the way @tomlarkworthy/robocoop-5 does
// (lopebooks/notebooks/@tomlarkworthy_robocoop-5.html: main.define("keyView", ["module @tomlarkworthy/robocoop-5-engine", ...])
// and main.define("modelView", ...)), reading .value at click time. The handler form is
// @tomlarkworthy/gallery.card's htl.html`<button onclick=${...}>`.
const SOLUTION = `const _intro = function intro(md){return( md\`# Summariser\` )};
const _text = function text(Inputs){return( Inputs.textarea({ label: "Text", rows: 8, width: "100%", placeholder: "Paste text here" }) )};
const _panel = function panel(htl, keyView, modelView, $text){
  const out = htl.html\`<div style="white-space:pre-wrap;margin-top:8px"></div>\`;
  const btn = htl.html\`<button onclick=\${async () => {
    const key = String(keyView.value || "").trim();
    if (!key) { out.textContent = "Error: no OpenRouter key: set one in the robocoop-5 settings panel."; return; }
    btn.disabled = true; out.textContent = "Summarising…";
    try {
      const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + key },
        body: JSON.stringify({ model: modelView.value, messages: [
          { role: "system", content: "Summarise the user's text in a few sentences." },
          { role: "user", content: $text.value } ] })
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error((j.error && j.error.message) || ("HTTP " + r.status));
      out.textContent = j.choices[0].message.content;
    } catch (e) { out.textContent = "Error: " + e.message; }
    finally { btn.disabled = false; }
  }}>Summarise</button>\`;
  return htl.html\`<div>\${btn}\${out}</div>\`;
};
export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;
  main.define("module @tomlarkworthy/robocoop-5-engine", async () => runtime.module((await import("/@tomlarkworthy/robocoop-5-engine.js?v=4")).default));
  $def("_intro", "intro", ["md"], _intro);
  $def("_text", "viewof text", ["Inputs"], _text);
  main.variable(observer("text")).define("text", ["Generators", "viewof text"], (G, _) => G.input(_));
  $def("_panel", "panel", ["htl", "keyView", "modelView", "viewof text"], _panel);
  main.define("keyView", ["module @tomlarkworthy/robocoop-5-engine", "@variable"], (_, v) => v.import("keyView", _));
  main.define("modelView", ["module @tomlarkworthy/robocoop-5-engine", "@variable"], (_, v) => v.import("modelView", _));
  return main;
}
`;

export default {
  id: "rc5t-summarise-with-chat-model",
  category: "rc5-train",
  question: "Add a text box where I can paste some text and a button that summarises it using the same AI model you use.",
  setup: { initScript: INIT_SCRIPT, init: INIT, collect: COLLECT },
  criteria: [
    // the security defect: the key must not be in the file a save writes
    { name: "collected_equals", args: { key: "leak", equals: "ok" }, weight: 4 },
    // the same key and the model currently picked in settings, read at click time
    { name: "collected_equals", args: { key: "settings", equals: "ok" }, weight: 2 },
    { name: "collected_equals", args: { key: "once", equals: "ok" }, weight: 2 },
    { name: "collected_equals", args: { key: "shown", equals: "ok" }, weight: 1 },
    { name: "collected_equals", args: { key: "error", equals: "ok" }, weight: 1 },
  ],
  oracle: [
    { tool: "read_file", args: { file_path: "/content/@tomlarkworthy/markdown-wiki/writing-cells-in-module-source.md" } },
    { tool: "read_file", args: { file_path: "/content/@tomlarkworthy/markdown-wiki/event-handlers-in-cells.md" } },
    { tool: "write_file", args: { file_path: "/src/@user/summariser.js", content: SOLUTION } },
  ],
};
