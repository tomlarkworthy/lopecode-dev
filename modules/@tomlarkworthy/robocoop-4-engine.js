// @tomlarkworthy/robocoop-4-engine — the persistent agent session + its workspace + config inputs.
//
// Self-contained: owns its own just-bash workspace + agent shell (no window.justbash global). Builds
// an OpenRouter client from the key and a createAgentSession (imported from -core) wired to the LIVE
// registry, model picker and editable system prompt via PROVIDERS — so changing the model, editing
// the prompt, or registering a tool never recreates the session (the conversation survives). The
// only env seam is runCommand = cmd => rc4_agentShell.run(cmd) (the embedded shell, imported by deps).
//
// Other notebooks import this module to drive or extend robocoop-4.
// Exports: viewof OPENROUTER_API_KEY, OPENROUTER_API_KEY, openrouter_models, viewof model, model,
//          viewof rc4_systemPrompt, rc4_systemPrompt, rc4_workspace, rc4_agentShell, client, session.

const _seed = () => 1;

// rc4_workspace — the agent's in-memory project fs (one InMemoryFs). rc4_agentShell is the session
// the agent drives; the embedded terminal (in the app module) renders it. No window globals.
const _rc4_workspace = function _rc4_workspace(createWorkspace){
  return createWorkspace({ "/notebook/README.md": "# robocoop-4 workspace\n\nModules live at /notebook/<moduleId>.js\n" });
};
const _rc4_agentShell = function _rc4_agentShell(rc4_workspace){
  return rc4_workspace.spawn({ cwd: "/notebook", label: "agent" });
};

const _OPENROUTER_API_KEY = function _OPENROUTER_API_KEY(Inputs, localStorageView){
  return Inputs.bind(
    Inputs.password({ width: "100%", label: "OpenRouter key", placeholder: "sk-or-…" }),
    localStorageView("OPENROUTER_API_KEY")
  );
};

// Model list, populated live from OpenRouter's public catalog (no key needed). Filtered to TOOL-CAPABLE
// models (robocoop-4 can't run without tool calls), sorted. Falls back to a curated list if the catalog is
// unreachable/slow (8s cap) — the fallback is also merged in so the stored default stays selectable.
const _openrouter_models = function _openrouter_models(){
  const FALLBACK = [
    "anthropic/claude-sonnet-4",
    "anthropic/claude-opus-4",
    "anthropic/claude-3.5-sonnet",
    "openai/gpt-4.1",
    "openai/gpt-4o",
    "google/gemini-2.5-pro",
    "meta-llama/llama-3.3-70b-instruct"
  ];
  const fetched = window.fetch("https://openrouter.ai/api/v1/models")
    .then((r) => r.ok ? r.json() : Promise.reject(new Error("HTTP " + r.status)))
    .then((j) => {
      const models = (j.data || []).filter((m) => m && m.id);
      const toolCapable = models.filter((m) => Array.isArray(m.supported_parameters) && m.supported_parameters.includes("tools"));
      const use = toolCapable.length ? toolCapable : models;
      const ids = new Set(use.map((m) => m.id));
      for (const f of FALLBACK) ids.add(f);
      return [...ids].sort();
    })
    .catch(() => FALLBACK);
  const timed = new Promise((res) => window.setTimeout(() => res(FALLBACK), 8000));
  return Promise.race([fetched, timed]);
};

const _model = function _model(Inputs, openrouter_models, localStorageView){
  return Inputs.bind(
    Inputs.select(openrouter_models, { label: "model", value: "anthropic/claude-sonnet-4" }),
    localStorageView("robocoop4_model", { defaultValue: "anthropic/claude-sonnet-4" })
  );
};

// Editable system prompt, seeded from the core's base prompt + footer.
const _rc4_systemPrompt = function _rc4_systemPrompt(Inputs, systemPrompt, composeFooter){
  const base = systemPrompt + "\n\n" + composeFooter({ workdir: "/notebook", model: "" });
  return Inputs.textarea({ label: "system prompt", rows: 4, value: base, width: "100%" });
};

// OpenRouter client; null until a key is present (session handles the null case).
const _client = function _client(OPENROUTER_API_KEY, createOpenRouterClient){
  const key = String(OPENROUTER_API_KEY || "").trim();
  if (!key) return null;
  // fetch defaults to the core's globalThis.fetch — no window.* in the notebook layer.
  return createOpenRouterClient({
    apiKey: key,
    referer: "https://lopecode.com",
    title: "robocoop-4"
  });
};

// Plain-named aliases of the view ELEMENTS so the facade can import them without a `viewof X`
// import (which editor-5 mangles into a bare `viewof` → "defined more than once").
const _keyView = function _keyView($0){ return $0; };
const _modelView = function _modelView($0){ return $0; };
const _promptView = function _promptView($0){ return $0; };

