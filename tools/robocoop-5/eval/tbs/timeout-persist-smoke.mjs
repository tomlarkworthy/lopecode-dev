// The turn-boundary loss seen in arm k happened after turns that ENDED BY TIMEOUT. A real model
// writes a /src/@user module and is then kept busy past a short turn timeout; the snapshot taken
// after the timeout must still carry the module (it is what warmSeeds re-seeds).
import { resolve, join } from "node:path";
import { createDriver } from "../driver.mjs";
import { here } from "./tasks.mjs";
import { loadKey } from "./keyload.mjs";

const args = process.argv.slice(2);
const flag = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const notebook = resolve(flag("--notebook", join(here, "..", "robocoop-5-eval-bigcap-df3.html")));
const driver = await createDriver({ notebookPath: notebook, apiKey: loadKey(), model: flag("--model", "xiaomi/mimo-v2.5-pro"), timeoutMs: 90000 });
let r;
try {
  r = await driver.runQuestion({ id: "tp", question: "First, write_file /src/@user/persist.js containing a module with one cell `answer` = 42 (export default function define(runtime, observer) { const main = runtime.module(); main.variable(observer('answer')).define('answer', [], () => 42); return main; }). Then call eval_js with exactly this code, six separate times, one call per step: await new Promise(r => setTimeout(r, 50000)); return 'slept'. Do not call task_complete and do not stop before all six calls have returned." });
} finally { await driver.close(); }
const src = Object.keys(r.files || {}).filter((k) => k.startsWith("/src/@user/"));
const checks = [
  ["turn ended by the timeout", /timed out/.test(String(r.error))],
  ["module was written during the turn", (r.toolCalls || []).some((c) => c.name === "write_file" && /persist\.js/.test(JSON.stringify(c.arguments)))],
  ["post-timeout snapshot carries /src/@user/persist.js", src.includes("/src/@user/persist.js")],
];
let failed = 0; for (const [n, ok] of checks) { console.log(`${ok ? "ok  " : "FAIL"} ${n}`); if (!ok) failed++; }
console.log("steps", r.steps, "error", String(r.error).slice(0, 100), "filesError", r.filesError ?? null, "src", src.join(","));
process.exit(failed ? 1 : 0);
