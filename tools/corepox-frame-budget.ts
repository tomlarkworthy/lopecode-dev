// Frame cost of the game board, measured from the game's OWN animation loop
// rather than a wall clock: corepox-game dispatches an `input` event on `root`
// once per rendered frame, so counting those over a fixed play window gives the
// achieved frame rate, and requestAnimationFrame timestamps give the spread.
import {chromium} from "playwright";
const b = await chromium.launch();
const p = await b.newPage({viewport: {width: 1280, height: 900}});
const FILE = process.argv[2] ?? "lopebooks/notebooks/corepox.html";
await p.goto("file://" + process.cwd() + "/" + FILE + "#view=R100(S100(@tomlarkworthy/corepox-game))");
await p.waitForFunction(() => /\b1\/\d+\b/.test(document.body.innerText), {timeout: 60000});
const skipIntro = async () => {
  for (let i = 0; i < 8 && await p.locator(".cpx-cutscene").count(); i++) {
    await p.click(".cpx-cutscene"); await p.waitForTimeout(90);
  }
};
await skipIntro();
// mission 6 (Aim) runs a real fight with spawns, so the board is doing work
await p.selectOption("select", "5");
await skipIntro();
await p.waitForTimeout(400);
const play = p.locator('button[title="play"]');
if (await play.count()) await play.first().click();
console.log(FILE);
console.log(await p.evaluate(async () => {
  const rt = (window as any).__ojs_runtime;
  const m = rt.mains.get("@tomlarkworthy/corepox-game");
  let root: any = null;
  for (const [k, v] of m._scope) if (k === "viewof game") root = (v as any)._value;
  let frames = 0;
  const onInput = () => frames++;
  root.addEventListener("input", onInput);
  const gaps: number[] = [];
  let last = performance.now();
  const tick = () => { const t = performance.now(); gaps.push(t - last); last = t;
                       if (running) requestAnimationFrame(tick); };
  let running = true; requestAnimationFrame(tick);
  await new Promise(r => setTimeout(r, 10000));
  running = false; root.removeEventListener("input", onInput);
  gaps.sort((a, b) => a - b);
  const q = (f: number) => gaps[Math.min(gaps.length - 1, Math.floor(gaps.length * f))];
  const debugger2 = !!rt.mains.get("@tomlarkworthy/debugger-2");
  return `debugger-2 booted: ${debugger2}\n` +
         `game frames in 10s: ${frames} (${(frames / 10).toFixed(1)}/s)\n` +
         `raf gap ms  p50 ${q(0.5).toFixed(1)}  p90 ${q(0.9).toFixed(1)}  ` +
         `p99 ${q(0.99).toFixed(1)}  worst ${gaps[gaps.length - 1].toFixed(1)}`;
}));
await b.close();
