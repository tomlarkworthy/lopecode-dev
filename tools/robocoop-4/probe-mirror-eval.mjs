// Verify the redesign end to end: eval_js registered (read_content gone), /content mirror populated,
// shell reads it, and eval_js decodes the gzipped bash attachment in userspace.
import { chromium } from "playwright";
import { fileURLToPath } from "node:url"; import { dirname, join } from "node:path";
const here = dirname(fileURLToPath(import.meta.url));
const notebookPath = join(here, "..", "..", "lopebooks", "notebooks", "@tomlarkworthy_robocoop-4.html");
const layout = "R100(S75(@tomlarkworthy/robocoop-4),S25(@tomlarkworthy/robocoop-4-hostbridge))";
const browser = await chromium.launch({ headless: true, args: ["--disable-background-timer-throttling"] });
const page = await (await browser.newContext()).newPage();
page.on("pageerror", (e) => console.log(`  [pageerror] ${e.message.slice(0, 160)}`));
await page.addInitScript(() => { try { localStorage.setItem("OPENROUTER_API_KEY","sk-probe"); localStorage.setItem("robocoop4_model","x"); } catch {} });
await page.goto(`file://${notebookPath}#view=${layout}`, { waitUntil: "load", timeout: 30000 });
await page.waitForFunction(() => globalThis.__ojs_runtime?.mains?.size > 0, { timeout: 30000 });
await page.waitForTimeout(7000); // let watch loop project modules + content mirror run
const out = await page.evaluate(async () => {
  const reg = globalThis.__ojs_runtime; const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
  function allVars(){const o=[];const s=new Set();for(const m of reg.mains.values()){const rt=m?._runtime;if(!rt||s.has(rt))continue;s.add(rt);for(const v of rt._variables)o.push(v);}return o;}
  const find=(n)=>allVars().find(v=>v._name===n);
  const force=async(n)=>{const v=find(n);if(v?._module?.value){try{v._module.value(n).catch(()=>{});}catch{}await sleep(250);if(v._promise?.then){try{await Promise.race([v._promise.catch(()=>{}),sleep(2500)]);}catch{}}}return v?._value;};
  const ws=await force("rc4_workspace"); const sh=await force("rc4_agentShell");
  const r={};
  const viewEl=find("viewof rc4_tools")?._value;
  const tools=(viewEl&&Array.isArray(viewEl.value))?viewEl.value:[];
  r.toolIds=tools.map(t=>t.id);
  // content mirror present?
  const paths=(ws.fs.getAllPaths?.()||[]).filter(p=>p.startsWith("/content/"));
  r.contentCount=paths.length;
  r.hasBootconf=paths.includes("/content/bootconf.json");
  r.hasBashAttach=paths.some(p=>p.endsWith("just-bash.browser.js.gz"));
  r.sampleContent=paths.slice(0,8);
  // shell can read mirror
  const run=async(c)=>{const x=await sh.run(c);return ((x.stdout||"")+(x.stderr?" ERR:"+x.stderr:"")+(x.exitCode?" [exit "+x.exitCode+"]":"")).slice(0,180);};
  r.catBootconf=await run("cat /content/bootconf.json");
  r.lsObservable=await run("ls /content/@observablehq/");
  // eval_js: decode the attachment in userspace
  const evalTool=tools.find(t=>t.id==="eval_js");
  r.haveEvalJs=!!evalTool;
  if(evalTool){
    r.evalSimple=(await evalTool.execute({module:"@tomlarkworthy/robocoop-4-bash", code:"1+2*3"},{})).output;
    r.evalDecode=(await evalTool.execute({module:"@tomlarkworthy/robocoop-4-bash", code:
      "const t = await new Response((await FileAttachment('just-bash.browser.js.gz').stream()).pipeThrough(new DecompressionStream('gzip'))).text();\nreturn t.length + ' chars, InMemoryFs:' + t.includes('InMemoryFs');"},{})).output;
    r.evalErr=(await evalTool.execute({module:"@tomlarkworthy/robocoop-4-bash", code:"return missingThing+1"},{})).output;
  }
  r.haveReadContent=tools.some(t=>t.id==="read_content");
  return r;
});
console.log(JSON.stringify(out,null,2));
await browser.close();
