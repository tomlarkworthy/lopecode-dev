// Does the lab's ship editor still render on the shared board? The lab passes no
// `parts`, so its rail is the full palette at Infinity -- a different path through
// shipEditor than the refit bench's finite hold.
import {chromium} from "playwright";
const b = await chromium.launch();
const p = await b.newPage({viewport: {width: 1500, height: 1000}});
const errs: string[] = [];
p.on("pageerror", (e) => errs.push("pageerror: " + e.message));
p.on("console", (m) => { if (m.type() === "error") errs.push("console: " + m.text().slice(0, 160)); });
const mod = process.argv[2] ?? "@tomlarkworthy/corepox-lab";
await p.goto("file://" + process.cwd() +
  `/lopebooks/notebooks/corepox.html#view=R100(S100(${mod}))`);
await p.waitForTimeout(14000);
if (mod.endsWith("corepox-lab")) {
  await p.evaluate(() => {
    const el: any = [...document.querySelectorAll("div")].find((e: any) => e.qa?.select && e.qa?.mission);
    el.qa.select("player");
  });
  await p.waitForTimeout(1200);
}
console.log("rail rows:", await p.locator("[data-part]").count());
console.log("boards:   ", await p.locator("svg").count());
console.log(await p.evaluate(() => {
  const el: any = [...document.querySelectorAll("div")].find((e: any) => e.editor?.qa || e.qa?.stock);
  const q = el?.editor?.qa ?? el?.qa;
  return q ? q.stock().slice(0, 4).map((i: any) => `${i.type}:${i.n}`).join(" ") : "no board";
}));
const rail = p.locator("[data-part]").first();
if (await rail.count()) await rail.scrollIntoViewIfNeeded();
await p.waitForTimeout(500);
await p.screenshot({path: `tools/screenshots/boot-${mod.split("/")[1]}.png`});
console.log("errors:", errs.slice(0, 4));
await b.close();
