// rc5-train eval (20260929-0620-m49): a .csv attachment previews as a table in the file panel.
// The file panel is @tomlarkworthy/fileattachments.file_browser ("Writable FileAttachments"): one listing
// row per attachment (Name, Size, Type, Actions) and nothing that shows a file's contents.
//
// setup.init attaches readings.csv (7 lines of @observablehq/plot-stack/us-congress-members.csv, from
// lopebooks/notebooks/@tomlarkworthy_cloudevents-explorer.html: the header and rows 113-116, 529, 709). Three
// names are quoted fields holding a comma, one with "" escapes; 18 of that file's 887 rows are.
// tweets.csv is 4 columns and rows 24-26 of tweet_activity_metrics_trendingnotebo2_20220501_20220601_en.csv
// (lopebooks/notebooks/@tomlarkworthy_twitter-trending-notebook-bot-dataset-2022.html, every field quoted):
// one tweet is a quoted field holding a blank line, as 2 of the 23 distinct CSV attachments in the corpus have.
// It also attaches notes.txt (comma-separated text that is not a .csv) to a seeded module @user/sensor, each entry with a
// mimeType, so a check by extension and a check by MIME both see a CSV.
// setup.collect renders every named cell of the file panel's module, clicks a Preview/Show/View control
// if the table is behind one, and requires: a table whose cells are the fields a CSV parser reads (a header
// cell "full_name", cells "Thomas A. Garrett, Jr." and 'Henry C. "Hank" Johnson, Jr.', and 1947 compared
// without thousands separators; a split(",") parser gives '"Thomas A. Garrett' and fails), a tweets.csv cell
// holding the whole two-line tweet next to its impressions 760 (a parser that splits lines first fails),
// no table built from notes.txt, and the listing still naming all three files.

const CSV = "full_name,gender,birth\nDavid W. Jolly,M,1972\nBeto O’Rourke,M,1972\n\"Thomas A. Garrett, Jr.\",M,1972\nBen Ray Luján,M,1972\n\"Henry C. \"\"Hank\"\" Johnson, Jr.\",M,1954\n\"Joe Manchin, III\",M,1947\n";
const TWEETS = "\"Tweet id\",\"Tweet text\",\"time\",\"impressions\"\n\"1521463395366719488\",\"\"\"Top Dataviz of April 2022 - Visualizing Air Raid Sirens in Ukraine\"\" by Tom Larkworthy https://t.co/a95BeD8luT https://t.co/76ij46SXU2\",\"2022-05-03 12:15 +0000\",\"461.0\"\n\"1521428769692700672\",\"Notebook of the month (maybe of the year?) by a clear margin was 'Visualizing Air Raid Sirens in Ukraine' by @mourner. Amazing work Volodymyr, thank you.\n\nhttps://t.co/a95BeD8luT\",\"2022-05-03 09:57 +0000\",\"760.0\"\n\"1521101008188887041\",\"\"\"Stars\"\" by Ankita Kamble https://t.co/BG0aLzFsOT https://t.co/OG8hNOSxwH\",\"2022-05-02 12:15 +0000\",\"111.0\"\n";
const TWEET = "Notebook of the month (maybe of the year?) by a clear margin was 'Visualizing Air Raid Sirens in Ukraine' by @mourner. Amazing work Volodymyr, thank you. https://t.co/a95BeD8luT";
const TXT = "alpha,beta\nqqq1,qqq2\n";

const SENSOR = `const _intro = function _intro(md){return(
md\`# Sensor readings\`
)};
const _readings = function _readings(FileAttachment){return(
FileAttachment("readings.csv").csv({typed: true})
)};
export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;
  $def("_intro", null, ["md"], _intro);
  $def("_readings", "readings", ["FileAttachment"], _readings);
  return main;
}
`;

const FIND = String.raw`
  const rt = [...globalThis.__ojs_runtime.mains.values()].find(m => m && m._runtime)._runtime;
  const panelVar = () => [...rt._variables].find(v => v._name === "file_browser" && v._module && v._module._scope.has("setFileAttachment"));
`;

const INIT = String.raw`(async () => {
  ${FIND}
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  let pv;
  for (let i = 0; i < 100 && !(pv = panelVar()); i++) await sleep(200);
  if (!pv) throw new Error("no file panel module (file_browser)");
  const sensor = [...rt._variables].find(v => v._name === "readings" && v._module._scope.has("readings") && v._module !== pv._module)?._module;
  if (!sensor) throw new Error("seeded @user/sensor not live");
  const set = await pv._module.value("setFileAttachment");
  const mapOf = await pv._module.value("getFileAttachmentsMap");
  await set(new File([${JSON.stringify(CSV)}], "readings.csv", { type: "text/csv" }), sensor);
  await set(new File([${JSON.stringify(TWEETS)}], "tweets.csv", { type: "text/csv" }), sensor);
  await set(new File([${JSON.stringify(TXT)}], "notes.txt", { type: "text/plain" }), sensor);
  const map = mapOf(sensor._builtins.get("FileAttachment"));
  for (const [name, mimeType] of [["readings.csv", "text/csv"], ["tweets.csv", "text/csv"], ["notes.txt", "text/plain"]]) {
    const e = map.get(name);
    map.set(name, { url: typeof e === "string" ? e : e.url, mimeType });
  }
  return "seeded";
})()`;

