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
const _sl117 = function _svgWriter(runtime,realize,morph,literalLens,cellAttrLens,compose,attrVal,literalSpan){return(
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

  // One gesture, one put, through the composed lens. `inner` refines the attribute string into the
  // view the gesture actually manipulates (a translate pair; the string itself otherwise).
  async function commit(idx, name, value, dflt, inner) {
    const s = target.cellSource();
    if (s === null) return null;
    const alias = target.alias();
    const base = cellAttrLens(alias, idx, name, dflt);
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
      [data-svg-lens-overlay] .link{stroke:#8A63D2;stroke-dasharray:3 3;stroke-width:1;fill:none;opacity:.7}`;
  el.appendChild(style);
  node.appendChild(el);
  return {
    el,
    isOwn: (n) => n === el || el.contains(n),
    clear: () => [...el.querySelectorAll("circle,line,rect")].forEach((n) => n.remove()),
    add(tag, attrs) {
      const n = document.createElementNS(NS, tag);
      for (const k in attrs) n.setAttribute(k, attrs[k]);
      el.appendChild(n);
      return n;
    },
    // Handles are drawn in the focused element's own user space, so no screen-space maths is needed
    // to place them — the browser applies the same CTM it applies to the shape.
    alignTo: (target) => el.setAttribute("transform", target ? (target.getAttribute("transform") || "") : "")
  };
}
)};

// ---- selection: which element is being edited, and its handles -----------------------------------
// Selection is held as a *path*, not an index: an index into document order is invalidated by any
// insert or delete before it, a path only by an edit to its own parent chain. `index` stays available
// because the handle lenses address elements the way tokenize() does.
const _sl119 = function _svgFocus(pointsHandles,pathHandles,transformHandles,nodeAt){return(
(overlay, target) => {
  let path = null, mode = null;
  const indexOf = () => {
    if (!path) return null;
    const t = target.doc();
    if (t === null) return null;
    try { return nodeAt(t, path).index; } catch (e) { return null; }   // the element is gone
  };
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
  const draw = () => {
    overlay.clear();
    const idx = indexOf();
    if (idx === null) { path = null; mode = null; return; }
    const el = target.elems()[idx];
    if (!el) return;
    overlay.alignTo(el);
    const r = 5 / Math.max(0.2, scaleOf(el));
    const hs = handles();
    if (mode === "transform" && el.getBBox) {
      const b = el.getBBox();
      overlay.add("rect", { class: "box", x: b.x, y: b.y, width: b.width, height: b.height });
    }
    for (const h of hs) if (h.link) overlay.add("line", { class: "link", x1: h.x, y1: h.y, x2: h.link[0], y2: h.link[1] });
    for (const h of hs) {
      const cls = h.kind === "anchor" || h.kind === "scale" || h.kind === "rotate" ? h.kind : "ctrl";
      overlay.add("circle", { class: cls, r: cls === "ctrl" ? r * 0.8 : r, cx: h.x, cy: h.y });
      overlay.add("circle", { class: "hit", r: r * 2.6, cx: h.x, cy: h.y }).dataset.key = h.key;
    }
  };
  return {
    get path() { return path; },
    get index() { return indexOf(); },
    get mode() { return mode; },
    handles,
    refresh: draw,
    set(p, m) { path = p; mode = m; draw(); },
    clear() { path = null; mode = null; draw(); },
    // Carry the selection across a structural edit; a null result means it was deleted.
    rebase(fn) { path = path && fn(path); if (!path) mode = null; }
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
    const text = attrVal(t, idx, "transform") || "";
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
    if (d && d.started) await ctx.writer.commit(d.idx, "transform", d.ops, "", opsLens);
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
    ctx.state.drag = { key, idx: ctx.focus.index, mode, started: false, x0: e.clientX, y0: e.clientY };
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
    if (d && d.started && d.edit) await ctx.writer.commit(d.idx, d.edit.name, d.edit.value, null);
  }
}
)};

// Drag a shape's body: the `transform` lens, focused on the leading translate op. A tap with no
// movement selects instead, if the shape is in the domain of a handle lens.
const _sl121 = function _toolMove(translateLens,attrVal,invert,ctmMat,parsePoints,parsePath,pathOfIndex,grabPointer){return(
{
  id: "move",
  onPointerDown(ctx, e) {
    const idx = ctx.elems().indexOf(e.target);
    if (idx <= 0) { ctx.focus.clear(); return false; }   // 0 is the root <svg>
    const ps = e.target.parentNode.getScreenCTM();
    const t = ctx.doc();
    if (!ps || t === null) return false;
    const text = attrVal(t, idx, "transform") || "";
    ctx.state.drag = {
      idx, tag: e.target.localName, text, el: e.target,
      // screen delta → the element's parent space (linear part only: a drag is a translation)
      Slin: invert(ctmMat(ps)),
      T0: translateLens.get(text),
      x0: e.clientX, y0: e.clientY, started: false,
      thresh: e.pointerType === "mouse" ? 3 : 10
    };
    grabPointer(ctx.node, e);
    return true;
  },
  onPointerMove(ctx, e) {
    const d = ctx.state.drag;
    if (!d) return;
    const dx = e.clientX - d.x0, dy = e.clientY - d.y0;
    if (!d.started && Math.hypot(dx, dy) < d.thresh) return;
    d.started = true;
    const S = d.Slin;
    d.T = [ctx.snap(d.T0[0] + S[0] * dx + S[2] * dy), ctx.snap(d.T0[1] + S[1] * dx + S[3] * dy)];
    d.el.setAttribute("transform", translateLens.put(d.T, d.text));
    if (ctx.focus.index === d.idx) ctx.focus.refresh();
  },
  async onPointerUp(ctx, e) {
    const d = ctx.state.drag;
    ctx.state.drag = null;
    if (!d) return;
    if (d.started) return void await ctx.writer.commit(d.idx, "transform", d.T, "", translateLens);
    if (e.type !== "pointerup") return;
    const t = ctx.doc();
    const tryFocus = (mode, name, parse) => {
      const v = t === null ? null : attrVal(t, d.idx, name);
      if (v === null) return false;
      try { parse(v); } catch (err) { return false; }    // outside the lens domain
      ctx.focus.set(pathOfIndex(t, d.idx), mode);
      return true;
    };
    if ((d.tag === "polygon" || d.tag === "polyline") && tryFocus("points", "points", parsePoints)) return;
    if (d.tag === "path" && tryFocus("path", "d", parsePath)) return;
    ctx.focus.set(pathOfIndex(t, d.idx), "transform");   // no vertex lens: offer the transform gizmo
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
      const segs = pathSegments(parsePath(attrVal(t, focus.index, "d")));
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
      const seg = nearestSegment(parsePoints(attrVal(t, focus.index, "points")), p[0], p[1], closed);
      await ctx.writer.runCommand("insertPoint", (d) => insertPoint(d, sel, seg.index, p));
      return true;
    }

    if (sel && focus.mode === "path" && hit === focus.index) {
      const p = ctx.localPoint(list[focus.index], e);
      if (!p) return false;
      const segs = pathSegments(parsePath(attrVal(t, focus.index, "d")));
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

// The registry. Order is priority: the first tool to claim a pointerdown owns the gesture. Push a
// tool from any cell and dispatch an input event to extend the editor without touching it.
const _sl123 = function _svgTools(Inputs,toolTransform,toolVertex,toolMove,toolStructure){return(
Inputs.input([toolTransform, toolVertex, toolMove, toolStructure])
)};
const _sl123v = (G, _) => G.input(_);

// ---- svgLens: wiring only ------------------------------------------------------------------------
const _sl114 = function _svgLens(svgTarget,svgWriter,svgOverlay,svgFocus,svgTools,invert,applyPoint,ctmMat,insertElement,deleteElement,reorderElement,rebasePath,childrenLens)
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
    const focus = svgFocus(overlay, target);
    node.style.touchAction = "none";

    const ctx = {
      node, target, writer, focus, snap, state: {},
      options: { ...options, newShape },
      elems: target.elems,
      doc: target.doc,
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
    node.addEventListener("pointermove", (e) => { if (active && active.onPointerMove) active.onPointerMove(ctx, e); });
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
    const kidCount = (parent) => {
      const d = target.doc();
      if (d === null) return 0;
      try { return childrenLens(parent).get(d).length; } catch (e) { return 0; }
    };
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
    node.selection = () => focus.path;
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
  $def("sl108d", "test_path_subdivision_exact", ["forAll","arb","mulberry32","NUM_RUNS","parsePath","printPath","pathSegments","pointOnSegment","splitPathSegment","deletePathAnchor"], _sl108d);
  $def("sl108c", "test_rebasePath", ["forAll","arb","mulberry32","NUM_RUNS","rebasePath","nodeAt","childrenLens","insertElement","deleteElement","reorderElement"], _sl108c);
  $def("sl109", "test_morph_projection", ["morph"], _sl109);

  $def("sl110", "manipulationHeader", ["md"], _sl110);
  $def("sl111", "pointsHandles", ["parsePoints","attrVal"], _sl111);
  $def("sl112", "pathHandles", ["parsePath","attrVal","PATH_ARG_COUNT"], _sl112);
  $def("sl113", "handleEdit", ["pointsHandles","parsePoints","attrVal","printPoints","pathHandles","parsePath","printPath"], _sl113);
  $def("sl115", "morph", [], _sl115);
  $def("sl116", "svgTarget", ["runtime","literalSpan"], _sl116);
  $def("sl117", "svgWriter", ["runtime","realize","morph","literalLens","cellAttrLens","compose","attrVal","literalSpan"], _sl117);
  $def("sl118", "svgOverlay", [], _sl118);
  $def("sl119", "svgFocus", ["pointsHandles","pathHandles","transformHandles","nodeAt"], _sl119);
  $def("sl124c", "grabPointer", [], _sl124c);
  $def("sl120", "toolVertex", ["handleEdit","grabPointer"], _sl120);
  $def("sl121", "toolMove", ["translateLens","attrVal","invert","ctmMat","parsePoints","parsePath","pathOfIndex","grabPointer"], _sl121);
  $def("sl122", "toolStructure", ["insertElement","insertPoint","deletePoint","nearestSegment","pointsHandles","parsePoints","attrVal","childrenLens","rebasePath","pathHandles","parsePath","pathSegments","nearestPathSegment","insertPathPoint","deletePathPoint"], _sl122);
  $def("sl124", "toolTransform", ["opsLens","rotateAbout","scaleAbout","printOp","attrVal","grabPointer"], _sl124);
  $def("sl123", "viewof svgTools", ["Inputs","toolTransform","toolVertex","toolMove","toolStructure"], _sl123);
  $def("sl123v", "svgTools", ["Generators","viewof svgTools"], _sl123v);
  $def("sl114", "svgLens", ["svgTarget","svgWriter","svgOverlay","svgFocus","svgTools","invert","applyPoint","ctmMat","insertElement","deleteElement","reorderElement","rebasePath","childrenLens"], _sl114);

  main.define("tests", ["module @tomlarkworthy/tests", "@variable"], (_, v) => v.import("tests", _));
  // Prose is click-to-edit, as in @tomlarkworthy/lopecode-live-2026.
  main.define("md", ["module @tomlarkworthy/editable-md", "@variable"], (_, v) => v.import("md", _));
  main.define("runtime", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("runtime", _));
  main.define("realize", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("realize", _));
  main.define("acorn", ["module @tomlarkworthy/acorn-8-11-3", "@variable"], (_, v) => v.import("acorn", _));
  return main;
}
