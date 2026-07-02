// @tomlarkworthy/robocoop-4 — lopecode module SOURCE (cells in lopecode cell format)
//
// robocoop-4 = bash-centric, OpenRouter-gated coding agent. The portable core lives in
// tools/robocoop-4/*.mjs (DOM-free, runs in node eval harness AND browser). THIS file is the
// browser notebook shell: API-key viewof, model picker, the justbash workspace/session/terminal
// view, and the wiring cell that dynamic-imports the core and drives a run.
//
// ───────────────────────────── HOW TO ASSEMBLE ─────────────────────────────
// This is SOURCE for live assembly via the pairing channel — it is NOT meant to be embedded
// into HTML directly. Two routes:
//
// A) Fresh module via the pairing channel (create_module + define_cell):
//    1. Pair into a justbash-based notebook (one that imports @tomlarkworthy/justbash-session +
//       justbash-terminal and exposes window.justbash) e.g. lopebooks @tomlarkworthy_justbash.html.
//    2. create_module @tomlarkworthy/robocoop-4 (seed with one cell so the module exists).
//    3. define_cell each cell below, in order, using the Observable SOURCE shown in the comment
//       above each const (define_cell wants Observable source, not the compiled `const _x = ...`).
//       The compiled form here documents the exact deps each cell needs.
//    4. Add the import cells (CORE_URL, plus justbash-session/terminal imports) — see IMPORTS.
//
// B) sync into a justbash notebook file, then jumpgate:
//    Author the Observable source, push to ObservableHQ, jumpgate to HTML, then
//    `bun tools/channel/sync-module.ts --module @tomlarkworthy/robocoop-4 --source <file> --target <nb>`.
//
// ───────────────────────────── DEPENDENCIES ─────────────────────────────
// Imported modules (declare via the import cells at the bottom):
//   @tomlarkworthy/justbash-session  -> createWorkspace, createSession, formatResult
//   @tomlarkworthy/justbash-terminal -> terminal
//   @tomlarkworthy/local-storage-view -> localStorageView   (key persistence)
// Builtins used: md, html, htl, Inputs, Generators, FileAttachment(no), invalidation.
//
// The portable core is loaded by dynamic import from a pinned URL (CORE_BASE). The notebook
// only ever calls the core via createNotebookRunner(...) from notebookAdapter.mjs, whose single
// environment seam is `runCommand = cmd => window.justbash.exec(cmd)`. The core never touches
// window; this file is the ONLY place that knows about the runtime/DOM.

// ════════════════════════════════════════════════════════════════════════════
// SECTION 1 — Title + intro
// ════════════════════════════════════════════════════════════════════════════

// Observable source:
//   md`# robocoop-4 ...`
const _title = function _title(md){return(
  md`# robocoop-4 — bash-centric coding agent

A coding agent with **one** tool: \`bash\`, run over an in-memory project filesystem. The model
gateway is **OpenRouter**. The agent reads and edits notebook modules as text files at
\`/notebook/<moduleId>.js\` using \`cat\`, \`grep\`, \`sed\`, \`awk\`, etc.

The agent loop, the bash tool and the OpenRouter client are DOM-free \`.mjs\` modules shared with
the node eval harness — this notebook only supplies the key, the model and the live shell view.`
)};

// ════════════════════════════════════════════════════════════════════════════
// SECTION 2 — Core import (dynamic import of the portable .mjs)
// ════════════════════════════════════════════════════════════════════════════

// CORE_BASE: where the portable .mjs core is served from. When pairing locally, point this at a
// file:// or http:// URL that serves tools/robocoop-4/. Edit this to your served path.
// Observable source:
//   CORE_BASE = "https://tomlarkworthy.github.io/lopebooks/robocoop-4/"
const _CORE_BASE = function _CORE_BASE(){return(
  "https://tomlarkworthy.github.io/lopebooks/robocoop-4/"
)};

// core: the public surface of the portable core (index.mjs re-exports) PLUS the browser adapter.
// Dynamic import keeps the DOM-free core untouched; notebookAdapter.mjs is the only window-aware file.
// Observable source:
//   core = { ... await import(...) ... }
const _core = async function _core(CORE_BASE){
  const index = await import(CORE_BASE + "index.mjs");
  const adapter = await import(CORE_BASE + "notebookAdapter.mjs");
  return { ...index, ...adapter };
};

