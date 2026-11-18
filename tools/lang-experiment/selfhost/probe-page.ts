// Headless probe: what ss_language.check says of a type cell edited to its own text, in the specification
// module (cells built from spec*.ts) and in the checker module; and an edit of union that pushes onto its
// parameter. Run: bun selfhost/probe-page.ts <notebook.html>
import { chromium } from "../../../node_modules/playwright/index.mjs";
const file = process.argv[2];
const browser = await chromium.launch();
const page = await browser.newPage();
await page.route("**/*", (r) => (/^(file|blob|data):/.test(r.request().url()) ? r.continue() : r.abort()));
await page.goto(`file://${file}`);
await page.waitForFunction(() => { const rt = (window as any).__ojs_runtime; return rt?.mains?.get("@tomlarkworthy/soundscript")?._scope.get("ss_language")?._value; }, null, { timeout: 60000 });
const out = await page.evaluate(async () => {
  const rt = (window as any).__ojs_runtime, core = rt.mains.get("@tomlarkworthy/soundscript");
  const lang = core._scope.get("ss_language")._value;
  const res: string[] = [];
  for (const [label, mod] of [["spec", rt.mains.get("@tomlarkworthy/soundscript-spec")], ["checker", [...rt._variables].find((x: any) => x._name === "parser_lib")._module]] as const) {
    const vars = [...rt._variables].filter((v: any) => v._module === mod && typeof v._name === "string" && v._name.startsWith("$ss$type$"));
    for (const v of vars.slice(0, 3)) {
      const src = await lang.decompile([v]);
      const e = lang.check(src, [v], { module: { module: mod } });
      res.push(`${label} ${v._name}: state ${e.state}, store ${e.store}, problems ${JSON.stringify(e.problems)}, defs ${JSON.stringify(e.defs?.map((d: any) => d.name))}`);
    }
  }
  // an edit of union that pushes onto its parameter: the editor's check rejects it
  const cm = [...rt._variables].find((x: any) => x._name === "parser_lib")._module;
  const u = [...rt._variables].find((v: any) => v._module === cm && v._name === "union");
  const src = await lang.decompile([u]);
  const bad = src.replace("const flat = ts.flatMap(flatten);", "const flat = ts.flatMap(flatten);\n  ts.push(ERR);");
  const e = lang.check(bad, [u], { module: { module: cm } });
  res.push(`checker union edited to push onto ts (${bad !== src ? "edited" : "NOT edited"}): state ${e.state}, problems ${JSON.stringify(e.problems.map((p: any) => p.rule))}`);
  return res;
});
console.log(out.join("\n"));
await browser.close();
