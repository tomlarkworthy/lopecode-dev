// w35: an empty grep/glob of /src or /content for a published notebook's name must say that such a
// notebook is loaded by writing its import lines, not found by searching (w29, w33: 4-9 search steps
// for @tomlarkworthy/sticky, then "sticky isn't available"). Must stay quiet on a single-file grep
// and on a regex search. No model calls. Usage: node probe.mjs <notebook.html>
import { join, resolve } from "node:path";
const root = process.cwd();
const { bootNotebook } = await import(join(root, "tools/robocoop-5/lib/notebook-boot.mjs"));
const NB = resolve(root, process.argv[2] || "lopebooks/notebooks/@tomlarkworthy_robocoop-5.html");
const { page, close } = await bootNotebook({ notebookPath: NB, layout: "R100(S75(@tomlarkworthy/robocoop-5),S25(@tomlarkworthy/robocoop-5-srctools))" });
const out = await page.evaluate(async () => {
  const H = window.__nbHelpers;
  ["toolsView", "hostSetup"].forEach(n => H.force(n)); await new Promise(r => setTimeout(r, 1500));
  const t0 = Date.now();
  while (Date.now() - t0 < 25000 && !(H.byName("toolsView")?.value?.length >= 10)) await new Promise(r => setTimeout(r, 300));
  const T = new Map(H.byName("toolsView").value.map(t => [t.id, t]));
  const run = async (id, args) => String((await T.get(id).execute(args, { sessionState: {} }))?.output);
  return {
    // the calls from the traces
    w33_grep_src: await run("grep", { path: "/src", pattern: "sticky", head_limit: 10 }),
    w29_grep_src_id: await run("grep", { path: "/src", pattern: "@tomlarkworthy/sticky", glob: "*.js" }),
    w33_glob_src: await run("glob", { pattern: "/src/@tomlarkworthy/sticky*" }),
    w33_glob_content: await run("glob", { pattern: "/content/@tomlarkworthy/sticky*" }),
    // must stay quiet
    oneFile: await run("grep", { path: "/src/@tomlarkworthy/robocoop-5.js", pattern: "zzqqnomatch" }),
    regex: await run("grep", { path: "/src", pattern: "html\\`[\\s\\S]{1,200}\\.then" }),
    hit: await run("grep", { path: "/src", pattern: "robocoop5\\(", head_limit: 1 }),
  };
});
await close();
const hinted = s => /published on observablehq\.com/.test(s) && /import lines/.test(s) && /writing-cells-in-module-source/.test(s);
const checks = {
  grep_src_hinted: hinted(out.w33_grep_src),
  grep_id_hinted: hinted(out.w29_grep_src_id) && out.w29_grep_src_id.includes('module @tomlarkworthy/sticky'),
  glob_src_hinted: hinted(out.w33_glob_src) && out.w33_glob_src.includes('/@tomlarkworthy/sticky.js?v=4'),
  glob_content_hinted: hinted(out.w33_glob_content),
  one_file_quiet: out.oneFile === "(no matches)",
  regex_quiet: out.regex === "(no matches)",
  hit_unchanged: !hinted(out.hit) && out.hit.includes(":"),
};
for (const [k, v] of Object.entries(out)) console.log(k.padEnd(18), JSON.stringify(v.slice(0, 400)));
console.log(checks);
const ok = Object.values(checks).every(Boolean);
console.log(ok ? "PASS" : "FAIL");
process.exit(ok ? 0 : 1);
