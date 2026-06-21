// @tomlarkworthy/robocoop-4-engine — the persistent agent session + its config inputs.
//
// Builds an OpenRouter client from the key and a createAgentSession (imported from -core) wired to
// the LIVE registry, model picker and editable system prompt via PROVIDERS — so changing the model,
// editing the prompt, or registering a tool never recreates the session (the conversation survives).
// runCommand is the only env seam: cmd => window.justbash.exec(cmd) (the justbash module publishes it).
//
// Other notebooks import this module to drive or extend robocoop-4.
// Exports: viewof OPENROUTER_API_KEY, OPENROUTER_API_KEY, openrouter_models, viewof model, model,
//          viewof rc4_systemPrompt, rc4_systemPrompt, client, session.

const _seed = () => 1;

const _OPENROUTER_API_KEY = function _OPENROUTER_API_KEY(Inputs, localStorageView){
  return Inputs.bind(
    Inputs.password({ width: "100%", label: "OpenRouter key", placeholder: "sk-or-…" }),
    localStorageView("OPENROUTER_API_KEY")
  );
};

const _openrouter_models = function _openrouter_models(){return(
  [
    "anthropic/claude-sonnet-4",
    "anthropic/claude-opus-4",
    "anthropic/claude-3.5-sonnet",
    "openai/gpt-4.1",
    "openai/gpt-4o",
    "google/gemini-2.5-pro",
    "meta-llama/llama-3.3-70b-instruct"
  ]
)};

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
  return createOpenRouterClient({
    apiKey: key,
    fetch: window.fetch.bind(window),
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
const _session = function _session(toolsView, $model, $prompt, client, createAgentSession){
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
    runCommand: (cmd) => window.justbash.exec(cmd)
  });
};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  $def("rc4e_seed", "__seed", [], _seed);

  // Imports
  main.define("module @tomlarkworthy/local-storage-view", async () =>
    runtime.module((await import("/@tomlarkworthy/local-storage-view.js?v=4")).default));
  main.define("localStorageView", ["module @tomlarkworthy/local-storage-view", "@variable"], (_, v) => v.import("localStorageView", _));
  main.define("module @tomlarkworthy/robocoop-4-tools", async () =>
    runtime.module((await import("/@tomlarkworthy/robocoop-4-tools.js?v=4")).default));
  main.define("toolsView", ["module @tomlarkworthy/robocoop-4-tools", "@variable"], (_, v) => v.import("toolsView", _));

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
  $def("rc4e_session", "session", ["toolsView", "viewof model", "viewof rc4_systemPrompt", "client", "createAgentSession"], _session);
  return main;
}
