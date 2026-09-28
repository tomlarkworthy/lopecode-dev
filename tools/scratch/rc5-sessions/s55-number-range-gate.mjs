// The write gate for Inputs.number({min, max}) (rc5-train 20260928-0847-m31). Inputs.number takes its limits as the
// first argument; a min/max option is ignored without an error, and in m26's 3 runs the agent told the user the box
// refused out-of-range values. A write adding that shape must be refused until event-handlers-in-cells.md is read;
// the extent form and a number box with no limits must not be. No model calls.
// Usage: node <probe> <notebook.html>   (from the repo root)
import { resolve } from "node:path";
const { bootNotebook } = await import(resolve(process.cwd(), "tools/robocoop-5/lib/notebook-boot.mjs"));
const NB = resolve(process.argv[2] || "lopebooks/notebooks/@tomlarkworthy_robocoop-5.html");
const { page, close } = await bootNotebook({ notebookPath: NB, layout: "R100(S75(@tomlarkworthy/robocoop-5),S25(@tomlarkworthy/robocoop-5-srctools))" });
const out = await page.evaluate(async () => {
  const H = window.__nbHelpers;
  ["toolsView", "hostSetup"].forEach(n => H.force(n)); await new Promise(r => setTimeout(r, 1500));
  const t0 = Date.now();
  while (Date.now() - t0 < 25000 && !(H.byName("toolsView")?.value?.length >= 10)) await new Promise(r => setTimeout(r, 300));
  const byId = new Map(H.byName("toolsView").value.map(t => [t.id, t]));
  const WIKI = "/content/@tomlarkworthy/markdown-wiki/";
  const run = async (ctx, id, args) => String((await byId.get(id).execute(args, ctx))?.output ?? "");
  const session = async () => { const ctx = { sessionState: {} }; await run(ctx, "read_file", { file_path: WIKI + "writing-cells-in-module-source.md", limit: 2 }); return ctx; };
  const mod = (id, aqi) => `const _t = function _title(md){return( md\`# AQI\` )};
const _b = function _bill(Inputs){return( Inputs.number({ label: "Bill", value: 40, step: 0.01 }) )};
const _bv = (G, _) => G.input(_);
const _rctuwq = function _aqi(Inputs){return(
${aqi}
)};
const _k2aqiv = (G, _) => G.input(_);
export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => { main.variable(observer(name)).define(name, deps, fn).pid = pid; };
  $def("_t", null, ["md"], _t);
  $def("_b", "viewof bill", ["Inputs"], _b);
  $def("_bv", "bill", ["Generators", "viewof bill"], _bv);
  $def("_rctuwq", "viewof aqi", ["Inputs"], _rctuwq);
  $def("_k2aqiv", "aqi", ["Generators", "viewof aqi"], _k2aqiv);
  return main;
}`;
  const EXTENT = 'Inputs.number([0, 500], { label: "AQI", value: 100, step: 1 })';
  const M26 = 'Inputs.number({ label: "AQI", value: 100, step: 1, min: 0, max: 500 })'; // eval-fixed.json, m26
  const M26B = 'Inputs.number({ label: "AQI", value: 100, min: 0, max: 500, step: 1 })'; // eval-base.json, m26
  const r = {};
  r.extentWrite = await run(await session(), "write_file", { file_path: "/src/@probe/extent.js", content: mod("@probe/extent", EXTENT) });
  r.m26Write = await run(await session(), "write_file", { file_path: "/src/@probe/m26.js", content: mod("@probe/m26", M26) });
  const c = await session();
  r.m26Edit = await run(c, "edit_file", { file_path: "/src/@probe/extent.js", old_string: EXTENT, new_string: M26B });
  await run(c, "read_file", { file_path: WIKI + "event-handlers-in-cells.md" });
  r.m26EditAfterRead = await run(c, "edit_file", { file_path: "/src/@probe/extent.js", old_string: EXTENT, new_string: M26B });
  const step = await session();
  r.stepOnlyEdit = await run(step, "edit_file", { file_path: "/src/@probe/extent.js", old_string: M26B, new_string: EXTENT.replace("step: 1", "step: 0.5") });
  return r;
});
const REF = /^REFUSED/, PAGE = /event-handlers-in-cells\.md/;
const checks = {
  extentNotRefused: !REF.test(out.extentWrite),
  m26WriteRefused: REF.test(out.m26Write) && PAGE.test(out.m26Write),
  m26EditRefused: REF.test(out.m26Edit) && PAGE.test(out.m26Edit),
  landsAfterRead: /^Edited/.test(out.m26EditAfterRead),
  extentEditNotRefused: !REF.test(out.stepOnlyEdit),
};
for (const [k, v] of Object.entries(out)) console.log(k.padEnd(18), v.slice(0, 260).replace(/\n/g, " "));
console.log(JSON.stringify(checks));
await close();
const pass = Object.values(checks).every(Boolean);
console.log(pass ? "PASS" : "FAIL");
process.exit(pass ? 0 : 1);
