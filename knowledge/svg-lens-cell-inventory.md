# svg-lens cell inventory

Full census for the consistency/refactoring phase (architecture §9), produced by a 20-agent
workflow (`tools/svglens-wip/inventory-workflow.js`) and merged back here. One row per cell:
**user** = the user-facing job (`—` if internal) · **how** = implementation · LOC/CC from the
code-metrics pipeline. `#n` in a row = member of overlap cluster n in the ranked table at the end.

341 cells · 341 inventoried · 6 overlap clusters.


| ✓ | cell | user | how | LOC | CC | ⚠ |
|---|---|---|---|---|---|---|
| ☑ | `intro` | Titles the editor; explains code↔drawing sync | md template-literal heading plus one-line instruction | 2 | 1 |  |
| ☑ | `loadSvg` | Load an SVG file; download your drawing | file input onchange → stripPreamble/outsideDomain guard → drawing.edit('load'); download via Blob objectURL anchor | 39 | 11 |  |
| ☑ | `toolbar` | Tool buttons, keyboard shortcuts, right-click command menu | htl buttons from TOOLS+commands() registry; canCommand repaint on lens-select/put; document keydown dispatch; contextmenu popup | 124 | 57 |  |
| ☑ | `viewof drawing` | The editable SVG drawing itself | svgLens(svg`<svg>…`) tagged-template constructs the lens editor node | 17 | 1 |  |
| ☑ | `drawing` | — | G.input(_) value extractor for viewof drawing | 1 | 1 |  |
| ☑ | `inspector` | Edit selected element's raw SVG attributes; jump to refs | drawing.describe/selectionPaths → Inputs.text per attr, change→setAttr; refs()→select-jump buttons; rerender on lens-select/put | 43 | 6 | #1 |
| ☑ | `fieldPanel` | Edit fill, stroke, width, opacity, dash as inputs | drawing.fields() → enum/color/number/text htl controls, change→setField; try-guarded rerender on lens-select/put | 58 | 23 | #1 |
| ☑ | `howToDrive` | Reference of every gesture, chip and keyboard shortcut | md tables mapping gestures/chips/keys to lenses | 36 | 1 |  |
| ☑ | `putTable` | Live table of each source rewrite with round-trip law checks | Generators.observe on lens-put → Inputs.table of last 8 with GetPut/PutGet ✅/❌ formatters | 16 | 3 | #3 |

### Use it in your own notebook  ·  `useIt` (H2)

| ✓ | cell | user | how | LOC | CC | ⚠ |
|---|---|---|---|---|---|---|
| ☑ | `putLog` | — | [] — mutable append buffer of put events | 3 | 1 | #3 |
| ☑ | `edits` | — | Generators.observe; lens-put listeners on drawing+factory push into putLog, change(putLog.length) | 11 | 3 | #3 |
| ☑ | `viewof svgLensModule` | — | thisModule() returns this notebook's own module handle | 3 | 1 |  |
| ☑ | `svgLensModule` | — | G.input(_) value extractor | 1 | 1 |  |
| ☑ | `keepYourEdits` | Download the notebook with your edits baked in | lookupVariable('viewof drawing')._definition.toString().length for byte count; downloadAnchor labelled with edit count | 13 | 5 |  |
| ☑ | `paperHeader` | — | md rule, heading and italic abstract for the paper section | 3 | 1 |  |

### §problem  ·  `problemH` (paper section)

| ✓ | cell | user | how | LOC | CC | ⚠ |
|---|---|---|---|---|---|---|
| ☑ | `problemP` | — | md prose problem statement with cite()/ref() citations | 4 | 1 |  |

### §lenses  ·  `lensesH` (paper section)

| ✓ | cell | user | how | LOC | CC | ⚠ |
|---|---|---|---|---|---|---|
| ☑ | `lensesP` | — | md template with tex/cite; explains get/put lens definition | 7 | 1 |  |

### §laws  ·  `lawsH` (paper section)

| ✓ | cell | user | how | LOC | CC | ⚠ |
|---|---|---|---|---|---|---|
| ☑ | `lawsP` | — | md with tex/cite/ref; explains GetPut/PutGet/PutPut laws | 13 | 1 |  |

### §residue  ·  `residueH` (paper section)

| ✓ | cell | user | how | LOC | CC | ⚠ |
|---|---|---|---|---|---|---|
| ☑ | `residueP` | — | md with tex/cite; explains skip-rule preserving comments/spacing, PutPut-up-to-observation | 22 | 1 |  |

### §tower  ·  `towerH` (paper section)

| ✓ | cell | user | how | LOC | CC | ⚠ |
|---|---|---|---|---|---|---|
| ☑ | `towerP` | — | md with tex/cite/ref; the four-type three-lens tower and dependent addressing | 19 | 1 |  |

### §architecture  ·  `architectureH` (paper section)

| ✓ | cell | user | how | LOC | CC | ⚠ |
|---|---|---|---|---|---|---|
| ☑ | `architectureP` | — | md with ref/cite; L0-L5 layer table, tools-emit-commands rule | 7 | 1 |  |

### §propagation  ·  `propagationH` (paper section)

| ✓ | cell | user | how | LOC | CC | ⚠ |
|---|---|---|---|---|---|---|
| ☑ | `propagationP` | — | md with tex/ref; commands as endomorphisms, commuting puts, runtime propagation via define | 17 | 1 |  |

### §rect  ·  `rectH` (paper section)

| ✓ | cell | user | how | LOC | CC | ⚠ |
|---|---|---|---|---|---|---|
| ☑ | `rectP` | — | md with tex/ref; explains attrText∘parsePoints composite and skip-rule no-op | 17 | 1 |  |
| ☑ | `lawBadges` | See which lens laws held on your last drag | htl.html readout listening for lens-put events; renders GetPut/PutGet badges + before→after | 22 | 4 | #3 |
| ☑ | `viewof rectDemo` | Drag a triangle corner and watch the SVG source rewrite | svgLens(svg`...polygon...`) bidirectional editor view | 6 | 1 |  |
| ☑ | `rectDemo` | — | (G,_)=>G.input(_) viewof value-extractor | 1 | 1 |  |
| ☑ | `rectDemoLaws` | See laws checked live under the triangle demo | htl.html grid wrapping lawBadges($0, invalidation) bound to rectDemo node | 3 | 1 |  |

### §children  ·  `childrenH` (paper section)

| ✓ | cell | user | how | LOC | CC | ⚠ |
|---|---|---|---|---|---|---|
| ☑ | `childrenP` | — | md template with tex.block, cite, ref; explains children-as-source-strings lens | 19 | 1 |  |
| ☑ | `viewof childrenDemo` | Editable SVG with polygon/rect/circle to rearrange | svgLens(svg`...`) wrapping a multi-child SVG literal | 10 | 1 |  |
| ☑ | `childrenDemo` | — | viewof value-extractor (G,_)=>G.input(_) | 1 | 1 |  |
| ☑ | `childrenDemoOps` | Buttons: insert, append, delete, send-back, bring-front | htl.html buttons wired to node.addShape/removeSelection/zOrder; lawBadges under | 22 | 5 |  |

### §sinks  ·  `sinksH` (paper section)

| ✓ | cell | user | how | LOC | CC | ⚠ |
|---|---|---|---|---|---|---|
| ☑ | `sinksP` | — | md with tex, ref, cite; explains slot provenance -> sink table (literal/view/locked) | 25 | 1 |  |
| ☑ | `factoryDoc` | Explains which slider each of three boxes drives | md prose describing upstream/mixed/rotation sinks of the demo | 9 | 1 |  |
| ☑ | `viewof shift` | Slider to shift shapes horizontally | Inputs.range([-100,300]) value 40 | 3 | 1 |  |
| ☑ | `shift` | — | viewof value-extractor (G,_)=>G.input(_) | 1 | 1 |  |
| ☑ | `viewof spin` | Slider to rotate a shape | Inputs.range([0,360]) value 20 | 3 | 1 |  |
| ☑ | `spin` | — | viewof value-extractor (G,_)=>G.input(_) | 1 | 1 |  |
| ☑ | `viewof factory` | Drag three rects to see literal vs upstream-slider sinks | svgLens(svg`...`) with transform interpolations ${shift}/${spin} on rects | 10 | 1 |  |
| ☑ | `factory` | — | viewof value-extractor (G,_)=>G.input(_) | 1 | 1 |  |
| ☑ | `sinkRecord` | Live table showing which sink each gesture landed in | putLog.filter(source===factory).slice(-6) into Inputs.table | 13 | 4 | #3 |

