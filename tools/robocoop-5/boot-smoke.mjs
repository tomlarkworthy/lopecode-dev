// Boot smoke for robocoop-5: opens the notebook headless, forces the session/tool cells to compute,
// reports registered tool ids, exercises read_file/glob/grep/list_values and the rc5_host seam, checks
// every robocoop-5-core export actually instantiates (lazy cells hide a missing definition until first
// use), and dumps console errors. No model calls.
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { bootNotebook } from "./lib/notebook-boot.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const NB = join(here, "../../lopebooks/notebooks/@tomlarkworthy_robocoop-5.html");
const LAYOUT = "R100(S75(@tomlarkworthy/robocoop-5),S25(@tomlarkworthy/robocoop-5-srctools))";

const { page, consoleErrors, close } = await bootNotebook({ notebookPath: NB, layout: LAYOUT });

const out = await page.evaluate(async () => {
  const H = window.__nbHelpers;
  ["session", "toolsView", "hostSetup", "rc5_host", "viewof model", "client"].forEach((n) => H.force(n));
  const t0 = Date.now();
  while (Date.now() - t0 < 25000) {
    const tv = H.byName("toolsView");
    if (tv && Array.isArray(tv.value) && tv.value.length >= 10 && H.byName("rc5_host")) break;
    await new Promise((r) => setTimeout(r, 300));
  }
  const tv = H.byName("toolsView");
  const tools = tv && Array.isArray(tv.value) ? tv.value : [];
  const byId = new Map(tools.map((t) => [t.id, t]));
  const res = { toolIds: tools.map((t) => t.id), checks: {} };
  const run = async (id, args) => {
    const t = byId.get(id);
    if (!t) return "TOOL MISSING";
    try { const r = await t.execute(args, {}); return String(r?.output ?? "").slice(0, 220); }
    catch (e) { return "THREW: " + (e?.message ?? e); }
  };
  res.checks.glob = await run("glob", { pattern: "/src/@tomlarkworthy/robocoop-5*.js" });
  res.checks.read = await run("read_file", { file_path: "/src/@tomlarkworthy/robocoop-5-tools.js", limit: 3 });
  res.checks.grep = await run("grep", { pattern: "registerTool", path: "/src/@tomlarkworthy/robocoop-5-tools.js", max_results: 2 });
  res.checks.list_values = await run("list_values", { module: "@tomlarkworthy/robocoop-5-tools" });

  // Every robocoop-5-core export must instantiate — a cell missing from the module body is invisible
  // until something computes it (observed: a build slip dropped toolLabel and boot still looked green).
  res.checks.coreExports = {};
  for (const n of ["truncate", "defineTool", "createOpenRouterClient", "createAgentSession", "composeFooter", "summarizeTurn", "toolLabel"]) {
    H.force(n);
  }
  await new Promise((r) => setTimeout(r, 500));
  for (const n of ["truncate", "defineTool", "createOpenRouterClient", "createAgentSession", "composeFooter", "summarizeTurn", "toolLabel"]) {
    res.checks.coreExports[n] = typeof H.byName(n);
  }

  const host = H.byName("rc5_host");
  if (host) {
    const seeded = await host.seedFile("/notebook/@user/smoke.js",
      'const _a = function a(){return( 41+1 )};\nexport default function define(runtime, observer) {\n  const main = runtime.module();\n  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;\n  $def("_a", "a", [], _a);\n  return main;\n}\n');
    res.checks.seed = JSON.stringify(seeded).slice(0, 300);
    const snap = await host.snapshotFiles();
    res.checks.snapshotHasSeed = "/src/@user/smoke.js" in snap && "/notebook/@user/smoke.js" in snap;
    res.checks.snapshotCount = Object.keys(snap).length;
  } else res.checks.seed = "rc5_host MISSING";
  const sess = H.byName("session");
  res.checks.session = sess && typeof sess.send === "function" ? "ok" : "MISSING";
  return res;
});

console.log(JSON.stringify(out, null, 2));
const coreOk = Object.values(out.checks.coreExports || {}).every((t) => t === "function");
console.log("core exports:", coreOk ? "all instantiate" : "MISSING EXPORT — see coreExports above");
console.log("console errors:", consoleErrors.length ? consoleErrors.slice(0, 10) : "none");
await close();
process.exit(coreOk ? 0 : 1);
