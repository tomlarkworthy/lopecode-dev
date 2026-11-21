# Opaque handles: design, prototype, soundness argument

Started 2026-11-21; first written 2026-11-22 00:24 CET, results filled in by 00:40 CET (`date`). Work folder `selfhost/opaque-handles/`. Nothing outside it
was edited; no git command was run; `build.ts` and the browser `verify.ts` were not run.

In short: recommend the static type `Opaque<"name">` with minted tokens at the notebook boundary and raw objects inside
the runtime's own shells (§3). The patched checker gives the expected verdict on 89 of 89 probe cells (§4). The events
shell rewritten on handles passes its tests and the 50469-ordering delivery test, is 5 unchecked lines shorter, and
costs 2 to 10% (0.02 to 0.08 µs) more per delivered value on the linked path (§5). On 351 cells of the 25 checked
files outside `lite/infer`, and on today's `Events<T>` uses, the patch changes no verdict (§4). Six questions for the owner are in §10.

## 0. What is in this folder

| path | what |
|---|---|
| `base/` | copy of `lite/` (no `soundscript/` subdirectories, no `notebook/`), `prelude.runtime.ts`, `prelude.d.ts`, `run.ts`, taken 2026-11-21 |
| `proto/` | `base/` plus the Opaque patch to the checker cells, the boundary and the prelude (`edits.diff`, +107 −21 in 16 files, and `proto/lite/opaque.ts`, 36 lines) |
| `handles/` | `proto/` plus the events shell rewritten to hold handles (`handles.diff` against `base/`) |
| `probes.ts` | 89 probe cells with expected verdicts; `--original` runs them on the shipped checker |
| `events-today.ts` | what the shipped checker accepts on today's `Events<T>` handle |
| `demo-runtime.ts`, `.out.txt` | run-time behaviour with the check bypassed, design A against design C, and the patched boundary |
| `mutants/` | five mutants of the rewritten `events.ss.ts`, and one of the shipped one |
| `count-lines.ts`, `count-groups.ts` | code and bookkeeping line counts on the TypeScript AST and scanner; per group of names for cells.ts |
| `bench-events.ts` | µs per delivered value through the events shell |
| `check-file.ts`, `run-tests.sh` | the checker on one file of a tree; the copied test files run in a tree |
| `try.ts`, `try2.ts` | the patched checker on cells given on the command line (`try2.ts` also takes an outside list) |
| `tests.base.txt`, `tests.proto.txt`, `delivery.*.txt`, `bench.txt` | raw output of the test and bench runs quoted below |

Edits to the copies that are not part of the design: the vendored `observable-stdlib` import in
`browser/delivery.test.ts`, `browser/run.ts`, `boundary.test.ts`, `stdlib/runtime.test.ts` made absolute (the copy
is three directories deeper); `soundscript/*.ojs` copied (delivery.test.ts reads `spec.ojs`); `lite/node_modules`
symlinked. `base/` was rebuilt once: other agents changed `infer/rg-*`, `infer/cp-*` and `toolchain/` between my first
copy and the second, so `base/` is `proto/` with my edits reverted, and `diff -ru base proto` is the patch.

## 1. Requirements: where a shell keeps a foreign object for a cell

Read from the five shells. "Book lines" are lines naming the bookkeeping identifiers listed, counted by
`bun count-lines.ts` on the TypeScript AST (the innermost statement holding the name; a function counts its header
only). It is an upper bound of "exists only for this": a line such as `feed({ t: "listen", hid, lid, ... })` names
`idFor` and also does other work.

```
shell                      code lines  bookkeeping lines
lite/browser/cells.ts             145                 27   idOf idFor lastId handleObjects listenerObjects generators madeHandles handleIds
prelude.runtime.ts                198                 25   records over viewEls views actionNames storeHandleOf recordOf nameOfHandle
lite/jsx/render.ts                 59                 22   before made, .__handlers .__listening .__tag .__elem
lite/browser/workers.ts           121                 21   workers jobs qids out thrown dead
lite/stdlib/runtime.ts            125                  5   owners owner
```

