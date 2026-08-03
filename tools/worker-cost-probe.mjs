import { chromium } from "playwright";
const b = await chromium.launch({ args: ["--no-sandbox", "--disable-setuid-sandbox"] });
const p = await b.newPage();
p.on("pageerror", e => console.log("PAGEERR", e.message));
await p.goto("file://" + process.cwd() + "/tools/worker-cost-probe.html");
await p.waitForFunction(() => /DONE|FATAL/.test(document.getElementById("out").textContent), null, { timeout: 240000 }).catch(()=>console.log("(timeout)"));
console.log(await p.textContent("#out"));
await b.close();
