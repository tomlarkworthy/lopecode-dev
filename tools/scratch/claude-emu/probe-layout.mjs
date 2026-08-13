// Title, order, and the blurb — as rendered, not as intended.
import { chromium } from "playwright";
const NB = "/Users/tom.larkworthy/dev/lopecode-dev/lopebooks/notebooks/Caged_Code.html";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await chromium.launch({ headless: true });
const p = await b.newPage({ viewport: { width: 1200, height: 1000 } });
await p.goto("file://" + NB + "#view=S100(@tomlarkworthy/claude-code-browser)", { waitUntil: "load", timeout: 60000 });
await p.waitForFunction(() => window.__termHealth && window.__termHealth().renderedChars > 0, { timeout: 120000 });
await sleep(6000);
console.log("module title:", JSON.stringify(await p.evaluate(() => {
  for (const [, info] of window.__CB_DEPS.currentModules) if (info && info.name === "@tomlarkworthy/claude-code-browser") return info.title;
  return "(module not found)";
})));
const geom = await p.evaluate(() => {
  const y = (sel) => { const e = document.querySelector(sel); return e ? Math.round(e.getBoundingClientRect().top) : null; };
  const h1 = [...document.querySelectorAll("h1")].map((e) => e.textContent.trim());
  const para = [...document.querySelectorAll("p")].map((e) => e.textContent.trim()).filter((t) => /vanilla Claude Code/.test(t));
  return { h1, term: y("#cb-term"), controls: y("#cb-provider"), mount: y("#cb-mount"), status: y("#cb-status"),
    paraTop: para.length ? Math.round([...document.querySelectorAll("p")].find((e) => /vanilla Claude Code/.test(e.textContent)).getBoundingClientRect().top) : null,
    para: para[0] || null };
});
console.log("h1s:", JSON.stringify(geom.h1));
console.log("y: term=" + geom.term + " controls=" + geom.controls + " mount=" + geom.mount + " status=" + geom.status + " paragraph=" + geom.paraTop);
console.log("order ok:", geom.term < geom.controls && geom.controls < geom.status && geom.status < geom.paraTop);
console.log("paragraph:", JSON.stringify(geom.para));
await p.screenshot({ path: "nb-layout.png", fullPage: false });
await b.close(); process.exit(0);
