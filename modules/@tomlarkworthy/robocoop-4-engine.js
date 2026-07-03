// @tomlarkworthy/robocoop-4-engine — the persistent agent session + its workspace + config inputs.
//
// Self-contained: owns its own just-bash workspace + agent shell (no window.justbash global). Builds
// an OpenRouter client from the key and a createAgentSession (imported from -core) wired to the LIVE
// registry, model picker and editable system prompt via PROVIDERS — so changing the model, editing
// the prompt, or registering a tool never recreates the session (the conversation survives). The
// only env seam is runCommand = cmd => rc4_agentShell.run(cmd) (the embedded shell, imported by deps).
//
// Other notebooks import this module to drive or extend robocoop-4.
// Exports: viewof OPENROUTER_API_KEY, OPENROUTER_API_KEY, openrouter_catalog, openrouter_models, openrouter_vision, viewof model, model,
//          viewof rc4_systemPrompt, rc4_systemPrompt, rc4_workspace, rc4_agentShell, client, session.

const _seed = () => 1;

// rc4_workspace — the agent's in-memory project fs (one InMemoryFs). rc4_agentShell is the session
// the agent drives; the embedded terminal (in the app module) renders it. No window globals.
const _rc4_workspace = function _rc4_workspace(createWorkspace){
  // Seed /src (the agent's stable editing surface) so it exists before the shell spawns there; hostbridge fills
  // it with each module's editable copy. /notebook/<id>.js is the canonical, auto-formatted mirror (read-only).
  return createWorkspace({ "/src/README.md": "# robocoop-4 workspace\n\nEdit modules at /src/<moduleId>.js — your changes apply live and your file is NEVER reformatted (so edit_file keeps working). /notebook/<moduleId>.js is the read-only canonical mirror.\n" });
};
const _rc4_agentShell = function _rc4_agentShell(rc4_workspace){
  return rc4_workspace.spawn({ cwd: "/src", label: "agent" });
};

const _OPENROUTER_API_KEY = function _OPENROUTER_API_KEY(Inputs, localStorageView){
  return Inputs.bind(
    Inputs.password({ width: "100%", label: "OpenRouter key", placeholder: "sk-or-…" }),
    localStorageView("OPENROUTER_API_KEY")
  );
};

