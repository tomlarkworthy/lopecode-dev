import { chromium } from "playwright";
const url = process.argv[2];
const b = await chromium.launch({ args: ["--no-sandbox", "--disable-setuid-sandbox"] });
const p = await b.newPage();
await p.addInitScript(() => { let n = 0; setInterval(() => console.log("HB " + (++n)), 1000); });
let hb = 0;
p.on("console", (m) => { if (m.text().startsWith("HB")) hb = Number(m.text().slice(3)); });
p.goto(url, { timeout: 0 }).catch(() => {});
await new Promise((r) => setTimeout(r, 15000));
const alive = await Promise.race([
  p.evaluate(() => "evaluate-ok, body: " + document.body.innerText.slice(0, 80).replace(/\n/g, "|")),
  new Promise((r) => setTimeout(() => r("EVALUATE HUNG"), 6000))
]);
console.log(url.split("/").pop(), "-> heartbeats:", hb, "|", alive);
await b.close();
process.exit(0);
