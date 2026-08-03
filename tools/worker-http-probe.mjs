import { chromium } from "playwright";
const b = await chromium.launch({ args: ["--no-sandbox", "--disable-setuid-sandbox"] });
const p = await b.newPage();
await p.goto("http://localhost:8917/tools/worker-file-origin-probe.html");
await p.waitForFunction(() => /DONE|FATAL/.test(document.getElementById("out").textContent), null, { timeout: 90000 }).catch(()=>{});
console.log(await p.textContent("#out"));
await b.close();
