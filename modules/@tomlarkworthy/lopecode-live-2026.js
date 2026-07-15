const p0 = function _anonymous(md) {return (md`# Source-last programming`);};
const p1 = function _anonymous(md, externalLink) {return (md`*Tom Larkworthy — draft submission to ${ externalLink('LIVE 2026', 'https://liveprog.org/') }.*`);};
const _abstract = function _anonymous(md) {return (md`> **Abstract.** A business analyst in a regulated industry could not open a large CSV with Excel. We sent them an ad hoc column-trimming tool over Slack, transmitted as a single HTML file. That is self-serialization as a distribution primitive, which came from one of Lopecode's principles: the runtime is the source of truth.
>
> Most programming systems are format-first: a canonical saved representation — \\\`.ipynb\\\`, an image dump, a document schema that the system loads. Lopecode is *source-last*: there is no external source code or canonical serialized representation; the only canonical representation is the live executing system. When source code is needed, functions are decompiled on demand starting from \`Function.prototype.toString()\`. Serialization becomes a projection to one of many formats: a standalone HTML file, a JavaScript IIFE or an ATProto PDS. Format-independence is a consequence of runtime-primacy. Furthermore, we claim runtime-primacy also leads to simpler implementations of malleability and liveness, by admitting a plurality of non-source based editing surfaces.
>
> We share three field episodes where Lopecode's format agnosticism shone: shipping a tool into a locked-down corporate environment; liberating a running program from a notebook SaaS; and freezing an AI-co-created music jam into a document shared over WhatsApp.`);};
const s1h = function _anonymous(sec) {return (sec('ship'));};
const s1p1 = function _anonymous(md) {return (md`A business analyst in a regulated industry, in another continent, could not open a large CSV export with their preferred tool, Excel. We knew almost nothing about their environment except that it was strict: corporate machines, no installing software, and data compliance. We built a small tool that trims columns from large CSVs, as a Lopecode notebook, and sent the single HTML file over Slack. They double-clicked it. The tool ran offline in their browser, and they were able to reexport a trimmed CSV that could be loaded by Excel.`);};
const s1p2 = function _anonymous(md) {return (md`Nothing about the tool is interesting. What is interesting is that it is actually very hard to share a program to non-programmers in 2026. Native binaries and cloud services are not safe in corporate environments. The browser is an ideal runtime because it is sandboxed and present on every operating system. A single HTML file does not require cross-origin requests, so it can be double-clicked and it just works. So a pragmatic option to distribute code is a self-enclosed file that can travel on email and instant messenger.`);};
const s1p3 = function _anonymous(md,aside) {return (md`${ aside('CSV column chooser', '@tomlarkworthy/csv-column-chooser') } is a copy of the actual tool shared`);};
const s2h = function _anonymous(sec) {return (sec('claim'));};
const s2p1 = function _anonymous(md,aside,ref) {return (md`Most programming systems are format-first: a save format is the canonical representation, and the live system is a runtime that loads it. Jupyter loads \`.ipynb\`. Smalltalk saves and loads to its image. A browser page loads HTML. Lopecode inverts the arrangement in the pursuit of liveness and malleability. The canonical representation *is* the live runtime: a graph of modules containing pure JavaScript functions, executed by a reactive scheduler. When a serialized form is needed, it is computed on demand by reflection. Because no format is canonical, the same runtime can be projected to different serialized representations.

Make the runtime the source of truth and serialization becomes a projection, so format-independence follows. We call the design *source-last*: source code still exists, but it is recovered last, on demand, from the running system, rather than maintained as the canonical artifact.

The same arrangement applies to program editors as well. Since the live runtime is the single thing every tool reads and writes, editing surfaces specialize and coexist: ${ aside('editor-5', '@tomlarkworthy/editor-5') } edits cells as source; ${ aside('editable-md', '@tomlarkworthy/editable-md') } makes rendered prose directly editable; and ${ aside('sticky', '@tomlarkworthy/sticky') } (${ ref('copy') }), a higher order UI lens that transforms User manipulations into function updates. All three are unprivedged userspace modules.`);};
const s2x1 = function _anonymous(experiment,md,aside) {return (experiment(md`**Try ${ aside('editable-md', ['@tomlarkworthy/editable-md']) }.** Click any paragraph of this essay: it opens in a live markdown editor. The prose is cells, and the editor is a userspace module riding in the same file. If you open the code editor as well, you will notice that changing and committing (SHIFT + ENTER) will update the other view`));};
const _claimDiagram = function _claimDiagram(htl) {
    const W = 720, H = 210;
    const box = (x, y, w, h, fill, stroke) => htl.svg`<rect x="${ x }" y="${ y }" width="${ w }" height="${ h }" rx="7" fill="${ fill }" stroke="${ stroke }" stroke-width="1.2"/>`;
    const label = (x, y, t, weight = 600, size = 12, op = 1) => htl.svg`<text x="${ x }" y="${ y }" text-anchor="middle" font-size="${ size }" font-weight="${ weight }" fill="currentColor" fill-opacity="${ op }">${ t }</text>`;
    const arrow = (x1, y1, x2, y2) => htl.svg`<line x1="${ x1 }" y1="${ y1 }" x2="${ x2 }" y2="${ y2 }" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#ll26arrow)"/>`;
    return htl.svg`<svg viewBox="0 0 ${ W } ${ H }" style="max-width:${ W }px;width:100%;height:auto;color:inherit;font-family:system-ui,-apple-system,sans-serif">
    <defs><marker id="ll26arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" fill-opacity="0.5"/></marker></defs>
    ${ label(180, 24, 'format-first', 700, 14) }
    ${ box(80, 40, 200, 36, '#c96a6a22', '#c96a6a') }
    ${ label(180, 62, 'save format (canonical)', 600, 12) }
    ${ arrow(180, 76, 180, 108) }
    ${ box(80, 110, 200, 36, '#6f9ed622', '#6f9ed6') }
    ${ label(180, 132, 'runtime (must conform)', 600, 12) }
    ${ label(180, 175, 'one format · runtime lags it', 400, 10.5, 0.65) }
    ${ label(540, 24, 'runtime-first (Lopecode)', 700, 14) }
    ${ box(440, 40, 200, 36, '#6f9ed622', '#6f9ed6') }
    ${ label(540, 62, 'live runtime (canonical)', 600, 12) }
    ${ arrow(480, 76, 420, 120) }
    ${ arrow(540, 76, 540, 120) }
    ${ arrow(600, 76, 660, 120) }
    ${ box(345, 122, 150, 30, '#7fbf7f22', '#7fbf7f') }
    ${ label(420, 141, 'HTML file', 600, 11) }
    ${ box(505, 122, 110, 30, '#7fbf7f22', '#7fbf7f') }
    ${ label(560, 141, 'JS IIFE', 600, 11) }
    ${ box(625, 122, 90, 30, '#7fbf7f22', '#7fbf7f') }
    ${ label(670, 141, 'ATProto', 600, 11) }
    ${ label(540, 175, 'formats are projections · plural, downstream', 400, 10.5, 0.65) }
  </svg>`;
};
const s3h = function _anonymous(sec) {return (sec('cell'));};
const s3p1 = function _anonymous(md,externalLink) {return (md`Here is a simple Lopecode program. Three cells:

1. \`constant\` holds a number

2. \`fun\` holds a function

3. \`result\` applies one to the other, implying both are dependencies.

Edit \`constant\` or \`double\` and \`result\` recomputes, spreadsheet-fashion. The reactive model is Observable's ${ externalLink('JavaScript in Observable', 'https://observablehq.com/collection/@observablehq/javascript-in-observable') }`);};
const _constant = function _constant() {return (30);};
const _double = function _fun() {return (x => x * 2);};
const _result = function _result(fun,constant) {return (fun(constant));};
const _cellSource = async function _cellSource(constant,fun,result,lookupVariable,essayModule,md,cite) {
    constant, fun, result;
    const [c, dv, rv] = await Promise.all([
        lookupVariable('constant', essayModule),
        lookupVariable('fun', essayModule),
        lookupVariable('result', essayModule)
    ]);
    return md`What matters for this essay is what a cell is made of. A cell is stored as a pure JavaScript function *from its dependencies to its value*, and JavaScript functions carry their own source ${ cite('tc39tostring') }. The block below shows what happens when the live cell's definitions are stringified with \`toString\`.


\`\`\`js
lookupVariable('constant', ...)._definition.toString()
  
> ${ c._definition.toString() }
\`\`\`
  
\`\`\`js
lookupVariable('constant', ...)._definition.toString()
  
> ${ dv._definition.toString() }
\`\`\`

\`\`\`js
lookupVariable('constant', ...)._definition.toString()

> ${ rv._definition.toString() }
\`\`\`

That one call, \`Function.prototype.toString()\`, is the reflective interface Lopecode builds on. The runtime does not keep the text you typed anywhere; when source is needed to edit or to export, it is recovered from the executing function.

Note, recovered functions do *not* contain closure variables. \`toString()\` cannot see captured variables but due to the reactive runtime design a cell closes over nothing; everything it uses arrives as a parameter, so the recovered source is the complete definition.`;
};
const s3x1 = function _anonymous(experiment,md,aside) {return (experiment(md`**Try it.** Ensure *Edit mode* in the burger menu is on, and click edit under \`double\` to open ${ aside('editor-5', ['@tomlarkworthy/editor-5']) }'s source editor and change the code to \`(x) => x * 3\`. Note \`result\` recomputes, and the decompiled listing refreshes.`));};
const s3p2 = function _anonymous(md,aside,cite,ref) {return (md`\`toString()\` only recovers the low-level *compiled* JavaScript, not the high level notebook-syntax text as the author wrote it. The ${ aside('observablejs-toolchain', '@tomlarkworthy/observablejs-toolchain') } is lensed ${ cite('foster2007lenses') }, so the ill-posed problem of decompilation ${ cite('kell2024source') } is avoided by construction. The known failures of this property are listed in ${ ref('limits') }.`);};
const s4h = function _anonymous(sec) {return (sec('modular'));};
const s4p1 = function _anonymous(md,ref,aside) {return (md`The coarse unit of composition in the reactive runtime is the module, a namespace of cells. It is visualized as a notebook, and a single runtime can contain many notebooks. A running system is a set of modules importing values from each other. Imports may be mutually recursive between modules; the cell-level dependency graph stays acyclic, which is what keeps recomputation well-defined.

The single HTML rendering is one mapping of that structure, and ${ ref('mappings') } covers the others. You can inspect the live module graph of this very system with ${ aside('module-map', '@tomlarkworthy/module-map') }, and the fine grained cell interdependancies with ${ aside('cell-map', '@tomlarkworthy/cell-map') }.`);};
const s5h = function _anonymous(sec) {return (sec('copy'));};
const s5p1 = function _anonymous(md, downloadAnchor, forkAnchor, ref) {return (md`The burger menu at the top of this pane offers *Save in place*, *Download*, *Edit mode* and *Fork*. Inline works too: download a ${ downloadAnchor({}, 'copy') } of this essay, or fork it into a fresh browser ${ forkAnchor({}, 'tab') }. Either copy carries everything — the prose, the tooling, and any edit you made to \`double\` in ${ ref('cell') } — because the exporter is a userspace module that reads the runtime it is part of. There is no build step and no server. Most of this essay is an account of what it takes for a copy to be this cheap.`);};
const _dialView = function _dial(sticky, Inputs) {return (
  sticky(Inputs.range([0, 100], { label: 'dial', step: 1, value: 50 }), 50)
);};
const _dial = (G, _) => G.input(_);
const s5p2 = function _anonymous(md, dial, ref, cite, aside) {return (md`State travels the same way. The slider above is wrapped in ${ aside('sticky', ['@tomlarkworthy/sticky']) }, an imported userspace module: on each committed change it parses its own cell's definition with acorn and rewrites the persistence slot to the current value — a silent definition swap, with no recompute and no focus loss. The runtime sees an ordinary reactive value (currently ${ dial }). Set the slider, then take the download above: the copy opens where you left it. In a format-first system, remembering a control means writing to the save file. Here the cell edits itself in the live runtime, and every projection — file, fork, record — catches up at the next save. This is the quality ${ cite('horowitz2023lrc') } find missing in Observable — "this UI cannot persistently modify an underlying program" — supplied as an importable userspace module rather than a privileged platform feature.`);};
const s5x1 = function _anonymous(experiment, md) {return (experiment(md`**Try it.** Drag the dial above, then toggle *Edit mode* in the burger menu and open the dial's cell: the second argument of \`sticky(...)\` holds the value you just set. Close the editor, drag again, reopen — the source rewrites itself on every committed change.`));};
const _stickyDiagram = async function _stickyDiagram(mermaid) {
  const svg = await mermaid`sequenceDiagram
  actor U as author
  participant E as editor-5
  participant T as observablejs-toolchain
  participant R as observable-runtime-v6
  participant S as sticky
  U->>E: types sticky(Inputs.range(...), 50)
  E->>T: compile (high → low)
  T->>R: define(function _dial(sticky, Inputs) { … 50 … })
  U->>S: drags the slider to 83
  S->>R: toString() ⇒ function _dial(sticky, Inputs) { … 50 … }
  Note over S: acorn patches the slot
  S->>R: swaps in function _dial(sticky, Inputs) { … 83 … } — silent, no recompute
  U->>E: opens the cell
  E->>R: toString() ⇒ function _dial(sticky, Inputs) { … 83 … }
  E->>T: decompile (low → high)
  T-->>E: sticky(Inputs.range(...), 83)
  E-->>U: shows sticky(Inputs.range(...), 83)`;
  // restyle to the page theme: currentColor-derived fills, like the other diagrams
  if (!svg.id)
    svg.id = 'sticky-seq';
  const id = '#' + svg.id;
  const style = document.createElement('style');
  style.textContent = `
    ${ id } { color: inherit; }
    ${ id } text, ${ id } tspan { fill: currentColor !important; }
    ${ id } line { stroke: currentColor !important; }
    ${ id } .actor-line { stroke-opacity: 0.25 !important; }
    ${ id } .messageLine0, ${ id } .messageLine1 { stroke-opacity: 0.6 !important; }
    ${ id } rect.actor { fill: color-mix(in srgb, currentColor 7%, transparent) !important; stroke: color-mix(in srgb, currentColor 45%, transparent) !important; }
    ${ id } circle { fill: color-mix(in srgb, currentColor 7%, transparent) !important; stroke: currentColor !important; }
    ${ id } .note { fill: color-mix(in srgb, currentColor 10%, transparent) !important; stroke: color-mix(in srgb, currentColor 40%, transparent) !important; }
    ${ id } marker path { fill: currentColor !important; stroke: none !important; }
  `;
  svg.appendChild(style);
  // actor labels navigate to the module's aside layout; works in blob: forks
  const targets = {
    'editor-5': '@tomlarkworthy/editor-5',
    'observablejs-toolchain': '@tomlarkworthy/observablejs-toolchain',
    'observable-runtime-v6': '@tomlarkworthy/observable-runtime-v6',
    'sticky': '@tomlarkworthy/sticky'
  };
  for (const t of svg.querySelectorAll('text')) {
    const target = targets[t.textContent.trim()];
    if (!target)
      continue;
    t.style.cursor = 'pointer';
    t.style.textDecoration = 'underline';
    t.addEventListener('click', () => {
      const h = `#view=R100(S50(@tomlarkworthy/lopecode-live-2026),S50(${ target }))`;
      window.history.pushState(null, '', h);
      window.dispatchEvent(new window.HashChangeEvent('hashchange'));
    });
  }
  return svg;
};
const s5p3 = function _anonymous(md, cite, ref) {return (md`Every arrow above runs through the reflective waist. Authoring is high-level: notebook syntax is compiled to a plain JavaScript function and evaluated into the runtime. \`sticky\` operates entirely at the low level: on a committed change it recovers its own cell's source with \`toString()\`, patches one literal with acorn, and evaluates the patch back — the runtime never recomputes. When the author next opens the cell, the editor recovers the low-level source and decompiles it to notebook syntax, updated literal included. The compiler/decompiler pair is a *lens* in the sense of the bidirectional-programming literature ${ cite('foster2007lenses') } — the construction Cambria applies to live document schemas ${ cite('litt2020cambria') }: the executing function is the concrete source of truth, notebook syntax is the view, and edits on either side must round-trip. The decompilability invariant of ${ ref('cell') } is the lens law holding across the whole runtime; ${ ref('limits') } lists where it does not.`);};
const s6h = function _anonymous(sec) {return (sec('mappings'));};
const s6p1 = function _anonymous(md, ref) {return (md`Lopecode currently maintains three mappings. Each is a userspace module, and they share nothing with each other beyond the reflection described in ${ ref('cell') }.`);};
const s6bh = function _anonymous(sec) {return (sec('html'));};
const s6bp1 = function _anonymous(md, aside) {return (md`The HTML mapping stores each unit of the module graph as a \`<script type="text/plain">\` block: one block per module holding its decompiled source, one MIME-typed block per file attachment, and a \`bootconf.json\` naming what to boot. A short ${ aside('bootloader', ['@tomlarkworthy/bootloader']) } at the top starts the Observable runtime and resolves imports from the embedded blocks instead of the network. The file is plain text, diffs cleanly under git, and opens from \`file://\` with no server.`);};
const _containerInventory = function _containerInventory(Inputs, md, htl) {
  const blocks = Array.from(document.querySelectorAll('script[type="text/plain"]')).map((s) => ({
    id: s.id,
    mime: s.dataset.mime || '',
    encoding: s.dataset.encoding || 'utf-8',
    bytes: s.textContent.length
  }));
  return htl.html`<div>
    ${ md`This essay inspecting its own container — every \`<script type="text/plain">\` block in the file you are reading (${ blocks.length } blocks):` }
    ${ Inputs.table(blocks, { rows: 12 }) }
  </div>`;
};
const _ownBlockPeek = function _ownBlockPeek(md) {
  const el = document.getElementById('@tomlarkworthy/lopecode-live-2026');
  const src = el ? el.textContent.trimStart().slice(0, 350) : '(module block not found — running outside the container)';
  return md`The stored form of *this very module*, as it sits in the HTML mapping (first 350 characters). It goes stale as you edit and is refreshed on the next save, because the block is a projection of the runtime and never the other way around:

