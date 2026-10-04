// The fixed session wire-snapshot.mjs replays: user messages typed into the chat, and for each request
// the reply the stub model returns. The replies are chosen to make the notebook produce as many of its
// own messages as one session can: nudges, completion gates, refusals, write reports and tool findings.
// The completion guard fires once per turn, so each gate has its own turn.
const mod = (cells, defs, extra = "") => cells.join("\n") + `
export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;
${defs.map((d) => "  " + d).join("\n")}${extra}
  return main;
}
`;

// Reads go to a module the refactor does not touch: robocoop-5's own source in a tool result would change the
// hash on every commit that moves a line.
const STABLE = "/src/@tomlarkworthy/plugin-registry.js";
const COUNTER = "/src/@user/counter.js";
const counterCells = [
  "const _intro = function intro(md){return( md`# Counter` )};",
  "const _step = function step(Inputs){return( Inputs.range([1, 10], {label: \"step\", step: 1, value: 2}) )};",
  "const _stepv = (G, v) => G.input(v);",
  "const _total = function total(step){return( step * 10 )};",
  "const _ratio = function ratio(total){return( total / (total - 20) )};",
  "const _label = function label(htl, ratio, total){return( htl.html`<p>total ${total}, ratio ${ratio}, obj ${{}}</p>` )};",
  "const _broken = function broken(total){ return total.missing.deeper; };",
  "const _scale = function scale(n){return( n * 3 )};",
  "const _orphan = function orphan(){return( 1 )};",
  "const _test_total = function test_total(total){ if (total !== 21) throw new Error(\"total is \" + total + \", want 21\"); return total; };",
];
const counterDefs = [
  "$def(\"_intro\", \"intro\", [\"md\"], _intro);",
  "$def(\"_step\", \"viewof step\", [\"Inputs\"], _step);",
  "$def(\"_stepv\", \"step\", [\"Generators\", \"viewof step\"], _stepv);",
  "$def(\"_total\", \"total\", [\"step\"], _total);",
  "$def(\"_ratio\", \"ratio\", [\"total\"], _ratio);",
  "$def(\"_label\", \"label\", [\"htl\", \"total\", \"ratio\"], _label);",
  "$def(\"_broken\", \"broken\", [\"total\"], _broken);",
  "$def(\"_scale\", \"scale\", [], _scale);",
  "$def(\"_test_total\", \"test_total\", [\"total\"], _test_total);",
];
// V1 names a function no declaration provides, so it does not compile; V2 applies.
const counterV1 = mod(counterCells, [...counterDefs, "$def(\"_missing\", \"missing\", [], _missing);"]);
const counterV2 = mod(counterCells, counterDefs);

const SOLUTION = "/src/@user/solution.js";
const solution = mod(["const _add = function add(){return( (a, b) => a + b )};"], ["$def(\"_add\", \"add\", [], _add);"]);
const SPEC = "/src/@user/spec.js";
const spec = mod([
  "const _examples = function examples(){return( [{name: \"adds\", js: \"add(1, 2)\", expected: 3}, {name: \"adds wrongly\", js: \"add(2, 2)\", expected: 5}] )};",
], ["$def(\"_examples\", \"examples\", [], _examples);"]);

const done = (summary) => ({ tool: "task_complete", args: { summary } });