| shell | object | store / lookup | what the cells need | lifetime today |
|---|---|---|---|---|
| cells.ts | events handle `{[EVENTS], name}` (runtime-made) | `handleObjects: Map<number, Handle>`, `idOf` | key `Delivery.handles`, hand back to the host's `placeOf`, test membership in the sweep's live set | strong Map; `forgetHandle` effect deletes |
| cells.ts | listener `on(e, a)` (runtime-made, frozen) | `listenerObjects: Map<number, Listener>` | key `Delivery.listeners`, compare (`listenerAt.get(k) === lid`), hand to the performer to call its action | strong Map; `forgetListener` deletes |
| cells.ts | action (checked function) | `idOf` only, as `aid` | compare (`releaseAction`) | WeakMap, never released, no retention |
| cells.ts | generator (guarded) | `generators: Map<number, Gen>` | hand to the performer (`next`, `return`) | strong Map; deleted at `return` |
| cells.ts | any handle | `madeHandles: WeakSet` | brand check of a value from outside (`isEvents`) | weak |
| cells.ts | a yielded value, a thrown error | passed into `step` as `unknown` (`Result.value`, `Failure.error`) | hold and pass on | in `Delivery` until delivered |
| prelude.runtime.ts | state handle (an `EventTarget`) | `records: WeakMap<handle, StoreRecord>`, `over`, `nameOfHandle` (symbol read) | store.ss.ts already holds it as `handle: unknown` in `Pending` and effects; keyed by `sid` | weak; GC with the handle |
| prelude.runtime.ts | view element (DOM, foreign) | `viewEls: WeakMap<handle, {el, check}>`, `views: WeakMap<el, handle>` | hand to the performer (`el.value = v`, `dispatchEvent`); one handle per element | weak |
| prelude.runtime.ts | action | `actionNames: WeakMap` | name it in messages | weak |
| render.ts | DOM node | expando properties `__handlers __listening __tag __elem` on the node; `before[]`/`made[]` arrays | the cells get positions (`o.old`, `o.kid`), the shell maps positions to nodes | with the node |
| workers.ts | Worker | `workers[slot]` | slot number | page lifetime |
| workers.ts | promise resolvers, job owner `{dead}` | `jobs: Map<qid, Queued>`, `dead()` scans owners per event | resolve / reject by `qid`; which queued jobs are dead | deleted at settle |
| workers.ts | a worker's reply, a post error | module slots `out`, `thrown` between `onmessage` and `perform` | hand back to `resolve` / `reject` | overwritten per message |
| stdlib/runtime.ts | owner `{dead}` per calling cell | `owners: Map<string, {dead}>` | mark superseded | strong, one per caller |

Where moving a table into checked state changes memory: every `WeakMap` above (`records`, `over`, `viewEls`,
`views`, `actionNames`, `idOf`). A handle held in an immutable `Map` in a cell's state is kept alive by that state.
SoundScript has no `WeakMap` intrinsic, and a frozen copied map cannot be weak. So the store's tables stay in the shell
unless a release event is added for state cells (there is none today: an unused state handle is dropped and collected).
The events shell is the one shell whose tables are strong already and released by explicit effects, so a handle in
`Delivery` keeps an object alive as long as today's Map entry does: until the step that removes it from `Delivery`. The
delivery test's "0 events handles left" counts `Delivery` entries (`liveEventsCount(delivery)`), which in `handles/`
is the only place the objects are held.

## 2. Today's `Events<T>` handle, the existing opaque type

`Events<T>` is already a value the checker lets a cell hold but not read: no members (`ixMemberless`),
`[handle-pass]` into `unknown`/`object`/a type parameter (`ixHandleIn`), uncloneable, nominal against records
(`{ events: "e" }` is not an `Events<number>`). `bun events-today.ts` on the shipped checker:

```
to {}                                    ok
to { a?: number }, then x.a              ok
to {}, to unknown, narrow, read name     ok
to {}[], to unknown[]                    ok
"k" in e                                 ok
equals(e, d)                             ok
template `${e}`                          ok
e + ""                                   ok
e == "x"                                 ok
messageOf(e)                             ok
[e].join()                               ok
[e, d].toSorted()                        ok
Promise.resolve(e)                       ok
{ ...e }                                 unsupported
e.name                                   rejected type
const x: unknown = e                     rejected handle-pass
```

The `{}` route is a hole in `[handle-pass]`: `recSubWith` (subtype.ss.ts) treats only `State`, `StateCell` and
`Action` as nominal, so an `Events` is assignable to a record with no required member, which is not on the
`ixHidden` list, and from there to `unknown`; the third line reads the handle's `name` through `"name" in y`. For an
`Events` handle this reads the cell's name (runtime data). For a foreign object under design A it would read the
object's properties and run its getters. Opaque does not inherit these: every line above is a reject for
`Opaque<B>` in `probes.ts`. Fixing them for `Events` is outside this task (it would change shipped verdicts).

## 3. Design space

### Run-time behaviour, check bypassed (`bun demo-runtime.ts`)

