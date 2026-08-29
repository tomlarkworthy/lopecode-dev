/**
 * Property-based proofs of the lens laws (GetPut, PutGet, PutPut) for every
 * lens in src/svg.ts, including a composed lens, plus the involution law for
 * matrix inversion. Run with: npm test
 */

import fc from "fast-check";
import { compose, laws, isoLaws, Lens, Eq } from "../src/lens.js";
import {
  Rect, rectEq, viewBoxLens, printViewBox,
  Point, pointsEq, pointsLens,
  Mat, matEq, matApproxEq, transformLens, parseTransform, printTransform,
  invertIso, det, multiply, IDENTITY,
  SvgNode, nodeEq, attr, requiredAttr, child,
  PathCmd, pathEq, pathLens, parsePath, printPath,
} from "../src/svg.js";

const NUM_RUNS = 1000;
let failures = 0;

function check(name: string, prop: fc.IPropertyWithHooks<any>): void {
  const result = fc.check(prop, { numRuns: NUM_RUNS });
  if (result.failed) {
    failures++;
    console.error(`  ✗ ${name}`);
    console.error(`    counterexample: ${JSON.stringify(result.counterexample)}`);
  } else {
    console.log(`  ✓ ${name}  (${NUM_RUNS} runs)`);
  }
}

