// S94: write_file over an existing file keeps the file's typographic punctuation in text the rewrite did not change.
// rc5-train 20260929-0620-m60 (open item): edit_file keeps the file's ’ “ ” where the model retypes them as ASCII;
// a whole-file write_file did not, so a proofreading rewrite turned the user's untouched quotes straight.
// Checks: a typo fix plus ASCII retyping keeps ’ “ ” in the fixed paragraph and in an untouched one; a new
// code line with ASCII quotes stays ASCII and the module still compiles; a deliberate curly quote the model typed
// is kept; a write that changes nothing typographic has no note. No model calls.
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
const { bootNotebook } = await import(pathToFileURL(resolve("tools/robocoop-5/lib/notebook-boot.mjs")).href);
const NB = resolve(process.argv[2] || "lopebooks/notebooks/@tomlarkworthy_robocoop-5.html");
const { page, close } = await bootNotebook({ notebookPath: NB, layout: "R100(S75(@tomlarkworthy/robocoop-5),S25(@tomlarkworthy/robocoop-5-srctools))" });
const out = await page.evaluate(async () => {
  const H = window.__nbHelpers;
  ["toolsView", "hostSetup"].forEach(n => H.force(n));
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const t0 = Date.now();
  while (Date.now() - t0 < 25000 && !(H.byName("toolsView")?.value?.length >= 10)) await sleep(300);
  const tools = () => new Map(H.byName("toolsView").value.map(t => [t.id, t]));
  const run = async (id, args) => { try { return String((await tools().get(id).execute(args, {}))?.output ?? ""); } catch (e) { return "THREW " + e; } };
  const mod = (a, b, extra = "") => `const _a = function _a(md){return(
md\`${a}\`
)};
const _b = function _b(md){return(
md\`${b}\`
)};${extra}
export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;
  $def("_a", "a", ["md"], _a);
  $def("_b", "b", ["md"], _b);${extra ? '\n  $def("_c", "c", [], _c);' : ""}
  return main;
}
`;
  const A0 = "The feed doesn’t work yet! I will definately add to this. As a friend put it, “a blog is a blog.”";
  const B0 = "Each page keeps its own header — bumping it invalidates the cache. It’s fine.";
  await run("write_file", { file_path: "/src/@probe/essay.js", content: mod(A0, B0) });
  const A1 = "The feed doesn't work yet! I will definitely add to this. As a friend put it, \"a blog is a blog.\"";
  const B1 = "Each page keeps its own header - bumping it invalidates the cache. It's fine.";
  const extra = `\nconst _c = function _c(){return(\n"plain \\"x\\" it's"\n)};`;
  const w = await run("write_file", { file_path: "/src/@probe/essay.js", content: mod(A1, B1, extra) });
  const text = await run("read_file", { file_path: "/src/@probe/essay.js" });
  const rt = window.__ojs_runtime, m = rt.mains.get("@probe/essay");
  const c = [...rt._variables].find(v => v._module === m && v._name === "c");
  let cv; try { cv = await Promise.race([c?._promise, sleep(3000).then(() => "TIMEOUT")]); } catch (e) { cv = "ERR " + e; }
  // deliberate: the model types a curly quote where the file had ASCII
  const w2 = await run("write_file", { file_path: "/src/@probe/essay.js", content: mod(A1.replace("definately", "definitely"), B1.replace("It's", "It’s"), extra) });
  const text2 = await run("read_file", { file_path: "/src/@probe/essay.js" });
  const w3 = await run("write_file", { file_path: "/src/@probe/plain.js", content: mod("x 'y'", "z") });
  const w4 = await run("write_file", { file_path: "/src/@probe/plain.js", content: mod("x 'y' w", "z") });
  const checks = {
    fixKept: text.includes("I will definitely add"),
    quotesKept: text.includes("doesn’t work") && text.includes("“a blog is a blog.”"),
    untouchedKept: text.includes("header — bumping") && text.includes("It’s fine."),
    codeAscii: cv === "plain \"x\" it's",
    noted: /typographic/.test(w),
    deliberateKept: text2.includes("It’s fine."),
    quietWhenNone: !/typographic/.test(w4)
  };
  return { w: w.slice(0, 400), cv, checks, pass: Object.values(checks).every(Boolean) };
});
console.log(JSON.stringify(out, null, 1));
await close();
process.exit(out.pass ? 0 : 1);
