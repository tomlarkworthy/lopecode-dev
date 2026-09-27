// Walk the apply path by hand in the live page: findCell -> language -> compile/defineJsCell.
import { chromium } from "playwright";
const url = process.argv[2];
const b = await chromium.launch({ headless: !process.env.HEADED, args: ["--disable-web-security"] });
const p = await (await b.newContext()).newPage();
await p.goto(url, { waitUntil: "domcontentloaded", timeout: 120000 });
const frame = await (async () => {
  for (let i = 0; i < 120; i++) {
    const f = p.frames().find((f) => /observableusercontent/.test(f.url()));
    if (f) { try { if (await f.evaluate(() => document.querySelectorAll(".observablehq").length > 0)) return f; } catch {} }
    await p.waitForTimeout(1000);
  }
  throw new Error("no notebook frame");
})();
for (let s = 0; s < 12; s++) { await frame.evaluate((k) => window.scrollTo(0, k * 1400), s).catch(() => {}); await p.waitForTimeout(600); }
await frame.evaluate(() => window.scrollTo(0, 0)).catch(() => {});
let prev = -1;
for (let i = 0; i < 40; i++) {
  const n = await frame.evaluate(() => document.querySelectorAll(".cm-editor").length);
  if (n === prev && n > 0) break; prev = n; await p.waitForTimeout(1000);
}
console.log(JSON.stringify(await frame.evaluate(async () => {
  const rt = (window as any).__ojs_runtime;
  const val = (n: string) => [...rt._variables].find((v: any) => v._name === n && v._value !== undefined)?._value;
  const out: any = {};
  const SRC = "title = md`# EDIT PROBE OK`";
  const findCell = val("findCell"), title_variable = val("title_variable");
  out.haveFindCell = typeof findCell; out.haveTitleVar = !!title_variable;
  out.titleVarName = title_variable?._name ?? null;
  let cell: any = null;
  try { cell = findCell(title_variable); } catch (e) { out.findCellThrew = String(e).slice(0, 160); }
  out.cell = cell === null ? "null" : cell === undefined ? "undefined" : {
    keys: Object.keys(cell), vars: (cell.variables ?? []).map((v: any) => v?._name),
    hasModule: !!cell.module, hasModuleModule: !!cell.module?.module, lang: cell.lang ?? null,
  };
  for (const fn of ["sourceLanguage", "cellLanguage", "displayStateOf", "compile", "defineJsCell", "decompile", "realize"])
    out[fn] = typeof val(fn);
  if (cell) {
    try { out.cellLanguage = val("cellLanguage")(cell.variables, cell); } catch (e) { out.cellLanguage = "THREW " + String(e).slice(0, 120); }
    try { out.sourceLanguage = val("sourceLanguage")(SRC, cell.variables, cell); } catch (e) { out.sourceLanguage = "THREW " + String(e).slice(0, 120); }
    try { const c = val("compile")(SRC); out.compile = c.map((v: any) => ({ name: v._name, inputs: v._inputs })); }
    catch (e) { out.compile = "THREW " + String(e).slice(0, 160); }
    // the real call, with its swallow defeated by watching console.error
    const errs: string[] = []; const orig = console.error;
    console.error = (...a: any[]) => { errs.push(a.map(String).join(" ").slice(0, 300)); };
    let res: any;
    try { res = await val("compile_and_update")(SRC, cell.variables, cell); }
    catch (e) { errs.push("OUTER THREW " + String(e).slice(0, 200)); }
    finally { console.error = orig; }
    out.compileAndUpdate = { returned: typeof res === "string" ? res.slice(0, 120) : String(res), swallowed: errs };
    out.titleAfter = String(val("title")?.textContent ?? val("title")).slice(0, 80);
  }
  return out;
}), null, 1));
await b.close();
