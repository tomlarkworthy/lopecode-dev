// S14: a module write using a construct a wiki doc declares in write-triggers is refused until the
// session has read that doc. No model calls: the tools are driven with a session's ctx.
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { bootNotebook } from "../../robocoop-5/lib/notebook-boot.mjs";
const here = dirname(fileURLToPath(import.meta.url));
const NB = process.argv[2] ? resolve(process.argv[2]) : join(here, "../../../lopebooks/notebooks/@tomlarkworthy_robocoop-5.html");
const { page, close } = await bootNotebook({ notebookPath: NB, layout: "R100(S75(@tomlarkworthy/robocoop-5),S25(@tomlarkworthy/robocoop-5-srctools))" });
const out = await page.evaluate(async () => {
  const H = window.__nbHelpers;
  ["toolsView", "hostSetup", "wiki_index"].forEach(n => H.force(n)); await new Promise(r => setTimeout(r, 1500));
  const t0 = Date.now();
  while (Date.now() - t0 < 25000 && !(H.byName("toolsView")?.value?.length >= 10)) await new Promise(r => setTimeout(r, 300));
  const byId = new Map(H.byName("toolsView").value.map(t => [t.id, t]));
  const ctx = { sessionState: {} };
  const run = async (id, args, c = ctx) => String((await byId.get(id).execute(args, c))?.output ?? "");
  const src = `const _k = function knob(Inputs){return(Inputs.range([0, 10]))};
const _v = (G, v) => G.input(v);
export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => { main.variable(observer(name)).define(name, deps, fn).pid = pid; };
  $def("_k", "viewof knob", ["Inputs"], _k);
  $def("_v", "knob", ["Generators", "viewof knob"], _v);
  return main;
}`;
  const doc = "/content/@tomlarkworthy/markdown-wiki/writing-cells-in-module-source.md";
  const first = await run("write_file", { file_path: "/src/@probe/knob.js", content: src });
  const noCtx = await run("write_file", { file_path: "/src/@probe/knob2.js", content: src }, {});
  const read = await run("read_file", { file_path: doc, limit: 3 });
  const second = await run("write_file", { file_path: "/src/@probe/knob.js", content: src });
  const plain = await run("write_file", { file_path: "/src/@probe/plain.js", content: src.replace(/viewof knob/g, "knob0").replace(/"_v", "knob", \["Generators", "knob0"\], _v/, '"_v", "k2", ["knob0"], x => x') }, { sessionState: {} });
  const idx = H.byName("wiki_index") ?? "";
  return { first: first.slice(0, 150), noCtx: noCtx.slice(0, 60), read: read.slice(0, 80), second: second.slice(0, 90), plain: plain.slice(0, 60),
    state: { read: [...ctx.sessionState.wikiRead], refusals: ctx.sessionState.wikiRefusals },
    idxHead: String(idx).slice(0, 80), idxLen: String(idx).length, indexLine: String(idx).split("\n").find(l => l.includes("writing-cells")) };
});
console.log(JSON.stringify(out, null, 1));
await close();
