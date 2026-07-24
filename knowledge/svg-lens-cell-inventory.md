# svg-lens cell inventory

Working document for the consistency/refactoring phase (architecture §9). One task per cell:
inventory **what it does for the user** and **how it does it** (implementation). LOC/CC are
pre-filled from the canonical `code-metrics` pipeline. The overlap pass at the end feeds the
dedupe/refactor work, ranked by lines-of-code impact.

`user` = the user-facing job (`—` if purely internal) · `how` = implementation approach. Fill
`user` and `how` per row as it is inventoried; tick ☑ when done.

341 registered cells.


| done | cell | user | how | LOC | CC |
|---|---|---|---|---|---|
| ☑ | `intro` | title + one-line pitch | static `md` | 2 | 1 |
| ☑ | `loadSvg` | load your own .svg into the editor | `<input type=file>`; strips XML prolog/DOCTYPE/BOM, rejects markup `outsideDomain` can't address, commits via `drawing.edit("load")` | 39 | 11 |
| ☑ | `toolbar` | tool buttons (V/R/E/L/P/S) **and the whole keyboard driver** (undo/redo, z-order, nudge, delete, tool hotkeys) | button row bound to `setTool`; global `keydown` mapping keys→tools/commands; highlights active tool | 124 | 57 |
| ☑ | `viewof drawing` | the main editable drawing (flagship demo canvas) | `svgLens(svg`…`)` over a hand-written scene | 17 | 1 |
| ☑ | `drawing` | — | `viewof` value | 1 | 1 |
| ☑ | `inspector` | type exact attribute values for the selection; jump to a referenced `<defs>` node | reads `describe().attrs`, one `Inputs.text` per attr, commits via **`node.setAttr`** (raw `setAttribute`) ⚠ **overlaps `fieldPanel` on fill/stroke, different write path** | 43 | 6 |
| ☑ | `fieldPanel` | edit paint & stroke (fill, stroke, width, opacity, dash, enums) as typed widgets | projects `drawing.fields()`, commits via **`node.setField`→`setProperty`** (style-aware) ⚠ **overlaps `inspector`** | 58 | 23 |
| ☑ | `howToDrive` | the gestures + keys cheat-sheet | static `md` tables | 36 | 1 |
| ☑ | `putTable` | live table of the last 8 edits with GetPut/PutGet law badges | `Generators.observe` on `lens-put`, `Inputs.table` ⚠ **shares the "put log" job with `edits`/`putLog`/`sinkRecord`** | 16 | 3 |

### Use it in your own notebook  ·  `useIt` (H2)

| done | cell | user | how | LOC | CC |
|---|---|---|---|---|---|
| ☑ | `putLog` | — | shared `[]` buffer of edit events (backs `edits`/`sinkRecord`) | 3 | 1 |
| ☑ | `edits` | — | `Generators.observe` piping `lens-put` from drawing+factory into `putLog` ⚠ **put-log plumbing, cf `putTable`** | 11 | 3 |
| ☑ | `viewof svgLensModule` | — | `thisModule()` handle for self-export | 3 | 1 |
| ☑ | `svgLensModule` | — | `viewof` value | 1 | 1 |
| ☑ | `keepYourEdits` | download this notebook with your edits baked in | reads `viewof drawing` `_definition` via `lookupVariable`, `downloadAnchor` saves the whole page | 13 | 5 |
| ☐ | `paperHeader` | prose ·  | | 3 | 1 |

### §problem  ·  `problemH` (paper section)

| done | cell | user | how | LOC | CC |
|---|---|---|---|---|---|
| ☐ | `problemP` | prose ·  | | 4 | 1 |

### §lenses  ·  `lensesH` (paper section)

| done | cell | user | how | LOC | CC |
|---|---|---|---|---|---|
| ☐ | `lensesP` | prose ·  | | 7 | 1 |

### §laws  ·  `lawsH` (paper section)

| done | cell | user | how | LOC | CC |
|---|---|---|---|---|---|
| ☐ | `lawsP` | prose ·  | | 13 | 1 |

### §residue  ·  `residueH` (paper section)

| done | cell | user | how | LOC | CC |
|---|---|---|---|---|---|
| ☐ | `residueP` | prose ·  | | 22 | 1 |

