// Verify the Claude-Code-style file tools (read_file/write_file/edit_file) are registered and that edit_file
// gives COMPILE FEEDBACK: a good edit applies + reports cells changed; a syntax-breaking edit reports FAILED
// TO COMPILE and leaves the live runtime intact; non-unique old_string errors; read/write round-trip.
import { chromium } from "playwright";
import { fileURLToPath } from "node:url"; import { dirname, join } from "node:path";
const here = dirname(fileURLToPath(import.meta.url));
const notebookPath = join(here, "..", "..", "lopebooks", "notebooks", "@tomlarkworthy_robocoop-4.html");
const layout = "R100(S75(@tomlarkworthy/robocoop-4),S25(@tomlarkworthy/robocoop-4-hostbridge))";
const browser = await chromium.launch({ headless: true, args: ["--disable-background-timer-throttling"] });
const page = await (await browser.newContext()).newPage();
page.on("pageerror", (e) => console.log("  [pageerror]", e.message.slice(0, 160)));
await page.addInitScript(() => { try { localStorage.setItem("OPENROUTER_API_KEY","sk-probe"); localStorage.setItem("robocoop4_model","x"); } catch {} });
await page.goto(`file://${notebookPath}#view=${layout}`, { waitUntil: "load", timeout: 30000 });
await page.waitForFunction(() => globalThis.__ojs_runtime?.mains?.size > 0, { timeout: 30000 });
await page.waitForTimeout(7000);
const out = await page.evaluate(async () => {
  const reg = globalThis.__ojs_runtime; const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
  function allVars(){const o=[];const s=new Set();for(const m of reg.mains.values()){const rt=m?._runtime;if(!rt||s.has(rt))continue;s.add(rt);for(const v of rt._variables)o.push(v);}return o;}
  const find=(n)=>allVars().find(v=>v._name===n);
  const force=async(n)=>{const v=find(n);if(v?._module?.value){try{v._module.value(n).catch(()=>{});}catch{}await sleep(300);if(v._promise?.then){try{await Promise.race([v._promise.catch(()=>{}),sleep(3000)]);}catch{}}}return v?._value;};
  const r = {};
  const ws = await force("rc4_workspace");
  await force("hostSetup"); await sleep(2000);                 // run mount → registers tools into the view
  const tools = find("viewof rc4_tools")?._value?.value || []; // the live registry is the viewof's value
  const byId = new Map(tools.map(t=>[t.id,t]));
  r.registered = tools.map(t=>t.id);
  r.haveFileTools = ["read_file","write_file","edit_file"].every(id=>byId.has(id));
  const edit = byId.get("edit_file"), write = byId.get("write_file"), read = byId.get("read_file");
  if (!edit) return r;

  // pick a small live module to edit safely: robocoop-4-tools (its doc cell title)
  const path = "/notebook/@tomlarkworthy/robocoop-4-tools.js";
  const before = await read.execute({ file_path: path }, {});
  r.readWorks = /function/.test(before.output) && /\t/.test(before.output);

  // 1. write a scratch non-module file + read back
  const w = await write.execute({ file_path: "/notebook/scratch.txt", content: "hello world" }, {});
  const rb = await read.execute({ file_path: "/notebook/scratch.txt" }, {});
  r.writeRoundTrip = /hello world/.test(rb.output);

  // 2. good edit to a live module — flip a harmless literal, expect "applied live"
  // find an existing unique literal in the file (use the module's seed comment or a string)
  const raw = (typeof (await ws.fs.readFile(path))==="string") ? await ws.fs.readFile(path) : new TextDecoder().decode(await ws.fs.readFile(path));
  const marker = raw.includes("registerTool") ? "registerTool" : null;
  // edit a comment-safe spot: append a harmless cell? simplest: replace a unique whitespace-safe token in a doc string.
  // Use a guaranteed-unique injected scratch: first write a known cell via write? Keep it light — test the
  // good-edit path on the scratch module instead, where we control compilation.
  const modPath = "/notebook/@user/probe-edit.js";
  const goodMod = [
    'const _v = function _v(){return( 6*7 )};',
    'export default function define(runtime, observer){',
    '  const main = runtime.module();',
    '  const $def=(pid,name,deps,fn)=>{main.variable(observer(name)).define(name,deps,fn).pid=pid;};',
    '  $def("p_v","probe_val",[],_v);',
    '  return main;',
    '}'
  ].join("\n");
  const wm = await write.execute({ file_path: modPath, content: goodMod }, {});
  r.writeModuleMsg = wm.output;
  await sleep(800);
  r.writeApplied = /applied live/.test(wm.output);

  // 3. good edit: 6*7 -> 7*8, expect applied + value updates to 56
  const e1 = await edit.execute({ file_path: modPath, old_string: "6*7", new_string: "7*8" }, {});
  r.goodEditMsg = e1.output;
  r.goodEditApplied = /applied live/.test(e1.output);
  await sleep(800);
  const pv = await force("probe_val");
  r.liveValueAfterGoodEdit = pv;

  // 4. bad edit: introduce a syntax error, expect FAILED TO COMPILE + live value still 56
  const e2 = await edit.execute({ file_path: modPath, old_string: "7*8", new_string: "7*(8" }, {});
  r.badEditMsg = e2.output;
  r.badEditReported = /FAILED TO COMPILE/.test(e2.output);
  await sleep(800);
  const pv2 = await force("probe_val");
  r.liveValueAfterBadEdit = pv2;   // should still be 56 (runtime untouched)

  // 5. non-unique old_string error
  const e3 = await edit.execute({ file_path: modPath, old_string: "main", new_string: "main" }, {});
  r.identicalErr = /identical/.test(e3.output);
  const e4 = await edit.execute({ file_path: modPath, old_string: "runtime", new_string: "RT" }, {});
  r.nonUniqueErr = /not unique/.test(e4.output);
  const e5 = await edit.execute({ file_path: modPath, old_string: "zzzz-not-present", new_string: "x" }, {});
  r.notFoundErr = /not found/.test(e5.output);
  return r;
});
console.log(JSON.stringify(out, null, 2));
await browser.close();
