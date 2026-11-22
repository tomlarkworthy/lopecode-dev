### Denominators

| measure | checker/toolchain | ports | tutorial/spec/examples | fixtures | probes | spec-rejects | corpus | supplement | union |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| cells | 587 | 300 | 803 | 366 | 210 | 572 | 2838 | 913 | 3520 |

### Denominators: accepted cells

| measure | checker/toolchain | ports | tutorial/spec/examples | fixtures | probes | spec-rejects | corpus | supplement | union |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| accepted (status ok) | 340 | 250 | 419 | 261 | 150 | 211 | 1631 | 882 | 2336 |

### 1. Explicit Mut<…> in a cell's text, by position: occurrences

| measure | checker/toolchain | ports | tutorial/spec/examples | fixtures | probes | spec-rejects | corpus | supplement | union |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| param-nested | 1 | 5 | 2 | 3 | 17 | 0 | 28 | 55 | 83 |
| param-cell | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| return | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| local | 26 | 1 | 0 | 2 | 0 | 0 | 29 | 171 | 178 |
| field | 0 | 0 | 3 | 0 | 0 | 0 | 3 | 0 | 3 |
| type-arg | 0 | 0 | 1 | 0 | 0 | 0 | 1 | 0 | 1 |
| in-function-type | 0 | 1 | 1 | 0 | 1 | 0 | 3 | 1 | 4 |
| cast | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| other | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| all | 27 | 7 | 7 | 5 | 18 | 0 | 64 | 227 | 269 |

### 1. Explicit Mut<…> in a cell's text, by position: distinct cells

| measure | checker/toolchain | ports | tutorial/spec/examples | fixtures | probes | spec-rejects | corpus | supplement | union |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| param-nested | 1 | 5 | 2 | 3 | 17 | 0 | 28 | 50 | 78 |
| param-cell | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| return | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| local | 18 | 1 | 0 | 2 | 0 | 0 | 21 | 136 | 141 |
| field | 0 | 0 | 3 | 0 | 0 | 0 | 3 | 0 | 3 |
| type-arg | 0 | 0 | 1 | 0 | 0 | 0 | 1 | 0 | 1 |
| in-function-type | 0 | 1 | 1 | 0 | 1 | 0 | 3 | 1 | 4 |
| cast | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| other | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| any position | 19 | 7 | 6 | 5 | 17 | 0 | 54 | 177 | 215 |
| no explicit Mut, but names an alias that is Mut<…> (type X = Mut<…>) | 28 | 1 | 0 | 0 | 0 | 0 | 29 | 231 | 232 |
| no explicit Mut, no such alias, but names a type that holds a Mut (a field, an element) | 0 | 5 | 0 | 0 | 0 | 0 | 5 | 83 | 88 |
| writes through a Mut-typed parameter with no Mut in the cell's text (an alias) | 23 | 0 | 0 | 0 | 0 | 0 | 23 | 101 | 101 |

### 1. Initializers of the locals annotated with Mut (union, by file:line)

| initializer | locals |
|---|---:|
| empty array | 85 |
| new Map | 40 |
| array literal | 23 |
| new Set | 23 |
| CallExpression | 4 |
| object literal | 3 |

### 1. Explicit Mut<…> outside cells (type aliases and interfaces), deduplicated by file:line

| position | corpus | supplement | union |
|---|---:|---:|---:|
| param-nested | 0 | 0 | 0 |
| param-cell | 0 | 0 | 0 |
| return | 0 | 0 | 0 |
| local | 0 | 0 | 0 |
| field | 1 | 2 | 3 |
| type-arg | 0 | 0 | 0 |
| in-function-type | 10 | 8 | 15 |
| cast | 0 | 0 | 0 |
| other | 0 | 0 | 0 |
| alias-body | 9 | 22 | 25 |
| all | 20 | 32 | 43 |

