// Where must a paint server live to actually paint?
//
// The Orb's glow gradient was correct and invisible: `symbolSheet` parked the
// symbol sheet in `<svg style="display:none">`, and Blink builds no layout object
// for such a root and therefore no paint server for anything in its <defs>. This
// separates the two variables that were confounded while chasing it -- hidden vs
// laid out, and inside the <symbol> vs in the sheet's own <defs>.
//
//   bun tools/corepox-orb-probe.ts
//   tools/.venv-unity/bin/python -c "from PIL import Image; \
//     print([Image.open('tools/screenshots/orb-probe-%d.png'%i).convert('RGB').getpixel((60,60)) for i in (1,2,3)])"
// Each step fills a circle with url(#cpx-orb-glow) and shoots it. (0,0,0) is a
// miss; the run of 2026-08-20 read [(0,0,0), (0,0,0), (251,253,251)].
import {chromium} from "playwright";

const b = await chromium.launch();
const p = await b.newPage({viewport: {width: 400, height: 200}});
await p.goto("file://" + process.cwd() + "/lopebooks/notebooks/corepox.html#view=R100(S100(@tomlarkworthy/corepox-game))");
await p.waitForFunction(() => /\b1\/\d+\b/.test(document.body.innerText), {timeout: 60000});
await p.evaluate(() => {
  const d = document.createElement("div");
  d.setAttribute("style", "position:fixed;left:0;top:0;z-index:99999;background:#000;display:flex");
  // The gradient is userSpaceOnUse about (117.38,117.38), so match its frame.
  d.innerHTML = `<svg width="120" height="120" viewBox="60 60 120 120">
    <circle cx="117.38" cy="117.38" r="117.38" fill="url(#cpx-orb-glow)"/></svg>`;
  document.documentElement.appendChild(d);
});
let step = 0;
const read = async (label: string) => {
  await p.waitForTimeout(250);
  const path = `tools/screenshots/orb-probe-${++step}.png`;
  await p.screenshot({path, clip: {x: 0, y: 0, width: 120, height: 120}});
  console.log(label.padEnd(34), "->", path);
};

await p.evaluate(() => {                            // 1. as it was: sheet hidden
  document.querySelector("#cp-orb")!.closest("svg")!.setAttribute("style", "display:none");
});
await read("sheet display:none");
await p.evaluate(() => {                            // 2. only the host div made visible
  const svg = document.querySelector("#cp-orb")!.closest("svg")!;
  (svg.parentElement as HTMLElement).style.cssText = "position:absolute;left:-9999px";
});
await read("host visible, sheet display:none");
await p.evaluate(() => {                            // 3. the sheet itself laid out
  document.querySelector("#cp-orb")!.closest("svg")!
    .setAttribute("style", "position:absolute;width:0;height:0;overflow:hidden");
});
await read("sheet laid out, defs in <symbol>");
await b.close();
