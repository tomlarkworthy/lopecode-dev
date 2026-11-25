# freeze-attack14: silent breaks of SoundScript (run 2026-11-25)

Scope: any accepted program that then, with no throw, does what `lite/soundscript/spec.ojs` S1–S11 says cannot
happen. Classes in the brief's order: (1) type lies about plain data, (2) purity and state, (3) mutation, (4) name
resolution and order, (5) other. `NOTES-checker-port.md` (2026-11-25 sections) and `lite/infer/attack/open-attacks.ts`
were not read.

Run from `tools/lang-experiment`. Every file is in `selfhost/freeze-attack14/`; nothing outside it was edited. No
build, `verify.ts`, gates script or git command was run. `run.sh <f>` runs a file under both runners and the probe
and compares the two `SILENT` sets:

```
bun lite/infer/attack/drive-rt.ts  selfhost/freeze-attack14/<f>.ts   # compiled module -> <f>-rt-out.txt
bun lite/infer/attack/drive-run.ts selfhost/freeze-attack14/<f>.ts   # runCells        -> <f>-dr-out.txt
bun selfhost/freeze-attack4/probe.ts selfhost/freeze-attack14/<f>.ts # verdicts        -> <f>-probe-out.txt
```

A row is **silent** when it was accepted and its drive printed DIFF; **loud** when accepted and a cell then errored.
Vehicles are in `lib14.ts` (`tyRow`, `callRow` from attack 13; `byRet`, `actDrive` new). Every detector reads
the value against the type the program wrote for it. Controls (`ctl: true`, checker skipped) are wrong values the run
time cannot see, e.g. `const g = (): number => "s"`. Attack 13's `min-ctl-object-promise` and `min-ctl-resp` no
longer fire, because the run time now refuses them, so they were not reused.

## Summary

Counts from the out files of 2026-11-25, not counting `min.ts` and `min-rt.ts`:

```
                       candidates  accepted  silent
family files (14)          376        287      157   153 are the 13 breaks; act.ts 1 and jsc.ts 3 are not breaks
nm.ts (q1-q14 but q7)      444        154       32   every silent row repeats a family-file break
total                      820        441      189
```

The 13 breaks are below. `act.ts` `s69-ternary-sel` and the three `jsc.ts` rows are explained under "Not counted" and
"Out of scope". BT and JW are drive-rt only: drive-run has no cells in another language, and on `bnd.ts`, `jsw.ts`
and `min-rt.ts` it accepts 0 rows (`*-dr-out.txt`), so "n/a" in the table is observed, not assumed.

| id | class | statement | minimal program (`min.ts`, `min-rt.ts`) | rt | dr |
|----|-------|-----------|------|----|----|
| TP | 1 | S2.9 | `const t: [number, string] = [9, "1"]; t.reverse(); return t[0];` (g: number) | `string "1"` | same |
| HO | 1 | S2.9 | `const xs = [1]; xs[3] = 5; return [...xs];` (g: number[]) | `[1,null,null,5]` | same |
| OP | 1 | S2.9 | `const f: (x?: number) => number = (x: number) => x; return f();` | `undefined` | same |
| RP | 1 | S2.9 | `const f: (...xs: number[]) => number = (a: number) => a; return f();` | `undefined` | same |
| LI | 1 | S2.9, S3.17 | `let b: 1 = 1; b++; return b;` (g: 1) | `number 2` | same |
| SG | 1 | S2.9 | `"ab".split(/(x)?/)` (g: string[]) | `["a",null,"b"]` | same |
| AR | 1 | S2.9, S2.11 | `const g = async (): Promise<number> => { };` | `undefined` | same |
| SW | 1 | S2.9 (record types) | `const o = { a: 1, b: "s" }; const r: { readonly a: number } = o; return { b: 5, ...r }.b;` | `string "s"` | same |
| LE | 1 | S2.9 | `const v: number \| "1" = 1; if (v == "1") { return v; }` (g: "1") | `number 1` | same |
| FM | 1 | S2.9 | `const fm = <T,>(xs: readonly T[]): readonly T[] => xs.flatMap((x) => x); return fm([[1], [2]]);` | `[1,2]` | same |
| PA | 1 | S2.4, S2.11 | `const w = <T,>(x: T): Promise<readonly T[]> => Promise.resolve(x).then((v) => [v]); return w(Promise.resolve(1));` (g: Promise<readonly Promise<number>[]>) | `[1]` | same |
| BT | 1 | S11.4, S11.5 | `const g = (ext: [number, number]): number => ext[1];` with `ext` a proxy whose `length` reads 2, then 1 | `undefined` | n/a |
| JW | 3 | S4.6 | `const k = () => new Float32Array(2);` and a JavaScript cell `w(k)` that sets `k[0] = 9`; `g(k, w)` reads 9 | `number 9` | n/a |

