// Runs the rule cells that need a live runtime (srctools' rule_afterModuleWrite_*): shape, the fires and silent
// test cells, and a mutant per rule (check disabled) that the fires test must fail on.
//   node tools/robocoop-5/rule-tests-browser.mjs [notebook.html]
import { chromium } from "playwright";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const NB = resolve(process.argv[2] ?? join(here, "../../lopebooks/notebooks/@tomlarkworthy_robocoop-5.html"));
const MODULE = "@tomlarkworthy/robocoop-5-srctools";
const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext()).newPage();
await page.goto(`file://${NB}#view=R100(S75(@tomlarkworthy/robocoop-5),S25(${MODULE}))`, { waitUntil: "load", timeout: 30000 });
await page.waitForFunction((m) => globalThis.__ojs_runtime?.mains?.get(m), MODULE, { timeout: 30000 });
const rows = await page.evaluate(async (MODULE) => {
  const rt = globalThis.__ojs_runtime, mod = rt.mains.get(MODULE);
  const vars = () => [...rt._variables].filter((v) => v._module === mod);
  const within = (p, ms) => Promise.race([p, new Promise((_, no) => setTimeout(() => no(new Error("no value after " + ms + "ms")), ms))]);
  await within(mod.value("hostSetup"), 30000);
  // the tests that write are off on a reader's page; turn them on and recompute the ones that already answered
  (await mod.value("rc5_ruleFixture")).allow = true;
  for (const v of vars().filter((v) => /^test_rule_/.test(v._name ?? ""))) mod.redefine(v._name, v._inputs.map((i) => i._name), v._definition);
  const out = [];
  for (const v of vars().filter((v) => /^rule_afterModuleWrite_/.test(v._name ?? ""))) {
    const name = v._name, id = name.slice("rule_afterModuleWrite_".length), row = { name };
    try {
      const rule = await within(mod.value(name), 20000);
      row.shape = rule.hook === "afterModuleWrite" && rule.id === id && typeof rule.order === "number" && typeof rule.check === "function" && typeof rule.evidence?.what === "string";
      for (const t of ["fires", "silent"])
        row[t] = await within(mod.value(`test_rule_${id}_${t}`), 60000).then((x) => "ok: " + String(x).slice(0, 70), (e) => "FAIL: " + (e?.message ?? e));
      // the fires test may report that the page cannot exercise the rule; then a mutant proves nothing
      if (/^ok: (no spec module|metrics module not loadable)/.test(row.fires)) row.mutant = "not run: " + row.fires.slice(4);
      else {
        const inputs = v._inputs.map((i) => i._name), def = v._definition;
        mod.redefine(name, [], () => ({ ...rule, check: () => null }));
        row.mutant = await within(mod.value(`test_rule_${id}_fires`), 60000).then((x) => "SURVIVED: " + String(x).slice(0, 70), () => "killed");
        mod.redefine(name, inputs, def);
        await within(mod.value(name), 20000);
      }
    } catch (e) { row.error = String(e?.message ?? e); }
    out.push(row);
  }
  return out;
}, MODULE);
await browser.close();
let bad = rows.length < 6;
for (const r of rows) {
  const ok = !r.error && r.shape && r.fires.startsWith("ok") && r.silent.startsWith("ok") && !/not run: this test/.test(r.fires + r.silent) && !r.mutant.startsWith("SURVIVED");
  if (!ok) bad = true;
  console.log(`${ok ? "ok  " : "FAIL"}  ${r.name}\n        fires  ${r.fires}\n        silent ${r.silent}\n        mutant ${r.mutant}${r.error ? "\n        error  " + r.error : ""}`);
}
console.log(`RULE TESTS, BROWSER: ${bad ? "FAIL" : "PASS"} (${rows.length} rules)`);
process.exit(bad ? 1 : 0);
