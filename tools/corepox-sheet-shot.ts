import {chromium} from "playwright";
const b = await chromium.launch();
const p = await b.newPage({viewport: {width: 1500, height: 1200}});
const errs: string[] = [];
p.on("pageerror", e => errs.push("pageerror: " + e.message));
p.on("console", m => { if (m.type() === "error") errs.push(m.text()); });
await p.goto("file://" + process.cwd() + "/lopebooks/notebooks/corepox.html" +
  "#view=R100(S100(@tomlarkworthy/corepox-components,@tomlarkworthy/corepox-assets))");
await p.waitForTimeout(14000);
const el = p.locator('a[download="corepox-art-sheet.svg"]').first();
if (!(await el.count())) { console.log("NO SHEET CELL"); console.log(errs.slice(0,5).join("\n")); }
else {
  const box = p.locator('a[download="corepox-art-sheet.svg"]').locator("xpath=..").first();
  await box.scrollIntoViewIfNeeded();
  await p.waitForTimeout(500);
  await box.screenshot({path: "tools/screenshots/corepox-art-sheet.png"});
  console.log(await p.evaluate(() => {
    const a = document.querySelector('a[download="corepox-art-sheet.svg"]');
    const s = a!.parentElement!.querySelector("svg")!;
    return "viewBox " + s.getAttribute("viewBox") + "  plates " +
      s.querySelectorAll(":scope > g").length + "  labels " + s.querySelectorAll(":scope > text").length;
  }));
}
if (errs.length) console.log("errors:", [...new Set(errs)].slice(0, 5));
await b.close();
