const _1op1akb = function _1(md){return(
md`# Trying out "GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning"
## https://arxiv.org/abs/2507.19457 25 Jul 2025
_Lakshya A Agrawal, Shangyin Tan, Dilara Soylu, Noah Ziems, Rishi Khare, Krista Opsahl-Ong, Arnav Singhvi, Herumb Shandilya, Michael J Ryan, Meng Jiang, Christopher Potts, Koushik Sen, Alexandros G. Dimakis, Ion Stoica, Dan Klein, Matei Zaharia, Omar Khattab_ -- UC Berkeley, Stanford University, BespokeLabs.ai, Databricks, MIT`
)};
const _m4bux9 = function _2(md){return(
md`## Replicating GEPA

LLMs are powerful, but performance hinges on the prompt. I wanted to explore GEPA (Genetic-Pareto) as a method for optimizing prompts. I liked this algorithm because it’s easy to implement and leverages an LLM’s own understanding of natural language. It’s quite different from gradient ascent or other numerical approaches.

The main component is reflection: run a candidate prompt on all your tasks and record diagnostic information—reasoning traces, tool outputs, explanations of scores, and error messages (e.g., syntax errors that block execution). Then ask the LLM to improve the prompt based on that information — “mutate” it in genetic algorithm speak.

The second component is orchestrating reflection at scale. This uses simple numerics: for each task, assign a numeric score. If you have t tasks, each candidate prompt has t scores (a.k.a. multi-variate optimization). Maintain a pool of candidate prompts (initially size 1). Select the best-scoring prompts—the Pareto front of the multi-variate scores (code [here](https://observablehq.com/@tomlarkworthy/gepa#paretoFront)) — and generate improvements to add back into the pool.

That’s it. After a few generations, you’ll have much-improved prompts. I tested this using simple evals I had built for a coding assistant and did only 4 generations.
`
)};
const _yzhbv0 = function _3(md){return(
md`
### Seed prompt (human made)
\`\`\`
Respond in Observable Javascript (Notebook 1.0) inside an
XML code tag to solve the question.
for example
<cell>
<inputs></inputs>
<code><![CDATA[
x = 'string'
]]></code>
</cell>
\`\`\``
)};
const _ym4tko = function _4(md){return(
md`
### Evolved Prompt (made by GEPA)
\`\`\`
SCORE: 1,1,1,1,1,1,0.8,1
PROMPT: 
Respond only with XML containing Observable JavaScript (Notebook 1.0) cell blocks that solve the user’s task. Unless the user explicitly asks for multiple cells, return exactly one <cell>.

Cell format:
<cell>
  <inputs>COMMA-SEPARATED, ALPHABETICALLY SORTED, DEDUPED LIST OF EXTERNAL IDENTIFIERS USED BY THIS CELL (NO SPACES)</inputs>
  <code><![CDATA[
    Observable JavaScript for this cell (bare assignments only; no top-level const/let/var/class/import/require/function)
  ]]></code>
</cell>

Binding policy:
- Only create a named binding when the user specifies a variable name. If no name is requested, return an anonymous expression (e.g., md\`...\`, html\`...\`, Plot.plot(...), a DOM node, or a literal value) without inventing a variable.
- If the user requests an interactive control “bound to NAME” or says “viewof NAME”, define viewof NAME exactly. Otherwise, do not introduce viewof.

Authoring rules:
- Use bare assignment for all bindings (e.g., x = 42, f = (a, b) => a + b). No top-level declarations (const/let/var/class/function), no imports/requires, no runtimes, no <imports>.
- Prefer returning a value or DOM node (md, html, svg, Inputs, Plot) over side effects. Do not use console.log, alert, or document.write.
- Block cells ({ ... }) must return a value to set the cell’s value.
- Use Observable’s built-ins/globals directly and include each referenced identifier in <inputs>: html, svg, md, Inputs, Plot, d3, FileAttachment, DOM, width, Mutable, Generators, now, Event, document, window, URL, URLSearchParams, fetch, FormData, File, setTimeout, setInterval, clearTimeout, clearInterval, AbortController, IntersectionObserver, ResizeObserver, etc.
- List every external identifier referenced by this cell in <inputs>. Do not list variables defined by this cell. Deduplicate, sort alphabetically, and use no spaces (comma-separated). If none, use an empty <inputs></inputs> exactly.
- If the user asks to “use X” (e.g., d3, Plot, Inputs, fetch), actually reference X in code and include X in <inputs>.
- Avoid non-determinism unless requested. Prefer deterministic defaults; if time is needed, use now (and include now in <inputs>) rather than Date.now or new Date().
- Accessibility: provide labels for interactive controls. For Inputs.* use {label: "..."}. For custom controls, include an accessible label (e.g., aria-label on a button or a <label> element).
- Custom inputs: keep element.value up to date and dispatch new Event("input", {bubbles: true}) on change. Include Event (and any other globals used, e.g., FormData) in <inputs>.
- Use top-level await only when required (e.g., FileAttachment, fetch). Avoid unnecessary async wrappers.
- Do not reference undeclared names. If the task depends on prior variables not provided, implement a self-contained solution within the single cell.
- Avoid the literal CDATA terminator sequence inside code; if needed, split it (e.g., "]] ]>" as "]] ]" + ">").
- Match requested variable names exactly (including viewof names). Do not create both viewof x and x = viewof x unless explicitly requested; reference the requested name directly elsewhere.
- When producing plots, return the figure node (e.g., Plot.plot({...})) and include Plot in <inputs>; consider width for responsive sizing if appropriate (and include width in <inputs> if used).
- Output only the cell block(s)—no prose, no code fences, no JSON outside <cell>.

Usage guidance:
- d3: call d3.* and include d3 in <inputs> when used.
- Plot: call Plot.* and include Plot in <inputs>; prefer Plot.plot({...}) to produce a node.
- html/svg/md/Inputs: include the identifier in <inputs> when used.
- Include each browser/global you reference: FileAttachment/DOM/width/now/Event/document/window/URL/URLSearchParams/fetch/FormData/File/AbortController/etc.

UI control snippets (when asked):
- viewof ready = Inputs.toggle({label: "Ready?", value: false})
- viewof rgb = Inputs.select(["red", "green", "blue"], {label: "Color"})

Examples:
- Assign a number
<cell>
  <inputs></inputs>
  <code><![CDATA[
  x = 42
  ]]></code>
</cell>

- Say hello (anonymous, no binding invented)
<cell>
  <inputs>md</inputs>
  <code><![CDATA[
  md\`hello\`
  ]]></code>
</cell>

- Sum using d3
<cell>
  <inputs>d3</inputs>
  <code><![CDATA[
  sum = d3.sum([1, 2, 3, 4, 5])
  ]]></code>
</cell>

- Toggle value (binding requested)
<cell>
  <inputs>Inputs</inputs>
  <code><![CDATA[
  viewof ready = Inputs.toggle({label: "Ready?", value: false})
  ]]></code>
</cell>

- Dropdown bound to rgb (binding requested)
<cell>
  <inputs>Inputs</inputs>
  <code><![CDATA[
  viewof rgb = Inputs.select(["red","green","blue"], {label: "Color"})
  ]]></code>
</cell>

- Counter button (custom; accessible; note Event in inputs; binding requested)
<cell>
  <inputs>Event,html</inputs>
  <code><![CDATA[
  viewof count = {
    const button = html\`<button type="button" aria-label="Increment count">Count: 0</button>\`;
    button.value = 0;
    button.addEventListener("click", () => {
      button.value++;
      button.textContent = \`Count: \${button.value}\`;
      button.dispatchEvent(new Event("input", {bubbles: true}));
    });
    return button;
  }
  ]]></code>
</cell>

- Simple Plot (anonymous; no binding invented)
<cell>
  <inputs>Plot</inputs>
  <code><![CDATA[
  Plot.plot({marks: [Plot.barY([{x:"A",y:3},{x:"B",y:5}], {x:"x", y:"y"})]})
  ]]></code>
</cell>

- Load CSV via FileAttachment
<cell>
  <inputs>FileAttachment</inputs>
  <code><![CDATA[
  data = await FileAttachment("data.csv").csv()
  ]]></code>
</cell>

- Fetch JSON (note fetch and URL)
<cell>
  <inputs>URL,fetch</inputs>
  <code><![CDATA[
  data = await (await fetch(new URL("https://api.example.com/data.json"))).json()
  ]]></code>
</cell>

- Username/password form (anonymous when no binding is requested; accessible)
<cell>
  <inputs>Event,FormData,html</inputs>
  <code><![CDATA[
  {
    const form = html\`<form style="display:flex;flex-direction:column;gap:0.5em;max-width:300px">
      <label>Username: <input name="username" required autocomplete="username"></label>
      <label>Password: <input name="password" type="password" required autocomplete="current-password"></label>
      <button type="submit">Sign in</button>
    </form>\`;
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const data = new FormData(form);
      form.value = {username: data.get("username"), password: data.get("password")};
      form.dispatchEvent(new Event("input", {bubbles: true}));
    });
    return form;
  }
  ]]></code>
</cell>

Validation checklist before responding:
- Exactly one <cell> unless the user explicitly requested multiple.
- Only create named bindings when requested; otherwise return an anonymous expression.
- Every external identifier used by the code appears in <inputs>, deduped, alphabetically sorted, comma-separated, and with no spaces.
- No imports/requires/console.log or top-level const/let/var/class/function.
- Variable and viewof names match the request exactly.
- No undeclared references; self-contained if prior context is missing.
- Block cells return a value.
- Code does not include the CDATA terminator sequence.
- Output is only XML cell block(s)—no extra text.
- No unused identifiers in <inputs>.
- If the prompt asks to “use X”, X is referenced in code and included in <inputs>.
\`\`\``
)};
const _1l0iji2 = function _5(md){return(
md`## Tasks

The tasks used to evaluate are found in [@tomlarkworthy/robocoop-eval](https://observablehq.com/@tomlarkworthy/robocoop-eval). They are 8 very simple Observable coding challenges`
)};
const _13bsqrz = function _6(md){return(
md`## Noted on implementation

No cross-over was used.

We enabled websearch when reflecting on a new prompt (code [here](https://observablehq.com/@tomlarkworthy/gepa#reflectFn)). This was important because the LLM was able to source actual documentation on the Observable programming model when trying to fix misunderstandings.

`
)};
const _1k54qt1 = async function _7(FileAttachment,md){return(
md`## Critique

#### Overfitting
The run definitely overfitted to the evals, and many of its "examples" were direct solutions. The paper itself used a validation set to stop overfitting which I did not replicate. Even so, its quite impressive that it did figure out solutions still, it doesn't really know Observable Javascript idioms so it figured out those examples by itself! I think the real solution to overfitting is more and better eval tasks.

#### Introns

Sometimes the prompt will includes some totally pointless junk that is not useful. For example, on one run the whole pool got contaminated with adding cell type attributes to the cell tag e.g.
\`\`\`
<code type="solution"
</code>
\`\`\`
That has no effect in the system but these benign mutations don't have a mechanism for removal. In the above example it provides plot examples, but there are no eval task testing plot usage so those examples might be wrong! In production I would pass the final solution through an expect to trim the prompt of extras.

#### Diagnostics Traces

The GEPA algorithm is very simple and took about 1 hour to write with an LLM. However, the real brains to the system is the feedback emitted during evaluation of a prompt. The LLM cannot successful reflect unless there is clear reasons why a low score occurred. This got much more detailed than I originally anticipated, for example, surfacing syntax errors and runtime errors. By a large margin most of the time was spend on trace design and improving the tasks in the eval.

#### Costs

In total I spent $62 in API calls. This includes numerous failed runs. I think 1 run of GEPA on this tasks costs < $5. I use o4-mini as the coder, although this executes a lot it costs less than $0.1. The main driver of cost was the reflect function's o5 output tokens, spent as reasoning tokens ($50), websearch tool costs were only $1.70 and input tokens $7.1.

![image@1.png](${await FileAttachment("image@1.png").url()})

Once the scores and evals were engineered properly the GEPA algorithm was reliably able to improve the prompt to get good scores. So overall its a winner! `
)};
const _3gbcbe = function _8(md){return(
md`---

For the rest of the notebook to run you need to enter a "OPENAI_API_KEY" in the Robocoop 2.0 modal, but you can take the algorithm and rewire it to something else if you don't want to run *this* particular experiment.`
)};
const _1n4s65p = function _run_example(Inputs){return(
Inputs.toggle({
  label: "run GEPA"
})
)};
const _uzuua = (G, _) => G.input(_);
const _1x1qh0x = function _10(renderHierarchy,svg,width,heirachy){return(
renderHierarchy(svg`<svg width="${width}px"></svg>`, heirachy)
)};
const _mj7azk = function _11(md){return(
md`### Math`
)};
const _1mrfvxh = function _dominates(){return(
function dominates(a, b) {
  const betterInAny = a.scores.some((v, i) => v > b.scores[i]);
  const notWorse = a.scores.every((v, i) => v >= b.scores[i]);
  return betterInAny && notWorse;
}
)};
const _2ra3gw = function _paretoFront(dominates){return(
function paretoFront(pop) {
  return pop.filter((c) => !pop.some((o) => o !== c && dominates(o, c)));
}
)};
const _16qma11 = function _14(md){return(
md`## GEPA`
)};
const _8j7m46 = function _GEPA(){return(
class GEPA {
  constructor({
    initialPrompts,
    evalFn,
    reflectFn,
    populationSize = 12,
    children = 2,
    generations = 8
  }) {
    this.evalFn = evalFn;
    this.reflectFn = reflectFn;
    this.populationSize = populationSize;
    this.children = children;
    this.generations = generations;
    this.population = initialPrompts.map((p) => ({
      parent: null,
      prompt: p,
      scores: null,
      trace: ""
    }));
  }
}
)};
const _lji6ct = function _initialize(){return(
async function initialize(gepa) {
  // evaluate seed prompts
  await Promise.all(
    gepa.population.map(async (c) => {
      const r = await gepa.evalFn(c.prompt);
      c.scores = r.scores;
      c.trace = r.trace;
    })
  );
  return gepa;
}
)};
const _11mvypw = function _step(paretoFront){return(
async function step(gepa) {
  const frontier = paretoFront(gepa.population);

  const tasks = frontier.flatMap((parent) =>
    Array.from({ length: gepa.children }, async () => {
      try {
        const childPrompt = await gepa.reflectFn(parent.prompt, parent.trace);
        const r = await gepa.evalFn(childPrompt);
        return {
          parent,
          prompt: childPrompt,
          scores: r.scores,
          trace: r.trace
        };
      } catch (e) {
        console.error(e);
        return null;
      }
    })
  );

  const offspring = (await Promise.all(tasks)).filter(Boolean);

  gepa.population = paretoFront([...frontier, ...offspring]);
  if (gepa.population.length > gepa.populationSize)
    gepa.population.length = gepa.populationSize;

  return gepa;
}
)};
const _xs16ch = function _18(md){return(
md`### LLM integration (callFn)`
)};
const _f6c30k = function _callFn(runPrompt){return(
async function callFn(prompt, task) {
  const output = await runPrompt(task, {
    system_prompt: prompt
  });
  output.trace = `USER: ${task.query}\nLLM: ${JSON.stringify(
    output.response
  )}\nASSISTANT: ${JSON.stringify(output.cells, null, 2)}`;
  return output;
}
)};
const _7uh3vw = function _21(md){return(
md`#### test callFn`
)};
const _1lm73ed = async function _test_callFn(callFn,system_prompt,assign_literal,expect,seed_prompt)
{
  const output = await callFn(system_prompt, assign_literal);
  expect(output.cells.length).toBeGreaterThan(0);
  expect(output.trace.length).toBeGreaterThan(0);
  return {
    seed_prompt,
    ...output
  };
};
const _v4uo6x = function _23(test_callFn){return(
test_callFn.trace
)};
const _1iv5c0q = function _24(md){return(
md`### Scoring Tasks (scoreFn, evalFn)`
)};
const _1mqx2qd = function _scoreFn(runScore){return(
async (output, task) => {
  const experiment = await runScore({
    response: output,
    caseTask: task
  });

  const overall =
    (experiment.score.responded ? 1 : 0) +
    (experiment.score.compiles ? 1 : 0) +
    (experiment.score.applies ? 1 : 0) +
    (experiment.score.correct ? 1 : 0) +
    (experiment.score.errors.length == 0 ? 1 : 0);
  return {
    score: overall / 5.0,
    trace: JSON.stringify(experiment.score, null, 2)
  };
}
)};
const _12qixtq = async function _test_scoreFn(test_callFn,scoreFn,assign_literal)
{
  const output = test_callFn;
  const scoreResponse = await scoreFn(output, assign_literal);

  return scoreResponse.trace;
};
const _1i8kd6d = function _buildEvalFn(){return(
function buildEvalFn({ tasks, callFn, scoreFn, aggregator = (s) => s }) {
  return async function evalFn(prompt) {
    const taskScores = [];
    const traceParts = [];
    const outputs = [];
    await Promise.all(
      tasks.map(async (task) => {
        const output = await callFn(prompt, task);
        const score = await scoreFn(output, task);
        outputs.push(output);
        taskScores.push(score.score);
        traceParts.push(
          `TASK: ${task.name}\nSCORE: ${score.trace}\nOVERALL: ${score.score}\nTRACE: ${output.trace}\n`
        );
      })
    );
    const scores = aggregator(taskScores);
    return { scores, outputs, trace: traceParts.join("\n---\n") };
  };
}
)};
const _1islugy = function _evalFn(buildEvalFn,cases,callFn,scoreFn){return(
buildEvalFn({
  tasks: [...cases.values()],
  callFn,
  scoreFn
})
)};
const _1ah4m22 = async function _test_evalFn(evalFn,seed_prompt,expect,cases)
{
  const result = await evalFn(seed_prompt);
  expect(result.scores.length).toEqual([...cases.values()].length);
  expect(result.trace).toBeDefined();
  return result;
};
const _pwzs1p = function _30(test_evalFn){return(
test_evalFn.trace
)};
const _1puozak = function _31(md){return(
md`## Reflection

Learning how to answer the prompt requires research, so the reflect function first uses a web tool and then answers with an improved prompt.`
)};
const _1ku7r1a = function _reflectFn(responses){return(
async function reflectFn(prompt, trace) {
  const sys = `You are a prompt‑engineer AI. You will be improving the performance of a prompt by considering recent executions of that prompt against a variate of tasks that were asked by a user. You need to look for ways to improve the SCORE by considering recent executions using that prompt and doing web research on the domain.

Your tasks is to improve the CURRENT PROMPT.
You will be given traces of several TASKS using the CURRENT PROMPT
and then respond only with the text of the improved using the improve_prompt tool`;
  const research_msg = `Generate some ideas on how how this prompt might be improved, perhaps using web research\nCURRENT PROMPT:\n${prompt}\n${trace}`;
  const research_response = await responses({
    model: "gpt-5",
    instructions: sys,
    input: research_msg,
    tool_choice: "auto",
    tools: [{ type: "web_search_preview" }]
  });

  const improve_msg = `Now suggest a candidate prompt improvement`;
  const prompt_improvement_response = await responses({
    model: "gpt-5",
    input: improve_msg,
    previous_response_id: research_response.id,
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
const _kcabcn = function _test_reflectFunction(reflectFn,system_prompt,test_evalFn)
{
  const reflection = reflectFn(system_prompt, test_evalFn.trace);

  return reflection;
};
const _s893p8 = function _34(md){return(
md`## Run GEPA`
)};
const _5h425v = function _seed_prompt(){return(
`Respond in Observable Javascript (Notebook 1.0) inside an XML code tag to solve the question. for example
<cell>
<inputs></inputs>
<code><![CDATA[
x = 'string'
]]></code>
</cell>`
)};
const _19ech3f = function _test_gepa_initialization(GEPA,seed_prompt,evalFn,reflectFn)
{
  const state = new GEPA({
    initialPrompts: [seed_prompt],
    evalFn,
    reflectFn,
    populationSize: undefined,
    children: undefined,
    generations: undefined
  });
  return state;
};
const _158x871 = function _test_gepa_initialize(run_example,initialize,test_gepa_initialization){return(
run_example && initialize(test_gepa_initialization)
)};
const _1iexg3 = function _pInit(recordFront,paretoFront,test_gepa_initialize){return(
recordFront(paretoFront(test_gepa_initialize.population))
)};
const _lapomy = function _39(printFront,pInit){return(
printFront(pInit)
)};
const _39u7ur = function _test_gepa_step_0(step,test_gepa_initialization){return(
step(test_gepa_initialization)
)};
const _thykpt = function _p0(recordFront,paretoFront,test_gepa_step_0){return(
recordFront(paretoFront(test_gepa_step_0.population))
)};
const _lkye0 = function _42(printFront,p0){return(
printFront(p0)
)};
const _9mmzyl = function _test_gepa_step_1(step,test_gepa_step_0){return(
step(test_gepa_step_0)
)};
const _1uf5zl9 = function _p1(recordFront,paretoFront,test_gepa_step_1){return(
recordFront(paretoFront(test_gepa_step_1.population))
)};
const _1vmtc39 = function _45(printFront,p1){return(
printFront(p1)
)};
const _ga9k4v = function _test_gepa_step_2(step,test_gepa_step_1){return(
step(test_gepa_step_1)
)};
const _1f0xlq1 = function _p2(recordFront,paretoFront,test_gepa_step_2){return(
recordFront(paretoFront(test_gepa_step_2.population))
)};
const _1apnj16 = function _48(printFront,p2){return(
printFront(p2)
)};
const _n8iajt = function _test_gepa_step_3(step,test_gepa_step_2){return(
step(test_gepa_step_2)
)};
const _jggj2t = function _p3(recordFront,paretoFront,test_gepa_step_3){return(
recordFront(paretoFront(test_gepa_step_3.population))
)};
const _woiogq = function _51(printFront,p3){return(
printFront(p3)
)};
const _9jh14f = function _test_gepa_step_4(step,test_gepa_step_3){return(
step(test_gepa_step_3)
)};
const _zs1upd = function _p4(recordFront,paretoFront,test_gepa_step_4){return(
recordFront(paretoFront(test_gepa_step_4.population))
)};
const _1xj3gx = function _54(printFront,p4){return(
printFront(p4)
)};
const _17r60v9 = function _printFront(Inputs){return(
(front) =>
  Inputs.textarea({
    rows: 100,
    value: front
      .map(
        (s) =>
          `SCORE: ${s.scores}\nPROMPT: \n${s.prompt}\nTRACE:\n\n${s.trace}\n`
      )
      .join("")
  })
)};
const _gpain7 = function _recordFront($0,Event){return(
function recordFront(front) {
  $0.value.push(front);
  $0.dispatchEvent(new Event("input"));
  return front;
}
)};
const _9xllhl = function _generations(Inputs){return(
Inputs.input([])
)};
const _1w6v8t1 = (G, _) => G.input(_);
const _1bb8h76 = function _58(generations){return(
generations
)};
const _102atgg = function _toHierarchy(){return(
function toHierarchy(generations) {
  // Map candidates to node shells
  const nodeMap = new Map();
  generations.flat().forEach((c) => {
    nodeMap.set(c, { name: c.scores.join(","), data: c, children: [] });
  });
  // Wire up children
  generations.flat().forEach((c) => {
    if (c.parent && nodeMap.has(c.parent)) {
      nodeMap.get(c.parent).children.push(nodeMap.get(c));
    }
  });
  // Roots = generation 0
  const roots = generations[0].map((c) => nodeMap.get(c));
  return roots.length === 1 ? roots[0] : { name: "root", children: roots };
}
)};
const _1v8wuev = function _heirachy(toHierarchy,generations){return(
toHierarchy([generations.at(-1)])
)};
const _15z7pjh = function _61(renderHierarchy,svg,width,heirachy){return(
renderHierarchy(svg`<svg width="${width}px"></svg>`, heirachy)
)};
const _rdv41j = function _renderHierarchy(d3){return(
function renderHierarchy(
  svg,
  data,
  {
    nodeWidth = 20,
    levelGap = 30,
    separation = (a, b) => (a.parent === b.parent ? 1 : 2),
    nodeRadius = 10,
    marginTop = 0
  } = {}
) {
  // Lazy load d3 from global if not imported

  const root = d3.hierarchy(data);
  d3.tree().nodeSize([nodeWidth, levelGap]).separation(separation)(root);
  const xMin = Math.min(...root.descendants().map((d) => d.x)) - nodeWidth;
  const xMax = Math.max(...root.descendants().map((d) => d.x)) + nodeWidth;
  const yMin = Math.min(...root.descendants().map((d) => d.y)) - nodeWidth;
  const yMax = Math.max(...root.descendants().map((d) => d.y)) + nodeWidth;
  const g = d3
    .select(svg)
    .attr("viewBox", [xMin, yMin, xMax - xMin, yMax - yMin]);

  // links
  g.selectAll("path.link")
    .data(root.links())
    .join("path")
    .attr("class", "link")
    .attr("fill", "none")
    .attr("stroke", "#999")
    .attr(
      "d",
      (d) =>
        `M${d.source.x},${d.source.y}V${(d.source.y + d.target.y) / 2}H${
          d.target.x
        }V${d.target.y}`
    );

  // nodes
  const node = g
    .selectAll("g.node")
    .data(root.descendants())
    .join("g")
    .attr("class", "node")
    .attr("transform", (d) => `translate(${d.x},${d.y})`);

  node
    .append("circle")
    .attr("r", nodeRadius)
    .attr("fill", "#fff")
    .attr("stroke", "#333");

  node
    .append("text")
    .attr("dy", 1)
    .attr("font-size", 3)
    .attr("text-anchor", "middle")
    .text((d) => d.data.name);
  return svg;
}
)};
const _1wh4xx3 = function _63(md){return(
md`## Evals`
)};
const _1ffv385 = function _data(cases){return(
[...cases.values()]
)};
const _juhx37 = function _66(Inputs,data){return(
Inputs.table(data, {
  layout: "auto"
})
)};
const _1p1hazz = function _67(md){return(
md`# Dev tools`
)};
const _m74tza = function _68(ui,md){return(
md`<div>
  ${ui}
</div>`
)};
const _1w2i9d4 = function _sayHello()
{
  return "hello";
};
const _x7z4af = function _test_hello(expect,sayHello){return(
expect(sayHello).toEqual("hello")
)};
const _112rz56 = function _73(exporter){return(
exporter()
)};
const _i0kkp7 = function _77(load_all){return(
load_all
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };
  const fileAttachments = new Map(["image@1.png"].map((name) => {
    const module_name = "@tomlarkworthy/gepa";
    const {status, mime, bytes} = window.lopecode.contentSync(module_name + "/" + encodeURIComponent(name));
    const blob_url = URL.createObjectURL(new Blob([bytes], { type: mime}));
    return [name, {url: blob_url, mimeType: mime}]
  }));
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));

  main.define("module @tomlarkworthy/openai-responses-api", async () => runtime.module((await import("/@tomlarkworthy/openai-responses-api.js?v=4")).default));  
  main.define("module @tomlarkworthy/robocoop-eval", async () => runtime.module((await import("/@tomlarkworthy/robocoop-eval.js?v=4")).default));  
  main.define("module @tomlarkworthy/agentic-planner", async () => runtime.module((await import("/@tomlarkworthy/agentic-planner.js?v=4")).default));  
  main.define("module @tomlarkworthy/exporter-2", async () => runtime.module((await import("/@tomlarkworthy/exporter-2.js?v=4")).default));  
  main.define("module @tomlarkworthy/editor-4", async () => runtime.module((await import("/@tomlarkworthy/editor-4.js?v=4")).default));  
  main.define("module @tomlarkworthy/gepa", async () => runtime.module((await import("/@tomlarkworthy/gepa.js?v=4")).default));  
  $def("_1op1akb", null, ["md"], _1op1akb);  
  $def("_m4bux9", null, ["md"], _m4bux9);  
  $def("_yzhbv0", null, ["md"], _yzhbv0);  
  $def("_ym4tko", null, ["md"], _ym4tko);  
  $def("_1l0iji2", null, ["md"], _1l0iji2);  
  $def("_13bsqrz", null, ["md"], _13bsqrz);  
  $def("_1k54qt1", null, ["FileAttachment","md"], _1k54qt1);  
  $def("_3gbcbe", null, ["md"], _3gbcbe);  
  $def("_1n4s65p", "viewof run_example", ["Inputs"], _1n4s65p);  
  $def("_uzuua", "run_example", ["Generators","viewof run_example"], _uzuua);  
  $def("_1x1qh0x", null, ["renderHierarchy","svg","width","heirachy"], _1x1qh0x);  
  $def("_mj7azk", null, ["md"], _mj7azk);  
  $def("_1mrfvxh", "dominates", [], _1mrfvxh);  
  $def("_2ra3gw", "paretoFront", ["dominates"], _2ra3gw);  
  $def("_16qma11", null, ["md"], _16qma11);  
  $def("_8j7m46", "GEPA", [], _8j7m46);  
  $def("_lji6ct", "initialize", [], _lji6ct);  
  $def("_11mvypw", "step", ["paretoFront"], _11mvypw);  
  $def("_xs16ch", null, ["md"], _xs16ch);  
  main.define("responses", ["module @tomlarkworthy/openai-responses-api", "@variable"], (_, v) => v.import("responses", _));  
  $def("_f6c30k", "callFn", ["runPrompt"], _f6c30k);  
  $def("_7uh3vw", null, ["md"], _7uh3vw);  
  $def("_1lm73ed", "test_callFn", ["callFn","system_prompt","assign_literal","expect","seed_prompt"], _1lm73ed);  
  $def("_v4uo6x", null, ["test_callFn"], _v4uo6x);  
  $def("_1iv5c0q", null, ["md"], _1iv5c0q);  
  $def("_1mqx2qd", "scoreFn", ["runScore"], _1mqx2qd);  
  $def("_12qixtq", "test_scoreFn", ["test_callFn","scoreFn","assign_literal"], _12qixtq);  
  $def("_1i8kd6d", "buildEvalFn", [], _1i8kd6d);  
  $def("_1islugy", "evalFn", ["buildEvalFn","cases","callFn","scoreFn"], _1islugy);  
  $def("_1ah4m22", "test_evalFn", ["evalFn","seed_prompt","expect","cases"], _1ah4m22);  
  $def("_pwzs1p", null, ["test_evalFn"], _pwzs1p);  
  $def("_1puozak", null, ["md"], _1puozak);  
  $def("_1ku7r1a", "reflectFn", ["responses"], _1ku7r1a);  
  $def("_kcabcn", "test_reflectFunction", ["reflectFn","system_prompt","test_evalFn"], _kcabcn);  
  $def("_s893p8", null, ["md"], _s893p8);  
  $def("_5h425v", "seed_prompt", [], _5h425v);  
  $def("_19ech3f", "test_gepa_initialization", ["GEPA","seed_prompt","evalFn","reflectFn"], _19ech3f);  
  $def("_158x871", "test_gepa_initialize", ["run_example","initialize","test_gepa_initialization"], _158x871);  
  $def("_1iexg3", "pInit", ["recordFront","paretoFront","test_gepa_initialize"], _1iexg3);  
  $def("_lapomy", null, ["printFront","pInit"], _lapomy);  
  $def("_39u7ur", "test_gepa_step_0", ["step","test_gepa_initialization"], _39u7ur);  
  $def("_thykpt", "p0", ["recordFront","paretoFront","test_gepa_step_0"], _thykpt);  
  $def("_lkye0", null, ["printFront","p0"], _lkye0);  
  $def("_9mmzyl", "test_gepa_step_1", ["step","test_gepa_step_0"], _9mmzyl);  
  $def("_1uf5zl9", "p1", ["recordFront","paretoFront","test_gepa_step_1"], _1uf5zl9);  
  $def("_1vmtc39", null, ["printFront","p1"], _1vmtc39);  
  $def("_ga9k4v", "test_gepa_step_2", ["step","test_gepa_step_1"], _ga9k4v);  
  $def("_1f0xlq1", "p2", ["recordFront","paretoFront","test_gepa_step_2"], _1f0xlq1);  
  $def("_1apnj16", null, ["printFront","p2"], _1apnj16);  
  $def("_n8iajt", "test_gepa_step_3", ["step","test_gepa_step_2"], _n8iajt);  
  $def("_jggj2t", "p3", ["recordFront","paretoFront","test_gepa_step_3"], _jggj2t);  
  $def("_woiogq", null, ["printFront","p3"], _woiogq);  
  $def("_9jh14f", "test_gepa_step_4", ["step","test_gepa_step_3"], _9jh14f);  
  $def("_zs1upd", "p4", ["recordFront","paretoFront","test_gepa_step_4"], _zs1upd);  
  $def("_1xj3gx", null, ["printFront","p4"], _1xj3gx);  
  $def("_17r60v9", "printFront", ["Inputs"], _17r60v9);  
  $def("_gpain7", "recordFront", ["viewof generations","Event"], _gpain7);  
  $def("_9xllhl", "viewof generations", ["Inputs"], _9xllhl);  
  $def("_1w6v8t1", "generations", ["Generators","viewof generations"], _1w6v8t1);  
  $def("_1bb8h76", null, ["generations"], _1bb8h76);  
  $def("_102atgg", "toHierarchy", [], _102atgg);  
  $def("_1v8wuev", "heirachy", ["toHierarchy","generations"], _1v8wuev);  
  $def("_15z7pjh", null, ["renderHierarchy","svg","width","heirachy"], _15z7pjh);  
  $def("_rdv41j", "renderHierarchy", ["d3"], _rdv41j);  
  $def("_1wh4xx3", null, ["md"], _1wh4xx3);  
  main.define("cases", ["module @tomlarkworthy/robocoop-eval", "@variable"], (_, v) => v.import("cases", _));  
  main.define("runCase", ["module @tomlarkworthy/robocoop-eval", "@variable"], (_, v) => v.import("runCase", _));  
  main.define("assign_literal", ["module @tomlarkworthy/robocoop-eval", "@variable"], (_, v) => v.import("assign_literal", _));  
  main.define("load_all", ["module @tomlarkworthy/robocoop-eval", "@variable"], (_, v) => v.import("load_all", _));  
  main.define("system_prompt", ["module @tomlarkworthy/robocoop-eval", "@variable"], (_, v) => v.import("system_prompt", _));  
  main.define("runScore", ["module @tomlarkworthy/robocoop-eval", "@variable"], (_, v) => v.import("runScore", _));  
  main.define("runPrompt", ["module @tomlarkworthy/robocoop-eval", "@variable"], (_, v) => v.import("runPrompt", _));  
  $def("_1ffv385", "data", ["cases"], _1ffv385);  
  $def("_juhx37", null, ["Inputs","data"], _juhx37);  
  $def("_1p1hazz", null, ["md"], _1p1hazz);  
  $def("_m74tza", null, ["ui","md"], _m74tza);  
  $def("_1w2i9d4", "sayHello", [], _1w2i9d4);  
  $def("_x7z4af", "test_hello", ["expect","sayHello"], _x7z4af);  
  main.define("ui", ["module @tomlarkworthy/agentic-planner", "@variable"], (_, v) => v.import("ui", _));  
  main.define("failing_tests", ["module @tomlarkworthy/agentic-planner", "@variable"], (_, v) => v.import("failing_tests", _));  
  main.define("expect", ["module @tomlarkworthy/agentic-planner", "@variable"], (_, v) => v.import("expect", _));  
  main.define("exporter", ["module @tomlarkworthy/exporter-2", "@variable"], (_, v) => v.import("exporter", _));  
  $def("_112rz56", null, ["exporter"], _112rz56);  
  main.define("context_menu", ["module @tomlarkworthy/editor-4", "@variable"], (_, v) => v.import("context_menu", _));  
  $def("_i0kkp7", null, ["load_all"], _i0kkp7);
  return main;
}