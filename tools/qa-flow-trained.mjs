import { chromium } from "playwright";
const url = "file:///Users/tom.larkworthy/dev/lopecode-dev/lopebooks/notebooks/@tomlarkworthy_belief-state-geometry.html#view=S100(@tomlarkworthy/belief-state-geometry)";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
await page.goto(url, { waitUntil: "load" });
await page.waitForTimeout(12000);
// toggle training on
await page.evaluate(() => {
  const t = [...document.querySelectorAll('input[type=checkbox]')].find((x) => x.closest("form") && /train transformer/.test(x.closest("form").textContent));
  t.click();
});
console.log("training on, cooking 50s...");
await page.waitForTimeout(50000);
const info = await page.evaluate(() => {
  const figs = [...document.querySelectorAll(".bsg-fig")];
  const flow = figs.find((f) => /heads unrolled/.test(f.textContent));
  flow.scrollIntoView({ block: "start" });
  // feed 3 tokens through the machine so the flow follows a real stream
  const machine = figs.find((f) => [...f.querySelectorAll("button")].some((b) => b.textContent.includes("⟲ reset")));
  const bs = [...machine.querySelectorAll("button")];
  bs.find((b) => b.textContent.trim().startsWith("A")).click();
  bs.find((b) => b.textContent.trim().startsWith("B")).click();
  bs.find((b) => b.textContent.trim().startsWith("A")).click();
  bs.find((b) => b.textContent.trim().startsWith("C")).click();
  bs.find((b) => b.textContent.trim().startsWith("C")).click();
  return flow.getBoundingClientRect().y;
});
await page.waitForTimeout(500);
const st = await page.evaluate(() => {
  const figs = [...document.querySelectorAll(".bsg-fig")];
  const flow = figs.find((f) => /heads unrolled/.test(f.textContent));
  flow.scrollIntoView({ block: "start" });
  return flow.textContent.match(/weights from training step \d+.*/)[0].slice(0, 120);
});
console.log(st);
await page.waitForTimeout(300);
const r = await page.evaluate(() => {
  const figs = [...document.querySelectorAll(".bsg-fig")];
  const flow = figs.find((f) => /heads unrolled/.test(f.textContent));
  const b = flow.getBoundingClientRect();
  return { y: b.y, h: b.height };
});
await page.screenshot({ path: "tools/screenshots/flow-trained.png", clip: { x: 0, y: Math.max(0, r.y - 6), width: 1100, height: Math.min(500, r.h + 30) } });
// stop training
await page.evaluate(() => {
  const t = [...document.querySelectorAll('input[type=checkbox]')].find((x) => x.closest("form") && /train transformer/.test(x.closest("form").textContent));
  if (t.checked) t.click();
});
await page.waitForTimeout(500);
await browser.close();
console.log("done");
