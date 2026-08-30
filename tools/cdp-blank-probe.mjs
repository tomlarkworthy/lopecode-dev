// Attach to a user-launched Chrome (--remote-debugging-port=9222) and report what
// the page actually contains, without opening DevTools (which masks the bug).
import { chromium } from "playwright";

const browser = await chromium.connectOverCDP("http://127.0.0.1:9222");
const pages = browser.contexts().flatMap((c) => c.pages());
const page = pages.find((p) => p.url().includes("exporter-3")) ?? pages[0];
if (!page) {
  console.log("no pages");
  process.exit(1);
}
console.log("url:", page.url());

const state = await page.evaluate(() => {
  const pr = document.getElementById("lope-prerender");
  const style = pr && getComputedStyle(pr);
  const lp = document.querySelector("#lopepage-2");
  return {
    prerenderPresent: !!pr,
    prerenderHasShadow: !!(pr && pr.shadowRoot),
    prerenderIsOverlay: !!(pr && pr.classList.contains("lope-prerender-overlay")),
    prerenderPosition: style && style.position,
    prerenderZ: style && style.zIndex,
    prerenderRect: pr && JSON.parse(JSON.stringify(pr.getBoundingClientRect())),
    lopepagePresent: !!lp,
    lopepageRect: lp && JSON.parse(JSON.stringify(lp.getBoundingClientRect())),
    liveCells: document.querySelectorAll("#lopepage-2 .observablehq").length,
    allCells: document.querySelectorAll(".observablehq").length,
    bodyChildren: [...document.body.children].map(
      (n) => n.tagName + (n.id ? "#" + n.id : "")
    ),
    // what is actually painted at the centre of the viewport
    topAtCentre: (() => {
      const el = document.elementFromPoint(innerWidth / 2, innerHeight / 2);
      if (!el) return null;
      const path = [];
      for (let n = el; n && path.length < 6; n = n.parentElement)
        path.push(n.tagName + (n.id ? "#" + n.id : ""));
      return path.join(" < ");
    })(),
    readyState: document.readyState,
    visibility: document.visibilityState,
  };
});
console.log(JSON.stringify(state, null, 2));

await page.screenshot({ path: "tools/screenshots/cdp-blank-probe.png" });
console.log("screenshot -> tools/screenshots/cdp-blank-probe.png");
await browser.close();
