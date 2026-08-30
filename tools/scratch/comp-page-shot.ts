// The components page draws each part's art AND its joint dots on the lattice, so
// it is where an anchor change shows up as the plate sliding off its own cell.
import {chromium} from "playwright";
const b = await chromium.launch();
const p = await b.newPage({viewport: {width: 1500, height: 1100}});
const errs: string[] = [];
p.on("pageerror", (e) => errs.push(e.message));
p.on("console", (m) => { if (m.type() === "error") errs.push(m.text().slice(0, 200)); });
await p.goto("file://" + process.cwd() +
  "/lopebooks/notebooks/corepox.html#view=R100(S100(@tomlarkworthy/corepox-components))");
await p.waitForTimeout(15000);
await p.getByRole("button", {name: "Armour", exact: true}).click().catch(() =>
  p.locator("text=/^Armour$/").first().click());
await p.waitForTimeout(1600);
await p.screenshot({path: "tools/screenshots/comp-armour.png"});
console.log("errors:", errs.slice(0, 4));
await b.close();
