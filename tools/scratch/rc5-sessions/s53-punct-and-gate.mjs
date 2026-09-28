// probe (20260928-0847-m28): two file-tool defects, no model.
// 1. edit_file said only "old_string not found" when old_string differed from the file by typographic
//    punctuation (the prose has I’m U+2019, the model sends I'm). m23: 2 and 4 wasted edits, then rewrites.
// 2. the wiki write-gate tested every trigger against the whole write, so rewriting a file that ALREADY
//    had `viewof …` (a translation, a reorder) was refused until the page was read (m23, m17).
// usage (from the repo root): node <this file> <notebook.html>
import { resolve } from "node:path";
const NB = resolve(process.argv[2] || "lopebooks/notebooks/@tomlarkworthy_robocoop-5.html");
const { bootNotebook } = await import(resolve(process.cwd(), "tools/robocoop-5/lib/notebook-boot.mjs"));
const { page, close } = await bootNotebook({ notebookPath: NB, layout: "R100(S75(@tomlarkworthy/robocoop-5),S25(@tomlarkworthy/robocoop-5-srctools))" });

const mod = cells => cells.map(([pid, name, deps, body]) => `const ${pid} = function _${name ? name.replace(/\W/g, "_") : pid}(${deps.map(d => d.replace(/\W/g, "_")).join(",")}){return(\n${body}\n)};`).join("\n") +
  `\nexport default function define(runtime, observer) {\n  const main = runtime.module();\n  const $def = (pid, name, deps, fn) => { main.variable(observer(name)).define(name, deps, fn).pid = pid; };\n` +
  cells.map(([pid, name, deps]) => `  $def("${pid}", ${JSON.stringify(name)}, ${JSON.stringify(deps)}, ${pid});`).join("\n") + "\n  return main;\n}\n";
const INTRO = ["_intro", null, ["md"], "md`# Air quality\n\nIf I’m concerned about “AQI” – the index – I check it. Yes I’m here. No I’m here.`"];
const KNOB = ["_knob", "viewof knob", ["Inputs"], "Inputs.range([0, 10], {label: \"Level\"})"];
const cellsA = [INTRO, KNOB, ["_val", "knob", ["Generators", "viewof knob"], "Generators.input(viewof_knob)"]];
// the md prose translated, cells in another order: nothing new that a trigger names
const SRC_A = mod(cellsA);
const SRC_TRANSLATED = mod([["_val", "knob", ["Generators", "viewof knob"], "Generators.input(viewof_knob)"], KNOB,
  ["_intro", null, ["md"], "md`# Calidad del aire\n\nSi me preocupa el “AQI” – el índice – lo compruebo.`"]]);
// a NEW viewof cell in a file that already has one
const SRC_NEW_VIEWOF = mod([...cellsA, ["_speed", "viewof speed", ["Inputs"], "Inputs.range([1, 5], {label: \"Speed\"})"]]);

