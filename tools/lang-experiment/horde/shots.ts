// bun horde/shots.ts [name...] : 1280x800 screenshots of proto/game.html into horde/shots/, from file://
import { chromium } from "../../../node_modules/playwright/index.mjs";
import { resolve, join } from "node:path";
const url = "file://" + resolve(import.meta.dir, "proto/game.html");
const all: Record<string, string> = {
  overview: "n=10000&mode=transfer&workers=8&shot=overview&frames=900",
  closeup: "n=10000&mode=transfer&workers=8&shot=closeup&frames=900",
  explosion: "n=10000&mode=transfer&workers=8&shot=explosion&frames=900",
  "ship-check": "n=10000&mode=transfer&workers=8&shot=closeup&frames=900&hide=bullets,particles",
  dense: "n=" + (process.env.DENSE_N || "400000") + "&mode=transfer&workers=17&shot=overview&frames=900&hud=1",
};
const want = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const tag = process.argv.find((a) => a.startsWith("--tag="))?.slice(6) ?? "";
const browser = await chromium.launch();
for (const name of want.length ? want : Object.keys(all)) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on("pageerror", (e) => console.log(name, "pageerror", e.message));
  page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") console.log(name, m.type(), m.text().slice(0, 300)); });
  await page.goto(`${url}?${all[name]}`);
  await page.waitForFunction(() => (window as any).__ready, null, { timeout: 300000 });
  const err = await page.evaluate(() => (window as any).__error);
  if (err) console.log(name, "ERROR", err);
  const file = join(import.meta.dir, "shots", `${name}${tag}.png`);
  await page.screenshot({ path: file });
  console.log(name, "->", file, JSON.stringify(await page.evaluate(() => (window as any).__measure)));
  await page.close();
}
await browser.close();
