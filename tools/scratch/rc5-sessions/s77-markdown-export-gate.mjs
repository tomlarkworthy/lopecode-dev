// A module write that builds a markdown download (text/markdown blob, <a download="….md">, DOM.download(…, "….md"))
// is refused until the session has read exporting-the-notebooks-writing.md; a CSV download is not gated.
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
  const mod = (deps, body) => `const _go = function go(${deps}){return( ${body} )};
export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;
  $def("_go", "go", ${JSON.stringify(deps ? deps.split(",") : [])}, _go);
  return main;
}`;
  const csv = await run("write_file", { file_path: "/src/@probe/csv.js", content: mod("DOM", `DOM.download(new Blob(["a,b\\n1,2"], {type: "text/csv"}), "rows.csv", "Download CSV")`) });
  // the anchor form the agent wrote in run 20260929-0620-m64 base
  const anchor = await run("write_file", { file_path: "/src/@probe/anchor.js", content: mod("htl", 'htl.html`<a download="notes.md" href=${URL.createObjectURL(new Blob(["# x"], {type: "text/plain"}))}>Download</a>`') });
  const mime = await run("write_file", { file_path: "/src/@probe/mime.js", content: mod("", 'new Blob(["# x"], {type: "text/markdown"})') });
  const dom = await run("write_file", { file_path: "/src/@probe/dom.js", content: mod("DOM", 'DOM.download(() => new Blob(["# x"]), "notes.md", "Download")') });
  const read = await run("read_file", { file_path: "/content/@tomlarkworthy/markdown-wiki/exporting-the-notebooks-writing.md", limit: 3 });
  const anchor2 = await run("write_file", { file_path: "/src/@probe/anchor.js", content: mod("htl", 'htl.html`<a download="notes.md" href=${URL.createObjectURL(new Blob(["# x"], {type: "text/plain"}))}>Download</a>`') });
  const idx = String(H.byName("wiki_index") ?? "");
  return { csv: csv.slice(0, 70), anchor: anchor.slice(0, 180), mime: mime.slice(0, 70), dom: dom.slice(0, 70), read: read.slice(0, 60), anchor2: anchor2.slice(0, 70),
    indexLine: idx.split("\n").find(l => l.includes("exporting-the-notebooks-writing")) ?? null };
});
console.log(JSON.stringify(out, null, 1));
const pass = out.csv.startsWith("Wrote") && out.anchor.startsWith("REFUSED") && out.mime.startsWith("REFUSED") && out.dom.startsWith("REFUSED") && out.anchor2.startsWith("Wrote") && !!out.indexLine;
console.log(pass ? "PASS" : "FAIL");
await close();
process.exit(pass ? 0 : 1);
