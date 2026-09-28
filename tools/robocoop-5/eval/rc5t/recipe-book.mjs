// Long task: the 2026-09-28 baseline ran out its 1200s turn without writing a module. Model runs need --timeout 1800000.
// rc5t-recipe-book: a multi-part app whose recipes must survive a save. Each part is scored separately by
// setup.collect (recipe-book.collect.js), which acts as the user after the turn: adds two probe recipes through
// the form, searches by title and by ingredient, picks one and scales it 2 -> 4 servings, ticks both for a
// shopping list that must sum 200 g + 150 g of the shared ingredient, then exports and reopens the file in a
// sandboxed blob: iframe (no localStorage from this browser) and looks for both probes.
// In run 20260928-0545-w29-before the agent read keeping-user-state-in-the-saved-notebook.md at 61s, then spent
// 4 steps (337s -> 896s) grepping /src and /content for a local copy of sticky and probing `typeof sticky`
// before writing anything; the run timed out at 1200s with no module written.
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

// State via sticky as in @tomlarkworthy/codestrates.doc (lopebooks tomlarkworthy_codestrates.html); the view
// contract (setter re-renders, input on each edit) from codestrates.codestratePlace. Inputs.checkbox over data
// as in @tomlarkworthy/atlas (lopecode tomlarkworthy_atlas.html); Inputs.select with format as in
// @tomlarkworthy/infinite-canvas (lopebooks tomlarkworthy_infinite-canvas.html).
const ORACLE_SRC = readFileSync(resolve(here, "recipe-book.oracle.js"), "utf8");

export default {
  id: "rc5t-recipe-book",
  category: "rc5-train",
  question: "Build me a recipe book. I can add a recipe (title, servings, ingredients as \"quantity unit name\" lines, steps), search recipes by title or ingredient, pick one and scale it to a different number of servings, and tick several recipes to get a combined shopping list that adds up the same ingredient across recipes. Recipes I add should still be there after I save the notebook. Start it with two example recipes.",
  setup: {
    init: "globalThis.__baseMods = new Set(globalThis.__ojs_runtime.mains.keys())",
    collect: readFileSync(resolve(here, "recipe-book.collect.js"), "utf8"),
  },
  criteria: [
    { name: "collected_equals", args: { key: "hasExamples", equals: true }, weight: 1 },
    { name: "collected_equals", args: { key: "addedLive", equals: true }, weight: 2 },
    { name: "collected_equals", args: { key: "searchTitle", equals: true }, weight: 1 },
    { name: "collected_equals", args: { key: "searchIngredient", equals: true }, weight: 1 },
    { name: "collected_equals", args: { key: "scaled", equals: true }, weight: 2 },
    { name: "collected_equals", args: { key: "combinedSum", equals: true }, weight: 2 },
    { name: "collected_equals", args: { key: "reopenedShown", equals: true }, weight: 3 },
    { name: "no_runtime_errors", args: {}, weight: 1 },
  ],
  oracle: [
    { tool: "read_file", args: { file_path: "/content/@tomlarkworthy/markdown-wiki/keeping-user-state-in-the-saved-notebook.md" } },
    { tool: "write_file", args: { file_path: "/src/@user/recipe-book.js", content: ORACLE_SRC }, settleMs: 4000 },
  ],
};
