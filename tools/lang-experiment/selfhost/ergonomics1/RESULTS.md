# SoundScript ergonomics, first pass (2026-11-23, 06:46:21–07:08 CET, times from `date`)

40 ordinary programs, written the way a TypeScript/Observable user would write them after reading the tutorial, checked with `checkSources` (`lite/core.ts`), run with `runCells` (`lite/browser/run.ts`), and repaired where they were rejected. Then 15 programs that each contain a bug the language is meant to catch.

## Raw numbers

```
first-draft acceptance        13 of 40
  data transforms  01-10       2 of 10   (01, 08)
  algorithms       11-16       1 of 6    (15)
  state/actions    17-25       4 of 9    (17, 18, 19, 22)
  events           26-29       2 of 4    (26, 27)
  async            30-33       0 of 4
  views            34-37       2 of 4    (35, 36)
  helpers/generic  38-40       2 of 3    (38, 40)
accepted drafts that compute the expected answer   12 of 13
  (19 is wrong because of my own logic: Number("") is 0, so an empty age passes. The language is not at fault.)

rejected drafts               27
  fixed from the message alone (plus ordinary TS knowledge)   23
  needed the tutorial                                           3   (09 Date, 16 LRU, 29 click time)
  needed the spec                                               1   (34 per-row remove button; see its row)
  stuck after 5 attempts                                        0
  repair attempts in total                                     40   (27 programs; 1 attempt for 17, 2 for 9, 5 for one)
  drafts whose messages suggested any fix                       7   (10, 12, 16, 28, 29, 31, 34)
    suggestion worked as stated                                 4   (12's hint, 28, 31's "await it", 34's "wrap in action")
    suggestion did not work or did not apply                    4   (10, 16, 29, 34's second message)
  of the 23, a fix carried over from an earlier program         6   (06, 07, 23 reuse 02; 31, 32, 33 reuse 30)
after repair: 40 of 40 accepted; 39 of 40 compute the expected answer (19 as above)

bug probes                    15
  rejected by the checker     15
  thrown at run time           0 (checker on); 12 of 15 throw or discard the write when the checker's verdict is overridden, 3 run silently
  accepted and wrong           0
  plus one variant (B04b), the idiomatic race: accepted; the final state depends on which fetch answers first
tool defects                   1 checker hang; see "Tools"
```

Everything above came out of `drafts-results.txt`, `repairs-results.txt` (every attempt, rerun at 07:07), `fixed-results.txt` (the final set, plus the `29b` drive for 29), `probes-results.txt`, `probes-forced.txt` and `isolate-results.txt` in this folder. `run.ts` produced them all. In `fixed-results.txt`, 29 shows RUN FAIL under the original button drive and PASS under `29b`, and 19 fails for the reason above.

## Method, and what I read

- **Reading before the first program.** I read tutorial lines 1–643 of 1177; the rest is test cells and two appendices, which I did not read. I also read the nine examples in `lite/notebook/examples/` and the two companion files `tutorial-async.tsx` and `tutorial-ordinary.tsx`. That took about 20 s of wall time (06:46:21 → 06:46:41). An agent reads far faster than a person, so this time says nothing about a human newcomer. Measured by amount instead, a person has about 640 lines of tutorial prose and 300 lines of example code to read.
- **Harness sources.** To find the checker entry point and the runner, I read `freeze-attack4/probe.ts`, `freeze-attack3/harness.ts`, `freeze-attack7/lib.ts` and `drive-run.ts`. They contain idioms of the language (for example `const c: readonly number[] = xs`) that a real newcomer would not have seen. I did not read the spec or the checker source before Phase 2.
- **Program 0** (`program0-first-check.ts`, 06:47:16) was a two-cell check of the harness, run before any draft was written. `xs` was accepted; `[...xs].sort(...)` was rejected with `[mutating-method] write to a number[], which is not Mut`. So I had seen that message before I wrote the drafts. I still wrote `[...x].sort` wherever it came naturally (02, 06, 07, 23, 31).
- The first full check ran at 06:52:35; draft 01 was the first whole program accepted (06:52:36).
- The drafts were written 06:47–06:51 and hashed (`drafts.sha256`; all 40 still match). The expected answers and the drive steps went into `manifest.ts` at 06:52:05, before the first check at 06:52:35. Two drives were added in Phase 2 (`29b`, `34b`) because the repaired programs changed the UI element (a canvas instead of a button, a checkbox instead of a button). The expected values did not change.
- The check ran with `tsx: true` only for `.tsx` files. Accepted programs ran with deterministic `now` (+16 ms per read) and `random`, a URL-keyed `fetch` stub (404 for anything not listed), and a private frame queue for `scheduler.frame`, pumped by the drive.
- `repairs/NN/aK.*` holds every attempt. `fixed/` holds the final version of each program. `diffstat.txt` gives the lines changed per program (draft lines, final lines, `diff` lines `<`/`>`). `isolate/` holds the programs that separate one cause from another.