### §tower  ·  `towerH` (paper section)

| done | cell | user | how | LOC | CC |
|---|---|---|---|---|---|
| ☐ | `towerP` | prose ·  | | 19 | 1 |

### §architecture  ·  `architectureH` (paper section)

| done | cell | user | how | LOC | CC |
|---|---|---|---|---|---|
| ☐ | `architectureP` | prose ·  | | 7 | 1 |

### §propagation  ·  `propagationH` (paper section)

| done | cell | user | how | LOC | CC |
|---|---|---|---|---|---|
| ☐ | `propagationP` | prose ·  | | 17 | 1 |

### §rect  ·  `rectH` (paper section)

| done | cell | user | how | LOC | CC |
|---|---|---|---|---|---|
| ☐ | `rectP` | prose ·  | | 17 | 1 |
| ☐ | `lawBadges` |  | | 22 | 4 |
| ☐ | `viewof rectDemo` |  | | 6 | 1 |
| ☐ | `rectDemo` |  | | 1 | 1 |
| ☐ | `rectDemoLaws` |  | | 3 | 1 |

### §children  ·  `childrenH` (paper section)

| done | cell | user | how | LOC | CC |
|---|---|---|---|---|---|
| ☐ | `childrenP` | prose ·  | | 19 | 1 |
| ☐ | `viewof childrenDemo` |  | | 10 | 1 |
| ☐ | `childrenDemo` |  | | 1 | 1 |
| ☐ | `childrenDemoOps` |  | | 22 | 5 |

### §sinks  ·  `sinksH` (paper section)

| done | cell | user | how | LOC | CC |
|---|---|---|---|---|---|
| ☐ | `sinksP` | prose ·  | | 25 | 1 |
| ☐ | `factoryDoc` | prose ·  | | 9 | 1 |
| ☐ | `viewof shift` |  | | 3 | 1 |
| ☐ | `shift` |  | | 1 | 1 |
| ☐ | `viewof spin` |  | | 3 | 1 |
| ☐ | `spin` |  | | 1 | 1 |
| ☐ | `viewof factory` |  | | 10 | 1 |
| ☐ | `factory` |  | | 1 | 1 |
| ☐ | `sinkRecord` |  | | 13 | 4 |

### §tools  ·  `toolsH` (paper section)

| done | cell | user | how | LOC | CC |
|---|---|---|---|---|---|
| ☐ | `toolsP` | prose ·  | | 32 | 1 |

### §toollaws  ·  `toollawsH` (paper section)

| done | cell | user | how | LOC | CC |
|---|---|---|---|---|---|
| ☐ | `toollawsP` | prose ·  | | 42 | 1 |

### §related  ·  `relatedH` (paper section)

| done | cell | user | how | LOC | CC |
|---|---|---|---|---|---|
| ☐ | `relatedP` | prose ·  | | 46 | 1 |

### §future  ·  `futureH` (paper section)

| done | cell | user | how | LOC | CC |
|---|---|---|---|---|---|
| ☐ | `futureP` | prose ·  | | 21 | 1 |

### References  ·  `referencesH` (H2)

| done | cell | user | how | LOC | CC |
|---|---|---|---|---|---|
| ☐ | `referencesList` |  | | 3 | 1 |
| ☐ | `appendixHeader` | prose ·  | | 3 | 1 |
| ☐ | `externalLink` |  | | 3 | 1 |
| ☐ | `sections` |  | | 18 | 1 |
| ☐ | `sectionIndex` |  | | 17 | 4 |
| ☐ | `sec` |  | | 9 | 3 |
| ☐ | `ref` |  | | 10 | 2 |
| ☐ | `bibliography` |  | | 124 | 1 |
| ☐ | `cite` |  | | 10 | 2 |
| ☐ | `references` |  | | 7 | 1 |
| ☐ | `testsDashboard` |  | | 3 | 1 |

### Property-test harness  ·  `harnessHeader` (H2)

| done | cell | user | how | LOC | CC |
|---|---|---|---|---|---|
| ☐ | `NUM_RUNS` |  | | 3 | 1 |
| ☐ | `mulberry32` |  | | 9 | 1 |
| ☐ | `arb` |  | | 98 | 23 |
| ☐ | `forAll` |  | | 12 | 6 |
| ☐ | `checkLens` |  | | 8 | 1 |

