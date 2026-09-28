// file:// page + patched webstrates.js: does it load the server doc, push a local edit, receive a remote one?
import { chromium } from "playwright";
import { readFileSync } from "fs";
const dir = process.cwd() + "/tools/scratch/cs-vendor";
const id = readFileSync(dir + "/synctest.id", "utf8").trim();
const b = await chromium.launch();
const c = await b.newContext({ ignoreHTTPSErrors: true });
const [p, q] = [await c.newPage(), await c.newPage()];
for (const [n, pg] of [["A", p], ["B", q]] as const) {
  pg.on("pageerror", (e) => console.log(n, "[pageerror]", String(e).slice(0, 200)));
  pg.on("console", (m) => console.log(n, "[" + m.type() + "]", m.text().slice(0, 200)));
}
await p.goto(`file://${dir}/synctest.html`);
await p.waitForFunction(() => (window as any).webstrate?.loaded, null, { timeout: 20000 }).catch(() => console.log("A: loaded flag not seen"));
console.log("A body:", await p.evaluate(() => document.documentElement.outerHTML.slice(0, 400)));
await p.evaluate(() => { document.getElementById("p")!.textContent = "edited from file:// " + Date.now(); });
await p.waitForTimeout(2000);
const raw = await (await c.request.get(`https://demo.webstrates.net/${id}/?raw`)).text();
console.log("server ?raw after A edit:", raw.slice(0, 300));
// B: the server-hosted page, the ordinary Webstrates client
await q.goto(`https://demo.webstrates.net/${id}/`);
await q.waitForFunction(() => (window as any).webstrate?.loaded, null, { timeout: 20000 });
await q.evaluate(() => { const e = document.createElement("p"); e.id = "fromB"; e.textContent = "added on the server page"; document.body.append(e); });
await p.waitForTimeout(2000);
console.log("A sees B's element:", await p.evaluate(() => document.getElementById("fromB")?.textContent ?? null));
await b.close();
