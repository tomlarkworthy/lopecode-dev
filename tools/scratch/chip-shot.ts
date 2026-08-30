// The rail chip is componentNode at 26px, so it is the smallest place the new
// plate has to survive. Shot at deviceScaleFactor 4 because a 9/56 chamfer is 4px
// at rail size and a screenshot at 1x cannot tell a chamfer from a round corner.
import {chromium} from "playwright";
const b = await chromium.launch();
const p = await b.newPage({viewport: {width: 1500, height: 1200}, deviceScaleFactor: 4});
await p.goto("file://" + process.cwd() +
  "/lopebooks/notebooks/corepox.html#view=R100(S100(@tomlarkworthy/corepox-duel-encounter))");
await p.waitForTimeout(13000);
const chip = p.locator('[data-part="Armour"]').first();
await chip.scrollIntoViewIfNeeded();
await p.waitForTimeout(400);
await chip.screenshot({path: "tools/screenshots/chip-armour.png"});
console.log("shot", await chip.boundingBox());
await b.close();
