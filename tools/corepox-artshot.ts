// Editor screenshots, one per mission index given. No Play click -- the four live
// missions have no Play button, and the point here is the art, not the match.
import {chromium} from "playwright";
const b = await chromium.launch();
const p = await b.newPage({viewport: {width: 1280, height: 900}});
await p.goto("file://" + process.cwd() + "/lopebooks/notebooks/corepox.html#view=R100(S100(@tomlarkworthy/corepox-game))");
await p.waitForFunction(() => /\b1\/\d+\b/.test(document.body.innerText), {timeout: 60000});
// A mission's intro cutscene covers the board (corepox-game `cutscene`), so a
// tool that drives the board has to get past it the way a player does.
const skipIntro = async () => {
  for (let i = 0; i < 8 && await p.locator(".cpx-cutscene").count(); i++) {
    await p.click(".cpx-cutscene"); await p.waitForTimeout(90);
  }
};
await skipIntro();
for (const m of process.argv.slice(2)) {
  await p.selectOption("select", m);
  await skipIntro();
  await p.waitForTimeout(1500);
  await p.screenshot({path: `tools/screenshots/corepox-art-m${m}.png`});
  console.log(m, (await p.evaluate(() => document.body.innerText.split("\n").slice(0, 3).join(" | "))));
}
await b.close();
