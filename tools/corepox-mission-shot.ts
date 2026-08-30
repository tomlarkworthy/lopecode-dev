// One frame of a mission a few seconds in. Used to check the board FURNITURE --
// funnels, KILL chips, rivals, mines -- against knowledge/corepox-shipped-ui-observed.md.
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
for (const arg of process.argv.slice(2)) {
  const [i, secs] = arg.split(":");
  await p.selectOption("select", i);
  await skipIntro();
  await p.waitForTimeout(900);
  const play = p.locator('button[title="play"]');
  if (await play.count()) await play.first().click();
  await p.waitForTimeout(Number(secs ?? 3) * 1000);
  await p.screenshot({path: `tools/screenshots/ms-${i}.png`});
}
await b.close();
