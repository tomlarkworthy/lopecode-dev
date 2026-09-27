// rc5t-cities-table: the user's own CSV, end to end. The agent cannot know the file, so it must ask
// (request_files); the rows must be read typed so population sorts and bins as a number; the table must
// sort on a header click; the histogram must bin (one bar per city is a bar chart); the attachment must
// be in the saved file and the reopened notebook must render the table.
// In runs 20260928-0150-w13-before{,2,3} the agent read request_files' 5-line preview as the whole file
// and told the user "a nice dataset with 4 European cities" (3 of 3 runs; the file had 10 rows), and in
// -before3 drew a bar per city instead of a histogram.
// The answer is tools/scratch/rc5-evals/fixtures/cities.csv plus two small cities, so a string-typed
// population column sorts differently ("5157" > "3677472") and the file has 12 rows.
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const CSV = readFileSync(resolve(here, "fixtures/cities.csv"), "utf8").replace(/\n?$/, "\n") +
  "Valletta,Malta,5157,0.61,1566\nLuxembourg,Luxembourg,134714,51.5,963\n";

// Copied from @observablehq/plot-exploration-penguins (lopebooks @tomlarkworthy_cloudevents-explorer.html):
// data = FileAttachment("palmer-penguins.csv").csv({typed: true}); Inputs.table(data);
// Plot.rectY(data, Plot.binX({y: "count"}, {x: "body_mass", thresholds: 20}))
const ORACLE_SRC = `const _intro = function intro(md){return( md\`# Cities\` )};
const _data = function data(FileAttachment){return( FileAttachment("cities.csv").csv({typed: true}) )};
const _table = function table(Inputs, data){return( Inputs.table(data) )};
const _histogram = function histogram(Plot, data){return( Plot.rectY(data, Plot.binX({y: "count"}, {x: "population"})).plot() )};
export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;
  $def("_intro", "intro", ["md"], _intro);
  $def("_data", "data", ["FileAttachment"], _data);
  $def("_table", "table", ["Inputs", "data"], _table);
  $def("_histogram", "histogram", ["Plot", "data"], _histogram);
  return main;
}
`;

export default {
  id: "rc5t-cities-table",
  category: "rc5-train",
  question: "I have a CSV of cities with their populations. Put it in the notebook and give me a sortable table and a histogram of the populations.",
  setup: {
    init: "globalThis.__baseMods = new Set(globalThis.__ojs_runtime.mains.keys())",
    answer: { files: [{ name: "cities.csv", content: CSV, type: "text/csv" }] },
    collect: readFileSync(resolve(here, "cities-table.collect.js"), "utf8"),
  },
  criteria: [
    // it cannot know the file: it must ask for it
    { name: "tool_call_matches", args: { name: "request_files", pattern: "." }, weight: 1 },
    // THE defect in 3/3 base runs: a row count told to the user that is not the file's (the preview's)
    { name: "collected_equals", args: { key: "countClaimsOk", equals: true }, weight: 2 },
    { name: "collected_equals", args: { key: "typedPopulation", equals: true }, weight: 2 },
    { name: "collected_equals", args: { key: "sortWorks", equals: true }, weight: 2 },
    { name: "collected_equals", args: { key: "histogram", equals: true }, weight: 1 },
    { name: "collected_equals", args: { key: "savedHasCsv", equals: true }, weight: 1 },
    { name: "collected_equals", args: { key: "reopenedTable", equals: true }, weight: 2 },
    { name: "no_runtime_errors", args: {}, weight: 1 },
  ],
  // request_files has no chat to ask in under --oracle (it returns an error), so the oracle attaches the
  // file itself; the call is still recorded, as the criterion needs.
  oracle: [
    { tool: "request_files", args: { module: "@user/cities", prompt: "your cities CSV", accept: ".csv" } },
    { tool: "write_file", args: { file_path: "/src/@user/cities.js", content: ORACLE_SRC } },
    { tool: "attach_file", args: { module: "@user/cities", name: "cities.csv", content: CSV, mime: "text/csv" }, settleMs: 3000 },
  ],
};