### §tools  ·  `toolsH` (paper section)

| ✓ | cell | user | how | LOC | CC | ⚠ |
|---|---|---|---|---|---|---|
| ☑ | `toolsP` | — | md with tex/cite/ref; maps edit-lens complement to gesture scratch, gestureDelta framework | 32 | 1 |  |

### §toollaws  ·  `toollawsH` (paper section)

| ✓ | cell | user | how | LOC | CC | ⚠ |
|---|---|---|---|---|---|---|
| ☑ | `toollawsP` | — | md-template essay listing tool laws T1-T11 with tex/cite/ref links | 42 | 1 |  |

### §related  ·  `relatedH` (paper section)

| ✓ | cell | user | how | LOC | CC | ⚠ |
|---|---|---|---|---|---|---|
| ☑ | `relatedP` | — | md-template related-work section with cite/ref citation links | 46 | 1 |  |

### §future  ·  `futureH` (paper section)

| ✓ | cell | user | how | LOC | CC | ⚠ |
|---|---|---|---|---|---|---|
| ☑ | `futureP` | — | md-template future-work/costs section with ref/cite links | 21 | 1 |  |

### References  ·  `referencesH` (H2)

| ✓ | cell | user | how | LOC | CC | ⚠ |
|---|---|---|---|---|---|---|
| ☑ | `referencesList` | Rendered bibliography list on the page | returns the `references` HTML value | 3 | 1 |  |
| ☑ | `appendixHeader` | — | md-template appendix intro heading | 3 | 1 |  |
| ☑ | `externalLink` | — | htl.html anchor factory (label,url) with target=_blank rel=noopener | 3 | 1 |  |
| ☑ | `sections` | — | array of {key,title,parent} section descriptors | 18 | 1 |  |
| ☑ | `sectionIndex` | — | IIFE folds sections into Map of numbered {num,title,level} with parent nesting | 17 | 4 |  |
| ☑ | `sec` | Numbered section headings in the paper | builds h2/h3 element with id and `num. title` from sectionIndex | 9 | 3 |  |
| ☑ | `ref` | Clickable cross-references that smooth-scroll to sections | htl.html anchor; onclick scrollIntoView to `#sec-key` | 10 | 2 |  |
| ☑ | `bibliography` | — | object literal keyed by cite-id with label/authors/year/title/venue/url | 124 | 1 |  |
| ☑ | `cite` | Clickable inline citations scrolling to reference | htl.html anchor lookup in bibliography; onclick scroll to `#ref-key` | 10 | 2 |  |
| ☑ | `references` | Numbered reference list with external links | htl.html <ol> mapping bibliography entries via externalLink | 7 | 1 |  |
| ☑ | `testsDashboard` | Live pass/fail table of the paper's property tests | tests({filter: t=>t.computed}) | 3 | 1 |  |

### Property-test harness  ·  `harnessHeader` (H2)

| ✓ | cell | user | how | LOC | CC | ⚠ |
|---|---|---|---|---|---|---|
| ☑ | `NUM_RUNS` | — | constant 300 | 3 | 1 |  |
| ☑ | `mulberry32` | — | seeded mulberry32 PRNG: imul/xor bit-mixing returns [0,1) generator | 9 | 1 |  |
| ☑ | `arb` | — | generator factory: DataView random-bit doubles, messy viewBox/points/transform/path/node/svgDoc/cellSrc string builders | 98 | 23 |  |
| ☑ | `forAll` | — | property-check loop: runs gen(rng)->prop, throws JSON counterexample on first failure | 12 | 6 |  |
| ☑ | `checkLens` | — | runs lensLaws.getPut/putGet/putPut via forAll over genS/genA with eq predicates | 8 | 1 |  |

### Tests  ·  `testsHeader` (H2)

