const _16o63kq = function _1(md){return(
md`# Roboco-op 3.0: Agentic Notebook Assistent
`
)};
const _1izznyj = function _ui(endpoint,keepalive,myModule,htl,reversibleAttach,ui_attached,style,$0,$1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
{
  endpoint;
  keepalive(myModule, "initial_response");
  const ui = htl.html`<div>
  <h2>Robocoop 3.0</h2>
  ${reversibleAttach(ui_attached, style)}
  ${reversibleAttach(ui_attached, $0)}
  ${
    $0.value !=
    "https://openai-proxy.endpointservices.workers.dev/v1/responses"
      ? reversibleAttach(ui_attached, $1)
      : undefined
  }
  ${reversibleAttach(ui_attached, $2)}
  ${reversibleAttach(ui_attached, $3)}
  ${reversibleAttach(ui_attached, $4)}
  ${reversibleAttach(ui_attached, $5)}
  ${reversibleAttach(ui_attached, $6)}
  ${reversibleAttach(ui_attached, $7)}
  ${reversibleAttach(ui_attached, $8)}
  <div style="max-height: 1024px; overflow: auto">
    ${reversibleAttach(ui_attached, $9)}
  </div>
  ${reversibleAttach(ui_attached, $10)}
</div>`;

  setTimeout(() => {
    $9.parentNode.scrollTop =
      $9.parentNode.scrollHeight;
  }, 0);
  return ui;
};
const _ncol52 = function _3(history){return(
history
)};
const _jafizi = function _4(md){return(
md`\`\`\`js
import { ui, expect} from "@tomlarkworthy/agentic-planner"
\`\`\``
)};
const _nnn7ef = function _about(md){return(
md`## About

Roboco-op 2.0 runs inside the notebook along side userspace code. This means it can **read program values** and **write new cells**. It has the dataflow dependancy graph at hand which it uses to gather context. The notebook environment is reactive, so modifications are applied immediately and cascade to only the cells downstream of dataflow. The agent can write new tools, test its code, and draw diagrams. 

This is a better workflow for agents than mainstream development tooling, where code and program are separate and programs must be repeatedly restarted from scratch. In Roboco-op the agent is reactively syncronized to the running program state and able to modify code in-flight.

Inline unit tests update reactively too, and the notebook supports data-viz out-of-the-box. When running on [ObservableHQ.com](https://observablehq.com/@tomlarkworthy/agentic-planner) the cells it creates are not visible, but they exist and can be depended on, when running on [Lopecode](https://github.com/tomlarkworthy/lopecode) changes are visible. `
)};
const _461wdj = function _6(md){return(
md`## TDD`
)};
const _1g7mcwt = function _7(md){return(
md`## Failing Tests`
)};
const _1y8es21 = function _failing_tests(tests){return(
tests({
  filter: (test) => test.computed && test.state == "rejected"
})
)};
const _t3njx4 = (G, _) => G.input(_);
const _1kwjyta = function _tests_module($0,myModule){return(
$0.value.get(myModule)
)};
const _btqeu5 = function _10(md){return(
md`## Architecture`
)};
const _in8knv = function _11(md){return(
md`Inspired by [Cline](https://github.com/cline/cline)`
)};
const _1ce7rm4 = function _design(mermaid,md){return(
md`The design is extremely simple. The bot is [forced to pick a tool each iteration](https://community.openai.com/t/new-api-feature-forcing-function-calling-via-tool-choice-required/731488). We have two lifecycle tools, \`attempt_completion\` or \`ask_followup_question\`, and several task tools. The bot then just keeps calling the tools, and the tools execute and repost to the API and the bot calls a new tool. The lifecycle tools are special cases that hold up the control flow for human interaction.

${mermaid`flowchart TD
    Start([Prompt])
    End([End])
    Start --> Pick[LLM call]
    Pick -- "function_call" --> Type{Tool type?}

    Type -- "Lifecycle tool" --> Human
    
    Human --> End
    Human --> Respond

    Type -- "Task tool" --> Respond

    Respond -- "function_output" --> Pick


    
`}`
)};
const _v8mm5y = function _13(md){return(
md`## TODO

- MCP integration
- Reading cells as images
- FileAttachment support
- Fix main issue with tests`
)};
const _yscj8e = function _15(exporter){return(
exporter()
)};
const _1g4ofv7 = function _16(md){return(
md`## Interface`
)};
const _1jn1r5 = function _ui_attached(Inputs){return(
Inputs.toggle({
  label: "ui_attached",
  value: true
})
)};
const _bskwvt = (G, _) => G.input(_);
const _1jq90a4 = function _style(htl){return(
htl.html`<style>
  .plan div {
    font-size: 1em;
    padding: 0.25rem;
    border: black solid 1px;
  }
</style>`
)};
const _c9r9j2 = function _endpoint(Inputs,localStorageView){return(
Inputs.bind(
  Inputs.select(
    new Map([
      [
        "demo",
        "https://openai-proxy.endpointservices.workers.dev/v1/responses"
      ],
      ["OpenAI", "https://api.openai.com/v1/responses"]
    ]),
    {
      label: "OpenAI API URL"
    }
  ),
  localStorageView("OPENAI_API_URL", {
    defaultValue:
      "https://openai-proxy.endpointservices.workers.dev/v1/responses"
  })
)
)};
const _1fnnsmd = (G, _) => G.input(_);
const _1txbblt = function _OPENAI_API_KEY(Inputs,localStorageView){return(
Inputs.bind(
  Inputs.password({
    label: "OPENAI_API_KEY",
    placeholder: "paste openAI key here"
  }),
  localStorageView("OPENAI_API_KEY")
)
)};
const _13dv669 = (G, _) => G.input(_);
const _6yyt4 = function _model(Inputs,reasoning_models){return(
Inputs.select(reasoning_models, { label: "model" })
)};
const _1870whr = (G, _) => G.input(_);
const _m7d8oz = function _active_tools(Inputs,tools){return(
Inputs.select(new Map(tools.map((t) => [t.name, t])), {
  multiple: true,
  value: tools,
  label: "active tools"
})
)};
const _1igg1su = (G, _) => G.input(_);
const _115w3tw = function _prompt_example(Inputs,prompts){return(
Inputs.select(prompts, { label: "example prompts" })
)};
const _hj14lj = (G, _) => G.input(_);
const _1qmugm1 = function _workingModule(Inputs,currentModules){return(
Inputs.select(
  [...currentModules.values()].map((m) => m.name),
  {
    label: "working module"
  }
)
)};
const _1kn1o8x = (G, _) => G.input(_);
const _1h6bc4v = function _prompt(Inputs,prompt_example){return(
Inputs.textarea({
  label: "prompt",
  submit: "go",
  value: prompt_example,
  minlength: 1
})
)};
const _1bmfswu = (G, _) => G.input(_);
const _ky787b = function _yolo(Inputs){return(
Inputs.toggle({ label: "YOLO", value: true })
)};
const _1xsltmx = (G, _) => G.input(_);
const _17zvxe4 = function _clear(Inputs,$0,Event){return(
Inputs.button("clear", {
  reduce: () => {
    $0.value = [];
    $0.dispatchEvent(new Event("input"));
  }
})
)};
const _ssh4lj = (G, _) => G.input(_);
const _1jvfmlb = function _history_ui(plan,calls){return(
plan(calls)
)};
const _z2whbr = (G, _) => G.input(_);
const _1qygd0c = function _undo_last(Inputs,$0,Event){return(
Inputs.button("undo last", {
  reduce: () => {
    $0.value = $0.value.slice(0, -2);
    $0.dispatchEvent(new Event("input"));
  }
})
)};
const _1silskh = (G, _) => G.input(_);
const _c7lmbg = function _31(md){return(
md`## Tools`
)};
const _walyhh = function _tools(attempt_completionTool,ask_followup_questionTool,list_modulesTool,list_cellsTool,describe_cellsTool,create_cellTool,replace_cellTool,peek_variableTool,search_cellsTool){return(
[
  //evalJavaScriptTool,
  attempt_completionTool,
  ask_followup_questionTool,
  list_modulesTool,
  list_cellsTool,
  describe_cellsTool,
  create_cellTool,
  replace_cellTool,
  peek_variableTool,
  search_cellsTool
]
)};
const _1jqxaox = function _33(md){return(
md`#### attempt_completion

`
)};
const _1cz7mxj = function _attempt_completionTool($0){return(
{
  type: "function",
  name: "attempt_completion",
  strict: true,
  description:
    "Use this tool to present the final *validated* conclusion to the user.",
  parameters: {
    type: "object",
    properties: {
      result: {
        type: "string",
        description:
          "The result of the task. Formulate this result in a way that is final and does not require further input from the user. Don't end your result with questions or offers for further assistance."
      }
    },
    required: ["result"],
    additionalProperties: false
  },
  execute: async ({ result } = {}) => $0.value
}
)};
const _59qgsf = function _completionFeedback(Inputs){return(
Inputs.textarea({
  placeholder: "add feedback to continue",
  submit: "feedback"
})
)};
const _a9ct0l = (G, _) => G.input(_);
const _1p2ebnn = function _attempCompletetionDialog($0,runTools,Event,htl,md){return(
(calls_view, latest, tool) => {
  $0.value = "";
  const listener = async (event) => {
    $0.removeEventListener("input", listener);
    const response = await runTools(latest);
    calls_view.value.push(response);
    calls_view.dispatchEvent(new Event("input"));
  };
  $0.addEventListener("input", listener);
  return htl.html`
  ${md`${tool.arguments.result}`}
  ${$0}
`;
}
)};
const _161yhg = function _37(md){return(
md`#### ask_followup_question `
)};
const _1mw7edk = function _ask_followup_questionTool($0){return(
{
  type: "function",
  name: "ask_followup_question",
  strict: true,
  description:
    " Ask the user a question to gather additional information needed to complete the task. This tool should be used when you encounter ambiguities, need clarification, or require more details to proceed effectively. It allows for interactive problem-solving by enabling direct communication with the user. Use this tool judiciously to maintain a balance between gathering necessary information and avoiding excessive back-and-forth.",
  parameters: {
    type: "object",
    properties: {
      question: {
        type: "string",
        description:
          "The question to ask the user. This should be a clear, specific question that addresses the information you need."
      }
    },
    required: ["question"],
    additionalProperties: false
  },
  execute: async ({ result } = {}) => $0.value
}
)};
const _wr8zod = function _followUpResponse(Inputs){return(
Inputs.textarea({
  placeholder: "enter your response",
  submit: "respond"
})
)};
const _aqdrc3 = (G, _) => G.input(_);
const _bcz4mo = function _followUpQuestionDialog($0,runTools,Event,htl,md){return(
(calls_view, latest, tool) => {
  $0.value = "";
  const listener = async (event) => {
    $0.removeEventListener("input", listener);
    const response = await runTools(latest);
    calls_view.value.push(response);
    calls_view.dispatchEvent(new Event("input"));
  };
  $0.addEventListener("input", listener);
  return htl.html`
  ${md`${tool.arguments.question}`}
  ${$0}
`;
}
)};
const _1cxe74d = function _41(md){return(
md`#### evalJavaScriptTool`
)};
const _b3h9o3 = function _42(evalJavaScriptTool){return(
evalJavaScriptTool
)};
const _1yxceuq = function _43(md){return(
md`#### list_modules `
)};
const _jsuo0j = function _list_modulesTool(runtimeSummary){return(
{
  type: "function",
  name: "list_modules",
  strict: true,
  description:
    "Use this to discover all loaded modules in the runtime. Modules are notebooks and contains cells and file attachments",
  parameters: {
    type: "object",
    properties: {},
    required: [],
    additionalProperties: false
  },
  execute: async ({ result } = {}) => runtimeSummary()
}
)};
const _1bm2qgz = function _runtimeSummary(getModules){return(
async () => {
  const moduleMap = await getModules();
  const modules = [...moduleMap.values()].sort();
  return `### modules\n${modules
    .map(
      (module) => `- ${module.name}${
        module?.dependsOn?.length > 0
          ? `\n  - dependsOn\n${
              module.dependsOn &&
              module.dependsOn.map((d) => `    - ${d}`).join("\n")
            }`
          : ""
      }
`
    )
    .join("")}`;
}
)};
const _13x73gy = async function _test_list_modulesTool(md,list_modulesTool){return(
md`${await list_modulesTool.execute()}`
)};
const _1ajke8l = function _48(md){return(
md`#### list_cells`
)};
const _175ebht = function _list_cellsTool(getModule,cellMapCompat,summarizeCell){return(
{
  type: "function",
  name: "list_cells",
  strict: true,
  description:
    "Use this list the cells in a module. They are listed in the order they appear in a notebook. Adjacent cells are likely to be semantically related, but functionally ordering does not matter. Anonymous cells could be documentation for a nearby code cell.",
  parameters: {
    type: "object",
    properties: {
      module_name: {
        type: "string"
      }
    },
    required: ["module_name"],
    additionalProperties: false
  },
  execute: async ({ module_name } = {}) => {
    const module = await getModule(module_name);
    if (!module) return `Error: module ${module_name} not found`;
    const cells = await cellMapCompat(module.module);

    return `${module_name} contents:\n
${[...cells.entries()]
  .map(([name, variables]) => summarizeCell({ name, variables }))
  .join("")}
    `;

    return cells;
  }
}
)};
const _8vdyf9 = function _test_list_cellsTool(list_cellsTool){return(
list_cellsTool.execute({
  module_name: "main"
})
)};
const _qju1bw = function _51(md){return(
md`### search_cells`
)};
const _eatsit = function _search_cellsTool(getModule,moduleMap,runtime,cellMapCompat,decompile,cellDescription){return(
{
  type: "function",
  name: "search_cells",
  strict: true,
  description:
    "Search for cells in the runtime module whose source code matches a regular expression. Returns up to 20 matching cells",
  parameters: {
    type: "object",
    properties: {
      module_name: { type: ["string", "null"] },
      pattern: { type: "string" },
      flags: { type: "string" }
    },
    required: ["module_name", "pattern", "flags"],
    additionalProperties: false
  },
  execute: async ({ module_name, pattern, flags = "" } = {}) => {
    const modules = module_name
      ? [await getModule(module_name)]
      : [...(await moduleMap(runtime)).values()];

    if (!module_name && !modules[0])
      return "Error: module " + module_name + " not found";

    const results = [];
    let regex;
    try {
      regex = new RegExp(pattern, flags);
    } catch (err) {
      return "Error: invalid regular expression: " + err.message;
    }

    for (let module of modules) {
      if (results.length >= 20) break;
      const cells = await cellMapCompat(module.module);

      for (const [cell_name, variables] of cells.entries()) {
        if (results.length >= 20) break;
        const source = await decompile(variables);
        if (regex.test(source)) {
          results.push({
            module,
            cell_name,
            variables,
            source
          });
        }
      }
    }
    if (results.length === 0)
      return (
        "No cells matching /" +
        pattern +
        "/" +
        flags +
        " in module " +
        module_name
      );
    return (
      "Cells matching /" +
      pattern +
      "/" +
      flags +
      " in module " +
      module_name +
      " (up to 20):\n" +
      (
        await Promise.all(
          results.map((n) =>
            cellDescription(n.module.name, n.cell_name, n.variables, n.source)
          )
        )
      ).join("\n")
    );
  }
}
)};
const _1jdx5j8 = function _searchPattern(Inputs){return(
Inputs.text({
  label: "search pattern",
  value: "^test_"
})
)};
const _14scyu4 = (G, _) => G.input(_);
const _142ksbv = function _test_search_for_cell_digit_name(search_cellsTool,searchPattern)
{
  debugger;
  const result = search_cellsTool.execute({
    module_name: null,
    pattern: searchPattern,
    flags: ""
  });
  return result;
};
const _1fax9qe = function _summarizeCell(){return(
({ name, variables } = {}) => {
  const definitionSize = variables.reduce(
    (total, variable) => variable._definition.toString().length,
    0
  );
  return `- ${typeof name == "string" ? name : `${name}`}
  - inputs: [${variables[0]._inputs.map((i) => i._name)}]
  - reachable: ${variables[0]._reachable}
  - definition size: ${definitionSize} bytes
`;
}
)};
const _14ikjbz = function _58(md){return(
md`#### describe_cells`
)};
const _5yasbn = function _cellDescription(summarizeVariable){return(
async (module_name, cell_name, variables, source) => {
  return `#### module '${module_name}' cell '${
    variables[0]._name || cell_name
  }':
- inputs: [${variables[0]._inputs.map((i) => i._name)}]
- outputs: [${[...variables[0]._outputs].map((i) => i._name)}]
- reachable: ${variables[0]._reachable}${
    variables[0]._reachable
      ? `\n- value: ${await summarizeVariable(
          variables[0]._name,
          variables[0],
          {
            max_size: 1
          }
        )}\n`
      : ""
  }
<code>
${source}
</code>
`;
}
)};
const _1dz0xgr = function _describe_cellsTool(getModule,cellMapCompat,decompile,cellDescription){return(
{
  type: "function",
  name: "describe_cells",
  strict: true,
  description:
    "Describes cells, their inputs cells and their output cells, and their definition in a <code>...</code> block.",
  parameters: {
    type: "object",
    properties: {
      module_name: {
        type: "string"
      },
      cell_names: {
        type: ["array"],
        items: {
          type: ["string", "number"]
        }
      }
    },
    required: ["module_name", "cell_names"],
    additionalProperties: false
  },
  execute: async ({ module_name, cell_names } = {}) => {
    const module = await getModule(module_name);
    if (!module) return `Error: module ${module_name} not found`;
    const cells = await cellMapCompat(module.module);

    return `### module ${module_name}
${(
  await Promise.all(
    cell_names.map(async (cell_name) => {
      if (!cells.has(cell_name))
        return `Error: cell ${cell_name} not found in module ${module_name}`;
      const variables = cells.get(cell_name);
      const source = await decompile(variables);
      return cellDescription(module_name, cell_name, variables, source);
    })
  )
).join("\n")}

`;
  }
}
)};
const _1przjrg = function _test_describe_cellsTool(describe_cellsTool){return(
describe_cellsTool.execute({
  module_name: "@tomlarkworthy/module-map",
  cell_names: [0, "moduleMap"]
})
)};
const _pu2glx = function _62(md){return(
md`### create_cell`
)};
const _17h7az7 = function _create_cellTool(getModule,cellMapCompat,runtime,createCell,repositionSetElement,summarizeVariable){return(
{
  type: "function",
  name: "create_cell",
  strict: true,
  description:
    "Add cells to the runtime. Optionally specify after_cell to insert after an existing cell.",
  parameters: {
    type: "object",
    properties: {
      module_name: { type: "string" },
      source: { type: "string" },
      after_cell: { type: ["integer", "string", "null"] }
    },
    required: ["module_name", "source", "after_cell"],
    additionalProperties: false
  },
  execute: async ({ module_name, source, after_cell } = {}) => {
    const module = await getModule(module_name);
    if (!module) return `Error: module ${module_name} not found`;
    let idx = -1;
    if (after_cell) {
      const cells = await cellMapCompat(module.module);
      if (!cells.has(after_cell))
        return `Error: cell '${after_cell}' not found in module '${module_name}'`;
      const target = cells.get(after_cell).at(-1);
      idx = [...runtime._variables].findIndex((v) => v === target) + 1;
      if (idx < 0) return `Error: could not locate target cell '${after_cell}'`;
    }
    let variables;
    try {
      variables = createCell({
        module: module.module,
        source
      });
    } catch (err) {
      return `Error: ${err?.message || err}`;
    }
    if (after_cell) {
      variables.forEach((v, i) =>
        repositionSetElement(runtime._variables, v, idx + i)
      );
    }
    return summarizeVariable(variables[0]._name, variables[0]);
  }
}
)};
const _1t4vii0 = function _test_create_cellTool(create_cellTool)
{
  return create_cellTool.execute({
    module_name: "main",
    source: "akljlksda = {}"
  });
};
const _1iqus76 = function _test_create_cell_dupe(create_cellTool){return(
create_cellTool.execute({
  module_name: "main",
  source: "createCell = 54"
})
)};
const _1417w1f = function _test_create_cell_after(create_cellTool){return(
create_cellTool.execute({
  module_name: "main",
  source: "after_cell_test_4 = 81",
  after_cell: 1
})
)};
const _12ukdo5 = function _createCell(compile,main){return(
function createCell({ module, source } = {}) {
  const defs = compile(source);
  // check for collisions
  debugger;
  defs.forEach((def) => {
    if (
      def._name &&
      module._scope.has(def._name) &&
      /* scoped variables can exist for errors but not actually be real in the runtime*/ main._runtime._variables.has(
        module._scope.get(def._name)
      )
    ) {
      throw "duplicate name";
    }
  });
  const variables = defs.map((def) => {
    let _fn;
    eval("_fn = " + def._definition);
    return module.variable({}).define(def._name, def._inputs, _fn);
  });
  return variables;
}
)};
const _2fi3ih = function _test_create_cell_anon(createCell,myModule){return(
createCell({ module: myModule, source: "45" })
)};
const _11y956c = function _69(md){return(
md`### replace_cell`
)};
const _xbz3qe = function _replace_cellTool(getModule,cellMapCompat,replaceCell){return(
{
  type: "function",
  name: "replace_cell",
  strict: true,
  description: "Replace a cell with a new definition.",
  parameters: {
    type: "object",
    properties: {
      module_name: {
        type: "string"
      },
      cell_name: {
        type: "string"
      },
      source: {
        type: "string"
      }
    },
    required: ["module_name", "cell_name", "source"],
    additionalProperties: false
  },
  execute: async ({ module_name, cell_name, source } = {}) => {
    const module = await getModule(module_name);
    if (!module) return `Error: module ${module_name} not found`;
    const cells = await cellMapCompat(module.module);
    if (!cells.has(cell_name))
      return `Error: cell '${cell_name}' in module '${module_name}' not found.`;
    const variables = cells.get(cell_name);
    try {
      const cell = replaceCell({
        module: module.module,
        variables,
        source
      });
    } catch (err) {
      return `Error: ${err.message}`;
    }
    return `ok`;
  }
}
)};
const _reod1b = function _replaceCell(compile,runtime,repositionSetElement){return(
function replaceCell({ module, source, variables } = {}) {
  const defs = compile(source);
  
  let resposition = false, insertionIndex = -1;
  if (defs.length !== variables.length) {
    resposition = true;
    insertionIndex =
        [...runtime._variables].findIndex(
          (v) => v == variables.at(-1)
        );
    variables.forEach((v) => v.delete());
    for (let i = 0; i < defs.length; i++) {
      variables.push(module.variable({}));
    }
  }

  defs.forEach((v, i) => {
    const variable = variables[i];
    let _fn;
    eval("_fn = " + v._definition);
    variable.define(v._name, v._inputs, _fn);
    if (resposition)
      repositionSetElement(runtime._variables, variable, insertionIndex + i);
  });
  return variables;
}
)};
const _4wefdv = function _sample_variable(){return(
43
)};
const _147eow = function _test_replace_cellTool(replace_cellTool){return(
replace_cellTool.execute({
  module_name: "main",
  cell_name: "sample_variable",
  source: "sample_variable = 52"
})
)};
const _16lx1ld = function _74(md){return(
md`### peek_cell`
)};
const _l4bdt9 = function _75(md){return(
md`TODO:
- Allow applying a function to the output with Javascript (e.g. CSS selector)`
)};
const _h765yy = function _summarizeVariable(observe,summarizeJS){return(
async function summarizeVariable(
  variable_name,
  variable,
  { max_size = 0 } = {}
) {
  let cancel;
  const result = await new Promise((resolve) => {
    setTimeout(() => {
      resolve(`variable '${variable_name}' is pending`);
    }, 2000);
    cancel = observe(variable, {
      fulfilled: (value) => resolve(summarizeJS(value, { max_size })),
      rejected: (error) =>
        resolve(
          `variable '${variable_name}' in an an error state: ${summarizeJS(
            error,
            { max_size }
          )}`
        )
    });
  });
  return result;
}
)};
const _sqqiyy = function _peek_variableTool(getModule,cellMapCompat,summarizeVariable){return(
{
  type: "function",
  name: "peek_variable",
  strict: true,
  description:
    "Query the value of a variable, often the name of the cell owning it, but views and mutable cells contain two variables",
  parameters: {
    type: "object",
    properties: {
      module_name: {
        type: "string"
      },
      variable_name: {
        type: "string"
      },
      max_size: {
        type: "integer"
      }
    },
    required: ["module_name", "variable_name", "max_size"],
    additionalProperties: false
  },
  execute: async ({ module_name, variable_name, max_size } = {}) => {
    const module = await getModule(module_name);
    if (!module) return `Error: module ${module_name} not found`;
    const cells = await cellMapCompat(module.module);
    const options = [
      variable_name,
      `viewof ${variable_name}`,
      `mutable ${variable_name}`
    ];
    const cell_title = options.find((option) => cells.get(option));
    if (cell_title === undefined)
      return `can't find variables under ${variable_name}`;
    const variables = cells.get(cell_title);
    let variable;
    if (variables.length == 1) variable = variables[0];
    else {
      variable = variables.find((v) => v._name == variable_name);
    }

    return await summarizeVariable(variable_name, variable);
  }
}
)};
const _5vt8mq = function _test_peek_variableTool(peek_variableTool){return(
peek_variableTool.execute({
  module_name: "main",
  variable_name: "peek_variableTool",
  max_size: 1000
})
)};
const _1bn2vyp = function _cool(){return(
"43"
)};
const _sz4j13 = (M, _) => new M(_);
const _u6l5aa = _ => _.generator;
const _1uzcztz = function _errored()
{
  throw Error("deliberate error for testing");
};
const _g8n27m = function _pending(){return(
new Promise(() => {})
)};
const _12eoy7p = function _test_peek_variableTool_mutable(peek_variableTool){return(
peek_variableTool.execute({
  module_name: "main",
  variable_name: "cool",
  max_size: 1000
})
)};
const _xzx4ht = function _test_peek_variableTool_error(peek_variableTool){return(
peek_variableTool.execute({
  module_name: "main",
  variable_name: "errored",
  max_size: 1000
})
)};
const _1ctu6xh = function _test_peek_variableTool_pending(peek_variableTool){return(
peek_variableTool.execute({
  module_name: "main",
  variable_name: "pending",
  max_size: 1000
})
)};
const _1os2s12 = function _test_peek_variableTool_tests(peek_variableTool){return(
peek_variableTool.execute({
  module_name: "main",
  variable_name: "failing_tests",
  max_size: 1000
})
)};
const _9w1g4i = function _87(md){return(
md`### Helpers`
)};
const _wuusw5 = function _moduleVariables(){return(
(module) =>
  module._runtime._variables.filter((v) => v._module == module)
)};
const _14bivfb = function _myModule(thisModule){return(
thisModule()
)};
const _1cir47e = (G, _) => G.input(_);
const _1owbcg2 = function _getModules(moduleMap){return(
async function getModules() {
  return moduleMap();
}
)};
const _1v5c0nc = function _getModule(getModules){return(
async function getModule(name) {
  const modules = await getModules();
  return [...modules.values()].find((m) => m.name == name);
}
)};
const _1mx7oy1 = function _97(md){return(
md`## Static Data`
)};
const _18y14x3 = function _prompts(){return(
[
  "",
  "Explain how moduleMap works",
  "add a function to compute fibonacci sequence",
  "is yolo toggled?",
  "create some synthetic data and then visualize it with Plot (inbuilt function)"
]
)};
const _4vg4xa = function _reasoning_models(){return(
["gpt-5-mini", "o4-mini", "o3-mini", "o3"]
)};
const _zapaxn = function _100(md){return(
md`## State`
)};
const _jioq9z = async function _initial_response($0,Event,responses,$1,model,instructions,prompt,$2)
{
  console.log("initial_response");
  debugger;
  $0.value = [];
  $0.dispatchEvent(new Event("input"));
  const call = await responses({
    url: $1.value,
    model,
    instructions,
    input: prompt,
    tools: $2.value,
    parallel_tool_calls: false,
    reasoning: {
      effort: "high",
      summary: "auto"
    },
    tool_choice: "required"
  });
  $0.value.push(call);
  $0.dispatchEvent(new Event("input"));
};
const _jv7s0w = function _102(step,calls){return(
step(calls[5])
)};
const _1i51d01 = function _calls(Inputs){return(
Inputs.input([])
)};
const _6v62gr = (G, _) => G.input(_);
const _1df9hw4 = function _104(md){return(
md`## UI Builders`
)};
const _131n02f = function _actions(error,$0,runTools,Event,htl,Inputs,followUpQuestionDialog,attempCompletetionDialog){return(
(calls_view, latest) => {
  if (!latest) return undefined;

  if (latest.error) return error(latest.error)
  
  const toolCalls = latest.output.filter((o) => o.type == "function_call");
  const actions = toolCalls.map((f) => f.name);

  if (
    !actions.includes("ask_followup_question") &&
    !actions.includes("attempt_completion") &&
    $0.value
  ) {
    runTools(latest).then((response) => {
      calls_view.value.push(response);
      calls_view.dispatchEvent(new Event("input"));
    });
    return undefined;
  }
  return htl.html`<div class="actions" style="display: flex;">
${
  !actions.includes("ask_followup_question") &&
  !actions.includes("attempt_completion")
    ? Inputs.button("execute", {
        reduce: async () => {
          const response = await runTools(latest);
          calls_view.value.push(response);
          calls_view.dispatchEvent(new Event("input"));
        }
      })
    : undefined
}
${
  actions.includes("ask_followup_question")
    ? followUpQuestionDialog(
        calls_view,
        latest,
        toolCalls.find((call) => call.name == "ask_followup_question")
      )
    : undefined
}
${
  actions.includes("attempt_completion")
    ? attempCompletetionDialog(
        calls_view,
        latest,
        toolCalls.find((call) => call.name == "attempt_completion")
      )
    : undefined
}
</div>`;
}
)};
const _cp97rx = function _error(htl){return(
(error) => {
  return htl.html`<div class="error">
<h4>error</h4>
<pre>
${JSON.stringify(error, null, 2)}
</pre>
</div>`;
}
)};
const _18y2fbu = function _plan(htl,step,actions,$0){return(
(calls) => htl.html`<div class="plan">
<div class="history">
  ${calls.filter((x) => x).map(step)}
</div>
${actions($0, calls.at(-1))}
</div>`
)};
const _18bdsm5 = function _step(htl,input,output){return(
(response) =>
  htl.html`<div id=${response.id} class="step">
  <div>
    ${response.input.map((i) => input(response, i))}
  </div>
  <div>
    ${response.output && response.output.map((o) => output(response, o))}
  </div>
</div>`
)};
const _1dnczct = function _input(input_function_call_output,input_content){return(
(response, input) => {
  if (input.type == "function_call_output")
    return input_function_call_output(response, input);
  else if (input.content) return input_content(response, input);
  else console.error("unhandled input type", input.type);
}
)};
const _1sj2gan = function _input_content(htl){return(
(response, input) => htl.html`<div 
    id=${input.id}
    class="input_message">
    <b>${input.role}</b>: ${input.content}
</div>`
)};
const _o87j69 = function _input_function_call_output(htl,md){return(
(response, input) => htl.html`<div 
    id=${input.id}
    class="function_call_output">
    <h4>function_call_output</h4>
    ${md`${input.output}`}
</div>`
)};
const _1z0s0yo = function _output(output_message,output_message_function_call,output_message_reasoning){return(
(response, output) => {
  if (output.type == "message") return output_message(response, output);
  else if (output.type == "function_call")
    return output_message_function_call(response, output);
  else if (output.type == "reasoning")
    return output_message_reasoning(response, output);
  else {
    console.error("unhandled output type", output.type);
  }
}
)};
const _1n053ok = function _output_message_function_call(htl){return(
(response, output) => htl.html`<div 
    id=${output.id}
    class="function_call">
    <h4>function_call</h4>
    <code>
      ${output.name}(${JSON.stringify(output.arguments, null, 2)})
    </code>
</div>`
)};
const _nm6wn9 = function _output_message_reasoning(htl,output_message_reasoning_summary){return(
(response, output) => htl.html`<div 
    id=${output.id}
    class="reasoning">
    <h4>reasoning</h4>
    ${output.summary.map((summary) =>
      output_message_reasoning_summary(response, output, summary)
    )}
</div>`
)};
const _u7n300 = function _output_message_reasoning_summary(html){return(
(response, output, summary) => {
  return html`<div class="summary_text">
    ${summary.text}
  </div>`;
}
)};
const _11n8wbe = function _output_message(htl,output_message_content){return(
(response, output) => htl.html`<div 
    id=${output.id}
    class="plan_output">
    <h4>output_message</h4>
    ${output.content.map((content) =>
      output_message_content(response, output, content)
    )}
</div>`
)};
const _9svh97 = function _output_message_content(output_message_content_output_text){return(
(response, output, content) => {
  if (content.type == "output_text")
    return output_message_content_output_text(response, output, content);
  else {
    console.error("unhandled content type", content.type);
  }
}
)};
const _1rz9543 = function _output_message_content_output_text(htl,md){return(
(
  response,
  output,
  content
) => htl.html`<div 
    id=${output.id}
    class="output_text">
    ${md`${content.text}`}
</div>`
)};
const _10k3mya = function _119(md){return(
md`## Prompt`
)};
const _dpd8cm = function _120(context_menu){return(
context_menu
)};
const _1uw2jgm = async function _122(workingModule,md,instructions)
{
  workingModule;
  return md`${await instructions()}`;
};
const _idnav9 = function _instructions(keepalive,myModule,$0,tests_module,peek_variableTool)
{
  keepalive(myModule, "failing_tests");
  return async () => `RULES
- You are Roboco-op, a highly professional software engineer with extensive knowledge Observable notebooks, data analysis and visualization, and literate programming.
- You are executing inside a browser, collaberating with a user on a notebook, executing inside the notebook. 
- A notebook is made up of modules, cells and fileattachments. It is a literate programming environment and most modules contain useful information in anonymous markdown cells.
- Both you and the user can manipulate Observable source code in the notebook. All usage suggestions to the user should thus be in the form of Observable cell source code.
- You are capable of querying the notebook to discover its capabilities. Use tools to provide answers based on facts.
- When understanding cells, always run 'describe_cells' on preceeding anonymous cells, as they may contain critical information needed to understand the cell properly. Prefer decribing more cells than you think you need to ensure coverage and full understanding. Follow the inputs to cells to ensure you understand the dependancies before answering.
- Use the replace_cell or create_cell tool modify the notebook. You do not need to display the changes before using the tool.
- Do not ask for more information than necessary. Use the tools provided to accomplish the user's request efficiently and effectively. When you've completed your task, you *MUST* use the attempt_completion tool to present the result to the user. The user may provide feedback, which you can use to make improvements and try again.
- You are only allowed to ask the user questions using the ask_followup_question tool. Use this tool only when you need additional details to complete a task, and be sure to use a clear and concise question that will help you move forward with the task. However if you can use the available tools to avoid having to ask the user questions, you should do so. For example, if the user mentions a specific cell, you should use the list_modules tool to list the modules in the runtime and check if the cell they are talking about is there, rather than asking the user to provide the cell themselves.
- Your goal is to try to accomplish the user's task, NOT engage in a back and forth conversation. Be terse.
- Never suggest code you have not executed and checked the result of. Use temporary cells for scratch calculations, but if creating a cannonical test use a unit test prefixed with 'test_'.
- NEVER end attempt_completion result with a question or request to engage in further conversation! Formulate the end of your result in a way that is final and does not require further input from the user.
- You are STRICTLY FORBIDDEN from starting your messages with "Great", "Certainly", "Okay", "Sure". You should NOT be conversational in your responses, but rather direct and to the point. For example you should NOT say "Great, I've updated the CSS" but instead something like "I've updated the CSS". It is important you be clear and technical in your messages.
- When presented with images, utilize your vision capabilities to thoroughly examine them and extract meaningful information. Incorporate these insights into your thought process as you accomplish the user's task.
- Like any professional software engineer, you make mistakes, which is why you attempt to verify operations have executed as you expected with peek_cell. Furthermore, you document examples through unit tests.
- You check for failing tests in the "@tomlarkworthy/agentic-planner" module, cell "failing_tests", cells prefixed with 'test_' is automatically picked up by the test suite. If you observe an empty array in "failing_tests" then nothing is failing!
- You can write a test like so 
<code>
test_foo = {
  expect(await "foo").toEqual("bar");
}"
</code>
- You write in observablejs source code, so a simple cell might look like
<code>
myCell = {
  return "foo"
}
</code>

====

USER CONTEXT

You are to do most of your work in "${$0.value}" module.


You can look for failing tests in the "${
    tests_module.name
  }" notebook, cell "failing_tests". It currently is evaluating to

${await peek_variableTool.execute({
  module_name: tests_module.name,
  variable_name: "failing_tests"
})}
`;
};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  main.define("module @tomlarkworthy/exporter-2", async () => runtime.module((await import("/@tomlarkworthy/exporter-2.js?v=4")).default));  
  main.define("module @tomlarkworthy/reversible-attachment", async () => runtime.module((await import("/@tomlarkworthy/reversible-attachment.js?v=4")).default));  
  main.define("module @tomlarkworthy/module-map", async () => runtime.module((await import("/@tomlarkworthy/module-map.js?v=4")).default));  
  main.define("module @tomlarkworthy/observablejs-toolchain", async () => runtime.module((await import("/@tomlarkworthy/observablejs-toolchain.js?v=4")).default));  
  main.define("module @tomlarkworthy/cell-map", async () => runtime.module((await import("/@tomlarkworthy/cell-map.js?v=4")).default));  
  main.define("module @tomlarkworthy/inspector", async () => runtime.module((await import("/@tomlarkworthy/inspector.js?v=4")).default));  
  main.define("module @tomlarkworthy/summarizejs", async () => runtime.module((await import("/@tomlarkworthy/summarizejs.js?v=4")).default));  
  main.define("module @tomlarkworthy/local-storage-view", async () => runtime.module((await import("/@tomlarkworthy/local-storage-view.js?v=4")).default));  
  main.define("module @tomlarkworthy/openai-responses-api", async () => runtime.module((await import("/@tomlarkworthy/openai-responses-api.js?v=4")).default));  
  main.define("module @tomlarkworthy/runtime-sdk", async () => runtime.module((await import("/@tomlarkworthy/runtime-sdk.js?v=4")).default));  
  main.define("module @tomlarkworthy/tests", async () => runtime.module((await import("/@tomlarkworthy/tests.js?v=4")).default));  
  main.define("module @tomlarkworthy/editor-4", async () => runtime.module((await import("/@tomlarkworthy/editor-4.js?v=4")).default));  
  main.define("module @tomlarkworthy/jest-expect-standalone", async () => runtime.module((await import("/@tomlarkworthy/jest-expect-standalone.js?v=4")).default));  
  main.define("module @tomlarkworthy/gepa", async () => runtime.module((await import("/@tomlarkworthy/gepa.js?v=4")).default));  
  $def("_16o63kq", null, ["md"], _16o63kq);  
  $def("_1izznyj", "ui", ["endpoint","keepalive","myModule","htl","reversibleAttach","ui_attached","style","viewof endpoint","viewof OPENAI_API_KEY","viewof model","viewof active_tools","viewof workingModule","viewof prompt_example","viewof prompt","viewof yolo","viewof clear","viewof history_ui","viewof undo_last"], _1izznyj);  
  $def("_ncol52", null, ["history"], _ncol52);  
  $def("_jafizi", null, ["md"], _jafizi);  
  $def("_nnn7ef", "about", ["md"], _nnn7ef);  
  $def("_461wdj", null, ["md"], _461wdj);  
  $def("_1g7mcwt", null, ["md"], _1g7mcwt);  
  $def("_1y8es21", "viewof failing_tests", ["tests"], _1y8es21);  
  $def("_t3njx4", "failing_tests", ["Generators","viewof failing_tests"], _t3njx4);  
  $def("_1kwjyta", "tests_module", ["viewof currentModules","myModule"], _1kwjyta);  
  $def("_btqeu5", null, ["md"], _btqeu5);  
  $def("_in8knv", null, ["md"], _in8knv);  
  $def("_1ce7rm4", "design", ["mermaid","md"], _1ce7rm4);  
  $def("_v8mm5y", null, ["md"], _v8mm5y);  
  main.define("exporter", ["module @tomlarkworthy/exporter-2", "@variable"], (_, v) => v.import("exporter", _));  
  $def("_yscj8e", null, ["exporter"], _yscj8e);  
  $def("_1g4ofv7", null, ["md"], _1g4ofv7);  
  main.define("reversibleAttach", ["module @tomlarkworthy/reversible-attachment", "@variable"], (_, v) => v.import("reversibleAttach", _));  
  $def("_1jn1r5", "viewof ui_attached", ["Inputs"], _1jn1r5);  
  $def("_bskwvt", "ui_attached", ["Generators","viewof ui_attached"], _bskwvt);  
  $def("_1jq90a4", "style", ["htl"], _1jq90a4);  
  $def("_c9r9j2", "viewof endpoint", ["Inputs","localStorageView"], _c9r9j2);  
  $def("_1fnnsmd", "endpoint", ["Generators","viewof endpoint"], _1fnnsmd);  
  $def("_1txbblt", "viewof OPENAI_API_KEY", ["Inputs","localStorageView"], _1txbblt);  
  $def("_13dv669", "OPENAI_API_KEY", ["Generators","viewof OPENAI_API_KEY"], _13dv669);  
  $def("_6yyt4", "viewof model", ["Inputs","reasoning_models"], _6yyt4);  
  $def("_1870whr", "model", ["Generators","viewof model"], _1870whr);  
  $def("_m7d8oz", "viewof active_tools", ["Inputs","tools"], _m7d8oz);  
  $def("_1igg1su", "active_tools", ["Generators","viewof active_tools"], _1igg1su);  
  $def("_115w3tw", "viewof prompt_example", ["Inputs","prompts"], _115w3tw);  
  $def("_hj14lj", "prompt_example", ["Generators","viewof prompt_example"], _hj14lj);  
  $def("_1qmugm1", "viewof workingModule", ["Inputs","currentModules"], _1qmugm1);  
  $def("_1kn1o8x", "workingModule", ["Generators","viewof workingModule"], _1kn1o8x);  
  $def("_1h6bc4v", "viewof prompt", ["Inputs","prompt_example"], _1h6bc4v);  
  $def("_1bmfswu", "prompt", ["Generators","viewof prompt"], _1bmfswu);  
  $def("_ky787b", "viewof yolo", ["Inputs"], _ky787b);  
  $def("_1xsltmx", "yolo", ["Generators","viewof yolo"], _1xsltmx);  
  $def("_17zvxe4", "viewof clear", ["Inputs","viewof calls","Event"], _17zvxe4);  
  $def("_ssh4lj", "clear", ["Generators","viewof clear"], _ssh4lj);  
  $def("_1jvfmlb", "viewof history_ui", ["plan","calls"], _1jvfmlb);  
  $def("_z2whbr", "history_ui", ["Generators","viewof history_ui"], _z2whbr);  
  $def("_1qygd0c", "viewof undo_last", ["Inputs","viewof calls","Event"], _1qygd0c);  
  $def("_1silskh", "undo_last", ["Generators","viewof undo_last"], _1silskh);  
  $def("_c7lmbg", null, ["md"], _c7lmbg);  
  $def("_walyhh", "tools", ["attempt_completionTool","ask_followup_questionTool","list_modulesTool","list_cellsTool","describe_cellsTool","create_cellTool","replace_cellTool","peek_variableTool","search_cellsTool"], _walyhh);  
  $def("_1jqxaox", null, ["md"], _1jqxaox);  
  $def("_1cz7mxj", "attempt_completionTool", ["viewof completionFeedback"], _1cz7mxj);  
  $def("_59qgsf", "viewof completionFeedback", ["Inputs"], _59qgsf);  
  $def("_a9ct0l", "completionFeedback", ["Generators","viewof completionFeedback"], _a9ct0l);  
  $def("_1p2ebnn", "attempCompletetionDialog", ["viewof completionFeedback","runTools","Event","htl","md"], _1p2ebnn);  
  $def("_161yhg", null, ["md"], _161yhg);  
  $def("_1mw7edk", "ask_followup_questionTool", ["viewof followUpResponse"], _1mw7edk);  
  $def("_wr8zod", "viewof followUpResponse", ["Inputs"], _wr8zod);  
  $def("_aqdrc3", "followUpResponse", ["Generators","viewof followUpResponse"], _aqdrc3);  
  $def("_bcz4mo", "followUpQuestionDialog", ["viewof followUpResponse","runTools","Event","htl","md"], _bcz4mo);  
  $def("_1cxe74d", null, ["md"], _1cxe74d);  
  $def("_b3h9o3", null, ["evalJavaScriptTool"], _b3h9o3);  
  $def("_1yxceuq", null, ["md"], _1yxceuq);  
  main.define("moduleMap", ["module @tomlarkworthy/module-map", "@variable"], (_, v) => v.import("moduleMap", _));  
  main.define("viewof currentModules", ["module @tomlarkworthy/module-map", "@variable"], (_, v) => v.import("viewof currentModules", _));  
  main.define("currentModules", ["module @tomlarkworthy/module-map", "@variable"], (_, v) => v.import("currentModules", _));  
  $def("_jsuo0j", "list_modulesTool", ["runtimeSummary"], _jsuo0j);  
  $def("_1bm2qgz", "runtimeSummary", ["getModules"], _1bm2qgz);  
  $def("_13x73gy", "test_list_modulesTool", ["md","list_modulesTool"], _13x73gy);  
  $def("_1ajke8l", null, ["md"], _1ajke8l);  
  $def("_175ebht", "list_cellsTool", ["getModule","cellMapCompat","summarizeCell"], _175ebht);  
  $def("_8vdyf9", "test_list_cellsTool", ["list_cellsTool"], _8vdyf9);  
  $def("_qju1bw", null, ["md"], _qju1bw);  
  $def("_eatsit", "search_cellsTool", ["getModule","moduleMap","runtime","cellMapCompat","decompile","cellDescription"], _eatsit);  
  $def("_1jdx5j8", "viewof searchPattern", ["Inputs"], _1jdx5j8);  
  $def("_14scyu4", "searchPattern", ["Generators","viewof searchPattern"], _14scyu4);  
  $def("_142ksbv", "test_search_for_cell_digit_name", ["search_cellsTool","searchPattern"], _142ksbv);  
  main.define("decompile", ["module @tomlarkworthy/observablejs-toolchain", "@variable"], (_, v) => v.import("decompile", _));  
  main.define("compile", ["module @tomlarkworthy/observablejs-toolchain", "@variable"], (_, v) => v.import("compile", _));  
  main.define("cellMap", ["module @tomlarkworthy/observablejs-toolchain", "@variable"], (_, v) => v.import("cellMap", _));  
  main.define("cellMapCompat", ["module @tomlarkworthy/cell-map", "@variable"], (_, v) => v.import("cellMapCompat", _));  
  $def("_1fax9qe", "summarizeCell", [], _1fax9qe);  
  $def("_14ikjbz", null, ["md"], _14ikjbz);  
  $def("_5yasbn", "cellDescription", ["summarizeVariable"], _5yasbn);  
  $def("_1dz0xgr", "describe_cellsTool", ["getModule","cellMapCompat","decompile","cellDescription"], _1dz0xgr);  
  $def("_1przjrg", "test_describe_cellsTool", ["describe_cellsTool"], _1przjrg);  
  $def("_pu2glx", null, ["md"], _pu2glx);  
  $def("_17h7az7", "create_cellTool", ["getModule","cellMapCompat","runtime","createCell","repositionSetElement","summarizeVariable"], _17h7az7);  
  $def("_1t4vii0", "test_create_cellTool", ["create_cellTool"], _1t4vii0);  
  $def("_1iqus76", "test_create_cell_dupe", ["create_cellTool"], _1iqus76);  
  $def("_1417w1f", "test_create_cell_after", ["create_cellTool"], _1417w1f);  
  $def("_12ukdo5", "createCell", ["compile","main"], _12ukdo5);  
  $def("_2fi3ih", "test_create_cell_anon", ["createCell","myModule"], _2fi3ih);  
  $def("_11y956c", null, ["md"], _11y956c);  
  $def("_xbz3qe", "replace_cellTool", ["getModule","cellMapCompat","replaceCell"], _xbz3qe);  
  $def("_reod1b", "replaceCell", ["compile","runtime","repositionSetElement"], _reod1b);  
  $def("_4wefdv", "sample_variable", [], _4wefdv);  
  $def("_147eow", "test_replace_cellTool", ["replace_cellTool"], _147eow);  
  $def("_16lx1ld", null, ["md"], _16lx1ld);  
  $def("_l4bdt9", null, ["md"], _l4bdt9);  
  main.define("inspect", ["module @tomlarkworthy/inspector", "@variable"], (_, v) => v.import("inspect", _));  
  main.define("Inspector", ["module @tomlarkworthy/inspector", "@variable"], (_, v) => v.import("Inspector", _));  
  main.define("src", ["module @tomlarkworthy/inspector", "@variable"], (_, v) => v.import("src", _));  
  $def("_h765yy", "summarizeVariable", ["observe","summarizeJS"], _h765yy);  
  $def("_sqqiyy", "peek_variableTool", ["getModule","cellMapCompat","summarizeVariable"], _sqqiyy);  
  $def("_5vt8mq", "test_peek_variableTool", ["peek_variableTool"], _5vt8mq);  
  $def("_1bn2vyp", "initial cool", [], _1bn2vyp);  
  $def("_sz4j13", "mutable cool", ["Mutable","initial cool"], _sz4j13);  
  $def("_u6l5aa", "cool", ["mutable cool"], _u6l5aa);  
  $def("_1uzcztz", "errored", [], _1uzcztz);  
  $def("_g8n27m", "pending", [], _g8n27m);  
  $def("_12eoy7p", "test_peek_variableTool_mutable", ["peek_variableTool"], _12eoy7p);  
  $def("_xzx4ht", "test_peek_variableTool_error", ["peek_variableTool"], _xzx4ht);  
  $def("_1ctu6xh", "test_peek_variableTool_pending", ["peek_variableTool"], _1ctu6xh);  
  $def("_1os2s12", "test_peek_variableTool_tests", ["peek_variableTool"], _1os2s12);  
  $def("_9w1g4i", null, ["md"], _9w1g4i);  
  $def("_wuusw5", "moduleVariables", [], _wuusw5);  
  main.define("summarizeJS", ["module @tomlarkworthy/summarizejs", "@variable"], (_, v) => v.import("summarizeJS", _));  
  main.define("localStorageView", ["module @tomlarkworthy/local-storage-view", "@variable"], (_, v) => v.import("localStorageView", _));  
  main.define("responses", ["module @tomlarkworthy/openai-responses-api", "@variable"], (_, v) => v.import("responses", _));  
  main.define("runTools", ["module @tomlarkworthy/openai-responses-api", "@variable"], (_, v) => v.import("runTools", _));  
  main.define("evalJavaScriptTool", ["module @tomlarkworthy/openai-responses-api", "@variable"], (_, v) => v.import("evalJavaScriptTool", _));  
  main.define("thisModule", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("thisModule", _));  
  main.define("keepalive", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("keepalive", _));  
  main.define("main", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("main", _));  
  main.define("runtime", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("runtime", _));  
  main.define("repositionSetElement", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("repositionSetElement", _));  
  main.define("observe", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("observe", _));  
  $def("_14bivfb", "viewof myModule", ["thisModule"], _14bivfb);  
  $def("_1cir47e", "myModule", ["Generators","viewof myModule"], _1cir47e);  
  $def("_1owbcg2", "getModules", ["moduleMap"], _1owbcg2);  
  $def("_1v5c0nc", "getModule", ["getModules"], _1v5c0nc);  
  main.define("tests", ["module @tomlarkworthy/tests", "@variable"], (_, v) => v.import("tests", _));  
  $def("_1mx7oy1", null, ["md"], _1mx7oy1);  
  $def("_18y14x3", "prompts", [], _18y14x3);  
  $def("_4vg4xa", "reasoning_models", [], _4vg4xa);  
  $def("_zapaxn", null, ["md"], _zapaxn);  
  $def("_jioq9z", "initial_response", ["viewof calls","Event","responses","viewof endpoint","model","instructions","prompt","viewof active_tools"], _jioq9z);  
  $def("_jv7s0w", null, ["step","calls"], _jv7s0w);  
  $def("_1i51d01", "viewof calls", ["Inputs"], _1i51d01);  
  $def("_6v62gr", "calls", ["Generators","viewof calls"], _6v62gr);  
  $def("_1df9hw4", null, ["md"], _1df9hw4);  
  $def("_131n02f", "actions", ["error","viewof yolo","runTools","Event","htl","Inputs","followUpQuestionDialog","attempCompletetionDialog"], _131n02f);  
  $def("_cp97rx", "error", ["htl"], _cp97rx);  
  $def("_18y2fbu", "plan", ["htl","step","actions","viewof calls"], _18y2fbu);  
  $def("_18bdsm5", "step", ["htl","input","output"], _18bdsm5);  
  $def("_1dnczct", "input", ["input_function_call_output","input_content"], _1dnczct);  
  $def("_1sj2gan", "input_content", ["htl"], _1sj2gan);  
  $def("_o87j69", "input_function_call_output", ["htl","md"], _o87j69);  
  $def("_1z0s0yo", "output", ["output_message","output_message_function_call","output_message_reasoning"], _1z0s0yo);  
  $def("_1n053ok", "output_message_function_call", ["htl"], _1n053ok);  
  $def("_nm6wn9", "output_message_reasoning", ["htl","output_message_reasoning_summary"], _nm6wn9);  
  $def("_u7n300", "output_message_reasoning_summary", ["html"], _u7n300);  
  $def("_11n8wbe", "output_message", ["htl","output_message_content"], _11n8wbe);  
  $def("_9svh97", "output_message_content", ["output_message_content_output_text"], _9svh97);  
  $def("_1rz9543", "output_message_content_output_text", ["htl","md"], _1rz9543);  
  $def("_10k3mya", null, ["md"], _10k3mya);  
  $def("_dpd8cm", null, ["context_menu"], _dpd8cm);  
  main.define("viewof selectedCell", ["module @tomlarkworthy/editor-4", "@variable"], (_, v) => v.import("viewof selectedCell", _));  
  main.define("selectedCell", ["module @tomlarkworthy/editor-4", "@variable"], (_, v) => v.import("selectedCell", _));  
  main.define("context_menu", ["module @tomlarkworthy/editor-4", "@variable"], (_, v) => v.import("context_menu", _));  
  $def("_1uw2jgm", null, ["workingModule","md","instructions"], _1uw2jgm);  
  $def("_idnav9", "instructions", ["keepalive","myModule","viewof workingModule","tests_module","peek_variableTool"], _idnav9);  
  main.define("expect", ["module @tomlarkworthy/jest-expect-standalone", "@variable"], (_, v) => v.import("expect", _));  
  main.define("foo", ["module @tomlarkworthy/gepa", "@variable"], (_, v) => v.import("foo", _));
  return main;
}