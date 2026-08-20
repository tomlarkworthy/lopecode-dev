// One frame of a mission a few seconds in. Used to check the board FURNITURE --
// funnels, KILL chips, rivals, mines -- against knowledge/corepox-shipped-ui-observed.md.
import {chromium} from "playwright";
const b = await chromium.launch();
const p = await b.newPage({viewport: {width: 1280, height: 900}});
await p.goto("file://" + process.cwd() + "/lopebooks/notebooks/corepox.html#view=R100(S100(@tomlarkworthy/corepox-game))");
await p.waitForFunction(() => document.body.innerText.includes("1/9"), {timeout: 60000});
for (const arg of process.argv.slice(2)) {
  const [i, secs] = arg.split(":");
  await p.selectOption("select", i);
  await p.waitForTimeout(900);
  const play = p.locator('button[title="play"]');
  if (await play.count()) await play.first().click();
  await p.waitForTimeout(Number(secs ?? 3) * 1000);
  await p.screenshot({path: `tools/screenshots/ms-${i}.png`});
}
await b.close();
