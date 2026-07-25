import { chromium } from "playwright";
const url = "file:///Users/tom.larkworthy/dev/lopecode-dev/lopebooks/notebooks/@tomlarkworthy_belief-state-geometry.html#view=S100(@tomlarkworthy/belief-state-geometry)";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
const errs = [];
page.on("pageerror", (e) => errs.push(String(e).slice(0, 200)));
await page.goto(url, { waitUntil: "load" });
await page.waitForTimeout(12000);
const info = await page.evaluate(() => {
  const text = document.body.innerText;
  return {
    s3Bullet: (text.match(/[\d,]+ learnable parameters[^\n]*/) || ["MISSING"])[0],
    lossTitle: (text.match(/[\d,]+-param GPT · step[^\n]*/) || ["MISSING"])[0].slice(0, 80),
    zooTitle: (text.match(/zoo model \([\d,]+ params\)[^\n]*/) || ["MISSING"])[0].slice(0, 60),
    flowStatus: (text.match(/heads unrolled \([\d,]+ parameters\)/) || ["MISSING"])[0]
  };
});
console.log(JSON.stringify(info, null, 2));
console.log("pageerrors:", errs.length ? errs : "none");
await browser.close();
