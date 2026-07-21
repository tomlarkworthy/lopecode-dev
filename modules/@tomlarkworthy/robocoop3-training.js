const _1bru4ar = function _1(md){return(
md`# robocoop3 Training`
)};
const _1u2l71l = function _10(md){return(
md`## Environment Builders`
)};
const _hafc4h = function _thisEnv(runtime){return(
() => ({
  runtime
})
)};
const _1fnpeip = async function _lopecode_tour_source(){return(
(
  await fetch(
    "https://raw.githubusercontent.com/tomlarkworthy/lopecode/d3d7149c3f0f92d8859108f96b0cf2c96d473aea/notebooks/%40tomlarkworthy_lopecode-tour.html"
  )
).text()
)};
const _10jer2m = function _13(md){return(
md`## The tour notebook

We run the exported tour notebook source from Github in an iframe for isolation.`
)};
const _rosoty = function _environment_tour(lopecode_tour_source){return(
async ({ invalidation, div }) => {
  const iframe = document.createElement("iframe");
  iframe.width = "100%";
  iframe.height = "400";
  const patched = lopecode_tour_source.replace(
    "<head>",
    '<head><base href="about:srcdoc" target="_self">'
  );

  iframe.srcdoc = patched;

  div.appendChild(iframe);

  while (!iframe.contentWindow.__ojs_runtime) {
    await new Promise((r) => setInterval(r, 500));
  }

  //iframe.contentDocument.write(`<base href="about:srcdoc" />`);

  invalidation.then(() => {
    iframe.remove();
  });
  return {
    iframe,
    runtime: iframe.contentWindow.__ojs_runtime
  };
}
)};
const _1jpvryk = function _test_div(htl){return(
htl.html`<div>`
)};
const _8midta = function _test_environment_tour(environment_tour,invalidation,test_div){return(
environment_tour({ invalidation, div: test_div })
)};
const _1y9rqtr = function _17(md){return(
md`## Prompt`
)};
const _t1ooj0 = function _initial_prompt(system_prompt){return(
system_prompt
)};
const _127koqn = function _19(md){return(
md`## Tasks`
)};
const _189kmh8 = function _Task(){return(
class Task {
  constructor({ name, environment, prompt, evaluators = [] } = {}) {
    this.name = String(name ?? "").trim() || "task";
    this.prompt = prompt;
    this.environment = environment;
    this.evaluators = evaluators;
  }
}
)};
const _1xb7vwf = function _trainingModule(thisModule){return(
thisModule()
)};
const _124xomu = (G, _) => G.input(_);
const _13c0np9 = function _allTasks(Inputs){return(
Inputs.input()
)};
const _keq2n7 = (G, _) => G.input(_);
const _1yo6d16 = function _allTasksCalc(runtime_variables,trainingModule,_,$0,Event)
{
  const latest = [...runtime_variables]
    .filter((v) => v._module == trainingModule && v._name?.startsWith("task_"))
    .map((v) => v._value);
  if (!_.isEqual($0.value, latest)) {
    $0.value = latest;
    $0.dispatchEvent(new Event("input"));
  }
  return latest;
};
const _1nkjlw1 = function _25(md){return(
md`## Evals`
)};
const _miyo1x = function _task_list_modules(Task,environment_tour,hasModule,numSteps){return(
new Task({
  name: "list_module",
  prompt: "list the modules",
  environment: environment_tour,
  evaluators: [hasModule({ module_name: "test" }), numSteps({ target: 2 })]
})
)};
const _cx39z6 = function _task_create_a_module_and_an_import(Task,environment_tour,hasModule,hasVariable,checkValue,numSteps){return(
new Task({
  name: "Create a module with an import",
  prompt:
    "create a module called 'test', and import 'demoCell' cell from '@tomlarkworthy/lopecode-tour'",
  environment: environment_tour,
  evaluators: [
    hasModule({ module_name: "test" }),
    hasVariable({
      module_name: "test",
      variable_name: "demoCell"
    }),
    checkValue({
      module_name: "test",
      variable_name: "demoCell",
      check: (value) => !!value
    }),
    checkValue({
      module_name: "test",
      variable_name: "module @tomlarkworthy/lopecode-tour",
      check: (value) => !!value
    }),
    numSteps({ target: 4 })
  ]
})
)};
const _1y6g0g7 = function _task_question_trace_execution(Task,environment_tour,checkResponseContains,checkToolCalled){return(
new Task({
  name: "Runtime question",
  prompt: "How can I programatically read the values of cells?'",
  environment: environment_tour,
  evaluators: [
    checkResponseContains({
      contains: ["observe", "@tomlarkworthy/runtime-sdk"]
    }),
    checkToolCalled({
      tool_name: "list_variables",
      tool_args: { module: "@tomlarkworthy/runtime-sdk" }
    })
  ]
})
)};
const _10b28qo = function _task_update_file(Task,environment_tour,checkToolCalled){return(
new Task({
  name: "Mutate an existing file",
  prompt: "Update task.md in the tour notebook to say `# Intro\nLets being...`",
  environment: environment_tour,
  evaluators: [
    checkToolCalled({
      tool_name: "list_modules"
    }),
    checkToolCalled({
      tool_name: "list_variables",
      tool_args: { module: "@tomlarkworthy/fileattachments" }
    }),
    checkToolCalled({
      tool_name: "eval"
    })
  ]
})
)};
const _8wi60e = function _task_vendor_dependancy_hono(Task,environment_tour,checkToolCalled){return(
new Task({
  name: "Vendor a dependency",
  prompt: "Vendor hono@4.11.9 into module @tomlarkworthy/hono",
  environment: environment_tour,
  evaluators: [
    checkToolCalled({
      tool_name: "list_modules",
      tool_args: { module: "@tomlarkworthy/runtime-sdk" }
    }),
    checkToolCalled({
      tool_name: "list_variables",
      tool_args: { module: "@tomlarkworthy/fileattachments" }
    }),
    checkToolCalled({
      tool_name: "upsert_variables"
    }),
    checkToolCalled({
      tool_name: "create_module"
    })
  ]
})
)};
const _f1c762 = function _task_call_aside_runtime_sdk(Task,environment_tour,checkToolCalled,checkResponseContains){return(
new Task({
  name: "Call a function",
  prompt: `Call the notebook function "aside" to for module @tomlarkworthy/runtime-sdk. Tell me the response`,
  environment: environment_tour,
  evaluators: [
    checkToolCalled({
      tool_name: "search_variables",
      tool_args_exact: { query: "aside" }
    }),
    checkToolCalled({
      tool_name: "eval",
      tool_args_exact: { variable_id_or_name: "aside" }
    }),
    checkResponseContains({
      contains: ["<a", "href", "@tomlarkworthy/runtime-sdk"]
    })
  ]
})
)};
const _1yhudfn = function _task_bugfix_navigation(Task,environment_tour,hasVariable,checkToolCalled,checkResponseContains,numSteps){return(
new Task({
  name: "Bugfix: navigation from cell editor inputs",
  prompt: `Clicking on "lite_youtube_css" in the cell editor inputs does not scroll anywhere. Please fix`,
  environment: environment_tour,
  evaluators: [
    hasVariable({
      module_name: "@tomlarkworthy/editor-5",
      variable_name: "variableLink"
    }),
    checkToolCalled({
      tool_name: "list_variables",
      tool_args_exact: { module: "@tomlarkworthy/lopecode-tour" }
    }),
    checkToolCalled({
      tool_name: "list_variables",
      tool_args_exact: { module: "@tomlarkworthy/editor-5" }
    }),
    checkToolCalled({
      tool_name: "list_variables",
      tool_args_exact: { module: "@tomlarkworthy/lopepage-urls" }
    }),
    checkToolCalled({
      tool_name: "search_variables",
      tool_args_exact: { query: "lite_youtube_css" }
    }),
    checkToolCalled({ tool_name: "eval" }),
    checkToolCalled({ tool_name: "upsert_variables" }),
    checkResponseContains({
      contains: ["lite_youtube_css", "variableLink", "@tomlarkworthy/editor-5"]
    }),
    numSteps({ target: 12 })
  ]
})
)};
const _1chky4l = function _33(md){return(
md`## Evaluators`
)};
const _vwsos2 = function _numSteps(){return(
({ target = 1 }) =>
  async ({ trace }) => {
    return {
      [`numSteps(target=${target})`]: Math.min(
        1,
        Math.pow(0.5, trace.steps.length - target)
      )
    };
  }
)};
const _1tg1pdm = function _hasModule(moduleMap){return(
({ module_name }) =>
  async ({ runtime }) => {
    const modules = await moduleMap(runtime);

    return {
      [`hasModule(${module_name})`]: [...modules.values()].find(
        (info) => info.name == module_name
      )
        ? 1
        : 0
    };
  }
)};
const _1ee0akh = function _hasVariable(moduleMap){return(
({ module_name, variable_name }) =>
  async ({ runtime }) => {
    const modules = await moduleMap(runtime);
    const module = [...modules.values()].find(
      (info) => info.name == module_name
    );
    if (!module) return ({
      [`hasVariable(${module_name}#${variable_name})`]: 0
    })
    return {
      [`hasVariable(${module_name}#${variable_name})`]: [
        ...runtime._variables
      ].find((v) => v._module == module.module && v._name == variable_name)
        ? 1
        : 0
    };
  }
)};
const _1e85jvw = function _checkValue(moduleMap){return(
({ module_name, variable_name, check = (value) => true }) =>
  async ({ runtime }) => {
    const modules = await moduleMap(runtime);
    const module = [...modules.values()].find(
      (info) => info.name == module_name
    );
    if (!module)
      return {
        [`checkValue(${module_name}#${variable_name})`]: 0
      };
    const variable = [...runtime._variables].find(
      (v) => v._module == module.module && v._name == variable_name
    );

    if (!variable)
      return {
        [`checkValue(${module_name}#${variable_name})`]: 0
      };
    return {
      [`checkValue(${module_name}#${variable_name})`]: check(variable._value)
        ? 1
        : 0
    };
  }
)};
const _zsy0d9 = function _checkResponseContains(d3){return(
({ contains = [] }) =>
  async ({ trace }) => {
    return {
      [`checkResponseContainsAll(${contains})`]:
        d3.sum(
          contains.map((str) => (trace.steps.at(-1).text.includes(str) ? 1 : 0))
        ) / contains.length
    };
  }
)};
const _17q9mlx = function _checkToolCalled(){return(
({ tool_name, tool_args_exact = {} }) =>
  async ({ trace }) => {
    return {
      [`checkToolCalled("${tool_name}", ${JSON.stringify(tool_args_exact)})`]:
        trace.steps.find((step) =>
          step.tools.find((tool) => {
            if (tool.name != tool_name) return false;
            const args = JSON.parse(tool.argsRaw);
            if (
              ![...Object.entries(tool_args_exact)].every(
                ([key, value]) => args[key] == value
              )
            )
              return false;
            return true;
          })
        )
          ? 1
          : 0
    };
  }
)};
const _l8rcxt = function _40(md){return(
md`#### Evaluator tests`
)};
const _1v5j06o = function _sample_full_trace(){return(
{
  steps: [
    {
      step: 10,
      startedAt: 1771347431616,
      finishedAt: 1771347447041,
      text: "",
      tools: [
        {
          id: "call_MRchRgeBRcO5MK0DCLbCjKQ0",
          name: "eval",
          argsRaw:
            '{"code":"v => v.toString()","module":"@tomlarkworthy/runtime-sdk","variable_id_or_name":"observe"}',
          result: {
            title: "Eval",
            output:
              '`function observe(v, observer, { invalidation, detachNodes = false } = {}) {\n  // --- instrumentation (improved) ---\n  // Give each observe() call a stable id so you can correlate events.\n  const observe_id = \\`\\${v?._name || "<anon>"}@\\${Date.now()}@\\${Math.random()\n    .toString(16)\n    .slice(2)}\\`;\n\n  const snapshot = (extra = {}) => ({\n    t: Date.now(),\n    observe_id,\n    var_name: v?._name,\n    var_version: v?._version,\n    var_reachable: v?._reachable,\n    has_observer: v?._observer != null,\n    observer_has_node: !!observer?._node,\n    v_value_defined: v?._value !== undefined,\n    v_value_ctor: v?._value?.constructor?.name,\n    v_value_is_node:\n      v?._value instanceof Element || v?._value instanceof Text || false,\n    v_promise: !!v?._promise,Show 227 truncated lines',
            metadata: {
              type: "string",
              applied: true,
              module: "@tomlarkworthy/runtime-sdk",
              variable_id_or_name: "observe"
            }
          }
        }
      ],
      tests: [],
      stepFinish: {
        reason: "tool_outputs_sent",
        previous_response_id:
          "resp_0343e05a994db07f0069949de7c21481949409426cf0f01f33"
      },
      assistantFinish: {
        responseId: "resp_0343e05a994db07f0069949de7c21481949409426cf0f01f33",
        finishReason: "completed",
        usage: {
          input: 54883,
          output: 338,
          reasoning: 256,
          cache: {
            read: 0,
            write: 0
          },
          total: 55221
        },
        usage_raw: {
          input_tokens: 54883,
          input_tokens_details: {
            cached_tokens: 0
          },
          output_tokens: 338,
          output_tokens_details: {
            reasoning_tokens: 256
          },
          total_tokens: 55221
        }
      },
      events: [
        {
          time: 1771347431616,
          type: "step_start",
          step: 10,
          info: {
            previous_response_id:
              "resp_0343e05a994db07f0069949de343888194888038063c674779"
          }
        },
        {
          time: 1771347442606,
          type: "tool_use",
          id: "call_MRchRgeBRcO5MK0DCLbCjKQ0",
          name: "eval"
        },
        {
          time: 1771347442749,
          type: "tool_use_delta",
          id: "call_MRchRgeBRcO5MK0DCLbCjKQ0",
          chunk:
            '{"code":"v => v.toString()","module":"@tomlarkworthy/runtime-sdk","variable_id_or_name":"observe"}'
        },
        {
          time: 1771347443010,
          type: "assistant_finish",
          responseId: "resp_0343e05a994db07f0069949de7c21481949409426cf0f01f33",
          finishReason: "completed",
          usage_raw: {
            input_tokens: 54883,
            input_tokens_details: {
              cached_tokens: 0
            },
            output_tokens: 338,
            output_tokens_details: {
              reasoning_tokens: 256
            },
            total_tokens: 55221
          },
          usage: {
            input: 54883,
            output: 338,
            reasoning: 256,
            cache: {
              read: 0,
              write: 0
            },
            total: 55221
          }
        },
        {
          time: 1771347447041,
          type: "tool_result",
          id: "call_MRchRgeBRcO5MK0DCLbCjKQ0",
          name: "eval",
          title: "Eval",
          output:
            '`function observe(v, observer, { invalidation, detachNodes = false } = {}) {\n  // --- instrumentation (improved) ---\n  // Give each observe() call a stable id so you can correlate events.\n  const observe_id = \\`\\${v?._name || "<anon>"}@\\${Date.now()}@\\${Math.random()\n    .toString(16)\n    .slice(2)}\\`;\n\n  const snapshot = (extra = {}) => ({\n    t: Date.now(),\n    observe_id,\n    var_name: v?._name,\n    var_version: v?._version,\n    var_reachable: v?._reachable,\n    has_observer: v?._observer != null,\n    observer_has_node: !!observer?._node,\n    v_value_defined: v?._value !== undefined,\n    v_value_ctor: v?._value?.constructor?.name,\n    v_value_is_node:\n      v?._value instanceof Element || v?._value instanceof Text || false,\n    v_promise: !!v?._promise,Show 227 truncated lines',
          metadata: {
            type: "string",
            applied: true,
            module: "@tomlarkworthy/runtime-sdk",
            variable_id_or_name: "observe"
          }
        },
        {
          time: 1771347447041,
          type: "step_finish",
          step: 10,
          info: {
            reason: "tool_outputs_sent",
            previous_response_id:
              "resp_0343e05a994db07f0069949de7c21481949409426cf0f01f33"
          }
        }
      ]
    },
    {
      step: 11,
      startedAt: 1771347447041,
      finishedAt: 1771347467384,
      text: "Done — I inspected the observe implementation in @tomlarkworthy/runtime-sdk.\n\nQuick evidence\n- Module: @tomlarkworthy/runtime-sdk\n- Variable name: observe\n- id: 37\n- state: fulfilled, reachable: true\n\nWhat the implementation does (summary)\n- Signature: observe(v, observer, { invalidation, detachNodes = false } = {})\n- Attaches an Observer to a runtime Variable v while preserving any existing observer:\n  - If the variable has no existing observer (or it's the special no_observer symbol), the function sets v._observer = observer and returns a cancellation function that restores the previous observer.\n  - If there is an existing observer, it wraps the existing observer’s fulfilled/rejected/pending handlers so:\n    1) the existing observer is invoked first,\n    2) then your observer is invoked (i.e., the tap),\n    3) any DOM node detachment occurs when detachNodes is true.\n  - It keeps a list of cancel callbacks to restore the previous observer handlers when the returned cancel function is called.\n- Catch-up behavior (replay on attach):\n  - Immediately calls observer.pending() (mimics the inspector).\n  - If v._value is defined at attach time, and the variable version matches the version seen at attach, calls observer.fulfilled(value, v._name).\n  - Otherwise it will await the current promise (v._promise) and deliver fulfilled/rejected when it resolves (with staleness checks).\n- Makes unobserved variables reachable:\n  - If the variable was not reachable, observe marks it reachable and pushes it into runtime update/dirty sets (so the variable will compute).\n- Node-stealing support:\n  - If detachNodes is true and the existing value is a DOM node and observer._node exists and differs from the node’s current parent, the node may be removed from its previous parent so the new inspector can take ownership.\n- Instrumentation:\n  - If the variable name equals the trace_variable value, the function emits timestamped trace snapshots into mutable trace_history (useful for debugging).\n- Returns:\n  - A cancel function that restores state and detaches wrapped handlers.\n\nRelated helpers in the same module\n- no_observer (id 36): sentinel used to detect an unobserved variable.\n- observeOld (id 38): older implementation (kept for reference).\n- observeSet (id 43): helper to observe mutations to Sets (used by cloneDataflow, etc.).\n- keepalive (id 3): helper to create a dynamic variable that keeps a variable evaluated.\n\nUsage examples\n\n1) Basic tap (no detach, no invalidation)\n- observe(v, {\n    fulfilled: (value, name) => console.log('value', name, value),\n    pending: () => console.log('pending'),\n    rejected: (err) => console.error('rejected', err)\n  });\n\n2) With invalidation (auto-unsubscribe)\n- const cancel = observe(v, observer, { invalidation: somePromise });\n  // When somePromise resolves, the subscription is cancelled automatically.\n\n3) Steal DOM node for custom visualizer\n- observe(v, observer, { detachNodes: true });\n\nNotes / gotchas\n- If you need to keep a background task alive, use keepalive(module, \"cellName\") instead of just observing an anonymous variable.\n- The wrapper modifies the existing observer in-place; cancelling restores the previous functions. That design ensures multiple observers can be tapped without losing the original inspector behavior.\n- The implementation defers the catch-up replay to a queueMicrotask to avoid racing with immediate runtime changes — this is deliberate but means the observer.pending() is called synchronously then fulfilled/rejected later.\n- trace_variable and trace_history let you instrument a single variable’s observe lifecycle for debugging (set trace_variable to the variable name you want to trace).\n\nWould you like any of the following next?\n- I can attach a short live demo: pick a variable name and I’ll add an observe(...) and show the trace/log output.\n- Run reachable tests that touch observe and report status.\n- Paste the full observe source (I can export the full text).",
      tools: [],
      tests: [
        {
          title: "Run tests (20/26 passed, 6 pending)",
          output:
            "… test_has_it_thrown\n✓ test_url_roundtrip\n✓ test_runAsk\n… test_sin_is_cos\n… test_sin_sq_plus_cos_sq\n… test_all_cells_decompilable\n… test_cell_map_coverage\n✓ test_normalizeUsage_openai_chat_completions_usage\n✓ test_appendAgentRecord_coalesces_text\n✓ test_appendAgentRecord_coalesces_tool_use_delta_by_id\n✓ test_opencode_generateId\n✓ test_opencode_createUserMessage\n✓ test_opencode_createAssistantMessage\n✓ test_variablesXML_smoke\n✓ test_variablesXML_importVariable\n✓ test_variablesXML_erroredVariable\n✓ test_parseVariablesXML_smoke\n✓ test_listVariablesTool\n✓ test_upsertVariablesTool_imports\n✓ test_deleteVariableTool_deletes_anonymous_by_id\n✓ test_listModulesTool_smoke\n✓ test_tools_createModuleTool_registers_in_list_modules\n✓ test_tools_evalTool_expression_no_target\n✓ test_tools_evalTool_apply_function_to_variable_value\n✓ test_search_variables_includes_module\n… test_all_cells_decompilable",
          metadata: {
            total: 26,
            passed: 20,
            failed: 0,
            pending: 6,
            results: [
              {
                name: "test_has_it_thrown",
                reachable: true,
                hasValue: false,
                hasError: false,
                value: null
              },
              {
                name: "test_url_roundtrip",
                reachable: true,
                hasValue: true,
                hasError: false,
                value: "true"
              },
              {
                name: "test_runAsk",
                reachable: true,
                hasValue: true,
                hasError: false,
                value: "[object Object]"
              },
              {
                name: "test_sin_is_cos",
                reachable: true,
                hasValue: false,
                hasError: false,
                value: null
              },
              {
                name: "test_sin_sq_plus_cos_sq",
                reachable: true,
                hasValue: false,
                hasError: false,
                value: null
              },
              {
                name: "test_all_cells_decompilable",
                reachable: true,
                hasValue: false,
                hasError: false,
                value: null
              },
              {
                name: "test_cell_map_coverage",
                reachable: true,
                hasValue: false,
                hasError: false,
                value: null
              },
              {
                name: "test_normalizeUsage_openai_chat_completions_usage",
                reachable: true,
                hasValue: true,
                hasError: false,
                value: "pass"
              },
              {
                name: "test_appendAgentRecord_coalesces_text",
                reachable: true,
                hasValue: true,
                hasError: false,
                value: "pass"
              },
              {
                name: "test_appendAgentRecord_coalesces_tool_use_delta_by_id",
                reachable: true,
                hasValue: true,
                hasError: false,
                value: "pass"
              },
              {
                name: "test_opencode_generateId",
                reachable: true,
                hasValue: true,
                hasError: false,
                value: "pass"
              },
              {
                name: "test_opencode_createUserMessage",
                reachable: true,
                hasValue: true,
                hasError: false,
                value: "pass"
              },
              {
                name: "test_opencode_createAssistantMessage",
                reachable: true,
                hasValue: true,
                hasError: false,
                value: "pass"
              },
              {
                name: "test_variablesXML_smoke",
                reachable: true,
                hasValue: true,
                hasError: false,
                value:
                  '<variable name="id" module="@tomlarkworthy/robocoop-3" id="5" state="fulfilled" version="1" reachabl'
              },
              {
                name: "test_variablesXML_importVariable",
                reachable: true,
                hasValue: true,
                hasError: false,
                value:
                  '<variable name="moduleMap" module="@tomlarkworthy/robocoop-3" id="4" state="fulfilled" version="3" r'
              },
              {
                name: "test_variablesXML_erroredVariable",
                reachable: true,
                hasValue: true,
                hasError: false,
                value:
                  '<variable name="expected_error" module="@tomlarkworthy/robocoop-3" id="3" state="rejected" version="'
              },
              {
                name: "test_parseVariablesXML_smoke",
                reachable: true,
                hasValue: true,
                hasError: false,
                value: "[object Object]"
              },
              {
                name: "test_listVariablesTool",
                reachable: true,
                hasValue: true,
                hasError: false,
                value: "pass"
              },
              {
                name: "test_upsertVariablesTool_imports",
                reachable: true,
                hasValue: true,
                hasError: false,
                value: "[object Object]"
              },
              {
                name: "test_deleteVariableTool_deletes_anonymous_by_id",
                reachable: true,
                hasValue: true,
                hasError: false,
                value: "pass"
              },
              {
                name: "test_listModulesTool_smoke",
                reachable: true,
                hasValue: true,
                hasError: false,
                value:
                  "@jashkenas/url-querystrings-and-hash-parameters (6 variables) 'URL querystrings and hash parameters'"
              },
              {
                name: "test_tools_createModuleTool_registers_in_list_modules",
                reachable: true,
                hasValue: true,
                hasError: false,
                value: "pass"
              },
              {
                name: "test_tools_evalTool_expression_no_target",
                reachable: true,
                hasValue: true,
                hasError: false,
                value: "pass"
              },
              {
                name: "test_tools_evalTool_apply_function_to_variable_value",
                reachable: true,
                hasValue: true,
                hasError: false,
                value: "pass"
              },
              {
                name: "test_search_variables_includes_module",
                reachable: true,
                hasValue: true,
                hasError: false,
                value: "[object Object]"
              },
              {
                name: "test_all_cells_decompilable",
                reachable: true,
                hasValue: false,
                hasError: false,
                value: null
              }
            ]
          }
        }
      ],
      stepFinish: {
        reason: "tests_passed",
        failed: 0,
        previous_response_id:
          "resp_0343e05a994db07f0069949df7295481949f20b11bcc5a03d5"
      },
      assistantFinish: {
        responseId: "resp_0343e05a994db07f0069949df7295481949f20b11bcc5a03d5",
        finishReason: "completed",
        usage: {
          input: 55453,
          output: 1192,
          reasoning: 320,
          cache: {
            read: 10880,
            write: 0
          },
          total: 56645
        },
        usage_raw: {
          input_tokens: 55453,
          input_tokens_details: {
            cached_tokens: 10880
          },
          output_tokens: 1192,
          output_tokens_details: {
            reasoning_tokens: 320
          },
          total_tokens: 56645
        }
      },
      events: [
        {
          time: 1771347447041,
          type: "step_start",
          step: 11,
          info: {
            previous_response_id:
              "resp_0343e05a994db07f0069949de7c21481949409426cf0f01f33"
          }
        },
        {
          time: 1771347465184,
          type: "text",
          chunk:
            "Done — I inspected the observe implementation in @tomlarkworthy/runtime-sdk.\n\nQuick evidence\n- Module: @tomlarkworthy/runtime-sdk\n- Variable name: observe\n- id: 37\n- state: fulfilled, reachable: true\n\nWhat the implementation does (summary)\n- Signature: observe(v, observer, { invalidation, detachNodes = false } = {})\n- Attaches an Observer to a runtime Variable v while preserving any existing observer:\n  - If the variable has no existing observer (or it's the special no_observer symbol), the function sets v._observer = observer and returns a cancellation function that restores the previous observer.\n  - If there is an existing observer, it wraps the existing observer’s fulfilled/rejected/pending handlers so:\n    1) the existing observer is invoked first,\n    2) then your observer is invoked (i.e., the tap),\n    3) any DOM node detachment occurs when detachNodes is true.\n  - It keeps a list of cancel callbacks to restore the previous observer handlers when the returned cancel function is called.\n- Catch-up behavior (replay on attach):\n  - Immediately calls observer.pending() (mimics the inspector).\n  - If v._value is defined at attach time, and the variable version matches the version seen at attach, calls observer.fulfilled(value, v._name).\n  - Otherwise it will await the current promise (v._promise) and deliver fulfilled/rejected when it resolves (with staleness checks).\n- Makes unobserved variables reachable:\n  - If the variable was not reachable, observe marks it reachable and pushes it into runtime update/dirty sets (so the variable will compute).\n- Node-stealing support:\n  - If detachNodes is true and the existing value is a DOM node and observer._node exists and differs from the node’s current parent, the node may be removed from its previous parent so the new inspector can take ownership.\n- Instrumentation:\n  - If the variable name equals the trace_variable value, the function emits timestamped trace snapshots into mutable trace_history (useful for debugging).\n- Returns:\n  - A cancel function that restores state and detaches wrapped handlers.\n\nRelated helpers in the same module\n- no_observer (id 36): sentinel used to detect an unobserved variable.\n- observeOld (id 38): older implementation (kept for reference).\n- observeSet (id 43): helper to observe mutations to Sets (used by cloneDataflow, etc.).\n- keepalive (id 3): helper to create a dynamic variable that keeps a variable evaluated.\n\nUsage examples\n\n1) Basic tap (no detach, no invalidation)\n- observe(v, {\n    fulfilled: (value, name) => console.log('value', name, value),\n    pending: () => console.log('pending'),\n    rejected: (err) => console.error('rejected', err)\n  });\n\n2) With invalidation (auto-unsubscribe)\n- const cancel = observe(v, observer, { invalidation: somePromise });\n  // When somePromise resolves, the subscription is cancelled automatically.\n\n3) Steal DOM node for custom visualizer\n- observe(v, observer, { detachNodes: true });\n\nNotes / gotchas\n- If you need to keep a background task alive, use keepalive(module, \"cellName\") instead of just observing an anonymous variable.\n- The wrapper modifies the existing observer in-place; cancelling restores the previous functions. That design ensures multiple observers can be tapped without losing the original inspector behavior.\n- The implementation defers the catch-up replay to a queueMicrotask to avoid racing with immediate runtime changes — this is deliberate but means the observer.pending() is called synchronously then fulfilled/rejected later.\n- trace_variable and trace_history let you instrument a single variable’s observe lifecycle for debugging (set trace_variable to the variable name you want to trace).\n\nWould you like any of the following next?\n- I can attach a short live demo: pick a variable name and I’ll add an observe(...) and show the trace/log output.\n- Run reachable tests that touch observe and report status.\n- Paste the full observe source (I can export the full text)."
        },
        {
          time: 1771347465367,
          type: "assistant_finish",
          responseId: "resp_0343e05a994db07f0069949df7295481949f20b11bcc5a03d5",
          finishReason: "completed",
          usage_raw: {
            input_tokens: 55453,
            input_tokens_details: {
              cached_tokens: 10880
            },
            output_tokens: 1192,
            output_tokens_details: {
              reasoning_tokens: 320
            },
            total_tokens: 56645
          },
          usage: {
            input: 55453,
            output: 1192,
            reasoning: 320,
            cache: {
              read: 10880,
              write: 0
            },
            total: 56645
          }
        },
        {
          time: 1771347467384,
          type: "tests",
          title: "Run tests (20/26 passed, 6 pending)",
          output:
            "… test_has_it_thrown\n✓ test_url_roundtrip\n✓ test_runAsk\n… test_sin_is_cos\n… test_sin_sq_plus_cos_sq\n… test_all_cells_decompilable\n… test_cell_map_coverage\n✓ test_normalizeUsage_openai_chat_completions_usage\n✓ test_appendAgentRecord_coalesces_text\n✓ test_appendAgentRecord_coalesces_tool_use_delta_by_id\n✓ test_opencode_generateId\n✓ test_opencode_createUserMessage\n✓ test_opencode_createAssistantMessage\n✓ test_variablesXML_smoke\n✓ test_variablesXML_importVariable\n✓ test_variablesXML_erroredVariable\n✓ test_parseVariablesXML_smoke\n✓ test_listVariablesTool\n✓ test_upsertVariablesTool_imports\n✓ test_deleteVariableTool_deletes_anonymous_by_id\n✓ test_listModulesTool_smoke\n✓ test_tools_createModuleTool_registers_in_list_modules\n✓ test_tools_evalTool_expression_no_target\n✓ test_tools_evalTool_apply_function_to_variable_value\n✓ test_search_variables_includes_module\n… test_all_cells_decompilable",
          metadata: {
            total: 26,
            passed: 20,
            failed: 0,
            pending: 6,
            results: [
              {
                name: "test_has_it_thrown",
                reachable: true,
                hasValue: false,
                hasError: false,
                value: null
              },
              {
                name: "test_url_roundtrip",
                reachable: true,
                hasValue: true,
                hasError: false,
                value: "true"
              },
              {
                name: "test_runAsk",
                reachable: true,
                hasValue: true,
                hasError: false,
                value: "[object Object]"
              },
              {
                name: "test_sin_is_cos",
                reachable: true,
                hasValue: false,
                hasError: false,
                value: null
              },
              {
                name: "test_sin_sq_plus_cos_sq",
                reachable: true,
                hasValue: false,
                hasError: false,
                value: null
              },
              {
                name: "test_all_cells_decompilable",
                reachable: true,
                hasValue: false,
                hasError: false,
                value: null
              },
              {
                name: "test_cell_map_coverage",
                reachable: true,
                hasValue: false,
                hasError: false,
                value: null
              },
              {
                name: "test_normalizeUsage_openai_chat_completions_usage",
                reachable: true,
                hasValue: true,
                hasError: false,
                value: "pass"
              },
              {
                name: "test_appendAgentRecord_coalesces_text",
                reachable: true,
                hasValue: true,
                hasError: false,
                value: "pass"
              },
              {
                name: "test_appendAgentRecord_coalesces_tool_use_delta_by_id",
                reachable: true,
                hasValue: true,
                hasError: false,
                value: "pass"
              },
              {
                name: "test_opencode_generateId",
                reachable: true,
                hasValue: true,
                hasError: false,
                value: "pass"
              },
              {
                name: "test_opencode_createUserMessage",
                reachable: true,
                hasValue: true,
                hasError: false,
                value: "pass"
              },
              {
                name: "test_opencode_createAssistantMessage",
                reachable: true,
                hasValue: true,
                hasError: false,
                value: "pass"
              },
              {
                name: "test_variablesXML_smoke",
                reachable: true,
                hasValue: true,
                hasError: false,
                value:
                  '<variable name="id" module="@tomlarkworthy/robocoop-3" id="5" state="fulfilled" version="1" reachabl'
              },
              {
                name: "test_variablesXML_importVariable",
                reachable: true,
                hasValue: true,
                hasError: false,
                value:
                  '<variable name="moduleMap" module="@tomlarkworthy/robocoop-3" id="4" state="fulfilled" version="3" r'
              },
              {
                name: "test_variablesXML_erroredVariable",
                reachable: true,
                hasValue: true,
                hasError: false,
                value:
                  '<variable name="expected_error" module="@tomlarkworthy/robocoop-3" id="3" state="rejected" version="'
              },
              {
                name: "test_parseVariablesXML_smoke",
                reachable: true,
                hasValue: true,
                hasError: false,
                value: "[object Object]"
              },
              {
                name: "test_listVariablesTool",
                reachable: true,
                hasValue: true,
                hasError: false,
                value: "pass"
              },
              {
                name: "test_upsertVariablesTool_imports",
                reachable: true,
                hasValue: true,
                hasError: false,
                value: "[object Object]"
              },
              {
                name: "test_deleteVariableTool_deletes_anonymous_by_id",
                reachable: true,
                hasValue: true,
                hasError: false,
                value: "pass"
              },
              {
                name: "test_listModulesTool_smoke",
                reachable: true,
                hasValue: true,
                hasError: false,
                value:
                  "@jashkenas/url-querystrings-and-hash-parameters (6 variables) 'URL querystrings and hash parameters'"
              },
              {
                name: "test_tools_createModuleTool_registers_in_list_modules",
                reachable: true,
                hasValue: true,
                hasError: false,
                value: "pass"
              },
              {
                name: "test_tools_evalTool_expression_no_target",
                reachable: true,
                hasValue: true,
                hasError: false,
                value: "pass"
              },
              {
                name: "test_tools_evalTool_apply_function_to_variable_value",
                reachable: true,
                hasValue: true,
                hasError: false,
                value: "pass"
              },
              {
                name: "test_search_variables_includes_module",
                reachable: true,
                hasValue: true,
                hasError: false,
                value: "[object Object]"
              },
              {
                name: "test_all_cells_decompilable",
                reachable: true,
                hasValue: false,
                hasError: false,
                value: null
              }
            ]
          }
        },
        {
          time: 1771347467384,
          type: "step_finish",
          step: 11,
          info: {
            reason: "tests_passed",
            failed: 0,
            previous_response_id:
              "resp_0343e05a994db07f0069949df7295481949f20b11bcc5a03d5"
          }
        },
        {
          time: 1771347467384,
          type: "run_done"
        },
        {
          time: 1771347467384,
          type: "run_end",
          runId: "b6c49818-6ff9-495b-9310-c97c99efde12",
          durationMs: 40245,
          tokens: {
            input: 55453,
            output: 1192,
            reasoning: 320,
            cache: {
              read: 10880,
              write: 0
            },
            total: 56645
          }
        }
      ]
    }
  ],
  run: {
    id: "b6c49818-6ff9-495b-9310-c97c99efde12",
    provider: "openai",
    startedAt: 1771347427139,
    endedAt: 1771347467384,
    tokens: {
      input: 55453,
      output: 1192,
      reasoning: 320,
      cache: {
        read: 10880,
        write: 0
      },
      total: 56645
    },
    prompt: "check observe in runtime-sdk\n"
  }
}
)};
const _osuvx6 = function _test_hasModule(hasModule,thisEnv){return(
hasModule({ module_name: "@tomlarkworthy/robocoop-3" })(
  thisEnv()
)
)};
const _137dj3e = function _test_hasCell(hasVariable,thisEnv){return(
hasVariable({
  module_name: "@tomlarkworthy/robocoop-3",
  variable_name: "robocoop3"
})(thisEnv())
)};
const _jz6ez5 = function _test_response_contains(checkResponseContains,sample_full_trace){return(
checkResponseContains({
  contains: ["observe", "@tomlarkworthy/runtime-sdk"]
})({
  trace: sample_full_trace
})
)};
const _rhkmt8 = function _test_tool_called(checkToolCalled,sample_full_trace){return(
checkToolCalled({
  tool_name: "eval",
  tool_args_exact: { code: "v => v.toString()" }
})({
  trace: sample_full_trace
})
)};
const _1wsbdn7 = function _46(sample_full_trace){return(
sample_full_trace
)};
const _agtcyj = function _test_modules(moduleMap,args){return(
moduleMap(args.runtime)
)};
const _1qx0jg5 = function _main_modules(moduleMap){return(
moduleMap()
)};
const _s7ac9u = function _49(md){return(
md`## Runner`
)};
const _sghu1q = function _task(Inputs,allTasks,task_bugfix_navigation){return(
Inputs.select(allTasks, {
  label: "test task",
  format: (task) => task?.name,
  value: task_bugfix_navigation
})
)};
const _ngmf1x = (G, _) => G.input(_);
const _1azo5uc = function _parameters(Inputs,initial_prompt){return(
Inputs.input({
  maxSteps: 100,
  systemPrompt: initial_prompt
})
)};
const _1k442co = (G, _) => G.input(_);
const _1ggq8x4 = function _env_div(htl){return(
htl.html`<div>`
)};
const _1lje2yz = async function _args(task,invalidation,env_div,parameters){return(
{
  ...(await task.environment({ invalidation, div: env_div})),
  prompt: task.prompt,
  ...parameters
}
)};
const _rnk25 = function _execution(robocoop3,args){return(
robocoop3(args)
)};
const _16wxroc = (G, _) => G.input(_);
const _1x9ff2l = function* _trace(execution,invalidation)
{
  if (
    execution?.steps &&
    execution.steps.at(-1).events.at(-1).type == "run_end"
  )
    yield execution;
  else yield invalidation;
};
const _1qdmbaf = function _trim_trace(){return(
(full_trace) => ({
  ...full_trace,
  steps: full_trace.steps.map((step) => ({
    ...step,
    tools: step.tools.map((tool) => ({
      ...tool,
      id: undefined,
      result: { ...tool.result, metadata: undefined }
    })),
    events: undefined
  }))
})
)};
const _zhp20l = function _test_trim_trace(trim_trace,sample_full_trace){return(
trim_trace(sample_full_trace)
)};
const _1hgs0yh = async function _multivariate_score(task,args,trace)
{
  return Object.assign(
    {},
    ...(await Promise.all(task.evaluators.map((e) => e({ ...args, trace }))))
  );
};
const _1097xie = function _scored_trace(args,multivariate_score,trim_trace,trace){return(
{
  user_prompt: args.prompt,
  score: multivariate_score,
  trace: trim_trace(trace)
}
)};
const _1kesf9j = function _61(md){return(
md`## Reflect`
)};
const _1nqkz1s = function _traceSummary(trace){return(
(scored_traces) =>
  scored_traces
    .map(
      (scored_trace) => `USER: ${scored_trace.user_prompt}
SCORE: ${JSON.stringify(scored_trace.score, null, 2)}
TRACE: ${JSON.stringify(trace, null, 2)}
`
    )
    .join("\n")
)};
const _zc4d59 = function _63(traceSummary,scored_trace){return(
traceSummary([scored_trace])
)};
const _1qk31cw = function _reflection(reflect,parameters,scored_trace){return(
reflect({
  parameters,
  scored_traces: [scored_trace]
})
)};
const _1dozc0c = function _reflect(traceSummary,responses){return(
async function reflect({ parameters, scored_traces }) {
  const prompt = parameters.systemPrompt;
  const sys = `You are a prompt‑engineer AI. You will be improving the performance of a prompt by considering recent executions of that prompt against a variate of tasks that were asked by a user. You need to look for ways to improve the SCORE by considering recent executions using that prompt and doing web research on the domain.

Your tasks is to improve the CURRENT PROMPT.
You will be given traces of several TASKS using the CURRENT PROMPT
and then respond only with the text of the improved using the improve_prompt tool`;

  const improve_msg = `CURRENT PROMPT:\n${prompt}\n${traceSummary(
    scored_traces
  )}`;
  const prompt_improvement_response = await responses({
    model: "gpt-5",
    input: improve_msg,
    tool_choice: "required",
    tools: [
      {
        type: "function",
        name: "improve_prompt",
        strict: true,
        description: "improves the prompt with the given refined prompt",
        parameters: {
          type: "object", // Does not support scalars
          properties: {
            improved_prompt: { type: "string" }
          },
          required: ["improved_prompt"],
          additionalProperties: false
        }
      }
    ]
  });
  return prompt_improvement_response.output.at(-1).arguments.improved_prompt;
}
)};
const _eni570 = function _66(md){return(
md`## Prompt Optimizer`
)};
const _1o5qewj = function _67(robocoop3){return(
robocoop3()
)};
const _1341xx4 = function _68(robocoop2){return(
robocoop2()
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  main.define("module @tomlarkworthy/robocoop-3", async () => runtime.module((await import("/@tomlarkworthy/robocoop-3.js?v=4")).default));  
  main.define("module @tomlarkworthy/gepa", async () => runtime.module((await import("/@tomlarkworthy/gepa.js?v=4")).default));  
  main.define("module @tomlarkworthy/exporter", async () => runtime.module((await import("/@tomlarkworthy/exporter.js?v=4")).default));  
  main.define("module @tomlarkworthy/module-map", async () => runtime.module((await import("/@tomlarkworthy/module-map.js?v=4")).default));  
  main.define("module @tomlarkworthy/cell-map", async () => runtime.module((await import("/@tomlarkworthy/cell-map.js?v=4")).default));  
  main.define("module @tomlarkworthy/runtime-sdk", async () => runtime.module((await import("/@tomlarkworthy/runtime-sdk.js?v=4")).default));  
  main.define("module @tomlarkworthy/openai-responses-api", async () => runtime.module((await import("/@tomlarkworthy/openai-responses-api.js?v=4")).default));  
  $def("_1bru4ar", null, ["md"], _1bru4ar);  
  main.define("robocoop3", ["module @tomlarkworthy/robocoop-3", "@variable"], (_, v) => v.import("robocoop3", _));  
  main.define("system_prompt", ["module @tomlarkworthy/robocoop-3", "@variable"], (_, v) => v.import("system_prompt", _));  
  main.define("robocoop2", ["module @tomlarkworthy/robocoop-3", "@variable"], (_, v) => v.import("robocoop2", _));  
  main.define("_0", ["module @tomlarkworthy/gepa", "@variable"], (_, v) => v.import("_0", _));  
  main.define("_1", ["module @tomlarkworthy/exporter", "@variable"], (_, v) => v.import("_1", _));  
  main.define("moduleMap", ["module @tomlarkworthy/module-map", "@variable"], (_, v) => v.import("moduleMap", _));  
  main.define("cellMap", ["module @tomlarkworthy/cell-map", "@variable"], (_, v) => v.import("cellMap", _));  
  main.define("runtime", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("runtime", _));  
  main.define("toObject", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("toObject", _));  
  main.define("responses", ["module @tomlarkworthy/openai-responses-api", "@variable"], (_, v) => v.import("responses", _));  
  $def("_1u2l71l", null, ["md"], _1u2l71l);  
  $def("_hafc4h", "thisEnv", ["runtime"], _hafc4h);  
  $def("_1fnpeip", "lopecode_tour_source", [], _1fnpeip);  
  $def("_10jer2m", null, ["md"], _10jer2m);  
  $def("_rosoty", "environment_tour", ["lopecode_tour_source"], _rosoty);  
  $def("_1jpvryk", "test_div", ["htl"], _1jpvryk);  
  $def("_8midta", "test_environment_tour", ["environment_tour","invalidation","test_div"], _8midta);  
  $def("_1y9rqtr", null, ["md"], _1y9rqtr);  
  $def("_t1ooj0", "initial_prompt", ["system_prompt"], _t1ooj0);  
  $def("_127koqn", null, ["md"], _127koqn);  
  $def("_189kmh8", "Task", [], _189kmh8);  
  main.define("viewof runtime_variables", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("viewof runtime_variables", _));  
  main.define("runtime_variables", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("runtime_variables", _));  
  main.define("thisModule", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("thisModule", _));  
  $def("_1xb7vwf", "viewof trainingModule", ["thisModule"], _1xb7vwf);  
  $def("_124xomu", "trainingModule", ["Generators","viewof trainingModule"], _124xomu);  
  $def("_13c0np9", "viewof allTasks", ["Inputs"], _13c0np9);  
  $def("_keq2n7", "allTasks", ["Generators","viewof allTasks"], _keq2n7);  
  $def("_1yo6d16", "allTasksCalc", ["runtime_variables","trainingModule","_","viewof allTasks","Event"], _1yo6d16);  
  $def("_1nkjlw1", null, ["md"], _1nkjlw1);  
  $def("_miyo1x", "task_list_modules", ["Task","environment_tour","hasModule","numSteps"], _miyo1x);  
  $def("_cx39z6", "task_create_a_module_and_an_import", ["Task","environment_tour","hasModule","hasVariable","checkValue","numSteps"], _cx39z6);  
  $def("_1y6g0g7", "task_question_trace_execution", ["Task","environment_tour","checkResponseContains","checkToolCalled"], _1y6g0g7);  
  $def("_10b28qo", "task_update_file", ["Task","environment_tour","checkToolCalled"], _10b28qo);  
  $def("_8wi60e", "task_vendor_dependancy_hono", ["Task","environment_tour","checkToolCalled"], _8wi60e);  
  $def("_f1c762", "task_call_aside_runtime_sdk", ["Task","environment_tour","checkToolCalled","checkResponseContains"], _f1c762);  
  $def("_1yhudfn", "task_bugfix_navigation", ["Task","environment_tour","hasVariable","checkToolCalled","checkResponseContains","numSteps"], _1yhudfn);  
  $def("_1chky4l", null, ["md"], _1chky4l);  
  $def("_vwsos2", "numSteps", [], _vwsos2);  
  $def("_1tg1pdm", "hasModule", ["moduleMap"], _1tg1pdm);  
  $def("_1ee0akh", "hasVariable", ["moduleMap"], _1ee0akh);  
  $def("_1e85jvw", "checkValue", ["moduleMap"], _1e85jvw);  
  $def("_zsy0d9", "checkResponseContains", ["d3"], _zsy0d9);  
  $def("_17q9mlx", "checkToolCalled", [], _17q9mlx);  
  $def("_l8rcxt", null, ["md"], _l8rcxt);  
  $def("_1v5j06o", "sample_full_trace", [], _1v5j06o);  
  $def("_osuvx6", "test_hasModule", ["hasModule","thisEnv"], _osuvx6);  
  $def("_137dj3e", "test_hasCell", ["hasVariable","thisEnv"], _137dj3e);  
  $def("_jz6ez5", "test_response_contains", ["checkResponseContains","sample_full_trace"], _jz6ez5);  
  $def("_rhkmt8", "test_tool_called", ["checkToolCalled","sample_full_trace"], _rhkmt8);  
  $def("_1wsbdn7", null, ["sample_full_trace"], _1wsbdn7);  
  $def("_agtcyj", "test_modules", ["moduleMap","args"], _agtcyj);  
  $def("_1qx0jg5", "main_modules", ["moduleMap"], _1qx0jg5);  
  $def("_s7ac9u", null, ["md"], _s7ac9u);  
  $def("_sghu1q", "viewof task", ["Inputs","allTasks","task_bugfix_navigation"], _sghu1q);  
  $def("_ngmf1x", "task", ["Generators","viewof task"], _ngmf1x);  
  $def("_1azo5uc", "viewof parameters", ["Inputs","initial_prompt"], _1azo5uc);  
  $def("_1k442co", "parameters", ["Generators","viewof parameters"], _1k442co);  
  $def("_1ggq8x4", "env_div", ["htl"], _1ggq8x4);  
  $def("_1lje2yz", "args", ["task","invalidation","env_div","parameters"], _1lje2yz);  
  main.define("variablesXML", ["module @tomlarkworthy/robocoop-3", "@variable"], (_, v) => v.import("variablesXML", _));  
  $def("_rnk25", "viewof execution", ["robocoop3","args"], _rnk25);  
  $def("_16wxroc", "execution", ["Generators","viewof execution"], _16wxroc);  
  $def("_1x9ff2l", "trace", ["execution","invalidation"], _1x9ff2l);  
  $def("_1qdmbaf", "trim_trace", [], _1qdmbaf);  
  $def("_zhp20l", "test_trim_trace", ["trim_trace","sample_full_trace"], _zhp20l);  
  $def("_1hgs0yh", "multivariate_score", ["task","args","trace"], _1hgs0yh);  
  $def("_1097xie", "scored_trace", ["args","multivariate_score","trim_trace","trace"], _1097xie);  
  $def("_1kesf9j", null, ["md"], _1kesf9j);  
  $def("_1nqkz1s", "traceSummary", ["trace"], _1nqkz1s);  
  $def("_zc4d59", null, ["traceSummary","scored_trace"], _zc4d59);  
  $def("_1qk31cw", "reflection", ["reflect","parameters","scored_trace"], _1qk31cw);  
  $def("_1dozc0c", "reflect", ["traceSummary","responses"], _1dozc0c);  
  $def("_eni570", null, ["md"], _eni570);  
  $def("_1o5qewj", null, ["robocoop3"], _1o5qewj);  
  $def("_1341xx4", null, ["robocoop2"], _1341xx4);
  return main;
}