import { chromium } from "playwright";
const url = process.argv[2];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
const errors = [];
page.on("pageerror", e => errors.push("[pageerror] " + e.message.slice(0,200)));
page.on("console", m => { if (m.type()==="error") errors.push("[console.error] " + m.text().slice(0,200)); });
await page.goto(url, { waitUntil: "domcontentloaded" });
// scroll to trigger lazy render
for (let y=0; y<4000; y+=400){ await page.mouse.wheel(0,400); await page.waitForTimeout(400); }
await page.waitForTimeout(25000);
const diag = await page.evaluate(() => {
  const frames = [];
  const collect = (doc, label) => {
    const svgs = doc.querySelectorAll("svg");
    const texts = [...doc.querySelectorAll("svg text")].map(t=>t.textContent.trim()).filter(Boolean);
    const counts = {}; for (const t of texts) counts[t]=(counts[t]||0)+1;
    frames.push({ label, svgCount: svgs.length, labelCount: texts.length, labels: counts });
  };
  collect(document, "main");
  return { title: document.title, frames, hasModuleMapText: /Module map/.test(document.body.innerText) };
});
console.log("URL:", url);
console.log(JSON.stringify(diag, null, 1));
console.log("=== errors ==="); console.log(errors.slice(0,25).join("\n") || "(none)");
await browser.close();
