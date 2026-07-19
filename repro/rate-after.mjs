// Start the profiler AFTER the page (and its audio graph) is fully up. usage: node repro/rate-after.mjs <reps> <url>...
import pw from '/Users/tom.larkworthy/dev/lopecode-dev/node_modules/playwright/index.js';
const { chromium } = pw;
const CATS = { transferMode: 'ReportEvents', traceConfig: { recordMode: 'recordUntilFull', includedCategories: ['-*','disabled-by-default-v8.cpu_profiler'] } };
const reps = Number(process.argv[2]);
async function run(url){
  const browser = await chromium.launch({ headless:false });
  const ctx = await browser.newContext(); const page = await ctx.newPage(); const cdp = await ctx.newCDPSession(page);
  let crashed=false; page.on('crash',()=>{crashed=true;});
  try { await page.goto(url,{waitUntil:'load',timeout:120000}); } catch {}
  await page.waitForTimeout(9000);            // audio graph fully running
  try { await cdp.send('Tracing.start', CATS); } catch {}
  await page.waitForTimeout(12000);
  await browser.close().catch(()=>{});
  return crashed;
}
for (const u of process.argv.slice(3)) { let n=0; for (let i=0;i<reps;i++) if (await run(u)) n++; console.log(`${n}/${reps}  ${u.replace(/^file:\/\/.*\//,'')}`); }