### Tests  ·  `testsHeader` (H2)

| done | cell | user | how | LOC | CC |
|---|---|---|---|---|---|
| ☐ | `test_viewBoxLens_laws` | test ·  | | 7 | 1 |
| ☐ | `test_pointsLens_laws` | test ·  | | 7 | 1 |
| ☐ | `test_transformLens_laws` | test ·  | | 7 | 1 |
| ☐ | `test_pathLens_laws` | test ·  | | 7 | 1 |
| ☐ | `test_attr_laws` | test ·  | | 7 | 2 |
| ☐ | `test_child_laws` | test ·  | | 11 | 1 |
| ☐ | `test_compose_nodeViewBox_laws` | test ·  | | 7 | 1 |
| ☐ | `test_invert_involution` | test ·  | | 9 | 1 |
| ☐ | `test_exact_roundtrips` | test ·  | | 13 | 1 |
| ☐ | `test_putput_skip_rule_corner` | test ·  | | 30 | 10 |
| ☐ | `test_applyPoint_screen_roundtrip` | test ·  | | 14 | 2 |
| ☐ | `test_translateLens_laws` | test ·  | | 15 | 3 |
| ☐ | `test_literalLens_laws` | test ·  | | 7 | 1 |
| ☐ | `test_attrTextLens_laws` | test ·  | | 7 | 1 |
| ☐ | `test_cellSourceLens_laws` | test ·  | | 7 | 1 |
| ☐ | `test_source_residue_preserved` | test ·  | | 15 | 3 |
| ☐ | `test_childrenLens_laws` | test ·  | | 15 | 2 |
| ☐ | `test_structural_commands` | test ·  | | 24 | 8 |
| ☐ | `test_point_commands` | test ·  | | 23 | 7 |
| ☐ | `test_nearestSegment` | test ·  | | 13 | 7 |
| ☐ | `test_opsLens_laws` | test ·  | | 28 | 14 |
| ☐ | `test_transform_gizmo` | test ·  | | 47 | 10 |
| ☐ | `test_commands_commute` | test ·  | | 20 | 4 |
| ☐ | `test_scoped_path` | test ·  | | 34 | 10 |
| ☐ | `test_shape_registry` | test ·  | | 92 | 21 |
| ☐ | `test_shape_creation` | test ·  | | 33 | 10 |
| ☐ | `test_domain_boundary` | test ·  | | 33 | 9 |
| ☐ | `test_units_and_style` | test ·  | | 45 | 18 |
| ☐ | `test_interpolation_slots` | test ·  | | 32 | 20 |
| ☐ | `test_refs` | test ·  | | 25 | 11 |
| ☐ | `test_snapRects` | test ·  | | 30 | 17 |
| ☐ | `test_topmost_selection` | test ·  | | 15 | 2 |
| ☐ | `test_z_order` | test ·  | | 24 | 10 |
| ☐ | `test_pen_path` | test ·  | | 35 | 21 |
| ☐ | `test_path_subdivision_exact` | test ·  | | 64 | 27 |
| ☐ | `test_rebasePath` | test ·  | | 44 | 11 |
| ☐ | `test_group_ungroup` | test ·  | | 52 | 12 |
| ☐ | `test_rebase_vertex` | test ·  | | 85 | 36 |
| ☐ | `test_copy_paste` | test ·  | | 38 | 14 |
| ☐ | `test_path_smooth` | test ·  | | 59 | 15 |
| ☐ | `test_align_commands` | test ·  | | 58 | 20 |
| ☐ | `test_parse_vs_DOMParser` | test ·  | | 69 | 24 |

### Lens core  ·  `coreHeader` (H2)

| done | cell | user | how | LOC | CC |
|---|---|---|---|---|---|
| ☐ | `lens` |  | | 3 | 1 |
| ☐ | `compose` |  | | 6 | 1 |
| ☐ | `isoToLens` |  | | 3 | 1 |
| ☐ | `lensLaws` |  | | 7 | 1 |
| ☐ | `isoLaws` |  | | 6 | 1 |

### SVG lenses  ·  `svgHeader` (H2)

