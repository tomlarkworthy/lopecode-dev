// Proves driver-core's wedge recovery: an eval_js that never yields freezes the page; the driver must
// terminate it after timeoutMs + 60 s, return finishReason "wedged", and leave the browser usable.
import { resolve, join } from "node:path";
import { createDriver } from "../driver.mjs";
import { here } from "./tasks.mjs";

const args = process.argv.slice(2);
const flag = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const notebook = resolve(flag("--notebook", join(here, "..", "robocoop-5-eval-bigcap-df.html")));
// --freeze: a 3-minute turn with a 20 s freeze watchdog — the heartbeat, not the turn clock, must end it.
const freeze = args.includes("--freeze");
const timeoutMs = freeze ? 180000 : 5000;
const driver = await createDriver({ notebookPath: notebook, apiKey: "oracle", model: "oracle", timeoutMs, oracle: true });
let r, r2, ms;
try {
  const t0 = Date.now();
  r = await driver.runQuestion({ id: "wedge", question: "wedge", freezeMs: freeze ? 20000 : undefined, oracle: [
    { tool: "glob", args: { pattern: "/src/@tomlarkworthy/robocoop-5-core.js" } },
    { tool: "eval_js", args: { module: "@tomlarkworthy/robocoop-5-srctools", code: "for(;;){}" } },
  ] });
  ms = Date.now() - t0;
  r2 = await driver.runQuestion({ id: "after", question: "after", oracle: [{ tool: "glob", args: { pattern: "/src/@tomlarkworthy/robocoop-5-core.js" } }] });
} finally { await driver.close(); }
const checks = [
  ["turn returned as wedged", r.finishReason === "wedged" && /page wedged/.test(String(r.error))],
  [freeze ? "ended by the freeze watchdog well before the turn clock (< 100 s)" : "within timeout + 180 s + slack", ms < (freeze ? 100000 : 5000 + 180000 + 30000)],
  ["browser still usable for the next turn", r2 && !r2.error && (r2.conversation || []).some((m) => m.role === "tool" && /robocoop-5-core/.test(String(m.content)))],
];
let failed = 0; for (const [n, ok] of checks) { console.log(`${ok ? "ok  " : "FAIL"} ${n}`); if (!ok) failed++; }
console.log(`wedge turn took ${ms} ms; error: ${String(r.error).slice(0, 120)}; next-turn error: ${r2 && r2.error}`);
process.exit(failed ? 1 : 0);
