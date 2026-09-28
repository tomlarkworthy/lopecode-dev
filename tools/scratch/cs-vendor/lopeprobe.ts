// Load a lopecode notebook hosted as a webstrate; does it boot, and does rendering write ops?
import { chromium } from "playwright";
const url = process.argv[2]!, out = process.argv[3]!;
const b = await chromium.launch();
const c = await b.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1280, height: 800 } });
const ver = async () => (await (await c.request.get(url + "?v")).json()).version;
console.log("version before:", await ver());
const p = await c.newPage();
const errs: string[] = [];
let opsSent = 0, opBytes = 0;
p.on("websocket", (ws) => ws.on("framesent", (f) => { const s = String(f.payload); if (s.includes('"a":"op"')) { opsSent++; opBytes += s.length; } }));
p.on("pageerror", (e) => errs.push("pageerror " + String(e).slice(0, 150)));
p.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") errs.push(m.type() + " " + m.text().slice(0, 150)); });
const t0 = Date.now();
await p.goto(url);
await p.waitForFunction(() => (window as any).webstrate?.loaded, null, { timeout: 90000 }).then(() => console.log("webstrate loaded after", Date.now() - t0, "ms"), () => console.log("webstrate NOT loaded"));
const booted = await p.waitForFunction(() => (window as any).__ojs_runtime?._variables?.size > 50, null, { timeout: 60000 }).then(() => true, () => false);
console.log("lopecode runtime booted:", booted, "after", Date.now() - t0, "ms", "| variables:", await p.evaluate(() => (window as any).__ojs_runtime?._variables?.size));
await p.waitForTimeout(15000);
console.log("page text:", (await p.locator("body").innerText()).replace(/\s+/g, " ").slice(0, 200));
console.log("ops sent by this client:", opsSent, "bytes:", opBytes, "| version after:", await ver());
console.log("DOM now:", JSON.stringify(await p.evaluate(() => ({
  lopepageRoots: document.querySelectorAll("#lopepage-2").length,
  menus: document.querySelectorAll(".lp2-menu").length,
  d3Blocks: document.querySelectorAll('script[id="https://cdn.jsdelivr.net/npm/d3@7.9.0/dist/d3.min.js"]').length,
  blobScripts: [...document.querySelectorAll("script[src^='blob:']")].length,
  cellDivs: document.querySelectorAll("div.observablehq").length,
}))));
await p.screenshot({ path: `${out}/lope-webstrate-${Date.now()}.png` });
console.log("errors:", errs.length); for (const e of [...new Set(errs)].slice(0, 12)) console.log("  ", e);
await b.close();
