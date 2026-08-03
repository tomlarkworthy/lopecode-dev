import { chromium } from "playwright";
const b = await chromium.launch({ args: ["--no-sandbox", "--disable-setuid-sandbox"] });
const p = await b.newPage();
p.on("pageerror", (e) => console.log("PAGEERR", e.message.slice(0, 200)));
p.goto("file:///tmp/parallel-runtime-qa-copy.html", { timeout: 0 }).catch(() => {});
await new Promise((r) => setTimeout(r, 12000)); // let it wedge
const client = await p.context().newCDPSession(p);
await client.send("Debugger.enable");
const paused = new Promise((res) => client.on("Debugger.paused", (ev) => res(ev)));
await client.send("Debugger.pause");
const ev = await Promise.race([paused, new Promise((r) => setTimeout(() => r(null), 5000))]);
if (!ev) { console.log("could not pause (not wedged in JS?)"); }
else {
  console.log("=== wedged stack (top 15 frames) ===");
  for (const f of ev.callFrames.slice(0, 15)) {
    console.log((f.functionName || "(anon)") + "   " + (f.url || "").slice(-60) + ":" + f.location.lineNumber);
  }
}
await b.close();
