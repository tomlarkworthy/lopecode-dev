/* ═══════════════════════════════════════════════════════════════════════════════════════════
   ANNOTATED WORKING COPY — LIVE 2026 revision.  Tom writes; Claude only marks the sites.

   Source: modules/@tomlarkworthy/lopecode-live-2026.js @ 2026-09-09 (byte-identical copy).
   The original is untouched.  Rewrite prose HERE, then:
       cp plan/live2026-annotated.js modules/@tomlarkworthy/lopecode-live-2026.js   # strip these
       bun tools/channel/sync-module.ts --module @tomlarkworthy/lopecode-live-2026 \
         --source modules/@tomlarkworthy/lopecode-live-2026.js \
         --target lopebooks/notebooks/@tomlarkworthy_lopecode-live-2026.html
   Every annotation is a  ── ANNOTATION ──  block; none of it is prose to keep.  Delete as you go.

   ─── Pangram 4, 2026-09-09, 4090 words, 81 paragraphs, $2.05 ────────────────────────────────
   Report: tools/prose-qa/reports/@tomlarkworthy_lopecode-live-2026-lopecode-live-2026-2026-09-09.json
   headline "AI Detected", fraction_ai 0.647, fraction_human 0.353, SIX windows:

     chars          words  verdict            covers
     0–4189           672  Human      0.14    title, abstract, §ship, §claim, §cell (opening)
     4189–6321        336  AI         0.77    §cell tail (s3p1 list, cellSource, s3x1, s3p2), §modular
     6321–11125       790  Human      0.23    §copy, §mappings, §html, §atproto, §iife
     11125–12410      216  AI         0.86    §liberation (s7p1, s7p2)
     12410–12624       38  Human      0.41    the Adversarial-Extension line + the first sentence of §jam
     12624–26114     2087  AI         0.95    §jam tail → §agent → §waist → §related → §limits → §questions

   READ THIS BEFORE ACTING ON THE SCORES.  Pangram scores WINDOWS, not paragraphs — every
   paragraph inside a window inherits that window's number, so "s12p4 = 0.95" means "s12p4 sits
   in the 2087-word block that scored 0.95", not that s12p4 was judged on its own.  It is a
   detector, not a judge: it says a passage carries the statistical signature of LLM output, not
   that it is bad.  Quoted material from papers draws false positives — §related is one long
   string of quotations, so treat its score with more suspicion than §limits'.

   What it does establish: 8C's complaint was not impressionistic.  They wrote "I found it a bit
   painful to get through section 8 and onwards" and the detector puts the boundary in the same
   place, at §jam, and holds it to the end of the document.  65% of the essay by volume.

   ─── Reviewer items, mapped to cells ────────────────────────────────────────────────────────
   Full text of every review: plan/live2026response.md.
     R1 thesis          _abstract, s2p1, _claimDiagram, s14p1
     R2 LLM prose       s3p1…s4p1, s7p1, s7p2, s9p1 → s14p1   (the three AI windows)
     R3 terminology     s3p1 (viewof), s3p2 + _cellSource (decompilation), s11p1 (waist);
                        CUT: s5p3 (lens), s11p2 (BootstrapLab platform/substrate/product)
     R4 problematic     s13p1
     R5 related work    s12p4 (Smalltalk), _bibliography (ColorForth), s12p* (Lisp)
     R6 liveness        DONE in code; the unwritten half lands in s13p1 and/or s10p1
     R7 questions       s2p1 / s6bp1 (HTML-with-inlined-JS), s13p1 (schema migration, merging)
     R8 demos           NEW §cloudwatch section (cwh…cwp5, cwPlot, cwtry) after §liberation —
                        the CloudWatch worked example; _0otyjzt (maps try-it) left as the generic one
     R9 do not break    s2x1, s3x1, s5x1, s6bx1, _0otyjzt (the try-its), s13p1 (the candour)
   ═══════════════════════════════════════════════════════════════════════════════════════════ */

const p0 = function _anonymous(md) {return (md`# Source-last programming`);};
/* ── ANNOTATION ──────────────────────────────────────────────────────────────────────
   R1 — THE THESIS.  Two of three reviewers, and it is the title.  Highest leverage item in the set.

   8A: "I'm not sure if the opening criticism, source being the original sin of programming, is
        actually addressed. … Source code is still there; it's just taken on a different form, its
        not last its just different."
   8C: "I was not able to either find or follow a story that the concept of source code itself was
        the original sin…" and "am not convinced that the idea of Source-last programming underlies
        the ideas presented in the bulk of the paper".

   8C also disputes the premise on facts: "ipynbs are probably not stored in memory during editing
   of Jupyter noteboots, they are created on the fly by serializing the running notebook." [sic]
   The current sentence invites that, because it reads as a claim about WHERE THE BYTES LIVE:
      "a canonical saved representation — .ipynb, an image dump, a document schema that the
       system loads."

   Suggestions:
     • Move the claim from where-the-bytes-live to WHAT THE FORMAT ADMITS: the save format bounds
       the ontology of the system.  An open editor, a pinned view, a slider position, a live
       binding cannot survive a reload if .ipynb cannot spell them — whatever the frontend holds
       in memory at the time.  This version is true whether or not 8C is right about Jupyter.
     • Name `sticky` in the abstract as the discriminating case.  The essay already DEMONSTRATES
       exactly this in §copy (the dial rewrites its own definition) and cites horowitz2023lrc for
       the same phenomenon at s5p2 — the demo is present and the abstract does not claim it.
     • "original sin": either argue it in s2p1 or drop the phrase.  Asserting it in the abstract
       and never returning to it is precisely what both reviewers noticed.
     • If the fourth episode (AWS CloudWatch, see the _0otyjzt block) goes in, "three field
       episodes" here becomes four.
     • UNVERIFIED, do not restate without checking: whether Jupyter's frontend holds the notebook
       model in memory during editing.  If the revision keeps any factual claim about Jupyter's
       internals, check it against their source.

   Pangram: window 1, Human 0.14.  The prose is not the problem here; the claim is.
   ────────────────────────────────────────────────────────────────────────────────── */
const _abstract = function _anonymous(md) {return (md`> **Abstract.** Perhaps to build systems that are malleable and end user programmable we need to rethink the relationship between runtime and development artifacts. It is our opinion that the concept of source code itself was the original sin that drove a wedge between user and developer.
>
> Most existing programming systems are format-first: a canonical saved representation — \\\`.ipynb\\\`, an image dump, a document schema that the system loads. Lopecode is *source-last*: there is no external source code or canonical serialized representation; the only canonical representation is the live executing system. When source code is needed, functions are decompiled on demand starting from \`Function.prototype.toString()\`. Serialization becomes a projection to one of many formats: a standalone HTML file, a JavaScript IIFE or an ATProto PDS. Format-independence is a consequence of runtime-primacy. Furthermore, we claim runtime-primacy also leads to simpler implementations of malleability and liveness, by admitting a plurality of non-source based editing surfaces.
>
> We share three field episodes where Lopecode's format agnosticism shone: shipping a tool into a locked-down corporate environment; liberating a running program from a notebook SaaS; and freezing an AI-co-created music jam into a document shared over WhatsApp.`);};
const p1 = function _anonymous(md,externalLink) {return (md`*Tom Larkworthy — submission to ${ externalLink('LIVE 2026', 'https://liveprog.org/') }.*`);};
const s1h = function _anonymous(sec) {return (sec('ship'));};
const s1p1 = function _anonymous(md) {return (md`A business analyst in a regulated industry, in another continent, could not open a large CSV export with their preferred tool, Excel. We knew almost nothing about their environment except that it was strict: corporate machines, no installing software, and data compliance. We built a small tool that trims columns from large CSVs, as a Lopecode notebook, and sent the single HTML file over Slack. They double-clicked it. The tool ran offline in their browser, and they were able to reexport a trimmed CSV that could be loaded by Excel.`);};
const s1p2 = function _anonymous(md) {return (md`Nothing about the tool is interesting. What is interesting is that it is actually very hard to share a program to non-programmers in 2026. Native binaries and cloud services are not safe in corporate environments. The browser is an ideal runtime because it is sandboxed and present on every operating system. A single HTML file does not require cross-origin requests, so it can be double-clicked and it just works. So a pragmatic option to distribute code is a self-enclosed file that can travel on email and instant messenger.`);};
const s1p3 = function _anonymous(md,aside) {return (md`${ aside('CSV column chooser', '@tomlarkworthy/csv-column-chooser') } is a copy of the actual tool shared`);};
const s2h = function _anonymous(sec) {return (sec('claim'));};
/* ── ANNOTATION ──────────────────────────────────────────────────────────────────────
   R1 (continued) — this is where "original sin" has to be argued, or where the phrase dies.

   Suggestions:
     • The paragraph currently asserts the inversion and moves on.  8A's objection ("its not last
       its just different") is answerable and unanswered: source is still there, but it is DERIVED,
       and nothing upstream is required to keep it.  Say what follows from that and what does not.
     • R7 / 8A: "Why is this better than just an HTML file with a large JS script inlined?"  This
       is a direct attack on the thesis and it is mechanically answerable in one paragraph — an
       inlined script is opaque to itself; the block container plus reflection is what lets the
       artifact re-read, re-edit and RE-EXPORT itself.  Miranda's single HTML file (cited at
       s12p5) is the honest comparison, not a strawman.  Consider answering it here rather than
       burying it in §related.
     • 8B hands you a sharper differentiator than the round trip, in the Smalltalk comment at
       s12p4: "it appears that Lopecode has a better approach to modularity, which could be
       discussed more."  Modularity may belong in the thesis, not only in related work.
   ────────────────────────────────────────────────────────────────────────────────── */
