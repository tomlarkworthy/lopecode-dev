// The new selection-driven UI, photographed at each step of the shipped flow:
// wrench -> build panel -> ghosts -> committed, then select -> menu -> connect ->
// proposal -> confirm. The gates say the campaign is winnable; only a picture says
// whether it reads like the game (knowledge/corepox-shipped-ui-observed.md).
import {chromium} from "playwright";
const b = await chromium.launch();
const p = await b.newPage({viewport: {width: 1280, height: 900}});
p.on("console", m => { if (m.type() === "error") console.log("CONSOLE", m.text().slice(0, 200)); });
await p.goto("file://" + process.cwd() +
  "/lopebooks/notebooks/corepox.html#view=R100(S100(@tomlarkworthy/corepox-game))");
await p.waitForFunction(() => document.body.innerText.includes("1/9"), {timeout: 60000});
const shot = (n: string) => p.screenshot({path: `tools/screenshots/ux-${n}.png`});
const qa = (fn: string, ...a: any[]) => p.evaluate(([f, args]: any) => {
  const root: any = [...document.querySelectorAll("div")].find((d: any) => d.qa);
  return root.qa[f](...args);
}, [fn, a]);

await p.waitForTimeout(800);
await shot("1-birthing");                                   // build state, wrench visible
await p.locator("button[title=build]").click();
await p.waitForTimeout(400); await shot("2-panel");          // CHOOSE BUILD OPTION
await p.locator("div:text-is(\"BRAIN\")").first().click();
await p.waitForTimeout(400); await shot("3-ghosts");         // ghost of the real part
await qa("open", 0, 0);
await p.waitForTimeout(400); await shot("4-placed");
await p.locator("button[title=play]").click();
await p.waitForTimeout(2500); await shot("5-playing");

// mission 3 (run): the wire. live, so no play button.
await p.selectOption("select", "2");
await p.waitForTimeout(1500);
await qa("open", 0, 1);                                      // tap the Constant
await p.waitForTimeout(400); await shot("6-menu");
console.log("menu connect ->", await qa("menu", "connect"));
await p.waitForTimeout(400); await shot("7-ports");
await qa("open", 0, 1);
await qa("open", 0, -1);
await p.waitForTimeout(400); await shot("8-proposal");
await qa("confirm");
await p.waitForTimeout(3500); await shot("9-wired");
console.log(await p.evaluate(() => document.body.innerText.split("\n").slice(0, 8).join(" | ")));
await b.close();
