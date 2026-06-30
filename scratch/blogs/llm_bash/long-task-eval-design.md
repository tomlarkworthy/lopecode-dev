# Long-task eval design: "build one thing, then adjust it into another"

The 21-eval subset couldn't see the thesis because each task is a single short build — sed and `edit_file`
are equivalent when one write finishes the job (see `VERDICT.md`). The discriminating dimension is
**edits-on-existing-code across a long task**, where byte-stability decides whether the agent edits
incrementally or keeps rewriting the whole file. The user's framing is exactly right: **build artifact A,
then transform it into artifact B.** Phase 2 is the test; phase 1 just creates the code phase 2 must edit.

## Why this shape is the right instrument

- **It forces edits on existing cells** (rename, change logic, add/remove), not append-only authoring.
- **It stresses byte-stability across turns.** If the *adjust* arrives as a second turn, its `edit_file`
  `old_string`s come from a file written in turn 1 — and on a build that reformats on apply (`9f7b205` sed,
  `01b31df` tools-without-`/src`) those strings no longer match → fallback to whole-file rewrite. The current
  build (tools + `/src` byte-stability) keeps them matching. That is the exact mechanism the post is about.
- **It exposes three measurable failure modes a one-shot build hides:**
  1. **Preservation** — a lossy rewrite drops/renames phase-1 cells; targeted edits keep them working.
  2. **Decomposition** — rewrite-the-world collapses logic into one mega-cell; incremental edits keep
     separate reactive cells.
  3. **Edit economy** — `edit_file`:`write_file` ratio and edit-failure rate (descriptive; tool-specific).

## Structure: two turns, not one long prompt

A single prompt that says "build X then change it to Y" lets the model plan both phases up front and write B
in one shot — it doesn't test editing. Send them as **separate turns** so phase 2 operates on already-committed
(and possibly reformatted) code. The driver currently sends one question; add a `followups` array.

### Minimal driver change (`driver.mjs`, ~line 337)

```js
// was: const turn = await Promise.race([session.send(question), timeout]);
const prompts = [question, ...(evalDef.followups || [])];
let turn;
for (const p of prompts) {
  turn = await Promise.race([session.send(p), timeout]);   // sequential turns, same session/file/runtime
}
// snapshot AFTER the last turn (unchanged below)
```

`evalDef.followups` is sent in order; the world is snapshotted after the final turn. Each turn re-reads the
same files the prior turn left on disk — so a reformat-on-apply build breaks here and a byte-stable one
doesn't. (Token budget: a 2-turn edit task is still well under the per-turn cap.)

## Two new criteria (decomposition + anti-monolith), pure over the snapshot

```js
// criteria.mjs — both operate on snapshot.modules[id].variables (named, non-import cells)

// At least N distinct named cells survive in the live module — rewards keeping logic decomposed
// (a build that collapsed everything into one mega-cell fails this).
module_min_cells(snapshot, args) {
  const mod = snapshot.modules?.[args.id];
  if (!mod) return fail(`module ${args.id} not found live`);
  const n = mod.variables.filter(v => v.name && !v.name.startsWith("module ")).length;
  return n >= args.n ? ok(`${args.id} has ${n} cells (need ${args.n})`)
                     : fail(`${args.id} has ${n} cells (need ${args.n}) — collapsed/monolithic?`);
},

// No single cell exceeds maxLoc source lines — the anti-monolith signal (one 200-line cell = rewrite-the-world).
max_cell_loc(snapshot, args) {
  const mod = snapshot.modules?.[args.id];
  if (!mod) return fail(`module ${args.id} not found live`);
  let worst = 0, who = "";
  for (const v of mod.variables) {
    const loc = String(v.source || "").split("\n").length;
    if (loc > worst) { worst = loc; who = v.name || "(anon)"; }
  }
  return worst <= args.maxLoc ? ok(`largest cell ${who} = ${worst} loc (≤ ${args.maxLoc})`)
                              : fail(`cell ${who} = ${worst} loc (> ${args.maxLoc}) — monolithic`);
},
```

## Worked eval (ready to paste into `evals.mjs`)

Self-seeding, deterministic, numeric+UI so the outcome is mechanically checkable. Build a store subtotal,
then adapt it into a checkout with tax + discount — phase 2 must edit `summary` and add cells that depend on
the preserved phase-1 cells.

