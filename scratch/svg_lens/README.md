# svg-lens

Lawful (very well-behaved) bidirectional lenses for SVG, with the lens laws
verified by property-based testing (fast-check, 1000 random cases per law).

## What "provably invertible" means here

Each `Lens<S, A>` is a pair `get: S → A`, `put: (A, S) → S` satisfying:

- **GetPut** — `put(get(s), s) = s`
- **PutGet** — `get(put(a, s)) = a`
- **PutPut** — `put(a2, put(a1, s)) = put(a2, s)`

Together these guarantee that edits made through the view push back into the
source exactly, with no information loss and no drift on repeated round-trips.

## Lenses provided

| Lens | Source | View |
|---|---|---|
| `viewBoxLens` | viewBox attribute string | `Rect {minX, minY, width, height}` |
| `pointsLens` | polygon/polyline points string | `Array<[x, y]>` |
| `transformLens` | transform list string | composed affine matrix `[a b c d e f]` |
| `pathLens` | path `d` attribute string | `PathCmd[]` (letters + raw numbers preserved) |
| `attr(name)` | `SvgNode` AST | `string \| null` |
| `requiredAttr(name)` | `SvgNode` AST | `string` |
| `child(i)` | `SvgNode` AST | `SvgNode` |
| `compose(l1, l2)` | composition — lawfulness is preserved | |
| `invertIso` | invertible matrix (det ≠ 0) | its inverse (involution, float-approximate) |

## Two tricks that make the laws hold exactly

1. **Exact number round-trips.** Printing uses `String(n)`, parsing uses
   `Number(s)`; ECMAScript guarantees `Number(String(x)) === x` for every
   finite double. The tests confirm this across the full double range,
   including subnormals.

2. **Residue preservation ("skip" rule).** SVG syntax is non-canonical
   (`"0,0 100 100"` vs `"0 0 100 100"`; `rotate(45) scale(2)` vs a matrix).
   `put` first checks whether the new view equals `get(s)` and, if so,
   returns the source *unchanged* — so GetPut holds on the whole parseable
   domain and human-readable forms survive until you actually change them.

## Domains (partiality)

Lenses are total on their stated domains and throw outside them: parseable
viewBox/points/transform strings, nodes carrying the focused attribute/child,
matrices with det ≠ 0, and path data with separated numbers (no `10-5`
abutment or compressed arc flags). The generators in `test/laws.ts` draw from exactly
these domains — including deliberately messy whitespace/comma variants.

`invertIso` is the one approximate citizen: division doesn't round-trip in
floating point, so its involution law is tested to a relative 1e-9.

## Usage

```ts
import { compose } from "./src/lens.js";
import { requiredAttr, viewBoxLens, transformLens } from "./src/svg.js";

const nodeViewBox = compose(requiredAttr("viewBox"), viewBoxLens);

const svg = { tag: "svg", attrs: { viewBox: "0,0 100 100" }, children: [] };
const r = nodeViewBox.get(svg);              // { minX: 0, minY: 0, width: 100, height: 100 }
nodeViewBox.put(r, svg) === svg;             // true — unchanged view, unchanged source
nodeViewBox.put({ ...r, width: 200 }, svg);  // attrs.viewBox === "0 0 200 100"

transformLens.get("rotate(90) translate(10)");     // [0, 1, -1, 0, ..., 10]
transformLens.put([2, 0, 0, 2, 0, 0], "scale(1)"); // "matrix(2 0 0 2 0 0)"
```

## Run the proofs

```
npm install
npm test
```
