// Screenshots of a running match. The gates say the campaign is winnable; they say
// nothing about whether it reads as a game.
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
const mission = Number(process.argv[2] ?? 5), shots = Number(process.argv[3] ?? 4);
await p.selectOption("select", String(mission));
await skipIntro();
await p.waitForTimeout(1200);
await p.screenshot({path: `tools/screenshots/corepox-m${mission}-edit.png`});
await p.locator('button[title="play"]').first().click();
for (let i = 0; i < shots; i++) {
  await p.waitForTimeout(3000);
  await p.screenshot({path: `tools/screenshots/corepox-m${mission}-t${i}.png`});
}
console.log(await p.evaluate(() => document.body.innerText.split("\n").slice(0, 6).join(" | ")));
await b.close();
