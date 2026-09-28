// rc5-train m20 probe: a write that deletes a test_* cell or a display cell must say so in its result.
// node probe.mjs <notebook.html>   (run from the repo root)
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
const nb = process.argv[2];
const EVAL = "tools/robocoop-5/eval/rc5t/tidy-unused-cells.mjs";
const want = { trace: /test_breakpoints is a TEST cell/, display: /_1tcoky6 \(anonymous\) <p>[^·]*categoryTable <form>[^·]*DISPLAYED output|categoryTable <form>[^·]*_1tcoky6 \(anonymous\) <p>[^·]*DISPLAYED output/ };
let fails = 0;
for (const [neg, re] of Object.entries(want)) {
  const out = `tools/scratch/rc5-train/20260928-0847/m20/probe-${neg}.json`;
  execFileSync("node", ["tools/robocoop-5/eval/run.mjs", "--evals-file", EVAL, "--only", "rc5t-tidy-unused-cells", "--oracle", "--json", out, "--notebook", nb],
    { env: { ...process.env, M20_NEG: neg }, stdio: "ignore", timeout: 600000 });
  const conv = JSON.parse(readFileSync(out, "utf8")).evals[0].transcript.conversation;
  const res = conv.filter(m => m.role === "tool").map(m => String(m.content)).join("\n");
  const ok = re.test(res);
  if (!ok) fails++;
  console.log((ok ? "PASS " : "FAIL ") + neg + ": " + (res.match(/removed \d+ cells?:[^·]*(· ⚠[^·]*)*/)?.[0] ?? res.slice(0, 200)).slice(0, 400));
}
process.exit(fails ? 1 : 0);
