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

const _sl04 = function _howToDrive(md){return(
md`**Drag a shape** to move it — the \`transform\` lens. **Tap a polygon or path**, then drag a handle —
the \`points\` and path \`d\` lenses. **Double-click** an edge of the tapped polygon to add a vertex, a
vertex to remove it, or empty canvas to drop in a new shape. Handles are live DOM only; they are
never written to the source.

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
    if (lit.quasis.length !== 1) throw new Error("template literal has interpolations — outside the domain");
    return [lit.start + 1, lit.end - 1];
  };
};

// Text that cannot survive being written back into a template literal.
const _sl72 = function _literalSafe(){return(
(t) => !/[`\\]/.test(t) && !t.includes("${")
)};

// Lens<cell definition source, template literal contents>.
const _sl73 = function _literalLens(lens,literalSpan,literalSafe){return(
(alias) => lens(
  (s) => { const [a, b] = literalSpan(s, alias); return s.slice(a, b); },
  (t, s) => {
    const [a, b] = literalSpan(s, alias);
    if (t === s.slice(a, b)) return s;
    if (!literalSafe(t)) throw new Error("text would not survive the template literal");
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
const _sl74 = function _tokenize(scan){return(
(src) => scan(src).filter((t) => t.kind === "open")
)};

// The same tokens nested into a tree with spans. `innerStart`/`innerEnd` bound the children region,
// which is what a structural edit splices; `index` is the flat document-order index, so a path and
// an index address the same element.
const _sl74b = function _parseDoc(scan){return(
(src) => {
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
    const fresh = gaps[0] || (/^\s*/.exec(tail)[0] || "\n");     // what a newly inserted child gets
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
put if it changed underneath, because \`editor-5\` may have rewritten the cell mid-gesture.`
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

const _sl114 = function _svgLens(runtime,realize,literalSpan,literalLens,cellAttrLens,compose,translateLens,attrVal,invert,applyPoint,ctmMat,parsePoints,parsePath,pointsHandles,pathHandles,handleEdit,morph,pathOfIndex,insertElement,deleteElement,reorderElement,insertPoint,deletePoint,nearestSegment)
{
  // Set while re-rendering: the fresh node is a throwaway used to patch the live one, so svgLens
  // must not attach a second overlay and a second set of listeners to it.
  let rendering = false;

  return function svgLens(node, options = {}) {
    if (rendering) return node;
    const NS = "http://www.w3.org/2000/svg";
    const grid = options.grid === undefined ? 0.5 : options.grid;
    const snap = (v) => (grid ? Math.round(v / grid) * grid : v);

    // Handles live in the DOM only. They are never written back: a put only ever splices the byte
    // span of one attribute of one source element.
    const overlay = document.createElementNS(NS, "g");
    overlay.setAttribute("data-svg-lens-overlay", "");
    node.appendChild(overlay);
    const style = document.createElementNS(NS, "style");
    style.textContent = `
      [data-svg-lens-overlay] .anchor{fill:#fff;stroke:#2F6BFF;stroke-width:2;cursor:grab}
      [data-svg-lens-overlay] .ctrl{fill:#EDF1E8;stroke:#8A63D2;stroke-width:1.5;cursor:grab}
      [data-svg-lens-overlay] .hit{fill:transparent;stroke:none;cursor:grab}
      [data-svg-lens-overlay] .link{stroke:#8A63D2;stroke-dasharray:3 3;stroke-width:1;fill:none;opacity:.7}`;
    overlay.appendChild(style);
    node.style.touchAction = "none";

    // Source elements in document order — the overlay is excluded, so indices match tokenize().
    const elems = () => [node, ...node.querySelectorAll("*")]
      .filter((e) => e.namespaceURI === NS && !(e.closest && e.closest("[data-svg-lens-overlay]")));

    let self = null, alias = "svgLens";
    const resolve = () => {
      if (self && self._value === node) return self;
      self = [...runtime._variables].find((v) => v._value === node) || null;
      if (!self) return null;
      const i = self._inputs.findIndex((inp) => inp && inp._value === svgLens);
      const params = /^[^(]*\(([^)]*)\)/.exec(self._definition.toString());
      const names = params ? params[1].split(",").map((s) => s.trim()) : [];
      alias = (i >= 0 && names[i]) || "svgLens";
      return self;
    };
    const cellSrc = () => (resolve() ? self._definition.toString() : null);
    const svgText = () => { const s = cellSrc(); if (s === null) return null; const [a, b] = literalSpan(s, alias); return s.slice(a, b); };

    const isOverlay = (n) => n === overlay;

    // THE WRITER. The one place that touches `_definition`, and the one place the DOM is brought
    // back in line with the source. Source is truth; the live node is a projection of it, patched.
    //
    // Rendering evaluates the new definition with the variable's current inputs — it does not parse
    // the SVG text — so an interpolated template renders the same way a static one does. Recomputing
    // the cell instead would mint a new node and break the value's identity.
    async function applySource(next, record) {
      const before = self._definition;
      const [fn] = await realize([next], runtime);
      if (self._definition !== before) {                 // editor-5 (or another gesture) got there first
        record.aborted = "definition changed under the gesture";
        node.dispatchEvent(new CustomEvent("lens-put", { detail: record }));
        return record;
      }
      let fresh;
      rendering = true;
      try { fresh = await fn.apply(null, self._inputs.map((i) => i._value)); }
      finally { rendering = false; }
      self._definition = fn;                             // silent swap, as in @tomlarkworthy/sticky
      morph(node, fresh, isOverlay);
      node.style.touchAction = "none";                   // morph syncs attributes, including style
      node.lastPut = record;
      node.dispatchEvent(new CustomEvent("lens-put", { detail: record }));
      node.dispatchEvent(new Event("input", { bubbles: true }));
      return record;
    }

    // A structural edit: a pure command rewrites the SVG document text, `literalLens` carries it back
    // into the cell definition, and the writer renders it.
    async function runCommand(name, fn, { keepFocus = false } = {}) {
      const s = cellSrc();
      if (s === null) return null;
      const L = literalLens(alias);
      const next = L.put(fn(L.get(s)), s);
      const record = { target: name, attribute: "(structure)", before: "", after: "",
                       GetPut: L.put(L.get(next), next) === next, PutGet: true, span: null };
      if (next === s) { node.lastPut = record; return record; }
      const out = await applySource(next, record);
      if (keepFocus) buildHandles();                     // same elements, new geometry
      else clearFocus();                                 // addresses shift under a structural edit
      return out;
    }

    // One gesture, one put, through the composed lens. `inner` refines the attribute string into
    // the view the gesture actually manipulates (a translate pair; the string itself otherwise).
    async function commit(idx, name, value, dflt, inner) {
      const s = cellSrc();
      if (s === null) return null;                       // not (yet) a cell value; nothing to write to
      const base = cellAttrLens(alias, idx, name, dflt);
      const l = inner ? compose(base, inner) : base;
      const before = l.get(s);
      const next = l.put(value, s);
      const same = (a, b) => (Array.isArray(a) ? Array.isArray(b) && a.length === b.length && a.every((v, i) => v === b[i]) : a === b);
      const record = {
        target: elems()[idx].localName + "[" + idx + "]", attribute: name,
        before: String(before), after: String(l.get(next)),
        // the laws, re-checked on the source this gesture just produced
        GetPut: l.put(l.get(next), next) === next,
        PutGet: same(l.get(next), value),
        span: null
      };
      if (next === s) {
        // skip rule: the view is unchanged, so the source keeps its residue — make the DOM agree
        const v = attrVal(svgText(), idx, name);
        const el = elems()[idx];
        if (v === null) el.removeAttribute(name); else el.setAttribute(name, v);
        node.lastPut = record;
        node.dispatchEvent(new CustomEvent("lens-put", { detail: record }));
        node.dispatchEvent(new Event("input", { bubbles: true }));
        return record;
      }
      const [a, b] = literalSpan(next, alias);
      const tok = attrVal(next.slice(a, b), idx, name);
      if (tok !== null) {                                // highlight the attribute we just wrote
        const at = next.indexOf(name + '="' + tok + '"', a);
        record.span = at === -1 ? null : [at, at + (name + '="' + tok + '"').length];
      }
      return applySource(next, record);
    }

    // ---- handle overlay -------------------------------------------------------------------
    let focusIdx = null, focusMode = null;
    const handleEls = new Map();
    const currentHandles = () => {
      if (focusIdx === null) return [];
      const t = svgText();
      if (t === null) return [];
      try { return focusMode === "points" ? pointsHandles(t, focusIdx) : pathHandles(t, focusIdx); }
      catch (e) { return []; }
    };
    // Handles are drawn in the focused element's own user space, so no screen-space maths is
    // needed to place them — the browser applies the same CTM it applies to the shape.
    function buildHandles() {
      [...overlay.querySelectorAll("circle,line")].forEach((n) => n.remove());
      handleEls.clear();
      if (focusIdx === null) return;
      const el = elems()[focusIdx];
      if (!el) return;
      overlay.setAttribute("transform", el.getAttribute("transform") || "");
      const r = 5 / Math.max(0.2, scaleOf(el));
      for (const h of currentHandles()) {
        if (!h.link) continue;
        const ln = document.createElementNS(NS, "line");
        ln.setAttribute("class", "link");
        ln.setAttribute("x1", h.x); ln.setAttribute("y1", h.y);
        ln.setAttribute("x2", h.link[0]); ln.setAttribute("y2", h.link[1]);
        overlay.appendChild(ln);
      }
      for (const h of currentHandles()) {
        const c = document.createElementNS(NS, "circle");
        c.setAttribute("class", h.kind === "anchor" ? "anchor" : "ctrl");
        c.setAttribute("r", h.kind === "anchor" ? r : r * 0.8);
        c.setAttribute("cx", h.x); c.setAttribute("cy", h.y);
        overlay.appendChild(c);
        const hit = document.createElementNS(NS, "circle");
        hit.setAttribute("class", "hit");
        hit.setAttribute("r", r * 2.6);
        hit.setAttribute("cx", h.x); hit.setAttribute("cy", h.y);
        hit.dataset.key = h.key;
        overlay.appendChild(hit);
        handleEls.set(h.key, [c, hit]);
      }
    }
    const scaleOf = (el) => {
      const m = el.getScreenCTM();
      return m ? Math.hypot(m.a, m.b) : 1;
    };
    const setFocus = (idx, mode) => { focusIdx = idx; focusMode = mode; buildHandles(); };
    const clearFocus = () => { focusIdx = null; focusMode = null; buildHandles(); };

    // ---- body drag: the transform lens ----------------------------------------------------
    let drag = null;
    node.addEventListener("pointerdown", (e) => {
      const key = e.target.dataset && e.target.dataset.key;
      if (key !== undefined && focusIdx !== null) {                      // a handle: points / d lens
        e.preventDefault();
        e.target.setPointerCapture(e.pointerId);
        drag = { kind: "handle", key, idx: focusIdx, mode: focusMode, started: false, x0: e.clientX, y0: e.clientY };
        return;
      }
      const target = e.target.closest && e.target.closest("*");
      const list = elems();
      const idx = list.indexOf(e.target);
      if (idx <= 0) { clearFocus(); return; }                            // 0 is the root <svg>
      const ps = e.target.parentNode.getScreenCTM();
      if (!ps) return;
      const t = svgText();
      if (t === null) return;
      const text = attrVal(t, idx, "transform") || "";
      drag = { kind: "body", idx, tag: e.target.localName, text,
               // screen delta → the element's parent space (linear part only: a drag is a translation)
               Slin: invert(ctmMat(ps)),
               T0: translateLens.get(text),
               x0: e.clientX, y0: e.clientY, started: false, el: e.target,
               thresh: e.pointerType === "mouse" ? 3 : 10 };
      node.setPointerCapture(e.pointerId);
    });

    node.addEventListener("pointermove", (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;
      if (!drag.started && Math.hypot(dx, dy) < (drag.thresh || 3)) return;
      drag.started = true;
      if (drag.kind === "body") {
        const S = drag.Slin;
        drag.T = [snap(drag.T0[0] + S[0] * dx + S[2] * dy), snap(drag.T0[1] + S[1] * dx + S[3] * dy)];
        drag.el.setAttribute("transform", translateLens.put(drag.T, drag.text));  // live only; source waits
        if (focusIdx === drag.idx) buildHandles();
      } else {
        const el = elems()[drag.idx];
        const ctm = el.getScreenCTM();
        if (!ctm) return;
        const [px, py] = applyPoint(invert(ctmMat(ctm)), e.clientX, e.clientY);
        const t = svgText();
        if (t === null) return;
        const edit = handleEdit(drag.mode, t, drag.idx, drag.key, snap(px), snap(py));
        if (!edit) return;
        drag.edit = edit;
        el.setAttribute(edit.name, edit.value);
        buildHandles();
      }
    });

    async function end(e) {
      if (!drag) return;
      const d = drag;
      drag = null;
      if (!d.started && e.type === "pointerup" && d.kind === "body") {   // a tap: focus for editing
        const t = svgText();
        const tryFocus = (mode, name, parse) => {
          const v = t === null ? null : attrVal(t, d.idx, name);
          if (v === null) return false;
          try { parse(v); } catch (err) { return false; }                // outside the lens domain
          setFocus(d.idx, mode);
          return true;
        };
        if ((d.tag === "polygon" || d.tag === "polyline") && tryFocus("points", "points", parsePoints)) return;
        if (d.tag === "path" && tryFocus("path", "d", parsePath)) return;
        clearFocus();
        return;
      }
      if (!d.started) return;
      if (d.kind === "body") await commit(d.idx, "transform", d.T, "", translateLens);
      else if (d.edit) await commit(d.idx, d.edit.name, d.edit.value, null);
      buildHandles();
    }
    node.addEventListener("pointerup", end);
    node.addEventListener("pointercancel", end);

    // ---- structural gestures ---------------------------------------------------------------
    // Everything here goes through a pure command; none of it touches the DOM directly.
    const localPoint = (el, e) => {
      const ctm = el.getScreenCTM();
      if (!ctm) return null;
      const [x, y] = applyPoint(invert(ctmMat(ctm)), e.clientX, e.clientY);
      return [snap(x), snap(y)];
    };
    // Markup for a shape dropped on empty canvas. Overridable — this is UX policy, not geometry.
    const newShape = options.newShape || ((x, y) => {
      const r = options.newShapeSize === undefined ? 24 : options.newShapeSize;
      const pts = [[x - r, y + r], [x, y - r], [x + r, y + r]].map(([a, b]) => `${a},${b}`).join(" ");
      return `<polygon points="${pts}" fill="#5B7A5E"/>`;
    });

    node.addEventListener("dblclick", async (e) => {
      const t = svgText();
      if (t === null) return;
      e.preventDefault();

      // a vertex: remove it
      const key = e.target.dataset && e.target.dataset.key;
      if (key !== undefined && focusIdx !== null && focusMode === "points") {
        const h = pointsHandles(t, focusIdx).find((x) => x.key === key);
        const idx = focusIdx;
        if (h) await runCommand("deletePoint", (d) => deletePoint(d, pathOfIndex(d, idx), h.i), { keepFocus: true });
        return;
      }

      // an edge of the focused polygon: add a vertex there
      const list = elems();
      const hit = list.indexOf(e.target);
      if (focusIdx !== null && focusMode === "points" && (hit === focusIdx || key !== undefined)) {
        const el = list[focusIdx];
        const p = localPoint(el, e);
        if (!p) return;
        const pts = parsePoints(attrVal(t, focusIdx, "points"));
        const closed = el.localName !== "polyline";
        const seg = nearestSegment(pts, p[0], p[1], closed);
        const idx = focusIdx;
        await runCommand("insertPoint", (d) => insertPoint(d, pathOfIndex(d, idx), seg.index, p), { keepFocus: true });
        return;
      }

      // empty canvas: add a shape
      if (hit <= 0) {
        const p = localPoint(node, e);
        if (!p) return;
        await runCommand("insertElement", (d) => insertElement(d, [0], null, newShape(p[0], p[1])));
      }
    });

    // The cell's value is the SVG text the source currently holds; cellSource() exposes the whole
    // definition so a projection cell can show what a gesture rewrote.
    Object.defineProperty(node, "value", {
      configurable: true,
      get: () => svgText(),
      set: () => {}
    });
    node.cellSource = () => cellSrc() || "";
    // Structural editing, programmatically. Each returns the put record (or null off-cell).
    node.addShape = (markup, at = null, parent = [0]) =>
      runCommand("insertElement", (d) => insertElement(d, parent, at, markup));
    node.removeAt = (path) => runCommand("deleteElement", (d) => deleteElement(d, path));
    node.moveTo = (path, to) => runCommand("reorderElement", (d) => reorderElement(d, path, to));
    node.edit = (name, fn, opts) => runCommand(name, fn, opts);
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

  // Display order (top→bottom): demo → log → tests dashboard → laws → lenses → harness → tests → manipulation.
  $def("sl01", "intro", ["md"], _sl01);
  $def("sl02", "viewof drawing", ["svgLens","svg"], _sl02);
  $def("sl03", "drawing", ["Generators","viewof drawing"], _sl03);
  $def("sl04", "howToDrive", ["md"], _sl04);
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
  $def("sl72", "literalSafe", [], _sl72);
  $def("sl73", "literalLens", ["lens","literalSpan","literalSafe"], _sl73);
  $def("sl74a", "scan", [], _sl74a);
  $def("sl74", "tokenize", ["scan"], _sl74);
  $def("sl74b", "parseDoc", ["scan"], _sl74b);
  $def("sl74c", "nodeAt", ["parseDoc"], _sl74c);
  $def("sl74d", "pathOfIndex", ["parseDoc"], _sl74d);
  $def("sl75", "attrVal", ["tokenize"], _sl75);
  $def("sl76", "spliceAttr", ["tokenize"], _sl76);
  $def("sl77", "attrTextLens", ["lens","attrVal","spliceAttr"], _sl77);
  $def("sl78", "cellAttrLens", ["compose","literalLens","attrTextLens"], _sl78);
  $def("sl79", "childrenLens", ["lens","nodeAt","parseDoc"], _sl79);
  $def("sl79a", "insertElement", ["childrenLens"], _sl79a);
  $def("sl79b", "deleteElement", ["childrenLens"], _sl79b);
  $def("sl79c", "reorderElement", ["childrenLens"], _sl79c);
  $def("sl79d", "insertPoint", ["nodeAt","attrTextLens","parsePoints","printPoints"], _sl79d);
  $def("sl79e", "deletePoint", ["nodeAt","attrTextLens","parsePoints","printPoints"], _sl79e);
  $def("sl79f", "nearestSegment", [], _sl79f);

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
  $def("sl109", "test_morph_projection", ["morph"], _sl109);

  $def("sl110", "manipulationHeader", ["md"], _sl110);
  $def("sl111", "pointsHandles", ["parsePoints","attrVal"], _sl111);
  $def("sl112", "pathHandles", ["parsePath","attrVal","PATH_ARG_COUNT"], _sl112);
  $def("sl113", "handleEdit", ["pointsHandles","parsePoints","attrVal","printPoints","pathHandles","parsePath","printPath"], _sl113);
  $def("sl115", "morph", [], _sl115);
  $def("sl114", "svgLens", ["runtime","realize","literalSpan","literalLens","cellAttrLens","compose","translateLens","attrVal","invert","applyPoint","ctmMat","parsePoints","parsePath","pointsHandles","pathHandles","handleEdit","morph","pathOfIndex","insertElement","deleteElement","reorderElement","insertPoint","deletePoint","nearestSegment"], _sl114);

  main.define("tests", ["module @tomlarkworthy/tests", "@variable"], (_, v) => v.import("tests", _));
  // Prose is click-to-edit, as in @tomlarkworthy/lopecode-live-2026.
  main.define("md", ["module @tomlarkworthy/editable-md", "@variable"], (_, v) => v.import("md", _));
  main.define("runtime", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("runtime", _));
  main.define("realize", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("realize", _));
  main.define("acorn", ["module @tomlarkworthy/acorn-8-11-3", "@variable"], (_, v) => v.import("acorn", _));
  return main;
}