| done | cell | user | how | LOC | CC |
|---|---|---|---|---|---|
| ☐ | `parseNumList` |  | | 11 | 3 |
| ☐ | `parseViewBox` |  | | 7 | 2 |
| ☐ | `printViewBox` |  | | 3 | 1 |
| ☐ | `rectEq` |  | | 3 | 4 |
| ☐ | `viewBoxLens` |  | | 3 | 2 |
| ☐ | `parsePoints` |  | | 9 | 3 |
| ☐ | `printPoints` |  | | 3 | 1 |
| ☐ | `pointsEq` |  | | 3 | 3 |
| ☐ | `pointsLens` |  | | 3 | 2 |

### Matrices and the CTM  ·  `hMatrices` (H3)

| done | cell | user | how | LOC | CC |
|---|---|---|---|---|---|
| ☐ | `IDENTITY` |  | | 3 | 1 |
| ☐ | `matEq` |  | | 3 | 1 |
| ☐ | `multiply` |  | | 14 | 1 |
| ☐ | `applyPoint` |  | | 3 | 1 |
| ☐ | `ctmMat` |  | | 3 | 1 |
| ☐ | `opToMat` |  | | 38 | 17 |

### Transforms and the gizmo  ·  `hTransforms` (H3)

| done | cell | user | how | LOC | CC |
|---|---|---|---|---|---|
| ☐ | `parseTransform` |  | | 12 | 3 |
| ☐ | `printTransform` |  | | 3 | 1 |
| ☐ | `transformLens` |  | | 3 | 2 |
| ☐ | `parseTransformOps` |  | | 14 | 3 |
| ☐ | `translateLens` |  | | 18 | 11 |
| ☐ | `printOp` |  | | 3 | 1 |
| ☐ | `opsLens` |  | | 12 | 8 |
| ☐ | `opSlot` |  | | 6 | 3 |
| ☐ | `holdFixed` |  | | 13 | 11 |
| ☐ | `setGizmoOp` |  | | 11 | 3 |
| ☐ | `rotateAbout` |  | | 3 | 1 |
| ☐ | `scaleAbout` |  | | 3 | 1 |
| ☐ | `rotateHandle` |  | | 7 | 1 |
| ☐ | `transformHandles` |  | | 9 | 1 |

### Inverse, and reading a node  ·  `hInverse` (H3)

| done | cell | user | how | LOC | CC |
|---|---|---|---|---|---|
| ☐ | `det` |  | | 3 | 1 |
| ☐ | `invert` |  | | 8 | 3 |
| ☐ | `invertIso` |  | | 3 | 1 |
| ☐ | `matApproxEq` |  | | 6 | 1 |
| ☐ | `nodeEq` |  | | 11 | 6 |
| ☐ | `attr` |  | | 11 | 3 |
| ☐ | `requiredAttr` |  | | 9 | 2 |
| ☐ | `child` |  | | 14 | 5 |

### Path data  ·  `hPathData` (H3)

| done | cell | user | how | LOC | CC |
|---|---|---|---|---|---|
| ☐ | `PATH_ARG_COUNT` |  | | 3 | 1 |
| ☐ | `pathEq` |  | | 4 | 4 |
| ☐ | `parsePath` |  | | 21 | 7 |
| ☐ | `printPath` |  | | 3 | 2 |
| ☐ | `pathLens` |  | | 3 | 2 |

### Source lenses  ·  `sourceHeader` (H2)

| done | cell | user | how | LOC | CC |
|---|---|---|---|---|---|
| ☐ | `literalSpan` |  | | 33 | 21 |
| ☐ | `literalSafe` |  | | 18 | 7 |
| ☐ | `literalLens` |  | | 11 | 3 |

### The document: tokenizer and tree  ·  `hTokenizer` (H3)

| done | cell | user | how | LOC | CC |
|---|---|---|---|---|---|
| ☐ | `scan` |  | | 46 | 23 |
| ☐ | `outsideDomain` |  | | 16 | 8 |
| ☐ | `tokenize` |  | | 7 | 2 |
| ☐ | `parseDoc` |  | | 25 | 9 |
| ☐ | `nodeAt` |  | | 7 | 3 |
| ☐ | `pathOfIndex` |  | | 12 | 5 |

