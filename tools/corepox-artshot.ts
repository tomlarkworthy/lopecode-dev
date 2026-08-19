// Editor screenshots, one per mission index given. No Play click -- the four live
// missions have no Play button, and the point here is the art, not the match.
import {chromium} from "playwright";
const b = await chromium.launch();
const p = await b.newPage({viewport: {width: 1280, height: 900}});
await p.goto("file://" + process.cwd() + "/lopebooks/notebooks/corepox.html#view=R100(S100(@tomlarkworthy/corepox-game))");
await p.waitForFunction(() => document.body.innerText.includes("1/9"), {timeout: 60000});
for (const m of process.argv.slice(2)) {
  await p.selectOption("select", m);
  await p.waitForTimeout(1500);
  await p.screenshot({path: `tools/screenshots/corepox-art-m${m}.png`});
  console.log(m, (await p.evaluate(() => document.body.innerText.split("\n").slice(0, 3).join(" | "))));
}
await b.close();
