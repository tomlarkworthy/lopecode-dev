// @tomlarkworthy/svg-lens — lawful bidirectional lenses for SVG, aimed at the cell's own source.
//
// `svgLens(svg`<svg>…</svg>`)` makes the drawing directly manipulable: dragging a shape rewrites
// the template literal inside the cell's own definition, in the manner of @tomlarkworthy/sticky —
// but where sticky replaces a JSON slot wholesale, here the write is a composition of lenses
// (cell source → template literal → attribute → typed view), so only the bytes that must change
// are touched and everything else (comments, spacing, readable `rotate(45)` forms) survives.
//
// The lens laws are property-checked in-notebook with a seeded PRNG. Ported from a standalone
// TypeScript package (lens.ts / svg.ts / test/laws.ts).
//
// Reads top→bottom: demo → tests → laws → lens core → SVG lenses → source lenses → test harness →
// tests → direct manipulation.

// ================================================================================================
// DOCUMENTATION + DEMO
// ================================================================================================
const _sl01 = function _intro(md){return(
md`# SVG Lens

A lens is a pair \`get: S → A\`, \`put: (A, S) → S\`. This notebook builds them for SVG's attribute
microsyntax — \`viewBox\`, \`points\`, \`transform\`, path \`d\` — and then points the whole stack at the
one source that matters in a source-last system: **the cell's own definition**.

Drag a shape below. There is no editor buffer and no separate copy of the drawing: the picture *is*
the template literal in the cell that produced it, and each gesture is a \`put\` back into that
literal. Turn on *Edit mode* in the burger menu and open the cell to watch its source change under
your cursor, or read the live projection further down.`
)};

// The drawing IS the source. Dragging rewrites this literal, byte-exactly, in place.
const _sl02 = function _drawing(svgLens,svg){return(
svgLens(svg`<svg viewBox="0 0 320 220" width="100%" style="max-height:420px;background:#EDF1E8">
  <!-- comments, odd spacing and readable transforms all
       survive dragging: the lens rewrites only what must change -->
  <circle cx="60" cy="52" r="24" fill="#F5B840"
          stroke="#D99A17" stroke-width="3"/>
  <polygon points="20,190  110,80  200,190" fill="#5B7A5E"/>
  <polygon points="150,190 230,96 310,190" fill="#41584A"/>
  <g transform="translate(228 128) rotate(-4)">
    <rect x="-26" y="10" width="52" height="44" fill="#B25B3A"/>
    <polygon points="-34,12 0,-18 34,12" fill="#7A3B25"/>
  </g>
  <path d="M 10 30 C 50 12, 84 44, 128 26 S 200 8, 244 30 q 20 -12 40 -2"
        fill="none" stroke="#4C7FD1" stroke-width="3" stroke-linecap="round"/>
  <rect x="0" y="188" width="320" height="8" fill="#3E4A3B"/>
</svg>`)
)};
const _sl03 = (G, _) => G.input(_);

// The toolbar drives `drawing.setTool(id)` and follows the editor's own "lens-tool" event, so the
// editor stays the source of truth: a tool that finishes (a shape drawn, a path closed) returns to
// select on its own and the buttons follow.
const _sl02b = function _toolbar(htl,invalidation,$0)
{
  const drawing = $0;                                    // viewof drawing — the editor node
  const TOOLS = [["select", "Select", "V"], ["rect", "Rect", "R"], ["ellipse", "Ellipse", "E"],
                 ["line", "Line", "L"], ["pen", "Pen", "P"]];
  const el = htl.html`<div style="display:flex;gap:6px;flex-wrap:wrap;margin:.5rem 0"></div>`;
  const buttons = TOOLS.map(([id, label, key]) => {
    const b = htl.html`<button title="${label} (${key})" style="padding:4px 10px;border-radius:6px;border:1px solid #b9c4b4;cursor:pointer">${label}</button>`;
    b.onclick = () => drawing.setTool(id);
    el.appendChild(b);
    return [id, b];
  });
  const paint = (tool) => buttons.forEach(([id, b]) => {
    b.style.background = id === tool ? "#2F6BFF" : "#fff";
    b.style.color = id === tool ? "#fff" : "#243";
  });
  paint(drawing.tool);
  drawing.addEventListener("lens-tool", (e) => paint(e.detail.tool));
  // Z-order and delete act on the selection, so they belong to whatever is selected, not to a tool.
  const Z = { "]": "raise", "[": "lower", "}": "front", "{": "back" };
  const onKey = (e) => {
    const typing = /^(INPUT|TEXTAREA)$/.test(e.target.tagName) || e.target.isContentEditable;
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z" && !typing) {
      e.preventDefault();                                // editor-5 owns undo while you are in a cell
      return void (e.shiftKey ? drawing.redo() : drawing.undo());
    }
    if (e.metaKey || e.ctrlKey || e.altKey || typing) return;
    const sel = drawing.selectionPaths();
    if (Z[e.key] && sel.length) {
      e.preventDefault();
      // Each reorder moves the others, so re-read the (rebased) selection between steps rather than
      // working from a snapshot that the first move already invalidated.
      (async () => {
        for (let i = 0; i < sel.length; i++) {
          const cur = drawing.selectionPaths();
          if (cur[i]) await drawing.zOrder(cur[i], Z[e.key]);
        }
      })();
      return;
    }
    const ARROW = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (ARROW[e.key] && sel.length) {
      e.preventDefault();
      const k = e.shiftKey ? 10 : 1;
      return void drawing.nudge(ARROW[e.key][0] * k, ARROW[e.key][1] * k);
    }
    if ((e.key === "Delete" || e.key === "Backspace") && sel.length) {
      e.preventDefault();
      return void drawing.removeSelection();
    }
    const hit = TOOLS.find(([, , k]) => k.toLowerCase() === e.key.toLowerCase());
    if (hit) drawing.setTool(hit[0]);
    else if (e.key === "Escape") drawing.setTool("select");
  };
  document.addEventListener("keydown", onKey);
  invalidation.then(() => document.removeEventListener("keydown", onKey));
  return el;
};

// Type an exact value. The inspector reads the selected element's attributes out of the source and
// writes them back through `setAttr` — the same commit a drag performs — so nothing here is a second
// write path. It re-renders on `lens-select`, which the focus emits whenever it repaints.
const _sl02c = function _inspector(htl,invalidation,$0)
{
  const drawing = $0;
  const el = htl.html`<div style="font:12px/1.5 ui-monospace,monospace;margin:.5rem 0;min-height:2.2em"></div>`;
  const render = () => {
    const path = drawing.selection();
    el.textContent = "";
    if (!path) { el.append(htl.html`<span style="opacity:.6">nothing selected</span>`); return; }
    const info = drawing.describe(path);
    if (!info) return;
    const row = htl.html`<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"></div>`;
    row.append(htl.html`<b>&lt;${info.tag}&gt;</b>`);
    for (const [name, value] of info.attrs) {
      const input = htl.html`<input value="${value}" size="${Math.min(28, Math.max(6, value.length))}"
        style="font:inherit;padding:2px 4px;border:1px solid #b9c4b4;border-radius:4px">`;
      // `change`, not `input`: one commit per finished edit, like one commit per finished drag.
      input.onchange = () => drawing.setAttr(path, name, input.value);
      row.append(htl.html`<label style="opacity:.75">${name}</label>`, input);
    }
    for (const ref of drawing.refs(path)) {
      const b = htl.html`<button style="font:inherit;padding:2px 8px;border-radius:6px;border:1px solid #b9c4b4;cursor:pointer">→ ${ref.attribute} #${ref.id}</button>`;
      if (ref.path) b.onclick = () => drawing.select([ref.path], "transform");
      else { b.disabled = true; b.title = "nothing in this document has that id"; }
      row.append(b);
    }
    el.append(row);
  };
  render();
  const on = () => render();
  drawing.addEventListener("lens-select", on);
  drawing.addEventListener("lens-put", on);
  invalidation.then(() => {
    drawing.removeEventListener("lens-select", on);
    drawing.removeEventListener("lens-put", on);
  });
  return el;
};

// ---- the SVG-factory case: a template with holes in it -------------------------------------------
const _sl06a = function _factoryDoc(md){return(
md`### Interpolated templates

A drawing built from parameters is a *factory*, not a picture, and dragging one has to decide where
the change belongs. Each number in an attribute is a **slot**, and each slot has a provenance:

| slot | example | where a drag goes |
|---|---|---|
| literal | \`translate(20 **10**)\` | the cell's own source, as usual |
| whole expression with a view | \`translate(**\${shift}** 0)\` | upstream — the slider moves |
| any other expression | \`rotate(**\${Math.sin(t) * 30}**)\` | nowhere: the handle is greyed and the put refuses |

Drag the boxes below. The first moves the slider; the second writes its own source in y and reports
the locked x; the third cannot be moved at all, and says so instead of pretending.`
)};

const _sl06b = function _shift(Inputs){return(
Inputs.range([0, 140], { value: 40, step: 1, label: "shift", width: 260 })
)};
const _sl06bv = (G, _) => G.input(_);

const _sl06c = function _spin(Inputs){return(
Inputs.range([0, 90], { value: 20, step: 1, label: "spin", width: 260 })
)};
const _sl06cv = (G, _) => G.input(_);

const _sl06 = function _factory(svgLens,svg,shift,spin){return(
svgLens(svg`<svg viewBox="0 0 240 120" width="100%" style="max-height:220px;background:#EDF1E8">
  <!-- upstream: the whole x is one expression naming a view, so dragging moves the slider -->
  <rect x="10" y="14" width="44" height="30" fill="#4C7FD1" transform="translate(${shift} 0)"/>
  <!-- mixed: y is source and writes; x is an expression and is reported locked -->
  <rect x="10" y="52" width="44" height="30" fill="#5B7A5E" transform="translate(${shift} 0)"/>
  <!-- opaque: not an identifier, so there is nothing to write — the handles grey out -->
  <rect x="10" y="88" width="44" height="24" fill="#B25B3A" transform="rotate(${spin / 2} 32 100)"/>
</svg>`)
)};
const _sl06v = (G, _) => G.input(_);

const _sl04 = function _howToDrive(md){return(
md`**Drag a shape** to move it — the \`transform\` lens. **Tap a polygon or path**, then drag a handle —
the \`points\` and path \`d\` lenses. **Tap anything else** for the transform gizmo: rotate and scale from
the box. **Double-click** an edge of the tapped polygon to add a vertex, a vertex to remove it, or
empty canvas to drop in a new shape. Handles are live DOM only; they are never written to the source.

The toolbar above picks what a gesture *creates*: **R/E/L** drag out a rect, an ellipse or a line;
**P** places path anchors one click at a time — click the first anchor again to close, double-click to
finish open, **Esc** or **V** to go back to selecting. A tool that finishes returns to select by itself.

**Selecting**: tap the same spot again to step down through stacked shapes, **shift-tap** to add to
the selection, or rubber-band on empty canvas. Dragging one of several selected shapes moves them all
— one \`put\` each. **[** and **]** lower and raise, **{** and **}** send to back and front, and
**Delete** removes the whole selection. **⌘Z / ⇧⌘Z** undo and redo, restoring the previous cell source
byte for byte; an undo declines if something else has written to the cell since.

Dragging **snaps** to a sibling's edges and centres, with a guide drawn where the alignment is; hold
**alt** to ignore it. **Arrow keys** nudge the selection by one unit, **shift** by ten. The inspector
above types exact values into the selected element's attributes — through the same \`put\` a drag makes,
so a typed \`transform\` keeps its readable spelling. A reference — \`fill="url(#g)"\`, \`href="#tile"\` —
shows as a button that selects what it points at.

Units are residue too: \`lengthLens\` views the number in \`50%\` or \`12px\` and puts it back wearing the
unit it found, and \`setProperty\` writes a paint property into the \`style=""\` declaration when one is
already there, rather than adding an attribute the declaration would silently override.

An attribute gesture writes once, on release, through this chain:

\`\`\`
cell source ──literalLens──▶ svg\`…\` text ──attrTextLens──▶ attribute string ──transformLens──▶ [a b c d e f]
\`\`\`

Every level is a lens, so the composite is a lens, and the laws below hold of the whole chain. Drag a
shape and return it to where it started: the source snaps back to \`translate(228 128) rotate(-4)\`,
because GetPut says an unchanged view must leave the source untouched.

A structural gesture takes the same route, but stops one level earlier — at \`childrenLens\`, whose view
is the list of child element source strings:

\`\`\`
cell source ──literalLens──▶ svg\`…\` text ──childrenLens──▶ ["<circle …/>", "<polygon …/>", …]
\`\`\`

Insert, delete and reorder are then just \`splice\` on that list.`
)};

// ---- how to use it somewhere else ----------------------------------------------------------------
const _sl08 = function _useIt(md){return(
md`## Use it in your own notebook

\`\`\`js
import {svgLens} from "@tomlarkworthy/svg-lens"

viewof picture = svgLens(svg\`<svg viewBox="0 0 100 100">
  <circle cx="50" cy="50" r="20" fill="tomato"/>
</svg>\`)
\`\`\`

Three rules, and they are all consequences of where the writes go:

1. **The SVG must be one template literal in the cell you are calling from.** \`svgLens\` finds its own
   cell by value identity and edits that literal, so a drawing assembled from string concatenation, or
   built in a different cell and passed in, has nothing to write to. It still renders; it just will not
   be editable, and the handles say so.
2. **Interpolations are allowed inside attribute values, not in element position.** \`viewBox="0 0
   \${w} 100"\` is fine. \`<svg>\${shapes}</svg>\` is refused, because a hole there can render any number
   of elements and every address in the document would stop matching the DOM.
3. **Use \`viewof\`.** The value is the live node; it emits \`input\` on every put, so downstream cells
   recompute from a drag the same way they would from a slider.

The node is patched in place, never replaced, so anything holding a reference to it — a \`getBBox\`, an
animation, another view — keeps working across an edit.

| you call | it does |
|---|---|
| \`picture.setTool(id)\` | pick what a gesture creates: \`select\`, \`rect\`, \`ellipse\`, \`line\`, \`pen\` |
| \`picture.select(paths, mode)\`, \`picture.selectionPaths()\` | read or set the selection |
| \`picture.setAttr(path, name, value)\`, \`picture.setProperty(path, prop, value)\` | typed edits, same put a drag makes |
| \`picture.addShape(markup, at, parent)\`, \`picture.removeAt\`, \`picture.moveTo\`, \`picture.zOrder\` | structural commands |
| \`picture.nudge(dx, dy)\`, \`picture.undo()\`, \`picture.redo()\` | keyboard-shaped operations |
| \`picture.describe(path)\`, \`picture.refs(path)\` | what is at an address, and what it points at |
| events \`lens-put\`, \`lens-select\`, \`lens-tool\` | every put, every selection change, every tool change |

Every one of those is the same write path: a command, a lens \`put\`, one writer. Nothing in the list is
a shortcut around the laws.`
)};

// ================================================================================================
// PAPER APPARATUS — maths, citations, cross-references
// ================================================================================================
// `tex` is not a lopecode builtin: the trimmed standard library has no `require`, and this document
// is meant to keep working with the network unplugged. So this is a small TeX subset compiled to
// MathML, which every current browser renders natively — no KaTeX download, no web fonts. It covers
// what the lens formalism needs (identifiers, numbers, relations, arrows, sub/superscripts,
// fractions, roman text) and renders anything it does not know as the literal symbol.
const _sl140 = function _tex(){return(
(() => {
  const SYM = {                                          // relations, operators and arrows: <mo>
    to: "→", rightarrow: "→", longrightarrow: "⟶", mapsto: "↦", leftarrow: "←", uparrow: "↑",
    Rightarrow: "⇒", Leftrightarrow: "⟺", iff: "⟺", circ: "∘", times: "×", cdot: "⋅", ast: "∗",
    equiv: "≡", neq: "≠", ne: "≠", le: "≤", leq: "≤", ge: "≥", geq: "≥", approx: "≈", sim: "∼",
    in: "∈", notin: "∉", subseteq: "⊆", subset: "⊂", cup: "∪", cap: "∩", setminus: "∖",
    forall: "∀", exists: "∃", neg: "¬", land: "∧", lor: "∨", vdash: "⊢", models: "⊨",
    langle: "⟨", rangle: "⟩", lbrace: "{", rbrace: "}", colon: ":", mid: "∣", parallel: "∥",
    emptyset: "∅", bot: "⊥", top: "⊤", ldots: "…", dots: "…", cdots: "⋯", infty: "∞", partial: "∂"
  };
  const GREEK = {                                        // letters: <mi>
    alpha: "α", beta: "β", gamma: "γ", delta: "δ", epsilon: "ε", zeta: "ζ", eta: "η", theta: "θ",
    iota: "ι", kappa: "κ", lambda: "λ", mu: "μ", nu: "ν", xi: "ξ", rho: "ρ", sigma: "σ", tau: "τ",
    phi: "φ", chi: "χ", psi: "ψ", omega: "ω",
    Gamma: "Γ", Delta: "Δ", Theta: "Θ", Lambda: "Λ", Xi: "Ξ", Pi: "Π", Sigma: "Σ", Phi: "Φ",
    Psi: "Ψ", Omega: "Ω"
  };
  const SPACE = { ",": "0.17em", ";": "0.28em", ":": "0.22em", " ": "0.25em", quad: "1em", qquad: "2em" };
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const TOKEN = /\\[a-zA-Z]+|\\[,;:! ]|[{}^_]|\d+(?:\.\d+)?|[a-zA-Z]|\s+|[\s\S]/g;

  // Recursive descent over the token list. Returns [markup[], nextIndex]; `stop` ends a group.
  const parseList = (t, i, stop) => {
    const out = [];
    while (i < t.length) {
      if (stop && t[i] === stop) { i++; break; }
      let atom;
      [atom, i] = parseAtom(t, i);
      if (atom === null) continue;                       // whitespace
      // A script binds to the atom just parsed, and scripts may stack: x^a_b.
      let sup = null, sub = null;
      while (t[i] === "^" || t[i] === "_") {
        const kind = t[i];
        let arg;
        [arg, i] = parseAtom(t, i + 1);
        if (kind === "^") sup = arg; else sub = arg;
      }
      if (sup && sub) atom = `<msubsup>${atom}${sub}${sup}</msubsup>`;
      else if (sup) atom = `<msup>${atom}${sup}</msup>`;
      else if (sub) atom = `<msub>${atom}${sub}</msub>`;
      out.push(atom);
    }
    return [out, i];
  };

  // The raw characters of the next group, for \mathrm and friends, which take text not maths.
  const rawGroup = (t, i) => {
    if (t[i] !== "{") return [t[i] === undefined ? "" : t[i], i + 1];
    let depth = 1, s = "";
    for (i++; i < t.length && depth; i++) {
      if (t[i] === "{") depth++;
      else if (t[i] === "}" && !--depth) break;
      s += t[i];
    }
    return [s, i + 1];
  };

  const parseAtom = (t, i) => {
    const tok = t[i];
    if (tok === undefined) return ["<mi></mi>", i];
    if (/^\s+$/.test(tok)) return [null, i + 1];
    if (tok === "{") {
      const [list, j] = parseList(t, i + 1, "}");
      return [`<mrow>${list.join("")}</mrow>`, j];
    }
    if (tok[0] === "\\") {
      const name = tok.slice(1);
      if (name === "frac" || name === "dfrac") {
        const [a, j] = parseAtom(t, i + 1);
        const [b, k] = parseAtom(t, j);
        return [`<mfrac>${a}${b}</mfrac>`, k];
      }
      if (name === "sqrt") { const [a, j] = parseAtom(t, i + 1); return [`<msqrt>${a}</msqrt>`, j]; }
      if (name === "mathrm" || name === "operatorname") {
        const [s, j] = rawGroup(t, i + 1);
        return [`<mi mathvariant="normal">${esc(s)}</mi>`, j];
      }
      if (name === "text" || name === "textit" || name === "mathit") {
        const [s, j] = rawGroup(t, i + 1);
        return [`<mtext>${esc(s)}</mtext>`, j];
      }
      if (name === "left" || name === "right") return [null, i + 1];   // sizing: MathML stretches anyway
      if (SPACE[name]) return [`<mspace width="${SPACE[name]}"></mspace>`, i + 1];
      if (GREEK[name]) return [`<mi>${GREEK[name]}</mi>`, i + 1];
      if (SYM[name]) return [`<mo>${esc(SYM[name])}</mo>`, i + 1];
      return [`<mi mathvariant="normal">${esc(name)}</mi>`, i + 1];     // unknown: show the name
    }
    if (/^\d/.test(tok)) return [`<mn>${tok}</mn>`, i + 1];
    if (/^[a-zA-Z]$/.test(tok)) return [`<mi>${tok}</mi>`, i + 1];
    return [`<mo>${esc(tok)}</mo>`, i + 1];
  };

  const render = (src, display) => {
    const [list] = parseList(String(src).match(TOKEN) || [], 0, null);
    const div = document.createElement("div");
    div.innerHTML = `<math display="${display ? "block" : "inline"}"><mrow>${list.join("")}</mrow></math>`;
    const m = div.firstChild;
    if (display) m.style.display = "block";
    m.style.fontSize = display ? "1.15em" : "1.05em";
    return m;
  };
  const tag = (strings, ...vals) =>
    render(strings.raw ? strings.raw.reduce((a, s, i) => a + vals[i - 1] + s) : strings, false);
  tag.block = (strings, ...vals) =>
    render(strings.raw ? strings.raw.reduce((a, s, i) => a + vals[i - 1] + s) : strings, true);
  tag.markup = (src) => render(src, false).outerHTML;    // for tests: the MathML, as text
  return tag;
})()
)};

const _sl141 = function _test_tex_subset(tex){return(
(() => {
  if (typeof document === "undefined") return "⏭ needs a DOM (browser only)";
  const cases = [
    ["S \\to A", ["<mi>S</mi>", "<mo>→</mo>", "<mi>A</mi>"]],
    ["put(a, s)", ["<mi>p</mi>", "<mo>(</mo>", "<mo>,</mo>"]],
    ["\\mathrm{put}", ['<mi mathvariant="normal">put</mi>']],
    ["x^2", ["<msup>", "<mn>2</mn>"]],
    ["a_{i}", ["<msub>", "<mrow>", "<mi>i</mi>"]],
    ["\\frac{a}{b}", ["<mfrac>", "<mi>a</mi>", "<mi>b</mi>"]],
    ["l_1 \\circ l_2", ["<mo>∘</mo>", "<msub>"]],
    ["\\unknowncmd", ['<mi mathvariant="normal">unknowncmd</mi>']]
  ];
  for (const [src, wants] of cases) {
    const got = tex.markup(src);
    for (const w of wants) if (!got.includes(w)) return `❌ ${src}: expected ${w} in ${got}`;
  }
  // The whole point of MathML here: the browser lays it out, with no font to download.
  const el = tex`x + y`;
  if (el.namespaceURI !== "http://www.w3.org/1998/Math/MathML") return "❌ not in the MathML namespace";
  // Angle brackets in the source must not become markup.
  if (tex.markup("a < b").includes("<mo><")) return "❌ unescaped < reached the markup";
  return "✅ TeX subset compiles to MathML: symbols, scripts, fractions, roman text, escaping";
})()
)};

// ---- source-last: your edits live in the runtime, so take them with you --------------------------
// A counter over every put in the page. It exists to make the download link *reactive*: the label
// says how much of your own work the file you are about to download contains.
const _sl08d = function _edits(Generators,$0,$1,invalidation){return(
Generators.observe((change) => {
  let n = 0;
  change(0);
  const bump = () => change(++n);
  for (const node of [$0, $1]) node.addEventListener("lens-put", bump);
  const off = () => { for (const node of [$0, $1]) node.removeEventListener("lens-put", bump); };
  invalidation.then(off);
  return off;
})
)};

const _sl08m = function _svgLensModule(thisModule){return(
thisModule()
)};
const _sl08mv = (G, _) => G.input(_);

const _sl08c = async function _keepYourEdits(htl,downloadAnchor,lookupVariable,svgLensModule,edits)
{
  // The drawing's definition is the drawing. Read it back out of the runtime to show what a download
  // would actually capture — not a file on a server, the bytes this page is holding right now.
  const v = await lookupVariable("viewof drawing", svgLensModule);
  const bytes = v && v._definition ? v._definition.toString().length : 0;
  const anchor = downloadAnchor(
    { style: "font:inherit;font-weight:600" },
    edits ? `Download this notebook with your ${edits} edit${edits === 1 ? "" : "s"} in it`
          : "Download this notebook"
  );
  return htl.html`<div style="padding:10px 14px;border-left:3px solid #4C7FD1;background:#4C7FD10F;margin:.6rem 0">
    ${anchor} — ${bytes} bytes of drawing source, read from the live runtime.
  </div>`;
};

const _sl08e = function _sourceLastNote(md){return(
md`### Where your edits actually are

Every drag you make rewrites a JavaScript function that is running in this page. Nothing is sent
anywhere, and on observablehq.com nothing is written back to the hosted document either — a reader has
no permission to change someone else's notebook, and this editor does not ask for any. So on the
hosted copy your work is real but *unpublished*: it lives in the runtime until the tab closes.

That is not a limitation to route around, it is what source-last means. The runtime is canonical, the
file is a projection of it, and the projection can be taken at any moment: the link above asks
\`@tomlarkworthy/exporter-3\` to walk this live runtime, recover each cell's source with
\`toString()\`, and write a single self-contained HTML file — your drawing included, because your
drawing *is* one of those cells. Download it and you have a copy that boots with your edits, carries
this editor, and can be edited and re-exported again with no server in the loop.

The label is reactive on purpose: it counts the puts this page has seen, so it tells you how much of
your own work is in the file before you click.`
)};

// Every gesture, with the laws re-checked on the source it produced.
// Cumulative snapshots: the runtime keeps only the latest yield, so re-render the whole log.
const _sl05 = function _putTable(Generators,$0,Inputs,invalidation){return(
Generators.observe((change) => {
  const log = [];
  const render = () => change(Inputs.table(log.slice(-8).reverse(), {
    columns: ["target", "attribute", "before", "after", "GetPut", "PutGet"],
    format: { GetPut: (ok) => (ok ? "✅" : "❌"), PutGet: (ok) => (ok ? "✅" : "❌") },
    rows: 8, layout: "auto",
    width: { attribute: "8%", GetPut: "6%", PutGet: "6%" }
  }));
  const onPut = (e) => { log.push(e.detail); render(); };
  render();
  $0.addEventListener("lens-put", onPut);
  invalidation.then(() => $0.removeEventListener("lens-put", onPut));
  return () => $0.removeEventListener("lens-put", onPut);
})
)};

// A projection of the live cell definition — not an editor, and not a second copy of the drawing.
// putTable is the trigger: the definition is mutated in place, so nothing else signals a change.
const _sl07 = function _cellSourceProjection(htl,putTable,$0){return(
htl.html`<details open style="font-size:13px">
  <summary style="cursor:pointer;user-select:none">This cell's own source, live (read-only — edit it with editor-5)</summary>
  <pre style="overflow:auto;max-height:260px;font-size:11.5px;line-height:1.5;padding:10px;border-radius:6px;background:var(--theme-background-alt,#0c1219)"><code>${
    ((s, span) => span
      ? [htl.html`<span>${s.slice(0, span[0])}</span>`,
         htl.html`<mark style="background:#FFB22455;color:inherit;border-radius:2px">${s.slice(span[0], span[1])}</mark>`,
         htl.html`<span>${s.slice(span[1])}</span>`]
      : s)(putTable && $0.cellSource ? $0.cellSource() : "", $0.lastPut ? $0.lastPut.span : null)
  }</code></pre>
</details>`
)};

const _sl09 = function _testsDashboard(tests){return(
tests({ filter: (t) => t.computed })
)};

const _sl10 = function _lawsDoc(md){return(
md`## The lens laws

| Law | Statement | Meaning |
|---|---|---|
| **GetPut** | \`put(get(s), s) = s\` | putting back what you got changes nothing |
| **PutGet** | \`get(put(a, s)) = a\` | you get out what you put in |
| **PutPut** | \`put(a2, put(a1, s)) = put(a2, s)\` | the last put wins |

Two implementation tricks make GetPut and PutGet hold *exactly* on the whole parseable domain:

1. **Exact number round-trips** — printing is \`String(n)\`, parsing is \`Number(s)\`; ECMAScript
   guarantees \`Number(String(x)) === x\` for every finite double, subnormals included.
2. **Residue preservation ("skip rule")** — SVG syntax is non-canonical (\`"0,0 100 100"\` vs
   \`"0 0 100 100"\`). \`put\` first checks whether the new view equals \`get(s)\` and, if so, returns
   the source *unchanged*, so human-readable forms survive until the value they encode changes.
   This is what keeps a drag from reformatting the rest of your cell.

**Caveat found by property-checking:** the skip rule trades away *strict* PutPut. In the corner
\`a2 = get(s)\`, \`a1 ≠ get(s)\`, with \`s\` non-canonical: \`put(a2, put(a1, s))\` prints canonically
while \`put(a2, s)\` skips and returns the original string — different strings, same view. PutPut
holds **up to get-equivalence** (\`get ∘ put(a2, put(a1, s)) = get ∘ put(a2, s)\`), and strictly
whenever \`a2 ≠ get(s)\`. Random generators (as in the original fast-check suite) essentially never
hit this corner; \`test_putput_skip_rule_corner\` targets it deliberately. String lenses with residue
preservation are "well-behaved up to observation", not very well-behaved.`
)};

// ================================================================================================
// LENS CORE
// ================================================================================================
const _sl20 = function _coreHeader(md){return(
md`## Lens core`
)};

const _sl21 = function _lens(){return(
(get, put) => ({ get, put })
)};

// Lens composition. If both lenses are lawful, the composite is lawful.
const _sl22 = function _compose(){return(
(outer, inner) => ({
  get: (s) => inner.get(outer.get(s)),
  put: (b, s) => outer.put(inner.put(b, outer.get(s)), s)
})
)};

// An isomorphism (put ignores the old source): laws from(to(s)) = s and to(from(a)) = a.
const _sl23 = function _isoToLens(lens){return(
(i) => lens(i.to, (a, _s) => i.from(a))
)};

