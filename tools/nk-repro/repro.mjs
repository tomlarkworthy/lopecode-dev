// Offline: does a module's FileAttachment survive the read, per runtime version and reader?
// An imported module as observablehq.com/api/import emits it, with notebook-kit's fileAttachments.
// Module sources are extracted from notebook HTML at run time (lope-reader), never copied.
//   node tools/nk-repro/repro.mjs            (from the repo root)
import {execSync} from "node:child_process";
import {mkdtempSync, writeFileSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
const dir = mkdtempSync(join(tmpdir(), "nk-repro-"));
const extract = (html, module, out) => {
  const src = execSync(`bun tools/lope-reader.ts ${html} --get-module ${module}`, {maxBuffer: 64 << 20}).toString();
  writeFileSync(join(dir, out), src);
  return join(dir, out);
};
// the exporter-3 that shipped its own capture, before it imported fileattachments
execSync(`git -C lopecode show b87dbcd:notebooks/@tomlarkworthy_exporter-3.html > ${join(dir, "ex3-old.html")}`);
import {fileAttachments} from "./node_modules/@observablehq/notebook-kit/dist/src/runtime/stdlib/fileAttachment.js";
const files = [{name: "x.js.gz", href: "https://static.example/x", mimeType: "application/gzip"}];
const readers = {
  "exporter-3 b87dbcd getFileAttachments": [extract(join(dir, "ex3-old.html"), "@tomlarkworthy/exporter-3", "ex3-old.js"), "getFileAttachments"],
  "fileattachments fileAttachmentEntries": [extract("lopecode/notebooks/@tomlarkworthy_fileattachments.html", "@tomlarkworthy/fileattachments", "fa.js"), "fileAttachmentEntries"],
};
for (const rtName of ["rt600", "rt610"]) {
  const {Runtime} = await import(new URL(`./node_modules/${rtName}/src/index.js`, import.meta.url));
  for (const [label, [path, cell]] of Object.entries(readers)) {
    const rt = new Runtime();
    const lib = rt.module();
    lib.builtin("FileAttachment", fileAttachments(files));
    const read = await rt.module((await import(path)).default).value(cell);
    const got = read(lib);
    const stored = lib._builtins.get("FileAttachment");
    console.log(`${rtName}  builtin stored as ${Array.isArray(stored) ? "array" : typeof stored}  ${label.padEnd(40)} -> ${got ? JSON.stringify([...got]) : String(got)}`);
    rt.dispose();
  }
}
process.exit(0);
