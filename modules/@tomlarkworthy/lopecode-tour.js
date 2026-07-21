const _fnpyj0 = function _title(externalLink,md){return(
md`# ${externalLink("The Lopecode Tour", "https://tomlarkworthy.github.io/lopecode/notebooks/@tomlarkworthy_lopecode-tour.html#view=S100(@tomlarkworthy/lopecode-tour)")}`
)};
const _490vvx = function _intro(md){return(
md`Lopecode is a HTML file you can double‑click or throw on the web. It’s readable prose and a live programming environment. It resists bit-rot because it's a local‑first that works without network.

It's both a tool-for-thought, and IDE and a distribution format. The core is a tiny UI-less microkernel, a reactive runtime that self‑serializes with all dependencies bundled. Features are userspace modules you can inspect, edit, and change live.

It’s made for experimentation: extremely extensible, engineered to be fast (no network round trips), durable (plain‑text, git‑friendly), and immediate — change code and see the system update in place.`
)};
const _1bxwxlr = function _3(lite_youtube_css,externalLink,htl){return(
htl.html`<details>
  ${lite_youtube_css}
  <summary>Video tour presented at ${externalLink("Feeling of Computing", "https://feelingof.com/")}</summary>
  <lite-youtube videoid="In_BjcsDlfY" playlabel="Lopecode demo at Feeling of Computing" params="start=972"></lite-youtube>
</details>`
)};
const _1civrgr = function _4(forkAnchor,downloadAnchor,md){return(
md`### Self-Serializable

Lopecode can serialize itself, so you fork into a new browser ${forkAnchor({}, "tab")} or download a hardcopy to a ${downloadAnchor({}, "file")}.`
)};
const _1b5ewhi = function _5(timeNow,md){return(
md`### Programmable Prose

You can include the result of computation in prose. For example, the time *now* is: ${timeNow.toGMTString()}`
)};
const _zfr6uw = function _ui_prose(htl,md){return(
md`You can write in markdown, and reference program data inline with \`\${<expr>}\`. When \`<expr>\` is a DOM element, it is inserted, so you can embed interactive widgets within markdown ${htl.html`<button onclick=${(e) => {e.target.innerHTML = "thanks"; e.stopPropagation()}}>click me!</button>`}`
)};
const _18uj0nr = async function* _timeNow()
{
  let time_now;
  while (true) {
    time_now = new Date();
    yield time_now;
    // We want every second displayed, so sample 2x frequency (Nyquist)
    await new Promise((r) => setTimeout(r, 500));
  }
  return time_now;
};
const _17h8lzd = function _9(externalLink,md){return(
md`### Interactive Dataviz

Lopecode includes ${externalLink("Observable Plot", "https://observablehq.com/plot/")}, a flexible primitive for building interactive data visualizations.`
)};
const _1b5vij4 = function _10($0){return(
$0
)};
const _1mk30jf = function _11(md){return(
md`Interactions on plot can be read and referenced and processed by code. Try moving the points around in the above diagram and note how program data updates.`
)};
const _3u4bg6 = function _12(trajectory_manipulate,max_arc){return(
trajectory_manipulate && max_arc
)};
const _ugj3x6 = function _13(aside,md){return(
md`
See ${aside("manipulate", ["@tomlarkworthy/manipulate"])} for more examples.`
)};
const _1oxvv9l = function _15(md){return(
md`## Overview
Lopecode is like a document that can be opened **without the internet**, but it's a programming environment where the authoring tools are bundled so anyone can change it after that fact.

Lopecode is **reactive**, like a spreadsheet. The code that renders and edits the document is written in userspace and are **live** editable. It is designed for simplicity, legibility, durability and composability. The Lopecode file format is plain text and git friendly and can be opened directly by any of the major desktop or mobile operating systems without extra software. The file *can also* be uploaded to static file hosting for distribution on the internet, where it can be redownloaded and remixed by anyone.

The Tour started by showing you some of the high level features that have been developed, answering why you might find the format useful _today_. The real power though, is that you can modify or add your own features, by yourself or with help from the AI. Lopecode _core_ is a UI-less microkernel architecture that delegates all high level features to userspace. A Lopecode document is really multiple userspace documents cooperating on a reflective, hot-patchable reactive runtime. So the second part of the tour explains the meta-programming architecture and the third part calls our important userspace modules that you can _mold_ live.`
)};
const _13x0ymf = function _16(aside,md){return(
md`## Multi-document

A Lopecode document is really many documents, navigated by weblinks. You can work on several documents at the same time, or hide supporting computation behind a curtain. Reactivity is cross module.

${aside("open the module-explorer", ["@tomlarkworthy/module-selection", "@tomlarkworthy/atlas"])}`
)};
const _1773i7w = function _programming_process(md){return(
md`## Simplifying the Programming Process

Modern development is full of friction: big builds, long test cycles, fragile global state, and separate tools for editing, running, and debugging. Lopecode tackles that by making the runtime the primary surface you edit. Code is organized as small reactive cells; changing a cell recomputes only its dependants, so edits are local, fast, and predictable. Reactive tests and an embedded AI harness give immediate, targeted feedback — only the tests causally affected by a change are rerun, and the AI gets the same fast signals you do. Everything lives in userspace: editors, debuggers, importers — you can swap any part. For power users: no black‑boxed tooling you can’t change, extreme extensibility, and single‑file offline export for archiving experiments. In short: hot‑swap code, keep state, and iterate a lot faster.`
)};
const _1abp0dr = function _18(externalLink,md){return(
md`## Reactive Dataflow

Lopecode is based on reactive dataflow programming (the ${externalLink("Observable Runtime", "https://github.com/observablehq/runtime")}). It's the same model that spreadsheets use. You change something, everything updates. Code is organised into cells; cells update when their upstream dependencies change. The order in which you display the cells is not relevant to the computation -- you are free to order the cells how you like.`
)};
const _1iqv0fw = function _greet_name(greeting,name){return(
greeting + " " + name
)};
const _njz834 = function _greeting(){return(
"hello"
)};
const _dlrup0 = function _21(md){return(
md`*if you change name (edit link), the change cascades*`
)};
const _161grpk = function _name(){return(
"Tom"
)};
const _m8cxbh = function _your_name_is(name){return(
name + " is your name"
)};
const _d4bc48 = function _24(md){return(
md`## AI ❤️ Dataflow

Lopecode was designed to speed up human programming, but the affordances also transfer to AI. The fact that a dataflow runtime is robust to individual cell failures means we can code up an AI inside the dataflow graph and let it modify other cells without breaking itself.`
)};
const _16w25t9 = function _25(robocoop3){return(
robocoop3({
  prompt: "Roast my code (the Tour of Lopecode)."
})
)};
const _z0n6z6 = function _27(aside,md){return(
md`${aside("robocoop3", ["@tomlarkworthy/robocoop-3", "@tomlarkworthy/robocoop-2"])}  is an Agentic AI that can read and modify the executing program. It is aware of the code that every cell executes and values they produce. You can ask it why something is happening and it very capable at figuring it out! It can explain code, fix bugs, write plans, and implement features. 

${aside("robocoop2", ["@tomlarkworthy/robocoop-2", "@tomlarkworthy/robocoop-3"])} is a normal dataflow program written in Lopecode that you can change_ right now_. If you make changes they will automatically propagate and update the one here. Dataflow is capable of expressing complex live programs.`
)};
const _12i2j7k = async function _28(downloadAnchor,FileAttachment,forkAnchor,aside,md){return(
md`## Save to file, open offline

Lopecode saves to a *single* HTML file that requires nothing special to open (${downloadAnchor()}). Double clicking the file will open the page on a \`file://\` domain where it *just works*, no local-server required.

The experience of opening the file is insanely fast, because no networking is involved.

<figure>
![image.png](${await FileAttachment("image@2.png").url()})
  <caption>_320ms to load exporter-3 notebook from file_</caption>
</figure>

<figure>
![image@1.png](${await FileAttachment("image-1@2.png").url()})
  <caption>_3500ms to load the same notebook from [Observablehq.com](https://observablehq.com/@tomlarkworthy/exporter-3). 10x slower!_</caption>
</figure>

Lopecode's ability to self-serialize encourages low risk experimentation, instead of serializing to file you can serialize to an in-memory ${forkAnchor(undefined, undefined, {"theme": "parchment"})} that manifests as a new browser tab to try things out on. Let the AI run wild in an isolated tab!

Self-serialization has other uses, it is possible to copy the environment to your clipboard, and paste into another website, bringing your Lopecode environment into a 3rd party domain, see the _"Copy To JS"_ button on the full ${aside("<i>exporter</i>", ["@tomlarkworthy/exporter-3"])} UI. 

`
)};
const _fre5d1 = function _copy_to_js(exporter){return(
exporter()
)};
const _qiij6j = function _32(md,externalLink,htl){return(
md`## Web Standards

Lopecode is _not_ a new programming language, or a software-as-a-service. It's a HTML document that can be saved to disk for archiving. Old file exports work after years. Here is the first ${externalLink('commit', 'https://github.com/tomlarkworthy/lopecode/commit/459c924658b8a18fe46a51719c1ab2de36a839a7')} to the ${externalLink('Lopecode', 'https://github.com/tomlarkworthy/lopecode')} repository on Jan 3, 2025, to ${externalLink(htl.html`<code>webpage.html</code>`, 'https://raw.githubusercontent.com/tomlarkworthy/lopecode/459c924658b8a18fe46a51719c1ab2de36a839a7/webpage.html')}, which looks embarrassing but still runs today! Just save the file to disk and click it!

Lopecode was designed not to bit-rot. By eliminating the network and bundling everything into a standards compliant file, I hope that programs that worked into the past will continue to work long into the future. The web has a good track record of backwards compatibility, and all the evergreen browser implementations work with Lopecode.

Several other advantages come for free with the local Web execution.

- The \`debugger\` statement works. Furthermore, it synergizes with reactive programming. When you add a \`debugger\` statement the cell is rerun and often immediately triggers a breakpoint.
- The other rich development features of the web work (performance profiling, page inspection). Modern browsers are essentially IDEs which can be fully leveraged when working with Lopecode.
- You can easily share you work by uploading it to a webserver. Any static hosting works.
- You can leverage the vast existing Javascript ecosystem, e.g. dynamic \`import\` works. ⚠️ you have to copy them in to make them offline-first.`
)};
const _b6jd7m = function _33(externalLink,md){return(
md`# The Architectural Principles of Lopecode Core

So far we have discussed a selection of cool things Lopecode can do. But we have not explained what it is. Curiously none of those things are integral to the core of Lopecode. In this section we describe the guiding principles shaping the technical architecture. 


_“If a system is to serve the creative spirit, it must be entirely comprehensible to a single individual… Any barrier that exists between the user and some part of the system will eventually be a barrier to creative expression. Any part of the system that cannot be changed or that is not sufficiently general is a likely source of impediment.”_

${externalLink("Design Principles Behind Smalltalk", "https://worrydream.com/refs/Ingalls_1981_-_Design_Principles_Behind_Smalltalk.pdf")}, \`Byte\` 1981 (Ingalls)`
)};
const _kwlblz = function _34(externalLink,md){return(
md`## The runtime is the source of truth

Traditional programming has the programmer edit a source code, which is compiled to a program, which is then run. This is true even of the hosted Notebook environment on ${externalLink("Observablehq.com", "https://www.observablehq.com")}.

Lopecode does not have a distinct concept of source code. Instead, it leverages Javascript's ${externalLink("Function.prototype.toString()", "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/toString")} to decompile variables on the fly when source code is needed. Whatever is currently executing in the runtime, will be what is exported.

This is how Lopecode exports still work on the hosted Observable platform, despite no access to the hosted source code. The export scans the runtime programatically to create a serialisable representation.`
)};
const _muwz2x = function _35(md,aside){return(
md`## Everything runs in userspace

For a system to be *truly* moldable. Everything must be changeable. Lopecode adopts a μ-kernel design where all features are added in userspace. For example, a minimal Lopecode file can be small as 48Kb.

<aside style="background: #eee; margin: 10px; padding: 10px; width: 80%;">
${md`#### es-module-shims@2.6.2 (20kb) and networking_script (7.7Kb)

ES-Module-Shims installs module loading hooks, allowing all Javascript module imports to be intercepted and the source rewritten. Lopecode leverages this to load modules from HTML content embedded in the source instead of over the network. It is the machinery that enables a single file to provide the illusion of networked module loading.

The custom \`networking_script\` adds a few more network orientated patches so that CommonJS modules and vanilla fetch also can be served with the impression of network connectivity.

#### @observablehq/inspector@5.0.1 (7Kb)

The observable inspector is an off-the-shelf module that Observable uses to render Javascript values as a DOM representation.

#### @observablehq/runtime@6.0.0 (6.5Kb)

The runtime is the reactivity dataflow engine developed by Observable. It is surprisingly small. It provides the programming module of variables and modules, and handles scheduling recomputations.

#### @tomlarkworthy/bootloader-min (3.5K)

The bootloader is a nominated userspace module that should run first. It is responsible for setting up the standard library and then loading the first real modules specified by the \`bootconf.json\`. The normal lopecode bootloader is much larger (>300kb) and includes the markdown renderer, katex, Plot etc. 
`}
</aside>

The core starts an Observable Runtime engine and sets up the internal networking and loads nominated userspace modules. At the end of the boot sequence nothing will have been rendered to the DOM. All the initial machinery is without UI.

The notebook experience you are reading now happens after the Lopecode boot sequence. It is not what Lopecode is, more a demonstration of what is possible in userspace. We have chosen to recreate the Observable Notebook 1.0 experience, but it is not coupled to that. You can totally replace the UI for a radically different experience if desired.

What Lopecode provides is packaging Observable's reactive runtime with mechanisms to run it from a single file and a collection of important userspace modules. An important implication being anything is reactively hot-swappable at runtime.

The Lopecode file format and boot sequence is documented in ${aside("exporter", ["@tomlarkworthy/exporter-3"])}.
`
)};
const _1imw1je = function _realtime(md){return(
md`## Realtime all the things

Lopecode is built under the philosophy that reactive state is just a better way of programming. The state should always be up to date, and instantly responsive to changes made anywhere else. The 40+ year appeal of spreadsheet is clear evidence. Lopecode is all-in on reactivity, and has extended the model to close expressivity gaps and adds missing engineering guardrails.

Lopecode lives reactivity, for example, meta-programming facilities like the currently loaded modules, is not a function you poll, but a variable \`currentModules\` that all interested tools subscribe to. Reactive testing allows tests to be run on causally linked implementation changes and surface breakages instantly. Technical documentation can be reactively linked to the real implementation.

`
)};
const _10oczgv = function _37(externalLink,aside,md){return(
md`# Technical Contributions of Lopecode to Live programming

The Reactive Dataflow ensures code changes are applied immediately but selectively. We will not explain it in too much detail here, it is _prior art_. The Observable documentation, ${externalLink("JavaScript in Observable","https://observablehq.com/collection/@observablehq/javascript-in-observable")}, explains the programming model in detail. ${aside("Observable notes", ["@tomlarkworthy/observable-notes"])} contains additional technical experiments on the programming model.

Lopecode is a substantial reactive program and its development has revealed some limitations. Lopecode has added to the state-of-the-art with the addition of meta-programming and dataflow-templating, each which solves a different expressivity problem with reactive programming.

In addition, we have added additional engineering facilities that help with common development problems with reactive programming, Reactive Testing and Reactive Debugging.

Finally we have turbo-charged Lopecode development with a userspace AI that leverages the reactive microkernel architecture. Unlike external LLM harnesses, it executes inside the runtime alongside all the other userspace code and is able to read runtime state, the page DOM, as well read and modify code.
`
)};
const _1x1rk31 = function _39(aside,md){return(
md`## Meta-programming in Lopecode

For Lopecode to implement userspace code editors, it is necessary to obtain references to reactive variables and to patch them dynamically. The ${aside("Runtime SDK", ["@tomlarkworthy/runtime-sdk", "@tomlarkworthy/module-map", "@tomlarkworthy/cell-map"])} is a library that other modules use to get meta-programming access to the running runtime.`
)};
const _e8kur3 = function _40(md){return(
md`Meta-programming is also used to create reactive visualizations, serialize the runtime, and create debuggers.`
)};
const _mm9tkj = function _42(aside,md){return(
md`### ${aside("moduleMap", ["@tomlarkworthy/module-map", "@tomlarkworthy/runtime-sdk"])}`
)};
const _1wmwcph = function _43(md){return(
md`The current set of modules in the runtime is available as a reactive variable, so that any code can reactively update to changes in the current module listing. For instance, the plot below visualizes the *current* set of modules, and reacts to new modules being loaded into the runtime.`
)};
const _mxeocm = function _45(currentModules){return(
currentModules
)};
const _sl41ez = function _46(Inputs,currentModules){return(
Inputs.table([...currentModules.values()], {
  columns: ["title", "name", "dependsOn", "dependedBy"]
})
)};
const _1jzk4yd = function _mainVisualizeModules(visualizeModules){return(
visualizeModules()
)};
const _254uxo = function _48(md){return(
md`Replace the following cell with 

~~~js
import { boinger } from "@tomlarkworthy/svg-boinger"
~~~ 

to see the live modules update with the addition of svg-boinger.`
)};
const _1ols64z = function _replace_me(){return(
'change to `import { boinger } from "@tomlarkworthy/svg-boinger"`'
)};
const _1sxb2ng = function _50(aside,md){return(
md`### ${aside("cellMap", ["@tomlarkworthy/cell-map", "@tomlarkworthy/runtime-sdk"])}

A module holds reactive variables in a namespace. When decompiling, groups of variables form cells that are defined by a snippet of Observable JS source code. The \`cellMap\` can calculate that grouping from scanning a runtime i.e. the runtime is the source of truth.

`
)};
const _1daldjn = function _52(md){return(
md`As often you want to run \`cellMap\` on the enclosing runtime, \`liveCellMap\` is a reactive variable that holds the latest cell groupings by module.`
)};
const _hchgm5 = function _53(liveCellMap){return(
liveCellMap
)};
const _5zmt8k = function _54(aside,md){return(
md`With meta-programming we are able to build software components that work over the whole of the runtime, for instance, creating module listings UIs and navigators. the \`cell-map\` module itself has a live ${aside("visualization", ["@tomlarkworthy/cell-map"])} of all the cell inter-connections.`
)};
const _1lmoc2k = function _55(aside,md){return(
md`## ${aside("Dataflow Templating", ["@tomlarkworthy/dataflow-templating"])}

Dataflow Templating solves an expressivity gap with static datagraph programming models like Spreadsheets and Observable Notebooks. To scale up Dataflow to complex programs like Lopecode itself we needed to go beyond static dataflow graphs.

Dataflow Templating is the missing generative abstraction for Dataflow that enables dynamic replication of dataflow subgraphs at runtime. Dataflow Templating allows replicating a static prototype subgraph to become a reusable abstraction. It has been heavily leveraged by the code editor module, so that every cell can have an independent code editor.

Learn more about the technique in ${aside("Dataflow Templating", ["@tomlarkworthy/dataflow-templating"])} and see a complex deployment in the  ${aside("Cell Editor", ["@tomlarkworthy/editor-5"])}`
)};
const _h1e94f = function _56(md){return(
md`## Reactive Testing

Dataflow builds a dependency graph for recomputing answers efficiently. This can be leveraged to rerun just the unit tests that are causally linked to implementation.`
)};
const _lan3kc = function _should_throw(Inputs){return(
Inputs.toggle({
  label: "throw?"
})
)};
const _i6uwg0 = (G, _) => G.input(_);
const _1f0culj = function _58(tests){return(
tests({
  filter: (test) => test.state !== "paused"
})
)};
const _fj68fg = function _test_has_it_thrown(should_throw)
{
  if (should_throw) throw new Error("I threw");
  return "pass";
};
const _1jyhhom = function _60(md){return(
md`Reactive Testing can be combined with meta-programming to check invariants are maintained. We pipe the results of reactive tests into the embedded AI so that it gets fast feedback.

One invariant we expose to the AI is that all cells should be decompilable. The low-level API the AI uses can potentially author code that can break decompilability. The Reactive Testing provides fast feedback to the AI which will then repair damage that it may temporarily cause. Reactive Testing thus becomes a useful feedback signal for both humans and AI.`
)};
const _1d8nyij = function _61(aside,md){return(
md`
Learn more about the technique in ${aside("Reactive Testing", ["@tomlarkworthy/tests"])}.`
)};
const _1yjc43e = function _64(md){return(
md`### circuit breaking`
)};
const _1kj83th = function _65(aside,md){return(
md`Another use of reactive testing is as a circuit breaker for self-triggering reactive loops. When a cell throws an exception, dataflow halts propagation. Reactive testing also represents failures as exceptions. Hidden loops in Dataflow graphs are dangerous, but are often needed for bidirectional sync with external state. Bidirectional sync is safe when a change in one way, maps back to the original (an invertible bijection), but often bijection invariants are fragile to develop. 

One practical solution to remove the risk of a coding mistake in a bijection, is to only run sync if your proposed change will invert back to itself. This can be represented as an invariant test, which if it throws, highlights the issue in the invariant test and doesn't perform the sync that could potentially begin a self-triggering loop.

This safety technique was used in ${aside("lopepage", ["@tomlarkworthy/lopepage"])} where the page URL is bidirectionally synced to the page layout. A test prevents writing to current layout the page URL if the inverse transformation leads to a different layout. This logic was notoriously hard to keep bug free.`
)};
const _1dzrf9m = function _66(aside,md){return(
md`## Reactive Debugging

Dataflow has great developer ergonomics when the computation has a clear ordering. However, looped computation can be tricky. Direct cycles are forbidden, but you can introduce cycles via sideffects. Occasionally you can create self-triggering loops and sometimes it can be hard to understand why cells are recomputing.

The ${aside("Reactive Debugger", ["@tomlarkworthy/debugger"])} records all variable transitions on a timeline which can help trace unexpected sources of recomputation. `
)};
const _1e8xoog = function _notebook_debugger(_ndd){return(
_ndd
)};
const _pw7zg = function _68($0,Event)
{
  $0.value = true;
  $0.dispatchEvent(new Event("input"));
};
const _sic4uw = function _70(md){return(
md`## Programmable Agentic AI Harness`
)};
const _b0pg2c = function _71(md){return(
md`Unlike an exterior LLM harness like \`Claude Code\`, the \`robocoop3\` agent executes inside the runtime as a normal dataflow program. Its unique features is that it can **read program state** as well as write reactively executed code.

It distributed as a \`function\` so you can instantiate multiple independent agents. `
)};
const _v65zoi = function _72(md){return(
md`\`robocoop3\` is agentic, and directly modifies the runtime using the low-level Javascript API. It is not exposed to the higher level Observable Javascript syntax. This contrasts to its predecessor \`robocoop2\` that reads and writes high-level Observable Javascript. Both are useful. \`robocoop3\` is much faster, with support for parallel tool calling and streaming responses, but \`robocoop2\` is able to write better high-level source code.`
)};
const _1uy1lzz = function _73(aside,md){return(
md`Learn more about the two coding assistants in their respective ${aside('modules', [
    '@tomlarkworthy/robocoop-2',
    '@tomlarkworthy/robocoop-3'
]) }`
)};
const _b1hzil = function _74(md){return(
md`# Important Userspace Modules

Everything in Lopecode is implemented in userspace and thus is modifiable at runtime. Several modules add system features level features. You are free to add your own as needs demand.`
)};
const _4kk2s1 = function _75(md){return(
md`## Editor-5: Cell editor

The editor-5 module adds the \`cellEditor\`. It uses the popular Javascript library CodeMirror, which is vendored into the runtime as file attachment. The Editor uses two layers of Dataflow Templating so that every cell has a unique editor but the editor is lazily instantiated only when a user actually activates the edit feature.`
)};
const _1wg1dy2 = function _76(md){return(
md`Because the editor has a userspace implementation you can instantiate it in your own notebooks like a library. Consider the following editor that is synced with the reactive variable \`my_value\`:`
)};
const _y31fh8 = function _77(cellEditor,my_value_variable){return(
cellEditor(my_value_variable, { pinned: true })
)};
const _wrh7a5 = function _my_value(){return(
5
)};
const _15plzu3 = function _79(md){return(
md`\`my_value\` now has two editors. The one placed in the page, plus another cell editor all cells have. Because "Runtime-is-the-source-of-truth" both editors listen to the runtime to detect implementation changes, and thus are kept in sync.`
)};
const _mzarfl = function _my_value_variable(lookupVariable,tourModule){return(
lookupVariable("my_value", tourModule)
)};
const _1m6vh0r = function _82(md){return(
md`## File Attachments: binary assets for offline-first operation`
)};
const _18xo7ya = function _83(aside,md){return(
md`Modules support attaching binary assets through as files. This includes npm sourced Javascript modules. All of Lopecode's Javascript dependencies have been attached to modules, including the Observable runtime μ-kernel. This means an exported single file HTML file will open and fully operate without a network connection.

Learn more in the ${aside("fileattachments", ["@tomlarkworthy/fileattachments"])}.

The Lopecode Tour has vendored in Javascript dependencies for ${aside("modern-screenshot", ["@tomlarkworthy/modern-screenshot@4.6.6"])}, ${aside("acorn", ["@tomlarkworthy/acorn-8-11-3"])}, ${aside("escodegen", ["@tomlarkworthy/escodegen"])}, ${aside("Code mirror", ["@tomlarkworthy/codemirror-6-v2"])}, ${aside("Prose mirror", ["@tomlarkworthy/prosemirror"])}, ${aside("Jest expect", ["@tomlarkworthy/jest-expect-standalone"])}, ${aside("Observable runtime", ["@tomlarkworthy/observable-runtime-v6"])} and ${aside("Observable Inspector", ["@observablehq/inspector@5.0.1"])}














`
)};
const _114l2fs = function _84(forkAnchor,md){return(
md`FileAttachments are writable. This means that they can be used as a binary storage format. Changes are remembered after ${forkAnchor()}ing.`
)};
const _xbt5bk = async function _note(Inputs,FileAttachment){return(
Inputs.textarea({
  label: "note",
  rows: 20,
  value: await FileAttachment("task.md").text()
})
)};
const _5wh76s = (G, _) => G.input(_);
const _hpbyqd = function _attachment(note,createFileAttachment)
{
  const blob = new Blob([note], {
    type: "application/text;charset=utf-8"
  });
  const url = URL.createObjectURL(blob);
  return createFileAttachment(url, "task.md", "application/text");
};
const _1dew0g8 = function _88(setFileAttachment,attachment,tourModule){return(
setFileAttachment(attachment, tourModule)
)};
const _t4xm3j = function _tourModule(thisModule){return(
thisModule()
)};
const _ot5596 = (G, _) => G.input(_);
const _d9sni4 = function _90(md){return(
md`## Visualizer: projecting program state to the DOM`
)};
const _1nbytbn = function _91(md){return(
md`Reactive variables compute Javascript values. Javascript values have no inherent visual representation. The _visualizer_ maps variable values to DOM nodes to present them in a notebook-like format.   `
)};
const _2qx431 = function _options(currentModules){return(
new Map([...currentModules.values()].map((m) => [m.name, m]))
)};
const _1koaj6v = function _about_modules(md){return(
md`You can pick a module to render, even one dynamically added. Note that DOM values can only have one parent, so using the visualizer here will often steal the DOM nodes from other pages. If you want the same UI in more than one place, this is where you elevate them to Dataflow Templates.`
)};
const _1g2m67o = function _visualize_module(Inputs,options){return(
Inputs.select(options, {
  label: "select a module to vizualize",
  value: options.get("@tomlarkworthy/summarizejs")
})
)};
const _7f7s1f = (G, _) => G.input(_);
const _1km3f2i = function _visualize(html,visualizer,runtime,invalidation,visualize_module){return(
html`<div style="width: 90%; height: 400px; overflow: scroll; background: #fee; border: 1rem solid; margin: 1rem; padding: 1rem">
  ${visualizer(runtime, {
    invalidation,
    module: visualize_module.module,
    detachNodes: true
  })}
</div>`
)};
const _r32b03 = function _97(md){return(
md`Because the visualizer is a userspace module, we can change it on the fly, or supply a second mapping of program state. The visualizer leverages no special access to the runtime, it simply observes variable value changes with an API that available to every userspace service. 

Lopecode core is not inherently a notebook environment, it is modules like \`visualizer\` that give it that look. It is possible for Lopecode to be both a notebook and something else, like a VR world, *at the same time*. Some of the other modules, like the debugger, are alternative projects on the lopecode core state.`
)};
const _5gx2tm = function _98(md){return(
md`## Lopepage: a hypertext navigator over the runtime

Visualizer can render a single module as a notebook. _Lopepage_ visualizes multiple modules on a docking UI, and allows internal navigation through hyperlinks. The layout of the page is synced to the URL, and serialized to notebook state, so you can easily pickup where you left.
`
)};
const _dmj7o5 = function _100(md){return(
md`## All Notebooks in the Tour

The tour notebook contains a considerable volume of functionality, but serializes to 2MB. Here is the complete listing of modules contained within its single HTML file.`
)};
const _1fm7hg0 = function _101(Inputs,currentModules,aside){return(
Inputs.table(
  [...currentModules.values()].map((info) => ({
    ...info
  })),
  {
    columns: ["title", "name"],
    format: {
      name: (n) => aside(n, [n])
    },
    rows: 50,
    sort: "name",
    layout: "auto"
  }
)
)};
const _1w9xw17 = function _102(md,externalLink){return(
md`## Work in progress

Lopecode is still quite fragile, it is being hardened and bugs trampled. Core development is on the Observable Notebook 1.0, in the ${externalLink("Lopecode collection", "https://observablehq.com/@tomlarkworthy/module-map?collection=@tomlarkworthy/lopebook")}. That work (and many others) is synchronized to Github repository ${externalLink("lopecode", "https://github.com/tomlarkworthy/lopecode")} using ${externalLink("Jumpgate", "https://observablehq.com/@tomlarkworthy/jumpgate")}.`
)};
const _1xgavdb = function _acknowledgements(md,externalLink,htl){return(
md`## Acknowledgements

Thank you ${externalLink(
  htl.html`<i>Mike Bostock</i>`,
  "https://bost.ocks.org/mike/"
)} for building the Observable Runtime, d3, Plot and for seeing the future of a dataviz driven programming environment. Thanks ${externalLink(
  htl.html`<i>Philippe Rivière</i>`,
  "https://github.com/fil"
)} for the outstanding work on Plot. Thanks ${externalLink(
  htl.html`<i>Fabian Iwand</i>`,
  "https://observablehq.com/@mootari"
)} for stretching what is possible on Observable Notebooks. Thanks ${externalLink(
  htl.html`<i>Thomas Ballinger</i>`,
  "https://ballingt.com/"
)}, ${externalLink(
  htl.html`<i>Tom MacWright</i>`,
  "https://macwright.com/"
)}, ${externalLink(
  htl.html`<i>Jeremy Ashkenas</i>`,
  "https://en.wikipedia.org/wiki/Jeremy_Ashkenas"
)}, ${externalLink(
  htl.html`<i>Toph Tucker</i>`,
  "https://www.tophtucker.com/"
)}, ${externalLink(
  htl.html`<i>Visnu Pitiyanuvath</i>`,
  "https://observablehq.com/@visnup"
)}, ${externalLink(
  htl.html`<i>Allison Horst</i>`,
  "https://allisonhorst.com/"
)}, ${externalLink(
  htl.html`<i>Ian Johnson</i>`,
  "https://enjalot.github.io/"
)}, ${externalLink(
  htl.html`<i>Cobus Theunissen</i>`,
  "https://observablehq.com/@cobus/cobuss-collection-of-cool-notebooks"
)}, ${externalLink(
  htl.html`<i>Wayne Sutton</i>`,
  "https://www.waynesutton.ai/"
)} and many more for building Observable.

Thank you the ${externalLink(
  "Feeling of Computing",
  "https://feelingof.com/"
)} community for feedback and support. ${externalLink(
  htl.html`<i>Jasmine Otto</i>`,
  "https://jazztap.github.io/"
)} for her positivity on the project. ${externalLink(
  htl.html`<i>Ivan Reese</i>`,
  "https://ivanish.ca/"
)} for shepherding the ${externalLink(
  "Feeling of Computing",
  "https://feelingof.com/"
)} community and providing space to Lopecode. ${externalLink(
  "Konrad Hinsen",
  "https://khinsen.net/"
)} a kindred spirit making the lisp based ${externalLink(
  "Hyperdoc",
  "https://hyperdoc.khinsen.net/"
)}. ${externalLink(
  "Marek Rogalski",
  "https://mrogalski.eu"
)} building the mind blowing ${externalLink(
  "Automat",
  "https://store.steampowered.com/app/4122050/Automat/"
)}. ${externalLink("Chris Shank", "https://chrisshank.com/")} ${externalLink(
  "Orion Reed",
  "https://www.orionreed.com/"
)} building ${externalLink(
  "folkjs",
  "https://folkjs.org"
)} and innovating new editable web technologies. All of these projects have been a source of ongoing inspiration.

Thanks to ${externalLink(
  htl.html`<i>Tomas Petricek</i>`,
  "https://tomasp.net/"
)} for introducing me to the computational *substrates* research discipline, which seems to fit what Lopecode is. ${externalLink(
  "Antranig Basman",
  "https://ponder.org.uk/"
)} for connecting it to ${externalLink(
  "malleable systems",
  "https://forum.malleable.systems"
)} and providing deep conversation about reactivity.

And Thank *YOU* for reading!`
)};
const _16jjni0 = function _104(md){return(
md`#### Content Helpers`
)};
const _16ah2zf = function _aside(html){return(
(title, module_names) =>
  html`<a href="#view=R100(S50(@tomlarkworthy/lopecode-tour),S50(${module_names.join(
    ","
  )}))">${title}</a>`
)};
const _1kv75ms = function _external_link_svg(svg){return(
svg`<svg
  xmlns="http://www.w3.org/2000/svg"
  width="0.9em"
  height="0.9em"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="1"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <path d="M12 6h-6a2 2 0 0 0 -2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-6" />
  <path d="M11 13l9 -9" />
  <path d="M15 4h5v5" />
</svg>`
)};
const _flv6ad = function _externalLink(external_link_svg,htl){return(
(label, href, { title = "Opens in a new tab" } = {}) => {
  const icon = external_link_svg.cloneNode(true);
  icon.setAttribute("aria-hidden", "true");
  return htl.html`<a
    href=${href}
    target="_blank"
    rel="noopener noreferrer"
    title=${title}
  >${label}${icon}</a>`;
}
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };
  const fileAttachments = new Map(["task.md","image-1@2.png","image@2.png"].map((name) => {
    const module_name = "@tomlarkworthy/lopecode-tour";
    const {status, mime, bytes} = window.lopecode.contentSync(module_name + "/" + encodeURIComponent(name));
    const blob_url = URL.createObjectURL(new Blob([bytes], { type: mime}));
    return [name, {url: blob_url, mimeType: mime}]
  }));
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));

  main.define("module @tomlarkworthy/editable-md", async () => runtime.module((await import("/@tomlarkworthy/editable-md.js?v=4")).default));  
  main.define("module @tomlarkworthy/manipulate", async () => runtime.module((await import("/@tomlarkworthy/manipulate.js?v=4")).default));  
  main.define("module @tomlarkworthy/robocoop-3", async () => runtime.module((await import("/@tomlarkworthy/robocoop-3.js?v=4")).default));  
  main.define("module @tomlarkworthy/exporter-3", async () => runtime.module((await import("/@tomlarkworthy/exporter-3.js?v=4")).default));  
  main.define("module @tomlarkworthy/observable-notes", async () => runtime.module((await import("/@tomlarkworthy/observable-notes.js?v=4")).default));  
  main.define("module @tomlarkworthy/runtime-sdk", async () => runtime.module((await import("/@tomlarkworthy/runtime-sdk.js?v=4")).default));  
  main.define("module @tomlarkworthy/module-map", async () => runtime.module((await import("/@tomlarkworthy/module-map.js?v=4")).default));  
  main.define("module @tomlarkworthy/cell-map", async () => runtime.module((await import("/@tomlarkworthy/cell-map.js?v=4")).default));  
  main.define("module @tomlarkworthy/tests", async () => runtime.module((await import("/@tomlarkworthy/tests.js?v=4")).default));  
  main.define("module @tomlarkworthy/observablejs-toolchain", async () => runtime.module((await import("/@tomlarkworthy/observablejs-toolchain.js?v=4")).default));  
  main.define("module @tomlarkworthy/debugger", async () => runtime.module((await import("/@tomlarkworthy/debugger.js?v=4")).default));  
  main.define("module @tomlarkworthy/editor-5", async () => runtime.module((await import("/@tomlarkworthy/editor-5.js?v=4")).default));  
  main.define("module @tomlarkworthy/fileattachments", async () => runtime.module((await import("/@tomlarkworthy/fileattachments.js?v=4")).default));  
  main.define("module @tomlarkworthy/visualizer", async () => runtime.module((await import("/@tomlarkworthy/visualizer.js?v=4")).default));  
  main.define("module @tomlarkworthy/lopepage-urls", async () => runtime.module((await import("/@tomlarkworthy/lopepage-urls.js?v=4")).default));  
  main.define("module @tomlarkworthy/lite-youtube-embed", async () => runtime.module((await import("/@tomlarkworthy/lite-youtube-embed.js?v=4")).default));  
  main.define("module @tomlarkworthy/robocoop-2", async () => runtime.module((await import("/@tomlarkworthy/robocoop-2.js?v=4")).default));  
  $def("_fnpyj0", "title", ["externalLink","md"], _fnpyj0);  
  $def("_490vvx", "intro", ["md"], _490vvx);  
  $def("_1bxwxlr", null, ["lite_youtube_css","externalLink","htl"], _1bxwxlr);  
  $def("_1civrgr", null, ["forkAnchor","downloadAnchor","md"], _1civrgr);  
  $def("_1b5ewhi", null, ["timeNow","md"], _1b5ewhi);  
  $def("_zfr6uw", "ui_prose", ["htl","md"], _zfr6uw);  
  main.define("md", ["module @tomlarkworthy/editable-md", "@variable"], (_, v) => v.import("md", _));  
  $def("_18uj0nr", "timeNow", [], _18uj0nr);  
  $def("_17h8lzd", null, ["externalLink","md"], _17h8lzd);  
  $def("_1b5vij4", null, ["viewof plot_trajectory"], _1b5vij4);  
  $def("_1mk30jf", null, ["md"], _1mk30jf);  
  $def("_3u4bg6", null, ["trajectory_manipulate","max_arc"], _3u4bg6);  
  $def("_ugj3x6", null, ["aside","md"], _ugj3x6);  
  main.define("viewof plot_trajectory", ["module @tomlarkworthy/manipulate", "@variable"], (_, v) => v.import("viewof plot_trajectory", _));  
  main.define("plot_trajectory", ["module @tomlarkworthy/manipulate", "@variable"], (_, v) => v.import("plot_trajectory", _));  
  main.define("max_arc", ["module @tomlarkworthy/manipulate", "@variable"], (_, v) => v.import("max_arc", _));  
  main.define("trajectory_manipulate", ["module @tomlarkworthy/manipulate", "@variable"], (_, v) => v.import("trajectory_manipulate", _));  
  $def("_1oxvv9l", null, ["md"], _1oxvv9l);  
  $def("_13x0ymf", null, ["aside","md"], _13x0ymf);  
  $def("_1773i7w", "programming_process", ["md"], _1773i7w);  
  $def("_1abp0dr", null, ["externalLink","md"], _1abp0dr);  
  $def("_1iqv0fw", "greet_name", ["greeting","name"], _1iqv0fw);  
  $def("_njz834", "greeting", [], _njz834);  
  $def("_dlrup0", null, ["md"], _dlrup0);  
  $def("_161grpk", "name", [], _161grpk);  
  $def("_m8cxbh", "your_name_is", ["name"], _m8cxbh);  
  $def("_d4bc48", null, ["md"], _d4bc48);  
  $def("_16w25t9", null, ["robocoop3"], _16w25t9);  
  main.define("robocoop3", ["module @tomlarkworthy/robocoop-3", "@variable"], (_, v) => v.import("robocoop3", _));  
  $def("_z0n6z6", null, ["aside","md"], _z0n6z6);  
  $def("_12i2j7k", null, ["downloadAnchor","FileAttachment","forkAnchor","aside","md"], _12i2j7k);  
  $def("_fre5d1", "copy_to_js", ["exporter"], _fre5d1);  
  main.define("downloadAnchor", ["module @tomlarkworthy/exporter-3", "@variable"], (_, v) => v.import("downloadAnchor", _));  
  main.define("forkAnchor", ["module @tomlarkworthy/exporter-3", "@variable"], (_, v) => v.import("forkAnchor", _));  
  main.define("exporter", ["module @tomlarkworthy/exporter-3", "@variable"], (_, v) => v.import("exporter", _));  
  $def("_qiij6j", null, ["md","externalLink","htl"], _qiij6j);  
  $def("_b6jd7m", null, ["externalLink","md"], _b6jd7m);  
  $def("_kwlblz", null, ["externalLink","md"], _kwlblz);  
  $def("_muwz2x", null, ["md","aside"], _muwz2x);  
  $def("_1imw1je", "realtime", ["md"], _1imw1je);  
  $def("_10oczgv", null, ["externalLink","aside","md"], _10oczgv);  
  main.define("_0", ["module @tomlarkworthy/observable-notes", "@variable"], (_, v) => v.import("_0", _));  
  $def("_1x1rk31", null, ["aside","md"], _1x1rk31);  
  $def("_e8kur3", null, ["md"], _e8kur3);  
  main.define("thisModule", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("thisModule", _));  
  main.define("runtime", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("runtime", _));  
  main.define("lookupVariable", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("lookupVariable", _));  
  $def("_mm9tkj", null, ["aside","md"], _mm9tkj);  
  $def("_1wmwcph", null, ["md"], _1wmwcph);  
  main.define("visualizeModules", ["module @tomlarkworthy/module-map", "@variable"], (_, v) => v.import("visualizeModules", _));  
  main.define("viewof currentModules", ["module @tomlarkworthy/module-map", "@variable"], (_, v) => v.import("viewof currentModules", _));  
  main.define("currentModules", ["module @tomlarkworthy/module-map", "@variable"], (_, v) => v.import("currentModules", _));  
  $def("_mxeocm", null, ["currentModules"], _mxeocm);  
  $def("_sl41ez", null, ["Inputs","currentModules"], _sl41ez);  
  $def("_1jzk4yd", "mainVisualizeModules", ["visualizeModules"], _1jzk4yd);  
  $def("_254uxo", null, ["md"], _254uxo);  
  $def("_1ols64z", "replace_me", [], _1ols64z);  
  $def("_1sxb2ng", null, ["aside","md"], _1sxb2ng);  
  main.define("cellMap", ["module @tomlarkworthy/cell-map", "@variable"], (_, v) => v.import("cellMap", _));  
  main.define("viewof liveCellMap", ["module @tomlarkworthy/cell-map", "@variable"], (_, v) => v.import("viewof liveCellMap", _));  
  main.define("liveCellMap", ["module @tomlarkworthy/cell-map", "@variable"], (_, v) => v.import("liveCellMap", _));  
  $def("_1daldjn", null, ["md"], _1daldjn);  
  $def("_hchgm5", null, ["liveCellMap"], _hchgm5);  
  $def("_5zmt8k", null, ["aside","md"], _5zmt8k);  
  $def("_1lmoc2k", null, ["aside","md"], _1lmoc2k);  
  $def("_h1e94f", null, ["md"], _h1e94f);  
  $def("_lan3kc", "viewof should_throw", ["Inputs"], _lan3kc);  
  $def("_i6uwg0", "should_throw", ["Generators","viewof should_throw"], _i6uwg0);  
  $def("_1f0culj", null, ["tests"], _1f0culj);  
  $def("_fj68fg", "test_has_it_thrown", ["should_throw"], _fj68fg);  
  $def("_1jyhhom", null, ["md"], _1jyhhom);  
  $def("_1d8nyij", null, ["aside","md"], _1d8nyij);  
  main.define("tests", ["module @tomlarkworthy/tests", "@variable"], (_, v) => v.import("tests", _));  
  main.define("test_all_cells_decompilable", ["module @tomlarkworthy/observablejs-toolchain", "@variable"], (_, v) => v.import("test_all_cells_decompilable", _));  
  $def("_1yjc43e", null, ["md"], _1yjc43e);  
  $def("_1kj83th", null, ["aside","md"], _1kj83th);  
  $def("_1dzrf9m", null, ["aside","md"], _1dzrf9m);  
  $def("_1e8xoog", "notebook_debugger", ["_ndd"], _1e8xoog);  
  $def("_pw7zg", null, ["viewof pause","Event"], _pw7zg);  
  main.define("viewof pause", ["module @tomlarkworthy/debugger", "@variable"], (_, v) => v.import("viewof pause", _));  
  main.define("pause", ["module @tomlarkworthy/debugger", "@variable"], (_, v) => v.import("pause", _));  
  main.define("_ndd", ["module @tomlarkworthy/debugger", "@variable"], (_, v) => v.import("_ndd", _));  
  $def("_sic4uw", null, ["md"], _sic4uw);  
  $def("_b0pg2c", null, ["md"], _b0pg2c);  
  $def("_v65zoi", null, ["md"], _v65zoi);  
  $def("_1uy1lzz", null, ["aside","md"], _1uy1lzz);  
  $def("_b1hzil", null, ["md"], _b1hzil);  
  $def("_4kk2s1", null, ["md"], _4kk2s1);  
  $def("_1wg1dy2", null, ["md"], _1wg1dy2);  
  $def("_y31fh8", null, ["cellEditor","my_value_variable"], _y31fh8);  
  $def("_wrh7a5", "my_value", [], _wrh7a5);  
  $def("_15plzu3", null, ["md"], _15plzu3);  
  $def("_mzarfl", "my_value_variable", ["lookupVariable","tourModule"], _mzarfl);  
  main.define("cellEditor", ["module @tomlarkworthy/editor-5", "@variable"], (_, v) => v.import("cellEditor", _));  
  $def("_1m6vh0r", null, ["md"], _1m6vh0r);  
  $def("_18xo7ya", null, ["aside","md"], _18xo7ya);  
  $def("_114l2fs", null, ["forkAnchor","md"], _114l2fs);  
  $def("_xbt5bk", "viewof note", ["Inputs","FileAttachment"], _xbt5bk);  
  $def("_5wh76s", "note", ["Generators","viewof note"], _5wh76s);  
  main.define("createFileAttachment", ["module @tomlarkworthy/fileattachments", "@variable"], (_, v) => v.import("createFileAttachment", _));  
  main.define("setFileAttachment", ["module @tomlarkworthy/fileattachments", "@variable"], (_, v) => v.import("setFileAttachment", _));  
  $def("_hpbyqd", "attachment", ["note","createFileAttachment"], _hpbyqd);  
  $def("_1dew0g8", null, ["setFileAttachment","attachment","tourModule"], _1dew0g8);  
  $def("_t4xm3j", "viewof tourModule", ["thisModule"], _t4xm3j);  
  $def("_ot5596", "tourModule", ["Generators","viewof tourModule"], _ot5596);  
  $def("_d9sni4", null, ["md"], _d9sni4);  
  $def("_1nbytbn", null, ["md"], _1nbytbn);  
  main.define("visualizer", ["module @tomlarkworthy/visualizer", "@variable"], (_, v) => v.import("visualizer", _));  
  $def("_2qx431", "options", ["currentModules"], _2qx431);  
  $def("_1koaj6v", "about_modules", ["md"], _1koaj6v);  
  $def("_1g2m67o", "viewof visualize_module", ["Inputs","options"], _1g2m67o);  
  $def("_7f7s1f", "visualize_module", ["Generators","viewof visualize_module"], _7f7s1f);  
  $def("_1km3f2i", "visualize", ["html","visualizer","runtime","invalidation","visualize_module"], _1km3f2i);  
  $def("_r32b03", null, ["md"], _r32b03);  
  $def("_5gx2tm", null, ["md"], _5gx2tm);  
  main.define("linkTo", ["module @tomlarkworthy/lopepage-urls", "@variable"], (_, v) => v.import("linkTo", _));  
  $def("_dmj7o5", null, ["md"], _dmj7o5);  
  $def("_1fm7hg0", null, ["Inputs","currentModules","aside"], _1fm7hg0);  
  $def("_1w9xw17", null, ["md","externalLink"], _1w9xw17);  
  $def("_1xgavdb", "acknowledgements", ["md","externalLink","htl"], _1xgavdb);  
  $def("_16jjni0", null, ["md"], _16jjni0);  
  $def("_16ah2zf", "aside", ["html"], _16ah2zf);  
  $def("_1kv75ms", "external_link_svg", ["svg"], _1kv75ms);  
  $def("_flv6ad", "externalLink", ["external_link_svg","htl"], _flv6ad);  
  main.define("lite_youtube_css", ["module @tomlarkworthy/lite-youtube-embed", "@variable"], (_, v) => v.import("lite_youtube_css", _));  
  main.define("robocoop2", ["module @tomlarkworthy/robocoop-2", "@variable"], (_, v) => v.import("robocoop2", _));
  return main;
}