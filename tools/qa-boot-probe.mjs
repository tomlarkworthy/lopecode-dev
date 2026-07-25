import { chromium } from "playwright";
const url = "file:///Users/tom.larkworthy/dev/lopecode-dev/lopebooks/notebooks/@tomlarkworthy_belief-state-geometry.html#view=S100(@tomlarkworthy/belief-state-geometry)";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const logs = [];
page.on("console", (m) => logs.push(m.type() + ": " + m.text().slice(0, 200)));
page.on("pageerror", (e) => logs.push("PAGEERROR: " + String(e).slice(0, 300)));
await page.goto(url, { waitUntil: "load" });
await page.waitForTimeout(12000);
const info = await page.evaluate(() => ({
  bodyLen: document.body.innerText.length,
  figs: document.querySelectorAll(".bsg-fig").length,
  flowSvg: !!document.querySelector(".bsg-fig svg"),
  title: document.title
}));
console.log(JSON.stringify(info, null, 2));
console.log(logs.filter((l) => !/@import|module-map|editor-5|runtime-sdk|bootloader/.test(l)).slice(0, 30).join("\n"));
await page.screenshot({ path: "tools/screenshots/boot-probe.png" });
await browser.close();
