// A module write that scrolls the window (window.scrollTo / scrollY / documentElement.scrollTop) is refused
// until the session has read scrolling-a-lopepage-notebook.md; a write that scrolls an .lp2-pane is not gated.
// No model calls. Usage: node <probe> <notebook.html>
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
const { bootNotebook } = await import(pathToFileURL(resolve(process.cwd(), "tools/robocoop-5/lib/notebook-boot.mjs")).href);
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
  const mod = (body) => `const _go = function go(){return( () => { ${body} } )};
export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;
  $def("_go", "go", [], _go);
  return main;
}`;
  const pane = await run("write_file", { file_path: "/src/@probe/pane.js", content: mod("document.querySelectorAll('.lp2-pane').forEach(p => p.scrollTo({top: 0}));") });
  const win = await run("write_file", { file_path: "/src/@probe/win.js", content: mod("window.scrollTo({top: 0, behavior: 'smooth'});") });
  const y = await run("write_file", { file_path: "/src/@probe/y.js", content: mod("return window.scrollY;") });
  const read = await run("read_file", { file_path: "/content/@tomlarkworthy/markdown-wiki/scrolling-a-lopepage-notebook.md", limit: 3 });
  const win2 = await run("write_file", { file_path: "/src/@probe/win.js", content: mod("window.scrollTo({top: 0, behavior: 'smooth'});") });
  const idx = String(H.byName("wiki_index") ?? "");
  return { pane: pane.slice(0, 70), win: win.slice(0, 160), y: y.slice(0, 70), read: read.slice(0, 60), win2: win2.slice(0, 70),
    indexLine: idx.split("\n").find(l => l.includes("scrolling-a-lopepage")) ?? null };
});
console.log(JSON.stringify(out, null, 1));
const pass = out.pane.startsWith("Wrote") && out.win.startsWith("REFUSED") && out.y.startsWith("REFUSED") && out.win2.startsWith("Wrote") && !!out.indexLine;
console.log(pass ? "PASS" : "FAIL");
await close();
process.exit(pass ? 0 : 1);
