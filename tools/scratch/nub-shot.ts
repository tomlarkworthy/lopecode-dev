// The camera nub, photographed after a real pan, in both layouts. It exists
// because the two pads were reported unreadable and the fix is a SHAPE change --
// which no assertion can see and a screenshot can.
import {chromium} from "playwright";
const b = await chromium.launch();
const p = await b.newPage({viewport: {width: 1400, height: 1150}});
await p.goto("file://" + process.cwd() +
  "/lopebooks/notebooks/corepox.html#view=R100(S100(@tomlarkworthy/corepox-game))");
await p.waitForFunction(() => /\b1\/\d+\b/.test(document.body.innerText), {timeout: 60000});
for (let i = 0; i < 8 && await p.locator(".cpx-cutscene").count(); i++) {
  await p.click(".cpx-cutscene"); await p.waitForTimeout(90);
}
await p.waitForTimeout(500);
const pan = async () => {                       // space-drag the board so `moved()` turns true
  const svg = await p.evaluate(() => {
    const root: any = [...document.querySelectorAll("div")].find((d: any) => d.qa);
    const r = root.qa.svg().getBoundingClientRect();
    return {x: r.left, y: r.top, width: r.width, height: r.height};
  });
  await p.keyboard.down(" ");
  await p.mouse.move(svg!.x + svg!.width / 2, svg!.y + svg!.height / 2);
  await p.mouse.down();
  for (let i = 1; i <= 10; i++) await p.mouse.move(svg!.x + svg!.width / 2 + i * 9, svg!.y + svg!.height / 2 + i * 4);
  await p.mouse.up();
  await p.keyboard.up(" ");
  await p.waitForTimeout(300);
};
const qa = (fn: string, ...a: any[]) => p.evaluate(([f, args]: any) => {
  const root: any = [...document.querySelectorAll("div")].find((d: any) => d.qa);
  return root.qa[f](...args);
}, [fn, a]);
await pan();
console.log("moved after pan", await p.evaluate(() => {
  const root: any = [...document.querySelectorAll("div")].find((d: any) => d.qa);
  return (root.qa as any).view ? (root.qa as any).view().moved() : "no seam";
}));
console.log("nub in dom", await p.evaluate(() => document.body.innerText.includes("CENTRE")));
await p.screenshot({path: "tools/screenshots/nub-desktop.png"});
await qa("layout", "mobile");
await p.waitForTimeout(300);
await pan();
await p.screenshot({path: "tools/screenshots/nub-mobile.png"});
console.log("shot");
await b.close();
