// Verify watch_variable streams live value changes via rc4_watchBus: set a watch (baseline not streamed),
// change the cell with edit_file, confirm the new value drains from the bus; unwatch stops further streaming.
import { chromium } from "playwright";
import { fileURLToPath } from "node:url"; import { dirname, join } from "node:path";
const here = dirname(fileURLToPath(import.meta.url));
const notebookPath = join(here, "..", "..", "lopebooks", "notebooks", "@tomlarkworthy_robocoop-4.html");
const layout = "R100(S75(@tomlarkworthy/robocoop-4),S25(@tomlarkworthy/robocoop-4-hostbridge))";
const browser = await chromium.launch({ headless: true, args: ["--disable-background-timer-throttling"] });
const page = await (await browser.newContext()).newPage();
page.on("pageerror", (e) => console.log("  [pageerror]", e.message.slice(0,160)));
await page.addInitScript(() => { try { localStorage.setItem("OPENROUTER_API_KEY","sk-probe"); localStorage.setItem("robocoop4_model","x"); } catch {} });
await page.goto(`file://${notebookPath}#view=${layout}`, { waitUntil:"load", timeout:30000 });
await page.waitForFunction(() => globalThis.__ojs_runtime?.mains?.size > 0, { timeout: 30000 });
await page.waitForTimeout(7000);
const out = await page.evaluate(async () => {
  const reg = globalThis.__ojs_runtime; const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
  function allVars(){const o=[];const s=new Set();for(const m of reg.mains.values()){const rt=m?._runtime;if(!rt||s.has(rt))continue;s.add(rt);for(const v of rt._variables)o.push(v);}return o;}
  const find=(n)=>allVars().find(v=>v._name===n);
  const force=async(n)=>{const v=find(n);if(v?._module?.value){try{v._module.value(n).catch(()=>{});}catch{}await sleep(300);if(v._promise?.then){try{await Promise.race([v._promise.catch(()=>{}),sleep(3000)]);}catch{}}}return v?._value;};
  const r = {};
  await force("rc4_workspace"); await force("hostSetup"); await force("rc4_watchBus"); await sleep(1500);
  const tools = find("viewof rc4_tools")?._value?.value || [];
  const byId = new Map(tools.map(t=>[t.id,t]));
  const bus = find("rc4_watchBus")?._value;
  r.haveWatchTools = ["watch_variable","unwatch_variable"].every(id=>byId.has(id));
  r.haveBus = !!bus && typeof bus.drain === "function";
  if (!r.haveWatchTools || !r.haveBus) return r;
  const write = byId.get("write_file"), edit = byId.get("edit_file"), watch = byId.get("watch_variable"), unwatch = byId.get("unwatch_variable");

  // seed a scratch module with a named cell probe_val = 6*7
  const mod = "@user/wtest";
  const path = "/notebook/@user/wtest.js";
  const src = [
    'const _v = function _v(){return( 6*7 )};',
    'export default function define(runtime, observer){',
    '  const main = runtime.module();',
    '  const $def=(pid,name,deps,fn)=>{main.variable(observer(name)).define(name,deps,fn).pid=pid;};',
    '  $def("p_v","probe_val",[],_v);',
    '  return main;',
    '}'
  ].join("\n");
  r.writeMsg = (await write.execute({ file_path: path, content: src }, {})).output;
  await sleep(800);

  // watch it — baseline should be reported, and NOT streamed
  const w = await watch.execute({ module: mod, name: "probe_val" }, {});
  r.watchMsg = w.output;
  r.baselineReported = /42/.test(w.output);
  await sleep(500);
  r.drainAfterWatch = bus.drain();           // expect [] — baseline not streamed

  // change the value via edit_file; the watch should stream the new value
  const e = await edit.execute({ file_path: path, old_string: "6*7", new_string: "7*8" }, {});
  r.editMsg = e.output;
  for (let i=0;i<15;i++){ await sleep(300); const d = bus.drain(); if (d.length){ r.drainAfterEdit = d; break; } if (i===14) r.drainAfterEdit = []; }

  // unwatch, change again — should NOT stream
  r.unwatchMsg = (await unwatch.execute({ module: mod, name: "probe_val" }, {})).output;
  await edit.execute({ file_path: path, old_string: "7*8", new_string: "9*9" }, {});
  let after = [];
  for (let i=0;i<8;i++){ await sleep(300); const d = bus.drain(); if (d.length){ after = d; break; } }
  r.drainAfterUnwatch = after;   // expect [] — no longer watching
  return r;
});
console.log(JSON.stringify(out, null, 2));
await browser.close();
