// Settle the network-eval design: does a cell resolve a fetch? Test bare `fetch` vs `window.fetch` in a
// /notebook cell, with a Playwright route fulfilling the sentinel URL. Confirms route interception reaches
// the notebook's fetch path and tells us how the agent must write the cell.
import { chromium } from "playwright";
import { fileURLToPath } from "node:url"; import { dirname, join } from "node:path";
const here = dirname(fileURLToPath(import.meta.url));
const notebookPath = join(here, "..", "..", "lopebooks", "notebooks", "@tomlarkworthy_robocoop-4.html");
const layout = "R100(S75(@tomlarkworthy/robocoop-4),S25(@tomlarkworthy/robocoop-4-hostbridge))";
const URL_ = "https://eval.test/user.json";
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext();
await ctx.route(URL_, (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ name: "Ada", id: 42 }) }));
const page = await ctx.newPage();
page.on("pageerror", (e) => console.log("  [pageerror]", e.message.slice(0,160)));
await page.addInitScript(() => { try { localStorage.setItem("OPENROUTER_API_KEY","sk-probe"); localStorage.setItem("robocoop4_model","x"); } catch {} });
await page.goto(`file://${notebookPath}#view=${layout}`, { waitUntil:"load", timeout:30000 });
await page.waitForFunction(() => globalThis.__ojs_runtime?.mains?.size > 0, { timeout: 30000 });
await page.waitForTimeout(7000);
const out = await page.evaluate(async (url) => {
  const reg = globalThis.__ojs_runtime; const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
  function allVars(){const o=[];const s=new Set();for(const m of reg.mains.values()){const rt=m?._runtime;if(!rt||s.has(rt))continue;s.add(rt);for(const v of rt._variables)o.push({v,mod:v._module});}return o;}
  const find=(n)=>allVars().find(x=>x.v._name===n)?.v;
  const force=async(n)=>{const v=find(n);if(v?._module?.value){try{v._module.value(n).catch(()=>{});}catch{}await sleep(300);}return v;};
  await force("rc4_workspace"); await force("hostSetup"); await sleep(1500);
  const tools = find("viewof rc4_tools")?._value?.value || [];
  const write = new Map(tools.map(t=>[t.id,t])).get("write_file");
  const r = {};
  const src = (id, body) => [
    'const _x = function _x(){return( ' + body + ' )};',
    'export default function define(runtime, observer){',
    '  const main = runtime.module();',
    '  const $def=(pid,name,deps,fn)=>{main.variable(observer(name)).define(name,deps,fn).pid=pid;};',
    '  $def("p_x","' + id + '",[],_x);',
    '  return main;',
    '}'
  ].join("\n");
  r.haveWrite = !!write;
  r.w1 = (await write.execute({ file_path: "/notebook/@user/netw.js", content: src("netW", 'window.fetch("'+url+'").then(r=>r.json())') }, {})).output;
  r.w2 = (await write.execute({ file_path: "/notebook/@user/netb.js", content: src("netB", 'fetch("'+url+'").then(r=>r.json())') }, {})).output;
  await sleep(3000);
  r.userVars = allVars().map(x=>x.v._name).filter(n=>/net|probe/i.test(String(n)));
  const read = async (mod, name) => {
    const v = allVars().find(x=>x.v._name===name)?.v;
    if (!v) return "(no var)";
    try { v._module.value(name).catch(()=>{}); } catch {}
    await sleep(300);
    try { await Promise.race([v._promise, sleep(3000)]); } catch {}
    if (v._error) return "ERR: " + (v._error.message||v._error);
    try { return JSON.stringify(v._value); } catch { return String(v._value); }
  };
  r.windowFetch = await read("@user/netw", "netW");
  r.bareFetch = await read("@user/netb", "netB");
  return r;
}, URL_);
console.log(JSON.stringify(out, null, 2));
await browser.close();