const s2p1 = function _anonymous(md,aside,ref) {return (md`Most programming systems are format-first: a save format is the canonical representation, and the live system is a runtime that loads it. Jupyter loads \`.ipynb\`. Smalltalk saves and loads to its image. A browser page loads HTML. Lopecode inverts the arrangement in the pursuit of liveness and malleability. The canonical representation *is* the live runtime: a graph of modules containing pure JavaScript functions, executed by a reactive scheduler. When a serialized form is needed, it is computed on demand by reflection. Because no format is canonical, the same runtime can be projected to different serialized representations.

Make the runtime the source of truth and serialization becomes a projection, so format-independence follows. We call the design *source-last*: source code still exists, but it is recovered last, on demand, from the running system, rather than maintained as the canonical artifact.

The same arrangement applies to program editors as well. Since the live runtime is the single thing every tool reads and writes, editing surfaces specialize and coexist: ${ aside('editor-5', '@tomlarkworthy/editor-5') } edits cells as source; ${ aside('editable-md', '@tomlarkworthy/editable-md') } makes rendered prose directly editable; and ${ aside('sticky', '@tomlarkworthy/sticky') } (${ ref('copy') }), a higher order UI lens that transforms user manipulations into function updates. All three are unprivileged userspace modules.`);};
const s2x1 = function _anonymous(experiment,md,aside) {return (experiment(md`**Try ${ aside('editable-md', ['@tomlarkworthy/editable-md']) }.** Click any paragraph of this essay: it opens in a live markdown editor. The prose is cells, and the editor is a userspace module riding in the same file. If you open the code editor as well, you will notice that changing and committing (SHIFT + ENTER) will update the other view.`));};
/* ── ANNOTATION ──────────────────────────────────────────────────────────────────────
   R1 — PORT THE NEWSLETTER-002 DIAGRAM (your call, 2026-09-09).

   Source: modules/@tomlarkworthy/lopecode-newsletter-002.js:58, cell `source_last_diagram`,
   pid _16mb9oy.  Plain `svg` cell, no dependency beyond the svg builtin, so it ports as a cell
   copy.  It uses --theme-foreground, --syntax-keyword and --syntax-string, all of which this
   essay's theme also defines.

   Why it is better than _claimDiagram below: it draws the WEDGE.  Top band FORMAT-FIRST /
   UNIDIRECTIONAL — developer → source → compilation → program → end user, with a dashed line at
   x=335 labelled THE WEDGE.  Lower band SOURCE-LAST / THE RUNNING PROGRAM IS THE ARTIFACT — one
   end-user programmer, one program box, arrows both ways.  That picture argues the claim 8A says
   is asserted and never argued; the diagram below only restates the format/runtime inversion,
   which is the part nobody disputed.

   Decision to make: replace _claimDiagram, or keep both (wedge in the abstract/§claim, the
   projection fan later where the three mappings are introduced in §mappings).
   ────────────────────────────────────────────────────────────────────────────────── */
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
/* ── ANNOTATION ──────────────────────────────────────────────────────────────────────
   R3 — DEFINE THE NOTATION.  8C: "Please define: Observable JS syntax (viewof etc., examples can
   be included, many people are not familiar)".

   Suggestions:
     • `viewof` appears throughout the essay and the demos with no definition anywhere.  Two
       sentences and one example here would carry the whole document.
     • Worth stating that a cell name is a binding and the graph is implicit in the parameter
       list — that is what makes the `_definition.toString()` listing below legible at all.

   Pangram: window 2, AI 0.77 — starts mid-cell, at the numbered list.  R2 applies from here to
   the end of §modular.
   ────────────────────────────────────────────────────────────────────────────────── */
const s3p1 = function _anonymous(md,externalLink) {return (md`Here is a simple Lopecode program. Three cells:

1. \`constant\` holds a number

2. \`fun\` holds a function

3. \`result\` applies one to the other, implying both are dependencies.

Edit \`constant\` or \`fun\` and \`result\` recomputes, spreadsheet-fashion. The reactive model is Observable's ${ externalLink('JavaScript in Observable', 'https://observablehq.com/collection/@observablehq/javascript-in-observable') }.`);};
const _constant = function _constant() {return (31);};
const _double = function _fun() {return (x => x * 2);};
const _result = function _result(fun,constant) {return (fun(constant));};
/* ── ANNOTATION ──────────────────────────────────────────────────────────────────────
   R3 — DEFINE DECOMPILATION.  8C: "decompilation (decompiling from what to what?  I was lost on
   this for quite a while until I read the sequence diagram very carefully and logged some values
   when cells are edited to see what is happening)".

   A reviewer had to INSTRUMENT THE NOTEBOOK to work out what the word meant.  That is a defect
   in this cell and in s3p2, not in the reviewer.

   Suggestions:
     • Name the two ends explicitly and early: compiled JavaScript function ⇄ Observable notebook
       syntax.  Not "source" ⇄ "source".
     • The live listing below already shows the low-level end.  Show the high-level end beside it
       — the same three cells as the author typed them — so "from what to what" is visible rather
       than described.
     • The sequence diagram at _stickyDiagram is where 8C eventually understood it.  Consider
       forward-referencing it here, or moving a reduced version of it up.

   Pangram: window 2, AI 0.77.
   ────────────────────────────────────────────────────────────────────────────────── */
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
lookupVariable('fun', ...)._definition.toString()

> ${ dv._definition.toString() }
\`\`\`

\`\`\`js
lookupVariable('result', ...)._definition.toString()

> ${ rv._definition.toString() }
\`\`\`

That one call, \`Function.prototype.toString()\`, is the reflective interface Lopecode builds on. The runtime does not keep the text you typed anywhere; when source is needed to edit or to export, it is recovered from the executing function.

Note, recovered functions do *not* contain closure variables. \`toString()\` cannot see captured variables but due to the reactive runtime design a cell closes over nothing; everything it uses arrives as a parameter, so the recovered source is the complete definition.`;
};
const s3x1 = function _anonymous(experiment,md,aside) {return (experiment(md`**Try it.** Ensure *Edit mode* in the burger menu is on, and click edit under \`fun\` to open ${ aside('editor-5', ['@tomlarkworthy/editor-5']) }'s source editor and change the code to \`(x) => x * 3\`. Note \`result\` recomputes, and the decompiled listing refreshes.`));};
/* ── ANNOTATION ──────────────────────────────────────────────────────────────────────
   R3 — same paragraph 8C got lost in, and it is where `lens` first appears.

   8C, on terminology to CUT: "examples of terminology and citation that I think is unnecessary:
   lens; BootstrapLab stuff around Platform, substrate, product."

   Suggestions:
     • "is lensed" carries the whole load of this sentence and is undefined at this point.  Say
       the mechanical thing instead: compile and decompile are inverses by construction, so the
       round trip is not best-effort.  The foster2007lenses citation can stay in §copy or go.
     • "the ill-posed problem of decompilation" — ill-posed how?  One clause.

   Pangram: window 2, AI 0.77.
   ────────────────────────────────────────────────────────────────────────────────── */
const s3p2 = function _anonymous(md,aside,cite,ref) {return (md`\`toString()\` only recovers the low-level *compiled* JavaScript, not the high level notebook-syntax text as the author wrote it. The ${ aside('observablejs-toolchain', '@tomlarkworthy/observablejs-toolchain') } is lensed ${ cite('foster2007lenses') }, so the ill-posed problem of decompilation ${ cite('kell2024source') } is avoided by construction. The known failures of this property are listed in ${ ref('limits') }.`);};
const s4h = function _anonymous(sec) {return (sec('modular'));};
/* ── ANNOTATION ──────────────────────────────────────────────────────────────────────
   R2 only — no reviewer comment on the content.  Last cell of the AI 0.77 window (chars
   4189–6321).  Read it straight through with s3p1/s3p2/_cellSource and see whether the four
   together have a texture the front half does not.
   ────────────────────────────────────────────────────────────────────────────────── */
const s4p1 = function _anonymous(md,ref,aside) {return (md`The coarse unit of composition in the reactive runtime is the module, a namespace of cells. It is visualized as a notebook, and a single runtime can contain many notebooks. A running system is a set of modules importing values from each other. Imports may be mutually recursive between modules; the cell-level dependency graph stays acyclic, which is what keeps recomputation well-defined.

The single HTML rendering is one mapping of that structure, and ${ ref('mappings') } covers the others. You can inspect the live module graph of this very system with ${ aside('module-map', '@tomlarkworthy/module-map') }, and the fine grained cell interdependancies with ${ aside('cell-map', '@tomlarkworthy/cell-map') }.`);};
const s5h = function _anonymous(sec) {return (sec('copy'));};
const s5p1 = function _anonymous(md,downloadAnchor,forkAnchor) {return (md`The burger menu at the top of this pane offers *Save in place*, *Download*, *Edit mode* and *Fork*. Inline works too: download a ${ downloadAnchor({}, 'copy') } of this essay, or fork it into a fresh browser ${ forkAnchor({}, 'tab') }. Copies carry all code and asset changes, the prose, the tooling, and the runtime without external build steps or internet connectivity. However, runtime values are not *typically* serialized.`);};
const _dialView = function _dial(sticky, Inputs) {return (
  sticky(Inputs.range([0, 100], { label: 'dial', step: 1, value: 50 }), 50)
);};
const _dial = (G, _) => G.input(_);
const s5p2 = function _anonymous(md,cite,aside) {return (md`${ cite('horowitz2023lrc') } identify that the lack of state persistence is the primary reason why Observable notebooks are not a "Live, Rich, and Composable Programming System Beyond Static Text". Lopecode is able to offer opt-in value persistence *because* there is no external source code.

The slider above is wrapped in ${ aside('sticky', ['@tomlarkworthy/sticky']) }, an imported userspace function. On user manipulation, ${ aside('sticky', ['@tomlarkworthy/sticky']) } parses its containing cell's definition with ${ aside('acorn', ['@tomlarkworthy/acorn-8-11-3']) } and rewrites the persistence argument to the current value. In essence, storing state in its function definition. Reflective exports then propagate that state onwards.`);};
const s5x1 = function _anonymous(experiment,md) {return (experiment(md`**Try it.** Drag the slider above, then toggle the *cell editor*. The second argument of \`sticky(...)\` holds the value you just set. Close the editor, drag again, reopen, the source rewrites itself on every slider change.`));};
const _lv38man = function _anonymous(md,aside) {return (md`${ aside('sticky', ['@tomlarkworthy/sticky']) } demonstrates that a single cell definition can be interpreted in multiple languages. When viewing the source of the cell through ${ aside('editor-5', ['@tomlarkworthy/editor-5']) } we manipulate using a bespoke higher level reactive language, Observable JavaScript. When sticky mutates its own container, it uses the lower level JavaScript language that can be parsed with an off-the-shelf JavaScript parser, Acorn.`);};
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
    ${ id } rect.actor { fill: color-mix(in srgb, currentColor 7%, var(--theme-background, Canvas)) !important; stroke: color-mix(in srgb, currentColor 45%, transparent) !important; }
    ${ id } circle { fill: color-mix(in srgb, currentColor 7%, var(--theme-background, Canvas)) !important; stroke: currentColor !important; }
    ${ id } .note { fill: color-mix(in srgb, currentColor 10%, var(--theme-background, Canvas)) !important; stroke: color-mix(in srgb, currentColor 40%, transparent) !important; }
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
/* ── ANNOTATION ──────────────────────────────────────────────────────────────────────
   R3 — CUT `lens`.  8C names it explicitly as unnecessary terminology.  This is its main site.

   Suggestions:
     • The paragraph does real work — it is the clearest statement of the round trip in the essay
       — but it spends a third of itself on vocabulary (lens, bidirectional-programming
       literature, Cambria) that 8C says got in the way.  The mechanism survives without any of
       it: toString → acorn patch → evaluate back → decompile on next open.
     • foster2007lenses and litt2020cambria can move to §related, or go.
     • "Every arrow above runs through the reflective waist" — `waist` is also undefined until
       §waist, which is six sections later.  See the s11p1 block.

   Pangram: window 3, Human 0.23.  The prose reads fine; it is the vocabulary the reviewer hit.
   ────────────────────────────────────────────────────────────────────────────────── */