\`\`\`js
${ src }…
\`\`\``;
};
const s6bx1 = function _anonymous(experiment, md, ref) {return (experiment(md`**Try it.** Edit any cell — \`double\` in ${ ref('cell') }, or this very paragraph in *Edit mode* — and the stored block above does not change: the runtime has moved and the projection is stale. Now *Fork* from the burger menu (or the inline link in ${ ref('copy') }): the fork is written from the runtime, so it opens carrying your edit.`));};
const s6ah = function _anonymous(sec) {return (sec('atproto'));};
const s6ap1 = function _anonymous(md, externalLink, ref, aside) {return (md`The same graph maps onto ATProto, the decentralized protocol behind Bluesky: a record of type \`com.lopecode.bundle\` whose entries are MIME-typed blobs — the same typed units as the script blocks, carried in a content-addressed repository tied to an identity. Publication is a burger-menu action in this essay, provided by the bundled ${ aside('at-write', ['@tomlarkworthy/at-login', '@tomlarkworthy/at-write']) } modules. The base synthesizer used in ${ ref('jam') } was itself fetched from such a record, served at ${ externalLink('lopecode.com', 'https://did-plc-j7nm3lrd5h7fm3sfhcv3lhfv.lopecode.com/r/coding-tools') }. The lexicon is not yet hosted for resolution, so discovery is manual; publication and retrieval work today.`);};
const s6ch = function _anonymous(sec) {return (sec('iife'));};
const s6cp1 = function _anonymous(md, ref) {return (md`The exporter's *Copy To JS* renders the runtime as a single immediately-invoked script expression on the clipboard. This is an unloader for the HTML mapping: pasted into any page that will execute a script, it reconstructs the whole environment inside that page, bringing a live editable runtime into an origin we do not control. The costs are set by the host — content-security policy blocks inline script on many sites, and the injected environment shares the host's origin, which is a capability and a hazard in equal measure (${ ref('limits') }).`);};
const s7h = function _anonymous(sec) {return (sec('liberation'));};
const s7p1 = function _anonymous(md) {return (md`The reflective interface also works on runtimes booted by someone else. ObservableHQ.com is the hosted notebook service Lopecode grew out of. Notebooks there are compiled on Observable's servers; the source of record lives in their database, and the browser only ever receives the compiled program. Observable's own export paths use privileged knowledge of that source: the embed API is a server endpoint, and the runtime export is a multi-file bundle of compiled code that needs a local webserver to open and contains no source at all. What you get is an embedding. It runs, but it carries no editors and cannot export itself again.`);};
const s7p2 = function _anonymous(md,aside,externalLink,cite,ref) {return (md`The ${ aside('exporter', '@tomlarkworthy/exporter-3') } — also published on Observable as ${ externalLink('exporter-3', 'https://observablehq.com/@tomlarkworthy/exporter-3') } — takes the reflective route. Imported into any notebook on the platform, it scans the live runtime in the page, decompiles what it finds, and writes a single Lopecode HTML file. We have no access to Observable's stored source and do not need it. The difference is transitive: an artifact made by reflection contains the exporter's own machinery, so it can re-export — you can even export exporter-3 with itself. The copy is then independent of the platform. For larger extractions — several notebooks, their file attachments, a chosen UI — ${ externalLink('jumpgate', 'https://observablehq.com/@tomlarkworthy/jumpgate') } drives the same reflection with more tooling for composing arbitrary mixtures of modules; it is how the content repositories behind this essay are maintained.

To be precise about scope: this liberates a *copy*; the hosted original remains. And it works because Observable is a cooperative host — live programming in territory the programmer does not control, the condition ${ cite('shank2025hostile') } examine. ${ ref('limits') } describes hosts that fight back.`);};
const s8h = function _anonymous(sec) {return (sec('container'));};
const s8p1 = function _anonymous(md, aside, ref) {return (md`The file you are reading holds more than this essay. The ${ aside('CSV tool', ['@tomlarkworthy/csv-column-chooser']) } from ${ ref('ship') } is here. So are a ${ aside('music application', ['@tomlarkworthy/butter-synth']) } (${ ref('jam') }) and an ${ aside('agent', ['@tomlarkworthy/robocoop-4']) } (${ ref('agent') }). Every blue in-page link in this essay is ordinary lopepage navigation: a hash URL naming a layout of modules, which you can also just type. Toggle *Edit mode* in the burger menu and every paragraph becomes an editable cell — this essay was written in itself.

Composing modules into a container is the same ad hoc module mixing that jumpgate performs on Observable in ${ ref('liberation') }, pointed at a file we own. Reading, authoring and distribution happen in the same medium.`);};
const s9h = function _anonymous(sec) {return (sec('jam'));};
const s9p1 = function _anonymous(md, aside, ref) {return (md`The base application was ${ aside('butter-synth', ['@tomlarkworthy/butter-synth']) }, a small synth-pad instrument, fetched from the ATProto record in ${ ref('atproto') }. In a session with a music teacher — a domain expert, not a programmer — the polite verdict was that it sounded basic. So we asked the in-runtime agent for better music-production sounds, and it wrote new instruments and effects, with presets, as ordinary cells in the running application. The feedback was immediate and audible; the teacher directed, the agent programmed. When the session ended we saved the file and sent a copy over WhatsApp.`);};
const s9p2 = function _anonymous(md, aside, ref) {return (md`The copy is the point. The agent's contributions were cell definitions, so decompilation captured them exactly as it captures human-written cells: the exported file contains the new effects chain, still live. The version bundled in this essay is the one saved that day — diffing it against the ATProto base shows what the agent added: a tape-saturation stage, a chorus, reverb pre-delay, and a dub delay it titled *"Dub Echo (Safe from Harm)"*, after the Massive Attack track whose sound was being chased. ${ aside('Play it', ['@tomlarkworthy/butter-synth']) }.

A recording of the session would have captured the sound; the document captured the *instruments*. To be precise about what survives: definitions and declared state (writable file attachments) serialize; transient values do not — they recompute on boot, unless deliberately promoted into a definition, as the slider in ${ ref('copy') } does. Ephemeral, machine-generated code became a durable artifact because serialization reads the runtime, and the runtime is where that code lived.`);};
const s10h = function _anonymous(sec) {return (sec('agent'));};
const s10p1 = function _anonymous(md, aside, ref, cite) {return (md`${ aside('robocoop', ['@tomlarkworthy/robocoop-4']) }, the agent used in the jam, executes inside the runtime as a dataflow program: it reads program state as well as code, and modifies cells through the same reflective interface the human editors use. This inverts the usual topology of AI-assisted programming. A coding harness such as Claude Code lives in the developer's environment and operates on source files, and the application ships separately, without it. Here the runtime, the editors, the agent harness and the application are a single bundle: what ships is the entire site of the application's development.

The consequence is personal histories. Every copy is a complete development environment, so each copy can evolve independently of any canonical upstream. The music teacher's copy of the jam contains the new instruments and the means — editors, agent, exporter — to keep changing them, independently of us and of any server. Among this document's background jobs is a ${ aside('change recorder', ['@tomlarkworthy/local-change-history']) }, so a copy's edits are logged and replayable — version history kept inside the artifact itself, a direction Backstitch is also pursuing for the Godot editor ${ cite('backstitch2026') }. Copies diverge into lineages owned by their holders; malleability survives distribution because the toolchain travels inside the artifact.

The corollary is that the agent is a per-artifact composition decision, not a platform property. The tool in ${ ref('ship') } went into a regulated environment carrying no agent. The jam carried one, because a generative collaborator was the point. Match what rides along to the sensitivity of the destination.`);};
const s11h = function _anonymous(sec) {return (sec('waist'));};
const s11p1 = function _anonymous(md, cite, ref) {return (md`What is the irreducible, non-userspace core? Below the line sit the browser, es-module-shims for import interception, the Observable runtime (6.5 KB) and a bootloader; a minimal Lopecode file is about 48 KB. Everything else demonstrated in this essay is userspace. The interface between the two layers is narrow, in the manner of the Internet's hourglass ${ cite('beck2019hourglass') }, and its reflective half is a single web standard: \`Function.prototype.toString()\`. The waist is specified: the stage-4 toString revision requires the returned string to be the function's actual source text ${ cite('tc39tostring') }, and the same specification names the conditions under which a host may withhold it, a limit we return to in ${ ref('limits') }.`);};
const _hourglassDiagram = function _hourglassDiagram(htl) {
    const W = 620, H = 280;
    const box = (x, y, w, h, fill, stroke) => htl.svg`<rect x="${ x }" y="${ y }" width="${ w }" height="${ h }" rx="7" fill="${ fill }" stroke="${ stroke }" stroke-width="1.2"/>`;
    const label = (x, y, t, weight = 600, size = 12, op = 1) => htl.svg`<text x="${ x }" y="${ y }" text-anchor="middle" font-size="${ size }" font-weight="${ weight }" fill="currentColor" fill-opacity="${ op }">${ t }</text>`;
    return htl.svg`<svg viewBox="0 0 ${ W } ${ H }" style="max-width:${ W }px;width:100%;height:auto;color:inherit;font-family:system-ui,-apple-system,sans-serif">
    ${ box(60, 20, 500, 70, '#7fbf7f18', '#7fbf7f') }
    ${ label(310, 42, 'userspace (replaceable)', 700, 13) }
    ${ label(310, 62, 'editors · debugger · tests · exporter · mappings (HTML / IIFE / ATProto) · agents', 400, 11, 0.75) }
    <path d="M 160 90 L 460 90 L 340 135 L 280 135 Z" fill="#6f9ed618" stroke="#6f9ed6" stroke-width="1.2"/>
    ${ box(240, 137, 140, 30, '#e0b25222', '#e0b252') }
    ${ label(310, 156, 'Function.prototype.toString()', 700, 10.5) }
    <path d="M 280 169 L 340 169 L 460 214 L 160 214 Z" fill="#6f9ed618" stroke="#6f9ed6" stroke-width="1.2"/>
    ${ box(60, 216, 500, 50, '#b57fc918', '#b57fc9') }
    ${ label(310, 236, 'browser JS engine + Observable reactive runtime', 700, 12) }
    ${ label(310, 253, 'the platform: standard, not ours, not moldable from within', 400, 10.5, 0.65) }
  </svg>`;
};
const s11p2 = function _anonymous(md, externalLink, cite, aside) {return (md`The narrow waist pays twice. First, it lets tooling be *uncoordinated*. ${ aside('editable-md', ['@tomlarkworthy/editable-md']) } (the prose editing in this page), ${ aside('editor-5', ['@tomlarkworthy/editor-5']) } (the code editor behind Edit mode), the exporter, the debugger and the agent do not know about each other. Each reads and writes the runtime through the same reflective interface, so a new editor is a module you import, not a fork of the system. Second, the waist is a web standard rather than a private VM interface, so the artifact inherits the browser's backwards-compatibility discipline. Our first, embarrassing export from January 2025 ${ externalLink('still opens', 'https://raw.githubusercontent.com/tomlarkworthy/lopecode/459c924658b8a18fe46a51719c1ab2de36a839a7/webpage.html') }.

In the vocabulary of BootstrapLab ${ cite('jakubovic2022ladder') }: the *platform* is the browser plus the Observable runtime; the *substrate* is the script-block container plus the reflection SDK; everything above is *product*. Lopecode did not ascend from a low-level instruction set — it inherited a high platform and closed the loop by making the producer, the exporter, an ordinary userspace module.`);};
const s12h = function _anonymous(sec) {return (sec('related'));};
const s12p1 = function _anonymous(md, cite, ref) {return (md`The form of this submission follows ${ cite('edwards2019') }. That paper criticizes LIVE-style venues for work "presented informally, through screencasts", lacking related work, and proposes the interactive essay, evaluated by inquiry, as the remedy — while naming the archival fragility of web essays as an open difficulty, "easier to address if they are self-contained". This essay is submitted as evidence on that point: an interactive essay that is self-contained by construction, carries its own tooling, and re-exports itself. We adopt their author guidelines, including the requirement for problematic examples (${ ref('limits') }).`);};
const s12p2 = function _anonymous(md, cite) {return (md`${ cite('jakubovic2023techdims') } define a programming system as "an integrated and complete set of tools sufficient for creating, modifying, and executing programs", which is the register in which Lopecode asks to be judged: it is not a language and not a library. Their design-space maps observe "a conspicuous blank space at the top-right" where high self-sustainability meets high notational diversity; Lopecode sits toward that corner, re-serializing itself while its notation spans prose, code, widgets and whole userspace UIs. ${ cite('jakubovic2022ladder') } define self-sustainability as dissolving the product/source/producer distinction, and reach it by ascending from a minimal substrate. Their persistence, notably, was a manual walk of the state graph to a JSON file — "reminiscent of the image-based persistence in Smalltalk, though it is frustratingly manual". The exporter is Lopecode's answer to exactly that problem, and it adds the axis their account leaves open: the product is a single runtime-free file, so persistence doubles as dissemination.`);};
const s12p2b = function _anonymous(md, cite, aside) {return (md`The mechanism belongs to the reflection literature. ${ cite('smith1984reflection') } introduced procedural reflection — a program able to represent and act on its own state. ${ cite('maes1987reflection') } named the general property *computational reflection* and reified it as metaobjects. ${ cite('kiczales1991amop') } turned reflection into an engineering practice: expose the implementation to userspace as a metaobject protocol. Lopecode's ${ aside('runtime SDK', ['@tomlarkworthy/runtime-sdk']) } is a metaobject protocol in that engineering sense — the editors, the exporter and the agent are metaprograms written against it — though the reflection on offer is deliberately coarse: whole definitions are read and written, and there is no intercession in the scheduler.`);};
const s12p3 = function _anonymous(md, cite) {return (md`The exporter is a *mirror* in the sense of ${ cite('bracha2004mirrors') }: a meta-level facility separated from the base program (their *stratification*) that reifies the runtime's own categories — modules, cells and attachments map one-to-one onto script blocks (their *ontological correspondence*). Bracha and Ungar motivate mirrors by "significant advantages with respect to distribution, deployment and general purpose metaprogramming"; a mirror whose output is a deployable artifact takes that motivation literally.`);};
const s12p4 = function _anonymous(md, cite) {return (md`The comparison Lopecode invites most is the Smalltalk image ${ cite('ingalls1981') }. An image persists a whole live world, and so does a Lopecode file. The differences are the point: an image is an opaque memory dump bound to its VM, where the Lopecode mapping is legible text bound to a web standard; and Smalltalk is imperative message-passing where Lopecode is reactive dataflow. We cite Smalltalk for image persistence and total moldability, not as an architectural analogy. Squeak sharpened the self-description end of that tradition — a Smalltalk whose virtual machine is written in itself ${ cite('ingalls1997squeak') }; its producer is a translator that emits a VM, where Lopecode's producer is an exporter that emits a document.`);};
const s12p5 = function _anonymous(md, cite, ref) {return (md`${ cite('miranda2025singlehtml') } is the closest recent precedent: single HTML files that modify and save themselves. In our vocabulary his file is the canonical artifact — format-first — where Lopecode's file is one projection among three. ${ cite('klokmose2015webstrates') } made the DOM itself the shared persistent substrate; again the persisted structure is the document. The mechanism specific to Lopecode is that the persisted form is decompiled on demand from live functions, which is what makes the projections plural and the export transitive (${ ref('liberation') }).`);};
const s12p6 = function _anonymous(md, cite, ref) {return (md`${ cite('litt2025malleable') } argue for software that users reshape at the point of use, and diagnose the wall between users and "engineering teams at distant corporations". A document that carries its own editors is one concrete form of point-of-use agency, and ${ ref('ship') } is a field report of it crossing an actual corporate wall. ${ cite('shank2025hostile') } name the adversarial conditions live programming meets outside the lab; our findings on hosts that defend themselves (${ ref('limits') }) are the same territory approached from the distribution side. ${ cite('horowitz2023lrc') } name persistence as the quality separating rich in-notebook widgets from programming: interactions with a rendered tool "cannot be 'saved' back to the notebook, and their effects will always disappear when the notebook is reloaded". A definition that is data a cell can rewrite (${ ref('copy') }) supplies that quality from userspace.`);};
const s12p7 = function _anonymous(md, cite, ref) {return (md`Outside research systems, decompilation is already how shipped software gets reopened. Minecraft's modding ecosystem stands on decompiling and re-mapping an obfuscated binary — the libre yarn mappings exist for exactly this ${ cite('fabricyarn') } — and the Super Mario 64 decompilation reconstructs buildable source from a ROM ${ cite('sm64decomp') }. Those communities work for years to recover what the vendor withheld. A source-last artifact withholds nothing: decompilation here is the system's ordinary read path, not an act of reverse engineering (${ ref('cell') }).`);};
const s13h = function _anonymous(sec) {return (sec('limits'));};
const s13p1 = function _anonymous(md, cite, ref) {return (md`Following the guideline in ${ cite('edwards2019') }: problems in roughly the same number as benefits.

**Not everything round-trips.** Serialization captures definitions and declared state. A cell holding an open WebSocket, a mid-flight generator, or DOM state accumulated outside a file attachment reboots to its definition, not to its moment. The sticky idiom of ${ ref('copy') } narrows the gap by rewriting chosen view state into the definition, but only for JSON-serializable values with commit semantics.

**Decompilation has edge cases.** \`toString()\` recovers compiled JavaScript; the inverse mapping back to notebook syntax is engineered, not free. Cross-module \`viewof\` imports are a known case that mangles on round-trip. A reactive test guards the decompilability invariant, and the low-level API is powerful enough to break it deliberately. The platform can also decline: the specification's \`HostHasSourceTextAvailable\` hook lets a host withhold source text entirely ${ cite('tc39tostring') }.

**No closures means not general JavaScript.** The recovered source is complete only because cells close over nothing (${ ref('cell') }). \`toString()\` cannot capture a closure environment, so the technique does not extend to programs that use closures for state — which is most idiomatic JavaScript. Source-last recovery is a property of the closure-free cell shape the compiler enforces, not of the language.

**The browser withholds the machine.** Arbitrary HTTP is subject to CORS, and raw TCP, processes and the local file system are unavailable, so whole classes of useful programs cannot be expressed. The same sandbox is why the file is a viable distribution format at all (${ ref('ship') }): the dangerous facilities of remote code execution are neutered by the environment itself.

**The moldability gradient is steep.** Changing a value or a paragraph is spreadsheet-grade. Replacing the exporter or the editor requires understanding the runtime SDK. We have no evidence yet that a non-programmer crosses that gradient unaided.

**A document that runs code is a phishing shape.** The same properties that carried the tool of ${ ref('ship') } through a corporate boundary would carry a malicious payload. Provenance and signing are unsolved for us. Plain-text legibility is a partial mitigation, and some email gateways rightly quarantine HTML attachments.

**Adversarial hosts win.** The injection direction of ${ ref('iife') } works on cooperative or self-owned pages. Commercial sites defend themselves: when we injected into Google Trends, the page disabled itself even with content-security policy turned off. Capture is a relationship with the host, not a universal right.

**Offline-first is manual labour.** Every dependency must be vendored into the file. We chose openness over conceptual integrity here, and the price is that adopting a library is a deliberate act, not an import statement.

> 🖊️ **TODO(wiring)** — add the live failing round-trip demo: a cell holding a WebSocket, exported, showing what the copy lost.`);};
const s14h = function _anonymous(sec) {return (sec('questions'));};
const s14p1 = function _anonymous(md, ref) {return (md`LIVE asks three questions of systems submissions. In brief:

**What did we discover that other researchers should know about?** Source-last design. When the live runtime is canonical and every cell carries recoverable source, serialization becomes a reflective projection. Distribution (${ ref('ship') }), cheap copies (${ ref('copy') }), format plurality (${ ref('mappings') }), liberation (${ ref('liberation') }), the capture of machine-generated code (${ ref('jam') }) and co-shipping the development environment itself (${ ref('agent') }) stop being separate features; they fall out of one mechanism.

**What previous systems are similar?** Image persistence in Smalltalk and Lisp; hosted reactive notebooks (Observable); document-first self-modifying files (Miranda, Webstrates); self-sustainable systems (BootstrapLab). ${ ref('related') } details where each differs — in one line: those persist a canonical artifact, we project a canonical runtime.

**Where are the limits?** ${ ref('limits') }: transient state does not round-trip, decompilation has edge cases, the moldability gradient is steep, the trust story is unsolved, adversarial hosts defend themselves, and offline-first vendoring is manual.`);};
const refsh = function _anonymous(md) {return (md`## References`);};
const _references = function _references(bibliography, externalLink, htl) {return (htl.html`<ol style="line-height:1.7">
  ${ Object.entries(bibliography).map(([key, e]) => htl.html`<li id="ref-${ key }">
    ${ e.authors } (${ e.year }). ${ externalLink(htl.html`<em>${ e.title }</em>`, e.url) }. ${ e.venue }.
  </li>`) }
</ol>`);};
const _cite = function _cite(bibliography, htl) {return ((key) => {
  const e = bibliography[key];
  if (!e) return htl.html`<strong style="color:#c96a6a">[missing ref: ${ key }]</strong>`;
  return htl.html`<a
    href="#"
    title="${ e.authors } (${ e.year }). ${ e.title }. ${ e.venue }."
    onclick=${ (ev) => { ev.preventDefault(); document.getElementById(`ref-${ key }`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); } }
  >[${ e.label }]</a>`;
});};
const _bibliography = function _bibliography() {return ({
  edwards2019: {
    label: 'Edwards et al. 2019',
    authors: 'Edwards, J., Kell, S., Petricek, T. & Church, L.',
    year: 2019,
    title: 'Evaluating programming systems design',
    venue: 'PPIG',
    url: 'https://www.ppig.org/files/2019-PPIG-30th-edwards.pdf'
  },
  jakubovic2023techdims: {
    label: 'Jakubovic et al. 2023',
    authors: 'Jakubovic, J., Edwards, J. & Petricek, T.',
    year: 2023,
    title: 'Technical Dimensions of Programming Systems',
    venue: 'The Art, Science, and Engineering of Programming',
    url: 'https://tomasp.net/techdims/'
  },
  jakubovic2022ladder: {
    label: 'Jakubovic & Petricek 2022',
    authors: 'Jakubovic, J. & Petricek, T.',
    year: 2022,
    title: 'Ascending the Ladder to Self-Sustainability: Achieving Open Evolution in an Interactive Graphical System',
    venue: 'Onward!',
    url: 'https://dl.acm.org/doi/10.1145/3563835.3568736'
  },
  bracha2004mirrors: {
    label: 'Bracha & Ungar 2004',
    authors: 'Bracha, G. & Ungar, D.',
    year: 2004,
    title: 'Mirrors: Design Principles for Meta-level Facilities of Object-Oriented Programming Languages',
    venue: 'OOPSLA',
    url: 'https://bracha.org/mirrors.pdf'
  },
  ingalls1981: {
    label: 'Ingalls 1981',
    authors: 'Ingalls, D.',
    year: 1981,
    title: 'Design Principles Behind Smalltalk',
    venue: 'BYTE',
    url: 'https://worrydream.com/refs/Ingalls_1981_-_Design_Principles_Behind_Smalltalk.pdf'
  },
  miranda2025singlehtml: {
    label: 'Miranda 2025',
    authors: 'Miranda, D.',
    year: 2025,
    title: 'Single HTML Files as Self-Modifying Web Applications',
    venue: 'LIVE 2025',
    url: 'https://liveprog.org/live-2025'
  },
  shank2025hostile: {
    label: 'Shank & Reed 2025',
    authors: 'Shank, C. & Reed, O.',
    year: 2025,
    title: 'Live Programming in Hostile Territory',
    venue: 'LIVE 2025',
    url: 'https://liveprog.org/live-2025'
  },
  klokmose2015webstrates: {
    label: 'Klokmose et al. 2015',
    authors: 'Klokmose, C.N., Eagan, J.R., Baader, S., Mackay, W. & Beaudouin-Lafon, M.',
    year: 2015,
    title: 'Webstrates: Shareable Dynamic Media',
    venue: 'UIST',
    url: 'https://dl.acm.org/doi/10.1145/2807442.2807446'
  },
  litt2025malleable: {
    label: 'Litt et al. 2025',
    authors: 'Litt, G., Horowitz, J., van Hardenberg, P. & Matthews, T.',
    year: 2025,
    title: 'Malleable Software: Restoring User Agency in a World of Locked-Down Apps',
    venue: 'Ink & Switch',
    url: 'https://www.inkandswitch.com/essay/malleable-software/'
  },
  beck2019hourglass: {
    label: 'Beck 2019',
    authors: 'Beck, M.',
    year: 2019,
    title: 'On the Hourglass Model',
    venue: 'Communications of the ACM 62(7)',
    url: 'https://dl.acm.org/doi/10.1145/3274770'
  },
  smith1984reflection: {
    label: 'Smith 1984',
    authors: 'Smith, B.C.',
    year: 1984,
    title: 'Reflection and Semantics in LISP',
    venue: 'POPL',
    url: 'https://dl.acm.org/doi/10.1145/800017.800513'
  },
  maes1987reflection: {
    label: 'Maes 1987',
    authors: 'Maes, P.',
    year: 1987,
    title: 'Concepts and Experiments in Computational Reflection',
    venue: 'OOPSLA',
    url: 'https://dl.acm.org/doi/10.1145/38765.38821'
  },
  kiczales1991amop: {
    label: 'Kiczales et al. 1991',
    authors: 'Kiczales, G., des Rivières, J. & Bobrow, D.G.',
    year: 1991,
    title: 'The Art of the Metaobject Protocol',
    venue: 'MIT Press',
    url: 'https://mitpress.mit.edu/9780262610742/the-art-of-the-metaobject-protocol/'
  },
  ingalls1997squeak: {
    label: 'Ingalls et al. 1997',
    authors: 'Ingalls, D., Kaehler, T., Maloney, J., Wallace, S. & Kay, A.',
    year: 1997,
    title: 'Back to the Future: The Story of Squeak, a Practical Smalltalk Written in Itself',
    venue: 'OOPSLA',
    url: 'https://dl.acm.org/doi/10.1145/263700.263754'
  },
  tc39tostring: {
    label: 'TC39 2018',
    authors: 'Ficarra, M. (ed.)',
    year: 2018,
    title: 'Function.prototype.toString Revision (stage-4 ECMA-262 proposal)',
    venue: 'Ecma TC39',
    url: 'https://tc39.es/Function-prototype-toString-revision/'
  },
  horowitz2023lrc: {
    label: 'Horowitz & Heer 2023',
    authors: 'Horowitz, J. & Heer, J.',
    year: 2023,
    title: 'Live, Rich, and Composable: Qualities for Programming Beyond Static Text',
    venue: 'PLATEAU',
    url: 'https://arxiv.org/abs/2303.06777'
  },
  foster2007lenses: {
    label: 'Foster et al. 2007',
    authors: 'Foster, J.N., Greenwald, M.B., Moore, J.T., Pierce, B.C. & Schmitt, A.',
    year: 2007,
    title: 'Combinators for Bidirectional Tree Transformations: A Linguistic Approach to the View-Update Problem',
    venue: 'ACM TOPLAS 29(3)',
    url: 'https://dl.acm.org/doi/10.1145/1232420.1232424'
  },
  fabricyarn: {
    label: 'FabricMC 2016',
    authors: 'FabricMC contributors',
    year: 2016,
    title: 'Yarn: libre Minecraft mappings',
    venue: 'GitHub',
    url: 'https://github.com/FabricMC/yarn'
  },
  sm64decomp: {
    label: 'n64decomp 2019',
    authors: 'n64decomp contributors',
    year: 2019,
    title: 'A Super Mario 64 decompilation',
    venue: 'GitHub',
    url: 'https://github.com/n64decomp/sm64'
  },
  backstitch2026: {
    label: 'Ink & Switch 2026',
    authors: 'Ink & Switch & Endless Access',
    year: 2026,
    title: 'Backstitch: real-time collaboration and version control for Godot',
    venue: 'public alpha',
    url: 'https://backstitch.dev'
  },
  kell2024source: {
    label: 'Kell & Stinnett 2024',
    authors: 'Kell, S. & Stinnett, J.R.',
    year: 2024,
    title: 'Source-Level Debugging of Compiler-Optimised Code: Ill-Posed, but Not Impossible',
    venue: 'Onward!',
    url: 'https://dl.acm.org/doi/10.1145/3689492.3690047'
  },
  litt2020cambria: {
    label: 'Litt et al. 2020',
    authors: 'Litt, G., van Hardenberg, P. & Henry, O.',
    year: 2020,
    title: 'Project Cambria: Translate Your Data with Lenses',
    venue: 'Ink & Switch',
    url: 'https://www.inkandswitch.com/cambria/'
  }
});};
const _9yd8ub = function _external_link_svg(htl) {return (htl.svg`<svg
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
</svg>`);};
const _mhp8n4 = function _externalLink(external_link_svg, htl) {return ((label, href, {
    title = 'Opens in a new tab'
} = {}) => {
    const icon = external_link_svg.cloneNode(true);
    icon.setAttribute('aria-hidden', 'true');
    return htl.html`<a
    href=${ href }
    target="_blank"
    rel="noopener noreferrer"
    title=${ title }
  >${ label }${ icon }</a>`;
});};
const _aside = function _aside(html) {
    return (title, module_names) => {
        if (!Array.isArray(module_names))
            module_names = [module_names];
        const h = `#view=R100(S50(@tomlarkworthy/lopecode-live-2026),S50(${ module_names.join(',') }))`;
        const a = html`<a href="${ h }">${ title }</a>`;
        a.onclick = ev => {
            // blob: forks drop fragment navigation on the opaque origin; the History
            // API still works there, so route the click through it
            ev.preventDefault();
            window.history.pushState(null, '', h);
            window.dispatchEvent(new window.HashChangeEvent('hashchange'));
        };
        return a;
    };
};
const _experiment = function _experiment(htl) {return ((content) => htl.html`<div style="
    display: flex;
    gap: 0.6em;
    align-items: baseline;
    border: 1px solid color-mix(in srgb, currentColor 25%, transparent);
    border-left: 4px solid #7fbf7f;
    border-radius: 6px;
    background: color-mix(in srgb, currentColor 5%, transparent);
    padding: 0.7em 1em;
    margin: 1em 0;
  "><span style="font-size:1.15em" aria-hidden="true">🧪</span><div>${ content }</div></div>`);};
