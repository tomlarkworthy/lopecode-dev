// The mission header and the grouped picker. Checks the campaign label reads the
// way the shipped campaign list does, not a running 1..12.
import {chromium} from "playwright";
const b = await chromium.launch();
const p = await b.newPage({viewport: {width: 1280, height: 900}});
await p.goto("file://" + process.cwd() + "/lopebooks/notebooks/corepox.html#view=R100(S100(@tomlarkworthy/corepox-game))");
await p.waitForFunction(() => /\b1\/\d+\b/.test(document.body.innerText), {timeout: 60000});
const skipIntro = async () => {
  for (let i = 0; i < 8 && await p.locator(".cpx-cutscene").count(); i++) {
    await p.click(".cpx-cutscene"); await p.waitForTimeout(90);
  }
};
await skipIntro();
console.log(await p.evaluate(() => [...document.querySelectorAll("select optgroup")]
  .map(g => g.label + ": " + [...g.children].map(o => o.textContent.trim()).join(" | ")).join("\n")));
for (const i of [0, 6, 7, 9, 10, 11]) {
  await p.selectOption("select", String(i));
  await skipIntro();
  await p.waitForTimeout(300);
  console.log(i, JSON.stringify(await p.evaluate(() =>
    document.querySelector("select").parentElement.innerText.split("\n").slice(0, 2).join(" / "))));
}
await b.close();
