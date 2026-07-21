const _1ykfe01 = function _1(md){return(
md`# The μ-kernel architecture for extensible live and mallable programming substrates`
)};
const _4ntg8o = function _2(md){return(
md`Big ideas

- Client-side, no network dependancy, browser based
- No external managed source code, the runtime is the source of truth
- Reflective Reactive Dynamic Dataflow kernel
- The rest of programming system in userspace in live collaborating modules.`
)};
const _as09cw = function _3(md){return(
md`
Delivering "easy to use" and "easy-to-change" software for all cannot be achieved in a single step. While research has highlighted the value of reactive and malleable software systems for usability; delivering complete programming system exceeds the capacity of most research projects that can only practically explore one angle at a time. Instead, we suggest reducing live programming to a small reactive substrate on which decoupled live programming systems can be layered upon in userspace. Such a μ-kernel would need to supply minimal functionality to enable:  1. live code updates, 2. reactive communication and 3. capability discovery between malleable modules that are implemented in userspace.

We identify the Observable Runtime as an MIT licenced, battle tested and independently developed off-the-self kernel that meets the needs for malleable programming. Although the Observbale Notebook Interface, the hosted product, is not mallable and therefore not a suitable base for live research, we show, through a prototype named Lopecode, that it is possible to make an replacement UX to the Observable Runtime, written entirely in userspace, that significantly exceeds the expressivity of the hosted Observable Notebook product.

Lopecode is a collection of reactive userspace modules that are capable of: 1. serialising the live system to a single HTML file. 2. live editing the systems own code reactively. 3. Providing a mutable datastore 4. Supporting an autonomous LLM coding agent. The Observable Runtime μ-kernel provides runtime reflection, a late-binding dataflow graph, and module loading. With those foundations, we show that a live programming system can be modularised in userspace and developed incrementally from within.
`
)};
const _1qtyx8u = function _4(md){return(
md`## Desirable Properties for an extensible Live Programming System 

Here is a somewhat arbitrary list of desirable properties we think a live programming system should have.
- Reactive live code updates
- Literate programming
- Data viz.
- Polyglot languages
- Multiple views of the same things
- No network dependancy
- No external toolchain
- Easy to distribute and run

The goal of the μ-kernel architecture is *not* to implement those properties! Rather, its to provide a foundation that can make working toward that list fun and incremental. We identify several foundational building blocks that the μ-kernel should supply

- Reactive low level code updates, so you can develop a future system from within the current system
- Reactive values, so all systems reflect the current program state instantly.
- meta-programming, so development services can abstract over the systems generically.
- module loading, for bootstrapping and decoupling of services

Although the list of requirements for a μ-kernel is short, all of those properties are notoriously difficult to develop individually. Fortunately the Observable Runtime is open source commercially developed library that supplies those features. We will explain how that works in detail shortly, and then afterwards show how we can realize the desirable other properties in userspace with Lopecode `
)};
const _1iojbmj = function _5(md){return(
md`## The Observable Runtime Data Model

An executing Observable runtime is fairly simple. The root reference is a Runtime object. There are fixed functions called builtins which can be defined on runtime construction (for example d3) and additionally during module loading (for example module scoped \`FileAttachments\`) for module scoped builtins.

Reactivity is provided through variables which are named and can reference others variables as dependancies. Variables values are computed by calling their \`_definition\` function when their inputs change. The definition is a function or generator whose arguments are passed from the variables inputs.
\`\`\`
Runtime
 ├─ Builtins* (functions)
 └─ Module*   (namespace)
      ├─ Builtins*  (functions)
      └─ Variable*  (node)
           ├─ _name?       (string)
           ├─ _inputs     → downward edges
           └─ _definition  (function/generator)
\`\`\`

Groups of variables are contained within a module. When variables are created, input dependancies are specified by name. This means anonymous variables -- those without a name -- cannot be inputs of other variables. 

Variable inter-dependancies are late-bound together, so variables participating in dataflow can be instantiated in any order`
)};
const _tkbcff = function _6(md){return(
md`### Variable Definitions

Variable updates are scheduled when inputs become available. The runtime abstracts over the difference between async and syncronous execution via its scheduler. A variable can emit multiple values per update when defined as a generator.

When definitions are called, the \`this\` value bound to the prior state, allowing cells to reduce over executions i.e. chain state forward.`
)};
const _19pmieo = function _count_button(Inputs){return(
Inputs.button("count")
)};
const _17d3zn0 = (G, _) => G.input(_);
const _1l298qd = function _8(count_button)
{
  count_button;
  return this + 1 || 0; // Add 1 to prior state (this)
};
const _py4ukh = function _9(md){return(
md`Observable does not enforce any kind of dataflow programming purity. Inputs are passed by reference, so definitions can mutate objects outside of the dataflow paradigm. Furthermore, definitions can reference globals like the window, change the DOM and perform arbitrary side effects outside the dataflow graph.

While functional reactive purist may find this unattractive, being ordinary Javascript functions reduces integration friction when importing existing Javascript libraries.`
)};
const _1ro0yuo = function _10(md){return(
md`### Glitch free Observable Reactivity Semantics`
)};
const _1tdam3p = function _11(md){return(
md`Observable builds a dataflow dependancy graph between variables. When a variable is marked dirty, it is scheduled for recomputation next tick, as long as its inputs are not dirty. This batched computation avoids common pitfuls with reactivty such as glitching.`
)};
const _e7tpha = function _12(mermaid){return(
mermaid`graph TD
A-->D
A-->C
B-->D["D 🕣"]
C-->E
D-->E
`
)};
const _as21ss = function _13(md){return(
md`In syncronous reactive systems without batching, an update to \`A\` will chain to C and D and then trigger E twice -- a so called "glitch" which can have unwanted side effects. In Observable, an update to \`A\` automatically marks A, C, D and E as dirty. C recomputes quickly and updates, followed by D and E after the asynchronous process in D completes. Thus E remains in the dirty state until D has completed and updates only once.

If B and A update temporally close together, D still emits a value once, but internally the async computation is ran twice with overlap. E then only updates once.`
)};
const _lzmv5y = function _14(Inputs,$0,Event){return(
Inputs.button("a", {
  reduce: () => $0.dispatchEvent(new Event("input"))
})
)};
const _xldl40 = function _15(Inputs,$0,Event){return(
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
const _kuvhf = function _e(c,d)
{
  c, d;
  return this + 1 || 0;
};
const _17llcz1 = function _21(md){return(
md`#### Responsiveness

Observable prioritises user-responsiveness. Dataflow decendants of high frequency streams will miss updates when they exceed the animation frame rate (typically 60fps). Its best to view the Observable dataflow graph as monotonically converging to the latest state rather than a stream processing engine.`
)};
const _1s76jxq = function _22(Inputs,$0,Event){return(
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
const _8ul2jt = function _25(md){return(
md`### Reachability and Visibility

The runtime reduces its computation load by only computing variables that are reachable and visible. Reachable variables are those that are either in the foreground, or that are dataflow ascendants of foreground variables. A common situation when variables are not reachable is when they are anonymous cells in a dependancy. There is no point computing them because their effects cannot be seen.

The runtime sheds further load by also only rendering foreground variables that are visible on the page (or ascendants of visible variables). This optimisation allows computational resources to scale sub-linearly with graph size, but can be a source of confusion when interacting with the runtime graph programatically. `
)};
const _1bhsjmi = function _26(md){return(
md`## The Observable Notebook Programming Model
TODO
`
)};
const _1pqt7if = function _27(md){return(
md`### Cells

When interactive with an Observable notebook the user does not observer the variables directly. Rather, access to runtime is mediated through cells, which are programming interface abstractions. There are several cell types and each maps to one or more runtime variables `
)};
const _1jv0qqh = function _28(md){return(
md`### Compilation from OJS to variables definitions

A compiler translates from Observable Javascript (OJS) to the Observable Runtime Representation. Unfortunately that toolchain is not open source but the [Observable/parser](https://github.com/observablehq/parser) is.
`
)};
const _eeladt = function _29(md){return(
md`### Additional tooling

code search, code editor

### Sandboxing

iframe`
)};
const _r2bvo8 = function _30(md){return(
md`Observable programming model enforces a seperation between userspace code, and system provided code

There is no native ability to generate code, limiting expressivity. 

There is no programatic way to write data.

The limitations exist as a consequence of how the closed source Observable programming model is layered over the open source runtime. The underlying runtime itself is an advanced reactivity engine with many useful features for live programming, however, the programming model hudes access to the runtime and has no native meta-programming ability required to create development tools. `
)};
const _ajhxso = function _31(md){return(
md`# Building a μ-kernel architecture around the Observable Runtime


It is our opinion that the Observable Runtime contains enough expressivity to over-come the limitations surfaced in the Observable Notebook Interface, and that it is beneficial to reuse this library as it has solved a number of hard problems needed to create live and mallable systemes. 

In this section we will outline some of the parts of our prototype live programming system that is ecosystem compatible with Observable, but has additional features enabling meta-programming, self-hosting and self-serialization. Note that the aim of the paper is not to document the current state of the Lopecode system, instead, it is to demonstrate that this was possible without modification to the off-the-shelf μ-kernel. `
)};
const _1xp478d = function _32(md){return(
md`### Visualizer

The thing you see in a web notebook is a graphical projection of an underlying state. In order to see the running program something must render a visual representation of it, the raw values in the program state have no inherent graphical representation. Our userspace visualizer attempts to match the presentation style of Observable, so as to feel familiar, but, because its implemented in userspace, we would could visualize program state however we wish.

To implement visualization we needed to observe variable state changes. In a userspace implementation the visualizer is instanciated within the runtime and needs to observe variables that may have been setup earlier. Observable Runtime has an existing observation mechanism, but it is part of runtime setup before any variables are created. To observe from userspace we monkeypatch the existing variable's observer with out own observer, so we were able to get this to work without disrupting existing observers driving the Observable Notebook visualization.

And so this represents our first addition of a meta-programming facility, a programatic lookup of variables outside of dataflow, and registering a listener for state change events.`
)};
const _1tm9da6 = function _value(Inputs){return(
Inputs.range()
)};
const _1bhft8v = (G, _) => G.input(_);
const _1i0k467 = async function _34($0,htl,observe,lookupVariable,module,invalidation)
{
  $0; // ensure this cell executes after the variable is setup
  const ui = htl.html`<div>`;
  // meta-programming
  observe(
    await lookupVariable("value", module),
    {
      fulfilled: (val) => (ui.innerHTML = `the value is ${val}`)
    },
    { invalidation }
  );
  return ui;
};
const _1ej22zl = function _35(md){return(
md`Furthermore, cell visualization have to be added and removed as the cells change in the runtime. To enable this we monkeypatched the variable Set collection in the runtime to receive instant updates on membership changes`
)};
const _1rfsndu = function _36(md){return(
md`### Reactive Debugger

Developing reactive programs can be tricky. We developed a tool to help us visualize state transitions over the entire notebook in a timeline, which can help trace causality. This is essentially a different projection of the program state enabled by our new meta-programming expressivity and an example of a userspace moldable tool. It is a clear example of viewing the same thing a different way.`
)};
const _epw36z = function _37(_ndd){return(
_ndd
)};
const _193c9k0 = function _38(md){return(
md`### Editor

To reprogram the internal dataflow you need to redefine variables which is a 1st party function in the Observale runtime. However, it expects the low level Javascript runtime representation, not the high OJS representation, and it also requires the input arguments specified. In addition to writing cells, an editor needs to read the current source to present to the user at the start of an edit session.

Obtaining the low level source code is simple in Javascript as you can \`toString\` the \`_definition\`. To obtain the high level representation we decompiled. Then to reversing the process after modification was compilation followed by a 1st party call to the runtime. The runtime will then recompute all cells impacted by the change reactively.
`
)};
const _114y1wu = function _secret()
{
  // Can you get this source code from the runtime?
  return 45;
};
const _ed3go1 = function _secret_variable(lookupVariable,module){return(
lookupVariable("secret", module)
)};
const _pfsvsn = function _low_level(secret_variable){return(
secret_variable._definition.toString()
)};
const _4t9suz = function _ojs_level(decompile,secret_variable){return(
decompile([secret_variable])
)};
const _lyy7jl = function _43(md){return(
md`
Note there is no repository of source code in Lopecode. Source code is decompiled from the runtime on demand when needed. This is an interesting consequence of the principle that the μ-kernel is the source of truth; a secondary code representation would undermine that goal. It provides opportunities for alternative languages, as ObservableJS has no special status in the system and could be changed.

The [decompiler/compiler](https://observablehq.com/@tomlarkworthy/observablejs-toolchain) pair was developed together using an LLM driven by a test suite of examples, and leveraged the open source Observable/Parser, acorn and escodegen.`
)};
const _1xycp3t = function _44(md){return(
md`### Exporter


TODO: Self serialization
`
)};
const _wmae5h = function _45(md){return(
md`### Mutable File attachments`
)};
const _15f31y3 = function _46(md){return(
md`## Userspace Services

- Exporter
- Editor
- Visualizer
- Debugger
- LLM Agent

## Complex Applications

- Sequencer`
)};
const _205bra = function _47(md){return(
md`### References

- HYTRADBOI 2025
- Technical Dimensions of Programming Systems (Joel)
- Live Primer (https://live-workshop.github.io/primer/)
- Horowitz, J., & Heer, J. (2023). Live, Rich, and Composable: Qualities for Programming Beyond Static Text. Plateau Workshop. https://doi.org/10.1184/R1/22277338.V1
- Malleable Software: Restoring User Agency in a World of Locked-Down Apps • 2025
- Glitches in reactive programming (https://en.wikipedia.org/wiki/Reactive_programming#Glitches)
- D³ Data-Driven Documents https://ieeexplore.ieee.org/abstract/document/6064996
- https://tomlarkworthy.github.io/lopecode/notebooks/@tomlarkworthy_lopecode-vision.html#view=S100%28%40tomlarkworthy%2Flopecode-vision%2C%40tomlarkworthy%2Fmodule-selection%29
- The interplay of SARS-CoV-2 evolution and constraints imposed by the structure and functionality of its proteins - https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1009147
- Software Architecture Patterns by Mark Richards 2002

- Mirrors Object orientated (relective capability) https://dl.acm.org/doi/pdf/10.1145/1035292.1029004

- FLOSS move, targetted intervension to make something usable, postmodern

- https://en.wikipedia.org/wiki/Linda_(coordination_language)
- Coordination Language

The Philosophy of Copy and Paste

https://alarmingdevelopment.org/?p=1653


Variolite: Supporting Exploratory Programming by Data Scientists
https://dl.acm.org/doi/10.1145/3025453.3025626
`
)};
const _wbefd4 = function _49(md){return(
md`---

Notes`
)};
const _jbi8a0 = function _50(md){return(
md`### Abstract (draft)

- Reactive kernal with everything in userspace
- Runtime, not source code, as the source-of-truth
- Add meta programming to Observable
- Add writable storage`
)};
const _1lotgqu = function _51(md){return(
md`### Shower Thoughts

Live: Illustration, dry explaination, reusable core behind it.

We will not discuss in detail the prototype

Programming conference.

Clienside removes node

microkernal architecture allows live, reactive updates to the entire system

Multiplicity of programming interfaces, the Observable commercial one, the lopecode one.

In "Live, Rich, and Composable: Qualities for Programming Beyond Static Text" Observable is critiqued for not allowing visualizations to store state, we fix that with storage

Observable programming model. Runtime, modules, cells, variables, file attachments.

Building on a solid base
Observable kernel does not suffer from glitches.
Observable has been testing in production extensively.
Observable prioritizes user responsiveness over serializability(?). Skipping updates if behind => monotonic convergence. Not computing all cells in the graph if not in the forefront. Furthermore not updating cells that are not on the page.
Permissive license, developed in the open.
Written by luminary

Runtime as the source of truth enabling polyglot language support.
In a live system, runtime, not the source code, should be the source of truth. => we need reflectivity

Ecosystem compatability. Javascript/npm, Observable itself.


Plain text serialisation format for git freindly diffing and async. Useful during low level debugging.

Reactive execution helps with debugging

Multplitiy of visual representaitons of program state: debugger


Offline support

Immortal Software

Literate programming - divide and conquer. bundled technical documentation


Malleability by design: Microkernels isolate responsibilities into minimal, composable units. This enables live reloading, introspection, and recomposition of system behavior without global restarts, crucial for live systems.

Reactivity as substrate: Embedding reactive dataflow at the core (not as a library) makes live code change native system feature. 

Modifiability with stability: Users can safely experiment in userland without destabilizing the system

Composability over frameworks

List of tests https://github.com/preactjs/signals/blob/main/packages/core/test/signal.test.tsx#L1654

https://www.usenix.org/system/files/conference/tapp2018/tapp2018-paper-petricek.pdf

https://github.com/tpetricek/denicek-paper/blob/master/paper.pdf`
)};
const _11n8l93 = function _52(md){return(
md`# The μ-kernel reactive substrate architecture

Remove the seperation between user code and system code.

Focus on iteration speed and expressivity:
- Code changes are reflected immediately.
- Programming system should be editable too (mallable) => the programming system is implemented in userspace
- support grouping of similar functionality (modularity) for divide-and-conquor and development scalability
    - all reusable abstractions

Our hypothesis is that live programming in userspace leads to a more mallable programming experience

Seperation of runtime from a front end language provides a `
)};
const _131yd3f = function _module(thisModule){return(
thisModule()
)};
const _th6e4k = (G, _) => G.input(_);

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  main.define("module d/5c408e8ef210709e@472", async () => runtime.module((await import("/d/5c408e8ef210709e@472.js?v=4")).default));  
  main.define("module @tomlarkworthy/runtime-sdk", async () => runtime.module((await import("/@tomlarkworthy/runtime-sdk.js?v=4")).default));  
  main.define("module @tomlarkworthy/debugger", async () => runtime.module((await import("/@tomlarkworthy/debugger.js?v=4")).default));  
  main.define("module @tomlarkworthy/observablejs-toolchain", async () => runtime.module((await import("/@tomlarkworthy/observablejs-toolchain.js?v=4")).default));  
  $def("_1ykfe01", null, ["md"], _1ykfe01);  
  $def("_4ntg8o", null, ["md"], _4ntg8o);  
  $def("_as09cw", null, ["md"], _as09cw);  
  $def("_1qtyx8u", null, ["md"], _1qtyx8u);  
  $def("_1iojbmj", null, ["md"], _1iojbmj);  
  $def("_tkbcff", null, ["md"], _tkbcff);  
  $def("_19pmieo", "viewof count_button", ["Inputs"], _19pmieo);  
  $def("_17d3zn0", "count_button", ["Generators","viewof count_button"], _17d3zn0);  
  $def("_1l298qd", null, ["count_button"], _1l298qd);  
  $def("_py4ukh", null, ["md"], _py4ukh);  
  $def("_1ro0yuo", null, ["md"], _1ro0yuo);  
  $def("_1tdam3p", null, ["md"], _1tdam3p);  
  $def("_e7tpha", null, ["mermaid"], _e7tpha);  
  $def("_as21ss", null, ["md"], _as21ss);  
  $def("_lzmv5y", null, ["Inputs","viewof a","Event"], _lzmv5y);  
  $def("_xldl40", null, ["Inputs","viewof b","Event"], _xldl40);  
  $def("_1clj43h", "viewof a", ["Inputs"], _1clj43h);  
  $def("_rpc4xh", "a", ["Generators","viewof a"], _rpc4xh);  
  $def("_fu58nn", "viewof b", ["Inputs"], _fu58nn);  
  $def("_1c0wxl8", "b", ["Generators","viewof b"], _1c0wxl8);  
  $def("_5b68r", "c", ["a","b"], _5b68r);  
  $def("_jl1z2d", "d", ["a","b"], _jl1z2d);  
  $def("_kuvhf", "e", ["c","d"], _kuvhf);  
  $def("_17llcz1", null, ["md"], _17llcz1);  
  $def("_1s76jxq", null, ["Inputs","viewof burst","Event"], _1s76jxq);  
  $def("_1k97l2n", "viewof burst", ["Inputs"], _1k97l2n);  
  $def("_1tsoq28", "burst", ["Generators","viewof burst"], _1tsoq28);  
  $def("_162ee7p", "burst_decendant", ["burst"], _162ee7p);  
  $def("_8ul2jt", null, ["md"], _8ul2jt);  
  $def("_1bhsjmi", null, ["md"], _1bhsjmi);  
  $def("_1pqt7if", null, ["md"], _1pqt7if);  
  $def("_1jv0qqh", null, ["md"], _1jv0qqh);  
  $def("_eeladt", null, ["md"], _eeladt);  
  $def("_r2bvo8", null, ["md"], _r2bvo8);  
  $def("_ajhxso", null, ["md"], _ajhxso);  
  $def("_1xp478d", null, ["md"], _1xp478d);  
  $def("_1tm9da6", "viewof value", ["Inputs"], _1tm9da6);  
  $def("_1bhft8v", "value", ["Generators","viewof value"], _1bhft8v);  
  $def("_1i0k467", null, ["viewof value","htl","observe","lookupVariable","module","invalidation"], _1i0k467);  
  $def("_1ej22zl", null, ["md"], _1ej22zl);  
  $def("_1rfsndu", null, ["md"], _1rfsndu);  
  $def("_epw36z", null, ["_ndd"], _epw36z);  
  $def("_193c9k0", null, ["md"], _193c9k0);  
  $def("_114y1wu", "secret", [], _114y1wu);  
  $def("_ed3go1", "secret_variable", ["lookupVariable","module"], _ed3go1);  
  $def("_pfsvsn", "low_level", ["secret_variable"], _pfsvsn);  
  $def("_4t9suz", "ojs_level", ["decompile","secret_variable"], _4t9suz);  
  $def("_lyy7jl", null, ["md"], _lyy7jl);  
  $def("_1xycp3t", null, ["md"], _1xycp3t);  
  $def("_wmae5h", null, ["md"], _wmae5h);  
  $def("_15f31y3", null, ["md"], _15f31y3);  
  $def("_205bra", null, ["md"], _205bra);  
  main.define("References", ["module d/5c408e8ef210709e@472", "@variable"], (_, v) => v.import("References", _));  
  $def("_wbefd4", null, ["md"], _wbefd4);  
  $def("_jbi8a0", null, ["md"], _jbi8a0);  
  $def("_1lotgqu", null, ["md"], _1lotgqu);  
  $def("_11n8l93", null, ["md"], _11n8l93);  
  main.define("observe", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("observe", _));  
  main.define("lookupVariable", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("lookupVariable", _));  
  main.define("thisModule", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("thisModule", _));  
  $def("_131yd3f", "viewof module", ["thisModule"], _131yd3f);  
  $def("_th6e4k", "module", ["Generators","viewof module"], _th6e4k);  
  main.define("_ndd", ["module @tomlarkworthy/debugger", "@variable"], (_, v) => v.import("_ndd", _));  
  main.define("decompile", ["module @tomlarkworthy/observablejs-toolchain", "@variable"], (_, v) => v.import("decompile", _));
  return main;
}