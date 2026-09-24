# robocoop-5 verified-core rules, as implemented in df34

Written 2026-09-24 12:46–13:10 CEST from a read of the df34 bundle and eight recorded ledger states.
Purpose: a spec precise enough to re-implement the core rule over a fact store and regression-test it in node
against `fixtures/`.

**Source.** `tools/robocoop-5/eval/robocoop-5-eval-bigcap-df34.html`, module `@tomlarkworthy/robocoop-5-srctools`,
cell `crossTools` (`const _crsschk = function _crossTools(cellHelpers,runtime,currentModules,srcContext,defineTool,summarizeJS)`),
extracted with

```
bun tools/lope-reader.ts tools/robocoop-5/eval/robocoop-5-eval-bigcap-df34.html --get-module @tomlarkworthy/robocoop-5-srctools > B.js   # 4122 lines
```

`E:n` below is a line of that extract. The HTML line is `E:n + 5339` (checked on two lines:
`globalThis.__rc5CoreGuard = coreGuard;` is E:2639 and HTML:7978; `attestMap` is E:2324 / HTML:7663).
`crossTools` spans E:1749–4028.

**Checked.** `check-core.py` in this directory recomputes CORE membership from each fixture using rules R1–R8
below and the recorded attest-time anchor statuses, and matches the recorded core table in 8 of 8 fixtures
(2026-09-24 12:52), gated per bundle (df18, df32, df33, df34). The df33 fixture matches only when a null is
allowed to anchor, which is the df34 change (R6). That check covers membership only. It does not check the
blocked sentences, the path rule or the printed text.

---

## R1. Attestation entry shape

Ledger: `globalThis.__rc5Attest`, a `Map` keyed by `"<moduleId>:<cellName>"` (E:2324–2325):

```js
const attestMap = () => (globalThis.__rc5Attest = globalThis.__rc5Attest || new Map());
const keyOf = v => (moduleIdOf(v._module) || '?') + ':' + (v._name || v.pid || '(anonymous)');
```

Value: an array of entries. The `attest` tool writes one (E:3917–3930):

```js
const list = prev.filter(e => !(e.kind === k && e.evidence === evText) && !(k === 'proof' && e.kind === 'proof'));
list.push({ kind: k, module, cell, evidence: evText, cellHash: hashOf(cv), evidenceHash, rows, at: Date.now(),
  ...(anc ? { anchor: anc } : {}) });
```

- A re-attest with the same `(kind, evidence)` replaces the old entry. A second `proof` replaces the first
  one, whatever its text.
- `evidenceHash` is `null` for `proof` and `crossing`.
- `rows`: the number of evidence rows. For a crossing it is the cross_check's `items`.
- `anchor` (df33+): `{status: 'real-anchored'|'demoted'|'unmeasured'|'synthetic', via?, replaced?, nullcheck?, errored?, timeout?, why?}`.
  Recorded example (ai turn 6, `snap-6/ledger.json`):
  `{"via":["t1Text"],"status":"real-anchored","replaced":["t1Text"]}`,
  and for a null: `{"status":"real-anchored","via":["t1Text"],"nullcheck":true}`.
- The kind is stored as `'null'`. The tool accepts `nullcheck`, `null-check`, `negative`, `NULL` and JSON `null`
  and maps them to `'null'` (E:3797).

What `attest` refuses, so no entry is written (E:3802–3907): an unknown kind; evidence equal to the cell; for
executed kinds, evidence that does not have the cell in `up(ev)`, that is a deliverable or downstream of one,
that does not evaluate, that is not an array, that has fewer than 3 rows, or that has a row without a boolean
`pass` or with `pass !== true`. It also refuses evidence that still passes when the cell is mutated: a
function-valued cell is replaced by one returning NaN and anything else by `undefined`, run in a scratch clone
(`mutationCheck`, E:3470; refusal E:3893). A mutation-check timeout is also refused. Crossing: the entry must
exist and be independent, agreeing and not stale, and the cell must be `a`, `b`, or in `upA`/`upB`. Literature:
the source must match `CITE_RE`, the claim (at least 20 chars) must appear verbatim, and the cell must have
zero non-builtin inputs. Proof: the text must be at least 20 chars.

## R2. KINDS and weights

E:2207–2216:

