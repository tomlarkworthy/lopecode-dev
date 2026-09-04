// Proves the /local-disk mount end to end through the notebook's REAL tool registry, no model:
// a host directory is faked in as window.showDirectoryPicker()'s result, mounted through
// rc5_host.mount, then read_file / glob / write_file / attach_file(path) / a cell using localDisk
// are driven in oracle mode and the host directory is checked for what the agent wrote.
//
//   node mount-smoke.mjs [--notebook path]

import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { createDriver } from "../driver.mjs";
import { here } from "./tasks.mjs";

const args = process.argv.slice(2);
const flag = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const notebook = resolve(flag("--notebook", join(here, "..", "robocoop-5-eval-bigcap.html"))); // the driver builds file:// from it verbatim

const root = mkdtempSync(join(tmpdir(), "tbs-mount-smoke-"));
mkdirSync(join(root, "data"), { recursive: true });
const wide = "id," + Array.from({ length: 600 }, (_, i) => "c" + i).join(",") + "\n" + "1," + Array.from({ length: 600 }, (_, i) => (i * 1.5).toFixed(3)).join(",") + "\n";
writeFileSync(join(root, "data", "wide.csv"), wide);
const bin = Buffer.alloc(4096); for (let i = 0; i < bin.length; i++) bin[i] = (i * 7 + 13) % 256;
writeFileSync(join(root, "data", "blob.bin"), bin);

const MODULE = `const _size = async function size(localDisk){ return (await localDisk.readText("/local-disk/data/wide.csv")).length; };
const _written = async function written(localDisk, size){ return await localDisk.write("/local-disk/out/from-cell.txt", "cell read " + size + " chars"); };
export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;
  $def("_size", "size", ["localDisk"], _size);
  $def("_written", "written", ["localDisk", "size"], _written);
  main.define("module @tomlarkworthy/local-disk", async () => runtime.module((await import("@tomlarkworthy/local-disk")).default));
  main.define("localDisk", ["module @tomlarkworthy/local-disk", "@variable"], (_, v) => v.import("localDisk", _));
  return main;
}
`;

const driver = await createDriver({ notebookPath: notebook, apiKey: "oracle", model: "oracle", timeoutMs: 120000, oracle: true });
let r;
try {
  r = await driver.runQuestion({
    id: "mount-smoke",
    question: "mount smoke",
    setup: { localDisk: { root, name: "scientist" } },
    oracle: [
      { tool: "read_file", args: { file_path: "/local-disk/data/wide.csv" } },
      { tool: "glob", args: { pattern: "/local-disk/**" } },
      { tool: "write_file", args: { file_path: "/local-disk/out/result.json", content: '{"answer": 42}\n' } },
      { tool: "write_file", args: { file_path: "/src/@user/smoke.js", content: MODULE }, settleMs: 1500 },
      { tool: "attach_file", args: { module: "@user/smoke", name: "blob.bin", path: "/local-disk/data/blob.bin" } },
      { tool: "inspect_value", args: { module: "@user/smoke", name: "written" } },
      { tool: "inspect_value", args: { module: "@user/smoke", name: "size" } },
      { tool: "eval_js", args: { module: "@user/smoke", code: "return (await localDisk.readText('/local-disk/data/wide.csv')).length" } },
    ],
  });
} finally { await driver.close(); }

const outs = (r.conversation || []).filter((m) => m.role === "tool").map((m) => String(m.content));
const calls = (r.conversation || []).filter((m) => m.tool_calls).map((m) => m.tool_calls[0].function.name);
const checks = [];
const check = (name, ok, detail) => { checks.push({ name, ok }); console.log(`${ok ? "ok  " : "FAIL"} ${name}${detail ? "  " + detail : ""}`); };
const out = (tool) => outs[calls.indexOf(tool)] ?? "";
// read_file numbers lines and truncates any over 2000 chars — the wide row is expected to be cut.
check("run", !r.error, r.error);
check("read_file sees the wide csv", /^\s*1\tid,c0,c1,/.test(out("read_file")), out("read_file").slice(0, 120).replace(/\n/g, "\\n"));
check("glob lists the disk", /\/local-disk\/data\/wide\.csv/.test(out("glob")) && /blob\.bin/.test(out("glob")), out("glob").slice(0, 160).replace(/\n/g, "\\n"));
check("write_file lands on the host", existsSync(join(root, "out", "result.json")) && readFileSync(join(root, "out", "result.json"), "utf8").includes("42"), out("write_file").slice(0, 120));
check("attach_file(path) accepts a binary", /blob\.bin/.test(out("attach_file")) && !/error|not UTF-8|fail/i.test(out("attach_file")), out("attach_file").slice(0, 160).replace(/\n/g, "\\n"));
const cellOut = join(root, "out", "from-cell.txt");
check("a cell can read and write the disk", existsSync(cellOut) && readFileSync(cellOut, "utf8") === "cell read " + wide.length + " chars", existsSync(cellOut) ? readFileSync(cellOut, "utf8") : outs[calls.lastIndexOf("inspect_value")]?.slice(0, 200));
check("eval_js sees localDisk with no import", new RegExp("^" + wide.length + "$").test(out("eval_js").trim()), out("eval_js").slice(0, 120));
console.log("host root:", root);
const failed = checks.filter((c) => !c.ok).length;
if (failed) { console.log("tool outputs:"); calls.forEach((c, i) => console.log(`--- ${c}\n${String(outs[i]).slice(0, 600)}`)); }
else rmSync(root, { recursive: true, force: true });
process.exit(failed ? 1 : 0);