### Attributes, style, length, references  ·  `hAttrLenses` (H3)

| done | cell | user | how | LOC | CC |
|---|---|---|---|---|---|
| ☐ | `attrVal` |  | | 7 | 3 |
| ☐ | `effectiveAttr` |  | | 9 | 7 |
| ☐ | `spliceAttr` |  | | 13 | 4 |
| ☐ | `attrTextLens` |  | | 10 | 4 |
| ☐ | `pathOfId` |  | | 12 | 5 |
| ☐ | `refsOf` |  | | 13 | 4 |
| ☐ | `parseLength` |  | | 7 | 3 |
| ☐ | `printLength` |  | | 3 | 2 |
| ☐ | `lengthLens` |  | | 9 | 2 |
| ☐ | `parseStyle` |  | | 7 | 2 |
| ☐ | `printStyle` |  | | 3 | 1 |
| ☐ | `styleLens` |  | | 7 | 4 |
| ☐ | `setProperty` |  | | 8 | 4 |

### The field registry  ·  `hFields` (H3)

| done | cell | user | how | LOC | CC |
|---|---|---|---|---|---|
| ☐ | `svgFields` |  | | 31 | 6 |
| ☐ | `cellAttrLens` |  | | 3 | 1 |

### The children lens, and structural edits  ·  `hStructural` (H3)

| done | cell | user | how | LOC | CC |
|---|---|---|---|---|---|
| ☐ | `childrenLens` |  | | 27 | 13 |
| ☐ | `insertElement` |  | | 9 | 3 |
| ☐ | `deleteElement` |  | | 11 | 4 |
| ☐ | `reorderElement` |  | | 11 | 3 |
| ☐ | `mintId` |  | | 7 | 2 |
| ☐ | `defsInsert` |  | | 8 | 2 |
| ☐ | `groupPlan` |  | | 11 | 6 |
| ☐ | `groupElements` |  | | 16 | 6 |
| ☐ | `ungroupBlockers` |  | | 8 | 3 |
| ☐ | `ungroupElements` |  | | 21 | 8 |
| ☐ | `copyMarkup` |  | | 3 | 1 |
| ☐ | `idsIn` |  | | 8 | 3 |
| ☐ | `freshenIds` |  | | 17 | 6 |
| ☐ | `pasteMarkup` |  | | 9 | 3 |
| ☐ | `offsetMarkup` |  | | 9 | 3 |
| ☐ | `rebaseMoves` |  | | 10 | 7 |

### Path geometry  ·  `hPathGeometry` (H3)

| done | cell | user | how | LOC | CC |
|---|---|---|---|---|---|
| ☐ | `insertPoint` |  | | 8 | 1 |
| ☐ | `deletePoint` |  | | 10 | 4 |
| ☐ | `nearestSegment` |  | | 14 | 5 |
| ☐ | `rebasePath` |  | | 22 | 15 |
| ☐ | `vertexAddress` |  | | 21 | 13 |
| ☐ | `rebaseVertex` |  | | 17 | 13 |
| ☐ | `pathSegments` |  | | 49 | 20 |
| ☐ | `pointOnSegment` |  | | 9 | 3 |
| ☐ | `replaceGroup` |  | | 11 | 5 |
| ☐ | `absoluteGroup` |  | | 10 | 6 |
| ☐ | `splitPathSegment` |  | | 28 | 8 |
| ☐ | `deletePathAnchor` |  | | 13 | 6 |
| ☐ | `nearestPathSegment` |  | | 14 | 3 |
| ☐ | `insertPathPoint` |  | | 6 | 1 |
| ☐ | `deletePathPoint` |  | | 6 | 1 |

### Direct manipulation  ·  `manipulationHeader` (H2)

### Handles  ·  `hHandles` (H3)

| done | cell | user | how | LOC | CC |
|---|---|---|---|---|---|
| ☐ | `pointsHandles` |  | | 4 | 1 |
| ☐ | `pathHandles` |  | | 48 | 18 |

### The shape registry  ·  `hShapeRegistry` (H3)

