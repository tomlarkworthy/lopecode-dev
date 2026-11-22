Mut parameters (deduplicated by file:line): 801, in 351 functions. Passes to a Mut parameter: 2110 (arguments), at 1072 call lines.

| scope | class | parameters | functions | buckets |
|---|---|---:|---:|---|
| cross-cell | passes it on, no write here | 574 | 241 | checker/toolchain 563, probes 11 |
| cross-cell | updates fields of the caller's record | 76 | 76 | checker/toolchain 76 |
| cross-cell | memo / cache (reads and inserts) | 37 | 34 | checker/toolchain 37 |
| cross-cell | inserts into the caller's map/set | 34 | 30 | checker/toolchain 34 |
| cross-cell | no write, not passed on | 30 | 28 | ports 4, checker/toolchain 26 |
| cross-cell | appends to the caller's array | 13 | 13 | checker/toolchain 13 |
| cross-cell | builder passed down a recursion | 12 | 12 | probes 5, checker/toolchain 7 |
| cross-cell | builder passed down a recursion (writes only below) | 11 | 6 | probes 1, checker/toolchain 10 |
| local | passes it on, no write here | 4 | 4 | checker/toolchain 4 |
| local | builder passed down a recursion | 4 | 4 | checker/toolchain 4 |
| local | no write, not passed on | 3 | 3 | fixtures 1, tutorial/spec/examples 2 |
| local | mixed writes (index-assign,method:push) | 1 | 1 | fixtures 1 |
| local | fills an array by index | 1 | 1 | fixtures 1 |
| cross-cell | fills a buffer (typed array) | 1 | 1 | ports 1 |

Local helpers taking a Mut: 13 functions, 13 parameters, 52 call lines naming them.
Cross-cell functions (a cell's value function, or one it returns) taking a Mut: 338 functions, 788 parameters, 1030 call lines naming them (calls through a cell input of that name; calls through a record field are below).
Call lines through a record field (".name"): 163; callee not resolved ("?"): 0.

Parameter types of the cross-cell Mut parameters (top 25):

- 139 `Mut<IxCtl>`
- 102 `Mut<Map<string, IxBinding>>`
- 91 `Mut<Map<number, IxFlow>>`
- 85 `Mut<Map<number, Ty>>`
- 49 `Mut<RgCtl>`
- 35 `Mut<Map<string, Ty>>`
- 31 `Mut<Map<string, RgDecl>>`
- 30 `Mut<Map<string, Rec>>`
- 26 `Mut<Map<number, EventsRecord>>`
- 26 `Mut<OwLog>`
- 25 `Mut<Set<string>>`
- 21 `Mut<Effect[]>`
- 14 `Mut<Map<string, number>>`
- 12 `Mut<Map<number, ListenerRecord>>`
- 12 `Mut<MdTables>`
- 11 `Mut<OwFlowCtl>`
- 11 `Mut<MdLogs>`
- 9 `Mut<Subst>`
- 8 `Mut<IxFlow>`
- 7 `Mut<{ open: string[]; rec: Set<string>; defs: Map<string, Ty`
- 7 `Mut<Map<number, string | null>>`
- 6 `Mut<Map<string, RgValue>>`
- 4 `Mut<Map<string, Prop>>`
- 3 `Mut<Float32Array>`
- 3 `Mut<{ placer: boolean; generation: number }>`

Every local helper taking a Mut:

- fixtures/lite-mut/reject-mut-escape/cells.ts:31 `bump` in `ok_mut_param` (fixtures): m: Mut<number[]> [mixed writes (index-assign,method:push); writes index-assign,method:push; passed on 0]; 2 call lines
- fixtures/lite-mut/reject-mut-freeze-param/cells.ts:4 `snap` in `bad` (fixtures): m: Mut<number[]> [no write, not passed on; writes none; passed on 0]; 1 call lines
- fixtures/lite-mut/reject-mut-freeze-param/cells.ts:11 `fill` in `ok` (fixtures): m: Mut<number[]> [fills an array by index; writes index-assign; passed on 0]; 1 call lines
- inline:spec.ojs#11jurqkxtg6de:2 `f` in `a` (tutorial/spec/examples): p: Mut<{ t: Mut<number[]> | null }> [no write, not passed on; writes none; passed on 0]; 0 call lines
- inline:spec.ojs#2oef788i10usr:2 `g` in `a` (tutorial/spec/examples): m: Mut<number[]> [no write, not passed on; writes none; passed on 0]; 0 call lines
- lite/infer/ix-hides.ss.ts:50 `anyHides` in `ixMayHide` (checker/toolchain): seen: Mut<Set<string>> [passes it on, no write here; writes none; passed on 1]; 4 call lines
- module:lite/infer:2405(joined) `go` in `ixMayHide` (checker/toolchain): seen: Mut<Set<string>> [builder passed down a recursion; writes method:add; passed on 8]; 14 call lines
- lite/infer/ix-hides.ss.ts:82 `anyFnLike` in `ixMayHoldFn` (checker/toolchain): seen: Mut<Set<string>> [passes it on, no write here; writes none; passed on 1]; 4 call lines
- module:lite/infer:2438(joined) `go` in `ixMayHoldFn` (checker/toolchain): seen: Mut<Set<string>> [builder passed down a recursion; writes method:add; passed on 8]; 14 call lines
- lite/infer/ow-capture.ss.ts:34 `inner` in `owIterIn` (checker/toolchain): none: Mut<Map<string, number>> [passes it on, no write here; writes none; passed on 1]; 4 call lines
- lite/infer/ow-capture.ss.ts:63 `inner` in `owMutIn` (checker/toolchain): none: Mut<Map<string, number>> [passes it on, no write here; writes none; passed on 1]; 4 call lines
- lite/infer/ow-taint.ss.ts:17 `walk` in `owRefsOf` (checker/toolchain): out: Mut<AstNode[]> [builder passed down a recursion; writes method:push; passed on 1]; 2 call lines
- lite/infer/rg-view.ss.ts:27 `has` in `rgHasTypeQuery` (checker/toolchain): W: Mut<Map<number, boolean>> [builder passed down a recursion; writes method:set; passed on 1]; 2 call lines