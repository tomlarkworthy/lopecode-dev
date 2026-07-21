const _1rg4quw = function _title_cell(md){return(
md`# How the Observable Runtime works
## Living documentation`
)};
const _14jgxm2 = function _2(md){return(
md`A lot of Observable is open source and MIT/ISC licensed. Additional tools have been built by the community

1st party
- [Observable JS parser](https://github.com/observablehq/parser)
- [Lezer Grammar for Observable JS](https://github.com/observablehq/lezer)
- [Observable Runtime](https://github.com/observablehq/runtime)
- [Standard Library](https://observablehq.com/documentation/misc/standard-library)
- [Inspector](https://github.com/observablehq/inspector)

3rd party
- [Access the runtime](https://observablehq.com/@mootari/access-runtime)
- [The Unofficial Observable Compiler](https://github.com/asg017/unofficial-observablehq-compiler/tree/beta)
- [Userspace Observable compiler and decompiler](https://observablehq.com/@tomlarkworthy/observablejs-toolchain)
- [Notebook Distiller](https://observablehq.com/@tmcw/notebook-distiller)
- [Single File Exporter](https://observablehq.com/@tomlarkworthy/exporter)`
)};
const _s7vgjh = function _cell_map_diagram(mermaid){return(
mermaid`
stateDiagram-v2

observablehq.com --> user
user --> cell: <a href="https#colon;//observablehq.com/@tmcw/codemirror-inside-of-observable">codemirror</a>

user --> FileAttachment: upload
cell --> user: <a href="https#colon;//observablehq.com/blog/bringing-the-typescript-language-server-to-observable">LSP</a>

cell --> user: <a href="https#colon;//github.com/observablehq/lezer">highlight</a>
state ___.static.observableusercontent.com {
cell --> variable: <a href="https#colon;//github.com/observablehq/parser">parse</a> + compile
variable --> cell:  <a href="observablejs-toolchain">decompile</a>
cell --> module: <a href="https#colon;//github.com/observablehq/runtime?tab=readme-ov-file#moduleimportname-alias-from">import _ from _</a>
variable --> main_module: <a href="https#colon;//github.com/observablehq/runtime?tab=readme-ov-file#modulevariableobserver">define</a>

FileAttachment --> stdlib: <a href="https#colon;//github.com/observablehq/stdlib/blob/main/src/fileAttachment.js"> part of </a>
module --> runtime: <a href="https#colon;//github.com/observablehq/runtime?tab=readme-ov-file#runtimemoduledefine-observer">defines</a>
state static {

  main_module --> runtime
runtime --> main_module: <a href="https#colon;//observablehq.com/@mootari/access-runtime">access-runtime</a>

  stdlib --> runtime
  runtime --> inspector
}
  inspector --> DOM: <a href="https#colon;//github.com/observablehq/inspector">inspect</a>

}

DOM --> observablehq.com: iframe
`
)};
const _1o4qjx1 = function _4(md){return(
md`## How Observable works

In this section I try to explain the main concepts, surfacing the runtime concepts as live variables you can explore inline.`
)};
const _17fkh2z = function _5(md){return(
md`### the sandbox`
)};
const _eln4pu = function _6(md){return(
md`The main security mechanism on [observablehq.com](https://Observablehq.com) is to run all user javascript inside a sandboxed iframe. Each user has their own subdomain, so local storage of user code is isolated from one another and from the main webpage. `
)};
const _1dsr79s = function _iframe_location(){return(
document.location
)};
const _17xthqw = function _8(md){return(
md`A drawback of the sandbox approach is several Web APIs don't work (sharedArrayBuffer, Bluetooth) and default forms submission will redirect the inner page.`
)};
const _1qeoyig = function _9(md){return(
md`### The runtime`
)};
const _1joc2bn = function _10(md){return(
md`At the core is the [Observable runtime](https://github.com/observablehq/runtime), which hot-reloads and schedules recompilation of the dependancy graph. Its the engine of reactivity, implemented in Javascript, executing javascript snippets in units called \`variables\`.`
)};
const _1pfe48u = function _11(md){return(
md`The runtime runs *inside* the sandbox, so we can use [[mootari]()](https://observablehq.com/@mootari)'s hack to get a reference to the runtime from within an Observable notebook. `
)};
const _117ii6r = function _runtime_reference(toObject,runtime){return(
toObject(runtime)
)};
const _8ilbi9 = function _13(md){return(
md`### Variables`
)};
const _9gpeps = function _14(md){return(
md`The runtime holds a set of variables.`
)};
const _1yghseb = function _runtime_variables(runtime,toObject){return(
[...runtime._variables].map(toObject)
)};
const _ynvezy = function _16(md){return(
md`Variables are scoped to a module. All notebooks come with a "builtin" module which is defined by the stdlib`
)};
const _152u7kb = function _builtin_module_ref(runtime){return(
[...runtime._modules][0][1]
)};
const _bwbuwh = function _builtin_module(toObject,builtin_module_ref){return(
toObject(builtin_module_ref)
)};
const _xm7mzq = function _builtin_variables(toMap,runtime,builtin_module_ref){return(
toMap(
  ...[...runtime._variables].filter((v) => v._module === builtin_module_ref)
)
)};
const _1ijcl9l = function _20(md){return(
md`Two variables clash if they are named the same and belong to the same scope. However, when you import a module, you only expose a few variables to another module, so it is possible to have variables of the same name but in different modules.`
)};
const _1sr8kz6 = function _21(md){return(
md`### Variable Definitions

Variable updates are scheduled when inputs become available. The runtime abstracts over the difference between async and syncronous execution via its scheduler. A variable can emit multiple values per update when defined as a generator.

When definitions are called, the \`this\` value bound to the prior state, allowing cells to reduce over executions i.e. chain state forward.`
)};
const _19pmieo = function _count_button(Inputs){return(
Inputs.button("count")
)};
const _17d3zn0 = (G, _) => G.input(_);
const _mub616 = function _23(count_button)
{
  count_button;
  return this + 1 || 0; // Add 1 to prior state (this)
};
const _1ugtafc = function _24(md){return(
md`Observable does not enforce any kind of dataflow programming purity. Inputs are passed by reference, so definitions can mutate objects outside of the dataflow paradigm. Furthermore, definitions can reference globals like the window, change the DOM and perform arbitrary side effects outside the dataflow graph.

While functional reactive purist may find this unattractive, being ordinary Javascript functions reduces integration friction when importing existing Javascript libraries.`
)};
const _hlhlv0 = function _25(md){return(
md`### Glitch free Observable Reactivity Semantics`
)};
const _kn6cx3 = function _26(md){return(
md`Observable builds a dataflow dependancy graph between variables. When a variable is marked dirty, it is scheduled for recomputation next tick, as long as its inputs are not dirty. This batched computation avoids common pitfuls with reactivty such as glitching.`
)};
const _570l42 = function _27(mermaid){return(
mermaid`graph TD
A-->D
A-->C
B-->D["D 🕣"]
C-->E
D-->E
`
)};
const _pyzs1u = function _28(md){return(
md`In syncronous reactive systems without batching, an update to \`A\` will chain to C and D and then trigger E twice -- a so called "glitch" which can have unwanted side effects. In Observable, an update to \`A\` automatically marks A, C, D and E as dirty. C recomputes quickly and updates, followed by D and E after the asynchronous process in D completes. Thus E remains in the dirty state until D has completed and updates only once.

If B and A update temporally close together, D still emits a value once, but internally the async computation is ran twice with overlap. E then only updates once.`
)};
const _d60yvu = function _29(Inputs,$0,Event){return(
Inputs.button("a", {
  reduce: () => $0.dispatchEvent(new Event("input"))
})
)};
const _6xzf4f = function _30(Inputs,$0,Event){return(
Inputs.button("b", {
  reduce: () => $0.dispatchEvent(new Event("input"))
})
)};
const _1clj43h = function _a(Inputs){return(
Inputs.input(0)
)};
const _rpc4xh = (G, _) => G.input(_);
const _fu58nn = function _b(Inputs){return(
Inputs.input(0)
)};
const _1c0wxl8 = (G, _) => G.input(_);
const _5b68r = function _c(a,b)
{
  a, b;
  return this + 1 || 0;
};
const _jl1z2d = async function _d(a,b)
{
  a, b;
  await new Promise((r) => setTimeout(r, 1000));
  return this + 1 || 0;
};
const _ilawv9 = function _e(c,d)
{
  c, d;
  debugger;
  return this + 1 || 0;
};
const _131yd3f = function _module(thisModule){return(
thisModule()
)};
const _th6e4k = (G, _) => G.input(_);
const _1d4h7na = async function _vars(lookupVariable,module){return(
new Map([
  ["a", await lookupVariable("a", module)],
  ["b", await lookupVariable("b", module)],
  ["c", await lookupVariable("c", module)],
  ["d", await lookupVariable("d", module)],
  ["e", await lookupVariable("e", module)]
])
)};
const _1i1y5jh = function _38(md){return(
md`#### Cycles

You can get fake cycles by using a viewof and "posting upstream" programatically to the DAG`
)};
const _1j8rngd = function _cycles(Inputs,$0,Event){return(
Inputs.button("do a cycle", {
  reduce: () => {
    $0.value = 0;
    $0.dispatchEvent(new Event("input"));
  }
})
)};
const _b11nkz = function _cycle(Inputs){return(
Inputs.input()
)};
const _dfstls = (G, _) => G.input(_);
const _1m0a62m = function _41(cycle){return(
cycle
)};
const _145bkpf = function _increment($0,cycle,Event)
{
  $0.value = cycle + 1;
  $0.dispatchEvent(new Event("input"));
};
const _qrkj7m = function _43(md){return(
md`#### Glitch Free cycles (with caveats)

If you use programmatic trigger, do we still get glitch free operation? i.e. do simultaneous triggers get merged into a single dataflow sweep? What about double triggers?`
)};
const _17q8qec = function _44(Inputs,$0,$1,n,Event){return(
Inputs.button("n-multi trigger DAG", {
  reduce: () => {
    $0.value = 0;
    $1.value = 0;
    for (let i = 0; i < n; i++) {
      debugger;
      $0.dispatchEvent(new Event("input"));
      $1.dispatchEvent(new Event("input"));
    }
  }
})
)};
const _1q7x0c5 = function _n(Inputs){return(
Inputs.range([1, 10], { label: "n", step: 1, value: 1 })
)};
const _1ydeilc = (G, _) => G.input(_);
const _1wh8xxh = function _left(Inputs){return(
Inputs.input()
)};
const _166ue9d = (G, _) => G.input(_);
const _yopagj = function _right(Inputs){return(
Inputs.input()
)};
const _s2000c = (G, _) => G.input(_);
const _1lxp501 = function _left_right(left,right)
{
  left, right;
  return this + 1 || 0;
};
const _15arzk4 = function _49(md){return(
md`The above experiment shows triggers on seperate dataflow parents are merged in the same update batch (glitch free!). However,  repeated triggers lead to multiple batches up to a max of 2, which is super weird and unexpected.`
)};
const _1luew3d = function _50(md){return(
md`#### Responsiveness

Observable prioritises user-responsiveness. Dataflow decendants of high frequency streams will miss updates when they exceed the animation frame rate (typically 60fps). Its best to view the Observable dataflow graph as monotonically converging to the latest state rather than a stream processing engine.`
)};
const _1r473ns = function _51(Inputs,$0,Event){return(
Inputs.button("burst 100", {
  reduce: async () => {
    Array.from({ length: 100 }).reduce(
      (promise) =>
        promise.then(async () => {
          await new Promise((r) => setTimeout(r, 0));
          $0.dispatchEvent(new Event("input"));
        }),
      Promise.resolve()
    );
  }
})
)};
const _1k97l2n = function _burst(Inputs){return(
Inputs.input(0)
)};
const _1tsoq28 = (G, _) => G.input(_);
const _162ee7p = function _burst_decendant(burst)
{
  burst;
  return this + 1 || 0;
};
const _11kn4r5 = function _54(md){return(
md`### Determining the state of a variable

Can you tell if a variable is actively pending, computed a value or never computed?`
)};
const _oiqwwa = function _state_experiment(Runtime){return(
new Runtime().module()
)};
const _1c5h751 = function _observerFactory(states){return(
(name) => ({
  fulfilled: () => (states[name] = "fulfilled"),
  rejected: () => (states[name] = "rejected"),
  pending: () => (states[name] = "pending")
})
)};
const _2xgpub = function _state_experiment_resolved_variable(state_experiment,observerFactory){return(
state_experiment
  .variable(observerFactory("resolved_variable"))
  .define("resolved_variable", [], () => 1)
)};
const _1rf80q8 = function _state_experiment_undefined_variable(state_experiment,observerFactory){return(
state_experiment
  .variable(observerFactory("undefined_variable"))
  .define("undefined_variable", [], () => undefined)
)};
const _fh0xaq = function _state_experiment_hung_variable(state_experiment,observerFactory){return(
state_experiment
  .variable(observerFactory("hung_variable"))
  .define("hung_variable", [], () => new Promise(() => {}))
)};
const _1i7eu21 = function _state_experiment_error_variable(state_experiment,observerFactory){return(
state_experiment
  .variable(observerFactory("error_variable"))
  .define("error_variable", [], () => {
    throw "error";
  })
)};
const _j33xls = function _state_experiment_generator_variable(state_experiment,observerFactory){return(
state_experiment
  .variable(observerFactory("generator_variable"))
  .define("generator_variable", [], function* () {
    let i = 0;
    while (true) yield i++;
  })
)};
const _wthrw6 = function _state_experiment_async_generator_variable(state_experiment,observerFactory){return(
state_experiment
  .variable(observerFactory("async_generator_variable"))
  .define("async_generator_variable", [], async function* () {
    let i = 0;
    while (true) {
      await new Promise((r) => setTimeout(r, 1000));
      yield i++;
    }
  })
)};
const _1txjlf0 = function _states(){return(
{}
)};
const _193fadq = function _experiment_variables(state_experiment_resolved_variable,state_experiment_undefined_variable,state_experiment_hung_variable,state_experiment_error_variable,state_experiment_generator_variable,state_experiment_async_generator_variable){return(
[
  state_experiment_resolved_variable,
  state_experiment_undefined_variable,
  state_experiment_hung_variable,
  state_experiment_error_variable,
  state_experiment_generator_variable,
  state_experiment_async_generator_variable
]
)};
const _1hah6tc = function _65(Inputs,experiment_variables,toObject){return(
Inputs.table(experiment_variables.map(toObject))
)};
const _1iiowmb = async function _66(experiment_variables,getPromiseState){return(
new Map(
  await Promise.all(
    experiment_variables.map(async (v) => [
      v._name,
      await getPromiseState(v._promise)
    ])
  )
)
)};
const _jvftf0 = function _67(md){return(
md`### Cells`
)};
const _1v1d2ci = function _68(md){return(
md`You program cells in notebooks using ObservableJS. They are compiled to the runtime definitions. There are few major types of cell.
- Javascript cells
   - with some special handling for async, generator subtypes
- viewof, mutables
- Tagged template cells (e.g. markdown, html blocks)
- import statements`
)};
const _1etfxdi = function _69(md){return(
md`#### Cell -> variables`
)};
const _16fwqo9 = function _70(md){return(
md`Cells are mapped to one or more runtime variables. A 3rd party tool can group them for a given module. Most cells in this notebook are anonymous cells without names, e.g. markdown blocks.`
)};
const _12bfrnv = async function _main_cells(cellMap,main){return(
(await cellMap()).get(main)
)};
const _14ykb1c = function _72(md){return(
md`Each cell is mapped to several variables, for instance, a mutable cell has three variables, the initial value, the non-reactive value, and the reactive value. Cells recompute when the *inputs* change.`
)};
const _1yeu3bx = function _cell(Inputs,main_cells){return(
Inputs.select(main_cells, {
  label: "select a cell to expand",
  format: (c) => c.name
})
)};
const _177zinw = (G, _) => G.input(_);
const _1epdiz7 = function _74(Inputs,cell){return(
Inputs.table([cell])
)};
const _mprbv1 = function _cell_variables(cell){return(
cell.variables
)};
const _3ly903 = function _cell_variables_table(Inputs,cell_variables,toObject){return(
Inputs.table(cell_variables.map(toObject), {
  columns: ["_name", "_inputs", "_definition"],
  format: {
    _definition: (d) =>
      Inputs.textarea({ value: d.toString(), disabled: true }),
    _inputs: (d) => d.map((i) => i._name)
  },
  width: {
    _definition: "50%"
  }
})
)};
const _qwnb1o = function _77(md){return(
md`The definition of a variable is the code that is executes when it recomputes. The arguments to that function are the dependancies that need to be computed first. A cell specifies its dependencies in the inputs array.`
)};
const _1vi3ms = function _example_mutable(){return(
0
)};
const _1ygpszr = (M, _) => new M(_);
const _2rbhoa = _ => _.generator;
const _ba0l3 = function _79(md){return(
md`Each imported variable exposes creates at least one variable to cross between modules.
\`\`\`js
import {a, b, c as d} from "@..."
\`\`\`

Importing viewofs and mutables are a bit more complex because both the container and the data channels are imported even if you only import one of them. \`with\` syntax is even more complicated as a seperate runtime is spawned.`
)};
const _2u5qd5 = function _80(md){return(
md`#### Parsing`
)};
const _1b1lkg2 = function _81(md){return(
md`The first stage of transforming ObserrvableJS source code to the runtime variable representation is parsing. The [observablehq/parser](https://github.com/observablehq/parser) does this. Its a wrapper around [acorn](https://github.com/acornjs/acorn). 

As the examples below show, where Observable goes beyond typical javascript is often expressed in the custom top level "cell" AST node. The other thing it does is figure out external references, which is what drives the dependancy resolution.`
)};
const _hsytgm = function _viewof_ast(parser){return(
parser.parseCell("viewof foo = 'bar'")
)};
const _veud0e = function _mutable_ast(parser){return(
parser.parseCell("mutable foo = 'bar'")
)};
const _1ilfmxj = function _async_ast(parser){return(
parser.parseCell("foo = { await ''}")
)};
const _5l5q56 = function _generator_ast(parser){return(
parser.parseCell("foo = { yield 'async'}")
)};
const _st38pc = function _fileattachment_ast(parser){return(
parser.parseCell("foo = FileAttachment('filepath')")
)};
const _bdk0cm = function _viewof_ref_ast(parser){return(
parser.parseCell("foo = viewof bar")
)};
const _1p4on66 = function _import_ast(parser){return(
parser.parseCell("import {foo} from 'blah'")
)};
const _1r0mayl = function _89(Inputs,viewof_ast,mutable_ast,async_ast,generator_ast,fileattachment_ast,viewof_ref_ast,import_ast){return(
Inputs.table(
  [
    Object.assign(viewof_ast, { name: "viewof_ast" }),
    Object.assign(mutable_ast, { name: "mutable_ast" }),
    Object.assign(async_ast, { name: "async_ast" }),
    Object.assign(generator_ast, { name: "generator_ast" }),
    Object.assign(fileattachment_ast, { name: "fileattachment_ast" }),
    Object.assign(viewof_ref_ast, { name: "viewof_ref_ast" }),
    Object.assign(import_ast, { name: "import_ast" })
  ],
  {
    columns: [
      "name",
      "id",
      "async",
      "generator",
      "references",
      "fileAttachments"
    ],
    width: {
      async: "10%",
      generator: "10%"
    },
    format: {
      id: (id) => JSON.stringify(id),
      references: (r) => JSON.stringify(r),
      fileAttachments: (r) => [...r.keys()]
    }
  }
)
)};
const _kniu9d = function _90(md){return(
md`### Compiling`
)};
const _whb84y = function _91(md){return(
md`The Observable compiler is not open source. However, there is the community [unofficial-observablehq-compiler](https://github.com/asg017/unofficial-observablehq-compiler/tree/beta) and the [userspace decompiler/compiler](https://observablehq.com/@tomlarkworthy/observablejs-toolchain).`
)};
const _wbtrf5 = function _compiled_variables(compile){return(
compile("mutable example = 12")
)};
const _ai6cvs = function _94(md){return(
md`## Running your own runtime`
)};
const _1byh3xr = function _95(md){return(
md`To execute a notebook outside of [observablehq.com](https://observablehq.com) you need to instantiate a runtime (this is what the [notebook export feature](https://observablehq.com/documentation/embeds/advanced) does). First grab import the runtime from npm:`
)};
const _1rhoeyn = function _embedded_runtime(Runtime){return(
new Runtime()
)};
const _dzpreg = function _98(md){return(
md`Create a main module`
)};
const _a6zo7h = function _embedded_main(embedded_runtime){return(
embedded_runtime.module()
)};
const _2b3uch = function _100(md){return(
md`Create and define variables, we will use the definitions that we compiled earlier`
)};
const _1voioqz = function _embedded_variables(compiled_variables,embedded_main,toFunction){return(
compiled_variables.map((v) =>
  embedded_main
    .variable({})
    .define(v._name, v._inputs, toFunction(v._definition))
)
)};
const _znn2rt = function _toFunction(){return(
(definition) => {
  let _fn;
  eval(`_fn = ${definition}`);
  return _fn;
}
)};
const _1xr6wrn = function _103(md){return(
md`The runtime will just run automatically, but as the variables are asyncronously processed, it can take a little while before we can observe the value directly in \`_value', so we can observe the promise instead.`
)};
const _ppgx94 = async function _104(embedded_variables)
{
  await new Promise((r) => setTimeout(r, 1000));
  return embedded_variables[0]._promise;
};
const _z3jzjb = function _105(md){return(
md`### Value change notification with Observers`
)};
const _pkv67r = function _106(md){return(
md`When a variable is setup, you can set a callback for value changes. Supply functions for handling for \`pending\`, \`fulfilled\` and \`rejected\` ([observers](https://github.com/observablehq/runtime?tab=readme-ov-file#observers) docs). Here we create a variable on a timer and send it result to a Generator function.`
)};
const _1xowjr2 = function _107(Generators,embedded_main){return(
Generators.observe((notify) => {
  // Generator.observe is a notebook userspace concept to make emitting values simpler
  embedded_main
    .variable({
      fulfilled: (value) => {
        // Observer.fulfilled
        notify(value); // pipe the variable notification up to userspace
      }
    })
    .define(async function* () {
      // zero input async generator
      // this is pure JS, normally the output a compile step
      // is used here
      let i = 0;
      while (true) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        yield i++;
      }
    });
})
)};
const _r93cac = function _108(md){return(
md`### Rendering values with Inspector`
)};
const _m40e6v = function _109(md){return(
md`To display cell values reactively on a _webpage_, the values need to be converted to DOM and kept up to date reactively. Observable provides the \`Inspector\` for this purpose, which implements the Observer interface `
)};
const _x49zsj = function _cell_out(md){return(
md`<div></div> <!-- DOM container we will pipe changes to -->`
)};
const _14b1etr = function _inspector(Inspector,cell_out){return(
new Inspector(cell_out)
)};
const _4fzls9 = function _113(Generators,embedded_main,inspector){return(
Generators.observe((notify) => {
  // Generator.observe is a notebook userspace concept to make emitting values simpler
  embedded_main.variable(inspector).define(async function* () {
    // zero input async generator
    // this is pure JS, normally the output a compile step
    // is used here
    let i = 0;
    while (true) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      yield i++;
    }
  });
})
)};
const _dtm56a = function _114(md){return(
md`The Observer used in notebooks is not the same as the distributed Inspector, there is interesting metadata in the notebook's version. You can get a reference to it via the variable \`_observer\` reference. You can discover the type of cell by looking at the mode.`
)};
const _ecyl7s = function _notebook_observer(main){return(
main._scope.get("title_cell")._observer
)};
const _1a8rkem = function _116(notebook_observer){return(
notebook_observer.mode
)};
const _9epi16 = function _117(md){return(
md`Furthermore, you can relate the variable to the rendered DOM node in the notebook`
)};
const _6x1na1 = function _118(main){return(
main._scope.get("title_cell")._observer._node.innerHTML
)};
const _kdidn6 = function _119(md){return(
md`## Views

\`viewof\` macro expands to two variables. The 1st is a EventSource (typically a HTML element), this is the UI control, and the events it emits are the "data". The 2nd variable source is a \`Generators.input(<viewof value>)\` which registers to the event source and pipes the data as the value to the reactive variable.

You don't really *need* views. You can create the equivalent manually:-`
)};
const _1yjgvwt = function _control(html){return(
html`<select><option>1</option><option>2</option>`
)};
const _q61dfv = function _data(Generators,control){return(
Generators.input(control)
)};
const _10q3rj2 = function _122(md){return(
md`A viewof is a shorthand for that 👆

The Generators functionality is part of the stdlib:- https://github.com/observablehq/stdlib/tree/main/src/generators`
)};
const _1syiuna = function _123(md){return(
md`## File Attachments

FileAttachments are stored in a Map. The key is the name, the value is either 
1. a string of a URL
2. an object \`{mimeType, url}\`

A FileAttachment builtin is registered with a module with \`runtime.fileAttachments\`, this wraps the Map.`
)};
const _1kayzom = function _124(md){return(
md`## URLs

Observablehq.com extensively uses native web features like links.


| type | url |
|---|---|
| module (I) | \`<BASE_URL>/@tomlarkworthy/exporter\` | 
| module (II) | \`<BASE_URL>/d/936eb1bc1db1ac62\` | 
| cell (I) | \`<BASE_URL>/@tomlarkworthy/exporter#parser\`| 
| cell (II) | \`<BASE_URL>/d/936eb1bc1db1ac62#foo\`

Its worth keeping in mind several links might resolve to the same notebook. If the URL is changed the old name continues to resolve, and every notebook has an id which means the id based URL form always works as well.
`
)};
const _1mkb7aa = function _125(md){return(
md`---`
)};
const _1mdc01x = function _126(exporter){return(
exporter()
)};
const _g1z7uq = function _toMap(){return(
(...objects) =>
  Object.fromEntries(
    [...objects].map((v) => [
      v._name,
      Object.fromEntries(Object.getOwnPropertyNames(v).map((k) => [k, v[k]]))
    ])
  )
)};
const _1vvvn2v = function _toObject(){return(
(v) =>
  Object.fromEntries(Object.getOwnPropertyNames(v).map((k) => [k, v[k]]))
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  main.define("module @tomlarkworthy/observablejs-toolchain", async () => runtime.module((await import("/@tomlarkworthy/observablejs-toolchain.js?v=4")).default));  
  main.define("module @tomlarkworthy/observable-runtime-v6", async () => runtime.module((await import("/@tomlarkworthy/observable-runtime-v6.js?v=4")).default));  
  main.define("module @tomlarkworthy/inspector", async () => runtime.module((await import("/@tomlarkworthy/inspector.js?v=4")).default));  
  main.define("module @tomlarkworthy/exporter-3", async () => runtime.module((await import("/@tomlarkworthy/exporter-3.js?v=4")).default));  
  main.define("module @tomlarkworthy/runtime-sdk", async () => runtime.module((await import("/@tomlarkworthy/runtime-sdk.js?v=4")).default));  
  main.define("module @tomlarkworthy/cell-map", async () => runtime.module((await import("/@tomlarkworthy/cell-map.js?v=4")).default));  
  $def("_1rg4quw", "title_cell", ["md"], _1rg4quw);  
  $def("_14jgxm2", null, ["md"], _14jgxm2);  
  $def("_s7vgjh", "cell_map_diagram", ["mermaid"], _s7vgjh);  
  $def("_1o4qjx1", null, ["md"], _1o4qjx1);  
  $def("_17fkh2z", null, ["md"], _17fkh2z);  
  $def("_eln4pu", null, ["md"], _eln4pu);  
  $def("_1dsr79s", "iframe_location", [], _1dsr79s);  
  $def("_17xthqw", null, ["md"], _17xthqw);  
  $def("_1qeoyig", null, ["md"], _1qeoyig);  
  $def("_1joc2bn", null, ["md"], _1joc2bn);  
  $def("_1pfe48u", null, ["md"], _1pfe48u);  
  $def("_117ii6r", "runtime_reference", ["toObject","runtime"], _117ii6r);  
  $def("_8ilbi9", null, ["md"], _8ilbi9);  
  $def("_9gpeps", null, ["md"], _9gpeps);  
  $def("_1yghseb", "runtime_variables", ["runtime","toObject"], _1yghseb);  
  $def("_ynvezy", null, ["md"], _ynvezy);  
  $def("_152u7kb", "builtin_module_ref", ["runtime"], _152u7kb);  
  $def("_bwbuwh", "builtin_module", ["toObject","builtin_module_ref"], _bwbuwh);  
  $def("_xm7mzq", "builtin_variables", ["toMap","runtime","builtin_module_ref"], _xm7mzq);  
  $def("_1ijcl9l", null, ["md"], _1ijcl9l);  
  $def("_1sr8kz6", null, ["md"], _1sr8kz6);  
  $def("_19pmieo", "viewof count_button", ["Inputs"], _19pmieo);  
  $def("_17d3zn0", "count_button", ["Generators","viewof count_button"], _17d3zn0);  
  $def("_mub616", null, ["count_button"], _mub616);  
  $def("_1ugtafc", null, ["md"], _1ugtafc);  
  $def("_hlhlv0", null, ["md"], _hlhlv0);  
  $def("_kn6cx3", null, ["md"], _kn6cx3);  
  $def("_570l42", null, ["mermaid"], _570l42);  
  $def("_pyzs1u", null, ["md"], _pyzs1u);  
  $def("_d60yvu", null, ["Inputs","viewof a","Event"], _d60yvu);  
  $def("_6xzf4f", null, ["Inputs","viewof b","Event"], _6xzf4f);  
  $def("_1clj43h", "viewof a", ["Inputs"], _1clj43h);  
  $def("_rpc4xh", "a", ["Generators","viewof a"], _rpc4xh);  
  $def("_fu58nn", "viewof b", ["Inputs"], _fu58nn);  
  $def("_1c0wxl8", "b", ["Generators","viewof b"], _1c0wxl8);  
  $def("_5b68r", "c", ["a","b"], _5b68r);  
  $def("_jl1z2d", "d", ["a","b"], _jl1z2d);  
  $def("_ilawv9", "e", ["c","d"], _ilawv9);  
  $def("_131yd3f", "viewof module", ["thisModule"], _131yd3f);  
  $def("_th6e4k", "module", ["Generators","viewof module"], _th6e4k);  
  $def("_1d4h7na", "vars", ["lookupVariable","module"], _1d4h7na);  
  $def("_1i1y5jh", null, ["md"], _1i1y5jh);  
  $def("_1j8rngd", "cycles", ["Inputs","viewof cycle","Event"], _1j8rngd);  
  $def("_b11nkz", "viewof cycle", ["Inputs"], _b11nkz);  
  $def("_dfstls", "cycle", ["Generators","viewof cycle"], _dfstls);  
  $def("_1m0a62m", null, ["cycle"], _1m0a62m);  
  $def("_145bkpf", "increment", ["viewof cycle","cycle","Event"], _145bkpf);  
  $def("_qrkj7m", null, ["md"], _qrkj7m);  
  $def("_17q8qec", null, ["Inputs","viewof left","viewof right","n","Event"], _17q8qec);  
  $def("_1q7x0c5", "viewof n", ["Inputs"], _1q7x0c5);  
  $def("_1ydeilc", "n", ["Generators","viewof n"], _1ydeilc);  
  $def("_1wh8xxh", "viewof left", ["Inputs"], _1wh8xxh);  
  $def("_166ue9d", "left", ["Generators","viewof left"], _166ue9d);  
  $def("_yopagj", "viewof right", ["Inputs"], _yopagj);  
  $def("_s2000c", "right", ["Generators","viewof right"], _s2000c);  
  $def("_1lxp501", "left_right", ["left","right"], _1lxp501);  
  $def("_15arzk4", null, ["md"], _15arzk4);  
  $def("_1luew3d", null, ["md"], _1luew3d);  
  $def("_1r473ns", null, ["Inputs","viewof burst","Event"], _1r473ns);  
  $def("_1k97l2n", "viewof burst", ["Inputs"], _1k97l2n);  
  $def("_1tsoq28", "burst", ["Generators","viewof burst"], _1tsoq28);  
  $def("_162ee7p", "burst_decendant", ["burst"], _162ee7p);  
  $def("_11kn4r5", null, ["md"], _11kn4r5);  
  $def("_oiqwwa", "state_experiment", ["Runtime"], _oiqwwa);  
  $def("_1c5h751", "observerFactory", ["states"], _1c5h751);  
  $def("_2xgpub", "state_experiment_resolved_variable", ["state_experiment","observerFactory"], _2xgpub);  
  $def("_1rf80q8", "state_experiment_undefined_variable", ["state_experiment","observerFactory"], _1rf80q8);  
  $def("_fh0xaq", "state_experiment_hung_variable", ["state_experiment","observerFactory"], _fh0xaq);  
  $def("_1i7eu21", "state_experiment_error_variable", ["state_experiment","observerFactory"], _1i7eu21);  
  $def("_j33xls", "state_experiment_generator_variable", ["state_experiment","observerFactory"], _j33xls);  
  $def("_wthrw6", "state_experiment_async_generator_variable", ["state_experiment","observerFactory"], _wthrw6);  
  $def("_1txjlf0", "states", [], _1txjlf0);  
  $def("_193fadq", "experiment_variables", ["state_experiment_resolved_variable","state_experiment_undefined_variable","state_experiment_hung_variable","state_experiment_error_variable","state_experiment_generator_variable","state_experiment_async_generator_variable"], _193fadq);  
  $def("_1hah6tc", null, ["Inputs","experiment_variables","toObject"], _1hah6tc);  
  $def("_1iiowmb", null, ["experiment_variables","getPromiseState"], _1iiowmb);  
  $def("_jvftf0", null, ["md"], _jvftf0);  
  $def("_1v1d2ci", null, ["md"], _1v1d2ci);  
  $def("_1etfxdi", null, ["md"], _1etfxdi);  
  $def("_16fwqo9", null, ["md"], _16fwqo9);  
  $def("_12bfrnv", "main_cells", ["cellMap","main"], _12bfrnv);  
  $def("_14ykb1c", null, ["md"], _14ykb1c);  
  $def("_1yeu3bx", "viewof cell", ["Inputs","main_cells"], _1yeu3bx);  
  $def("_177zinw", "cell", ["Generators","viewof cell"], _177zinw);  
  $def("_1epdiz7", null, ["Inputs","cell"], _1epdiz7);  
  $def("_mprbv1", "cell_variables", ["cell"], _mprbv1);  
  $def("_3ly903", "cell_variables_table", ["Inputs","cell_variables","toObject"], _3ly903);  
  $def("_qwnb1o", null, ["md"], _qwnb1o);  
  $def("_1vi3ms", "initial example_mutable", [], _1vi3ms);  
  $def("_1ygpszr", "mutable example_mutable", ["Mutable","initial example_mutable"], _1ygpszr);  
  $def("_2rbhoa", "example_mutable", ["mutable example_mutable"], _2rbhoa);  
  $def("_ba0l3", null, ["md"], _ba0l3);  
  $def("_2u5qd5", null, ["md"], _2u5qd5);  
  $def("_1b1lkg2", null, ["md"], _1b1lkg2);  
  $def("_hsytgm", "viewof_ast", ["parser"], _hsytgm);  
  $def("_veud0e", "mutable_ast", ["parser"], _veud0e);  
  $def("_1ilfmxj", "async_ast", ["parser"], _1ilfmxj);  
  $def("_5l5q56", "generator_ast", ["parser"], _5l5q56);  
  $def("_st38pc", "fileattachment_ast", ["parser"], _st38pc);  
  $def("_bdk0cm", "viewof_ref_ast", ["parser"], _bdk0cm);  
  $def("_1p4on66", "import_ast", ["parser"], _1p4on66);  
  $def("_1r0mayl", null, ["Inputs","viewof_ast","mutable_ast","async_ast","generator_ast","fileattachment_ast","viewof_ref_ast","import_ast"], _1r0mayl);  
  $def("_kniu9d", null, ["md"], _kniu9d);  
  $def("_whb84y", null, ["md"], _whb84y);  
  main.define("compile", ["module @tomlarkworthy/observablejs-toolchain", "@variable"], (_, v) => v.import("compile", _));  
  $def("_wbtrf5", "compiled_variables", ["compile"], _wbtrf5);  
  $def("_ai6cvs", null, ["md"], _ai6cvs);  
  $def("_1byh3xr", null, ["md"], _1byh3xr);  
  main.define("Runtime", ["module @tomlarkworthy/observable-runtime-v6", "@variable"], (_, v) => v.import("Runtime", _));  
  $def("_1rhoeyn", "embedded_runtime", ["Runtime"], _1rhoeyn);  
  $def("_dzpreg", null, ["md"], _dzpreg);  
  $def("_a6zo7h", "embedded_main", ["embedded_runtime"], _a6zo7h);  
  $def("_2b3uch", null, ["md"], _2b3uch);  
  $def("_1voioqz", "embedded_variables", ["compiled_variables","embedded_main","toFunction"], _1voioqz);  
  $def("_znn2rt", "toFunction", [], _znn2rt);  
  $def("_1xr6wrn", null, ["md"], _1xr6wrn);  
  $def("_ppgx94", null, ["embedded_variables"], _ppgx94);  
  $def("_z3jzjb", null, ["md"], _z3jzjb);  
  $def("_pkv67r", null, ["md"], _pkv67r);  
  $def("_1xowjr2", null, ["Generators","embedded_main"], _1xowjr2);  
  $def("_r93cac", null, ["md"], _r93cac);  
  $def("_m40e6v", null, ["md"], _m40e6v);  
  $def("_x49zsj", "cell_out", ["md"], _x49zsj);  
  main.define("Inspector", ["module @tomlarkworthy/inspector", "@variable"], (_, v) => v.import("Inspector", _));  
  $def("_14b1etr", "inspector", ["Inspector","cell_out"], _14b1etr);  
  $def("_4fzls9", null, ["Generators","embedded_main","inspector"], _4fzls9);  
  $def("_dtm56a", null, ["md"], _dtm56a);  
  $def("_ecyl7s", "notebook_observer", ["main"], _ecyl7s);  
  $def("_1a8rkem", null, ["notebook_observer"], _1a8rkem);  
  $def("_9epi16", null, ["md"], _9epi16);  
  $def("_6x1na1", null, ["main"], _6x1na1);  
  $def("_kdidn6", null, ["md"], _kdidn6);  
  $def("_1yjgvwt", "control", ["html"], _1yjgvwt);  
  $def("_q61dfv", "data", ["Generators","control"], _q61dfv);  
  $def("_10q3rj2", null, ["md"], _10q3rj2);  
  $def("_1syiuna", null, ["md"], _1syiuna);  
  $def("_1kayzom", null, ["md"], _1kayzom);  
  $def("_1mkb7aa", null, ["md"], _1mkb7aa);  
  $def("_1mdc01x", null, ["exporter"], _1mdc01x);  
  $def("_g1z7uq", "toMap", [], _g1z7uq);  
  $def("_1vvvn2v", "toObject", [], _1vvvn2v);  
  main.define("exporter", ["module @tomlarkworthy/exporter-3", "@variable"], (_, v) => v.import("exporter", _));  
  main.define("parser", ["module @tomlarkworthy/exporter-3", "@variable"], (_, v) => v.import("parser", _));  
  main.define("thisModule", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("thisModule", _));  
  main.define("lookupVariable", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("lookupVariable", _));  
  main.define("getPromiseState", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("getPromiseState", _));  
  main.define("runtime", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("runtime", _));  
  main.define("main", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("main", _));  
  main.define("cellMap", ["module @tomlarkworthy/cell-map", "@variable"], (_, v) => v.import("cellMap", _));
  return main;
}