// Law predicates, parameterised by equality on S and A.
const _sl24 = function _lensLaws(){return(
{
  getPut: (l, eqS) => (s) => eqS(l.put(l.get(s), s), s),
  putGet: (l, eqA) => (a, s) => eqA(l.get(l.put(a, s)), a),
  putPut: (l, eqS) => (a1, a2, s) => eqS(l.put(a2, l.put(a1, s)), l.put(a2, s))
}
)};

const _sl25 = function _isoLaws(){return(
{
  roundTripS: (i, eqS) => (s) => eqS(i.from(i.to(s)), s),
  roundTripA: (i, eqA) => (a) => eqA(i.to(i.from(a)), a)
}
)};

// ================================================================================================
// SVG LENSES — attribute microsyntax
// ================================================================================================
const _sl30 = function _svgHeader(md){return(
md`## SVG lenses

All printing uses \`String(n)\`, all parsing uses \`Number(s)\`. Lenses are total on their stated
domains and throw outside them (parseable strings, nodes carrying the focused attribute/child,
matrices with det ≠ 0, path data with separated numbers — no \`10-5\` abutment or compressed arc flags).`
)};

const _sl31 = function _parseNumList(){return(
(s) => {
  const trimmed = s.trim();
  if (trimmed === "") return [];
  return trimmed.split(/[\s,]+/).filter((p) => p !== "").map((p) => {
    const n = Number(p);
    if (Number.isNaN(n)) throw new Error(`invalid number: ${JSON.stringify(p)}`);
    return n;
  });
}
)};

const _sl32 = function _parseViewBox(parseNumList){return(
(s) => {
  const ns = parseNumList(s);
  if (ns.length !== 4) throw new Error(`viewBox needs 4 numbers, got ${ns.length}`);
  return { minX: ns[0], minY: ns[1], width: ns[2], height: ns[3] };
}
)};

const _sl33 = function _printViewBox(){return(
(r) => [r.minX, r.minY, r.width, r.height].map(String).join(" ")
)};

const _sl34 = function _rectEq(){return(
(r1, r2) => r1.minX === r2.minX && r1.minY === r2.minY && r1.width === r2.width && r1.height === r2.height
)};

// Lens<viewBox attribute string, Rect>. Domain: parseable viewBox strings.
const _sl35 = function _viewBoxLens(lens,parseViewBox,rectEq,printViewBox){return(
lens(parseViewBox, (r, s) => (rectEq(r, parseViewBox(s)) ? s : printViewBox(r)))
)};

const _sl36 = function _parsePoints(parseNumList){return(
(s) => {
  const ns = parseNumList(s);
  if (ns.length % 2 !== 0) throw new Error("points list needs an even count of numbers");
  const out = [];
  for (let i = 0; i < ns.length; i += 2) out.push([ns[i], ns[i + 1]]);
  return out;
}
)};

const _sl37 = function _printPoints(){return(
(ps) => ps.map(([x, y]) => `${String(x)},${String(y)}`).join(" ")
)};

const _sl38 = function _pointsEq(){return(
(a, b) => a.length === b.length && a.every((p, i) => p[0] === b[i][0] && p[1] === b[i][1])
)};

// Lens<points attribute string, Point[]>. Domain: parseable points strings.
const _sl39 = function _pointsLens(lens,parsePoints,pointsEq,printPoints){return(
lens(parsePoints, (ps, s) => (pointsEq(ps, parsePoints(s)) ? s : printPoints(ps)))
)};

const _sl40 = function _IDENTITY(){return(
[1, 0, 0, 1, 0, 0]
)};

const _sl41 = function _matEq(){return(
(m, n) => m.every((v, i) => v === n[i])
)};

// multiply(m, n) applies n first, then m (matches SVG transform-list order).
// Matrix [a b c d e f] maps (x, y) -> (a*x + c*y + e, b*x + d*y + f).
const _sl42 = function _multiply(){return(
(m, n) => {
  const [a1, b1, c1, d1, e1, f1] = m;
  const [a2, b2, c2, d2, e2, f2] = n;
  return [
    a1 * a2 + c1 * b2,
    b1 * a2 + d1 * b2,
    a1 * c2 + c1 * d2,
    b1 * c2 + d1 * d2,
    a1 * e2 + c1 * f2 + e1,
    b1 * e2 + d1 * f2 + f1
  ];
}
)};

// Apply an affine matrix to a point: the same [a b c d e f] convention the transform lens parses.
const _sl43 = function _applyPoint(){return(
(m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]
)};

// A DOM CTM as a plain Mat. getScreenCTM may return a legacy SVGMatrix (no DOMMatrix methods),
// so read the six components and use this module's own algebra from there.
const _sl44 = function _ctmMat(){return(
(ctm) => [ctm.a, ctm.b, ctm.c, ctm.d, ctm.e, ctm.f]
)};

const _sl45 = function _opToMat(multiply)
{
  const DEG = Math.PI / 180;
  return (name, args) => {
    switch (name) {
      case "matrix":
        if (args.length !== 6) throw new Error("matrix needs 6 args");
        return args;
      case "translate": {
        if (args.length < 1 || args.length > 2) throw new Error("translate needs 1-2 args");
        const [tx, ty = 0] = args;
        return [1, 0, 0, 1, tx, ty];
      }
      case "scale": {
        if (args.length < 1 || args.length > 2) throw new Error("scale needs 1-2 args");
        const [sx, sy = args[0]] = args;
        return [sx, 0, 0, sy, 0, 0];
      }
      case "rotate": {
        if (args.length !== 1 && args.length !== 3) throw new Error("rotate needs 1 or 3 args");
        const [deg, cx = 0, cy = 0] = args;
        const cos = Math.cos(deg * DEG);
        const sin = Math.sin(deg * DEG);
        const r = [cos, sin, -sin, cos, 0, 0];
        if (args.length === 1) return r;
        return multiply(multiply([1, 0, 0, 1, cx, cy], r), [1, 0, 0, 1, -cx, -cy]);
      }
      case "skewX":
        if (args.length !== 1) throw new Error("skewX needs 1 arg");
        return [1, 0, Math.tan(args[0] * DEG), 1, 0, 0];
      case "skewY":
        if (args.length !== 1) throw new Error("skewY needs 1 arg");
        return [1, Math.tan(args[0] * DEG), 0, 1, 0, 0];
      default:
        throw new Error(`unknown transform op: ${name}`);
    }
  };
};

// Parse an SVG transform list into a single composed matrix.
const _sl46 = function _parseTransform(IDENTITY,multiply,opToMat,parseNumList){return(
(s) => {
  const re = /([a-zA-Z]+)\s*\(([^)]*)\)/g;
  let m = IDENTITY;
  let match;
  while ((match = re.exec(s)) !== null) {
    m = multiply(m, opToMat(match[1], parseNumList(match[2])));
  }
  // Everything outside the matched ops must be separators only.
  if (s.replace(re, "").replace(/[\s,]/g, "") !== "") throw new Error(`unparseable transform: ${JSON.stringify(s)}`);
  return m;
}
)};

const _sl47 = function _printTransform(){return(
(m) => `matrix(${m.map(String).join(" ")})`
)};

// Lens<transform attribute string, Mat>. put keeps the original decomposition (e.g.
// "rotate(45) scale(2)") whenever the matrix is unchanged; otherwise writes matrix(...).
const _sl48 = function _transformLens(lens,parseTransform,matEq,printTransform){return(
lens(parseTransform, (m, s) => (matEq(m, parseTransform(s)) ? s : printTransform(m)))
)};

// The transform list with byte spans, so an edit can keep the author's decomposition.
const _sl48b = function _parseTransformOps(parseNumList){return(
(s) => {
  const re = /([a-zA-Z]+)\s*\(([^)]*)\)/g;
  const ops = [];
  let m;
  while ((m = re.exec(s)) !== null) {
    const argStart = m.index + m[0].indexOf("(") + 1;
    ops.push({ name: m[1], args: parseNumList(m[2]), start: m.index, end: re.lastIndex,
               argStart, argEnd: re.lastIndex - 1 });
  }
  if (s.replace(re, "").replace(/[\s,]/g, "") !== "") throw new Error(`unparseable transform: ${JSON.stringify(s)}`);
  return ops;
}
)};

// Lens<transform attribute string, [tx, ty]> focusing the leading translate.
//
// A drag is a translation, and the matrix view would flatten `translate(228 128) rotate(-4)` into
// six raw floats. This one edits the numbers in place instead — or prefixes a translate when there
// is none — so the author's decomposition (and everything downstream of it) survives being dragged.
const _sl48c = function _translateLens(lens,parseTransformOps){return(
lens(
  (s) => {
    const ops = parseTransformOps(s);
    return ops.length && ops[0].name === "translate" ? [ops[0].args[0], ops[0].args[1] === undefined ? 0 : ops[0].args[1]] : [0, 0];
  },
  ([tx, ty], s) => {
    const ops = parseTransformOps(s);
    const lead = ops.length && ops[0].name === "translate";
    const cur = lead ? [ops[0].args[0], ops[0].args[1] === undefined ? 0 : ops[0].args[1]] : [0, 0];
    if (cur[0] === tx && cur[1] === ty) return s;         // skip rule: unchanged view, unchanged text
    const text = `${String(tx)} ${String(ty)}`;
    if (lead) return s.slice(0, ops[0].argStart) + text + s.slice(ops[0].argEnd);
    const rest = s.trim();
    return `translate(${text})` + (rest ? " " + rest : "");
  }
)
)};

const _sl48d = function _printOp(){return(
(op) => `${op.name}(${op.args.map(String).join(" ")})`
)};

// Lens<transform attribute, op list>. The op list is the honest view of a transform: a matrix throws
// away the fact that the author wrote `translate(228 128) rotate(-4)`. Ops that did not change keep
// their exact source slice, so editing the rotation leaves the translation's spelling alone.
//
// Same lawfulness as childrenLens: GetPut and PutGet strict, PutPut up to get-equivalence.
const _sl48e = function _opsLens(lens,parseTransformOps,printOp){return(
lens(
  (s) => parseTransformOps(s).map((o) => ({ name: o.name, args: o.args.slice() })),
  (ops, s) => {
    const cur = parseTransformOps(s);
    const same = (a, b) => a && b && a.name === b.name && a.args.length === b.args.length &&
                           a.args.every((v, i) => v === b.args[i]);
    if (ops.length === cur.length && ops.every((o, i) => same(o, cur[i]))) return s;   // skip rule
    return ops.map((o, i) => (same(o, cur[i]) ? s.slice(cur[i].start, cur[i].end) : printOp(o))).join(" ");
  }
)
)};

// Where a gizmo op belongs: the last op of that name, or the tail if there is none. Reusing the
// author's own op wherever it sits is what keeps a hundred drags from growing a hundred ops — and it
// is safe because setGizmoOp expresses the centre in that op's own input space and holdFixed corrects
// whatever the substitution moved. A first edit may prepend one translate; nothing grows after that.
const _sl48f = function _opSlot(){return(
(ops, name) => {
  for (let i = ops.length - 1; i >= 0; i--) if (ops[i].name === name) return i;
  return ops.length;
}
)};

// Correct the leading translate so a point of the element's own geometry lands exactly where it did
// before the edit. Measured against the composed matrices rather than derived for one particular op
// order, so it holds for whatever transform list the author happened to write — and the leading
// translate is the outermost op, so a correction there lands directly in the parent's space.
//
// Both gizmo gestures need this, not just scaling: replacing a `rotate(82)` that was rotating about
// the origin with one about the box centre moves the shape, and without the correction it jumps the
// instant you grab the handle.
const _sl48j = function _holdFixed(parseTransform,applyPoint,printOp){return(
(before, after, px, py) => {
  const was = applyPoint(parseTransform(before.map(printOp).join(" ")), px, py);
  const now = applyPoint(parseTransform(after.map(printOp).join(" ")), px, py);
  if (!Number.isFinite(was[0]) || !Number.isFinite(now[0])) return after;
  const dx = was[0] - now[0], dy = was[1] - now[1];
  const lead = after.length && after[0].name === "translate" ? after[0] : null;
  if (!lead && dx === 0 && dy === 0) return after;      // nothing moved: no translate(0 0) noise
  const base = lead ? [lead.args[0], lead.args[1] === undefined ? 0 : lead.args[1]] : [0, 0];
  const fixed = { name: "translate", args: [base[0] + dx, base[1] + dy] };
  return lead ? [fixed, ...after.slice(1)] : [fixed, ...after];
}
)};

// Set one op at the tail. The centre or pivot is given in the element's own geometry, which is NOT
// the space that op receives if anything sits to its right — a transform list applies right to left —
// so it is pushed through the ops that apply first.
const _sl48k = function _setGizmoOp(opSlot,opToMat,multiply,applyPoint,IDENTITY){return(
(ops, name, args, cx, cy) => {
  const i = opSlot(ops, name);
  const inner = ops.slice(i + 1).reduce((m, o) => multiply(m, opToMat(o.name, o.args)), IDENTITY);
  const c = applyPoint(inner, cx, cy);
  const next = ops.map((o) => ({ name: o.name, args: o.args.slice() }));
  const op = { name, args: name === "rotate" ? [args[0], c[0], c[1]] : args };
  if (i < ops.length) next[i] = op; else next.push(op);
  return next;
}
)};

const _sl48h = function _rotateAbout(setGizmoOp,holdFixed){return(
(ops, angle, cx, cy) => holdFixed(ops, setGizmoOp(ops, "rotate", [angle], cx, cy), cx, cy)
)};

const _sl48i = function _scaleAbout(setGizmoOp,holdFixed){return(
(ops, sx, sy, px, py) => holdFixed(ops, setGizmoOp(ops, "scale", [sx, sy], px, py), px, py)
)};

// Handles for the bounding box: four corners to scale by, one stalk to rotate by. Pure — the caller
// supplies the box, which is the element's own untransformed geometry.
const _sl48g = function _transformHandles(){return(
(b) => {
  const stalk = Math.max(b.width, b.height) * 0.18 + 8;
  const cx = b.x + b.width / 2;
  return [
    { key: "nw", kind: "scale", x: b.x, y: b.y },
    { key: "ne", kind: "scale", x: b.x + b.width, y: b.y },
    { key: "se", kind: "scale", x: b.x + b.width, y: b.y + b.height },
    { key: "sw", kind: "scale", x: b.x, y: b.y + b.height },
    { key: "rot", kind: "rotate", x: cx, y: b.y - stalk, link: [cx, b.y] }
  ];
}
)};

const _sl49 = function _det(){return(
(m) => m[0] * m[3] - m[1] * m[2]
)};

const _sl50 = function _invert(det){return(
(m) => {
  const d = det(m);
  if (d === 0 || !Number.isFinite(d)) throw new Error("matrix is not invertible");
  const [a, b, c, dd, e, f] = m;
  return [dd / d, -b / d, -c / d, a / d, (c * f - dd * e) / d, (b * e - a * f) / d];
}
)};

// Inversion as an involutive Iso on invertible matrices. Round-trip is exact only up to
// floating-point error (division does not round-trip), so its law tests use an epsilon.
const _sl51 = function _invertIso(invert){return(
{ to: invert, from: invert }
)};

const _sl52 = function _matApproxEq(){return(
(m, n, eps = 1e-9) => m.every((v, i) => {
  const scale = Math.max(1, Math.abs(v), Math.abs(n[i]));
  return Math.abs(v - n[i]) <= eps * scale;
})
)};

const _sl53 = function _nodeEq(){return(
function nodeEq(a, b) {
  if (a.tag !== b.tag) return false;
  const ka = Object.keys(a.attrs);
  const kb = Object.keys(b.attrs);
  if (ka.length !== kb.length) return false;
  for (const k of ka) if (a.attrs[k] !== b.attrs[k]) return false;
  if (a.children.length !== b.children.length) return false;
  return a.children.every((c, i) => nodeEq(c, b.children[i]));
}
)};

// Lens<SvgNode, string | null>: focus an attribute; null means absent.
const _sl54 = function _attr(lens){return(
(name) => lens(
  (s) => (name in s.attrs ? s.attrs[name] : null),
  (v, s) => {
    const attrs = { ...s.attrs };
    if (v === null) delete attrs[name];
    else attrs[name] = v;
    return { ...s, attrs };
  }
)
)};

// Lens<SvgNode, string>: like attr, but the domain is nodes that have it.
const _sl55 = function _requiredAttr(lens){return(
(name) => lens(
  (s) => {
    if (!(name in s.attrs)) throw new Error(`missing attribute ${name}`);
    return s.attrs[name];
  },
  (v, s) => ({ ...s, attrs: { ...s.attrs, [name]: v } })
)
)};

// Lens<SvgNode, SvgNode>: focus child i. Domain: nodes with > i children.
const _sl56 = function _child(lens){return(
(i) => lens(
  (s) => {
    if (i < 0 || i >= s.children.length) throw new Error(`no child ${i}`);
    return s.children[i];
  },
  (c, s) => {
    if (i < 0 || i >= s.children.length) throw new Error(`no child ${i}`);
    const children = s.children.slice();
    children[i] = c;
    return { ...s, children };
  }
)
)};

const _sl57 = function _PATH_ARG_COUNT(){return(
{ M: 2, L: 2, T: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, A: 7, Z: 0 }
)};

const _sl58 = function _pathEq(){return(
(p, q) => p.length === q.length &&
  p.every((c, i) => c.c === q[i].c && c.a.length === q[i].a.length && c.a.every((v, j) => v === q[i].a[j]))
)};

// The view preserves command letters (incl. relative/absolute case) and raw numbers, so PutGet is exact.
const _sl59 = function _parsePath(parseNumList,PATH_ARG_COUNT){return(
(s) => {
  const re = /([MmLlHhVvCcSsQqTtAaZz])([^MmLlHhVvCcSsQqTtAaZz]*)/g;
  const cmds = [];
  let match;
  while ((match = re.exec(s)) !== null) {
    const c = match[1];
    const a = parseNumList(match[2]);
    const unit = PATH_ARG_COUNT[c.toUpperCase()];
    if (unit === 0) {
      if (a.length !== 0) throw new Error("Z takes no arguments");
    } else if (a.length === 0 || a.length % unit !== 0) {
      throw new Error(`${c} needs a positive multiple of ${unit} args, got ${a.length}`);
    }
    cmds.push({ c, a });
  }
  if (s.replace(re, "").replace(/[\s,]/g, "") !== "")
    throw new Error(`unparseable path data: ${JSON.stringify(s)}`);
  return cmds;
}
)};

const _sl60 = function _printPath(){return(
(cmds) => cmds.map(({ c, a }) => (a.length ? `${c} ${a.map(String).join(" ")}` : c)).join(" ")
)};

// Lens<d attribute string, PathCmd[]>. Domain: parseable path data.
const _sl61 = function _pathLens(lens,parsePath,pathEq,printPath){return(
lens(parsePath, (p, s) => (pathEq(p, parsePath(s)) ? s : printPath(p)))
)};

// ================================================================================================
// SOURCE LENSES — the cell's own definition text as the source
// ================================================================================================
const _sl70 = function _sourceHeader(md){return(
md`## Source lenses

Everything above focuses *inside* an attribute. These focus *outward*, until the source is the
JavaScript of the cell itself:

| Lens | Source | View |
|---|---|---|
| \`literalLens(alias)\` | a cell definition's source text | the template literal inside its \`alias(…)\` call |
| \`attrTextLens(i, name, dflt)\` | SVG document text | element \`i\`'s attribute string (\`dflt\` when absent) |
| \`cellAttrLens(alias, i, name, dflt)\` | cell source | that attribute, addressed from the cell |

\`literalLens\` locates the literal by parsing the definition with acorn and taking byte offsets — the
same technique \`@tomlarkworthy/sticky\` uses for its persistence slot. Its domain is definitions
containing one \`alias(…)\` call whose argument is a template literal with no \`\${}\` interpolations,
and views that contain no backtick, backslash or \`\${\` (they would not survive re-parsing).

Composing outward from a typed view gives a lens from **cell source** straight to **matrix**:

\`\`\`js
compose(cellAttrLens("svgLens", 4, "transform", "matrix(1 0 0 1 0 0)"), transformLens)
\`\`\`

That composite is what a drag commits, and \`test_cellSourceLens_laws\` checks its laws.`
)};

// Byte span of the template literal's contents inside a cell definition's source.
const _sl71 = function _literalSpan(acorn)
{
  const find = (node, pred) => {
    if (!node || typeof node !== "object") return null;
    if (Array.isArray(node)) {
      for (const n of node) { const r = find(n, pred); if (r) return r; }
      return null;
    }
    if (typeof node.type === "string" && pred(node)) return node;
    for (const k in node) {
      if (k === "type" || k === "start" || k === "end") continue;
      const r = find(node[k], pred);
      if (r) return r;
    }
    return null;
  };
  return (src, alias = null) => {
    const root = acorn.parseExpressionAt(src, 0, { ecmaVersion: "latest" });
    const scope = alias
      ? find(root, (n) => n.type === "CallExpression" && n.callee && n.callee.name === alias)
      : root;
    if (!scope) throw new Error(`no call to ${alias} in the definition`);
    const lit = find(scope.arguments || scope, (n) => n.type === "TemplateLiteral");
    if (!lit) throw new Error("no template literal in the call");
    // Interpolations are allowed: the body is returned verbatim, holes and all, and the slot model
    // (`slotsOf`) decides per attribute what a gesture may write. A hole in *element* position —
    // `${shapes.map(…)}` between tags — is a different matter: it can render any number of elements,
    // so document-order indices would not line up with the DOM. Refused, loudly.
    const body = [lit.start + 1, lit.end - 1];
    for (const e of lit.expressions) {
      const before = src.slice(body[0], e.start);
      const open = before.lastIndexOf("<"), close = before.lastIndexOf(">");
      if (open <= close) throw new Error("interpolation outside an attribute value — element positions would not line up");
    }
    return body;
  };
};

// ---- interpolation: an attribute value that is partly source and partly a hole -------------------
// `transform="translate(${x} 10)"` has two numeric slots: one belongs to the expression `x`, one is
// literal text. A gesture may write the literal one; the other is not this cell's to change. The
// model is per *slot*, not per attribute, so a mixed value is still half editable.
const _sl71b = function _holeSpans(){return(
(text) => {
  const out = [];
  for (let i = 0; (i = text.indexOf("${", i)) !== -1;) {
    let depth = 1, j = i + 2;
    for (; j < text.length && depth; j++) {
      if (text[j] === "{") depth++;
      else if (text[j] === "}") depth--;
    }
    if (depth) break;                                    // unterminated: not a hole, just text
    out.push({ start: i, end: j, text: text.slice(i, j) });
    i = j;
  }
  return out;
}
)};

