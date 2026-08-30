// At the instant a block first has a nextSibling: is its text final? what is the sibling?
import { chromium } from "playwright";
const b = await chromium.launch({ headless: true });
const page = await (await b.newContext()).newPage();
await page.addInitScript(() => {
  const t0 = performance.now(); const T: any[] = []; (window as any).__t = T;
  const id = "@tomlarkworthy/annotate";
  let done = false;
  const tick = () => {
    const els = [...document.querySelectorAll("script[id]")].filter((e: any) => e.id === id);
    const el = document.getElementById(id) as any;
    if (!done && el && el.nextSibling) {
      done = true;
      T.push({
        t: Math.round(performance.now() - t0), len: (el.textContent || "").length, dupes: els.length,
        parent: el.parentNode.nodeName + "#" + (el.parentNode.id || ""),
        sib: el.nextSibling.nodeName, sibData: String(el.nextSibling.nodeValue || "").slice(0, 40),
        tail: (el.textContent || "").slice(-60), streaming: (window as any).__lopeStreaming
      });
    }
    if (!done) setTimeout(tick, 20);
  };
  tick();
});
await page.goto(process.argv[2], { waitUntil: "load", timeout: 300000 });
const final = await page.evaluate(() => {
  const el = document.getElementById("@tomlarkworthy/annotate") as any;
  return { finalLen: (el.textContent || "").length, tail: (el.textContent || "").slice(-60) };
});
console.log(JSON.stringify(await page.evaluate(() => (window as any).__t), null, 1));
console.log("FINAL", JSON.stringify(final));
await b.close();