// Model catalog, populated live from OpenRouter's public catalog (no key needed). robocoop-4 NEEDS tool
// calls, so the list is filtered to tool-capable models; VISION (image input) is optional — non-vision
// models are kept but tagged in the picker (they can't see attached screenshots). Returns {ids, vision}:
// `ids` is the sorted selectable list, `vision` is the Set of those that support image input. If the live
// catalog is unreachable or slow (>5s) it falls back to an embedded SNAPSHOT of the catalog (see below), so
// the chooser is fully populated offline. Graceful widening: tool-capable → all, so it is never empty.
const _openrouter_catalog = function _openrouter_catalog(){
  // Snapshot of openrouter.ai/api/v1/models (tool-capable models only, captured 2026-06-28) used as the
  // FALLBACK when the live fetch is slow (>5s) or unreachable, so the picker stays fully populated offline.
  // The old 6-model curated fallback dropped almost everything on a timeout (e.g. xiaomi/mimo-v2.5-pro went
  // missing → empty model → OpenRouter 400). A leading "*" marks a vision-capable (image-input) model.
  const SNAPSHOT = `
  *~anthropic/claude-fable-latest *~anthropic/claude-haiku-latest *~anthropic/claude-opus-latest
  *~anthropic/claude-sonnet-latest *~google/gemini-flash-latest *~google/gemini-pro-latest
  *~moonshotai/kimi-latest *~openai/gpt-latest *~openai/gpt-mini-latest ai21/jamba-large-1.7
  *amazon/nova-2-lite-v1 *amazon/nova-lite-v1 amazon/nova-micro-v1 *amazon/nova-premier-v1 *amazon/nova-pro-v1
  *anthropic/claude-3-haiku *anthropic/claude-fable-5 *anthropic/claude-haiku-4.5 *anthropic/claude-opus-4
  *anthropic/claude-opus-4.1 *anthropic/claude-opus-4.5 *anthropic/claude-opus-4.6
  *anthropic/claude-opus-4.6-fast *anthropic/claude-opus-4.7 *anthropic/claude-opus-4.7-fast
  *anthropic/claude-opus-4.8 *anthropic/claude-opus-4.8-fast *anthropic/claude-sonnet-4
  *anthropic/claude-sonnet-4.5 *anthropic/claude-sonnet-4.6 arcee-ai/trinity-large-thinking
  arcee-ai/trinity-mini arcee-ai/virtuoso-large *bytedance-seed/seed-1.6 *bytedance-seed/seed-1.6-flash
  *bytedance-seed/seed-2.0-lite *bytedance-seed/seed-2.0-mini cohere/command-r-08-2024
  cohere/command-r-plus-08-2024 cohere/north-mini-code:free deepseek/deepseek-chat
  deepseek/deepseek-chat-v3-0324 deepseek/deepseek-chat-v3.1 deepseek/deepseek-r1 deepseek/deepseek-r1-0528
  deepseek/deepseek-v3.1-terminus deepseek/deepseek-v3.2 deepseek/deepseek-v3.2-exp deepseek/deepseek-v4-flash
  deepseek/deepseek-v4-pro *google/gemini-2.5-flash *google/gemini-2.5-flash-lite
  *google/gemini-2.5-flash-lite-preview-09-2025 *google/gemini-2.5-pro *google/gemini-2.5-pro-preview
  *google/gemini-2.5-pro-preview-05-06 *google/gemini-3-flash-preview *google/gemini-3-pro-image
  *google/gemini-3.1-flash-lite *google/gemini-3.1-flash-lite-preview *google/gemini-3.1-pro-preview
  *google/gemini-3.1-pro-preview-customtools *google/gemini-3.5-flash *google/gemma-3-12b-it
  *google/gemma-3-27b-it *google/gemma-4-26b-a4b-it *google/gemma-4-26b-a4b-it:free *google/gemma-4-31b-it
  *google/gemma-4-31b-it:free ibm-granite/granite-4.1-8b inception/mercury-2 inclusionai/ling-2.6-1t
  inclusionai/ling-2.6-flash inclusionai/ring-2.6-1t kwaipilot/kat-coder-pro-v2
  liquid/lfm-2.5-1.2b-thinking:free meta-llama/llama-3.1-70b-instruct meta-llama/llama-3.1-8b-instruct
  meta-llama/llama-3.3-70b-instruct meta-llama/llama-3.3-70b-instruct:free *meta-llama/llama-4-maverick
  *meta-llama/llama-4-scout minimax/minimax-m1 minimax/minimax-m2 minimax/minimax-m2.1 minimax/minimax-m2.5
  minimax/minimax-m2.7 *minimax/minimax-m3 mistralai/codestral-2508 mistralai/devstral-2512
  *mistralai/ministral-14b-2512 *mistralai/ministral-3b-2512 *mistralai/ministral-8b-2512
  mistralai/mistral-large mistralai/mistral-large-2407 *mistralai/mistral-large-2512
  *mistralai/mistral-medium-3 *mistralai/mistral-medium-3-5 *mistralai/mistral-medium-3.1
  mistralai/mistral-nemo mistralai/mistral-saba *mistralai/mistral-small-2603
  *mistralai/mistral-small-3.2-24b-instruct mistralai/mixtral-8x22b-instruct mistralai/voxtral-small-24b-2507
  moonshotai/kimi-k2 moonshotai/kimi-k2-0905 moonshotai/kimi-k2-thinking *moonshotai/kimi-k2.5
  *moonshotai/kimi-k2.6 *moonshotai/kimi-k2.7-code nvidia/llama-3.3-nemotron-super-49b-v1.5
  nvidia/nemotron-3-nano-30b-a3b nvidia/nemotron-3-nano-30b-a3b:free
  *nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free nvidia/nemotron-3-super-120b-a12b
  nvidia/nemotron-3-super-120b-a12b:free nvidia/nemotron-3-ultra-550b-a55b
  nvidia/nemotron-3-ultra-550b-a55b:free *nvidia/nemotron-nano-12b-v2-vl:free nvidia/nemotron-nano-9b-v2:free
  openai/gpt-3.5-turbo openai/gpt-3.5-turbo-0613 openai/gpt-3.5-turbo-16k openai/gpt-4 *openai/gpt-4-turbo
  openai/gpt-4-turbo-preview *openai/gpt-4.1 *openai/gpt-4.1-mini *openai/gpt-4.1-nano *openai/gpt-4o
  *openai/gpt-4o-2024-05-13 *openai/gpt-4o-2024-08-06 *openai/gpt-4o-2024-11-20 *openai/gpt-4o-mini
  *openai/gpt-4o-mini-2024-07-18 *openai/gpt-5 *openai/gpt-5-codex *openai/gpt-5-mini *openai/gpt-5-nano
  *openai/gpt-5-pro *openai/gpt-5.1 *openai/gpt-5.1-chat *openai/gpt-5.1-codex *openai/gpt-5.1-codex-max
  *openai/gpt-5.1-codex-mini *openai/gpt-5.2 *openai/gpt-5.2-chat *openai/gpt-5.2-codex *openai/gpt-5.2-pro
  *openai/gpt-5.3-chat *openai/gpt-5.3-codex *openai/gpt-5.4 *openai/gpt-5.4-mini *openai/gpt-5.4-nano
  *openai/gpt-5.4-pro *openai/gpt-5.5 *openai/gpt-5.5-pro openai/gpt-audio openai/gpt-audio-mini
  *openai/gpt-chat-latest openai/gpt-oss-120b openai/gpt-oss-120b:free openai/gpt-oss-20b
  openai/gpt-oss-20b:free openai/gpt-oss-safeguard-20b *openai/o1 *openai/o3 *openai/o3-deep-research
  openai/o3-mini openai/o3-mini-high *openai/o3-pro *openai/o4-mini *openai/o4-mini-deep-research
  *openai/o4-mini-high *openrouter/auto *openrouter/free openrouter/owl-alpha poolside/laguna-m.1
  poolside/laguna-m.1:free poolside/laguna-xs.2 poolside/laguna-xs.2:free qwen/qwen-2.5-72b-instruct
  qwen/qwen-2.5-7b-instruct qwen/qwen-plus qwen/qwen-plus-2025-07-28 qwen/qwen-plus-2025-07-28:thinking
  qwen/qwen3-14b qwen/qwen3-235b-a22b qwen/qwen3-235b-a22b-2507 qwen/qwen3-235b-a22b-thinking-2507
  qwen/qwen3-30b-a3b qwen/qwen3-30b-a3b-instruct-2507 qwen/qwen3-30b-a3b-thinking-2507 qwen/qwen3-32b
  qwen/qwen3-8b qwen/qwen3-coder qwen/qwen3-coder-30b-a3b-instruct qwen/qwen3-coder-flash
  qwen/qwen3-coder-next qwen/qwen3-coder-plus qwen/qwen3-coder:free qwen/qwen3-max qwen/qwen3-max-thinking
  qwen/qwen3-next-80b-a3b-instruct qwen/qwen3-next-80b-a3b-instruct:free qwen/qwen3-next-80b-a3b-thinking
  *qwen/qwen3-vl-235b-a22b-instruct *qwen/qwen3-vl-235b-a22b-thinking *qwen/qwen3-vl-30b-a3b-instruct
  *qwen/qwen3-vl-30b-a3b-thinking *qwen/qwen3-vl-32b-instruct *qwen/qwen3-vl-8b-instruct
  *qwen/qwen3-vl-8b-thinking *qwen/qwen3.5-122b-a10b *qwen/qwen3.5-27b *qwen/qwen3.5-35b-a3b
  *qwen/qwen3.5-397b-a17b *qwen/qwen3.5-9b *qwen/qwen3.5-flash-02-23 *qwen/qwen3.5-plus-02-15
  *qwen/qwen3.5-plus-20260420 *qwen/qwen3.6-27b *qwen/qwen3.6-35b-a3b *qwen/qwen3.6-flash
  qwen/qwen3.6-max-preview *qwen/qwen3.6-plus qwen/qwen3.7-max *qwen/qwen3.7-plus *rekaai/reka-edge
  relace/relace-search *sakana/fugu-ultra sao10k/l3.1-euryale-70b stepfun/step-3.5-flash
  *stepfun/step-3.7-flash tencent/hy3-preview thedrummer/unslopnemo-12b upstage/solar-pro-3 *x-ai/grok-4.20
  *x-ai/grok-4.3 *x-ai/grok-build-0.1 *xiaomi/mimo-v2.5 xiaomi/mimo-v2.5-pro z-ai/glm-4.5 z-ai/glm-4.5-air
  *z-ai/glm-4.5v z-ai/glm-4.6 *z-ai/glm-4.6v z-ai/glm-4.7 z-ai/glm-4.7-flash z-ai/glm-5 z-ai/glm-5-turbo
  z-ai/glm-5.1 z-ai/glm-5.2 *z-ai/glm-5v-turbo
`;
  const fb = () => {
    const entries = SNAPSHOT.trim().split(/\s+/);
    const ids = entries.map((s) => s.replace(/^\*/, ""));
    const vision = new Set(entries.filter((s) => s[0] === "*").map((s) => s.slice(1)));
    return { ids: ids.sort(), vision };
  };
  const hasTools = (m) => Array.isArray(m.supported_parameters) && m.supported_parameters.includes("tools");
  const hasVision = (m) => Array.isArray(m.architecture && m.architecture.input_modalities) && m.architecture.input_modalities.includes("image");
  const fetched = window.fetch("https://openrouter.ai/api/v1/models")
    .then((r) => r.ok ? r.json() : Promise.reject(new Error("HTTP " + r.status)))
    .then((j) => {
      const models = (j.data || []).filter((m) => m && m.id);
      const toolOnly = models.filter(hasTools);
      const use = toolOnly.length ? toolOnly : models;
      return { ids: use.map((m) => m.id).sort(), vision: new Set(use.filter(hasVision).map((m) => m.id)) };
    })
    .catch(fb);
  // Fall back to the embedded snapshot if the live catalog has not resolved within 5s.
  const timed = new Promise((res) => window.setTimeout(() => res(fb()), 5000));
  return Promise.race([fetched, timed]);
};
// Demo mode: no personal key ⇒ route through the shared MiMo gateway (see _client). The gateway key
// permits only MiMo, so the picker (and thus the effective model) is constrained to MiMo ids.
const _demoMode = function _demoMode(OPENROUTER_API_KEY){ return !String(OPENROUTER_API_KEY || "").trim(); };
const _openrouter_models = function _openrouter_models(openrouter_catalog, demoMode){
  return demoMode ? ["xiaomi/mimo-v2.5-pro", "xiaomi/mimo-v2.5"] : openrouter_catalog.ids;
};
const _openrouter_vision = function _openrouter_vision(openrouter_catalog){ return openrouter_catalog.vision; };

