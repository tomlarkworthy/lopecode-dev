### Denominator

| measure | sswith:lite/shape.ss.ts | sswith:lite/store.ss.ts | sswith:lite/render.ss.ts | sswith:lite/cross.ss.ts | sswith:lite/subtype.ss.ts | sswith:lite/walks.ss.ts | module:lite/infer | module:tutorial | total | dedup |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| cells | 48 | 60 | 29 | 28 | 56 | 64 | 510 | 46 | 841 | 662 |

### Denominator (accepted, status ok)

| measure | sswith:lite/shape.ss.ts | sswith:lite/store.ss.ts | sswith:lite/render.ss.ts | sswith:lite/cross.ss.ts | sswith:lite/subtype.ss.ts | sswith:lite/walks.ss.ts | module:lite/infer | module:tutorial | total | dedup |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| accepted cells | 48 | 60 | 29 | 28 | 56 | 64 | 510 | 33 | 828 | 649 |

### 1. Y: generator functions (accepted cells)

| measure | sswith:lite/shape.ss.ts | sswith:lite/store.ss.ts | sswith:lite/render.ss.ts | sswith:lite/cross.ss.ts | sswith:lite/subtype.ss.ts | sswith:lite/walks.ss.ts | module:lite/infer | module:tutorial | total | dedup |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| generator functions (cell + nested) | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 1 | 1 |
|   of which the cell itself | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 1 | 1 |
|   that yield a non-primitive value | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| with a Mut/let local used across a yield | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
|   written after (some binding) | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
|   only read after | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
|   ... and the function yields a non-primitive | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| bindings used across a yield | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
|   Mut-typed | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
|   let, not Mut-typed | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
|   let holding a primitive | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
|   captured from an encloser (used across the inner function's yield) | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| generator functions with a non-primitive hit (Mut, or let of an object) | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| only fresh-per-iteration hits (excluded above) | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

### 2. A: async functions (accepted cells)

| measure | sswith:lite/shape.ss.ts | sswith:lite/store.ss.ts | sswith:lite/render.ss.ts | sswith:lite/cross.ss.ts | sswith:lite/subtype.ss.ts | sswith:lite/walks.ss.ts | module:lite/infer | module:tutorial | total | dedup |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| async cell (not visible before end): functions | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 1 | 1 |
| async cell (not visible before end): with Mut/let used across an await | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| async cell (not visible before end):   written after | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| async cell (not visible before end):   only read after | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| async cell (not visible before end):   with a non-primitive hit | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| async cell (not visible before end):   with a captured-binding hit | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| async helper, only called: functions | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| async helper, only called: with Mut/let used across an await | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| async helper, only called:   written after | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| async helper, only called:   only read after | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| async helper, only called:   with a non-primitive hit | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| async helper, only called:   with a captured-binding hit | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
|   of which visible | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| kept async function (visible): functions | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| kept async function (visible): with Mut/let used across an await | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| kept async function (visible):   written after | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| kept async function (visible):   only read after | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| kept async function (visible):   with a non-primitive hit | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| kept async function (visible):   with a captured-binding hit | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| async generator, any (visible; awaits and yields): functions | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| async generator, any (visible; awaits and yields): with Mut/let used across an await | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| async generator, any (visible; awaits and yields):   written after | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| async generator, any (visible; awaits and yields):   only read after | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| async generator, any (visible; awaits and yields):   with a non-primitive hit | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| async generator, any (visible; awaits and yields):   with a captured-binding hit | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

### 3. K: kept functions capturing a Mut or let local (accepted cells)

| measure | sswith:lite/shape.ss.ts | sswith:lite/store.ss.ts | sswith:lite/render.ss.ts | sswith:lite/cross.ss.ts | sswith:lite/subtype.ss.ts | sswith:lite/walks.ss.ts | module:lite/infer | module:tutorial | total | dedup |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| kept functions capturing a Mut/let local | 0 | 0 | 1 | 0 | 0 | 0 | 1 | 0 | 2 | 2 |
| captures (kept fn x binding) | 0 | 0 | 1 | 0 | 0 | 0 | 1 | 0 | 2 | 2 |
|   Mut-typed | 0 | 0 | 1 | 0 | 0 | 0 | 1 | 0 | 2 | 2 |
|   let, not Mut-typed | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
|   let holding a primitive | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
|   written through the capture | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
|   only read | 0 | 0 | 1 | 0 | 0 | 0 | 1 | 0 | 2 | 2 |
|   encloser writes it after the kept fn is made | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
|   only read, no later write | 0 | 0 | 1 | 0 | 0 | 0 | 1 | 0 | 2 | 2 |
| cells with any | 0 | 0 | 1 | 0 | 0 | 0 | 1 | 0 | 2 | 2 |

### 3. K: the same over every cell (for comparison; rejected cells' facts may be partial)

| measure | sswith:lite/shape.ss.ts | sswith:lite/store.ss.ts | sswith:lite/render.ss.ts | sswith:lite/cross.ss.ts | sswith:lite/subtype.ss.ts | sswith:lite/walks.ss.ts | module:lite/infer | module:tutorial | total | dedup |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| kept functions capturing a Mut/let local | 0 | 0 | 1 | 0 | 0 | 0 | 1 | 0 | 2 | 2 |
| captures (kept fn x binding) | 0 | 0 | 1 | 0 | 0 | 0 | 1 | 0 | 2 | 2 |
|   Mut-typed | 0 | 0 | 1 | 0 | 0 | 0 | 1 | 0 | 2 | 2 |
|   let, not Mut-typed | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
|   let holding a primitive | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
|   written through the capture | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
|   only read | 0 | 0 | 1 | 0 | 0 | 0 | 1 | 0 | 2 | 2 |
|   encloser writes it after the kept fn is made | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
|   only read, no later write | 0 | 0 | 1 | 0 | 0 | 0 | 1 | 0 | 2 | 2 |
| cells with any | 0 | 0 | 1 | 0 | 0 | 0 | 1 | 0 | 2 | 2 |

### 3. K: cells rejected today carrying [mut-capture] or [let-capture]

| measure | sswith:lite/shape.ss.ts | sswith:lite/store.ss.ts | sswith:lite/render.ss.ts | sswith:lite/cross.ss.ts | sswith:lite/subtype.ss.ts | sswith:lite/walks.ss.ts | module:lite/infer | module:tutorial | total | dedup |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| cells | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
|   with a K hit our counter found | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
|   with a write-through or late-write hit | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

### 4. captured promises / generators / iterators in kept functions

| measure | sswith:lite/shape.ss.ts | sswith:lite/store.ss.ts | sswith:lite/render.ss.ts | sswith:lite/cross.ss.ts | sswith:lite/subtype.ss.ts | sswith:lite/walks.ss.ts | module:lite/infer | module:tutorial | total | dedup |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| accepted cells: captures | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| accepted cells: cells with any | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

### 4. the same over every cell

| measure | sswith:lite/shape.ss.ts | sswith:lite/store.ss.ts | sswith:lite/render.ss.ts | sswith:lite/cross.ss.ts | sswith:lite/subtype.ss.ts | sswith:lite/walks.ss.ts | module:lite/infer | module:tutorial | total | dedup |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| captures | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
|   of which in a cell rejected today | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

### 5. newly rejected under R (accepted cells)

| measure | sswith:lite/shape.ss.ts | sswith:lite/store.ss.ts | sswith:lite/render.ss.ts | sswith:lite/cross.ss.ts | sswith:lite/subtype.ss.ts | sswith:lite/walks.ss.ts | module:lite/infer | module:tutorial | total | dedup |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| cells R rejects | 0 | 0 | 1 | 0 | 0 | 0 | 1 | 0 | 2 | 2 |
|   for Y | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
|   for A (visible async) | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
|   for K | 0 | 0 | 1 | 0 | 0 | 0 | 1 | 0 | 2 | 2 |
| R without primitive lets (Mut, or let of a non-primitive) | 0 | 0 | 1 | 0 | 0 | 0 | 1 | 0 | 2 | 2 |

### 5. distinct cell texts R rejects (name + the cell function's own source)

| measure | sswith:lite/shape.ss.ts | sswith:lite/store.ss.ts | sswith:lite/render.ss.ts | sswith:lite/cross.ss.ts | sswith:lite/subtype.ss.ts | sswith:lite/walks.ss.ts | module:lite/infer | module:tutorial | total | dedup |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| distinct texts | 0 | 0 | 1 | 0 | 0 | 0 | 1 | 0 | 2 | 2 |

### 5. list (deduplicated by location: 2 cells; 2 distinct texts)

- `lite/infer/ix-core.ss.ts:159` ixAdmits [text 1cpds64kcrgmd] (module:lite/infer; jobs: module)
  - K:W(Mut,read) kept fn lite/infer/ix-core.ss.ts:162
- `lite/render.ss.ts:33` eventOf [text acopztmht200] (sswith:lite/render.ss.ts; jobs: sswith)
  - K:events(Mut,read) kept fn lite/render.ss.ts:35
