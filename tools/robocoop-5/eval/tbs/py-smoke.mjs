// Proves run_python end to end through the notebook's REAL tool registry, no model: a host directory is
// faked in as window.showDirectoryPicker()'s result and mounted, then six run_python calls are driven in
// oracle mode — numpy reading /local-disk and writing back, pandas via `packages`, a raising script, and
// the worker's time budget (a 4 s sleep that leaves the page live, then a `while True` that is killed and
// restarted). The host directory is checked for what Python wrote.
//
//   node py-smoke.mjs [--notebook path]

import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { createDriver } from "../driver.mjs";
import { here } from "./tasks.mjs";

const args = process.argv.slice(2);
const flag = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const notebook = resolve(flag("--notebook", join(here, "..", "robocoop-5-eval-bigcap-py.html"))); // the driver builds file:// from it verbatim

const COLS = 20, ROWS = 5;
const root = mkdtempSync(join(tmpdir(), "tbs-py-smoke-"));
mkdirSync(join(root, "data"), { recursive: true });
const header = Array.from({ length: COLS }, (_, c) => "c" + c).join(",");
const rows = Array.from({ length: ROWS }, (_, r) => Array.from({ length: COLS }, (_, c) => (r * COLS + c)).join(","));
writeFileSync(join(root, "data", "wide.csv"), header + "\n" + rows.join("\n") + "\n");
// column c means (r*COLS+c averaged over r) = c + COLS*(ROWS-1)/2
const expectedMeans = Array.from({ length: COLS }, (_, c) => c + (COLS * (ROWS - 1)) / 2);

const NUMPY = `import numpy as np, json, os
a = np.loadtxt("/local-disk/data/wide.csv", delimiter=",", skiprows=1)
m = a.mean(axis=0)
print("shape", a.shape)
print("means", ",".join("%.1f" % v for v in m))
os.makedirs("/local-disk/out", exist_ok=True)
with open("/local-disk/out/means.json", "w") as f:
    json.dump({"means": [float(v) for v in m]}, f)
`;
const PANDAS = `import pandas as pd
df = pd.read_csv("/local-disk/data/wide.csv")
df.shape`;
const BOOM = `def f():
    raise ValueError("boom")
f()`;
const SLEEP = `import time; time.sleep(4); "slept"`;
const SPIN = `while True: pass`;

const driver = await createDriver({ notebookPath: notebook, apiKey: "oracle", model: "oracle", timeoutMs: 300000, oracle: true });
let r;
try {
  r = await driver.runQuestion({
    id: "py-smoke",
    question: "python smoke",
    setup: { localDisk: { root, name: "scientist" } },
    oracle: [
      { tool: "run_python", args: { code: NUMPY } },
      { tool: "run_python", args: { code: PANDAS, packages: ["pandas"] } },
      { tool: "run_python", args: { code: BOOM, disk: false } },
      // The page must stay live while python sleeps: the tool call after it is a plain 1+1, and the pair
      // is timed — a main-thread run would serialise them the same way, so what this proves is that the
      // second call still lands and the runtime kept dispatching across the 4 s.
      { tool: "run_python", args: { code: SLEEP, disk: false, timeout_ms: 20000 } },
      { tool: "run_python", args: { code: "1+1", disk: false } },
      // Uninterruptible spin: only terminate() gets out of it.
      { tool: "run_python", args: { code: SPIN, disk: false, timeout_ms: 5000 } },
      { tool: "run_python", args: { code: "2+2", disk: false } },
    ],
  });
} finally { await driver.close(); }

const outs = (r.conversation || []).filter((m) => m.role === "tool").map((m) => String(m.content));
const checks = [];
const check = (name, ok, detail) => { checks.push({ name, ok }); console.log(`${ok ? "ok  " : "FAIL"} ${name}${detail ? "  " + detail : ""}`); };
const ms = (s) => (String(s).match(/\((\d+) ms\)/) || [, "?"])[1];

check("run", !r.error, r.error);
const [numpyOut = "", pandasOut = "", boomOut = "", sleepOut = "", afterSleepOut = "", spinOut = "", afterSpinOut = ""] = outs;
const msn = (s) => Number(ms(s)) || 0;
console.log(`step ms: numpy=${ms(numpyOut)} pandas=${ms(pandasOut)} raise=${ms(boomOut)} sleep=${ms(sleepOut)} after-sleep=${ms(afterSleepOut)} spin=${ms(spinOut)} after-spin=${ms(afterSpinOut)}`);

const meansLine = "means " + expectedMeans.map((v) => v.toFixed(1)).join(",");
check("numpy read /local-disk and printed the means", numpyOut.includes(meansLine), (numpyOut.split("\n").find((l) => l.startsWith("means")) || numpyOut.slice(0, 160)));
check("numpy reported the write-back", /wrote: \/local-disk\/out\/means\.json \(\d+ bytes\)/.test(numpyOut), numpyOut.split("\n").filter((l) => l.startsWith("wrote:")).join(" | "));
const hostMeans = join(root, "out", "means.json");
let parsed = null;
try { parsed = JSON.parse(readFileSync(hostMeans, "utf8")); } catch (e) {}
check("means.json is on the host and valid JSON", existsSync(hostMeans) && Array.isArray(parsed?.means) && parsed.means.length === COLS && Math.abs(parsed.means[0] - expectedMeans[0]) < 1e-9, existsSync(hostMeans) ? readFileSync(hostMeans, "utf8").slice(0, 100) : "missing");
check("pandas returned df.shape (5, 20)", /result:\s*[\[(]\s*5\s*,\s*20\s*[\])]/.test(pandasOut), (pandasOut.split("\n").find((l) => l.startsWith("result:")) || pandasOut.slice(0, 160)));
check("a raising script reports the traceback", /ERROR \(python\)/.test(boomOut) && /boom/.test(boomOut), boomOut.split("\n").slice(0, 3).join(" | ").slice(0, 200));

// --- worker time budget
const sleepPair = msn(sleepOut) + msn(afterSleepOut);
check("a 4 s sleep under a 20 s budget succeeds", /result:\s*slept/.test(sleepOut), sleepOut.split("\n").slice(0, 2).join(" | ").slice(0, 200));
check("the call right after it still lands, and the pair spans the sleep", /result:\s*2\b/.test(afterSleepOut) && sleepPair >= 4000, `pair=${sleepPair} ms, after=${(afterSleepOut.split("\n").find((l) => l.startsWith("result:")) || "").slice(0, 60)}`);
check("an unbounded spin is killed at its budget", /killed and restarted/.test(spinOut) && msn(spinOut) < 12000, `${msn(spinOut)} ms: ${(spinOut.split("\n").find((l) => /exceeded/.test(l)) || spinOut.slice(0, 160)).slice(0, 200)}`);
check("python is usable again after the kill", /result:\s*4\b/.test(afterSpinOut), (afterSpinOut.split("\n").find((l) => l.startsWith("result:")) || afterSpinOut.slice(0, 160)));

console.log("host root:", root);
const failed = checks.filter((c) => !c.ok).length;
if (failed) { console.log("tool outputs:"); outs.forEach((o, i) => console.log(`--- step ${i + 1}\n${o.slice(0, 900)}`)); }
else rmSync(root, { recursive: true, force: true });
process.exit(failed ? 1 : 0);