// ════════════════════════════════════════════════════════════════════════════
// SECTION 3 — Credentials + model picker
// ════════════════════════════════════════════════════════════════════════════

// viewof OPENROUTER_API_KEY — persisted to localStorage, never logged or sent to the fs.
// Leave blank to run in demo mode (MiMo via the shared rate-limited gateway; see demoMode).
// Observable source:
//   viewof OPENROUTER_API_KEY = Inputs.bind(Inputs.password({...}), localStorageView("OPENROUTER_API_KEY"))
const _OPENROUTER_API_KEY = function _OPENROUTER_API_KEY(Inputs,localStorageView){return(
  Inputs.bind(
    Inputs.password({
      width: "100%",
      label: "OPENROUTER_API_KEY",
      placeholder: "leave blank for demo mode, or paste your OpenRouter key (sk-or-...)"
    }),
    localStorageView("OPENROUTER_API_KEY")
  )
)};

// demoMode — true when the user has NOT supplied their own key. In demo mode the agent runs
// through the shared gateway (which injects a key server-side, allows MiMo only, and enforces a
// per-IP daily USD budget), so the notebook works out-of-the-box with no signup.
// Observable source:
//   demoMode = !(OPENROUTER_API_KEY || "").trim()
const _demoMode = function _demoMode(OPENROUTER_API_KEY){return(
  !(OPENROUTER_API_KEY || "").trim()
)};

// DEMO_GATEWAY_URL — base URL of the shared openrouter-gateway Worker (MiMo-only, metered).
// Observable source:
//   DEMO_GATEWAY_URL = "https://openrouter-gateway.endpointservices.workers.dev/v1"
const _DEMO_GATEWAY_URL = function _DEMO_GATEWAY_URL(){return(
  "https://openrouter-gateway.endpointservices.workers.dev/v1"
)};

// openrouter_models — provider-namespaced ids (a bare id 404s). Re-verify against openrouter.ai/models.
// In demo mode only the MiMo ids the gateway key permits are offered; with your own key, the full list.
// Observable source:
//   openrouter_models = demoMode ? ["xiaomi/mimo-v2.5-pro", ...] : ["anthropic/claude-sonnet-4", ...]
const _openrouter_models = function _openrouter_models(demoMode){return(
  demoMode
    ? [
        "xiaomi/mimo-v2.5-pro",
        "xiaomi/mimo-v2.5"
      ]
    : [
        "anthropic/claude-sonnet-4",
        "anthropic/claude-opus-4",
        "anthropic/claude-3.5-sonnet",
        "openai/gpt-4.1",
        "openai/gpt-4o",
        "google/gemini-2.5-pro",
        "meta-llama/llama-3.3-70b-instruct",
        "xiaomi/mimo-v2.5-pro",
        "xiaomi/mimo-v2.5"
      ]
)};

// viewof model — model picker, persisted.
// Observable source:
//   viewof model = Inputs.bind(Inputs.select(openrouter_models, {label:"model", value:"anthropic/claude-sonnet-4"}), localStorageView("robocoop4_model",{defaultValue:"anthropic/claude-sonnet-4"}))
const _model = function _model(Inputs,openrouter_models,localStorageView){return(
  Inputs.bind(
    Inputs.select(openrouter_models, {
      label: "model",
      value: "anthropic/claude-sonnet-4"
    }),
    localStorageView("robocoop4_model", { defaultValue: "anthropic/claude-sonnet-4" })
  )
)};

// agentConfig — resolves the provider endpoint + credential from demoMode. Demo mode targets the
// shared gateway (no apiKey — it injects one server-side); with a key, direct OpenRouter.
// Observable source:
//   agentConfig = demoMode ? { baseUrl: DEMO_GATEWAY_URL } : { baseUrl: "https://openrouter.ai/api/v1", apiKey: OPENROUTER_API_KEY.trim() }
const _agentConfig = function _agentConfig(demoMode,DEMO_GATEWAY_URL,OPENROUTER_API_KEY){return(
  demoMode
    ? { baseUrl: DEMO_GATEWAY_URL }
    : { baseUrl: "https://openrouter.ai/api/v1", apiKey: OPENROUTER_API_KEY.trim() }
)};

// providerStatus — one-line banner so the active provider is always visible (fast visible feedback).
// Observable source:
//   providerStatus = md`...`
const _providerStatus = function _providerStatus(demoMode,md){return(
  demoMode
    ? md`> 🎮 **Demo mode** — running MiMo through the shared gateway (rate-limited, ~$0.50/day). Add your OpenRouter key above to unlock all models.`
    : md`> 🔑 **Your key** — calling OpenRouter directly.`
)};

