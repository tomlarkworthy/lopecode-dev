// Does an agent-written /src/@user module survive a turn boundary? Turn 1 writes one through the real
// write_file tool; the driver's file snapshot must carry it, and turn 2 (a fresh page, seeded from
// that snapshot the way run-agent's warmSeeds does) must be able to glob and read it.
// Arm k (2026-09-03): 4 of 5 continuation turns opened with the module gone.
import { resolve, join } from "node:path";
import { createDriver } from "../driver.mjs";
import { here } from "./tasks.mjs";
import { warmSeeds, stockModuleIdsOf } from "./warm-seeds.mjs";
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";

const args = process.argv.slice(2);
const flag = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const notebook = resolve(flag("--notebook", join(here, "..", "robocoop-5-eval-bigcap-df3.html")));
const src = `export default function define(runtime, observer) {
  const main = runtime.module();
  main.variable(observer("answer")).define("answer", [], () => 42);
  return main;
}`;
const stock = stockModuleIdsOf(readFileSync(notebook, "utf8"));
const root = mkdtempSync(join(tmpdir(), "tbs-persist-")); mkdirSync(join(root, "data")); writeFileSync(join(root, "data", "a.txt"), "hello\n");
const driver = await createDriver({ notebookPath: notebook, apiKey: "oracle", model: "oracle", timeoutMs: 60000, oracle: true });
let r1, r2, warm = {};
try {
  r1 = await driver.runQuestion({ id: "t1", question: "t1", setup: { localDisk: { root, name: "s" } }, oracle: [
    { tool: "write_file", args: { file_path: "/src/@user/persist.js", content: src } },
    { tool: "glob", args: { pattern: "/src/@user/*.js" } },
  ] });
  // exactly run-agent's continuation seeding, against the bundle's stock ids
  warm = warmSeeds({}, r1, stock);
  warm["/src/@user/broken.js"] = "const nope = 1; // not a module: no export default";
  r2 = await driver.runQuestion({ id: "t2", question: "t2", setup: { files: warm, localDisk: { root, name: "s" } }, oracle: [
    { tool: "read_file", args: { file_path: "/local-disk/data/a.txt" } },
    { tool: "glob", args: { pattern: "/src/@user/*.js" } },
    { tool: "inspect_value", args: { module: "@user/persist", cell: "answer" } },
  ] });
} finally { await driver.close(); rmSync(root, { recursive: true, force: true }); }
const outs = (r) => (r.conversation || []).filter((m) => m.role === "tool").map((m) => String(m.content));
const o1 = outs(r1), o2 = outs(r2);
const checks = [
  ["turn 1 glob sees the module", /persist\.js/.test(o1[1] || "")],
  ["snapshot.files carries /src/@user/persist.js", typeof (r1.files || {})["/src/@user/persist.js"] === "string"],
  ["turn 2 still mounts /local-disk after the warm seeds (no error)", !r2.error && /hello/.test(o2[0] || "")],
  ["turn 2 glob sees the re-seeded module", /persist\.js/.test(o2[1] || "")],
  ["warm seeds carry no runtime module (builtin, d/...)", !Object.keys(warm).some((k) => /^\/src\/(builtin|d\/)/.test(k))],
  ["a broken seed does not sink the turn and is reported", Array.isArray(r2.seedFailures) && r2.seedFailures.length === 1 && /broken\.js/.test(r2.seedFailures[0])],
];
let failed = 0; for (const [n, ok] of checks) { console.log(`${ok ? "ok  " : "FAIL"} ${n}`); if (!ok) failed++; }
if (failed) console.log("r2.seedFailures:", JSON.stringify(r2.seedFailures), "r1.error:", r1.error, "\nr1 src keys:", Object.keys(r1.files || {}).filter((k) => k.startsWith("/src/@user")), "\nr2.error:", r2 && r2.error, "\no2:", o2.map((x) => x.slice(0, 160)));
process.exit(failed ? 1 : 0);
