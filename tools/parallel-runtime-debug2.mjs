import { chromium } from "playwright";
const b = await chromium.launch({ args: ["--no-sandbox", "--disable-setuid-sandbox"] });
const p = await b.newPage({ viewport: { width: 1200, height: 900 } });
const errs = [];
p.on("pageerror", (e) => errs.push("PAGEERR " + e.message));
await p.goto("file:///tmp/parallel-runtime-qa-copy.html");
await p.waitForFunction(() => !!window.__ojs_runtime && !!window.__ojs_parallel, null, { timeout: 60000 });
await p.waitForTimeout(15000);
const st = await p.evaluate(() => {
  const out = { canvases: document.querySelectorAll("canvas").length,
    bodyKids: document.body.children.length,
    bodyText: document.body.innerText.slice(0, 300) };
  for (const v of window.__ojs_runtime._variables) {
    if (v._name === "figure" || v._name === "liveness") {
      out[v._name] = { hasValue: v._value !== undefined, reachable: v._reachable,
        observerType: typeof v._observer };
    }
  }
  return out;
});
console.log(JSON.stringify(st, null, 1));
console.log("errs:", errs.slice(0, 8).join("\n"));
await p.screenshot({ path: "tools/screenshots/parallel-runtime-debug.png" });
await b.close();