/** Check all three laws of a very well-behaved lens. */
function checkLens<S, A>(
  name: string,
  l: Lens<S, A>,
  arbS: fc.Arbitrary<S>,
  arbA: fc.Arbitrary<A>,
  eqS: Eq<S>,
  eqA: Eq<A>,
): void {
  console.log(name);
  check("GetPut: put(get(s), s) = s", fc.property(arbS, laws.getPut(l, eqS)));
  check("PutGet: get(put(a, s)) = a", fc.property(arbA, arbS, laws.putGet(l, eqA)));
  check("PutPut: put(a2, put(a1, s)) = put(a2, s)",
    fc.property(arbA, arbA, arbS, laws.putPut(l, eqS)));
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

// Any finite double: printing/parsing must round-trip exactly across the
// entire double range, including subnormals like 5e-324.
const anyFinite = fc.double({ noNaN: true, noDefaultInfinity: true });

// Bounded doubles for values that get multiplied together (no overflow-to-NaN).
const bounded = fc.double({ min: -1e6, max: 1e6, noNaN: true });

const sep = fc.constantFrom(" ", ",", ", ", "  ", " , ", "\t");

const arbRect: fc.Arbitrary<Rect> = fc.record({
  minX: anyFinite, minY: anyFinite, width: anyFinite, height: anyFinite,
});

// Messy-but-valid viewBox strings: random separators, optional padding.
const arbViewBoxStr: fc.Arbitrary<string> = fc
  .tuple(arbRect, sep, sep, sep, fc.constantFrom("", " ", "  "), fc.constantFrom("", " "))
  .map(([r, s1, s2, s3, pre, post]) =>
    `${pre}${r.minX}${s1}${r.minY}${s2}${r.width}${s3}${r.height}${post}`);

const arbPoint: fc.Arbitrary<Point> = fc.tuple(anyFinite, anyFinite);
const arbPoints: fc.Arbitrary<Point[]> = fc.array(arbPoint, { maxLength: 8 });

const arbPointsStr: fc.Arbitrary<string> = fc
  .tuple(arbPoints, sep)
  .map(([ps, s]) => ps.map(([x, y]) => `${x}${s}${y}`).join(" "));

const angle = fc.double({ min: -720, max: 720, noNaN: true });

// One SVG transform op rendered as text, in all supported spellings.
const arbOpStr: fc.Arbitrary<string> = fc.oneof(
  fc.tuple(bounded, fc.option(bounded, { nil: undefined }), sep)
    .map(([x, y, s]) => `translate(${x}${y === undefined ? "" : s + y})`),
  fc.tuple(bounded, fc.option(bounded, { nil: undefined }), sep)
    .map(([x, y, s]) => `scale(${x}${y === undefined ? "" : s + y})`),
  fc.tuple(angle, fc.option(fc.tuple(bounded, bounded), { nil: undefined }), sep)
    .map(([a, c, s]) => c === undefined ? `rotate(${a})` : `rotate(${a}${s}${c[0]}${s}${c[1]})`),
  angle.map((a) => `skewX(${a})`),
  angle.map((a) => `skewY(${a})`),
  fc.tuple(fc.array(bounded, { minLength: 6, maxLength: 6 }), sep)
    .map(([ns, s]) => `matrix(${ns.join(s)})`),
);

const arbTransformStr: fc.Arbitrary<string> = fc
  .tuple(fc.array(arbOpStr, { minLength: 0, maxLength: 4 }), sep)
  .map(([ops, s]) => ops.join(s));

const arbMat: fc.Arbitrary<Mat> = fc
  .array(bounded, { minLength: 6, maxLength: 6 })
  .map((ns) => ns as unknown as Mat);

// Well-conditioned invertible matrices for the inversion involution.
const arbInvertibleMat: fc.Arbitrary<Mat> = fc
  .array(fc.double({ min: -10, max: 10, noNaN: true }), { minLength: 6, maxLength: 6 })
  .map((ns) => ns as unknown as Mat)
  .filter((m) => Math.abs(det(m)) > 0.5);

// Path command arbitraries: correct arg counts, letters incl. relative case.
const PATH_LETTERS: Array<[string, number]> = [
  ["M",2],["m",2],["L",2],["l",2],["H",1],["h",1],["V",1],["v",1],
  ["C",6],["c",6],["S",4],["s",4],["Q",4],["q",4],["T",2],["t",2],["A",7],["a",7],
];
const arbPathCmd: fc.Arbitrary<PathCmd> = fc.oneof(
  ...PATH_LETTERS.map(([c, u]) =>
    fc.integer({ min: 1, max: 2 }).chain((reps) =>
      fc.array(anyFinite, { minLength: u * reps, maxLength: u * reps })
    ).map((a) => ({ c, a }))),
  fc.constantFrom<PathCmd>({ c: "Z", a: [] }, { c: "z", a: [] }),
);
const arbPathCmds: fc.Arbitrary<PathCmd[]> = fc.array(arbPathCmd, { maxLength: 6 });
const arbPathStr: fc.Arbitrary<string> = fc
  .tuple(arbPathCmds, sep, fc.constantFrom("", " ", ","))
  .map(([cmds, s, lead]) =>
    cmds.map(({ c, a }) => c + (a.length ? lead + a.map(String).join(s) : "")).join(s));

const attrName = fc.constantFrom("id", "fill", "stroke", "viewBox", "transform", "points", "d");
const attrValue = fc.string({ maxLength: 12 });

const nodeOfDepth = (depth: number): fc.Arbitrary<SvgNode> =>
  fc.record({
    tag: fc.constantFrom("svg", "g", "rect", "circle", "path", "polygon"),
    attrs: fc.dictionary(attrName, attrValue, { maxKeys: 4 }),
    children: depth <= 0
      ? fc.constant<SvgNode[]>([])
      : fc.array(nodeOfDepth(depth - 1), { maxLength: 3 }),
  });
const arbNode: fc.Arbitrary<SvgNode> = nodeOfDepth(3);

const arbNodeWithChild: fc.Arbitrary<[SvgNode, number]> = arbNode
  .filter((n) => n.children.length > 0)
  .chain((n) => fc.tuple(fc.constant(n), fc.nat({ max: n.children.length - 1 })));

// Nodes guaranteed to carry a parseable viewBox (domain of the composed lens).
const arbNodeWithViewBox: fc.Arbitrary<SvgNode> = fc
  .tuple(arbNode, arbViewBoxStr)
  .map(([n, vb]) => ({ ...n, attrs: { ...n.attrs, viewBox: vb } }));

// ---------------------------------------------------------------------------
// Law checks
// ---------------------------------------------------------------------------

const strEq: Eq<string> = (a, b) => a === b;
const nullableStrEq: Eq<string | null> = (a, b) => a === b;

checkLens("viewBoxLens : Lens<string, Rect>",
  viewBoxLens, arbViewBoxStr, arbRect, strEq, rectEq);

checkLens("pointsLens : Lens<string, Point[]>",
  pointsLens, arbPointsStr, arbPoints, strEq, pointsEq);

checkLens("transformLens : Lens<string, Mat>",
  transformLens, arbTransformStr, arbMat, strEq, matEq);

checkLens("pathLens : Lens<string, PathCmd[]>",
  pathLens, arbPathStr, arbPathCmds, strEq, pathEq);

checkLens("attr('fill') : Lens<SvgNode, string | null>",
  attr("fill"), arbNode, fc.option(attrValue, { nil: null }), nodeEq, nullableStrEq);

console.log("child(i) : Lens<SvgNode, SvgNode>");
check("GetPut", fc.property(arbNodeWithChild,
  ([n, i]) => laws.getPut(child(i), nodeEq)(n)));
check("PutGet", fc.property(arbNode, arbNodeWithChild,
  (c, [n, i]) => laws.putGet(child(i), nodeEq)(c, n)));
check("PutPut", fc.property(arbNode, arbNode, arbNodeWithChild,
  (c1, c2, [n, i]) => laws.putPut(child(i), nodeEq)(c1, c2, n)));

// Composition: SvgNode --requiredAttr--> string --viewBoxLens--> Rect
const nodeViewBox = compose(requiredAttr("viewBox"), viewBoxLens);
checkLens("compose(requiredAttr('viewBox'), viewBoxLens) : Lens<SvgNode, Rect>",
  nodeViewBox, arbNodeWithViewBox, arbRect, nodeEq, rectEq);

console.log("invertIso : involution on invertible matrices (float-approximate)");
check("invert(invert(m)) ≈ m", fc.property(arbInvertibleMat,
  isoLaws.roundTripS(invertIso, (a, b) => matApproxEq(a, b))));
check("m · invert(m) ≈ identity", fc.property(arbInvertibleMat,
  (m) => matApproxEq(multiply(m, invertIso.to(m)), IDENTITY)));

console.log("transform print/parse exactness");
check("parseTransform(printTransform(m)) = m (exact)", fc.property(arbMat,
  (m) => matEq(parseTransform(printTransform(m)), m)));
check("residue preservation: unchanged view keeps original string", fc.property(
  arbTransformStr,
  (s) => transformLens.put(transformLens.get(s), s) === s));

console.log("path print/parse exactness");
check("parsePath(printPath(p)) = p (exact)", fc.property(arbPathCmds,
  (p) => pathEq(parsePath(printPath(p)), p)));

console.log("viewBox print exactness across the full double range");
check("parse(print(r)) = r for any finite doubles", fc.property(arbRect,
  (r) => rectEq(viewBoxLens.get(printViewBox(r)), r)));

// ---------------------------------------------------------------------------

if (failures > 0) {
  console.error(`\n${failures} law(s) FAILED`);
  process.exit(1);
} else {
  console.log(`\nAll lens laws hold (${NUM_RUNS} random cases each).`);
}
