# Reading the LIVE notebook-kit runtime from a paired lopecode iframe, 2026-09-12

Measured through the pairing channel, with a lopecode notebook paired as an iframe inside an
Observable notebook on observablehq.com. Capture at `2026-09-12T12:48:54.390Z`.

**This record exists because the setup is expensive to recreate** (Tom, 2026-09-12: "make sure you
record all the useful data you get from this experiment as its quite painful to setup"). Everything
below is a measurement unless marked as inference or pending.

The viewed notebook is **`@tomlarkworthy/notebook-kit-semantics`** — document `7500d3b6c6a9b308`,
version 95, **60 nodes = 25 md + 32 js + 1 html + 1 tex + 1 sql**. `tex` and `sql` are cell modes
nothing in the research plan currently accounts for.

Identifying it took two wrong turns, both recorded under Method notes: the slug was inherited from an
earlier pairing (`notebook-kit-examples`, a different document), and the parent DOM's only
`@user/slug` link points at `@tomlarkworthy/notebook-semantics`, the 1.0 sibling, presumably from the
prose. **The document was established by content match, not by either of those.**

## It supersedes "the live notebook-kit runtime is not reachable from a lopecode iframe"

That section of `plan/exporter-4-notebook-kit-research.md` drew a conclusion wider than its evidence.
The frame walk, re-run today:

```
depth 0  about:srcdoc#view=S100(@tomlarkworthy/claude-code-pairing,…)              rt=true
depth 1  https://tomlarkworthy.static.observableusercontent.com/chat-worker/ind…   rt=TRUE
depth 2  BLOCKED:SecurityError
```

Only **depth 2** (the `observablehq.com` page) is origin-blocked, and it is not where the notebook
runs. Depth 1 — the chat-worker frame holding the notebook-kit graph — was readable all along. This
morning it reported `__ojs_runtime ✗` for a mundane reason: **`@tomlarkworthy/runtime-sdk` had not
been imported into the host notebook**, and runtime-sdk's `runtime` cell is what sets that global.
Once imported, the global appeared.

**A lopecode module CAN read the host notebook-kit runtime**, provided runtime-sdk is imported in the
host notebook. The import form is notebook-kit's Observable protocol —
`import {runtime} from "observable:@tomlarkworthy/runtime-sdk"` — and per
`js-toolchain-notebook-kit-2-cells.md` a bare `@user/nb` canonicalises to it.

## The runtime graph: 265 variables, 4 modules

Identified by glue shape and content, not by name spelling — the research plan records the `$`-count
heuristic picking the wrong module once, and M1 here has only two `$` names.

| module | vars | `cell N` | `$` | spaced | what it is | how identified |
|---|---|---|---|---|---|---|
| M0 | 48 | 0 | 0 | 0 | notebook-kit **stdlib** | `dark`, `now`, `width`, `DatabaseClient`, `FileAttachment`, `Generators`, `Interpreter`, `Mutable`, `Promises`, `Files`, `DOM`, `sql`, `Arrow`, `DuckDBClient`, all `()=>Xx` accessors; no `runtime` |
| M1 | 108 | 23 | 2 | 1 | **the userspace notebook** (`notebook-kit-semantics`) | its `runtime` is *import identity glue* — it consumes, never defines; holds the document's own md text |
| M2 | 88 | 25 | 0 | 3 | `@tomlarkworthy/runtime-sdk` | defines `function runtime(_runtime) { window.__ojs_ru…` — the cell that sets the global; 88 vars is consistent with 68 upstream nodes once viewof/mutable expand |
| M3 | 21 | 1 | 0 | 2 | `@mootari/access-runtime` | defines `function runtime(recomputeTrigger,captureRuntime)`; `captureRuntime` is access-runtime's export |

`rt._main` **does not exist** (`hasMain=false`). The discriminator that works on the legacy runtime is
unavailable, which is why module identity had to come from glue and content.

### Three `runtime` variables, three definitions, one object

```
M1  in=[runtime]                          def=function u(e){return e}
M2  in=[_runtime]                         def=function runtime(_runtime) { window.__ojs_ru…
M3  in=[recomputeTrigger,captureRuntime]  def=function runtime(recomputeTrigger,captureRun…
```

`v._value === window.parent.__ojs_runtime` is `true` for all three — one runtime flowing through
imports.

**The userspace `runtime` is `function u(e){return e}`**, the import-identity glue, post-run rewired
to the remote variable. Select it structurally — the `runtime` whose single input is itself named
`runtime` — not by module index, which is not guaranteed stable.

## The live glue catalogue, minified

First confirmation from the real platform; every prior notebook-kit claim in the research plan rested
on the vendored 2.5.6 fixture. 265 variables, **201 distinct definitions**, 114 of them ≤110 chars.

```
26x m[1]      in=1  ex=parsedRows     :: e=>e[t]
23x m[1,2,3]  in=1  ex=md             :: function u(e){return e}
11x m[1,2]    in=0  ex=invalidation   :: ()=>e
 4x m[2,3]    in=2  ex=myModule       :: (G, _) => G.input(_)
 2x m[2,3]    in=1  ex=cell 1296      :: function(md){return( md`---` )}
```

`e=>e[t]` (projection) and `function u(e){return e}` (import identity) match the plan's predicted
live spellings exactly. `(G, _) => G.input(_)` in m[2,3] is the **hybrid** `/api/import` form, as
predicted for imported modules.

## Two import shapes in one module, and only one is a notebook import

Of M1's 108 variables, exactly **2** contain `import(`; only **1** carries the `outputs.get(…)`
enumeration.

```
cell 48  npm       async () => { const {csvParse} = await import("https://cdn.jsdelivr.net/npm/d3-dsv/+esm")
                     .then((module) => { if (!("csvParse" in module)) throw new SyntaxError(`export 'csvParse' not found`); return m…

cell 61  notebook  IN=[@variable]  LEN=366
  async (__variable) => { const {runtime} = await (import(new URL("/api/import/@tomlarkworthy/runtime-sdk", document.baseURI))
    .then((_) => { const module = __variable._module._runtime.module(_.default);
      const outputs = new Map(Array.from(__variable._outputs, (v) => [v._name, v]));
      outputs.get("runtime")?.import("runtime", module); return {}; })); return {runtime}; }
```

The npm form transpiles to a dynamic import with a **named-export guard**. A detector keying on
`import(` alone conflates the two shapes.

### This corrects E4, and finds a real `normalize()` gap

The research plan states that `transpileObservable` resolves the specifier at transpile time to
`https://api.observablehq.com/<slug>.js?v=4`. **Live, it does not.** It emits
`new URL("/api/import/<slug>", document.baseURI)`. lopecode's `normalize()`
(`knowledge/lopecode-internal-networking.md:69-73`) keys on a `.js` suffix:

```js
url.replace(/^(?:https:\/\/api\.observablehq\.com)?\/(.*?)\.js(?:\?.*)?$/, "$1")
```

`/api/import/@tomlarkworthy/runtime-sdk` has no `.js`, so **it does not match**. The plan flagged the
`file://` consequence as "inference — verify first"; the URL shape is now verified, and the
normalize gap is a concrete finding rather than a guess. E4 must cover the `/api/import/<slug>` form.

## Multi-output holders and projections, live

```
holders=23  multiOut=21  importCells=2  bare=1
cell 49->1:parsedRows   cell 48->1:csvParse   cell 46->1:speciesChart   cell 45->1:speciesCounts
bareEx=cell 53(d=2)
```

23 `cell N` holders in M1. **The categories overlap by one, and that overlap is the finding:**

- **21 carry at least one projection** (`e=>e[t]`); the sampled ones carry exactly **one** — the
  single-declaration case where `const x = …` still yields a holder plus one projection. The research
  plan recorded this from the vendored fixture (`cell 13 <= m`); the live platform agrees.
- **2 are import cells** — `cell 48` (npm) and `cell 61` (notebook). `cell 48` *also* counts as
  multiOut, because its destructured `csvParse` is a real projection. `cell 61` does **not**: its
  output was rewired to the remote variable with identity glue, so the edge to the holder is gone.
  21 + 1 + 1 = 23.
- That asymmetry is the plan's **pre-run vs post-run import distinction, observed live**: a notebook
  import that has already run keeps no projection edge, while an npm import keeps its projection.
  Grouping must therefore handle both, which is what E6's rule 3 does.

## Markdown survives into the runtime, verbatim

- The needle `"Key structural differences from classic Observable notebooks"` is in document node
  **id 2, mode md, 1082 chars**, and in exactly one M1 variable of **1141 chars** whose `_name` is
  **`null`**. The 59-char difference is the wrapper — the runtime holds the md source verbatim.
- That variable's definition is `(md) => { return ( md`…` ) }` with input `md`: the **legacy/ojs**
  compile shape, not a notebook-kit md-mode emission. Worth pinning down which modes produce which
  shape.
- The text is in the parent DOM too (`inParentDOM: true`, 95 `observablehq`-classed nodes).

### Per-node completeness: 24 of 25, and the 25th fails by construction

```
mainVars=108  anon=38  mdShaped=24  errored=0  anonWithMd=25  distinctInputs=["md"]
document: 25 md nodes
```

**`mdShaped` counts variables matching `(md) => {`: 24, against 25 md nodes.** The one absentee is
node 41, independently confirmed missing (`literally tries=0`, `browser=0`, and not present in any
other module):

```
id 41  mode md  len 73
'This literally tries to evaluate the broken expression: ${this is not js}'
```

Three md nodes carry `${` — **36, 41, 42** — but 36 and 42 *escape* it (node 36's raw value contains
`` `\${expr}` ``) and both are present. Node 41 leaves it live, so inside a `` md`…` `` template
literal it is a real substitution over undefined identifiers. It yields **no variable at all**:
`errored=0` in M1, so this is not an errored variable — the cell never defined. That is precisely the
footgun the notebook documents in node 40 ("template-mode cells parse interpolation"), observed in
the runtime.

**Verdict: markdown survives into the runtime verbatim, 24/25, the exception being absent by
design.** A runtime-only export does not lose prose. But md cells land in the **anonymous** variable
path (neither `output` nor `outputs`, so `vid` is null) — 38 anonymous variables in M1, 25 of them
md-bearing — so they are recoverable but **not addressable by name**.

### Verified structurally with acorn, not by substring matching

Tom, 2026-09-12, on the substring approach: *"this sounds like poor engineering, use AST and parsing
not regex"* — the third instance of that standing steer. Redone properly: parse each M1 definition
with acorn (reachable in the lopecode iframe as the runtime variable `acorn`; `window.acorn` is
**not** set), walk for a `TaggedTemplateExpression` whose tag is the identifier `md`, and join
`quasi.quasis[].value.cooked`. Cooked resolves `` \` `` and `\$` for free; a live `${…}` becomes a
quasi boundary. Compare by SHA-256 digest against the document's node values.

```
n=25 tagged templates   parseFail=0   vars=108
```

The accounting closes exactly:

| outcome | n | which |
|---|---|---|
| digest matches the document node **exactly** | 22 | 1, 2, 5, 7, 9, 11, 13, 15, 16, 18, 19, 21, 25, 28, 31, 33, 40, 43, 47, 50, 57, 60 |
| present; digest differs only by escape resolution | 2 | 36 and 42 — document stores `` `\${expr}` ``, cooked yields `` `${expr}` `` |
| **absent** | 1 | 41 |
| extra: not an md-mode node | 1 | a js/ojs cell using the `md` tag — ``Current live `clicks` count: **${clicks}**``, `holes=1` |

**25 templates = 24 md-mode nodes + 1 js cell**, which is also why the earlier shape test found
`mdShaped=24` while the walk finds 25.

Nodes 41 and 42 are the same sentence written twice, deliberately: 41 leaves `${this is not js}`
live, 42 escapes it. The notebook is documenting its own footgun, and the runtime confirms the
unescaped one never defines a variable.

The substring pass that preceded this scored 15/24 and had me writing escaping rules by hand — which
is the work the parser already does. Recorded as the third instance in
`feedback_compare_compiled_cells_with_the_acorn_extractor`.

**A regex bug on the same theme, from this session.** A Python check for interpolation used
`re.compile(chr(36) + r'\{[^}]*\}')`, intending a literal `$`. In a regex a bare `$` is the
end-of-string anchor, so it matched nothing, reported `holes 0` for all three interpolation nodes,
and produced digests identical to the un-normalised ones — a clean-looking result carrying no
information. The AST pass is what actually resolved those nodes.

Modules 2 and 3 hold 23 and 1 md-bearing variables. Worth flagging against the note that
`/api/import` drops every md node — either these arrived by another route or that rule has changed.
**Unresolved.**

## Method notes — five self-inflicted false signals

Each looked like a finding; none was.

1. **Wrong document, 0/15 markdown matches.** The slug came from an earlier pairing and was never
   re-verified. Fifteen misses against one confirmed hit should have been read as "my reference is
   wrong", and instead I first blamed my own normalisation. **A confident explanation that fits the
   number is not evidence for that explanation.**
2. **`modIsSame=false`** — I searched for `incrementC`, a name I had already truncated to 13 chars
   for display, so `find` returned `undefined` and the comparison was against `undefined`.
3. **`grep -c 'Key structural'` = 0** on the first document dump, because `probe-jst-doc.mjs`
   truncates node values to 50 chars. Fixed by writing `probe-doc-md.mjs`, which dumps full values.
4. **`mdish=25` vs 25 md nodes** — a coincidence, not a correspondence (see above).
5. **The eval result cap is ~500–600 chars.** Long captures must be stored on a page global
   (`window.__cap`, `window.__imp`, `window.__md`) and paged, or they are silently cut mid-JSON.

The transferable rule: **never slice by position and then reason about what came back**, and verify
the identity of your reference corpus before concluding anything from a mismatch against it.

## Reproducing this

1. Pair a lopecode notebook as an iframe inside the Observable notebook (`cc=` token).
2. In the **host** notebook: `import {runtime} from "observable:@tomlarkworthy/runtime-sdk"`.
3. From the paired notebook, `window.parent.__ojs_runtime` is the live notebook-kit Runtime.
4. Select the userspace module structurally: the `runtime` variable whose single input is named
   `runtime`; its `_module` is the viewed notebook's module.
5. Confirm which document you are looking at by matching cell text against the API
   (`api.observablehq.com/document/<slug>`), never by an inherited slug or a DOM link.

Artifacts: `tools/scratch/nks-doc-full.json` (60 nodes, full values),
`tools/scratch/nke-doc-full.json` (the wrong-document capture, kept as the control),
`tools/scratch/probe-doc-md.mjs`, `tools/scratch/probe-jst-doc.mjs`.