// The numeric slots of an attribute value, in order: each is either a hole or a literal number.
// Numbers *inside* a hole are part of the expression, not slots, so hole interiors are skipped.
const _sl71c = function _slotsOf(holeSpans){return(
(text) => {
  const holes = holeSpans(text);
  const NUM = /[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/g;
  const out = [];
  let at = 0;
  for (const h of holes.concat([{ start: text.length, end: text.length, text: "" }])) {
    NUM.lastIndex = 0;
    const seg = text.slice(at, h.start);
    for (let m; (m = NUM.exec(seg));)
      out.push({ kind: "num", start: at + m.index, end: at + m.index + m[0].length, text: m[0] });
    if (h.text) out.push({ kind: "hole", start: h.start, end: h.end, text: h.text });
    at = h.end;
  }
  return out.sort((a, b) => a.start - b.start);
}
)};

// Write a gesture's result back into an interpolated attribute. The lens works on the *rendered*
// value (what the DOM shows, all numbers); this maps that result onto the source's slots: literal
// slots take the new number, hole slots keep their expression — and if the gesture wanted to move a
// hole, that slot is reported locked rather than silently dropped or silently overwritten.
const _sl71d = function _mergeInterpolated(slotsOf){return(
(srcText, rendered, nextRendered) => {
  const NUM = /[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/g;
  const nums = (s) => s.match(NUM) || [];
  const slots = slotsOf(srcText);
  const was = nums(rendered), now = nums(nextRendered);
  if (slots.length !== was.length || was.length !== now.length)
    return { text: srcText, locked: [], reason: "the rendered value has a different shape from the source" };
  let out = "", at = 0;
  const locked = [];
  slots.forEach((slot, i) => {
    out += srcText.slice(at, slot.start);
    if (slot.kind === "hole") {
      out += slot.text;                                  // never rewritten from here
      if (Number(now[i]) !== Number(was[i])) locked.push(i);
    } else out += now[i];
    at = slot.end;
  });
  return { text: out + srcText.slice(at), locked, reason: null };
}
)};

// Text that cannot survive being written back into a template literal. The rule is relative to the
// bytes being replaced: an interpolation the author already wrote may come back verbatim (that is
// how an edit to an interpolated drawing preserves its holes), but no *new* one may appear, and
// outside the holes there may be no backtick, backslash or `${` at all.
const _sl72 = function _literalSafe(holeSpans){return(
(t, was = null) => {
  const holes = holeSpans(t);
  if (holes.length) {
    if (was === null) return false;
    const had = holeSpans(was).map((h) => h.text);
    for (const h of holes) {
      const i = had.indexOf(h.text);
      if (i === -1) return false;                        // an expression that was not there before
      had.splice(i, 1);
    }
  }
  let at = 0, rest = "";
  for (const h of holes) { rest += t.slice(at, h.start); at = h.end; }
  rest += t.slice(at);
  return !/[`\\]/.test(rest) && !rest.includes("${");
}
)};

// Lens<cell definition source, template literal contents>.
const _sl73 = function _literalLens(lens,literalSpan,literalSafe){return(
(alias) => lens(
  (s) => { const [a, b] = literalSpan(s, alias); return s.slice(a, b); },
  (t, s) => {
    const [a, b] = literalSpan(s, alias);
    if (t === s.slice(a, b)) return s;
    if (!literalSafe(t, s.slice(a, b))) throw new Error("text would not survive the template literal");
    return s.slice(0, a) + t + s.slice(b);
  }
)
)};

// Elements with attribute byte spans, in document order (comments/closers/prolog skipped).
// Token stream over SVG source text: open/close tags, comments, text. Every token carries its byte
// span, so everything above this line can splice rather than reprint. Not an XML parser — no CDATA,
// no entity handling, and attribute values may not contain their own quote character.
const _sl74a = function _scan(){return(
(src) => {
  const out = [];
  let i = 0, at = 0;
  const text = (to) => { if (to > at) out.push({ kind: "text", start: at, end: to }); };
  while ((i = src.indexOf("<", i)) !== -1) {
    if (src.startsWith("<!--", i)) {
      const e = src.indexOf("-->", i), end = e === -1 ? src.length : e + 3;
      text(i); out.push({ kind: "comment", start: i, end }); at = i = end; continue;
    }
    if (src[i + 1] === "/") {
      const e = src.indexOf(">", i), end = e === -1 ? src.length : e + 1;
      const m = /^<\/\s*([a-zA-Z][\w:-]*)/.exec(src.slice(i));
      text(i); out.push({ kind: "close", tag: m ? m[1] : "", start: i, end }); at = i = end; continue;
    }
    if (src[i + 1] === "?" || src[i + 1] === "!") {
      const e = src.indexOf(">", i), end = e === -1 ? src.length : e + 1;
      text(i); out.push({ kind: "other", start: i, end }); at = i = end; continue;
    }
    const m = /^<([a-zA-Z][\w:-]*)/.exec(src.slice(i));
    if (!m) { i++; continue; }
    let j = i + m[0].length;
    const attrs = {};
    while (j < src.length) {
      while (j < src.length && /\s/.test(src[j])) j++;
      if (j >= src.length || src[j] === ">" || (src[j] === "/" && src[j + 1] === ">")) break;
      const am = /^([\w:-]+)\s*=\s*("([^"]*)"|'([^']*)')/.exec(src.slice(j));
      if (am) {
        const vs = j + am[0].length - am[2].length + 1, ve = j + am[0].length - 1;
        attrs[am[1]] = { start: vs, end: ve, value: am[3] !== undefined ? am[3] : am[4] };
        j += am[0].length;
      } else {
        const bm = /^[\w:-]+/.exec(src.slice(j));
        j += bm ? bm[0].length : 1;
      }
    }
    const selfClosing = src[j] === "/";
    const end = j + (selfClosing ? 2 : 1);
    text(i);
    out.push({ kind: "open", tag: m[1], attrs, insertPos: j, start: i, end, selfClosing });
    at = i = end;
  }
  text(src.length);
  return out;
}
)};

// Elements in document order — the flat addressing `attrTextLens` uses.
const _sl74 = function _tokenize(scan,outsideDomain){return(
(src) => {
  const bad = outsideDomain(src);
  if (bad) throw new Error(`outside the svg-lens domain — ${bad}`);
  return scan(src).filter((t) => t.kind === "open");
}
)};

// The same tokens nested into a tree with spans. `innerStart`/`innerEnd` bound the children region,
// which is what a structural edit splices; `index` is the flat document-order index, so a path and
// an index address the same element.
// `scan` is a tokenizer, not an XML parser, and a wrong span splices the wrong bytes — a silent,
// destructive failure. So state the domain and fail loudly at its edge instead of guessing.
// Outside it: CDATA and raw-text elements (their contents may hold `<`, `>` or a stray `</`), and
// DOCTYPEs with an internal subset (`>` inside `[…]`). Inside it, and deliberately so: entity
// references, which are left as the bytes the author wrote — this editor rewrites source, and
// decoding `&amp;` on the way in would mean re-encoding it on the way out.
const _sl74e = function _outsideDomain(scan){return(
(src) => {
  const RAW = { script: 1, style: 1, foreignobject: 1 };
  const why = (what, at) =>
    `${what} at offset ${at}: its contents are not element markup, so byte spans would be wrong`;
  // Over tokens, not over the raw text: a script tag written inside a comment is a comment, and
  // saying otherwise would refuse documents this editor handles perfectly well.
  for (const t of scan(src)) {
    if (t.kind === "open" && RAW[t.tag.toLowerCase()]) return why(`a <${t.tag}> element`, t.start);
    if (t.kind === "other") {
      const s = src.slice(t.start, t.end);
      if (s.startsWith("<![CDATA[")) return why("a CDATA section", t.start);
      if (/^<!DOCTYPE/i.test(s) && s.includes("[")) return why("a DOCTYPE with an internal subset", t.start);
    }
  }
  return null;
}
)};

const _sl74b = function _parseDoc(scan,outsideDomain){return(
(src) => {
  const bad = outsideDomain(src);
  if (bad) throw new Error(`outside the svg-lens domain — ${bad}`);
  const root = { tag: null, attrs: {}, start: 0, end: src.length, innerStart: 0, innerEnd: src.length, index: -1, path: [], children: [] };
  const stack = [root];
  let index = 0;
  for (const t of scan(src)) {
    if (t.kind === "open") {
      const top = stack[stack.length - 1];
      const n = { tag: t.tag, attrs: t.attrs, start: t.start, openEnd: t.end, innerStart: t.end,
                  innerEnd: null, end: null, selfClosing: t.selfClosing, index: index++,
                  path: [...top.path, top.children.length], children: [] };
      top.children.push(n);
      if (t.selfClosing) { n.innerEnd = t.end; n.end = t.end; } else stack.push(n);
    } else if (t.kind === "close") {
      for (let k = stack.length - 1; k > 0; k--) {
        if (stack[k].tag === t.tag) { stack[k].innerEnd = t.start; stack[k].end = t.end; stack.length = k; break; }
      }
    }
  }
  while (stack.length > 1) { const n = stack.pop(); n.innerEnd = src.length; n.end = src.length; }
  return root;
}
)};

// Address an element by path (`[]` is the synthetic document root, `[0]` the outermost <svg>).
const _sl74c = function _nodeAt(parseDoc){return(
(src, path) => {
  let n = parseDoc(src);
  for (const k of path) { n = n.children[k]; if (!n) throw new Error(`no element at path ${path.join("/")}`); }
  return n;
}
)};

// Flat index -> path. Positional addressing is not stable across structural edits (see
// knowledge/svg-editor-architecture.md §2.2); converting early keeps a gesture on one element.
const _sl74d = function _pathOfIndex(parseDoc){return(
(src, idx) => {
  const walk = (n) => {
    if (n.index === idx) return n.path;
    for (const c of n.children) { const p = walk(c); if (p) return p; }
    return null;
  };
  const p = walk(parseDoc(src));
  if (!p) throw new Error(`no element ${idx}`);
  return p;
}
)};

const _sl75 = function _attrVal(tokenize){return(
(src, idx, name) => {
  const el = tokenize(src)[idx];
  if (!el) throw new Error(`no element ${idx}`);
  return el.attrs[name] ? el.attrs[name].value : null;
}
)};

// What a gesture can measure. Writing goes to the source, but reading cannot: `translate(${shift} 0)`
// is not a pair of numbers, and the drawing on screen is. When the source token holds an
// interpolation the live element's rendered attribute is the honest current value; the writer still
// decides, slot by slot, which parts of it may be written back.
const _sl75a = function _effectiveAttr(attrVal,holeSpans){return(
(elems, src, idx, name) => {
  const v = attrVal(src, idx, name);
  if (v === null || !holeSpans(v).length) return v;
  const el = elems[idx];
  const r = el && el.getAttribute && el.getAttribute(name);
  return r === null || r === undefined ? v : r;
}
)};

// Splice one attribute value; returns {src, span} so a caller can highlight the changed bytes.
const _sl76 = function _spliceAttr(tokenize){return(
(src, idx, name, newVal) => {
  const el = tokenize(src)[idx];
  if (!el) throw new Error(`no element ${idx}`);
  const a = el.attrs[name];
  if (a) {
    if (a.value === newVal) return { src, span: null };
    return { src: src.slice(0, a.start) + newVal + src.slice(a.end), span: [a.start, a.start + newVal.length] };
  }
  const ins = " " + name + '="' + newVal + '"';
  return { src: src.slice(0, el.insertPos) + ins + src.slice(el.insertPos), span: [el.insertPos, el.insertPos + ins.length] };
}
)};

// Lens<SVG document text, attribute string>. `dflt` stands in for an absent attribute, so a
// transform can be read (and first written) on an element that has none.
const _sl77 = function _attrTextLens(lens,attrVal,spliceAttr){return(
(idx, name, dflt = null) => lens(
  (s) => { const v = attrVal(s, idx, name); return v === null ? dflt : v; },
  (v, s) => {
    const cur = attrVal(s, idx, name);
    if (v === (cur === null ? dflt : cur)) return s;   // skip rule: unchanged view, unchanged source
    return spliceAttr(s, idx, name, v).src;
  }
)
)};

// Lens<cell definition source, attribute string>: the whole way out.
// ---- references: url(#id), href="#id" ------------------------------------------------------------
// A gradient, marker, clipPath or <use> points somewhere else in the document. Editing the *referrer*
// is usually not what you meant — you want the thing it names — so give selection a way to follow it.
// Only same-document references: an external one is not this cell's source, so it is out of scope.
const _sl74f = function _pathOfId(parseDoc){return(
(src, id) => {
  let found = null;
  const walk = (n) => {
    if (found) return;
    if (n.attrs && n.attrs.id && n.attrs.id.value === id) { found = n.path; return; }
    n.children.forEach(walk);
  };
  walk(parseDoc(src));
  return found;
}
)};

const _sl74g = function _refsOf(parseDoc,nodeAt,pathOfId){return(
(src, path) => {
  const n = nodeAt(src, path);
  const out = [];
  for (const name of Object.keys(n.attrs)) {
    const v = n.attrs[name].value;
    const m = /^\s*url\(\s*#([^)\s]+)\s*\)\s*$/.exec(v) || /^\s*#([^\s]+)\s*$/.exec(v);
    if (!m) continue;
    out.push({ attribute: name, id: m[1], path: pathOfId(src, m[1]) });
  }
  return out;
}
)};

// ---- lengths: numbers that carry a unit ----------------------------------------------------------
// `x="12px"` and `width="50%"` are ordinary SVG. A gesture wants to move a *number*, so the unit is
// residue: `lengthLens` views the number and puts it back wearing whatever unit was already there.
// That keeps a percentage a percentage instead of quietly turning it into user units.
const _sl31b = function _parseLength(){return(
(s) => {
  const m = /^\s*([+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)\s*(px|pt|pc|cm|mm|in|em|ex|ch|rem|vw|vh|%)?\s*$/.exec(s);
  if (!m) throw new Error(`not a length: ${JSON.stringify(s)}`);
  return { n: Number(m[1]), unit: m[2] || "" };
}
)};

const _sl31c = function _printLength(){return(
({ n, unit }) => `${n}${unit || ""}`
)};

const _sl31d = function _lengthLens(lens,parseLength,printLength){return(
lens(
  (s) => parseLength(s).n,
  (n, s) => {
    const { n: was, unit } = parseLength(s);
    return n === was ? s : printLength({ n, unit });     // skip rule: keep the author's spelling
  }
)
)};

// ---- style="": the other place an SVG property can live ------------------------------------------
// The view is the declaration list, in order, as [property, value] pairs — source substrings would
// buy nothing here since values have no interesting inner structure to preserve. Unknown text
// (comments, empty declarations) is dropped by `get`, so PutPut holds only up to get-equivalence,
// exactly as for `childrenLens`; the skip rule keeps the original text whenever nothing changed.
const _sl31e = function _parseStyle(){return(
(s) => s.split(";").map((d) => d.trim()).filter(Boolean).map((d) => {
  const at = d.indexOf(":");
  if (at === -1) throw new Error(`not a declaration: ${JSON.stringify(d)}`);
  return [d.slice(0, at).trim(), d.slice(at + 1).trim()];
})
)};

const _sl31f = function _printStyle(){return(
(decls) => decls.map(([k, v]) => `${k}: ${v}`).join("; ")
)};

const _sl31g = function _styleLens(lens,parseStyle,printStyle){return(
lens(parseStyle, (decls, s) => {
  const was = parseStyle(s);
  const same = was.length === decls.length && was.every(([k, v], i) => k === decls[i][0] && v === decls[i][1]);
  return same ? s : printStyle(decls);
})
)};

// Set one property where it already lives. A shape styled through `style="fill: red"` must not end
// up with a `fill` attribute as well — the attribute would lose to the declaration and the drawing
// would not change, which is the worst kind of edit: it looks like it worked.
const _sl31h = function _setProperty(attrVal,styleLens){return(
(doc, idx, prop, value) => {
  const style = attrVal(doc, idx, "style");
  if (style !== null && styleLens.get(style).some(([k]) => k === prop))
    return { name: "style", value: styleLens.put(styleLens.get(style).map(([k, v]) => (k === prop ? [k, value] : [k, v])), style) };
  return { name: prop, value };                          // no declaration to update: the attribute it is
}
)};

const _sl78 = function _cellAttrLens(compose,literalLens,attrTextLens){return(
(alias, idx, name, dflt = null) => compose(literalLens(alias), attrTextLens(idx, name, dflt))
)};

// Lens<SVG document text, child element source strings>. The view is exact source slices, so every
// child keeps its own residue; only the children that actually changed are reprinted. This is the
// lens structural editing needs — insert, delete, reorder and group are all puts on this list.
//
// Domain: each supplied string must be exactly one element (no leading or trailing text), otherwise
// PutGet could not hold — get always returns a bare element slice.
//
// Lawfulness: GetPut and PutGet hold strictly. PutPut holds only **up to get-equivalence** — the two
// routes agree on the children but may differ in the whitespace and comments between them. That is
// not fixable while preserving residue: the gap belonging to a child is destroyed when an
// intermediate put removes that child, so deleting and re-adding cannot restore it. Reprinting every
// gap canonically would make PutPut strict and throw the residue away instead. See
// test_childrenLens_laws and knowledge/svg-editor-architecture.md.
const _sl79 = function _childrenLens(lens,nodeAt,parseDoc){return(
(path) => lens(
  (s) => { const n = nodeAt(s, path); return n.children.map((c) => s.slice(c.start, c.end)); },
  (kids, s) => {
    const n = nodeAt(s, path);
    const kn = n.children.length;
    const cur = n.children.map((c) => s.slice(c.start, c.end));
    if (kids.length === cur.length && kids.every((k, i) => k === cur[i])) return s;   // skip rule
    for (const k of kids) {
      const d = parseDoc(k);
      if (d.children.length !== 1 || d.children[0].start !== 0 || d.children[0].end !== k.length)
        throw new Error("a child must be exactly one element");
    }
    // The text before each child (indentation, comments) belongs to that child and travels with it.
    const gaps = n.children.map((c, i) => s.slice(i ? n.children[i - 1].end : n.innerStart, c.start));
    const tail = kn ? s.slice(n.children[kn - 1].end, n.innerEnd) : s.slice(n.innerStart, n.innerEnd);
    // What a newly inserted child gets: the *indentation* of an existing gap, never the whole gap —
    // a gap can hold comments, and copying those would reproduce them once per inserted element.
    const indent = (g) => /\s*$/.exec(g)[0];
    const fresh = kn ? indent(gaps[0]) : (indent(tail) || "\n");
    let at = 0, body = "";
    for (const k of kids) {
      const j = cur.indexOf(k, at);
      if (j === -1) body += fresh + k;
      else { body += gaps[j] + k; at = j + 1; }
    }
    return s.slice(0, n.innerStart) + body + tail + s.slice(n.innerEnd);
  }
)
)};

// ---- commands: pure (document text, address, …) -> document text --------------------------------
// Each one is a put, so the laws still cover it. Nothing here knows about the DOM or the pointer.

const _sl79a = function _insertElement(childrenLens){return(
(src, parentPath, at, markup) => {
  const l = childrenLens(parentPath);
  const kids = l.get(src).slice();
  const i = at === null || at === undefined ? kids.length : Math.max(0, Math.min(kids.length, at));
  kids.splice(i, 0, markup);
  return l.put(kids, src);
}
)};

const _sl79b = function _deleteElement(childrenLens){return(
(src, path) => {
  if (!path.length) throw new Error("cannot delete the document root");
  const l = childrenLens(path.slice(0, -1));
  const kids = l.get(src).slice();
  const i = path[path.length - 1];
  if (i < 0 || i >= kids.length) throw new Error(`no element at path ${path.join("/")}`);
  kids.splice(i, 1);
  return l.put(kids, src);
}
)};

const _sl79c = function _reorderElement(childrenLens){return(
(src, path, to) => {
  const l = childrenLens(path.slice(0, -1));
  const kids = l.get(src).slice();
  const from = path[path.length - 1];
  if (from < 0 || from >= kids.length) throw new Error(`no element at path ${path.join("/")}`);
  const [k] = kids.splice(from, 1);
  kids.splice(Math.max(0, Math.min(kids.length, to)), 0, k);
  return l.put(kids, src);
}
)};

// Adding and removing points needs no new lens: pointsLens already exposes a lawful list view.
const _sl79d = function _insertPoint(nodeAt,attrTextLens,parsePoints,printPoints){return(
(src, path, after, p) => {
  const l = attrTextLens(nodeAt(src, path).index, "points");
  const pts = parsePoints(l.get(src));
  pts.splice(Math.max(0, Math.min(pts.length, after + 1)), 0, p);
  return l.put(printPoints(pts), src);
}
)};

const _sl79e = function _deletePoint(nodeAt,attrTextLens,parsePoints,printPoints){return(
(src, path, i) => {
  const l = attrTextLens(nodeAt(src, path).index, "points");
  const pts = parsePoints(l.get(src));
  if (i < 0 || i >= pts.length) throw new Error(`no point ${i}`);
  if (pts.length <= 2) throw new Error("a polygon needs at least two points");
  pts.splice(i, 1);
  return l.put(printPoints(pts), src);
}
)};

// ---- path geometry: segments, subdivision, anchor removal ---------------------------------------
// The absolute geometry of each drawn segment, and where in the command list it came from. S and T
// reflections are resolved here, so everything downstream sees plain cubics and quadratics.
const _sl79h = function _pathSegments(PATH_ARG_COUNT){return(
(cmds) => {
  let cx = 0, cy = 0, sx = 0, sy = 0, px = null, py = null;
  const segs = [];
  cmds.forEach((cmd, ci) => {
    const U = cmd.c.toUpperCase(), rel = cmd.c !== U, u = PATH_ARG_COUNT[U];
    if (U === "Z") {
      segs.push({ kind: "Z", p0: [cx, cy], p3: [sx, sy], ci, o: 0, rel, letter: cmd.c });
      cx = sx; cy = sy; px = py = null;
      return;
    }
    for (let o = 0; o < cmd.a.length; o += u) {
      const A = cmd.a, bx = cx, by = cy;
      const abs = (i, j) => (rel ? [bx + A[o + i], by + A[o + j]] : [A[o + i], A[o + j]]);
      const refl = () => [2 * bx - (px === null ? bx : px), 2 * by - (py === null ? by : py)];
      let seg = null, cpx = null, cpy = null;
      switch (U) {
        case "M": {                                     // extra pairs after a moveto are linetos
          const e = abs(0, 1);
          if (o === 0) { sx = e[0]; sy = e[1]; } else seg = { kind: "L", p0: [bx, by], p3: e };
          cx = e[0]; cy = e[1];
          break;
        }
        case "L": { const e = abs(0, 1); seg = { kind: "L", p0: [bx, by], p3: e }; cx = e[0]; cy = e[1]; break; }
        case "H": { const x = rel ? bx + A[o] : A[o]; seg = { kind: "L", p0: [bx, by], p3: [x, by] }; cx = x; break; }
        case "V": { const y = rel ? by + A[o] : A[o]; seg = { kind: "L", p0: [bx, by], p3: [bx, y] }; cy = y; break; }
        case "C": { const c1 = abs(0, 1), c2 = abs(2, 3), e = abs(4, 5);
                    seg = { kind: "C", p0: [bx, by], p1: c1, p2: c2, p3: e };
                    cx = e[0]; cy = e[1]; cpx = c2[0]; cpy = c2[1]; break; }
        case "S": { const c2 = abs(0, 1), e = abs(2, 3);
                    seg = { kind: "C", p0: [bx, by], p1: refl(), p2: c2, p3: e };
                    cx = e[0]; cy = e[1]; cpx = c2[0]; cpy = c2[1]; break; }
        case "Q": { const c = abs(0, 1), e = abs(2, 3);
                    seg = { kind: "Q", p0: [bx, by], p1: c, p3: e };
                    cx = e[0]; cy = e[1]; cpx = c[0]; cpy = c[1]; break; }
        case "T": { const c = refl(), e = abs(0, 1);
                    seg = { kind: "Q", p0: [bx, by], p1: c, p3: e };
                    cx = e[0]; cy = e[1]; cpx = c[0]; cpy = c[1]; break; }
        case "A": { const e = rel ? [bx + A[o + 5], by + A[o + 6]] : [A[o + 5], A[o + 6]];
                    seg = { kind: "A", p0: [bx, by], p3: e, args: A.slice(o, o + 7) };
                    cx = e[0]; cy = e[1]; break; }
      }
      px = cpx; py = cpy;
      if (seg) segs.push({ ...seg, ci, o, rel, letter: cmd.c });
    }
  });
  return segs;
}
)};

const _sl79i = function _pointOnSegment(){return(
(seg, t) => {
  const L = (a, b) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  if (seg.kind === "C") { const a = L(seg.p0, seg.p1), b = L(seg.p1, seg.p2), c = L(seg.p2, seg.p3);
                          return L(L(a, b), L(b, c)); }
  if (seg.kind === "Q") { const a = L(seg.p0, seg.p1), b = L(seg.p1, seg.p3); return L(a, b); }
  return L(seg.p0, seg.p3);                             // L, Z, and arcs approximated by their chord
}
)};

// Replace one argument group with other commands. A group after the replacement keeps its own letter
// — except inside an M, where the trailing pairs are implicit linetos and must be spelled that way.
const _sl79j = function _replaceGroup(PATH_ARG_COUNT){return(
(cmds, ci, o, replacement) => {
  const cmd = cmds[ci], U = cmd.c.toUpperCase(), u = PATH_ARG_COUNT[U];
  const before = cmd.a.slice(0, o), after = cmd.a.slice(o + u);
  const out = [];
  if (before.length) out.push({ c: cmd.c, a: before });
  out.push(...replacement);
  if (after.length) out.push({ c: U === "M" ? (cmd.c === "m" ? "l" : "L") : cmd.c, a: after });
  return [...cmds.slice(0, ci), ...out, ...cmds.slice(ci + 1)];
}
)};

// Rewrite one segment as an absolute command of the same shape. Exact: pathSegments has already
// resolved relative coordinates and smooth-curve reflections.
const _sl79k = function _absoluteGroup(replaceGroup){return(
(cmds, seg) => {
  const cmd =
    seg.kind === "C" ? { c: "C", a: [...seg.p1, ...seg.p2, ...seg.p3] } :
    seg.kind === "Q" ? { c: "Q", a: [...seg.p1, ...seg.p3] } :
    seg.kind === "A" ? { c: "A", a: [...seg.args.slice(0, 5), ...seg.p3] } :
    seg.kind === "Z" ? null : { c: "L", a: [...seg.p3] };
  return cmd === null ? cmds : replaceGroup(cmds, seg.ci, seg.o, [cmd]);
}
)};

// Subdivide a segment at parameter t, exactly (de Casteljau). The curve through the new anchor is
// geometrically identical to the one it replaced — test_path_subdivision_exact holds it to that.
//
// The segment after the split has to be rewritten if it is smooth: S and T take their first control
// point by reflecting the previous one, and the split changes what "previous" means.
const _sl79l = function _splitPathSegment(pathSegments,replaceGroup,absoluteGroup){return(
(cmds, segIndex, t) => {
  const segs = pathSegments(cmds);
  const seg = segs[segIndex];
  if (!seg) throw new Error(`no segment ${segIndex}`);
  if (seg.kind === "A") throw new Error("arc segments cannot be subdivided");
  const L = (a, b) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

  let out = cmds.map((c) => ({ c: c.c, a: c.a.slice() }));
  const next = segs[segIndex + 1];
  if (next && /^[STst]$/.test(next.letter)) out = absoluteGroup(out, next);   // higher index first

  if (seg.kind === "Z") {                               // split the closing edge: a lineto, then Z
    const m = L(seg.p0, seg.p3);
    return [...out.slice(0, seg.ci), { c: "L", a: m }, ...out.slice(seg.ci)];
  }
  let repl;
  if (seg.kind === "C") {
    const a = L(seg.p0, seg.p1), b = L(seg.p1, seg.p2), c = L(seg.p2, seg.p3);
    const d = L(a, b), e = L(b, c), m = L(d, e);
    repl = [{ c: "C", a: [...a, ...d, ...m] }, { c: "C", a: [...e, ...c, ...seg.p3] }];
  } else if (seg.kind === "Q") {
    const a = L(seg.p0, seg.p1), b = L(seg.p1, seg.p3), m = L(a, b);
    repl = [{ c: "Q", a: [...a, ...m] }, { c: "Q", a: [...b, ...seg.p3] }];
  } else {
    repl = [{ c: "L", a: L(seg.p0, seg.p3) }, { c: "L", a: [...seg.p3] }];
  }
  return replaceGroup(out, seg.ci, seg.o, repl);
}
)};

// Remove the anchor a segment ends at. The following segment is rewritten absolute first: it may be
// relative (its start moves) or smooth (its reflection base disappears).
const _sl79m = function _deletePathAnchor(pathSegments,replaceGroup,absoluteGroup){return(
(cmds, segIndex) => {
  const segs = pathSegments(cmds);
  const seg = segs[segIndex];
  if (!seg) throw new Error(`no segment ${segIndex}`);
  if (seg.kind === "Z") throw new Error("a close command has no anchor of its own");
  if (segs.filter((s) => s.kind !== "Z").length < 2) throw new Error("a path needs at least two anchors");
  let out = cmds.map((c) => ({ c: c.c, a: c.a.slice() }));
  const next = segs[segIndex + 1];
  if (next && next.kind !== "Z") out = absoluteGroup(out, next);              // higher index first
  return replaceGroup(out, seg.ci, seg.o, []);
}
)};

// Nearest point on a path, by sampling. Returns which segment and where along it.
const _sl79n = function _nearestPathSegment(pointOnSegment){return(
(segs, x, y, samples = 24) => {
  let best = -1, bestT = 0, bestD = Infinity;
  segs.forEach((seg, i) => {
    for (let k = 0; k <= samples; k++) {
      const t = k / samples;
      const p = pointOnSegment(seg, t);
      const d = Math.hypot(x - p[0], y - p[1]);
      if (d < bestD) { bestD = d; best = i; bestT = t; }
    }
  });
  return { index: best, t: bestT, distance: bestD };
}
)};

const _sl79o = function _insertPathPoint(nodeAt,attrTextLens,parsePath,printPath,splitPathSegment){return(
(src, path, segIndex, t) => {
  const l = attrTextLens(nodeAt(src, path).index, "d");
  return l.put(printPath(splitPathSegment(parsePath(l.get(src)), segIndex, t)), src);
}
)};

const _sl79p = function _deletePathPoint(nodeAt,attrTextLens,parsePath,printPath,deletePathAnchor){return(
(src, path, segIndex) => {
  const l = attrTextLens(nodeAt(src, path).index, "d");
  return l.put(printPath(deletePathAnchor(parsePath(l.get(src)), segIndex)), src);
}
)};

// Carry an address across a structural edit. A path survives everything that happens outside its own
// parent chain, which is why most edits need no rebase at all: appending a shape, or editing any
// element's attributes, leaves every existing path valid. Returns null when the addressed element is
// the one that was deleted.
//
// Structural paths, not injected ids: the drawing is the artifact the user is authoring, and stamping
// data-lens-id onto every element would pollute exactly the source this project exists to preserve.
const _sl79g = function _rebasePath(){return(
(path, op) => {
  if (!path) return null;
  const parent = op.kind === "insert" ? op.parent : op.path.slice(0, -1);
  const at = op.kind === "insert" ? op.at : op.path[op.path.length - 1];
  if (path.length <= parent.length) return path;                  // an ancestor or a sibling branch
  for (let i = 0; i < parent.length; i++) if (path[i] !== parent[i]) return path;
  const out = path.slice();
  const i = out[parent.length];
  if (op.kind === "insert") { if (i >= at) out[parent.length] = i + 1; return out; }
  if (op.kind === "delete") {
    if (i === at) return null;
    if (i > at) out[parent.length] = i - 1;
    return out;
  }
  // move: delete then insert, in that order, so `to` is an index in the list without the moved child
  if (i === at) { out[parent.length] = op.to; return out; }
  let j = i > at ? i - 1 : i;
  if (j >= op.to) j += 1;
  out[parent.length] = j;
  return out;
}
)};

// Nearest segment to a point, for "double-click an edge to add a vertex".
const _sl79f = function _nearestSegment(){return(
(pts, x, y, closed = true) => {
  let best = -1, bestD = Infinity;
  const n = pts.length;
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % n];
    const dx = bx - ax, dy = by - ay, len = dx * dx + dy * dy;
    const t = len ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / len)) : 0;
    const d = Math.hypot(x - (ax + t * dx), y - (ay + t * dy));
    if (d < bestD) { bestD = d; best = i; }
  }
  return { index: best, distance: bestD };
}
)};

// ================================================================================================
// PROPERTY-TEST HARNESS — deterministic seeded PRNG, domains mirror the original fast-check suite
// ================================================================================================
const _sl80 = function _harnessHeader(md){return(
md`## Property-test harness

Deterministic replacement for fast-check: a seeded PRNG (\`mulberry32\`), domain generators (\`arb\`),
and \`forAll\` which throws the counterexample on failure. Fixed seeds keep every test cell
rerunnable with identical results. \`arb.anyFinite\` draws random 64-bit patterns, so the exact
round-trip claims are exercised across the full double range, subnormals and -0 included.`
)};

const _sl81 = function _NUM_RUNS(){return(
300
)};

const _sl82 = function _mulberry32(){return(
(seed) => () => {
  seed = (seed + 0x6D2B79F5) | 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
)};

const _sl83 = function _arb(det)
{
  const buf = new DataView(new ArrayBuffer(8));
  // Any finite double via random bit patterns: full range, subnormals, -0.
  const anyFinite = (rng) => {
    for (;;) {
      buf.setUint32(0, (rng() * 4294967296) >>> 0);
      buf.setUint32(4, (rng() * 4294967296) >>> 0);
      const v = buf.getFloat64(0);
      if (Number.isFinite(v)) return v;
    }
  };
  // Bounded doubles for values that get multiplied together (no overflow-to-NaN).
  const bounded = (rng) => (rng() * 2 - 1) * 1e6;
  const angle = (rng) => (rng() * 2 - 1) * 720;
  const pick = (rng, xs) => xs[Math.floor(rng() * xs.length)];
  const int = (rng, min, max) => min + Math.floor(rng() * (max - min + 1));
  const SEPS = [" ", ",", ", ", "  ", " , ", "\t"];
  const sep = (rng) => pick(rng, SEPS);

  const rect = (rng) => ({ minX: anyFinite(rng), minY: anyFinite(rng), width: anyFinite(rng), height: anyFinite(rng) });
  // Messy-but-valid viewBox strings: random separators, optional padding.
  const viewBoxStr = (rng) => {
    const r = rect(rng);
    return `${pick(rng, ["", " ", "  "])}${r.minX}${sep(rng)}${r.minY}${sep(rng)}${r.width}${sep(rng)}${r.height}${pick(rng, ["", " "])}`;
  };

  const points = (rng) => Array.from({ length: int(rng, 0, 8) }, () => [anyFinite(rng), anyFinite(rng)]);
  const pointsStr = (rng) => { const s = sep(rng); return points(rng).map(([x, y]) => `${x}${s}${y}`).join(" "); };

  // One SVG transform op rendered as text, in all supported spellings.
  const opStr = (rng) => {
    const s = sep(rng);
    switch (int(rng, 0, 5)) {
      case 0: { const x = bounded(rng); return rng() < 0.5 ? `translate(${x})` : `translate(${x}${s}${bounded(rng)})`; }
      case 1: { const x = bounded(rng); return rng() < 0.5 ? `scale(${x})` : `scale(${x}${s}${bounded(rng)})`; }
      case 2: { const a = angle(rng); return rng() < 0.5 ? `rotate(${a})` : `rotate(${a}${s}${bounded(rng)}${s}${bounded(rng)})`; }
      case 3: return `skewX(${angle(rng)})`;
      case 4: return `skewY(${angle(rng)})`;
      default: return `matrix(${Array.from({ length: 6 }, () => bounded(rng)).join(s)})`;
    }
  };
  const transformStr = (rng) => Array.from({ length: int(rng, 0, 4) }, () => opStr(rng)).join(sep(rng));
  const mat = (rng) => Array.from({ length: 6 }, () => bounded(rng));
  // Well-conditioned invertible matrices for the inversion involution.
  const invertibleMat = (rng) => {
    for (;;) {
      const m = Array.from({ length: 6 }, () => (rng() * 2 - 1) * 10);
      if (Math.abs(det(m)) > 0.5) return m;
    }
  };

  // Path commands: correct arg counts, letters incl. relative case.
  const PATH_LETTERS = [["M", 2], ["m", 2], ["L", 2], ["l", 2], ["H", 1], ["h", 1], ["V", 1], ["v", 1],
                        ["C", 6], ["c", 6], ["S", 4], ["s", 4], ["Q", 4], ["q", 4], ["T", 2], ["t", 2], ["A", 7], ["a", 7]];
  const pathCmd = (rng) => {
    if (rng() < 0.1) return { c: pick(rng, ["Z", "z"]), a: [] };
    const [c, u] = pick(rng, PATH_LETTERS);
    const reps = int(rng, 1, 2);
    return { c, a: Array.from({ length: u * reps }, () => anyFinite(rng)) };
  };
  const pathCmds = (rng) => Array.from({ length: int(rng, 0, 6) }, () => pathCmd(rng));
  const pathStr = (rng) => {
    const s = sep(rng), lead = pick(rng, ["", " ", ","]);
    return pathCmds(rng).map(({ c, a }) => c + (a.length ? lead + a.map(String).join(s) : "")).join(s);
  };

  const ATTR_NAMES = ["id", "fill", "stroke", "viewBox", "transform", "points", "d"];
  const CHARS = "abcXYZ 019-#.,()<>\"'&";
  const attrValue = (rng) => Array.from({ length: int(rng, 0, 12) }, () => CHARS[int(rng, 0, CHARS.length - 1)]).join("");
  const node = (rng, depth = 3) => ({
    tag: pick(rng, ["svg", "g", "rect", "circle", "path", "polygon"]),
    attrs: Object.fromEntries(Array.from({ length: int(rng, 0, 4) }, () => [pick(rng, ATTR_NAMES), attrValue(rng)])),
    children: depth <= 0 ? [] : Array.from({ length: int(rng, 0, 3) }, () => node(rng, depth - 1))
  });
  const nodeWithChild = (rng) => {
    for (;;) {
      const n = node(rng);
      if (n.children.length > 0) return [n, int(rng, 0, n.children.length - 1)];
    }
  };
  const nodeWithViewBox = (rng) => {
    const n = node(rng);
    return { ...n, attrs: { ...n.attrs, viewBox: viewBoxStr(rng) } };
  };

  // --- source-lens domains -----------------------------------------------------------------
  // Attribute text safe inside a template literal AND inside a double-quoted attribute.
  const SAFE = "abcXYZ019 -#.,()";
  const safeText = (rng, max = 14) =>
    Array.from({ length: int(rng, 0, max) }, () => SAFE[int(rng, 0, SAFE.length - 1)]).join("");
  // An SVG document with at least 3 elements, deliberately messy: comments, mixed separators,
  // attributes present on some elements and absent on others.
  const svgDocStr = (rng) => {
    const shapes = Array.from({ length: int(rng, 2, 4) }, () => {
      const kind = int(rng, 0, 2);
      const t = rng() < 0.5 ? ` transform="${opStr(rng)}"` : "";
      const pad = pick(rng, ["", " ", "\n    "]);
      if (kind === 0) return `  <rect x="${int(rng, -50, 50)}" y="${int(rng, -50, 50)}"${pad}width="${int(rng, 1, 99)}" height="${int(rng, 1, 99)}"${t}/>`;
      if (kind === 1) return `  <polygon points="${pointsStr(rng) || "0,0 1,1"}"${t}/>`;
      return `  <circle cx="${int(rng, 0, 99)}" cy="${int(rng, 0, 99)}" r="${int(rng, 1, 40)}"${t}/>`;
    });
    const cmt = rng() < 0.5 ? `  <!-- ${safeText(rng)} -->\n` : "";
    return `<svg viewBox="${int(rng, -9, 9)} ${int(rng, -9, 9)} ${int(rng, 1, 999)} ${int(rng, 1, 999)}">\n${cmt}${shapes.join("\n")}\n</svg>`;
  };
  // A cell definition of the shape lopecode compiles: residue (comments, spacing) outside the
  // literal must survive a put, which is exactly what GetPut on literalLens asserts.
  const cellSrcStr = (rng) => {
    const cmt = pick(rng, ["", "\n  // note\n  ", "\n  /* block */ "]);
    const pad = pick(rng, ["", " ", "\n"]);
    return `function _demo(svgLens, svg) {${cmt}return (${pad}svgLens(svg\`${svgDocStr(rng)}\`)${pad});}`;
  };

  return { anyFinite, bounded, angle, pick, int, sep, rect, viewBoxStr, points, pointsStr,
           opStr, transformStr, mat, invertibleMat, pathCmds, pathStr, attrValue, node,
           nodeWithChild, nodeWithViewBox, safeText, svgDocStr, cellSrcStr };
};

const _sl84 = function _forAll(){return(
(runs, rng, gen, prop, label = "property") => {
  const show = (v) => JSON.stringify(v, (k, x) => (typeof x === "number" ? String(x) : x));
  for (let i = 0; i < runs; i++) {
    const args = gen(rng);
    let ok, err;
    try { ok = prop(...args); } catch (e) { ok = false; err = e; }
    if (!ok) throw new Error(`${label} counterexample (run ${i}): ${show(args)}${err ? " — " + err.message : ""}`);
  }
  return runs;
}
)};

// Check all three laws of a lens with strict equalities and random-domain generators.
const _sl85 = function _checkLens(forAll,lensLaws){return(
(l, { runs, rng, genS, genA, eqS, eqA }) => {
  forAll(runs, rng, (r) => [genS(r)], lensLaws.getPut(l, eqS), "GetPut");
  forAll(runs, rng, (r) => [genA(r), genS(r)], lensLaws.putGet(l, eqA), "PutGet");
  forAll(runs, rng, (r) => [genA(r), genA(r), genS(r)], lensLaws.putPut(l, eqS), "PutPut");
  return `✅ GetPut, PutGet, PutPut (${runs} runs each)`;
}
)};

// ================================================================================================
// TESTS — discovered by @tomlarkworthy/tests (any cell named test_*; throw = fail)
// ================================================================================================
const _sl90 = function _testsHeader(md){return(
md`## Tests

Each \`test_*\` cell property-checks one lens (or one exactness claim) with a fixed seed.
The dashboard near the top of the notebook aggregates them.`
)};

const _sl91 = function _test_viewBoxLens_laws(checkLens,viewBoxLens,arb,mulberry32,NUM_RUNS,rectEq){return(
checkLens(viewBoxLens, {
  runs: NUM_RUNS, rng: mulberry32(0x5EED0001),
  genS: arb.viewBoxStr, genA: arb.rect,
  eqS: (a, b) => a === b, eqA: rectEq
})
)};

const _sl92 = function _test_pointsLens_laws(checkLens,pointsLens,arb,mulberry32,NUM_RUNS,pointsEq){return(
checkLens(pointsLens, {
  runs: NUM_RUNS, rng: mulberry32(0x5EED0002),
  genS: arb.pointsStr, genA: arb.points,
  eqS: (a, b) => a === b, eqA: pointsEq
})
)};

const _sl93 = function _test_transformLens_laws(checkLens,transformLens,arb,mulberry32,NUM_RUNS,matEq){return(
checkLens(transformLens, {
  runs: NUM_RUNS, rng: mulberry32(0x5EED0003),
  genS: arb.transformStr, genA: arb.mat,
  eqS: (a, b) => a === b, eqA: matEq
})
)};

const _sl94 = function _test_pathLens_laws(checkLens,pathLens,arb,mulberry32,NUM_RUNS,pathEq){return(
checkLens(pathLens, {
  runs: NUM_RUNS, rng: mulberry32(0x5EED0004),
  genS: arb.pathStr, genA: arb.pathCmds,
  eqS: (a, b) => a === b, eqA: pathEq
})
)};

const _sl95 = function _test_attr_laws(checkLens,attr,arb,mulberry32,NUM_RUNS,nodeEq){return(
checkLens(attr("fill"), {
  runs: NUM_RUNS, rng: mulberry32(0x5EED0005),
  genS: arb.node, genA: (rng) => (rng() < 0.2 ? null : arb.attrValue(rng)),
  eqS: nodeEq, eqA: (a, b) => a === b
})
)};

const _sl96 = function _test_child_laws(forAll,child,arb,mulberry32,NUM_RUNS,nodeEq,lensLaws)
{
  const rng = mulberry32(0x5EED0006);
  forAll(NUM_RUNS, rng, (r) => [arb.nodeWithChild(r)],
    ([n, i]) => lensLaws.getPut(child(i), nodeEq)(n), "GetPut");
  forAll(NUM_RUNS, rng, (r) => [arb.node(r), arb.nodeWithChild(r)],
    (c, [n, i]) => lensLaws.putGet(child(i), nodeEq)(c, n), "PutGet");
  forAll(NUM_RUNS, rng, (r) => [arb.node(r), arb.node(r), arb.nodeWithChild(r)],
    (c1, c2, [n, i]) => lensLaws.putPut(child(i), nodeEq)(c1, c2, n), "PutPut");
  return `✅ child(i): GetPut, PutGet, PutPut (${NUM_RUNS} runs each)`;
};

// Composition: SvgNode --requiredAttr--> string --viewBoxLens--> Rect
const _sl97 = function _test_compose_nodeViewBox_laws(checkLens,compose,requiredAttr,viewBoxLens,arb,mulberry32,NUM_RUNS,nodeEq,rectEq){return(
checkLens(compose(requiredAttr("viewBox"), viewBoxLens), {
  runs: NUM_RUNS, rng: mulberry32(0x5EED0007),
  genS: arb.nodeWithViewBox, genA: arb.rect,
  eqS: nodeEq, eqA: rectEq
})
)};

const _sl98 = function _test_invert_involution(forAll,arb,mulberry32,NUM_RUNS,invertIso,isoLaws,matApproxEq,multiply,IDENTITY)
{
  const rng = mulberry32(0x5EED0008);
  forAll(NUM_RUNS, rng, (r) => [arb.invertibleMat(r)],
    isoLaws.roundTripS(invertIso, (a, b) => matApproxEq(a, b)), "invert(invert(m)) ≈ m");
  forAll(NUM_RUNS, rng, (r) => [arb.invertibleMat(r)],
    (m) => matApproxEq(multiply(m, invertIso.to(m)), IDENTITY), "m · invert(m) ≈ identity");
  return `✅ inversion is a float-approximate involution (${NUM_RUNS} runs each)`;
};

const _sl99 = function _test_exact_roundtrips(forAll,arb,mulberry32,NUM_RUNS,parseTransform,printTransform,matEq,parsePath,printPath,pathEq,viewBoxLens,printViewBox,rectEq)
{
  const rng = mulberry32(0x5EED0009);
  forAll(NUM_RUNS, rng, (r) => [arb.anyFinite(r)],
    (x) => Number(String(x)) === x, "Number(String(x)) === x");
  forAll(NUM_RUNS, rng, (r) => [arb.mat(r)],
    (m) => matEq(parseTransform(printTransform(m)), m), "parseTransform ∘ printTransform = id");
  forAll(NUM_RUNS, rng, (r) => [arb.pathCmds(r)],
    (p) => pathEq(parsePath(printPath(p)), p), "parsePath ∘ printPath = id");
  forAll(NUM_RUNS, rng, (r) => [arb.rect(r)],
    (x) => rectEq(viewBoxLens.get(printViewBox(x)), x), "parse ∘ print = id for viewBox");
  return `✅ print/parse round-trips are exact across the full double range (${NUM_RUNS} runs each)`;
};

// The corner random generators never hit: a2 = get(s) on a non-canonical source. The skip rule
// makes put(a2, s) return s while put(a2, put(a1, s)) prints canonically — strict PutPut fails,
// observational PutPut (up to get) holds. See the caveat in the laws section.
const _sl100 = function _test_putput_skip_rule_corner(arb,mulberry32,NUM_RUNS,viewBoxLens,transformLens,rectEq,matEq,parseTransform)
{
  const rng = mulberry32(0x5EED000A);
  let witnessed = 0;
  for (let i = 0; i < NUM_RUNS; i++) {
    const s = arb.viewBoxStr(rng);
    const a1 = arb.rect(rng);
    const a2 = viewBoxLens.get(s); // the corner: put back exactly what the source encodes
    if (rectEq(a1, a2)) continue;
    const lhs = viewBoxLens.put(a2, viewBoxLens.put(a1, s));
    const rhs = viewBoxLens.put(a2, s);
    if (!rectEq(viewBoxLens.get(lhs), viewBoxLens.get(rhs)))
      throw new Error(`observational PutPut broken for viewBox: ${JSON.stringify(s)}`);
    if (lhs !== rhs) witnessed++;
  }
  for (let i = 0; i < NUM_RUNS; i++) {
    const s = arb.transformStr(rng);
    const a1 = arb.mat(rng);
    const a2 = parseTransform(s);
    if (matEq(a1, a2)) continue;
    const lhs = transformLens.put(a2, transformLens.put(a1, s));
    const rhs = transformLens.put(a2, s);
    if (!matEq(transformLens.get(lhs), transformLens.get(rhs)))
      throw new Error(`observational PutPut broken for transform: ${JSON.stringify(s)}`);
    if (lhs !== rhs) witnessed++;
  }
  if (witnessed === 0)
    throw new Error("expected the skip rule to violate strict PutPut on non-canonical sources");
  return `✅ PutPut holds up to get-equivalence; strict string PutPut fails in the a2 = get(s) corner (${witnessed} witnesses)`;
};

// Direct manipulation maps screen ↔ element coordinates with applyPoint/invert rather than DOM
// matrix methods, so the coordinate round-trip is a property of this module, not of the browser.
const _sl101 = function _test_applyPoint_screen_roundtrip(forAll,arb,mulberry32,NUM_RUNS,applyPoint,invert,multiply,IDENTITY,matApproxEq)
{
  const rng = mulberry32(0x5EED000B);
  forAll(NUM_RUNS, rng, (r) => [arb.invertibleMat(r), (r() * 2 - 1) * 1000, (r() * 2 - 1) * 1000],
    (m, x, y) => {
      const [sx, sy] = applyPoint(m, x, y);
      const [bx, by] = applyPoint(invert(m), sx, sy);
      const tol = 1e-6 * Math.max(1, Math.abs(x), Math.abs(y));
      return Math.abs(bx - x) <= tol && Math.abs(by - y) <= tol;
    }, "applyPoint(invert(m), applyPoint(m, p)) ≈ p");
  forAll(NUM_RUNS, rng, (r) => [arb.invertibleMat(r)],
    (m) => matApproxEq(multiply(invert(m), m), IDENTITY), "invert(m) · m ≈ identity");
  return `✅ screen↔element coordinate round-trip holds (${NUM_RUNS} runs each)`;
};

// The lens a body drag manipulates: it must keep the author's decomposition intact.
const _sl101b = function _test_translateLens_laws(checkLens,translateLens,arb,mulberry32,NUM_RUNS,forAll,transformLens,matEq){return(
((r) => {
  const rng = mulberry32(0x5EED0011);
  // dragging never rewrites the ops that follow the translate
  forAll(NUM_RUNS, rng, (g) => [arb.transformStr(g), [arb.bounded(g), arb.bounded(g)]], (s, t) => {
    const out = translateLens.put(t, s);
    const tail = (x) => x.replace(/^\s*translate\s*\([^)]*\)\s*/, "");
    return tail(out) === tail(s) || tail(out) === s.trim();
  }, "put keeps the rest of the transform list");
  return r;
})(checkLens(translateLens, {
  runs: NUM_RUNS, rng: mulberry32(0x5EED0010),
  genS: arb.transformStr, genA: (rng) => [arb.bounded(rng), arb.bounded(rng)],
  eqS: (a, b) => a === b, eqA: (a, b) => a[0] === b[0] && a[1] === b[1]
}))
)};

// The lens a drag actually commits: cell definition text ↔ template literal.
const _sl102 = function _test_literalLens_laws(checkLens,literalLens,arb,mulberry32,NUM_RUNS){return(
checkLens(literalLens("svgLens"), {
  runs: NUM_RUNS, rng: mulberry32(0x5EED000C),
  genS: arb.cellSrcStr, genA: arb.svgDocStr,
  eqS: (a, b) => a === b, eqA: (a, b) => a === b
})
)};

const _sl103 = function _test_attrTextLens_laws(checkLens,attrTextLens,arb,mulberry32,NUM_RUNS){return(
checkLens(attrTextLens(1, "transform", "matrix(1 0 0 1 0 0)"), {
  runs: NUM_RUNS, rng: mulberry32(0x5EED000D),
  genS: arb.svgDocStr, genA: arb.opStr,
  eqS: (a, b) => a === b, eqA: (a, b) => a === b
})
)};

// The whole chain a gesture writes through: cell source ↔ matrix, four lenses deep.
const _sl104 = function _test_cellSourceLens_laws(checkLens,compose,cellAttrLens,transformLens,arb,mulberry32,NUM_RUNS,matEq){return(
checkLens(compose(cellAttrLens("svgLens", 1, "transform", "matrix(1 0 0 1 0 0)"), transformLens), {
  runs: NUM_RUNS, rng: mulberry32(0x5EED000E),
  genS: arb.cellSrcStr, genA: arb.mat,
  eqS: (a, b) => a === b, eqA: matEq
})
)};

// A drag must never disturb the cell's other bytes: literalLens preserves residue by construction.
const _sl105 = function _test_source_residue_preserved(forAll,arb,mulberry32,NUM_RUNS,literalLens,cellAttrLens,literalSpan)
{
  const rng = mulberry32(0x5EED000F);
  const lit = literalLens("svgLens");
  const cell = cellAttrLens("svgLens", 1, "transform", "matrix(1 0 0 1 0 0)");
  forAll(NUM_RUNS, rng, (r) => [arb.cellSrcStr(r), arb.opStr(r)], (s, op) => {
    const out = cell.put(op, s);
    const [a, b] = literalSpan(s, "svgLens");
    const [a2] = literalSpan(out, "svgLens");
    // everything before the literal is byte-identical, and so is everything after it
    return s.slice(0, a) === out.slice(0, a2) &&
           s.slice(b) === out.slice(literalSpan(out, "svgLens")[1]) &&
           lit.get(out) !== undefined;
  }, "a put touches only bytes inside the literal");
  return `✅ puts leave every byte outside the literal untouched (${NUM_RUNS} runs)`;
};

const _sl106 = function _test_childrenLens_laws(forAll,lensLaws,childrenLens,arb,mulberry32,NUM_RUNS)
{
  const rng = mulberry32(0x5EED0010);
  const POOL = ['<rect x="1" y="2" width="3" height="4"/>', '<circle cx="0" cy="0" r="5"/>',
                '<g><rect x="0"/></g>', '<polygon points="0,0 1,1 2,0"/>'];
  const l = childrenLens([0]);                                 // children of the outermost <svg>
  const genS = (r) => arb.svgDocStr(r);
  const genA = (r) => Array.from({ length: arb.int(r, 0, 4) }, () => arb.pick(r, POOL));
  const eqA = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
  forAll(NUM_RUNS, rng, (r) => [genS(r)], lensLaws.getPut(l, (a, b) => a === b), "GetPut");
  forAll(NUM_RUNS, rng, (r) => [genA(r), genS(r)], lensLaws.putGet(l, eqA), "PutGet");
  // PutPut only up to get-equivalence: a child's leading gap dies with the child, so delete-then-
  // re-add cannot restore it. Strict PutPut would mean reprinting every gap and losing the residue.
  forAll(NUM_RUNS, rng, (r) => [genA(r), genA(r), genS(r)],
    (a1, a2, s) => eqA(l.get(l.put(a2, l.put(a1, s))), l.get(l.put(a2, s))), "PutPut(get)");
  return `✅ GetPut, PutGet strict; PutPut up to get-equivalence (${NUM_RUNS} runs each)`;
};

const _sl107 = function _test_structural_commands(forAll,arb,mulberry32,NUM_RUNS,childrenLens,insertElement,deleteElement,reorderElement)
{
  const rng = mulberry32(0x5EED0011);
  const MARK = '<circle cx="7" cy="7" r="3"/>';
  const kidsOf = (d) => childrenLens([0]).get(d);
  forAll(NUM_RUNS, rng, (r) => [arb.svgDocStr(r), arb.int(r, 0, 5)], (doc, at) => {
    const kids = kidsOf(doc);
    const i = Math.min(at, kids.length);
    const after = kidsOf(insertElement(doc, [0], i, MARK));
    if (after.length !== kids.length + 1) throw new Error("insert did not add exactly one child");
    if (after[i] !== MARK) throw new Error("inserted at the wrong index");
    const back = kidsOf(deleteElement(insertElement(doc, [0], i, MARK), [0, i]));
    if (!(back.length === kids.length && back.every((k, j) => k === kids[j])))
      throw new Error("delete did not undo insert");
    if (kids.length > 1) {
      const moved = kidsOf(reorderElement(doc, [0, 0], kids.length - 1));
      if (moved[kids.length - 1] !== kids[0]) throw new Error("reorder moved it to the wrong place");
      if ([...moved].sort().join("|") !== [...kids].sort().join("|"))
        throw new Error("reorder is not a permutation");
    }
    return true;
  }, "structural commands");
  return `✅ insert/delete inverse, reorder is a permutation (${NUM_RUNS} runs)`;
};

const _sl108 = function _test_point_commands(forAll,arb,mulberry32,NUM_RUNS,insertPoint,deletePoint,nodeAt,attrVal,parsePoints)
{
  const rng = mulberry32(0x5EED0012);
  const gen = (r) => {
    const pts = Array.from({ length: arb.int(r, 3, 6) }, () => [arb.int(r, -99, 99), arb.int(r, -99, 99)]);
    return [`<svg viewBox="0 0 10 10">\n  <polygon points="${pts.map((p) => p.join(",")).join(" ")}"/>\n</svg>`,
            arb.int(r, 0, pts.length - 1), [arb.int(r, -9, 9), arb.int(r, -9, 9)]];
  };
  forAll(NUM_RUNS, rng, gen, (doc, i, p) => {
    const idx = nodeAt(doc, [0, 0]).index;
    const pts = (d) => parsePoints(attrVal(d, idx, "points"));
    const before = pts(doc);
    const ins = insertPoint(doc, [0, 0], i, p);
    const mid = pts(ins);
    if (mid.length !== before.length + 1) throw new Error("insertPoint did not add one point");
    if (mid[i + 1][0] !== p[0] || mid[i + 1][1] !== p[1]) throw new Error("point landed in the wrong slot");
    const end = pts(deletePoint(ins, [0, 0], i + 1));
    if (!(end.length === before.length && end.every((q, j) => q[0] === before[j][0] && q[1] === before[j][1])))
      throw new Error("deletePoint did not undo insertPoint");
    return true;
  }, "point commands");
  return `✅ insertPoint/deletePoint inverse on polygons (${NUM_RUNS} runs)`;
};

const _sl108b = function _test_nearestSegment(nearestSegment){return(
(() => {
  const sq = [[0, 0], [10, 0], [10, 10], [0, 10]];
  const at = (x, y, closed = true) => nearestSegment(sq, x, y, closed).index;
  if (at(5, 0) !== 0) throw new Error("midpoint of the first edge");
  if (at(10, 5) !== 1) throw new Error("midpoint of the second edge");
  if (at(5, 10) !== 2) throw new Error("midpoint of the third edge");
  if (at(0, 5) !== 3) throw new Error("the closing edge must be a candidate when closed");
  if (at(0, 5, false) === 3) throw new Error("an open polyline has no closing edge");
  if (nearestSegment(sq, 5, 1).distance !== 1) throw new Error("distance to the nearest edge");
  return "✅ nearest segment on closed and open polygons";
})()
)};

const _sl108e = function _test_opsLens_laws(forAll,lensLaws,opsLens,arb,mulberry32,NUM_RUNS,printOp)
{
  const rng = mulberry32(0x5EED0016);
  const genA = (r) => Array.from({ length: arb.int(r, 0, 3) }, () => {
    const name = arb.pick(r, ["translate", "scale", "rotate", "skewX", "matrix"]);
    const n = name === "matrix" ? 6 : name === "rotate" ? arb.pick(r, [1, 3]) : name === "skewX" ? 1 : 2;
    return { name, args: Array.from({ length: n }, () => arb.bounded(r)) };
  });
  const eqA = (a, b) => a.length === b.length && a.every((o, i) =>
    o.name === b[i].name && o.args.length === b[i].args.length && o.args.every((v, j) => v === b[i].args[j]));
  forAll(NUM_RUNS, rng, (r) => [arb.transformStr(r)], lensLaws.getPut(opsLens, (a, b) => a === b), "GetPut");
  forAll(NUM_RUNS, rng, (r) => [genA(r), arb.transformStr(r)], lensLaws.putGet(opsLens, eqA), "PutGet");
  forAll(NUM_RUNS, rng, (r) => [genA(r), genA(r), arb.transformStr(r)],
    (a1, a2, s) => eqA(opsLens.get(opsLens.put(a2, opsLens.put(a1, s))), opsLens.get(opsLens.put(a2, s))), "PutPut(get)");
  // the point of the op view: editing one op leaves the others' spelling alone
  forAll(NUM_RUNS, rng, (r) => [arb.transformStr(r)], (s) => {
    const ops = opsLens.get(s);
    if (ops.length < 2) return true;
    const next = ops.map((o, i) => (i === 0 ? { name: o.name, args: o.args.map((v) => v + 1) } : o));
    const out = opsLens.put(next, s);
    for (let i = 1; i < ops.length; i++)
      if (!out.includes(printOp(ops[i])) && !out.includes(s.slice(0, 0))) {
        // the untouched ops must appear verbatim, in their original spelling
        const src = s.match(new RegExp(ops[i].name + "\\\\s*\\\\([^)]*\\\\)"));
        if (src && !out.includes(src[0])) throw new Error(`op ${i} was reprinted: ${s} -> ${out}`);
      }
    return true;
  }, "untouched ops keep their spelling");
  return `✅ GetPut, PutGet strict; PutPut up to get-equivalence; residue per op (${NUM_RUNS} runs each)`;
};

// The gizmo's contract, checked against the matrices rather than against its own arithmetic: rotating
// leaves the centre of the box where it was, and scaling leaves the pivot corner where it was.
// The claim both gizmo gestures make is a fixed point: one point of the element's own geometry lands
// in exactly the same place afterwards. Checked against the composed matrices, so it does not restate
// the arithmetic it is testing. Generated transform lists are kept well conditioned — the property is
// about the geometry, not about float cancellation at 1e6.
const _sl108f = function _test_transform_gizmo(forAll,arb,mulberry32,NUM_RUNS,rotateAbout,scaleAbout,printOp,parseTransform,applyPoint)
{
  const tame = (r) => {
    const n = () => arb.int(r, -200, 200);
    const ops = [];
    if (r() < 0.8) ops.push(`translate(${n()} ${n()})`);
    if (r() < 0.5) ops.push(`rotate(${arb.int(r, -180, 180)})`);
    if (r() < 0.4) ops.push(`scale(${1 + arb.int(r, 1, 20) / 10})`);
    if (r() < 0.2) ops.push(`skewX(${arb.int(r, -60, 60)})`);
    return ops.join(" ");
  };
  const gen = (r) => [tame(r), arb.int(r, -50, 50), arb.int(r, -50, 50),
                      arb.int(r, -180, 180), 1 + arb.int(r, 1, 40) / 10];
  const fixes = (before, after, px, py, what) => {
    const a = applyPoint(parseTransform(before.map(printOp).join(" ")), px, py);
    const b = applyPoint(parseTransform(after.map(printOp).join(" ")), px, py);
    if (Math.abs(a[0] - b[0]) > 1e-6 || Math.abs(a[1] - b[1]) > 1e-6)
      throw new Error(`${what} moved (${px},${py}) from ${a} to ${b}`);
  };
  const parse = (text) => text ? text.split(/(?<=\))\s+/).map((t) => {
    const m = /([a-zA-Z]+)\s*\(([^)]*)\)/.exec(t);
    return { name: m[1], args: m[2].split(/[\s,]+/).filter(Boolean).map(Number) };
  }) : [];

  const rng = mulberry32(0x5EED0017);
  forAll(NUM_RUNS, rng, gen, (text, cx, cy, angle) => {
    const ops = parse(text);
    fixes(ops, rotateAbout(ops, angle, cx, cy), cx, cy, "rotating");
    return true;
  }, "rotation holds its centre still");

  const rng2 = mulberry32(0x5EED0018);
  forAll(NUM_RUNS, rng2, gen, (text, px, py, _a, k) => {
    const ops = parse(text);
    fixes(ops, scaleAbout(ops, k, k * 0.7, px, py), px, py, "scaling");
    return true;
  }, "scaling holds its pivot still");

  // and a repeated drag must not grow the op list without bound
  const rng3 = mulberry32(0x5EED0019);
  forAll(NUM_RUNS, rng3, gen, (text, cx, cy, angle, k) => {
    let ops = parse(text);
    const grown = () => ops.length;
    ops = scaleAbout(rotateAbout(ops, angle, cx, cy), k, k, cx, cy);
    const once = grown();
    for (let i = 0; i < 5; i++) ops = scaleAbout(rotateAbout(ops, angle + i, cx, cy), k, k, cx, cy);
    if (grown() !== once) throw new Error(`repeated gestures grew the transform list: ${text}`);
    return true;
  }, "repeated gestures reuse their ops");

  return `✅ rotation about a centre, scaling about a pivot, bounded op list (${NUM_RUNS} runs each)`;
};

// Creation is geometry, not gesture: whichever corner the drag starts from, the shape it describes is
// the same, and the markup that reaches the source describes the same shape as the preview. Checked
// through the real parser — the markup is inserted into a document and read back with the same lenses
// the editor uses, so a quoting or spelling slip is a failure here.
const _sl125t = function _test_shape_creation(forAll,arb,mulberry32,NUM_RUNS,dragBox,shapeSpec,shapeMarkup,insertElement,childrenLens,attrVal,nodeAt)
{
  const rng = mulberry32(0x5EED001A);
  const gen = (r) => [arb.pick(r, ["rect", "ellipse", "line"]),
                      arb.int(r, -99, 99), arb.int(r, -99, 99), arb.int(r, -99, 99), arb.int(r, -99, 99)];
  const DOC = '<svg viewBox="0 0 10 10">\n  <!-- keep -->\n  <rect x="1"/>\n</svg>';

  forAll(NUM_RUNS, rng, gen, (kind, x0, y0, x1, y1) => {
    const spec = shapeSpec(kind, x0, y0, x1, y1);
    const doc = insertElement(DOC, [0], null, shapeMarkup(kind, x0, y0, x1, y1));
    const kids = childrenLens([0]).get(doc);
    if (kids.length !== 2) throw new Error("creation did not add exactly one element");
    const idx = nodeAt(doc, [0, 1]).index;               // the element just appended
    for (const k in spec.attrs) {
      const got = attrVal(doc, idx, k);
      if (Number(got) !== Number(spec.attrs[k]) && got !== String(spec.attrs[k]))
        throw new Error(`${kind}: ${k} read back as ${got}, preview says ${spec.attrs[k]}`);
    }
    if (doc.indexOf("<!-- keep -->") === -1) throw new Error("residue lost");
    return true;
  }, "the committed markup is the previewed shape");

  const rng2 = mulberry32(0x5EED001B);
  forAll(NUM_RUNS, rng2, gen, (kind, x0, y0, x1, y1) => {
    if (kind === "line") return true;                    // a line is directed: its ends are not a box
    const a = shapeSpec(kind, x0, y0, x1, y1);
    const b = shapeSpec(kind, x1, y1, x0, y0);           // the same box, dragged the other way
    for (const k in a.attrs) if (a.attrs[k] !== b.attrs[k])
      throw new Error(`${kind}: dragging from the opposite corner changed ${k}`);
    const box = dragBox(x0, y0, x1, y1, true);
    if (box.width !== box.height) throw new Error("shift-drag is not square");
    return true;
  }, "drag direction does not change the shape");
  return `✅ preview matches committed markup; drag is corner-symmetric (${NUM_RUNS} runs each)`;
};

// Z-order is stated against the paint model: SVG paints in document order, so "front" is last, and
// raising the frontmost element is a no-op rather than an error. Checked by actually reordering the
// children and reading back where the element landed relative to its siblings.
const _sl119t = function _test_z_order(forAll,arb,mulberry32,NUM_RUNS,zTarget,reorderElement,childrenLens)
{
  const rng = mulberry32(0x5EED001C);
  const gen = (r) => {
    const n = arb.int(r, 2, 6);
    const kids = Array.from({ length: n }, (_, i) => `<rect id="r${i}"/>`);
    return [`<svg>\n  ${kids.join("\n  ")}\n</svg>`, arb.int(r, 0, n - 1),
            arb.pick(r, ["front", "back", "raise", "lower"])];
  };
  forAll(NUM_RUNS, rng, gen, (doc, from, kind) => {
    const kids = childrenLens([0]).get(doc);
    const me = kids[from];
    const to = zTarget(kind, from, kids.length);
    const after = childrenLens([0]).get(reorderElement(doc, [0, from], to));
    const now = after.indexOf(me);
    if (kind === "front" && now !== after.length - 1) throw new Error("front is not last");
    if (kind === "back" && now !== 0) throw new Error("back is not first");
    if (kind === "raise" && now !== Math.min(kids.length - 1, from + 1)) throw new Error("raise moved by more than one");
    if (kind === "lower" && now !== Math.max(0, from - 1)) throw new Error("lower moved by more than one");
    if (after.length !== kids.length) throw new Error("z-order changed the child count");
    return true;
  }, "z-order");
  return `✅ front/back/raise/lower against document paint order, clamped at the ends (${NUM_RUNS} runs)`;
};

// The domain boundary itself, without a DOM: what is refused, what is not, and that refusal reaches
// every entry point rather than only the one that happened to be checked.
const _sl74t = function _test_domain_boundary(outsideDomain,parseDoc,tokenize,childrenLens)
{
  const NS = 'xmlns="http://www.w3.org/2000/svg"';
  // Built, never written literally: this module lives inside a <scr…ipt type="text/plain"> block, and
  // an HTML parser that sees `<!--` followed by a script tag stops looking for the block's end.
  const SC = "scr" + "ipt", ST = "st" + "yle";
  const inside = [
    `<svg ${NS}><rect x="1" data-gt="a>b"/></svg>`,
    `<svg ${NS}><!-- a <${SC}> written in a comment is just text --><rect/></svg>`,
    `<svg ${NS}><text>&amp; &lt; &#65;</text></svg>`,
    `<svg ${NS}><rect data-q='say "hi"'/></svg>`
  ];
  const outside = [
    `<svg ${NS}><![CDATA[ <rect/> ]]></svg>`,
    `<svg ${NS}><${ST}>a{}</${ST}></svg>`,
    `<svg ${NS}><${SC}>a &lt; b</${SC}></svg>`,
    `<svg ${NS}><foreignObject><div>hi</div></foreignObject></svg>`,
    `<!DOCTYPE svg [<!ENTITY x "y">]><svg ${NS}/>`
  ];
  for (const s of inside) {
    if (outsideDomain(s)) throw new Error(`refused a document it can handle: ${s}`);
    parseDoc(s);                                       // must not throw
  }
  for (const s of outside) {
    if (!outsideDomain(s)) throw new Error(`accepted a document it cannot handle: ${s}`);
    for (const [name, f] of [["parseDoc", parseDoc], ["tokenize", tokenize],
                             ["childrenLens", (d) => childrenLens([0]).get(d)]]) {
      let msg = null;
      try { f(s); } catch (e) { msg = e.message; }
      if (!msg || !/outside the svg-lens domain/.test(msg))
        throw new Error(`${name} did not refuse loudly: ${msg}`);
    }
  }
  return `✅ ${inside.length} accepted, ${outside.length} refused at every entry point`;
};

// Units are residue: moving a number must not change what the number *means*. `50%` edited to 60
// stays a percentage; `12px` stays px. Plus the laws on both new lenses, and the precedence rule that
// setting a property already in `style=""` edits the declaration instead of adding a losing attribute.
const _sl31t = function _test_units_and_style(forAll,arb,mulberry32,NUM_RUNS,lengthLens,parseLength,printLength,styleLens,parseStyle,setProperty)
{
  const UNITS = ["", "px", "pt", "cm", "mm", "in", "em", "ex", "ch", "rem", "vw", "vh", "%"];
  const rng = mulberry32(0x5EED001E);
  const gen = (r) => [arb.int(r, -999, 999) / (arb.pick(r, [1, 2, 10, 100])),
                      arb.pick(r, UNITS), arb.pick(r, ["", " ", "  "]), arb.int(r, -50, 50)];

  forAll(NUM_RUNS, rng, gen, (n, unit, pad, next) => {
    const s = `${pad}${n}${unit}${pad}`;
    if (lengthLens.get(s) !== n) throw new Error(`get ${JSON.stringify(s)} ≠ ${n}`);
    if (lengthLens.put(n, s) !== s) throw new Error("GetPut: an unchanged number must keep its spelling");
    const out = lengthLens.put(next, s);
    if (lengthLens.get(out) !== next) throw new Error("PutGet");
    if (parseLength(out).unit !== unit) throw new Error(`unit lost: ${JSON.stringify(out)}`);
    if (lengthLens.put(next, lengthLens.put(n + 1, s)) !== lengthLens.put(next, s)) throw new Error("PutPut");
    if (printLength(parseLength(out)) !== out.trim()) throw new Error("print/parse not exact");
    return true;
  }, "lengths keep their unit");

  for (const bad of ["", "abc", "12 34", "12pxx", "%", "12%%"]) {
    let threw = false;
    try { parseLength(bad); } catch (e) { threw = true; }
    if (!threw) throw new Error(`parseLength accepted ${JSON.stringify(bad)}`);
  }

  const rng2 = mulberry32(0x5EED001F);
  const decls = (r) => Array.from({ length: arb.int(r, 0, 4) }, (_, i) =>
    [arb.pick(r, ["fill", "stroke", "opacity", "stroke-width"]) + (i ? `-${i}` : ""), String(arb.int(r, 0, 99))]);
  forAll(NUM_RUNS, rng2, (r) => [decls(r), decls(r)], (a, b) => {
    const s = a.map(([k, v]) => `${k}: ${v}`).join("; ");
    if (styleLens.put(styleLens.get(s), s) !== s) throw new Error("GetPut");
    const got = styleLens.get(styleLens.put(b, s));
    if (JSON.stringify(got) !== JSON.stringify(b)) throw new Error("PutGet");
    if (styleLens.put(b, styleLens.put(a, s)) !== styleLens.put(b, s)) throw new Error("PutPut");
    return true;
  }, "style declarations");

  // Precedence: a declaration wins over an attribute, so the setter must edit the declaration.
  const styled = '<svg><rect style="fill: red; opacity: .5"/></svg>';
  const w1 = setProperty(styled, 1, "fill", "blue");
  if (w1.name !== "style") throw new Error("wrote a fill attribute that the style would override");
  if (parseStyle(w1.value).map(([k, v]) => k + "=" + v).join(",") !== "fill=blue,opacity=.5")
    throw new Error(`declaration not edited in place: ${w1.value}`);
  const plain = '<svg><rect fill="red"/></svg>';
  if (setProperty(plain, 1, "fill", "blue").name !== "fill") throw new Error("should write the attribute");
  const neither = '<svg><rect style="opacity: 1"/></svg>';
  if (setProperty(neither, 1, "fill", "blue").name !== "fill")
    throw new Error("an unrelated declaration must not capture the write");
  return `✅ lengths keep px/%/em, style laws hold, a property is set where it already lives (${NUM_RUNS} runs)`;
};

// The slot model for interpolated templates: which numbers in an attribute belong to the source and
// which to an expression, and what a gesture is allowed to do to each. The claim under test is the
// safety one — a hole's bytes come back verbatim, always — plus the reporting one: a gesture that
// wanted to move a hole is told so rather than having its change dropped in silence.
const _sl71t = function _test_interpolation_slots(holeSpans,slotsOf,mergeInterpolated,literalSpan,literalLens)
{
  const kinds = (t) => slotsOf(t).map((s) => s.kind).join(",");
  if (kinds("translate(${x} 10)") !== "hole,num") throw new Error(kinds("translate(${x} 10)"));
  if (kinds("translate(10 20)") !== "num,num") throw new Error("literal slots misread");
  if (kinds("${a}") !== "hole") throw new Error("whole-hole misread");
  // Numbers inside an expression belong to the expression, not to the drawing.
  if (kinds("${Math.sin(t) * 10}") !== "hole") throw new Error("numbers inside a hole are not slots");
  if (kinds("${ {a: 1} }") !== "hole") throw new Error("nested braces must not end the hole early");
  if (holeSpans("a ${unterminated").length !== 0) throw new Error("an unterminated hole is just text");

  // Mixed: the literal moves, the expression does not, and the caller is told which.
  const mixed = mergeInterpolated("translate(${x} 10)", "translate(37 10)", "translate(45 14)");
  if (mixed.text !== "translate(${x} 14)") throw new Error(`mixed put wrote ${mixed.text}`);
  if (mixed.locked.join() !== "0") throw new Error("the moved hole was not reported");
  // Not moving the hole is not a lock.
  const clean = mergeInterpolated("translate(${x} 10)", "translate(37 10)", "translate(37 14)");
  if (clean.locked.length) throw new Error("an untouched hole must not be reported as locked");
  if (clean.text !== "translate(${x} 14)") throw new Error(clean.text);
  // Shape mismatch (the expression rendered more or fewer numbers than there are slots): refuse.
  const odd = mergeInterpolated("translate(${p})", "translate(1 2)", "translate(3 4)");
  if (odd.text !== "translate(${p})" || !odd.reason) throw new Error("a shape mismatch must refuse");
  // Whatever happens, the hole's bytes survive byte for byte.
  for (const src of ["${x}", "translate(${x} 10)", "M ${a} 0 L 10 ${b}", "rotate(${a + 1} 2 3)"]) {
    const n = (src.match(/\$\{[^}]*\}/g) || []).length;
    const rendered = src.replace(/\$\{[^}]*\}/g, "7");
    const out = mergeInterpolated(src, rendered, rendered.replace(/7/g, "9").replace(/(\d+)/g, "$1"));
    if ((out.text.match(/\$\{[^}]*\}/g) || []).length !== n)
      throw new Error(`a hole was lost writing ${src}`);
  }

  // And the cell-level domain: an interpolation inside an attribute is in, one between tags is out.
  const cell = (body) => `function _d(svgLens, svg, x) {return (svgLens(svg\`${body}\`));}`;
  const ok = cell('<svg><rect x="${x}"/></svg>');
  if (literalLens("svgLens").get(ok) !== '<svg><rect x="${x}"/></svg>') throw new Error("attribute hole rejected");
  let threw = false;
  try { literalSpan(cell('<svg>${shapes}</svg>'), "svgLens"); } catch (e) { threw = /would not line up/.test(e.message); }
  if (!threw) throw new Error("an interpolation in element position must be refused");
  return "✅ slots classified, literals written, expressions preserved byte for byte and reported";
};