const s5p3 = function _anonymous(md,cite,ref) {return (md`Every arrow above runs through the reflective waist. Authoring is high-level: notebook syntax is compiled to a plain JavaScript function and evaluated into the runtime. \`sticky\` operates entirely at the low level: on a committed change it recovers its own cell's source with \`toString()\`, patches one literal with acorn, and evaluates the patch back — the runtime never recomputes. When the author next opens the cell, the editor recovers the low-level source and decompiles it to notebook syntax, updated literal included. The compiler/decompiler pair is a *lens* in the sense of the bidirectional-programming literature ${ cite('foster2007lenses') } — the construction Cambria applies to live document schemas ${ cite('litt2020cambria') }: the executing function is the concrete source of truth, notebook syntax is one view, and edits on either side round-trip. The decompilability invariant of ${ ref('cell') } is the lens law holding across the whole runtime; ${ ref('limits') } lists where it does not.

Decompilation is prevalent in the games modding community which is end user programming in the wild. Why not elevate the technique to be the primary method of program editing? Lopecode is a system that follows through on this idea.`);};
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
    const src = el ? el.textContent.trimStart().slice(0, 350) : '(module block not found \u2014 running outside the container)';
    return md`The stored form of *this very module*, as it sits in the HTML mapping (first 350 characters). It goes stale as you edit and is refreshed on the next save, because the block is a projection of the runtime:

\`\`\`js
${ src }…
\`\`\``;
};
const s6bx1 = function _anonymous(experiment,md,ref) {return (experiment(md`**Try it.** Edit the title cell, the stored block above does not change: the runtime has moved and the projection is stale. Now *Fork* from the burger menu (or the inline link in ${ ref('copy') }): the fork is written from the runtime, so it opens carrying your edit, reflected in the serialization here.`));};
const s6ah = function _anonymous(sec) {return (sec('atproto'));};
const s6ap1 = function _anonymous(md,externalLink,aside,ref) {return (md`The runtime graph maps cleanly onto ${ externalLink('ATProto', 'https://atproto.com/') }. A record of type ${ externalLink('com.lopecode.bundle', 'https://lexicon.garden/lexicon/did:plc:j7nm3lrd5h7fm3sfhcv3lhfv/com.lopecode.bundle') } carries an array of file entries, pointers to MIME-typed blobs.

The userspace module ${ aside('atproto', '@tomlarkworthy/atproto') } allows you to serialize and publish the live notebook into the decentralized network directly. The base synthesizer used in ${ ref('jam') } was fetched from such a record. A web proxy exists for convenient access without a special reader at ${ externalLink('lopecode.com', 'https://did-plc-j7nm3lrd5h7fm3sfhcv3lhfv.lopecode.com/r/coding-tools') }, but it is also possible to fetch modules directly from the network.`);};
const s6ch = function _anonymous(sec) {return (sec('iife'));};
/* ── ANNOTATION ──────────────────────────────────────────────────────────────────────
   R8 / 8A — the injection section.  See the block on _0otyjzt below: the CloudWatch episode is a
   much stronger case for this section than the Google Maps paste, and it belongs in the PROSE
   here, not only in the try-it.

   Note the sentence "bringing a live editable runtime into an origin we do not control" is
   currently the only claim made for injection.  The CloudWatch work is evidence for a stronger
   one: the injected runtime can use the HOST PAGE'S OWN CREDENTIALS AND SESSION, which is what
   8A means by "real coordination" rather than duplexing.
   ────────────────────────────────────────────────────────────────────────────────── */
