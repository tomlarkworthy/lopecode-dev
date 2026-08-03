import { chromium } from "playwright";
const b = await chromium.launch({ args: ["--no-sandbox", "--disable-setuid-sandbox"] });
const p = await b.newPage();
await p.addInitScript(() => {
  let n = 0;
  setInterval(() => {
    const st = window.__ojs_parallel;
    console.log("HB " + (++n) + " t=" + Math.round(performance.now()) +
      (st ? " off=" + st.offloaded + " done=" + st.completed + " fb=" + st.fallbacks + " main=" + st.screenedMain : " nopatch"));
  }, 500);
});
p.on("pageerror", (e) => console.log("PAGEERR", e.message.slice(0, 200)));
p.on("console", (m) => { const t = m.text(); if (t.startsWith("HB ") || m.type() === "error") console.log(t.slice(0, 140)); });
await p.goto("file:///tmp/parallel-runtime-qa-copy.html");
await new Promise((r) => setTimeout(r, 45000));
console.log("--- attempting evaluate ---");
const v = await Promise.race([
  p.evaluate(() => document.body.innerText.slice(0, 200).replace(/\n/g, "|")),
  new Promise((r) => setTimeout(() => r("EVALUATE HUNG"), 8000))
]);
console.log("evaluate:", v);
await b.close();