// Following a reference is selection, not editing: the point is to reach the gradient or the symbol
// that actually paints the shape you clicked.
const _sl74u = function _test_refs(refsOf,pathOfId)
{
  const doc = [
    '<svg>',
    '  <defs>',
    '    <linearGradient id="g1"><stop offset="0"/></linearGradient>',
    '    <rect id="tile" width="4" height="4"/>',
    '  </defs>',
    '  <rect fill="url(#g1)" clip-path="url( #missing )"/>',
    '  <use href="#tile"/>',
    '</svg>'
  ].join("\n");
  const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  if (!eq(pathOfId(doc, "g1"), [0, 0, 0])) throw new Error(`gradient at ${JSON.stringify(pathOfId(doc, "g1"))}`);
  if (pathOfId(doc, "nope") !== null) throw new Error("an absent id must resolve to null");
  const refs = refsOf(doc, [0, 1]);
  const fill = refs.find((r) => r.attribute === "fill");
  if (!fill || fill.id !== "g1" || !eq(fill.path, [0, 0, 0])) throw new Error("url(#id) not followed");
  const missing = refs.find((r) => r.attribute === "clip-path");
  if (!missing || missing.path !== null) throw new Error("a dangling reference must report a null target");
  const use = refsOf(doc, [0, 2]).find((r) => r.attribute === "href");
  if (!use || !eq(use.path, [0, 0, 1])) throw new Error("href=\"#id\" not followed");
  if (refsOf(doc, [0, 0, 1]).length !== 0) throw new Error("an id attribute is not a reference");
  return "✅ url(#id) and href=#id resolve to a path; dangling references say so";
};

