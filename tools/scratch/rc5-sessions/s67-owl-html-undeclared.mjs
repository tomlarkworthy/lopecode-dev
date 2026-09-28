// probe: replay of the rc5-multi-session "draw an owl" session (2026-09-28 11:43). The agent wrote a cell
// that calls html`…` without listing html, got "✓ all 2 cells compute … owl=undefined", then added `html`
// to the function's parameters but not to its $def deps (owl = "html is not a function").
// usage: node <this file> <notebook.html>
import { resolve } from "node:path";
const NB = resolve(process.argv[2] || "lopebooks/notebooks/@tomlarkworthy_robocoop-5.html");
const { bootNotebook } = await import(resolve(process.cwd(), "tools/robocoop-5/lib/notebook-boot.mjs"));
const P = "/src/@probe/owl.js";
const SRC = `const _intro = function intro(md){return(
md\`# 🦉 Owl\`
)};
const _owl = function owl(){return(
html\`<svg width="200" height="200"><circle cx="100" cy="100" r="80" fill="#8B6914"/></svg>\`
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;
  $def("_intro", "intro", ["md"], _intro);
  $def("_owl", "owl", [], _owl);
  return main;
}
`;
const steps = [
  ["write_file", { file_path: P, content: SRC }],
  ["edit_file", { file_path: P, old_string: "const _owl = function owl(){return(", new_string: "const _owl = function owl(html){return(" }],
];
const { page, close } = await bootNotebook({ notebookPath: NB, layout: "R100(S75(@tomlarkworthy/robocoop-5),S25(@tomlarkworthy/robocoop-5-srctools))" });
const out = await page.evaluate(async (steps) => {
  const H = window.__nbHelpers;
  ["toolsView", "hostSetup"].forEach(n => H.force(n)); await new Promise(r => setTimeout(r, 1500));
  const t0 = Date.now();
  while (Date.now() - t0 < 25000 && !(H.byName("toolsView")?.value?.length >= 10)) await new Promise(r => setTimeout(r, 300));
  const byId = new Map(H.byName("toolsView").value.map(t => [t.id, t]));
  const ctx = { sessionState: {} };
  await byId.get("read_file").execute({ file_path: "/content/@tomlarkworthy/markdown-wiki/writing-cells-in-module-source.md" }, ctx);
  const outs = [];
  for (const [tool, args] of steps) { outs.push(String((await byId.get(tool).execute(args, ctx))?.output ?? "")); await new Promise(r => setTimeout(r, 800)); }
  return outs;
}, steps);
await close();
const [w, e] = out;
console.log("WRITE:", w.slice(0, 700));
console.log("EDIT: ", e.slice(0, 700));
const checks = [
  ["write does not claim every cell computes", !/✓ all 2 cells compute/.test(w)],
  ["write names html as the problem", /html/.test(w)],
  ["edit does not claim every cell computes", !/✓ all 2 cells compute/.test(e)],
  ["edit names the missing $def dep", /\$def|deps|input/.test(e) && /html/.test(e)],
];
for (const [n, ok] of checks) console.log((ok ? "PASS " : "FAIL ") + n);
console.log(checks.every(c => c[1]) ? "PASS" : "FAIL");