```js
const KINDS = ['reference','null','crossing','metamorphic','library','literature','proof'];
const CORE_SCORE = 1.5;
```

The weight is set in `weigh` (E:2375–2401):

```js
score += e.kind === 'proof' || e.kind === 'literature' ? 0.5 : 1;
```

Only fresh entries count (R3), and at most one per evidence name: "the LATEST attestation of it, in
first-seen order" (df26; `latest` is a Map keyed by `e.evidence`, so `Map.set` keeps the first position and
the last value). Consequences:

- Two executed evidence cells give 2 and pass the threshold.
- One executed evidence plus one proof or literature gives 1.5 and passes.
- Proof plus literature gives 1.0 and does not pass.
- The same evidence cell attested under two kinds counts once, as the later kind.

## R3. hashOf and staleness

E:2217–2230:

```js
const hashText = t => { let h = 2166136261;
  for (let i = 0; i < t.length; i++) h = Math.imul(h ^ t.charCodeAt(i), 16777619);
  return (h >>> 0).toString(16) + '.' + t.length; };
const hashOf = v => { let t = ''; try { t = String(v && v._definition); } catch (e) { t = ''; } return hashText(t); };
```

The hash is FNV-1a over UTF-16 code units of the variable's definition function text, with `.length`
appended. **Verified reproducible offline**: the fixture builder hashes the function text from the `/src`
snapshot (from after `const _x = ` to the closing `};`, without the `;`) and matches the recorded `cellHash`
in 106 of 106 attestation entries across the 8 fixtures (`hash_check` in each fixture).

`freshness(e)` (E:2341–2373) returns the first failure it finds, in this order:

| check | why string |
|---|---|
| cell not resolvable | `attestation by E is stale: cell C is gone` |
| `hashOf(cell) !== e.cellHash` | `attestation by E is stale: cell edited` |
| kind `proof` | fresh (no further checks) |
| kind `crossing`: `freshCross(E)` is null | `attestation by cross_check "E" is stale: that crossing no longer passes` |
| evidence cell not resolvable | `attestation by E is stale: the evidence cell is gone` |
| `hashOf(evidence) !== e.evidenceHash` | `attestation by E is stale: evidence cell edited` |

`freshCross(nm)` (E:2337): the ledger entry exists, `independent && agree && !isStale(e)`. It does **not**
apply the task_complete qualifications (items ≥ N, min_fraction ≥ 0.8, tolerance ≤ 5 %). Staleness is a hash
of the cell's own definition. An edit to an upstream helper does not make an attestation stale. The README's
df33 "Known limit" says the same.

## R4. GIVEN

A cell in `all` is GIVEN when `isDataCell(v) && !delSet.has(v) && !outsideSeedRoots(v)` (E:2425–2432).

`isDataCell` (E:1857–1866):

```js
const src = srcOf(v);
if (src && DATA_RE.test(src)) return true;
const ins = (v._inputs || []).map(deref).filter(x => !skip(x));
if (ins.length !== 0) return false;
return !isFunctionCell(v);
```

```js
const DATA_RE = /localDisk|FileAttachment|\/local-disk|fetch\(|readText|readBytes|py\.run/;   // E:1759
```

This is an OR, not an AND. **A cell whose source matches `DATA_RE` is data even when it has computed
inputs.** Recorded case: ai turn 6, `loadAll(localDisk, parseCSV)` is in GIVEN while `parseCSV` had to be
attested. Otherwise a cell is data only when it has zero non-builtin inputs and is not a function cell.
`isFunctionCell` (E:1843) first checks the live `_value` (a function, or an object with a function-valued
key), then the source (`FN_RETURN_RE`, E:1817). A re-implementation without runtime values can only apply the
source half.

`skip` (E:1795) drops builtins by name (`BUILTINS`, E:1753–1758: `md html Inputs Plot d3 FileAttachment
localDisk py width invalidation now Generators Mutable htl require DOM Promises visibility Files tex svg mermaid
dot __ojs_runtime`), the builtin module, and structural variables (`!v.pid` and a `module ` name,
`@variable`, `initial `, or no name).