// ════════════════════════════════════════════════════════════════════════════
// SECTION 4 — justbash workspace / session / terminal view
// ════════════════════════════════════════════════════════════════════════════
//
// We DON'T require the host notebook's window.justbash to pre-exist: robocoop-4 owns its own
// workspace + agent shell + bridge, so it works standing alone. If the host already published
// window.justbash, the bridge cell below is a no-op overwrite of the same shape.

// workspace — one InMemoryFs shared by the user shell and the agent shell.
// Observable source:
//   workspace = createWorkspace({ "/notebook/README.md": "# robocoop-4 workspace\n\nModules live at /notebook/<moduleId>.js\n" })
const _workspace = function _workspace(createWorkspace){return(
  createWorkspace({
    "/notebook/README.md": "# robocoop-4 workspace\n\nModules live at /notebook/<moduleId>.js\n"
  })
)};

// userShell — the human's session over the shared fs.
// Observable source:
//   userShell = workspace.spawn({ cwd: "/notebook" })
const _userShell = function _userShell(workspace){return(
  workspace.spawn({ cwd: "/notebook" })
)};

// agentShell — the session the agent drives via window.justbash.
// Observable source:
//   agentShell = workspace.spawn({ cwd: "/notebook" })
const _agentShell = function _agentShell(workspace){return(
  workspace.spawn({ cwd: "/notebook" })
)};

// justbashBridge — publishes window.justbash {run, exec, read, write, ls, snapshot, shells}.
// Mirrors @tomlarkworthy_justbash bridge so the core's notebookAdapter seam works unchanged.
// Observable source: (paste body)
const _justbashBridge = function _justbashBridge(workspace,userShell,agentShell,formatResult,html){
  const api = {
    workspace,
    shells: { you: userShell, agent: agentShell },
    async run(cmd, shell = agentShell) { return formatResult(await shell.run(cmd)); },
    async exec(cmd, shell = agentShell) { return shell.run(cmd); },
    read: path => workspace.fs.readFile(path),
    write: (path, content) => workspace.fs.writeFile(path, content),
    ls: (path = "/notebook") => workspace.fs.readdir(path),
    snapshot: () => workspace.snapshot()
  };
  window.justbash = api;
  return html`<div style="font:12px ui-monospace,monospace;color:#7ee787">● window.justbash is live (agent drives the right-hand shell)</div>`;
};

// terminals — two readline widgets rendering from the same workspace events.
// Observable source: (paste body)
const _terminals = function _terminals(terminal,userShell,agentShell,html){
  const you = terminal(userShell, { title: "you — type commands here" });
  const agent = terminal(agentShell, { title: "agent — driven by robocoop-4" });
  return html`<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;max-width:1000px">${you}${agent}</div>`;
};

// ════════════════════════════════════════════════════════════════════════════
// SECTION 5 — system prompt (browser-composed, delegates base to the core)
// ════════════════════════════════════════════════════════════════════════════

// workdir — the notebook-file prefix the agent operates over.
// Observable source:
//   workdir = "/notebook"
const _workdir = function _workdir(){return(
  "/notebook"
)};

// fullSystemPrompt — core.systemPrompt + core.composeFooter({workdir, model}).
// Observable source:
//   fullSystemPrompt = core.systemPrompt + "\n\n" + core.composeFooter({ workdir, model })
const _fullSystemPrompt = function _fullSystemPrompt(core,workdir,model){return(
  core.systemPrompt + "\n\n" + core.composeFooter({ workdir, model })
)};

// ════════════════════════════════════════════════════════════════════════════
// SECTION 6 — runner: wires the portable core to window.justbash
// ════════════════════════════════════════════════════════════════════════════

// runner — createNotebookRunner from notebookAdapter.mjs. The adapter sets
//   runCommand = cmd => window.justbash.exec(cmd), wires createOpenRouterClient({apiKey, fetch: window.fetch}),
//   mkdir -p the /notebook prefix before first ls, and returns a thin run().
// We depend on justbashBridge so window.justbash exists before the runner is built.
// Observable source:
//   runner = core.createNotebookRunner({ ...agentConfig, model, systemPrompt: fullSystemPrompt, workdir, justbashBridge })
const _runner = function _runner(core,agentConfig,model,fullSystemPrompt,workdir,justbashBridge){
  // justbashBridge is referenced only to order this cell after the bridge publishes window.justbash.
  void justbashBridge;
  return core.createNotebookRunner({
    apiKey: agentConfig.apiKey,      // undefined in demo mode — gateway injects the key
    baseUrl: agentConfig.baseUrl,
    model,
    systemPrompt: fullSystemPrompt,
    workdir
  });
};

