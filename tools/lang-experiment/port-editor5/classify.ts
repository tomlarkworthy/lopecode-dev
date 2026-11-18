// Part 2: one category and one SoundScript verdict per $def cell of editor-5.fork.js, by hand, from reading
// each cell. Verdict: Y = SoundScript today; H = SoundScript with an Observable JavaScript helper cell at the
// boundary converting to/from plain data; N = no; P = prose, stays Observable JavaScript (S11 mixed module).
import { execSync } from "node:child_process";
const C: Record<string, [string, string]> = {
  // pure derivation
  escapeTemplateLiteral: ["pure", "Y"], inferCellGroupNameFromOJS: ["pure", "H"], normalizeObservableClipboardCell: ["pure", "H"],
  findCellByVariable: ["pure", "H"], findCellIndex: ["pure", "H"], lookupCellByIndex: ["pure", "H"],
  cellLanguage: ["pure", "H"], sourceLanguage: ["pure", "N"], claimedLanguage: ["pure", "N"], routeLanguage: ["pure", "N"], newCellLanguage: ["pure", "H"],
  claimCellSource: ["pure", "N"], decompiled: ["pure", "H"], decompile: ["pure", "N"], name: ["pure", "H"], inputs: ["pure", "H"], module: ["pure", "N"],
  _3jxaqk: ["events", "N"],
  // runtime reflection (reads Variables/Modules)
  title_variable: ["reflect", "N"], hotbarTemplate: ["reflect", "N"], shellTemplate: ["reflect", "N"], editorTemplate: ["reflect", "N"], identity: ["reflect", "N"],
  findCell: ["reflect", "N"], divToVar: ["reflect", "N"], divToCell: ["reflect", "N"], findVariableIndex: ["reflect", "N"], variableLink: ["reflect", "N"], getOption: ["reflect", "H"],
  // state
  editors: ["state", "N"], states: ["state", "N"], languageChoice: ["state", "H"], pinOnCreate: ["state", "H"],
  "viewof editedCell": ["state", "H"], editedCell: ["state", "H"], "viewof edit": ["state", "Y"], edit: ["state", "Y"], "viewof combine": ["state", "Y"], combine: ["state", "Y"],
  "viewof attachContextManu": ["state", "H"], attachContextManu: ["state", "Y"], "viewof command": ["state", "N"], command: ["state", "N"],
  "viewof options": ["state", "H"], options: ["state", "Y"], optionsFile: ["state", "N"], _ucf24e: ["state", "N"], "viewof editorModule": ["state", "N"], editorModule: ["state", "N"],
  cellSourceHandlers: ["state", "N"], cellSourceHandlersRef: ["state", "N"], "viewof variable": ["state", "N"], variable: ["state", "N"], "viewof definition": ["state", "H"], definition: ["state", "Y"],
  "viewof e5_tests_enabled": ["test", "N"], e5_tests_enabled: ["test", "Y"], select: ["state", "Y"], addCells: ["state", "Y"], remove: ["state", "Y"], apply: ["state", "Y"], up: ["state", "Y"], down: ["state", "Y"], paste: ["state", "Y"], copy: ["state", "Y"],
  // view / DOM construction
  _15uilf0: ["view", "N"], auto_attach: ["view", "N"], cellEditor: ["view", "N"], hotbar_shell: ["view", "H"], editor_panel: ["view", "N"], hotbar: ["view", "N"],
  _n8s6yl: ["view", "N"], _ytd2rq: ["view", "N"], nav: ["view", "N"], languagePicker: ["view", "N"], cellLinks: ["view", "N"], toolbar: ["view", "N"], code_editor: ["view", "N"],
  // CodeMirror extension / config
  code_editor_view: ["cm", "N"], cellIdFacet: ["cm", "N"], observableJS_language: ["cm", "N"], observableJS_highlightStyle: ["cm", "N"], observableJS_lint: ["cm", "N"],
  editor_manager: ["cm", "N"], replaceCodeMirrorDoc: ["cm", "N"], javascriptPlugin: ["cm", "N"], literalCompletions: ["cm", "N"],
  // Runtime mutation
  compile_and_update: ["runtime", "N"], defineJsCell: ["runtime", "N"], command_processor: ["runtime", "N"], remove_variables: ["runtime", "N"], _1pimibm: ["runtime", "N"],
  pasteObservableCellsIntoModule: ["runtime", "N"],
  // event wiring
  "viewof addCells": ["events", "H"], "viewof remove": ["events", "H"], "viewof apply": ["events", "N"], "viewof up": ["events", "H"], "viewof down": ["events", "H"], "viewof paste": ["events", "N"], "viewof copy": ["events", "N"],
  "viewof select": ["events", "H"], dragReorder: ["events", "N"], editor_refresh_from_runtime: ["events", "N"], moveCell: ["events", "H"], createCell: ["events", "H"], deleteCell: ["events", "H"], moveCellBeside: ["events", "H"],
  selectVariable: ["events", "N"], setOption: ["events", "H"], persist_attach_menu: ["events", "H"], save_options: ["events", "N"], editor_jobs: ["events", "N"], _c4420j: ["events", "N"], readObservableClipboardCells: ["events", "N"],
  // tests and fixtures
  completionFixture: ["test", "N"], e5Fixture: ["test", "N"],
};
const rows = execSync("bun cells.ts", { cwd: import.meta.dir, encoding: "utf8" }).trim().split("\n").map((l) => l.split("\t"));
const out: { pid: string; name: string; cat: string; v: string; lines: number }[] = [];
for (const [pid, name, lines, , deps] of rows) {
  const key = name === "(anon)" ? pid : name;
  let e = C[key];
  if (!e && name.startsWith("test_")) e = ["test", name.startsWith("test_completion") ? "N" : "N"];
  if (!e && deps === "md") e = ["md", "P"];
  if (!e) throw new Error(`unclassified ${pid} ${name}`);
  out.push({ pid, name, cat: e[0], v: e[1], lines: +lines });
}
// a value half takes the worse verdict of itself and its viewof half
const rank: Record<string, number> = { Y: 0, H: 1, N: 2, P: -1 };
for (const o of out) { const vo = out.find((x) => x.name === "viewof " + o.name); if (vo && rank[vo.v] > rank[o.v]) o.v = vo.v; }
const cats = [...new Set(out.map((o) => o.cat))];
console.log("category\tcells\tlines\tY\tH\tN\tP\tlinesY\tlinesH\tlinesN");
for (const c of cats) {
  const xs = out.filter((o) => o.cat === c), n = (v: string) => xs.filter((o) => o.v === v);
  const l = (ys: typeof xs) => ys.reduce((a, o) => a + o.lines, 0);
  console.log([c, xs.length, l(xs), n("Y").length, n("H").length, n("N").length, n("P").length, l(n("Y")), l(n("H")), l(n("N"))].join("\t"));
}
console.log("total", out.length, out.reduce((a, o) => a + o.lines, 0));
console.log("largest:"); for (const o of [...out].sort((a, b) => b.lines - a.lines).slice(0, 10)) console.log(`  ${o.name}\t${o.cat}\t${o.lines}\t${o.v}`);
if (process.argv[2] === "--all") for (const o of out) console.log([o.pid, o.name, o.cat, o.v, o.lines].join("\t"));
// Primary blocker of each N/H cell (one per cell; most cells hit several):
// FN  a function, Promise, Map or class instance must cross the boundary (S11.3, S11.5) and a notebook
//     module has no foreign declarations (S9.3)
// RT  writes the Runtime or another effect beyond state: no capability does (S2.5), actions write state only (S6.5)
// JSX the JSX vocabulary or renderer (tags, events, no ref, foreign DOM children removed on re-render)
// DOM a free name: document, window, setTimeout, requestAnimationFrame, navigator (S2.6)
// MUT an identity-keyed shared cache or an owned foreign mutable object (S3.1, S3.2, S4.3)
const B: Record<string, string> = {
  auto_attach: "DOM", dragReorder: "DOM", readObservableClipboardCells: "DOM",
  cellEditor: "RT", compile_and_update: "RT", defineJsCell: "RT", command_processor: "RT", remove_variables: "RT", _1pimibm: "RT", pasteObservableCellsIntoModule: "RT", save_options: "RT",
  hotbar_shell: "JSX", editor_panel: "JSX", hotbar: "JSX", nav: "JSX", languagePicker: "JSX", cellLinks: "JSX", toolbar: "JSX",
  editors: "MUT", states: "MUT", languageChoice: "MUT", pinOnCreate: "MUT", cellSourceHandlersRef: "MUT", code_editor_view: "MUT", code_editor: "MUT", replaceCodeMirrorDoc: "MUT",
};
if (process.argv[2] === "--blockers") {
  const tally = new Map<string, { cells: number; lines: number }>();
  for (const o of out) if ((o.v === "N" || o.v === "H") && o.cat !== "test") {
    const b = B[o.name] ?? B[o.pid] ?? "FN";
    const t = tally.get(b) ?? { cells: 0, lines: 0 }; t.cells++; t.lines += o.lines; tally.set(b, t);
  }
  for (const [b, t] of [...tally].sort((x, y) => y[1].lines - x[1].lines)) console.log(`${b}\t${t.cells} cells\t${t.lines} lines`);
}