**Seed roots (df29).** `globalThis.__rc5SeedRoots` is set pre-boot by `run-agent.mjs:752` to
`task.seedRoots` prefixed with `/local-disk`. In every df32+ fixture the value is `/local-disk/root/data`.
`seedRoots()` (E:2240) keeps the entries that start with `/local-disk`, with trailing slashes stripped, and
returns `null` if none are left. `outsideSeedRoots(v)` (E:2307–2320) demotes a data cell when any
`/local-disk` path in its source (`localPathsIn`, E:2270: string literals containing `/local-disk/`, plus the
relative first argument of a `localDisk.<m>(` call resolved against `/local-disk/`) is not under a root. A path
with a `${}` hole counts as under a root when its static prefix is. The demotion text is `reads P, which is
not the task's data (seed roots: …) — a cell that imports a file the run wrote is an unverified pipeline, not
a given; attest it, or move the computation into cells`. With no seed roots, no cell is demoted.

**Knowledge cells.** Given cells that match `CITE_RE = /https?:\/\/\S{4,}|\b10\.\d{4,9}\/\S{3,}/` and have zero
non-builtin inputs (E:3742–3748) are split out as `knowledge` and printed as `GIVEN FROM LITERATURE`.

**Observed, cause not found:** the recorded GIVEN lists include `@variable` and
`module @tomlarkworthy/local-disk` in every df18–df34 fixture, although `isStructural` should exclude them.
The likely cause is that these variables carry a `pid` at runtime. That was not verified. The fixture builder
does not derive them (`cells` has no entry for them).

## R5. The deliverable

E:1868–1878:

