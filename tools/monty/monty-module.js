const _intro = function _intro(md){return(
md`# Monty: sandboxed Python in the browser

[Monty](https://github.com/pydantic/monty) is a Python interpreter written in Rust by Pydantic, built to run code written by LLMs. It implements a subset of Python 3.14 and has no filesystem, network or environment access unless the host grants it.

This notebook runs the \`@pydantic/monty@0.0.23\` WebAssembly build. The interpreter and its worker are file attachments of this module, so it works offline. Each run happens in a Web Worker.

\`py\` is a tagged template, so a Python cell is an ordinary reactive cell. Its value is the value of the last Python expression, and each \`\${…}\` is a dependency on JavaScript. In the cell below, \`n\` comes from the JavaScript slider, the Fibonacci numbers are computed in Python, and the chart is JavaScript again.`
)};
const _fib = function _fib(py,n){return(
py`
  def fib(k):
      a, b = 0, 1
      for _ in range(k):
          a, b = b, a + b
      return a

  [{"i": i, "fib": fib(i)} for i in range(1, ${n} + 1)]
`
)};
const _n = function _n(Inputs){return(
Inputs.range([1, 80], { value: 30, step: 1, label: "n" })
)};
const _n_value = (G, _) => G.input(_);
const _fib_plot = function _fib_plot(Plot,fib){return(
Plot.plot({
  height: 240,
  y: { type: "log", grid: true },
  marks: [Plot.line(fib, { x: "i", y: "fib" }), Plot.dot(fib, { x: "i", y: "fib" })]
})
)};
const _interp_md = function _interp_md(md){return(
md`### How interpolation works

An interpolated value is **not** pasted into the source as text. Each \`\${…}\` is replaced by a generated variable name and its value is passed into the sandbox, so a string can never inject code. It follows that \`\${…}\` belongs where a Python *expression* goes. Inside a string literal it would be just the variable's name, so use an f-string: \`f"hello {\${name}}"\`.

| JavaScript in | Python sees |
|---|---|
| number, string, boolean, \`null\`/\`undefined\` | \`int\`/\`float\`, \`str\`, \`bool\`, \`None\` |
| array, typed array | \`list\` (\`Uint8Array\` → \`bytes\`) |
| plain object, \`Map\` | \`dict\` |
| \`Set\` | \`set\` |
| \`BigInt\` | \`int\` |
| function (sync or async) | a callable; keyword arguments arrive as a trailing object |

| Python out | JavaScript gets |
|---|---|
| \`dict\` with string keys | plain object |
| other \`dict\` | \`Map\` |
| \`list\`, \`tuple\` | array |
| \`set\` | \`Set\` |
| \`None\` | \`null\` |
| \`int\` beyond 2^53 | \`BigInt\` |

A Python exception becomes the cell's error. \`print\` output goes to the browser console. Each \`py\` evaluation runs in a fresh session, so Python variables do not leak between cells; share state through cell values instead.

Here JavaScript text goes in, Python counts the words, and a JavaScript table displays the result:`
)};
const _text = function _text(Inputs){return(
Inputs.textarea({
  value: "the quick brown fox jumps over the lazy dog the fox",
  rows: 2,
  width: "100%",
  label: "text"
})
)};
const _text_value = (G, _) => G.input(_);
const _word_counts = function _word_counts(py,text){return(
py`
  counts = {}
  for w in ${text}.lower().split():
      counts[w] = counts.get(w, 0) + 1
  [{"word": w, "count": c} for w, c in sorted(counts.items(), key=lambda kv: -kv[1])]
`
)};
const _word_table = function _word_table(Inputs,word_counts){return(
Inputs.table(word_counts)
)};
const _call_md = function _call_md(md){return(
md`A JavaScript function passed in can be called from Python. \`Math.hypot\` runs on the host:`
)};
const _hypot = function _hypot(py){return(
py`${Math.hypot}(3, 4)`
)};
const _scratch_md = function _scratch_md(md){return(
md`## Scratchpad

\`runPython\` is the lower-level API that \`py\` is built on. Edit the Python below and press **Run**. \`n\` is passed in as an input, and \`shout\` is a JavaScript function the sandbox can call.`
)};
const _source = function _source(Inputs){return(
Inputs.textarea({
  value: `from dataclasses import dataclass

@dataclass
class Point:
    x: float
    y: float

def fib(n):
    a, b = 0, 1
    for _ in range(n):
        a, b = b, a + b
    return a

print("fib:", [fib(i) for i in range(n)])
p = Point(3, 4)
print(f"|p| = {(p.x**2 + p.y**2) ** 0.5}")

{"fib_50": fib(50), "shout": await shout("hello from python")}`,
  rows: 20,
  monospace: true,
  width: "100%",
  submit: "Run"
})
)};
const _source_value = (G, _) => G.input(_);
const _result = function _result(runPython,source){return(
runPython(source, {
  inputs: { n: 10 },
  externalLookup: { shout: async (text) => text.toUpperCase() }
})
)};
const _output = function _output(htl,result,Inspector){return(
htl.html`<div>
  <pre style="margin:0 0 .5em;padding:.5em;background:var(--theme-background-alt,#f5f5f5);white-space:pre-wrap">${
    result.output.map(({ text }) => text).join("") || "(no output)"
  }</pre>
  ${
    result.ok
      ? (() => { const div = htl.html`<div>`; new Inspector(div).fulfilled(result.value); return div; })()
      : htl.html`<pre style="color:var(--syntax-error,#c00);white-space:pre-wrap">${result.error.name}: ${result.error.message}</pre>`
  }
  <small>${result.ms.toFixed(1)} ms</small>
</div>`
)};
const _usage = function _usage(md){return(
md`## Using it from another notebook

~~~js
import {py, runPython, pool} from "@tomlarkworthy/monty"
~~~

\`runPython(code, {inputs, externalLookup, session})\` checks out a session, runs \`code\` and returns \`{ok, value, error, output, ms}\` without converting the value; a Python \`dict\` arrives as a \`Map\`. \`output\` is the list of \`{stream, text}\` chunks the code printed. Pass \`session\` (from \`await pool.checkout()\`) to keep variables between calls; otherwise each call gets a fresh session and returns it to the pool.

Limits of the browser build, from the [JavaScript docs](https://pydantic.dev/docs/monty/quickstart/javascript/): no filesystem mounts, prints are collected per run rather than streamed, and running out of memory raises \`MontyCrashedError\` rather than \`MemoryError\`. A \`Date\` or a class instance cannot be interpolated as-is; wrap an object in \`monty.ClassInstance\` to expose its attributes and methods.

## Implementation`
)};
const _py = function _py(runPython){return(
(strings, ...values) => {
  const toPython = (v) =>
    ArrayBuffer.isView(v) && !(v instanceof Uint8Array) ? Array.from(v)
    : Array.isArray(v) ? v.map(toPython)
    : v && Object.getPrototypeOf(v) === Object.prototype
      ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, toPython(x)]))
    : v;
  const fromPython = (v) =>
    v instanceof Map
      ? [...v.keys()].every((k) => typeof k === "string")
        ? Object.fromEntries([...v].map(([k, x]) => [k, fromPython(x)]))
        : new Map([...v].map(([k, x]) => [fromPython(k), fromPython(x)]))
    : Array.isArray(v) ? v.map(fromPython)
    : v;
  // Raw strings keep Python's own escapes ("\n" in a Python literal); only \` and \${ are JS's.
  const raw = strings.raw.map((s) => s.replace(/\\(`|\$\{)/g, "$1"));
  const inputs = {};
  const externalLookup = {};
  let code = raw[0];
  values.forEach((v, i) => {
    const name = `__js${i}`;
    if (typeof v === "function") externalLookup[name] = v;
    else inputs[name] = toPython(v);
    code += name + raw[i + 1];
  });
  const lines = code.replace(/^\s*\n/, "").trimEnd().split("\n");
  const indent = Math.min(...lines.filter((l) => l.trim()).map((l) => l.match(/^[ \t]*/)[0].length));
  code = lines.map((l) => l.slice(indent)).join("\n");
  return runPython(code, { inputs, externalLookup }).then((r) => {
    for (const { stream, text } of r.output)
      window.console[stream === "stderr" ? "warn" : "log"](text.replace(/\n$/, ""));
    if (!r.ok) throw r.error;
    return fromPython(r.value);
  });
}
)};
const _runPython = function _runPython(pool,monty){return(
async (code, { inputs, externalLookup, session } = {}) => {
  const s = session ?? (await pool.checkout());
  const out = new monty.CollectStreams();
  const t0 = window.performance.now();
  try {
    const value = await s.feedRun(code, { inputs, externalLookup, printCallback: out });
    return { ok: true, value, output: out.output, ms: window.performance.now() - t0 };
  } catch (error) {
    return { ok: false, error, output: out.output, ms: window.performance.now() - t0 };
  } finally {
    if (!session) await s.close();
  }
}
)};
const _pool = async function _pool(monty,monty_wasm,monty_worker_url,invalidation)
{
  // monty's browserWorkerFactory hardcodes {type: "module"}, which fails for a blob: URL on
  // a file:// page, so spawn the (IIFE-bundled) worker as a classic script instead.
  const factory = () => {
    const worker = new window.Worker(monty_worker_url);
    worker.postMessage({ init: true, modules: monty_wasm });
    return Promise.resolve(new monty.WorkerChannel({
      post: (message) => worker.postMessage(message),
      onMessage: (handler) => worker.addEventListener("message", (event) => handler(event.data)),
      onError: (handler) => worker.addEventListener("error", (event) => handler(event)),
      terminate: () => worker.terminate()
    }));
  };
  const pool = await monty.WorkerPool.create(factory, { maxWorkers: 4 });
  invalidation.then(() => pool.close());
  return pool;
};
const _monty = async function _monty(unzip,FileAttachment)
{
  const blob = await unzip(FileAttachment("monty-lib-0.0.23.js.gz"));
  const url = URL.createObjectURL(new window.Blob([blob], { type: "text/javascript" }));
  try {
    return await import(url);
  } finally {
    URL.revokeObjectURL(url);
  }
};
const _monty_worker_url = async function _monty_worker_url(unzip,FileAttachment,invalidation)
{
  const blob = await unzip(FileAttachment("monty-worker-0.0.23.js.gz"));
  const url = URL.createObjectURL(new window.Blob([blob], { type: "text/javascript" }));
  invalidation.then(() => URL.revokeObjectURL(url));
  return url;
};
const _monty_wasm = async function _monty_wasm(unzip,FileAttachment)
{
  const compile = async (attachment) =>
    window.WebAssembly.compile(await (await unzip(attachment)).arrayBuffer());
  const [core, core2, core3, core4] = await Promise.all([
    compile(FileAttachment("monty.component.core.wasm.gz")),
    compile(FileAttachment("monty.component.core2.wasm.gz")),
    compile(FileAttachment("monty.component.core3.wasm.gz")),
    compile(FileAttachment("monty.component.core4.wasm.gz"))
  ]);
  return {
    "monty.component.core.wasm": core,
    "monty.component.core2.wasm": core2,
    "monty.component.core3.wasm": core3,
    "monty.component.core4.wasm": core4
  };
};
const _unzip = function _unzip(){return(
async (attachment) =>
  await new window.Response(
    (await attachment.stream()).pipeThrough(new window.DecompressionStream("gzip"))
  ).blob()
)};
const _tests = function _tests(md){return(
md`## Tests`
)};
const _test_expression_value = async function _test_expression_value(runPython)
{
  const r = await runPython("x = 21\nx * 2");
  if (!r.ok || r.value !== 42) throw new Error(`expected 42, got ${r.value ?? r.error}`);
  return r.value;
};
const _test_print_is_collected = async function _test_print_is_collected(runPython)
{
  const r = await runPython('print("hi")');
  const text = r.output.map(({ text }) => text).join("");
  if (text !== "hi\n") throw new Error(`expected "hi\\n", got ${JSON.stringify(text)}`);
  return text;
};
const _test_host_function = async function _test_host_function(runPython)
{
  const r = await runPython("add(2, 3) + y", {
    inputs: { y: 10 },
    externalLookup: { add: (a, b) => a + b }
  });
  if (r.value !== 15) throw new Error(`expected 15, got ${r.value ?? r.error}`);
  return r.value;
};
const _test_python_exception = async function _test_python_exception(runPython)
{
  const r = await runPython("1 / 0");
  if (r.ok || !/ZeroDivisionError/.test(r.error.message)) throw new Error(`expected ZeroDivisionError, got ${r.value ?? r.error}`);
  return r.error.message;
};
const _test_no_filesystem = async function _test_no_filesystem(runPython)
{
  const r = await runPython('import os\nos.listdir("/")');
  if (r.ok || !/PermissionError/.test(r.error.message)) throw new Error(`expected PermissionError, got ${r.value ?? r.error}`);
  return r.error.message;
};
const _test_session_keeps_state = async function _test_session_keeps_state(pool,runPython)
{
  const session = await pool.checkout();
  try {
    await runPython("counter = 1", { session });
    const r = await runPython("counter + 1", { session });
    if (r.value !== 2) throw new Error(`expected 2, got ${r.value ?? r.error}`);
    return r.value;
  } finally {
    await session.close();
  }
};
const _test_py_interpolation = async function _test_py_interpolation(py)
{
  const v = await py`${2} + ${3} * ${"x"}.count("x")`;
  if (v !== 5) throw new Error(`expected 5, got ${v}`);
  return v;
};
const _test_py_host_function = async function _test_py_host_function(py)
{
  const v = await py`${(a, b) => a * b}(6, 7)`;
  if (v !== 42) throw new Error(`expected 42, got ${v}`);
  return v;
};
const _test_py_dict_to_object = async function _test_py_dict_to_object(py)
{
  const v = await py`{"a": ${[1, 2]}, "b": ${{ c: 3 }}["c"]}`;
  if (JSON.stringify(v) !== '{"a":[1,2],"b":3}') throw new Error(`got ${JSON.stringify(v)}`);
  return v;
};
const _test_py_string_is_data = async function _test_py_string_is_data(py)
{
  const evil = '"); import os; ("';
  const v = await py`len(${evil})`;
  if (v !== evil.length) throw new Error(`expected ${evil.length}, got ${v}`);
  return v;
};
const _test_py_dedent_and_escapes = async function _test_py_dedent_and_escapes(py)
{
  const v = await py`
    s = "a\nb"
    len(s.split("\n"))
  `;
  if (v !== 2) throw new Error(`expected 2, got ${v}`);
  return v;
};
const _test_py_error_rejects = async function _test_py_error_rejects(py)
{
  try {
    await py`1 / 0`;
  } catch (e) {
    if (/ZeroDivisionError/.test(e.message)) return e.message;
    throw e;
  }
  throw new Error("expected ZeroDivisionError");
};
const _test_py_sessions_isolated = async function _test_py_sessions_isolated(py)
{
  await py`leak = 1`;
  try {
    await py`leak`;
  } catch (e) {
    if (/NameError/.test(e.message)) return e.message;
    throw e;
  }
  throw new Error("variable leaked between py calls");
};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };
  const fileAttachments = new Map(["monty-lib-0.0.23.js.gz","monty-worker-0.0.23.js.gz","monty.component.core.wasm.gz","monty.component.core2.wasm.gz","monty.component.core3.wasm.gz","monty.component.core4.wasm.gz"].map((name) => {
    const module_name = "@tomlarkworthy/monty";
    const {status, mime, bytes} = window.lopecode.contentSync(module_name + "/" + encodeURIComponent(name));
    const blob_url = URL.createObjectURL(new Blob([bytes], { type: mime}));
    return [name, {url: blob_url, mimeType: mime}]
  }));
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));

  $def("_intro", null, ["md"], _intro);
  $def("_fib", "fib", ["py","n"], _fib);
  $def("_n", "viewof n", ["Inputs"], _n);
  $def("_n_value", "n", ["Generators","viewof n"], _n_value);
  $def("_fib_plot", "fib_plot", ["Plot","fib"], _fib_plot);
  $def("_interp_md", null, ["md"], _interp_md);
  $def("_text", "viewof text", ["Inputs"], _text);
  $def("_text_value", "text", ["Generators","viewof text"], _text_value);
  $def("_word_counts", "word_counts", ["py","text"], _word_counts);
  $def("_word_table", "word_table", ["Inputs","word_counts"], _word_table);
  $def("_call_md", null, ["md"], _call_md);
  $def("_hypot", "hypot", ["py"], _hypot);
  $def("_scratch_md", null, ["md"], _scratch_md);
  $def("_source", "viewof source", ["Inputs"], _source);
  $def("_source_value", "source", ["Generators","viewof source"], _source_value);
  $def("_result", "result", ["runPython","source"], _result);
  $def("_output", "output", ["htl","result","Inspector"], _output);
  $def("_usage", null, ["md"], _usage);
  $def("_py", "py", ["runPython"], _py);
  $def("_runPython", "runPython", ["pool","monty"], _runPython);
  $def("_pool", "pool", ["monty","monty_wasm","monty_worker_url","invalidation"], _pool);
  $def("_monty", "monty", ["unzip","FileAttachment"], _monty);
  $def("_monty_worker_url", "monty_worker_url", ["unzip","FileAttachment","invalidation"], _monty_worker_url);
  $def("_monty_wasm", "monty_wasm", ["unzip","FileAttachment"], _monty_wasm);
  $def("_unzip", "unzip", [], _unzip);
  $def("_tests", null, ["md"], _tests);
  $def("_test_expression_value", "test_expression_value", ["runPython"], _test_expression_value);
  $def("_test_print_is_collected", "test_print_is_collected", ["runPython"], _test_print_is_collected);
  $def("_test_host_function", "test_host_function", ["runPython"], _test_host_function);
  $def("_test_python_exception", "test_python_exception", ["runPython"], _test_python_exception);
  $def("_test_no_filesystem", "test_no_filesystem", ["runPython"], _test_no_filesystem);
  $def("_test_session_keeps_state", "test_session_keeps_state", ["pool","runPython"], _test_session_keeps_state);
  $def("_test_py_interpolation", "test_py_interpolation", ["py"], _test_py_interpolation);
  $def("_test_py_host_function", "test_py_host_function", ["py"], _test_py_host_function);
  $def("_test_py_dict_to_object", "test_py_dict_to_object", ["py"], _test_py_dict_to_object);
  $def("_test_py_string_is_data", "test_py_string_is_data", ["py"], _test_py_string_is_data);
  $def("_test_py_dedent_and_escapes", "test_py_dedent_and_escapes", ["py"], _test_py_dedent_and_escapes);
  $def("_test_py_error_rejects", "test_py_error_rejects", ["py"], _test_py_error_rejects);
  $def("_test_py_sessions_isolated", "test_py_sessions_isolated", ["py"], _test_py_sessions_isolated);
  main.define("module @tomlarkworthy/inspector", async () => runtime.module((await import("/@tomlarkworthy/inspector.js?v=4")).default));
  main.define("Inspector", ["module @tomlarkworthy/inspector", "@variable"], (_, v) => v.import("Inspector", _));
  return main;
}
