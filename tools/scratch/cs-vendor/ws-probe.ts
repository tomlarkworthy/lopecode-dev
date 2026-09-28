// Does demo.webstrates.net accept a websocket from a file:// page (Origin: null)? Read-only: logs the first messages.
import { chromium } from "playwright";
import { writeFileSync } from "fs";
const b = await chromium.launch();
const c = await b.newContext({ ignoreHTTPSErrors: true });
const p = await c.newPage();
p.on("websocket", (ws) => {
  console.log("ws opened by page:", ws.url());
  ws.on("framereceived", (f) => console.log("  <-", String(f.payload).slice(0, 160)));
  ws.on("framesent", (f) => console.log("  ->", String(f.payload).slice(0, 160)));
  ws.on("socketerror", (e) => console.log("  socketerror", e));
});
const file = process.cwd() + "/tools/scratch/cs-vendor/blank.html";
writeFileSync(file, "<!doctype html><title>probe</title>");
await p.goto("file://" + file);
const r = await p.evaluate(() => new Promise((resolve) => {
  const out: any = { origin: location.origin, messages: [] };
  const ws = new WebSocket("wss://demo.webstrates.net/frontpage/");
  ws.onopen = () => { out.open = true; ws.send(JSON.stringify({ a: "s", c: "webstrates", d: "frontpage" })); };
  ws.onmessage = (e) => { out.messages.push(String(e.data).slice(0, 200)); if (out.messages.length >= 4) { ws.close(); resolve(out); } };
  ws.onerror = () => { out.error = true; };
  ws.onclose = (e) => { out.close = e.code; resolve(out); };
  setTimeout(() => resolve(out), 8000);
}));
console.log(JSON.stringify(r, null, 1));
await b.close();