const _sections = function _sections() {return ([
  { key: 'ship', title: 'Ship the code to the data' },
  { key: 'claim', title: 'Runtime-first, not format-first' },
  { key: 'cell', title: 'A cell is a function that carries its source' },
  { key: 'modular', title: 'The runtime is modular' },
  { key: 'copy', title: 'Taking a copy is a menu item' },
  { key: 'mappings', title: 'Formats are mappings from the runtime' },
  { key: 'html', title: 'HTML: the document mapping', parent: 'mappings' },
  { key: 'atproto', title: 'ATProto: the record mapping', parent: 'mappings' },
  { key: 'iife', title: 'IIFE: an unloader for the HTML', parent: 'mappings' },
  { key: 'liberation', title: 'Liberation: exporting a program whose source you cannot see' },
  { key: 'container', title: 'One container, many documents' },
  { key: 'jam', title: 'The jam: serializing a moment' },
  { key: 'agent', title: 'One bundle: runtime, editors, agent, application' },
  { key: 'waist', title: 'The thin waist' },
  { key: 'related', title: 'Related work' },
  { key: 'limits', title: 'Problematic examples' },
  { key: 'questions', title: 'The three questions' }
]);};
const _sectionIndex = function _sectionIndex(sections) {
  const index = new Map();
  let top = 0;
  const children = new Map();
  for (const s of sections) {
    if (s.parent) {
      const n = (children.get(s.parent) || 0) + 1;
      children.set(s.parent, n);
      index.set(s.key, { num: `${ index.get(s.parent).num }.${ n }`, title: s.title, level: 3 });
    } else {
      top += 1;
      index.set(s.key, { num: String(top), title: s.title, level: 2 });
    }
  }
  return index;
};
const _sec = function _sec(sectionIndex) {return ((key) => {
  const s = sectionIndex.get(key);
  const h = document.createElement(s ? `h${ s.level }` : 'h2');
  h.id = `sec-${ key }`;
  h.textContent = s
    ? (s.level === 2 ? `${ s.num }. ${ s.title }` : `${ s.num } ${ s.title }`)
    : `[missing section: ${ key }]`;
  return h;
});};
const _ref = function _ref(sectionIndex, htl) {return ((key) => {
  const s = sectionIndex.get(key);
  if (!s) return htl.html`<strong style="color:#c96a6a">[missing section: ${ key }]</strong>`;
  return htl.html`<a
    href="#"
    title="§${ s.num } ${ s.title }"
    onclick=${ (ev) => { ev.preventDefault(); document.getElementById(`sec-${ key }`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); } }
  >§${ s.num }</a>`;
});};
const _essayModuleView = function _essayModuleView(thisModule) {return (
  thisModule()
);};
const _essayModule = (G, _) => G.input(_);

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  main.define("module @tomlarkworthy/editable-md", async () => runtime.module((await import("/@tomlarkworthy/editable-md.js?v=4")).default));  
  main.define("module @tomlarkworthy/exporter-3", async () => runtime.module((await import("/@tomlarkworthy/exporter-3.js?v=4")).default));  
  main.define("downloadAnchor", ["module @tomlarkworthy/exporter-3", "@variable"], (_, v) => v.import("downloadAnchor", _));  
  main.define("forkAnchor", ["module @tomlarkworthy/exporter-3", "@variable"], (_, v) => v.import("forkAnchor", _));  
  main.define("module @tomlarkworthy/runtime-sdk", async () => runtime.module((await import("/@tomlarkworthy/runtime-sdk.js?v=4")).default));  
  main.define("thisModule", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("thisModule", _));  
  main.define("lookupVariable", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("lookupVariable", _));  
  main.define("module @tomlarkworthy/sticky", async () => runtime.module((await import("/@tomlarkworthy/sticky.js?v=4")).default));  
  main.define("sticky", ["module @tomlarkworthy/sticky", "@variable"], (_, v) => v.import("sticky", _));  
  $def("p0", "p0", ["md"], p0);  
  $def("p1", null, ["md","externalLink"], p1);  
  $def("_abstract", "abstract", ["md"], _abstract);  
  $def("s1h", null, ["sec"], s1h);  
  $def("s1p1", null, ["md"], s1p1);  
  $def("s1p2", null, ["md"], s1p2);  
  $def("s1p3", null, ["md","aside"], s1p3);  
  $def("s2h", null, ["sec"], s2h);  
  $def("s2p1", null, ["md","aside","ref"], s2p1);  
  $def("s2x1", null, ["experiment","md","aside"], s2x1);  
  $def("_claimDiagram", "claimDiagram", ["htl"], _claimDiagram);  
  $def("s3h", null, ["sec"], s3h);  
  $def("s3p1", null, ["md","externalLink"], s3p1);  
  $def("_constant", "constant", [], _constant);  
  $def("_double", "fun", [], _double);  
  $def("_result", "result", ["fun","constant"], _result);  
  $def("_cellSource", "cellSource", ["constant","fun","result","lookupVariable","essayModule","md","cite"], _cellSource);  
  $def("s3x1", null, ["experiment","md","aside"], s3x1);  
  $def("s3p2", null, ["md","aside","cite","ref"], s3p2);  
  $def("s4h", null, ["sec"], s4h);  
  $def("s4p1", null, ["md","ref","aside"], s4p1);  
  $def("s5h", null, ["sec"], s5h);  
  $def("s5p1", null, ["md","downloadAnchor","forkAnchor","ref"], s5p1);  
  $def("_dialView", "viewof dial", ["sticky","Inputs"], _dialView);  
  $def("_dial", "dial", ["Generators","viewof dial"], _dial);  
  $def("s5p2", null, ["md","dial","ref","cite","aside"], s5p2);  
  $def("s5x1", null, ["experiment","md"], s5x1);  
  $def("_stickyDiagram", null, ["mermaid"], _stickyDiagram);  
  $def("s5p3", null, ["md","cite","ref"], s5p3);  
  $def("s6h", null, ["sec"], s6h);  
  $def("s6p1", null, ["md","ref"], s6p1);  
  $def("s6bh", null, ["sec"], s6bh);  
  $def("s6bp1", null, ["md","aside"], s6bp1);  
  $def("_containerInventory", "containerInventory", ["Inputs","md","htl"], _containerInventory);  
  $def("_ownBlockPeek", "ownBlockPeek", ["md"], _ownBlockPeek);  
  $def("s6bx1", null, ["experiment","md","ref"], s6bx1);  
  $def("s6ah", null, ["sec"], s6ah);  
  $def("s6ap1", null, ["md","externalLink","ref","aside"], s6ap1);  
  $def("s6ch", null, ["sec"], s6ch);  
  $def("s6cp1", null, ["md","ref"], s6cp1);  
  $def("s7h", null, ["sec"], s7h);  
  $def("s7p1", null, ["md"], s7p1);  
  $def("s7p2", null, ["md","aside","externalLink","cite","ref"], s7p2);  
  $def("s8h", null, ["sec"], s8h);  
  $def("s8p1", null, ["md","aside","ref"], s8p1);  
  $def("s9h", null, ["sec"], s9h);  
  $def("s9p1", null, ["md","aside","ref"], s9p1);  
  $def("s9p2", null, ["md","aside","ref"], s9p2);  
  $def("s10h", null, ["sec"], s10h);  
  $def("s10p1", null, ["md","aside","ref","cite"], s10p1);  
  $def("s11h", null, ["sec"], s11h);  
  $def("s11p1", null, ["md","cite","ref"], s11p1);  
  $def("_hourglassDiagram", "hourglassDiagram", ["htl"], _hourglassDiagram);  
  $def("s11p2", null, ["md","externalLink","cite","aside"], s11p2);  
  $def("s12h", null, ["sec"], s12h);  
  $def("s12p1", null, ["md","cite","ref"], s12p1);  
  $def("s12p2", null, ["md","cite"], s12p2);  
  $def("s12p2b", null, ["md","cite","aside"], s12p2b);  
  $def("s12p3", null, ["md","cite"], s12p3);  
  $def("s12p4", null, ["md","cite"], s12p4);  
  $def("s12p5", null, ["md","cite","ref"], s12p5);  
  $def("s12p6", null, ["md","cite","ref"], s12p6);  
  $def("s12p7", null, ["md","cite","ref"], s12p7);  
  $def("s13h", null, ["sec"], s13h);  
  $def("s13p1", null, ["md","cite","ref"], s13p1);  
  $def("s14h", null, ["sec"], s14h);  
  $def("s14p1", null, ["md","ref"], s14p1);  
  $def("refsh", null, ["md"], refsh);  
  $def("_references", "references", ["bibliography","externalLink","htl"], _references);  
  $def("_cite", "cite", ["bibliography","htl"], _cite);  
  $def("_bibliography", "bibliography", [], _bibliography);  
  main.define("md", ["module @tomlarkworthy/editable-md", "@variable"], (_, v) => v.import("md", _));  
  $def("_9yd8ub", "external_link_svg", ["htl"], _9yd8ub);  
  $def("_mhp8n4", "externalLink", ["external_link_svg","htl"], _mhp8n4);  
  $def("_aside", "aside", ["html"], _aside);  
  $def("_experiment", "experiment", ["htl"], _experiment);  
  $def("_sections", "sections", [], _sections);  
  $def("_sectionIndex", "sectionIndex", ["sections"], _sectionIndex);  
  $def("_sec", "sec", ["sectionIndex"], _sec);  
  $def("_ref", "ref", ["sectionIndex","htl"], _ref);  
  $def("_essayModuleView", "viewof essayModule", ["thisModule"], _essayModuleView);  
  $def("_essayModule", "essayModule", ["Generators","viewof essayModule"], _essayModule);
  return main;
}
