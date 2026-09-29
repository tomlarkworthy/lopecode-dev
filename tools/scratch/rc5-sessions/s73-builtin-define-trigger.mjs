// m47 probe (rc5-train 20260929-0620-m47): a module write that defines a runtime builtin
// (`_builtin.define(`, copied from run 20260929-0620-m47-before's yaml cell) is refused until
// adding-a-tagged-template-language.md is read; the vendored yaml cell without it is not refused.
// No model calls. Usage: node <probe> <notebook.html>   (paths resolve from the repo root)
import { resolve } from "node:path";
const { bootNotebook } = await import(resolve(process.cwd(), "tools/robocoop-5/lib/notebook-boot.mjs"));
const NB = resolve(process.argv[2] || "lopebooks/notebooks/@tomlarkworthy_robocoop-5.html");
const { page, close } = await bootNotebook({ notebookPath: NB, layout: "R100(S75(@tomlarkworthy/robocoop-5),S25(@tomlarkworthy/robocoop-5-srctools))" });
const out = await page.evaluate(async () => {
  const H = window.__nbHelpers;
  ["toolsView", "hostSetup", "wiki_index"].forEach(n => H.force(n)); await new Promise(r => setTimeout(r, 1500));
  const t0 = Date.now();
  while (Date.now() - t0 < 25000 && !(H.byName("toolsView")?.value?.length >= 10)) await new Promise(r => setTimeout(r, 300));
  const byId = new Map(H.byName("toolsView").value.map(t => [t.id, t]));
  const ctx = { sessionState: {} };
  const run = async (id, args) => String((await byId.get(id).execute(args, ctx))?.output ?? "");
  const cell = (register) => `const _yamlLib = async function yamlLib(FileAttachment){
  const url = URL.createObjectURL(await FileAttachment("js-yaml.mjs").blob());
  try { return await import(url); } finally { URL.revokeObjectURL(url); }
};
const _yaml = function yaml(yamlLib){
  function yaml(strings, ...values) { return yamlLib.load(String.raw(strings, ...values)); }
${register ? `  const rt = window.__ojs_runtime;
  if (rt && rt._builtin) rt._builtin.define("yaml", [], () => yaml);
` : ""}  return yaml;
};
export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;
  $def("_yamlLib", "yamlLib", ["FileAttachment"], _yamlLib);
  $def("_yaml", "yaml", ["yamlLib"], _yaml);
  return main;
}`;
  const doc = "/content/@tomlarkworthy/markdown-wiki/adding-a-tagged-template-language.md";
  const plain = await run("write_file", { file_path: "/src/@probe/yaml-plain.js", content: cell(false) });
  const builtin = await run("write_file", { file_path: "/src/@probe/yaml-builtin.js", content: cell(true) });
  const read = await run("read_file", { file_path: doc, limit: 3 });
  const after = await run("write_file", { file_path: "/src/@probe/yaml-builtin.js", content: cell(true) });
  return { plain: plain.slice(0, 90), builtin: builtin.slice(0, 200), read: read.slice(0, 60), after: after.slice(0, 60) };
});
console.log(JSON.stringify(out, null, 1));
await close();
const ok = !/^REFUSED/.test(out.plain) && /^REFUSED[\s\S]*adding-a-tagged-template-language\.md/.test(out.builtin) && !/^REFUSED/.test(out.after);
console.log(ok ? "PASS" : "FAIL");
process.exit(ok ? 0 : 1);
