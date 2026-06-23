// Verify inspect_value/list_values register into rc4_tools and actually read live values + runtime errors.
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const here = dirname(fileURLToPath(import.meta.url));
const notebookPath = join(here, "..", "..", "lopebooks", "notebooks", "@tomlarkworthy_robocoop-4.html");
const layout = "R100(S75(@tomlarkworthy/robocoop-4),S25(@tomlarkworthy/robocoop-4-hostbridge))";
const browser = await chromium.launch({ headless: true, args: ["--disable-background-timer-throttling"] });
const page = await (await browser.newContext()).newPage();
page.on("pageerror", (e) => console.log(`  [pageerror] ${e.message.slice(0, 200)}`));
await page.addInitScript(() => { try { localStorage.setItem("OPENROUTER_API_KEY", "sk-probe"); localStorage.setItem("robocoop4_model", "x"); } catch {} });
await page.goto(`file://${notebookPath}#view=${layout}`, { waitUntil: "load", timeout: 30000 });
await page.waitForFunction(() => globalThis.__ojs_runtime?.mains?.size > 0, { timeout: 30000 });
await page.waitForTimeout(4000);
const out = await page.evaluate(async () => {
  const reg = globalThis.__ojs_runtime; const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  function allVars() { const o = []; const s = new Set(); for (const m of reg.mains.values()) { const rt = m?._runtime; if (!rt || s.has(rt)) continue; s.add(rt); for (const v of rt._variables) o.push(v); } return o; }
  const find = (n) => allVars().find((v) => v._name === n);
  const force = async (n) => { const v = find(n); if (v?._module?.value) { try { v._module.value(n).catch(() => {}); } catch {} await sleep(250); if (v._promise?.then) { try { await Promise.race([v._promise.catch(() => {}), sleep(2500)]); } catch {} } } return v?._value; };
  const r = {};
  // ensure host mount ran (registers tools)
  await force("rc4_workspace");
  const viewEl = find("viewof rc4_tools")?._value;
  const tools = viewEl && Array.isArray(viewEl.value) ? viewEl.value : [];
  r.registeredToolIds = tools.map((t) => t.id);
  const inspect = tools.find((t) => t.id === "inspect_value");
  const list = tools.find((t) => t.id === "list_values");
  r.haveInspect = !!inspect; r.haveList = !!list;

  // seed a module: named cell, runtime-erroring cell, ANONYMOUS cell (pid _anon, name null), and a viewof
  const ws = await force("rc4_workspace");
  const file =
    "const _score=function score(){ return [1,2,3,4,5].reduce((a,b)=>a+b,0)*7 };\n" +
    "const _broken=function broken(){ return notDefinedAnywhere + 1 };\n" +
    "const _anon=function _anon(){ return 6*7 };\n" +
    "const _knob=function knob(Inputs){ return Inputs.range([0,10],{value:3}) };\n" +
    "export default function define(runtime, observer){ const main=runtime.module(); const $=(p,n,d,f)=>main.variable(observer(n)).define(n,d,f).pid=p;" +
    " $('_score','score',[],_score); $('_broken','broken',[],_broken); $('_anon',null,[],_anon);" +
    " main.define('Inputs', ['md'], ()=>undefined); $('_knob','viewof knob',['Inputs'],_knob);" +
    " main.variable(observer('knob')).define('knob',['Generators','viewof knob'],(G,_)=>G.input(_)); return main; }\n";
  // (Inputs is a real builtin in the runtime; the placeholder above is overwritten by the bundle's Inputs.)
  const file2 = file.replace("main.define('Inputs', ['md'], ()=>undefined); ", "");
  try { if (ws.fs.mkdir) { try { await ws.fs.mkdir("/notebook/@user", { recursive: true }); } catch {} } await ws.fs.writeFile("/notebook/@user/probeval.js", file2); } catch (e) { r.writeErr = String(e?.message ?? e); }
  await sleep(3500); // watch loop applies

  if (inspect) {
    r.inspectScore_byName = (await inspect.execute({ module: "@user/probeval", name: "score" }, {})).output;
    r.inspectScore_byPid = (await inspect.execute({ module: "@user/probeval", pid: "_score" }, {})).output;
    r.inspectBroken = (await inspect.execute({ module: "@user/probeval", name: "broken" }, {})).output;
    r.inspectAnon_byPid = (await inspect.execute({ module: "@user/probeval", pid: "_anon" }, {})).output; // anonymous: ONLY pid works
    r.inspectAnon_byName = (await inspect.execute({ module: "@user/probeval", name: "_anon" }, {})).output; // should not resolve by name
    r.inspectMissing = (await inspect.execute({ module: "@user/nope", name: "x" }, {})).output;
    r.inspectNoArgs = (await inspect.execute({ module: "@user/probeval" }, {})).output;
  }
  if (list) {
    r.listOutput = (await list.execute({ module: "@user/probeval" }, {})).output;
  }
  return r;
});
console.log(JSON.stringify(out, null, 2));
await browser.close();
