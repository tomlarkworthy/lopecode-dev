// model-free: the save-in-place edits from runs 20260928-0847-m32 fixed/fixed2 are refused until
// what-a-saved-notebook-opens.md is read. argv[2] = notebook path.
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
const { bootNotebook } = await import(pathToFileURL(join(process.cwd(), "tools/robocoop-5/lib/notebook-boot.mjs")).href);
const EDITS = [
  { file_path: "/src/@tomlarkworthy/save-in-place.js",
    old_string: "        options: { hash: cleanHash() }\n      });",
    new_string: "        options: { hash: cleanHash(), headless: false }\n      });" },
  { file_path: "/src/@tomlarkworthy/save-in-place.js",
    old_string: "      const resp = await exportToHTML({\n        mains: new Map(runtime.mains),",
    new_string: "      const allMains = new Map(runtime.mains);\n      for (const v of runtime._variables) { const mod = v._module; if (mod && typeof mod._name === 'string' && ![...allMains.values()].includes(mod)) allMains.set(mod._name, mod); }\n      const resp = await exportToHTML({\n        mains: allMains," },
];
const { page, close } = await bootNotebook({ notebookPath: resolve(process.argv[2]), layout: "R100(S75(@tomlarkworthy/robocoop-5),S25(@tomlarkworthy/robocoop-5-srctools))" });
const out = await page.evaluate(async (EDITS) => {
  const H = window.__nbHelpers;
  ["toolsView", "hostSetup", "wiki_index"].forEach(n => H.force(n)); await new Promise(r => setTimeout(r, 1500));
  const t0 = Date.now();
  while (Date.now() - t0 < 25000 && !(H.byName("toolsView")?.value?.length >= 10)) await new Promise(r => setTimeout(r, 300));
  const byId = new Map(H.byName("toolsView").value.map(t => [t.id, t]));
  const ctx = { sessionState: {} };
  const run = async (id, args) => String((await byId.get(id).execute(args, ctx))?.output ?? "");
  const before = [];
  for (const e of EDITS) before.push((await run("edit_file", e)).slice(0, 200));
  await run("read_file", { file_path: "/content/@tomlarkworthy/markdown-wiki/what-a-saved-notebook-opens.md", limit: 3 });
  const after = (await run("edit_file", EDITS[0])).slice(0, 120);
  // a user module that boots another module by hand is gated too; an ordinary user module is not
  const plain = (await run("write_file", { file_path: "/src/@user/plain.js", content: "const _a = function a(){return(1)};\nexport default function define(runtime, observer) {\n  const main = runtime.module();\n  main.variable(observer('a')).define('a', [], _a);\n  return main;\n}" })).slice(0, 80);
  return { before, after, plain };
}, EDITS);
console.log(JSON.stringify(out, null, 1));
const ok = out.before.every(s => s.startsWith("REFUSED")) && !out.after.startsWith("REFUSED") && !out.plain.startsWith("REFUSED");
console.log(ok ? "PASS" : "FAIL");
await close(); process.exit(ok ? 0 : 1);
