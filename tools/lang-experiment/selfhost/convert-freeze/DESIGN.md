# Freeze at the conversion (hypothesis under test, 2026-11-22)

Status: INVALIDATED, 2026-11-22. Not adopted. Nothing here is in the main tree.

Record of the test, in order:
- `paper-attack/RESULTS.md`: R1-R7 as written broken four ways (F, V, C, H); six rules added.
- `proto/RESULTS.md`: with nine added rules, 0 silent on the 1,799 programs written against the earlier design; rule C not built; a typed array returned from a cell throws.
- `attack1/RESULTS.md`: 246 new programs written against this design. Strongest mode accepts 182; 65 change silently (60 with rule B). The main design at ab2d0911 on the same programs: accepts 118, 0 silent.

Why it fails: the conversion is found where a `Mut` type meets a plain type, but a plain-typed name can alias a live `Mut` object by a path the checker never sees as a conversion (the receiver handed to a callback, an intrinsic that returns its argument, a spread element, a view made by a constructor). Each such path needs its own rule or annotation, which is the alias tracking the design was meant to avoid.

## Why
Static ownership and the boundary deep freeze both chase references (through the text, through the heap). Three attack
rounds found new channels each time (`selfhost/freeze-attack*/RESULTS.md`). The common enabler: `Mut<T>` is assignable
to `T` with no run-time effect, so one object can be held under a writable type and a read-only type at once.

## Invariant claimed
I: no object is reachable through both a `Mut`-typed reference and a non-`Mut`-typed reference, unless it is frozen.
In checked code a write needs a `Mut`-typed reference (`[member-write]`, `[mutating-method]`), so I gives: a value held
under a plain type never changes silently. A write after a freeze throws (fail-stop, a pass).

## Rules
R1 `Mut` references start only at a local bound to a fresh value, or a `Mut<…>` parameter / result / field.
R2 CONVERSION. Wherever the checker uses "Mut<X> is assignable to Y" with Y not `Mut` (return, yield, throw, argument to
   a non-`Mut` parameter, a type parameter included, assignment or initializer of a plain-typed slot, element of a
   literal, argument of state/action/await), the compiler wraps that expression in `ss_f(e)`: freeze `e` and everything
   unfrozen it reaches; throw on a kind it cannot freeze. A type parameter is never instantiated with a `Mut` type.
R3 CAPTURE. Where a kept function (not a helper that is only called, not a callback of a non-retaining intrinsic) is
   created, every `Mut` local it captures is converted there (`ss_f`). A captured binding not yet initialised throws.
R4 Typed arrays, ArrayBuffer: cannot be frozen, so the conversion is a static error; `slice()`/`snapshot` gives a plain
   one nobody holds as `Mut`. Map/Set/URL: the Ss subclasses, frozen by `ss_f`.
R5 Intrinsics: no intrinsic hands its `Mut` receiver or argument back under a plain type (callback 3rd argument,
   methods returning the receiver, iterators, views). To be audited over INTRINSIC_DECLS.
R6 Captured `let` reassignment stays the static `[let-capture]` rule (a binding, not an object).
R7 Every path that runs checked cell text applies R2/R3 (islands, workers, the bundle).
Not needed for I (defence only, may be dropped): the boundary deepFreeze, closure registration (fnreg.ts), promise
wrapping, path copies, the thenable ban.

## How this dies (cheapest first)
K1 A program accepted under R1–R6 that breaks I on paper (no prototype needed).
K2 R5 audit finds intrinsics that cannot be typed to respect I without rejecting common code.
K3 Shipped cells that write a local after converting it (now a run-time throw): count over the corpus / bun-verify.
K4 The compiler cannot get the conversion sites from the checker at reasonable cost.
K5 Prototype with the boundary freeze and registration REMOVED: any silent change over the attack sets (~1,800 programs).
K6 Run-time cost.
