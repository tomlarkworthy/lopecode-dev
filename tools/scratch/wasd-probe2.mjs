import { chromium } from "playwright";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1300, height: 900 } });
p.on("pageerror", e => console.log("pageerror:", e.message));
await p.goto("file://" + process.cwd() + "/lopebooks/notebooks/corepox.html#view=R100(S100(@tomlarkworthy/corepox-game))");
await p.waitForTimeout(11000);
await p.selectOption("select", "7");
await p.waitForTimeout(2500);
const state = async () => p.evaluate(() => {
  const el = [...document.querySelectorAll("*")].find(e => /LIVE|RUNNING/.test(e.textContent) && e.children.length === 0);
  return {chip: el?.textContent?.trim(), clockish: document.body.innerText.match(/\d+\.\d+s/)?.[0]};
});
console.log("before:", await state());
await p.waitForTimeout(1500);
console.log("after 1.5s:", await state());
// count exhaust particles as a proxy for thrust
const exhaust = () => p.evaluate(() => {
  const paths = [...document.querySelectorAll("path[stroke-linecap='round']")];
  return paths.reduce((n, e) => n + ((e.getAttribute("d") || "").match(/M/g)?.length ?? 0), 0);
});
console.log("exhaust idle:", await exhaust());
await p.keyboard.down("w"); await p.waitForTimeout(1500);
console.log("exhaust with W held:", await exhaust());
await p.keyboard.up("w");
await b.close();