## Per-program repair record

"Fix worked" means the message's own suggested fix, applied as written. "none" means the message suggests no fix.

| # | rule(s) on the draft | suggested fix in the message | attempts | taught by | diff lines | result |
|---|---|---|---|---|---|---|
| 02 | mutating-method (`[...people].sort`) | none | 1 | message | 7 | worse: a 1-line expression becomes a 4-line block |
| 03 | type (`w[0]` is `string \| undefined` as an index), then possibly-undefined + mutating-method on `groups[k].push` | none | 2 | message | 6 | same length; append-by-spread instead of push |
| 04 | type `number is not assignable to never` (`const out = []`) | none | 1 | TS habit | 2 | better (annotated) |
| 05 | member-write on a `{ [id: string]: User }` local; possibly-undefined | none | 2 | guessing | 4 | **false rejection**; see below |
| 06 | mutating-method (`Array.from(...).sort()`) | none | 1 | carried from 02 | 6 | worse |
| 07 | mutating-method (`[...entries].sort`) | none | 1 | carried from 02 | 7 | worse |
| 09 | new-non-intrinsic (`new Date`) | none; Date is not named | 2 | tutorial (Date is listed as absent) | 15 | much worse: a hand-written days-from-civil helper |
| 10 | type (tuple from a `map` callback) + iterator-capture | "copy it into an array … ([...bs])" — **did not work** | 2 | message + TS | 10 | worse: a loop with undefined guards instead of `map` |
| 11 | possibly-undefined (`xs[mid]`) | none | 1 | message | 6 | slightly worse |
| 12 | mut-capture (cache in the returned function) | hint: "not a local helper that is only called" | 1 | message | 14 | same length; **the cache is now per call**, not kept across calls. The tutorial's `memo` also works (`isolate/12-tutorial-memo.ts`) |
| 13 | mut-capture (`forEach(walk)` passes the helper on) + unsupported "recursive function without a return type" | none | 1 | message | 4 | same |
| 14 | possibly-undefined (Float64Array index) | none | 1 | message | 2 | worse: `?? 0` on both operands in the inner loop |
| 16 | 14 diagnostics: mut-capture, iterator-capture, unsupported `Iterable.next` | "bind it under its plain type … (const c: Map<K, V> = m)" — **did not work** (the writes are then rejected) | 2 | tutorial (rule 3, the section 5 reducer) | 45 | rewritten as immutable data: O(n), generics dropped, a different API |
| 20 | possibly-undefined (last element, destructured head) | none | 1 | message | 4 | better: a guard replaces the length check |
| 21 | no-non-null, message text `TSNonNullExpression` | none | 1 | rule name | 2 | same |
| 23 | mutating-method (`[...selected].sort`) | none | 1 | carried from 02 | 6 | worse |
| 24 | no-cast (`as Ev[]`) | none | 1 | message | 3 | better |
| 25 | type + unsupported "object spread of { [k: string]: number }", "computed property" | none | 1 | message | 2 | worse: `Object.fromEntries([...Object.entries(c), [sku, price]])` |
| 28 | mut-capture in the action; inject-events on the listener | mut-capture: "bind it under its plain type" — **worked**; inject-events: none | 2 | message + guessing | 7 | slightly worse. inject-events had two causes, both needed: `typed[i]` (index read) and an unannotated generator yielding an object literal (isolated below) |
| 29 | action-capture (`now` in an action); possibly-undefined | "take the value as an argument of the action" — **did not work** for `onClick`, which is `Action<[]>` | 2 | tutorial (pointer events carry `t`) | 15 | worse: the button became a `<canvas onPointerDown>` |
| 30 | type `unknown is not assignable to Repo[]` (`res.json()`); arity on a 1-argument `reduce`; unsupported callback | none | 2 | message + TS | 18 | worse: a 7-line validator using `"name" in r` narrowing |
| 31 | no-cast; mutating-method; possibly-undefined; after the repair, "an async function returns Promise<…>: await it" | the await fix — **worked** | 2 | carried from 30 | 14 | worse (validator) |
| 32 | unknown JSON | none | 1 | carried from 30 | 4 | slightly worse |
| 33 | no-cast | none | 1 | carried from 30 | 4 | slightly worse |
| 34 | action-call + type on `onClick={() => removeItem(it.id)}`, then action-capture | "wrap in action" — worked for action-call; then "pass the value to the action when it is called" — **not applicable** | 5 | spec (S6.9's example at `spec.ojs:1339` rejects this exact pattern) for a4; a5 came from re-reading a2's message, prompted by a reviewer | 23 | a4, accepted: a checkbox in place of the button. a5, accepted and kept: one action per row *position*, made in a cell from a constant `slots` list with `for (const i of slots)`; the view indexes `removers[i]`. a2 had failed only because the loop variable was a `let`, which its message said. Worse than the draft: a fixed maximum of rows, and removal by position, not by id |
| 37 | excess-property `key` on a component | none | 1 | message | 2 | slightly worse: a wrapper `div` carries the key |
| 39 | no-cast; unknown-type `Record` (with a type parameter key); unsupported `??=` and type parameter constraints; possibly-undefined | none | 1 | message | 8 | the generic was weakened (`K extends string` dropped) |

## Messages whose suggested fix did not work

1. **10 zip**, `as.map((a, i) => [a, bs[i]])` with `bs: B[]`:
   `[iterator-capture] bs may hold an iterator (the type parameter B) … copy it into an array where it is made ([...bs]) and capture the array`.
   `bs` is already an array. Following the advice (`const copy = [...bs]`) gives the same message about `copy`, which again says to copy it (`repairs/10/a1.ts`). The suggestion repeats forever. The only way out is to stop capturing, by writing a loop.
2. **16 LRU**: `bind it under its plain type before the function (const c: Map<K, V> = m) and capture that`. Done in `repairs/16/a1.ts`. Every write through `c` is then `[mutating-method] write to a Map<K, V>, which is not Mut`, and the iterator-capture lines remain. The suggestion only works for a closure that reads; the message does not say so.
3. **29 click times**: `now is a capability … take the value as an argument of the action`. A button's `onClick` must be `Action<[]>`, so it takes no argument: `[type] Action<[number]> is not assignable to Action<[]>` (`repairs/29/a1.tsx`). The fix needs knowledge the message does not give: only pointer events carry a time.
4. **34 per-row remove**: `it is a parameter of an enclosing function … pass the value to the action when it is called`. The same problem: the host calls `onClick` with nothing. Two further attempts were rejected as well: actions made from a constant loop index (`k is computed from i, which is a let`) and from `Array.from({ length }, (_, i) => action(...))` (`i is a parameter of an enclosing function`).

## Friction points, ranked by how many first drafts they hit

1. **An index read is `T | undefined`. Hit 10 drafts** (03, 05, 10, 11, 14, 20, 28, 29, 31, 39).
   Natural: `if (xs[mid] < target)`, `a.data[i] * b.data[j]`, `const k = w[0]`.
   Message: `[possibly-undefined] number | undefined used as a number`, or `cannot index … with string | undefined`.
   Accepted: `const v = xs[mid]; if (v === undefined) break;`, `(a.data[i] ?? 0)`, `w.charAt(0)`, destructuring defaults `const [y = 0, m = 1] = …`.
   The tutorial warns about this (reference, "Immutable values"). It still costs the most edits. In 28 it is one of two causes of an unrelated-looking `[inject-events] keys is not a sync generator cell yielding { key: string; t: number }`; the message does not print the type the generator does yield. The other cause is a separate false rejection: an unannotated generator that yields an object literal is not accepted as `Events<{ n: number }>` (`isolate/28-unannotated-object-yield.ts`, rejected), while one that yields a number is (`isolate/28-unannotated-number-yield.ts`, accepted). Annotating the generator's type fixed it; adding the annotation without `charAt` turns the error into a plain `[possibly-undefined]` at the yield (`isolate/28-draft-plus-annotation.ts`). Results in `isolate-results.txt`.
2. **Casts and `unknown` JSON. Hit 6 drafts** (24, 30, 31, 32, 33, 39).
   Natural: `const data: Repo[] = await res.json()`, `(await r.json()) as { name: string }`.
   Message: `[type] unknown is not assignable to Repo[]` / `[no-cast] as cast`.
   Accepted: a hand validator per shape, `if (typeof x !== "object" || x === null || !("name" in x)) throw …; return { name: String(x.name) }`.
   This is the right outcome for safety: the stub could return anything. But every fetch draft grew by 2–10 lines, and nothing in the language derives a validator from the type. Section 10 of the tutorial does this for values arriving from other-language cells, but not for `json()`.
3. **Sorting a fresh copy in one expression. Hit 5 drafts** (02, 06, 07, 23, 31) plus program 0.
   Natural: `[...people].sort(cmp)`, `Array.from(new Set(t)).sort()`, `prices.slice().sort(...)`.
   Message: `[mutating-method] write to a Person[], which is not Mut`.
   Accepted: `const xs = [...people]; xs.sort(cmp); return xs;`.
   **False rejection.** The tutorial says "a copy" is writable, and the value is never reachable by anyone else. Only a copy bound to a name counts as `Mut`. The message does not say that binding it fixes it. Checked afterwards, not as a repair attempt: `people.toSorted(cmp)` is accepted (`isolate/toSorted.ts`). With it, 02, 06, 07, 23 and 31 would each be a one-word change, not "worse"; neither the tutorial nor the message mentions it.
4. **A kept function captures a `Mut`. Hit 5 drafts** (10, 12, 13, 16, 28).
   This covers a memo cache, an LRU object with methods, a recursive helper passed to `forEach`, and a zip closure over a generic array. 28 and 13 were plain to fix. 12 and 16 required changing the design.
5. **Actions cannot capture data the view has. Hit 2 drafts** (29, 34), and this point hurts the most.
   Natural: `<button onClick={() => removeItem(it.id)}>` inside `items.map`, the most common list UI there is.
   Message: `[action-capture] it is a parameter of an enclosing function, so a caller may pass it a value that depends on state; … pass the value to the action when it is called`.
   Two accepted forms, both tested. (a) A checkbox that carries the id: `<input type="checkbox" value={String(it.id)} onInput={removeItem} />` with `removeItem: Action<[string]>` (`repairs/34/a4.tsx`). It works because the renderer decodes an input event as `String(node.value)` (`lite/runtime.ss.ts:68`). (b) One action per row position, made from a constant list (`fixed/34-list-view.tsx`). Neither is what the message says to do, and neither keys the handler to the row's id. S6.9 rejects the direct form by example and shows no alternative. I tested the spec only by grep for `onClick` and the S6.9 cases; there may be an intended pattern I did not find.
6. **Object-shaped records. Hit 3 drafts** (05, 25, 39).
   A `{ [id: string]: User }` annotation is not writable, while `Record<string, User>` is. Spreading an index-signature record and computed keys are unsupported. `Record<K, …>` with a type parameter key is `unknown type Record`.
7. **One draft each:** `Date` (09), `!` reported as `TSNonNullExpression` (21), `key` on a component (37), `reduce` without an initial value reported as `[arity] expected at least 2 arguments` (30), returning a promise from an async arrow without `await` (31).

## Rewrites that made the code better or worse

- **Better:** 04 (annotated `number[]`), 20 (a guard instead of a length test), 24 (an annotated `Ev[]` instead of `as`). In 30–33 the validators are longer but are real input checks that the drafts lacked.
- **Same:** 03, 13, 21, 39 (apart from the weaker generic).
- **Worse:** 02, 06, 07, 23 (a block to sort), 14 (`?? 0` in a numeric loop), 25 (`Object.fromEntries` for one key), 10 (a loop instead of `map`), 37 (a wrapper div).
- **Much worse:** 09 (a calendar algorithm written by hand), 16 (an O(n) immutable LRU in place of a Map), 29 (a canvas in place of a button), 34 (a checkbox in place of a button).
- **Semantics changed silently:** 12's per-call cache has the same answer and different performance. The message pushed me toward it. `memo` from the tutorial is the better fix, and the message does not mention it.

## False rejections (plainly safe code rejected)

- `[...xs].sort(...)`, `Array.from(s).sort()`, `xs.slice().sort()`: the sorted value is fresh (02, 06, 07, 23, 31).
- A `{ [k: string]: T }` local is not writable, while `Record<string, T>` is. Isolated in `isolate/05-indexsig-forEach.ts` (rejected) against `isolate/05-record-forEach.ts` (accepted); the two differ only in the annotation. The message prints the type as `{ [k: string]: User }` either way, so the two spellings cannot be told apart from it.
- `as.map((a, i) => [a, bs[i]])` with `bs: B[]`: iterator-capture on an array (10).
- `repos.reduce((best, r) => …)` with no initial value: `[arity]` (30). TypeScript accepts it.
- `async () => Promise.all(...)` returning the promise unawaited (31a1).
- An unannotated generator yielding an object literal, taken as `Events<{ n: number }>` (28; `isolate/28-unannotated-object-yield.ts`).
- `key` on a component element (37).
- A per-row `action(() => remove(it.id))` (34). This one is a deliberate rule (S6.9), not a checker slip. It is listed here because the code is safe in every way except the replay argument, and nothing replaces it.

## The 15 bug probes (`probes/`, `probes-results.txt`, `probes-forced.txt`)

All 15 were rejected by the checker. The third column shows what happened with the checker's verdict overridden to ok (`run.ts --force`). In that mode a rejected cell probably runs from its erased text rather than the compiled definition (see the comment in `compiledFunctions`, `lite/browser/run.ts`); the column shows that the run-time freeze is a second line of defence, not how a shipped page behaves.

| probe | rule | runs unchecked as | does the message say what the bug is |
|---|---|---|---|
| B01 `arr` pushed after `list.set(arr)` | mutating-method (S4.11) | throws, write discarded | yes: "finish every write to arr before list.set" |
| B02 sort another cell's array in place | mutating-method | throws | weakly: "not Mut"; it does not say the array belongs to another cell |
| B03 returned object `{size, add}` over one array | mut-capture ×3 | throws in the reader | yes, verbose |
| B04 two `.then` writers race on a `let` | let-capture | **silent**, returns "b" (stub order) | yes |
| B05 `count.set(10)` in a cell body | state-write | throws | yes |
| B06 listener mutates its event | mutating-method + member-write | logged by the listener, write discarded | weakly: "not Mut" |
| B07 reverse a memoised result in place | mutating-method | throws | weakly |
| B08 `m.set(...)` inside `update` | mutating-method | throws "set on a frozen Map" | weakly |
| B09 a cell calls an action | action-call | throws | yes |
| B10 `action(async …)` with fetch | action-capture + action-async ×3 | unhandled rejection, no write | yes, says what to do instead |
| B11 closure over a later-reassigned `let` | let-capture | **silent** (returns 5) | yes |
| B12 `update(a => { a.push(n); return a; })` | mutating-method | throws | weakly |
| B13 `.then(() => v.set(1))` left by an action | state-write | unhandled rejection, no write | yes, names the cause |
| B14 `Date.now()` | free-name | **silent**, non-deterministic | yes |
| B15 generator yields a buffer it keeps pushing | mut-yield | logged, events stop | yes, with the fix |

**B04b**, added after the review: the idiomatic race, two async cells each feeding a listener that writes one state cell (`probes/B04b-two-async-cells-race.ts`). It is **accepted**, and `last` ends as `"a"` with the stub. Which value wins depends on which fetch answers first. The language promises only that the state follows from the order of action calls; that order here is the order the answers arrive. So 15 of 15 covers the races I wrote in one cell, not this one.

The first B05 I wrote was `(count: number, c: State<number>)`, an attempt to take both the value and the handle of one cell. It was rejected as `[inject-unknown] parameter c names no cell`. Inputs are named by the cell, so one cell cannot take both forms. That is by design, but a newcomer writes it on the first try.

Caveat: every probe was written by someone who had just spent 15 minutes being rejected by these rules, so the probes are the bugs I could think of, not a sample of real bugs.

## Tools

- **A checker hang.** The file `isolate/hang-self-alias.ts` (28's program with a sed slip that produced `type Key = Key;` and used `Key` as a generator's yield type and in the event and action types) never returns from `checkSources`. `timeout 30 bun run.ts --check-only` exited 124. A two-cell minimal attempt, `isolate/hang-min2.ts`, does not hang; it is **accepted**, with `type Key = Key` used as a parameter type and `a(1)` passed for it. So a self-referential alias is accepted as some permissive type rather than rejected. I did not narrow the hang further.
- `[no-non-null]` prints the AST node name `TSNonNullExpression` as its message.
- 16 produced 14 diagnostics for one design problem (one per line that touches `m`).
- Several messages say "write to a X[], which is not Mut" without saying why the value is not Mut: it came from another cell (B02), it is an unbound copy (02), or it has an index-signature annotation (05). Those three causes have three different fixes.
- Following the tutorial's sentence `const fib = memo((n: number): number => … fib(n - 1) …)` literally at top level gives `[cell-by-name] cell fib referenced by name` (`isolate/12-tutorial-memo-literal.ts`). It works only as a local inside a cell (`isolate/12-tutorial-memo.ts`). The tutorial does not say which form it means.
- The checker is fast: all 40 drafts were checked and the accepted ones run in about 1 s (06:52:35 → 06:52:36).

## Judgment as a user

The state, action, listener and JSX parts worked as the tutorial said they would. Counter, todos, pagination, undo, reducer, the timer, the input filter, the chat form, conditional views and the fetch-into-state listener chain were accepted on the first or second try and gave the right answers. Every bug probe was caught, mostly with a message that names the bug. Most of the friction is in ordinary data code, not in the reactive parts. Index reads typed `T | undefined`, no casts, and "only a named fresh local is writable" together touched 18 of the 40 drafts. Each fix was small, and about half left the code a little worse; for the sorts, `toSorted` would have avoided this, but nothing pointed me to it. Two rules made common things awkward. JSON from `fetch` needs a validator written by hand every time; the spec mentions `FetchResponse` only as a type name (`spec.ojs:44`, `:348`), and I found no typed `json()`. A list row cannot have a handler tied to its id, because an action may not capture the row it belongs to; the two accepted forms I found are a checkbox carrying the id and one action per row position. The messages fixed 23 of 27 rejections without other reading. Four suggested fixes were wrong or did not apply, and the failures were in the cases that were already the hardest.