// The persistent session. Depends on the view ELEMENTS (stable) + client, so it is rebuilt only
// when the key changes. Model / prompt / tools are read live through providers. toolsView is the
// imported registry element (plain-named to survive editor round-trips).
const _session = function _session(toolsView, $model, $prompt, client, createAgentSession, rc4_agentShell, rc4_watchBus){
  if (!client) {
    return {
      messages: [],
      async send(){ throw new Error("Set your OpenRouter key above to start chatting."); },
      abort(){}, reset(){}
    };
  }
  return createAgentSession({
    client,
    toolsProvider: () => (Array.isArray(toolsView.value) ? toolsView.value : []),
    modelProvider: () => $model.value,
    systemPromptProvider: () => $prompt.value,
    runCommand: (cmd) => rc4_agentShell.run(cmd),
    // watched-variable changes stream into the loop: drained at the top of each step and injected as context
    noticesProvider: () => rc4_watchBus.drain(),
    // explicit-completion loop: end on task_complete, not on bare text; nudge a stalled turn before giving up
    completeToolName: 'task_complete',
    stallNudgeLimit: 2,
    maxStepsPerTurn: 20
  });
};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  $def("rc4e_seed", "__seed", [], _seed);
  $def("rc4e_workspace", "rc4_workspace", ["createWorkspace"], _rc4_workspace);
  $def("rc4e_agentShell", "rc4_agentShell", ["rc4_workspace"], _rc4_agentShell);

  // Imports
  main.define("module @tomlarkworthy/local-storage-view", async () =>
    runtime.module((await import("/@tomlarkworthy/local-storage-view.js?v=4")).default));
  main.define("localStorageView", ["module @tomlarkworthy/local-storage-view", "@variable"], (_, v) => v.import("localStorageView", _));
  // just-bash workspace (owned here — no window.justbash).
  main.define("module @tomlarkworthy/robocoop-4-bash-session", async () =>
    runtime.module((await import("/@tomlarkworthy/robocoop-4-bash-session.js?v=4")).default));
  main.define("createWorkspace", ["module @tomlarkworthy/robocoop-4-bash-session", "@variable"], (_, v) => v.import("createWorkspace", _));
  main.define("module @tomlarkworthy/robocoop-4-tools", async () =>
    runtime.module((await import("/@tomlarkworthy/robocoop-4-tools.js?v=4")).default));
  main.define("toolsView", ["module @tomlarkworthy/robocoop-4-tools", "@variable"], (_, v) => v.import("toolsView", _));
  main.define("rc4_watchBus", ["module @tomlarkworthy/robocoop-4-tools", "@variable"], (_, v) => v.import("rc4_watchBus", _));

  // Core logic imported from the literate core (was window.__rc4core).
  main.define("module @tomlarkworthy/robocoop-4-core", async () =>
    runtime.module((await import("/@tomlarkworthy/robocoop-4-core.js?v=4")).default));
  main.define("createAgentSession", ["module @tomlarkworthy/robocoop-4-core", "@variable"], (_, v) => v.import("createAgentSession", _));
  main.define("createOpenRouterClient", ["module @tomlarkworthy/robocoop-4-core", "@variable"], (_, v) => v.import("createOpenRouterClient", _));
  main.define("systemPrompt", ["module @tomlarkworthy/robocoop-4-core", "@variable"], (_, v) => v.import("systemPrompt", _));
  main.define("composeFooter", ["module @tomlarkworthy/robocoop-4-core", "@variable"], (_, v) => v.import("composeFooter", _));

  $def("rc4e_key_view", "viewof OPENROUTER_API_KEY", ["Inputs", "localStorageView"], _OPENROUTER_API_KEY);
  main.variable(observer("OPENROUTER_API_KEY")).define("OPENROUTER_API_KEY", ["Generators", "viewof OPENROUTER_API_KEY"], (G, _) => G.input(_));

  $def("rc4e_models", "openrouter_models", [], _openrouter_models);
  $def("rc4e_model_view", "viewof model", ["Inputs", "openrouter_models", "localStorageView"], _model);
  main.variable(observer("model")).define("model", ["Generators", "viewof model"], (G, _) => G.input(_));

  $def("rc4e_prompt_view", "viewof rc4_systemPrompt", ["Inputs", "systemPrompt", "composeFooter"], _rc4_systemPrompt);
  main.variable(observer("rc4_systemPrompt")).define("rc4_systemPrompt", ["Generators", "viewof rc4_systemPrompt"], (G, _) => G.input(_));

  $def("rc4e_keyView", "keyView", ["viewof OPENROUTER_API_KEY"], _keyView);
  $def("rc4e_modelView", "modelView", ["viewof model"], _modelView);
  $def("rc4e_promptView", "promptView", ["viewof rc4_systemPrompt"], _promptView);

  $def("rc4e_client", "client", ["OPENROUTER_API_KEY", "createOpenRouterClient"], _client);
  $def("rc4e_session", "session", ["toolsView", "viewof model", "viewof rc4_systemPrompt", "client", "createAgentSession", "rc4_agentShell", "rc4_watchBus"], _session);
  return main;
}
