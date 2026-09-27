// rc5t-explain-self-save probe: a grep that hits its match cap must still say which files matched past
// the cap. Run 20260928-0030-w8 eval-fixed-1: grep "save|export|serialize" head_limit 30 stopped inside
// claude-code-pairing.js ("[truncated at 30 matches]"); lopepage-2.js and save-in-place.js were never named.
// No model calls. node probe.mjs <notebook.html>
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const { bootNotebook } = await import(join(root, "tools/robocoop-5/lib/notebook-boot.mjs"));
const NB = resolve(process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), "notebook.html"));
const { page, close } = await bootNotebook({ notebookPath: NB, layout: "R100(S75(@tomlarkworthy/robocoop-5),S25(@tomlarkworthy/robocoop-5-srctools))" });
const out = await page.evaluate(async () => {
  const H = window.__nbHelpers;
  ["toolsView", "hostSetup"].forEach(n => H.force(n)); await new Promise(r => setTimeout(r, 1500));
  const t0 = Date.now();
  while (Date.now() - t0 < 25000 && !(H.byName("toolsView")?.value?.length >= 10)) await new Promise(r => setTimeout(r, 300));
  const byId = new Map(H.byName("toolsView").value.map(t => [t.id, t]));
  const run = async (args) => String((await byId.get("grep").execute(args, { sessionState: {} }))?.output ?? "");
  const capped = await run({ glob: "*.js", head_limit: 30, path: "/src", pattern: "save|export|serialize" });
  const small = await run({ path: "/src/@tomlarkworthy/save-in-place.js", pattern: "sip_save" });
  return { cappedTail: capped.slice(capped.lastIndexOf("[truncated")), cappedLines: capped.split("\n").length, smallTail: small.slice(-200) };
});
await close();
console.log(JSON.stringify(out, null, 1));
const t = out.cappedTail;
const checks = {
  names_unshown_files: /lopepage-2\.js/.test(t) && /save-in-place\.js/.test(t),
  says_total: /of \d+ matches/.test(t),
  uncapped_unchanged: !/truncated/.test(out.smallTail),
};
console.log(checks);
process.exit(Object.values(checks).every(Boolean) ? 0 : 1);
