const _1f8i73v = function _1(md){return(
md`# Designing Immortal Software: [A Vision for Lopecode](https://tomlarkworthy.github.io/lopecode/notebooks/@tomlarkworthy_lopecode-vision.html)
`
)};
const _1ywjm5j = function _2(md){return(
md`<div style="border-left:4px solid var(--theme-foreground-focus);
  background:var(--theme-background);
  padding:12px;
  margin:16px 0;
  font-family:sans-serif;">
  <i>Lopecode tips</i> 
  <p>
  Browse the internal modules on the explorer tab.
  Drag the tabs around to reposition.</p>
</div>`
)};
const _eprdhc = function _3(md){return(
md`
---

## Overview

Lopecode is a platform for building and sharing reactive, interactive computational media that can live forever. It’s forkable, self-contained, and build-free. It borrows the liveness and expressiveness of systems like Observablehq Notebooks, Smalltalk, HyperCard, Visual Basic, and Spreadsheets—but updates them with web-native technologies and a focus on long-term sustainability.


---
`
)};
const _wfyjci = function _4(md){return(
md`## What Lopecode Is
`
)};
const _1sl2j9l = function _5(url,md){return(
md`
### Relationship to Observable

Observable Notebooks evolved the spreadsheet and code. It provides instant preview without any setup and offers a searchable corpus of reusable examples. It offers a polyglot literate programming with support for a variety of different media types. Lopecode builds directly on this foundation—it reuses the [Observable reactive runtime engine](https://github.com/observablehq/runtime) and shares much of its programming model and visual aesthetics. Existing Observable notebook can be translated into Lopecode documents with [Jumpgate](https://observablehq.com/@tomlarkworthy/jumpgate#view=S100%28%40tomlarkworthy%2Fmodule-selection%29).

Where Lopecode diverges is in its focus on durability, malleability, and whole-runtime composition:

- **Offline-first and Durable**: Lopecode notebooks are single static HTML files that are simple to store and send, that contain all assets needed to run without network connectivity.
- **Multi-Notebook and Reflective by Default**: Observable focuses on a single notebook at a time. Lopecode supports multiple notebooks open simultaneously, communicating on the shared reactive runtime that supports self-reflection. This encourages modular design and enables global metaprogramming capabilities.
  For example
    - a **[testing notebook](${url("@tomlarkworthy/reactive-reflective-testing")})** can scan the entire runtime for tests and generate unified test results across the aggregate.
    - a **[debugging notebook](${url("@tomlarkworthy/debugger")})** can generate a time series of all cell transitions across notebooks, helping debug interdependencies.
    - an **[editor notebook](${url("@tomlarkworthy/editor-3")})** enabled in-place mutation of other cells in any other notebook
    - an **[LLM](${url("@tomlarkworthy/robocoop")})** notebook can help explain how things work and help fix bugs and apply software modifications.
- **Application Data Support**: Observable supports binary files through file attachments, however, they are strictly read-only. Lopecode goes beyond by offering userspace code to write back. Updated file attachments are re-serialized when exporting, enabling persistent application state to be continued and shared. For example, the [audio sequencer app](https://tomlarkworthy.github.io/lopebooks/notebooks/@tomlarkworthy_sequencer.html).
- ** No setup **: Most programming languages need a runtime to work, which adds friction. Observable's own export format is a zip of files that require a webserver to run locally. Local web servers are often needed because a HTML file served from a file domain is unable to make cross-origin request to static assets hosted relatively. Lopecode solves this by inlining all assets into a single file so no cross-origin requests are ever executed. If you want to understand the file format in more detail check out the [exporter](${url("@tomlarkworthy/exporter")}) notebook.

With Lopecode you build up a network of cooperating notebooks that collaborate. Each is a orthogonal literate programming slice of the whole programming system, you can edit any code and see the results immediately, even the notebooks used to create the editing experience.
`
)};
const _1mn66y9 = async function _6(architecture,htl){return(
htl.html`<img src="${await architecture.url()}" />`
)};
const _1vwiujk = function _7(md){return(
md`## Lopecode Features

To clarify the scope and implementation of Lopecode, here is a breakdown of its concrete features:

- **Modular Reactive Notebooks**: built-in reactivity and componentized structure
- **Live Interdependencies**: cells can reference and respond to changes in one another
- **Namespaces**: scope cells into modules for clean organization
- **Self-reflection**: cells have access to the runtime and can iterate and inspect other cells programatically.
- **Meta programming**: cells can rewrite and create new cells programatically.
- **Hypertext interface**: native support for hyperlinking between cell dependancies within the serialized graph
- **Literate programming**: first class support for markdown, HTML, d3 cells for documentation, with programatic interpolation from live runtime values.
- **Self-hosted**: no need for cloud services or remote runtimes, works from a \`file://\` domain
- **Internal IDE**: fully featured notebook editor embedded in the platform
- **Offline-first**: can be used and edited without network connectivity
- **Self-exportable**: notebooks can be modified and rexported as a new single file
- **Data/Dataviz Enabled**:
  - Built-in support for **D3**, **Plot**, and other visualization libraries
  - **FileAttachment** support for embedding datasets
  - **Writable** file attachments for saving application state.
- **Plain Text Serialization Format**:
  - Fully **human-readable**
  - **Git diff friendly** for collaboration
- **Single HTML File Deployment**:
  - Easy to host—just upload the file to a static web host
  - Easy to run—works directly from the \`file://\` domain without a server
- **Modular Internals**:
  - Uses standard **JavaScript modules**
  - Supports inclusion of **static file assets**, **images**, and **binary data**
`
)};
const _ep7sgw = function _8(md){return(
md`## Why Durability Matters

Durability is not usually considered important in web based software stacks. In Lopecode, it’s a core design principle we hope can unlock long-term impact.

### Bitrot is unwelcome depreciation of an expensive asset.

Platform churn (new OS versions, changing APIs, shifting runtime environments) makes software expensive to maintain over time. This increases the cost of development through depreciation. This is painful for anyone that wants to create software, from solo developers, educators, researchers, and to non-software businesses. By making software trivially hostable, portable and executable, Lopecode lowers the **total cost of ownership** when writing custom code. One reason we have subscription pricing is because of the absurd cost of software maintenance.

### Durability increases reuse

Software that works years later is software that can make impact over longer time horizons. Each fork is a chance for reuse or reinterpretation. A reactive notebook that runs, and can be debugged, is a more valuable artefact than a blog post with outdated dead code blocks. A lopecode document you have a copy of, cannot be broken by software changes made by others, or taken away from you.

### Durability as Ecosystem Infrastructure

Fast-moving platforms break content. Durable software, by contrast, provides a stable base for long-term knowledge creation. In science, we build on papers written decades ago. Why can’t we do the same with interactive software?

### Durability as a Design Constraint

By removing modern tooling (frameworks, cloud services, devops), Lopecode pushes toward systems that are understandable, inspectable, and self-reliant. This is a plus for software intended as a tool-for-thought.

As an example: React is a widely used frontend framework, but it's a durability liability. React apps typically depend on large toolchains, break between versions, and require active infrastructure. That’s makes sense for commercial software but a poor match for personal, commons owned software.

Lopecode aims for durability by radically reducing dependencies. First, it is a single file. Computer files have been around since the 60s, and are the simplest sharable replicable unit that have stood the test of time. Second, it has no network dependencies and therefore no server or DNS dependencies that require active network connectivity to work. Thirdly it's web, as opposed to an OS-specific native solution. Multiple vendors supply standards-compliant web clients, thus its only real external dependency has multiple free implementations for all major operating systems. Browser ship their own dev tools, enabling state of the art-of-the-art debugging experiences ecosystem compatability. Finally, it's self-hosting—there, is nothing else you need to work with it, as it bundles its own means of production.`
)};
const _17biunv = function _9(md){return(
md`## What I’m Exploring

Lopecode is both a platform and a hypothesis: that radically lowering the friction to share and remix interactive software will open up new possibilities for personal software, computational blogging, scientific publishing and educational media.

Imagine:

- A layman curating data-driven applications that solve their individual needs, customised from ecosystem forked notebooks. 
- A research paper that includes not just charts, but live models you can fork and adjust
- A blog post that’s also a playground that a motivated reader can download, run locally and modify.
- A demo that doesn’t decay that you can rely to operate the same way everytime you run it.

Most software today is brittle and ephemeral. Even well-crafted systems disappear when their hosting, dependencies, or toolchains break. Does programming need to be so fragile?

I’m interested in how much we can push toward this ideal by treating software more like durable documents.
`
)};
const _xcdr9t = function _10(url,md){return(
md`
## Connections I’m Seeking

Lopecode is still early, but I’d love to find collaborators or idea partners working on:

- **New programming languages or programming models** that want single file distribution and that can be compiled to JS (or WASM?). While the current iteration is very Javascript based, it actually ships its own [internal compiler](${url("@tomlarkworthy/observablejs-toolchain")}) and can support multiple languages (Observable supports SQL, HTML and markdown).
- **Computational publishing** (interactive articles, literate programming, explorable explanations)
- **Novel ideas worth replicating** Is there innovative ideas worth redoing on Lopecode e.g. live editing, VR coding. As all the interaction is userspace implemented, we can add other methods for authoring.
- **Multimodal or LLM-based interaction** (future directions I moving in)

If you’re building systems where:

- Offline-first is useful
- Modifiability is a goal
- Rich interactivity beyond code is desirable

...then maybe Lopecode could help. Or maybe your ideas could push it further.`
)};
const _vt5tly = function _11(md){return(
md`# Research Areas

The grand vision is self-perpetuating, never breaking, forever useful software. There are many research threads that could contribute towards that goal.`
)};
const _1uaem69 = function _12(md){return(
md`## How to make modification easy?

Lower the barrier of entry. Improve the development feedback loop. Simplify the programming model

- Spreadsheet like reactivity
  - New debugging paradigms as reactivity is complex at scale
- Data viz augmented programming e.g. direct manipulation
- Self-documenting architecture.
- Merging histories
- LLM modifications
- Polyglot language support`
)};
const _pi80zg = function _13(md){return(
md`## How to make reproduction easy

Engineering a format that is powerful but easily run. Immortal software is programming + developer tooling + data

- DOM representation
- Single file web bundling tricks
- Size minimization
- Cross domain local-first data transfer
- Multiplayer
- Social transmision
`
)};
const _1oizkw4 = function _14(md){return(
md`## How to make software useful?

- Data visualisation
- Underserved niches
- Valuable abstractions
- Teaching aids
`
)};
const _j0oqog = function _15(md){return(
md`# Inspiration`
)};
const _1b5u0ya = function _16(md){return(
md`

## local-first

https://www.inkandswitch.com/local-first/

"You own your data, in spite of the cloud" - Martin Kleppmann et al.


Seven ideals for local-first software
1. No spinners: your work at your fingertips
2. Your work is not trapped on one device
3. The network is optional
4. Seamless collaboration with your colleagues
5. The Long Now
6. Security and privacy by default
7. You retain ultimate ownership and control
`
)};
const _1tmninf = function _17(md){return(
md`## Digital Gardening
https://maggieappleton.com/garden-history

- Topography over Timelines
- Continuous Growth
- Imperfection & Learning in Public
- Playful, Personal, and Experimental
- Intercropping & Content Diversity
- Independent Ownership`
)};
const _g2n37l = function _18(md){return(
md`## Malleable Systems Collective

https://malleable.systems/

- Software must be as easy to change as it is to use it
- All layers, from the user interface through functionality to the data within, must support arbitrary recombination and reuse in new environments
- Tools should strive to be easy to begin working with but still have lots of open-ended potential
- People of all experience levels must be able to retain ownership and control
- Recombined workflows and experiences must be freely sharable with others
- Modifying a system should happen in the context of use, rather than through some separate development toolchain and skill set
- Computing should be a thoughtfully crafted, fun, and empowering experience`
)};
const _mn6dj6 = function _19(exporter){return(
exporter()
)};
const _19h9mgu = function _url(isObservable,linkTo){return(
(name) => {
  if (isObservable) {
    return `/${name}`;
  } else {
    return linkTo(name);
  }
}
)};
const _1i63u1w = function _isObservable(isOnObservableCom){return(
isOnObservableCom() &&
  !document.baseURI.startsWith(
    "https://observablehq.com/@tomlarkworthy/lopepage"
  )
)};
const _5qciao = function _26(uid){return(
uid()
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  main.define("module @tomlarkworthy/exporter-3", async () => runtime.module((await import("/@tomlarkworthy/exporter-3.js?v=4")).default));  
  main.define("module @tomlarkworthy/lopepage-urls", async () => runtime.module((await import("/@tomlarkworthy/lopepage-urls.js?v=4")).default));  
  main.define("module @tomlarkworthy/runtime-sdk", async () => runtime.module((await import("/@tomlarkworthy/runtime-sdk.js?v=4")).default));  
  main.define("module @tomlarkworthy/reactive-reflective-testing", async () => runtime.module((await import("/@tomlarkworthy/reactive-reflective-testing.js?v=4")).default));  
  main.define("module @tomlarkworthy/debugger", async () => runtime.module((await import("/@tomlarkworthy/debugger.js?v=4")).default));  
  main.define("module @tomlarkworthy/editable-md", async () => runtime.module((await import("/@tomlarkworthy/editable-md.js?v=4")).default));  
  $def("_1f8i73v", null, ["md"], _1f8i73v);  
  $def("_1ywjm5j", null, ["md"], _1ywjm5j);  
  $def("_eprdhc", null, ["md"], _eprdhc);  
  $def("_wfyjci", null, ["md"], _wfyjci);  
  $def("_1sl2j9l", null, ["url","md"], _1sl2j9l);  
  $def("_1mn66y9", null, ["architecture","htl"], _1mn66y9);  
  $def("_1vwiujk", null, ["md"], _1vwiujk);  
  $def("_ep7sgw", null, ["md"], _ep7sgw);  
  $def("_17biunv", null, ["md"], _17biunv);  
  $def("_xcdr9t", null, ["url","md"], _xcdr9t);  
  $def("_vt5tly", null, ["md"], _vt5tly);  
  $def("_1uaem69", null, ["md"], _1uaem69);  
  $def("_pi80zg", null, ["md"], _pi80zg);  
  $def("_1oizkw4", null, ["md"], _1oizkw4);  
  $def("_j0oqog", null, ["md"], _j0oqog);  
  $def("_1b5u0ya", null, ["md"], _1b5u0ya);  
  $def("_1tmninf", null, ["md"], _1tmninf);  
  $def("_g2n37l", null, ["md"], _g2n37l);  
  $def("_mn6dj6", null, ["exporter"], _mn6dj6);  
  main.define("exporter", ["module @tomlarkworthy/exporter-3", "@variable"], (_, v) => v.import("exporter", _));  
  $def("_19h9mgu", "url", ["isObservable","linkTo"], _19h9mgu);  
  main.define("linkTo", ["module @tomlarkworthy/lopepage-urls", "@variable"], (_, v) => v.import("linkTo", _));  
  $def("_1i63u1w", "isObservable", ["isOnObservableCom"], _1i63u1w);  
  main.define("isOnObservableCom", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("isOnObservableCom", _));  
  main.define("architecture", ["module @tomlarkworthy/reactive-reflective-testing", "@variable"], (_, v) => v.import("architecture", _));  
  $def("_5qciao", null, ["uid"], _5qciao);  
  main.define("uid", ["module @tomlarkworthy/debugger", "@variable"], (_, v) => v.import("uid", _));  
  main.define("md", ["module @tomlarkworthy/editable-md", "@variable"], (_, v) => v.import("md", _));
  return main;
}