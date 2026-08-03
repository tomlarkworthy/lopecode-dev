import { chromium } from "playwright";
const url = "file://" + process.cwd() + "/tools/worker-file-origin-probe.html";
const b = await chromium.launch({ args: ["--no-sandbox", "--disable-setuid-sandbox"] });
const p = await b.newPage();
p.on("console", m => { if (m.type() === "error") console.log("CONSOLE ERR:", m.text()); });
await p.goto(url);
await p.waitForFunction(() => /DONE|FATAL/.test(document.getElementById("out").textContent), null, { timeout: 90000 }).catch(()=>{});
console.log(await p.textContent("#out"));
await b.close();
