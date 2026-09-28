// try_control with a typed value: it must type into the box the way a user does and report a value the control
// refused. Before 20260928-0847-m26 it assigned the view's .value, whose setter coerces ("" -> 0 in Inputs.number),
// so it reported "bill: 40 -> 0" for an empty box where a user sees the old total and no message. No model calls.
// Fixture: a tip calculator with an Inputs.number bill, an Inputs.range([0, 30]) tip %, an Inputs.text name.
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
  if (!byId.has("try_control")) return { error: "no try_control tool" };
  const ctx = { sessionState: {} };
  const run = async (id, args) => String((await byId.get(id).execute(args, ctx))?.output ?? "");
  const src = `const _t = function _title(md){return( md\`# Tip calculator\` )};
const _b = function _bill(Inputs){return( Inputs.number({ label: "Bill", value: 40, step: 0.01 }) )};
const _bv = (G, _) => G.input(_);
const _p = function _pct(Inputs){return( Inputs.range([0, 30], { label: "Tip %", value: 15, step: 1 }) )};
const _pv = (G, _) => G.input(_);
const _n = function _who(Inputs){return( Inputs.text({ label: "Name", value: "Sam" }) )};
const _nv = (G, _) => G.input(_);
const _r = function _readout(htl, bill, pct, who){return( htl.html\`<p>\${who} tips <b class="tip">\${(bill * pct / 100).toFixed(2)}</b></p>\` )};
export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => { main.variable(observer(name)).define(name, deps, fn).pid = pid; };
  $def("_t", null, ["md"], _t);
  $def("_b", "viewof bill", ["Inputs"], _b);
  $def("_bv", "bill", ["Generators", "viewof bill"], _bv);
  $def("_p", "viewof pct", ["Inputs"], _p);
  $def("_pv", "pct", ["Generators", "viewof pct"], _pv);
  $def("_n", "viewof who", ["Inputs"], _n);
  $def("_nv", "who", ["Generators", "viewof who"], _nv);
  $def("_r", "readout", ["htl", "bill", "pct", "who"], _r);
  return main;
}`;
  for (const doc of ["event-handlers-in-cells.md", "writing-cells-in-module-source.md"]) await run("read_file", { file_path: "/content/@tomlarkworthy/markdown-wiki/" + doc, limit: 2 });
  await run("write_file", { file_path: "/src/@probe/tip.js", content: src });
  await new Promise(r => setTimeout(r, 1500));
  const mod = window.__ojs_runtime.mains.get("@probe/tip");
  const val = n => [...window.__ojs_runtime._variables].find(v => v._name === n && v._module === mod)?._value;
  const r = {
    empty: await run("try_control", { module: "@probe/tip", control: "Bill", value: "" }),
    text: await run("try_control", { module: "@probe/tip", control: "Bill", value: "abc" }),
    negative: await run("try_control", { module: "@probe/tip", control: "Bill", value: -5 }),
    good: await run("try_control", { module: "@probe/tip", control: "Bill", value: 100 }),
    pctOut: await run("try_control", { module: "@probe/tip", control: "Tip %", value: 50 }),
    pctIn: await run("try_control", { module: "@probe/tip", control: "Tip %", value: 20 }),
    name: await run("try_control", { module: "@probe/tip", control: "Name", value: "" }),
  };
  r.billAfter = val("bill"); r.pctAfter = val("pct");
  r.sweep = await run("try_control", { module: "@probe/tip" });
  return r;
});
const NA = "NOT ACCEPTED";
const checks = out.error ? { tool: false } : {
  // an empty number box is ignored by Inputs.number: the old total stays, and the tool says so
  emptyRefused: out.empty.includes(NA) && !/bill:\s*\n?\s*40 → 0/.test(out.empty),
  // a number box cannot hold text: it shows "" and the value is refused
  textRefused: out.text.includes(NA) && /cannot hold "abc"/.test(out.text),
  // Inputs.number has no extent here, so -5 is accepted and reaches the readout
  negativeAccepted: !out.negative.includes(NA) && /-0\.75/.test(out.negative),
  goodAccepted: !out.good.includes(NA) && /15\.00/.test(out.good),
  // Inputs.range([0, 30]) refuses 50 through its number box
  rangeOutRefused: out.pctOut.includes(NA),
  rangeInAccepted: !out.pctIn.includes(NA) && /8\.00/.test(out.pctIn),
  // an empty text box is a real value for Inputs.text
  textBoxAccepted: !out.name.includes(NA) && /Sam tips/.test(out.name),
  putBack: out.billAfter === 40 && out.pctAfter === 15,
  sweepStillWorks: /Tried 3 controls/.test(out.sweep) && !out.sweep.includes(NA),
};
console.log(JSON.stringify(out, null, 1));
console.log(JSON.stringify(checks));
await close();
const pass = Object.values(checks).every(Boolean);
console.log(pass ? "PASS" : "FAIL");
process.exit(pass ? 0 : 1);
