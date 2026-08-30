import { chromium } from "playwright";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1500, height: 1000 } });
const errs = []; p.on("pageerror", e => errs.push(e.message));
await p.goto("file://" + process.cwd() + "/lopebooks/notebooks/corepox.html#view=R100(S100(@tomlarkworthy/corepox-map))");
await p.waitForTimeout(9000);
const sig = () => p.evaluate(() => [...document.querySelectorAll("circle.cpm-node")]
  .map(c => `${c.getAttribute("cx")},${c.getAttribute("cy")}`).join("|"));
const a = await sig();
await p.evaluate(() => {
  const num = [...document.querySelectorAll("input[type=number]")].find(i => i.value === "41");
  num.value = "77"; num.dispatchEvent(new Event("input", { bubbles: true }));
});
await p.waitForTimeout(1500);
const c = await sig();
console.log("seed 41 nodes", a.split("|").length, "| seed 77 nodes", c.split("|").length, "| changed:", a !== c, "| errors", errs.slice(0,3));
await b.close();
