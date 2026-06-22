
const _d9uon = function _1(md){return(
md`# \`robocoop3\`: agents-as-functions

\`\`\`js
import {robocoop3} from "@tomlarkworthy/robocoop-3"
\`\`\``
)};
const _44imqp = function _agent1(robocoop3){return(
robocoop3({
  prompt: "Are you working?",
  systemPrompt: "Respond like a pirate",
  maxSteps: 1
})
)};
const _15hle7w = (G, _) => G.input(_);
const _ptqen6 = function _3(md){return(
md`Calling \`viewof agent = robocoop3({...})\` creates a prompting UI and an in-notebook agent whose responses are streamed to the value of \`agent\`. You can create many such agents at-once. The function is essentially the agentic loop expressed as a generator.`
)};
const _1u9wjf7 = function _4(agent1){return(
agent1
)};
const _asr0a9 = function _5(md){return(
md`## Features

- Multiple providers: OpenAI, Anthropic and Ollama (for local operation). There is a demo provider that will run \`gpt5-mini\` so you can try it out.
- Parallel tool calling
- Multi-turn dialogue.
- Test driven development.
- Operates on Observable's low level runtime representation directly, not Notebook 1.0 syntax (unlike Robocoop-2, which is still useful for high level coding assistance).
- Scriptable
- Also works in [Lopecode](https://observablehq.com/@tomlarkworthy/jumpgate?source=https://observablehq.com/@tomlarkworthy/robocoop-3&export_state=%7B%22hash%22%3A%22%23view%3D%40tomlarkworthy%2Frobocoop-3%22%2C%22headless%22%3Atrue%2C%22title%22%3A%22%40tomlarkworthy%2Frobocoop-3%22%7D&git_url=https%3A%2F%2Fgithub.com%2Ftomlarkworthy%2Flopebooks&load_source=true&commit=false)
`
)};
const _zqurm1 = function _6(md){return(
md`## TODO
- Struggles a bit with imports, I think we should support defining variables that reference other modules and lazily auto-import
- Include a screenshot of the DOM if its a DOM node or image?`
)};
const _2c6sxx = function _7(md){return(
md`## Builder Function`
)};
const _nwu = function _robocoop3(keepalive,robocoopPrototypeModule,globalRuntime,cloneDataflow,robocoop_template,Node,Event)
{
  keepalive(robocoopPrototypeModule, "toolRegistry_sync");
  keepalive(robocoopPrototypeModule, "test_cell_map_coverage");
  return ({
    prompt = undefined,
    maxSteps = undefined,
    runtime = globalRuntime,
    systemPrompt = undefined
  } = {}) => {
    const root = document.createElement("div");
    root.value = null;
    root.records = [];
    root.textContent = "Loading…";

    let dispose = null;
    let inner = null;
    let lastRecordsLen = 0;
    let lastFinishedSteps = 0;
    const noopObserver = () => ({});

    const countFinishedSteps = (convo) => {
      const steps = Array.isArray(convo?.steps) ? convo.steps : [];
      let n = 0;
      for (const s of steps)
        if (s?.stepFinish || Number.isFinite(s?.finishedAt)) n++;
      return n;
    };

    const start = () => {
      if (dispose) return;

      dispose = cloneDataflow(robocoop_template, (name) => {
        if (name === "viewof robocoopPrototype") {
          return {
            fulfilled: (el) => {
              if (!(el instanceof Node)) return;
              inner = el;
              root.replaceChildren(el);
            }
          };
        }

        if (name === "viewof agent_prompt") {
          return {
            fulfilled: (prompt_ui) => {
              prompt_ui.value = prompt;
            }
          };
        }

        if (name === "viewof agent_config") {
          return {
            fulfilled: (config_ui) => {
              if (!config_ui || typeof config_ui !== "object") return;
              const cur = config_ui.value || {};
              const next = { ...cur };
              if (maxSteps) next.maxSteps = maxSteps;
              if (systemPrompt) next.systemPrompt = String(systemPrompt);
              config_ui.value = next;
              config_ui.dispatchEvent(new Event("input", { bubbles: true }));
            }
          };
        }

        if (name === "viewof agent_runtime") {
          return {
            fulfilled: (m) => {
              if (runtime === undefined) return;
              m.value = runtime;
              m.dispatchEvent(new Event("input", { bubbles: true }));
            }
          };
        }

        if (name === "agent_conversation") {
          return {
            fulfilled: (val) => {
              root.value = val;
              const finished = countFinishedSteps(val);
              const stepsLen = Array.isArray(val?.steps) ? val.steps.length : 0;
              const emitOnStepComplete = finished > lastFinishedSteps;
              const emitOnClear = stepsLen === 0 && lastFinishedSteps > 0;
              if (emitOnStepComplete || emitOnClear) {
                lastFinishedSteps = finished;
                root.dispatchEvent(new Event("input", { bubbles: true }));
              }
            }
          };
        }

        if (name === "agent_records") {
          return {
            fulfilled: (recs) => {
              const arr = Array.isArray(recs) ? recs : [];
              if (arr.length < lastRecordsLen) lastRecordsLen = 0;
              root.records = arr;
              for (let i = lastRecordsLen; i < arr.length; i++) {
                root.dispatchEvent(
                  new CustomEvent("record", {
                    detail: arr[i],
                    bubbles: true
                  })
                );
              }
              lastRecordsLen = arr.length;
            }
          };
        }

        return noopObserver();
      });

      root.dispose = () => {
        try {
          inner = null;
          lastRecordsLen = 0;
          lastFinishedSteps = 0;
          dispose?.();
        } finally {
          dispose = null;
        }
      };
    };

    start();
    return root;
  };
};
const _15zxmxk = function _9(md){return(
md`## Prompt`
)};
const _1mcb7sx = function _system_prompt(){return(
`You are Robocoop3: an autonomous coding agent operating inside a shared Observable Runtime. You operate on low‑level runtime variables (Observable Runtime Variables), not notebook UI cells. The tools you use talk about and operate on variables.

Mission
- Implement the user’s requested change by editing notebook variables via the provided tools.
- Make all reachable tests pass (variables whose names start with test_*). Resolve “pending” tests when feasible; if a test requires interaction/time, explain why.
- Inspect the live runtime before answering anything. Never guess.

Hard gates (enforced)
- Do not answer a user question without first calling at least one inspection tool: list_modules, list_variables, search_variables, or eval. Use them to ground your answer in the current runtime.

Key Observable semantics (concise)
- A variable is a named reactive value defined as a function of its declared inputs; evaluation is topological: pending → fulfilled or rejected; rejection halts dependents.
- UI cells typically export two variables: "viewof x" (DOM node) and "x" (its value stream). Mutables export "initial x", "mutable x", and "x".
- Only reachable variables compute (visible or depended upon).
- Host is a browser: you can run JS, inspect DOM, trigger events, and fetch (CORS permitting). Prefer deterministic behavior.

Strict variable naming policy (important)
- Do not create anonymous variables unless the user explicitly asks. Every upsert must include a <name> for new variables.
- To be referenceable, variables must be named; anonymous variables cannot be listed as inputs.

Imports (low‑level two‑step pattern; must be named)
- Never use ES module import syntax inside a runtime variable definition.
- To import someSymbol from @owner/notebook into the current module, create two named variables:
  1) Loader (must be named exactly as referenced by dependents):
     - name: module @owner/notebook
     - definition: async () => runtime.module((await import("@owner/notebook")).default)
  2) Importer (must include the loader name and @variable in inputs):
     - inputs: module @owner/notebook, @variable
     - definition: (_, v) => v.import("someSymbol", _)
- Aliasing forms: v.import("original", "alias", _); view/mutable require exact strings, e.g. v.import("viewof x", _), v.import("mutable x", _).
- Inputs must match the loader’s exported name exactly; never try to depend on an anonymous loader.

Tooling (your interface)
- list_modules({}) → list all runtime modules.
- list_variables({module}) → list variables for a module as canonical <variable> XML (id, name, inputs, definition, value/state).
- search_variables({query, limit}) → search variables across all modules by name/definition/value.
- eval({code, module, variable_id_or_name}) → evaluate a JS expression; if code is a function, it receives the target’s value.
- upsert_variables({xml}) → bulk upsert canonical <variable> XML.
- delete_variable({name}) → delete by name/id (use sparingly; prefer edits).
- run_tests({filter:""}) → run reachable test_* variables and report pass/fail/pending.
- If you intend to upsert into a module that doesn’t exist, first create it (create_module) or ask the user; never upsert to a non‑existent module.

Operational workflow
1) Clarify the goal. If ambiguous, ask one targeted question.
2) Choose the target module:
   - Never assume a module named "main" exists.
   - Use list_modules to discover; if the user names a module, locate it exactly.
   - Only create a new module if explicitly asked or if it is the smallest safe change; otherwise edit an existing module.
3) Inspect first (mandatory):
   - Use search_variables/list_variables/eval to understand code and state. Include at least one of these before answering.
4) Plan minimal, safe changes: preserve existing behavior; avoid blocking loops and heavy DOM work.
5) Implement with upsert_variables:
   - Always fetch existing variables first and preserve <id> when editing to avoid duplicates.
   - Include <name> for all new variables (no anonymous upserts unless explicitly required).
   - Ensure importer inputs reference the exact loader name (e.g., module @owner/notebook) and @variable.
   - If you must change an interface, update all dependents and related tests.
6) Verify immediately after each upsert:
   - list_variables for affected modules; confirm names, inputs, and states are correct.
   - For imports, eval by variable name and explain if pending (e.g., loader still resolving).
   - If duplicates or anonymous variables were created accidentally, delete or rename to a single canonical pair (loader + importer).
7) Test loop: run_tests repeatedly until all reachable tests pass, or classify why tests remain pending (reachability, never‑resolving async/generator, dependency failure).
8) Reachability/pending triage checklist:
   - Is the variable reachable? If not, make it reachable only if that aligns with intent.
   - Identify which dependency is pending/rejected; report that chain succinctly.
   - Remember: imports are lazy; loaders may be pending while network/module resolves.
9) Reporting (succinct with evidence):
   - What changed and why.
   - Exactly which variables (module, name, id) were added/edited/deleted.
   - Evidence: key list_variables excerpts and any eval checks; latest run_tests summary with pending classification.

Quality & safety rules
- Prefer deterministic behavior; avoid hidden globals and flaky timing.
- Keep UI responsive; avoid long blocking loops and excessive DOM churn.
- Safety with eval/fetch:
  • Do not exfiltrate secrets (API keys, localStorage).
  • Prefer official docs and deterministic sources; cache where appropriate.
- If user instructs “don’t change anything”, switch to inspection‑only mode: use list_*/search/eval/run_tests but do not upsert/delete/create.
- Failure handling:
  • If a tool returns a validation error, adjust and retry.
  • If the module is not found, call list_modules, then ask or create appropriately.
  • If a referenced variable can’t be found, use search/list to locate it (names may differ or be aliased).

Golden template (for “How can I programmatically read the values of cells?”)
- Call list_modules({}) and identify the working module.
- Call list_variables({module}) to ground the response.
- search_variables({query: "observe"}) to check for an existing import.
- If missing, add the two‑step import for @tomlarkworthy/runtime-sdk → observe.
- Demonstrate using observe to read a value (and optionally subscribe to updates).
- Optionally mention external embedding via @observablehq/runtime’s module.value(name) as a secondary path.
`
)};
const _jjm5vh = function _11(md){return(
md`## TDD`
)};
const _1s6xri5 = function _test_cell_map_coverage(expect,coverage_failures)
{
  expect(coverage_failures).toEqual([]);
  return "all variables can be decompiled into higher level cells";
};
const _19qjyyf = function _13(md){return(
md`## Templating

The template extracts a prototype into a reusable component`
)};
const _40kz45 = async function _robocoop_template(lookupVariable,robocoopPrototypeModule)
{
  const names = [
    "viewof robocoopPrototype",
    "robocoopPrototype",
    "robocoopPrototype_record_stream",
    "viewof agent_ui_attached",
    "agent_ui_attached",
    "viewof agent_prompt",
    "agent_prompt",
    "agent_run_effect",
    "viewof agent_cancel",
    "agent_cancel",
    "agent_cancel_effect",
    "viewof agent_clear",
    "agent_clear",
    "agent_clear_effect",
    "agent_conversation_view_holder",
    "agent_conversation_view",
    "agent_conversation_dom_sync",
    "initial agent_records",
    "mutable agent_records",
    "agent_records",
    "mutable agent_run_history",
    "agent_run_history",
    "appendAgentRecord",
    "agentConversationFromRecords",
    "agent_conversation",
    "open_ai_models",
    "anthropic_models",
    "viewof provider_choice",
    "provider_choice",
    "viewof OPENAI_API_KEY",
    "OPENAI_API_KEY",
    "viewof provider_openai_config",
    "provider_openai_config",
    "viewof ANTHROPIC_API_KEY",
    "ANTHROPIC_API_KEY",
    "viewof provider_anthropic_config",
    "provider_anthropic_config",
    "viewof provider_ollama_config",
    "provider_ollama_config",
    "viewof agent_config",
    "agent_config",
    "agent_target_module",
    "agent_system_prompt",
    "system_prompt",
    "viewof agent_runtime",
    "agent_runtime",
    "agent_loop",
    "normalizeUsage",
    "agent_run",
    "agent_reply",
    "agent_stop"
  ];
  const vars = await lookupVariable(names, robocoopPrototypeModule);
  let err = null;
  if ((err = vars.findIndex((v) => v === undefined)) + 1) {
    throw new Error(`robocoop_template: missing ${names[err]}`);
  }
  return vars;
};
const _1bwnjz6 = function _16(currentModules){return(
currentModules
)};
const _6zal67 = function _17(md){return(
md`## UI`
)};
const _1hudkog = function _robocoopPrototype(reversibleAttach,agent_ui_attached,$0,$1,$2,agent_conversation_view_holder,provider_choice,$3,$4,$5,$6,$7,$8,$9,tabbedPane)
{
  const root = document.createElement("div");
  root.value = null;
  root.records = [];
  root.style.display = "grid";
  root.style.gap = "12px";
  root.style.fontFamily =
    "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif";

  const panel = (label, nodes) => {
    const wrap = document.createElement("div");
    wrap.style.border = "1px solid #e5e5e5";
    wrap.style.borderRadius = "10px";
    wrap.style.padding = "10px";
    wrap.style.display = "grid";
    wrap.style.gap = "8px";
    const head = document.createElement("div");
    if (head) {
      head.textContent = label;
      head.style.fontWeight = "600";
      head.style.color = "#333";
      wrap.appendChild(head);
    }
    for (const n of nodes) if (n) wrap.appendChild(n);
    return wrap;
  };

  const buttonRow = (nodes) => {
    const row = document.createElement("div");
    row.style.display = "flex";
    row.style.gap = "8px";
    row.style.flexWrap = "wrap";
    row.style.alignItems = "center";
    for (const n of nodes) if (n) row.appendChild(n);
    return row;
  };

  const runPanel = document.createElement("div");
  runPanel.style.display = "grid";
  runPanel.style.gap = "12px";
  runPanel.appendChild(
    panel(undefined, [
      reversibleAttach(!agent_ui_attached, $0),
      buttonRow([
        reversibleAttach(!agent_ui_attached, $1),
        reversibleAttach(!agent_ui_attached, $2)
      ]),
      reversibleAttach(!agent_ui_attached, agent_conversation_view_holder)
    ])
  );

  const providerNotes = (() => {
    const n = document.createElement("div");
    n.style.fontSize = "12px";
    n.style.color = "#444";
    if (provider_choice === "demo") {
      n.textContent =
        'Demo provider uses the OpenAI proxy endpoint (no authentication) and forces model "gpt-5-mini".';
    } else if (provider_choice === "openai") {
      n.textContent =
        "OpenAI provider uses the Responses API with your OPENAI_API_KEY.";
    } else if (provider_choice === "anthropic") {
      n.textContent =
        "Anthropic provider uses the Messages API with your ANTHROPIC_API_KEY.";
    } else if (provider_choice === "ollama") {
      n.textContent =
        "Ollama provider uses an OpenAI-compatible Chat Completions endpoint.";
    } else {
      n.textContent = "";
    }
    return n;
  })();

  const showOpenAIAuth = provider_choice === "openai";
  const showOpenAIConfig = provider_choice === "openai";

  const providerPanel = panel("Provider", [
    reversibleAttach(!agent_ui_attached, $3),
    providerNotes,
    showOpenAIAuth
      ? reversibleAttach(!agent_ui_attached, $4)
      : null,
    showOpenAIConfig
      ? reversibleAttach(!agent_ui_attached, $5)
      : null,
    reversibleAttach(!agent_ui_attached, $6),
    reversibleAttach(!agent_ui_attached, $7),
    reversibleAttach(!agent_ui_attached, $8)
  ]);

  const agentConfigPanel = panel("Agent config", [
    reversibleAttach(!agent_ui_attached, $9)
  ]);

  root.appendChild(
    tabbedPane({
      Prompt: runPanel,
      "Agent config": agentConfigPanel,
      Provider: providerPanel
    })
  );

  return root;
};
const _1ksl7rz = (G, _) => G.input(_);
const _10yp4ck = function _agent_ui_attached(Inputs){return(
Inputs.toggle({
  label: "decompose (detach sub-views)?",
  value: false
})
)};
const _1bv69gv = (G, _) => G.input(_);
const _k57m4b = function _20(md){return(
md`### agent`
)};
const _ye4mf2 = function _agent_prompt(Inputs){return(
Inputs.textarea({
  width: "100%",
  rows: 10,
  submit: true,
  minlength: 1,
  placeholder:
    "Describe the change you want. The loop will run tests and feed failures back until they pass (or maxSteps)."
})
)};
const _12sswg8 = (G, _) => G.input(_);
const _13gul30 = function _agent_run_effect(agent_prompt,agent_run){return(
(async () => {
  if (!agent_prompt || !String(agent_prompt).trim()) return this || 0;
  await agent_run({ prompt: agent_prompt, reset: false });
  return (this || 0) + 1;
})()
)};
const _15ymwb0 = function _agent_cancel_effect(agent_cancel,agent_loop){return(
agent_cancel && (agent_loop.cancel(), agent_cancel)
)};
const _8se49j = function _agent_cancel(Inputs){return(
Inputs.button("Cancel", { value: 0, reduce: v => v + 1 })
)};
const _1x0jouc = (G, _) => G.input(_);
const _uma9in = function _agent_clear(Inputs){return(
Inputs.button("Clear", { value: 0, reduce: (v) => v + 1 })
)};
const _1k6ne31 = (G, _) => G.input(_);
const _1t399yr = function _agent_clear_effect(agent_clear,agent_loop,$0,$1){return(
agent_clear &&
  (() => {
    try {
      agent_loop?.cancel?.();
    } catch {}
    try {
      agent_loop?.reset?.();
    } catch {}
    $0.value = [];
    $1.value = [];
    return agent_clear;
  })()
)};
const _vuyf8q = function _27(md){return(
md`### execution state`
)};
const _uwazgz = function _agent_runtime(Inputs,globalRuntime){return(
Inputs.input(globalRuntime)
)};
const _1ii7jms = (G, _) => G.input(_);
const _1x1wwbn = function _robocoopPrototype_record_stream(agent_records){return(
(() => {
  const records = Array.isArray(agent_records) ? agent_records : [];
  const prev = this && typeof this === "object" ? this : null;
  const prevLen = prev && Number.isFinite(prev.len) ? prev.len : 0;
  return { len: records.length, delta: records.length - prevLen };
})()
)};
const _siy9ji = function _agent_records(){return(
[]
)};
const _1kjerjw = (M, _) => new M(_);
const _whxah1 = _ => _.generator;
const _5hhwzi = function _appendAgentRecord(){return(
(records, rec, now = Date.now()) => {
  const arr = Array.isArray(records) ? records : [];
  const r = { time: now, ...(rec ?? {}) };
  const last = arr.length ? arr[arr.length - 1] : null;

  if (last && last.type === r.type) {
    if (r.type === "text") {
      last.chunk = String(last.chunk ?? "") + String(r.chunk ?? "");
      last.time = r.time;
      return arr;
    }
    if (
      r.type === "tool_use_delta" &&
      String(last.id ?? "") === String(r.id ?? "")
    ) {
      last.chunk = String(last.chunk ?? "") + String(r.chunk ?? "");
      last.time = r.time;
      return arr;
    }
  }

  arr.push(r);
  return arr;
}
)};
const _86st4i = function _agent_run_history(){return(
[]
)};
const _1se6tds = (M, _) => new M(_);
const _19z4j7p = _ => _.generator;
const _1y32ocm = function _agentConversationFromRecords(){return(
(records = []) => {
  const steps = [];
  let current = null;

  const ensureStep = (step) => {
    if (!current || current.step !== step) {
      current = {
        step,
        startedAt: null,
        finishedAt: null,
        text: "",
        tools: new Map(),
        tests: [],
        stepFinish: null,
        assistantFinish: null,
        events: []
      };
      steps.push(current);
    }
    return current;
  };

  const byTime = [...(Array.isArray(records) ? records : [])].sort(
    (a, b) => (a?.time ?? 0) - (b?.time ?? 0)
  );

  for (const r of byTime) {
    if (!r || typeof r !== "object") continue;
    const t = r.type;

    if (t === "step_start") {
      const s = ensureStep(Number.isFinite(r.step) ? r.step : steps.length);
      s.startedAt = r.time ?? s.startedAt;
      s.events.push(r);
      continue;
    }

    const targetStep =
      current ??
      ensureStep(
        Number.isFinite(r.step)
          ? r.step
          : Number.isFinite(r?.info?.step)
          ? r.info.step
          : steps.length
      );

    if (t === "text") {
      targetStep.text += String(r.chunk ?? "");
      targetStep.events.push(r);
      continue;
    }

    if (t === "tool_use") {
      const id = String(r.id ?? "");
      const name = String(r.name ?? "");
      if (!targetStep.tools.has(id)) {
        targetStep.tools.set(id, { id, name, argsRaw: "", result: null });
      } else {
        const existing = targetStep.tools.get(id);
        targetStep.tools.set(id, { ...existing, name: existing.name || name });
      }
      targetStep.events.push(r);
      continue;
    }

    if (t === "tool_use_delta") {
      const id = String(r.id ?? "");
      const chunk = String(r.chunk ?? "");
      const existing = targetStep.tools.get(id) ?? {
        id,
        name: "",
        argsRaw: "",
        result: null
      };
      existing.argsRaw = (existing.argsRaw ?? "") + chunk;
      targetStep.tools.set(id, existing);
      targetStep.events.push(r);
      continue;
    }

    if (t === "tool_result") {
      const id = String(r.id ?? "");
      const existing = targetStep.tools.get(id) ?? {
        id,
        name: String(r.name ?? ""),
        argsRaw: "",
        result: null
      };
      existing.name = existing.name || String(r.name ?? "");
      existing.result = {
        title: String(r.title ?? ""),
        output: String(r.output ?? ""),
        metadata: r.metadata ?? null
      };
      targetStep.tools.set(id, existing);
      targetStep.events.push(r);
      continue;
    }

    if (t === "tests") {
      targetStep.tests.push({
        title: String(r.title ?? ""),
        output: String(r.output ?? ""),
        metadata: r.metadata ?? null
      });
      targetStep.events.push(r);
      continue;
    }

    if (t === "assistant_finish") {
      targetStep.assistantFinish = {
        responseId: r.responseId ?? null,
        finishReason: r.finishReason ?? null,
        usage: r.usage ?? null,
        usage_raw: r.usage_raw ?? null
      };
      targetStep.events.push(r);
      continue;
    }

    if (t === "step_finish") {
      targetStep.stepFinish = r.info ?? null;
      targetStep.finishedAt = r.time ?? targetStep.finishedAt;
      targetStep.events.push(r);
      continue;
    }

    targetStep.events.push(r);
  }

  return {
    steps: steps.map((s) => ({
      ...s,
      tools: [...s.tools.values()]
    }))
  };
}
)};
const _1wz9dgr = function _agent_conversation(agent_records,agentConversationFromRecords,agent_run_history,agent_reply,agent_stop){return(
(() => {
  const recs = Array.isArray(agent_records) ? agent_records : [];
  const convo = agentConversationFromRecords(recs);
  const latestRun =
    Array.isArray(agent_run_history) && agent_run_history.length
      ? agent_run_history[0]
      : null;
  const run = latestRun
    ? {
        id: latestRun.id ?? null,
        provider: latestRun.provider ?? null,
        startedAt: latestRun.startedAt ?? null,
        endedAt: latestRun.endedAt ?? null,
        tokens: latestRun.tokens ?? null,
        prompt: latestRun.prompt ?? null,
        reply: agent_reply,
        stop: agent_stop
      }
    : {
        id: null,
        provider: null,
        startedAt: null,
        endedAt: null,
        tokens: null,
        prompt: null,
        reply: agent_reply,
        stop: agent_stop
      };
  return { ...convo, run };
})()
)};
const _1jqhc1q = function _css(htl){return(
htl.html`<style>
.rc-convo {
  font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
  display: grid;
  gap: 10px;
}
.rc-runbar {
  border: 1px solid #e5e5e5;
  border-radius: 10px;
  padding: 10px;
  background: #fafafa;
  display: grid;
  gap: 6px;
}
.rc-runbar .title {
  font-weight: 700;
  font-size: 13px;
  color: #111;
  display: flex;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}
.rc-runbar .meta {
  font-size: 12px;
  color: #444;
  display: grid;
  gap: 2px;
}
.rc-step {
  border: 1px solid #e5e5e5;
  border-radius: 10px;
  overflow: hidden;
  background: white;
}
.rc-step .head {
  padding: 10px;
  background: #f6f7f9;
  display: grid;
  gap: 4px;
}
.rc-step .head .row1 {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
  align-items: baseline;
}
.rc-step .head .row1 .label {
  font-weight: 700;
  font-size: 13px;
  color: #111;
}
.rc-step .head .row1 .right {
  font-size: 12px;
  color: #333;
}
.rc-step .head .row2 {
  font-size: 12px;
  color: #444;
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}
.rc-step .body {
  padding: 10px;
  display: grid;
  gap: 10px;
}
.rc-pre {
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 12px;
  line-height: 1.4;
  background: #0b1020;
  color: #e9eefc;
  padding: 10px;
  border-radius: 8px;
  margin: 0;
}
.rc-section {
  display: grid;
  gap: 6px;
}
.rc-section .stitle {
  font-weight: 700;
  font-size: 12px;
  color: #111;
}
.rc-tools details, .rc-tests details {
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  padding: 8px 10px;
  background: #fff;
}
.rc-tools summary, .rc-tests summary {
  cursor: pointer;
  font-size: 12px;
  color: #111;
}
.rc-kv {
  font-size: 12px;
  color: #333;
  display: grid;
  gap: 4px;
}
.rc-code {
  white-space: pre-wrap;
  word-break: break-word;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 11px;
  line-height: 1.35;
  background: #f7f7f8;
  padding: 8px;
  border-radius: 8px;
  margin: 0;
  border: 1px solid #ededed;
}
.rc-empty {
  border: 1px dashed #d0d0d0;
  border-radius: 10px;
  padding: 14px;
  color: #444;
  font-size: 12px;
  background: #fafafa;
}
</style>`
)};
const _16mud80 = function _agent_conversation_dom_sync(agent_conversation_view_holder,agent_conversation_view)
{
  agent_conversation_view_holder.innerHTML = "";
  agent_conversation_view_holder.appendChild(agent_conversation_view);
};
const _4fqtvp = function _agent_conversation_view_holder(html){return(
html`<div></div>`
)};
const _1rd5yya = function _agent_conversation_view(agent_conversation,htl,css){return(
(() => {
  const convo = agent_conversation ?? { steps: [], run: null };
  const stepsRaw = Array.isArray(convo.steps) ? convo.steps : [];
  const steps = [...stepsRaw].sort((a, b) => {
    const sa = Number.isFinite(a?.step) ? a.step : -Infinity;
    const sb = Number.isFinite(b?.step) ? b.step : -Infinity;
    if (sb !== sa) return sb - sa;
    const ta = Number.isFinite(a?.startedAt) ? a.startedAt : 0;
    const tb = Number.isFinite(b?.startedAt) ? b.startedAt : 0;
    return tb - ta;
  });

  const fmtTime = (ms) =>
    Number.isFinite(ms) ? new Date(ms).toLocaleString() : "";
  const fmtDur = (a, b) => {
    if (!Number.isFinite(a) || !Number.isFinite(b)) return "";
    const s = Math.max(0, Math.round((b - a) / 1000));
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}m ${r}s`;
  };

  const fmtTokens = (u) => {
    if (!u || typeof u !== "object") return "";
    const input = Number(u.input ?? 0);
    const output = Number(u.output ?? 0);
    const reasoning = Number(u.reasoning ?? 0);
    const cacheRead = Number(u.cache?.read ?? 0);
    const cacheWrite = Number(u.cache?.write ?? 0);
    const total = Number(u.total ?? input + output);
    return `tokens: total ${total} (in ${input}, out ${output}${
      reasoning ? `, reasoning ${reasoning}` : ""
    }${cacheRead || cacheWrite ? `, cache r${cacheRead}/w${cacheWrite}` : ""})`;
  };

  const parseMaybeJSON = (s) => {
    const str = String(s ?? "").trim();
    if (!str) return null;
    try {
      return JSON.parse(str);
    } catch {
      return null;
    }
  };

  const run = convo.run;
  const runBar = htl.html`<div class="rc-runbar">
    <div class="title">
      <div>Conversation</div>
      <div>${run ? String(run.provider ?? "") : ""}</div>
    </div>
    <div class="meta">
      <div>${run?.startedAt ? `started: ${fmtTime(run.startedAt)}` : ""}${
    run?.endedAt ? ` • ended: ${fmtTime(run.endedAt)}` : ""
  }${
    run?.startedAt && run?.endedAt
      ? ` • duration: ${fmtDur(run.startedAt, run.endedAt)}`
      : ""
  }</div>
      <div>${run?.tokens ? fmtTokens(run.tokens) : ""}</div>
    </div>
  </div>`;

  const stepViews = steps.map((s) => {
    const usage = s?.assistantFinish?.usage ?? null;
    const finishReason =
      s?.assistantFinish?.finishReason ?? s?.stepFinish?.reason ?? null;
    const tokenLine = fmtTokens(usage);
    const duration = fmtDur(s.startedAt, s.finishedAt);

    const tools = Array.isArray(s.tools) ? s.tools : [];
    const toolViews =
      tools.length === 0
        ? null
        : htl.html`<div class="rc-section rc-tools">
            <div class="stitle">Tools (${tools.length})</div>
            ${tools.map((t) => {
              const argsParsed = parseMaybeJSON(t.argsRaw);
              const argsBlock = argsParsed
                ? JSON.stringify(argsParsed, null, 2)
                : String(t.argsRaw ?? "").trim();
              const outBlock = t.result?.output ?? "";
              const status = t.result?.metadata?.error
                ? "error"
                : t.result
                ? "ok"
                : "pending";
              const title = t.result?.title ? ` • ${t.result.title}` : "";
              return htl.html`<details>
                <summary>${String(
                  t.name ?? "tool"
                )} (${status})${title}</summary>
                <div class="rc-kv">
                  <div><b>callId</b>: ${String(t.id ?? "")}</div>
                  <div><b>args</b>:</div>
                  <pre class="rc-code">${argsBlock || "(none)"}</pre>
                  <div><b>output</b>:</div>
                  <pre class="rc-code">${String(outBlock || "(none)")}</pre>
                </div>
              </details>`;
            })}
          </div>`;

    const tests = Array.isArray(s.tests) ? s.tests : [];
    const testViews =
      tests.length === 0
        ? null
        : htl.html`<div class="rc-section rc-tests">
            <div class="stitle">Tests (${tests.length})</div>
            ${tests.map((t, i) => {
              const title = t.title || `tests ${i + 1}`;
              return htl.html`<details>
                <summary>${title}</summary>
                <pre class="rc-code">${String(t.output ?? "")}</pre>
              </details>`;
            })}
          </div>`;

    const text = String(s.text ?? "").trim();
    return htl.html`<div class="rc-step">
      <div class="head">
        <div class="row1">
          <div class="label">Step ${Number.isFinite(s.step) ? s.step : ""}${
      finishReason ? ` • ${finishReason}` : ""
    }</div>
          <div class="right">${duration ? `duration ${duration}` : ""}</div>
        </div>
        <div class="row2">
          <div>${tokenLine}</div>
          <div>${
            s?.assistantFinish?.responseId
              ? `responseId: ${String(s.assistantFinish.responseId)}`
              : ""
          }</div>
        </div>
      </div>
      <div class="body">
        ${
          text
            ? htl.html`<pre class="rc-pre">${text}</pre>`
            : htl.html`<div class="rc-empty">No assistant text yet for this step (streaming or tool-only step).</div>`
        }
        ${toolViews}
        ${testViews}
      </div>
    </div>`;
  });

  return htl.html`<div class="rc-convo">
    ${css}
    ${runBar}
    ${
      steps.length
        ? stepViews
        : htl.html`<div class="rc-empty">No records yet. Ask something.</div>`
    }
  </div>`;
})()
)};
const _1nri9eq = function _39(md){return(
md`### models`
)};
const _1k620hr = function _open_ai_models(){return(
["gpt-5.2", "gpt-5.1", "gpt-5", "gpt-5-mini", "gpt-5-nano"]
)};
const _1ot5a8w = function _anthropic_models(){return(
["claude-opus-4-5", "claude-haiku-4-5", "claude-sonnet-4-5"]
)};
const _168tpk = function _42(md){return(
md`### providers`
)};
const _1yjgsol = function _provider_choice(Inputs,localStorageView){return(
Inputs.bind(
  Inputs.select(
    new Map([
      ["Demo (OpenAI proxy, no auth)", "demo"],
      ["OpenAI (Responses API)", "openai"],
      ["Anthropic (Messages API)", "anthropic"],
      ["Ollama (OpenAI-compatible Chat Completions)", "ollama"]
    ]),
    { label: "provider", value: "openai" }
  ),
  localStorageView("provider_choice", { defaultValue: "demo" })
)
)};
const _1602t8v = (G, _) => G.input(_);
const _ueb3sx = function _OPENAI_API_KEY(Inputs,localStorageView){return(
Inputs.bind(
  Inputs.password({
    width: "100%",
    label: "OPENAI_API_KEY",
    placeholder: "paste openAI key here"
  }),
  localStorageView("OPENAI_API_KEY")
)
)};
const _13dv669 = (G, _) => G.input(_);
const _640etn = function _ANTHROPIC_API_KEY(Inputs,localStorageView){return(
Inputs.bind(
  Inputs.password({
    width: "100%",
    label: "ANTHROPIC_API_KEY",
    placeholder: "paste openAI key here"
  }),
  localStorageView("ANTHROPIC_API_KEY")
)
)};
const _1d0e65t = (G, _) => G.input(_);
const _bidkyf = function _46(md){return(
md`#### OpenAI`
)};
const _1c9o4q7 = function _provider_openai_config(Inputs,open_ai_models,localStorageView){return(
Inputs.bind(
  Inputs.form({
    modelId: Inputs.select(open_ai_models, {
      label: "model",
      width: "100%",
      value: "gpt-5-mini"
    }),
    baseUrl: Inputs.text({
      label: "baseUrl",
      width: "100%",
      value: "https://api.openai.com/v1"
    }),
    max_output_tokens: Inputs.number({
      label: "max_output_tokens",
      min: 128,
      max: 8192,
      step: 128,
      value: 2048
    })
  }),
  localStorageView("provider_openai_config", {
    json: true,
    defaultValue: {
      modelId: "gpt-5-mini",
      baseUrl: "https://api.openai.com/v1",
      max_output_tokens: 2048
    }
  })
)
)};
const _10fi4vv = (G, _) => G.input(_);
const _1ybrwry = function _openaiProvider(){return(
({ apiKey, baseUrl = "https://api.openai.com/v1" } = {}) => ({
  id: "openai",
  baseUrl,
  headers: () => {
    const h = { "Content-Type": "application/json" };
    const key = String(apiKey ?? "").trim();
    if (key) h.Authorization = `Bearer ${key}`;
    return h;
  },
  responsesEndpoint: `${baseUrl}/responses`
})
)};
const _1d53m35 = function _streamOpenAIChatCompletionsBlocks(parseSSEStream){return(
async ({
  provider,
  model,
  messages,
  tools,
  callbacks = {},
  signal,
  settings = {}
} = {}) => {
  const body = {
    model,
    messages,
    stream: true,
    ...settings
  };

  if (tools && tools.length) body.tools = tools;
  if (!("tool_choice" in body)) body.tool_choice = "auto";

  const response = await fetch(provider.chatCompletionsEndpoint, {
    method: "POST",
    headers: provider.headers(),
    body: JSON.stringify(body),
    signal
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    const e = new Error(
      `Chat Completions API error: ${response.status} - ${errorText}`
    );
    callbacks.onError?.(e);
    throw e;
  }

  let currentText = "";
  let finishReason = null;
  let usage = null;

  const callIdTo = new Map();
  const callOrder = [];
  const ensureCall = (id) => {
    const key = String(id ?? "");
    if (!key) return null;
    if (!callIdTo.has(key)) {
      callIdTo.set(key, { id: key, name: "", args: "" });
      callOrder.push(key);
    }
    return callIdTo.get(key);
  };

  await parseSSEStream(
    response.body,
    (event) => {
      if (!event || typeof event !== "object") return;

      if (event.usage && typeof event.usage === "object") usage = event.usage;

      const choice = Array.isArray(event.choices) ? event.choices[0] : null;
      if (!choice) return;

      if (choice.finish_reason) finishReason = choice.finish_reason;

      const delta = choice.delta ?? {};
      if (typeof delta.content === "string" && delta.content) {
        currentText += delta.content;
        callbacks.onText?.(delta.content);
      }

      const toolCalls = Array.isArray(delta.tool_calls) ? delta.tool_calls : [];
      for (const tc of toolCalls) {
        const id = tc?.id ?? tc?.tool_call_id ?? "";
        const entry = ensureCall(id);
        if (!entry) continue;

        const name = tc?.function?.name ?? tc?.name ?? "";
        const argDelta =
          tc?.function?.arguments ??
          tc?.arguments ??
          tc?.delta?.arguments ??
          "";

        const firstName = !entry.name && name;
        if (firstName) {
          entry.name = String(name);
          callbacks.onToolCall?.(entry.id, entry.name);
        }

        if (argDelta) {
          entry.args += String(argDelta);
          callbacks.onToolCallDelta?.(entry.id, String(argDelta));
        }
      }
    },
    signal
  );

  const toolUses = callOrder
    .map((id) => callIdTo.get(id))
    .filter(Boolean)
    .map((c) => {
      let parsed = {};
      try {
        parsed = c.args ? JSON.parse(c.args) : {};
      } catch {
        parsed = {};
      }
      return {
        type: "tool_use",
        id: c.id,
        name: c.name,
        input: parsed,
        argsRaw: c.args
      };
    });

  const blocks = [];
  if (currentText) blocks.push({ type: "text", text: currentText });
  for (const tu of toolUses) blocks.push(tu);

  callbacks.onFinish?.({
    responseId: null,
    finishReason: finishReason ?? "unknown",
    usage,
    blocks
  });

  return {
    responseId: null,
    finishReason: finishReason ?? "unknown",
    usage,
    blocks,
    raw: null
  };
}
)};
const _1p39qqk = function _createOpenAIOpencodeLoop(openaiProvider,AbortController,streamOpenAIResponseBlocks,createToolContext){return(
({
  apiKey,
  modelId,
  systemPrompt,
  registry,
  tools: toolsOverride = null,
  settings = {},
  maxSteps = 100,
  autoRunTests = true,
  testFilter = "",
  baseUrl = "https://api.openai.com/v1",
  runtime
} = {}) => {
  if (!registry)
    throw new Error("createOpenAIOpencodeLoop requires {registry}");
  const provider = openaiProvider({ apiKey, baseUrl });

  const normalizeToOpenAITools = (rawTools) => {
    const arr = Array.isArray(rawTools) ? rawTools : [];
    const looksAlreadyFormatted = (t) =>
      t &&
      typeof t === "object" &&
      (t.type === "function" || t.type === "custom") &&
      typeof t.name === "string";
    if (arr.length && looksAlreadyFormatted(arr[0])) return arr;
    return arr.map((t) => {
      if (t?.openai?.type === "custom") {
        return { type: "custom", name: t.id, description: t.description };
      }
      return {
        type: "function",
        name: t.id,
        description: t.description,
        parameters: t.parameters,
        strict: true
      };
    });
  };

  const getTools = () => {
    const raw =
      typeof toolsOverride === "function"
        ? toolsOverride()
        : toolsOverride != null
        ? toolsOverride
        : registry.all();
    return normalizeToOpenAITools(raw);
  };

  let abortController = null;
  let running = false;
  let state = { previous_response_id: null, lastResponse: null };

  const cancel = () => abortController?.abort();
  const reset = () => {
    state = { previous_response_id: null, lastResponse: null };
  };

  const systemRoleForModel = (mid) =>
    String(mid ?? "").startsWith("o1") ? "user" : "system";
  const textMessageItem = (text, role) => ({
    type: "message",
    role,
    content: [{ type: "input_text", text: String(text ?? "") }]
  });

  const run = async (userPrompt, callbacks = {}) => {
    if (running) throw new Error("Loop is already running");
    running = true;
    abortController = new AbortController();

    try {
      let previous_response_id = state?.previous_response_id ?? null;
      const sysRole = systemRoleForModel(modelId);
      let nextInput = [
        ...(systemPrompt ? [textMessageItem(systemPrompt, sysRole)] : []),
        textMessageItem(userPrompt, "user")
      ];

      for (let step = 0; step < maxSteps; step++) {
        if (abortController.signal.aborted) break;

        callbacks.onStepStart?.(step, { previous_response_id });

        const streamed = await streamOpenAIResponseBlocks({
          provider,
          model: modelId,
          input: nextInput,
          instructions: null,
          tools: getTools(),
          previous_response_id,
          signal: abortController.signal,
          settings,
          callbacks: {
            onText: (chunk) => callbacks.onText?.(chunk),
            onToolCall: (id, name) => callbacks.onToolCall?.(id, name),
            onToolCallDelta: (id, chunk) =>
              callbacks.onToolCallDelta?.(id, chunk),
            onError: (e) => callbacks.onError?.(e),
            onFinish: (info) => callbacks.onAssistantFinish?.(info)
          }
        });

        previous_response_id = streamed.responseId ?? previous_response_id;
        state = { previous_response_id, lastResponse: streamed };

        const toolUses = streamed.blocks.filter((b) => b.type === "tool_use");
        if (toolUses.length > 0) {
          const results = [];
          for (const tu of toolUses) {
            const ctx = await createToolContext({
              sessionId: "opencode",
              messageId: "opencode",
              agent: "assistant",
              callId: tu.id,
              abort: abortController.signal,
              runtime
            });
            const args =
              typeof tu.input === "string"
                ? { input: tu.input }
                : tu.input ?? {};
            const result = await registry.execute(tu.name, args, ctx);
            results.push({ call_id: tu.id, name: tu.name, result });
            callbacks.onToolFinish?.(tu.id, tu.name, result);
          }

          nextInput = results.map((r) => ({
            type: "function_call_output",
            call_id: r.call_id,
            output: r.result.output
          }));

          callbacks.onStepFinish?.(step, {
            reason: "tool_outputs_sent",
            previous_response_id
          });
          continue;
        }

        if (autoRunTests) {
          const testCtx = await createToolContext({
            sessionId: "opencode",
            messageId: "opencode",
            agent: "assistant",
            callId: `run_tests_${step}`,
            abort: abortController.signal,
            runtime
          });
          const testResult = await registry.execute(
            "run_tests",
            { filter: String(testFilter ?? "") },
            testCtx
          );
          callbacks.onTests?.(testResult);

          const failed = Number(testResult.metadata?.failed ?? 0);
          if (failed > 0) {
            const msg = [
              "Tests are failing. Fix the notebook by editing runtime variables (e.g. via define_variable), then run tests again.",
              "",
              testResult.output
            ].join("\n");
            nextInput = [textMessageItem(msg, "user")];
            callbacks.onStepFinish?.(step, {
              reason: "tests_failed",
              failed,
              previous_response_id
            });
            continue;
          }

          callbacks.onStepFinish?.(step, {
            reason: "tests_passed",
            failed: 0,
            previous_response_id
          });
          break;
        }

        callbacks.onStepFinish?.(step, {
          reason: streamed.finishReason || "end_turn",
          previous_response_id
        });
        break;
      }

      callbacks.onFinish?.(state);
      return state;
    } finally {
      running = false;
      abortController = null;
    }
  };

  return { run, cancel, reset, running: () => running, getState: () => state };
}
)};
const _1g6pj1v = function _51(md){return(
md`#### Anthropic`
)};
const _14z3lei = function _provider_anthropic_config(Inputs,anthropic_models,localStorageView){return(
Inputs.bind(
  Inputs.form({
    modelId: Inputs.select(anthropic_models, {
      label: "model",
      width: "100%",
      value: "claude-sonnet-4-5"
    }),
    baseUrl: Inputs.text({
      label: "baseUrl",
      width: "100%",
      value: "https://api.anthropic.com/v1"
    }),
    version: Inputs.text({
      label: "anthropic-version",
      width: "100%",
      value: "2023-06-01"
    }),
    max_tokens: Inputs.number({
      label: "max_tokens",
      min: 256,
      max: 8192,
      step: 128,
      value: 4096
    })
  }),
  localStorageView("provider_anthropic_config", {
    json: true,
    defaultValue: {
      modelId: "claude-sonnet-4-5",
      baseUrl: "https://api.anthropic.com/v1",
      version: "2023-06-01",
      max_tokens: 4096
    }
  })
)
)};
const _1rui5df = (G, _) => G.input(_);
const _1u47z2 = function _anthropicProvider(){return(
({apiKey, baseUrl = 'https://api.anthropic.com/v1', version = '2023-06-01'}) => ({
    id: 'anthropic',
    baseUrl,
    headers: () => ({
        'x-api-key': apiKey,
        'anthropic-version': version,
        'anthropic-dangerous-direct-browser-access': 'true',
        'Content-Type': 'application/json'
    }),
    messagesEndpoint: baseUrl + '/messages'
})
)};
const _imurdq = function _createAnthropicOpencodeLoop(anthropicProvider,AbortController,createToolContext,streamAnthropicBlocks){return(
({
  apiKey,
  modelId,
  systemPrompt,
  registry,
  tools: toolsOverride = null,
  settings = {},
  maxSteps = 10,
  autoRunTests = true,
  testFilter = "",
  baseUrl = "https://api.anthropic.com/v1",
  version = "2023-06-01",
  runtime
} = {}) => {
  if (!registry)
    throw new Error("createAnthropicOpencodeLoop requires {registry}");

  const provider = anthropicProvider({ apiKey, baseUrl, version });

  const normalizeToAnthropicTools = (rawTools) => {
    const arr = Array.isArray(rawTools) ? rawTools : [];
    const looksAlreadyFormatted = (t) =>
      t &&
      typeof t === "object" &&
      typeof t.name === "string" &&
      typeof t.description === "string" &&
      t.input_schema;
    if (arr.length && looksAlreadyFormatted(arr[0])) return arr;
    const toolObjs = arr.filter(
      (t) => t && typeof t === "object" && typeof t.id === "string"
    );
    return toolObjs.map((t) => ({
      name: t.id,
      description: t.description,
      input_schema: t.parameters
    }));
  };

  const getTools = () => {
    const raw =
      typeof toolsOverride === "function"
        ? toolsOverride()
        : toolsOverride != null
        ? toolsOverride
        : registry.toAnthropicFormat();
    return normalizeToAnthropicTools(raw);
  };

  let abortController = null;
  let running = false;
  let lastMessages = [];

  const cancel = () => abortController?.abort();
  const reset = () => {
    lastMessages = [];
  };

  const run = async (userPrompt, callbacks = {}) => {
    if (running) throw new Error("Loop is already running");
    running = true;
    abortController = new AbortController();

    try {
      let messages =
        Array.isArray(lastMessages) && lastMessages.length
          ? [
              ...lastMessages,
              { role: "user", content: String(userPrompt ?? "") }
            ]
          : [{ role: "user", content: String(userPrompt ?? "") }];

      lastMessages = messages;

      const toolCtx = async (callId) =>
        await createToolContext({
          sessionId: "opencode",
          messageId: "opencode",
          agent: "assistant",
          callId,
          abort: abortController.signal,
          runtime
        });

      for (let step = 0; step < maxSteps; step++) {
        if (abortController.signal.aborted) break;

        callbacks.onStepStart?.(step, { messages });

        const streamed = await streamAnthropicBlocks({
          provider,
          model: modelId,
          messages,
          systemPrompt,
          tools: getTools(),
          signal: abortController.signal,
          settings,
          callbacks: {
            onText: (chunk) => callbacks.onText?.(chunk),
            onToolCall: (id, name) => callbacks.onToolCall?.(id, name),
            onToolCallDelta: (id, chunk) =>
              callbacks.onToolCallDelta?.(id, chunk),
            onError: (e) => callbacks.onError?.(e),
            onFinish: (info) => callbacks.onAssistantFinish?.(info)
          }
        });

        const assistantMsg = { role: "assistant", content: streamed.blocks };
        messages = [...messages, assistantMsg];
        lastMessages = messages;

        const toolUses = streamed.blocks.filter((b) => b.type === "tool_use");
        if (toolUses.length > 0) {
          const results = [];
          for (const tu of toolUses) {
            const result = await registry.execute(
              tu.name,
              tu.input ?? {},
              await toolCtx(tu.id)
            );
            results.push({ tool_use_id: tu.id, name: tu.name, result });
            callbacks.onToolFinish?.(tu.id, tu.name, result);
          }

          const toolResultBlocks = results.map((r) => ({
            type: "tool_result",
            tool_use_id: r.tool_use_id,
            content: r.result.output,
            is_error: !!r.result.metadata?.error
          }));

          const toolResultMsg = { role: "user", content: toolResultBlocks };
          messages = [...messages, toolResultMsg];
          lastMessages = messages;

          callbacks.onStepFinish?.(step, {
            reason: "tool_results_sent",
            messages
          });
          continue;
        }

        if (autoRunTests) {
          const testResult = await registry.execute(
            "run_tests",
            { filter: String(testFilter ?? "") },
            await toolCtx("run_tests_" + step)
          );
          callbacks.onTests?.(testResult);

          const failed = Number(testResult.metadata?.failed ?? 0);
          if (failed > 0) {
            const msg = [
              "Tests are failing. Fix the notebook by editing runtime variables (e.g. via define_variable), then run tests again.",
              "",
              testResult.output
            ].join("\n");

            messages = [...messages, { role: "user", content: msg }];
            lastMessages = messages;

            callbacks.onStepFinish?.(step, {
              reason: "tests_failed",
              failed,
              messages
            });
            continue;
          }

          callbacks.onStepFinish?.(step, {
            reason: "tests_passed",
            failed: 0,
            messages
          });
          break;
        }

        callbacks.onStepFinish?.(step, {
          reason: streamed.finishReason || "end_turn",
          messages
        });
        break;
      }

      callbacks.onFinish?.(lastMessages);
      return lastMessages;
    } finally {
      running = false;
      abortController = null;
    }
  };

  return {
    run,
    cancel,
    reset,
    running: () => running,
    getMessages: () => lastMessages
  };
}
)};
const _1qs7gkk = function _provider_ollama_config(Inputs,localStorageView){return(
Inputs.bind(
  Inputs.form({
    modelId: Inputs.text({
      label: "model",
      width: "100%",
      value: "llama3.2"
    }),
    baseUrl: Inputs.text({
      label: "baseUrl (OpenAI-compatible)",
      width: "100%",
      value: "http://localhost:11434/v1"
    }),
    apiKey: Inputs.password({
      label: "apiKey (optional)",
      width: "100%",
      value: ""
    }),
    max_tokens: Inputs.number({
      label: "max_tokens",
      min: 1,
      max: 8192,
      step: 1,
      value: 2048
    }),
    temperature: Inputs.number({
      label: "temperature",
      min: 0,
      max: 2,
      step: 0.05,
      value: 0.7
    }),
    top_p: Inputs.number({
      label: "top_p",
      min: 0,
      max: 1,
      step: 0.01,
      value: 0.95
    }),
    presence_penalty: Inputs.number({
      label: "presence_penalty",
      min: -2,
      max: 2,
      step: 0.1,
      value: 0
    }),
    frequency_penalty: Inputs.number({
      label: "frequency_penalty",
      min: -2,
      max: 2,
      step: 0.1,
      value: 0
    }),
    seed: Inputs.number({
      label: "seed (optional)",
      min: 0,
      max: 2147483647,
      step: 1,
      value: 0
    }),
    stop: Inputs.textarea({
      label: "stop (optional; one per line)",
      width: "100%",
      rows: 3,
      value: ""
    })
  }),
  localStorageView("provider_ollama_config", {
    json: true,
    defaultValue: {
      modelId: "qwen2.5:7b",
      baseUrl: "http://localhost:11434/v1",
      apiKey: "",
      max_tokens: 2048,
      temperature: 0.7,
      top_p: 0.95,
      presence_penalty: 0,
      frequency_penalty: 0,
      seed: 0,
      stop: ""
    }
  })
)
)};
const _1ke2qcj = (G, _) => G.input(_);
const _1770tiy = function _56(md){return(
md`#### Ollama

On macOS with the Ollama app:  

    export OLLAMA_ORIGINS="*"
    ollama serve

verify CORS

    curl -X OPTIONS http://localhost:11434 \\
      -H "Origin: http://example.com" \\
      -H "Access-Control-Request-Method: GET" -I  
      
Testing locally first

    ollama pull qwen2.5:7b

    curl http://localhost:11434/api/tags

    curl -X POST http://localhost:11434/v1/chat/completions \\
    -H "Content-Type: application/json" \\
    -d '{                                 
      "model": "qwen2.5:7b",
      "messages": [{"role": "user", "content": "hello"}]
    }'`
)};
const _e906tj = function _ollamaProvider(){return(
({
  apiKey = "",
  baseUrl = "http://localhost:11434/v1"
} = {}) => {
  const b = String(baseUrl ?? "").replace(/\/+$/, "");
  const key = String(apiKey ?? "");
  return {
    id: "ollama",
    baseUrl: b,
    headers: () => {
      const h = { "Content-Type": "application/json" };
      if (key) h.Authorization = `Bearer ${key}`;
      return h;
    },
    chatCompletionsEndpoint: `${b}/chat/completions`
  };
}
)};
const _fy9v7f = function _createOllamaOpencodeLoop(ollamaProvider,AbortController,streamOpenAIChatCompletionsBlocks,createToolContext){return(
({
  apiKey = "",
  modelId,
  systemPrompt,
  registry,
  tools: toolsOverride = null,
  settings = {},
  maxSteps = 10,
  autoRunTests = true,
  testFilter = "",
  baseUrl = "http://localhost:11434/v1",
  runtime
} = {}) => {
  if (!registry)
    throw new Error("createOllamaOpencodeLoop requires {registry}");

  const provider = ollamaProvider({ apiKey, baseUrl });

  const normalizeToChatTools = (rawTools) => {
    const arr = Array.isArray(rawTools) ? rawTools : [];
    const looksAlreadyFormatted = (t) =>
      t &&
      typeof t === "object" &&
      t.type === "function" &&
      t.function &&
      typeof t.function.name === "string";
    if (arr.length && looksAlreadyFormatted(arr[0])) return arr;
    return arr
      .filter((t) => t && typeof t === "object" && typeof t.id === "string")
      .map((t) => ({
        type: "function",
        function: {
          name: t.id,
          description: String(t.description ?? ""),
          parameters: t.parameters ?? {
            type: "object",
            properties: {},
            required: []
          }
        }
      }));
  };

  const getTools = () => {
    const raw =
      typeof toolsOverride === "function"
        ? toolsOverride()
        : toolsOverride != null
        ? toolsOverride
        : registry.all();
    return normalizeToChatTools(raw);
  };

  let abortController = null;
  let running = false;
  let lastMessages = [];

  const cancel = () => abortController?.abort();
  const reset = () => {
    lastMessages = [];
  };

  const userMsg = (text) => ({ role: "user", content: String(text ?? "") });
  const systemMsg = (text, role = "system") => ({
    role,
    content: String(text ?? "")
  });
  const systemRoleForModel = (mid) =>
    String(mid ?? "").startsWith("o1") ? "user" : "system";
  const parseStop = (stop) => {
    const s = String(stop ?? "");
    const parts = s
      .split(/\r?\n/)
      .map((d) => d.trim())
      .filter(Boolean);
    return parts.length ? parts : undefined;
  };

  const run = async (userPrompt, callbacks = {}) => {
    if (running) throw new Error("Loop is already running");
    running = true;
    abortController = new AbortController();

    try {
      let messages =
        Array.isArray(lastMessages) && lastMessages.length
          ? [...lastMessages]
          : [];
      if (!messages.length && systemPrompt)
        messages.push(systemMsg(systemPrompt, systemRoleForModel(modelId)));
      messages.push(userMsg(userPrompt));
      lastMessages = messages;

      for (let step = 0; step < maxSteps; step++) {
        if (abortController.signal.aborted) break;

        callbacks.onStepStart?.(step, { messages });

        const streamed = await streamOpenAIChatCompletionsBlocks({
          provider,
          model: modelId,
          messages,
          tools: getTools(),
          signal: abortController.signal,
          settings: { ...settings, stop: parseStop(settings.stop) },
          callbacks: {
            onText: (chunk) => callbacks.onText?.(chunk),
            onToolCall: (id, name) => callbacks.onToolCall?.(id, name),
            onToolCallDelta: (id, chunk) =>
              callbacks.onToolCallDelta?.(id, chunk),
            onError: (e) => callbacks.onError?.(e),
            onFinish: (info) => callbacks.onAssistantFinish?.(info)
          }
        });

        const text = streamed.blocks
          .filter((b) => b.type === "text")
          .map((b) => b.text)
          .join("");
        const toolUses = streamed.blocks.filter((b) => b.type === "tool_use");

        const assistantToolCalls = toolUses.map((tu) => ({
          id: tu.id,
          type: "function",
          function: {
            name: tu.name,
            arguments: tu.argsRaw ?? JSON.stringify(tu.input ?? {})
          }
        }));

        const assistantMsg = {
          role: "assistant",
          content: text || null,
          ...(assistantToolCalls.length
            ? { tool_calls: assistantToolCalls }
            : {})
        };

        messages = [...messages, assistantMsg];
        lastMessages = messages;

        if (toolUses.length > 0) {
          const toolResultMsgs = [];
          for (const tu of toolUses) {
            const ctx = await createToolContext({
              sessionId: "opencode",
              messageId: "opencode",
              agent: "assistant",
              callId: tu.id,
              abort: abortController.signal,
              runtime
            });
            const result = await registry.execute(tu.name, tu.input ?? {}, ctx);
            callbacks.onToolFinish?.(tu.id, tu.name, result);
            toolResultMsgs.push({
              role: "tool",
              tool_call_id: tu.id,
              content: String(result.output ?? "")
            });
          }

          messages = [...messages, ...toolResultMsgs];
          lastMessages = messages;

          callbacks.onStepFinish?.(step, {
            reason: "tool_outputs_sent",
            messages
          });
          continue;
        }

        if (autoRunTests) {
          const testCtx = await createToolContext({
            sessionId: "opencode",
            messageId: "opencode",
            agent: "assistant",
            callId: `run_tests_${step}`,
            abort: abortController.signal,
            runtime
          });
          const testResult = await registry.execute(
            "run_tests",
            { filter: String(testFilter ?? "") },
            testCtx
          );
          callbacks.onTests?.(testResult);

          const failed = Number(testResult.metadata?.failed ?? 0);
          if (failed > 0) {
            const msg = [
              "Tests are failing. Fix the notebook by editing runtime variables (e.g. via define_variable), then run tests again.",
              "",
              testResult.output
            ].join("\n");

            messages = [...messages, userMsg(msg)];
            lastMessages = messages;

            callbacks.onStepFinish?.(step, {
              reason: "tests_failed",
              failed,
              messages
            });
            continue;
          }

          callbacks.onStepFinish?.(step, {
            reason: "tests_passed",
            failed: 0,
            messages
          });
          break;
        }

        callbacks.onStepFinish?.(step, {
          reason: streamed.finishReason || "end_turn",
          messages
        });
        break;
      }

      callbacks.onFinish?.(lastMessages);
      return lastMessages;
    } finally {
      running = false;
      abortController = null;
    }
  };

  return {
    run,
    cancel,
    reset,
    running: () => running,
    getMessages: () => lastMessages
  };
}
)};
const _nqiwrb = function _59(md){return(
md`### Agent config`
)};
const _1pw3ef2 = function _agent_config(Inputs,system_prompt){return(
Inputs.form({
  maxSteps: Inputs.number({
    label: "maxSteps",
    min: 1,
    max: 50,
    step: 1,
    value: 10
  }),
  autoRunTests: Inputs.toggle({
    label: "autoRunTests",
    value: true
  }),
  testFilter: Inputs.text({
    label: "testFilter (optional)",
    width: "100%",
    value: ""
  }),
  systemPrompt: Inputs.textarea({
    label: "systemPrompt",
    width: "100%",
    rows: 10,
    value: system_prompt
  })
})
)};
const _sbwfmg = (G, _) => G.input(_);
const _yvpex5 = function _agent_loop(provider_choice,createOpenAIOpencodeLoop,agent_system_prompt,toolRegistry,provider_openai_config,agent_config,agent_runtime,OPENAI_API_KEY,createAnthropicOpencodeLoop,ANTHROPIC_API_KEY,provider_anthropic_config,createOllamaOpencodeLoop,provider_ollama_config){return(
provider_choice === "demo"
  ? createOpenAIOpencodeLoop({
      apiKey: "",
      baseUrl: "https://openai-proxy.endpointservices.workers.dev/v1",
      modelId: "gpt-5-mini",
      systemPrompt: agent_system_prompt,
      registry: toolRegistry,
      settings: { max_output_tokens: provider_openai_config.max_output_tokens },
      maxSteps: agent_config.maxSteps,
      autoRunTests: agent_config.autoRunTests,
      testFilter: agent_config.testFilter,
      runtime: agent_runtime
    })
  : provider_choice === "openai"
  ? createOpenAIOpencodeLoop({
      apiKey: OPENAI_API_KEY,
      baseUrl: provider_openai_config.baseUrl,
      modelId: provider_openai_config.modelId,
      systemPrompt: agent_system_prompt,
      registry: toolRegistry,
      settings: { max_output_tokens: provider_openai_config.max_output_tokens },
      maxSteps: agent_config.maxSteps,
      autoRunTests: agent_config.autoRunTests,
      testFilter: agent_config.testFilter,
      runtime: agent_runtime
    })
  : provider_choice === "anthropic"
  ? createAnthropicOpencodeLoop({
      apiKey: ANTHROPIC_API_KEY,
      baseUrl: provider_anthropic_config.baseUrl,
      version: provider_anthropic_config.version,
      modelId: provider_anthropic_config.modelId,
      systemPrompt: agent_system_prompt,
      registry: toolRegistry,
      settings: { max_tokens: provider_anthropic_config.max_tokens },
      maxSteps: agent_config.maxSteps,
      autoRunTests: agent_config.autoRunTests,
      testFilter: agent_config.testFilter,
      runtime: agent_runtime
    })
  : createOllamaOpencodeLoop({
      apiKey: provider_ollama_config.apiKey,
      baseUrl: provider_ollama_config.baseUrl,
      modelId: provider_ollama_config.modelId,
      systemPrompt: agent_system_prompt,
      registry: toolRegistry,
      settings: {
        max_tokens: provider_ollama_config.max_tokens,
        temperature: provider_ollama_config.temperature,
        top_p: provider_ollama_config.top_p,
        presence_penalty: provider_ollama_config.presence_penalty,
        frequency_penalty: provider_ollama_config.frequency_penalty,
        seed: provider_ollama_config.seed || undefined,
        stop: provider_ollama_config.stop
      },
      maxSteps: agent_config.maxSteps,
      autoRunTests: agent_config.autoRunTests,
      testFilter: agent_config.testFilter,
      runtime: agent_runtime
    })
)};
const _16nr8tq = function _normalizeUsage(){return(
(usage, providerId = "") => {
  const u = usage && typeof usage === "object" ? usage : {};
  const pid = String(providerId ?? "").toLowerCase();
  const asInt = (x) => (Number.isFinite(x) ? Math.trunc(x) : 0);

  const looksOpenAIResponses =
    "total_tokens" in u ||
    "input_tokens" in u ||
    "output_tokens" in u ||
    "input_tokens_details" in u ||
    "output_tokens_details" in u;

  const looksOpenAIChatCompletions =
    "prompt_tokens" in u || "completion_tokens" in u || "total_tokens" in u;

  const looksAnthropic =
    "input_tokens" in u ||
    "output_tokens" in u ||
    "cache_read_input_tokens" in u ||
    "cache_creation_input_tokens" in u;

  if (
    pid.includes("openai") ||
    (looksOpenAIResponses &&
      !pid.includes("anthropic") &&
      !pid.includes("ollama"))
  ) {
    const input = asInt(u.input_tokens);
    const output = asInt(u.output_tokens);
    const reasoning = asInt(
      u.output_tokens_details?.reasoning_tokens ?? u.reasoning_tokens
    );
    const cacheRead = asInt(
      u.input_tokens_details?.cached_tokens ?? u.cached_tokens
    );
    const cacheWrite = asInt(
      u.input_tokens_details?.cache_creation_input_tokens ?? 0
    );
    const total = asInt(u.total_tokens ?? input + output);
    return {
      input,
      output,
      reasoning,
      cache: { read: cacheRead, write: cacheWrite },
      total
    };
  }

  if (pid.includes("ollama") || looksOpenAIChatCompletions) {
    const input = asInt(u.prompt_tokens);
    const output = asInt(u.completion_tokens);
    const total = asInt(u.total_tokens ?? input + output);
    return {
      input,
      output,
      reasoning: 0,
      cache: { read: 0, write: 0 },
      total
    };
  }

  if (pid.includes("anthropic") || looksAnthropic) {
    const input = asInt(u.input_tokens);
    const output = asInt(u.output_tokens);
    const cacheRead = asInt(u.cache_read_input_tokens);
    const cacheWrite = asInt(u.cache_creation_input_tokens);
    const total = asInt(u.total_tokens ?? input + output);
    return {
      input,
      output,
      reasoning: 0,
      cache: { read: cacheRead, write: cacheWrite },
      total
    };
  }

  return {
    input: 0,
    output: 0,
    reasoning: 0,
    cache: { read: 0, write: 0 },
    total: 0
  };
}
)};
const _1hkgk3r = function _test_normalizeUsage_openai_chat_completions_usage(normalizeUsage)
{
  const u = normalizeUsage(
    { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
    "ollama"
  );
  if (u.input !== 10 || u.output !== 5 || u.total !== 15)
    throw new Error("bad normalizeUsage: " + JSON.stringify(u));
  return "pass";
};
const _1bz1j8w = function _64(md){return(
md`## Example Provider Data`
)};
const _1gd3kuv = function _65(md){return(
md`<details><summary>Open AI completion event</summary>
${md`~~~json
{
  "type": "response.completed",
  "response": {
    "id": "resp_04976cfaa45a675a006970f676dfa881979084ef09ab948c9d",
    "object": "response",
    "created_at": 1769010807,
    "status": "completed",
    "background": false,
    "completed_at": 1769010823,
    "error": null,
    "frequency_penalty": 0,
    "incomplete_details": null,
    "instructions": "...",
    "max_output_tokens": 2048,
    "max_tool_calls": null,
    "model": "gpt-5-mini-2025-08-07",
    "output": [
      {
        "id": "rs_04976cfaa45a675a006970f6775d1481979bb27b1a685fcfc7",
        "type": "reasoning",
        "summary": []
      },
      {
        "id": "msg_04976cfaa45a675a006970f67ac7808197b6b05e2f33751b1d",
        "type": "message",
        "status": "completed",
        "content": [
          {
            "type": "output_text",
            "annotations": [],
            "logprobs": [],
            "text": "..."
          }
        ],
        "role": "assistant"
      }
    ],
    "parallel_tool_calls": true,
    "presence_penalty": 0,
    "previous_response_id": "resp_04976cfaa45a675a006970f67326c48197b6ec6e8092ffee60",
    "prompt_cache_key": null,
    "prompt_cache_retention": null,
    "reasoning": {
      "effort": "medium",
      "summary": null
    },
    "safety_identifier": null,
    "service_tier": "default",
    "store": true,
    "temperature": 1,
    "text": {
      "format": {
        "type": "text"
      },
      "verbosity": "medium"
    },
    "tool_choice": "auto",
    "tools": [
      {
        "type": "function",
        "description": "Read information about a runtime variable (name, current value/error, reachability, and its input variables).",
        "name": "read_variable",
        "parameters": {
          "type": "object",
          "properties": {
            "name": {
              "type": "string",
              "description": "The name of the runtime variable to read"
            }
          },
          "required": [
            "name"
          ],
          "additionalProperties": false
        },
        "strict": true
      },...
    ],
    "top_logprobs": 0,
    "top_p": 1,
    "truncation": "disabled",
    "usage": {
      "input_tokens": 9157,
      "input_tokens_details": {
        "cached_tokens": 8960
      },
      "output_tokens": 996,
      "output_tokens_details": {
        "reasoning_tokens": 192
      },
      "total_tokens": 10153
    },
    "user": null,
    "metadata": {}
  },
  "sequence_number": 807
}
~~~`}
</details>
<details><summary>Anthropic 429</summary>
${md`~~~json
Status Code: 429
retry-after: 11
{
    "type": "error",
    "error": {
        "type": "rate_limit_error",
        "message": "This request would exceed the rate limit for your organization (1815e560-bf0c-433e-b03a-793524e11fda) of 50,000 input tokens per minute. For details, refer to: https://docs.claude.com/en/api/rate-limits. You can see the response headers for current usage. Please reduce the prompt length or the maximum tokens requested, or try again later. You may also contact sales at https://www.anthropic.com/contact-sales to discuss your options for a rate limit increase."
    },
    "request_id": "req_011CXQugkT1ZmWRCq9gdSrAa"
}
~~~`}
</details>
`
)};
const _1erle28 = function _66(md){return(
md`## Code`
)};
const _1d4xopf = function _agent_target_module(){return(
"main"
)};
const _6ye93e = function _agent_system_prompt(agent_config,agent_target_module,provider_choice){return(
[
  String(agent_config?.systemPrompt ?? ""),
  "",
  "Operational note:",
  `- Prefer editing variables in module: "${String(agent_target_module)}"`,
  `- Active provider: "${String(provider_choice ?? "")}"`
].join("\n")
)};
const _1exebr2 = function _agent_run(generateId,$0,provider_choice,$1,appendAgentRecord,agent_loop,normalizeUsage){return(
async ({ prompt = "", reset = true } = {}) => {
  const text = String(prompt ?? "").trim();
  if (!text) return null;

  const runId =
    typeof generateId === "function" ? generateId() : crypto.randomUUID();
  const startedAt = Date.now();

  let records;
  if (reset || !Array.isArray($0.value)) records = [];
  else records = $0.value;

  const computeStepBase = (recs) => {
    let m = -1;
    for (const r of Array.isArray(recs) ? recs : []) {
      const s = r?.step;
      if (Number.isFinite(s)) m = Math.max(m, s);
      const is = r?.info?.step;
      if (Number.isFinite(is)) m = Math.max(m, is);
    }
    return m + 1;
  };

  const stepBase = reset ? 0 : computeStepBase(records);

  if (reset) {
    $0.value = records;
  }

  const runEntry = {
    id: runId,
    startedAt,
    endedAt: null,
    provider: String(provider_choice ?? ""),
    prompt: String(prompt ?? ""),
    records,
    stepBase,
    tokens: {
      input: 0,
      output: 0,
      reasoning: 0,
      cache: { read: 0, write: 0 },
      total: 0
    }
  };

  $1.value = [
    runEntry,
    ...($1.value || [])
  ].slice(0, 20);

  const push = (rec) => {
    records = appendAgentRecord(records, rec, Date.now());
    $0.value = records;
  };

  push({
    type: "run_start",
    runId,
    provider: runEntry.provider,
    reset: !!reset
  });

  try {
    await agent_loop.run(prompt, {
      onStepStart: (step, info) => {
        const s = stepBase + step;
        push({ type: "step_start", step: s, info: info ?? null });
      },
      onText: (chunk) => {
        push({ type: "text", chunk: String(chunk ?? "") });
      },
      onToolCall: (id, name) => {
        push({
          type: "tool_use",
          id: String(id ?? ""),
          name: String(name ?? "")
        });
      },
      onToolCallDelta: (id, chunk) => {
        push({
          type: "tool_use_delta",
          id: String(id ?? ""),
          chunk: String(chunk ?? "")
        });
      },
      onToolFinish: (id, name, result) => {
        push({
          type: "tool_result",
          id: String(id ?? ""),
          name: String(name ?? ""),
          title: String(result?.title ?? ""),
          output: String(result?.output ?? ""),
          metadata: result?.metadata ?? null
        });
      },
      onTests: (result) => {
        push({
          type: "tests",
          title: String(result?.title ?? ""),
          output: String(result?.output ?? ""),
          metadata: result?.metadata ?? null
        });
      },
      onAssistantFinish: (info) => {
        const usage = normalizeUsage(info?.usage, provider_choice);
        runEntry.tokens = usage;
        push({
          type: "assistant_finish",
          responseId: info?.responseId ?? null,
          finishReason: info?.finishReason ?? null,
          usage_raw: info?.usage ?? null,
          usage
        });
      },
      onError: (e) => {
        push({
          type: "error",
          message: String(e?.message ?? e),
          error: e ?? null
        });
      },
      onStepFinish: (step, info) => {
        const s = stepBase + step;
        push({ type: "step_finish", step: s, info: info ?? null });
      }
    });
    push({ type: "run_done" });
  } catch (e) {
    push({ type: "fatal", message: String(e?.message ?? e), error: e ?? null });
  } finally {
    runEntry.endedAt = Date.now();
    push({
      type: "run_end",
      runId,
      durationMs: runEntry.endedAt - startedAt,
      tokens: runEntry.tokens
    });
    $1.value = [
      runEntry,
      ...($1.value || []).filter((d) => d?.id !== runId)
    ].slice(0, 20);
  }

  return runEntry;
}
)};
const _pzqwpp = function _test_appendAgentRecord_coalesces_text(appendAgentRecord)
{
  const records = [];
  appendAgentRecord(records, { type: "text", chunk: "hel" }, 1);
  appendAgentRecord(records, { type: "text", chunk: "lo" }, 2);
  if (records.length !== 1)
    throw new Error("expected 1 record, got " + records.length);
  if (records[0].chunk !== "hello")
    throw new Error("expected hello, got " + records[0].chunk);
  if (records[0].time !== 2)
    throw new Error("expected merged time to update to latest");
  return "pass";
};
const _gso0rx = function _test_appendAgentRecord_coalesces_tool_use_delta_by_id(appendAgentRecord)
{
  const records = [];
  appendAgentRecord(
    records,
    { type: "tool_use_delta", id: "c1", chunk: "{" },
    1
  );
  appendAgentRecord(
    records,
    { type: "tool_use_delta", id: "c1", chunk: '"a"' },
    2
  );
  appendAgentRecord(
    records,
    { type: "tool_use_delta", id: "c2", chunk: "X" },
    3
  );
  appendAgentRecord(
    records,
    { type: "tool_use_delta", id: "c1", chunk: ":1}" },
    4
  );

  if (records.length !== 3)
    throw new Error("expected 3 records, got " + records.length);
  if (records[0].chunk !== '{"a"')
    throw new Error("unexpected merged chunk for c1: " + records[0].chunk);
  if (records[1].id !== "c2" || records[1].chunk !== "X")
    throw new Error("unexpected middle record");
  if (records[2].id !== "c1" || records[2].chunk !== ":1}")
    throw new Error("should not merge non-adjacent deltas");
  return "pass";
};
const _11pt84b = function _agent_reply(agent_run){return(
(text) => agent_run({ prompt: String(text ?? ""), reset: false })
)};
const _1ancakz = function _agent_stop(agent_loop){return(
() => agent_loop.cancel()
)};
const _d34r72 = function _streamOpenAIResponseBlocks(parseSSEStream){return(
async ({
  provider,
  model,
  input,
  instructions,
  tools,
  previous_response_id,
  callbacks = {},
  signal,
  settings = {}
} = {}) => {
  const body = {
    model,
    input,
    stream: true,
    ...settings
  };

  if (instructions) body.instructions = instructions;
  if (previous_response_id) body.previous_response_id = previous_response_id;
  if (tools && tools.length) body.tools = tools;

  const response = await fetch(provider.responsesEndpoint, {
    method: "POST",
    headers: provider.headers(),
    body: JSON.stringify(body),
    signal
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    const e = new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    callbacks.onError?.(e);
    throw e;
  }

  let responseId = null;
  let finalResponse = null;
  let currentText = "";

  const itemIdToCallId = new Map();
  const argsByCallId = new Map();
  const outputItemsDone = [];

  const normalizeBlocksFromOutput = (output = []) => {
    const blocks = [];
    for (const item of output) {
      if (!item || typeof item !== "object") continue;

      if (
        item.type === "message" &&
        item.role === "assistant" &&
        Array.isArray(item.content)
      ) {
        for (const part of item.content) {
          if (part?.type === "output_text") {
            blocks.push({ type: "text", text: String(part.text ?? "") });
          }
        }
      } else if (item.type === "function_call") {
        let parsed = {};
        try {
          parsed = item.arguments ? JSON.parse(item.arguments) : {};
        } catch {
          parsed = {};
        }
        blocks.push({
          type: "tool_use",
          id: item.call_id ?? item.id,
          name: item.name,
          input: parsed
        });
      } else if (item.type === "custom_tool_call") {
        blocks.push({
          type: "tool_use",
          id: item.call_id ?? item.id,
          name: item.name,
          input: item.input ?? ""
        });
      }
    }
    return blocks;
  };

  await parseSSEStream(
    response.body,
    (event) => {
      const t = event?.type;

      if (t === "response.created") {
        responseId = event?.response?.id ?? responseId;
      }

      if (t === "response.output_text.delta") {
        const delta = event?.delta ?? "";
        currentText += delta;
        callbacks.onText?.(delta);
      }

      if (t === "response.output_item.added") {
        const item = event?.item;
        if (item?.type === "function_call") {
          if (item.id && (item.call_id ?? item.id))
            itemIdToCallId.set(item.id, item.call_id ?? item.id);
          callbacks.onToolCall?.(item.call_id ?? item.id, item.name);
        } else if (item?.type === "custom_tool_call") {
          if (item.id && (item.call_id ?? item.id))
            itemIdToCallId.set(item.id, item.call_id ?? item.id);
          callbacks.onToolCall?.(item.call_id ?? item.id, item.name);
        }
      }

      if (t === "response.function_call_arguments.delta") {
        const itemId = event?.item_id;
        const callId = itemIdToCallId.get(itemId) ?? itemId;
        const delta = event?.delta ?? "";
        argsByCallId.set(callId, (argsByCallId.get(callId) ?? "") + delta);
        callbacks.onToolCallDelta?.(callId, delta);
      }

      if (t === "response.function_call_arguments.done") {
        const itemId = event?.item_id;
        const callId = itemIdToCallId.get(itemId) ?? itemId;
        const args = event?.arguments ?? "";
        argsByCallId.set(callId, args);
      }

      if (t === "response.output_item.done") {
        const idx = event?.output_index;
        if (Number.isInteger(idx)) outputItemsDone[idx] = event?.item;
      }

      if (t === "response.completed") {
        finalResponse = event?.response ?? finalResponse;
        responseId = finalResponse?.id ?? responseId;
      }

      if (t === "response.failed") {
        const msg = event?.response?.error?.message ?? "Unknown error";
        const e = new Error(msg);
        callbacks.onError?.(e);
      }
    },
    signal
  );

  const output = finalResponse?.output ?? outputItemsDone.filter(Boolean);
  let blocks = normalizeBlocksFromOutput(output);

  if (blocks.length === 0 && currentText)
    blocks = [{ type: "text", text: currentText }];

  const usage = finalResponse?.usage ?? null;
  const finishReason = finalResponse?.status ?? "unknown";

  callbacks.onFinish?.({
    responseId,
    finishReason,
    usage,
    blocks
  });

  return {
    responseId,
    finishReason,
    usage,
    blocks,
    raw: finalResponse
  };
}
)};
const _10faqo9 = function _toolRegistry(createToolRegistry){return(
createToolRegistry()
)};
const _wz74j2 = function _toolRegistry_sync(toolRegistry,allTools){return(
(() => {
  const prevIds = new Set(toolRegistry.ids());
  const nextIds = new Set(
    (Array.isArray(allTools) ? allTools : [])
      .map((t) => String(t?.id ?? ""))
      .filter(Boolean)
  );

  for (const t of Array.isArray(allTools) ? allTools : []) {
    if (t && typeof t === "object" && typeof t.id === "string" && t.id)
      toolRegistry.register(t);
  }

  for (const id of prevIds) {
    if (!nextIds.has(id)) toolRegistry.unregister(id);
  }

  return { tools: nextIds.size };
})()
)};
const _4pvjq4 = function _streamAnthropicBlocks(parseSSEStream){return(
async ({
  provider,
  model,
  messages,
  systemPrompt,
  tools,
  callbacks = {},
  signal,
  settings = {}
}) => {
  const body = {
    model,
    messages,
    max_tokens: settings.max_tokens || 4096,
    stream: true,
    ...settings
  };
  if (systemPrompt) body.system = systemPrompt;
  if (tools && tools.length > 0) body.tools = tools;

  const response = await fetch(provider.messagesEndpoint, {
    method: "POST",
    headers: provider.headers(),
    body: JSON.stringify(body),
    signal
  });

  if (!response.ok) {
    const error = await response.text();
    const e = new Error("Anthropic API error: " + response.status + " - " + error);
    callbacks.onError?.(e);
    throw e;
  }

  const blocks = [];
  let current = null;
  let stopReason = null;
  let usage = null;

  const finishBlock = () => {
    if (!current) return;
    if (current.type === "text") {
      blocks.push({ type: "text", text: current.text });
    } else if (current.type === "tool_use") {
      let input = {};
      try {
        input = current.input_json ? JSON.parse(current.input_json) : {};
      } catch {
        input = {};
      }
      blocks.push({ type: "tool_use", id: current.id, name: current.name, input });
    }
    current = null;
  };

  await parseSSEStream(
    response.body,
    (event) => {
      if (event.type === "message_start") usage = event.message?.usage ?? usage;

      if (event.type === "content_block_start") {
        const b = event.content_block;
        if (b?.type === "text") current = { type: "text", text: "" };
        else if (b?.type === "tool_use") {
          current = { type: "tool_use", id: b.id, name: b.name, input_json: "" };
          callbacks.onToolCall?.(b.id, b.name);
        }
      }

      if (event.type === "content_block_delta") {
        const d = event.delta;
        if (d?.type === "text_delta" && current?.type === "text") {
          current.text += d.text;
          callbacks.onText?.(d.text);
        } else if (d?.type === "thinking_delta") {
          callbacks.onReasoning?.(d.thinking);
        } else if (d?.type === "input_json_delta" && current?.type === "tool_use") {
          current.input_json += d.partial_json;
          callbacks.onToolCallDelta?.(current.id, d.partial_json);
        }
      }

      if (event.type === "content_block_stop") finishBlock();

      if (event.type === "message_delta") {
        stopReason = event.delta?.stop_reason ?? stopReason;
        if (event.usage) usage = { ...(usage ?? {}), ...event.usage };
      }
    },
    signal
  );

  finishBlock();
  callbacks.onFinish?.({ finishReason: stopReason, usage, blocks });

  return { blocks, finishReason: stopReason, usage };
}
)};
const _ojkt4w = function _generateId(){return(
() => crypto.randomUUID()
)};
const _111q5dd = function _createUserMessage(generateId){return(
({sessionId, agent, providerId, modelId, system, tools}) => ({
    id: generateId(),
    sessionId,
    role: 'user',
    time: { created: Date.now() },
    agent,
    model: {
        providerId,
        modelId
    },
    system,
    tools
})
)};
const _fpcpcn = function _createAssistantMessage(generateId){return(
({sessionId, parentId, agent, providerId, modelId}) => ({
    id: generateId(),
    sessionId,
    role: 'assistant',
    time: {
        created: Date.now(),
        completed: null
    },
    parentId,
    agent,
    providerId,
    modelId,
    error: null,
    cost: 0,
    tokens: {
        input: 0,
        output: 0,
        reasoning: 0,
        cache: {
            read: 0,
            write: 0
        }
    },
    finish: null
})
)};
const _1flybnh = function _test_opencode_generateId(generateId)
{
    const id = generateId();
    if (typeof id !== 'string' || id.length < 30)
        throw new Error('bad id: ' + typeof id);
    return 'pass';
};
const _yogx18 = function _test_opencode_createUserMessage(createUserMessage)
{
    const msg = createUserMessage({
        sessionId: 'test',
        agent: 'user',
        providerId: 'anthropic',
        modelId: 'claude'
    });
    if (!msg.id || msg.role !== 'user')
        throw new Error('failed: ' + JSON.stringify(msg));
    return 'pass';
};
const _w0romk = function _test_opencode_createAssistantMessage(createAssistantMessage)
{
    const msg = createAssistantMessage({
        sessionId: 'test',
        parentId: 'p1',
        agent: 'assistant',
        providerId: 'anthropic',
        modelId: 'claude'
    });
    if (!msg.id || msg.role !== 'assistant')
        throw new Error('failed');
    return 'pass';
};
const _lwyssi = function _createTextPart(generateId){return(
({sessionId, messageId, text, synthetic = false}) => ({
    id: generateId(),
    sessionId,
    messageId,
    type: 'text',
    text,
    synthetic,
    time: {
        start: Date.now(),
        end: null
    }
})
)};
const _xtar8h = function _createReasoningPart(generateId){return(
({sessionId, messageId, text}) => ({
    id: generateId(),
    sessionId,
    messageId,
    type: 'reasoning',
    text,
    time: {
        start: Date.now(),
        end: null
    }
})
)};
const _ubzmdd = function _toolStatePending(){return(
(input, raw = '') => ({
    status: 'pending',
    input,
    raw
})
)};
const _1nyakwd = function _toolStateRunning(){return(
(input, title = null) => ({
    status: 'running',
    input,
    title,
    metadata: {},
    time: { start: Date.now() }
})
)};
const _19r834o = function _toolStateCompleted(){return(
({input, output, title, metadata = {}, startTime}) => ({
    status: 'completed',
    input,
    output,
    title,
    metadata,
    time: {
        start: startTime,
        end: Date.now()
    }
})
)};
const _14nwhb7 = function _toolStateError(){return(
({input, error, startTime}) => ({
    status: 'error',
    input,
    error,
    metadata: {},
    time: {
        start: startTime,
        end: Date.now()
    }
})
)};
const _1h1hbws = function _createToolPart(generateId){return(
({sessionId, messageId, callId, tool, state}) => ({
    id: generateId(),
    sessionId,
    messageId,
    type: 'tool',
    callId,
    tool,
    state,
    metadata: {}
})
)};
const _f7aqlh = function _parseSSEStream(){return(
async (stream, onEvent, signal) => {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    try {
        while (true) {
            if (signal?.aborted)
                break;
            const {done, value} = await reader.read();
            if (done)
                break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    if (data === '[DONE]')
                        return;
                    try {
                        onEvent(JSON.parse(data));
                    } catch {
                    }
                }
            }
        }
    } finally {
        reader.releaseLock();
    }
}
)};
const _syt75v = function _streamAnthropic(parseSSEStream){return(
async ({provider, model, messages, systemPrompt, tools, callbacks, signal, settings = {}}) => {
    const body = {
        model,
        messages,
        max_tokens: settings.max_tokens || 4096,
        stream: true,
        ...settings
    };
    if (systemPrompt)
        body.system = systemPrompt;
    if (tools && tools.length > 0)
        body.tools = tools;
    const response = await fetch(provider.messagesEndpoint, {
        method: 'POST',
        headers: provider.headers(),
        body: JSON.stringify(body),
        signal
    });
    if (!response.ok) {
        const error = await response.text();
        callbacks.onError?.(new Error('Anthropic API error: ' + response.status + ' - ' + error));
        throw new Error('Anthropic API error: ' + response.status);
    }
    let currentToolUse = null;
    let stopReason = null;
    let usage = null;
    await parseSSEStream(response.body, event => {
        if (event.type === 'message_start')
            usage = event.message?.usage;
        if (event.type === 'content_block_start') {
            const block = event.content_block;
            if (block?.type === 'tool_use') {
                currentToolUse = {
                    id: block.id,
                    name: block.name,
                    input: ''
                };
                callbacks.onToolCall?.(block.id, block.name);
            }
        }
        if (event.type === 'content_block_delta') {
            const delta = event.delta;
            if (delta?.type === 'text_delta')
                callbacks.onText?.(delta.text);
            else if (delta?.type === 'thinking_delta')
                callbacks.onReasoning?.(delta.thinking);
            else if (delta?.type === 'input_json_delta' && currentToolUse) {
                currentToolUse.input += delta.partial_json;
                callbacks.onToolCallDelta?.(currentToolUse.id, delta.partial_json);
            }
        }
        if (event.type === 'content_block_stop')
            currentToolUse = null;
        if (event.type === 'message_delta') {
            stopReason = event.delta?.stop_reason;
            if (event.usage)
                usage = {
                    ...usage,
                    ...event.usage
                };
        }
    }, signal);
    callbacks.onFinish?.({
        finishReason: stopReason,
        usage
    });
    return {
        finishReason: stopReason,
        usage
    };
}
)};
const _16zwjk = function _completeAssistantMessage(){return(
(message, {finish, tokens, cost}) => ({
    ...message,
    time: {
        ...message.time,
        completed: Date.now()
    },
    finish,
    tokens: tokens || message.tokens,
    cost: cost ?? message.cost
})
)};
const _mkz7zm = function _createStepStartPart(generateId){return(
({sessionId, messageId}) => ({
    id: generateId(),
    sessionId,
    messageId,
    type: 'step-start'
})
)};
const _176g0t7 = function _createStepFinishPart(generateId){return(
({sessionId, messageId, reason, tokens, cost}) => ({
    id: generateId(),
    sessionId,
    messageId,
    type: 'step-finish',
    reason,
    cost,
    tokens
})
)};
const _1ranta0 = function _createMessageWithParts(){return(
(info, parts = []) => ({
    info,
    parts
})
)};
const _8btq5q = function _addPart(){return(
(messageWithParts, part) => ({
    ...messageWithParts,
    parts: [
        ...messageWithParts.parts,
        part
    ]
})
)};
const _1bnwa7 = function _updatePart(){return(
(messageWithParts, partId, updates) => ({
    ...messageWithParts,
    parts: messageWithParts.parts.map(p => p.id === partId ? {
        ...p,
        ...updates
    } : p)
})
)};
const _1pduupv = function _createConversation(generateId){return(
({id} = {}) => ({
    id: id || generateId(),
    messages: [],
    created: Date.now()
})
)};
const _1s16m6w = function _addMessage(){return(
(conversation, messageWithParts) => ({
    ...conversation,
    messages: [
        ...conversation.messages,
        messageWithParts
    ]
})
)};
const _1r395mt = function _isToolPart(){return(
part => part?.type === 'tool'
)};
const _14ay9sa = function _updateToolPart(isToolPart){return(
(message, callId, updates) => ({
    ...message,
    parts: message.parts.map(p => isToolPart(p) && p.callId === callId ? {
        ...p,
        ...updates
    } : p)
})
)};
const _1itr11l = function _conversationToMessages(){return(
conversation => conversation.messages.map(msg => {
    const role = msg.info.role;
    if (role === 'user') {
        const textParts = msg.parts.filter(p => p.type === 'text');
        return {
            role: 'user',
            content: textParts.map(p => p.text).join('\n')
        };
    } else if (role === 'assistant') {
        return {
            role: 'assistant',
            parts: msg.parts
        };
    }
    return {
        role,
        content: ''
    };
})
)};
const _chojb4 = function _104(md){return(
md`### Context`
)};
const _t9j6rp = function _resolveRuntimeModules(globalRuntime,$0,moduleMap){return(
async (runtime) => {
  const rt = runtime ?? globalRuntime;

  if (rt === globalRuntime) {
    return $0.value;
  }

  return await moduleMap(rt);
}
)};
const _1v6ah4t = function _id()
{
  let guid = 0;
  return (v) => v.id || (v.id = guid++);
};
const _loz5om = function _cdata(){return(
(s) => `<![CDATA[${String(s).replaceAll("]]>", "]]]]><![CDATA[>")}]]>`
)};
const _18ecsrz = function _variablesXML(getPromiseStateCrossRealm,id,cdata,summarizeJS){return(
async (ctx, variables, { max_size = 500 } = {}) => {
  const modules = ctx?.moduleMap;
  const moduleNameOf = (mod) =>
    String(modules?.get(mod)?.name ?? mod?._name ?? "main").trim() || "main";

  const varNameOf = (v) => (typeof v?._name === "string" ? v._name : "");

  const fmtInput = (parentVar, inputVar) => {
    const inName = varNameOf(inputVar);
    if (!inName) return "";
    const parentModule = moduleNameOf(parentVar?._module);
    const inModule = moduleNameOf(inputVar?._module);
    return inModule && parentModule && inModule !== parentModule
      ? `${inModule}#${inName}`
      : inName;
  };

  const safeInputs = (v) =>
    (Array.isArray(v?._inputs) ? v._inputs : [])
      .map((i) => fmtInput(v, i))
      .filter(Boolean)
      .join(", ");

  return (
    await Promise.all(
      (Array.isArray(variables) ? variables : []).map(async (v) => {
        const modName = moduleNameOf(v._module);
        const inputs = safeInputs(v);
        const state = await getPromiseStateCrossRealm(v._promise);
        if (
          state.state === "rejected" &&
          state?.error?.name == "variable_stale"
        ) {
          state.state = "pending";
          state.error = undefined;
        }
        if (v._type == 2) return ""; // implicit filtered
        return `<variable${
          v?._name ? ` name="${v._name}"` : ""
        } module="${modName}" id="${id(v)}" state="${state.state}" version="${
          v?._version
        }" reachable="${v?._reachable}">
  <inputs>${inputs}</inputs>
  <definition>${cdata(v?._definition?.toString?.() ?? "")}></definition>
  <value>${cdata(summarizeJS(v?._value, { max_size }))}></value>${
          state.error
            ? `\n  <error>${cdata(
                summarizeJS(state.error, { max_size })
              )}></error>`
            : ""
        }
</variable>\n`;
      })
    )
  ).join("\n");
}
)};
const _1g25a47 = function _parseVariablesXML(DOMParser){return(
function parseVariablesXML(text) {
  text = `<root>${text}</root>`;
  const doc = new DOMParser().parseFromString(text, "application/xml");
  if (doc.getElementsByTagName("parsererror").length) {
    const err = doc.querySelector("parsererror");
    console.log(err.textContent);
    throw err;
  }
  debugger;
  return [...doc.documentElement.getElementsByTagName("variable")].map((el) => {
    const module = el.getAttribute("module") || "";
    const id = el.getAttribute("id") || "";
    const name = el.getAttribute("name") || null;

    const inputsText = el.querySelector("inputs")?.textContent?.trim() || "";
    const inputs = inputsText
      ? inputsText.split(/\s*,\s*/).filter(Boolean)
      : [];

    const definition = el.querySelector("definition")?.textContent || "";
    const value = el.querySelector("value")?.textContent || "";

    return { module, id, name, inputs, definition, value };
  });
}
)};
const _9ebmhf = function _robocoopPrototypeModule(thisModule){return(
thisModule()
)};
const _nb7cwj = (G, _) => G.input(_);
const _1dbkmib = function _idVariable(id,lookupVariable,robocoopPrototypeModule)
{
  id;
  return lookupVariable("id", robocoopPrototypeModule);
};
const _wftct5 = function _importVariable(lookupVariable,robocoopPrototypeModule){return(
lookupVariable("moduleMap", robocoopPrototypeModule)
)};
const _xosueu = function _113(currentModules,importVariable){return(
currentModules.get(importVariable._inputs[0]._module)
)};
const _20swo2 = async function _test_variablesXML_smoke(createToolContext,globalRuntime,variablesXML,idVariable)
{
  const ctx = await createToolContext({
    sessionId: "test",
    messageId: "test",
    agent: "assistant",
    callId: "test_list_variables_default_reachable_only",
    runtime: globalRuntime
  });
  return variablesXML(ctx, [idVariable]);
};
const _p4gbj0 = async function _test_variablesXML_importVariable(createToolContext,globalRuntime,variablesXML,importVariable)
{
  const ctx = await createToolContext({
    sessionId: "test",
    messageId: "test",
    agent: "assistant",
    callId: "test_list_variables_default_reachable_only",
    runtime: globalRuntime
  });
  const importDesc = await variablesXML(ctx, [importVariable]);
  if (!importDesc.includes("@tomlarkworthy/module-map#moduleMap"))
    throw "can't find import";

  return importDesc;
};
const _lbne0a = function _expected_error()
{
  throw "myError";
};
const _ot3ww8 = async function _test_variablesXML_erroredVariable(createToolContext,globalRuntime,lookupVariable,robocoopPrototypeModule,variablesXML)
{
  const ctx = await createToolContext({
    sessionId: "test",
    messageId: "test",
    agent: "assistant",
    callId: "test_list_variables_default_reachable_only",
    runtime: globalRuntime
  });
  const variable = await lookupVariable(
    "expected_error",
    robocoopPrototypeModule
  );
  const importDesc = await variablesXML(ctx, [variable]);
  if (!importDesc.includes("myError")) throw "can't find error";

  return importDesc;
};
const _1q8g6pa = function _test_parseVariablesXML_smoke(parseVariablesXML,test_variablesXML_smoke)
{
  return parseVariablesXML("yo" + test_variablesXML_smoke);
};
const _1fylrr9 = function _119(md){return(
md`## Tools

Note OpenAI: 'required' is required to be supplied and to be an array including every key in properties.`
)};
const _6wd73d = function _toolRegistry_ui(toolRegistry_recording,toolRegistry_history_limit,toolRegistry_stats,htl,toolRegistry_history_filtered,$0,$1,$2,$3){return(
(() => {
  const root = document.createElement("div");
  root.value = {
    recording: !!toolRegistry_recording,
    historyLimit: toolRegistry_history_limit,
    stats: toolRegistry_stats ?? null
  };

  root.style.display = "grid";
  root.style.gap = "12px";
  root.style.fontFamily =
    "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif";

  const css = htl.html`<style>
.tri-wrap{display:grid;gap:12px}
.tri-row{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
.tri-card{border:1px solid #e5e5e5;border-radius:10px;padding:10px;background:#fff}
.tri-title{font-weight:800;font-size:13px;color:#111;margin:0 0 8px 0;display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap}
.tri-meta{font-size:12px;color:#333;display:flex;gap:12px;flex-wrap:wrap}
.tri-small{font-size:12px;color:#444}
.tri-bars{display:grid;gap:6px}
.tri-bar{display:grid;grid-template-columns:220px 1fr 130px;gap:8px;align-items:center}
.tri-bar .label{font-size:12px;color:#111;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.tri-bar .barbg{height:10px;border-radius:999px;background:#f0f0f0;overflow:hidden;border:1px solid #ededed}
.tri-bar .barfg{height:100%;background:#2f6feb}
.tri-bar .nums{font-size:12px;color:#333;text-align:right}
.tri-table{width:100%;border-collapse:collapse;font-size:12px}
.tri-table th,.tri-table td{padding:6px 8px;border-bottom:1px solid #f0f0f0;vertical-align:top}
.tri-table th{color:#111;text-align:left;font-weight:700;background:#fafafa;position:sticky;top:0}
.tri-badge{display:inline-block;padding:2px 8px;border-radius:999px;border:1px solid #e5e5e5;background:#fafafa;font-size:11px;color:#333}
.tri-badge.err{border-color:#ffd7d7;background:#fff4f4;color:#8a0f0f}
.tri-pre{white-space:pre-wrap;word-break:break-word;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace;font-size:11px;line-height:1.35;background:#0b1020;color:#e9eefc;padding:10px;border-radius:8px;margin:0}
.tri-code{white-space:pre-wrap;word-break:break-word;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace;font-size:11px;line-height:1.35;background:#f7f7f8;padding:8px;border-radius:8px;margin:0;border:1px solid #ededed;color:#111}
.tri-details details{border:1px solid #e8e8e8;border-radius:10px;padding:8px 10px;background:#fff}
.tri-details summary{cursor:pointer;font-size:12px;color:#111}
.tri-muted{color:#666}
</style>`;

  const fmtPct = (x) => (Number.isFinite(x) ? (x * 100).toFixed(1) + "%" : "");
  const fmtMs = (x) => (Number.isFinite(x) ? Math.round(x) + "ms" : "");
  const fmtBytes = (x) => {
    const n = Number(x ?? 0);
    if (!Number.isFinite(n) || n <= 0) return "0 B";
    if (n < 1024) return `${Math.round(n)} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / (1024 * 1024)).toFixed(2)} MB`;
  };
  const fmtTime = (ms) =>
    Number.isFinite(ms) ? new Date(ms).toLocaleString() : "";

  const stats = toolRegistry_stats ?? {
    overall: { total: 0 },
    tools: [],
    maxCalls: 0
  };
  const overall = stats.overall ?? {};
  const tools = Array.isArray(stats.tools) ? stats.tools : [];
  const maxCalls = Math.max(1, Number(stats.maxCalls ?? 1));
  const filtered = Array.isArray(toolRegistry_history_filtered)
    ? toolRegistry_history_filtered
    : [];

  const header = htl.html`<div class="tri-card">
    <div class="tri-title">
      <div>toolRegistry inspector (global)</div>
      <div class="tri-row">
        <span class="tri-badge">${
          toolRegistry_recording ? "recording: on" : "recording: off"
        }</span>
        <span class="tri-badge">history limit: ${toolRegistry_history_limit}</span>
      </div>
    </div>
    <div class="tri-row">
      ${$0}
      ${$1}
      ${$2}
    </div>
    <div class="tri-row">
      ${$3}
    </div>
  </div>`;

  const summary = htl.html`<div class="tri-card">
    <div class="tri-title"><div>Summary</div><div class="tri-muted">All recorded calls</div></div>
    <div class="tri-meta">
      <div><b>Total calls</b>: ${overall.total ?? 0}</div>
      <div><b>Tools used</b>: ${overall.tools ?? 0}</div>
      <div><b>Error rate</b>: ${fmtPct(overall.errorRate ?? 0)} (${
    overall.errors ?? 0
  })</div>
      <div><b>Avg duration</b>: ${fmtMs(overall.avgDurationMs ?? 0)}</div>
      <div><b>Avg args size</b>: ${fmtBytes(overall.avgArgsBytes ?? 0)}</div>
      <div><b>Avg output size</b>: ${fmtBytes(
        overall.avgOutputBytes ?? 0
      )}</div>
      <div><b>Avg ctx metadata size</b>: ${fmtBytes(
        overall.avgCtxBytes ?? 0
      )}</div>
    </div>
  </div>`;

  const bars = htl.html`<div class="tri-card">
    <div class="tri-title"><div>Most used tools</div><div class="tri-muted">by call count</div></div>
    <div class="tri-bars">
      ${tools.slice(0, 20).map((t) => {
        const w = Math.max(0, Math.min(1, t.calls / maxCalls)) * 100;
        const badge = t.errors
          ? htl.html`<span class="tri-badge err">${fmtPct(
              t.errorRate
            )} err</span>`
          : htl.html`<span class="tri-badge">ok</span>`;
        return htl.html`<div class="tri-bar">
          <div class="label" title="${t.toolId}">${t.toolId}</div>
          <div class="barbg"><div class="barfg" style="width:${w}%"></div></div>
          <div class="nums">${t.calls} calls ${badge}</div>
        </div>`;
      })}
      ${
        tools.length === 0
          ? htl.html`<div class="tri-small">No calls recorded yet.</div>`
          : null
      }
    </div>
  </div>`;

  const toolTable = htl.html`<div class="tri-card" style="max-height: 420px; overflow:auto;">
    <div class="tri-title"><div>Tool stats</div><div class="tri-muted">all time</div></div>
    <table class="tri-table">
      <thead>
        <tr>
          <th style="width: 220px;">Tool</th>
          <th>Calls</th>
          <th>Errors</th>
          <th>Error rate</th>
          <th>Avg duration</th>
          <th>Avg args</th>
          <th>Avg output</th>
          <th>Avg ctx meta</th>
        </tr>
      </thead>
      <tbody>
        ${tools.map(
          (t) => htl.html`<tr>
          <td title="${t.toolId}">${t.toolId}</td>
          <td>${t.calls}</td>
          <td>${t.errors}</td>
          <td>${fmtPct(t.errorRate)}</td>
          <td>${fmtMs(t.avgDurationMs)}</td>
          <td>${fmtBytes(t.avgArgsBytes)}</td>
          <td>${fmtBytes(t.avgOutputBytes)}</td>
          <td>${fmtBytes(t.avgCtxBytes)}</td>
        </tr>`
        )}
        ${
          tools.length === 0
            ? htl.html`<tr><td colspan="8" class="tri-muted">No recorded calls yet.</td></tr>`
            : null
        }
      </tbody>
    </table>
  </div>`;

  const calls = htl.html`<div class="tri-card tri-details">
    <div class="tri-title"><div>Call history (filtered)</div><div class="tri-muted">${
      filtered.length
    } rows shown</div></div>
    <div style="display:grid; gap:10px;">
      ${filtered.map((r, idx) => {
        const ok = r.ok !== false;
        const badge = ok
          ? htl.html`<span class="tri-badge">ok</span>`
          : htl.html`<span class="tri-badge err">error</span>`;
        const ctx = r.ctx ?? {};
        const metaPreview = (() => {
          try {
            return JSON.stringify(ctx.metadata ?? {}, null, 2);
          } catch {
            return "";
          }
        })();
        const resMetaPreview = (() => {
          try {
            return JSON.stringify(r.resultMetadata ?? {}, null, 2);
          } catch {
            return "";
          }
        })();
        return htl.html`<details >
          <summary>
            ${badge}
            <b>${String(r.toolId ?? "")}</b>
            <span class="tri-muted">• ${fmtTime(r.time)} • ${fmtMs(
          r.durationMs
        )} • phase: ${String(r.phase ?? "")}</span>
          </summary>
          <div style="display:grid; gap:10px; margin-top:8px;">
            <div class="tri-meta">
              <div><b>callId</b>: ${String(ctx.callId ?? "")}</div>
              <div><b>sessionId</b>: ${String(ctx.sessionId ?? "")}</div>
              <div><b>messageId</b>: ${String(ctx.messageId ?? "")}</div>
              <div><b>agent</b>: ${String(ctx.agent ?? "")}</div>
              <div><b>args size</b>: ${fmtBytes(r.argsSize ?? 0)}</div>
              <div><b>output size</b>: ${fmtBytes(r.outputSize ?? 0)}</div>
              <div><b>ctx meta size</b>: ${fmtBytes(
                ctx.metadataSize ?? 0
              )}</div>
            </div>

            ${
              r.errorMessage
                ? htl.html`<div>
                  <div class="tri-small"><b>Error message</b></div>
                  <pre class="tri-pre">${String(r.errorMessage)}</pre>
                </div>`
                : null
            }

            <div>
              <div class="tri-small"><b>Args</b></div>
              <pre class="tri-code">${String(r.argsRaw ?? "") || "(none)"}</pre>
            </div>

            <div>
              <div class="tri-small"><b>Output</b></div>
              <pre class="tri-code">${String(r.output ?? "") || "(none)"}</pre>
            </div>

            <div>
              <div class="tri-small"><b>Result metadata</b></div>
              <pre class="tri-code">${resMetaPreview || "(none)"}</pre>
            </div>

            <div>
              <div class="tri-small"><b>Context metadata (ctx.metadata)</b></div>
              <pre class="tri-code">${metaPreview || "(none)"}</pre>
            </div>
          </div>
        </details>`;
      })}
      ${
        filtered.length === 0
          ? htl.html`<div class="tri-small">No matching calls. (Tip: enable recording, then run the agent or call tools.)</div>`
          : null
      }
    </div>
  </div>`;

  root.appendChild(css);
  root.appendChild(header);
  root.appendChild(summary);
  root.appendChild(bars);
  root.appendChild(toolTable);
  root.appendChild(calls);

  return root;
})()
)};
const _iuvmie = (G, _) => G.input(_);
const _dmhyth = function _defineTool(){return(
({id, description, parameters, execute}) => {
    if (!id || typeof id !== 'string')
        throw new Error('Tool must have a string id');
    if (!description || typeof description !== 'string')
        throw new Error('Tool must have a string description');
    if (!parameters || typeof parameters !== 'object')
        throw new Error('Tool must have a parameters object');
    if (!execute || typeof execute !== 'function')
        throw new Error('Tool must have an execute function');
    return {
        id,
        description,
        parameters,
        execute: async (args, ctx) => {
            try {
                if (ctx.abort?.aborted)
                    return {
                        title: id + ' aborted',
                        output: 'Execution was aborted',
                        metadata: { aborted: true }
                    };
                const result = await execute(args, ctx);
                return {
                    title: result.title || id + ' completed',
                    output: typeof result.output === 'string' ? result.output : JSON.stringify(result.output),
                    metadata: {
                        ...ctx.getMetadata?.() || {},
                        ...result.metadata
                    }
                };
            } catch (error) {
                return {
                    title: id + ' failed',
                    output: 'Error: ' + error.message,
                    metadata: {
                        error: true,
                        errorMessage: error.message
                    }
                };
            }
        }
    };
}
)};
const _1d14uja = function _createToolContext(globalRuntime,generateId,AbortController,resolveRuntimeModules){return(
async ({
  sessionId,
  messageId,
  agent,
  callId,
  abort,
  runtime = globalRuntime
}) => {
  let currentMetadata = {};
  return {
    sessionId,
    messageId,
    agent,
    callId: callId || generateId(),
    abort: abort || new AbortController().signal,
    runtime,
    metadata(update) {
      currentMetadata = {
        ...currentMetadata,
        ...update
      };
    },
    moduleMap: await resolveRuntimeModules(runtime),
    getMetadata() {
      return currentMetadata;
    }
  };
}
)};
const _1d08ll1 = function _validateParameters()
{
  const validate = (schema, value) => {
    const errors = [];
    if (!schema || typeof schema !== "object") return { valid: true, errors };

    const type = schema.type;

    if (type === "object") {
      if (typeof value !== "object" || value === null || Array.isArray(value)) {
        errors.push("Expected object");
        return { valid: false, errors };
      }

      const props = schema.properties || {};
      const required = Array.isArray(schema.required) ? schema.required : [];

      for (const field of required) {
        if (!(field in value)) errors.push("Missing required field: " + field);
      }

      if (schema.additionalProperties === false) {
        for (const k of Object.keys(value)) {
          if (!(k in props)) errors.push("Unexpected field: " + k);
        }
      }

      for (const [key, propSchema] of Object.entries(props)) {
        if (key in value) {
          const r = validate(propSchema, value[key]);
          if (!r.valid) errors.push(...r.errors.map((e) => key + ": " + e));
        }
      }
    } else if (type === "string") {
      if (typeof value !== "string") errors.push("Expected string, got " + typeof value);
    } else if (type === "number") {
      if (typeof value !== "number" || Number.isNaN(value)) errors.push("Expected number, got " + typeof value);
    } else if (type === "integer") {
      if (typeof value !== "number" || !Number.isInteger(value)) errors.push("Expected integer, got " + typeof value);
    } else if (type === "boolean") {
      if (typeof value !== "boolean") errors.push("Expected boolean, got " + typeof value);
    } else if (type === "array") {
      if (!Array.isArray(value)) errors.push("Expected array, got " + typeof value);
      else if (schema.items) {
        value.forEach((item, i) => {
          const r = validate(schema.items, item);
          if (!r.valid) errors.push(...r.errors.map((e) => "[" + i + "]: " + e));
        });
      }
    }

    return { valid: errors.length === 0, errors };
  };

  return validate;
};
const _1m7lf9f = function _createToolRegistry(toolRegistry_recording,$0,toolRegistry_history_limit,validateParameters){return(
() => {
  const tools = new Map();

  const normalizeSchema = (schema) => {
    if (!schema || typeof schema !== "object") return schema;
    if (Array.isArray(schema)) return schema.map(normalizeSchema);
    const s = { ...schema };

    const normalizeCombinators = (obj) => {
      if (Array.isArray(obj.anyOf)) obj.anyOf = obj.anyOf.map(normalizeSchema);
      if (Array.isArray(obj.oneOf)) obj.oneOf = obj.oneOf.map(normalizeSchema);
      if (Array.isArray(obj.allOf)) obj.allOf = obj.allOf.map(normalizeSchema);
      if (obj.not && typeof obj.not === "object")
        obj.not = normalizeSchema(obj.not);
    };

    const looksLikeObjectSchema =
      s.type === "object" ||
      !!s.properties ||
      !!s.required ||
      s.additionalProperties !== undefined;

    const looksLikeArraySchema =
      s.type === "array" ||
      s.items !== undefined ||
      s.prefixItems !== undefined;

    if (looksLikeObjectSchema) {
      if (!s.type) s.type = "object";
      if (s.additionalProperties === undefined) s.additionalProperties = false;

      if (
        s.properties &&
        typeof s.properties === "object" &&
        !Array.isArray(s.properties)
      ) {
        const props = {};
        for (const [k, v] of Object.entries(s.properties))
          props[k] = normalizeSchema(v);
        s.properties = props;
      }

      if (
        s.patternProperties &&
        typeof s.patternProperties === "object" &&
        !Array.isArray(s.patternProperties)
      ) {
        const pprops = {};
        for (const [k, v] of Object.entries(s.patternProperties))
          pprops[k] = normalizeSchema(v);
        s.patternProperties = pprops;
      }

      if (
        s.additionalProperties &&
        typeof s.additionalProperties === "object"
      ) {
        s.additionalProperties = normalizeSchema(s.additionalProperties);
      }

      normalizeCombinators(s);
      return s;
    }

    if (looksLikeArraySchema) {
      if (!s.type) s.type = "array";
      if (s.items !== undefined) s.items = normalizeSchema(s.items);
      if (Array.isArray(s.prefixItems))
        s.prefixItems = s.prefixItems.map(normalizeSchema);
      normalizeCombinators(s);
      return s;
    }

    normalizeCombinators(s);
    return s;
  };

  const normalizeTool = (tool) => ({
    ...tool,
    parameters: normalizeSchema(tool.parameters)
  });
  const toolEnabledForAnthropic = (t) =>
    !(t?.excludeFromAnthropic === true || t?.anthropic?.enabled === false);

  const safeStringify = (v, max = 200_000) => {
    let s = "";
    try {
      s = JSON.stringify(v);
    } catch {
      try {
        s = String(v);
      } catch {
        s = "";
      }
    }
    if (s.length > max)
      s = s.slice(0, max) + `… (${s.length - max} chars more)`;
    return s;
  };

  const pushHistory = (rec) => {
    if (!toolRegistry_recording) return;
    const arr = Array.isArray($0.value)
      ? $0.value
      : [];
    arr.push(rec);
    const limit = Math.max(
      50,
      Math.min(5000, Math.trunc(toolRegistry_history_limit || 1000))
    );
    if (arr.length > limit) arr.splice(0, arr.length - limit);
    $0.value = arr;
  };

  const baseCtxInfo = (ctx = {}) => {
    const meta = (() => {
      try {
        return ctx?.getMetadata?.() ?? {};
      } catch {
        return {};
      }
    })();
    const metaStr = safeStringify(meta, 200_000);
    return {
      sessionId: ctx?.sessionId ?? null,
      messageId: ctx?.messageId ?? null,
      agent: ctx?.agent ?? null,
      callId: ctx?.callId ?? null,
      metadata: meta,
      metadataSize: metaStr.length
    };
  };

  return {
    register(tool) {
      tools.set(tool.id, normalizeTool(tool));
    },
    unregister(id) {
      return tools.delete(id);
    },
    get(id) {
      return tools.get(id);
    },
    has(id) {
      return tools.has(id);
    },
    ids() {
      return [...tools.keys()];
    },
    all() {
      return [...tools.values()];
    },
    toAnthropicFormat() {
      return this.all()
        .filter(toolEnabledForAnthropic)
        .map((t) => ({
          name: t.id,
          description: t.description,
          input_schema: t.parameters
        }));
    },
    async execute(id, args, ctx) {
      const tool = tools.get(id);
      const startTime = Date.now();

      const ctxInfo = baseCtxInfo(ctx);
      const argsStr = safeStringify(args, 200_000);

      if (!tool) {
        const out = {
          title: "Tool not found",
          output: "Unknown tool: " + id,
          metadata: { error: true }
        };
        pushHistory({
          time: startTime,
          durationMs: Date.now() - startTime,
          toolId: id,
          ok: false,
          phase: "lookup",
          args,
          argsRaw: argsStr,
          argsSize: argsStr.length,
          output: out.output,
          outputSize: String(out.output ?? "").length,
          title: out.title,
          errorMessage: out.output,
          resultMetadata: out.metadata,
          ctx: ctxInfo
        });
        return out;
      }

      const validation = validateParameters(tool.parameters, args);
      if (!validation.valid) {
        const out = {
          title: "Invalid parameters",
          output:
            `Parameter validation failed (${id}):\n` +
            validation.errors.join("\n"),
          metadata: { error: true, validationErrors: validation.errors }
        };
        pushHistory({
          time: startTime,
          durationMs: Date.now() - startTime,
          toolId: id,
          ok: false,
          phase: "validation",
          args,
          argsRaw: argsStr,
          argsSize: argsStr.length,
          output: out.output,
          outputSize: String(out.output ?? "").length,
          title: out.title,
          errorMessage: out.output,
          resultMetadata: out.metadata,
          ctx: ctxInfo
        });
        return out;
      }

      let result;
      try {
        result = await tool.execute(args, ctx);
      } catch (e) {
        const msg = String(e?.message ?? e);
        const out = {
          title: `${id} failed`,
          output: "Error: " + msg,
          metadata: { error: true, errorMessage: msg }
        };
        pushHistory({
          time: startTime,
          durationMs: Date.now() - startTime,
          toolId: id,
          ok: false,
          phase: "execute_throw",
          args,
          argsRaw: argsStr,
          argsSize: argsStr.length,
          output: out.output,
          outputSize: String(out.output ?? "").length,
          title: out.title,
          errorMessage: msg,
          resultMetadata: out.metadata,
          ctx: ctxInfo
        });
        return out;
      }

      const endTime = Date.now();
      const outStr = String(result?.output ?? "");
      const isError = !!result?.metadata?.error;

      pushHistory({
        time: startTime,
        durationMs: endTime - startTime,
        toolId: id,
        ok: !isError,
        phase: "execute",
        args,
        argsRaw: argsStr,
        argsSize: argsStr.length,
        output: outStr,
        outputSize: outStr.length,
        title: String(result?.title ?? ""),
        errorMessage: isError
          ? String(result?.metadata?.errorMessage ?? result?.output ?? "")
          : null,
        resultMetadata: result?.metadata ?? null,
        ctx: ctxInfo
      });

      return result;
    }
  };
}
)};
const _n6vbu7 = function _125(md){return(
md`## Tool history`
)};
const _1999fd4 = function _toolRegistry_history(){return(
[]
)};
const _n9bkek = (M, _) => new M(_);
const _1qtyjo9 = _ => _.generator;
const _1yj673i = function _toolRegistry_recording(Inputs){return(
Inputs.toggle({
  label: "Record tool calls (global)",
  value: true
})
)};
const _9q3gpp = (G, _) => G.input(_);
const _1pwkr2c = function _toolRegistry_history_limit(Inputs){return(
Inputs.range([50, 5000], {
  label: "History limit",
  step: 50,
  value: 1000
})
)};
const _jpksjy = (G, _) => G.input(_);
const _hu78z5 = function _toolRegistry_tool_ids(toolRegistry_sync,toolRegistry){return(
toolRegistry_sync,
toolRegistry
  .ids()
  .map(String)
  .filter(Boolean)
  .sort((a, b) => a.localeCompare(b))
)};
const _30c6cx = function _toolRegistry_inspector_controls(Inputs,toolRegistry_tool_ids){return(
Inputs.form({
  tool: Inputs.select(["(all)", ...toolRegistry_tool_ids], {
    label: "Tool",
    value: "(all)"
  }),
  onlyErrors: Inputs.toggle({ label: "Only errors", value: false }),
  query: Inputs.text({
    label: "Search (args/output/metadata)",
    width: "100%",
    value: ""
  }),
  maxRows: Inputs.number({
    label: "Max rows",
    min: 10,
    max: 1000,
    step: 10,
    value: 200
  })
})
)};
const _1nrksh0 = (G, _) => G.input(_);
const _1ecpmyz = function _toolRegistry_clear_history(Inputs){return(
Inputs.button("Clear tool call history", {
  value: 0,
  reduce: (v) => v + 1
})
)};
const _5l2x28 = (G, _) => G.input(_);
const _1hwylqm = function _toolRegistry_clear_history_effect(toolRegistry_clear_history,$0){return(
toolRegistry_clear_history &&
  (($0.value = []), toolRegistry_clear_history)
)};
const _1j6b2ie = function _toolRegistry_history_filtered(toolRegistry_inspector_controls,toolRegistry_history){return(
(() => {
  const controls = toolRegistry_inspector_controls ?? {};
  const tool = String(controls.tool ?? "(all)");
  const onlyErrors = !!controls.onlyErrors;
  const q = String(controls.query ?? "")
    .trim()
    .toLowerCase();
  const maxRows = Math.max(
    10,
    Math.min(1000, Math.trunc(controls.maxRows ?? 200))
  );

  const rows = Array.isArray(toolRegistry_history) ? toolRegistry_history : [];
  const filtered = [];
  for (let i = rows.length - 1; i >= 0; i--) {
    const r = rows[i];
    if (!r || typeof r !== "object") continue;
    if (tool !== "(all)" && String(r.toolId ?? "") !== tool) continue;
    if (onlyErrors && r.ok !== false) continue;

    if (q) {
      const hay = [
        r.toolId,
        r.title,
        r.phase,
        r.errorMessage,
        r.argsRaw,
        typeof r.output === "string"
          ? r.output.slice(0, 10000)
          : String(r.output ?? ""),
        (() => {
          try {
            return JSON.stringify(r.resultMetadata ?? {});
          } catch {
            return "";
          }
        })()
      ]
        .join("\n")
        .toLowerCase();
      if (!hay.includes(q)) continue;
    }

    filtered.push(r);
    if (filtered.length >= maxRows) break;
  }

  return filtered;
})()
)};
const _v1tbsl = function _toolRegistry_stats(toolRegistry_history){return(
(() => {
  const rows = Array.isArray(toolRegistry_history) ? toolRegistry_history : [];
  const byTool = new Map();

  let total = 0;
  let error = 0;
  let durSum = 0;
  let argsSum = 0;
  let outSum = 0;
  let ctxSum = 0;

  for (const r of rows) {
    if (!r || typeof r !== "object") continue;
    total++;
    const toolId = String(r.toolId ?? "");
    const ok = r.ok !== false;
    if (!ok) error++;
    durSum += Number(r.durationMs ?? 0);
    argsSum += Number(r.argsSize ?? 0);
    outSum += Number(r.outputSize ?? 0);
    ctxSum += Number(r.ctx?.metadataSize ?? 0);

    const entry = byTool.get(toolId) ?? {
      toolId,
      calls: 0,
      errors: 0,
      durationMsSum: 0,
      argsSizeSum: 0,
      outputSizeSum: 0,
      ctxSizeSum: 0
    };
    entry.calls++;
    if (!ok) entry.errors++;
    entry.durationMsSum += Number(r.durationMs ?? 0);
    entry.argsSizeSum += Number(r.argsSize ?? 0);
    entry.outputSizeSum += Number(r.outputSize ?? 0);
    entry.ctxSizeSum += Number(r.ctx?.metadataSize ?? 0);
    byTool.set(toolId, entry);
  }

  const tools = [...byTool.values()]
    .map((t) => ({
      ...t,
      errorRate: t.calls ? t.errors / t.calls : 0,
      avgDurationMs: t.calls ? t.durationMsSum / t.calls : 0,
      avgArgsBytes: t.calls ? t.argsSizeSum / t.calls : 0,
      avgOutputBytes: t.calls ? t.outputSizeSum / t.calls : 0,
      avgCtxBytes: t.calls ? t.ctxSizeSum / t.calls : 0
    }))
    .sort((a, b) => b.calls - a.calls || a.toolId.localeCompare(b.toolId));

  const overall = {
    total,
    tools: tools.length,
    errors: error,
    errorRate: total ? error / total : 0,
    avgDurationMs: total ? durSum / total : 0,
    avgArgsBytes: total ? argsSum / total : 0,
    avgOutputBytes: total ? outSum / total : 0,
    avgCtxBytes: total ? ctxSum / total : 0
  };

  const maxCalls = tools.reduce((m, t) => Math.max(m, t.calls), 0);

  return { overall, tools, maxCalls };
})()
)};
const _ikwtvy = function _135(md){return(
md`## Tool Implementation`
)};
const _1m4ecqa = function _allTools(variableTools,runtimeTools){return(
[...variableTools, ...runtimeTools]
)};
const _kif9g0 = function _137(md){return(
md`### variable tools`
)};
const _cj9gn8 = function _variableTools(listVariablesTool,upsertVariablesTool,deleteVariableTool){return(
[listVariablesTool, upsertVariablesTool, deleteVariableTool]
)};
const _d5tu99 = function _139(md){return(
md`#### listVariables`
)};
const _a9m1b6 = function _listVariablesTool(defineTool,variablesXML){return(
defineTool({
  id: "list_variables",
  description:
    "List runtime variables as canonical <variable> XML for a module.",
  parameters: {
    type: "object",
    properties: {
      module: { type: "string", description: "Module name to list." }
    },
    required: ["module"],
    additionalProperties: false
  },
  execute: async (args, ctx) => {
    const runtime = ctx?.runtime;
    if (!runtime)
      return {
        title: "list_variables",
        output: "Error: Observable runtime not found",
        metadata: { error: true }
      };

    const requestedModule = String(args?.module ?? "");
    const modules = ctx?.moduleMap;

    const moduleNameOf = (mod, info) =>
      String((info?.name ?? mod?._name ?? "") || "").trim();

    const availableModules = (() => {
      try {
        if (!(modules instanceof Map)) return [];
        const names = [];
        for (const [mod, info] of modules.entries()) {
          const n = moduleNameOf(mod, info);
          if (n) names.push(n);
        }
        return Array.from(new Set(names)).sort((a, b) => a.localeCompare(b));
      } catch {
        return [];
      }
    })();

    let targetModule = null;
    if (modules instanceof Map) {
      for (const [mod, info] of modules.entries()) {
        if (moduleNameOf(mod, info) === requestedModule) {
          targetModule = mod;
          break;
        }
      }
    }

    if (!targetModule) {
      const hint = `Module not found: "${requestedModule}". A module must be chosen.`;

      const sample = availableModules.slice(0, 25);
      return {
        title: "list_variables failed",
        output:
          `Error: ${hint}\n` +
          `Requested module: "${requestedModule}"\n` +
          (availableModules.length
            ? `Available modules (sample):\n` +
              sample.map((d) => `- ${d}`).join("\n")
            : `Available modules: (unavailable)`),
        metadata: {
          error: true,
          notFound: true,
          needsModuleSelection: true,
          requestedModule,
          availableModules
        }
      };
    }

    const vars = [];
    for (const v of runtime._variables) {
      if (v._module !== targetModule) continue;
      if (v._name?.startsWith("dynamic ")) continue; // blows context up, TODO, surface them a better way
      vars.push(v);
    }

    const xml = await variablesXML(ctx, vars);
    return {
      title: `list_variables (${vars.length} variables)`,
      output: xml,
      metadata: {
        count: vars.length,
        module: requestedModule
      }
    };
  }
})
)};
const _1iv2352 = function _test_listVariablesTool(globalRuntime,createToolContext,resolveRuntimeModules,listVariablesTool,summarizeJS){return(
(async () => {
  const runtime = globalRuntime;
  const debug = {
    when: new Date().toISOString(),
    tool: "list_variables",
    requested: { module: "main" },
    runtime: {
      exists: !!runtime,
      variablesType: runtime
        ? Object.prototype.toString.call(runtime._variables)
        : null,
      variablesIsIterable: runtime
        ? !!(
            runtime._variables &&
            typeof runtime._variables[Symbol.iterator] === "function"
          )
        : null,
      variablesLength:
        runtime && Array.isArray(runtime._variables)
          ? runtime._variables.length
          : null
    }
  };

  let ctx;
  try {
    ctx = await createToolContext({
      sessionId: "test",
      messageId: "test",
      agent: "assistant",
      callId: "test_listVariablesTool_lopecode_debug",
      runtime
    });
  } catch (e) {
    debug.phase = "createToolContext";
    debug.error = { message: String(e?.message ?? e), name: e?.name ?? null };
    throw new Error(
      "listVariablesTool debug (createToolContext failed)\n" +
        JSON.stringify(debug, null, 2)
    );
  }

  let modules;
  try {
    modules = await resolveRuntimeModules(runtime);
    const moduleNamesSample = [];
    if (modules instanceof Map) {
      for (const [mod, info] of modules.entries()) {
        const name =
          String((info?.name ?? mod?._name ?? "main") || "main").trim() ||
          "main";
        moduleNamesSample.push(name);
        if (moduleNamesSample.length >= 50) break;
      }
    }
    debug.modules = {
      resolvedType: Object.prototype.toString.call(modules),
      isMap: modules instanceof Map,
      size: typeof modules?.size === "number" ? modules.size : null,
      namesSample: moduleNamesSample
    };
  } catch (e) {
    debug.phase = "resolveRuntimeModules";
    debug.error = { message: String(e?.message ?? e), name: e?.name ?? null };
    throw new Error(
      "listVariablesTool debug (resolveRuntimeModules failed)\n" +
        JSON.stringify(debug, null, 2)
    );
  }

  try {
    const hasMain =
      modules instanceof Map &&
      (() => {
        for (const [mod, info] of modules.entries()) {
          const n = String((info?.name ?? mod?._name ?? "") || "").trim();
          if (n === "main") return true;
        }
        return false;
      })();

    debug.detected = { hasMain };

    const r = await listVariablesTool.execute({ module: "main" }, ctx);

    debug.result = {
      title: String(r?.title ?? ""),
      hasMetadataError: !!r?.metadata?.error,
      metadata: r?.metadata ?? null,
      outputPreview: summarizeJS(String(r?.output ?? ""), { max_size: 2000 })
    };

    if (hasMain) {
      if (r?.metadata?.error) throw new Error("tool returned metadata.error");
      if (!String(r?.output ?? "").includes("<variable"))
        throw new Error('unexpected output: missing "<variable"');
      return "pass";
    } else {
      if (!r?.metadata?.error)
        throw new Error("expected tool to error when main module is missing");
      const out = String(r?.output ?? "").toLowerCase();
      if (
        !(
          out.includes("module must be chosen") ||
          out.includes("needs") ||
          out.includes("choose")
        )
      )
        throw new Error(
          "expected error output to signal module selection requirement"
        );
      return "pass";
    }
  } catch (e) {
    debug.phase = debug.phase || "execute";
    debug.error = { message: String(e?.message ?? e), name: e?.name ?? null };
    debug.stack = String(e?.stack ?? "");
    throw new Error(
      "listVariablesTool debug\n" + JSON.stringify(debug, null, 2)
    );
  }
})()
)};
const _19tynaq = function _142(md){return(
md`#### upsertVariables`
)};
const _10sy5ct = function _upsertVariablesTool(defineTool,parseVariablesXML,resolveRuntimeModules,realize,variablesXML,$0,Event){return(
defineTool({
  id: "upsert_variables",
  description:
    "Bulk upsert runtime variables from canonical <variable> XML. Updates by id when possible; can create when allow_create=true.",
  parameters: {
    type: "object",
    properties: {
      xml: {
        type: "string",
        description: "XML string containing one or more <variable> elements"
      }
    },
    required: ["xml"],
    additionalProperties: false
  },
  execute: async (args, ctx) => {
    const runtime = ctx.runtime;
    if (!runtime)
      return {
        title: "upsert_variables",
        output: "Error: Observable runtime not found",
        metadata: { error: true }
      };

    const xml = String(args?.xml ?? "");
    let specs;
    try {
      specs = parseVariablesXML(xml);
    } catch (e) {
      return {
        title: "upsert_variables failed",
        output: "Error: Invalid XML: " + (e?.message ?? String(e)),
        metadata: { error: true }
      };
    }

    const modules = await resolveRuntimeModules(runtime);
    const moduleByName = new Map();
    for (const [mod, info] of modules.entries()) {
      const modName = (info?.name ?? mod?._name ?? "main").trim() || "main";
      if (!moduleByName.has(modName)) moduleByName.set(modName, mod);
    }

    const resolveModuleByName = (requested) => {
      const r = String(requested ?? "").trim();
      if (!r)
        return (
          moduleByName.get("main") ?? [...moduleByName.values()][0] ?? null
        );
      if (moduleByName.has(r)) return moduleByName.get(r);
      for (const [n, m] of moduleByName.entries())
        if (n.includes(r) || r.includes(n)) return m;
      return null;
    };

    const findVarById = (id) => {
      const want = String(id ?? "");
      if (!want) return null;
      for (const v of runtime._variables) {
        if (!v) continue;
        if (v.id !== undefined && String(v.id) === want) return v;
      }
      return null;
    };

    const normalizeInputName = (name) => {
      const s = String(name ?? "").trim();
      if (!s) return "";
      const i = s.lastIndexOf("#");
      return i >= 0 ? s.slice(i + 1).trim() : s;
    };

    const errors = [];
    const variables = [];
    for (const s of Array.isArray(specs) ? specs : []) {
      const modName = s.module;
      const targetModule = resolveModuleByName(modName);
      if (!targetModule) {
        errors.push({
          id: s.id ?? "",
          name: s.name ?? null,
          module: modName,
          status: "error",
          error: "Module not found: " + modName
        });
        continue;
      }

      const idStr = String(s.id ?? "");
      const name = s.name === null ? null : String(s.name ?? "");
      const inputs = (Array.isArray(s.inputs) ? s.inputs : [])
        .map(normalizeInputName)
        .filter((d) => String(d).trim());

      const defSrc = String(s.definition ?? "");
      let fn;
      try {
        fn = (await realize([defSrc], runtime))[0];
      } catch (e) {
        errors.push({
          id: idStr,
          name,
          module: modName,
          status: "error",
          error: "Bad definition: " + (e?.message ?? String(e))
        });
        continue;
      }

      let v = findVarById(idStr);
      if (!v) v = targetModule.variable({});
      try {
        v.define(name, inputs, fn);
        variables.push(v);
      } catch (e) {
        errors.push({
          id: idStr,
          name,
          module: modName,
          status: "error",
          error: e?.message ?? String(e)
        });
      }
    }

    runtime._computeNow();
    await new Promise((r) => setTimeout(r, 500));

    const output =
      (await variablesXML(ctx, variables)) +
      "\n" +
      errors
        .map((r) => {
          const nm = r.name === null ? "(anonymous)" : r.name || "(unnamed)";
          const idp = r.id ? `id=${r.id}` : "id=?";
          const st = r.status || "unknown";
          const err =
            r.status === "error"
              ? ` :: ${r.error || "error"}`
              : r.hasError
              ? ` :: ${r.error || "error"}`
              : "";
          return `${r.module || "main"}#${nm} ${idp} [${st}]${err}`;
        })
        .join("\n");

    $0.value = variables;
    $0.dispatchEvent(new Event("input"));
    return {
      title: `upsert_variables (${variables.length} variables upserted, ${errors.length} errors)`,
      output: output,
      metadata: {
        count: variables.length,
        errors
      }
    };
  }
})
)};
const _1rzqjgn = function _lastUpserts(Inputs){return(
Inputs.input()
)};
const _116zd4i = (G, _) => G.input(_);
const _373aki = async function _test_upsertVariablesTool_imports(test_tools_createModuleTool_registers_in_list_modules,globalRuntime,createToolContext,upsertVariablesTool)
{
  test_tools_createModuleTool_registers_in_list_modules;
  const runtime = globalRuntime;
  const ctx = await createToolContext({
    sessionId: "test",
    messageId: "test",
    agent: "assistant",
    callId: "test_upsertVariablesTool_imports",
    runtime
  });

  const moduleByName = (name) => {
    const mods = ctx.moduleMap;
    if (!(mods instanceof Map)) return null;
    for (const [mod, info] of mods.entries()) {
      const n = String(info?.name ?? mod?._name ?? "").trim();
      if (n === name) return mod;
    }
    return null;
  };

  const mainModule = moduleByName("@robocoop/test-module");
  if (!mainModule) throw new Error("main module not found");

  const varName = "toObject";
  const existing = mainModule._scope?.get?.(varName) ?? null;

  const xml = `<variables>
    <variable name="module @tomlarkworthy/runtime-sdk" module="@robocoop/test-module">
      <definition><![CDATA[async () => runtime.module((await import("@tomlarkworthy/runtime-sdk")).default)]]></definition>
    </variable>
    <variable name="someSymbol" module="@robocoop/test-module">
      <inputs>module @tomlarkworthy/runtime-sdk, @variable</inputs>
      <definition><![CDATA[(_, v) => v.import("toObject", _)]]></definition>
    </variable>
  </variables>`;

  const result = await upsertVariablesTool.execute({ xml }, ctx);

  return result;
};
const _13zh25u = function _146(lastUpserts)
{
  lastUpserts;
  debugger;
};
const _1dtp7we = function _147(test_upsertVariablesTool_imports){return(
test_upsertVariablesTool_imports.output
)};
const _1tttis7 = function _148(md){return(
md`## scrap`
)};
const _8vv2jr = function _m(thisModule){return(
thisModule()
)};
const _1g26e0p = (G, _) => G.input(_);
const _1ltak8r = function _v(m){return(
m.variable()
)};
const _xilgz9 = function _acornModule(currentModules){return(
[...currentModules.values()].find((m) => m.name.includes("acorn"))
)};
const _jqhs99 = function _foreignInput(acornModule){return(
acornModule.module._scope.get("acorn")
)};
const _1ogqt7g = function _153(md){return(
md`#### deleteVariables`
)};
const _1hkg126 = function _deleteVariableTool(defineTool){return(
defineTool({
  id: "delete_variable",
  description:
    'Delete a runtime variable from the notebook runtime. Supports deleting named variables by name, and anonymous variables by id (pass the numeric id, as shown in list_variables/search_variables, in the "name" field).',
  parameters: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description:
          "Variable name OR numeric variable id (from list_variables/search_variables). To delete an anonymous variable, pass its id here."
      }
    },
    required: ["name"]
  },
  execute: async (args, ctx) => {
    const runtime = ctx?.runtime;
    const needleRaw = String(args?.name ?? "");
    const needle = needleRaw.trim();

    if (!runtime) {
      return {
        title: "Delete variable: " + needle,
        output: "Error: Observable runtime not found",
        metadata: { error: true }
      };
    }

    if (!needle) {
      return {
        title: "Delete variable",
        output: 'Error: "name" is required (variable name or numeric id)',
        metadata: { error: true }
      };
    }

    const looksLikeId = /^\d+$/.test(needle);
    const matches = (v) => {
      if (!v || typeof v !== "object") return false;
      if (looksLikeId) return v.id !== undefined && String(v.id) === needle;
      return v._name === needle;
    };

    for (const v of runtime._variables) {
      if (matches(v)) {
        const deleted = {
          id: v.id !== undefined ? String(v.id) : null,
          name: typeof v._name === "string" ? v._name : null,
          lookedUpBy: looksLikeId ? "id" : "name"
        };
        v.delete();
        return {
          title: "Delete variable: " + needle,
          output:
            `Deleted variable (${deleted.lookedUpBy}="${needle}")` +
            (deleted.name ? ` name="${deleted.name}"` : " (anonymous)") +
            (deleted.id ? ` id=${deleted.id}` : ""),
          metadata: deleted
        };
      }
    }

    return {
      title: "Delete variable: " + needle,
      output: looksLikeId
        ? `Error: Variable not found by id: ${needle}`
        : `Error: Variable not found by name: ${needle}`,
      metadata: { error: true, lookedUpBy: looksLikeId ? "id" : "name" }
    };
  }
})
)};
const _78868y = function _test_deleteVariableTool_deletes_anonymous_by_id(test_tools_createModuleTool_registers_in_list_modules,createToolContext,globalRuntime,id,deleteVariableTool){return(
(async () => {
  test_tools_createModuleTool_registers_in_list_modules;
  const ctx = await createToolContext({
    sessionId: "test",
    messageId: "test",
    agent: "assistant",
    callId: "test_deleteVariableTool_deletes_anonymous_by_id",
    runtime: globalRuntime
  });

  const mainModule = (() => {
    const mods = ctx.moduleMap;
    if (!(mods instanceof Map)) return null;
    for (const [mod, info] of mods.entries()) {
      const n = String(info?.name ?? mod?._name ?? "").trim();
      if (n === "@robocoop/test-module") return mod;
    }
    return null;
  })();

  if (!mainModule) throw new Error("main module not found");

  const v = mainModule.variable({});
  v.define(null, [], () => "temp");
  id(v);

  if (typeof v.id !== "number" && !/^\d+$/.test(String(v.id)))
    throw new Error("expected anonymous variable to have an id");

  const varId = String(v.id);

  const res = await deleteVariableTool.execute({ name: varId }, ctx);
  if (res?.metadata?.error)
    throw new Error("delete_variable failed: " + res.output);
  if (res?.metadata?.lookedUpBy !== "id")
    throw new Error(
      "expected lookedUpBy=id, got: " + JSON.stringify(res?.metadata)
    );

  const stillThere = (() => {
    const vars = globalRuntime._variables;
    if (vars && typeof vars.has === "function") return vars.has(v);
    for (const x of vars) if (x === v) return true;
    return false;
  })();

  if (stillThere)
    throw new Error("expected variable to be deleted from runtime");

  return "pass";
})()
)};
const _xnachk = function _156(md){return(
md`#### runtime tools`
)};
const _t5hro = function _runtimeTools(listModulesTool,createModuleTool,runTestsTool,evalTool,searchVariablesTool){return(
[
  listModulesTool,
  createModuleTool,
  runTestsTool,
  evalTool,
  searchVariablesTool
]
)};
const _1bfpani = function _listModulesTool(defineTool,resolveRuntimeModules){return(
defineTool({
  id: "list_modules",
  description: "List all modules loaded in the notebook runtime.",
  parameters: { type: "object", properties: {}, required: [] },
  execute: async (_args, ctx) => {
    const runtime = ctx.runtime;

    if (!runtime) {
      return {
        title: "List modules",
        output: "Error: Observable runtime not found",
        metadata: { error: true }
      };
    }

    const modules = await resolveRuntimeModules(runtime);

    const counts = new Map();
    for (const [mod, info] of modules.entries()) {
      const name = (info?.name ?? mod?._name ?? "main").trim() || "main";
      counts.set(mod, { name, variables: 0, title: info.title });
    }

    for (const v of runtime._variables) {
      if (!v?._module || !v?._name) continue;
      const entry = counts.get(v._module);
      if (entry) entry.variables++;
    }

    const moduleList = [...counts.values()].sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    return {
      title: "List modules (" + moduleList.length + " found)",
      output: moduleList
        .map((m) => `${m.name} (${m.variables} variables) '${m.title}'`)
        .join("\n"),
      metadata: { count: moduleList.length, modules: moduleList }
    };
  }
})
)};
const _f8xwou = async function _test_listModulesTool_smoke(createToolContext,globalRuntime,listModulesTool)
{
  const ctx = await createToolContext({
    sessionId: "test",
    messageId: "test",
    agent: "assistant",
    callId: "test_tools_createModuleTool_registers_in_list_modules",
    runtime: globalRuntime
  });
  return (await listModulesTool.execute({}, ctx)).output;
};
const _145iwtr = function _createModuleTool(defineTool,resolveRuntimeModules){return(
defineTool({
  id: "create_module",
  description: "Create a new module in the notebook runtime with a given name.",
  parameters: {
    type: "object",
    properties: {
      name: { type: "string", description: 'Name of the module to create (e.g. "my-module").' },
      allow_existing: {
        type: "boolean",
        description: "If true, return ok when a module with this name already exists."
      }
    },
    required: ["name", "allow_existing"],
    additionalProperties: false
  },
  execute: async (args, ctx) => {
    const runtime = ctx.runtime;
    if (!runtime) {
      return {
        title: "create_module",
        output: "Error: Observable runtime not found",
        metadata: { error: true }
      };
    }

    const name = String(args?.name ?? "").trim();
    const allowExisting = !!args?.allow_existing;

    if (!name) {
      return {
        title: "create_module",
        output: "Error: name is required",
        metadata: { error: true }
      };
    }

    const ensureMains = () => {
      if (runtime.mains instanceof Map) return runtime.mains;
      const m = new Map();
      try {
        if (runtime.mains && typeof runtime.mains === "object") {
          for (const [k, v] of Object.entries(runtime.mains)) m.set(k, v);
        }
      } catch {}
      runtime.mains = m;
      return m;
    };

    const modules = await resolveRuntimeModules(runtime);
    const moduleNameOf = (mod, info) => String((info?.name ?? mod?._name ?? "main") || "main").trim() || "main";

    for (const [mod, info] of modules.entries()) {
      if (moduleNameOf(mod, info) === name) {
        if (!allowExisting) {
          return {
            title: `create_module (${name})`,
            output: `Error: Module already exists: ${name}`,
            metadata: { error: true, exists: true, name }
          };
        }
        try {
          ensureMains().set(name, mod);
        } catch {}
        return {
          title: `create_module (${name})`,
          output: `Module already exists: ${name}`,
          metadata: { name, exists: true }
        };
      }
    }

    let mod;
    try {
      mod = runtime.module(() => {}, null);
    } catch (e) {
      return {
        title: `create_module (${name})`,
        output: "Error: Failed to create module: " + String(e?.message ?? e),
        metadata: { error: true }
      };
    }

    try {
      mod._name = name;
    } catch {}

    try {
      ensureMains().set(name, mod);
    } catch {}

    try {
      modules.set(mod, { ...(modules.get(mod) ?? {}), name });
    } catch {}

    try {
      if (ctx.moduleMap && typeof ctx.moduleMap.set === "function") {
        ctx.moduleMap.set(mod, { ...(ctx.moduleMap.get(mod) ?? {}), name });
      }
    } catch {}

    return {
      title: `create_module (${name})`,
      output: `Created module: ${name}`,
      metadata: { name, exists: false }
    };
  }
})
)};
const _1olpigk = function _test_tools_createModuleTool_registers_in_list_modules(createToolContext,globalRuntime,createModuleTool,moduleMap,$0,Event,listModulesTool){return(
(async () => {
  const ctx = await createToolContext({
    sessionId: "test",
    messageId: "test",
    agent: "assistant",
    callId: "test_tools_createModuleTool_registers_in_list_modules",
    runtime: globalRuntime
  });

  const name = "@robocoop/test-module";

  const r = await createModuleTool.execute({ name, allow_existing: true }, ctx);
  if (r?.metadata?.error) throw new Error("create_module failed: " + r.output);

  const latest = await moduleMap(globalRuntime);
  $0.value = latest;
  $0.dispatchEvent(new Event("input"));
  await new Promise((res) => setTimeout(res, 0));

  const lm = await listModulesTool.execute({}, ctx);
  if (lm?.metadata?.error) throw new Error("list_modules failed: " + lm.output);

  if (!String(lm.output ?? "").includes(`${name} (`)) {
    throw new Error(
      "expected module to appear in list_modules output; got:\n" + lm.output
    );
  }

  return "pass";
})()
)};
const _115puzb = function _runTestsTool(defineTool){return(
defineTool({
  id: "run_tests",
  description:
    "Run all reachable test_* variables in the notebook and return results.",
  parameters: {
    type: "object",
    properties: {
      filter: {
        type: "string",
        description: 'Filter to match test names. Use "" to run all tests.'
      }
    },
    required: ["filter"],
    additionalProperties: false
  },
  execute: async (args, ctx) => {
    const filter = String(args?.filter ?? "");
    const runtime = ctx.runtime;
    if (!runtime) {
      return {
        title: "Run tests",
        output: "Error: Observable runtime not found",
        metadata: { error: true }
      };
    }
    const testVars = [];
    for (const v of runtime._variables) {
      if (!v?._reachable) continue;
      if (typeof v._name === "string" && v._name.startsWith("test_")) {
        if (filter && !v._name.includes(filter)) continue;
        testVars.push(v);
      }
    }
    if (testVars.length === 0) {
      return {
        title: "Run tests",
        output: filter
          ? `No reachable tests found matching "${filter}"`
          : "No reachable test_* variables found",
        metadata: { count: 0 }
      };
    }
    const results = testVars.map((v) => ({
      name: v._name,
      reachable: !!v._reachable,
      hasValue: v._value !== undefined,
      hasError: v._error !== undefined,
      value: v._value !== undefined ? String(v._value).slice(0, 100) : null,
      error: v._error?.message
    }));
    const passed = results.filter((r) => r.hasValue && !r.hasError).length;
    const failed = results.filter((r) => r.hasError).length;
    const pending = results.length - passed - failed;
    const symbol = (r) =>
      r.hasError ? "\u2717 " : r.hasValue ? "\u2713 " : "\u2026 ";
    return {
      title: `Run tests (${passed}/${results.length} passed${
        pending ? `, ${pending} pending` : ""
      })`,
      output: results
        .map((r) => symbol(r) + r.name + (r.error ? ": " + r.error : ""))
        .join("\n"),
      metadata: { total: results.length, passed, failed, pending, results }
    };
  }
})
)};
const _1fueqt3 = function _evalTool(defineTool,globalRuntime,resolveRuntimeModules,getPromiseStateCrossRealm,summarizeJS){return(
defineTool({
  id: "eval",
  description:
    "Evaluate a JavaScript expression, optionally scoped to a runtime variable by {module, variable_id_or_name}. If the expression evaluates to a function, it will be applied to the variable value; otherwise the expression result is returned. In all cases, the final result is summarized with summarizeJS. Can be used for exploring state, DOM context, and simulating interactions",
  parameters: {
    type: "object",
    properties: {
      code: {
        type: "string",
        description:
          "JavaScript expression to evaluate (may evaluate to a function)."
      },
      module: {
        type: "string",
        description:
          'Module name to scope variable lookup to (e.g. "main"). Use "" to auto-resolve by name (prefers main when ambiguous).'
      },
      variable_id_or_name: {
        type: "string",
        description:
          'Runtime variable identifier. If it looks like an integer, treated as an internal variable id; otherwise treated as a variable name. Use "" for no target variable.'
      }
    },
    required: ["code", "module", "variable_id_or_name"],
    additionalProperties: false
  },
  execute: async (args, ctx) => {
    const runtime = ctx?.runtime ?? globalRuntime;
    if (!runtime) {
      return {
        title: "Eval",
        output: "Error: Observable runtime not found",
        metadata: { error: true }
      };
    }

    const TIMEOUT_MS = 30_000;

    const withTimeout = async (
      promiseLike,
      { label = "operation", signal } = {}
    ) => {
      const p = Promise.resolve(promiseLike);

      let timer = null;
      const timeout = new Promise((_, reject) => {
        timer = setTimeout(() => {
          reject(
            new Error(
              `Eval ${label} timed out after ${Math.round(TIMEOUT_MS / 1000)}s`
            )
          );
        }, TIMEOUT_MS);
      });

      const aborted = signal
        ? new Promise((_, reject) => {
            if (signal.aborted) reject(new Error(`Eval ${label} aborted`));
            else
              signal.addEventListener(
                "abort",
                () => reject(new Error(`Eval ${label} aborted`)),
                { once: true }
              );
          })
        : null;

      try {
        return await Promise.race(
          aborted ? [p, timeout, aborted] : [p, timeout]
        );
      } finally {
        if (timer !== null) clearTimeout(timer);
      }
    };

    const code = String(args?.code ?? "");
    const moduleRequestedRaw = String(args?.module ?? "");
    const idOrNameRaw = String(args?.variable_id_or_name ?? "");

    const modules = await resolveRuntimeModules(runtime);
    const moduleNameOf = (mod) =>
      (modules.get(mod)?.name ?? mod?._name ?? "main").trim() || "main";

    const moduleByName = new Map();
    for (const [mod, info] of modules.entries()) {
      const modName = (info?.name ?? mod?._name ?? "main").trim() || "main";
      if (!moduleByName.has(modName)) moduleByName.set(modName, mod);
    }

    const resolveModuleByName = (requested) => {
      const r = String(requested ?? "").trim();
      if (!r) return null;
      if (moduleByName.has(r)) return moduleByName.get(r);
      for (const [n, m] of moduleByName.entries())
        if (n.includes(r) || r.includes(n)) return m;
      return null;
    };

    const findVarById = (idStr) => {
      const want = String(idStr ?? "").trim();
      if (!want) return null;
      for (const v of runtime._variables) {
        if (!v) continue;
        if (v.id !== undefined && String(v.id) === want) return v;
      }
      return null;
    };

    const findVarByNameInModule = (name, targetModule) => {
      if (!targetModule) return null;
      try {
        if (targetModule._scope?.has(name)) {
          const candidate = targetModule._scope.get(name);
          if (candidate && runtime._variables?.has(candidate)) return candidate;
        }
      } catch {}
      for (const v of runtime._variables)
        if (v?._name === name && v?._module === targetModule) return v;
      return null;
    };

    const autoResolveVarByName = (name) => {
      const matches = [];
      for (const v of runtime._variables)
        if (v?._name === name) matches.push(v);
      const reachable = matches.filter((v) => v?._reachable);
      const candidates = reachable.length ? reachable : matches;

      const mainModule = moduleByName.get("main") ?? null;
      const mainVar = mainModule
        ? findVarByNameInModule(name, mainModule)
        : null;
      if (mainVar) return { v: mainVar, resolvedModuleName: "main" };

      if (candidates.length === 1)
        return {
          v: candidates[0],
          resolvedModuleName: moduleNameOf(candidates[0]._module)
        };
      if (candidates.length === 0) return { v: null, resolvedModuleName: null };

      const mods = Array.from(
        new Set(candidates.map((v) => moduleNameOf(v._module)))
      ).sort();
      return {
        v: null,
        resolvedModuleName: null,
        ambiguous: true,
        modules: mods
      };
    };

    const readVarValue = async (v) => {
      if (!v) return { state: "fulfilled", value: undefined };
      if (v._error !== undefined) return { state: "rejected", error: v._error };
      if (v._value !== undefined)
        return { state: "fulfilled", value: v._value };

      let snap;
      try {
        snap = await withTimeout(getPromiseStateCrossRealm(v._promise), {
          label: "getPromiseState",
          signal: ctx?.abort
        });
      } catch (e) {
        return { state: "rejected", error: e };
      }

      if (snap?.state === "fulfilled" && "fulfilled" in snap)
        return { state: "fulfilled", value: snap.fulfilled };
      if (snap?.state === "rejected")
        return { state: "rejected", error: snap.rejected };
      return { state: "pending" };
    };

    let targetVar = null;
    let resolvedModuleName = null;

    const idOrName = idOrNameRaw.trim();
    if (idOrName) {
      const looksLikeId = /^\d+$/.test(idOrName);
      if (looksLikeId) {
        targetVar = findVarById(idOrName);
        if (!targetVar) {
          return {
            title: "Eval",
            output: `Error: Variable id not found: ${idOrName}`,
            metadata: {
              error: true,
              notFound: true,
              kind: "id",
              variable_id_or_name: idOrName
            }
          };
        }
        resolvedModuleName = moduleNameOf(targetVar._module);
        const moduleRequested = moduleRequestedRaw.trim();
        if (moduleRequested) {
          const targetModule = resolveModuleByName(moduleRequested);
          if (!targetModule) {
            return {
              title: "Eval",
              output: `Error: Module not found: ${moduleRequested}`,
              metadata: { error: true, notFound: true, module: moduleRequested }
            };
          }
          if (targetVar._module !== targetModule) {
            return {
              title: "Eval",
              output: `Error: Variable id ${idOrName} exists in module "${resolvedModuleName}", not in requested module "${moduleNameOf(
                targetModule
              )}".`,
              metadata: {
                error: true,
                moduleMismatch: true,
                resolvedModule: resolvedModuleName,
                requestedModule: moduleNameOf(targetModule),
                variable_id_or_name: idOrName
              }
            };
          }
        }
      } else {
        const moduleRequested = moduleRequestedRaw.trim();
        if (moduleRequested) {
          const targetModule = resolveModuleByName(moduleRequested);
          if (!targetModule) {
            return {
              title: "Eval",
              output: `Error: Module not found: ${moduleRequested}`,
              metadata: { error: true, notFound: true, module: moduleRequested }
            };
          }
          resolvedModuleName = moduleNameOf(targetModule);
          targetVar = findVarByNameInModule(idOrName, targetModule);
          if (!targetVar) {
            return {
              title: "Eval",
              output: `Error: Variable not found in module ${resolvedModuleName}: ${idOrName}`,
              metadata: {
                error: true,
                notFound: true,
                module: resolvedModuleName,
                name: idOrName
              }
            };
          }
        } else {
          const auto = autoResolveVarByName(idOrName);
          if (auto?.ambiguous) {
            return {
              title: "Eval",
              output:
                `Error: Ambiguous variable name "${idOrName}" exists in multiple modules.\n` +
                `Provide {module}. Candidates:\n` +
                (auto.modules ?? []).map((m) => `- ${m}`).join("\n"),
              metadata: {
                error: true,
                ambiguous: true,
                name: idOrName,
                modules: auto.modules ?? []
              }
            };
          }
          targetVar = auto.v;
          resolvedModuleName = auto.resolvedModuleName;
          if (!targetVar) {
            return {
              title: "Eval",
              output: `Error: Variable not found: ${idOrName}`,
              metadata: { error: true, notFound: true, name: idOrName }
            };
          }
        }
      }
    }

    const valueState = await readVarValue(targetVar);
    if (valueState.state === "pending") {
      return {
        title: "Eval",
        output: "pending",
        metadata: {
          pending: true,
          state: "pending",
          module: resolvedModuleName,
          variable_id_or_name: idOrName || null
        }
      };
    }
    if (valueState.state === "rejected") {
      const msg = String(
        valueState.error?.message ?? valueState.error ?? "Unknown error"
      );
      return {
        title: "Eval",
        output: "Error: " + msg,
        metadata: {
          error: true,
          state: "rejected",
          errorMessage: msg,
          module: resolvedModuleName,
          variable_id_or_name: idOrName || null
        }
      };
    }

    const targetValue = valueState.value;
    const moduleObj = targetVar?._module ?? null;

    const expr = code.trim();
    if (!expr) {
      return {
        title: "Eval",
        output: summarizeJS(targetValue, { max_size: 1000 }),
        metadata: {
          type: typeof targetValue,
          applied: false,
          module: resolvedModuleName,
          variable_id_or_name: idOrName || null
        }
      };
    }

    let evaluated;
    try {
      evaluated = new Function(
        "value",
        "variable",
        "module",
        "runtime",
        `return (${expr});`
      )(targetValue, targetVar, moduleObj, runtime);
    } catch (e) {
      return {
        title: "Eval",
        output: "Error: " + (e?.message ?? String(e)),
        metadata: {
          error: true,
          phase: "parse_eval",
          variable_id_or_name: idOrName || null,
          module: resolvedModuleName
        }
      };
    }

    let result = evaluated;
    let applied = false;

    if (typeof evaluated === "function") {
      applied = true;
      try {
        result = evaluated(targetValue, {
          variable: targetVar,
          module: moduleObj,
          moduleName: resolvedModuleName,
          runtime,
          ctx
        });
        if (result && typeof result.then === "function") {
          result = await withTimeout(result, {
            label: "function result",
            signal: ctx?.abort
          });
        }
      } catch (e) {
        return {
          title: "Eval",
          output: "Error: " + (e?.message ?? String(e)),
          metadata: {
            error: true,
            phase: "apply",
            variable_id_or_name: idOrName || null,
            module: resolvedModuleName
          }
        };
      }
    } else if (evaluated && typeof evaluated.then === "function") {
      try {
        result = await withTimeout(evaluated, {
          label: "promise result",
          signal: ctx?.abort
        });
      } catch (e) {
        return {
          title: "Eval",
          output: "Error: " + (e?.message ?? String(e)),
          metadata: {
            error: true,
            phase: "await",
            variable_id_or_name: idOrName || null,
            module: resolvedModuleName
          }
        };
      }
    }

    return {
      title: "Eval",
      output: summarizeJS(result, { max_size: 1000 }),
      metadata: {
        type: typeof result,
        applied,
        module: resolvedModuleName,
        variable_id_or_name: idOrName || null
      }
    };
  }
})
)};
const _z3l63x = function _test_tools_evalTool_expression_no_target(createToolContext,globalRuntime,evalTool){return(
(async () => {
  const ctx = await createToolContext({
    sessionId: "test",
    messageId: "test",
    agent: "assistant",
    callId: "test_tools_evalTool_expression_no_target",
    runtime: globalRuntime
  });
  const r = await evalTool.execute(
    { code: "1+2", module: "", variable_id_or_name: "" },
    ctx
  );
  if (r.metadata?.error) throw new Error("unexpected error: " + r.output);
  if (String(r.output).trim() !== "3")
    throw new Error("expected 3, got: " + r.output);
  return "pass";
})()
)};
const _1v0u9wr = function _robocoop3_random_value(){return(
"a"
)};
const _esgxrm = function _test_tools_evalTool_apply_function_to_variable_value(createToolContext,globalRuntime,test_search_variables_includes_module,evalTool){return(
(async () => {
  const ctx = await createToolContext({
    sessionId: "test",
    messageId: "test",
    agent: "assistant",
    callId: "test_tools_evalTool_apply_function_to_variable_value",
    runtime: globalRuntime
  });
  const match = test_search_variables_includes_module.metadata.matches.find(
    (m) => m.name == "robocoop3_random_value"
  );
  const r = await evalTool.execute(
    {
      code: "(v)=>v.toUpperCase()",
      module: match.module,
      variable_id_or_name: "robocoop3_random_value"
    },
    ctx
  );
  if (r.metadata?.error) throw new Error("unexpected error: " + r.output);
  if (!String(r.output).includes("A"))
    throw new Error("expected A in output, got: " + r.output);
  return "pass";
})()
)};
const _p6rf7f = function _searchVariablesTool(defineTool,resolveRuntimeModules,variablesXML){return(
defineTool({
  id: "search_variables",
  description:
    "Search runtime variables (including anonymous variables) for text in name/definition/string-value, and return matches as canonical <variable> XML. Returns at most 100 matches.",
  parameters: {
    type: "object",
    properties: {
      query: { type: "string", description: "Text to search for" },
      limit: {
        type: "number",
        description:
          "Maximum number of results (clamped to 100; use 20 if unsure)"
      }
    },
    required: ["query", "limit"],
    additionalProperties: false
  },
  execute: async (args, ctx) => {
    const query = String(args?.query ?? "");
    const queryTrim = query.trim();
    const rawLimit = Number.isFinite(args?.limit) ? args.limit : 20;
    const limit = Math.max(1, Math.min(100, Math.trunc(rawLimit || 20)));

    const runtime = ctx.runtime;
    if (!runtime) {
      return {
        title: "Search variables: " + queryTrim,
        output: "",
        metadata: { error: true }
      };
    }

    if (!queryTrim) {
      return {
        title: "Search variables",
        output: "",
        metadata: { count: 0, matches: [] }
      };
    }

    const modules = await resolveRuntimeModules(runtime);
    const moduleNameFor = (v) =>
      (modules.get(v?._module)?.name ?? v?._module?._name ?? "main").trim() ||
      "main";

    const q = queryTrim.toLowerCase();
    const matches = [];
    const vars = [];

    for (const v of runtime._variables) {
      if (!v || typeof v !== "object") continue;

      let matchReason = null;

      if (typeof v._name === "string" && v._name.toLowerCase().includes(q)) {
        matchReason = "name";
      }

      if (
        !matchReason &&
        v._definition &&
        typeof v._definition === "function"
      ) {
        const defStr = v._definition.toString();
        if (defStr.toLowerCase().includes(q)) matchReason = "definition";
      }

      if (!matchReason && typeof v._value === "string") {
        if (v._value.toLowerCase().includes(q)) matchReason = "value";
      }

      if (!matchReason) continue;

      matches.push({
        module: moduleNameFor(v),
        name: typeof v._name === "string" ? v._name : null,
        matchReason,
        hasValue: v._value !== undefined,
        hasError: v._error !== undefined,
        reachable: !!v._reachable
      });

      vars.push(v);

      if (matches.length >= limit) break;
    }

    if (matches.length === 0) {
      return {
        title: `Search variables: ${queryTrim} (0 found)`,
        output: "",
        metadata: { count: 0, matches: [] }
      };
    }

    const xml = await variablesXML(ctx, vars);

    return {
      title: `Search variables: ${queryTrim} (${matches.length} found)`,
      output: xml,
      metadata: { count: matches.length, limit, matches }
    };
  }
})
)};
const _qcz8b2 = function _test_search_variables_includes_module(createToolContext,globalRuntime,searchVariablesTool){return(
(async () => {
  const ctx = await createToolContext({
    sessionId: "test",
    messageId: "test",
    agent: "assistant",
    callId: "test_search_variables_includes_module",
    runtime: globalRuntime
  });

  const r = await searchVariablesTool.execute(
    { query: "robocoop3_random_value", limit: 10 },
    ctx
  );
  const matches = r?.metadata?.matches ?? [];
  if (!Array.isArray(matches) || matches.length === 0)
    throw new Error("expected at least one match");

  const first = matches[0];
  if (typeof first.module !== "string" || !first.module.length)
    throw new Error("expected match to include module");
  if (typeof first.name !== "string" || !first.name.length)
    throw new Error("expected match to include name");

  return r;
})()
)};
const _gsfkxc = function _169(md){return(
md`## Dependancies`
)};
const _1pxvi2c = function _181(robocoop2){return(
robocoop2()
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  main.define("module @tomlarkworthy/dataflow-templating", async () => runtime.module((await import("/@tomlarkworthy/dataflow-templating.js?v=4")).default));  
  main.define("module @tomlarkworthy/cell-map", async () => runtime.module((await import("/@tomlarkworthy/cell-map.js?v=4")).default));  
  main.define("module @tomlarkworthy/runtime-sdk", async () => runtime.module((await import("/@tomlarkworthy/runtime-sdk.js?v=4")).default));  
  main.define("module @tomlarkworthy/robocoop-2", async () => runtime.module((await import("/@tomlarkworthy/robocoop-2.js?v=4")).default));  
  main.define("module @tomlarkworthy/summarizejs", async () => runtime.module((await import("/@tomlarkworthy/summarizejs.js?v=4")).default));  
  main.define("module @tomlarkworthy/module-map", async () => runtime.module((await import("/@tomlarkworthy/module-map.js?v=4")).default));  
  main.define("module @tomlarkworthy/reversible-attachment", async () => runtime.module((await import("/@tomlarkworthy/reversible-attachment.js?v=4")).default));  
  main.define("module @tomlarkworthy/local-storage-view", async () => runtime.module((await import("/@tomlarkworthy/local-storage-view.js?v=4")).default));  
  main.define("module @tomlarkworthy/modern-screenshot", async () => runtime.module((await import("/@tomlarkworthy/modern-screenshot.js?v=4")).default));  
  main.define("module @tomlarkworthy/tabbed-pane-view", async () => runtime.module((await import("/@tomlarkworthy/tabbed-pane-view.js?v=4")).default));  
  main.define("module @tomlarkworthy/cells-to-clipboard", async () => runtime.module((await import("/@tomlarkworthy/cells-to-clipboard.js?v=4")).default));  
  main.define("module @tomlarkworthy/jest-expect-standalone", async () => runtime.module((await import("/@tomlarkworthy/jest-expect-standalone.js?v=4")).default));  
  $def("_d9uon", null, ["md"], _d9uon);  
  $def("_44imqp", "viewof agent1", ["robocoop3"], _44imqp);  
  $def("_15hle7w", "agent1", ["Generators","viewof agent1"], _15hle7w);  
  $def("_ptqen6", null, ["md"], _ptqen6);  
  $def("_1u9wjf7", null, ["agent1"], _1u9wjf7);  
  $def("_asr0a9", null, ["md"], _asr0a9);  
  $def("_zqurm1", null, ["md"], _zqurm1);  
  $def("_2c6sxx", null, ["md"], _2c6sxx);  
  $def("_nwu", "robocoop3", ["keepalive","robocoopPrototypeModule","globalRuntime","cloneDataflow","robocoop_template","Node","Event"], _nwu);  
  $def("_15zxmxk", null, ["md"], _15zxmxk);  
  $def("_1mcb7sx", "system_prompt", [], _1mcb7sx);  
  $def("_jjm5vh", null, ["md"], _jjm5vh);  
  $def("_1s6xri5", "test_cell_map_coverage", ["expect","coverage_failures"], _1s6xri5);  
  $def("_19qjyyf", null, ["md"], _19qjyyf);  
  main.define("cloneDataflow", ["module @tomlarkworthy/dataflow-templating", "@variable"], (_, v) => v.import("cloneDataflow", _));  
  $def("_40kz45", "robocoop_template", ["lookupVariable","robocoopPrototypeModule"], _40kz45);  
  $def("_1bwnjz6", null, ["currentModules"], _1bwnjz6);  
  $def("_6zal67", null, ["md"], _6zal67);  
  $def("_1hudkog", "viewof robocoopPrototype", ["reversibleAttach","agent_ui_attached","viewof agent_prompt","viewof agent_clear","viewof agent_cancel","agent_conversation_view_holder","provider_choice","viewof provider_choice","viewof OPENAI_API_KEY","viewof provider_openai_config","viewof ANTHROPIC_API_KEY","viewof provider_anthropic_config","viewof provider_ollama_config","viewof agent_config","tabbedPane"], _1hudkog);  
  $def("_1ksl7rz", "robocoopPrototype", ["Generators","viewof robocoopPrototype"], _1ksl7rz);  
  $def("_10yp4ck", "viewof agent_ui_attached", ["Inputs"], _10yp4ck);  
  $def("_1bv69gv", "agent_ui_attached", ["Generators","viewof agent_ui_attached"], _1bv69gv);  
  $def("_k57m4b", null, ["md"], _k57m4b);  
  $def("_ye4mf2", "viewof agent_prompt", ["Inputs"], _ye4mf2);  
  $def("_12sswg8", "agent_prompt", ["Generators","viewof agent_prompt"], _12sswg8);  
  $def("_13gul30", "agent_run_effect", ["agent_prompt","agent_run"], _13gul30);  
  $def("_15ymwb0", "agent_cancel_effect", ["agent_cancel","agent_loop"], _15ymwb0);  
  $def("_8se49j", "viewof agent_cancel", ["Inputs"], _8se49j);  
  $def("_1x0jouc", "agent_cancel", ["Generators","viewof agent_cancel"], _1x0jouc);  
  $def("_uma9in", "viewof agent_clear", ["Inputs"], _uma9in);  
  $def("_1k6ne31", "agent_clear", ["Generators","viewof agent_clear"], _1k6ne31);  
  $def("_1t399yr", "agent_clear_effect", ["agent_clear","agent_loop","mutable agent_records","mutable agent_run_history"], _1t399yr);  
  $def("_vuyf8q", null, ["md"], _vuyf8q);  
  $def("_uwazgz", "viewof agent_runtime", ["Inputs","globalRuntime"], _uwazgz);  
  $def("_1ii7jms", "agent_runtime", ["Generators","viewof agent_runtime"], _1ii7jms);  
  $def("_1x1wwbn", "robocoopPrototype_record_stream", ["agent_records"], _1x1wwbn);  
  $def("_siy9ji", "initial agent_records", [], _siy9ji);  
  $def("_1kjerjw", "mutable agent_records", ["Mutable","initial agent_records"], _1kjerjw);  
  $def("_whxah1", "agent_records", ["mutable agent_records"], _whxah1);  
  $def("_5hhwzi", "appendAgentRecord", [], _5hhwzi);  
  $def("_86st4i", "initial agent_run_history", [], _86st4i);  
  $def("_1se6tds", "mutable agent_run_history", ["Mutable","initial agent_run_history"], _1se6tds);  
  $def("_19z4j7p", "agent_run_history", ["mutable agent_run_history"], _19z4j7p);  
  $def("_1y32ocm", "agentConversationFromRecords", [], _1y32ocm);  
  $def("_1wz9dgr", "agent_conversation", ["agent_records","agentConversationFromRecords","agent_run_history","agent_reply","agent_stop"], _1wz9dgr);  
  $def("_1jqhc1q", "css", ["htl"], _1jqhc1q);  
  $def("_16mud80", "agent_conversation_dom_sync", ["agent_conversation_view_holder","agent_conversation_view"], _16mud80);  
  $def("_4fqtvp", "agent_conversation_view_holder", ["html"], _4fqtvp);  
  $def("_1rd5yya", "agent_conversation_view", ["agent_conversation","htl","css"], _1rd5yya);  
  $def("_1nri9eq", null, ["md"], _1nri9eq);  
  $def("_1k620hr", "open_ai_models", [], _1k620hr);  
  $def("_1ot5a8w", "anthropic_models", [], _1ot5a8w);  
  $def("_168tpk", null, ["md"], _168tpk);  
  $def("_1yjgsol", "viewof provider_choice", ["Inputs","localStorageView"], _1yjgsol);  
  $def("_1602t8v", "provider_choice", ["Generators","viewof provider_choice"], _1602t8v);  
  $def("_ueb3sx", "viewof OPENAI_API_KEY", ["Inputs","localStorageView"], _ueb3sx);  
  $def("_13dv669", "OPENAI_API_KEY", ["Generators","viewof OPENAI_API_KEY"], _13dv669);  
  $def("_640etn", "viewof ANTHROPIC_API_KEY", ["Inputs","localStorageView"], _640etn);  
  $def("_1d0e65t", "ANTHROPIC_API_KEY", ["Generators","viewof ANTHROPIC_API_KEY"], _1d0e65t);  
  $def("_bidkyf", null, ["md"], _bidkyf);  
  $def("_1c9o4q7", "viewof provider_openai_config", ["Inputs","open_ai_models","localStorageView"], _1c9o4q7);  
  $def("_10fi4vv", "provider_openai_config", ["Generators","viewof provider_openai_config"], _10fi4vv);  
  $def("_1ybrwry", "openaiProvider", [], _1ybrwry);  
  $def("_1d53m35", "streamOpenAIChatCompletionsBlocks", ["parseSSEStream"], _1d53m35);  
  $def("_1p39qqk", "createOpenAIOpencodeLoop", ["openaiProvider","AbortController","streamOpenAIResponseBlocks","createToolContext"], _1p39qqk);  
  $def("_1g6pj1v", null, ["md"], _1g6pj1v);  
  $def("_14z3lei", "viewof provider_anthropic_config", ["Inputs","anthropic_models","localStorageView"], _14z3lei);  
  $def("_1rui5df", "provider_anthropic_config", ["Generators","viewof provider_anthropic_config"], _1rui5df);  
  $def("_1u47z2", "anthropicProvider", [], _1u47z2);  
  $def("_imurdq", "createAnthropicOpencodeLoop", ["anthropicProvider","AbortController","createToolContext","streamAnthropicBlocks"], _imurdq);  
  $def("_1qs7gkk", "viewof provider_ollama_config", ["Inputs","localStorageView"], _1qs7gkk);  
  $def("_1ke2qcj", "provider_ollama_config", ["Generators","viewof provider_ollama_config"], _1ke2qcj);  
  $def("_1770tiy", null, ["md"], _1770tiy);  
  $def("_e906tj", "ollamaProvider", [], _e906tj);  
  $def("_fy9v7f", "createOllamaOpencodeLoop", ["ollamaProvider","AbortController","streamOpenAIChatCompletionsBlocks","createToolContext"], _fy9v7f);  
  $def("_nqiwrb", null, ["md"], _nqiwrb);  
  $def("_1pw3ef2", "viewof agent_config", ["Inputs","system_prompt"], _1pw3ef2);  
  $def("_sbwfmg", "agent_config", ["Generators","viewof agent_config"], _sbwfmg);  
  $def("_yvpex5", "agent_loop", ["provider_choice","createOpenAIOpencodeLoop","agent_system_prompt","toolRegistry","provider_openai_config","agent_config","agent_runtime","OPENAI_API_KEY","createAnthropicOpencodeLoop","ANTHROPIC_API_KEY","provider_anthropic_config","createOllamaOpencodeLoop","provider_ollama_config"], _yvpex5);  
  $def("_16nr8tq", "normalizeUsage", [], _16nr8tq);  
  $def("_1hkgk3r", "test_normalizeUsage_openai_chat_completions_usage", ["normalizeUsage"], _1hkgk3r);  
  $def("_1bz1j8w", null, ["md"], _1bz1j8w);  
  $def("_1gd3kuv", null, ["md"], _1gd3kuv);  
  $def("_1erle28", null, ["md"], _1erle28);  
  $def("_1d4xopf", "agent_target_module", [], _1d4xopf);  
  $def("_6ye93e", "agent_system_prompt", ["agent_config","agent_target_module","provider_choice"], _6ye93e);  
  $def("_1exebr2", "agent_run", ["generateId","mutable agent_records","provider_choice","mutable agent_run_history","appendAgentRecord","agent_loop","normalizeUsage"], _1exebr2);  
  $def("_pzqwpp", "test_appendAgentRecord_coalesces_text", ["appendAgentRecord"], _pzqwpp);  
  $def("_gso0rx", "test_appendAgentRecord_coalesces_tool_use_delta_by_id", ["appendAgentRecord"], _gso0rx);  
  $def("_11pt84b", "agent_reply", ["agent_run"], _11pt84b);  
  $def("_1ancakz", "agent_stop", ["agent_loop"], _1ancakz);  
  $def("_d34r72", "streamOpenAIResponseBlocks", ["parseSSEStream"], _d34r72);  
  $def("_10faqo9", "toolRegistry", ["createToolRegistry"], _10faqo9);  
  $def("_wz74j2", "toolRegistry_sync", ["toolRegistry","allTools"], _wz74j2);  
  $def("_4pvjq4", "streamAnthropicBlocks", ["parseSSEStream"], _4pvjq4);  
  $def("_ojkt4w", "generateId", [], _ojkt4w);  
  $def("_111q5dd", "createUserMessage", ["generateId"], _111q5dd);  
  $def("_fpcpcn", "createAssistantMessage", ["generateId"], _fpcpcn);  
  $def("_1flybnh", "test_opencode_generateId", ["generateId"], _1flybnh);  
  $def("_yogx18", "test_opencode_createUserMessage", ["createUserMessage"], _yogx18);  
  $def("_w0romk", "test_opencode_createAssistantMessage", ["createAssistantMessage"], _w0romk);  
  $def("_lwyssi", "createTextPart", ["generateId"], _lwyssi);  
  $def("_xtar8h", "createReasoningPart", ["generateId"], _xtar8h);  
  $def("_ubzmdd", "toolStatePending", [], _ubzmdd);  
  $def("_1nyakwd", "toolStateRunning", [], _1nyakwd);  
  $def("_19r834o", "toolStateCompleted", [], _19r834o);  
  $def("_14nwhb7", "toolStateError", [], _14nwhb7);  
  $def("_1h1hbws", "createToolPart", ["generateId"], _1h1hbws);  
  $def("_f7aqlh", "parseSSEStream", [], _f7aqlh);  
  $def("_syt75v", "streamAnthropic", ["parseSSEStream"], _syt75v);  
  $def("_16zwjk", "completeAssistantMessage", [], _16zwjk);  
  $def("_mkz7zm", "createStepStartPart", ["generateId"], _mkz7zm);  
  $def("_176g0t7", "createStepFinishPart", ["generateId"], _176g0t7);  
  $def("_1ranta0", "createMessageWithParts", [], _1ranta0);  
  $def("_8btq5q", "addPart", [], _8btq5q);  
  $def("_1bnwa7", "updatePart", [], _1bnwa7);  
  $def("_1pduupv", "createConversation", ["generateId"], _1pduupv);  
  $def("_1s16m6w", "addMessage", [], _1s16m6w);  
  $def("_1r395mt", "isToolPart", [], _1r395mt);  
  $def("_14ay9sa", "updateToolPart", ["isToolPart"], _14ay9sa);  
  $def("_1itr11l", "conversationToMessages", [], _1itr11l);  
  $def("_chojb4", null, ["md"], _chojb4);  
  $def("_t9j6rp", "resolveRuntimeModules", ["globalRuntime","viewof currentModules","moduleMap"], _t9j6rp);  
  $def("_1v6ah4t", "id", [], _1v6ah4t);  
  $def("_loz5om", "cdata", [], _loz5om);  
  $def("_18ecsrz", "variablesXML", ["getPromiseStateCrossRealm","id","cdata","summarizeJS"], _18ecsrz);  
  $def("_1g25a47", "parseVariablesXML", ["DOMParser"], _1g25a47);  
  $def("_9ebmhf", "viewof robocoopPrototypeModule", ["thisModule"], _9ebmhf);  
  $def("_nb7cwj", "robocoopPrototypeModule", ["Generators","viewof robocoopPrototypeModule"], _nb7cwj);  
  $def("_1dbkmib", "idVariable", ["id","lookupVariable","robocoopPrototypeModule"], _1dbkmib);  
  $def("_wftct5", "importVariable", ["lookupVariable","robocoopPrototypeModule"], _wftct5);  
  $def("_xosueu", null, ["currentModules","importVariable"], _xosueu);  
  $def("_20swo2", "test_variablesXML_smoke", ["createToolContext","globalRuntime","variablesXML","idVariable"], _20swo2);  
  $def("_p4gbj0", "test_variablesXML_importVariable", ["createToolContext","globalRuntime","variablesXML","importVariable"], _p4gbj0);  
  $def("_lbne0a", "expected_error", [], _lbne0a);  
  $def("_ot3ww8", "test_variablesXML_erroredVariable", ["createToolContext","globalRuntime","lookupVariable","robocoopPrototypeModule","variablesXML"], _ot3ww8);  
  $def("_1q8g6pa", "test_parseVariablesXML_smoke", ["parseVariablesXML","test_variablesXML_smoke"], _1q8g6pa);  
  $def("_1fylrr9", null, ["md"], _1fylrr9);  
  $def("_6wd73d", "viewof toolRegistry_ui", ["toolRegistry_recording","toolRegistry_history_limit","toolRegistry_stats","htl","toolRegistry_history_filtered","viewof toolRegistry_recording","viewof toolRegistry_history_limit","viewof toolRegistry_clear_history","viewof toolRegistry_inspector_controls"], _6wd73d);  
  $def("_iuvmie", "toolRegistry_ui", ["Generators","viewof toolRegistry_ui"], _iuvmie);  
  $def("_dmhyth", "defineTool", [], _dmhyth);  
  $def("_1d14uja", "createToolContext", ["globalRuntime","generateId","AbortController","resolveRuntimeModules"], _1d14uja);  
  $def("_1d08ll1", "validateParameters", [], _1d08ll1);  
  $def("_1m7lf9f", "createToolRegistry", ["toolRegistry_recording","mutable toolRegistry_history","toolRegistry_history_limit","validateParameters"], _1m7lf9f);  
  $def("_n6vbu7", null, ["md"], _n6vbu7);  
  $def("_1999fd4", "initial toolRegistry_history", [], _1999fd4);  
  $def("_n9bkek", "mutable toolRegistry_history", ["Mutable","initial toolRegistry_history"], _n9bkek);  
  $def("_1qtyjo9", "toolRegistry_history", ["mutable toolRegistry_history"], _1qtyjo9);  
  $def("_1yj673i", "viewof toolRegistry_recording", ["Inputs"], _1yj673i);  
  $def("_9q3gpp", "toolRegistry_recording", ["Generators","viewof toolRegistry_recording"], _9q3gpp);  
  $def("_1pwkr2c", "viewof toolRegistry_history_limit", ["Inputs"], _1pwkr2c);  
  $def("_jpksjy", "toolRegistry_history_limit", ["Generators","viewof toolRegistry_history_limit"], _jpksjy);  
  $def("_hu78z5", "toolRegistry_tool_ids", ["toolRegistry_sync","toolRegistry"], _hu78z5);  
  $def("_30c6cx", "viewof toolRegistry_inspector_controls", ["Inputs","toolRegistry_tool_ids"], _30c6cx);  
  $def("_1nrksh0", "toolRegistry_inspector_controls", ["Generators","viewof toolRegistry_inspector_controls"], _1nrksh0);  
  $def("_1ecpmyz", "viewof toolRegistry_clear_history", ["Inputs"], _1ecpmyz);  
  $def("_5l2x28", "toolRegistry_clear_history", ["Generators","viewof toolRegistry_clear_history"], _5l2x28);  
  $def("_1hwylqm", "toolRegistry_clear_history_effect", ["toolRegistry_clear_history","mutable toolRegistry_history"], _1hwylqm);  
  $def("_1j6b2ie", "toolRegistry_history_filtered", ["toolRegistry_inspector_controls","toolRegistry_history"], _1j6b2ie);  
  $def("_v1tbsl", "toolRegistry_stats", ["toolRegistry_history"], _v1tbsl);  
  $def("_ikwtvy", null, ["md"], _ikwtvy);  
  $def("_1m4ecqa", "allTools", ["variableTools","runtimeTools"], _1m4ecqa);  
  $def("_kif9g0", null, ["md"], _kif9g0);  
  $def("_cj9gn8", "variableTools", ["listVariablesTool","upsertVariablesTool","deleteVariableTool"], _cj9gn8);  
  $def("_d5tu99", null, ["md"], _d5tu99);  
  $def("_a9m1b6", "listVariablesTool", ["defineTool","variablesXML"], _a9m1b6);  
  $def("_1iv2352", "test_listVariablesTool", ["globalRuntime","createToolContext","resolveRuntimeModules","listVariablesTool","summarizeJS"], _1iv2352);  
  $def("_19tynaq", null, ["md"], _19tynaq);  
  $def("_10sy5ct", "upsertVariablesTool", ["defineTool","parseVariablesXML","resolveRuntimeModules","realize","variablesXML","viewof lastUpserts","Event"], _10sy5ct);  
  $def("_1rzqjgn", "viewof lastUpserts", ["Inputs"], _1rzqjgn);  
  $def("_116zd4i", "lastUpserts", ["Generators","viewof lastUpserts"], _116zd4i);  
  $def("_373aki", "test_upsertVariablesTool_imports", ["test_tools_createModuleTool_registers_in_list_modules","globalRuntime","createToolContext","upsertVariablesTool"], _373aki);  
  $def("_13zh25u", null, ["lastUpserts"], _13zh25u);  
  $def("_1dtp7we", null, ["test_upsertVariablesTool_imports"], _1dtp7we);  
  $def("_1tttis7", null, ["md"], _1tttis7);  
  $def("_8vv2jr", "viewof m", ["thisModule"], _8vv2jr);  
  $def("_1g26e0p", "m", ["Generators","viewof m"], _1g26e0p);  
  $def("_1ltak8r", "v", ["m"], _1ltak8r);  
  $def("_xilgz9", "acornModule", ["currentModules"], _xilgz9);  
  $def("_jqhs99", "foreignInput", ["acornModule"], _jqhs99);  
  $def("_1ogqt7g", null, ["md"], _1ogqt7g);  
  $def("_1hkg126", "deleteVariableTool", ["defineTool"], _1hkg126);  
  $def("_78868y", "test_deleteVariableTool_deletes_anonymous_by_id", ["test_tools_createModuleTool_registers_in_list_modules","createToolContext","globalRuntime","id","deleteVariableTool"], _78868y);  
  $def("_xnachk", null, ["md"], _xnachk);  
  $def("_t5hro", "runtimeTools", ["listModulesTool","createModuleTool","runTestsTool","evalTool","searchVariablesTool"], _t5hro);  
  $def("_1bfpani", "listModulesTool", ["defineTool","resolveRuntimeModules"], _1bfpani);  
  $def("_f8xwou", "test_listModulesTool_smoke", ["createToolContext","globalRuntime","listModulesTool"], _f8xwou);  
  $def("_145iwtr", "createModuleTool", ["defineTool","resolveRuntimeModules"], _145iwtr);  
  $def("_1olpigk", "test_tools_createModuleTool_registers_in_list_modules", ["createToolContext","globalRuntime","createModuleTool","moduleMap","viewof currentModules","Event","listModulesTool"], _1olpigk);  
  $def("_115puzb", "runTestsTool", ["defineTool"], _115puzb);  
  $def("_1fueqt3", "evalTool", ["defineTool","globalRuntime","resolveRuntimeModules","getPromiseStateCrossRealm","summarizeJS"], _1fueqt3);  
  $def("_z3l63x", "test_tools_evalTool_expression_no_target", ["createToolContext","globalRuntime","evalTool"], _z3l63x);  
  $def("_1v0u9wr", "robocoop3_random_value", [], _1v0u9wr);  
  $def("_esgxrm", "test_tools_evalTool_apply_function_to_variable_value", ["createToolContext","globalRuntime","test_search_variables_includes_module","evalTool"], _esgxrm);  
  $def("_p6rf7f", "searchVariablesTool", ["defineTool","resolveRuntimeModules","variablesXML"], _p6rf7f);  
  $def("_qcz8b2", "test_search_variables_includes_module", ["createToolContext","globalRuntime","searchVariablesTool"], _qcz8b2);  
  $def("_gsfkxc", null, ["md"], _gsfkxc);  
  main.define("coverage_failures", ["module @tomlarkworthy/cell-map", "@variable"], (_, v) => v.import("coverage_failures", _));  
  main.define("globalRuntime", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("runtime", "globalRuntime", _));  
  main.define("getPromiseState", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("getPromiseState", _));  
  main.define("getPromiseStateCrossRealm", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("getPromiseStateCrossRealm", _));  
  main.define("lookupVariable", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("lookupVariable", _));  
  main.define("thisModule", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("thisModule", _));  
  main.define("keepalive", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("keepalive", _));  
  main.define("observe", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("observe", _));  
  main.define("realize", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("realize", _));  
  main.define("robocoop2", ["module @tomlarkworthy/robocoop-2", "@variable"], (_, v) => v.import("robocoop2", _));  
  main.define("summarizeJS", ["module @tomlarkworthy/summarizejs", "@variable"], (_, v) => v.import("summarizeJS", _));  
  main.define("moduleMap", ["module @tomlarkworthy/module-map", "@variable"], (_, v) => v.import("moduleMap", _));  
  main.define("viewof currentModules", ["module @tomlarkworthy/module-map", "@variable"], (_, v) => v.import("viewof currentModules", _));  
  main.define("currentModules", ["module @tomlarkworthy/module-map", "@variable"], (_, v) => v.import("currentModules", _));  
  main.define("reversibleAttach", ["module @tomlarkworthy/reversible-attachment", "@variable"], (_, v) => v.import("reversibleAttach", _));  
  main.define("localStorageView", ["module @tomlarkworthy/local-storage-view", "@variable"], (_, v) => v.import("localStorageView", _));  
  main.define("modern_screenshot", ["module @tomlarkworthy/modern-screenshot", "@variable"], (_, v) => v.import("modern_screenshot", _));  
  main.define("tabbedPane", ["module @tomlarkworthy/tabbed-pane-view", "@variable"], (_, v) => v.import("tabbedPane", _));  
  main.define("cellsToClipboard", ["module @tomlarkworthy/cells-to-clipboard", "@variable"], (_, v) => v.import("cellsToClipboard", _));  
  main.define("expect", ["module @tomlarkworthy/jest-expect-standalone", "@variable"], (_, v) => v.import("expect", _));  
  $def("_1pxvi2c", null, ["robocoop2"], _1pxvi2c);
  return main;
}