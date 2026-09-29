// S95: a write importing a notebook the page does not run yet makes that notebook a main under its own name.
// Live session 2026-09-29: the agent added `import {annotation} from "@tomlarkworthy/annotate"`; annotate loaded
// outside runtime.mains, so it was not a notebook module and did not save. Tom: "externally imported modules
// should be added to mains". The import target here is a module embedded in the bundle that nothing has booted.
// Checks: the target is in runtime.mains, the writer's `module X` loader resolves to that same module, the
// imported name computes, currentModules names the module X (not "main"), and the writer is a main too
// (exporter-3's bootconf mains are runtime.mains). No model calls.
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
const { bootNotebook } = await import(pathToFileURL(resolve("tools/robocoop-5/lib/notebook-boot.mjs")).href);
const NB = resolve(process.argv[2] || "lopebooks/notebooks/@tomlarkworthy_robocoop-5.html");
const { page, close } = await bootNotebook({ notebookPath: NB, layout: "R100(S75(@tomlarkworthy/robocoop-5),S25(@tomlarkworthy/robocoop-5-srctools))" });
const out = await page.evaluate(async () => {
  const H = window.__nbHelpers;
  ["toolsView", "hostSetup", "currentModules"].forEach(n => H.force(n));
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const t0 = Date.now();
  while (Date.now() - t0 < 25000 && !(H.byName("toolsView")?.value?.length >= 10)) await sleep(300);
  const tools = () => new Map(H.byName("toolsView").value.map(t => [t.id, t]));
  const run = async (id, args) => { try { return String((await tools().get(id).execute(args, {}))?.output ?? ""); } catch (e) { return "THREW " + e; } };
  const rt = window.__ojs_runtime;
  const names = () => [...(H.byName("currentModules") || new Map()).values()].map(i => i && i.name);
  while (Date.now() - t0 < 40000 && names().length < 20) await sleep(300);
  const booted = new Set(names());
  const candidates = ["@tomlarkworthy/escodegen", "@tomlarkworthy/spectral-layout", "@tomlarkworthy/stream-operators"];
  let spec = null, sym = null;
  for (const c of candidates) {
    if (booted.has(c) || rt.mains.has(c)) continue;
    const el = document.getElementById(c);
    const m = el && /\$def\("[^"]+", "([A-Za-z_$][\w$]*)", \[/.exec(el.textContent);
    if (m) { spec = c; sym = m[1]; break; }
  }
  if (!spec) return { pass: false, why: "no unbooted embedded candidate", booted: [...booted] };
  const src = `const _use = function _use(${sym}){return(
typeof ${sym}
)};
export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;
  main.define("module ${spec}", async () => runtime.module((await import("/${spec}.js?v=4")).default));
  main.define("${sym}", ["module ${spec}", "@variable"], (_, v) => v.import("${sym}", _));
  $def("_use", "use", ["${sym}"], _use);
  return main;
}
`;
  const w = await run("write_file", { file_path: "/src/@probe/imp.js", content: src });
  const target = rt.mains.get(spec);
  const writer = rt.mains.get("@probe/imp");
  const loader = [...rt._variables].find(v => v._module === writer && v._name === "module " + spec);
  let loaded; try { loaded = await Promise.race([writer.value("module " + spec), sleep(5000).then(() => "TIMEOUT")]); } catch (e) { loaded = "ERR " + e; }
  let use; try { use = await Promise.race([writer.value("use"), sleep(5000).then(() => "TIMEOUT")]); } catch (e) { use = "ERR " + e; }
  let named = false;
  for (let i = 0; i < 30 && !named; i++) {
    named = [...(H.byName("currentModules") || new Map()).values()].some(i => i && i.module === target && i.name === spec);
    if (!named) await sleep(300);
  }
  const checks = {
    applied: /applied live/.test(w),
    targetIsMain: !!target,
    loaderIsTarget: !!target && loaded === target,
    importComputes: typeof use === "string" && use !== "undefined" && !/^ERR|TIMEOUT/.test(use),
    namedInCurrentModules: named,
    writerIsMain: !!writer,
    toldAgent: w.includes(spec + " (imported) joined the notebook")
  };
  return { spec, sym, booted: booted.size, w: w.slice(0, 400), use, loader: !!loader, checks, pass: Object.values(checks).every(Boolean) };
});
console.log(JSON.stringify(out, null, 1));
await close();
process.exit(out.pass ? 0 : 1);
