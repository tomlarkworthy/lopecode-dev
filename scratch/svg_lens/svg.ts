/**
 * SVG-specific lenses.
 *
 * Design notes on lawfulness:
 *
 * 1. Exact number round-trips. All printing uses String(n) and all parsing
 *    uses Number(s). ECMAScript guarantees Number(String(x)) === x for every
 *    finite double, so PutGet holds *exactly*, not approximately.
 *
 * 2. Residue preservation via the "skip" rule. SVG attribute syntax is not
 *    canonical (whitespace, commas, transform decompositions). A naive
 *    put = print(parse(...)) would violate GetPut on non-canonical input
 *    ("0,0 100 100" would come back as "0 0 100 100"). Instead, put first
 *    checks whether the new view equals get(s); if so it returns s unchanged.
 *    This makes GetPut hold by construction on the whole parseable domain,
 *    and it also preserves human-friendly forms like "rotate(45) scale(2)"
 *    until the user actually changes the matrix.
 *
 * 3. Partiality. These lenses are total on their stated domains (parseable
 *    viewBox strings, parseable transform lists, invertible matrices) and
 *    throw outside them. The property tests generate values from the domain.
 */

import { Lens, Iso, lens } from "./lens.js";

// ---------------------------------------------------------------------------
// Shared number helpers (exact round-trip printing/parsing)
// ---------------------------------------------------------------------------

const printNum = (n: number): string => String(n);

const parseNumList = (s: string): number[] => {
  const trimmed = s.trim();
  if (trimmed === "") return [];
  const parts = trimmed.split(/[\s,]+/).filter((p) => p !== "");
  return parts.map((p) => {
    const n = Number(p);
    if (Number.isNaN(n)) throw new Error(`invalid number: ${JSON.stringify(p)}`);
    return n;
  });
};

// ---------------------------------------------------------------------------
// viewBox: string <-> Rect
// ---------------------------------------------------------------------------

export interface Rect {
  minX: number;
  minY: number;
  width: number;
  height: number;
}

export const rectEq = (r1: Rect, r2: Rect): boolean =>
  r1.minX === r2.minX && r1.minY === r2.minY &&
  r1.width === r2.width && r1.height === r2.height;

export const parseViewBox = (s: string): Rect => {
  const ns = parseNumList(s);
  if (ns.length !== 4) throw new Error(`viewBox needs 4 numbers, got ${ns.length}`);
  return { minX: ns[0], minY: ns[1], width: ns[2], height: ns[3] };
};

export const printViewBox = (r: Rect): string =>
  [r.minX, r.minY, r.width, r.height].map(printNum).join(" ");

/** Lens<viewBox attribute string, Rect>. Domain: parseable viewBox strings. */
export const viewBoxLens: Lens<string, Rect> = lens(
  parseViewBox,
  (r, s) => (rectEq(r, parseViewBox(s)) ? s : printViewBox(r)),
);

// ---------------------------------------------------------------------------
// points (polygon/polyline): string <-> Array<[x, y]>
// ---------------------------------------------------------------------------

export type Point = readonly [number, number];

export const pointsEq = (a: readonly Point[], b: readonly Point[]): boolean =>
  a.length === b.length && a.every((p, i) => p[0] === b[i][0] && p[1] === b[i][1]);

export const parsePoints = (s: string): Point[] => {
  const ns = parseNumList(s);
  if (ns.length % 2 !== 0) throw new Error("points list needs an even count of numbers");
  const out: Point[] = [];
  for (let i = 0; i < ns.length; i += 2) out.push([ns[i], ns[i + 1]]);
  return out;
};

export const printPoints = (ps: readonly Point[]): string =>
  ps.map(([x, y]) => `${printNum(x)},${printNum(y)}`).join(" ");

/** Lens<points attribute string, Point[]>. Domain: parseable points strings. */
export const pointsLens: Lens<string, Point[]> = lens(
  parsePoints,
  (ps, s) => (pointsEq(ps, parsePoints(s)) ? s : printPoints(ps)),
);

// ---------------------------------------------------------------------------
// transform: string <-> affine matrix [a b c d e f]
// Maps (x, y) -> (a*x + c*y + e, b*x + d*y + f).
// ---------------------------------------------------------------------------

export type Mat = readonly [number, number, number, number, number, number];

export const IDENTITY: Mat = [1, 0, 0, 1, 0, 0];

export const matEq = (m: Mat, n: Mat): boolean => m.every((v, i) => v === n[i]);

/** multiply(m, n) applies n first, then m (matches SVG transform-list order). */
export const multiply = (m: Mat, n: Mat): Mat => {
  const [a1, b1, c1, d1, e1, f1] = m;
  const [a2, b2, c2, d2, e2, f2] = n;
  return [
    a1 * a2 + c1 * b2,
    b1 * a2 + d1 * b2,
    a1 * c2 + c1 * d2,
    b1 * c2 + d1 * d2,
    a1 * e2 + c1 * f2 + e1,
    b1 * e2 + d1 * f2 + f1,
  ];
};

const DEG = Math.PI / 180;