// ════════════════════════════════════════════════════════════════════════════
// SECTION 7 — chat UI panel
// ════════════════════════════════════════════════════════════════════════════

// viewof prompt — the user's task instruction.
// Observable source:
//   viewof prompt = Inputs.textarea({ label: "task", rows: 3, placeholder: "e.g. rename `foo` to `bar` in /notebook/@user/mod.js", submit: true })
const _prompt = function _prompt(Inputs){return(
  Inputs.textarea({
    label: "task",
    rows: 3,
    placeholder: "e.g. rename `foo` to `bar` in /notebook/@user/mod.js",
    submit: true
  })
)};

// chat — the transcript panel. Streams loop callbacks (onText / onToolCall / onToolResult)
// into a scrolling log, then runs the agent loop against the prompt. Returns a DOM element;
// re-runs whenever `prompt`, `runner` or `model` change.
// Observable source: (paste body)
const _chat = async function _chat(html,prompt,runner,model,invalidation){
  const root = html`<div style="max-width:1000px;border:1px solid #30363d;border-radius:8px;padding:12px 14px;background:#0d1117;color:#c9d1d9;font:13px/1.6 ui-monospace,Menlo,monospace"></div>`;
  const log = html`<div style="white-space:pre-wrap"></div>`;
  root.append(log);

  const line = (label, text, color) => {
    const el = document.createElement("div");
    el.style.cssText = "margin:4px 0;color:" + (color || "#c9d1d9");
    const tag = document.createElement("span");
    tag.style.cssText = "color:#8b949e;margin-right:6px";
    tag.textContent = label;
    el.append(tag, document.createTextNode(text));
    log.append(el);
    root.scrollTop = root.scrollHeight;
    return el;
  };

  if (!prompt || !String(prompt).trim()) {
    line("idle", "Enter a task above and submit to run the agent.", "#8b949e");
    return root;
  }

  let aborted = false;
  invalidation.then(() => { aborted = true; });

  line("user", String(prompt), "#79c0ff");
  line("model", String(model), "#8b949e");

  try {
    const result = await runner.run(String(prompt), {
      onStep: (i) => { if (aborted) return; line("step", "#" + i, "#8b949e"); },
      onText: (t) => { if (aborted || !t) return; line("assistant", t, "#c9d1d9"); },
      onToolCall: (id, name, args) => {
        if (aborted) return;
        line("bash $", String(args && args.command != null ? args.command : JSON.stringify(args)), "#d2a8ff");
      },
      onToolResult: (id, out) => { if (aborted) return; line("output", String(out), "#7ee787"); }
    });
    if (!aborted) line("done", "finishReason=" + result.finishReason + " steps=" + result.steps, "#8b949e");
  } catch (err) {
    if (!aborted) line("error", String(err && err.message ? err.message : err), "#ff7b72");
  }
  return root;
};

// ════════════════════════════════════════════════════════════════════════════
// SECTION 8 — usage notes
// ════════════════════════════════════════════════════════════════════════════

// Observable source:
//   md`## Using it ...`
const _usage = function _usage(md){return(
  md`## Using it

1. Paste an **OpenRouter** key above (\`sk-or-...\`). It is stored in \`localStorage\` only.
2. Pick a **model** (ids are provider-namespaced; a bare id 404s).
3. Seed the workspace: \`echo '...' > /notebook/@user/mod.js\` in the left shell, or seed from the
   live runtime via the adapter's per-module \`exportModuleJS(id).source\`.
4. Type a **task** and submit. The agent edits files with \`bash\` over the shared fs; every command
   appears in the right-hand terminal in real time.

The eval harness (\`tools/robocoop-4/eval/harness.mjs\`) runs the SAME loop and bash tool against an
in-memory fs with a deterministic scripted client — no key, no network — for self-test.`
)};