```js
{
  id: "long-store-to-checkout",
  category: "long-edit",
  question:
    "Create module @user/store with these SEPARATE reactive cells: viewof price = Inputs.range([0,1000], " +
    "{value:100,step:1}); viewof qty = Inputs.range([1,20], {value:3,step:1}); subtotal = price * qty; and a " +
    "markdown cell `summary` that shows the subtotal. @user/store.subtotal must be 300 at the defaults.",
  followups: [
    "Now ADAPT @user/store into a checkout. Add viewof taxPct = Inputs.range([0,30],{value:10,step:1}) and " +
    "viewof discountPct = Inputs.range([0,50],{value:0,step:1}). Keep price, qty and subtotal exactly as they " +
    "are. Add tax = subtotal * taxPct/100 and total = subtotal + tax - subtotal*discountPct/100. Update the " +
    "summary cell to show the total. At the defaults @user/store.total must be 330. Make small targeted edits; " +
    "keep each value in its own cell."
  ],
  criteria: [
    // transform outcome, computed through the preserved chain
    { name: "variable_equals", args: { module: "@user/store", name: "total", equals: 330 }, weight: 3 },
    { name: "variable_no_error", args: { module: "@user/store", name: "total" }, weight: 1 },
    // PRESERVATION — phase-1 work survived the phase-2 edits (a lossy rewrite would drop/break these)
    { name: "variable_equals", args: { module: "@user/store", name: "subtotal", equals: 300 }, weight: 2 },
    { name: "variable_defined", args: { module: "@user/store", name: "price" }, weight: 1 },
    { name: "variable_defined", args: { module: "@user/store", name: "qty" }, weight: 1 },
    // the new control mounted live; the summary reflects the new value
    { name: "renders_element", args: { module: "@user/store", name: "viewof taxPct" }, weight: 1 },
    { name: "module_renders_contains", args: { module: "@user/store", needle: "330" }, weight: 1 },
    // DECOMPOSITION — kept as separate reactive cells, not collapsed into a mega-cell
    { name: "module_min_cells", args: { id: "@user/store", n: 6 }, weight: 2 },
    { name: "max_cell_loc", args: { id: "@user/store", maxLoc: 12 }, weight: 1 },
    // anti-hardcode: total is genuinely derived
    { name: "variable_no_error", args: { module: "@user/store", name: "tax" }, weight: 1 },
  ],
}
```

Edit-economy is *also* worth logging for the cross-build comparison, but as **descriptive** numbers, not
scored criteria (they're tool-specific and circular across builds): `tool_used edit_file`, `tool_used_at_most
write_file`, `no_tool_result_matches "ERROR: old_string"`. Report them alongside the outcome scores.

## How it discriminates the builds

| arm | expected phase-2 behaviour | outcome / preservation / decomposition |
|-----|----------------------------|----------------------------------------|
| bash-only `9f7b205` (sed) | re-emit the whole file each change | total often right, but higher chance of dropping a cell or collapsing logic; decomposition weaker |
| tools `01b31df` (no `/src`) | `edit_file` `old_string` breaks after the reformat-on-apply → fallback to `write_file` rewrites | ~ same as sed (this is why the bare-tools A/B tied) |
| **current** (tools + `/src`) | targeted `edit_file`s land first try; cells preserved | highest preservation + decomposition + edit economy |

The prediction is specifically that **decomposition + preservation separate the current build from the other
two, while raw `total==330` completion stays similar** — i.e. the gain lives where `VERDICT.md` argued it does.

## Make it robust (denoise + generalise)

One task = one data point and we saw single-run variance dominate. So:

- **Repeat N≥3 per arm** and average; report per-criterion pass-rate, not a single aggregate.
- **A small family of build→adjust pairs**, averaged, so the verdict isn't one task's quirk:
  - tip calculator → split-the-bill (add `people`, `perPerson`; edit summary)
  - °C→°F converter → bidirectional converter (add a unit `viewof`, branch the formula)
  - flat list render → grouped/filtered list (add a `viewof filter`, rewire the derived cell)
  - bar chart → grouped bar chart (Plot: add a series dimension, edit the mark)
  Each scored on the same axes: transform-correct, preservation, decomposition, edit-economy.

## Why not just measure the DAW

The DAW build is the vivid anecdote, but it's hard to score deterministically and hard to repeat. The
build→adjust calculators give the same edits-on-existing-code stress with mechanical, low-variance criteria,
so they can be run N times across builds and models — turning the anecdote into a measured result.