const s6cp1 = function _anonymous(md,ref) {return (md`The exporter's *Copy To JS* renders the runtime as a single immediately-invoked script expression on the clipboard. This is an unloader for the HTML mapping: pasted into any page that will execute a script, it reconstructs the whole environment inside that page, bringing a live editable runtime into an origin we do not control. Content security is discussed in (${ ref('limits') }).`);};
const _rccfld4 = function _anonymous(exporter) {return (exporter());};
/* ── ANNOTATION ──────────────────────────────────────────────────────────────────────
   R8 / 8A — REPLACE THE GOOGLE MAPS TRY-IT.  Your call, 2026-09-09: "we have a better example".

   8A on the current demo: "Injecting stuff into Google Maps is a cool demo for malleable
   software; however, I wish the injected essay did a little bit more.  To me, effective
   malleability is not merely duplexing, but should involve real coordination."
   and: "I'd also like to see a more dramatic killer example.  Right now, some of the examples
   are a little bit abstract, whereas something really dramatic could be pretty eye-opening."

   THE CANDIDATE: the AWS CloudWatch shared-dashboard work, 2026-07-28.
     Session   af1aa31a-7710-49d1-9fde-617650fa64f7
     Record    plan/aws-dashboard-viewer-design.md (463 lines, every measurement)
     Memory    project_aws_cloudwatch_dashboard_viewer
     Artifact  lopebooks/notebooks/@tomlarkworthy_aws-dashboard.html
               modules @tomlarkworthy/cw-share-auth, @tomlarkworthy/cw-metrics (23/23 self-test)

   What happened, and why it is the answer to 8A rather than another duplexing demo:
     1. A CloudWatch shared dashboard renders in an about:srcdoc frame on the
        cloudwatch.amazonaws.com origin.  The pairing session was injected INTO THAT RUNNING PAGE
        — same origin, so the injected runtime is inside the app, not beside it.
     2. From in there it monkeypatched the host page's fetch/XHR and captured the official app's
        own successful requests, and read live credentials from parent.AWS.config.credentials.
        That is coordination with the host application, not a second copy of a document.
     3. Diffing the app's successful GetMetricData against ours produced a finding that is not in
        any AWS documentation: the read needs THREE things beyond SigV4 — a fixed
        x-amz-user-agent marker, X-Amz-Sharing-MetaSum/MetaTime where
        MetaSum = SHA256hex(target + body + userAgent + metaTime), and
        X-CloudWatch-SharedDashboardToken, a server-minted PER-WIDGET HMAC that GetDashboard hands
        back on each widget.  All inside the SigV4 SignedHeaders set.
     4. Then it was reimplemented standalone — SRP-6a auth on native BigInt+WebCrypto, share
        idToken + CustomRoleArn — and proved WITHOUT injection: same chain, real data, a SEARCH()
        widget expanding to 39 series and 1,593 datapoints.  Injection was the instrument; the
        result outlived it.

   THE PART THAT MAKES IT A PAPER-GRADE RESULT, not an anecdote — the boundary was MEASURED.
   One widget's token, eight probes (plan/aws-dashboard-viewer-design.md:373):
        the widget's own expression                            200
        same expression, 3h → 24h time range                    200
        same expression, period 300 → 60                        200
        same expression, stat Sum → Average                     200
        a different metric (EC2 CPUUtilization)                 AccessDenied
        a different SEARCH (all SQS / all Lambda Errors)        AccessDenied
        the widget's expression wrapped in SUM(...)             AccessDenied
        an extra query alongside the widget's                   AccessDenied
   So a shared dashboard grants read to exactly the metrics its widgets declare — re-windowable
   and re-aggregatable, not a general GetMetricData key for the account.  An earlier conclusion
   that the share role was misconfigured was WRONG and was retracted on this evidence; no IAM
   change is needed, and "Resource": "*" must not be recommended.

   Suggestions for how to use it:
     • Strongest framing: this is what a source-last artifact buys that a hosted notebook cannot.
       You cannot instrument an app you are not inside.  The essay currently argues shipping code
       to the data (§ship) with a CSV trimmer; this is the same claim with a much harder target.
     • It also answers 8A's "real coordination" literally — the injected code re-used the host's
       live auth to do something the host does not offer.
     • And it is a second, independent field episode for §liberation: exporter-3 liberates a
       notebook FROM a platform; this liberates DATA from a dashboard viewer.
     • Cheapest version: keep the Copy-as-JS try-it, retarget the prose from maps.google.com to
       the CloudWatch story, one paragraph plus the boundary table.  Most expensive: a fourth
       field episode with its own section, which changes "three field episodes" in the abstract.

   IS THE HEADER REALLY `X-CloudWatch-SharedDashboardToken`?  VERIFIED 2026-09-09.

   Yes, and the evidence is executable rather than a note-to-self.  In the working `cwCallConsole`
   (@tomlarkworthy/cw-metrics, the code path that returned 1,593 real datapoints):

       const signed = {
         host, 'x-amz-content-sha256': bodyHash, 'x-amz-date': amzDate,
         'x-amz-security-token': credentials.sessionToken,
         'x-amz-sharing-metasum': metaSum, 'x-amz-sharing-metatime': metaTime,
         'x-amz-target': target, 'x-amz-user-agent': UA,
       };
       if (token) signed['x-cloudwatch-shareddashboardtoken'] = token;
       const names = Object.keys(signed).sort();
       const canon = ['POST', '/', '', names.map(n => `${n}:${String(signed[n]).trim()}\n`).join(''),
                      names.join(';'), bodyHash].join('\n');

   Lowercase in the code because SigV4's canonical request lowercases header names; the wire form is
   case-insensitive and the console bundle spells it `X-CloudWatch-SharedDashboardToken`.  Note it is
   inside `signed`, so it is in SignedHeaders — the signature covers it.

   Is it public?  Three checks, and they support "no public reference", which is a weaker and more
   defensible claim than "not on the internet":

     • AWS's own `GetDashboard` API reference documents exactly THREE response elements —
       `DashboardArn`, `DashboardBody`, `DashboardName`.  No per-widget token, no
       `sharedDashboardToken`.  So the field is console-only: it comes back from the internal
       `CloudWatchVersion20130116.GetDashboard` target, not from the public API.  That is a
       checkable, citable fact and it is the strongest form of the claim.
       https://docs.aws.amazon.com/AmazonCloudWatch/latest/APIReference/API_GetDashboard.html
     • Exact-string web searches for `"X-CloudWatch-SharedDashboardToken"` and for
       `"sharedDashboardToken"` return no page containing either literal.
     • CAVEAT, state it if the paper makes the claim: a negative search is weak evidence.  Search
       engines index long identifiers badly, minified console bundles are not indexed at all, and
       GitHub code search was not queried from here.  Write "we found no public documentation of
       this header", not "it does not exist publicly".

   NEAREST PRIOR WORK, and it should be cited — it makes the contribution sharper, not smaller:
     WithSecure / Reversec, "CloudWatch Dashboard (Over)Sharing", 2025-01-16.
     https://labs.reversec.com/posts/2025/01/cloudwatch-dashboard-oversharing
     Their finding is on the IDENTITY side: a Console logic bug plus undefined Cognito behaviour left
     `AllowClassicFlow` unset, so Basic authflow against the dashboard's identity pool let a viewer
     holding only the share URL read EC2 tags (and conditionally Lambda and Logs).  Confirmed by
     fetching the article: it does not mention the sharing token, the MetaSum headers, the console
     API target, or GetMetricData at all.  They attacked how credentials are ISSUED; this work
     documents how the data request is AUTHORISED once you hold them, and measures what the token
     confines.  Different layer, opposite conclusion — theirs is a misconfiguration that grants too
     much, ours is a boundary that holds.

   BEFORE PUBLISHING:
     • Disclosure.  My read of the record is that this documents an undocumented internal API and
       shows the boundary WORKING AS INTENDED — the token confines the reader, and it is only
       obtainable by someone who already holds the share link.  It is not an escalation and not a
       bypass.  Confirm you agree before it goes in a public paper, and consider saying that
       explicitly in the text so a reader does not have to guess.
     • Anonymisation: DONE 2026-09-09 in the working tree, per your rule — customer identifiers
       out, Amazon-provisioned ones kept as evidence.  Removed: the AWS account id, the dashboard
       name, the viewer login, and the live share-link `context` blob (user pool / app client /
       identity pool / role ARN) that was baked into the aws-dashboard notebook.  KEPT
       deliberately: `CWDBSharing-ReadOnlyAccess-YMGFGZNS`, the console targets, the header
       names, the MetaSum construction — those name AWS's feature, not the customer.
       So the numbers and header names below are safe to quote in the paper AS THEY STAND HERE.
     • STILL OUTSTANDING, your decision: the pre-anonymisation design doc is in PUBLIC git
       history (tomlarkworthy/lopecode-dev, commit 1ac9749, 2026-08-21) with the account id and
       the viewer email.  See plan/live2026response.md § R8.
   ────────────────────────────────────────────────────────────────────────────────── */
const _0otyjzt = function _anonymous(experiment,md,externalLink) {return (experiment(md`**Try it.** Click 'Copy as JS', open ${ externalLink('maps.google.com', 'https://maps.google.com') }, open the developer console and paste.`));};
const s7h = function _anonymous(sec) {return (sec('liberation'));};
/* ── ANNOTATION ──────────────────────────────────────────────────────────────────────
   R2 — Pangram window 4, AI 0.86 (chars 11125–12410, this cell and s7p2).  The only AI-flagged
   window in the front half of the document, and it is short and self-contained.

   No reviewer complaint about the content; 8A liked §liberation implicitly ("Really like the
   dynamic nature of the essay").  Rewrite for texture only, and see the _0otyjzt block — the
   CloudWatch episode is arguably a second liberation story and could live near here.
   ────────────────────────────────────────────────────────────────────────────────── */
const s7p1 = function _anonymous(md,externalLink) {return (md`The reflective interface also works on runtimes booted by someone else. ${ externalLink('ObservableHQ.com', 'https://ObservableHQ.com') } is the hosted notebook service Lopecode grew out of. Notebooks there are compiled on Observable's servers; the source of record lives in their database, and the browser only ever receives the compiled program. Observable's own export paths use privileged knowledge of that source: the embed API is a server endpoint, and the runtime export is a multi-file bundle of compiled code that needs a local webserver to open and contains no source at all. What you get is an embedding. It runs, but it carries no editors and cannot export itself again.`);};
const s7p2 = function _anonymous(md,aside,externalLink,cite) {return (md`The ${ aside('exporter-3', '@tomlarkworthy/exporter-3') }, also published on Observable as ${ externalLink('exporter-3', 'https://observablehq.com/@tomlarkworthy/exporter-3') }, takes the reflective route. Imported into any notebook on the platform, it scans the live runtime in the page, decompiles what it finds, and writes a single Lopecode HTML file. We have no access to Observable's stored source and do not need it. The export is transitive: an artifact made by reflection contains the exporter's own machinery, so it can re-export, you can even export exporter-3 with itself. The copy is then independent of the platform. For larger extractions — several notebooks, their file attachments, a framing UI — ${ externalLink('jumpgate', 'https://observablehq.com/@tomlarkworthy/jumpgate') } drives the same reflection with more tooling for composing arbitrary mixtures of modules; it is how the content repositories behind this essay are maintained.

Exporter-3 liberates a *copy*; the hosted original remains. We can consider exporter-3 an example of *Adversarial Extension* ${ cite('shank2025hostile') }.`);};
/* ── ANNOTATION ──────────────────────────────────────────────────────────────────────
   R8 — THE REPLACEMENT DEMO (Claude's draft, per your 2026-09-10 brief).  This is a full worked
   example written as prose; edit it freely, it is not a site-marker.  It is a new numbered
   section after §liberation, so it renumbers §jam onward and adds a fourth field episode.

   BLANKS FOR YOU TO FILL:
     • cwPlot: `const shareLink = ""` — paste a share link to a NON-Taktile demo CloudWatch
       dashboard you build for this.  Until it is set the cell renders a placeholder.
     • cwp4: externalLink href 'TODO-aws-dashboard-url' — where the demo aws-dashboard notebook
       will live (it carries cw-share-auth + cw-metrics; those modules are canonical only inside
       lopebooks/notebooks/@tomlarkworthy_aws-dashboard.html and are not published).
     • THE INFRA: to make cwPlot live, import from the aws-dashboard notebook:
         cwFetchDashboard, cwFetchWidget, cwPlotWidget (from @tomlarkworthy/cw-metrics)
         cwShareAuth / session              (from @tomlarkworthy/cw-share-auth)
       then replace cwPlot's placeholder body with a real cwPlotWidget(...) call.  Those modules
       are NOT bundled here yet — don't aside() them or the pane 404s.
     • [N] datapoints / [M] widgets in cwp4: the measured run was ~1,593 datapoints across a
       39-series SEARCH expansion; quote the demo's own numbers once it is built.

   ABSTRACT: if this ships as a fourth episode, update the "three field episodes" count in
   _abstract / s2p1.  CLAIM: cwp5 states the boundary held + a disclosure line; confirm you are
   happy to publish that framing (see the _0otyjzt block).
   ────────────────────────────────────────────────────────────────────────────────── */