A "foreign object" is a Proxy that logs every trap and has `toString`, `then` and `toJSON`. "ran:" is what foreign
code ran. Excerpt of `demo-runtime.out.txt`:

```
A equals(h1, h2)          -> false        ran: a1 getPrototypeOf, a2 getPrototypeOf, a1 ownKeys, ... a1 get tag, a2 get tag
A `${h}`                  -> "secret-a1"  ran: a1 get Symbol(Symbol.toPrimitive), a1 get toString, a1.toString
A [h, h2].toSorted()      -> 2            ran: a1.toString, a2.toString
A JSON.stringify(h)       -> "secret-a1"  ran: a1 get toJSON, a1.toJSON
A messageOf(h)            -> "secret-a1"  ran: a1 getPrototypeOf, ... a1.toString
A await h                 -> "secret-a1"  ran: a1 get then, a1.then
A ({...h})                -> ...          ran: a1 ownKeys, ... a1 get then, a1.then
A h.tag = 1               -> 1            ran: a1 gOPD tag, a1 get tag        (the foreign object was written)
C equals(h1, h2)          -> false        ran: nothing
C `${h}`                  throws TypeError: No default value       ran: nothing
C await h                 -> {"h":1}      ran: nothing
C ({...h})                -> {"h":1}      ran: nothing
C h.tag = 1               throws TypeError: Attempting to define property on object that is not extensible
C structuredClone(h)      -> {"h":1}      ran: nothing
bare equals(t1, t2)       -> true         (a token with no own field)
bare deepEqual(t1, t2)    -> true
cross({ x: bare1 }) then { x: bare2 } (no field) -> [true]   (the boundary hands back the old copy)
unwrap("node", structuredClone(C1))   throws TypeError: Opaque<"node">: expected a handle
unwrap("gen", C1) (another brand)     throws TypeError: Opaque<"gen">: found a handle of Opaque<"node">
```

Two findings decide the token's shape:

- A token with no own field is `equals` to every other token, and `deepEqual`/`sameCopy` (the boundary's reuse of the
  last copy, boundary.ts `cross`) treat two tokens as one, so a redelivered *different* object would reach the cell
  as the old handle. A token with one own field, its mint number (`{ h: n }`, null prototype, frozen), makes
  `equals`, `deepEqual` and `sameCopy` identity on tokens with no change to any of them.