```js
const DELIVERABLE_RE = /localDisk\.write\(\s*['"`][^'"`]*(results|output|outputs|submission)|\/local-disk\/[^'"`]*\/(results|output|outputs|submission)\b/;
```

A deliverable is any named, non-structural cell of the module whose source matches this regex. There can be
several: ai has `processAllTargets` and `runPipeline`. A deliverable is never GIVEN (it is excluded from
`given` even when `DATA_RE` matches). It is left out of core_status's BLOCKED list (df21) but not out of
`blocking`. Recorded case: ai turn 8, `processAllTargets` appears in the `task_complete still blocked on:`
line and not under BLOCKED.

## R6. Anchoring (df33 / df34)

Anchoring is on only when `seedRoots()` is non-null (`anchorOn`, E:2729).

A cell **reads the task's data** (`readsTaskData`, E:2732–2749) when a path in its source is under a seed root.
A template path counts when its static prefix starts with `root + '/'`. `readersOf(ev) = [...up(ev)].filter(readsTaskData)`
(E:2751) covers the transitive upstream only, not the evidence cell itself.

At attest time, `anchorCheck` (E:3206–3229):

```js
const EXEC_EVIDENCE = ['reference','null','metamorphic','library'];          // E:3199
if (EXEC_EVIDENCE.indexOf(k) < 0) return { status: 'synthetic', ... };       // crossing, proof, literature
if (!readers.length) return { status: 'synthetic', ... };
if (k === 'null') return { status: 'real-anchored', via, nullcheck: true };   // no sensitivity run
const s = await sensitivityRun(ev, ev._module, String(evName), liveVal, readers);
```

`sensitivityRun` (E:3065–3197) re-runs the evidence in a scratch clone (`__rc5anc_` prefix), with every
upstream reader replaced by a constant holding `destroy(value)`, under a 60 s budget. The result is
`real-anchored` if `outcomeDiffers(outcomeOf(live), outcomeOf(destroyed))` (length, any `pass` flip, or any
numeric field to depth 5 moving by more than 1e-9 relative, E:3011–3044), `demoted` if nothing moved,
`real-anchored` with `errored: true` if the destroyed run threw, and `unmeasured` on a timeout or an
unbuildable clone. df34's `destroy` (E:2885) redraws numeric columns uniformly within [min, max] and permutes
the rest. Its exact algorithm is not re-specified here: a fact-store re-implementation reads the recorded
`anchor.status`.

At `coreOf` time, `anchorStatusOf(e)` (E:3245–3266) recomputes the reader half on every call and
takes the sensitivity half as recorded:

```js
if (EXEC_EVIDENCE.indexOf(e.kind) < 0) return 'synthetic';
... if (!rd.length) return 'synthetic';
if (e.kind === 'null') return 'real-anchored';
const a = e.anchor; if (a && (a.status === 'real-anchored' || a.status === 'demoted')) return a.status;
return 'unmeasured';
```

In `coreOf` (E:2437–2450), for every non-given cell that has an `info` entry:

```js
const e = (w.fresh || []).find(x => x.kind !== 'null' && anchorStatusOf(x, rdCache) === 'real-anchored');
anchorBy.set(v, e ? e.evidence : null);
if (!e) { const nu = (w.fresh || []).find(x => x.kind === 'null' && anchorStatusOf(x, rdCache) === 'real-anchored');
          if (nu) nullBy.set(v, nu.evidence); }                               // df34
```

**"Anchored"** means that at least one **fresh**, **non-null**, executed attestation (reference, metamorphic
or library) has evidence with a data reader upstream and a recorded `real-anchored` status. On df33 the
`x.kind !== 'null'` clause did not exist, so a real null anchored alone (D2 in the README).

Discrepancy inside the bundle: `anchorNullSentence` and the attest line both tell the agent the core needs "one
executed reference/metamorphic/**crossing**". A crossing can never anchor, because it is not in
`EXEC_EVIDENCE` and `anchorStatusOf` returns `'synthetic'` for it.

## R7. Core membership: the fixed point

E:2451–2473:

```js
for (let pass = 0; pass <= all.size; pass++) {
  let changed = false;
  for (const v of all) {
    if (given.has(v) || core.has(v)) continue;
    if ((info.get(v) || { score: 0 }).score < CORE_SCORE) continue;
    if (anchorBy.has(v) && !anchorBy.get(v)) continue; // df33
    let ok = true;
    for (const u of upOf(v)) if (!given.has(u) && !core.has(u)) { ok = false; break; }
    if (!ok) continue;
    core.add(v); changed = true;
  }
  if (!changed) break;
}
```

As a rule: `core(v) ⇐ ¬given(v) ∧ score(v) ≥ 1.5 ∧ (anchorOn ⇒ anchored(v)) ∧ ∀u ∈ up⁺(v): given(u) ∨ core(u)`.
This is the least fixed point, so it is monotone and stratifiable. `up⁺` is the transitive upstream through
`deref` (import aliases are followed to the exporting variable) with `skip`ped variables removed (E:1796–1808).
`all` is the module's named cells plus their transitive upstream, so an imported cell can enter the core of the
importing module. Deliverables are not excluded from core membership. They are excluded from GIVEN only.

## R8. Blocked reasons and the deliverable path rule

For every cell in `all` that is neither given nor core, E:2476–2500 builds `parts` in this order, joined with `'; '`:

1. the df29 demotion sentence (R4), if the cell was demoted;
2. `upstream a, b, c not in core`: the first 3, sorted, of the upstream cells that are neither given nor core;
3. up to 2 stale `why` strings (R3);
4. if `score < 1.5`: `n more evidence cell(s)` with `n = ceil(1.5 − score)`;
5. **prepended** (`unshift`) when anchoring is on, the cell is unanchored and it has at least one fresh
   attestation: `anchorNullSentence(n)` if it has a real-anchored null, otherwise `anchorSentence(n)` (E:3267–3268):
   - `no REAL-ANCHORED evidence: every attestation of X reads only invented data — attest X with an evidence cell whose inputs include the task's data (a reference planted into a real target's own sampling, a check that two channels/halves of a real target agree, a null on shuffled real items) (df33)`
   - `no REAL-ANCHORED evidence beyond a null: a shuffled-real null shows X does not invent signals; the core also needs one executed reference/metamorphic/crossing whose inputs include the task's data and whose verdict depends on it (df34)`

**Path rule (df22, df30), E:2502–2531.** `need` is the union of `up⁺(d)` over the deliverables. `pathKinds`
counts the kinds of the fresh attestations on cells in `need`, in KINDS order. When there is at least one
deliverable, `pathMissing` gets:

- if `pathKinds.null` is absent: `no null evidence on the deliverable's path — attest some upstream cell with kind "nullcheck" (rows that plant nothing must come back null)`
- if none of `crossing`, `metamorphic`, `library` is present: `no EXECUTED second kind on the deliverable's path — add one crossing, metamorphic or library attestation to any upstream cell (a proof or literature attestation is a sentence: it weighs, it does not count as a second derivation; df30)`