const COLLECT = String.raw`(async () => {
  ${FIND}
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const pv = panelVar();
  if (!pv) return "no file panel (file_browser) after the turn";
  const mod = pv._module;
  const names = [...mod._scope.keys()].filter(n => !n.startsWith("module ") && !/^(sampleFileAttachment|plainFile|fileInput|viewof fileInput|file|viewof file|attach_file)$/.test(n));
  const render = async () => {
    const els = [];
    for (const n of names) {
      try {
        const x = await Promise.race([mod.value(n), sleep(8000).then(() => null)]);
        if (x instanceof Element) els.push(x);
      } catch {}
    }
    return els;
  };
  let els = await render();
  if (!els.length) return "the file panel rendered no element";
  await sleep(2500);
  els = await render();
  const norm = s => s.replace(/[\s,\u00a0\u202f']/g, "");
  const text = c => c.textContent.replace(/\s+/g, " ").trim();
  const cells = () => els.flatMap(e => [...e.querySelectorAll("td, th")]);
  const header = () => cells().some(c => text(c) === "full_name");
  const quoted = () => ["Thomas A. Garrett, Jr.", 'Henry C. "Hank" Johnson, Jr.'].every(n => cells().some(c => text(c) === n));
  const hasTable = () => header() && quoted() && cells().some(c => norm(c.textContent) === "1947");
  const multiline = () => cells().some(c => text(c) === ${JSON.stringify(TWEET)}) && cells().some(c => /^760(\.0)?$/.test(norm(c.textContent)));
  if (!hasTable() || !multiline()) {
    const toggles = els.flatMap(e => [...e.querySelectorAll("button, summary, a")]).filter(b => /preview|show|view|table|expand|▸|▶/i.test(b.textContent));
    for (const b of toggles) { try { b.click(); } catch {} }
    for (const d of els.flatMap(e => [...e.querySelectorAll("details:not([open])")])) d.open = true;
    await sleep(2500);
    els = await render();
    els = els.length ? els : [];
  }
  const all = els.map(e => e.textContent).join(" ");
  if (!/readings\.csv/.test(all) || !/tweets\.csv/.test(all) || !/notes\.txt/.test(all)) return "the listing no longer names readings.csv, tweets.csv and notes.txt";
  if (!hasTable()) {
    if (header() && !quoted()) return "readings.csv is a table, but its quoted fields are split at the comma inside them (cells: " +
      JSON.stringify(cells().filter(c => !c.querySelector("td, th")).map(text).filter(t => /Garrett|Hank/.test(t))) + ")";
    const raw = /full_name/.test(all) ? " (the CSV text is shown, but not split into table cells)" : "";
    return "no table preview of readings.csv: no cells 'full_name', 'Thomas A. Garrett, Jr.', 1947" + raw;
  }
  if (!multiline()) return "tweets.csv has no cell holding the whole quoted tweet that spans two lines ('Notebook of the month … https://t.co/a95BeD8luT') next to its impressions 760";
  if (cells().some(c => norm(c.textContent) === "alpha" || norm(c.textContent) === "qqq1")) return "notes.txt (not a .csv) was also rendered as a table";
  return "ok";
})()`;

// Oracle: the preview as the corpus writes a CSV table, FileAttachment(name).csv({typed: true}) then
// Inputs.table(data) (d/d2dffac0e42406e8 cells _events and _29, lopebooks/notebooks/@tomlarkworthy_cloudevents-explorer.html),
// here through the panel module's own getFileAttachment(name, module).
const OLD_ROW = "      tr.appendChild(actions);\n      tbody.appendChild(tr);\n";
const NEW_ROW = "      tr.appendChild(actions);\n      tbody.appendChild(tr);\n" +
  "      if (/\\.csv$/i.test(f.name) || f.mimeType === \"text/csv\") {\n" +
  "        const cell = htl.html`<td colspan=\"4\" style=\"padding: 4px 8px\">loading preview…</td>`;\n" +
  "        const row = htl.html`<tr></tr>`;\n" +
  "        row.appendChild(cell);\n" +
  "        tbody.appendChild(row);\n" +
  "        getFileAttachment(f.name, f._module).csv({typed: true})\n" +
  "          .then((data) => cell.replaceChildren(Inputs.table(data, {rows: 10})))\n" +
  "          .catch((e) => (cell.textContent = \"preview failed: \" + e.message));\n" +
  "      }\n";

export default {
  id: "rc5t-csv-table-preview",
  category: "rc5-train",
  question: "Make .csv file attachments show as a table preview in the file panel.",
  setup: {
    files: { "/src/@user/sensor.js": SENSOR },
    init: INIT,
    collect: COLLECT,
  },
  criteria: [
    // the goal: the panel shows readings.csv as a table of its cells, and leaves notes.txt alone
    { name: "collected_equals", args: { equals: "ok" }, weight: 4 },
  ],
  oracle: [
    { tool: "read_file", args: { file_path: "/src/@tomlarkworthy/fileattachments.js" } },
    { tool: "edit_file", args: { file_path: "/src/@tomlarkworthy/fileattachments.js",
      old_string: "const _b3y7l7 = function _file_browser(all_module_files,htl,confirm,removeFileAttachment,setFileAttachment)",
      new_string: "const _b3y7l7 = function _file_browser(all_module_files,htl,confirm,removeFileAttachment,setFileAttachment,getFileAttachment,Inputs)" } },
    { tool: "edit_file", args: { file_path: "/src/@tomlarkworthy/fileattachments.js", old_string: OLD_ROW, new_string: NEW_ROW } },
    { tool: "edit_file", args: { file_path: "/src/@tomlarkworthy/fileattachments.js",
      old_string: "[\"all_module_files\",\"htl\",\"confirm\",\"removeFileAttachment\",\"setFileAttachment\"], _b3y7l7)",
      new_string: "[\"all_module_files\",\"htl\",\"confirm\",\"removeFileAttachment\",\"setFileAttachment\",\"getFileAttachment\",\"Inputs\"], _b3y7l7)" } },
  ],
};
