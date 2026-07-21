const _1i3dak0 = function _1(md){return(
md`# Roboco-op 2 Eval

TODO:

needle_in_haystack:
Get a large notebook and ask it to locate functionality. E.g. Which cell is responsible for opening the code editor on click?`
)};
const _1kv6zau = function _3(Inputs,$0){return(
Inputs.bind(
  Inputs.textarea({
    rows: 100,
    disabled: true
  }),
  $0
)
)};
const _iplefm = function _b($0){return(
$0
)};
const _1pzogdk = function _a($0){return(
$0
)};
const _n4tz4h = function _scores(Inputs){return(
Inputs.input([])
)};
const _1ehmu53 = (G, _) => G.input(_);
const _t8d21o = function _runCase(runPrompt,runScore,addResult){return(
async function runCase(caseTask, settings) {
  const response = await runPrompt(caseTask, settings);
  const experiment = await runScore({
    response,
    settings,
    caseTask
  });
  addResult(experiment);
  return response;
}
)};
const _c0mipt = function _8(md){return(
md`## Experiments`
)};
const _1ua1r8k = function _9(Inputs,$0,experiments,runScore,Event){return(
Inputs.button("rescore", {
  reduce: async () => {
    $0.value = await Promise.all(experiments.map(runScore));
    $0.dispatchEvent(new Event("input"));
  }
})
)};
const _y94d8c = function _10(Inputs,experiments){return(
Inputs.table(experiments, {
  columns: ["caseTask", "score", "settings", "response"],
  layout: "auto",
  format: {
    settings: (v) => JSON.stringify(v, null, 2),
    response: (v) => JSON.stringify(v, null, 2),
    caseTask: (v) => JSON.stringify(v, null, 2),
    score: (v) => JSON.stringify(v, null, 2)
  }
})
)};
const _e77opj = function _experiments(Inputs){return(
Inputs.input([])
)};
const _irsfxy = (G, _) => G.input(_);
const _1fituhx = function _addResult($0,Event){return(
function addResult(result) {
  $0.value.push(result);
  $0.dispatchEvent(new Event("input"));
}
)};
const _3z5a9y = function _13(md){return(
md`## Score Task`
)};
const _12fy14i = function _runScore(observable,compile,_,getPromiseState){return(
async ({ settings, response, caseTask } = {}) => {
  const scoreTask = { settings, response, caseTask };
  const embedded_runtime = new observable.Runtime();
  const embedded_main = embedded_runtime.module();

  (await caseTask.notebook()).forEach((cell) => {
    const variables = compile(cell.code);
    variables.forEach((v) => {
      embedded_main.variable({}).define(v._name, v._inputs, v._definition);
    });
  });

  let compile_or_null = null,
    apply_or_null = null,
    check_or_null = null,
    values = [],
    errors = [];
  let compileError = false;
  compile_or_null = scoreTask.response.cells.flatMap((cell) => {
    try {
      const variables = compile(cell.code);
      const inputs = _.sortBy(cell.inputs);
      const compiledInputs = _.sortBy(variables[0]._inputs);
      if (!_.isEqual(inputs, compiledInputs)) {
        errors.push(
          `Incorrectly specified inputs ${inputs} does not match ${compiledInputs}`
        );
      }
      return [variables];
    } catch (err) {
      errors.push(err.message);
      compileError = true;
      return [];
    }
  });
  try {
    const vars = compile_or_null.map((variables) =>
      variables.map((v) => {
        let _fn;
        eval("_fn = " + v._definition);
        if (embedded_main._scope.has(v._name)) {
          debugger;
          return embedded_main._scope
            .get(v._name)
            .define(v._name, v._inputs, _fn);
        } else {
          return embedded_main.variable({}).define(v._name, v._inputs, _fn);
        }
      })
    );
    embedded_runtime._computeNow();
    await new Promise((r) => setTimeout(r, 100));
    apply_or_null = vars.flat();

    const values = await Promise.all(
      vars.flat().map((v) => getPromiseState(v._promise))
    );
    values
      .filter((v) => v.error)
      .forEach((e) => errors.push(e.error.message || e.error));
    check_or_null = await scoreTask.caseTask.check(
      embedded_runtime,
      embedded_main,
      apply_or_null,
      scoreTask.response
    );
    if (typeof check_or_null === "string") {
      errors.push(check_or_null);
      check_or_null = false;
    }
  } catch (err) {
    errors.push(err.message || err);
  }

  embedded_runtime.dispose();

  return {
    settings: scoreTask.settings,
    caseTask: scoreTask.caseTask,
    response: scoreTask.response,
    score: {
      responded: !!scoreTask.response.cells,
      compiles: !compileError,
      applies: !compileError && !!apply_or_null,
      resolves: !compileError && !values.some((v) => v.error),
      correct: !!check_or_null,
      errors: errors
    }
  };
}
)};
const _esnu70 = function _15(md){return(
md`## RunCase`
)};
const _1mqzd07 = function _16(Inputs,promptHistory){return(
Inputs.table(promptHistory, {
  layout: "auto",
  format: {
    caseTask: (d) => JSON.stringify(d, null, 2),
    settings: (d) => JSON.stringify(d, null, 2),
    response: (d) => JSON.stringify(d, null, 2)
  }
})
)};
const _1fn86kv = function _promptHistory(Inputs){return(
Inputs.input([])
)};
const _pyxp1o = (G, _) => G.input(_);
const _hzcz4p = function _runPrompt(buildMessages,$0,runAsk,$1,Event){return(
async (caseTask, settings) => {
  const promptTask = { caseTask: caseTask, settings };
  const messages = await buildMessages($0.value, promptTask);
  const response = await runAsk({
    settings: $0.value,
    messages
  });
  $1.value.push({
    ...promptTask,
    response
  });
  $1.dispatchEvent(new Event("input"));
  return response;
}
)};
const _1j39au2 = function _buildMessages($0){return(
async (llm_settings, promptTask) => [
  {
    role: llm_settings.model.startsWith("o1") ? "user" : "system",
    content: promptTask.settings.system_prompt || $0.value
  },
  ...(await promptTask.caseTask.notebook()).map((cell) => ({
    role: "user",
    content: `<cell>
<inputs>${cell.inputs.join(", ")}</inputs>
<code><![CDATA[
${cell.code}
]]></code>
</cell>
`
  })),
  {
    role: "user",
    content: promptTask.caseTask.query
  }
]
)};
const _xf3imk = function _20(md){return(
md`## Cases`
)};
const _w7b5ih = function _21(Inputs,cases,runCase){return(
Inputs.table(
  [...cases.values()]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((evalCase) => ({
      ...evalCase,
      run: Inputs.button("run", {
        reduce: () => runCase(evalCase, {})
      })
    })),
  {
    columns: ["name", "query", "context", "run"],
    format: { run: (r) => r },
    layout: "auto"
  }
)
)};
const _4ze1rm = function _cases(Inputs){return(
Inputs.input(new Map())
)};
const _1q7v4k3 = (G, _) => G.input(_);
const _1uaymzq = function _Case($0,Event){return(
class Case {
  constructor({
    invalidation,
    name,
    query,
    notebook = () => [],
    check = () => true
  } = {}) {
    this.name = name;
    this.query = query;
    this.notebook = notebook;
    this.check = check;

    $0.value.set(this.name, this);
    $0.dispatchEvent(new Event("input"));
    invalidation.then(() => {
      $0.value.delete(this.name);
      $0.dispatchEvent(new Event("input"));
    });
  }
}
)};
const _1emeuok = function _24(md){return(
md`## Errors`
)};
const _bb3q8y = async function _test_syntax_error(runScore,assign_literal,expect,_)
{
  const { score } = await runScore({
    caseTask: assign_literal,
    response: {
      cells: [
        {
          inputs: [],
          code: `x = '`
        }
      ]
    }
  });
  expect(
    _.pick(score, ["responded", "compiles", "applies", "correct"])
  ).toEqual({
    responded: true,
    compiles: false,
    applies: false,
    correct: false
  });
  expect(score.errors[0]).toBe("Unterminated string constant (1:4)");
  return "ok";
};
const _1wobykk = async function _test_runtime_import_error(runScore,assign_literal,expect,_)
{
  const { score } = await runScore({
    caseTask: assign_literal,
    response: {
      cells: [
        {
          inputs: [],
          code: `viewof rgb = (await import("npm:@observablehq/inputs")).Inputs.select({
  options: ["red", "green", "blue"],
  label: "rgb"
})`
        }
      ]
    }
  });
  expect(
    _.pick(score, ["responded", "compiles", "applies", "correct"])
  ).toEqual({
    responded: true,
    compiles: true,
    applies: true,
    correct: false
  });
  expect(score.errors[0]).toBe(
    "Failed to fetch dynamically imported module: npm:@observablehq/inputs"
  );
  return "ok";
};
const _15y0n99 = async function _test_runtime_input_error(runScore,assign_literal,expect)
{
  const { score } = await runScore({
    caseTask: assign_literal,
    response: {
      cells: [
        {
          inputs: ["@observablehq/stdlib@5"],
          code: `foo = d3`
        }
      ]
    }
  });
  expect(score).toEqual({
    responded: true,
    compiles: true,
    applies: true,
    resolves: true,
    correct: false,
    errors: [
      "Incorrectly specified inputs @observablehq/stdlib@5 does not match d3",
      "Cannot read properties of undefined (reading '_promise')"
    ]
  });
  return "ok";
};
const _10a0txx = function _assign_literal(Case,invalidation){return(
new Case({
  invalidation,
  name: "assign a synchronous literal number",
  query: "create a cell x whose value is 42",
  check: async (runtime, main) =>
    main._scope.get("x")._promise.then((v) => v == 42)
})
)};
const _zkqdf0 = async function _test_assign_literal(runScore,assign_literal,expect)
{
  const { score } = await runScore({
    caseTask: assign_literal,
    response: {
      cells: [
        {
          inputs: [],
          code: `x = 42`
        }
      ]
    }
  });
  expect(score).toEqual({
    responded: true,
    compiles: true,
    applies: true,
    resolves: true,
    correct: true,
    errors: []
  });
  return "ok";
};
const _19ls8bf = function _say_hello(Case,invalidation,HTMLElement){return(
new Case({
  invalidation,
  name: "say hello",
  query: "say hello",
  check: async (runtime, main, variables) => {
    if (variables.length != 1) return "only 1 variable needed to solve this";
    if (!variables[0]._value instanceof HTMLElement)
      return "did not solve using md";
    return true;
  }
})
)};
const _sm95n9 = async function _test_say_hello(runScore,say_hello,expect)
{
  const { score } = await runScore({
    caseTask: say_hello,
    response: {
      cells: [
        {
          inputs: [],
          code: `hello = document.createElement("div")`
        }
      ]
    }
  });
  expect(score).toEqual({
    responded: true,
    compiles: true,
    applies: true,
    correct: true,
    resolves: true,
    errors: []
  });
  return "ok";
};
const _1b095nm = function _create_login_form(Case,invalidation,HTMLElement){return(
new Case({
  invalidation,
  name: "login form",
  query: "create a username and password form bound to credentials",
  check: async (runtime, main, variables, response) => {
    if (variables.length != 2) return "did not use a single view to solve";
    if (!variables[0]._value instanceof HTMLElement)
      return "did not use Inputs";
    if (!variables[0]._definition.toString().includes("Inputs.password"))
      return "did not use Inputs.password for password field";
    return true;
  }
})
)};
const _eyc7le = async function _test_create_login_form(runScore,create_login_form,expect)
{
  const { score } = await runScore({
    caseTask: create_login_form,
    response: {
      cells: [
        {
          inputs: ["Inputs"],
          code: `viewof credentials = Inputs.form({
  username: Inputs.text({label: "username"}),
  password: Inputs.password({type: "password", label: "password"})
})`
        }
      ]
    }
  });
  expect(score).toEqual({
    responded: true,
    compiles: true,
    applies: true,
    resolves: true,
    correct: true,
    errors: []
  });
  return "ok";
};
const _r521sk = function _create_checkbox_form(Case,invalidation,HTMLElement){return(
new Case({
  invalidation,
  name: "toggle value",
  query: "create a toggle for the value ready",
  check: async (runtime, main, variables, response) => {
    return (
      variables.length == 2 &&
      variables[0]._value instanceof HTMLElement &&
      variables[0]._name == "viewof ready" &&
      variables[0]._definition.toString().includes("Inputs.toggle")
    );
  }
})
)};
const _1wdbuis = async function _test_create_toggle_form(runScore,create_checkbox_form,expect)
{
  const { score } = await runScore({
    caseTask: create_checkbox_form,
    response: {
      cells: [
        {
          inputs: ["Inputs"],
          code: `viewof ready = Inputs.toggle()`
        }
      ]
    }
  });
  expect(score).toEqual({
    responded: true,
    compiles: true,
    applies: true,
    resolves: true,
    correct: true,
    errors: []
  });
  return "ok";
};
const _17cu16h = function _sum_array(Case,invalidation){return(
new Case({
  invalidation,
  name: "sum of array",
  query:
    "create a cell sum whose value is the sum of the array [1,2,3,4,5] using d3",
  check: async (runtime, main) => {
    const variable = main._scope.get("sum");
    return (
      (await variable._promise.then((v) => v === 15)) &&
      variable._definition.toString().includes("d3")
    );
  }
})
)};
const _1291ass = async function _test_sum_array(runScore,sum_array,expect)
{
  const { score } = await runScore({
    caseTask: sum_array,
    response: {
      cells: [
        {
          inputs: ["d3"],
          code: `sum = d3.sum([1, 2, 3, 4, 5])`
        }
      ]
    }
  });
  expect(score).toEqual({
    responded: true,
    compiles: true,
    applies: true,
    resolves: true,
    correct: true,
    errors: []
  });
  return "ok";
};
const _18ha0yk = function _filter_array(Case,invalidation){return(
new Case({
  invalidation,
  name: "filter array",
  query:
    "create a cell evens whose value is the even numbers from [1,2,3,4,5,6]",
  check: async (runtime, main) =>
    main._scope
      .get("evens")
      ._promise.then(
        (v) => Array.isArray(v) && v.length === 3 && v.every((n) => n % 2 === 0)
      )
})
)};
const _ji3ik6 = async function _test_filter_array(runScore,filter_array,expect)
{
  const { score } = await runScore({
    caseTask: filter_array,
    response: {
      cells: [
        {
          inputs: [],
          code: `evens = [1,2,3,4,5,6].filter(n => n % 2 === 0)`
        }
      ]
    }
  });
  expect(score).toEqual({
    responded: true,
    compiles: true,
    applies: true,
    resolves: true,
    correct: true,
    errors: []
  });
  return "ok";
};
const _yt9ngd = function _create_counter(Case,invalidation){return(
new Case({
  invalidation,
  name: "counter button",
  query: "create a viewof count that displays a button to increment a number",
  check: async (runtime, main, variables) => {
    if (variables.length !== 2) return false;
    const v = variables[0];
    if (v._name !== "viewof count") return "Should be a viewof button";
    if (!v._definition.toString().includes("Inputs.button"))
      return "did not use Inputs.button reduce functionality";
    return true;
  }
})
)};
const _151455j = async function _test_create_counter(runScore,create_counter,expect)
{
  const { score } = await runScore({
    caseTask: create_counter,
    response: {
      cells: [
        {
          inputs: ["Inputs"],
          code: `viewof count = Inputs.button("Increment")`
        }
      ]
    }
  });
  expect(score).toEqual({
    responded: true,
    compiles: true,
    applies: true,
    resolves: true,
    correct: true,
    errors: []
  });
  return "ok";
};
const _i1riv9 = function _create_dropdown(Case,invalidation,HTMLElement){return(
new Case({
  invalidation,
  name: "dropdown",
  query:
    'create a dropdown select element with options "red","green","blue" bound to rgb',
  check: async (runtime, main, variables) => {
    if (variables.length !== 2) return false;
    const el = variables[0]._value;
    if (!(el instanceof HTMLElement)) return false;
    if (el.tagName !== "FORM") return false;
    const opts = el.querySelectorAll("option");
    const values = Array.from(opts).map((o) => o.text);
    return (
      values.length === 3 &&
      values[0] === "red" &&
      values[1] === "green" &&
      values[2] === "blue"
    );
  }
})
)};
const _nil13w = async function _test_dropdown(runScore,create_dropdown,expect)
{
  // Test runScore with empty response cells
  const { score } = await runScore({
    caseTask: create_dropdown,
    response: {
      cells: [
        {
          inputs: ["Inputs"],
          code: `viewof rgb = Inputs.select(["red", "green", "blue"])`
        }
      ]
    }
  });
  expect(score).toEqual({
    responded: true,
    compiles: true,
    applies: true,
    resolves: true,
    correct: true,
    errors: []
  });
  return "ok";
};
const _41s8j6 = function _create_composite_ui(Case,invalidation,HTMLElement){return(
new Case({
  invalidation,
  name: "composite ui",
  query:
    "create a UI for a rectangle called rectangleSettings with whole number width and height ranges",
  check: async (runtime, main, variables) => {
    return (
      variables.length == 2 &&
      variables[0]._name == "viewof rectangleSettings" &&
      variables[0]._value instanceof HTMLElement &&
      variables[0]._inputs.length == 1 &&
      variables[0]._inputs[0]._name == "Inputs" &&
      variables[0]._definition.toString().includes("Inputs.form")
    );
  }
})
)};
const _artguw = async function _test_composite_ui(runScore,create_composite_ui,expect)
{
  const { score } = await runScore({
    caseTask: create_composite_ui,
    response: {
      cells: [
        {
          inputs: ["Inputs"],
          code: `viewof rectangleSettings = Inputs.form({
  width: Inputs.range([1, 10], { label: "width (px)", step: 1, value: 1 }),
  height: Inputs.range([20, 100], { label: "height (px)", step: 1, value: 30 })
})`
        }
      ]
    }
  });
  expect(score).toEqual({
    responded: true,
    compiles: true,
    applies: true,
    resolves: true,
    correct: true,
    errors: []
  });
  return "ok";
};
const _1o8exej = function _create_dataflow_svg(Case,invalidation){return(
new Case({
  invalidation,
  name: "dataflow svg",
  query:
    "Use rectangleSettings to create an SVG element that live updates an svg rectangle",
  notebook: async () => [
    {
      inputs: ["Inputs"],
      code: `viewof rectangleSettings = Inputs.form({
  width: Inputs.range([1, 200], { label: "width", step: 1, value: 100 }),
  height: Inputs.range([1, 200], { label: "height", step: 1, value: 50 }),
  fill: Inputs.color({ label: "fill" })
})`
    }
  ],
  check: async (runtime, main, variables) => {
    if (variables.length !== 1) return false;
    const v = variables[0];
    const src = v._definition.toString();
    if (!v._inputs.find((i) => i._name === "htl"))
      return "Use hypertext literal htl";
    if (!v._inputs.find((i) => i._name === "rectangleSettings")) return false;
    if (!src.includes("htl.svg`")) return false;
    if (!src.includes("rectangleSettings.fill"))
      return "did not access the fill setting";
    if (!src.includes("rectangleSettings.width")) return false;
    if (!src.includes("rectangleSettings.height")) return false;

    return true;
  }
})
)};
const _15ihtos = async function _test_create_dataflow_svg(runScore,create_dataflow_svg,expect)
{
  const { score } = await runScore({
    caseTask: create_dataflow_svg,
    response: {
      cells: [
        {
          inputs: ["htl", "rectangleSettings"],
          code: `htl.svg\`<svg><rect fill="\${rectangleSettings.fill}" width=\${rectangleSettings.width} height=\${rectangleSettings.height}></rect></svg>\``
        }
      ]
    }
  });
  expect(score).toEqual({
    responded: true,
    compiles: true,
    applies: true,
    resolves: true,
    correct: true,
    errors: []
  });
  return "ok";
};
const _trux5g = function _import_date_fns(Case,invalidation){return(
new Case({
  invalidation,
  name: "date-fns format",
  query:
    'Import date-fns and create a cell formatted whose value is the ISO date "2020-01-01" by formatting new Date(2020,0,1) using date-fns (e.g., dateFns.format).',
  check: async (runtime, main) => {
    const variable = main._scope.get("formatted");
    if (!variable) return "missing formatted variable";
    const okValue = await variable._promise.then((v) => v === "2020-01-01");
    const usesDateFns =
      variable._definition &&
      variable._definition.toString().includes("dateFns.format");
    return okValue && usesDateFns;
  }
})
)};
const _776vbu = async function _test_import_date_fns(runScore,import_date_fns,expect)
{
  const { score } = await runScore({
    caseTask: import_date_fns,
    response: {
      cells: [
        {
          code: `dateFns = import('https://cdn.jsdelivr.net/npm/date-fns@4.1.0/+esm')`
        },
        {
          inputs: ["dateFns"],
          code: `formatted = dateFns.format(new Date(2020, 0, 1), 'yyyy-MM-dd')`
        }
      ]
    }
  });
  expect(score).toEqual({
    responded: true,
    compiles: true,
    applies: true,
    resolves: true,
    correct: true,
    errors: []
  });
  return "ok";
};
const _5obgpj = function _matrix_eig_case(Case,invalidation){return(
new Case({
  invalidation,
  name: "matrix_eig",
  query:
    "Create a function matrix_eig(matrix) that returns {values: [...], vectors: [[...], ...]} for real-eigenvalue cases, or throws/returns an error for unsupported/complex cases.",
  check: async (runtime, main) => {
    const v = main._scope.get("matrix_eig");
    if (!v) return "missing matrix_eig";
    const fn = await v._promise;
    if (typeof fn !== "function") return "matrix_eig is not a function";

    const approx = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol;
    const mul = (M, vec) =>
      M.map((row) => row.reduce((s, x, i) => s + x * vec[i], 0));

    const checkMatrix = async (M) => {
      let res;
      try {
        res = await fn(M);
      } catch (e) {
        return `threw for a matrix that should be supported: ${
          e && e.message ? e.message : e
        }`;
      }
      if (!res || !Array.isArray(res.values) || !Array.isArray(res.vectors))
        return "result must be an object with arrays values and vectors";
      if (res.values.length !== res.vectors.length)
        return "values and vectors must be the same length";
      if (res.vectors.some((v) => !Array.isArray(v) || v.length !== M.length))
        return "each vector must be an array of the correct dimension";

      for (let i = 0; i < res.values.length; i++) {
        const lambda = res.values[i];
        const vec = res.vectors[i];
        const Av = mul(M, vec);
        const lv = vec.map((x) => lambda * x);
        for (let j = 0; j < Av.length; j++) {
          if (!approx(Av[j], lv[j], 1e-6)) {
            return `eigenpair ${i} failed: Av=${JSON.stringify(
              Av
            )} vs λv=${JSON.stringify(lv)}`;
          }
        }
      }
      return true;
    };

    // 1) Simple diagonal matrix
    const M1 = [
      [2, 0],
      [0, 3]
    ];
    const ok1 = await checkMatrix(M1);
    if (ok1 !== true) return ok1;

    // 2) Symmetric matrix with distinct eigenvalues
    const M2 = [
      [2, 1],
      [1, 2]
    ]; // eigenvalues 3 and 1
    const ok2 = await checkMatrix(M2);
    if (ok2 !== true) return ok2;

    const M3 = [
      [2, 1, 0, 0],
      [0, 2, 0, 0],
      [0, 0, 4, 0],
      [0, 0, 0, 1]
    ];
    debugger;
    const ok3 = await checkMatrix(M3);
    if (ok3 !== true) return ok3;

    return true; // throwing is acceptable
  }
})
)};
const _hwnmt6 = async function _test_matrix_eig(runScore,matrix_eig_case,expect)
{
  const { score } = await runScore({
    caseTask: matrix_eig_case,
    response: {
      cells: [
        {
          code: `mathjs = import("https://cdn.jsdelivr.net/npm/mathjs@14.6.0/+esm")`
        },
        {
          inputs: ["mathjs"],
          code: `matrix_eig = async function(matrix){
  const eigs = await mathjs.eigs(matrix)
  return {
    values: eigs.eigenvectors.map(v => v.value),
    vectors: eigs.eigenvectors.map(v => v.vector),
  }
}`
        }
      ]
    }
  });
  expect(score).toEqual({
    responded: true,
    compiles: true,
    applies: true,
    resolves: true,
    correct: true,
    errors: []
  });
  return "ok";
};
const _155a8tj = function _fix_test_case(Case,invalidation){return(
new Case({
  invalidation,
  name: "fix a test with TDD",
  query: "Fix the test",
  notebook: async () => [
    {
      inputs: [],
      code: `import {expect} from "@tomlarkworthy/jest-expect-standalone"`
    },
    {
      inputs: [],
      code: `x = {value: 10}`
    },
    {
      inputs: ["expect"],
      code: `test_x_value = expect(x.value).toBe(10)`
    }
  ],
  check: async (runtime, main, variables) => {
    if (variables.length !== 1) return false;
    const v = variables[0];
    const src = v._definition.toString();
    const x_value = await main._scope.get("x")._promise.then((v) => v);
    if (x_value.value != 10)
      return "x.value is not 10, rembember that observable syntax blocks have higher precidence than object literals";

    return true;
  }
})
)};
const _ovr0ia = async function _test_fix_case(runScore,fix_test_case,expect)
{
  const { score } = await runScore({
    caseTask: fix_test_case,
    response: {
      cells: [
        {
          code: `x = ({value: 10})`
        }
      ]
    }
  });
  expect(score).toEqual({
    responded: true,
    compiles: true,
    applies: true,
    resolves: true,
    correct: true,
    errors: []
  });
  return "ok";
};
const _1elaz7m = function _load_all(assign_literal,say_hello,create_login_form,create_checkbox_form,create_dropdown,create_counter,filter_array,sum_array,create_composite_ui,create_dataflow_svg,import_date_fns,matrix_eig_case,fix_test_case)
{
  assign_literal,
    say_hello,
    create_login_form,
    create_checkbox_form,
    create_dropdown,
    create_counter,
    filter_array,
    sum_array,
    create_composite_ui,
    create_dataflow_svg,
    import_date_fns,
    matrix_eig_case,
    fix_test_case;
};
const _7zya3b = function _55(md){return(
md`## Libs`
)};
const _mtzfo7 = function _observable() {
    return import('https://cdn.jsdelivr.net/npm/@observablehq/runtime@5/dist/runtime.js');
};
const _1aa2sln = function _58(){return(
function () {}
)};
const _1uvd4er = function _59(robocoop){return(
robocoop
)};
const _1h20v6o = function _size(Inputs){return(
Inputs.form({
  width: Inputs.range([1, 10], { label: "width (px)", step: 1, value: 1 }),
  height: Inputs.range([20, 100], { label: "height (px)", step: 1, value: 30 })
})
)};
const _14uhhxh = (G, _) => G.input(_);
const _178b1oo = function _65(ui){return(
ui
)};
const _1p9l16a = function _67(context_menu){return(
context_menu
)};
const _60xwpy = function _68(exporter){return(
exporter()
)};
const _175ov5k = function _71(tests){return(
tests({
  filter: (t) => t.state !== "paused"
})
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  main.define("module @tomlarkworthy/robocoop-2", async () => runtime.module((await import("/@tomlarkworthy/robocoop-2.js?v=4")).default));  
  main.define("module @tomlarkworthy/flow-queue", async () => runtime.module((await import("/@tomlarkworthy/flow-queue.js?v=4")).default));  
  main.define("module @tomlarkworthy/observablejs-toolchain", async () => runtime.module((await import("/@tomlarkworthy/observablejs-toolchain.js?v=4")).default));  
  main.define("module @tomlarkworthy/runtime-sdk", async () => runtime.module((await import("/@tomlarkworthy/runtime-sdk.js?v=4")).default));  
  main.define("module @tomlarkworthy/agentic-planner-prototype", async () => runtime.module((await import("/@tomlarkworthy/agentic-planner-prototype.js?v=4")).default));  
  main.define("module @tomlarkworthy/editor-4", async () => runtime.module((await import("/@tomlarkworthy/editor-4.js?v=4")).default));  
  main.define("module @tomlarkworthy/exporter-2", async () => runtime.module((await import("/@tomlarkworthy/exporter-2.js?v=4")).default));  
  main.define("module @tomlarkworthy/tests", async () => runtime.module((await import("/@tomlarkworthy/tests.js?v=4")).default));  
  $def("_1i3dak0", null, ["md"], _1i3dak0);  
  main.define("viewof prompt", ["module @tomlarkworthy/robocoop-2", "@variable"], (_, v) => v.import("viewof prompt", _));  
  main.define("prompt", ["module @tomlarkworthy/robocoop-2", "@variable"], (_, v) => v.import("prompt", _));  
  main.define("viewof context_viz", ["module @tomlarkworthy/robocoop-2", "@variable"], (_, v) => v.import("viewof context_viz", _));  
  main.define("context_viz", ["module @tomlarkworthy/robocoop-2", "@variable"], (_, v) => v.import("context_viz", _));  
  main.define("background_tasks", ["module @tomlarkworthy/robocoop-2", "@variable"], (_, v) => v.import("background_tasks", _));  
  main.define("viewof system_prompt", ["module @tomlarkworthy/robocoop-2", "@variable"], (_, v) => v.import("viewof system_prompt", _));  
  main.define("system_prompt", ["module @tomlarkworthy/robocoop-2", "@variable"], (_, v) => v.import("system_prompt", _));  
  main.define("viewof suggestion", ["module @tomlarkworthy/robocoop-2", "@variable"], (_, v) => v.import("viewof suggestion", _));  
  main.define("suggestion", ["module @tomlarkworthy/robocoop-2", "@variable"], (_, v) => v.import("suggestion", _));  
  main.define("runAsk", ["module @tomlarkworthy/robocoop-2", "@variable"], (_, v) => v.import("runAsk", _));  
  main.define("viewof settings", ["module @tomlarkworthy/robocoop-2", "@variable"], (_, v) => v.import("viewof settings", _));  
  main.define("settings", ["module @tomlarkworthy/robocoop-2", "@variable"], (_, v) => v.import("settings", _));  
  $def("_1kv6zau", null, ["Inputs","viewof system_prompt"], _1kv6zau);  
  $def("_iplefm", "b", ["viewof suggestion"], _iplefm);  
  $def("_1pzogdk", "a", ["viewof context_viz"], _1pzogdk);  
  $def("_n4tz4h", "viewof scores", ["Inputs"], _n4tz4h);  
  $def("_1ehmu53", "scores", ["Generators","viewof scores"], _1ehmu53);  
  $def("_t8d21o", "runCase", ["runPrompt","runScore","addResult"], _t8d21o);  
  $def("_c0mipt", null, ["md"], _c0mipt);  
  $def("_1ua1r8k", null, ["Inputs","viewof experiments","experiments","runScore","Event"], _1ua1r8k);  
  $def("_y94d8c", null, ["Inputs","experiments"], _y94d8c);  
  $def("_e77opj", "viewof experiments", ["Inputs"], _e77opj);  
  $def("_irsfxy", "experiments", ["Generators","viewof experiments"], _irsfxy);  
  $def("_1fituhx", "addResult", ["viewof experiments","Event"], _1fituhx);  
  $def("_3z5a9y", null, ["md"], _3z5a9y);  
  $def("_12fy14i", "runScore", ["observable","compile","_","getPromiseState"], _12fy14i);  
  $def("_esnu70", null, ["md"], _esnu70);  
  $def("_1mqzd07", null, ["Inputs","promptHistory"], _1mqzd07);  
  $def("_1fn86kv", "viewof promptHistory", ["Inputs"], _1fn86kv);  
  $def("_pyxp1o", "promptHistory", ["Generators","viewof promptHistory"], _pyxp1o);  
  $def("_hzcz4p", "runPrompt", ["buildMessages","viewof settings","runAsk","viewof promptHistory","Event"], _hzcz4p);  
  $def("_1j39au2", "buildMessages", ["viewof system_prompt"], _1j39au2);  
  $def("_xf3imk", null, ["md"], _xf3imk);  
  $def("_w7b5ih", null, ["Inputs","cases","runCase"], _w7b5ih);  
  $def("_4ze1rm", "viewof cases", ["Inputs"], _4ze1rm);  
  $def("_1q7v4k3", "cases", ["Generators","viewof cases"], _1q7v4k3);  
  $def("_1uaymzq", "Case", ["viewof cases","Event"], _1uaymzq);  
  $def("_1emeuok", null, ["md"], _1emeuok);  
  $def("_bb3q8y", "test_syntax_error", ["runScore","assign_literal","expect","_"], _bb3q8y);  
  $def("_1wobykk", "test_runtime_import_error", ["runScore","assign_literal","expect","_"], _1wobykk);  
  $def("_15y0n99", "test_runtime_input_error", ["runScore","assign_literal","expect"], _15y0n99);  
  $def("_10a0txx", "assign_literal", ["Case","invalidation"], _10a0txx);  
  $def("_zkqdf0", "test_assign_literal", ["runScore","assign_literal","expect"], _zkqdf0);  
  $def("_19ls8bf", "say_hello", ["Case","invalidation","HTMLElement"], _19ls8bf);  
  $def("_sm95n9", "test_say_hello", ["runScore","say_hello","expect"], _sm95n9);  
  $def("_1b095nm", "create_login_form", ["Case","invalidation","HTMLElement"], _1b095nm);  
  $def("_eyc7le", "test_create_login_form", ["runScore","create_login_form","expect"], _eyc7le);  
  $def("_r521sk", "create_checkbox_form", ["Case","invalidation","HTMLElement"], _r521sk);  
  $def("_1wdbuis", "test_create_toggle_form", ["runScore","create_checkbox_form","expect"], _1wdbuis);  
  $def("_17cu16h", "sum_array", ["Case","invalidation"], _17cu16h);  
  $def("_1291ass", "test_sum_array", ["runScore","sum_array","expect"], _1291ass);  
  $def("_18ha0yk", "filter_array", ["Case","invalidation"], _18ha0yk);  
  $def("_ji3ik6", "test_filter_array", ["runScore","filter_array","expect"], _ji3ik6);  
  $def("_yt9ngd", "create_counter", ["Case","invalidation"], _yt9ngd);  
  $def("_151455j", "test_create_counter", ["runScore","create_counter","expect"], _151455j);  
  $def("_i1riv9", "create_dropdown", ["Case","invalidation","HTMLElement"], _i1riv9);  
  $def("_nil13w", "test_dropdown", ["runScore","create_dropdown","expect"], _nil13w);  
  $def("_41s8j6", "create_composite_ui", ["Case","invalidation","HTMLElement"], _41s8j6);  
  $def("_artguw", "test_composite_ui", ["runScore","create_composite_ui","expect"], _artguw);  
  $def("_1o8exej", "create_dataflow_svg", ["Case","invalidation"], _1o8exej);  
  $def("_15ihtos", "test_create_dataflow_svg", ["runScore","create_dataflow_svg","expect"], _15ihtos);  
  $def("_trux5g", "import_date_fns", ["Case","invalidation"], _trux5g);  
  $def("_776vbu", "test_import_date_fns", ["runScore","import_date_fns","expect"], _776vbu);  
  $def("_5obgpj", "matrix_eig_case", ["Case","invalidation"], _5obgpj);  
  $def("_hwnmt6", "test_matrix_eig", ["runScore","matrix_eig_case","expect"], _hwnmt6);  
  $def("_155a8tj", "fix_test_case", ["Case","invalidation"], _155a8tj);  
  $def("_ovr0ia", "test_fix_case", ["runScore","fix_test_case","expect"], _ovr0ia);  
  $def("_1elaz7m", "load_all", ["assign_literal","say_hello","create_login_form","create_checkbox_form","create_dropdown","create_counter","filter_array","sum_array","create_composite_ui","create_dataflow_svg","import_date_fns","matrix_eig_case","fix_test_case"], _1elaz7m);  
  $def("_7zya3b", null, ["md"], _7zya3b);  
  $def("_mtzfo7", "observable", [], _mtzfo7);  
  main.define("robocoop", ["module @tomlarkworthy/robocoop-2", "@variable"], (_, v) => v.import("robocoop", _));  
  $def("_1aa2sln", null, [], _1aa2sln);  
  $def("_1uvd4er", null, ["robocoop"], _1uvd4er);  
  main.define("flowQueue", ["module @tomlarkworthy/flow-queue", "@variable"], (_, v) => v.import("flowQueue", _));  
  main.define("compile", ["module @tomlarkworthy/observablejs-toolchain", "@variable"], (_, v) => v.import("compile", _));  
  main.define("runtime", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("runtime", _));  
  main.define("getPromiseState", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("getPromiseState", _));  
  main.define("ui", ["module @tomlarkworthy/agentic-planner-prototype", "@variable"], (_, v) => v.import("ui", _));  
  main.define("expect", ["module @tomlarkworthy/agentic-planner-prototype", "@variable"], (_, v) => v.import("expect", _));  
  $def("_1h20v6o", "viewof size", ["Inputs"], _1h20v6o);  
  $def("_14uhhxh", "size", ["Generators","viewof size"], _14uhhxh);  
  $def("_178b1oo", null, ["ui"], _178b1oo);  
  main.define("context_menu", ["module @tomlarkworthy/editor-4", "@variable"], (_, v) => v.import("context_menu", _));  
  $def("_1p9l16a", null, ["context_menu"], _1p9l16a);  
  $def("_60xwpy", null, ["exporter"], _60xwpy);  
  main.define("exporter", ["module @tomlarkworthy/exporter-2", "@variable"], (_, v) => v.import("exporter", _));  
  main.define("tests", ["module @tomlarkworthy/tests", "@variable"], (_, v) => v.import("tests", _));  
  $def("_175ov5k", null, ["tests"], _175ov5k);
  return main;
}