// ════════════════════════════════════════════════════════════════════════════
// IMPORTS — define cells (Observable import-cell syntax shown in comments)
// ════════════════════════════════════════════════════════════════════════════
//
//   import { createWorkspace, createSession, formatResult } from "@tomlarkworthy/justbash-session"
//   import { terminal }                                     from "@tomlarkworthy/justbash-terminal"
//   import { localStorageView }                             from "@tomlarkworthy/local-storage-view"
//
// In compiled form these become main.define(... v.import(...)) lines (see $def block below).

// ════════════════════════════════════════════════════════════════════════════
// define() — compiled module shape. Documents pids/deps; live-assembly uses define_cell instead.
// ════════════════════════════════════════════════════════════════════════════
export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  $def("rc4_title", null, ["md"], _title);
  $def("rc4_CORE_BASE", "CORE_BASE", [], _CORE_BASE);
  $def("rc4_core", "core", ["CORE_BASE"], _core);

  $def("rc4_OPENROUTER_API_KEY", "viewof OPENROUTER_API_KEY", ["Inputs", "localStorageView"], _OPENROUTER_API_KEY);
  main.variable(observer("OPENROUTER_API_KEY")).define("OPENROUTER_API_KEY", ["Generators", "viewof OPENROUTER_API_KEY"], (G, _) => G.input(_));
  $def("rc4_demoMode", "demoMode", ["OPENROUTER_API_KEY"], _demoMode);
  $def("rc4_DEMO_GATEWAY_URL", "DEMO_GATEWAY_URL", [], _DEMO_GATEWAY_URL);
  $def("rc4_openrouter_models", "openrouter_models", ["demoMode"], _openrouter_models);
  $def("rc4_model", "viewof model", ["Inputs", "openrouter_models", "localStorageView"], _model);
  main.variable(observer("model")).define("model", ["Generators", "viewof model"], (G, _) => G.input(_));
  $def("rc4_agentConfig", "agentConfig", ["demoMode", "DEMO_GATEWAY_URL", "OPENROUTER_API_KEY"], _agentConfig);
  $def("rc4_providerStatus", "providerStatus", ["demoMode", "md"], _providerStatus);

  $def("rc4_workspace", "workspace", ["createWorkspace"], _workspace);
  $def("rc4_userShell", "userShell", ["workspace"], _userShell);
  $def("rc4_agentShell", "agentShell", ["workspace"], _agentShell);
  $def("rc4_justbashBridge", "justbashBridge", ["workspace", "userShell", "agentShell", "formatResult", "html"], _justbashBridge);
  $def("rc4_terminals", "terminals", ["terminal", "userShell", "agentShell", "html"], _terminals);

  $def("rc4_workdir", "workdir", [], _workdir);
  $def("rc4_fullSystemPrompt", "fullSystemPrompt", ["core", "workdir", "model"], _fullSystemPrompt);
  $def("rc4_runner", "runner", ["core", "agentConfig", "model", "fullSystemPrompt", "workdir", "justbashBridge"], _runner);

  $def("rc4_prompt", "viewof prompt", ["Inputs"], _prompt);
  main.variable(observer("prompt")).define("prompt", ["Generators", "viewof prompt"], (G, _) => G.input(_));
  $def("rc4_chat", "chat", ["html", "prompt", "runner", "model", "invalidation"], _chat);

  $def("rc4_usage", null, ["md"], _usage);

  // Imports
  main.define("module @tomlarkworthy/justbash-session", async () =>
    runtime.module((await import("/@tomlarkworthy/justbash-session.js?v=4")).default));
  main.define("module @tomlarkworthy/justbash-terminal", async () =>
    runtime.module((await import("/@tomlarkworthy/justbash-terminal.js?v=4")).default));
  main.define("module @tomlarkworthy/local-storage-view", async () =>
    runtime.module((await import("/@tomlarkworthy/local-storage-view.js?v=4")).default));
  main.define("createWorkspace", ["module @tomlarkworthy/justbash-session", "@variable"], (_, v) => v.import("createWorkspace", _));
  main.define("createSession", ["module @tomlarkworthy/justbash-session", "@variable"], (_, v) => v.import("createSession", _));
  main.define("formatResult", ["module @tomlarkworthy/justbash-session", "@variable"], (_, v) => v.import("formatResult", _));
  main.define("terminal", ["module @tomlarkworthy/justbash-terminal", "@variable"], (_, v) => v.import("terminal", _));
  main.define("localStorageView", ["module @tomlarkworthy/local-storage-view", "@variable"], (_, v) => v.import("localStorageView", _));

  return main;
}
