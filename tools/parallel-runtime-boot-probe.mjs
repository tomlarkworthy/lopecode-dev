import { chromium } from "playwright";
const b = await chromium.launch({ args: ["--no-sandbox", "--disable-setuid-sandbox"] });
const p = await b.newPage();
p.on("pageerror", (e) => console.log("PAGEERR", e.message.slice(0, 300)));
p.on("console", (m) => console.log("[" + m.type() + "]", m.text().slice(0, 180)));
p.on("crash", () => console.log("PAGE CRASHED"));
await p.goto("file:///tmp/parallel-runtime-qa-copy.html");
for (let i = 0; i < 12; i++) {
  await p.waitForTimeout(5000);
  const st = await p.evaluate(() => ({
    runtime: !!window.__ojs_runtime,
    parallel: window.__ojs_parallel ? { off: window.__ojs_parallel.offloaded, done: window.__ojs_parallel.completed, fb: window.__ojs_parallel.fallbacks } : null,
    text: document.body.innerText.slice(0, 120).replace(/\n/g, "|")
  })).catch((e) => ({ err: e.message.slice(0, 120) }));
  console.log("t+" + (i + 1) * 5 + "s", JSON.stringify(st));
}
await b.close();