const SRC_MOVED = mod([KNOB]);
const SRC_FRESH = mod([["_rate", "viewof rate", ["Inputs"], "Inputs.range([0, 1], {label: \"Rate\"})"]]);
const out = await page.evaluate(async ({ SRC_A, SRC_TRANSLATED, SRC_NEW_VIEWOF, SRC_MOVED, SRC_FRESH }) => {
  const H = window.__nbHelpers;
  ["toolsView", "hostSetup", "wiki_index"].forEach(n => H.force(n)); await new Promise(r => setTimeout(r, 1500));
  const t0 = Date.now();
  while (Date.now() - t0 < 25000 && !(H.byName("toolsView")?.value?.length >= 10)) await new Promise(r => setTimeout(r, 300));
  const byId = new Map(H.byName("toolsView").value.map(t => [t.id, t]));
  const run = async (id, args, c) => String((await byId.get(id).execute(args, c))?.output ?? "");
  const P = "/src/@probe/air.js";
  const body = async () => (await run("read_file", { file_path: P }, {})).split("\n").map(l => l.replace(/^ *\d+\t/, "")).join("\n");
  const r = {};
  // ---- 1. punctuation ----
  await run("write_file", { file_path: P, content: SRC_A }, {});
  r.uniqueOut = await run("edit_file", { file_path: P, old_string: "If I'm concerned about \"AQI\" - the index", new_string: "If I'm worried about \"AQI\" - the index" }, {});
  r.uniqueBody = await body();
  r.ambigOut = await run("edit_file", { file_path: P, old_string: "I'm here", new_string: "I am here" }, {});
  r.ambigBody = await body();
  r.absentOut = await run("edit_file", { file_path: P, old_string: "I'm absent", new_string: "x" }, {});
  r.exactOut = await run("edit_file", { file_path: P, old_string: "# Air quality", new_string: "# Air quality today" }, {});
  // ---- 2. gate ----
  await run("write_file", { file_path: P, content: SRC_A }, {});
  const g = () => ({ sessionState: {} });
  r.translated = await run("write_file", { file_path: P, content: SRC_TRANSLATED }, g());
  await run("write_file", { file_path: P, content: SRC_A }, {});
  r.editKeepsViewof = await run("edit_file", { file_path: P, old_string: '$def("_knob", "viewof knob", ["Inputs"], _knob);', new_string: '$def("_knob", "viewof knob", ["Inputs"], _knob);\n  // moved' }, g());
  await run("write_file", { file_path: P, content: SRC_A }, {});
  r.newViewof = await run("write_file", { file_path: P, content: SRC_NEW_VIEWOF }, g());
  r.editNewViewof = await run("edit_file", { file_path: P, old_string: '$def("_knob", "viewof knob", ["Inputs"], _knob);', new_string: '$def("_knob", "viewof knob", ["Inputs"], _knob);\n  $def("_knob", "viewof knob2", ["Inputs"], _knob);' }, g());
  // a cell moved into a new module (m17: bind cells moved to a helpers module) is text already held
  r.movedToNew = await run("write_file", { file_path: "/src/@probe/helpers.js", content: SRC_MOVED }, g());
  r.newFile = await run("write_file", { file_path: "/src/@probe/fresh.js", content: SRC_FRESH }, g());
  return r;
}, { SRC_A, SRC_TRANSLATED, SRC_NEW_VIEWOF, SRC_MOVED, SRC_FRESH });
await close();

const checks = {
  "unique curly-quote edit applies": /^Edited/.test(out.uniqueOut),
  "  result names the differing characters": /U\+2019/.test(out.uniqueOut) && /U\+201C/.test(out.uniqueOut),
  "  unchanged prefix keeps the file's ’": out.uniqueBody.includes("If I’m worried about “AQI” – the index"),
  "  punctuation outside old_string untouched": out.uniqueBody.includes("Yes I’m here. No I’m here."),
  "ambiguous normalised match refused": /^ERROR/.test(out.ambigOut) && /2 places/.test(out.ambigOut),
  "  file unchanged": out.ambigBody.includes("Yes I’m here. No I’m here."),
  "absent text still 'not found'": /^ERROR: old_string not found/.test(out.absentOut),
  "exact edit unaffected": /^Edited/.test(out.exactOut),
  "translation/reorder rewrite with pre-existing viewof not refused": !/^REFUSED/.test(out.translated),
  "edit whose new_string repeats an existing viewof line not refused": !/^REFUSED/.test(out.editKeepsViewof),
  "rewrite adding a NEW viewof cell refused": /^REFUSED/.test(out.newViewof) && /writing-cells-in-module-source/.test(out.newViewof),
  "edit adding a NEW viewof line refused": /^REFUSED/.test(out.editNewViewof),
  "a viewof cell moved into a new module not refused": !/^REFUSED/.test(out.movedToNew),
  "a new module with its own viewof refused": /^REFUSED/.test(out.newFile),
};
for (const [k, v] of Object.entries(checks)) console.log((v ? "PASS " : "FAIL ") + k);
console.log(JSON.stringify(Object.fromEntries(Object.entries(out).map(([k, v]) => [k, /Body$/.test(k) ? v.split("\n").slice(0, 4).join(" | ") : v.slice(0, 300)])), null, 1));
const failed = Object.values(checks).filter(v => !v).length;
console.log(failed ? `${failed} FAILED` : "ALL PASS");
process.exit(failed ? 1 : 0);