| done | cell | user | how | LOC | CC |
|---|---|---|---|---|---|
| ☐ | `numAttr` |  | | 12 | 5 |
| ☐ | `numText` |  | | 3 | 1 |
| ☐ | `geomOf` |  | | 13 | 1 |
| ☐ | `shapePoints` |  | | 12 | 1 |
| ☐ | `shapePath` |  | | 14 | 5 |
| ☐ | `rxInset` |  | | 3 | 1 |
| ☐ | `shapeRect` |  | | 41 | 8 |
| ☐ | `shapeCircle` |  | | 23 | 3 |
| ☐ | `shapeEllipse` |  | | 28 | 5 |
| ☐ | `shapeLine` |  | | 22 | 1 |
| ☐ | `svgShapes` |  | | 3 | 1 |
| ☐ | `shapeLookup` |  | | 12 | 6 |
| ☐ | `handleEdit` |  | | 8 | 3 |

### Target, writer, overlay, focus  ·  `hPieces` (H3)

| done | cell | user | how | LOC | CC |
|---|---|---|---|---|---|
| ☐ | `svgTarget` |  | | 29 | 12 |
| ☐ | `holeSpans` |  | | 16 | 7 |
| ☐ | `slotsOf` |  | | 17 | 4 |
| ☐ | `mergeInterpolated` |  | | 21 | 6 |
| ☐ | `settle` |  | | 10 | 4 |
| ☐ | `svgWriter` |  | | 166 | 62 |
| ☐ | `svgOverlay` |  | | 54 | 12 |
| ☐ | `boxInRoot` |  | | 16 | 7 |
| ☐ | `topmostPaths` |  | | 7 | 3 |
| ☐ | `zTarget` |  | | 11 | 5 |
| ☐ | `svgFocus` |  | | 135 | 66 |

### The delta framework  ·  `hDelta` (H3)

| done | cell | user | how | LOC | CC |
|---|---|---|---|---|---|
| ☐ | `grabPointer` |  | | 3 | 2 |
| ☐ | `gestureDelta` |  | | 17 | 2 |
| ☐ | `previewDelta` |  | | 26 | 13 |
| ☐ | `commitDelta` |  | | 29 | 16 |
| ☐ | `revertDelta` |  | | 13 | 8 |

### Tools  ·  `hTools` (H3)

| done | cell | user | how | LOC | CC |
|---|---|---|---|---|---|
| ☐ | `moveVertices` |  | | 51 | 35 |
| ☐ | `toolVertex` |  | | 125 | 68 |
| ☐ | `scopedPath` |  | | 7 | 5 |
| ☐ | `hitTest` |  | | 27 | 12 |
| ☐ | `snapRects` |  | | 29 | 15 |
| ☐ | `moveTargetOf` |  | | 15 | 10 |
| ☐ | `moveDeltas` |  | | 24 | 12 |
| ☐ | `toolMove` |  | | 117 | 56 |
| ☐ | `toolZoom` |  | | 25 | 4 |
| ☐ | `toolScope` |  | | 23 | 8 |
| ☐ | `toolMarquee` |  | | 54 | 24 |
| ☐ | `toolStructure` |  | | 64 | 29 |
| ☐ | `toolTransform` |  | | 81 | 42 |
| ☐ | `dragBox` |  | | 12 | 4 |
| ☐ | `shapeSpec` |  | | 17 | 7 |
| ☐ | `shapeMarkup` |  | | 6 | 1 |
| ☐ | `penPath` |  | | 9 | 2 |
| ☐ | `toolDraw` |  | | 56 | 21 |
| ☐ | `toolPen` |  | | 123 | 48 |
| ☐ | `fitCurve` |  | | 77 | 30 |
| ☐ | `toolScribble` |  | | 50 | 18 |

### The gesture-law harness  ·  `hHarness` (H3)

