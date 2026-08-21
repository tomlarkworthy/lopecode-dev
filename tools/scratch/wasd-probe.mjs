import { chromium } from "playwright";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1300, height: 900 } });
p.on("pageerror", e => console.log("pageerror:", e.message));
await p.goto("file://" + process.cwd() + "/lopebooks/notebooks/corepox.html#view=R100(S100(@tomlarkworthy/corepox-game))");
await p.waitForTimeout(11000);
await p.selectOption("select", "7");
await p.waitForTimeout(2500);
console.log(await p.evaluate(() => {
  const rt = window.__ojs_runtime;
  return {
    hasRuntime: !!rt,
    active: document.activeElement?.tagName,
    gameSrc: !![...document.querySelectorAll("script[type='text/plain']")]
      .find(s => s.id === "@tomlarkworthy/corepox-game" && /DRIVE/.test(s.textContent))
  };
}));
// listen for keydowns arriving at window
await p.evaluate(() => { window.__keys = []; window.addEventListener("keydown", e => window.__keys.push(e.key)); });
await p.keyboard.down("w"); await p.waitForTimeout(800);
console.log("keys seen by window:", await p.evaluate(() => window.__keys));
console.log("active now:", await p.evaluate(() => document.activeElement?.tagName));
await p.keyboard.up("w");
await b.close();
