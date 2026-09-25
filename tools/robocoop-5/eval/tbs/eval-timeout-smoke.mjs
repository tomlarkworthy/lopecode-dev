// df27: eval_js honours an optional `timeout_s` (default 60, cap 600). Oracle mode, no model calls.
//   node tbs/eval-timeout-smoke.mjs --notebook robocoop-5-eval-bigcap-df27.html
import { join, resolve } from "node:path";
import { createDriver } from "../driver.mjs";
import { here } from "./tasks.mjs";
import { MODULE_ATTEST } from "./attest-fixture.mjs";

const args = process.argv.slice(2);
const flag = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const notebook = resolve(flag("--notebook", join(here, "..", "robocoop-5-eval-bigcap-df27.html")));
const M = "@test/attest", PATH = "/src/@test/attest.js";
const busy = (s) => `const t0 = Date.now(); while (Date.now() - t0 < ${s * 1000}) {} return 'busy ' + Math.round((Date.now() - t0) / 1000) + 's';`;
const sleepy = (s) => `await new Promise(r => setTimeout(r, ${s * 1000})); return 'slept ${s}s';`;
const ev = (code, timeout_s) => ({ tool: "eval_js", args: { module: M, code, ...(timeout_s ? { timeout_s } : {}) } });

const checks = [];
const check = (name, ok, detail) => { checks.push(ok); console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? "\n       " + String(detail).slice(0, 200) : ""}`); };
const driver = await createDriver({ notebookPath: notebook, apiKey: "oracle", model: "oracle", timeoutMs: 400000, oracle: true });
try {
  const r = await driver.runQuestion({
    id: "eval-timeout", question: "eval timeout",
    setup: { files: { [PATH]: MODULE_ATTEST } },
    oracle: [ev(busy(2)), ev(sleepy(4), 2), ev(busy(65), 90), ev("return 'cap ' + (typeof timeout_s)", 5000)],
  });
  const outs = (r.conversation || []).filter((m) => m.role === "tool").map((m) => String(m.content));
  check("default: 2 s snippet returns", /busy 2s/.test(outs[0]), outs[0]);
  check("timeout_s=2: a 4 s await times out at 2 s (a sync busy loop cannot be interrupted: the page is single-threaded)", /timed out after 2s/.test(outs[1]), outs[1]);
  check("timeout_s=90: 65 s snippet completes past the old 60 s cap", /busy 65s/.test(outs[2]), outs[2]);
  check("timeout_s=5000 is accepted (capped at 600 by the tool)", /cap /.test(outs[3]), outs[3]);
} finally { await driver.close(); }
console.log(`${checks.every(Boolean) ? "PASS" : "FAIL"} eval-timeout-smoke: ${checks.filter(Boolean).length}/${checks.length}`);