const cwh = function _anonymous(sec) {return (sec('cloudwatch'));};
const cwp1 = function _anonymous(md,ref) {return (md`The ${ ref('iife') } unloader turns any page that will run a script into a host for a live runtime; ${ ref('liberation') } used it to free a *program*. Here we used it to free *data*. The motive was ordinary: CloudWatch dashboards are serviceable but plain, and we wanted to redraw one with our own charts — a better skin over data we were already authorised to see — without standing up a second login or provisioning an API key. The numbers were already on the screen. The question was whether code we pasted in could reach them.`);};
const cwp2 = function _anonymous(md,externalLink) {return (md`We opened a shared dashboard, pasted *Copy as JS* into the browser console, and a Lopecode runtime booted inside the \`console.aws.amazon.com\` origin, sharing the page's session. We connected an in-page ${ externalLink('Claude Code', 'https://observablehq.com/@tomlarkworthy/claude-code-pairing') } agent to that runtime. It now held two things at once: a reflective runtime it could rewrite cell by cell, and a host page whose own private requests it could read from the same origin.`);};
const cwp3 = function _anonymous(md) {return (md`We asked it to return the series the dashboard was drawing. It wrapped the page's \`fetch\` and \`XMLHttpRequest\`, watched the console make its own calls, and rebuilt the read path. That path is not the public API: the data comes from an internal console target, \`CloudWatchVersion20130116.GetMetricData\` on \`monitoring.<region>.amazonaws.com\`, and a plain SigV4 request is refused even with the host's live credentials. Three undocumented ingredients are required — a specific \`x-amz-user-agent\`, an \`X-Amz-Sharing-MetaSum\`/\`-MetaTime\` pair that hashes the request, and a per-widget token, \`X-CloudWatch-SharedDashboardToken\`, that \`GetDashboard\` returns on each widget and that the signature must cover. AWS's own \`GetDashboard\` reference lists three response fields and no such token, and we found no public documentation of the header; the agent recovered it from the wire, by iteration, not from a manual.`);};
const cwp4 = function _anonymous(md,externalLink) {return (md`Once the mechanism was known it no longer needed the host page. A standalone auth module mints the credentials a link-holder receives — SRP-6a against the dashboard's Cognito pool, then \`AssumeRoleWithWebIdentity\` on the share role — and a metrics module assembles the signed request with the three extra ingredients. We serialized the notebook to one HTML file, opened it with no AWS page in sight, and it rendered real series: [N] datapoints across [M] widgets. The chart below runs that path live; its infrastructure is built in the ${ externalLink('AWS dashboard notebook', 'TODO-aws-dashboard-url') }.`);};
const cwPlot = function _anonymous(htl) {
  const shareLink = ""; // TODO: paste a share link to a demo (non-Taktile) CloudWatch dashboard
  const box = (body) => htl.html`<div style="border:2px dashed color-mix(in srgb, currentColor 35%, transparent);border-radius:8px;padding:1.1em 1.2em;margin:1em 0;font-size:0.92em;line-height:1.5">${ body }</div>`;
  if (!shareLink)
    return box(htl.html`<strong>AWS datasource plot goes here.</strong><br>Set <code>shareLink</code> in this cell to a demo CloudWatch dashboard, and import <code>cwFetchDashboard</code> / <code>cwFetchWidget</code> / <code>cwPlotWidget</code> from the AWS dashboard notebook. The plot then fetches and renders live, outside any AWS domain.`);
  return box(htl.html`<em>Share link set.</em> Replace this placeholder with a live <code>cwPlotWidget</code> call once the cw-metrics / cw-share-auth modules are imported.`);
};
const cwtry = function _anonymous(experiment,md) {return (experiment(md`**Try it.** Open a CloudWatch dashboard you have access to, click *Copy as JS* above, open the browser console on that page and paste. The essay's runtime boots inside the AWS origin, and from there it can read the same data the page is drawing.`));};
const cwp5 = function _anonymous(md,cite) {return (md`This is the source-last claim against a target we do not own. You cannot instrument an application you are not inside; deserializing the runtime *into* the page is what made the host's network legible, and pairing an agent with that runtime is what turned a reverse-engineering session into a module that travels with the file. The boundary held: the token authorises only the metrics a shared dashboard already shows, re-windowed and re-aggregated, and is obtainable only by someone who already holds the share link — so this documents an internal protocol working as intended, not an escalation. The nearest prior work, ${ cite('reversec2025cloudwatch') }, attacked the *identity* side of the same feature — a Cognito misconfiguration that over-granted to link holders, fixed by AWS in 2024; this is the *authorisation* side.`);};
const s9h = function _anonymous(sec) {return (sec('jam'));};
/* ── ANNOTATION ──────────────────────────────────────────────────────────────────────
   R2 — HERE IS WHERE THE DETECTOR AND THE REVIEWER AGREE.

   8C: "I found it a bit painful to get through section 8 and onwards, possibly because of poor
   LLM writing?  Ctrl+f the point for some LLM-writing-isms that were hard to read."

   Pangram puts the boundary at chars 12624 — the second sentence of THIS CELL — and holds
   AI 0.95 for the remaining 2087 words, to the end of the document.  Everything from here down
   is inside that one window: s9p2, s10p1, s11p1, s11p2, s12p1–s12p7, s13p1, s14p1.

   grep -c "the point" on the module returns 4: s9p2, s10p1, s12p4, s12p6.  All four are below.
   8C's ctrl+f was a real signal, not a guess.

   How to use this: the score is per-window, so it cannot rank the paragraphs against each other.
   It tells you the boundary and the extent.  Rewrite by hand, then rescore:
      bun tools/prose-qa/pangram-score.ts lopebooks/notebooks/@tomlarkworthy_lopecode-live-2026.html \
        --module @tomlarkworthy/lopecode-live-2026 --score --min 0.5
   and compare fraction_ai against 0.647 in the saved report.  Do NOT run a rewrite loop against
   the score — it is a detector, not a judge.  The fix is specifics, dates, numbers, observed
   facts, in your phrasing.

   This cell specifically: it is the only first-person field report in the back half and it is the
   best-liked material in the essay (8A: "I liked that pretty often when a point was being made,
   it was answered with an example").  R9 — do not lose the voice while fixing the texture.
   ────────────────────────────────────────────────────────────────────────────────── */
const s9p1 = function _anonymous(md,aside) {return (md`I shared a vibed audio notebook in a session with a music teacher, a domain expert, not a programmer and their polite verdict was that it was *basic*. So together we asked the in-runtime ${ aside('coding agent', '@tomlarkworthy/robocoop-5') } for richer sounds. Live, it wrote new instruments and effects, with presets, as extensions to the existing audio application. The feedback was immediate and audible; the teacher directed, the agent programmed. When the session ended we saved the ${ aside('butter-synth', '@tomlarkworthy/butter-synth') } and shared a copy over WhatsApp as a memento.`);};
/* ── ANNOTATION ──────────────────────────────────────────────────────────────────────
   R2 — "The copy is the point."  One of the four `the point` hits 8C ctrl+f-ed.

   Suggestions:
     • The construction "X is the point" appears four times in the back half and nowhere in the
       front half.  That repetition IS the tell, more than any individual sentence.
     • The paragraph has real specifics in it — tape saturation, chorus, reverb pre-delay, "Dub
       Echo (Safe from Harm)", Massive Attack.  Those are the parts a detector cannot fake and a
       reader remembers.  The framing sentences around them are the machine-written layer.
     • The second paragraph ("To be precise about what survives…") is doing definitional work that
       §copy already did.  Candidate for deletion rather than rewriting.
   ────────────────────────────────────────────────────────────────────────────────── */
const s9p2 = function _anonymous(md,externalLink,aside,ref) {return (md`The copy is the point. The agent's contributions were cell definitions, so decompilation captured them exactly as it captures human-written cells: the exported file contains the new effects chain, still live. The version bundled in this essay is the one saved that day — diffing it against the ${ externalLink('ATProto butter-synth', 'https://did-plc-j7nm3lrd5h7fm3sfhcv3lhfv.lopecode.com/r/coding-tools#view=R100(S50(@tomlarkworthy/why-claude-code-codes-well,@tomlarkworthy/exporter-3,@tomlarkworthy/runtime-sdk,@tomlarkworthy/claude-code-pairing,@tomlarkworthy/atproto),S50(@tomlarkworthy/butter-synth))&cc=LOPE-55599-EVR2') }  shows what the agent added: a tape-saturation stage, a chorus, reverb pre-delay, and a dub delay it titled *"Dub Echo (Safe from Harm)"*, named after the teacher favourite electronic band *Massive Attack* whose sound was being chased. ${ aside('Play it', ['@tomlarkworthy/butter-synth']) }.

A recording of the session would have captured the sound; the document captured the *instruments*. To be precise about what survives: definitions and declared state (writable file attachments) serialize; transient values do not — they recompute on boot, unless deliberately promoted into a definition, as the slider in ${ ref('copy') } does. Ephemeral, machine-generated code became a durable artifact because serialization reads the runtime, and the runtime is where that code lived.`);};
const s10h = function _anonymous(sec) {return (sec('agent'));};
/* ── ANNOTATION ──────────────────────────────────────────────────────────────────────
   R2 + R7 — three paragraphs, all inside the 0.95 window, and the second `the point` hit.

   8A, pre-emptively, on on-ramps: "someone's got to be able to use it.  What tools could be
   provided to make the on-ramps smoother?  I think I would be disappointed, but would understand,
   if the answer was just 'have LLMs do it'."

   That is a direct shot at what this section currently argues.  The essay's answer to "how does
   a non-programmer change the thing" is, right now, the agent.  8A has told you in advance that
   this answer will disappoint.

   Suggestions:
     • The honest answer is already written down at the other end of the essay, in s13p1: "The
       moldability gradient is steep.  We have no evidence yet that a non-programmer can cross
       that gradient unaided."  Consider connecting the two explicitly instead of letting §agent
       make a claim §limits retracts.
     • R6's unwritten half could land here: 8C asked "to what extent can a live system be
       modified by itself?"  The repro answered it with a boundary — the parts of the editor that
       are DATAFLOW refresh live; the part that was a CONSTRUCTOR CALL CACHED IN A MAP did not,
       until it was fixed on 2026-09-09.  That is a concrete, measured answer to a conceptual
       question, and this section (self-modification) or s13p1 is where it goes.
     • "The consequence is personal histories." / "The corollary is that…" — the same scaffold
       twice in one cell.
   ────────────────────────────────────────────────────────────────────────────────── */
