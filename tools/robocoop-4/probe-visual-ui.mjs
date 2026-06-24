// End-to-end visual prompting through the APP: attach a screenshot via the file input, send it, and confirm
// (1) the user bubble shows the image and (2) the vision model describes it. Uses the real key from .env.
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url"; import { dirname, join } from "node:path";
const here = dirname(fileURLToPath(import.meta.url));
function loadEnv(p){ try { for (const line of readFileSync(p,"utf8").split("\n")) { const t=line.trim(); if(!t||t.startsWith("#"))continue; const i=t.indexOf("="); if(i<0)continue; const k=t.slice(0,i).trim(); const v=t.slice(i+1).trim().replace(/^["']|["']$/g,""); if(k&&!(k in process.env))process.env[k]=v; } } catch {} }
loadEnv(join(here,".env")); loadEnv(join(here,"..","..",".env"));
const key = process.env.OPENROUTER_API_KEY; if (!key) { console.error("no OPENROUTER_API_KEY"); process.exit(1); }
const notebookPath = join(here, "..", "..", "lopebooks", "notebooks", "@tomlarkworthy_robocoop-4.html");
const layout = "S100(@tomlarkworthy/robocoop-4)";
const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext({ viewport: { width: 900, height: 800 } })).newPage();
page.on("pageerror", (e) => console.log("  [pageerror]", e.message.slice(0,160)));
await page.addInitScript(([k]) => { try { localStorage.setItem("OPENROUTER_API_KEY", k); localStorage.setItem("robocoop4_model","anthropic/claude-sonnet-4"); } catch {} }, [key]);
await page.goto(`file://${notebookPath}#view=${layout}`, { waitUntil:"load", timeout:30000 });
await page.waitForFunction(() => globalThis.__ojs_runtime?.mains?.size > 0, { timeout: 30000 });
await page.waitForTimeout(6000);

// attach the screenshot via the hidden file input, confirm a thumbnail appears
await page.setInputFiles('input[type="file"]', join(here, "ui-fixes.png"));
await page.waitForTimeout(800);
const thumbCount = await page.evaluate(() => document.querySelectorAll('div[style*="48px"] img, img[style*="48px"]').length);

await page.locator('textarea[placeholder^="Message robocoop-4"]').fill("In one sentence, what UI is in this image?");
await page.locator('button:has-text("Send")').click();

// user bubble should immediately show the attached image
await page.waitForTimeout(1200);
const userHasImg = await page.evaluate(() =>
  [...document.querySelectorAll("img")].some((im) => (im.src||"").startsWith("data:image")));

// inspect session.messages directly (source of truth) + wait for the assistant reply
const findMsgs = () => page.evaluate(() => {
  const reg = globalThis.__ojs_runtime; const s=new Set(); let sess=null;
  for (const m of reg.mains.values()){const rt=m?._runtime;if(!rt||s.has(rt))continue;s.add(rt);for(const v of rt._variables)if(v._name==="session")sess=v._value;}
  const msgs = sess?.messages || [];
  const userImg = msgs.find((m)=>m.role==="user"&&Array.isArray(m.content)&&m.content.some((p)=>p.type==="image_url"));
  const asst = [...msgs].reverse().find((m)=>m.role==="assistant"&&m.content);
  return { userMsgHasImage: !!userImg, assistant: asst ? String(asst.content).slice(0,220) : null };
});
let res = await findMsgs();
for (let i=0;i<40 && !res.assistant;i++){ await page.waitForTimeout(1500); res = await findMsgs(); }

console.log(JSON.stringify({ thumbCount, userHasImg, userMsgHasImage: res.userMsgHasImage, assistant: res.assistant || "(no reply — network may be blocked in sandbox)" }, null, 2));
await page.screenshot({ path: join(here, "visual-ui.png") });
await browser.close();