// Snapping's claim: after applying the returned delta, some edge or centre of the moving box lies
// exactly on one of the target box's, and it is the nearest such line within tolerance. Checked by
// re-measuring the moved box, not by re-deriving the arithmetic.
const _sl127t = function _test_snapRects(forAll,arb,mulberry32,NUM_RUNS,snapRects)
{
  const rng = mulberry32(0x5EED001D);
  const box = (r) => ({ x: arb.int(r, -100, 100), y: arb.int(r, -100, 100),
                        width: arb.int(r, 1, 60), height: arb.int(r, 1, 60) });
  const linesOf = (b) => [b.x, b.x + b.width / 2, b.x + b.width];
  const rowsOf = (b) => [b.y, b.y + b.height / 2, b.y + b.height];
  const TOL = 6;

  forAll(NUM_RUNS, rng, (r) => [box(r), box(r), box(r)], (m, a, b) => {
    const s = snapRects(m, [a, b], TOL);
    if (Math.abs(s.dx) > TOL || Math.abs(s.dy) > TOL) throw new Error("moved further than the tolerance");
    const moved = { ...m, x: m.x + s.dx, y: m.y + s.dy };
    const near = (mine, theirs) => mine.some((p) => theirs.some((q) => Math.abs(p - q) < 1e-9));
    const others = [a, b];
    if (s.snapped.x && !near(linesOf(moved), others.flatMap(linesOf)))
      throw new Error("claimed an x snap but nothing lines up");
    if (s.snapped.y && !near(rowsOf(moved), others.flatMap(rowsOf)))
      throw new Error("claimed a y snap but nothing lines up");
    // And it must not miss one: if some line was within tolerance, it must have snapped.
    const couldX = linesOf(m).some((p) => others.flatMap(linesOf).some((q) => Math.abs(q - p) <= TOL));
    if (couldX && !s.snapped.x) throw new Error("missed an x alignment inside the tolerance");
    if (s.guides.length !== (s.snapped.x ? 1 : 0) + (s.snapped.y ? 1 : 0))
      throw new Error("one guide per snapped axis");
    return true;
  }, "snapping");

  const nothing = snapRects({ x: 0, y: 0, width: 10, height: 10 }, [{ x: 500, y: 500, width: 1, height: 1 }], TOL);
  if (nothing.dx || nothing.dy || nothing.guides.length) throw new Error("snapped to something far away");
  const already = snapRects({ x: 0, y: 0, width: 10, height: 10 }, [{ x: 0, y: 0, width: 10, height: 10 }], TOL);
  if (already.dx !== 0 || !already.snapped.x) throw new Error("an already-aligned box must report a snap of 0");
  return `✅ snaps to the nearest line within tolerance, never misses one, one guide per axis (${NUM_RUNS} runs)`;
};

// A selection must never contain both a group and something inside it, or a drag translates the
// inner element twice — once with its group, once on its own. Found by rubber-banding the demo.
const _sl119u = function _test_topmost_selection(topmostPaths)
{
  const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const t = (input, want, why) => {
    const got = topmostPaths(input);
    if (!eq(got, want)) throw new Error(`${why}: ${JSON.stringify(got)} ≠ ${JSON.stringify(want)}`);
  };
  t([[0, 3], [0, 3, 0], [0, 3, 1]], [[0, 3]], "children of a selected group must drop out");
  t([[0, 3, 0], [0, 3]], [[0, 3]], "order must not matter");
  t([[0, 1], [0, 2]], [[0, 1], [0, 2]], "siblings are all topmost");
  t([[0, 3, 0], [0, 4]], [[0, 3, 0], [0, 4]], "an unselected group does not absorb its child");
  t([[0, 1], [0, 1]], [[0, 1], [0, 1]], "an exact duplicate is not a nesting");
  t([[0, 12], [0, 1, 0]], [[0, 12], [0, 1, 0]], "prefixes are per component, not per character");
  return "✅ a selection never holds a group and its own descendant";
};

// The pen writes an ordinary `d` attribute, so a half-drawn path is always a real path. Closing is
// idempotent — a double click on the first anchor must not append two Zs.
const _sl126t = function _test_pen_path(penPath,parsePath,printPath)
{
  const d0 = penPath.start(3, 4);
  if (printPath(parsePath(d0)) !== "M 3 4") throw new Error(`start is not a moveto: ${d0}`);
  let d = d0;
  for (const [x, y] of [[10, 4], [10, 12], [3, 12]]) d = penPath.lineTo(d, x, y);
  const cmds = parsePath(d);
  if (cmds.length !== 4) throw new Error(`four anchors, ${cmds.length} commands`);
  if (cmds.slice(1).some((c) => c.c !== "L")) throw new Error("anchors after the first are not linetos");
  const closed = penPath.close(d);
  if (parsePath(closed).slice(-1)[0].c !== "Z") throw new Error("close did not append Z");
  if (penPath.close(closed) !== closed) throw new Error("close is not idempotent");
  if (penPath.close("M 1 2 L 3 4 z") !== "M 1 2 L 3 4 z") throw new Error("an already-closed path was reclosed");
  return "✅ pen builds a parseable path anchor by anchor; close is idempotent";
};

// Subdivision must be invisible: the curve through the new anchor is the curve that was there. This
// samples the whole path densely and compares point for point, which also catches the subtle failure
// — a following S or T reflecting a control point the split moved, bending the *next* segment.
const _sl108d = function _test_path_subdivision_exact(forAll,arb,mulberry32,NUM_RUNS,parsePath,printPath,pathSegments,pointOnSegment,splitPathSegment,deletePathAnchor)
{
  const rng = mulberry32(0x5EED0014);
  // Paths of curves and lines, deliberately mixing absolute, relative and smooth spellings, since
  // those are exactly the cases where a naive split leaks.
  const gen = (r) => {
    const n = arb.int(r, 1, 4);
    const num = () => arb.int(r, -80, 80);
    let d = `M ${num()} ${num()}`;
    for (let i = 0; i < n; i++) {
      switch (arb.int(r, 0, 5)) {
        case 0: d += ` L ${num()} ${num()}`; break;
        case 1: d += ` l ${num()} ${num()}`; break;
        case 2: d += ` C ${num()} ${num()}, ${num()} ${num()}, ${num()} ${num()}`; break;
        case 3: d += ` c ${num()} ${num()}, ${num()} ${num()}, ${num()} ${num()}`; break;
        case 4: d += ` S ${num()} ${num()}, ${num()} ${num()}`; break;
        default: d += ` q ${num()} ${num()}, ${num()} ${num()}`; break;
      }
    }
    if (r() < 0.4) d += " Z";
    return [d, r(), arb.int(r, 0, 9)];
  };
  // Sampling the whole path and comparing point-for-point does NOT work: a split reparameterises the
  // curve, so the original sample points land at different t. The exact claim is per segment — the
  // two halves traverse the original at a known change of parameter — plus: every other segment is
  // untouched. Comparing at equal t is only valid within a segment.
  const near = (p, q) => Math.abs(p[0] - q[0]) < 1e-9 && Math.abs(p[1] - q[1]) < 1e-9;
  const sameSeg = (a, b) => Array.from({ length: 9 }, (_, k) => k / 8)
    .every((u) => near(pointOnSegment(a, u), pointOnSegment(b, u)));

  forAll(NUM_RUNS, rng, gen, (d, t0, which) => {
    const cmds = parsePath(d);
    const before = pathSegments(cmds);
    if (!before.length) return true;
    const i = which % before.length;
    if (before[i].kind === "A") return true;
    const t = 0.05 + t0 * 0.9;
    // it must survive a print/parse round trip, since that is how it reaches the source
    const after = pathSegments(parsePath(printPath(splitPathSegment(cmds, i, t))));
    if (after.length !== before.length + 1)
      throw new Error(`subdivision changed the segment count for ${d}`);
    for (let k = 0; k < i; k++)
      if (!sameSeg(after[k], before[k])) throw new Error(`segment ${k} moved, before the split`);
    for (let k = i + 1; k < before.length; k++)
      if (!sameSeg(after[k + 1], before[k])) throw new Error(`segment ${k} moved, after the split`);
    for (let k = 0; k <= 8; k++) {                      // the halves retrace the original curve
      const u = k / 8;
      if (!near(pointOnSegment(after[i], u), pointOnSegment(before[i], u * t)))
        throw new Error(`first half of ${d} at segment ${i} is not the original curve`);
      if (!near(pointOnSegment(after[i + 1], u), pointOnSegment(before[i], t + u * (1 - t))))
        throw new Error(`second half of ${d} at segment ${i} is not the original curve`);
    }
    return true;
  }, "subdivision is exact");

  // Deleting an anchor removes exactly one, and leaves everything before it alone. Restoring the
  // original geometry only holds for straight segments: dropping an anchor between two curves
  // genuinely changes the shape, which is what every other editor does too.
  const rng2 = mulberry32(0x5EED0015);
  forAll(NUM_RUNS, rng2, gen, (d, t0, which) => {
    const cmds = parsePath(d);
    const before = pathSegments(cmds);
    if (before.filter((s) => s.kind !== "Z").length < 2) return true;
    const i = which % before.length;
    if (before[i].kind === "A" || before[i].kind === "Z") return true;
    const split = parsePath(printPath(splitPathSegment(cmds, i, 0.05 + t0 * 0.9)));
    const back = pathSegments(parsePath(printPath(deletePathAnchor(split, i))));
    if (back.length !== before.length) throw new Error("delete did not remove exactly one anchor");
    for (let k = 0; k < i; k++)
      if (!sameSeg(back[k], before[k])) throw new Error(`segment ${k} moved when deleting anchor ${i}`);
    if (before[i].kind === "L" && !sameSeg(back[i], before[i]))
      throw new Error(`splitting and unsplitting a straight segment changed it: ${d}`);
    return true;
  }, "deleting an anchor");

  return `✅ subdivision is exact, deletion removes one anchor (${NUM_RUNS} runs each)`;
};

// rebasePath is checked against ground truth, not against a restatement of its own rules: take a real
// document, note the source text at a path, apply the command, and assert the rebased path addresses
// that same element afterwards. If the two ever disagree the selection lands on the wrong shape.
const _sl108c = function _test_rebasePath(forAll,arb,mulberry32,NUM_RUNS,rebasePath,nodeAt,childrenLens,insertElement,deleteElement,reorderElement)
{
  const rng = mulberry32(0x5EED0013);
  const MARK = '<circle cx="7" cy="7" r="3"/>';
  const kidsOf = (d) => childrenLens([0]).get(d);
  const gen = (r) => {
    const doc = arb.svgDocStr(r);
    const n = kidsOf(doc).length;
    return [doc, arb.int(r, 0, Math.max(0, n - 1)), arb.int(r, 0, n), arb.int(r, 0, Math.max(0, n - 1))];
  };
  const follows = (doc, path, next, op) => {
    const was = (() => { const n = nodeAt(doc, path); return doc.slice(n.start, n.end); })();
    const to = rebasePath(path, op);
    if (to === null) return null;                       // caller must treat this as "deleted"
    const n = nodeAt(next, to);
    if (next.slice(n.start, n.end) !== was)
      throw new Error(`rebased ${path.join("/")} -> ${to.join("/")} lands on the wrong element`);
    return to;
  };
  forAll(NUM_RUNS, rng, gen, (doc, i, at, to) => {
    const kids = kidsOf(doc);
    if (!kids.length) return true;
    const every = kids.map((_, j) => [0, j]);           // every sibling, not just the edited one

    const ins = insertElement(doc, [0], at, MARK);
    for (const p of every)
      if (follows(doc, p, ins, { kind: "insert", parent: [0], at }) === null)
        throw new Error("insert never deletes anything");

    const dpath = [0, Math.min(at, kids.length - 1)];
    const del = deleteElement(doc, dpath);
    for (const p of every) {
      const gone = follows(doc, p, del, { kind: "delete", path: dpath }) === null;
      if (gone !== (p[1] === dpath[1])) throw new Error("delete lost the wrong element");
    }

    if (kids.length > 1) {                              // a move is a permutation: nobody is lost
      const t = Math.min(to, kids.length - 1);
      const mv = reorderElement(doc, [0, i], t);
      for (const p of every)
        if (follows(doc, p, mv, { kind: "move", path: [0, i], to: t }) === null)
          throw new Error("move never deletes anything");
    }
    return true;
  }, "rebasePath follows the element");
  return `✅ selection follows its element across insert, delete and move (${NUM_RUNS} runs)`;
};

// The renderer's contract: after a morph the live node IS the projection of the new source, without
// having been replaced. Browser-only — it needs a real DOM.
const _sl109 = function _test_morph_projection(morph){return(
(() => {
  if (typeof document === "undefined" || typeof DOMParser === "undefined") return "⏭ needs a DOM (browser only)";
  const NS = "http://www.w3.org/2000/svg";
  const parse = (t) => new DOMParser().parseFromString(t, "image/svg+xml").documentElement;
  const A = `<svg xmlns="${NS}" viewBox="0 0 10 10"><rect x="1"/><!-- keep --><circle r="2"/></svg>`;
  const B = `<svg xmlns="${NS}" viewBox="0 0 20 20"><rect x="1"/><!-- keep --><polygon points="0,0 1,1"/><circle r="2"/></svg>`;
  const live = parse(A), root = live;
  const overlay = document.createElementNS(NS, "g");
  overlay.setAttribute("data-svg-lens-overlay", "");
  live.appendChild(overlay);
  const rect = live.querySelector("rect");
  const skip = (n) => n === overlay;

  morph(live, parse(B), skip);
  if (live !== root) throw new Error("morph replaced the root node");
  if (live.querySelector("rect") !== rect) throw new Error("morph replaced an unchanged child");
  if (live.getAttribute("viewBox") !== "0 0 20 20") throw new Error("attributes not synced");
  if (live.lastElementChild !== overlay) throw new Error("the overlay must stay last");
  const shape = [...live.children].filter((n) => n !== overlay).map((n) => n.localName).join(",");
  if (shape !== "rect,polygon,circle") throw new Error("children not aligned: " + shape);
  if (![...live.childNodes].some((n) => n.nodeType === 8)) throw new Error("comment residue lost");

  morph(live, parse(B), skip);                       // idempotent
  if ([...live.children].filter((n) => n !== overlay).length !== 3) throw new Error("second morph changed the tree");
  morph(live, parse(A), skip);                       // and reversible
  if ([...live.children].filter((n) => n !== overlay).length !== 2) throw new Error("delete not applied");
  return "✅ node identity kept, overlay preserved, insert/delete applied, idempotent";
})()
)};

