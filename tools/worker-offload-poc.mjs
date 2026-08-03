import { chromium } from "playwright";
const b = await chromium.launch({ args: ["--no-sandbox", "--disable-setuid-sandbox"] });
const p = await b.newPage();
p.on("pageerror", e => console.log("PAGEERR", e.message));
p.on("console", m => { if (m.type()==="error") console.log("CONSOLE", m.text()); });
await p.goto("http://localhost:8917/tools/worker-offload-poc.html");
await p.waitForFunction(() => /DONE|FATAL/.test(document.getElementById("out").textContent), null, { timeout: 120000 }).catch(()=>console.log("(timeout)"));
console.log(await p.textContent("#out"));
await b.close();
