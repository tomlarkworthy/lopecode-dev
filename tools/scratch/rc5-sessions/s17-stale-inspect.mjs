// inspect_value on a cell nobody observes must report its CURRENT value after an upstream change, not
// the value cached when it was last read. Observed 2026-09-27 (run 20260927-2332-w3-before): after the
// agent drove `viewof theme_assets` to cotton, inspect_value theme_name returned "ocean-floor" four
// times while theme_assets itself read cotton. theme_name has no observer: the first read makes it
// reachable only for that read, and readVar then served the stale `_value` on every later read.
// No model calls: the tools are driven with a session's ctx.   node DIR/probe.mjs [notebook.html]
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { bootNotebook } from "../../robocoop-5/lib/notebook-boot.mjs";
const here = dirname(fileURLToPath(import.meta.url));
const NB = process.argv[2] ? resolve(process.argv[2]) : join(here, "../../../lopebooks/notebooks/@tomlarkworthy_robocoop-5.html");
const { page, close } = await bootNotebook({ notebookPath: NB, layout: "R100(S75(@tomlarkworthy/robocoop-5),S25(@tomlarkworthy/robocoop-5-srctools))" });
const out = await page.evaluate(async () => {
  const H = window.__nbHelpers;
  ["toolsView", "hostSetup"].forEach(n => H.force(n));
  const t0 = Date.now();
  while (Date.now() - t0 < 25000 && !(H.byName("toolsView")?.value?.length >= 10)) await new Promise(r => setTimeout(r, 300));
  const byId = new Map(H.byName("toolsView").value.map(t => [t.id, t]));
  const ctx = { sessionState: {} };
  const run = async (id, args) => String((await byId.get(id).execute(args, ctx))?.output ?? "").trim();
  const M = "@tomlarkworthy/themes";
  const r = {};
  r.before = await run("inspect_value", { module: M, name: "theme_name" });
  const target = r.before === "cotton" ? "air" : "cotton";
  r.target = target;
  r.drive = await run("eval_js", { module: M, code: `viewof_theme_assets.value = themes.get("${target}"); viewof_theme_assets.dispatchEvent(new Event("input")); return 1` });
  await new Promise(r => setTimeout(r, 1500));
  r.assets5 = await run("eval_js", { module: M, code: "theme_assets[5].split('/').pop()" });
  r.after = await run("inspect_value", { module: M, name: "theme_name" });
  r.listed = (await run("list_values", { module: M })).split("\n").find(l => /theme_name/.test(l)) ?? "";
  return r;
});
const checks = [
  ["theme_assets followed the drive", out.assets5, `theme-${out.target}.css`],
  ["inspect_value theme_name after the drive", out.after, out.target],
];
let fail = 0;
for (const [label, got, want] of checks) {
  const ok = got === want || got === JSON.stringify(want);
  if (!ok) fail++;
  console.log((ok ? "PASS " : "FAIL ") + label + ": got " + JSON.stringify(got) + " want " + JSON.stringify(want));
}
console.log("raw", JSON.stringify(out));
await close();
process.exit(fail ? 1 : 0);
