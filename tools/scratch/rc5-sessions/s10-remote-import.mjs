// S10: an agent write that imports a notebook NOT embedded in the page (@tomlarkworthy/slides) must load
// it from Observable, not bind to an empty stub. Reproduces 2026-09-27 (Tom's slides session): jbApply's
// resolveModule created an empty @tomlarkworthy/slides, so `slideshow` was undefined. No model calls.
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { bootNotebook } from "../../robocoop-5/lib/notebook-boot.mjs";
const here = dirname(fileURLToPath(import.meta.url));
const NB = process.argv[2] ? resolve(process.argv[2]) : join(here, "../../../lopebooks/notebooks/@tomlarkworthy_robocoop-5.html");
const { page, close } = await bootNotebook({ notebookPath: NB, layout: "R100(S75(@tomlarkworthy/robocoop-5),S25(@tomlarkworthy/robocoop-5-srctools))" });
const out = await page.evaluate(async () => {
  const H = window.__nbHelpers;
  ["toolsView", "hostSetup"].forEach(n => H.force(n));
  const t0 = Date.now();
  while (Date.now() - t0 < 25000 && !(H.byName("toolsView")?.value?.length >= 10)) await new Promise(r => setTimeout(r, 300));
  const byId = new Map(H.byName("toolsView").value.map(t => [t.id, t]));
  const run = async (id, args) => { try { return String((await byId.get(id).execute(args, {}))?.output ?? ""); } catch (e) { return "THREW " + e; } };
  const src = `const _kind = function kind(slideshow){return(
typeof slideshow
)};
export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => { main.variable(observer(name)).define(name, deps, fn).pid = pid; };
  main.define("module @tomlarkworthy/slides", async () => runtime.module((await import("/@tomlarkworthy/slides.js?v=4")).default));
  main.define("slideshow", ["module @tomlarkworthy/slides", "@variable"], (_, v) => v.import("slideshow", _));
  $def("_kind", "kind", ["slideshow"], _kind);
  return main;
}`;
  const write = await run("write_file", { file_path: "/src/@probe/deck.js", content: src });
  const rt = window.__ojs_runtime;
  const m = rt.mains.get("@probe/deck");
  const kindVar = [...rt._variables].find(v => v._module === m && v._name === "kind");
  let kind; try { kind = await kindVar?._promise; } catch (e) { kind = "ERR " + (e?.message ?? e); }
  const slidesMod = [...rt._variables].find(v => v._module === m && v._name === "module @tomlarkworthy/slides")?._value;
  return {
    write: write.slice(0, 300),
    kind,
    slidesScopeSize: slidesMod?._scope?.size,
    stubInMains: rt.mains.get("@tomlarkworthy/slides")?._scope?.size ?? null,
    readBack: (await run("read_file", { file_path: "/src/@tomlarkworthy/slides.js", limit: 3 })).slice(0, 160)
  };
});
console.log(JSON.stringify(out, null, 1));
await close();
