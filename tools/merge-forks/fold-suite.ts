// Folds a suite module's cells into the module it tests, so the tests ship as part of that module.
// Cells and import variables are located with acorn; nothing is matched by regex.
//   - suite cells go before the host's --before pid (default: after the host's last cell)
//   - suite imports of the host itself are dropped (the names are local now)
//   - a suite import whose name the host already imports must be the identical definition
//   - any other name or pid the host already has is an error
// The suite block is removed from the notebook and from bootconf mains.
//
// run: bun tools/merge-forks/fold-suite.ts <notebook.html> --host <id> --suite <id> [--suite-js <file>] [--before <pid>] [--out <html>]
import { readFileSync } from "node:fs";
import * as acorn from "acorn";
import { blocks, blockContent, findSpan, guardedWrite } from "../lib/notebook-blocks.ts";
import { analyse } from "./define-body.ts";

const args = process.argv.slice(2);
const opt = (flag: string) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : undefined; };
const notebook = args[0];
const host = opt("--host")!, suite = opt("--suite")!, out = opt("--out") ?? notebook;
if (!notebook || !host || !suite) throw new Error("usage: fold-suite.ts <notebook.html> --host <id> --suite <id>");

const prev = readFileSync(notebook, "utf8");
const hostSrc = blockContent(prev, host);
const suiteSrc = opt("--suite-js") ? readFileSync(opt("--suite-js")!, "utf8").replace(/\n$/, "") : blockContent(prev, suite);
if (hostSrc == null) throw new Error(`${notebook} has no block ${host}`);
if (suiteSrc == null) throw new Error(`no source for ${suite}`);


const h = analyse(hostSrc), s = analyse(suiteSrc);
const hostNames = new Map(h.stmts.filter((x) => x.kind === "cell" || x.kind === "import").map((x) => [x.name, x]));
const hostPids = new Set(h.stmts.filter((x) => x.kind === "cell").map((x) => x.pid));
const hostModules = new Set(h.stmts.filter((x) => x.kind === "module").map((x) => x.name));

const addModules: string[] = [], addImports: string[] = [], addCells: string[] = [], addConsts: string[] = [];
const report: string[] = [];
for (const st of s.stmts) {
  if (st.kind === "import") {
    if (st.module === `module ${host}`) { report.push(`dropped import ${st.name} (local in ${host})`); continue; }
    const existing = hostNames.get(st.name);
    if (existing) {
      if (existing.kind !== "import" || existing.text.trim() !== st.text.trim()) throw new Error(`${st.name}: host defines it differently:\n  host  ${existing.text}\n  suite ${st.text}`);
      report.push(`kept host import ${st.name}`);
      continue;
    }
    addImports.push(st.text);
  } else if (st.kind === "module") {
    if (st.name === `module ${host}` || hostModules.has(st.name!)) continue;
    addModules.push(st.text);
  } else if (st.kind === "cell") {
    if (st.name && hostNames.has(st.name)) throw new Error(`host already has a cell named ${st.name}`);
    if (hostPids.has(st.pid)) throw new Error(`host already has pid ${st.pid}`);
    const fn = s.stmts && (s.consts.get(st.pid!) ?? null);
    if (!fn) throw new Error(`suite has no const ${st.pid}`);
    addCells.push(st.text);
    addConsts.push(fn.text);
  }
}

// Splice into the host from the end backwards so earlier offsets stay valid.
const edits: { at: number; text: string }[] = [];
const hCells = h.stmts.filter((x) => x.kind === "cell");
const before = opt("--before");
const anchorCell = before ? hCells.find((x) => x.pid === before) : undefined;
if (before && !anchorCell) throw new Error(`host has no cell with pid ${before}`);
const anchorConst = before ? h.consts.get(before)! : undefined;
edits.push({ at: anchorConst ? anchorConst.start : h.exportStart, text: addConsts.join("\n") + "\n" });
edits.push(anchorCell ? { at: anchorCell.start, text: addCells.join("\n  ") + "\n  " } : { at: hCells.at(-1)!.end, text: "\n  " + addCells.join("\n  ") });
const lastModule = h.stmts.filter((x) => x.kind === "module").at(-1);
if (addModules.length) edits.push({ at: lastModule!.end, text: "\n  " + addModules.join("\n  ") });
const lastImport = h.stmts.filter((x) => x.kind === "import").at(-1);
if (addImports.length) edits.push({ at: lastImport!.end, text: "\n  " + addImports.join("\n  ") });
let merged = hostSrc;
for (const e of edits.sort((a, b) => b.at - a.at)) merged = merged.slice(0, e.at) + e.text + merged.slice(e.at);
acorn.parse(merged, { ecmaVersion: "latest", sourceType: "module" });

let html = prev;
const hostBlock = blocks(html).find((b) => b.id === host)!;
const hostRaw = html.slice(hostBlock.start, hostBlock.end);
const newHost = hostRaw.slice(0, hostRaw.indexOf(">") + 1) + "\n" + merged + "\n</script>";
html = html.slice(0, hostBlock.start) + newHost + html.slice(hostBlock.end);
const suiteSpan = findSpan(html, suite);
if (suiteSpan) html = html.slice(0, suiteSpan.start).replace(/\n$/, "") + html.slice(suiteSpan.end);
const conf = findSpan(html, "bootconf.json")!;
const bootconf = JSON.parse(blockContent(html, "bootconf.json")!);
bootconf.mains = bootconf.mains.filter((m: string) => m !== suite);
const confRaw = html.slice(conf.start, conf.end);
html = html.slice(0, conf.start) + confRaw.slice(0, confRaw.indexOf(">") + 1) + "\n" + JSON.stringify(bootconf, null, 2) + "\n</script>" + html.slice(conf.end);

guardedWrite(out, prev, html, "", "fold-suite", [suite]);
console.log([...report, `added ${addCells.length} cells, ${addImports.length} imports, ${addModules.length} module defines to ${host}`, `removed ${suite}; mains ${JSON.stringify(bootconf.mains)}`, `wrote ${out}`].join("\n"));
