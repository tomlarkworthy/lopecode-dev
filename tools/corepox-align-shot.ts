// The components page draws each footprint over its art, which is the only view
// that shows a drawing disagreeing with its cells. One shot per named type.
import {chromium} from "playwright";
const b = await chromium.launch();
const p = await b.newPage({viewport: {width: 1200, height: 1000}});
await p.goto("file://" + process.cwd() +
  "/lopebooks/notebooks/corepox.html#view=R100(S100(@tomlarkworthy/corepox-components))");
await p.waitForTimeout(12000);
for (const t of process.argv.slice(2)) {
  const h = p.locator(`#cpx-${t}`);
  if (!(await h.count())) { console.log("no section", t); continue; }
  await h.scrollIntoViewIfNeeded();
  await p.waitForTimeout(400);
  // the section's own tab strip: `footprint` is the one that draws the art OVER
  // the cell grid, which is the view that shows a drawing disagreeing with its cells
  const tab = p.locator("button", {hasText: /^footprint$/});
  const n = await tab.count();
  for (let i = 0; i < n; i++) {
    const el = tab.nth(i);
    if (await el.isVisible()) { await el.click(); break; }
  }
  await p.waitForTimeout(500);
  await p.screenshot({path: `tools/screenshots/al-${t}.png`});
  console.log("al-" + t);
}
await b.close();
