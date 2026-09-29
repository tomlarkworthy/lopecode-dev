// S89 (rc5-train 20260929-0620-m49): a module write that splits CSV text by line and then by comma is refused until
// the session has read reading-csv-and-delimited-text.md, and so is one that maps split lines through a csv-named
// parser; a write that parses with d3.csvParse is not, nor (trigger narrowed at merge) a "data.csv" download next to
// an unrelated line split.
// Takes the notebook path as argv[2]; resolves everything else from the repo root (process.cwd()). No model calls.
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
const { bootNotebook } = await import(pathToFileURL(join(process.cwd(), "tools/robocoop-5/lib/notebook-boot.mjs")).href);
const NB = resolve(process.argv[2] ?? join(process.cwd(), "lopebooks/notebooks/@tomlarkworthy_robocoop-5.html"));
const { page, close } = await bootNotebook({ notebookPath: NB, layout: "R100(S75(@tomlarkworthy/robocoop-5),S25(@tomlarkworthy/robocoop-5-srctools))" });
const SPLIT = 'const _rows = function _rows(FileAttachment){return(\nFileAttachment("a.csv").text().then(t => t.trim().split("\\n").map(l => l.split(",")))\n)};\n';
const LINES = 'const _rows = function _rows(FileAttachment){return(\nFileAttachment("a.csv").text().then(t => t.split(/\\r?\\n/).map(parseCsvRow))\n)};\n';
const PARSE = 'const _rows = function _rows(FileAttachment, d3){return(\nFileAttachment("a.csv").text().then(t => d3.csvParse(t))\n)};\n';
const DEFINE = (deps) => 'export default function define(runtime, observer) {\n  const main = runtime.module();\n  main.variable(observer("rows")).define("rows", ' + deps + ', _rows);\n  return main;\n}\n';
const FP = 'const _rows = function _rows(FileAttachment){return(\nFileAttachment("notes.txt").text().then(t => [DOM.download(new Blob([t]), "data.csv"),\n  t.split("\\n").length])\n)};\n';
const out = await page.evaluate(async ({ SPLIT, PARSE, LINES, FP, DEFS }) => {
  const H = window.__nbHelpers;
  ["toolsView", "hostSetup", "wiki_index"].forEach(n => H.force(n)); await new Promise(r => setTimeout(r, 1500));
  const t0 = Date.now();
  while (Date.now() - t0 < 25000 && !(H.byName("toolsView")?.value?.length >= 10)) await new Promise(r => setTimeout(r, 300));
  const byId = new Map(H.byName("toolsView").value.map(t => [t.id, t]));
  const ctx = { sessionState: {} };
  const run = async (id, args, c = ctx) => String((await byId.get(id).execute(args, c))?.output ?? "");
  const doc = "/content/@tomlarkworthy/markdown-wiki/reading-csv-and-delimited-text.md";
  const fp = await run("write_file", { file_path: "/src/@probe/csvfp.js", content: FP + DEFS[1] });
  const parse = await run("write_file", { file_path: "/src/@probe/csvparse.js", content: PARSE + DEFS[0] });
  const split = await run("write_file", { file_path: "/src/@probe/csvsplit.js", content: SPLIT + DEFS[1] });
  const lines = await run("write_file", { file_path: "/src/@probe/csvlines.js", content: LINES + DEFS[1] });
  const read = await run("read_file", { file_path: doc, limit: 3 });
  const again = await run("write_file", { file_path: "/src/@probe/csvsplit.js", content: SPLIT + DEFS[1] });
  return { fp: fp.slice(0, 80), parse: parse.slice(0, 80), split: split.slice(0, 160), lines: lines.slice(0, 160), read: read.slice(0, 60), again: again.slice(0, 80) };
}, { SPLIT: SPLIT, PARSE: PARSE, LINES: LINES, FP: FP, DEFS: [DEFINE('["FileAttachment", "d3"]'), DEFINE('["FileAttachment"]')] });
console.log(JSON.stringify(out, null, 1));
const pass = !/^REFUSED/.test(out.fp) && !/^REFUSED/.test(out.parse) && /^REFUSED[\s\S]*reading-csv-and-delimited-text/.test(out.split) && /^REFUSED[\s\S]*reading-csv-and-delimited-text/.test(out.lines) && !/^REFUSED/.test(out.again);
console.log(pass ? "PASS" : "FAIL");
await close();
process.exit(pass ? 0 : 1);