`min.ts`: 13 candidates, 13 accepted, 13 silent, 3 of 3 controls fired, under both runners (`min-rt-out.txt`,
`min-dr-out.txt`); `min-probe-out.txt` gives ACCEPT for every non-control row. `min-rt.ts` (BT, JW): 2 of 2 silent,
1 of 1 control fired, drive-rt only (`min-rt-rt-out.txt`). Both runners gave the same `SILENT` set on every file that
both ran (`run.sh` prints `silent sets agree`).

Two programs in `min.ts` show a consequence beyond the bare type: `min-li-switch` (LI with S3.17: a `switch` the
checker counts as exhaustive falls off the end, so `g: string` is `undefined`) and `min-tp-pop` (a tuple element
typed `number` is `undefined`).

## Breaks, by class

### Class 1: type lies about plain data

**TP. Array mutating methods on a tuple** (`tup.ts`, 27 rows, 24 silent). S4.1 makes a tuple-typed local `Mut`, and
S3.2's mutating methods are accepted on a `Mut` receiver. The tuple type keeps its element types and length after
`reverse`, `sort`, `fill`, `unshift`, `copyWithin`, `shift`, `pop`, `splice` and `push`. Silent through a `Mut<[…]>`
parameter, a generic `<A, B>(m: Mut<[A, B]>)`, a published tuple read by another cell, a `switch (t.length)` and
literal tuples (`["a", "b"]` reversed gives `"b"` typed `"a"`). Loud when a method of the wrong type is then called
(`t-reverse-str-method`: `t[1].toUpperCase is not a function`). An alias of a tuple (`type P = [number, string]`)
is not writable (`t-union-tuple`, `[mutating-method]`). Rule that should stop it: a mutating method that can change
order or length is `[mutating-method]` on a tuple type, or a `Mut` tuple is typed as an array.

**HO. Holes from an index write past the end** (`tup.ts`, 17 rows, 13 silent; held: `h-destructure`, `h-find`, `h-at`, which add `undefined`). `xs[3] = 5` on a `Mut<number[]>` is
accepted. An index read is typed `number | undefined`, but `for…of`, spread, `Array.from`, `toSorted`, `with`,
`toSpliced`, `concat` and `reduce` read the holes as `undefined` typed `number`. `h-typed-loop` (one hole) returns 100 from
`typeof x === "number" ? 0 : 100` over the array. Rule: an index write on an array is accepted only where the index
is known to be `< length`, or the element type gains `undefined`.

**OP and RP. A required parameter given an optional or rest parameter** (`optp.ts`, 27 rows, 24 silent; `rest.ts`,
11 rows, 11 silent). `subtype.ss.ts` `fnSubWith` compares parameter types (`sub(tp, sp.t)`) without the target's `opt`
flag, and counts a target rest parameter as covering any number of required source parameters
(`required > t.ps.length + (tRest ? Infinity : 0)`). The 2026-11-25 rule in S2.9 covers extra arguments, not missing
ones. Silent through an annotation, a record member, an array element, an argument, a generic, `memo`, a conditional,
a cell input, a `Map` value, a default parameter, an interface call signature and a state write in an action.
Rule: a required parameter is not assignable from an optional parameter or from a rest parameter (`[arity]` or
`[type]`). OP and RP are one clause; they are listed apart because the fix has two arms.

