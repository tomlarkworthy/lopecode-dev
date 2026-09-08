import { chromium } from "playwright";
const b = await chromium.launch({ headless: true });
const p = await b.newPage({ viewport: { width: 1000, height: 700 } });
p.on("console", m => console.log(`[${m.type()}] ${m.text().slice(0,200)}`));
p.on("pageerror", e => console.log(`[pageerror] ${e.message.slice(0,200)}`));
await p.goto(process.argv[2], { waitUntil: "load", timeout: 60000 });
await p.waitForTimeout(Number(process.argv[3] ?? 20000));
console.log("BODY:", (await p.evaluate(() => document.body.innerText)).slice(0, 800));
await b.close();