const _model = function _model(Inputs, openrouter_models, openrouter_vision, localStorageView, demoMode){
  // Bind to the persisted choice, and ALWAYS keep that choice a selectable <option> — even when the live
  // catalog fetch timed out / returned the curated fallback that omits it. A model not in the option list
  // (e.g. xiaomi/mimo-v2.5-pro after an 8s catalog timeout) leaves the <select> value EMPTY, so chat()
  // sends an empty model → OpenRouter 400 "No models provided" (the first-turn race). Union fixes that.
  const stored = localStorageView("robocoop4_model", { defaultValue: "anthropic/claude-sonnet-4" });
  let sel = String(stored.value || "anthropic/claude-sonnet-4");
  // Demo mode reaches only MiMo (gateway guardrail); coerce any other stored choice, and DON'T union it in
  // (a stale sonnet choice would 404 through the gateway).
  if (demoMode && !openrouter_models.includes(sel)) sel = openrouter_models[0];
  const options = demoMode ? openrouter_models.slice() : Array.from(new Set([sel, ...openrouter_models]));
  return Inputs.bind(
    Inputs.select(options, {
      label: "model",
      value: sel,
      // value stays the clean id; only the displayed label warns when a model can't see images.
      format: (id) => openrouter_vision.has(id) ? id : id + "  ⚠ no vision (text only)"
    }),
    stored
  );
};