**LI. `++` and `--` on a literal type** (`lit.ts`, 17 rows, 14 silent). `b += 1` is `[type]` ("number is not
assignable to 1"); `b++`, `++b`, `b--`, `o.n++`, `xs[0]++`, `t[0]++` are accepted. With S3.17 a switch the checker
takes as exhaustive has no case for the value, and the function returns `undefined` (`l-switch-dead`). A state cell
of type `1` holds 2 (`l-state`). A discriminated union reads the wrong member (`l-discriminant`). Rule: `++`/`--`
type as `x = x + 1`.

**SG. `split` with a group that does not take part** (`lit.ts`, 7 rows, 7 silent). `intrinsics.ts` declares
`split(sep: string | RegExp, limit?): string[]`. A capturing group in the separator that does not match puts
`undefined` in the result: `"ab".split(/(x)?/)` is `["a", undefined, "b"]`. `namedElemWith` already gives
`RegExpMatchArray` elements `string | undefined` for the same reason. Rule: with a `RegExp` separator the result is
`(string | undefined)[]`.

**AR. An async function's missing return** (`ret.ts`, 18 rows, 15 silent). `(): number => { while (true) { break; } }`
is `[type]` ("function lacks an ending return statement"); the same body with `async` and `Promise<number>` is
accepted for arrows, `function` declarations, object methods and nested helpers. Silent through a cell input,
`then`, `Promise.all`, a non-covering `switch` and `try/catch`. Rule: the ending-return check applies to the `T` of
`Promise<T>`.

**SW. A spread re-adds a member a width step hid** (`ret.ts`, 13 rows, 10 silent). `{ b: 5, ...r }` with
`r: { readonly a: number }` holding `{ a: 1, b: "s" }` is typed `{ b: number; a: number }`; the spread overwrites
`b` with `"s"`. Silent through a cell input, a state value, a nested record, an array element and a published record;
a function member hidden this way overwrites a function (`w-spread-fn-member`). Held: a union or a type parameter as
the spread (`unsupported`), a literal argument with the extra member (`[excess-property]`). This is the w1/y1 width
rule (S2.9 "a record type can omit any member") reaching a construct that copies every own key. Rule: a member
written before a spread of a record type is typed as the union of its type and `unknown` (or the spread is refused
when an earlier key is not declared by the spread's type).

**LE. `==` and `!=` narrow as `===`** (`gen.ts`, 12 rows, 9 silent). `v == "1"` with `v: number | "1"` holding `1`
is true, and the branch types `v` as `"1"`. Same for `1 == "1"`, `1 == true`, `0 == ""`, `"0" == 0`, a readonly
array `== "1"` and `!=` (`e-neq` returns `"1"` typed `number`). S3.12 accepts `==` when one side is a primitive.
Rule: `==`/`!=` narrow only by `null`/`undefined`, or narrow to the union of everything that coerces equal.

**FM. `flatMap` in a generic body** (`gen.ts`, 6 rows, 5 silent). The callback result `T` matches `U | readonly U[]`
with `U = T`; when `T` is an array at run time, `flatMap` flattens it. `readonly (readonly number[])[]` holds
`[1, 2]`. Silent through a function parameter and a published generic function (`f-flatmap-cell`). Rule: a
type parameter does not match `U | readonly U[]`, or `flatMap` with a type parameter result is unsupported.

**PA. A type parameter given a promise** (`gen.ts`, 4 rows, 4 silent). `Promise.resolve(x)` and `await x` adopt a
promise passed for `T`, so a `T[]` built from the result holds `1` where `T = Promise<number>`. The cell's type names
a promise, so the y1 hand-over check does not apply. Weakest of the list: `await` of the element gives the same
number; only a `then` member read or `typeof` sees the difference. Rule: `await x` and `Promise.resolve(x)` for
`x: T` give a type that is `T` with any promise unwrapped, or a type parameter given a promise type is refused.

**BT. The boundary reads a tuple's length twice** (`bnd.ts`, drive-rt only, 12 rows, 8 silent). `boundary.ts`
`copyEnter` checks `v.length !== s.els.length`, then `copyOpen` allocates `new Array(v.length)`. A JavaScript proxy
that answers 2 then 1 gives the cell `[1]` typed `[number, number]`. Silent in a record, an array, a union, `for…of`,
a function result and an async function result. S11.4 and S11.5 say a value from another language is checked
against the parameter type before the body sees it; here the check passes on one length and the body gets another.
S9.8's "reads each property of v one time" sentence is written for `cast`, and the `cast` row held: `b-cast-tuple`
(the `unknown` copy reads the length once). Also held: an element getter, a plain array length. Rule: `copyEnter`
reads `length` once and passes it to `copyOpen`, as the `cast` path does.

### Class 2: purity and state

No break. `act.ts` drives the 52 S6.9 routes of `q7.ts` with `actDrive` (b is called with `c = 0`, then `a` sets
`c = 1`, then the latest `b`; DIFF when `k` differs). 50 were rejected. Two of those are vehicle artifacts, not S6.9
verdicts: `s69-async-cell` and `s69-generator-cell` were rejected at the prepended `a` cell (`[inject-unknown]`), so
the async-cell route is not tested. The 48 others carry `[action-capture]` or `[mut-capture]`. `s69-mut-forEach-taint`,
accepted in the `q7.ts` probe, was accepted again and its drive printed `same`. The routes: receivers,
`Array.from({ length: c })`, `filter`/`find`/`toSorted`/`reduce` callbacks, the `reduce` accumulator, a readonly
alias of a `Mut` pushed a state value, implicit flow into a `Mut` (`if (c > 0) xs.push(1)`, `switch`, `while`),
loop counters, a `catch` binding, a `Map`, nested parameters named `log` and `invalidation`, locals named `log` and
`invalidation`, `function` declarations, forward-read helpers, object methods, `equals`, `JSON.stringify`, templates,
`memo` and `cast` results, `update` and listener parameters, a plain generator cell taken by value. Both controls
fired.

`commit.ts` (15 rows, 0 silent): S6.10 rollback (throw after a set, after a nested action, in `update`, in a
`forEach` callback), S6.10 caught throws (writes before the throw kept, including a `set` inside a caught `update`),
S6.8 `read`, S6.14 shared commits (two calls give the reader `[0, 2]`, not `[0, 1, 2]`). The S6.14 rows use
`p.values`, which drive-run does not have, so they are meaningful under drive-rt only; under drive-run their drives
threw, and one control did not fire (`controls 2, ran 2, fired 1` in `commit-dr-out.txt`).

### Class 3: mutation

**JW. A JavaScript cell writes a published typed array** (`jsw.ts`, drive-rt only, 11 rows, 9 silent). S4.6
publishes a typed array as a copy, and every reader gets that one copy. A cell in another language writes it with no
throw, and a SoundScript reader sees the write (`j-typed-index`, `j-typed-in-rec`, `j-typed-in-arr`, `j-typed-fill`,
`j-buffer`, `j-state-typed`). S4.6 says "A write to a published value, from any code, throws a TypeError". Also
silent, by reflection: `Map.prototype.set.call(k, …)` on a frozen `SsMap`, `Set.prototype.add.call`, and the native
`URL` `host` setter on a frozen `SsURL` (`freeze.ts` refuses only through the subclass methods). Held: a frozen array
(`Attempted to assign to readonly property`) and `k.set` on a frozen `Map`. The typed-array case is the spec's own
limit (S4.8: "A freeze does not stop a write to a typed array"); the copy protects readers from the cell, not from
each other. The owner may count JW as a statement to narrow rather than a defect. Rule: give each reader its own copy
of a typed array, or narrow S4.6's "from any code" to SoundScript code. JW needs adversarial JavaScript in a cell; no
SoundScript program found reaches it (below).

No break from SoundScript code. `q10.ts` (16 rows): a view of an input's buffer (`new Float32Array(k.buffer)`,
`new Uint8Array(k)`, `subarray`, `fill`, `set`, `sort`) in a cell, an action, a `memo`, a record field and a
generator input: all `[member-write]` or `[mutating-method]`.

`mut.ts` (23 rows, 10 accepted, 0 silent; control fired under both runners): the S4.11/S4.12 forms the checker does
not see, then a write after the hand-over. `const st = s.set`, `const { set } = s`, `s["set"](xs)`, a name bound
after the `set`, `get().push(2)` through a helper, and the same through an `Action<[readonly number[]]>` argument
were all accepted, and every one threw at the write (`call threw: Attempted to assign to readonly property.`), so the
run-time freeze is what stops them. Rejected: a callback that both sets and writes (`[mutating-method]`), `update`
with a captured array (`[mut-capture]`), a record field, a spread holder, an array of handles. Generators that
`yield` and then write through an alias, a helper result, a record field or a name bound after the `yield` are
`[mut-yield]` (5 rows, plus an async generator); nested async functions that write after an `await` are
`[mut-await]`. A `memo` argument written after the call, sync and after an `await`, was accepted and threw.

### Class 4: name resolution and order

No silent break and no ReferenceError in either runner. Driven in `nm.ts`:

- `q3.ts`, `q4.ts`: a later local `Math`, `parseInt`, `undefined`, `NaN`, `Array`, `String`; `undefined` as a
  parameter, `catch` binding and destructured name; `function` declarations after a `return`, called early,
  shadowing a global, reading a later `const`. Verdicts over the two files: 22 ACCEPT, 14 `[type]`, 6 `[free-name]`,
  the rest other rules. The rows for a local `Number`, `JSON`, `structuredClone`, `Object` and `Promise` return
  constants, so they do not test whether the checker gives a shadowing local the intrinsic's special typing; that is
  not tested.
- `q11.ts`, 38 rows of forward reads: 34 `[free-name]` (IIFE, `toSorted` callback, method, JSX, template, default
  parameter, optional call, `let` alias, chains of three, a `function` declaration between, a block-scoped
  `function` used outside its block). Of the other 4: `fwd-listener` and `fwd-self-ref-call-before` were accepted and
  computed the expected value (`same: 1`, `same: 0`); `fwd-cell-shadow` is `[reserved-name]`;
  `fwd-satisfies-like` is unsupported. A forward read's body is checked in the scope of its declaration and not under
  the read's narrowings (`fwd-scope-inner`, `fd-scope`, `fwd-narrow-cond`, `fd-narrow-ret`).

**S2.6 `[prelude-shadow]` is enforced for `snapshot` only** (`pre.ts`, 81 rows, 70 accepted, 0 silent). S2.6: "A
local or a parameter with the name of a prelude function is `[prelude-shadow]`". A local, a parameter, a destructured
name, a `catch` binding, a `function` declaration and a `let` named `state`, `action`, `mut`, `freeze`, `borrow`,
`equals`, `on`, `read`, `messageOf`, `memo` or `cast` were accepted (66 rows); all six forms of `snapshot` were
`[prelude-shadow]`. `h` was accepted too (6 rows). This is a checker departure from a statement but not a silent
break: `pre2.ts` (12 rows, 9 accepted, 0 silent) used each shadowing local where the prelude name is special (`action`
returning 5, `memo` returning a number, `equals` inverted, `cast` returning `"s"`, `state`, `messageOf`, `on`, a
parameter named `read` in an action) and every one computed what the local says. The checker typed the call by the
local, not by the prelude. Where a shadowing local would have broken a rule it was caught by another rule
(`p2-memo-impure` `[mut-capture]`, `p2-freeze-mut` `[mutating-method]`, `p2-read-in-action` `[handle-pass]`).

Narrowing after assignment (`q6.ts`, 48 forms: `&&`, `||`, `??`, ternaries, arguments, literals, templates, loop
heads, `do…while`, `try`/`catch`/`finally`, `switch`) and member and element narrowing through an alias, a helper, a
`Mut` parameter, `forEach`, `pop`, `shift`, `reverse` (`q5.ts`): no lie found.

### Class 5: other

BT above came from reading `boundary.ts`. `freeze.ts` registers the captures of an `action` and a `memo`
(`prelude.runtime.ts:197`, `:266`), so a `RegExp` captured by one is frozen and its `lastIndex` cannot carry state
(not driven; read only).

## What held, with row counts

```
file      rows  accepted  silent  controls fired (rt / dr)
tup.ts      44     43       37      2/2 / 2/2     TP 24, HO 13
optp.ts     27     27       24      2/2 / 2/2     OP
rest.ts     11     11       11      1/1 / 1/1     RP
lit.ts      24     23       21      2/2 / 2/2     LI 14, SG 7
ret.ts      36     27       25      2/2 / 2/2     AR 15, SW 10; 5 key-type rows rejected
gen.ts      22     21       18      2/2 / 2/2     LE 9, FM 5, PA 4
commit.ts   15     15        0      2/2 / 1/2     S6.14 rows drive-rt only
act.ts      52      2        1      2/2 / 2/2     the 1 is not a break
mut.ts      23     10        0      1/1 / 1/1     every accepted row threw at its write
pre.ts      81     70        0      1/1 / 1/1     [prelude-shadow] for snapshot only
pre2.ts     12      9        0      1/1 / 1/1     shadowing locals keep their own meaning
jsc.ts       6      6        3      1/1 / 1/1     JavaScript callers; out of scope
nm.ts      444    154       32      1/1 / 1/1     q1-q14 but q7; every silent row repeats a family above;
                                                  21 accepted rows are verdict-only (see below)
bnd.ts      12     12        8      1/1 / 0/1     BT; drive-run accepts 0 (no outside cells)
jsw.ts      11     11        9      1/1 / 0/1     JW; drive-run accepts 0 (no outside cells)
```

Held, besides class 2 to 4 above: `Mut` variance (`Mut<number[]>` to `Mut<(number | string)[]>`, `Map`, record:
`[type]`); `State`/`Action` variance in every position tried (inject, record, generic, JSX `onClick`/`onInput`,
`on`); width into an index signature (`Object.values`/`entries`, through a spread literal, `Record`); width into a
record with an optional member re-added; object rest; tuples from spreads, `map`, `filter`, `slice`, `concat`,
`Array.from`, `Array.of`, `toSorted`, `with`; index-signature reads add `undefined`; string, typed-array and tuple
index reads; duplicate keys (`{ 1: …, "1": … }`, hex, exponent forms); a type with two names for one key; missing
returns in sync functions (11 forms); `&&`/`||` result types; destructuring defaults with `null`; generic
`Array.isArray` narrowing.

## Not counted

- `act.ts` `s69-ternary-sel`: `c > 0 ? action(() => k.set(1)) : action(() => k.set(0))`. The drive sees `k` follow
  `c` because the cell that takes `c` chooses between two actions; neither action body uses a state value. S6.9 is
  about what the body uses.
- `commit.ts` `c-caught-update-partial` first expected `k = 0`; the run gives 9, which S6.10 ("a write is applied to
  its call when it is made") predicts. The expectation was corrected to 9.

## Loud findings

Accepted, then a cell rejected with an error. These are not breaks. 0 ReferenceErrors were seen in any out file.

```
tup.ts  t-reverse-str-method   t[1].toUpperCase is not a function      TP, then a string method on a number
tup.ts  t-reverse-num-method   t[0].toFixed is not a function          TP, then a number method on a string
optp.ts o-method-length        undefined is not an object ('s.length') OP, then a member read
nm.ts   q9-async-nested        undefined is not an object ('s.length') AR, then a member read
nm.ts   q9-async-method        undefined is not an object ('s.length') AR, through an object method
mut.ts  7 accepted rows        Attempted to assign to readonly property  the run-time freeze, as designed
```

## Verdict-only rows in nm.ts

`nm.ts` picks a detector from g's written return type (`byRet`). For a type it does not know it falls back to a
detector that always passes, so these 21 accepted rows were run but not checked:

```
q1-map-string q1-fm-generic q1-fm-generic2 q2-fn-opt-param-cell q5-split-group q5-lit-union-inc q5-lit-arr-inc
q8-gen-return-val q9-async-fn-decl q9-async-noannot-arrow q12-loose-eq-str q12-loose-eq-bool q12-loose-eq-zero-str
q12-loose-switch-like q12-promise-generic q12-flatmap-generic q12-flatmap-generic-cb q12-flatmap-union q13-not-not
q13-typeof-narrow-undef q13-void-expr
```

Most are the same programs as rows of a family file with a real detector: `q12-loose-eq-str` is `gen.ts` `e-str`
(silent), `q5-split-group` is `lit.ts` `s-split-group` (silent), `q12-flatmap-generic` is `gen.ts` `f-flatmap-id`
(silent). So `nm.ts`'s 32 silent rows are a lower bound for its own rows.

## Out of scope and other observations

- **A JavaScript caller passes an action an argument of the wrong type** (`jsc.ts`, 6 rows, 3 silent under both
  runners). `b = action((v: number) => k.set(v))` called as `b("s")` leaves `"s"` in a `number` state
  (`jc-action-str`); `b()` leaves `undefined` (`jc-action-missing`); `b({ a: "s" })` for `{ readonly a: number }`
  (`jc-action-rec`). The run time does inspect arguments: an object with a `valueOf` function was refused ("an
  argument of the action b reaches a function or a promise that no finished cell has published"). No statement found
  promises a type check of a JavaScript caller's arguments (S6.13: "An event handler, a listener that delivers a
  value, or JavaScript makes it"; S11 checks values entering a SoundScript parameter from a cell). Out of scope unless
  the owner reads S11 as covering action arguments.
- **Attack 13's L (`Array.from` of `{ length: 1, 0: "s" }`)**: `intrinsics.ts` now declares that overload's result
  `unknown[]`, so `["s"]` is inside the type; attack 13's detector (`every x === undefined`) is stale. Its run of
  `min.ts` today reports `min-l-arraylike` silent for that reason only.
- **Attack 13's VA, U and T** no longer reproduce: `selfhost/freeze-attack13/min.ts` today gives 6 accepted, 1 silent
  (the L row above).
- `function*` with a `return` value not of the yield type is accepted (`q8` `gen-return-val`); nothing reads it, as
  attack 13 found.

## Could not test

- BT, JW and the S6.14 rows under drive-run (no cells in another language, no `values`).
- The async-cell and generator-cell S6.9 routes (`act.ts` vehicle rejected them at `[inject-unknown]`).
- Whether a local `Number`, `JSON`, `structuredClone`, `Object` or `Promise` is given the intrinsic's special typing.
- A browser run.
- Whether a SoundScript renderer path (JSX) or `compile` islands reach any break above: not tried.
- Proxies that lie on `getPrototypeOf` or `ownKeys` against the `rec` and `unknown` shapes of the boundary: not tried.
