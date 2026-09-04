// Proves page-init.mjs against the real tool registry in oracle mode: a removed tool is not callable
// and the others still are; the timer records the calls.
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { createDriver } from "../driver.mjs";
import { here } from "./tasks.mjs";
import { pageInit } from "./page-init.mjs";

const args = process.argv.slice(2);
const flag = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const notebook = resolve(flag("--notebook", join(here, "..", "robocoop-5-eval-bigcap-df.html")));
const root = mkdtempSync(join(tmpdir(), "tbs-init-smoke-"));
mkdirSync(join(root, "data")); writeFileSync(join(root, "data", "a.txt"), "hello\n");

const driver = await createDriver({ notebookPath: notebook, apiKey: "oracle", model: "oracle", timeoutMs: 120000, oracle: true });
let r;
try {
  r = await driver.runQuestion({ id: "init-smoke", question: "init smoke", setup: { localDisk: { root, name: "s" }, init: pageInit({ removeTools: ["run_python"] }) }, oracle: [
    { tool: "read_file", args: { file_path: "/local-disk/data/a.txt" } },
    // hostSetup re-publishing the registry must not bring a removed tool back or drop the timer
    { tool: "eval_js", args: { module: "@tomlarkworthy/robocoop-5-srctools", code: "let box = null; for (const m of globalThis.__ojs_runtime.mains.values()) { const rt = m && m._runtime; if (!rt) continue; for (const v of rt._variables) if (v._name === 'toolsView') { box = v._value; break; } if (box) break; } box.value = [...box.value, { id: 'run_python', name: 'run_python', execute: async () => 'back' }]; return 'has=' + box.value.map((t) => t.id).includes('run_python')" } },
    { tool: "read_file", args: { file_path: "/local-disk/data/a.txt" } },
    { tool: "eval_js", args: { module: "@tomlarkworthy/robocoop-5-srctools", code: "try { await py.run('1+1'); return 'py ran' } catch (e) { return 'py refused: ' + e.message }" } },
    { tool: "run_python", args: { code: "1+1" } },
  ] });
} finally { await driver.close(); rmSync(root, { recursive: true, force: true }); }
const outs = (r.conversation || []).filter((m) => m.role === "tool").map((m) => String(m.content));
const checks = [
  ["read_file still works", /hello/.test(outs[0] || "")],
  ["run_python is not registered", /tool not registered: run_python/.test(String(r.error))],
  ["re-published registry still lacks run_python", /has=false/.test(outs[1] || "")],
  ["tool timer recorded both reads (after the re-publish too)", Array.isArray(r.toolTimes) && r.toolTimes.filter((t) => t.name === "read_file").length === 2],
  ["eval_js's py is disabled with the tool", /py refused: Python is not available/.test(outs[3] || "")],
];
let failed = 0; for (const [n, ok] of checks) { console.log(`${ok ? "ok  " : "FAIL"} ${n}`); if (!ok) failed++; }
if (failed) console.log("error:", r.error, "\ntoolTimes:", JSON.stringify(r.toolTimes), "\nouts:", outs.map((o) => o.slice(0, 200)));
process.exit(failed ? 1 : 0);