// The scanner's own claim, checked against the browser rather than against more generated documents
// that stay inside the domain by construction: for a corpus of real and adversarial markup, the tree
// `parseDoc` builds must agree with `DOMParser` on shape, tags and attribute values, and every span
// it reports must slice out exactly the element the browser saw. A span that is merely *plausible*
// is the dangerous case — it splices the wrong bytes silently — so this compares slices, not counts.
const _sl109b = function _test_parse_vs_DOMParser(parseDoc,outsideDomain,attrVal,tokenize)
{
  if (typeof DOMParser === "undefined") return "⏭ needs a DOM (browser only)";
  const NS = "http://www.w3.org/2000/svg";
  const SC = "scr" + "ipt", ST = "st" + "yle";        // never written literally: see test_domain_boundary
  const parse = (t) => {
    const d = new DOMParser().parseFromString(t, "image/svg+xml");
    if (d.querySelector("parsererror")) throw new Error("the browser refused this document");
    return d.documentElement;
  };
  // Real markup, plus the cases a regex tokenizer is most likely to get wrong.
  const CORPUS = [
    `<svg xmlns="${NS}" viewBox="0 0 10 10"><rect x="1"/></svg>`,
    `<svg xmlns="${NS}">\n  <!-- a comment with <angle> brackets and a /> in it -->\n  <g transform="rotate(4)"><circle r="2"/></g>\n</svg>`,
    `<svg xmlns="${NS}"><text font-family="a &gt; b">&amp;&lt;</text></svg>`,          // entities
    `<svg xmlns="${NS}"><rect data-note="it's fine" data-other='say "hi"'/></svg>`,     // mixed quotes
    `<svg xmlns="${NS}"><path d="M0,0 L1,1"/><rect x="1" y="2"   width="3"/></svg>`,    // odd spacing
    `<svg xmlns="${NS}"><g><g><g><rect x="1"/></g></g></g></svg>`,                      // deep nesting
    `<svg xmlns="${NS}"><rect x="1" data-gt="a>b"/></svg>`,                             // > inside a value
    `<svg xmlns="${NS}"><rect/><rect></rect></svg>`                                     // both closings
  ];

  const shapeOf = (el) => `${el.localName}[${[...el.children].map(shapeOf).join(",")}]`;
  const shapeOfNode = (n) => `${n.tag}[${n.children.map(shapeOfNode).join(",")}]`;

  for (const src of CORPUS) {
    if (outsideDomain(src)) throw new Error(`the corpus must be inside the domain: ${src}`);
    const dom = parse(src);
    const mine = parseDoc(src).children[0];
    if (shapeOfNode(mine) !== shapeOf(dom))
      throw new Error(`tree shape differs\n  mine: ${shapeOfNode(mine)}\n  DOM:  ${shapeOf(dom)}`);
    // Attribute values, element by element, in document order.
    const domEls = [dom, ...dom.querySelectorAll("*")];
    const mineEls = tokenize(src);
    if (domEls.length !== mineEls.length) throw new Error(`element count ${mineEls.length} ≠ ${domEls.length}`);
    domEls.forEach((el, i) => {
      for (const a of el.attributes) {
        if (a.name === "xmlns") continue;
        const got = attrVal(src, i, a.name);
        // The DOM decodes entities; this editor deliberately does not, so compare decoded forms.
        const decoded = got === null ? null : new DOMParser()
          .parseFromString(`<x a="${got.replace(/"/g, "&quot;")}"/>`, "text/xml").documentElement.getAttribute("a");
        if (decoded !== a.value)
          throw new Error(`element ${i} ${el.localName}@${a.name}: ${JSON.stringify(decoded)} ≠ ${JSON.stringify(a.value)}`);
      }
    });
    // Spans: the slice at each node must be that element and nothing else.
    const walk = (n) => {
      if (n.tag) {
        const slice = src.slice(n.start, n.end);
        const re = parse(slice.startsWith("<svg") ? slice : `<svg xmlns="${NS}">${slice}</svg>`);
        const el = slice.startsWith("<svg") ? re : re.firstElementChild;
        if (el.localName !== n.tag) throw new Error(`span at ${n.start} slices a <${el.localName}>, not <${n.tag}>`);
        // The inner span is what a structural edit splices, so it must sit strictly inside the
        // element and stop exactly where its close tag begins.
        if (!(n.innerStart >= n.openEnd && n.innerEnd <= n.end && n.innerEnd >= n.innerStart))
          throw new Error(`<${n.tag}>: inner span [${n.innerStart},${n.innerEnd}] escapes [${n.openEnd},${n.end}]`);
        const closing = src.slice(n.innerEnd, n.end);
        if (!(n.selfClosing ? closing === "" : new RegExp(`^</\\s*${n.tag}\\s*>$`).test(closing)))
          throw new Error(`<${n.tag}>: the bytes after the inner span are ${JSON.stringify(closing)}, not its close tag`);
      }
      n.children.forEach(walk);
    };
    walk(parseDoc(src));
  }

  // And the edge of the domain is refused, loudly, rather than mis-parsed.
  for (const bad of [
    `<svg xmlns="${NS}"><![CDATA[ <rect x="1"/> ]]></svg>`,
    `<svg xmlns="${NS}"><${ST}>rect { fill: red }</${ST}><rect x="1"/></svg>`,
    `<svg xmlns="${NS}"><${SC}>if (a &lt; b) {}</${SC}></svg>`
  ]) {
    if (!outsideDomain(bad)) throw new Error(`should be refused: ${bad}`);
    let threw = false;
    try { parseDoc(bad); } catch (e) { threw = /outside the svg-lens domain/.test(e.message); }
    if (!threw) throw new Error(`parseDoc must refuse: ${bad}`);
  }
  return `✅ agrees with DOMParser on ${CORPUS.length} documents (shape, attributes, spans); refuses CDATA and raw-text elements`;
};

// ================================================================================================
// DIRECT MANIPULATION — the drawing edits its own cell
// ================================================================================================
const _sl110 = function _manipulationHeader(md){return(
md`## Direct manipulation

\`svgLens(node)\` returns the node it was given, with pointer handling attached. During a gesture only
the live DOM changes — no source is written, so dragging is as cheap as \`setAttribute\`. On release
the gesture commits once, through \`compose(cellAttrLens(…), transformLens)\`, and the DOM then adopts
the source's exact bytes: if you drag a shape back to where it started, the readable
\`translate(228 128) rotate(-4)\` is still there, because GetPut says so.

The new definition is installed the way \`@tomlarkworthy/sticky\` installs its: build the function with
\`realize\` (which routes through \`importShim\` on lopecode) and assign \`_definition\` **silently**.
Export and \`editor-5\` both read \`_definition\`, so they see the change immediately.

### Source is truth; the drawing is a projection of it

Reconciling the DOM with a \`setAttribute\` is enough to move a shape and nothing else — it cannot add
or remove one. So the writer instead **renders**: it calls the new definition with the variable's
current inputs to get a fresh node, and \`morph\` patches the live node toward it. Recomputing the cell
would mint a *new* node and break the value's identity, the observer holding it, and the gesture in
flight; morphing keeps the node the cell already handed out.

Rendering evaluates the template rather than parsing its text, so an interpolated
\`svg\\\`<circle r="\${r}"/>\\\`\` would render the same way — the remaining work there is deciding what a
handle over a hole may write to, not how to draw it.

One consequence worth stating: \`applySource\` re-reads \`_definition\` after the \`await\` and abandons the
put if it changed underneath, because \`editor-5\` may have rewritten the cell mid-gesture.

### The pieces

\`svgLens\` is wiring and nothing else. The parts it wires:

| Cell | Owns |
|---|---|
| \`svgTarget\` | which variable this node is, the parameter name the cell calls \`svgLens\` by, and the document text |
| \`svgWriter\` | \`applySource\` / \`commit\` / \`runCommand\` — the only code that assigns \`_definition\` |
| \`svgOverlay\` | the handle layer, and the \`isOwn\` predicate that keeps the renderer off it |
| \`svgFocus\` | which element is selected and where its handles are drawn |
| \`svgTools\` | the tool registry: \`toolVertex\`, \`toolMove\`, \`toolStructure\` |

A tool is \`{id, onPointerDown, onPointerMove, onPointerUp, onDblClick}\`. \`onPointerDown\` returns true
to claim the gesture; registry order is priority. Tools read the document, preview in the live DOM,
and hand a command or a commit to the writer — they never write the source themselves, and none of
them knows what a lens is. Adding a tool is adding a cell:

\`\`\`js
svgTools.push({ id: "rect", onPointerDown(ctx, e) { … } });
viewof svgTools.dispatchEvent(new Event("input"));
\`\`\`

The writer stays ignorant of selection: it reports what it did on the \`lens-put\` event, and the
handles follow — refreshed after an attribute edit, cleared after a structural one, because a
structural edit shifts every address after it.`
)};

// Draggable handles for a polygon/polyline's points.
const _sl111 = function _pointsHandles(parsePoints,attrVal){return(
(src, idx) => parsePoints(attrVal(src, idx, "points"))
  .map((p, i) => ({ key: "p" + i, kind: "anchor", x: p[0], y: p[1], i }))
)};

// Draggable handles for a path: anchors and control points, with the current-point state threaded
// through so relative commands get absolute handle positions.
const _sl112 = function _pathHandles(parsePath,attrVal,PATH_ARG_COUNT){return(
(src, idx) => {
  const cmds = parsePath(attrVal(src, idx, "d"));
  let cx = 0, cy = 0, sx = 0, sy = 0;
  const hs = [];
  cmds.forEach((cmd, ci) => {
    const U = cmd.c.toUpperCase(), u = PATH_ARG_COUNT[U];
    const rel = cmd.c !== U;
    if (u === 0) { cx = sx; cy = sy; return; }
    for (let o = 0; o < cmd.a.length; o += u) {
      const bx = cx, by = cy, A = cmd.a;
      const abs = (ix, iy) => (rel ? [bx + A[o + ix], by + A[o + iy]] : [A[o + ix], A[o + iy]]);
      const K = (ix, iy) => ci + ":" + o + ":" + ix + ":" + iy;
      switch (U) {
        case "M": case "L": case "T": {
          const [x, y] = abs(0, 1);
          hs.push({ key: K(0, 1), ci, o, ix: 0, iy: 1, kind: "anchor", x, y, rel, base: [bx, by] });
          cx = x; cy = y; if (U === "M" && o === 0) { sx = x; sy = y; }
          break; }
        case "H": {
          const x = rel ? bx + A[o] : A[o];
          hs.push({ key: K(0, -1), ci, o, ix: 0, iy: -1, kind: "anchor", x, y: cy, rel, base: [bx, by] });
          cx = x; break; }
        case "V": {
          const y = rel ? by + A[o] : A[o];
          hs.push({ key: K(-1, 0), ci, o, ix: -1, iy: 0, kind: "anchor", x: cx, y, rel, base: [bx, by] });
          cy = y; break; }
        case "C": {
          const c1 = abs(0, 1), c2 = abs(2, 3), e = abs(4, 5);
          hs.push({ key: K(0, 1), ci, o, ix: 0, iy: 1, kind: "ctrl", x: c1[0], y: c1[1], rel, base: [bx, by], link: [bx, by] });
          hs.push({ key: K(2, 3), ci, o, ix: 2, iy: 3, kind: "ctrl", x: c2[0], y: c2[1], rel, base: [bx, by], link: e });
          hs.push({ key: K(4, 5), ci, o, ix: 4, iy: 5, kind: "anchor", x: e[0], y: e[1], rel, base: [bx, by] });
          cx = e[0]; cy = e[1]; break; }
        case "S": case "Q": {
          const q = abs(0, 1), e = abs(2, 3);
          hs.push({ key: K(0, 1), ci, o, ix: 0, iy: 1, kind: "ctrl", x: q[0], y: q[1], rel, base: [bx, by], link: e });
          hs.push({ key: K(2, 3), ci, o, ix: 2, iy: 3, kind: "anchor", x: e[0], y: e[1], rel, base: [bx, by] });
          cx = e[0]; cy = e[1]; break; }
        case "A": {
          const e = rel ? [bx + A[o + 5], by + A[o + 6]] : [A[o + 5], A[o + 6]];
          hs.push({ key: K(5, 6), ci, o, ix: 5, iy: 6, kind: "anchor", x: e[0], y: e[1], rel, base: [bx, by] });
          cx = e[0]; cy = e[1]; break; }
      }
    }
  });
  return hs;
}
)};

// Pure: move one handle, return the attribute the lens should be asked to hold.
const _sl113 = function _handleEdit(pointsHandles,parsePoints,attrVal,printPoints,pathHandles,parsePath,printPath){return(
(mode, src, idx, key, lx, ly) => {
  if (mode === "points") {
    const h = pointsHandles(src, idx).find((h) => h.key === key);
    if (!h) return null;
    const pts = parsePoints(attrVal(src, idx, "points"));
    pts[h.i] = [lx, ly];
    return { name: "points", value: printPoints(pts) };
  }
  const h = pathHandles(src, idx).find((h) => h.key === key);
  if (!h) return null;
  const cmds = parsePath(attrVal(src, idx, "d"));
  const A = cmds[h.ci].a;
  if (h.ix >= 0) A[h.o + h.ix] = h.rel ? lx - h.base[0] : lx;
  if (h.iy >= 0) A[h.o + h.iy] = h.rel ? ly - h.base[1] : ly;
  return { name: "d", value: printPath(cmds) };
}
)};

// Patch `live` into the shape of `next`, in place. The cell's value is the live node, so it must
// survive the edit: replacing it would break node identity, the observer holding it, and the gesture
// in flight. `skip` marks nodes the renderer does not own (the handle overlay), which stay put and
// are never counted when aligning children.
//
// Alignment is by index within the owned children, with a tag check. An insert in the middle
// therefore rebuilds the nodes after it; the output is right either way, and only the elements the
// user is not holding lose identity.
const _sl115 = function _morph(){return(
function morph(live, next, skip = () => false) {
  if (live.nodeType !== 1) {
    if (live.nodeValue !== next.nodeValue) live.nodeValue = next.nodeValue;
    return live;
  }
  for (let i = live.attributes.length - 1; i >= 0; i--) {
    const a = live.attributes[i];
    if (!next.hasAttribute(a.name)) live.removeAttribute(a.name);
  }
  for (const a of next.attributes) if (live.getAttribute(a.name) !== a.value) live.setAttribute(a.name, a.value);

  const all = [...live.childNodes];
  const kept = all.filter((n) => !skip(n));
  const anchor = all.find(skip) || null;      // new children go before the overlay, not after it
  const want = [...next.childNodes];
  for (let i = 0; i < want.length; i++) {
    const b = want[i], a = kept[i];
    if (!a) live.insertBefore(b.cloneNode(true), anchor);
    else if (a.nodeType !== b.nodeType || (a.nodeType === 1 && a.localName !== b.localName))
      live.replaceChild(b.cloneNode(true), a);
    else morph(a, b, skip);
  }
  for (let i = want.length; i < kept.length; i++) kept[i].remove();
  return live;
}
)};

// ---- the target: which cell am I, and what does its literal say? --------------------------------
// Locating the variable by `_value` identity and the parameter name by position is the same trick
// @tomlarkworthy/sticky uses. Nothing else in the editor knows how a cell is found.
const _sl116 = function _svgTarget(runtime,literalSpan){return(
(node, { marker, isOwn = () => false }) => {
  const NS = "http://www.w3.org/2000/svg";
  let self = null, alias = "svgLens";
  const resolve = () => {
    if (self && self._value === node) return self;
    self = [...runtime._variables].find((v) => v._value === node) || null;
    if (!self) return null;
    const i = self._inputs.findIndex((inp) => inp && inp._value === marker);
    const params = /^[^(]*\(([^)]*)\)/.exec(self._definition.toString());
    const names = params ? params[1].split(",").map((s) => s.trim()) : [];
    alias = (i >= 0 && names[i]) || "svgLens";
    return self;
  };
  const cellSource = () => (resolve() ? self._definition.toString() : null);
  return {
    variable: resolve,
    alias: () => { resolve(); return alias; },
    cellSource,
    // The SVG text the source currently holds — null when this node is not (yet) a cell value.
    doc() {
      const s = cellSource();
      if (s === null) return null;
      const [a, b] = literalSpan(s, alias);
      return s.slice(a, b);
    },
    // Source elements in document order — overlay excluded, so indices match tokenize().
    elems: () => [node, ...node.querySelectorAll("*")].filter((e) => e.namespaceURI === NS && !isOwn(e))
  };
}
)};

