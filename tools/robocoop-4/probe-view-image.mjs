// Verify the view_image tool: write a PNG into the virtual fs, call view_image, confirm it reads the bytes,
// builds a data:image URL, and feeds it via ctx.attachImage (the agent-reads-an-image-FileAttachment path).
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url"; import { dirname, join } from "node:path";
const here = dirname(fileURLToPath(import.meta.url));
const notebookPath = join(here, "..", "..", "lopebooks", "notebooks", "@tomlarkworthy_robocoop-4.html");
const layout = "R100(S75(@tomlarkworthy/robocoop-4),S25(@tomlarkworthy/robocoop-4-hostbridge))";
const pngB64 = readFileSync(join(here, "ui-fixes.png")).toString("base64");
const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext()).newPage();
page.on("pageerror", (e) => console.log("  [pageerror]", e.message.slice(0,160)));
await page.addInitScript(() => { try { localStorage.setItem("OPENROUTER_API_KEY","sk-probe"); localStorage.setItem("robocoop4_model","x"); } catch {} });
await page.goto(`file://${notebookPath}#view=${layout}`, { waitUntil:"load", timeout:30000 });
await page.waitForFunction(() => globalThis.__ojs_runtime?.mains?.size > 0, { timeout: 30000 });
await page.waitForTimeout(7000);
const out = await page.evaluate(async (b64) => {
  const reg = globalThis.__ojs_runtime; const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
  function allVars(){const o=[];const s=new Set();for(const m of reg.mains.values()){const rt=m?._runtime;if(!rt||s.has(rt))continue;s.add(rt);for(const v of rt._variables)o.push(v);}return o;}
  const find=(n)=>allVars().find(v=>v._name===n);
  const force=async(n)=>{const v=find(n);if(v?._module?.value){try{v._module.value(n).catch(()=>{});}catch{}await sleep(300);}return v;};
  await force("rc4_workspace"); await force("hostSetup"); await sleep(1500);
  const fs = find("rc4_workspace")?._value?.fs;
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  await fs.writeFile("/content/probe-shot.png", bytes);
  const tools = find("viewof rc4_tools")?._value?.value || [];
  const view = new Map(tools.map(t=>[t.id,t])).get("view_image");
  if (!view) return { error: "view_image not registered" };
  let captured = null;
  const r = await view.execute({ file_path: "/content/probe-shot.png" }, { attachImage: (u) => { captured = u; } });
  return {
    output: r.output,
    attached: typeof captured === "string" && captured.startsWith("data:image/png;base64,"),
    dataUrlLen: captured ? captured.length : 0,
    rejectsNonImage: (await view.execute({ file_path: "/content/bootconf.json" }, { attachImage: () => {} })).output,
  };
}, pngB64);
console.log(JSON.stringify(out, null, 2));
await browser.close();
