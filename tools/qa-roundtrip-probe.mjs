import { chromium } from "playwright";
const url = "file:///Users/tom.larkworthy/dev/lopecode-dev/tools/staging/@tomlarkworthy_belief-geometry.html";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
const errs = [];
page.on("pageerror", (e) => errs.push(String(e).slice(0, 200)));
page.on("console", (m) => { if (m.type() === "error") errs.push("console: " + m.text().slice(0, 150)); });
await page.goto(url, { waitUntil: "load" });
await page.waitForTimeout(14000);
const info = await page.evaluate(() => {
  const figs = [...document.querySelectorAll(".bsg-fig")];
  const text = document.body.innerText;
  return {
    title: document.title,
    figs: figs.length,
    flow: /heads unrolled \([\d,]+ parameters\)/.test(text),
    arch: /parameters total/.test(text),
    micro: /1 · embed/.test(text),
    backprop: /run one training step/.test(text),
    params: (text.match(/[\d,]+ learnable parameters/) || ["?"])[0],
    emergencePlaceholder: /train to accumulate checkpoints/.test(text),
    twinsPlaceholder: /no rrxor-trained transformer yet/.test(text)
  };
});
console.log(JSON.stringify(info, null, 1));
// feed the machine, confirm flow follows (exercises gptKit path end-to-end)
const follow = await page.evaluate(async () => {
  const figs = [...document.querySelectorAll(".bsg-fig")];
  const machine = figs.find((f) => [...f.querySelectorAll("button")].some((b) => b.textContent.includes("⟲ reset")));
  const bs = [...machine.querySelectorAll("button")];
  bs.find((b) => b.textContent.trim().startsWith("A")).click();
  bs.find((b) => b.textContent.trim().startsWith("B")).click();
  await new Promise((r) => setTimeout(r, 300));
  const flow = figs.find((f) => /heads unrolled/.test(f.textContent));
  return flow.textContent.match(/following position \d+ of \w+/)[0];
});
console.log("machine→flow:", follow);
console.log("errors:", errs.filter((e) => !/@import|module-map|storage.googleapis/.test(e)).slice(0, 8));
await browser.close();