// ---- the writer: the one place that touches _definition -----------------------------------------
// Source is truth; the live node is a projection of it, patched. Rendering evaluates the new
// definition with the variable's current inputs — it does not parse the SVG text — so an interpolated
// template renders the same way a static one does. Recomputing the cell instead would mint a new node
// and break the value's identity.
const _sl117 = function _svgWriter(runtime,realize,morph,literalLens,cellAttrLens,compose,attrVal,literalSpan,holeSpans,slotsOf,mergeInterpolated){return(
(node, target, { isOwn, guard }) => {
  const emit = (record) => {
    node.lastPut = record;
    node.dispatchEvent(new CustomEvent("lens-put", { detail: record }));
    node.dispatchEvent(new Event("input", { bubbles: true }));
    return record;
  };

  async function applySource(next, record) {
    const self = target.variable();
    const before = self._definition;
    // The whole prior definition, so a history layer can restore the exact bytes. The swap is
    // silent — `onCodeChange` only samples when the variable *set* changes — so nothing else sees it.
    record.source = { before: target.cellSource(), after: next };
    const [fn] = await realize([next], runtime);
    if (self._definition !== before) {                 // editor-5 (or another gesture) got there first
      record.aborted = "definition changed under the gesture";
      return emit(record);
    }
    let fresh;
    guard.rendering = true;
    try { fresh = await fn.apply(null, self._inputs.map((i) => i._value)); }
    finally { guard.rendering = false; }
    self._definition = fn;                             // silent swap, as in @tomlarkworthy/sticky
    morph(node, fresh, isOwn);
    node.style.touchAction = "none";                   // morph syncs attributes, including style
    return emit(record);
  }

  // A structural edit: a pure command rewrites the SVG document text, `literalLens` carries it back
  // into the cell definition, and the writer renders it.
  // `rebase` maps an address across this edit, for whoever is holding one. The writer never applies
  // it — it does not know that selection exists — it just reports it on the event.
  async function runCommand(name, fn, { rebase = null } = {}) {
    const s = target.cellSource();
    if (s === null) return null;
    const L = literalLens(target.alias());
    const next = L.put(fn(L.get(s)), s);
    const record = { target: name, attribute: "(structure)", before: "", after: "", rebase,
                     GetPut: L.put(L.get(next), next) === next, PutGet: true, span: null };
    if (next === s) { node.lastPut = record; return record; }
    return applySource(next, record);
  }

  // The three sinks a gesture can land in (§4 of the design note). Which one applies is decided by
  // the *provenance* of the slot being moved, not by the gesture: source text is written here, an
  // expression's value is written upstream, and anything else is locked and says so.
  //
  // Sink 2: the whole attribute is one hole, `${x}`. If `x` is an input of this cell and has a view,
  // moving the handle moves the view — the runtime then re-renders the drawing for us.
  function writeUpstream(expr, value) {
    const self = target.variable();
    const m = /^\$\{\s*([A-Za-z_$][\w$]*)\s*\}$/.exec(expr);
    if (!self || !m) return "the expression is not a plain identifier";
    const input = self._inputs.find((v) => v && v._name === m[1]);
    if (!input) return `${m[1]} is not an input of this cell`;
    const view = [...runtime._variables].find(
      (v) => v._name === "viewof " + m[1] && v._module === input._module);
    const el = view && view._value;
    if (!el || typeof el !== "object" || !("value" in el)) return `${m[1]} has no view to write to`;
    el.value = Number(value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    return null;                                         // written
  }

  // Sink 1 with holes present: write the literal slots, keep the expressions, report what was locked.
  async function commitInterpolated(idx, name, value, dflt, inner, srcText, record, was) {
    const s = target.cellSource();
    const el = target.elems()[idx];
    // What the holes rendered to *before* this gesture. A tool that previews by writing the live
    // element must say so (`was`), or the diff is taken against its own preview and every slot looks
    // untouched — the drag then commits nothing at all.
    const rendered = was || (el && el.getAttribute(name)) || dflt || "";
    const nextRendered = inner ? inner.put(value, rendered) : String(value);
    const slots = slotsOf(srcText);
    // The whole value is one expression: nothing here to write, so try the upstream sink.
    if (slots.length === 1 && slots[0].kind === "hole" && slots[0].text.length === srcText.length) {
      const why = writeUpstream(srcText, (nextRendered.match(/[+-]?(?:\d+\.?\d*|\.\d+)/) || [])[0]);
      record.sink = why ? "locked" : "upstream";
      record.locked = why;
      if (why && el) el.setAttribute(name, rendered);     // put the preview back: nothing was written
      return emit(record);
    }
    const merged = mergeInterpolated(srcText, rendered, nextRendered);
    // A moved hole is not automatically a dead end: if it names a view, move the view instead. That
    // is the same routing decision as the whole-hole case, taken per slot.
    const nums = nextRendered.match(/[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/g) || [];
    const stillLocked = [];
    let wroteUpstream = false;
    for (const i of merged.locked) {
      const why = writeUpstream(slots[i].text, nums[i]);
      if (why) stillLocked.push(`${slots[i].text} (${why})`); else wroteUpstream = true;
    }
    record.sink = merged.reason || stillLocked.length ? "mixed (partly locked)"
                : wroteUpstream ? "upstream + literal" : "literal";
    record.locked = merged.reason || (stillLocked.length ? stillLocked.join("; ") : null);
    const next = cellAttrLens(target.alias(), idx, name, dflt).put(merged.text, s);
    if (next === s) {
      if (el) el.setAttribute(name, rendered);
      return emit(record);
    }
    record.after = merged.text;
    return applySource(next, record);
  }

  // One gesture, one put, through the composed lens. `inner` refines the attribute string into the
  // view the gesture actually manipulates (a translate pair; the string itself otherwise).
  async function commit(idx, name, value, dflt, inner, was = null) {
    const s = target.cellSource();
    if (s === null) return null;
    const alias = target.alias();
    const base = cellAttrLens(alias, idx, name, dflt);
    const srcText = base.get(s);
    if (srcText !== null && holeSpans(srcText).length) {
      const el = target.elems()[idx];
      return commitInterpolated(idx, name, value, dflt, inner, srcText, {
        target: (el ? el.localName : "?") + "[" + idx + "]", attribute: name,
        before: srcText, after: srcText, GetPut: true, PutGet: true, span: null
      }, was);
    }
    const l = inner ? compose(base, inner) : base;
    const before = l.get(s);
    const next = l.put(value, s);
    const same = (a, b) => (Array.isArray(a) ? Array.isArray(b) && a.length === b.length && a.every((v, i) => v === b[i]) : a === b);
    const record = {
      target: target.elems()[idx].localName + "[" + idx + "]", attribute: name,
      before: String(before), after: String(l.get(next)),
      // the laws, re-checked on the source this gesture just produced
      GetPut: l.put(l.get(next), next) === next,
      PutGet: same(l.get(next), value),
      span: null
    };
    if (next === s) {
      // skip rule: the view is unchanged, so the source keeps its residue — make the DOM agree
      const v = attrVal(target.doc(), idx, name);
      const el = target.elems()[idx];
      if (v === null) el.removeAttribute(name); else el.setAttribute(name, v);
      return emit(record);
    }
    const [a, b] = literalSpan(next, alias);
    const tok = attrVal(next.slice(a, b), idx, name);
    if (tok !== null) {                                // highlight the attribute we just wrote
      const at = next.indexOf(name + '="' + tok + '"', a);
      record.span = at === -1 ? null : [at, at + (name + '="' + tok + '"').length];
    }
    return applySource(next, record);
  }

  return { applySource, runCommand, commit };
}
)};

// ---- the overlay: handles live in the DOM only, never in the source ------------------------------
const _sl118 = function _svgOverlay(){return(
(node) => {
  const NS = "http://www.w3.org/2000/svg";
  const el = document.createElementNS(NS, "g");
  el.setAttribute("data-svg-lens-overlay", "");
  const style = document.createElementNS(NS, "style");
  style.textContent = `
      [data-svg-lens-overlay] .anchor{fill:#fff;stroke:#2F6BFF;stroke-width:2;cursor:grab}
      [data-svg-lens-overlay] .ctrl{fill:#EDF1E8;stroke:#8A63D2;stroke-width:1.5;cursor:grab}
      [data-svg-lens-overlay] .hit{fill:transparent;stroke:none;cursor:grab}
      [data-svg-lens-overlay] .scale{fill:#fff;stroke:#2F6BFF;stroke-width:2;cursor:nwse-resize}
      [data-svg-lens-overlay] .rotate{fill:#2F6BFF;stroke:#fff;stroke-width:1.5;cursor:grab}
      [data-svg-lens-overlay] .box{fill:none;stroke:#2F6BFF;stroke-dasharray:4 3;stroke-width:1;opacity:.6}
      [data-svg-lens-overlay] .link{stroke:#8A63D2;stroke-dasharray:3 3;stroke-width:1;fill:none;opacity:.7}
      [data-svg-lens-overlay] .guide{stroke:#E4572E;stroke-width:1;opacity:.9}
      [data-svg-lens-overlay] .locked{fill:#cfcfcf;stroke:#9a9a9a;stroke-dasharray:2 2;cursor:not-allowed}`;
  el.appendChild(style);
  node.appendChild(el);
  return {
    el,
    isOwn: (n) => n === el || el.contains(n),
    // Everything except the stylesheet: previews are arbitrary shapes, not just handles.
    clear: () => [...el.childNodes].forEach((n) => { if (n !== style) n.remove(); }),
    add(tag, attrs) {
      const n = document.createElementNS(NS, tag);
      for (const k in attrs) n.setAttribute(k, attrs[k]);
      el.appendChild(n);
      return n;
    },
    root: node,
    // Handles are drawn in the focused element's own user space, so no screen-space maths is needed
    // to place them — the browser applies the same CTM it applies to the shape.
    alignTo: (target) => el.setAttribute("transform", target ? (target.getAttribute("transform") || "") : "")
  };
}
)};

// An element's bounding box in the root's user space, so boxes for several elements — each with its
// own transform — can be drawn in one coordinate system. The corners are mapped and re-bounded; the
// box of a rotated element is the box of its rotated corners, not its rotated box.
const _sl119a = function _boxInRoot(){return(
(el, root) => {
  if (!el.getBBox || !el.getScreenCTM || !root.getScreenCTM) return null;
  const rm = root.getScreenCTM(), em = el.getScreenCTM();
  if (!rm || !em) return null;
  const M = rm.inverse().multiply(em);
  const b = el.getBBox();
  const xs = [], ys = [];
  for (const [x, y] of [[b.x, b.y], [b.x + b.width, b.y], [b.x + b.width, b.y + b.height], [b.x, b.y + b.height]]) {
    xs.push(M.a * x + M.c * y + M.e);
    ys.push(M.b * x + M.d * y + M.f);
  }
  const x0 = Math.min(...xs), y0 = Math.min(...ys);
  return { x: x0, y: y0, width: Math.max(...xs) - x0, height: Math.max(...ys) - y0 };
}
)};

// Alignment snapping, as pure rectangle arithmetic: given the box being dragged and the boxes it
// could align to, return the nudge that lands it on the nearest edge or centre within `tol`, and the
// guides to draw for it. Coordinate-system agnostic — the caller passes boxes in one space and gets
// a delta in that space. Each axis snaps independently, and ties go to the smaller correction.
const _sl127 = function _snapRects(){return(
(moving, others, tol = 6) => {
  const lines = (b) => ({ x: [b.x, b.x + b.width / 2, b.x + b.width],
                          y: [b.y, b.y + b.height / 2, b.y + b.height] });
  const mine = lines(moving);
  const best = { x: null, y: null };
  for (const o of others) {
    const theirs = lines(o);
    for (const axis of ["x", "y"]) {
      for (const a of mine[axis]) for (const b of theirs[axis]) {
        const d = b - a;
        if (Math.abs(d) > tol) continue;
        if (!best[axis] || Math.abs(d) < Math.abs(best[axis].d)) best[axis] = { d, at: b, other: o };
      }
    }
  }
  const guides = [];
  const span = (axis, at, o) => {
    // The guide runs across both boxes on the other axis, so it reads as "these two line up".
    const lo = axis === "x" ? Math.min(moving.y, o.y) : Math.min(moving.x, o.x);
    const hi = axis === "x" ? Math.max(moving.y + moving.height, o.y + o.height)
                            : Math.max(moving.x + moving.width, o.x + o.width);
    return axis === "x" ? { x1: at, y1: lo, x2: at, y2: hi } : { x1: lo, y1: at, x2: hi, y2: at };
  };
  const dx = best.x ? best.x.d : 0, dy = best.y ? best.y.d : 0;
  if (best.x) guides.push(span("x", best.x.at, best.x.other));
  if (best.y) guides.push(span("y", best.y.at, best.y.other));
  // `snapped` distinguishes "already aligned" (d === 0 with a match) from "nothing to align to".
  return { dx, dy, guides, snapped: { x: !!best.x, y: !!best.y } };
}
)};

// Drop any address that lies inside another one in the set. Selecting a group *and* its children
// would move the children twice — once with the group, once on their own.
const _sl119c = function _topmostPaths(){return(
(paths) => {
  const key = (p) => p.join("/") + "/";
  const keys = paths.map(key);
  return paths.filter((p, i) => !keys.some((k, j) => j !== i && key(p).startsWith(k) && k.length < keys[i].length));
}
)};

// Where does a z-order gesture put an element? Pure, so the semantics are testable without a DOM:
// "front" is last in document order because SVG paints in document order.
const _sl119b = function _zTarget(){return(
(kind, from, count) => {
  const last = Math.max(0, count - 1);
  const clamp = (i) => Math.max(0, Math.min(last, i));
  if (kind === "front") return last;
  if (kind === "back") return 0;
  if (kind === "raise") return clamp(from + 1);
  if (kind === "lower") return clamp(from - 1);
  throw new Error(`unknown z-order: ${kind}`);
}
)};

// ---- selection: which element is being edited, and its handles -----------------------------------
// Selection is held as a *path*, not an index: an index into document order is invalidated by any
// insert or delete before it, a path only by an edit to its own parent chain. `index` stays available
// because the handle lenses address elements the way tokenize() does.
const _sl119 = function _svgFocus(pointsHandles,pathHandles,transformHandles,nodeAt,boxInRoot,topmostPaths,attrVal,holeSpans){return(
(overlay, target, onChange = () => {}) => {
  // A set, ordered by when each element was added. The first is the primary: handles, and everything
  // that only makes sense for one element, follow it. Single selection is the one-element case, so
  // the tools that predate multi-select need no changes.
  let paths = [], mode = null;
  const key = (p) => p.join("/");
  const indexOfPath = (p) => {
    if (!p) return null;
    const t = target.doc();
    if (t === null) return null;
    try { return nodeAt(t, p).index; } catch (e) { return null; }      // the element is gone
  };
  const indexOf = () => indexOfPath(paths.length ? paths[0] : null);
  const element = () => { const i = indexOf(); return i === null ? null : target.elems()[i]; };
  const handles = () => {
    const idx = indexOf();
    if (idx === null) return [];
    // The transform gizmo reads the element's own bounding box: the geometry it frames is the
    // element's, not the source's, and getBBox is already in the space the handles are drawn in.
    if (mode === "transform") {
      const el = element();
      if (!el || !el.getBBox) return [];
      try { return transformHandles(el.getBBox()); } catch (e) { return []; }
    }
    const t = target.doc();
    if (t === null) return [];
    try { return mode === "points" ? pointsHandles(t, idx) : pathHandles(t, idx); }
    catch (e) { return []; }                            // outside the lens domain: no handles
  };
  const scaleOf = (el) => { const m = el.getScreenCTM(); return m ? Math.hypot(m.a, m.b) : 1; };
  const paint = () => {
    overlay.clear();
    paths = paths.filter((p) => indexOfPath(p) !== null);               // drop what no longer resolves
    if (paths.length > 1) {                                            // a set: boxes only, no handles
      overlay.alignTo(null);
      for (const p of paths) {
        const el = target.elems()[indexOfPath(p)];
        const b = el && boxInRoot(el, overlay.root);
        if (b) overlay.add("rect", { class: "box", x: b.x, y: b.y, width: b.width, height: b.height });
      }
      return;
    }
    const idx = indexOf();
    if (idx === null) { paths = []; mode = null; return; }
    const el = target.elems()[idx];
    if (!el) return;
    overlay.alignTo(el);
    const r = 5 / Math.max(0.2, scaleOf(el));
    const hs = handles();
    if (mode === "transform" && el.getBBox) {
      const b = el.getBBox();
      overlay.add("rect", { class: "box", x: b.x, y: b.y, width: b.width, height: b.height });
    }
    // A handle over an expression cannot write source. Show that before it is grabbed, rather than
    // letting the gesture look like it worked; the writer still refuses on release either way.
    const locked = (() => {
      const t = target.doc();
      if (t === null) return false;
      const name = mode === "points" ? "points" : mode === "path" ? "d" : "transform";
      try {
        const v = attrVal(t, idx, name);
        return !!(v && holeSpans(v).length);
      } catch (e) { return false; }
    })();
    for (const h of hs) if (h.link) overlay.add("line", { class: "link", x1: h.x, y1: h.y, x2: h.link[0], y2: h.link[1] });
    for (const h of hs) {
      const cls = locked ? "locked"
                : h.kind === "anchor" || h.kind === "scale" || h.kind === "rotate" ? h.kind : "ctrl";
      overlay.add("circle", { class: cls, r: cls === "ctrl" ? r * 0.8 : r, cx: h.x, cy: h.y });
      overlay.add("circle", { class: "hit", r: r * 2.6, cx: h.x, cy: h.y }).dataset.key = h.key;
    }
  };
  // One place announces that the selection may have changed: whatever redrew it.
  const draw = () => { paint(); onChange(); };
  return {
    get path() { return paths.length ? paths[0] : null; },             // the primary
    get paths() { return paths.slice(); },
    get indices() { return paths.map(indexOfPath).filter((i) => i !== null); },
    get index() { return indexOf(); },
    get mode() { return mode; },
    handles,
    refresh: draw,
    set(p, m) { paths = p ? [p] : []; mode = p ? m : null; draw(); },
    setAll(ps, m = null) { paths = topmostPaths(ps); mode = paths.length === 1 ? m : null; draw(); },
    // Shift-click: in or out of the set, primary unchanged unless it was the one removed.
    toggle(p) {
      const i = paths.findIndex((q) => key(q) === key(p));
      if (i >= 0) paths.splice(i, 1); else paths = topmostPaths(paths.concat([p]));
      if (paths.length !== 1) mode = null;
      draw();
    },
    clear() { paths = []; mode = null; draw(); },
    // Carry the selection across a structural edit; a dropped path means that element was deleted.
    rebase(fn) {
      paths = paths.map(fn).filter(Boolean);
      if (paths.length !== 1) mode = null;
    }
  };
}
)};

// ================================================================================================
// TOOLS — pointer state machines. A tool reads the document, previews in the DOM, and emits a
// command or a commit; it never writes the source itself. Registered in `svgTools`, so a new tool is
// a new cell rather than an edit to svgLens.
//
//   onPointerDown(ctx, e) -> true to claim the gesture (later moves and the release go to this tool)
//   onPointerMove(ctx, e)
//   onPointerUp(ctx, e)
//   onDblClick(ctx, e)    -> true if handled
//
// ctx = { node, options, target, writer, focus, elems(), doc(), localPoint(el, e), snap(v), state }
// ================================================================================================

// Rotate and scale from the bounding box. Rotation appends `rotate(a cx cy)` at the tail, where it
// acts on the element's own geometry, so it needs no compensation and stays readable. Scaling appends
// `scale(sx sy)` and then fixes the leading translate so the corner you are NOT dragging stays put —
// solved numerically against the real matrices rather than by algebra over a particular op order,
// which is what makes it correct for a transform list the author wrote by hand.
// Capture on the root, never on the handle: refreshing the overlay mid-drag destroys the handle, and
// with it the capture. Best-effort — a pointer the browser no longer tracks must not kill the gesture.
const _sl124c = function _grabPointer(){return(
(node, e) => { try { node.setPointerCapture(e.pointerId); } catch (_) {} }
)};

const _sl124 = function _toolTransform(opsLens,rotateAbout,scaleAbout,printOp,attrVal,grabPointer){return(
{
  id: "transform",
  onPointerDown(ctx, e) {
    const key = e.target.dataset && e.target.dataset.key;
    if (key === undefined || ctx.focus.mode !== "transform") return false;
    const idx = ctx.focus.index;
    const el = ctx.elems()[idx];
    const t = ctx.doc();
    if (!el || t === null) return false;
    e.preventDefault();
    grabPointer(ctx.node, e);
    const b = el.getBBox();
    const text = ctx.attr(t, idx, "transform") || "";
    ctx.state.drag = {
      key, idx, el, b, text, base: opsLens.get(text), ops: opsLens.get(text), started: false,
      centre: [b.x + b.width / 2, b.y + b.height / 2],
      // the corner opposite the one being dragged: the point that must not move
      pivot: key === "rot" ? null : [
        /w$/.test(key) ? b.x + b.width : b.x,
        /^n/.test(key) ? b.y + b.height : b.y
      ]
    };
    return true;
  },
  onPointerMove(ctx, e) {
    const d = ctx.state.drag;
    if (!d) return;
    const p = ctx.localPoint(d.el, e);
    if (!p) return;
    d.started = true;
    if (d.key === "rot") {
      const a = Math.atan2(p[1] - d.centre[1], p[0] - d.centre[0]) * 180 / Math.PI + 90;
      const step = e.shiftKey ? 15 : 1;
      d.ops = rotateAbout(d.base, Math.round(a / step) * step, d.centre[0], d.centre[1]);
    } else {
      const w = d.b.width || 1, h = d.b.height || 1;
      const sx = Math.abs((p[0] - d.pivot[0]) / (/w$/.test(d.key) ? -w : w)) || 0.01;
      const sy = Math.abs((p[1] - d.pivot[1]) / (/^n/.test(d.key) ? -h : h)) || 0.01;
      const k = e.shiftKey ? Math.max(sx, sy) : null;    // shift keeps the aspect ratio
      d.ops = scaleAbout(d.base, ctx.snap(k === null ? sx : k), ctx.snap(k === null ? sy : k),
                         d.pivot[0], d.pivot[1]);
    }
    d.el.setAttribute("transform", d.ops.map(printOp).join(" "));   // live only; source waits
    ctx.focus.refresh();
  },
  async onPointerUp(ctx) {
    const d = ctx.state.drag;
    ctx.state.drag = null;
    if (d && d.started) await ctx.writer.commit(d.idx, "transform", d.ops, "", opsLens, d.text);
  }
}
)};

// Drag a vertex or control point: the `points` and path `d` lenses.
const _sl120 = function _toolVertex(handleEdit,grabPointer){return(
{
  id: "vertex",
  onPointerDown(ctx, e) {
    const key = e.target.dataset && e.target.dataset.key;
    const mode = ctx.focus.mode;
    if (key === undefined || ctx.focus.index === null) return false;
    if (mode !== "points" && mode !== "path") return false;          // the gizmo owns its own handles
    e.preventDefault();
    grabPointer(ctx.node, e);
    const el0 = ctx.elems()[ctx.focus.index];
    const name = mode === "points" ? "points" : "d";
    ctx.state.drag = { key, idx: ctx.focus.index, mode, started: false, x0: e.clientX, y0: e.clientY,
                       // what it rendered before the preview overwrites it (see writer.commit)
                       was: el0 ? { [name]: el0.getAttribute(name) } : null };
    return true;
  },
  onPointerMove(ctx, e) {
    const d = ctx.state.drag;
    if (!d) return;
    if (!d.started && Math.hypot(e.clientX - d.x0, e.clientY - d.y0) < 3) return;
    d.started = true;
    const el = ctx.elems()[d.idx];
    const p = el && ctx.localPoint(el, e);
    const t = ctx.doc();
    if (!p || t === null) return;
    const edit = handleEdit(d.mode, t, d.idx, d.key, p[0], p[1]);
    if (!edit) return;
    d.edit = edit;
    el.setAttribute(edit.name, edit.value);              // live only; the source waits for release
    ctx.focus.refresh();
  },
  async onPointerUp(ctx) {
    const d = ctx.state.drag;
    ctx.state.drag = null;
    if (d && d.started && d.edit) await ctx.writer.commit(d.idx, d.edit.name, d.edit.value, null, null, d.was && d.was[d.edit.name]);
  }
}
)};

// What is under the pointer, front to back. `elementsFromPoint` answers for painted geometry, which
// already gives click-through to occluded shapes for free. When it finds nothing — a thin unfilled
// stroke the pointer merely came close to — fall back to distance along the geometry, so hairlines
// are still reachable. The browser is the authority on hit shape either way; no geometry is restated.
const _sl121a = function _hitTest(){return(
(ctx, e, opts = {}) => {
  const list = ctx.elems();
  const own = new Set(list.slice(1));                    // 0 is the root <svg>: never a hit
  const painted = (document.elementsFromPoint ? document.elementsFromPoint(e.clientX, e.clientY) : [])
    .filter((n) => own.has(n));
  if (painted.length) return painted;
  const tol = opts.tolerance === undefined ? 6 : opts.tolerance;       // CSS px
  const near = [];
  for (let i = 1; i < list.length; i++) {
    const el = list[i];
    if (!el.getTotalLength || !el.getPointAtLength) continue;
    let len, m;
    try { len = el.getTotalLength(); m = el.getScreenCTM(); } catch (err) { continue; }
    if (!m || !(len >= 0)) continue;
    const steps = Math.max(8, Math.min(128, Math.round(len / 4)));
    let best = Infinity;
    for (let s = 0; s <= steps; s++) {
      const p = el.getPointAtLength((len * s) / steps);
      best = Math.min(best, Math.hypot(m.a * p.x + m.c * p.y + m.e - e.clientX,
                                       m.b * p.x + m.d * p.y + m.f - e.clientY));
    }
    if (best <= tol) near.push([best, el]);
  }
  return near.sort((a, b) => a[0] - b[0]).map((x) => x[1]);
}
)};

// Drag a shape's body: the `transform` lens, focused on the leading translate op. Dragging one of
// several selected shapes moves them all — one commit each, since each writes its own attribute.
// A tap with no movement selects instead: shift adds to the set, and tapping the shape that is
// already primary cycles to the next shape underneath, which is how an occluded shape is reached.
const _sl121 = function _toolMove(translateLens,attrVal,invert,ctmMat,parsePoints,parsePath,pathOfIndex,grabPointer,hitTest,snapRects){return(
{
  id: "move",
  onPointerDown(ctx, e) {
    if (ctx.tool() !== "select") return false;
    const hits = hitTest(ctx, e, { tolerance: ctx.options.hitTolerance });
    if (!hits.length) return false;                      // empty canvas: the marquee may want it
    const list = ctx.elems();
    const t = ctx.doc();
    if (t === null) return false;
    const sel = ctx.focus.indices;
    // Grabbing a selected shape grabs the whole selection; grabbing anything else grabs just it.
    const primary = sel.length ? list[sel[0]] : null;
    const el = hits.indexOf(primary) >= 0 ? primary : hits[0];
    const idx = list.indexOf(el);
    if (idx <= 0) return false;
    const targets = [];
    for (const i of sel.indexOf(idx) >= 0 ? sel : [idx]) {
      const node = list[i];
      const ps = node && node.parentNode.getScreenCTM();
      if (!ps) continue;
      const text = ctx.attr(t, i, "transform") || "";
      targets.push({ idx: i, el: node, text,
                     // screen delta → this element's parent space (linear part: a drag is a translation)
                     Slin: invert(ctmMat(ps)), T0: translateLens.get(text) });
    }
    if (!targets.length) return false;
    // Snapping is measured in screen space, where every box is axis-aligned whatever transforms
    // its element carries, and the drag delta already lives. One dragged element only: aligning a
    // set to a sibling means choosing which member aligns, which is a UX question, not this one.
    const snapping = targets.length === 1 && ctx.options.snap !== false;
    ctx.state.drag = {
      idx, hits, tag: el.localName, targets,
      x0: e.clientX, y0: e.clientY, started: false,
      thresh: e.pointerType === "mouse" ? 3 : 10,
      box: snapping ? el.getBoundingClientRect() : null,
      others: snapping ? list.slice(1).filter((n) => n !== el && !n.contains(el) && !el.contains(n))
                              .map((n) => n.getBoundingClientRect()) : null
    };
    grabPointer(ctx.node, e);
    return true;
  },
  onPointerMove(ctx, e) {
    const d = ctx.state.drag;
    if (!d) return;
    let dx = e.clientX - d.x0, dy = e.clientY - d.y0;
    if (!d.started && Math.hypot(dx, dy) < d.thresh) return;
    d.started = true;
    let guides = [], aligned = { x: false, y: false };
    if (d.box && !e.altKey) {                            // alt is the usual "ignore snapping" modifier
      const moved = { x: d.box.x + dx, y: d.box.y + dy, width: d.box.width, height: d.box.height };
      const snap = snapRects(moved, d.others, ctx.options.snapTolerance);
      dx += snap.dx; dy += snap.dy;
      guides = snap.guides;
      aligned = snap.snapped;                            // an alignment beats the grid: it is exact
    }
    for (const g of d.targets) {
      const S = g.Slin;
      // Per axis: an aligned axis keeps its exact value (rounded only to kill float noise, or the
      // source fills up with 10.476190476190474), an unaligned one still lands on the grid.
      const q = (v, on) => (on ? Math.round(v * 1e6) / 1e6 : ctx.snap(v));
      g.T = [q(g.T0[0] + S[0] * dx + S[2] * dy, aligned.x), q(g.T0[1] + S[1] * dx + S[3] * dy, aligned.y)];
      g.el.setAttribute("transform", translateLens.put(g.T, g.text));
    }
    ctx.focus.refresh();                                 // clears the overlay, so guides come after
    ctx.guides(guides);
  },
  async onPointerUp(ctx, e) {
    const d = ctx.state.drag;
    ctx.state.drag = null;
    if (!d) return;
    if (d.started) {
      ctx.guides([]);
      for (const g of d.targets) await ctx.writer.commit(g.idx, "transform", g.T, "", translateLens, g.text);
      return;
    }
    if (e.type !== "pointerup") return;
    const t = ctx.doc();
    if (t === null) return;
    if (e.shiftKey) return void ctx.focus.toggle(pathOfIndex(t, d.idx));
    // Tapping the primary again steps down the stack; tapping anything else selects the top hit.
    const list = ctx.elems();
    const single = ctx.focus.paths.length === 1;
    const at = d.hits.indexOf(list[d.idx]);
    const pick = single && at >= 0 ? d.hits[(at + 1) % d.hits.length] : d.hits[0];
    const idx = list.indexOf(pick);
    if (idx <= 0) return;
    const tag = pick.localName;
    const tryFocus = (mode, name, parse) => {
      const v = ctx.attr(t, idx, name);
      if (v === null) return false;
      try { parse(v); } catch (err) { return false; }    // outside the lens domain
      ctx.focus.set(pathOfIndex(t, idx), mode);
      return true;
    };
    if ((tag === "polygon" || tag === "polyline") && tryFocus("points", "points", parsePoints)) return;
    if (tag === "path" && tryFocus("path", "d", parsePath)) return;
    ctx.focus.set(pathOfIndex(t, idx), "transform");     // no vertex lens: offer the transform gizmo
  }
}
)};

// Drag on empty canvas to rubber-band a selection. Intersection is tested in the root's user space,
// where the marquee is drawn, so a rotated element is compared as the box it actually occupies.
const _sl121b = function _toolMarquee(boxInRoot,pathOfIndex,grabPointer,dragBox){return(
{
  id: "marquee",
  onPointerDown(ctx, e) {
    if (ctx.tool() !== "select") return false;
    const p = ctx.localPoint(ctx.node, e);
    if (!p) return false;
    grabPointer(ctx.node, e);
    if (!e.shiftKey) ctx.focus.clear();
    ctx.state.band = { x0: p[0], y0: p[1], x1: p[0], y1: p[1], add: e.shiftKey, box: null, moved: false };
    return true;
  },
  onPointerMove(ctx, e) {
    const b = ctx.state.band;
    if (!b) return;
    const p = ctx.localPoint(ctx.node, e);
    if (!p) return;
    b.x1 = p[0]; b.y1 = p[1]; b.moved = true;
    const r = dragBox(b.x0, b.y0, b.x1, b.y1);
    if (!b.box || !b.box.isConnected) {
      ctx.overlay.alignTo(null);
      b.box = ctx.overlay.add("rect", { class: "box" });
    }
    for (const k of ["x", "y", "width", "height"]) b.box.setAttribute(k, r[k]);
  },
  onPointerUp(ctx) {
    const b = ctx.state.band;
    ctx.state.band = null;
    if (!b) return;
    if (b.box) b.box.remove();
    if (!b.moved) return void ctx.focus.clear();
    const r = dragBox(b.x0, b.y0, b.x1, b.y1);
    const t = ctx.doc();
    if (t === null) return;
    const list = ctx.elems();
    const hits = [];
    for (let i = 1; i < list.length; i++) {
      const box = boxInRoot(list[i], ctx.node);
      if (!box) continue;
      if (box.x <= r.x + r.width && box.x + box.width >= r.x &&
          box.y <= r.y + r.height && box.y + box.height >= r.y) hits.push(pathOfIndex(t, i));
    }
    ctx.focus.setAll(b.add ? ctx.focus.paths.concat(hits) : hits);
  }
}
)};

// Structural editing by double-click: add a vertex on an edge, remove the one under the pointer, or
// drop a new shape on empty canvas. Every branch is a pure command.
const _sl122 = function _toolStructure(insertElement,insertPoint,deletePoint,nearestSegment,pointsHandles,parsePoints,attrVal,childrenLens,rebasePath,pathHandles,parsePath,pathSegments,nearestPathSegment,insertPathPoint,deletePathPoint){return(
{
  id: "structure",
  async onDblClick(ctx, e) {
    const t = ctx.doc();
    if (t === null) return false;
    const focus = ctx.focus;
    const key = e.target.dataset && e.target.dataset.key;
    // A point edit leaves the element tree alone, so every path — including the selection's — holds.
    const sel = focus.path;

    if (key !== undefined && sel && focus.mode === "points") {
      const h = pointsHandles(t, focus.index).find((x) => x.key === key);
      if (!h) return false;
      await ctx.writer.runCommand("deletePoint", (d) => deletePoint(d, sel, h.i));
      return true;
    }

    // The same two gestures on a path. An anchor handle ends a segment, so deleting "the anchor with
    // this key" is deleting the segment it terminates.
    if (key !== undefined && sel && focus.mode === "path") {
      const h = pathHandles(t, focus.index).find((x) => x.key === key);
      if (!h || h.kind !== "anchor") return false;
      const segs = pathSegments(parsePath(ctx.attr(t, focus.index, "d")));
      const i = segs.findIndex((s) => s.ci === h.ci && s.o === h.o);
      if (i < 0) return false;
      await ctx.writer.runCommand("deletePathPoint", (d) => deletePathPoint(d, sel, i));
      return true;
    }

    const list = ctx.elems();
    const hit = list.indexOf(e.target);
    // Inserting means double-clicking the shape itself. A handle under the pointer is a delete
    // (above) or, for a control point, nothing at all — inserting there would be a guess.
    if (sel && focus.mode === "points" && hit === focus.index) {
      const el = list[focus.index];
      const p = ctx.localPoint(el, e);
      if (!p) return false;
      const closed = el.localName !== "polyline";
      const seg = nearestSegment(parsePoints(ctx.attr(t, focus.index, "points")), p[0], p[1], closed);
      await ctx.writer.runCommand("insertPoint", (d) => insertPoint(d, sel, seg.index, p));
      return true;
    }

    if (sel && focus.mode === "path" && hit === focus.index) {
      const p = ctx.localPoint(list[focus.index], e);
      if (!p) return false;
      const segs = pathSegments(parsePath(ctx.attr(t, focus.index, "d")));
      const near = nearestPathSegment(segs, p[0], p[1]);
      if (near.index < 0 || segs[near.index].kind === "A") return false;
      await ctx.writer.runCommand("insertPathPoint", (d) => insertPathPoint(d, sel, near.index, near.t));
      return true;
    }

    if (hit <= 0) {
      const p = ctx.localPoint(ctx.node, e);
      if (!p) return false;
      const at = childrenLens([0]).get(t).length;       // appended, so nothing before it moves
      await ctx.writer.runCommand(
        "insertElement",
        (d) => insertElement(d, [0], null, ctx.options.newShape(p[0], p[1])),
        { rebase: (path) => rebasePath(path, { kind: "insert", parent: [0], at }) });
      return true;
    }
    return false;
  }
}
)};

// ---- creation: pure geometry, so the preview and the committed markup cannot disagree ------------
// A drag gives two corners in either order; `dragBox` normalises them. `square` is the shift-drag
// constraint, applied before normalising so the box grows from the corner you started at.
const _sl125a = function _dragBox(){return(
(x0, y0, x1, y1, square = false) => {
  let w = x1 - x0, h = y1 - y0;
  if (square) {
    const m = Math.max(Math.abs(w), Math.abs(h));
    w = (w < 0 ? -1 : 1) * m;
    h = (h < 0 ? -1 : 1) * m;
  }
  return { x: Math.min(x0, x0 + w), y: Math.min(y0, y0 + h),
           width: Math.abs(w), height: Math.abs(h), x1: x0 + w, y1: y0 + h };
}
)};

// One description of a new shape, used twice: as DOM attributes for the drag preview and as markup
// for the source. Deriving the markup FROM the spec is what keeps the two identical.
const _sl125b = function _shapeSpec(dragBox){return(
(kind, x0, y0, x1, y1, opts = {}) => {
  const b = dragBox(x0, y0, x1, y1, opts.square);
  const fill = opts.fill === undefined ? "#5B7A5E" : opts.fill;
  const stroke = opts.stroke === undefined ? "#3E4A3B" : opts.stroke;
  const width = opts.strokeWidth === undefined ? 3 : opts.strokeWidth;
  if (kind === "rect")
    return { tag: "rect", attrs: { x: b.x, y: b.y, width: b.width, height: b.height, fill } };
  if (kind === "ellipse")
    return { tag: "ellipse", attrs: { cx: b.x + b.width / 2, cy: b.y + b.height / 2,
                                      rx: b.width / 2, ry: b.height / 2, fill } };
  if (kind === "line")
    return { tag: "line", attrs: { x1: x0, y1: y0, x2: b.x1, y2: b.y1,
                                   stroke, "stroke-width": width, "stroke-linecap": "round" } };
  throw new Error(`unknown shape kind: ${kind}`);
}
)};

const _sl125c = function _shapeMarkup(shapeSpec){return(
(kind, x0, y0, x1, y1, opts) => {
  const { tag, attrs } = shapeSpec(kind, x0, y0, x1, y1, opts);
  return `<${tag} ${Object.keys(attrs).map((k) => `${k}="${attrs[k]}"`).join(" ")}/>`;
}
)};

// The pen builds a `d` attribute one anchor at a time. Text in, text out: each click is an ordinary
// attribute put, so a half-drawn path is a real path in the source at every step.
const _sl125d = function _penPath(){return(
{
  start: (x, y) => `M ${x} ${y}`,
  lineTo: (d, x, y) => `${d} L ${x} ${y}`,
  close: (d) => (/[Zz]\s*$/.test(d) ? d : `${d} Z`)
}
)};

// Drag on empty canvas to create a rect, an ellipse or a line. Preview lives in the overlay — the
// source gets exactly one put, on release, and only if the drag was big enough to mean it.
const _sl125 = function _toolDraw(shapeSpec,shapeMarkup,dragBox,grabPointer){return(
{
  id: "draw",
  onPointerDown(ctx, e) {
    const kind = ctx.tool();
    if (kind !== "rect" && kind !== "ellipse" && kind !== "line") return false;
    const p = ctx.localPoint(ctx.node, e);
    if (!p) return false;
    e.preventDefault();
    grabPointer(ctx.node, e);
    ctx.focus.clear();
    ctx.state.draw = { kind, x0: p[0], y0: p[1], x1: p[0], y1: p[1], square: false, preview: null };
    return true;
  },
  onPointerMove(ctx, e) {
    const d = ctx.state.draw;
    if (!d) return;
    const p = ctx.localPoint(ctx.node, e);
    if (!p) return;
    d.x1 = p[0]; d.y1 = p[1]; d.square = e.shiftKey;
    const spec = shapeSpec(d.kind, d.x0, d.y0, d.x1, d.y1, { square: d.square, ...ctx.options.shapeStyle });
    ctx.overlay.alignTo(null);                          // the preview is in root user space
    if (!d.preview || d.preview.localName !== spec.tag) {
      if (d.preview) d.preview.remove();
      d.preview = ctx.overlay.add(spec.tag, { ...spec.attrs, opacity: 0.6 });
    } else for (const k in spec.attrs) d.preview.setAttribute(k, spec.attrs[k]);
  },
  async onPointerUp(ctx) {
    const d = ctx.state.draw;
    ctx.state.draw = null;
    if (!d) return;
    if (d.preview) d.preview.remove();
    const b = dragBox(d.x0, d.y0, d.x1, d.y1, d.square);
    const min = ctx.options.minShape === undefined ? 2 : ctx.options.minShape;
    if (Math.max(b.width, b.height) < min) return void ctx.setTool("select");   // a click, not a drag
    const at = ctx.childCount([0]);
    const rec = await ctx.addShape(
      shapeMarkup(d.kind, d.x0, d.y0, d.x1, d.y1, { square: d.square, ...ctx.options.shapeStyle }));
    if (rec) ctx.focus.set([0, at], "transform");       // hand the new shape straight to the gizmo
    ctx.setTool("select");
  }
}
)};

// Click to place anchors; click the first anchor to close, or double-click to finish open. The path
// exists in the source from the first click, so there is no builder state that can diverge from it —
// the only state the tool keeps is which path it is extending.
const _sl126 = function _toolPen(penPath,attrVal,nodeAt,grabPointer){return(
{
  id: "pen",
  onPointerDown(ctx, e) {
    if (ctx.tool() !== "pen") return false;
    const p = ctx.localPoint(ctx.node, e);
    if (!p) return false;
    e.preventDefault();
    grabPointer(ctx.node, e);
    ctx.state.penClick = p;
    return true;
  },
  onHover(ctx, e) {                                     // rubber band from the last anchor
    const pen = ctx.state.pen;
    if (!pen) return;
    const p = ctx.localPoint(ctx.node, e);
    if (!p) return;
    if (!pen.band || !pen.band.isConnected) {
      ctx.overlay.alignTo(null);
      pen.band = ctx.overlay.add("line", { class: "link" });
    }
    for (const [k, v] of [["x1", pen.last[0]], ["y1", pen.last[1]], ["x2", p[0]], ["y2", p[1]]])
      pen.band.setAttribute(k, v);
  },
  async onPointerUp(ctx) {
    const p = ctx.state.penClick;
    ctx.state.penClick = null;
    if (!p) return;
    const pen = ctx.state.pen;
    if (!pen) {
      const at = ctx.childCount([0]);
      const s = ctx.options.penStyle || 'fill="none" stroke="#4C7FD1" stroke-width="3" stroke-linecap="round"';
      const rec = await ctx.addShape(`<path d="${penPath.start(p[0], p[1])}" ${s}/>`);
      if (!rec) return;
      ctx.state.pen = { path: [0, at], start: p, last: p, band: null };
      ctx.focus.set([0, at], "path");
      return;
    }
    const t = ctx.doc();
    if (t === null) return void ctx.setTool("select");
    let idx;
    try { idx = nodeAt(t, pen.path).index; } catch (err) { return void ctx.setTool("select"); }
    const d = ctx.attr(t, idx, "d");
    const r = ctx.options.penCloseRadius === undefined ? 8 : ctx.options.penCloseRadius;
    if (Math.hypot(p[0] - pen.start[0], p[1] - pen.start[1]) <= r) {
      await ctx.writer.commit(idx, "d", penPath.close(d), null);
      return void ctx.setTool("select");
    }
    pen.last = p;
    await ctx.writer.commit(idx, "d", penPath.lineTo(d, p[0], p[1]), null);
  },
  async onDblClick(ctx) {
    if (!ctx.state.pen) return false;
    ctx.setTool("select");                              // finish the path where it is
    return true;
  }
}
)};

// The registry. Order is priority: the first tool to claim a pointerdown owns the gesture. Push a
// tool from any cell and dispatch an input event to extend the editor without touching it. The
// creation tools come first because they gate on the active tool, so they claim nothing in select
// mode; toolPen precedes toolStructure so its double-click ends the path rather than dropping a shape.
const _sl123 = function _svgTools(Inputs,toolDraw,toolPen,toolTransform,toolVertex,toolMove,toolMarquee,toolStructure){return(
Inputs.input([toolDraw, toolPen, toolTransform, toolVertex, toolMove, toolMarquee, toolStructure])
)};
const _sl123v = (G, _) => G.input(_);

// ---- svgLens: wiring only ------------------------------------------------------------------------
const _sl114 = function _svgLens(svgTarget,svgWriter,svgOverlay,svgFocus,svgTools,invert,applyPoint,ctmMat,insertElement,deleteElement,reorderElement,rebasePath,childrenLens,zTarget,attrVal,effectiveAttr,translateLens,nodeAt,setProperty,refsOf)
{
  // Set while re-rendering: the fresh node is a throwaway used to patch the live one, so svgLens must
  // not attach a second overlay and a second set of listeners to it.
  const guard = { rendering: false };

  return function svgLens(node, options = {}) {
    if (guard.rendering) return node;
    const grid = options.grid === undefined ? 0.5 : options.grid;
    const snap = (v) => (grid ? Math.round(v / grid) * grid : v);
    // Markup for a shape dropped on empty canvas. UX policy, not geometry, so it is overridable.
    const newShape = options.newShape || ((x, y) => {
      const r = options.newShapeSize === undefined ? 24 : options.newShapeSize;
      const pts = [[x - r, y + r], [x, y - r], [x + r, y + r]].map(([a, b]) => `${a},${b}`).join(" ");
      return `<polygon points="${pts}" fill="#5B7A5E"/>`;
    });

    const overlay = svgOverlay(node);
    const target = svgTarget(node, { marker: svgLens, isOwn: overlay.isOwn });
    const writer = svgWriter(node, target, { isOwn: overlay.isOwn, guard });
    const focus = svgFocus(overlay, target,
      () => node.dispatchEvent(new CustomEvent("lens-select", { detail: { paths: focus.paths, mode: focus.mode } })));
    node.style.touchAction = "none";

    // The active tool. A gesture means different things in different modes, so the tools that create
    // gate on it; everything else is unconditional and stays reachable in select mode. Held on the
    // node rather than in a cell so a toolbar is optional — the editor works without one.
    let tool = options.tool || "select";
    const setTool = (id) => {
      tool = id || "select";
      ctx.state.pen = null;                              // a half-drawn path ends when the tool changes
      ctx.state.draw = null;
      overlay.clear();
      focus.refresh();
      node.dispatchEvent(new CustomEvent("lens-tool", { detail: { tool } }));
    };

    const kidCount = (parent) => {
      const d = target.doc();
      if (d === null) return 0;
      try { return childrenLens(parent).get(d).length; } catch (e) { return 0; }
    };

    // Alignment guides, handed in screen coordinates and drawn in the root's user space — the tools
    // measure where the pointer is, the overlay draws where the drawing is.
    const guides = (lines) => {
      for (const n of [...overlay.el.querySelectorAll("line.guide")]) n.remove();
      if (!lines || !lines.length) return;
      const m = node.getScreenCTM();
      if (!m) return;
      const inv = m.inverse();
      const at = (x, y) => [inv.a * x + inv.c * y + inv.e, inv.b * x + inv.d * y + inv.f];
      overlay.alignTo(null);
      for (const g of lines) {
        const [x1, y1] = at(g.x1, g.y1), [x2, y2] = at(g.x2, g.y2);
        overlay.add("line", { class: "guide", x1, y1, x2, y2 });
      }
    };

    const ctx = {
      node, target, writer, focus, snap, overlay, setTool, guides, state: {},
      tool: () => tool,
      childCount: kidCount,
      addShape: (markup, at, parent) => node.addShape(markup, at, parent),
      options: { ...options, newShape },
      elems: target.elems,
      doc: target.doc,
      // What a tool may measure: the source token, or the rendered one where the source has holes.
      attr: (t, idx, name) => effectiveAttr(target.elems(), t, idx, name),
      localPoint: (el, e) => {
        const ctm = el.getScreenCTM();
        if (!ctm) return null;
        const [x, y] = applyPoint(invert(ctmMat(ctm)), e.clientX, e.clientY);
        return [snap(x), snap(y)];
      }
    };

    let active = null;
    node.addEventListener("pointerdown", (e) => {
      for (const t of svgTools) if (t.onPointerDown && t.onPointerDown(ctx, e)) { active = t; return; }
      active = null;
    });
    node.addEventListener("pointermove", (e) => {
      if (active) return void (active.onPointerMove && active.onPointerMove(ctx, e));
      for (const t of svgTools) if (t.onHover) t.onHover(ctx, e);   // between gestures: pen rubber band
    });
    const end = async (e) => {
      const t = active;
      active = null;
      if (t && t.onPointerUp) await t.onPointerUp(ctx, e);
    };
    node.addEventListener("pointerup", end);
    node.addEventListener("pointercancel", end);
    node.addEventListener("dblclick", async (e) => {
      e.preventDefault();
      for (const t of svgTools) if (t.onDblClick && await t.onDblClick(ctx, e)) return;
    });

    // The handles follow every put. A structural edit may move the selection's address, so the record
    // carries a rebase; refresh() drops the selection by itself if the path no longer resolves. The
    // writer knows nothing about selection — it just says what it did.
    node.addEventListener("lens-put", (e) => {
      if (e.detail.rebase) focus.rebase(e.detail.rebase);
      focus.refresh();
    });

    // The cell's value is the SVG text the source currently holds; cellSource() exposes the whole
    // definition so a projection cell can show what a gesture rewrote.
    Object.defineProperty(node, "value", { configurable: true, get: target.doc, set: () => {} });
    node.cellSource = () => target.cellSource() || "";
    // Structural editing, programmatically. Each returns the put record (or null off-cell) and tells
    // the writer how to carry an address across the edit, so a selection survives it.
    //
    // The index is clamped HERE, once, and the same value goes to the command and to the rebase. The
    // commands clamp out-of-range indices themselves, so passing the raw value to both would let them
    // disagree — and a rebase that disagrees with the edit silently drops the selection.
    node.addShape = (markup, at = null, parent = [0]) => {
      const n = kidCount(parent);
      const i = at === null ? n : Math.max(0, Math.min(n, at));
      return writer.runCommand("insertElement", (d) => insertElement(d, parent, i, markup), {
        rebase: (p) => rebasePath(p, { kind: "insert", parent, at: i })
      });
    };
    node.removeAt = (path) =>
      writer.runCommand("deleteElement", (d) => deleteElement(d, path), {
        rebase: (p) => rebasePath(p, { kind: "delete", path })
      });
    node.moveTo = (path, to) => {
      const t = Math.max(0, Math.min(kidCount(path.slice(0, -1)) - 1, to));
      return writer.runCommand("reorderElement", (d) => reorderElement(d, path, t), {
        rebase: (p) => rebasePath(p, { kind: "move", path, to: t })
      });
    };
    node.edit = (name, fn, opts) => writer.runCommand(name, fn, opts);
    // Z-order over the same reorder command. SVG paints in document order, so "front" is last.
    node.zOrder = (path, kind) =>
      node.moveTo(path, zTarget(kind, path[path.length - 1], kidCount(path.slice(0, -1))));
    // Delete a whole selection: deepest and last first, so an address is never invalidated by an
    // earlier deletion in the same batch.
    node.removeSelection = async () => {
      const order = focus.paths.slice().sort((a, b) => {
        for (let i = 0; i < Math.max(a.length, b.length); i++) {
          const d = (b[i] === undefined ? -1 : b[i]) - (a[i] === undefined ? -1 : a[i]);
          if (d) return d;
        }
        return 0;
      });
      const out = [];
      for (const p of order) out.push(await node.removeAt(p));
      return out;
    };
    // ---- history ---------------------------------------------------------------------------------
    // Undo here is just "put the previous source back", which the writer already knows how to do; the
    // entries are whole definitions, so a structural undo restores the exact prior bytes rather than
    // trying to invert a command. Refuses when the current source is not what this entry produced —
    // someone else (editor-5, another gesture) has written since, and clobbering that is worse than
    // declining. Bounded, because a drag is one entry but a session is many.
    const undoStack = [], redoStack = [];
    const limit = options.historyLimit === undefined ? 200 : options.historyLimit;
    let replaying = false;
    node.addEventListener("lens-put", (e) => {
      const s = e.detail.source;
      if (!s || replaying || e.detail.aborted) return;
      undoStack.push(s);
      if (undoStack.length > limit) undoStack.shift();
      redoStack.length = 0;                              // a new edit forks the future
    });
    const step = async (from, to, want, name) => {
      const entry = from[from.length - 1];
      if (!entry) return null;
      if (target.cellSource() !== entry[want]) return null;   // written since: refuse
      from.pop();
      to.push(entry);
      replaying = true;
      try {
        return await writer.applySource(want === "after" ? entry.before : entry.after,
          { target: name, attribute: "(history)", before: "", after: "", GetPut: true, PutGet: true, span: null });
      } finally { replaying = false; }
    };
    node.undo = () => step(undoStack, redoStack, "after", "undo");
    node.redo = () => step(redoStack, undoStack, "before", "redo");
    node.historyDepth = () => ({ undo: undoStack.length, redo: redoStack.length });

    node.selection = () => focus.path;
    node.selectionPaths = () => focus.paths;
    node.select = (paths, mode) => focus.setAll(paths, mode);

    // Keyboard nudge and typed values go through the very same lens a drag does — no second write
    // path, so the laws and the residue rules cover them without restating anything.
    node.nudge = async (dx, dy) => {
      const out = [];
      for (const i of focus.indices) {
        const t = target.doc();
        if (t === null) break;
        const text = effectiveAttr(target.elems(), t, i, "transform") || "";
        const T = translateLens.get(text);
        const r = (v) => Math.round(v * 1e6) / 1e6;      // nudging must not accumulate float dust
        out.push(await writer.commit(i, "transform", [r(T[0] + dx), r(T[1] + dy)], "", translateLens));
      }
      focus.refresh();
      return out;
    };
    // What is at this address: tag and attributes, read from the source rather than the DOM, so an
    // inspector shows the bytes the author has (readable `rotate(45)`, not a flattened matrix).
    node.describe = (path) => {
      const t = target.doc();
      if (t === null) return null;
      try {
        const n = nodeAt(t, path);
        return { tag: n.tag, index: n.index,
                 attrs: Object.keys(n.attrs).map((k) => [k, n.attrs[k].value]) };
      } catch (e) { return null; }
    };
    node.setAttr = (path, name, value) => {
      const t = target.doc();
      if (t === null) return null;
      return writer.commit(nodeAt(t, path).index, name, value, null);
    };
    // Set a paint property where it already lives: a `style="fill: …"` declaration wins over a `fill`
    // attribute, so writing the attribute would look like an edit and change nothing.
    node.setProperty = (path, prop, value) => {
      const t = target.doc();
      if (t === null) return null;
      const idx = nodeAt(t, path).index;
      const w = setProperty(t, idx, prop, value);
      return writer.commit(idx, w.name, w.value, null);
    };
    node.refs = (path) => {
      const t = target.doc();
      if (t === null) return [];
      try { return refsOf(t, path); } catch (e) { return []; }
    };
    node.setTool = setTool;
    Object.defineProperty(node, "tool", { configurable: true, get: () => tool });
    return node;
  };
};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  main.define("module @tomlarkworthy/tests", async () => runtime.module((await import("/@tomlarkworthy/tests.js?v=4")).default));
  main.define("module @tomlarkworthy/editable-md", async () => runtime.module((await import("/@tomlarkworthy/editable-md.js?v=4")).default));
  main.define("module @tomlarkworthy/runtime-sdk", async () => runtime.module((await import("/@tomlarkworthy/runtime-sdk.js?v=4")).default));
  main.define("module @tomlarkworthy/acorn-8-11-3", async () => runtime.module((await import("/@tomlarkworthy/acorn-8-11-3.js?v=4")).default));
  main.define("module @tomlarkworthy/exporter-3", async () => runtime.module((await import("/@tomlarkworthy/exporter-3.js?v=4")).default));

  // Display order (top→bottom): demo → log → tests dashboard → laws → lenses → harness → tests → manipulation.
  $def("sl01", "intro", ["md"], _sl01);
  $def("sl02b", "toolbar", ["htl","invalidation","viewof drawing"], _sl02b);
  $def("sl02", "viewof drawing", ["svgLens","svg"], _sl02);
  $def("sl03", "drawing", ["Generators","viewof drawing"], _sl03);
  // The inspector's height follows the selection, so it sits *below* the drawing: above it, every
  // change of selection would shift the picture under the pointer mid-gesture.
  $def("sl02c", "inspector", ["htl","invalidation","viewof drawing"], _sl02c);
  $def("sl06a", "factoryDoc", ["md"], _sl06a);
  $def("sl06b", "viewof shift", ["Inputs"], _sl06b);
  $def("sl06bv", "shift", ["Generators","viewof shift"], _sl06bv);
  $def("sl06c", "viewof spin", ["Inputs"], _sl06c);
  $def("sl06cv", "spin", ["Generators","viewof spin"], _sl06cv);
  $def("sl06", "viewof factory", ["svgLens","svg","shift","spin"], _sl06);
  $def("sl06v", "factory", ["Generators","viewof factory"], _sl06v);
  $def("sl04", "howToDrive", ["md"], _sl04);
  $def("sl08", "useIt", ["md"], _sl08);
  $def("sl08e", "sourceLastNote", ["md"], _sl08e);
  $def("sl140", "tex", [], _sl140);
  $def("sl141", "test_tex_subset", ["tex"], _sl141);
  $def("sl08d", "edits", ["Generators","viewof drawing","viewof factory","invalidation"], _sl08d);
  $def("sl08m", "viewof svgLensModule", ["thisModule"], _sl08m);
  $def("sl08mv", "svgLensModule", ["Generators","viewof svgLensModule"], _sl08mv);
  $def("sl08c", "keepYourEdits", ["htl","downloadAnchor","lookupVariable","svgLensModule","edits"], _sl08c);
  $def("sl05", "putTable", ["Generators","viewof drawing","Inputs","invalidation"], _sl05);
  $def("sl07", "cellSourceProjection", ["htl","putTable","viewof drawing"], _sl07);
  $def("sl09", "testsDashboard", ["tests"], _sl09);
  $def("sl10", "lawsDoc", ["md"], _sl10);

  $def("sl20", "coreHeader", ["md"], _sl20);
  $def("sl21", "lens", [], _sl21);
  $def("sl22", "compose", [], _sl22);
  $def("sl23", "isoToLens", ["lens"], _sl23);
  $def("sl24", "lensLaws", [], _sl24);
  $def("sl25", "isoLaws", [], _sl25);

  $def("sl30", "svgHeader", ["md"], _sl30);
  $def("sl31", "parseNumList", [], _sl31);
  $def("sl32", "parseViewBox", ["parseNumList"], _sl32);
  $def("sl33", "printViewBox", [], _sl33);
  $def("sl34", "rectEq", [], _sl34);
  $def("sl35", "viewBoxLens", ["lens","parseViewBox","rectEq","printViewBox"], _sl35);
  $def("sl36", "parsePoints", ["parseNumList"], _sl36);
  $def("sl37", "printPoints", [], _sl37);
  $def("sl38", "pointsEq", [], _sl38);
  $def("sl39", "pointsLens", ["lens","parsePoints","pointsEq","printPoints"], _sl39);
  $def("sl40", "IDENTITY", [], _sl40);
  $def("sl41", "matEq", [], _sl41);
  $def("sl42", "multiply", [], _sl42);
  $def("sl43", "applyPoint", [], _sl43);
  $def("sl44", "ctmMat", [], _sl44);
  $def("sl45", "opToMat", ["multiply"], _sl45);
  $def("sl46", "parseTransform", ["IDENTITY","multiply","opToMat","parseNumList"], _sl46);
  $def("sl47", "printTransform", [], _sl47);
  $def("sl48", "transformLens", ["lens","parseTransform","matEq","printTransform"], _sl48);
  $def("sl48b", "parseTransformOps", ["parseNumList"], _sl48b);
  $def("sl48c", "translateLens", ["lens","parseTransformOps"], _sl48c);
  $def("sl48d", "printOp", [], _sl48d);
  $def("sl48e", "opsLens", ["lens","parseTransformOps","printOp"], _sl48e);
  $def("sl48f", "opSlot", [], _sl48f);
  $def("sl48j", "holdFixed", ["parseTransform","applyPoint","printOp"], _sl48j);
  $def("sl48k", "setGizmoOp", ["opSlot","opToMat","multiply","applyPoint","IDENTITY"], _sl48k);
  $def("sl48h", "rotateAbout", ["setGizmoOp","holdFixed"], _sl48h);
  $def("sl48i", "scaleAbout", ["setGizmoOp","holdFixed"], _sl48i);
  $def("sl48g", "transformHandles", [], _sl48g);
  $def("sl49", "det", [], _sl49);
  $def("sl50", "invert", ["det"], _sl50);
  $def("sl51", "invertIso", ["invert"], _sl51);
  $def("sl52", "matApproxEq", [], _sl52);
  $def("sl53", "nodeEq", [], _sl53);
  $def("sl54", "attr", ["lens"], _sl54);
  $def("sl55", "requiredAttr", ["lens"], _sl55);
  $def("sl56", "child", ["lens"], _sl56);
  $def("sl57", "PATH_ARG_COUNT", [], _sl57);
  $def("sl58", "pathEq", [], _sl58);
  $def("sl59", "parsePath", ["parseNumList","PATH_ARG_COUNT"], _sl59);
  $def("sl60", "printPath", [], _sl60);
  $def("sl61", "pathLens", ["lens","parsePath","pathEq","printPath"], _sl61);

  $def("sl70", "sourceHeader", ["md"], _sl70);
  $def("sl71", "literalSpan", ["acorn"], _sl71);
  $def("sl72", "literalSafe", ["holeSpans"], _sl72);
  $def("sl73", "literalLens", ["lens","literalSpan","literalSafe"], _sl73);
  $def("sl74a", "scan", [], _sl74a);
  $def("sl74e", "outsideDomain", ["scan"], _sl74e);
  $def("sl74", "tokenize", ["scan","outsideDomain"], _sl74);
  $def("sl74b", "parseDoc", ["scan","outsideDomain"], _sl74b);
  $def("sl74c", "nodeAt", ["parseDoc"], _sl74c);
  $def("sl74d", "pathOfIndex", ["parseDoc"], _sl74d);
  $def("sl75", "attrVal", ["tokenize"], _sl75);
  $def("sl75a", "effectiveAttr", ["attrVal", "holeSpans"], _sl75a);
  $def("sl76", "spliceAttr", ["tokenize"], _sl76);
  $def("sl77", "attrTextLens", ["lens","attrVal","spliceAttr"], _sl77);
  $def("sl74f", "pathOfId", ["parseDoc"], _sl74f);
  $def("sl74g", "refsOf", ["parseDoc","nodeAt","pathOfId"], _sl74g);
  $def("sl31b", "parseLength", [], _sl31b);
  $def("sl31c", "printLength", [], _sl31c);
  $def("sl31d", "lengthLens", ["lens","parseLength","printLength"], _sl31d);
  $def("sl31e", "parseStyle", [], _sl31e);
  $def("sl31f", "printStyle", [], _sl31f);
  $def("sl31g", "styleLens", ["lens","parseStyle","printStyle"], _sl31g);
  $def("sl31h", "setProperty", ["attrVal","styleLens"], _sl31h);
  $def("sl78", "cellAttrLens", ["compose","literalLens","attrTextLens"], _sl78);
  $def("sl79", "childrenLens", ["lens","nodeAt","parseDoc"], _sl79);
  $def("sl79a", "insertElement", ["childrenLens"], _sl79a);
  $def("sl79b", "deleteElement", ["childrenLens"], _sl79b);
  $def("sl79c", "reorderElement", ["childrenLens"], _sl79c);
  $def("sl79d", "insertPoint", ["nodeAt","attrTextLens","parsePoints","printPoints"], _sl79d);
  $def("sl79e", "deletePoint", ["nodeAt","attrTextLens","parsePoints","printPoints"], _sl79e);
  $def("sl79f", "nearestSegment", [], _sl79f);
  $def("sl79g", "rebasePath", [], _sl79g);
  $def("sl79h", "pathSegments", ["PATH_ARG_COUNT"], _sl79h);
  $def("sl79i", "pointOnSegment", [], _sl79i);
  $def("sl79j", "replaceGroup", ["PATH_ARG_COUNT"], _sl79j);
  $def("sl79k", "absoluteGroup", ["replaceGroup"], _sl79k);
  $def("sl79l", "splitPathSegment", ["pathSegments","replaceGroup","absoluteGroup"], _sl79l);
  $def("sl79m", "deletePathAnchor", ["pathSegments","replaceGroup","absoluteGroup"], _sl79m);
  $def("sl79n", "nearestPathSegment", ["pointOnSegment"], _sl79n);
  $def("sl79o", "insertPathPoint", ["nodeAt","attrTextLens","parsePath","printPath","splitPathSegment"], _sl79o);
  $def("sl79p", "deletePathPoint", ["nodeAt","attrTextLens","parsePath","printPath","deletePathAnchor"], _sl79p);

  $def("sl80", "harnessHeader", ["md"], _sl80);
  $def("sl81", "NUM_RUNS", [], _sl81);
  $def("sl82", "mulberry32", [], _sl82);
  $def("sl83", "arb", ["det"], _sl83);
  $def("sl84", "forAll", [], _sl84);
  $def("sl85", "checkLens", ["forAll","lensLaws"], _sl85);

  $def("sl90", "testsHeader", ["md"], _sl90);
  $def("sl91", "test_viewBoxLens_laws", ["checkLens","viewBoxLens","arb","mulberry32","NUM_RUNS","rectEq"], _sl91);
  $def("sl92", "test_pointsLens_laws", ["checkLens","pointsLens","arb","mulberry32","NUM_RUNS","pointsEq"], _sl92);
  $def("sl93", "test_transformLens_laws", ["checkLens","transformLens","arb","mulberry32","NUM_RUNS","matEq"], _sl93);
  $def("sl94", "test_pathLens_laws", ["checkLens","pathLens","arb","mulberry32","NUM_RUNS","pathEq"], _sl94);
  $def("sl95", "test_attr_laws", ["checkLens","attr","arb","mulberry32","NUM_RUNS","nodeEq"], _sl95);
  $def("sl96", "test_child_laws", ["forAll","child","arb","mulberry32","NUM_RUNS","nodeEq","lensLaws"], _sl96);
  $def("sl97", "test_compose_nodeViewBox_laws", ["checkLens","compose","requiredAttr","viewBoxLens","arb","mulberry32","NUM_RUNS","nodeEq","rectEq"], _sl97);
  $def("sl98", "test_invert_involution", ["forAll","arb","mulberry32","NUM_RUNS","invertIso","isoLaws","matApproxEq","multiply","IDENTITY"], _sl98);
  $def("sl99", "test_exact_roundtrips", ["forAll","arb","mulberry32","NUM_RUNS","parseTransform","printTransform","matEq","parsePath","printPath","pathEq","viewBoxLens","printViewBox","rectEq"], _sl99);
  $def("sl100", "test_putput_skip_rule_corner", ["arb","mulberry32","NUM_RUNS","viewBoxLens","transformLens","rectEq","matEq","parseTransform"], _sl100);
  $def("sl101", "test_applyPoint_screen_roundtrip", ["forAll","arb","mulberry32","NUM_RUNS","applyPoint","invert","multiply","IDENTITY","matApproxEq"], _sl101);
  $def("sl101b", "test_translateLens_laws", ["checkLens","translateLens","arb","mulberry32","NUM_RUNS","forAll","transformLens","matEq"], _sl101b);
  $def("sl102", "test_literalLens_laws", ["checkLens","literalLens","arb","mulberry32","NUM_RUNS"], _sl102);
  $def("sl103", "test_attrTextLens_laws", ["checkLens","attrTextLens","arb","mulberry32","NUM_RUNS"], _sl103);
  $def("sl104", "test_cellSourceLens_laws", ["checkLens","compose","cellAttrLens","transformLens","arb","mulberry32","NUM_RUNS","matEq"], _sl104);
  $def("sl105", "test_source_residue_preserved", ["forAll","arb","mulberry32","NUM_RUNS","literalLens","cellAttrLens","literalSpan"], _sl105);
  $def("sl106", "test_childrenLens_laws", ["forAll","lensLaws","childrenLens","arb","mulberry32","NUM_RUNS"], _sl106);
  $def("sl107", "test_structural_commands", ["forAll","arb","mulberry32","NUM_RUNS","childrenLens","insertElement","deleteElement","reorderElement"], _sl107);
  $def("sl108", "test_point_commands", ["forAll","arb","mulberry32","NUM_RUNS","insertPoint","deletePoint","nodeAt","attrVal","parsePoints"], _sl108);
  $def("sl108b", "test_nearestSegment", ["nearestSegment"], _sl108b);
  $def("sl108e", "test_opsLens_laws", ["forAll","lensLaws","opsLens","arb","mulberry32","NUM_RUNS","printOp"], _sl108e);
  $def("sl108f", "test_transform_gizmo", ["forAll","arb","mulberry32","NUM_RUNS","rotateAbout","scaleAbout","printOp","parseTransform","applyPoint"], _sl108f);
  $def("sl125t", "test_shape_creation", ["forAll","arb","mulberry32","NUM_RUNS","dragBox","shapeSpec","shapeMarkup","insertElement","childrenLens","attrVal","nodeAt"], _sl125t);
  $def("sl74t", "test_domain_boundary", ["outsideDomain","parseDoc","tokenize","childrenLens"], _sl74t);
  $def("sl31t", "test_units_and_style", ["forAll","arb","mulberry32","NUM_RUNS","lengthLens","parseLength","printLength","styleLens","parseStyle","setProperty"], _sl31t);
  $def("sl71t", "test_interpolation_slots", ["holeSpans","slotsOf","mergeInterpolated","literalSpan","literalLens"], _sl71t);
  $def("sl74u", "test_refs", ["refsOf","pathOfId"], _sl74u);
  $def("sl127t", "test_snapRects", ["forAll","arb","mulberry32","NUM_RUNS","snapRects"], _sl127t);
  $def("sl119u", "test_topmost_selection", ["topmostPaths"], _sl119u);
  $def("sl119t", "test_z_order", ["forAll","arb","mulberry32","NUM_RUNS","zTarget","reorderElement","childrenLens"], _sl119t);
  $def("sl126t", "test_pen_path", ["penPath","parsePath","printPath"], _sl126t);
  $def("sl108d", "test_path_subdivision_exact", ["forAll","arb","mulberry32","NUM_RUNS","parsePath","printPath","pathSegments","pointOnSegment","splitPathSegment","deletePathAnchor"], _sl108d);
  $def("sl108c", "test_rebasePath", ["forAll","arb","mulberry32","NUM_RUNS","rebasePath","nodeAt","childrenLens","insertElement","deleteElement","reorderElement"], _sl108c);
  $def("sl109b", "test_parse_vs_DOMParser", ["parseDoc","outsideDomain","attrVal","tokenize"], _sl109b);
  $def("sl109", "test_morph_projection", ["morph"], _sl109);

  $def("sl110", "manipulationHeader", ["md"], _sl110);
  $def("sl111", "pointsHandles", ["parsePoints","attrVal"], _sl111);
  $def("sl112", "pathHandles", ["parsePath","attrVal","PATH_ARG_COUNT"], _sl112);
  $def("sl113", "handleEdit", ["pointsHandles","parsePoints","attrVal","printPoints","pathHandles","parsePath","printPath"], _sl113);
  $def("sl115", "morph", [], _sl115);
  $def("sl116", "svgTarget", ["runtime","literalSpan"], _sl116);
  $def("sl71b", "holeSpans", [], _sl71b);
  $def("sl71c", "slotsOf", ["holeSpans"], _sl71c);
  $def("sl71d", "mergeInterpolated", ["slotsOf"], _sl71d);
  $def("sl117", "svgWriter", ["runtime","realize","morph","literalLens","cellAttrLens","compose","attrVal","literalSpan","holeSpans","slotsOf","mergeInterpolated"], _sl117);
  $def("sl118", "svgOverlay", [], _sl118);
  $def("sl119a", "boxInRoot", [], _sl119a);
  $def("sl119c", "topmostPaths", [], _sl119c);
  $def("sl119b", "zTarget", [], _sl119b);
  $def("sl119", "svgFocus", ["pointsHandles","pathHandles","transformHandles","nodeAt","boxInRoot","topmostPaths","attrVal","holeSpans"], _sl119);
  $def("sl124c", "grabPointer", [], _sl124c);
  $def("sl120", "toolVertex", ["handleEdit","grabPointer"], _sl120);
  $def("sl121a", "hitTest", [], _sl121a);
  $def("sl127", "snapRects", [], _sl127);
  $def("sl121", "toolMove", ["translateLens","attrVal","invert","ctmMat","parsePoints","parsePath","pathOfIndex","grabPointer","hitTest","snapRects"], _sl121);
  $def("sl121b", "toolMarquee", ["boxInRoot","pathOfIndex","grabPointer","dragBox"], _sl121b);
  $def("sl122", "toolStructure", ["insertElement","insertPoint","deletePoint","nearestSegment","pointsHandles","parsePoints","attrVal","childrenLens","rebasePath","pathHandles","parsePath","pathSegments","nearestPathSegment","insertPathPoint","deletePathPoint"], _sl122);
  $def("sl124", "toolTransform", ["opsLens","rotateAbout","scaleAbout","printOp","attrVal","grabPointer"], _sl124);
  $def("sl125a", "dragBox", [], _sl125a);
  $def("sl125b", "shapeSpec", ["dragBox"], _sl125b);
  $def("sl125c", "shapeMarkup", ["shapeSpec"], _sl125c);
  $def("sl125d", "penPath", [], _sl125d);
  $def("sl125", "toolDraw", ["shapeSpec","shapeMarkup","dragBox","grabPointer"], _sl125);
  $def("sl126", "toolPen", ["penPath","attrVal","nodeAt","grabPointer"], _sl126);
  $def("sl123", "viewof svgTools", ["Inputs","toolDraw","toolPen","toolTransform","toolVertex","toolMove","toolMarquee","toolStructure"], _sl123);
  $def("sl123v", "svgTools", ["Generators","viewof svgTools"], _sl123v);
  $def("sl114", "svgLens", ["svgTarget","svgWriter","svgOverlay","svgFocus","svgTools","invert","applyPoint","ctmMat","insertElement","deleteElement","reorderElement","rebasePath","childrenLens","zTarget","attrVal","effectiveAttr","translateLens","nodeAt","setProperty","refsOf"], _sl114);

  main.define("tests", ["module @tomlarkworthy/tests", "@variable"], (_, v) => v.import("tests", _));
  // Prose is click-to-edit, as in @tomlarkworthy/lopecode-live-2026.
  main.define("md", ["module @tomlarkworthy/editable-md", "@variable"], (_, v) => v.import("md", _));
  main.define("runtime", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("runtime", _));
  main.define("realize", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("realize", _));
  main.define("acorn", ["module @tomlarkworthy/acorn-8-11-3", "@variable"], (_, v) => v.import("acorn", _));
  main.define("thisModule", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("thisModule", _));
  main.define("lookupVariable", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("lookupVariable", _));
  // The download link: exporter-3 projects this live runtime back into a file (see `sourceLastNote`).
  main.define("downloadAnchor", ["module @tomlarkworthy/exporter-3", "@variable"], (_, v) => v.import("downloadAnchor", _));
  return main;
}