Aliases that are Mut<…> (union): Counters, Effects, Handles, IxCtls, IxFlows, IxTypes, IxVars, Keys, Listeners, MN, MNum, MU, MdL, MdMod, OwB, OwCaps, OwW, OwX, RgCtls, RgExpandMemo, RgIfaceMemo, RgQuietKeys, RgTypes, RgValues, S, SU, ShapeCtx

Aliases and interfaces that hold a Mut below the top (union): AtM, Box, Counters, Effects, FnSub, Handles, IxCtls, IxFlows, IxHiddenFn, IxHide, IxK, IxReg, IxRegCore, IxTypes, IxVars, Keys, Listeners, MN, MNum, MU, MdCellReg, MdCtx, MdIsland, MdL, MdMod, MdReg, OwB, OwCaps, OwCtx, OwK, OwW, OwWhyB, OwWhyK, OwX, RgCtls, RgExpandMemo, RgIfaceMemo, RgK, RgQuietKeys, RgTypes, RgValues, S, SU, ShapeCtx, ShapeSub, Sub, Unify

### 2. Writes by what they write through: writes (a write in a captured binding is f, whatever its root)

| measure | checker/toolchain | ports | tutorial/spec/examples | fixtures | probes | spec-rejects | corpus | supplement | union |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| a | 24 | 54 | 31 | 31 | 0 | 4 | 144 | 224 | 348 |
| g-fresh | 5 | 0 | 0 | 4 | 0 | 0 | 9 | 5 | 9 |
| g-copy | 4 | 0 | 0 | 7 | 0 | 0 | 11 | 12 | 21 |
| b | 0 | 0 | 0 | 1 | 0 | 0 | 1 | 0 | 1 |
| b2 | 0 | 0 | 1 | 1 | 0 | 0 | 2 | 0 | 2 |
| c (parameter of the function a cell returns) | 50 | 1 | 0 | 0 | 0 | 0 | 51 | 234 | 236 |
| c (parameter of a nested function) | 0 | 0 | 0 | 3 | 5 | 0 | 8 | 15 | 23 |
| d | 0 | 0 | 1 | 0 | 0 | 0 | 1 | 0 | 1 |
| e | 0 | 0 | 2 | 0 | 0 | 0 | 2 | 1 | 3 |
| g-ret | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| h | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| f (captured; any root) | 7 | 0 | 4 | 4 | 0 | 0 | 15 | 13 | 21 |
|   f with root a | 4 | 0 | 4 | 4 | 0 | 0 | 12 | 10 | 18 |
|   f with root g-fresh | 1 | 0 | 0 | 0 | 0 | 0 | 1 | 1 | 1 |
|   f with root g-copy | 2 | 0 | 0 | 0 | 0 | 0 | 2 | 2 | 2 |
|   f with root b | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
|   f with root b2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
|   f with root c | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
|   f with root d | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
|   f with root e | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
|   f with root g-ret | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
|   f with root h | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
|   f, written from a callback | 0 | 0 | 1 | 1 | 0 | 0 | 2 | 0 | 2 |
|   f, written from a helper | 7 | 0 | 3 | 3 | 0 | 0 | 13 | 13 | 19 |
|   f, written from a kept | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
|   f, written from a cellfn | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
|   f, written from a other | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| all writes | 90 | 55 | 39 | 51 | 5 | 4 | 244 | 504 | 665 |
| passes to a parameter typed Mut (not a write; the write is in the callee) | 120 | 28 | 0 | 4 | 64 | 0 | 216 | 2014 | 2110 |

### 2. Writes by group: distinct cells holding one

