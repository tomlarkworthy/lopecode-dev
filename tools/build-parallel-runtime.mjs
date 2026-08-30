// Assemble notebooks/@tomlarkworthy_parallel-runtime.html from the blank-notebook
// frame + userspace module + bootloader engine patch + scoped bootconf flag.
import fs from "node:fs";
const NAME = "@tomlarkworthy/parallel-runtime";
const OUT = "notebooks/@tomlarkworthy_parallel-runtime.html";
let h = fs.readFileSync("lopecode/notebooks/quick_start.html", "utf8");
const mod = fs.readFileSync("modules/@tomlarkworthy/parallel-runtime.js", "utf8");
const patch = fs.readFileSync("tools/parallel-runtime-patch.js", "utf8");
const CT = "</" + "script>";
if (mod.includes("<" + "/script") || patch.includes("<" + "/script")) throw new Error("literal close tag");

const b = h.indexOf('<script id="@tomlarkworthy/blank-notebook"');
const bt = h.indexOf(">", b), be = h.indexOf(CT, bt);
h = h.slice(0, bt + 1) + "\n" + mod + "\n" + h.slice(be);
h = h.split("@tomlarkworthy/blank-notebook").join(NAME);

const bb = h.indexOf('<script id="@tomlarkworthy/bootloader"');
const anchor = "\n  if (conf.hash && !location.hash) {";
const ai = h.indexOf(anchor, bb);
if (ai < 0 || ai > h.indexOf(CT, bb)) throw new Error("anchor1 not found");
h = h.slice(0, ai) + "\n" + patch + h.slice(ai);

const anchor2 = "const ojs_module = __ojs_runtime.module(module.default, observer);";
const a2 = h.indexOf(anchor2, bb);
if (a2 < 0) throw new Error("anchor2 not found");
h = h.slice(0, a2) +
  "if (window.__ojs_parallel) window.__ojs_parallel.nextMain = name;\n    " +
  anchor2 +
  "\n    if (window.__ojs_parallel) window.__ojs_parallel.nextMain = null;" +
  h.slice(a2 + anchor2.length);

let i = -1, patched = false;
while ((i = h.indexOf('<script id="bootconf.json"', i + 1)) >= 0) {
  const t = h.indexOf(">", i), e = h.indexOf(CT, t);
  try {
    const conf = JSON.parse(h.slice(t + 1, e));
    conf.parallel = [NAME];
    h = h.slice(0, t + 1) + "\n" + JSON.stringify(conf, null, 2) + "\n" + h.slice(e);
    patched = true;
    break;
  } catch {}
}
if (!patched) throw new Error("no parseable bootconf");
h = h.replace("<title>Blank Notebook</title>", "<title>Parallel Runtime - automatic worker offload</title>");
fs.writeFileSync(OUT, h);
// QA copy with debugger stripped
fs.writeFileSync("/tmp/parallel-runtime-qa-copy.html", h.split("debugger;").join("void 0;"));
const t2 = h.indexOf(">", h.indexOf('<script id="@tomlarkworthy/bootloader"'));
fs.writeFileSync("/tmp/bootcheck.mjs", h.slice(t2 + 1, h.indexOf(CT, t2)));
console.log("wrote", OUT, h.length, "bytes + QA copy");
