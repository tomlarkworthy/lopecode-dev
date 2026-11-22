# Paper attack on freeze-at-conversion (2026-11-22)

`bun probe.ts k1?.ts` runs the live checker.

## Verdict: ALIVE WITH ADDED RULES

Each break needed one rule. In each, a plain reference is made where the checker does no assignability check. All are accepted today.

## Class (a): I is broken as specified

1. **Variance beneath functions and Promise.**
   ```ts
   const keep = (x: number[]): number[] => x;
   const f: (m: Mut<number[]>) => number[] = keep;
   const r = f(xs); xs.push(2);
   ```
   `r === xs`. The same holds for `Mut` results, `Promise<Mut<X>>` → `Promise<X>`, and across cells (bnd-factory).
   - **F**: beneath a function parameter or result, a `Promise` or an `Iterable`, `Mut` must match exactly, cell inputs included.
   - Population: 6 functions return a fresh local with no result annotation, all cell bodies. 18 cells take a function-typed input. Rejections are unmeasured.
2. **The receiver or a view comes back plain.** `const r = xs.sort(); xs.push(2)`. K2 lists the rest.
   - **V**: a `@view` result takes the receiver's Mut-ness. A `@view` constructor takes its argument's Mut-ness, and that argument is not converted.
3. **The hidden callback argument.** `xs.map((v: number, i: number, arr?: number[]) => arr ?? [])[0]` is `xs`, typed plain. Rest parameters and a two-parameter launder do the same.
   - **C**: the compiler wraps every non-literal function passed to an intrinsic callback as `(v, i) => f(v, i)`.
4. **A hoisted kept declaration.** `const late = [0]; const r = { g }; yield r; late.push(9); function g() { return late.length; }`.
   - Converting at g's position leaves the push silent. Converting at scope entry throws in the TDZ (temporal dead zone).
   - **H**: convert each captured local where it is initialised.

## Class (b): I holds only with the added rule

- **B**: `return xs` is inferred `Mut`, so no conversion fires (bnd-canon, bnd-async, bnd-gen). Every cell return, yield and resolution must convert, subject to F. This is a boundary conversion under another name.
- **U**: `c ? p : xs`, `??` and `||` give `Mut<X> | X`. This must count as Mut and convert into a Mut-free type.
- R3 must be transitive (`[mut-capture]` already does this).
- Default initializers must be conversion sites.
- "A type parameter is never `Mut`" changes today's inference (`id`, `reduce`, `Promise.all`).
- `ss_f` must not partially freeze on a throw (derived only).

## K2 (R5)

- **Receiver:** sort/reverse/fill/copyWithin (Array and TA), `Map.set`, `Set.add`.
- **View:** entries/keys/values, TA `subarray`/`buffer`, `new TA(buffer)`, `URL.searchParams`.
- **Hidden argument:** every callback.

V and C fix these. `JSON.stringify` and `structuredClone` still freeze their argument.

## K3

Of 2,763 locals, 191 are written and 21 are written after an escape. I classified all 21 by hand and none throws: 11 are captured only by called helpers (by eye), 2 go to `Mut` parameters, 6 are unreachable after `return`, and 2 are fresh per iteration. R4 costs more: 4 of the 5 typed-array locals are returned, each a static error.

## Not examined

K4–K6, the browser, islands and workers, JSX, state/action, `throw`, `yield*`, try/finally, and writes through `Mut` parameters.
