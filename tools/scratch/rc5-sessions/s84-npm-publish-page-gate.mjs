// Probe (rc5-train 20260929-0620-m66): a module write that builds an npm tarball (`package/package.json`, a
// ustar header) or PUTs to registry.npmjs.org is refused until publishing-notebook-functions-to-npm.md is read.
// Prose naming `npm publish`, the registry search URL and a registry GET are not gated.
// No model calls. Usage: node <probe> <notebook.html>
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
const { bootNotebook } = await import(pathToFileURL(resolve(process.cwd(), "tools/robocoop-5/lib/notebook-boot.mjs")).href);
const NB = resolve(process.argv[2] || "lopebooks/notebooks/@tomlarkworthy_robocoop-5.html");
const PAGE = "publishing-notebook-functions-to-npm";
const { page, close } = await bootNotebook({ notebookPath: NB, layout: "R100(S75(@tomlarkworthy/robocoop-5),S25(@tomlarkworthy/robocoop-5-srctools))" });
const out = await page.evaluate(async (PAGE) => {
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
  const search = await run("write_file", { file_path: "/src/@probe/search.js", content: mod("", '"https://registry.npmjs.org/-/v1/search?text=canny&size=10"') });
  // the intro the agent wrote in run 20260929-0620-m66 base (@user/edge-helpers intro cell)
  const intro = await run("write_file", { file_path: "/src/@probe/intro.js", content: mod("md", "md`This module builds the npm package **@me/edge-helpers** from the edge-kit functions. Download each file or run \\`npm publish\\` from a local copy.`") });
  const get = await run("write_file", { file_path: "/src/@probe/get.js", content: mod("", 'fetch("https://registry.npmjs.org/lodash/latest").then(r => r.json())') });
  const tar = await run("write_file", { file_path: "/src/@probe/tar.js", content: mod("", '(h, enc) => (h.set(enc.encode("ustar"), 257), h)') });
  const put = await run("write_file", { file_path: "/src/@probe/put.js", content: mod("", '(token, doc) => fetch("https://registry.npmjs.org/" + doc.name.replace("/", "%2f"), {method: "PUT", headers: {authorization: "Bearer " + token}, body: JSON.stringify(doc)})') });
  const read = await run("read_file", { file_path: "/content/@tomlarkworthy/markdown-wiki/" + PAGE + ".md", limit: 3 });
  const intro2 = await run("write_file", { file_path: "/src/@probe/intro.js", content: mod("md", "md`Run \\`npm publish edge-helpers-1.0.0.tgz --access public\\`.`") });
  const idx = String(H.byName("wiki_index") ?? "");
  const tar2 = await run("write_file", { file_path: "/src/@probe/tar.js", content: mod("", '(h, enc) => (h.set(enc.encode("ustar"), 257), h)') });
  return { search: search.slice(0, 70), get: get.slice(0, 70), tar: tar.slice(0, 400), tar2: tar2.slice(0, 70), intro: intro.slice(0, 200), put: put.slice(0, 400), read: read.slice(0, 60), intro2: intro2.slice(0, 70),
    indexLine: idx.split("\n").find(l => l.includes(PAGE)) ?? null };
}, PAGE);
console.log(JSON.stringify(out, null, 1));
const pass = out.search.startsWith("Wrote") && out.get.startsWith("Wrote") && out.intro.startsWith("Wrote") && out.tar.startsWith("REFUSED") && out.tar.includes(PAGE)
  && out.put.startsWith("REFUSED") && out.put.includes(PAGE) && out.tar2.startsWith("Wrote") && out.intro2.startsWith("Wrote") && !!out.indexLine;
console.log(pass ? "PASS" : "FAIL");
await close();
process.exit(pass ? 0 : 1);
