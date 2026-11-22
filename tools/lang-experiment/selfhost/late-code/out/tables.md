### Denominator

| measure | checker/toolchain | ports | tutorial/spec/examples | fixtures | probes | spec-rejects | total | dedup |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| cells | 1188 | 300 | 798 | 366 | 420 | 557 | 3629 | 2818 |

### Denominator (accepted, status ok)

| measure | checker/toolchain | ports | tutorial/spec/examples | fixtures | probes | spec-rejects | total | dedup |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| accepted cells | 653 | 250 | 422 | 262 | 300 | 211 | 2098 | 1635 |

### 1. Y: generator functions (accepted cells)

| measure | checker/toolchain | ports | tutorial/spec/examples | fixtures | probes | spec-rejects | total | dedup |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| generator functions (cell + nested) | 3 | 0 | 34 | 6 | 0 | 18 | 61 | 60 |
|   of which the cell itself | 1 | 0 | 34 | 6 | 0 | 18 | 59 | 59 |
|   that yield a non-primitive value | 0 | 0 | 14 | 1 | 0 | 3 | 18 | 18 |
| with a Mut/let local used across a yield | 0 | 0 | 13 | 2 | 0 | 3 | 18 | 18 |
|   written after (some binding) | 0 | 0 | 13 | 2 | 0 | 3 | 18 | 18 |
|   only read after | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
|   ... and the function yields a non-primitive | 0 | 0 | 11 | 0 | 0 | 3 | 14 | 14 |
| bindings used across a yield | 0 | 0 | 24 | 2 | 0 | 6 | 32 | 32 |
|   Mut-typed | 0 | 0 | 11 | 0 | 0 | 3 | 14 | 14 |
|   let, not Mut-typed | 0 | 0 | 13 | 2 | 0 | 3 | 18 | 18 |
|   let holding a primitive | 0 | 0 | 13 | 2 | 0 | 3 | 18 | 18 |
|   captured from an encloser (used across the inner function's yield) | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| generator functions with a non-primitive hit (Mut, or let of an object) | 0 | 0 | 11 | 0 | 0 | 3 | 14 | 14 |
| only fresh-per-iteration hits (excluded above) | 0 | 0 | 1 | 0 | 0 | 0 | 1 | 1 |

### 2. A: async functions (accepted cells)

| measure | checker/toolchain | ports | tutorial/spec/examples | fixtures | probes | spec-rejects | total | dedup |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| async cell (not visible before end): functions | 0 | 0 | 10 | 6 | 0 | 1 | 17 | 17 |
| async cell (not visible before end): with Mut/let used across an await | 0 | 0 | 0 | 1 | 0 | 0 | 1 | 1 |
| async cell (not visible before end):   written after | 0 | 0 | 0 | 1 | 0 | 0 | 1 | 1 |
| async cell (not visible before end):   only read after | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| async cell (not visible before end):   with a non-primitive hit | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| async cell (not visible before end):   with a captured-binding hit | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| async helper, only called: functions | 0 | 0 | 2 | 0 | 0 | 0 | 2 | 2 |
| async helper, only called: with Mut/let used across an await | 0 | 0 | 2 | 0 | 0 | 0 | 2 | 2 |
| async helper, only called:   written after | 0 | 0 | 2 | 0 | 0 | 0 | 2 | 2 |
| async helper, only called:   only read after | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| async helper, only called:   with a non-primitive hit | 0 | 0 | 2 | 0 | 0 | 0 | 2 | 2 |
| async helper, only called:   with a captured-binding hit | 0 | 0 | 1 | 0 | 0 | 0 | 1 | 1 |
|   of which visible | 0 | 0 | 2 | 0 | 0 | 0 | 2 | 2 |
| kept async function (visible): functions | 8 | 0 | 2 | 0 | 0 | 0 | 10 | 8 |
| kept async function (visible): with Mut/let used across an await | 2 | 0 | 2 | 0 | 0 | 0 | 4 | 3 |
| kept async function (visible):   written after | 2 | 0 | 0 | 0 | 0 | 0 | 2 | 1 |
| kept async function (visible):   only read after | 0 | 0 | 2 | 0 | 0 | 0 | 2 | 2 |
| kept async function (visible):   with a non-primitive hit | 0 | 0 | 2 | 0 | 0 | 0 | 2 | 2 |
| kept async function (visible):   with a captured-binding hit | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| async generator, any (visible; awaits and yields): functions | 0 | 0 | 2 | 0 | 0 | 2 | 4 | 4 |
| async generator, any (visible; awaits and yields): with Mut/let used across an await | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| async generator, any (visible; awaits and yields):   written after | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| async generator, any (visible; awaits and yields):   only read after | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| async generator, any (visible; awaits and yields):   with a non-primitive hit | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| async generator, any (visible; awaits and yields):   with a captured-binding hit | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

### 3. K: kept functions capturing a Mut or let local (accepted cells)

| measure | checker/toolchain | ports | tutorial/spec/examples | fixtures | probes | spec-rejects | total | dedup |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| kept functions capturing a Mut/let local | 0 | 0 | 1 | 1 | 0 | 0 | 2 | 2 |
| captures (kept fn x binding) | 0 | 0 | 1 | 1 | 0 | 0 | 2 | 2 |
|   Mut-typed | 0 | 0 | 1 | 1 | 0 | 0 | 2 | 2 |
|   let, not Mut-typed | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
|   let holding a primitive | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
|   written through the capture | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
|   only read | 0 | 0 | 1 | 1 | 0 | 0 | 2 | 2 |
|   encloser writes it after the kept fn is made | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
|   only read, no later write | 0 | 0 | 1 | 1 | 0 | 0 | 2 | 2 |
| cells with any | 0 | 0 | 1 | 1 | 0 | 0 | 2 | 2 |

### 3. K: the same over every cell (for comparison; rejected cells' facts may be partial)

| measure | checker/toolchain | ports | tutorial/spec/examples | fixtures | probes | spec-rejects | total | dedup |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| kept functions capturing a Mut/let local | 12 | 0 | 12 | 3 | 0 | 11 | 38 | 32 |
| captures (kept fn x binding) | 16 | 0 | 12 | 3 | 0 | 11 | 42 | 34 |
|   Mut-typed | 4 | 0 | 7 | 3 | 0 | 6 | 20 | 18 |
|   let, not Mut-typed | 12 | 0 | 5 | 0 | 0 | 5 | 22 | 16 |
|   let holding a primitive | 8 | 0 | 4 | 0 | 0 | 4 | 16 | 12 |
|   written through the capture | 14 | 0 | 7 | 2 | 0 | 7 | 30 | 23 |
|   only read | 2 | 0 | 5 | 1 | 0 | 4 | 12 | 11 |
|   encloser writes it after the kept fn is made | 2 | 0 | 1 | 1 | 0 | 1 | 5 | 4 |
|   only read, no later write | 2 | 0 | 4 | 1 | 0 | 3 | 10 | 9 |
| cells with any | 12 | 0 | 12 | 3 | 0 | 11 | 38 | 32 |

### 3. K: cells rejected today carrying [mut-capture] or [let-capture]

| measure | checker/toolchain | ports | tutorial/spec/examples | fixtures | probes | spec-rejects | total | dedup |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| cells | 10 | 1 | 10 | 2 | 0 | 10 | 33 | 28 |
|   with a K hit our counter found | 10 | 0 | 9 | 2 | 0 | 9 | 30 | 25 |
|   with a write-through or late-write hit | 10 | 0 | 8 | 2 | 0 | 8 | 28 | 23 |

### 4. captured promises / generators / iterators in kept functions

| measure | checker/toolchain | ports | tutorial/spec/examples | fixtures | probes | spec-rejects | total | dedup |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| accepted cells: captures | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| accepted cells: cells with any | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

### 4. the same over every cell

| measure | checker/toolchain | ports | tutorial/spec/examples | fixtures | probes | spec-rejects | total | dedup |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| captures | 2 | 1 | 4 | 0 | 0 | 4 | 11 | 10 |
|   of which in a cell rejected today | 2 | 1 | 4 | 0 | 0 | 4 | 11 | 10 |

### 5. newly rejected under R (accepted cells)

| measure | checker/toolchain | ports | tutorial/spec/examples | fixtures | probes | spec-rejects | total | dedup |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| cells R rejects | 2 | 0 | 16 | 3 | 0 | 3 | 24 | 23 |
|   for Y | 0 | 0 | 13 | 2 | 0 | 3 | 18 | 18 |
|   for A (visible async) | 2 | 0 | 2 | 0 | 0 | 0 | 4 | 3 |
|   for K | 0 | 0 | 1 | 1 | 0 | 0 | 2 | 2 |
| R without primitive lets (Mut, or let of a non-primitive) | 0 | 0 | 14 | 1 | 0 | 3 | 18 | 18 |

### 5. distinct cell texts R rejects (name + the cell function's own source)

| measure | checker/toolchain | ports | tutorial/spec/examples | fixtures | probes | spec-rejects | total | dedup |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| distinct texts | 1 | 0 | 8 | 3 | 0 | 2 | 11 | 11 |

### 5. list (deduplicated by location: 23 cells; 11 distinct texts)

- `fixtures/accept-basic/cells.ts:15` ticks [text jgle0974gv6p] (fixtures; jobs: port)
  - Y:i(let primitive,written) fn fixtures/accept-basic/cells.ts:15 [cell/gen] used 16r,16w,16r
- `fixtures/lite-game/accept-breakout/cells.tsx:56` ticks [text q8c0tp7o4wix] (fixtures; jobs: port)
  - Y:t(let primitive,written) fn fixtures/lite-game/accept-breakout/cells.tsx:56 [cell/gen] used 61r,62w
- `fixtures/lite-mut/reject-mut-capture/cells.ts:5` bad_stored [text 3fuj1w4ztrtax] (fixtures; jobs: port)
  - K:out(Mut,read) kept fn fixtures/lite-mut/reject-mut-capture/cells.ts:5
- `inline:spec.ojs#13ypm555m0c4s:1` frames [text 33v9yow2l6wl4] (tutorial/spec/examples; jobs: inline)
  - Y:buf(Mut,written) fn inline:spec.ojs#13ypm555m0c4s:1 [cell/gen] used 4w,5r
  - Y:k(let primitive,written) fn inline:spec.ojs#13ypm555m0c4s:1 [cell/gen] used 3r,3w,4r
- `inline:spec.ojs#1ifueoppiy3nj:1` frames [text 33v9yow2l6wl4] (tutorial/spec/examples; jobs: inline)
  - Y:buf(Mut,written) fn inline:spec.ojs#1ifueoppiy3nj:1 [cell/gen] used 4w,5r
  - Y:k(let primitive,written) fn inline:spec.ojs#1ifueoppiy3nj:1 [cell/gen] used 3r,3w,4r
- `inline:spec.ojs#1lj0ijbwa8dg5:1` bad [text jl4ut44nymzr] (tutorial/spec/examples; jobs: inline)
  - A:v(Mut,read) fn inline:spec.ojs#1lj0ijbwa8dg5:1 [kept/async] used 10r
  - A:m(Mut, captured,written) fn inline:spec.ojs#1lj0ijbwa8dg5:3 [helper/async] used 5w
- `inline:spec.ojs#1mxmkw2j7ts1s:1` frames [text 33v9yow2l6wl4] (tutorial/spec/examples; jobs: inline)
  - Y:buf(Mut,written) fn inline:spec.ojs#1mxmkw2j7ts1s:1 [cell/gen] used 4w,5r
  - Y:k(let primitive,written) fn inline:spec.ojs#1mxmkw2j7ts1s:1 [cell/gen] used 3r,3w,4r
- `inline:spec.ojs#2cylt8z8h1s2l:1` a [text 5h1p2m6ihvy5] (tutorial/spec/examples; jobs: inline)
  - K:out(Mut,read) kept fn inline:spec.ojs#2cylt8z8h1s2l:3
- `inline:spec.ojs#2ihncfn9lpuj2:1` frames [text 33v9yow2l6wl4] (tutorial/spec/examples; jobs: inline)
  - Y:buf(Mut,written) fn inline:spec.ojs#2ihncfn9lpuj2:1 [cell/gen] used 4w,5r
  - Y:k(let primitive,written) fn inline:spec.ojs#2ihncfn9lpuj2:1 [cell/gen] used 3r,3w,4r
- `inline:spec.ojs#323oevuhyk318:1` frames [text 33v9yow2l6wl4] (tutorial/spec/examples; jobs: inline)
  - Y:buf(Mut,written) fn inline:spec.ojs#323oevuhyk318:1 [cell/gen] used 4w,5r
  - Y:k(let primitive,written) fn inline:spec.ojs#323oevuhyk318:1 [cell/gen] used 3r,3w,4r
- `inline:spec.ojs#3af5e7gfxw7kh:1` bad [text piunzrbhxhgx] (tutorial/spec/examples; jobs: inline)
  - A:v(Mut,read) fn inline:spec.ojs#3af5e7gfxw7kh:1 [kept/async] used 10r
  - A:m(Mut,written) fn inline:spec.ojs#3af5e7gfxw7kh:2 [helper/async] used 4w
- `inline:spec.ojs#9ec4mucnrj9d:1` frames [text 33v9yow2l6wl4] (tutorial/spec/examples; jobs: inline)
  - Y:buf(Mut,written) fn inline:spec.ojs#9ec4mucnrj9d:1 [cell/gen] used 4w,5r
  - Y:k(let primitive,written) fn inline:spec.ojs#9ec4mucnrj9d:1 [cell/gen] used 3r,3w,4r
- `inline:spec.ojs#cyeo42df2ksb:1` frames [text 33v9yow2l6wl4] (tutorial/spec/examples; jobs: inline)
  - Y:buf(Mut,written) fn inline:spec.ojs#cyeo42df2ksb:1 [cell/gen] used 4w,5r
  - Y:k(let primitive,written) fn inline:spec.ojs#cyeo42df2ksb:1 [cell/gen] used 3r,3w,4r
- `inline:spec.ojs#mslx5y3g6m4c:1` frames [text 33v9yow2l6wl4] (tutorial/spec/examples; jobs: inline)
  - Y:buf(Mut,written) fn inline:spec.ojs#mslx5y3g6m4c:1 [cell/gen] used 4w,5r
  - Y:k(let primitive,written) fn inline:spec.ojs#mslx5y3g6m4c:1 [cell/gen] used 3r,3w,4r
- `inline:spec.ojs#om4wd8zo38rt:1` a [text 1p4xnf1ir5jbn] (tutorial/spec/examples; jobs: inline)
  - Y:r(Mut,written) fn inline:spec.ojs#om4wd8zo38rt:1 [cell/gen] used 4w,5r
  - Y:k(let primitive,written) fn inline:spec.ojs#om4wd8zo38rt:1 [cell/gen] used 3r,3w,4r
- `inline:spec.ojs#tjqan7zs9bl9:1` frames [text 33v9yow2l6wl4] (tutorial/spec/examples; jobs: inline)
  - Y:buf(Mut,written) fn inline:spec.ojs#tjqan7zs9bl9:1 [cell/gen] used 4w,5r
  - Y:k(let primitive,written) fn inline:spec.ojs#tjqan7zs9bl9:1 [cell/gen] used 3r,3w,4r
- `lite/notebook/examples/09-breakout.tsx:56` ticks [text q8c0tp7o4wix] (tutorial/spec/examples; jobs: file)
  - Y:t(let primitive,written) fn lite/notebook/examples/09-breakout.tsx:56 [cell/gen] used 61r,62w
- `lite/soundscript/spec-5.ts:1` s5_frames [text 15kiryfxdr1qp] (tutorial/spec/examples; jobs: file)
  - Y:buf(Mut,written) fn lite/soundscript/spec-5.ts:1 [cell/gen] used 4r,4w,5r
  - Y:k(let primitive,written) fn lite/soundscript/spec-5.ts:1 [cell/gen] used 3r,3w,4r
- `lite/soundscript/spec-7.ts:1` s7_beats [text 294q37q1sgdsx] (tutorial/spec/examples; jobs: file)
  - Y:i(let primitive,written) fn lite/soundscript/spec-7.ts:1 [cell/gen] used 2r,2w,2r
- `reject:S4.4#184:1` a [text 1p4xnf1ir5jbn] (spec-rejects; jobs: reject)
  - Y:r(Mut,written) fn reject:S4.4#184:1 [cell/gen] used 4w,5r
  - Y:k(let primitive,written) fn reject:S4.4#184:1 [cell/gen] used 3r,3w,4r
- `reject:S5.2#191:1` frames [text 33v9yow2l6wl4] (spec-rejects; jobs: reject)
  - Y:buf(Mut,written) fn reject:S5.2#191:1 [cell/gen] used 4w,5r
  - Y:k(let primitive,written) fn reject:S5.2#191:1 [cell/gen] used 3r,3w,4r
- `reject:S5.2#192:1` frames [text 33v9yow2l6wl4] (spec-rejects; jobs: reject)
  - Y:buf(Mut,written) fn reject:S5.2#192:1 [cell/gen] used 4w,5r
  - Y:k(let primitive,written) fn reject:S5.2#192:1 [cell/gen] used 3r,3w,4r
- `selfhost/rt/probe3.ss.ts:9` awaitLoop [text dhmaudg70q1m] (checker/toolchain; jobs: ss,ssx)
  - A:s(let primitive,written) fn selfhost/rt/probe3.ss.ts:9 [kept/async] used 9w,9r