Path kinds are counted from fresh attestations whether or not the attested cell is anchored or in the core.

`blocking = pathMissing ++ sort([ "X → " + blocked[X] for X in need if X is blocked ])` (E:2532).

## R9. What core_status prints

E:3960–4020. Lines, in order:

```
core_status <module>
GIVEN (<n> — the task's data under <roots>, and zero-input constants): <sorted given, knowledge removed>
        (with no roots: "(<n> — data cells and zero-input constants, assumed correct)")
GIVEN FROM LITERATURE (<n> — knowledge cells citing a URL or a DOI, assumed correct): …   [only if any]
CORE (<n> — upstream all given/core, two fresh attestations from distinct evidence cells): <sorted core | (none)>
  <core cell> — anchored: yes (by <evidence>)                                             [df33+, per core cell]
frozen: <core minus re-opened | (none)> (an edit is refused unless the note re-opens the cell; re-opened this turn: <mayEdit | none>)   [only if __rc5MayEdit is an array]
BLOCKED (<n>):                                  n excludes deliverables
  <cell> → <reason>                             sorted, first 40, then "  …and N more"
    anchored: <yes (by e) | null only (e) | NO> [df33+, when the cell has a fresh attestation]
DELIVERABLE(S): <names> — the writer cell is never attested (attest refuses evidence downstream of it); its verification is its upstream:
PATH EVIDENCE KINDS: <kind ×n, …>   (or "(none — nothing upstream of the deliverable is attested)")
task_complete still blocked on: <blocking joined by "; ">
   | every cell upstream of the deliverable is given or core — the core rule is satisfied.
BOOT MEMO: <restored> cells restored, <recomputed> recomputed (slow cells > <s> s)          [df28, if __rc5MemoStats]
```

The two insertions interact: `frozen:` is spliced at index 3 before the knowledge line (index 2) and before the
anchored lines. So in the df34 output the `frozen:` line comes after the CORE block. See ai turn 8
(`fixtures/walk-20260924ai-…-turn8.json`, `expected.core_status_text`). In the table, the kind is printed
under its stored name (`null ×2`). **The walk `.md` dump is not core_status.** `run-agent.mjs` re-renders it
from `__rc5CoreAll()`, prints `nullcheck ×1`, and drops the `anchored:` lines. The fixtures take their
expected text from the tool result in the trajectory JSON, not from the dump.

## R10. __rc5CoreGuard (task_complete) and __rc5FreezeCheck (writes)

`coreGuard` (E:2607–2636) returns `null` when `globalThis.__rc5CoreRule === false`. It scans
`scanModuleIds()`: the keys of `__rc5ApplyCount`, the module part of attest keys, and cross-check `module`s.
For every module with a deliverable it collects `coreOf(id).blocking`. The outcome:
- no module has a deliverable: `REJECTED: no cell in any of your modules writes to /local-disk. …(df23)`;
- no blocking lines: `null` (passes);
- otherwise: `REJECTED: the deliverable is not in the VERIFIED CORE. … Still blocked (<n>):` followed by the
  first 8 lines and `…and N more`.

It is called from `completeGuard` in `@tomlarkworthy/robocoop-5-engine` (HTML:5287), after the walk-mode,
zero-tool-calls, GATES and two-qualifying-cross-check checks. In walk mode `completeGuard` returns first, so
**the core guard never ran in any walk fixture**. The walks record `REJECTED: walk mode`.

`freezeCheck(moduleId, cells)` (E:2690–2709; called from the write path at E:588–589 with `opts.guard`) returns
`null` (allow) if `globalThis.__rc5MayEdit` is not an array (set pre-boot from the PM note's `May edit:` line,
`run-agent.mjs:752`), the module is unresolved, or the core is empty. Otherwise it refuses when the write
changes a CORE cell that is not re-opened. "Changes" (`changedByWrite`, E:2659–2688) means: matched by pid,
then by name, and `hashText(new definition) !== hashOf(live)` or the name differs; or a live pid-bearing cell
is absent from the write (a delete). Imports, `@variable`, `module …` and cells with `@variable` inputs are
ignored. "Re-opened" means the name, or the name without `viewof `/`mutable `/`initial `, is in `mayEdit`. The
refusal text is `REFUSED: this edit changes CORE cell(s) a, b, which the reviewer's note did not re-open (May edit: …).…(df32)`.