| ✓ | cell | user | how | LOC | CC | ⚠ |
|---|---|---|---|---|---|---|
| ☑ | `test_viewBoxLens_laws` | — | checkLens(viewBoxLens) over arb.viewBoxStr/rect, seed 0x5EED0001, rectEq | 7 | 1 |  |
| ☑ | `test_pointsLens_laws` | — | checkLens(pointsLens) over arb.pointsStr/points, seed 0x5EED0002, pointsEq | 7 | 1 |  |
| ☑ | `test_transformLens_laws` | — | checkLens(transformLens) over arb.transformStr/mat, seed 0x5EED0003, matEq | 7 | 1 |  |
| ☑ | `test_pathLens_laws` | — | checkLens(pathLens) over arb.pathStr/pathCmds, seed 0x5EED0004, pathEq | 7 | 1 |  |
| ☑ | `test_attr_laws` | — | checkLens(attr('fill')) over arb.node, genA nullable attrValue, seed 0x5EED0005, nodeEq | 7 | 2 |  |
| ☑ | `test_child_laws` | — | forAll over arb.nodeWithChild running lensLaws getPut/putGet/putPut for child(i), seed 0x5EED0006 | 11 | 1 |  |
| ☑ | `test_compose_nodeViewBox_laws` | — | checkLens(compose(requiredAttr('viewBox'),viewBoxLens)) over arb.nodeWithViewBox, seed 0x5EED0007 | 7 | 1 |  |
| ☑ | `test_invert_involution` | — | forAll invertibleMat: isoLaws.roundTripS + m·invert(m)≈IDENTITY via matApproxEq, seed 0x5EED0008 | 9 | 1 |  |
| ☑ | `test_exact_roundtrips` | — | forAll asserts Number/String and parse∘print identities for transform/path/viewBox, seed 0x5EED0009 | 13 | 1 |  |
| ☑ | `test_putput_skip_rule_corner` | — | loops witnessing observational PutPut holds but strict-string PutPut fails when a2=get(s), seed 0x5EED000A | 30 | 10 |  |
| ☑ | `test_applyPoint_screen_roundtrip` | — | forAll invertibleMat+point: applyPoint(invert(m),applyPoint(m,p))≈p and invert(m)·m≈IDENTITY, seed 0x5EED000B | 14 | 2 |  |
| ☑ | `test_translateLens_laws` | — | checkLens(translateLens) plus forAll asserting put preserves the trailing transform ops, seeds 0x5EED0010/0011 | 15 | 3 |  |
| ☑ | `test_literalLens_laws` | — | checkLens runs lens-law property test on literalLens("svgLens") with arb generators, mulberry32 seed, NUM_RUNS | 7 | 1 |  |
| ☑ | `test_attrTextLens_laws` | — | checkLens property-tests attrTextLens(1,"transform",…) laws over arb.svgDocStr/opStr, seeded RNG | 7 | 1 |  |
| ☑ | `test_cellSourceLens_laws` | — | checkLens on compose(cellAttrLens, transformLens); genA=arb.mat, eqA=matEq | 7 | 1 |  |
| ☑ | `test_source_residue_preserved` | — | forAll: put through cellAttrLens leaves bytes outside literalSpan byte-identical (slice comparison) | 15 | 3 |  |
| ☑ | `test_childrenLens_laws` | — | forAll lensLaws.getPut/putGet strict, PutPut only up to get-equivalence on childrenLens([0]) | 15 | 2 |  |
| ☑ | `test_structural_commands` | — | forAll: insertElement/deleteElement are inverse, reorderElement is a permutation, via childrenLens child counts | 24 | 8 |  |
| ☑ | `test_point_commands` | — | forAll: insertPoint then deletePoint restores polygon points; parsePoints/attrVal read back | 23 | 7 |  |
| ☑ | `test_nearestSegment` | — | unit asserts nearestSegment index/distance on a square, closed vs open polyline | 13 | 7 |  |
| ☑ | `test_opsLens_laws` | — | forAll lensLaws on opsLens plus residue check: untouched transform ops keep verbatim spelling via printOp/regex | 28 | 14 |  |
| ☑ | `test_transform_gizmo` | — | forAll: rotateAbout/scaleAbout hold centre/pivot fixed via applyPoint; repeated gestures don't grow op list | 47 | 10 |  |
| ☑ | `test_commands_commute` | — | forAll: attrTextLens transform puts at disjoint token addresses commute (left===right) | 20 | 4 |  |
| ☑ | `test_scoped_path` | — | table + forAll: scopedPath descends exactly one level, never leaves scope or exceeds leaf | 34 | 10 |  |
| ☑ | `test_shape_registry` | — | forAll+cases: shapeLookup/svgShapes handles — resize matches scaleAbout, unmoved writes nothing, drags land, unreadable declined | 92 | 21 |  |
| ☑ | `test_shape_creation` | — | forAll: shapeMarkup committed via insertElement matches shapeSpec preview; drag corner-symmetric, residue kept | 33 | 10 |  |
| ☑ | `test_domain_boundary` | — | outsideDomain accepts svg/comments/entities, refuses CDATA/style/script/foreignObject; parseDoc/tokenize/childrenLens throw loudly | 33 | 9 |  |
| ☑ | `test_units_and_style` | — | forAll: lengthLens keeps units + laws, styleLens declaration laws, setProperty writes where property already lives | 45 | 18 |  |
| ☑ | `test_interpolation_slots` | — | slotsOf/holeSpans classify holes; mergeInterpolated moves literals, preserves \${} bytes, refuses shape mismatch; cell-domain check | 32 | 20 |  |
| ☑ | `test_refs` | — | refsOf/pathOfId resolve url(#id) and href=#id to paths; dangling ref reports null target | 25 | 11 |  |
| ☑ | `test_snapRects` | — | property test via forAll/mulberry32: snapRects nearest-line within tolerance, one guide per axis, plus edge cases | 30 | 17 |  |
| ☑ | `test_topmost_selection` | — | table-driven cases: topmostPaths drops descendants of selected groups, order-independent, per-component prefix check | 15 | 2 |  |
| ☑ | `test_z_order` | — | forAll over random svgs: zTarget+reorderElement front/back/raise/lower vs childrenLens paint order, clamped, count preserved | 24 | 10 |  |
| ☑ | `test_pen_path` | — | penPath.start/lineTo/curveTo/close/mirror asserted via parsePath/printPath; mirror involution, degenerate cubic sampled on segments | 35 | 21 |  |
| ☑ | `test_path_subdivision_exact` | — | forAll mixed abs/rel/smooth paths: splitPathSegment reparameterises exactly per-segment, deletePathAnchor removes one, via print/parse round-trip | 64 | 27 |  |
| ☑ | `test_rebasePath` | — | forAll: rebasePath follows each sibling's bytes across insert/delete/move using nodeAt slices; delete nulls only the removed path | 44 | 11 |  |
| ☑ | `test_group_ungroup` | — | forAll: groupElements∘ungroupElements = id, cmdGroup.plan rebase follows every sibling via nodeAt bytes, contiguous is byte-exact | 52 | 12 |  |
| ☑ | `test_rebase_vertex` | — | forAll polygons + fixed paths: vertexAddress print/parse round-trip, rebaseVertex follows points through insert/delete via ordinals | 85 | 36 |  |
| ☑ | `test_copy_paste` | — | forAll: copyMarkup/pasteMarkup byte-identical duplicate; freshenIds renames internal refs not outward; empty-clipboard cmdPaste declines | 38 | 14 |  |
| ☑ | `test_path_smooth` | — | forAll polylines: pathSmooth.toggle round-trips to original bytes, couple keeps partner length, declines arcs/endpoints | 59 | 15 |  |
| ☑ | `test_align_commands` | — | mock env of boxes: cmdAlign/cmdDistribute land edges/even gaps via gestureDelta, idempotent, decline two-element distribute | 58 | 20 |  |
| ☑ | `test_parse_vs_DOMParser` | — | compares parseDoc/tokenize/attrVal against DOMParser on 8 docs (shape/attrs/spans); asserts outsideDomain refuses CDATA/script/style | 69 | 24 |  |

### Lens core  ·  `coreHeader` (H2)

| ✓ | cell | user | how | LOC | CC | ⚠ |
|---|---|---|---|---|---|---|
| ☑ | `lens` | — | constructor (get,put)=>({get,put}) | 3 | 1 |  |
| ☑ | `compose` | — | lens composition: get chains inner∘outer, put threads back put through outer.get/outer.put | 6 | 1 |  |
| ☑ | `isoToLens` | — | lifts an iso to a lens: lens(i.to, (a,_s)=>i.from(a)) | 3 | 1 |  |
| ☑ | `lensLaws` | — | getPut/putGet/putPut law predicates for equality-checking a lens | 7 | 1 |  |
| ☑ | `isoLaws` | — | roundTripS/roundTripA law predicates for an iso | 6 | 1 |  |

### SVG lenses  ·  `svgHeader` (H2)

| ✓ | cell | user | how | LOC | CC | ⚠ |
|---|---|---|---|---|---|---|
| ☑ | `parseNumList` | — | split string on whitespace/commas, Number() each, throw on NaN | 11 | 3 |  |
| ☑ | `parseViewBox` | — | parseNumList then require exactly 4 → {minX,minY,width,height} | 7 | 2 |  |
| ☑ | `printViewBox` | — | map rect fields to String and join with spaces | 3 | 1 |  |
| ☑ | `rectEq` | — | field-wise === comparison of two viewBox rects | 3 | 4 |  |
| ☑ | `viewBoxLens` | Editing viewBox stays in sync with the drawing | lens(parseViewBox, put); preserves source string when parsed rect unchanged | 3 | 2 |  |
| ☑ | `parsePoints` | — | parseNumList, require even count, pair into [x,y] tuples | 9 | 3 |  |
| ☑ | `printPoints` | — | map [x,y] tuples to `x,y` and join with spaces | 3 | 1 |  |
| ☑ | `pointsEq` | — | length + element-wise coordinate === comparison | 3 | 3 |  |
| ☑ | `pointsLens` | Dragging polygon/polyline points rewrites points source | lens(parsePoints, put); reuses source string when parsed points unchanged | 3 | 2 |  |

### Matrices and the CTM  ·  `hMatrices` (H3)

| ✓ | cell | user | how | LOC | CC | ⚠ |
|---|---|---|---|---|---|---|
| ☑ | `IDENTITY` | — | the constant [1,0,0,1,0,0] | 3 | 1 |  |
| ☑ | `matEq` | — | element-wise === over the two flat matrices | 3 | 1 |  |
| ☑ | `multiply` | — | compose two [a,b,c,d,e,f] affine matrices via explicit product formula | 14 | 1 |  |
| ☑ | `applyPoint` | — | apply affine matrix to (x,y): [ax+cy+e, bx+dy+f] | 3 | 1 |  |
| ☑ | `ctmMat` | — | read DOMMatrix .a-.f into a flat [a,b,c,d,e,f] array | 3 | 1 |  |
| ☑ | `opToMat` | — | switch over transform op name (matrix/translate/scale/rotate/skew) → matrix; rotate-about via multiply | 38 | 17 |  |

### Transforms and the gizmo  ·  `hTransforms` (H3)

| ✓ | cell | user | how | LOC | CC | ⚠ |
|---|---|---|---|---|---|---|
| ☑ | `parseTransform` | — | regex over transform ops, folds each via opToMat+multiply into a matrix; asserts leftovers are separators | 12 | 3 |  |
| ☑ | `printTransform` | — | serialize matrix array to `matrix(a b c d e f)` string | 3 | 1 |  |
| ☑ | `transformLens` | drag-edits round-trip to the transform attribute | lens(parseTransform, put) with matEq skip-rule to preserve unchanged text | 3 | 2 |  |
| ☑ | `parseTransformOps` | — | regex extracts each op with name, args, and byte offsets (start/end/argStart/argEnd) for splicing | 14 | 3 |  |
| ☑ | `translateLens` | drag translates a shape, rewriting its translate() minimally | lens reads/writes leading translate op; splices args in-place via offsets or prepends; skip-rule on unchanged | 18 | 11 |  |
| ☑ | `printOp` | — | serialize one op to `name(args)` string | 3 | 1 |  |
| ☑ | `opsLens` | edit the ordered op list, preserving untouched op source text | lens over parseTransformOps array; per-op same() reuses original byte-slice else reprints; skip-rule | 12 | 8 |  |
| ☑ | `opSlot` | — | find index of last op matching name, else return ops.length (append slot) | 6 | 3 |  |
| ☑ | `holdFixed` | transform keeps the grabbed point pinned under the cursor | applyPoint before/after, computes delta, adjusts leading translate to cancel drift; avoids translate(0 0) noise | 13 | 11 |  |
| ☑ | `setGizmoOp` | — | insert/replace op at its slot; folds inner ops to map center; rotate gets computed cx,cy args | 11 | 3 |  |
| ☑ | `rotateAbout` | rotate a shape about a chosen pivot point | setGizmoOp('rotate') then holdFixed to pin pivot | 3 | 1 |  |
| ☑ | `scaleAbout` | scale a shape about a chosen anchor point | setGizmoOp('scale') then holdFixed to pin anchor | 3 | 1 |  |
| ☑ | `rotateHandle` | a rotate handle on a stalk above the selection | compute stalk length from bbox, return handle at top-center with link point | 7 | 1 |  |
| ☑ | `transformHandles` | corner scale handles plus a rotate handle around selection | map bbox corners to nw/ne/se/sw scale handles, append rotateHandle | 9 | 1 |  |

### Inverse, and reading a node  ·  `hInverse` (H3)

| ✓ | cell | user | how | LOC | CC | ⚠ |
|---|---|---|---|---|---|---|
| ☑ | `det` | — | 2x3 affine matrix determinant m0*m3-m1*m2 | 3 | 1 |  |
| ☑ | `invert` | — | invert affine matrix via determinant; throws if singular/non-finite | 8 | 3 |  |
| ☑ | `invertIso` | — | iso {to:invert, from:invert} exploiting inversion as its own involution | 3 | 1 |  |
| ☑ | `matApproxEq` | — | element-wise abs diff with scale-relative epsilon tolerance | 6 | 1 |  |
| ☑ | `nodeEq` | — | recursive deep-equality over {tag,attrs,children} node tree | 11 | 6 |  |
| ☑ | `attr` | — | lens factory: get/set attrs[name], null deletes, immutable spread | 11 | 3 |  |
| ☑ | `requiredAttr` | — | lens factory: get throws if attr absent, set spreads attrs[name] | 9 | 2 |  |
| ☑ | `child` | — | lens factory: get/set children[i] with bounds-check, immutable slice | 14 | 5 |  |

### Path data  ·  `hPathData` (H3)

| ✓ | cell | user | how | LOC | CC | ⚠ |
|---|---|---|---|---|---|---|
| ☑ | `PATH_ARG_COUNT` | — | const map of SVG path command letter to arg count | 3 | 1 |  |
| ☑ | `pathEq` | — | length + per-command letter/args deep equality | 4 | 4 |  |
| ☑ | `parsePath` | Pen/vertex tools edit path 'd' as commands | regex tokenizes d into {c,a}, validates arg-count multiples via PATH_ARG_COUNT | 21 | 7 |  |
| ☑ | `printPath` | — | join {c,a} commands back into a d-attribute string | 3 | 2 |  |
| ☑ | `pathLens` | Drawing a path rewrites its d source minimally | lens(parsePath, put reprints only if pathEq differs to preserve source) | 3 | 2 |  |

### Source lenses  ·  `sourceHeader` (H2)

| ✓ | cell | user | how | LOC | CC | ⚠ |
|---|---|---|---|---|---|---|
| ☑ | `literalSpan` | — | acorn.parseExpressionAt walks AST to template-literal byte span; rejects element-position holes | 33 | 21 |  |
| ☑ | `literalSafe` | — | holeSpans check: text minus holes must lack backtick/backslash/${ to survive re-parse | 18 | 7 |  |
| ☑ | `literalLens` | Editing a shape rewrites the cell's own template source | lens over literalSpan byte-slice; put splices new text after literalSafe guard | 11 | 3 |  |

### The document: tokenizer and tree  ·  `hTokenizer` (H3)

| ✓ | cell | user | how | LOC | CC | ⚠ |
|---|---|---|---|---|---|---|
| ☑ | `scan` | — | forgiving char scanner over SVG text yielding open/close/comment/text tokens with attr byte spans | 46 | 23 |  |
| ☑ | `outsideDomain` | — | scans tokens; returns reason if script/style/foreignObject/CDATA/DOCTYPE-subset present | 16 | 8 |  |
| ☑ | `tokenize` | — | outsideDomain guard, then scan(src) filtered to kind==="open" tokens | 7 | 2 |  |
| ☑ | `parseDoc` | — | scan(src) tokens fed through an open/close stack, building a nested tree with start/inner/end offsets and paths | 25 | 9 |  |
| ☑ | `nodeAt` | — | parseDoc then walk child indices along path, throwing if any step is missing | 7 | 3 |  |
| ☑ | `pathOfIndex` | — | recursive walk of parseDoc tree matching n.index===idx, returns its path | 12 | 5 |  |

### Attributes, style, length, references  ·  `hAttrLenses` (H3)

| ✓ | cell | user | how | LOC | CC | ⚠ |
|---|---|---|---|---|---|---|
| ☑ | `attrVal` | — | tokenize(src)[idx].attrs[name].value or null | 7 | 3 |  |
| ☑ | `effectiveAttr` | Shows the live computed attribute value when source has template holes | attrVal; if value has holeSpans, read live el.getAttribute(name) from rendered DOM element | 9 | 7 |  |
| ☑ | `spliceAttr` | — | string slice replace of existing attr span, or insert ` name="val"` at el.insertPos; returns {src,span} | 13 | 4 |  |
| ☑ | `attrTextLens` | Edit one shape attribute as text, source rewrites | lens(get=attrVal-or-default, put=spliceAttr with skip rule on unchanged view) | 10 | 4 |  |
| ☑ | `pathOfId` | — | walk parseDoc tree matching attrs.id.value===id, returns path | 12 | 5 |  |
| ☑ | `refsOf` | — | nodeAt then regex-match each attr value for url(#id) or #id, resolving id to a path via pathOfId | 13 | 4 |  |
| ☑ | `parseLength` | — | regex parse of number plus optional CSS unit into {n,unit}, throws if unmatched | 7 | 3 |  |
| ☑ | `printLength` | — | template `${n}${unit}` | 3 | 2 |  |
| ☑ | `lengthLens` | Drag a unit-bearing number, source keeps its unit | lens(get=parseLength().n, put=printLength preserving original unit, skip when unchanged) | 9 | 2 |  |
| ☑ | `parseStyle` | — | split on ; then on first : into [key,value] declaration pairs, throws on malformed | 7 | 2 |  |
| ☑ | `printStyle` | — | decls.map join `k: v` with `; ` | 3 | 1 |  |
| ☑ | `styleLens` | Edit a shape's inline style declarations bidirectionally | lens(parseStyle, put=printStyle with deep-equal skip rule preserving original text) | 7 | 4 |  |
| ☑ | `setProperty` | — | if prop already in style attr, update via styleLens.put; else return it as a standalone attribute | 8 | 4 |  |

### The field registry  ·  `hFields` (H3)

| ✓ | cell | user | how | LOC | CC | ⚠ |
|---|---|---|---|---|---|---|
| ☑ | `svgFields` | Edit fill, stroke, opacity, dash, caps and more | declarative list of paint/stroke props; read() prefers style declaration over attribute via attrVal+styleLens | 31 | 6 |  |
| ☑ | `cellAttrLens` | — | compose(literalLens(alias), attrTextLens) — an attribute view keyed by cell alias | 3 | 1 |  |

### The children lens, and structural edits  ·  `hStructural` (H3)

| ✓ | cell | user | how | LOC | CC | ⚠ |
|---|---|---|---|---|---|---|
| ☑ | `childrenLens` | — | lawful lens: get slices children markup, put re-splices preserving per-child gaps/indentation; skip rule on no-op | 27 | 13 |  |
| ☑ | `insertElement` | Add a new shape to the drawing | childrenLens get/splice/put; clamps index, appends when at is null | 9 | 3 |  |
| ☑ | `deleteElement` | Delete a shape from the drawing | childrenLens on parent path; splice out last path index; put; guards root and bounds | 11 | 4 |  |
| ☑ | `reorderElement` | Move a shape forward or backward in stacking order | childrenLens splice-remove from, splice-insert at to, clamped; put | 11 | 3 |  |
| ☑ | `mintId` | — | idsIn(src) set; increment prefix+i until unused | 7 | 2 |  |
| ☑ | `defsInsert` | — | nodeAt finds/creates <defs> under svg root; insertElement appends markup | 8 | 2 |  |
| ☑ | `groupPlan` | — | validate paths are siblings; dedupe/sort indices; compute insertion point for the group | 11 | 6 |  |
| ☑ | `groupElements` | Group selected shapes into a <g> | groupPlan + childrenLens; reads source gaps, deepens indentation one level, wraps members in open/close | 16 | 6 |  |
| ☑ | `ungroupBlockers` | — | nodeAt; returns reasons ungroup unsafe: not a <g>, or non-transform attrs present | 8 | 3 |  |
| ☑ | `ungroupElements` | Ungroup a <g> back into its parent | guards via ungroupBlockers; dedents gaps one level; folds group transform onto each child via attrTextLens | 21 | 8 |  |
| ☑ | `copyMarkup` | Copy selected shapes | nodeAt per path, slice src.start..end into markup strings | 3 | 1 |  |
| ☑ | `idsIn` | — | parseDoc + recursive walk collecting attrs.id.value into a Set | 8 | 3 |  |
| ☑ | `freshenIds` | — | rename colliding ids to id-2 etc; regex rewrites id=/url(#/href=#/xlink references | 17 | 6 |  |
| ☑ | `pasteMarkup` | Paste shapes without id collisions | childrenLens splice-insert freshenIds(markups, idsIn(src)); clamped index; put | 9 | 3 |  |
| ☑ | `offsetMarkup` | — | compose(attrTextLens(transform),translateLens); get/put translate, offset by dx/dy, round to 1e-6 | 9 | 3 |  |
| ☑ | `rebaseMoves` | — | path remapper: match prefix in moves list then swap, else fold rebasePath over each op | 10 | 7 |  |

### Path geometry  ·  `hPathGeometry` (H3)

| ✓ | cell | user | how | LOC | CC | ⚠ |
|---|---|---|---|---|---|---|
| ☑ | `insertPoint` | Add a vertex to a polygon | attrTextLens('points') get→parsePoints→splice at after+1→printPoints→put | 8 | 1 |  |
| ☑ | `deletePoint` | Remove a vertex from a polygon | attrTextLens('points') parse→splice(i,1) with min-2 guard→printPoints→put | 10 | 4 |  |
| ☑ | `nearestSegment` | — | project point onto each edge, clamp t, track min hypot distance; returns index+distance | 14 | 5 | #6 |
| ☑ | `rebasePath` | — | remaps a child index under insert/delete/move at a parent path; null if the addressed child was deleted | 22 | 15 |  |
| ☑ | `vertexAddress` | — | address ADT: of/print/parse (path#a/cN), same, resolve via kind-filtered ordinal, ordinalOf from handle key | 21 | 13 |  |
| ☑ | `rebaseVertex` | — | delegates structural ops to rebasePath; adjusts ordinal n for vertex-insert/delete on the same element | 17 | 13 |  |
| ☑ | `pathSegments` | — | walk SVG path cmds tracking current/start/reflection points; emit normalized L/C/Q/A/Z segments with ci/o back-refs | 49 | 20 |  |
| ☑ | `pointOnSegment` | — | de Casteljau interpolation at t for C/Q; chord lerp for L/Z/A | 9 | 3 |  |
| ☑ | `replaceGroup` | — | splice one arg-group out of a path command, splitting into before/replacement/after commands (M→L for trailing) | 11 | 5 |  |
| ☑ | `absoluteGroup` | — | rewrite a segment as an explicit absolute C/Q/A/L command via replaceGroup, so a following S/T loses its dependency | 10 | 6 |  |
| ☑ | `splitPathSegment` | Subdivide a curve/line, adding a point | de Casteljau split at t into two C/Q/L (or Z→lineto); absoluteGroup on trailing S/T first; replaceGroup | 28 | 8 |  |
| ☑ | `deletePathAnchor` | Delete an anchor point from a path | absoluteGroup the next segment then replaceGroup with empty; guards Z and min-2-anchors | 13 | 6 |  |
| ☑ | `nearestPathSegment` | — | sample each segment (24 pts) via pointOnSegment, return closest {index,t,distance} | 14 | 3 | #6 |
| ☑ | `insertPathPoint` | Insert a point on a path segment | attrTextLens('d') get→parsePath→splitPathSegment→printPath→put | 6 | 1 |  |
| ☑ | `deletePathPoint` | Delete a point from a path | attrTextLens('d') get→parsePath→deletePathAnchor→printPath→put | 6 | 1 |  |

### Direct manipulation  ·  `manipulationHeader` (H2)

### Handles  ·  `hHandles` (H3)

| ✓ | cell | user | how | LOC | CC | ⚠ |
|---|---|---|---|---|---|---|
| ☑ | `pointsHandles` | — | parsePoints(attrVal points) mapped to {key,kind:anchor,x,y,i} handle objects | 4 | 1 |  |
| ☑ | `pathHandles` | — | parsePath then walk M/L/H/V/C/S/Q/T/A commands tracking abs cursor, emit anchor/ctrl handles with keys | 48 | 18 |  |

### The shape registry  ·  `hShapeRegistry` (H3)

| ✓ | cell | user | how | LOC | CC | ⚠ |
|---|---|---|---|---|---|---|
| ☑ | `numAttr` | — | attrVal + Number(); throws on absent/non-finite so element leaves lens domain, keeps default | 12 | 5 |  |
| ☑ | `numText` | — | String(Math.round(v*1e6)/1e6) — trim float noise to 6dp | 3 | 1 |  |
| ☑ | `geomOf` | — | object of per-tag readers (rect/circle/ellipse/line) pulling numAttr fields with defaults | 13 | 1 |  |
| ☑ | `shapePoints` | Lets you drag polygon/polyline vertices | registry entry: parsePoints/printPoints, reads-guard, handles=pointsHandles, edit replaces pts[h.i] | 12 | 1 |  |
| ☑ | `shapePath` | Lets you drag path anchor and control points | registry entry: parsePath/printPath, handles=pathHandles, edit mutates cmd args honoring rel/base | 14 | 5 |  |
| ☑ | `rxInset` | — | min(10, width/4) — corner-radius handle inset offset | 3 | 1 |  |
| ☑ | `shapeRect` | Lets you move, resize and round-corner a rect | registry entry: geomOf.rect; 8 scale handles + rx ctrl (bijective inset); edit emits only changed attrs | 41 | 8 |  |
| ☑ | `shapeCircle` | Lets you move and resize a circle | registry entry: geomOf.circle; move writes cx/cy; 4 handles; edit sets r from drag distance | 23 | 3 |  |
| ☑ | `shapeEllipse` | Lets you move and resize an ellipse | registry entry: geomOf.ellipse; rotatable; 4 scale + 4 ctrl handles; edit writes changed rx/ry | 28 | 5 |  |
| ☑ | `shapeLine` | Lets you move a line or drag either endpoint | registry entry: geomOf.line; move shifts both endpoints by delta; edit writes x/y per endpoint key | 22 | 1 |  |
| ☑ | `svgShapes` | — | array literal collecting the six shape registry entries | 3 | 1 |  |
| ☑ | `shapeLookup` | — | forMode find by mode; forTag scans tag match + try reads(), falls through to null (offers gizmo) | 12 | 6 |  |
| ☑ | `handleEdit` | — | resolve entry via shapeLookup.forMode, find handle by key, return entry.edit(...) attr writes | 8 | 3 |  |

### Target, writer, overlay, focus  ·  `hPieces` (H3)

| ✓ | cell | user | how | LOC | CC | ⚠ |
|---|---|---|---|---|---|---|
| ☑ | `svgTarget` | — | finds the runtime Variable owning a node, parses its param alias, slices literalSpan to expose doc/elems | 29 | 12 |  |
| ☑ | `holeSpans` | — | scans text for `${` and brace-depth-matches the closing `}` to locate interpolation holes | 16 | 7 |  |
| ☑ | `slotsOf` | — | splits text into num/hole slots via NUM regex between holeSpans, sorted by start | 17 | 4 |  |
| ☑ | `mergeInterpolated` | — | reconciles numeric slots in source against rendered/nextRendered number arrays; keeps holes, reports locked slots | 21 | 6 |  |
| ☑ | `settle` | — | async-polls variable._value every 8ms until it changes from previous, up to 80 tries | 10 | 4 |  |
| ☑ | `svgWriter` | Dragging a shape rewrites the SVG source, one undo per gesture | realize+self.define redefines cell; commit/commitMany/runCommand route puts through lenses; three sinks (literal/upstream/locked); emits lens-put | 166 | 62 |  |
| ☑ | `svgOverlay` | Selection handles, guides and previews drawn over the drawing | createElementNS two `<g>` layers (element-space + root-space), CSS style, alignTo via inverse screen-CTM matrix | 54 | 12 |  |
| ☑ | `boxInRoot` | — | maps element getBBox corners into root user space via inverse screen-CTM, returns axis-aligned bounds | 16 | 7 |  |
| ☑ | `topmostPaths` | — | filters out any path that is a descendant prefix of a shorter selected path | 7 | 3 |  |
| ☑ | `zTarget` | — | maps front/back/raise/lower to a clamped target index given from/count | 11 | 5 |  |
| ☑ | `svgFocus` | Select shapes/vertices, see handles, multi-select and rotate-pivot | path-address selection set; paint() draws boxes/handles/chips via overlay; rebase across edits; nodeAt/attrVal/vertexAddress | 135 | 66 |  |

### The delta framework  ·  `hDelta` (H3)

| ✓ | cell | user | how | LOC | CC | ⚠ |
|---|---|---|---|---|---|---|
| ☑ | `grabPointer` | — | node.setPointerCapture(e.pointerId) wrapped in try/catch | 3 | 2 |  |
| ☑ | `gestureDelta` | — | factory of tagged delta constructors (attr/command/clip/select/view/readout) plus text() lens-put | 17 | 2 |  |
| ☑ | `previewDelta` | Live preview of the edit while dragging | setAttribute on target elems for attr deltas; adds/replaces keyed overlay view marks; sets cursor | 26 | 13 |  |
| ☑ | `commitDelta` | Releasing a drag commits it as one undoable edit | routes deltas to writer.commitMany (all-attr) or per-delta commit/runCommand/clipboard/focus select | 29 | 16 |  |
| ☑ | `revertDelta` | Cancelling a drag restores the original attributes | restores each attr delta's `was` value (or removeAttribute), then overlay.clear + focus.refresh | 13 | 8 |  |

### Tools  ·  `hTools` (H3)

| ✓ | cell | user | how | LOC | CC | ⚠ |
|---|---|---|---|---|---|---|
| ☑ | `moveVertices` | Drag a multi-vertex selection; all move together | parsePath/parsePoints walk, offset selected anchors (and coupled ctrl handles) by dlx/dly, reprint d/points | 51 | 35 |  |
| ☑ | `toolVertex` | Grab, drag, band-select, and multi-drag path/polygon vertices | pointer handlers: vertexAddress ordinals, pathSmooth.couple/handleEdit/moveVertices → gestureDelta preview+commit; vband marquee | 125 | 68 |  |
| ☑ | `scopedPath` | — | slice a path to one level below the active scope prefix, else root child | 7 | 5 |  |
| ☑ | `hitTest` | Click near a thin stroke still selects it | document.elementsFromPoint first, else sample getPointAtLength via getScreenCTM within px tolerance | 27 | 12 |  |
| ☑ | `snapRects` | Dragged shape snaps to neighbours' edges/centres with guides | compare moving box edge/centre lines to others within tol, emit dx/dy and guide segments | 29 | 15 |  |
| ☑ | `moveTargetOf` | — | build move target: invert parent/element CTMs (Slin/Elin), read transform text and translateLens base | 15 | 10 |  |
| ☑ | `moveDeltas` | — | map screen delta through Elin/Slin to shape-native attrs or transform; null-edit skip; gestureDelta.attr | 24 | 12 |  |
| ☑ | `toolMove` | Drag shapes, snap, axis-lock, and alt-drag to duplicate | pointer handlers: pick+moveTargetOf targets, threshold dead-zone, snapRects hysteresis, moveDeltas; alt uses copy/offset/pasteMarkup | 117 | 56 |  |
| ☑ | `toolZoom` | Wheel to zoom, middle-drag to pan the canvas | onWheel ctx.zoomAt(pow), middle-button onPointerDown pan via ctx.panBy | 25 | 4 |  |
| ☑ | `toolScope` | Double-click into a group to edit its children | onDblClick: scopedPath one level deeper, ctx.setScope, re-pick, commit select delta | 23 | 8 |  |
| ☑ | `toolMarquee` | Rubber-band select multiple shapes on empty canvas | pointer band via dragBox overlay rect, rootBox intersection test, scopedPath dedupe, gestureDelta.select commit | 54 | 24 |  |
| ☑ | `toolStructure` | Double-click to insert/delete path & polygon points or add shapes | onDblClick dispatches on focus.mode: insert/deletePoint, insert/deletePathPoint, insertElement via gestureDelta.command | 64 | 29 | #2 |
| ☑ | `toolTransform` | Drag gizmo handles to scale, rotate, and move the pivot | pointer handlers: rotateAbout/scaleAbout on opsLens, alt-symmetric, shift-snap angle/aspect; preview+commit transform delta | 81 | 42 |  |
| ☑ | `dragBox` | — | normalise two corners to {x,y,width,height,x1,y1}; optional square constraint | 12 | 4 |  |
| ☑ | `shapeSpec` | — | map kind+corners (via dragBox) to {tag,attrs} for rect/ellipse/line with default fill/stroke | 17 | 7 |  |
| ☑ | `shapeMarkup` | — | serialise shapeSpec's {tag,attrs} to an SVG element string | 6 | 1 |  |
| ☑ | `penPath` | — | pen path-string builder: start/lineTo/curveTo/mirror/close helpers for M/L/C/Z d-strings | 9 | 2 |  |
| ☑ | `toolDraw` | Drag to draw a rectangle, ellipse or line | pointer handlers build a live overlay.addRoot preview; on release ctx.addShape + gestureDelta.select commits the new shape | 56 | 21 |  |
| ☑ | `toolPen` | Draw Bezier paths by clicking anchors and dragging handles | pointer down/move/up build the `d` attr via penPath (lineTo/curveTo/close); freeEnd resumes an open path, near-start closes it | 123 | 48 |  |
| ☑ | `fitCurve` | — | Schneider least-squares cubic-Bezier fitting: chord param, Newton reparam, corner-angle splitting, recursive subdivide on max error | 77 | 30 |  |
| ☑ | `toolScribble` | Freehand-draw a stroke that smooths into a clean path | collect decimated polyline points, run fitCurve to Bezier segments, emit an M/C `d` and ctx.addShape a path | 50 | 18 |  |

### The gesture-law harness  ·  `hHarness` (H3)

| ✓ | cell | user | how | LOC | CC | ⚠ |
|---|---|---|---|---|---|---|
| ☑ | `gestureFixture` | — | one reused runtime.module + realize()d source mounts a lens node; exposes doc/elems/historyDepth/boxGap probes and lens-put put log | 53 | 10 |  |
| ☑ | `playGesture` | — | dispatch synthetic PointerEvent/Wheel/Keyboard, wait quiet-until-idle on puts; tap/drag/hold/dblclick/wheel/press step builders | 59 | 19 |  |
| ☑ | `gestureCorpus` | — | object literal of SVG test strings (basic/residue/broken) plus named hit-point coordinates | 20 | 1 |  |
| ☑ | `withFixture` | — | Promise-queue serialises mount → run fn → destroy so co-located fixtures never share a hit-test screen | 16 | 1 |  |
| ☑ | `test_gesture_identity` | — | T1: null taps and cancelled drags leave doc/elemCount/historyDepth unchanged; domShape live==fromSource after cancel | 30 | 12 |  |
| ☑ | `test_gesture_path_independence` | — | T2: straight vs 5-leg wander drag to same endpoint must commit identical bytes, both axis-locked and free | 22 | 6 |  |
| ☑ | `test_gesture_commits_against_its_origin` | — | T4: marquee two elements, drag; assert every selected box moved same delta in exactly one undo entry | 27 | 7 |  |
| ☑ | `test_gesture_confinement` | — | T6: a false-returning tool at head or tail of the registry leaves the committed result identical to baseline | 20 | 6 |  |
| ☑ | `test_gesture_selection_is_not_an_edit` | — | T9: marquee bands select elements but never change doc or historyDepth; empty band leaves no selection | 18 | 7 |  |
| ☑ | `test_tools_measure_through_ctx` | — | regex tool handler .toString() for banned geometry APIs (getBBox/getScreenCTM…) vs required ctx.* measurements | 18 | 7 |  |
| ☑ | `test_tools_write_through_the_delta` | — | regex handlers: setAttribute only on overlay.add-owned nodes, and no ctx.writer.commit/runCommand outside commitDelta | 25 | 9 |  |
| ☑ | `domShape` | — | recursive {tag,attrs,kids} serialiser excluding overlay/style; live(node) vs fromSource(text) via DOMParser JSON compare | 24 | 11 |  |
| ☑ | `test_gesture_render_consistency` | — | T5: after move/gizmo/vertex gestures assert live==fromSource and boxGap<1.5px, incl. a shape inside a transformed group | 25 | 6 |  |
| ☑ | `test_gesture_rebase_agreement` | — | withFixture runs 7 structural commands; asserts each command's rebase maps every old address to the same element or drops it | 43 | 13 |  |
| ☑ | `test_gesture_partiality` | — | playGesture tap/dblclick on unreadable polygon+arc corpus; asserts doc/elemCount unchanged and handles offered but no guessed edit | 27 | 9 |  |
| ☑ | `test_gesture_view_is_not_an_edit` | — | playGesture wheel/pan/fit assert no source write or undo; same drag commits identical bytes at zoom 1 and 2.5 | 43 | 15 |  |
| ☑ | `test_gesture_hit_agreement` | — | compares hover rect box to selection box within 1.5px per point; verifies group descend/ascend and stroke-only hittability | 52 | 19 |  |
| ☑ | `gestureLaws` | — | object mapping T1–T11 names to test fns with async run() awaiting each and catching failures into a results map | 23 | 3 |  |
| ☑ | `frameBudget` | — | requestAnimationFrame sampling focusPaths/boxGap/scale through a drag; asserts selection held, overlay <2px, no scale flash (B3) | 36 | 15 |  |

### Commands and affordances  ·  `hCommands` (H3)

| ✓ | cell | user | how | LOC | CC | ⚠ |
|---|---|---|---|---|---|---|
| ☑ | `toolHover` | Outlines the shape under the cursor before you click | onHover ctx.pick→previewDelta gestureDelta.view rect.hover box (skips already-selected); clears outline on onPointerLeave | 17 | 8 |  |
| ☑ | `viewof svgTools` | — | Inputs.input([...tools]) reactive array registry, toolAffordance first so chip presses are claimed before handle/move tools | 3 | 1 |  |
| ☑ | `toolAffordance` | Drag chips/handles on a selection to edit it | onPointerDown reads dataset.aff, grabPointer + drag preview/commit via provider; dispatches command or tap; onCancel reverts | 45 | 20 |  |
| ☑ | `cmdGroup` | Group selected shapes into a <g> (Mod-g) | plan() groupPlan siblings check→gestureDelta.command(groupElements) with rebaseMoves mapping members inside new group | 18 | 3 |  |
| ☑ | `cmdUngroup` | Dissolve selected group(s) back into shapes (Mod-Shift-g) | filter unblocked groups, descending sort, per-group gestureDelta.command(ungroupElements) with rebaseMoves spreading children | 22 | 7 |  |
| ☑ | `cmdDuplicate` | Duplicate selected shapes offset by a nudge (Mod-d) | copyMarkup→offsetMarkup→pasteMarkup appended at end; rebase null (no address moves), select new copies | 18 | 5 | #5 |
| ☑ | `cmdCopy` | Copy selection to the clipboard (Mod-c) | gestureDelta.clip(copyMarkup(env.src, env.paths)) | 9 | 2 |  |
| ☑ | `cmdCut` | Cut selection to the clipboard (Mod-x) | gestureDelta.clip then descending-order deleteElement commands each with rebasePath delete; last clears selection | 20 | 7 |  |
| ☑ | `cmdPaste` | Paste clipboard, offset or in place (Mod-v / Mod-Shift-v) | factory (inPlace)=>cmd; pasteMarkup into scope parent at childCount, offsetMarkup unless in-place; select pasted | 18 | 12 | #5 |
| ☑ | `alignSpecs` | — | literal array of [id,label,axis,frac] tuples describing the six align commands | 5 | 1 |  |
| ☑ | `cmdAlign` | Align 2+ shapes to a common edge or centre | factory over spec; compute target edge from box min/max/mid, emit moveDeltas per shape with 1e-4 quantise | 19 | 10 |  |
| ☑ | `cmdDistribute` | Distribute shapes evenly by centre spacing | plan() computes equal gaps between sorted centres, fans out moveDeltas per element with 1e-4 quantization | 22 | 10 |  |
| ☑ | `pathSmooth` | — | handle-based path algebra: smooth-anchor detection, mirrored handle coupling, L↔C promote/demote, smooth/corner toggle via attrTextLens.put | 127 | 63 |  |
| ☑ | `cmdToggleSmooth` | Toggle a path vertex between smooth and corner | command gating on one selected anchor; delegates to pathSmooth.toggle inside gestureDelta.command, declines when null (T8) | 15 | 5 |  |
| ☑ | `cmdDeleteVertex` | Delete selected path/polygon vertices | maps anchors to deletePoint/deletePathPoint deltas via pathSegments/pathHandles; guards polygon min-2; one element at a time | 35 | 12 | #2 |
| ☑ | `cmdClosePath` | Close or open selected paths | regex-append/strip trailing Z on the d attribute via attrTextLens; skips already-as-asked paths (T1) | 21 | 10 |  |
| ☑ | `cmdSelect` | Select all / none / same-fill / same-tag | factory keyed by kind; filters container children by fill/tag match, emits gestureDelta.select of paths | 22 | 14 |  |
| ☑ | `pathConvert` | — | segment-kind conversion registry (L/C/Q/A); endpoint→cubic arc parameterisation; absoluteGroup before S/T neighbours; replaceGroup rewrite | 79 | 21 |  |
| ☑ | `cmdConvertSegment` | Straighten/curve/quadratic-ize a path segment | maps selected anchors to segment indices, fans out gestureDelta.command calling pathConvert.convert, re-reads node per commit | 35 | 13 |  |
| ☑ | `cmdAddGradient` | Fill a shape with a new linear gradient | mintId a linearGradient, defsInsert it, point fill at url(#id) via setProperty+attrTextLens.put | 22 | 7 | #4 |
| ☑ | `cmdAddMarker` | Add an arrowhead marker to a stroked path | mintId a marker, defsInsert it, set marker-end to url(#id) via setProperty+attrTextLens.put | 22 | 7 | #4 |
| ☑ | `svgCommands` | — | plain array concatenating all command specs (group/align/distribute/vertex/select/convert/gradient/marker) — headless-testable, no view | 9 | 1 |  |
| ☑ | `svgAffordances` | On-shape chips: duplicate, swap paint, stroke-width drag, path verbs, gradient/marker | array of affordance specs with applies/glyph/tap/drag; commits through ctx.node.setField, re-reading node each write; command-backed chips | 59 | 16 |  |
| ☑ | `commandLookup` | — | byId finder plus forEvent keyboard matcher parsing Mod-/Shift-/Alt- key strings against event modifiers | 16 | 9 |  |
| ☑ | `svgTools` | — | viewof value: (G,_) => G.input(_) | 1 | 1 |  |

### Assembly  ·  `hAssembly` (H3)

| ✓ | cell | user | how | LOC | CC | ⚠ |
|---|---|---|---|---|---|---|
| ☑ | `lensState` | — | new Map() — per-Variable shared editor state that outlives remounts | 3 | 1 |  |
| ☑ | `svgLens` | The editor itself: attach interactive SVG editing to a node | factory wiring target/writer/overlay/focus, zoom/pan view, tool dispatch, live-ctx facade routing to current node, MutationObserver view handover | 527 | 197 |  |


## Overlaps, ranked by lines-of-code impact

Found by cross-referencing the `user` column across all 341 cells. Each is a real duplication a
reader can confirm from the named cells. This is the dedupe/refactor queue; work top-down, each
change gated by the 59 laws staying green.

| # | sev | kind | LOC | shared job | cells | dedupe |
|---|---|---|---|---|---|---|
| 1 | high | both | 101 | Edit the selected shape's attributes / paint (fill, stroke, width, opacity) | `inspector` `fieldPanel` | Merge into one properties panel driven by the svgFields registry with a single setField write path; drop inspector's separate setAttr path. |
| 2 | medium | ui-consistency | 99 | Delete a path/polygon vertex | `toolStructure` `cmdDeleteVertex` | Have the double-click handler dispatch the cmdDeleteVertex command rather than re-building deletePoint/deletePathPoint deltas itself; one delete implementation, two triggers. |
| 3 | medium | both | 65 | Capture and display lens-put events with law checks | `putTable` `lawBadges` `sinkRecord` `edits` `putLog` | Feed one shared put-log buffer and render everywhere through the reusable lawBadges component; remove putTable/sinkRecord's independent listeners and bespoke tables. |
| 4 | medium | code-duplication | 44 | Add a <defs> entry and point an attribute at url(#id) | `cmdAddGradient` `cmdAddMarker` | Extract one helper (mintId + defsInsert + setProperty at url(#id)) parameterised by def markup and target attribute; both commands become thin callers. |
| 5 | medium | code-duplication | 36 | Copy, offset and paste a duplicate of the selection | `cmdDuplicate` `cmdPaste` | Share one offset-paste routine; cmdDuplicate becomes copy-then-invoke cmdPaste with offset, removing the repeated copyMarkup->offsetMarkup->pasteMarkup chain. |
| 6 | low | code-duplication | 28 | Find the segment of a shape nearest a point | `nearestSegment` `nearestPathSegment` | Unify into one nearest-segment routine over a normalized segment list (pathSegments already normalizes both polygon edges and path curves). |

Total LOC in overlapping cells: 373.

### Dedupe tasks (top-down)

**Status (2026-07-24): 5 of 6 refactored, #6 declined. All 59 laws + 6 bundle invariants green
after each change, and every changed path live-verified in a real runtime (headless QA).** Two new
helper cells hold the shared logic: `defsCommand` (`_sl300`) and `pasteInto` (`_sl301`). The line
count is roughly flat (+103/−101) because the census's "LOC" summed whole cells, not the removable
portion — the win is one implementation per job, not fewer lines.

- [x] **#1 · Edit the selected shape's attributes / paint** (high) — **done.** `inspector` now hides
  any attribute the `svgFields` registry owns (fill, stroke, width, opacity…) so paint lives only in
  `fieldPanel`; its writes route through `node.setProperty` (style-aware) and `node.setAttr` is
  **removed**. One paint surface, one write path. Verified live: a selected rect shows only
  `x/y/width/height` in the inspector, `Fill`/`Stroke` only in fieldPanel.
- [x] **#2 · Delete a path/polygon vertex** (medium) — **done.** The double-click handler in
  `toolStructure` resolves the clicked handle to a vertex ordinal and dispatches
  `cmdDeleteVertex.plan(env)`, rather than rebuilding `deletePoint`/`deletePathPoint` deltas. One
  delete implementation, two triggers. Verified live end-to-end: a real `dblclick` on a polygon's
  middle vertex handle removed exactly that vertex (3→2 points).
- [x] **#3 · Capture and display lens-put events** (medium) — **done.** `putTable` now reads the
  shared `putLog` (the "drawing" rows `edits` already records), dropping its own duplicate
  `Generators.observe` listener on `viewof drawing` — the same pattern `sinkRecord` already used.
  `lawBadges` was already the shared per-demo component (no change). Verified live: 6 putLog drawing
  rows → putTable rendered 6 rows reactively.
- [x] **#4 · Add a <defs> entry and point an attribute at url(#id)** (medium) — **done.** Extracted
  `defsCommand` factory (mintId + setProperty + attrTextLens.put + defsInsert), parameterised by
  `{tags, sourceAttr, targetAttr, prefix, markup}`. `cmdAddGradient`/`cmdAddMarker` are thin callers.
  Verified live: add-gradient inserted `<defs><linearGradient id="grad1">` and set fill to `url(#grad1)`.
- [x] **#5 · Copy, offset and paste a duplicate of the selection** (medium) — **done.** Extracted
  `pasteInto(id, parent, markups, at, d)` — the shared offset→pasteMarkup→select tail. `cmdDuplicate`
  and `cmdPaste` both call it. Verified live: duplicate produced an offset copy (`translate(8 8)`).
- [x] **#6 · Find the segment of a shape nearest a point** (low) — **declined (false positive).**
  `nearestSegment` does *exact* perpendicular projection on straight edges (a test asserts
  `distance === 1`); `nearestPathSegment` *samples* Bézier curves (projection has no closed form).
  They share zero code. Merging would break the exactness test or add an adapter longer than either
  function — so correctness forbids it. Kept split by design. Cells: `nearestSegment`, `nearestPathSegment`.