- Under A the list of routes that run foreign code is open: ToPrimitive (template, `+`, `==`, `join`, default sort,
  `String`, `messageOf`), thenable resolution (`await`, `Promise.resolve`, an async cell's result, the Observable
  runtime's own check of a cell value for `then`), ToPropertyKey, spread and `Object.keys`, `JSON` `toJSON`,
  `equals`. The Observable runtime also inspects every cell value (a generator is iterated, a DOM node is inserted by
  the inspector): a raw DOM node or generator as a cell's value is an effect, outside anything the checker sees.

### The designs

| | A: `Opaque<B>` by reference | B: ids in one trusted table | C: `Opaque<B>` as a minted token | D: branded ids |
|---|---|---|---|---|
| value a cell holds | the foreign object | a number | frozen null-prototype `{ h: n }`; object in a WeakMap of `opaque.ts` | a number typed `Id<B>` |
| checker adds | the type, brand, invariance, `sameHandle`, every coercion route (open list, §3) | nothing | the same type and rules; a missed route is a TypeError at run time, not foreign code | a nominal number type and invariance |
| boundary in | pass the reference; the brand cannot be checked | — | mint (WeakMap get, no read of the object); brand recorded; a token of another brand refused | — |
| boundary out (argument of a foreign function) | pass the reference | — | unwrap; a clone, a forged `{h:1}` or another brand refused | — |
| identity | `sameHandle` = `Object.is` | `===` on numbers | `sameHandle` = `Object.is`; Map/Set/includes by identity | `===` |
| `equals` / boundary reuse | walks the foreign object (traps run) | numbers | identity via the field | numbers |
| Observable runtime inspecting a cell value | iterates a generator, inserts a node, reads `then` | inert | inert (`Object {h: 1}`) | inert |
| a handle in state keeps the object alive | yes | no (the table does, until a forget effect) | yes (WeakMap entry lives while the token does) | no |
| id swap (handle id for listener id) | `[type]` | accepted | `[type]` | `[type]` |
| shell tables | none | one generic Map with explicit release | none in the events shell; one generic WeakMap pair in `opaque.ts` at the boundary | as today |

Recommendation: **C at the notebook boundary, with the A representation allowed inside the runtime's own shells**
(they call the step cells directly, never through `cross()`, and the step cells' state is not a cell value the
Observable runtime inspects). The checker rules are the same for both. C is defence for the case where the checker
misses a route: a coercion throws `TypeError: No default value`, a read gets `undefined`, nothing of the other
language runs. The shell rewrite below uses the A representation and measures it.

The alternative with the least code that gets the main benefit for the shells is D plus B: a branded id type would have caught
the id-swap mutant (§5) with no boundary change, and one table replaces three. It does not remove lookups, does not
let a cell's value hold a DOM node, and keeps the explicit forget effects.

## 4. The prototype (`proto/`)

Patch, all of it in `edits.diff`:

| file | change |
|---|---|
| `intrinsics.ts` | `interface Opaque<B> { readonly opaque: B }`, `declare function sameHandle<B>(a: Opaque<B>, b: Opaque<B>): boolean`, `sameHandle` in `PRELUDE_FNS` |
| `registry.ts`, `infer/rg-convert.ss.ts` | `Opaque` takes one type argument |
| `infer/ix-core.ss.ts`, `infer/cp-members.ss.ts` | no members (`[type] Opaque<"n"> has no members`), none offered in completion |
| `infer/ix-hides.ss.ts` | `Opaque` in `ixHandleIn` (`[handle-pass]`); new cells `ixOpaqueIn`, `ixOpaqueUse` (`[opaque-coerce]`, 26 lines), `ixOpaqueNoMembers` (`in` and object spread on a handle are `[type]`) |
| `infer/ix-expr.ss.ts` | `ixInfer`, and `ixCheck1` for object literals and calls, call `ixOpaqueUse` |
| `infer/ix-prelude.ss.ts` | `ixSameHandleCall`: two arguments, each a handle, one brand |
| `infer/ix-apply.ss.ts` | `ixBrandTvs`: a type variable in `Opaque<B>` is not widened at inference (`"n"` stays `"n"`) |
| `subtype.ss.ts` | nominal against records (closes the `{}` route of §2); invariant in `B` |
| `walks.ss.ts` | uncloneable (`[compile-boundary]`); `structuredClone` already refuses an unknown named type |
| `shape.ss.ts`, `runtime.ss.ts`, `cross.ss.ts` | shape `{ k: "opaque", brand }` for a string-literal brand; `Opaque<string>` is `[boundary-type]` |
| `boundary.ts` | in: mint; out (a foreign function's arguments, `checkShape(..., out = true)`): unwrap |
| `opaque.ts` (new) | `mint`, `unwrap`, `isToken`, `sameHandle` |
| `prelude.runtime.ts` | exports `sameHandle` |

`===` on two handles stays `[strict-eq-object]`; the comparison is `sameHandle`. A `Map`/`Set` key, `includes` and
`indexOf` are accepted: for a handle these are identity, which is the one observation offered.

### Probe results

```
$ bun probes.ts | tail -1
patched checker: 89 probes (31 want ok, 58 want a rule); 89 as expected; off: none
$ bun probes.ts --original | tail -1
shipped checker: 89 probes (31 want ok, 58 want a rule); 5 as expected; ...
```

(The shipped checker does not know `Opaque`; its 5 matches are rejects for other reasons. It is a control that the
probes depend on the patch.)

Accepted (31): hold, pass to a local function, in a record, array, conditional, nullable and `== null`, Map key,
Set key, `includes`, `indexOf`, `sameHandle`, `sameHandle` through a generic `<B>`, `equals`, a union of two
brands held, `typeof a === "object"`, `await a`, `Map<Opaque<"n">, number>`, a spread of a record holding one, `in`
on a record holding one; across the boundary: hold, compare, give to a declared foreign function `(n: Opaque<"n">)
=> number`, receive from one, nullable, inside a record of rows, a state cell's data, a state `Map` keyed by handles,
an events cell's payload, an action's parameter, a listener on `Events<Opaque<"n">>`.

Rejected (58, each with the rule expected): member read (`.x`, `.opaque`, `["h"]`, `?.`, `[0]`), method call, call,
member write, `delete`, destructuring, object spread, array spread, `for of`, `in`, `new`, `Object.freeze`,
`typeof === "function"` then call; to `unknown`, `object`, `{}`, `{ x?: number }`, `unknown[]`, a type parameter,
and back from `unknown` at another brand; between brands, to `Opaque<string>`, to `Opaque<"n" | "g">`, through
`Opaque<"n"> | Opaque<"g">`, `sameHandle` across brands, `as`; forged from `{ opaque: "n" }`, from `{ h: 1 }`, from
a narrowed `unknown`; `Opaque<string>` at the boundary, `Opaque` without a brand; `structuredClone` (direct and in a
record), `snapshot`, `JSON.stringify` (direct and in a record), `throw`, template (direct and of an array), `+ ""`,
`String`, `== "x"`, `<`, unary `+`, `messageOf`, `join`, `toSorted()`, a computed key, `===`, `Object.is`,
`Object.keys`, a JSX child, an island input sent to a worker, an action capturing a handle from another language.

Surprises, in order found:

1. `sameHandle(a: Opaque<"n">, b: Opaque<"g">)` was first accepted: `ixPreludeCall` returns `ERR` for a prelude name
   it has no case for, without checking the arguments, so a declared prelude function is not typed by its
   declaration. Fixed with `ixSameHandleCall`. Every new prelude function needs its own case.
2. A generic `<B>(x: Opaque<B>, y: Opaque<B>)` called with `Opaque<"n">` was `[type] not assignable to
   Opaque<string>`: inference widens a literal it solves (`ixWidenFree`), and invariance then refuses it. Fixed by
   not widening brand variables (`ixBrandTvs`).
3. The first `ixOpaqueUse` refused a spread of any record that holds a handle anywhere. The rewritten
   `events.ss.ts` (`{ ...h, busy: true }` on a record with a `gen` field) was rejected in 21 cells. A spread and
   `in` now refuse only a value that is itself a handle; the coercion routes still refuse a handle anywhere inside
   (so `${{ a: h }}` is refused, though it prints `[object Object]` without touching `h`).
4. `{ ...e }` on today's `Events` is `unsupported`, not a reject.

The copied test files give the same result in `base/` and `proto/` (`tests.base.txt`, `tests.proto.txt`): boundary
130, erase 6, workers 8, checks 14, complete 58, cross 24, events 29, narrow-kinds 45, pool 25, render 25, shape 21,
store 38, walks 13 pass, stdlib/runtime passes; acorn, syntax, raw-cells, ts-cells, ss-toolchain, `infer/cp` and
three of five `infer/infer` tests fail in both trees (paths and file lists of the copy, not the patch). The `infer`
test "every ix, ow and md cell is accepted by the checker" passes in `proto/`, so the new checker cells check under
the patched checker.

No existing verdict moved, measured 2026-11-22 00:36 CET:

```
$ for t in base proto; do bun events-today.$t.ts > events-today.$t.txt; done; diff events-today.base.txt events-today.proto.txt
(no output: the 22 lines of §2 are identical)
$ # check-file.ts over each of the 25 *.ss.ts files outside lite/infer, in both trees (verdicts.{base,proto}.txt)
$ diff status.base.txt status.proto.txt; diff rules.base.txt rules.proto.txt   # cell verdicts; rule lists without line numbers
(no output: 351 cells, the same verdict and the same rules in each)
```

The raw `verdicts.*.txt` differ only in line numbers of the files the patch adds lines to. Most of the 162 cells
that are not ok in both trees are compiler cells checked out of their linking context. The `infer` tests that compare
against a corpus (the port against the Checker, `checkSources` against the md cells) fail in both trees, so the
corpus was not compared.

Cell sizes (`bun cell-sizes.ts <file>`, lines per top-level declaration): the largest new cell is `ixOpaqueUse`
with 26 lines. `ixMayHide`, in the same file, is 30 lines in `base/` too. `ixApply` is 22 lines after the patch,
`ixPreludeCall` 24 and `ixBrandTvs` 13. The largest cell of `events.ss.ts` is `dispatch` at 26 lines in both trees.
`ixOpaqueUse` was 32 lines when first written. Splitting it by returning the helpers from a second cell was refused
by the patched checker ("Mut T captured by a function that escapes"). It is now split into `ixOpaqueNoMembers`
(`in` and spread) and `ixOpaqueUse` (the coercions). After the split the probes are 89 of 89 again, the `infer`
acceptance test passes, `events.ss.ts` checks with 43 cells and 0 not ok, `events.test.ts` passes 29 and the five
mutants give the same rules.

## 5. The events shell on handles (`handles/`)

`events.ss.ts`: ids become `EvH = Opaque<"events">`, `LisH`, `ActH`, and the record gains `gen: Opaque<"generator"> |
null`; the six `===`/`!==` on ids become `sameHandle`. `cells.ts`: `idOf`, `idFor`, `lastId`, `handleObjects`,
`listenerObjects`, `generators` removed; the generator is read from `Delivery` (`genOf`), for `return` from the state
the effect's step started from (stopping a generator removes it from the state the step returns); the
`forget*` effects are no-ops. `runtime-ss.ts`, which links the step cells for the shells, imports `sameHandle` from
`opaque.ts` and passes it in the prelude object. One harness line changed in `events.test.ts`: its `link` call passes
`sameHandle: Object.is` (the test links the cells with its own prelude object). No assertion changed; the tests pass
numbers as handles, which `sameHandle` and Map keys accept at run time.

```
                              base     handles
cells.ts code lines            145         140
  naming the id maps            22           0
  H casts (erase to nothing)     —          11
  genOf / before                 —           6
  madeHandles / handleIds        6           6
events.ss.ts code lines        290         298   (+4 type aliases, +4 lines for sameHandle with a const)
```

(`bun count-groups.ts`; one line can name names of two groups, so the rows do not add up to `count-lines.ts`'s
totals of 27 and 21.)

So the unchecked shell is 5 code lines shorter, the checked cells 8 longer. The 11 `H` casts exist because
TypeScript has no `Opaque`; a `type Opaque<B> = object` in `prelude.d.ts` would remove them. Deleting the now
unused `forgetListener`/`forgetHandle` effects would remove 2 effect kinds from `events.ss.ts`, 2 cases from
`cells.ts` and change 3 assertions of `events.test.ts`; not done, to keep the tests unchanged.

Checks and tests:

```
$ bun check-file.ts handles handles/lite/events.ss.ts
handles/lite/events.ss.ts under handles: 43 cells, 0 not ok, 0 module errors
events.test.ts        29 pass, 0 fail
stdlib/runtime.test.ts  pass (12 pass lines)
render.test.ts        25 pass, 0 fail
delivery.test.ts      pass delivery: 50469 orderings, 0 fail; 0 listeners left attached, 0 events handles left
                      (base: the same line; 10m58s, delivery.handles.txt)
```

Mutants of the rewritten `events.ss.ts` (`mutants/`), each rejected in one cell:

```
eq       x !== lid back in detachListener          [strict-eq-object]
brand    forgetListener given l.hid for lid         [type] EvH is not assignable to LisH
text     `${h.gen}` in a fail message               [opaque-coerce]
member   h.gen.next read                            [type] Opaque<"generator"> has no members
unknown  h.gen pushed onto the unknown[] queue      [handle-pass]
brand-base  the same swap in the shipped events.ss.ts, base checker: 43 cells, 0 not ok
```

Cost per event, linked path (cells.ts calling step; no `cross()`), sync generator, one listener, frames pumped by hand:

```
$ cat bench2.txt       # bun bench-events.ts <tree> 100000 5, trees interleaved, three times; nothing of mine running
Sun 22 Nov 2026 00:38:02 CET
Now drawing from 'AC Power'
 0:38  up 6 days,  3:33, 0 users, load averages: 5.56 5.75 8.50
base     median 0.850   (0.876 0.838 0.838 0.934 0.850)
handles  median 0.891   (0.955 0.905 0.891 0.867 0.875)
base     median 0.781   (0.806 0.788 0.774 0.780 0.781)
handles  median 0.860   (0.880 0.838 0.860 0.865 0.854)
base     median 0.830   (0.869 0.854 0.818 0.818 0.830)
handles  median 0.849   (0.867 0.854 0.824 0.830 0.849)
```

Handles cost 0.02 to 0.08 µs per value more (2 to 10%), slower in all three pairs. The load of 5.6 is other agents'
work on the machine. An earlier run (`bench.txt`) overlapped this file's reviewer, which was running
`delivery.test.ts` in `handles/`; it is kept as a loaded run:

```
$ cat bench.txt        # the same command, loaded
Sun 22 Nov 2026 00:27:30 CET
Now drawing from 'AC Power'
 0:27  up 6 days,  3:23, 0 users, load averages: 6.78 11.37 12.33
base     median 0.863   (0.907 0.888 0.863 0.838 0.813)
handles  median 1.021   (0.974 0.972 1.043 1.023 1.021)
base     median 0.909   (0.975 0.955 0.909 0.853 0.837)
handles  median 0.911   (0.920 0.911 0.876 0.924 0.893)
base     median 0.827   (0.871 0.856 0.826 0.827 0.811)
handles  median 0.941   (0.936 0.920 0.941 0.969 0.994)
```

In that run, and in one pair the reviewer ran during its own delivery run (base 0.954, handles 1.191), the
difference was 0.00 to 0.24 µs. Where the extra
time goes was not measured; candidates are the `sameHandle` calls and the `gen` field copied in each record
spread. It does not measure the boundary: a minted token costs a WeakMap get per crossing, not measured either.

## 6. Soundness argument

What a checked cell can observe about a handle: whether two handles of one brand are the same object
(`sameHandle`, and through it `Map`/`Set` keys, `includes`, `indexOf`, `equals`). Under C additionally nothing else
at run time: the token has no prototype, one frozen field, and the checker gives the type no members.

| statement | effect |
|---|---|
| S2.6 (`structuredClone` of a type that may hold a function, `unknown`…) | holds: `cloneProblem` refuses `Opaque` as an unknown named type; needs `Opaque` named in the sentence |
| S3.1–S3.4 (writes, mutating methods, `Object.assign`, `delete`) | holds: no members; a write through a missed route throws on the frozen token (C) |
| S3.3 (only a record is assignable to a record type) | needs a new sentence: an `Opaque` is assignable to no record type, `{}` included |
| S3.12, S3.13 (`===`, `switch`) | holds unchanged; `sameHandle` is the comparison; needs one sentence naming it |
| S4 (`Mut`, `freeze`) | holds: a token is frozen; `mut(h)` gives a `Mut<Opaque>` whose members do not exist. Not probed |
| S5.5 (`snapshot`) | holds (`[type]`, probed) |
| S6.2, S7.5 (an input changes when not `Object.is`) | holds: the same object is the same token (mint per object and brand) |
| S6.7, S6.18 (state content) | holds: a handle in state is allowed; needs a sentence that it keeps the object alive |
| S6.9, S11.9 (action capture) | holds: a handle from another language is that cell's value, so state; an action takes it as an argument (probed) |
| S6.20 (renderer draws only Elems) | holds: a JSX child of type Opaque is `[type]` (probed) |
| S9.2, S9.6 (narrowing from `unknown`; `typeof`) | holds: no narrowing gives `Opaque` (probed); `typeof h` is `"object"` under C, a constant |
| S11.3 | needs a new clause: `Opaque<"literal">` may be an annotation and a function's parameter or result type |
| S11.4, S11.5 (checked, deep-frozen copy) | needs a new restriction: a handle is not copied; the object is not read on the way in; the brand is the annotation's word, not checked against the object (as S11.11 trusts meaning) |
| S11.5 ("the other language never holds a value the cell holds") | needs a new sentence: a handle given to a foreign function arrives as the object, which the other language had |
| S11.6 (an equal copy does not stop a reader) | holds: a different object gives a different token, and the reuse in `cross()` compares tokens by their field (demonstrated) |
| S11.11 (trusted) | needs a new sentence: a foreign function given a handle is trusted not to write through it, as it is trusted to write nothing |
| determinism | holds: identity of the same objects in the same order is the same; mint numbers are not observable to checked code |

Where I am not sure:

- The `ixOpaqueUse` route list is mine, not derived from the spec of ToPrimitive. Probed after the suite (`try.ts`, 2026-11-22): `Number(h)` and `String([h])` `[handle-pass]`; `isNaN(h)`, `"x".localeCompare(h)` `[type]`; `[h].toLocaleString()`, `[[h]].join()` `[opaque-coerce]`; `"x".concat(h)` unsupported; `mut({ a }); m.a = a; freeze(m)` ok. Not probed: `Intl`, tagged templates (unsupported today), every intrinsic whose parameter is `unknown` beyond those. Under C a missed one throws; under A it runs foreign code.
- The check-bypassed demonstrations are on the run-time functions, not on compiled cells: the probes' rejected cells were not compiled with the check off and run.
- `State<Opaque<B>>` at the boundary (an Observable view holding a handle) is not designed: `viewRef` uses one `check` for reads and writes, so a write would store the token in the view.
- A handle of the same object under two brands is two tokens; whether that should be refused at mint is open.
- `mut(h)` directly, generators yielding handles across `borrow`, and `await` of a promise of a handle were not probed.
- Under the A representation in the shells, soundness rests on the checker alone for the step cells.

## 7. Spec impact (proposals; statement prose is the owner's)

Proposed new statements, section 11:

- **S11.12 (proposal)** `Opaque<"name">` takes a value of another language that is an object or a function, as a
  handle. The handle is not copied and the object is not read. Two handles of one name are the same when they were
  made from the same object; `sameHandle(a, b)` says so. A handle has no members and no text: reading, writing,
  calling, spreading, destructuring or iterating one is `[type]`, giving it a type that hides the name (`unknown`,
  `object`, a record type, a type parameter) is `[handle-pass]`, converting one to a primitive is `[opaque-coerce]`,
  and `Opaque` with a name that is not a string literal is `[boundary-type]` at the boundary and `[type]` elsewhere.
- **S11.13 (proposal)** A handle given to a function of another language arrives there as the object it was made
  from. A value that is not such a handle, a copy of one included, is a mismatch (S11.4).

Changed: S3.12 (name `sameHandle`), S11.3 (allow `Opaque<"name">`), S11.5 (the exception for handles), S11.11 (trust
for functions given handles), S6.7 or a new S6 sentence on lifetime.

New rule ids: `[opaque-coerce]`. No other new id: member, spread and `in` reuse `[type]`, hiding reuses
`[handle-pass]`.

Reject rows for the spec tables (each is a probe in `probes.ts`):

```
{ statement: "S11.12", rule: "type",          source: "const f = () => (a: Opaque<\"n\">) => a.x;" }
{ statement: "S11.12", rule: "type",          source: "const f = () => (a: Opaque<\"n\">) => { const u: {} = a; return 1; };" }
{ statement: "S11.12", rule: "type",          source: "const f = () => (a: Opaque<\"n\">) => { const g: Opaque<\"g\"> = a; return g; };" }
{ statement: "S11.12", rule: "handle-pass",   source: "const f = () => (a: Opaque<\"n\">) => { const u: unknown = a; return 1; };" }
{ statement: "S11.12", rule: "opaque-coerce", source: "const f = () => (a: Opaque<\"n\">) => `${a}`;" }
{ statement: "S11.12", rule: "strict-eq-object", source: "const f = () => (a: Opaque<\"n\">, b: Opaque<\"n\">) => a === b;" }
{ statement: "S11.12", rule: "boundary-type", source: "const f = (node: Opaque<string>) => 1;", outside: [{ name: "node" }] }
{ statement: "S2.6",   rule: "type",          source: "const f = () => (a: Opaque<\"n\">) => structuredClone(a);" }
```

## 8. Implementation cost of integration

Measured on the prototype: checker cells and glue +107 −21 lines in 16 files, `opaque.ts` 36 lines; the events
rewrite +69 −60 in `events.ss.ts` and +30 −32 in `cells.ts` (`handles.diff`). Not done and needed for integration,
estimated, not measured:

| item | files | lines (estimate) |
|---|---|---|
| the patch carried into the notebook copies of the checker and runtime modules (`build.ts` regenerates them) | the generated notebooks | 0 hand-written if `build.ts` picks the files up |
| `sameHandle` in the compiled notebook's runtime module | 1 | 5 |
| spec statements S11.12, S11.13 and the changed sentences (§7) | `spec.ojs` | 30 to 50 |
| `test_spec_*` rows for them (the eight reject rows of §7 and as many accepts) | `spec.ojs` | 20 |
| `type Opaque<B> = object` and `sameHandle` in `prelude.d.ts` (removes the 11 `H` casts) | 1 | 3 |
| hover text for `Opaque` | 1 | 5 |
| a design for `State<Opaque<B>>` | not designed | unknown |
| total, without `State<Opaque>` and the tutorial | about 20 files | about 250, with the 143 measured lines of the patch and `opaque.ts` | The
store and renderer shells would not shrink without a weak-map story (§1).

## 9. Dead ends

- A token with no own field: `equals` and the boundary reuse call two tokens equal (§3).
- Checking "holds a handle anywhere" for spread and `in` (§4, surprise 3).
- Relying on the prelude declaration to type `sameHandle` (§4, surprise 1).

## 10. Questions for the owner

1. `sameHandle(a, b)`, or `===` allowed on two handles of one brand (S3.12 changed instead of a new prelude name)?
2. Is the A representation acceptable inside the runtime's own shells, or should the shells mint tokens too (one
   WeakMap read per effect)?
3. Should the `{}` route and the coercion routes be closed for `Events<T>` and `State<T>` as well (§2)? It changes
   shipped verdicts.
4. A brand is unchecked at the boundary. Should a module be able to give a brand a run-time predicate, trusted as a
   foreign function is?
5. Lifetime: is a handle in state keeping its object alive acceptable, or does state need a release event first?
6. Delete the `forget*` effects (and change three `events.test.ts` assertions)?

## 11. Review

A fresh-context review (`/review-notebook`, 2026-11-22 00:24 to 00:33 CET) gave FIX with seven findings. All seven
were taken: two unfilled result placeholders, the `runtime-ss.ts` change left out of §5, the line-count breakdown
that no script printed (now `count-groups.ts`), +103 counted as +104 (blank added lines were missed; now +107 after
the cell split), a summary at the top, and the folder table and header time. After it, `ixOpaqueUse` was split to
26 lines and the verdict differential of §4 was added; neither was reviewed.
