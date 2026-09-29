// probe (20260929-0620-m60): edit_file's typographic-punctuation match (s53) kept the file's characters
// only in the common prefix and suffix of old_string/new_string. An edit that fixes two typos far apart
// ("it's own" ... "untill") takes everything between them from new_string, where the model had typed
// straight quotes: the user's ’ and “ ” in the untouched sentences between became ' and ".
// usage (from the repo root): node <this file> <notebook.html>
import { resolve } from "node:path";
const NB = resolve(process.argv[2] || "lopebooks/notebooks/@tomlarkworthy_robocoop-5.html");
const { bootNotebook } = await import(resolve(process.cwd(), "tools/robocoop-5/lib/notebook-boot.mjs"));
const { page, close } = await bootNotebook({ notebookPath: NB, layout: "R100(S75(@tomlarkworthy/robocoop-5),S25(@tomlarkworthy/robocoop-5-srctools))" });

const HOSTING = "Each page keeps it's own version header, so bumping it invalidates the upstream cache.";
const STAY = "The feed doesn’t work yet! I will definately add to this. As a friend put it, “a blog that builds itself is still a blog.” Follow along untill the feed works.";
const SRC = `const _hosting = function hosting(md){return(
md\`## Hosting

${HOSTING}\`
)};
const _stay = function stay(md){return(
md\`## Stay tuned

${STAY}\`
)};
export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;
  $def("_hosting", "hosting", ["md"], _hosting);
  $def("_stay", "stay", ["md"], _stay);
  return main;
}
`;
const ascii = s => s.replace(/[’]/g, "'").replace(/[“”]/g, '"');
const fix = s => s.replace("it's own", "its own").replace("definately", "definitely").replace("untill", "until");
// the shape of the trace's 5th edit: one old_string spanning two cells, typed with ASCII quotes
const OLD = ascii(HOSTING + "`\n)};\nconst _stay = function stay(md){return(\nmd`## Stay tuned\n\n" + STAY);
const NEW = fix(OLD);

const out = await page.evaluate(async ({ SRC, OLD, NEW }) => {
  const H = window.__nbHelpers;
  ["toolsView", "hostSetup", "wiki_index"].forEach(n => H.force(n)); await new Promise(r => setTimeout(r, 1500));
  const t0 = Date.now();
  while (Date.now() - t0 < 25000 && !(H.byName("toolsView")?.value?.length >= 10)) await new Promise(r => setTimeout(r, 300));
  const byId = new Map(H.byName("toolsView").value.map(t => [t.id, t]));
  const run = async (id, args, c) => String((await byId.get(id).execute(args, c))?.output ?? "");
  const P = "/src/@probe/essay.js";
  const body = async () => (await run("read_file", { file_path: P }, {})).split("\n").map(l => l.replace(/^ *\d+\t/, "")).join("\n");
  const r = {};
  await run("write_file", { file_path: P, content: SRC }, {});
  r.spanOut = await run("edit_file", { file_path: P, old_string: OLD, new_string: NEW }, {});
  r.spanBody = await body();
  // a new apostrophe the model adds where the file had none stays as written
  await run("write_file", { file_path: P, content: SRC }, {});
  r.insOut = await run("edit_file", { file_path: P, old_string: "doesn't work yet! I will definately", new_string: "doesn't work yet! I'll definitely" }, {});
  r.insBody = await body();
  return r;
}, { SRC, OLD, NEW });
await close();

const checks = {
  "spanning ASCII-quote edit applies": /^Edited/.test(out.spanOut),
  "  all three typos fixed": /keeps its own/.test(out.spanBody) && /definitely add/.test(out.spanBody) && /along until the/.test(out.spanBody),
  "  ’ between the changes kept": out.spanBody.includes("The feed doesn’t work yet!"),
  "  “ ” between the changes kept": out.spanBody.includes("As a friend put it, “a blog that builds itself is still a blog.”"),
  "an apostrophe the edit adds is taken as written": out.insBody.includes("The feed doesn’t work yet! I'll definitely add"),
};
for (const [k, v] of Object.entries(checks)) console.log((v ? "PASS " : "FAIL ") + k);
console.log(JSON.stringify({ spanOut: out.spanOut.slice(-300), spanBody: out.spanBody.split("\n").slice(0, 10).join(" | "), insBody: out.insBody.split("\n").slice(6, 9).join(" | ") }, null, 1));
const failed = Object.values(checks).filter(v => !v).length;
console.log(failed ? `${failed} FAILED` : "ALL PASS");
process.exit(failed ? 1 : 0);
