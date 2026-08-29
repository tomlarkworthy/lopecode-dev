// The turn-9 rail, photographed. Mission board and refit bench, same screen.
import {chromium} from "playwright";
const b = await chromium.launch();
const p = await b.newPage({viewport: {width: 1500, height: 1000}});
const errs: string[] = [];
p.on("console", m => { if (m.type() === "error") errs.push(m.text().slice(0, 240)); });
p.on("pageerror", e => errs.push("pageerror: " + (e.stack ?? e.message).slice(0, 400)));
await p.goto("file://" + process.cwd() +
  "/lopebooks/notebooks/corepox.html#view=R100(S100(@tomlarkworthy/corepox-game))");
await p.waitForFunction(() => /\b1\/\d+\b/.test(document.body.innerText), {timeout: 60000});
for (let i = 0; i < 8 && await p.locator(".cpx-cutscene").count(); i++) {
  await p.click(".cpx-cutscene"); await p.waitForTimeout(90);
}
const qa = (fn: string, ...a: any[]) => p.evaluate(([f, args]: any) => {
  const root: any = [...document.querySelectorAll("div")].find((d: any) => d.qa);
  return root.qa[f](...args);
}, [fn, a]);
await p.waitForTimeout(600);
// a mission with a full hold reads the rail better than the one-Brain opener
await qa("select", 9);
await p.waitForTimeout(1200);
for (let i = 0; i < 8 && await p.locator(".cpx-cutscene").count(); i++) {
  await p.click(".cpx-cutscene"); await p.waitForTimeout(90);
}
await p.waitForTimeout(600);
await p.screenshot({path: "tools/screenshots/rail-desktop.png"});
await qa("layout", "mobile");
await p.waitForTimeout(500);
await p.screenshot({path: "tools/screenshots/rail-mobile.png"});
console.log("rail rows:", await p.locator("[data-part]").count());
console.log("errors:", errs.slice(0, 5));
await b.close();
