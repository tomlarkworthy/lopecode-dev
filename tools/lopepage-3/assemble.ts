// Assembles lopebooks/notebooks/@tomlarkworthy_lopepage-3.html, the notebook for the notebook-kit
// editing system (plan/notebook-kit-editing-system.md, M4). The forks are unpublished, so this is
// built locally rather than jumpgated.
//
//   donor: @tomlarkworthy_notebook-kit.html (already embeds js-toolchain with its runtime attachment,
//          dataflow-templating, runtime-sdk, inspector, codemirror, observablejs-toolchain)
//   remove: lopepage-2, editor-5 (+ cell_options.json), visualizer. Module discovery instantiates
//          every module block, so a leftover block would boot a second frame.
//   insert: cell-map-2 from its canonical; js-toolchain, exporter-4, save-in-place-2, visualizer-2,
//          editor-6, lopepage-3, notebook-kit-demo from their working copies. js-toolchain replaces the
//          donor's copy (defineCell reuses an exported head; one display-state registry per page).
//
// run: bun tools/lopepage-3/assemble.ts [--overwrite]
import { blocks, findSpan, rawBlock } from "../lib/notebook-blocks.ts";
import { readFileSync, writeFileSync, copyFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

const DONOR = "lopebooks/notebooks/@tomlarkworthy_notebook-kit.html";
const OUT = "lopebooks/notebooks/@tomlarkworthy_lopepage-3.html";
const REMOVE = /^@tomlarkworthy\/(lopepage-2|editor-5|visualizer)(\/|$)/;
const INSERT: [string, string][] = [
  ["@tomlarkworthy/cell-map-2", "lopecode/notebooks/@tomlarkworthy_cell-map-2.html"],
  ["@tomlarkworthy/js-toolchain", "modules/@tomlarkworthy/js-toolchain.js"],
  ["@tomlarkworthy/exporter-4", "modules/@tomlarkworthy/exporter-4.js"],
  ["@tomlarkworthy/save-in-place-2", "modules/@tomlarkworthy/save-in-place-2.js"],
  ["@tomlarkworthy/visualizer-2", "modules/@tomlarkworthy/visualizer-2.js"],
  ["@tomlarkworthy/editor-6", "modules/@tomlarkworthy/editor-6.js"],
  ["@tomlarkworthy/lopepage-3", "modules/@tomlarkworthy/lopepage-3.js"],
  ["@tomlarkworthy/notebook-kit-demo", "modules/@tomlarkworthy/notebook-kit-demo.js"]
];
const MAINS = ["@tomlarkworthy/notebook-kit-demo", "@tomlarkworthy/lopepage-3", "@tomlarkworthy/js-toolchain", "@tomlarkworthy/module-selection", "@tomlarkworthy/save-in-place-2"];
const HASH = "#view=S100(@tomlarkworthy/notebook-kit-demo)";

if (existsSync(OUT) && !process.argv.includes("--overwrite")) {
  console.error(`${OUT} exists; pass --overwrite to rebuild it`);
  process.exit(1);
}
copyFileSync(DONOR, OUT);
let html = readFileSync(OUT, "utf8");

// editor-6 keeps editor-5's cell_options.json under its own id
const options = rawBlock(html, "@tomlarkworthy/editor-5/cell_options.json");
if (!options) throw new Error("donor has no @tomlarkworthy/editor-5/cell_options.json");

const removed = blocks(html).filter((b) => REMOVE.test(b.id)).sort((a, b) => b.start - a.start);
for (const b of removed) {
  const end = html[b.end] === "\n" ? b.end + 1 : b.end;
  html = html.slice(0, b.start) + html.slice(end);
}
console.log(`removed ${removed.map((b) => b.id).join(", ")}`);

const boot = blocks(html).filter((b) => b.id === "bootconf.json");
if (boot.length !== 1) throw new Error(`expected one bootconf.json block, found ${boot.length}`);
const conf = JSON.parse(boot[0].content);
const confText = `\n{\n  "mains": ${JSON.stringify(MAINS)},\n  "hash": ${JSON.stringify(HASH)},\n  "headless": ${JSON.stringify(conf.headless ?? true)}\n}\n`;
const rawBoot = html.slice(boot[0].start, boot[0].end);
if (rawBoot.split(boot[0].content).length !== 2) throw new Error("bootconf content is not unique inside its block");
html = html.slice(0, boot[0].start) + rawBoot.replace(boot[0].content, confText) + html.slice(boot[0].end);
writeFileSync(OUT, html);
console.log(`bootconf mains ${JSON.stringify(MAINS)}, hash ${HASH}`);

for (const [id, source] of INSERT) {
  const r = spawnSync("bun", ["tools/channel/sync-module.ts", "--module", id, "--source", source, "--target", OUT, "--insert-ok"], { encoding: "utf8" });
  process.stdout.write(r.stdout);
  if (r.status !== 0) {
    process.stderr.write(r.stderr);
    throw new Error(`sync-module failed for ${id}`);
  }
}

html = readFileSync(OUT, "utf8");
const editor = findSpan(html, "@tomlarkworthy/editor-6");
if (!editor) throw new Error("editor-6 block missing after insert");
const carried = options.replace('id="@tomlarkworthy/editor-5/cell_options.json"', 'id="@tomlarkworthy/editor-6/cell_options.json"');
if (carried === options) throw new Error("cell_options.json block id not rewritten");
html = html.slice(0, editor.start) + carried + "\n" + html.slice(editor.start);
writeFileSync(OUT, html);
console.log(`inserted @tomlarkworthy/editor-6/cell_options.json before the editor-6 block`);
console.log(`wrote ${OUT} (${(html.length / 1e6).toFixed(2)} MB)`);