const opToMat = (name: string, args: number[]): Mat => {
  switch (name) {
    case "matrix":
      if (args.length !== 6) throw new Error("matrix needs 6 args");
      return args as unknown as Mat;
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
      const r: Mat = [cos, sin, -sin, cos, 0, 0];
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

/** Parse an SVG transform list into a single composed matrix. */
export const parseTransform = (s: string): Mat => {
  const re = /([a-zA-Z]+)\s*\(([^)]*)\)/g;
  let m: Mat = IDENTITY;
  let consumed = "";
  let match: RegExpExecArray | null;
  while ((match = re.exec(s)) !== null) {
    consumed += s.slice(re.lastIndex - match[0].length, re.lastIndex).replace(/[\s,]/g, "");
    m = multiply(m, opToMat(match[1], parseNumList(match[2])));
  }
  // Everything outside the matched ops must be separators only.
  const residue = s.replace(re, "").replace(/[\s,]/g, "");
  if (residue !== "") throw new Error(`unparseable transform: ${JSON.stringify(s)}`);
  void consumed;
  return m;
};

export const printTransform = (m: Mat): string =>
  `matrix(${m.map(printNum).join(" ")})`;

/**
 * Lens<transform attribute string, Mat>. Domain: parseable transform lists.
 * put keeps the original decomposition (e.g. "rotate(45) scale(2)") whenever
 * the matrix is unchanged; otherwise it writes a canonical matrix(...) form.
 */
export const transformLens: Lens<string, Mat> = lens(
  parseTransform,
  (m, s) => (matEq(m, parseTransform(s)) ? s : printTransform(m)),
);

// ---------------------------------------------------------------------------
// Matrix inversion: an Iso on the invertible matrices (det != 0)
// ---------------------------------------------------------------------------

export const det = (m: Mat): number => m[0] * m[3] - m[1] * m[2];

export const invert = (m: Mat): Mat => {
  const d = det(m);
  if (d === 0 || !Number.isFinite(d)) throw new Error("matrix is not invertible");
  const [a, b, c, dd, e, f] = m;
  return [dd / d, -b / d, -c / d, a / d, (c * f - dd * e) / d, (b * e - a * f) / d];
};

/**
 * Inversion as an involutive Iso on invertible matrices. Unlike everything
 * above, its round-trip is exact only up to floating-point error (division
 * does not round-trip exactly), so its law tests use an epsilon.
 */
export const invertIso: Iso<Mat, Mat> = { to: invert, from: invert };

export const matApproxEq = (m: Mat, n: Mat, eps = 1e-9): boolean =>
  m.every((v, i) => {
    const scale = Math.max(1, Math.abs(v), Math.abs(n[i]));
    return Math.abs(v - n[i]) <= eps * scale;
  });

// ---------------------------------------------------------------------------
// A minimal SVG AST with attribute/child lenses
// ---------------------------------------------------------------------------

export interface SvgNode {
  tag: string;
  attrs: Record<string, string>;
  children: SvgNode[];
}

export const nodeEq = (a: SvgNode, b: SvgNode): boolean => {
  if (a.tag !== b.tag) return false;
  const ka = Object.keys(a.attrs);
  const kb = Object.keys(b.attrs);
  if (ka.length !== kb.length) return false;
  for (const k of ka) if (a.attrs[k] !== b.attrs[k]) return false;
  if (a.children.length !== b.children.length) return false;
  return a.children.every((c, i) => nodeEq(c, b.children[i]));
};

/** Lens<SvgNode, string | null>: focus an attribute; null means absent. */
export const attr = (name: string): Lens<SvgNode, string | null> =>
  lens(
    (s) => (name in s.attrs ? s.attrs[name] : null),
    (v, s) => {
      const attrs = { ...s.attrs };
      if (v === null) delete attrs[name];
      else attrs[name] = v;
      return { ...s, attrs };
    },
  );

/** Lens<SvgNode, string>: like attr, but the domain is nodes that have it. */
export const requiredAttr = (name: string): Lens<SvgNode, string> =>
  lens(
    (s) => {
      if (!(name in s.attrs)) throw new Error(`missing attribute ${name}`);
      return s.attrs[name];
    },
    (v, s) => ({ ...s, attrs: { ...s.attrs, [name]: v } }),
  );

/** Lens<SvgNode, SvgNode>: focus child i. Domain: nodes with > i children. */
export const child = (i: number): Lens<SvgNode, SvgNode> =>
  lens(
    (s) => {
      if (i < 0 || i >= s.children.length) throw new Error(`no child ${i}`);
      return s.children[i];
    },
    (c, s) => {
      if (i < 0 || i >= s.children.length) throw new Error(`no child ${i}`);
      const children = s.children.slice();
      children[i] = c;
      return { ...s, children };
    },
  );

// ---------------------------------------------------------------------------
// path d: string <-> command list
// The view preserves command letters (including relative/absolute case) and
// raw numbers, so PutGet is exact. Domain: separated numbers (no "10-5" or
// compressed arc flags).
// ---------------------------------------------------------------------------

export interface PathCmd { c: string; a: number[] }

export const PATH_ARG_COUNT: Record<string, number> =
  { M: 2, L: 2, T: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, A: 7, Z: 0 };

export const pathEq = (p: PathCmd[], q: PathCmd[]): boolean =>
  p.length === q.length &&
  p.every((c, i) => c.c === q[i].c &&
    c.a.length === q[i].a.length && c.a.every((v, j) => v === q[i].a[j]));

export const parsePath = (s: string): PathCmd[] => {
  const re = /([MmLlHhVvCcSsQqTtAaZz])([^MmLlHhVvCcSsQqTtAaZz]*)/g;
  const cmds: PathCmd[] = [];
  let match: RegExpExecArray | null;
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
};

export const printPath = (cmds: readonly PathCmd[]): string =>
  cmds.map(({ c, a }) => (a.length ? `${c} ${a.map(printNum).join(" ")}` : c)).join(" ");

/** Lens<d attribute string, PathCmd[]>. Domain: parseable path data. */
export const pathLens: Lens<string, PathCmd[]> = lens(
  parsePath,
  (p, s) => (pathEq(p, parsePath(s)) ? s : printPath(p)),
);