const s10p1 = function _anonymous(md,aside,cite,ref) {return (md`${ aside('robocoop', ['@tomlarkworthy/robocoop-5']) }, the agent used in the jam, executes inside the runtime as a dataflow program: it reads program state as well as code, and modifies cells through the same reflective interface the human editors use. This inverts the usual topology of AI-assisted programming. A coding harness such as Claude Code lives in the developer's environment and operates on source files, and the application ships separately, without it. Here the runtime, the editors, the agent harness and the application are a single bundle: what ships is an entire snapshot of an application and the application's development environment.

The consequence is personal histories. Every copy is a complete development environment, so each copy can evolve independently of any canonical upstream. The music teacher's copy of the jam contains the new instruments and the means — editors, agent, exporter — to keep changing them, independently of us and of any server. Among this document's background jobs is a ${ aside('change recorder', ['@tomlarkworthy/local-change-history']) }, so a copy's edits are logged and replayable — version history kept inside the artifact itself, a direction Backstitch is also pursuing for the Godot editor ${ cite('backstitch2026') }. Copies diverge into lineages owned by their holders; malleability survives distribution because the toolchain travels inside the artifact.

The corollary is that the agent is a per-artifact composition decision, not a platform property. The tool in ${ ref('ship') } went into a regulated environment carrying no agent. The jam carried one, because a generative collaborator was the point. Match what rides along to the sensitivity of the destination.`);};
const s11h = function _anonymous(sec) {return (sec('waist'));};
/* ── ANNOTATION ──────────────────────────────────────────────────────────────────────
   R3 — DEFINE `waist`.  8C: "waist (is it 'thin waist' or 'reflective waist'?  What is this
   exactly in Lopecode?)"

   Both phrases are in use.  s5p3 says "the reflective waist" six sections before this section
   defines anything; this section says "the thin waist" and "its reflective half".

   Suggestions:
     • Pick one term and use it everywhere, including s5p3.
     • Answer "what is it exactly": the diagram below says Function.prototype.toString(), the
       prose says "the browser, es-module-shims, the Observable runtime and a bootloader".  Those
       are two different things — the narrow interface, and the layer below it.  8C is asking
       which one the word names.
     • 48 KB and 6.5 KB are the kind of number the back half otherwise lacks.  Keep them, and
       date them if they are measurements.

   Pangram: window 6, AI 0.95.
   ────────────────────────────────────────────────────────────────────────────────── */
const s11p1 = function _anonymous(md, cite, ref) {return (md`What is the irreducible, non-userspace core? Below the line sit the browser, es-module-shims for import interception, the Observable runtime (6.5 KB) and a bootloader; a minimal Lopecode file is about 48 KB. Everything else demonstrated in this essay is userspace. The interface between the two layers is narrow, in the manner of the Internet's hourglass ${ cite('beck2019hourglass') }, and its reflective half is a single web standard: \`Function.prototype.toString()\`. The waist is specified: the stage-4 toString revision requires the returned string to be the function's actual source text ${ cite('tc39tostring') }, and the same specification names the conditions under which a host may withhold it, a limit we return to in ${ ref('limits') }.`);};
const _hourglassDiagram = function _hourglassDiagram(htl) {
    const W = 680, H = 312;
    const label = (x, y, t, weight = 600, size = 12, op = 1) => htl.svg`<text x="${ x }" y="${ y }" text-anchor="middle" font-size="${ size }" font-weight="${ weight }" fill="currentColor" fill-opacity="${ op }">${ t }</text>`;
    const nav = (module) => () => {
        const h = `#view=R100(S50(@tomlarkworthy/lopecode-live-2026),S50(${ module }))`;
        window.history.pushState(null, '', h);
        window.dispatchEvent(new window.HashChangeEvent('hashchange'));
    };
    // one box per userspace module, aside-linked; loose coupling = no lines between them
    const rows = [
        ['editor-5', 'editable-md', 'sticky', 'module-map', 'cell-map'],
        ['exporter-3', 'atproto', 'robocoop-5', 'local-change-history']
    ];
    const waist = { x: W / 2 - 110, y: 200, w: 220, h: 30 };
    const boxes = [], lines = [];
    const anchors = [];
    rows.forEach((names, r) => {
        const widths = names.map((n) => 16 + n.length * 6.6);
        const total = widths.reduce((s, w) => s + w, 0) + (names.length - 1) * 14;
        let x = (W - total) / 2;
        const y = 40 + r * 40;
        names.forEach((name, i) => {
            const w = widths[i];
            boxes.push(htl.svg`<g style="cursor:pointer" onclick=${ nav('@tomlarkworthy/' + name) }>
        <title>open @tomlarkworthy/${ name }</title>
        <rect x="${ x }" y="${ y }" width="${ w }" height="26" rx="6" fill="color-mix(in srgb, #7fbf7f 10%, var(--theme-background, Canvas))" stroke="#7fbf7f" stroke-width="1.1"/>
        <text x="${ x + w / 2 }" y="${ y + 17 }" text-anchor="middle" font-size="11" fill="currentColor" text-decoration="underline">${ name }</text>
      </g>`);
            anchors.push({ x: x + w / 2, y: y + 26 });
            x += w + 14;
        });
    });
    // every module converges on the same waist, independently; left-to-right so lines fan without crossing
    [...anchors].sort((a, b) => a.x - b.x).forEach((a, i) => {
        const xt = waist.x + 25 + i * (waist.w - 50) / (anchors.length - 1);
        lines.push(htl.svg`<line x1="${ a.x }" y1="${ a.y }" x2="${ xt }" y2="${ waist.y }" stroke="#6f9ed6" stroke-opacity="0.55" stroke-width="1"/>`);
    });
    return htl.svg`<svg viewBox="0 0 ${ W } ${ H }" style="max-width:${ W }px;width:100%;height:auto;color:inherit;font-family:system-ui,-apple-system,sans-serif">
    ${ label(W / 2, 26, 'userspace — loosely coupled, replaceable modules', 700, 12.5) }
    ${ lines }
    ${ boxes }
    <rect x="${ waist.x }" y="${ waist.y }" width="${ waist.w }" height="${ waist.h }" rx="7" fill="#e0b25222" stroke="#e0b252" stroke-width="1.2"/>
    ${ label(W / 2, waist.y + 19, 'Function.prototype.toString()', 700, 11) }
    <path d="M ${ W / 2 - 60 } ${ waist.y + waist.h } L ${ W / 2 + 60 } ${ waist.y + waist.h } L ${ W / 2 + 140 } 248 L ${ W / 2 - 140 } 248 Z" fill="#6f9ed618" stroke="#6f9ed6" stroke-width="1.2"/>
    <rect x="40" y="250" width="${ W - 80 }" height="52" rx="7" fill="#b57fc918" stroke="#b57fc9" stroke-width="1.2"/>
    ${ label(W / 2, 271, 'browser JS engine + Observable reactive runtime', 700, 12) }
    ${ label(W / 2, 288, 'the platform: standard, not ours, not moldable from within', 400, 10.5, 0.65) }
  </svg>`;
};
/* ── ANNOTATION ──────────────────────────────────────────────────────────────────────
   R3 — CUT THE BOOTSTRAPLAB VOCABULARY.  8C names it explicitly: "BootstrapLab stuff around
   Platform, substrate, product" is unnecessary.

   That is the whole second paragraph of this cell.  The jakubovic2022ladder citation still earns
   its place in §related (s12p2); the platform/substrate/product mapping does not need restating
   here in their vocabulary.

   The first paragraph — "the narrow waist pays twice" — is doing real work and should survive.
   Note it is also where uncoordinated tooling is argued, which is the modularity point 8B wants
   more of (see s12p4).

   Pangram: window 6, AI 0.95.
   ────────────────────────────────────────────────────────────────────────────────── */
