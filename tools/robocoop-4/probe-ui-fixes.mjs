// Verify the two UI fixes: (1) settings inputs are legible (dark theme), (2) terminal autoscrolls to latest.
import { chromium } from "playwright";
import { fileURLToPath } from "node:url"; import { dirname, join } from "node:path";
const here = dirname(fileURLToPath(import.meta.url));
const notebookPath = join(here, "..", "..", "lopebooks", "notebooks", "@tomlarkworthy_robocoop-4.html");
const layout = "S100(@tomlarkworthy/robocoop-4)";
const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext({ viewport: { width: 900, height: 800 }, deviceScaleFactor: 2 })).newPage();
page.on("pageerror", (e) => console.log("  [pageerror]", e.message.slice(0,160)));
await page.addInitScript(() => { try { localStorage.setItem("OPENROUTER_API_KEY","sk-or-probe-key-1234567890"); localStorage.setItem("robocoop4_model","anthropic/claude-opus-4"); } catch {} });
await page.goto(`file://${notebookPath}#view=${layout}`, { waitUntil:"load", timeout:30000 });
await page.waitForFunction(() => globalThis.__ojs_runtime?.mains?.size > 0, { timeout: 30000 });
await page.waitForTimeout(6000);

// open settings + fill the terminal with long output
const metrics = await page.evaluate(async () => {
  const reg = globalThis.__ojs_runtime; const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
  document.querySelectorAll("details").forEach(d => d.open = true);
  function allVars(){const o=[];const s=new Set();for(const m of reg.mains.values()){const rt=m?._runtime;if(!rt||s.has(rt))continue;s.add(rt);for(const v of rt._variables)o.push(v);}return o;}
  const shell = allVars().find(v=>v._name==="rc4_agentShell")?._value;
  if (shell && shell.run) for (let i=1;i<=40;i++) { try { await shell.run("echo line-"+i); } catch {} }
  await sleep(800);
  const scroll = document.querySelector(".jb-term-scroll");
  const wrap = scroll?.closest("div[style*='35vh']");
  return scroll ? {
    scrollIsContainer: scroll.scrollHeight > scroll.clientHeight + 5,
    atBottom: scroll.scrollHeight - scroll.scrollTop - scroll.clientHeight < 40,
    scrollClientH: scroll.clientHeight, scrollH: scroll.scrollHeight, scrollTop: Math.round(scroll.scrollTop),
    wrapScrollsInstead: wrap ? (wrap.scrollHeight > wrap.clientHeight + 5) : null,
  } : { error: "no .jb-term-scroll found" };
});
console.log(JSON.stringify(metrics, null, 2));
await page.screenshot({ path: join(here, "ui-fixes.png") });
console.log("screenshot -> tools/robocoop-4/ui-fixes.png");
await browser.close();