| done | cell | user | how | LOC | CC |
|---|---|---|---|---|---|
| ☐ | `gestureFixture` |  | | 53 | 10 |
| ☐ | `playGesture` |  | | 59 | 19 |
| ☐ | `gestureCorpus` |  | | 20 | 1 |
| ☐ | `withFixture` |  | | 16 | 1 |
| ☐ | `test_gesture_identity` | test ·  | | 30 | 12 |
| ☐ | `test_gesture_path_independence` | test ·  | | 22 | 6 |
| ☐ | `test_gesture_commits_against_its_origin` | test ·  | | 27 | 7 |
| ☐ | `test_gesture_confinement` | test ·  | | 20 | 6 |
| ☐ | `test_gesture_selection_is_not_an_edit` | test ·  | | 18 | 7 |
| ☐ | `test_tools_measure_through_ctx` | test ·  | | 18 | 7 |
| ☐ | `test_tools_write_through_the_delta` | test ·  | | 25 | 9 |
| ☐ | `domShape` |  | | 24 | 11 |
| ☐ | `test_gesture_render_consistency` | test ·  | | 25 | 6 |
| ☐ | `test_gesture_rebase_agreement` | test ·  | | 43 | 13 |
| ☐ | `test_gesture_partiality` | test ·  | | 27 | 9 |
| ☐ | `test_gesture_view_is_not_an_edit` | test ·  | | 43 | 15 |
| ☐ | `test_gesture_hit_agreement` | test ·  | | 52 | 19 |
| ☐ | `gestureLaws` |  | | 23 | 3 |
| ☐ | `frameBudget` |  | | 36 | 15 |

### Commands and affordances  ·  `hCommands` (H3)

| done | cell | user | how | LOC | CC |
|---|---|---|---|---|---|
| ☐ | `toolHover` |  | | 17 | 8 |
| ☐ | `viewof svgTools` |  | | 3 | 1 |
| ☐ | `toolAffordance` |  | | 45 | 20 |
| ☐ | `cmdGroup` |  | | 18 | 3 |
| ☐ | `cmdUngroup` |  | | 22 | 7 |
| ☐ | `cmdDuplicate` |  | | 18 | 5 |
| ☐ | `cmdCopy` |  | | 9 | 2 |
| ☐ | `cmdCut` |  | | 20 | 7 |
| ☐ | `cmdPaste` |  | | 18 | 12 |
| ☐ | `alignSpecs` |  | | 5 | 1 |
| ☐ | `cmdAlign` |  | | 19 | 10 |
| ☐ | `cmdDistribute` |  | | 22 | 10 |
| ☐ | `pathSmooth` |  | | 127 | 63 |
| ☐ | `cmdToggleSmooth` |  | | 15 | 5 |
| ☐ | `cmdDeleteVertex` |  | | 35 | 12 |
| ☐ | `cmdClosePath` |  | | 21 | 10 |
| ☐ | `cmdSelect` |  | | 22 | 14 |
| ☐ | `pathConvert` |  | | 79 | 21 |
| ☐ | `cmdConvertSegment` |  | | 35 | 13 |
| ☐ | `cmdAddGradient` |  | | 22 | 7 |
| ☐ | `cmdAddMarker` |  | | 22 | 7 |
| ☐ | `svgCommands` |  | | 9 | 1 |
| ☐ | `svgAffordances` |  | | 59 | 16 |
| ☐ | `commandLookup` |  | | 16 | 9 |
| ☐ | `svgTools` |  | | 1 | 1 |

### Assembly  ·  `hAssembly` (H3)

| done | cell | user | how | LOC | CC |
|---|---|---|---|---|---|
| ☐ | `lensState` |  | | 3 | 1 |
| ☐ | `svgLens` |  | | 527 | 197 |


## Overlap analysis  ·  do after every row above is filled

- [ ] **Cross-reference the inventory for overlaps.** Group filled `user` values by the job they
  name; a job on two rows is a duplication candidate (the seed case: `inspector` and `fieldPanel`
  both under “set paint”). Produce a ranked list of overlaps.
- [ ] **Rank overlaps by LOC impact** — sum the LOC of the cells that would collapse into one, so
  dedupe is ordered by lines removed, not by how obvious the overlap was.
- [ ] **Dedupe/refactor the top overlaps**, each gated by the 59 laws staying green.

### Seed tasks (already identified, architecture §9)

- [ ] **Fill consolidation.** `inspector` (raw `setAttr`, style-unaware) and `fieldPanel`
  (`setField` → `setProperty`, style-aware) both set fill/stroke and disagree. Pick one paint
  surface + one write path. LOC in scope: `inspector` + `fieldPanel` (see rows).

<!-- 302 cell rows over 341 registered -->

