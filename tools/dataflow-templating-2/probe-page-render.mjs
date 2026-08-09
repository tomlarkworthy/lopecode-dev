// Counts what a page actually rendered, so the same notebook before and after a migration can be
// compared without knowing anything about its widgets.
import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
const errs = [];
page.on("pageerror", (e) => errs.push(String(e).slice(0, 120)));
page.on("console", (m) => m.type() === "error" && errs.push(m.text().slice(0, 120)));
await page.goto("file://" + process.argv[2], { waitUntil: "load" });
await page.waitForTimeout(20000);
const r = await page.evaluate(() => {
  const rt = window.__ojs_runtime;
  const dyn = [...rt._variables].filter((v) => typeof v._name === "string" && v._name.startsWith("dynamic "));
  const painted = (sel) => [...document.querySelectorAll(sel)].filter((e) => e.getBoundingClientRect().width > 20).length;
  return {
    primaryVariables: rt._variables.size,
    dynamicTotal: dyn.length,
    bridges: dyn.filter((v) => v._name.startsWith("dynamic bridge ")).length,
    panes: document.querySelectorAll(".lp2-pane, .lopepage-pane").length,
    svgsPainted: painted("svg"),
    forms: document.querySelectorAll("form").length,
    inputs: document.querySelectorAll("input,textarea,select").length,
    buttons: document.querySelectorAll("button").length,
    errorNodes: document.querySelectorAll(".observablehq--error, .observablehq--inspect.observablehq--error").length,
    bodyChars: document.body.innerText.length
  };
});
console.log(JSON.stringify(r, null, 1));
console.log("page errors:", errs.length ? [...new Set(errs)].slice(0, 8) : "none");
await browser.close();