| measure | checker/toolchain | ports | tutorial/spec/examples | fixtures | probes | spec-rejects | corpus | supplement | union |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| a | 13 | 12 | 26 | 24 | 0 | 4 | 79 | 111 | 178 |
| g-fresh | 3 | 0 | 0 | 1 | 0 | 0 | 4 | 3 | 4 |
| g-copy | 3 | 0 | 0 | 3 | 0 | 0 | 6 | 11 | 15 |
| b | 0 | 0 | 0 | 1 | 0 | 0 | 1 | 0 | 1 |
| b2 | 0 | 0 | 1 | 1 | 0 | 0 | 2 | 0 | 2 |
| c (cell's returned function) | 24 | 1 | 0 | 0 | 0 | 0 | 25 | 127 | 129 |
| c (nested function) | 0 | 0 | 0 | 2 | 5 | 0 | 7 | 11 | 18 |
| d | 0 | 0 | 1 | 0 | 0 | 0 | 1 | 0 | 1 |
| e | 0 | 0 | 2 | 0 | 0 | 0 | 2 | 1 | 3 |
| g-ret | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| h | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| f | 4 | 0 | 4 | 4 | 0 | 0 | 12 | 9 | 17 |
| any write | 45 | 13 | 34 | 34 | 5 | 4 | 135 | 255 | 348 |
| passes a value to a Mut parameter | 16 | 6 | 0 | 3 | 17 | 0 | 42 | 275 | 301 |

### 4. Cells D rejects (strict: only literal/new locals are fresh; loose: also intrinsic-fresh results and spread/copy-constructor copies)

| measure | checker/toolchain | ports | tutorial/spec/examples | fixtures | probes | spec-rejects | corpus | supplement | union |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| has an explicit Mut, or names a type alias/interface that is or holds one | 47 | 13 | 6 | 5 | 17 | 0 | 88 | 491 | 535 |
|   explicit Mut in the cell's own text | 19 | 7 | 6 | 5 | 17 | 0 | 54 | 177 | 215 |
| D1 strict: a write outside (a), or a pass to a Mut parameter | 38 | 7 | 8 | 12 | 17 | 0 | 82 | 334 | 380 |
| D1 loose | 32 | 7 | 8 | 9 | 17 | 0 | 73 | 326 | 368 |
| D2 strict: a write outside (a)+(b), or a pass | 38 | 7 | 8 | 11 | 17 | 0 | 81 | 334 | 379 |
| D2 loose | 32 | 7 | 8 | 8 | 17 | 0 | 72 | 326 | 367 |
| D1 strict, either reason | 49 | 13 | 11 | 13 | 17 | 0 | 103 | 493 | 550 |
| D1 loose, either reason | 47 | 13 | 11 | 10 | 17 | 0 | 98 | 491 | 545 |
| D2 strict, either reason | 49 | 13 | 11 | 12 | 17 | 0 | 102 | 493 | 549 |
| D2 loose, either reason | 47 | 13 | 11 | 9 | 17 | 0 | 97 | 491 | 544 |
|   only syntactic (a Mut type, no write outside (a)/(g) and no pass): D1 loose | 15 | 6 | 3 | 1 | 0 | 0 | 25 | 165 | 177 |
| writes, but every one in (a) (D1 strict keeps it) | 1 | 5 | 26 | 21 | 0 | 4 | 57 | 1 | 57 |

### 4. Cells D rejects, union of corpus and supplement, by bucket

| measure | checker/toolchain | ports | tutorial/spec/examples | fixtures | probes | spec-rejects | total |
|---|---:|---:|---:|---:|---:|---:|---:|
| accepted cells | 1012 | 250 | 452 | 261 | 150 | 211 | 2336 |
| a Mut type (explicit, or an alias/interface that is or holds one) | 494 | 13 | 6 | 5 | 17 | 0 | 535 |
| D1 strict, a write or a pass | 336 | 7 | 8 | 12 | 17 | 0 | 380 |
| D1 loose, a write or a pass | 327 | 7 | 8 | 9 | 17 | 0 | 368 |
| D2 loose, a write or a pass | 327 | 7 | 8 | 8 | 17 | 0 | 367 |
| D1 strict, either | 496 | 13 | 11 | 13 | 17 | 0 | 550 |
| D1 loose, either | 494 | 13 | 11 | 10 | 17 | 0 | 545 |
| D2 strict, either | 496 | 13 | 11 | 12 | 17 | 0 | 549 |
| D2 loose, either | 494 | 13 | 11 | 9 | 17 | 0 | 544 |
