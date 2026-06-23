// Verify the attachment mirror is REACTIVE: bash attachment present at boot (via all_module_files, not the
// DOM one-shot), then add an attachment at runtime via setFileAttachment and confirm /content updates.
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
await page.waitForTimeout(7000); // boot + first attachment mirror
const out = await page.evaluate(async () => {
  const reg = globalThis.__ojs_runtime; const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
  function allVars(){const o=[];const s=new Set();for(const m of reg.mains.values()){const rt=m?._runtime;if(!rt||s.has(rt))continue;s.add(rt);for(const v of rt._variables)o.push(v);}return o;}
  const find=(n)=>allVars().find(v=>v._name===n);
  const force=async(n)=>{const v=find(n);if(v?._module?.value){try{v._module.value(n).catch(()=>{});}catch{}await sleep(250);if(v._promise?.then){try{await Promise.race([v._promise.catch(()=>{}),sleep(2500)]);}catch{}}}return v?._value;};
  const ws=await force("rc4_workspace");
  // ensure the reactive cells are observed so they recompute on change
  await force("all_module_files"); await force("attachmentMirror");
  const contentAttach=()=> (ws.fs.getAllPaths?.()||[]).filter(p=>/^\/content\/[^/]+\/[^/]+\/.+/.test(p));
  const r={};
  r.bootAttachments=contentAttach();
  r.hasBashAttachAtBoot=r.bootAttachments.some(p=>p.endsWith("just-bash.browser.js.gz"));

  // add a NEW attachment at runtime to robocoop-4-bash, via the fileattachments API
  const currentModules=await force("currentModules");
  const bashMod=[...(currentModules||[])].map(([,i])=>i).find(i=>i&&i.name==="@tomlarkworthy/robocoop-4-bash")?.module;
  const setFileAttachment=await force("setFileAttachment");
  r.haveSetter=typeof setFileAttachment==="function"; r.haveBashMod=!!bashMod;
  if(setFileAttachment && bashMod){
    const file=new File([new Uint8Array([10,20,30,40,50])], "probe-added.bin", {type:"application/octet-stream"});
    try { await setFileAttachment(file, bashMod); } catch(e){ r.setErr=String(e?.message??e); }
    // wait for reactive chain: attachments -> all_module_files -> attachmentMirror -> writeFile
    for(let i=0;i<20;i++){ await sleep(300); if(contentAttach().some(p=>p.endsWith("probe-added.bin"))) break; }
  }
  r.afterAdd=contentAttach();
  r.reactiveAdded=r.afterAdd.some(p=>p.endsWith("probe-added.bin"));
  return r;
});
console.log(JSON.stringify(out,null,2));
await browser.close();