export const SCRIPT = [
  // nudges and the zero-tool-call gate; searches that find nothing; a read
  { user: "Build a counter module with a step slider and a test.", replies: [
    { text: "I will build the counter module now." },
    done("Built /src/@user/counter.js with a slider and a test."),
    { tool: "glob", args: { pattern: "/src/@user/countr*.js" } },
    { tool: "grep", args: { pattern: "createPluginz", path: STABLE } },
    { tool: "grep", args: { pattern: "listeners", path: STABLE, max_results: 2 } },
    { tool: "read_file", args: { file_path: STABLE, offset: 1, limit: 12 } },
    { tool: "no_such_tool", args: { x: 1 } },
    { tool: "read_file", rawArgs: "{\"file_path\": \"/src/@tomlarkworthy/robocoop-5-to" },
    done("Looked around; nothing written yet. Shall I write the module?"),
  ] },
  // a write refused for an unread wiki page, the unwritten gate, then the write with its reports
  { user: "Yes, write it.", replies: [
    { tool: "write_file", args: { file_path: COUNTER, content: counterV1 } },
    done("Wrote /src/@user/counter.js."),
    { tool: "read_file", args: { file_path: "/content/@tomlarkworthy/markdown-wiki/writing-cells-in-module-source.md" } },
    { tool: "read_file", args: { file_path: "/content/@tomlarkworthy/markdown-wiki/writing-unit-tests-in-a-notebook.md", limit: 20 } },
    { tool: "write_file", args: { file_path: COUNTER, content: counterV1 } },
    { tool: "write_file", args: { file_path: COUNTER, content: counterV2 } },
    { tool: "read_file", args: { file_path: COUNTER } },
    { tool: "list_values", args: { module: "@user/counter" } },
    { tool: "inspect_value", args: { module: "@user/counter", name: "label" } },
    { tool: "eval_js", args: { module: "@user/counter", code: "const t = total; const r = ratio;" } },
    { tool: "eval_js", args: { module: "@user/counter", code: "total + 1" } },
    { tool: "eval_js", args: { module: "@tomlarkworthy/robocoop-5-core", code: "1 + 1" } },
    done("Wrote the counter; some cells still error."),
  ] },
  // edits, the untried-controls gate, try_control, the self-edit refusal, a watch, a batched completion
  { user: "Fix the test and the broken cells.", replies: [
    { tool: "edit_file", args: { file_path: COUNTER, old_string: "total !== 21", new_string: "total !== 20" } },
    { tool: "edit_file", args: { file_path: COUNTER, old_string: "this text is not in the file", new_string: "x" } },
    done("Fixed the test."),
    { tool: "try_control", args: { module: "@user/counter" } },
    { tool: "try_control", args: { module: "@user/counter", control: "step", value: 7 } },
    { tool: "watch_variable", args: { module: "@user/counter", name: "total" } },
    { tool: "eval_js", args: { module: "@user/counter", code: "const el = viewof_step; el.value = 5; el.dispatchEvent(new Event(\"input\", {bubbles: true})); return el.value;" } },
    { tool: "edit_file", args: { file_path: "/src/@tomlarkworthy/robocoop-5-core.js", old_string: "stallNudgeLimit", new_string: "stallLimit" } },
    { tool: "get_context", args: {} },
    { tool: "unwatch_variable", args: { module: "@user/counter", name: "total" } },
    { calls: [{ tool: "list_values", args: { module: "@user/counter" } }, { tool: "task_complete", args: { summary: "All fixed." } }] },
    done("The test passes at step 2; broken and scale still error."),
  ] },
  // a spec module with one failing example. With the spec-lock plugin the first completion is refused and the
  // last two replies are asked for; without it (SCRIPT_SHIPPED) the turn ends at that completion.
  { user: "Add a spec for add().", replies: [
    { tool: "write_file", args: { file_path: SOLUTION, content: solution } },
    { tool: "write_file", args: { file_path: SPEC, content: spec } },
    done("Wrote the solution and its spec."),
    { tool: "edit_file", args: { file_path: SPEC, old_string: "expected: 5", new_string: "expected: 4" } },
    done("The spec is green."),
  ] },
  // a turn with no tool call that addresses the user
  { user: "Thanks. What would you do next?", replies: [
    done("Would you like the broken cells removed, or kept as examples?"),
  ] },
];

const SPEC_TURN = "Add a spec for add().";
export const SCRIPT_SHIPPED = SCRIPT.map((t) => t.user === SPEC_TURN ? { ...t, replies: t.replies.slice(0, 3) } : t);