const s11p2 = function _anonymous(md,aside,externalLink,cite) {return (md`The narrow waist pays twice. First, it lets tooling be *uncoordinated*. ${ aside('editable-md', ['@tomlarkworthy/editable-md']) } (the prose editing in this page), ${ aside('editor-5', ['@tomlarkworthy/editor-5']) } (the code editor behind Edit mode), the ${ aside('exporter', '@tomlarkworthy/exporter-3') } and the agent do not know about each other. Each reads and writes the runtime through the same reflective interface, so a new editor is a module you import, not a fork of the system. Second, the waist is a web standard rather than a private VM interface, so the artifact inherits the browser's backwards-compatibility discipline. Our first, embarrassing export from January 2025 ${ externalLink('still opens', 'https://raw.githubusercontent.com/tomlarkworthy/lopecode/459c924658b8a18fe46a51719c1ab2de36a839a7/webpage.html') }.

In the vocabulary of BootstrapLab ${ cite('jakubovic2022ladder') }: the *platform* is the browser plus the Observable runtime; the *substrate* is the script-block container plus the reflection SDK; everything above is *product*. Lopecode did not ascend from a low-level instruction set — it inherited a high platform and closed the loop by making the producer, the exporter, ordinary userspace modules.`);};
const s12h = function _anonymous(sec) {return (sec('related'));};
const s12p1 = function _anonymous(md, cite, ref) {return (md`The form of this submission follows ${ cite('edwards2019') }. That paper criticizes LIVE-style venues for work "presented informally, through screencasts", lacking related work, and proposes the interactive essay, evaluated by inquiry, as the remedy — while naming the archival fragility of web essays as an open difficulty, "easier to address if they are self-contained". This essay is submitted as evidence on that point: an interactive essay that is self-contained by construction, carries its own tooling, and re-exports itself. We adopt their author guidelines, including the requirement for problematic examples (${ ref('limits') }).`);};
const s12p2 = function _anonymous(md, cite) {return (md`${ cite('jakubovic2023techdims') } define a programming system as "an integrated and complete set of tools sufficient for creating, modifying, and executing programs", which is the register in which Lopecode asks to be judged: it is not a language and not a library. Their design-space maps observe "a conspicuous blank space at the top-right" where high self-sustainability meets high notational diversity; Lopecode sits toward that corner, re-serializing itself while its notation spans prose, code, widgets and whole userspace UIs. ${ cite('jakubovic2022ladder') } define self-sustainability as dissolving the product/source/producer distinction, and reach it by ascending from a minimal substrate. Their persistence, notably, was a manual walk of the state graph to a JSON file — "reminiscent of the image-based persistence in Smalltalk, though it is frustratingly manual". The exporter is Lopecode's answer to exactly that problem, and it adds the axis their account leaves open: the product is a single runtime-free file, so persistence doubles as dissemination.`);};
const s12p2b = function _anonymous(md, cite, aside) {return (md`The mechanism belongs to the reflection literature. ${ cite('smith1984reflection') } introduced procedural reflection — a program able to represent and act on its own state. ${ cite('maes1987reflection') } named the general property *computational reflection* and reified it as metaobjects. ${ cite('kiczales1991amop') } turned reflection into an engineering practice: expose the implementation to userspace as a metaobject protocol. Lopecode's ${ aside('runtime SDK', ['@tomlarkworthy/runtime-sdk']) } is a metaobject protocol in that engineering sense — the editors, the exporter and the agent are metaprograms written against it — though the reflection on offer is deliberately coarse: whole definitions are read and written, and there is no intercession in the scheduler.`);};
const s12p3 = function _anonymous(md, cite) {return (md`The exporter is a *mirror* in the sense of ${ cite('bracha2004mirrors') }: a meta-level facility separated from the base program (their *stratification*) that reifies the runtime's own categories — modules, cells and attachments map one-to-one onto script blocks (their *ontological correspondence*). Bracha and Ungar motivate mirrors by "significant advantages with respect to distribution, deployment and general purpose metaprogramming"; a mirror whose output is a deployable artifact takes that motivation literally.`);};
/* ── ANNOTATION ──────────────────────────────────────────────────────────────────────
   R5 — SMALLTALK IS UNDERPLAYED.  8B (expertise 4, the most expert reviewer):

     "although the connection with Smalltalk is acknowledged I felt it was still a little
      underplayed.  Code in the Smalltalk image is stored as an AST and imported/exported as text
      only when needed.  Images were in practice shared and copied in order to collaborate and
      deploy.  OTOH it appears that Lopecode has a better approach to modularity, which could be
      discussed more."

   Read that carefully: 8B is saying the round trip and the shareable image are NOT the
   differentiators — Smalltalk had both — and is handing you the one that is.  This paragraph
   currently differentiates on legibility (text vs memory dump) and evaluation model (reactive vs
   imperative), and does not mention modularity at all.

   Suggestions:
     • Correct the record: an image stores an AST and exports text on demand.  As written, "an
       image is an opaque memory dump" is the claim 8B is pushing back on.
     • Say what modularity buys that an image does not: a Lopecode file is a SET of modules with
       an import graph, so a copy can carry a chosen subset and two lineages can be recombined.
       An image is all-or-nothing.  This is also the thesis-level point flagged at s2p1.
     • Third `the point` hit is in this cell ("The differences are the point").

   R5 also, 8B: "Related work: ColorForth rewrites its source to update state."  That is a new
   citation and it is a precise hit on the `sticky` mechanism of §copy — a system that stores
   state by rewriting its own source.  Add it to _bibliography and cite it at s5p2/s5p3 as well
   as here.
   ────────────────────────────────────────────────────────────────────────────────── */
const s12p4 = function _anonymous(md,cite) {return (md`The comparison Lopecode invites most is the Smalltalk image ${ cite('ingalls1981') }. An image persists a whole live world, and so does a Lopecode file. The differences are the point: an image is an opaque memory dump bound to its VM, where the Lopecode mapping is legible text bound to a web standard; and Smalltalk is imperative message-passing where Lopecode is reactive dataflow. Smalltalk remembers values, Lopecode only exports code. We cite Smalltalk for image persistence and total moldability, not as an architectural analogy. Squeak sharpened the self-description end of that tradition — a Smalltalk whose virtual machine is written in itself ${ cite('ingalls1997squeak') }; its producer is a translator that emits a VM, where Lopecode's producer is an exporter that emits a document.`);};
const s12p5 = function _anonymous(md, cite, ref) {return (md`${ cite('miranda2025singlehtml') } is the closest recent precedent: single HTML files that modify and save themselves. In our vocabulary his file is the canonical artifact — format-first — where Lopecode's file is one projection among three. ${ cite('klokmose2015webstrates') } made the DOM itself the shared persistent substrate; again the persisted structure is the document. The mechanism specific to Lopecode is that the persisted form is decompiled on demand from live functions, which is what makes the projections plural and the export transitive (${ ref('liberation') }).`);};
/* ── ANNOTATION ──────────────────────────────────────────────────────────────────────
   R2 — fourth and last `the point` hit is in this cell.

   R5 also, 8A on Lisp: "A reductive take on this work would observe that this is just the
   blurring of code and data taken to a particular extreme.  The comparison with LISP is rightly
   noted in the related work, but I think there's more to examine there. … how does a system that
   makes the notion of data versus source code meaningless compare?"

   Note the essay does not actually compare with Lisp anywhere — s14p1 mentions "Image persistence
   in Smalltalk and Lisp" in one clause and §related never returns to it.  8A believes it is
   there.  Either write the comparison or stop implying it.

   Suggestion for the substance: homoiconicity makes code and data the same REPRESENTATION;
   source-last makes the source a DERIVED VIEW of a running thing.  Those are different moves and
   the difference is worth a paragraph — it is also the "reductive take" 8A is inviting you to
   refute.
   ────────────────────────────────────────────────────────────────────────────────── */
const s12p6 = function _anonymous(md, cite, ref) {return (md`${ cite('litt2025malleable') } argue for software that users reshape at the point of use, and diagnose the wall between users and "engineering teams at distant corporations". A document that carries its own editors is one concrete form of point-of-use agency, and ${ ref('ship') } is a field report of it crossing an actual corporate wall. ${ cite('shank2025hostile') } name the adversarial conditions live programming meets outside the lab; our findings on hosts that defend themselves (${ ref('limits') }) are the same territory approached from the distribution side. ${ cite('horowitz2023lrc') } name persistence as the quality separating rich in-notebook widgets from programming: interactions with a rendered tool "cannot be 'saved' back to the notebook, and their effects will always disappear when the notebook is reloaded". A definition that is data a cell can rewrite (${ ref('copy') }) supplies that quality from userspace.`);};
const s12p7 = function _anonymous(md, cite, ref) {return (md`Outside research systems, decompilation is already how shipped software gets reopened. Minecraft's modding ecosystem stands on decompiling and re-mapping an obfuscated binary — the libre yarn mappings exist for exactly this ${ cite('fabricyarn') } — and the Super Mario 64 decompilation reconstructs buildable source from a ROM ${ cite('sm64decomp') }. Those communities work for years to recover what the vendor withheld. A source-last artifact withholds nothing: decompilation here is the system's ordinary read path, not an act of reverse engineering (${ ref('cell') }).`);};
const s13h = function _anonymous(sec) {return (sec('limits'));};
/* ── ANNOTATION ──────────────────────────────────────────────────────────────────────
   R4 — KEEP THIS SECTION, RE-SELECT IT.  Both reviewers commented and they disagree usefully.

   8B: "I greatly appreciated the Problematic Examples section."
   8A: "The limitation section is great; the candidness is laudable."
   8C wants a different cut — too implementation-detail-y and unmotivated: "The browser has its
   own limitations, No closures means not general JavaScript, Decompilation has edge cases";
   and on the two that are too short: "The underdeveloped ones are interesting, please explain
   and elaborate those" — naming "Offline-first is manual labour, The moldability gradient is
   steep".

   R9 WARNING: this section is load-bearing for two of the three accepts.  Re-select, do not trim.

   Suggestions:
     • EXPAND: "The moldability gradient is steep".  Two sentences today.  This is also 8A's
       on-ramp question (see the s10p1 block) — expanding it answers two reviewers at once.  The
       honest content exists: what a non-programmer can change (a value, a paragraph), what needs
       the runtime SDK, and the sentence you already have — "We have no evidence yet that a
       non-programmer can cross that gradient unaided."
     • EXPAND: "Offline-first is manual labour".  What vendoring actually costs, with a number.
     • COMPRESS or CUT: the three 8C names.  "The browser has its own limitations" is arguably not
       a limitation of Lopecode at all — the same paragraph already says the sandbox is why the
       file is distributable.
     • R6 — the fix landed on 2026-09-09, so this section does NOT need a ninth item about it.
       What it may need is the boundary as a general statement: reflection reaches dataflow;
       memoised construction was outside it until it was found by a reviewer using the artifact.
       "A reviewer found this by hand" is exactly the candour 8A praised.  See plan/live2026response.md
       § R6 for the measurements (0/186 before, 186/186 after).
     • R7 / 8B: "The Achilles' heel of image-based programming is schema migration.  Does Lopecode
       need to deal with that?"  From the most expert reviewer, and it is a limitation-shaped
       question.  Candidate ninth item.  Note the honest answer may be that there is no schema, so
       the problem reappears somewhere else rather than disappearing — say where.
     • R7 / 8C: "Can divergent lopecode notebooks be merged?  How could that go?"  Also
       limitation-shaped.  You have real evidence either way: the file is uncompressed and
       git-diffable by design, and this repo merges notebooks at BLOCK granularity every day —
       but merging live STATE is a different problem.  Worth being precise about which one is
       solved.
     • "Adversarial hosts can protect against injection" — the Google Trends example stays true,
       but if the CloudWatch episode goes in (see _0otyjzt) this item needs to sit next to it:
       one host defended itself, another did not.

   Pangram: window 6, AI 0.95, all nine paragraphs.  Given 8B and 8A both praised this section as
   it stands, treat that score with particular suspicion — the parallel bold-lead structure is
   formulaic by design and the detector will punish it whoever wrote it.
   ────────────────────────────────────────────────────────────────────────────────── */