// Editable system prompt, seeded from the core's base prompt + footer.
const _rc4_systemPrompt = function _rc4_systemPrompt(Inputs, systemPrompt, composeFooter){
  const base = systemPrompt + "\n\n" + composeFooter({ workdir: "/src", model: "" });
  return Inputs.textarea({ label: "system prompt", rows: 4, value: base, width: "100%" });
};

// OpenRouter client. With a personal key, calls OpenRouter directly. With no key (DEMO MODE) it routes
// through the shared rate-limited gateway, which injects a key server-side and permits only MiMo — so the
// notebook works out-of-the-box with no signup. fetch defaults to the core's globalThis.fetch.
const _client = function _client(OPENROUTER_API_KEY, createOpenRouterClient){
  const key = String(OPENROUTER_API_KEY || "").trim();
  if (!key) return createOpenRouterClient({
    baseUrl: "https://openrouter-gateway.endpointservices.workers.dev/v1",
    referer: "https://lopecode.com",
    title: "robocoop-4"
  });
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
    maxStepsPerTurn: 40,
    // Reasoning models (e.g. xiaomi/mimo-v2.5) spend completion budget on reasoning; 8192 truncated mid-thought
    // (finish_reason 'length') BEFORE the tool call, and the loop stops on 'length' → the build silently died
    // after just exploring. Give enough headroom for reasoning + a full write_file tool call.
    maxTokens: 32000
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

  $def("rc4e_demoMode", "demoMode", ["OPENROUTER_API_KEY"], _demoMode);
  $def("rc4e_catalog", "openrouter_catalog", [], _openrouter_catalog);
  $def("rc4e_models", "openrouter_models", ["openrouter_catalog", "demoMode"], _openrouter_models);
  $def("rc4e_vision", "openrouter_vision", ["openrouter_catalog"], _openrouter_vision);
  $def("rc4e_model_view", "viewof model", ["Inputs", "openrouter_models", "openrouter_vision", "localStorageView", "demoMode"], _model);
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
