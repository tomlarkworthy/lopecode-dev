// Record every network request the codestrate makes: boot, Edit, open each fragment.
import { chromium } from "playwright";
import { writeFileSync, mkdirSync } from "fs";
const nb = process.argv[2]!, out = process.argv[3]!;
mkdirSync(out + "/bodies", { recursive: true });
const b = await chromium.launch();
const c = await b.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1400, height: 900 } });
const p = await c.newPage();
const seen = new Map<string, any>();
c.on("request", (r) => {
  const u = r.url();
  if (/^(file|blob|data|about|chrome)/.test(u)) return;
  if (!seen.has(u)) seen.set(u, { url: u, type: r.resourceType(), frame: r.frame()?.url?.().slice(0, 40) });
});
c.on("requestfailed", (r) => { const e = seen.get(r.url()); if (e) e.failed = r.failure()?.errorText; });
c.on("response", async (r) => {
  const e = seen.get(r.url()); if (!e) return;
  e.status = r.status(); e.mime = r.headers()["content-type"];
  try { const body = await r.body(); e.size = body.length; } catch {}
});
p.on("pageerror", (e) => console.log("[pageerror]", String(e).slice(0, 200)));
p.on("console", (m) => { if (m.type() === "error") console.log("[console]", m.text().slice(0, 200)); });
await p.goto(`file://${nb}`);
const frame = await (await p.locator("iframe").first().elementHandle())!.contentFrame();
await frame!.locator("#cauldron-edit-button").waitFor({ timeout: 60000 });
await p.waitForTimeout(3000);
console.log("boot requests:", seen.size);
await frame!.locator("#cauldron-edit-button").click();
await p.waitForTimeout(8000);
await p.screenshot({ path: out + "/edit.png" });
console.log("after edit:", seen.size);
// open each fragment from the tree
for (const id of ["intro", "counter", "style"]) {
  const item = frame!.locator(`text=${id}`).first();
  if (await item.count()) { await item.dblclick().catch((e) => console.log("dblclick", id, String(e).slice(0, 100))); await p.waitForTimeout(5000); }
  else console.log("no tree item", id);
}
await p.screenshot({ path: out + "/fragments.png" });
console.log("after fragments:", seen.size);
writeFileSync(out + "/requests.json", JSON.stringify([...seen.values()], null, 1));
await b.close();
