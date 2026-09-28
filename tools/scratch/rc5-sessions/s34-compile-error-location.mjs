// rc5-train 20260928-0640-w34: a module write that fails to parse must say WHERE.
// In run 20260928-0640-w34-before the agent wrote a 148-line module whose `_viewof_step` and
// `_viewof_reset` cells have a block body (`function step(...){ return htl.html`…` … )};`) closed with
// the `{return(` form's `)};` (lines 62 and 70). write_file returned only
// "FAILED TO COMPILE: Unexpected token ')'": the SyntaxError from import() of a blob URL carries no
// position. The agent then read lines 70-89 and 35-74 looking for it, and the 20-minute budget ran out.
// No model calls: write_file and edit_file are driven with a session ctx that has read the gated pages.
// Pass: each failed result names the first error's line and quotes it.
// Usage: node <probe> <notebook.html>   (paths resolve from the repo root, process.cwd())
import { resolve, join, dirname } from "node:path";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
const ROOT = process.cwd();
const { bootNotebook } = await import(join(ROOT, "tools/robocoop-5/lib/notebook-boot.mjs"));
// the module the agent wrote in the trace (first error on line 62); the orchestrator copies fixtures/ alongside
const TRACE = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "fixtures/w34-trace-module.js"), "utf8");
const NB = resolve(process.argv[2] || join(ROOT, "lopebooks/notebooks/@tomlarkworthy_robocoop-5.html"));

// the shape of the trace's defect, cut down: a block-bodied cell closed with `)};` on line 6
const BAD = `const _a = function a(){return( 1 )};
const _b = function b(a){
  const x = a + 1;
  return x * 2
  // closed with the {return( form
)};
const _c = function c(b){return( b + 1 )};
export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;
  $def("_a", "a", [], _a);
  $def("_b", "b", ["a"], _b);
  $def("_c", "c", ["b"], _c);
  return main;
}
`;

const { page, close } = await bootNotebook({ notebookPath: NB, layout: "R100(S75(@tomlarkworthy/robocoop-5),S25(@tomlarkworthy/robocoop-5-srctools))" });
const out = await page.evaluate(async ([BAD, TRACE]) => {
  const H = window.__nbHelpers;
  ["toolsView", "hostSetup", "wiki_index"].forEach(n => H.force(n)); await new Promise(r => setTimeout(r, 1500));
  const t0 = Date.now();
  while (Date.now() - t0 < 25000 && !(H.byName("toolsView")?.value?.length >= 10)) await new Promise(r => setTimeout(r, 300));
  const byId = new Map(H.byName("toolsView").value.map(t => [t.id, t]));
  const ctx = { sessionState: {} };
  const run = async (id, args) => String((await byId.get(id).execute(args, ctx))?.output ?? "");
  const write = await run("write_file", { file_path: "/src/@probe/syntax.js", content: BAD });
  // a good module, then an edit that introduces the same error on line 4
  const good = BAD.replace("  // closed with the {return( form\n)};", "};");
  const ok = await run("write_file", { file_path: "/src/@probe/syntax2.js", content: good });
  const edit = await run("edit_file", { file_path: "/src/@probe/syntax2.js", old_string: "  return x * 2\n};", new_string: "  return x * 2\n)};" });
  await run("read_file", { file_path: "/content/@tomlarkworthy/markdown-wiki/writing-cells-in-module-source.md", limit: 3 });
  await run("read_file", { file_path: "/content/@tomlarkworthy/markdown-wiki/event-handlers-in-cells.md", limit: 3 });
  const trace = await run("write_file", { file_path: "/src/@probe/binary-search-tutorial.js", content: TRACE });
  return { write, ok: ok.slice(0, 120), edit, trace };
}, [BAD, TRACE]);
await close();
const checks = [
  ["write names line 6", /\bline 6\b|:6:\d|\(6:\d+\)/.test(out.write)],
  ["write quotes the line", out.write.includes(")};")],
  ["good module applies", /applied live/.test(out.ok)],
  ["edit names line 5", /\bline 5\b|:5:\d|\(5:\d+\)/.test(out.edit)],
  ["trace module names line 62", /\bline 62\b|:62:\d|\(62:\d+\)/.test(out.trace)],
];
console.log(JSON.stringify(out, null, 1));
for (const [n, p] of checks) console.log((p ? "PASS " : "FAIL ") + n);
process.exit(checks.every(c => c[1]) ? 0 : 1);
