// Where does <rect height="-3"> come from? Patch setAttribute before boot and
// print the stack of the first negative one.
import {chromium} from "playwright";
const b = await chromium.launch();
const p = await b.newPage({viewport: {width: 1200, height: 900}});
await p.addInitScript(() => {
  const oh = Object.getOwnPropertyDescriptor(Element.prototype, "innerHTML")!;
  Object.defineProperty(Element.prototype, "innerHTML", {...oh, set(v: any) {
    if (typeof v === "string" && /<rect[^>]*(height|width)\s*=\s*"-/.test(v))
      console.log("NEGATIVE innerHTML " + v.slice(0, 300) + "\n" + new Error().stack);
    return oh.set!.call(this, v);
  }});
  const o = Element.prototype.setAttribute;
  (Element.prototype as any).setAttribute = function (n: string, v: any) {
    if ((n === "height" || n === "width") && Number(v) < 0)
      console.log("NEGATIVE " + this.tagName + " " + n + "=" + v + "\n" + new Error().stack);
    return o.call(this, n, v);
  };
});
p.on("console", m => { const t = m.text();
  if (t.startsWith("NEGATIVE")) console.log(t.slice(0, 1200));
  else if (m.type() === "error") console.log("ERR " + t.slice(0, 200)); });
await p.goto("file://" + process.cwd() + "/lopebooks/notebooks/corepox.html" +
  "#view=R100(S100(@tomlarkworthy/corepox-game))");
await p.waitForFunction(() => /\b1\/\d+\b/.test(document.body.innerText), {timeout: 60000});
// A mission's intro cutscene covers the board (corepox-game `cutscene`), so a
// tool that drives the board has to get past it the way a player does.
const skipIntro = async () => {
  for (let i = 0; i < 8 && await p.locator(".cpx-cutscene").count(); i++) {
    await p.click(".cpx-cutscene"); await p.waitForTimeout(90);
  }
};
await skipIntro();
// walk the UI the campaign walks: build panel, a row, a component menu, info
for (const i of ["0", "5"]) {
  await p.selectOption("select", i); await p.waitForTimeout(1200);
  await skipIntro();
  const build = p.locator('button[title="build"]');
  if (await build.count()) { await build.click(); await p.waitForTimeout(900); }
  const row = p.locator('div:text-is("ARMOUR"), div:text-is("BRAIN")').first();
  if (await row.count()) { await row.click(); await p.waitForTimeout(900); }
  const qa = await p.evaluateHandle(() => {
    const m = (window as any).__ojs_runtime.mains.get("@tomlarkworthy/corepox-game");
    for (const [k, v] of m._scope) if (k === "viewof game") return (v as any)._value.qa;
  });
  await p.evaluate((q: any) => {
    const c = q.session().player.live[0]; if (c) { q.open(c.px, c.py); q.menu("connect"); }
  }, qa);
  await p.waitForTimeout(900);
  const play = p.locator('button[title="play"]');
  if (await play.count()) await play.click();
  await p.waitForTimeout(5000);
}
await b.close();
