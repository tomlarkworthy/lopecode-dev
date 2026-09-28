// rc5-train m34 probe: a correct write must not report the runtime's variable_stale sentinel as a cell error.
// node probe.mjs <notebook.html>   (run from the repo root). Drives the m34 eval's scripted oracles, no model.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
const nb = process.argv[2];
const EVAL = "tools/scratch/rc5-train/20260928-0847/m34/eval.mjs";
let fails = 0;
for (const neg of ["", "shim"]) {
  const out = `tools/scratch/rc5-train/20260928-0847/m34/probe-${neg || "direct"}.json`;
  execFileSync("node", ["tools/robocoop-5/eval/run.mjs", "--evals-file", EVAL, "--only", "rc5t-upstream-lib-update", "--oracle", "--json", out, "--notebook", nb],
    { env: { ...process.env, M34_NEG: neg }, stdio: "ignore", timeout: 600000 });
  const conv = JSON.parse(readFileSync(out, "utf8")).evals[0].transcript.conversation;
  const res = conv.filter(m => m.role === "tool" && /^Wrote /.test(String(m.content))).map(m => String(m.content)).join("\n");
  const ok = /✓ all \d+ cells compute/.test(res) && !/variable_stale/.test(res);
  if (!ok) fails++;
  console.log((ok ? "PASS " : "FAIL ") + (neg || "direct") + ": " + res.slice(0, 220).replace(/\n/g, " "));
}
process.exit(fails ? 1 : 0);