const s13p1 = function _anonymous(md,cite,ref) {return (md`Following the guideline in ${ cite('edwards2019') }: problems in roughly the same number as benefits.

**Not everything round-trips.** Serialization captures definitions and declared state. State accumulated outside a file attachment reboots to its definition, not to its moment. The sticky idiom of ${ ref('copy') } narrows the gap by rewriting chosen view state into the definition, but only for JSON-serializable values with commit semantics.

**Decompilation has edge cases.** \`toString()\` recovers compiled JavaScript; the inverse mapping back to notebook syntax is engineered, not free. Agents that write arbitrary low-level definitions can create undecompilable expressions. A reactive test guards the decompilability invariant to warn the agent, but the agent might ignore the warning. The web platform can also decline: the specification's \`HostHasSourceTextAvailable\` hook lets a host withhold source text entirely ${ cite('tc39tostring') }.

**No closures means not general JavaScript.** The recovered source is complete only because cells close over nothing (${ ref('cell') }). \`toString()\` cannot capture a closure environment, so the technique does not extend to programs that use closures for state — which is most idiomatic JavaScript. Source-last recovery is a property of the closure-free cell shape the Observable Runtime encourages, not of the language.

**The browser has its own limitations.** Arbitrary HTTP is subject to CORS, and raw TCP, processes and the local file system are unavailable, so whole classes of useful programs cannot be expressed. The same sandbox is why the file is a viable distribution format at all (${ ref('ship') }): the dangerous facilities of remote code execution are neutered by the environment itself.

**The moldability gradient is steep.** Changing a value or a paragraph is simple. Replacing the exporter or the editor requires understanding the runtime SDK. We have no evidence yet that a non-programmer can cross that gradient unaided. Agents have a habit of glitching themselves when attempting it.

**A document that runs code is a phishing shape.** The same properties that carried the tool of ${ ref('ship') } through a corporate boundary could carry a malicious payload. Provenance and signing are unsolved in Lopecode. Plain-text legibility is a partial mitigation, and some email gateways rightly quarantine HTML attachments.

**Adversarial hosts can protect against injection.** The injection direction of ${ ref('iife') } works on cooperative or self-owned pages. Commercial sites defend themselves: when we injected into Google Trends, the page disabled itself even with content-security policy turned off.

**Offline-first is manual labour.** Every dependency must be vendored into the file. We chose openness over conceptual integrity here, and the price is that adopting a library is a deliberate act, not an import statement.`);};
const s14h = function _anonymous(sec) {return (sec('questions'));};
/* ── ANNOTATION ──────────────────────────────────────────────────────────────────────
   R1 (downstream) — the three LIVE questions.  Rewrite LAST.

   Q1 currently answers with the thesis as it stands ("Source-last design").  If R1 changes the
   claim to "the save format bounds the ontology", this answer changes with it.

   Q2 says "Image persistence in Smalltalk and Lisp" — see the s12p6 block: 8A read that as a
   promise of a Lisp comparison that §related does not deliver.

   Q3 lists the limits; it must match whatever s13p1 ends up containing, including anything added
   for schema migration or merging.

   Pangram: window 6, AI 0.95.
   ────────────────────────────────────────────────────────────────────────────────── */
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
/* ── ANNOTATION ──────────────────────────────────────────────────────────────────────
   R5 — ADD ColorForth.  8B: "Related work: ColorForth rewrites its source to update state."

   Cite it at s12p4 and, more importantly, at s5p2/s5p3 where `sticky` does exactly this.  It is
   the closest prior art to the sticky mechanism in the whole bibliography and it is missing.

   If the CloudWatch episode goes in (see _0otyjzt), it needs no citation but the AWS docs claim
   about GetMetricData scoping is at plan/aws-dashboard-viewer-design.md:45 if you want one.
   ────────────────────────────────────────────────────────────────────────────────── */
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
  },
  reversec2025cloudwatch: {
    label: 'Tsaousis 2025',
    authors: 'Tsaousis, L.',
    year: 2025,
    title: 'CloudWatch Dashboard (Over)Sharing',
    venue: 'Labs by Reversec (WithSecure)',
    url: 'https://labs.reversec.com/posts/2025/01/cloudwatch-dashboard-oversharing'
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
  { key: 'copy', title: 'Copying the live system' },
  { key: 'mappings', title: 'Formats are mappings from the runtime' },
  { key: 'html', title: 'HTML: the document mapping', parent: 'mappings' },
  { key: 'atproto', title: 'ATProto: the record mapping', parent: 'mappings' },
  { key: 'iife', title: 'IIFE: an unloader for the HTML', parent: 'mappings' },
  { key: 'liberation', title: 'Liberation: exporting a program whose source you cannot see' },
  { key: 'cloudwatch', title: 'Data liberation: a CloudWatch dashboard' },
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
const _ref = function _ref(sectionIndex,htl) {return (key => {
    const s = sectionIndex.get(key);
    if (!s)
        return htl.html`<strong style="color:#c96a6a">[missing section: ${ key }]</strong>`;
    return htl.html`<a
    href="#"
    title="§${ s.num } ${ s.title }"
    onclick=${ ev => {
        ev.preventDefault();
        document.getElementById(`sec-${ key }`)?.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    } }
  ><em>§${ s.title }</em></a>`;
});};
const _cpboot = function _commandPaletteBoot(commandPaletteKeybinding, cp_menu_register, htl) {
    // observing these activates the palette keybinding + burger menu item (lazy otherwise)
    commandPaletteKeybinding, cp_menu_register;
    return htl.html`<span style="display:none"></span>`;
};
const _essayModuleView = function _essayModuleView(thisModule) {return (
  thisModule()
);};
const _essayModule = (G, _) => G.input(_);

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  $def("p0", "p0", ["md"], p0);  
  $def("_abstract", "abstract", ["md"], _abstract);  
  $def("p1", null, ["md","externalLink"], p1);  
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
  $def("s5p1", null, ["md","downloadAnchor","forkAnchor"], s5p1);  
  $def("_dialView", "viewof dial", ["sticky","Inputs"], _dialView);  
  $def("_dial", "dial", ["Generators","viewof dial"], _dial);  
  $def("s5p2", "s5p2", ["md","cite","aside"], s5p2);  
  $def("s5x1", null, ["experiment","md"], s5x1);  
  $def("_lv38man", null, ["md","aside"], _lv38man);  
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
  $def("s6ap1", null, ["md","externalLink","aside","ref"], s6ap1);  
  $def("s6ch", null, ["sec"], s6ch);  
  $def("s6cp1", null, ["md","ref"], s6cp1);  
  $def("_rccfld4", null, ["exporter"], _rccfld4);  
  $def("_0otyjzt", null, ["experiment","md","externalLink"], _0otyjzt);  
  $def("s7h", null, ["sec"], s7h);  
  $def("s7p1", null, ["md","externalLink"], s7p1);  
  $def("s7p2", null, ["md","aside","externalLink","cite"], s7p2);  
  $def("cwh", null, ["sec"], cwh);
  $def("cwp1", null, ["md","ref"], cwp1);
  $def("cwp2", null, ["md","externalLink"], cwp2);
  $def("cwtry", null, ["experiment","md"], cwtry);
  $def("cwp3", null, ["md"], cwp3);
  $def("cwp4", null, ["md","externalLink"], cwp4);
  $def("cwPlot", null, ["htl"], cwPlot);
  $def("cwp5", null, ["md","cite"], cwp5);
  $def("s9h", null, ["sec"], s9h);  
  $def("s9p1", null, ["md","aside"], s9p1);  
  $def("s9p2", null, ["md","externalLink","aside","ref"], s9p2);  
  $def("s10h", null, ["sec"], s10h);  
  $def("s10p1", null, ["md","aside","cite","ref"], s10p1);  
  $def("s11h", null, ["sec"], s11h);  
  $def("s11p1", null, ["md","cite","ref"], s11p1);  
  $def("_hourglassDiagram", "hourglassDiagram", ["htl"], _hourglassDiagram);  
  $def("s11p2", null, ["md","aside","externalLink","cite"], s11p2);  
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
  $def("_cpboot", "commandPaletteBoot", ["commandPaletteKeybinding","cp_menu_register","htl"], _cpboot);  
  $def("_essayModuleView", "viewof essayModule", ["thisModule"], _essayModuleView);  
  $def("_essayModule", "essayModule", ["Generators","viewof essayModule"], _essayModule);  
  main.define("exporter", ["module @tomlarkworthy/exporter-3", "@variable"], (_, v) => v.import("exporter", _));  
  main.define("module @tomlarkworthy/editable-md", async () => runtime.module((await import("/@tomlarkworthy/editable-md.js?v=4")).default));  
  main.define("module @tomlarkworthy/exporter-3", async () => runtime.module((await import("/@tomlarkworthy/exporter-3.js?v=4")).default));  
  main.define("downloadAnchor", ["module @tomlarkworthy/exporter-3", "@variable"], (_, v) => v.import("downloadAnchor", _));  
  main.define("forkAnchor", ["module @tomlarkworthy/exporter-3", "@variable"], (_, v) => v.import("forkAnchor", _));  
  main.define("module @tomlarkworthy/runtime-sdk", async () => runtime.module((await import("/@tomlarkworthy/runtime-sdk.js?v=4")).default));  
  main.define("thisModule", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("thisModule", _));  
  main.define("lookupVariable", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("lookupVariable", _));  
  main.define("module @tomlarkworthy/sticky", async () => runtime.module((await import("/@tomlarkworthy/sticky.js?v=4")).default));  
  main.define("sticky", ["module @tomlarkworthy/sticky", "@variable"], (_, v) => v.import("sticky", _));  
  main.define("module @tomlarkworthy/command-palette", async () => runtime.module((await import("/@tomlarkworthy/command-palette.js?v=4")).default));  
  main.define("commandPaletteKeybinding", ["module @tomlarkworthy/command-palette", "@variable"], (_, v) => v.import("commandPaletteKeybinding", _));  
  main.define("cp_menu_register", ["module @tomlarkworthy/command-palette", "@variable"], (_, v) => v.import("cp_menu_register", _));
  return main;
}