## R11. cross_check: agree, fraction, independent

Ledger `globalThis.__rc5CrossChecks`, a `Map` keyed by the label `name` (E:1761). An entry is written by
E:2153–2178 with fields `module, a, b, independent, shared, offending, agree, detail, items, fraction,
minFraction, tolerance, abs, sides, verdictLine, valuesSummary, upA, upB, dataShared, applyCount, counts, at`.

- **independent** (E:2123–2129): `shared = upA ∩ upB` minus `a` and `b`, and
  `offending = shared.filter(v => !isDataCell(v))`, so `independent = offending.length === 0`. It uses the same
  `isDataCell` as GIVEN (R4) but does not apply the seed-root demotion. Sharing a GIVEN cell is allowed.
  `a` and `b` resolving to the same variable is refused before anything is recorded.
- **agree / fraction** (`compare`, E:1982–2025; `elementwise`, E:1930–1981): tol defaults to 0.02 (relative,
  `|x−y| ≤ tol·max(|x|,|y|)`; with `abs`, `|x−y| ≤ tol`), min_fraction defaults to 1.
  - two finite numbers: `items: 1`, `fraction` 1 or 0;
  - two arrays: unequal lengths disagree with `items: 0`; otherwise compared per index;
  - two plain objects: compared over the common keys, and no common keys disagrees;
  - per element: two finite numbers use the tolerance, anything else needs `Object.is` or equal `String()`.
  - `fraction = ok/n`, `agree = fraction ≥ minF`. Anything else is `NOT COMPARABLE`, `agree: false`. An
    evaluation error on either side gives `agree: false`, `items: 0`.
- **stale** (`isStale`, E:2027–2033): any module in `e.counts` whose current `__rc5ApplyCount` differs. This
  is an apply counter, not a hash, unlike attestations. `ledger.mjs` rewrites `counts` to the post-seed
  counters on restore, so a page reboot does not make an entry stale.
- `sides` (`sideFlags`, E:1880–1889): `upstreamOfDeliverable` / `downstreamOfDeliverable` per side, or `null`
  when the module has no deliverable.

The task_complete qualification (HTML:5287, not part of the core rule): not stale, independent, agree,
`items > 1` and `≥ __rc5MinItems` (default 20), `minFraction ≥ 0.8`, `tolerance ≤ __rc5MaxTol` (default
0.05), not `abs`, no side reading the output back, and some side feeding the deliverable (when a deliverable
exists). At least 2 must qualify.

---

## Unknown or not determined

- Why `@variable` and `module @tomlarkworthy/local-disk` appear in the recorded GIVEN lists (R4).
- `destroy()` and `sensitivityRun` are summarised, not specified. A re-implementation has to treat
  `anchor.status` as a recorded fact. Re-deriving it needs the runtime.
- `isFunctionCell`'s runtime half (`holdsFunction(v._value)`) cannot be recovered from a trajectory.
- The recorded GIVEN/DELIVERABLE flags in the fixtures are derived from source by the builder, not recorded.
  They agree with the recorded tables apart from the two structural names above.
- No df32+ walk recorded a cross_check entry or a crossing attestation. The only such ledger is walk g
  (df18), so the crossing freshness path (R3, R11) is covered by one fixture from a bundle without
  df22/df26/df29/df32/df33/df34.

## Discrepancies against the earlier survey's anchors

The survey's `B:` numbers are **HTML line numbers** of the df34 bundle, not lines of a lope-reader extract.
After converting (`E = B − 5339`), they are correct: `__rc5Attest` B:7663→E:2324 and B:9257→E:3918;
`__rc5CrossChecks` B:7100→E:1761 and B:7492→E:2153; `KINDS` B:7546→E:2207; `hashOf` B:7562→E:2223;
`coreOf` B:7741→E:2402. The survey's end, B:7869→E:2530, stops before the `blocking` and return part: coreOf
runs to E:2553. The survey's "fixed point" and "deliverable path rule" are as described above. It did not
mention that `isDataCell` is an OR (R4), that a crossing cannot anchor although the sentence says it can (R6),
or that the core guard is unreachable in walk mode (R10).
